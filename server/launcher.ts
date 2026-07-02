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
// The launcher can start/stop the server and grant items — keep its panel
// local-only unless the operator explicitly opts into exposing it.
const HOST = process.env.LAUNCHER_HOST || '127.0.0.1';

const GAME_API = `http://127.0.0.1:${GAME_PORT}`;

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

/** Is the child process we spawned still alive? */
function childAlive(): boolean {
  return !!child && child.exitCode === null && !child.killed;
}

/** Is a game server actually answering on :8080 (ours OR one already running)? */
async function serverUp(): Promise<boolean> {
  try {
    const r = await fetch(`${GAME_API}/api/health`, { signal: AbortSignal.timeout(800) });
    return r.ok;
  } catch {
    return false;
  }
}

/** Start the server — but if one is ALREADY listening on :8080, adopt it instead
 *  of spawning a duplicate (which would crash with EADDRINUSE). */
async function startServer(): Promise<{ ok: boolean; note: string }> {
  if (childAlive()) return { ok: false, note: 'already running (managed by launcher)' };
  if (await serverUp()) {
    log('[launcher] a game server is already running on :' + GAME_PORT + ' — adopting it.');
    return { ok: true, note: 'adopted an already-running server' };
  }
  log('[launcher] starting game server...');
  child = spawn('npm', ['run', 'server'], { cwd: ROOT, shell: true, env: process.env }); // shell:true → npm.cmd on Windows
  startedAt = Date.now();
  child.stdout?.on('data', (d) => log(String(d)));
  child.stderr?.on('data', (d) => log(String(d)));
  child.on('exit', (code) => { log(`[launcher] game server exited (code ${code ?? '?'})`); child = null; });
  return { ok: true, note: 'starting' };
}

/** Stop the server: kill our child, or ask an adopted/external one to exit. */
async function stopServer(): Promise<boolean> {
  if (childAlive() && child?.pid) {
    log('[launcher] stopping game server...');
    try {
      if (process.platform === 'win32') execSync(`taskkill /PID ${child.pid} /T /F`); // kill the npm→node tree
      else child.kill('SIGTERM');
    } catch (e) {
      log('[launcher] stop error: ' + (e as Error).message);
    }
    child = null;
    return true;
  }
  if (await serverUp()) {
    log('[launcher] stopping external game server via its API...');
    try { await fetch(`${GAME_API}/api/shutdown`, { method: 'POST' }); } catch { /* */ }
    return true;
  }
  return false;
}

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/status', async (_req, res) => {
  const managed = childAlive();
  const up = managed || (await serverUp());
  res.json({
    running: up,
    managed,
    adopted: up && !managed,
    pid: child?.pid ?? null,
    uptime: managed ? Date.now() - startedAt : 0,
    gamePort: GAME_PORT,
    logs,
  });
});

app.post('/api/start', async (_req, res) => res.json(await startServer()));
app.post('/api/stop', async (_req, res) => res.json({ ok: await stopServer() }));
app.post('/api/restart', async (_req, res) => {
  await stopServer();
  setTimeout(() => { void startServer(); }, 1200);
  res.json({ ok: true });
});

// Proxy the running game server's API so the unified panel lives here on :8090.
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
app.post('/api/server/grant', (req, res) => proxy(res, '/api/grant', jsonPost(req.body)));

app.get('/', (_req, res) => {
  try {
    res.type('html').send(readFileSync(join(__dirname, 'launcher.html'), 'utf8'));
  } catch {
    res.type('html').send('<h1>StrongBow Launcher</h1><p>launcher.html missing.</p>');
  }
});

app.listen(PORT, HOST, () => {
  console.log(`StrongBow launcher (control panel) on http://localhost:${PORT}`);
  console.log(`  controls the game server on port ${GAME_PORT}`);
  void startServer(); // adopt an already-running server, or spawn one
});
