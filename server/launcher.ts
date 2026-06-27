import express from 'express';
import cors from 'cors';
import { spawn, execSync, type ChildProcess } from 'child_process';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// ----------------------------------------------------------------------------
// StrongBow Launcher — a tiny always-on supervisor that can START / STOP /
// RESTART the game server as a child process, tail its logs, and report status
// over a web control panel. You run THIS once (start-launcher.bat or a Windows
// startup task); from then on the game server is controllable from the browser.
// Solves the bootstrap problem: a not-yet-running server can't start itself, but
// this supervisor (which is running) can spawn it on demand.
// ----------------------------------------------------------------------------

try {
  (process as unknown as { loadEnvFile?: (p?: string) => void }).loadEnvFile?.('.env');
} catch {
  /* no .env present */
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PORT = Number(process.env.LAUNCHER_PORT) || 8090;
const GAME_PORT = Number(process.env.GAME_SERVER_PORT) || 8080;

let child: ChildProcess | null = null;
let startedAt = 0;
const logs: string[] = [];
const LOG_MAX = 250;

function log(chunk: string): void {
  for (const line of chunk.replace(/\r/g, '').split('\n')) {
    if (line.trim() === '') continue;
    logs.push(`${new Date().toLocaleTimeString()}  ${line}`);
  }
  while (logs.length > LOG_MAX) logs.shift();
}

function isRunning(): boolean {
  return !!child && child.exitCode === null && !child.killed;
}

function startServer(): boolean {
  if (isRunning()) return false;
  log('[launcher] starting game server...');
  // shell:true so "npm" resolves to npm.cmd on Windows
  child = spawn('npm', ['run', 'server'], { cwd: ROOT, shell: true, env: process.env });
  startedAt = Date.now();
  child.stdout?.on('data', (d) => log(String(d)));
  child.stderr?.on('data', (d) => log(String(d)));
  child.on('exit', (code) => {
    log(`[launcher] game server exited (code ${code ?? '?'})`);
    child = null;
  });
  return true;
}

function stopServer(): boolean {
  if (!isRunning() || !child?.pid) return false;
  log('[launcher] stopping game server...');
  try {
    // kill the whole process tree (npm spawns node) — taskkill on Windows
    if (process.platform === 'win32') execSync(`taskkill /PID ${child.pid} /T /F`);
    else child.kill('SIGTERM');
  } catch (e) {
    log('[launcher] stop error: ' + (e as Error).message);
  }
  child = null;
  return true;
}

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/status', (_req, res) => {
  res.json({
    running: isRunning(),
    pid: child?.pid ?? null,
    uptime: isRunning() ? Date.now() - startedAt : 0,
    gamePort: GAME_PORT,
    logs,
  });
});

app.post('/api/start', (_req, res) => res.json({ ok: startServer() }));
app.post('/api/stop', (_req, res) => res.json({ ok: stopServer() }));
app.post('/api/restart', (_req, res) => {
  stopServer();
  setTimeout(startServer, 800);
  res.json({ ok: true });
});

// Proxy the running game server's API so the unified panel (and dashboard) all
// live here on the launcher port — no separate :8080 page needed.
const GAME_API = `http://127.0.0.1:${GAME_PORT}`;
async function proxy(res: express.Response, path: string, init?: Parameters<typeof fetch>[1]): Promise<void> {
  try {
    const r = await fetch(GAME_API + path, init);
    res.status(r.status).json(await r.json());
  } catch {
    res.status(503).json({ ok: false, offline: true });
  }
}
const jsonPost = (body: unknown): Parameters<typeof fetch>[1] => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
app.get('/api/server/state', (_req, res) => proxy(res, '/api/state'));
app.post('/api/server/config', (req, res) => proxy(res, '/api/config', jsonPost(req.body)));
app.post('/api/server/kick', (req, res) => proxy(res, '/api/kick', jsonPost(req.body)));
app.post('/api/server/broadcast', (req, res) => proxy(res, '/api/broadcast', jsonPost(req.body)));

app.get('/', (_req, res) => {
  try {
    res.type('html').send(readFileSync(join(__dirname, 'launcher.html'), 'utf8'));
  } catch {
    res.type('html').send('<h1>StrongBow Launcher</h1><p>launcher.html missing.</p>');
  }
});

app.listen(PORT, () => {
  console.log(`StrongBow launcher (control panel) on http://localhost:${PORT}`);
  console.log(`  controls the game server on port ${GAME_PORT}`);
  startServer(); // bring the game server up automatically on launch
});
