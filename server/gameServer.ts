import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { randomUUID } from 'crypto';

// ----------------------------------------------------------------------------
// StrongBow Game Server — a standalone, authoritative-lite hub that every game
// client (single OR multiplayer) connects to. Phase 1 syncs player presence +
// position between clients in a shared world, carries an "AI NPC" toggle the
// host can flip, and serves a live control dashboard. Runs independently of the
// game (its own process/port): `npm run server`.
// ----------------------------------------------------------------------------

try {
  (process as unknown as { loadEnvFile?: (p?: string) => void }).loadEnvFile?.('.env');
} catch {
  /* no .env present */
}

const PORT = Number(process.env.GAME_SERVER_PORT) || 8080;

interface PlayerState {
  id: string;
  name: string;
  classId: string;
  level: number;
  x: number;
  y: number;
  hp: number;
  levelId: string; // which map they're on (town / overworld / a realm)
  lastSeen: number;
  ws: WebSocket;
}

interface ServerConfig {
  aiNpcsEnabled: boolean;
  aiNpcCount: number;
  motd: string;
}

const startedAt = Date.now();
const players = new Map<string, PlayerState>();
const config: ServerConfig = {
  aiNpcsEnabled: process.env.AI_NPCS === '1',
  aiNpcCount: Number(process.env.AI_NPC_COUNT) || 2,
  motd: 'Welcome to the Wilds of Hearthwatch.',
};

// ---- Phase 2: server-driven AI NPCs ----------------------------------------
interface NpcAgent {
  id: string; name: string; classId: string;
  x: number; y: number; vx: number; vy: number; levelId: string; retargetAt: number;
}
const npcs = new Map<string, NpcAgent>();
let npcSeq = 0;
const NPC_NAMES = ['Wandering Sellsword', 'Lost Pilgrim', 'Hedge Knight', 'Road Warden', 'Stray Conjurer', 'Masked Rogue', 'Vagrant Healer', 'Wild Forager'];
const NPC_CLASSES = ['vanguard', 'thief', 'arcanist', 'warden', 'necromancer'];

/** Spawn/despawn + wander AI NPCs so they hover near the busiest map's players. */
function simulateNpcs(now: number): void {
  if (!config.aiNpcsEnabled) { npcs.clear(); return; }
  // pick the map with the most players as the NPCs' home (default overworld)
  let homeMap = 'overworld';
  let best = -1;
  const counts = new Map<string, number>();
  for (const p of players.values()) counts.set(p.levelId, (counts.get(p.levelId) ?? 0) + 1);
  for (const [m, c] of counts) if (c > best) { best = c; homeMap = m; }
  // anchor near the players on that map, else the overworld town centre (px)
  let ax = 1536, ay = 768;
  const onMap = [...players.values()].filter((p) => p.levelId === homeMap);
  if (onMap.length) {
    ax = onMap.reduce((s, p) => s + p.x, 0) / onMap.length;
    ay = onMap.reduce((s, p) => s + p.y, 0) / onMap.length;
  }
  while (npcs.size < config.aiNpcCount) {
    const id = 'npc' + npcSeq++;
    npcs.set(id, {
      id, name: NPC_NAMES[Math.floor(Math.random() * NPC_NAMES.length)],
      classId: NPC_CLASSES[Math.floor(Math.random() * NPC_CLASSES.length)],
      x: ax + (Math.random() - 0.5) * 200, y: ay + (Math.random() - 0.5) * 200,
      vx: 0, vy: 0, levelId: homeMap, retargetAt: 0,
    });
  }
  while (npcs.size > config.aiNpcCount) npcs.delete(npcs.keys().next().value as string);
  for (const n of npcs.values()) {
    n.levelId = homeMap;
    if (now >= n.retargetAt) {
      n.retargetAt = now + 1500 + Math.random() * 2500;
      const ang = Math.random() * Math.PI * 2;
      const sp = 20 + Math.random() * 30;
      n.vx = Math.cos(ang) * sp; n.vy = Math.sin(ang) * sp;
    }
    n.x += n.vx * 0.12; n.y += n.vy * 0.12;
    const dx = n.x - ax, dy = n.y - ay, d = Math.hypot(dx, dy) || 1;
    if (d > 340) { n.x = ax + (dx / d) * 340; n.y = ay + (dy / d) * 340; n.vx = -n.vx; n.vy = -n.vy; }
  }
}

// public view of a player (no socket handle)
const pub = (p: PlayerState) => ({
  id: p.id, name: p.name, classId: p.classId, level: p.level,
  x: Math.round(p.x), y: Math.round(p.y), hp: Math.round(p.hp), levelId: p.levelId,
});

function send(ws: WebSocket, msg: unknown): void {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
}

function broadcastConfig(): void {
  for (const p of players.values()) send(p.ws, { t: 'config', config });
}

// Structured, leveled, categorized logging → surfaced verbatim in the dashboard.
type LogLevel = 'INFO' | 'WARN' | 'ERROR';
function slog(level: LogLevel, cat: string, msg: string): void {
  console.log(`${new Date().toISOString()} [${level}] [${cat.padEnd(7)}] ${msg} (online: ${players.size})`);
}

// ---- HTTP + dashboard -------------------------------------------------------
const app = express();
app.use(cors());
app.use(express.json({ limit: '16kb' }));

/** Admin routes may only be called from this machine (the launcher / a local
 *  browser). Players connect via WebSocket; they never need these, and leaving
 *  them open would let anyone on the internet shut the server down, kick
 *  players, or grant themselves loot. */
function localOnly(req: express.Request, res: express.Response, next: express.NextFunction): void {
  const ip = req.socket.remoteAddress ?? '';
  if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') { next(); return; }
  slog('WARN', 'ADMIN', `blocked remote admin call to ${req.path} from ${ip}`);
  res.status(403).json({ ok: false, error: 'admin endpoints are local-only' });
}

app.get('/api/health', (_req, res) => res.json({ ok: true, uptime: Date.now() - startedAt }));

app.get('/api/state', localOnly, (_req, res) => {
  res.json({
    uptime: Date.now() - startedAt,
    playerCount: players.size,
    npcCount: npcs.size,
    players: [...players.values()].map(pub),
    config,
  });
});

app.post('/api/shutdown', localOnly, (_req, res) => {
  res.json({ ok: true });
  slog('WARN', 'ADMIN', 'shutdown requested from dashboard');
  setTimeout(() => process.exit(0), 250);
});

app.post('/api/config', localOnly, (req, res) => {
  const { aiNpcsEnabled, aiNpcCount, motd } = req.body ?? {};
  if (typeof aiNpcsEnabled === 'boolean') config.aiNpcsEnabled = aiNpcsEnabled;
  if (typeof aiNpcCount === 'number') config.aiNpcCount = Math.max(0, Math.min(12, Math.round(aiNpcCount)));
  if (typeof motd === 'string') config.motd = motd.slice(0, 160);
  broadcastConfig();
  slog('INFO', 'ADMIN', `config set: AI NPCs ${config.aiNpcsEnabled ? 'ON x' + config.aiNpcCount : 'OFF'}`);
  res.json({ ok: true, config });
});

app.post('/api/kick', localOnly, (req, res) => {
  const p = players.get(req.body?.id);
  if (p) { slog('WARN', 'ADMIN', `kicked ${p.name} (${p.id})`); send(p.ws, { t: 'kicked' }); p.ws.close(); }
  res.json({ ok: !!p });
});

app.post('/api/broadcast', localOnly, (req, res) => {
  const text = String(req.body?.text ?? '').slice(0, 200);
  if (text) {
    for (const p of players.values()) send(p.ws, { t: 'announce', text });
    slog('INFO', 'ADMIN', `broadcast: "${text}"`);
  }
  res.json({ ok: true });
});

// Admin: grant gold or an item to a specific connected player.
app.post('/api/grant', localOnly, (req, res) => {
  const { id, gold, itemId } = req.body ?? {};
  const p = players.get(id);
  if (!p) { res.json({ ok: false, error: 'no-such-player' }); return; }
  send(p.ws, { t: 'grant', gold: typeof gold === 'number' ? gold : 0, itemId: typeof itemId === 'string' ? itemId : undefined });
  slog('INFO', 'ADMIN', `granted ${typeof gold === 'number' ? gold + ' gold' : (itemId ?? '?')} to ${p.name}`);
  res.json({ ok: true });
});

app.get('/', (_req, res) => {
  res.type('html').send(
    '<h1>StrongBow Game Server</h1><p>API + WebSocket sync are running here on port ' + PORT +
    '. The control panel + dashboard now live in the <b>Launcher</b> at ' +
    '<a href="http://localhost:8090">http://localhost:8090</a>.</p>'
  );
});

// ---- WebSocket sync ---------------------------------------------------------
const httpServer = createServer(app);
// 64 KB cap: the largest legitimate message is a host's enemy snapshot (a few
// KB). Without a cap, ws accepts up to 100 MB per message — which we would then
// happily relay to every peer (a bandwidth amplification attack).
const wss = new WebSocketServer({ server: httpServer, maxPayload: 64 * 1024 });

/** Number if finite, else the fallback (0 is a valid coordinate/hp!). */
const num = (v: unknown, fb: number): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fb;
};
/** Length-capped string (protects the roster + relays from megabyte "ids"). */
const str = (v: unknown, fb: string, max: number): string =>
  (typeof v === 'string' && v.length > 0 ? v : fb).slice(0, max);

wss.on('connection', (ws: WebSocket) => {
  const id = randomUUID().slice(0, 8);
  let joined = false;
  // a socket that never joins is dead weight — drop it after a grace period
  const joinTimeout = setTimeout(() => { if (!joined) try { ws.close(); } catch { /* */ } }, 15000);

  // per-connection flood guard: a client sends ~12 state + a few coop msgs a
  // second in normal play; 120/s is a generous ceiling that stops a noisy or
  // malicious socket from monopolising the tick loop.
  let msgWindowStart = Date.now();
  let msgCount = 0;

  ws.on('message', (raw) => {
    const nowTs = Date.now();
    if (nowTs - msgWindowStart >= 1000) { msgWindowStart = nowTs; msgCount = 0; }
    if (++msgCount > 120) return; // drop excess this second
    let msg: Record<string, unknown>;
    try { msg = JSON.parse(String(raw)); } catch { return; }
    const now = nowTs;
    switch (msg.t) {
      case 'join': {
        players.set(id, {
          id,
          name: str(msg.name, 'Adventurer', 24),
          classId: str(msg.classId, 'vanguard', 24),
          level: num(msg.level, 1),
          x: num(msg.x, 0),
          y: num(msg.y, 0),
          hp: num(msg.hp, 0),
          levelId: str(msg.levelId, 'town', 40),
          lastSeen: now,
          ws,
        });
        joined = true;
        clearTimeout(joinTimeout);
        send(ws, { t: 'welcome', id, config });
        slog('INFO', 'CONN', `${players.get(id)?.name ?? id} joined as ${players.get(id)?.classId ?? '?'} on ${players.get(id)?.levelId ?? '?'}`);
        break;
      }
      case 'state': {
        const p = players.get(id);
        if (!p) break;
        p.x = num(msg.x, p.x);
        p.y = num(msg.y, p.y);
        p.classId = str(msg.classId, p.classId, 24);
        p.level = num(msg.level, p.level);
        p.hp = num(msg.hp, p.hp);
        p.levelId = str(msg.levelId, p.levelId, 40);
        p.lastSeen = now;
        break;
      }
      case 'ping': {
        const p = players.get(id);
        if (p) p.lastSeen = now;
        break;
      }
      case 'coopState': {
        // host's authoritative enemy snapshot → relay to the rest of the party
        const me = players.get(id);
        if (!me) break;
        if (!Array.isArray(msg.enemies) || msg.enemies.length > 300) break; // sanity cap
        for (const o of players.values()) {
          if (o.id !== id && o.levelId === me.levelId) send(o.ws, { t: 'coopState', enemies: msg.enemies });
        }
        break;
      }
      case 'coopHit': {
        // a guest's damage event → route to this level's enemy host to apply
        const me = players.get(id);
        if (!me) break;
        const hostId = hostIdFor(me.levelId);
        if (hostId && hostId !== id) {
          const h = players.get(hostId);
          if (h) send(h.ws, { t: 'coopHit', netId: num(msg.netId, 0), dmg: Math.max(0, Math.min(100000, num(msg.dmg, 0))), from: id });
        }
        break;
      }
      case 'coopReward': {
        // host → rest of the party: shared XP/gold from a co-op kill
        const me = players.get(id);
        if (!me) break;
        const xp = Math.max(0, Math.min(100000, num(msg.xp, 0)));
        const gold = Math.max(0, Math.min(100000, num(msg.gold, 0)));
        for (const o of players.values()) {
          if (o.id !== id && o.levelId === me.levelId) send(o.ws, { t: 'coopReward', xp, gold });
        }
        break;
      }
      case 'coopLoot': {
        // host → rest of the party: a loot drop (each spawns their own instance)
        const me = players.get(id);
        if (!me) break;
        for (const o of players.values()) {
          if (o.id !== id && o.levelId === me.levelId) send(o.ws, { t: 'coopLoot', loot: msg.loot });
        }
        break;
      }
      // ---- player-to-player trading: point relays to the named peer, tagged
      // with the sender so the receiving client can pair the exchange ----
      case 'tradeRequest':
      case 'tradeAccept':
      case 'tradeCancel': {
        const me = players.get(id);
        const target = players.get(str(msg.to, '', 16));
        if (!me || !target || target.levelId !== me.levelId) break;
        send(target.ws, { t: msg.t, fromId: id, fromName: me.name });
        break;
      }
      case 'tradeUpdate': {
        const me = players.get(id);
        const target = players.get(str(msg.to, '', 16));
        if (!me || !target || target.levelId !== me.levelId) break;
        const items = Array.isArray(msg.items) && msg.items.length <= 12 ? msg.items : [];
        const gold = Math.max(0, Math.min(1000000, num(msg.gold, 0)));
        send(target.ws, { t: 'tradeUpdate', fromId: id, items, gold });
        break;
      }
    }
  });

  ws.on('close', () => {
    clearTimeout(joinTimeout);
    if (joined) {
      const name = players.get(id)?.name ?? id;
      players.delete(id);
      slog('INFO', 'CONN', `${name} disconnected`);
    }
  });
  ws.on('error', () => {});
});

// relay snapshots: each client gets the roster for its own map. Players are
// bucketed by level ONCE per tick and each level's public list is serialized
// ONCE, so the broadcast is O(players) rather than the old O(players^2) filter-
// per-player. Clients drop their own id (sent as `you`) from the list.
const PROFILE = process.env.SB_PROFILE === '1';
let profMax = 0;
let profAcc = 0;
let profN = 0;
setInterval(() => {
  const t0 = PROFILE ? performance.now() : 0;
  const now = Date.now();
  for (const [pid, p] of players) {
    // generous 30s timeout so a brief network/scene-transition hiccup doesn't
    // drop a player from the roster (was causing the dashboard list to flicker).
    if (now - p.lastSeen > 30000) { slog('WARN', 'CONN', `${p.name} timed out`); try { p.ws.close(); } catch { /* */ } players.delete(pid); }
  }
  simulateNpcs(now);

  // bucket players + NPC public views by level (single pass each)
  const byLevel = new Map<string, PlayerState[]>();
  for (const p of players.values()) {
    const g = byLevel.get(p.levelId);
    if (g) g.push(p); else byLevel.set(p.levelId, [p]);
  }
  const npcByLevel = new Map<string, unknown[]>();
  for (const n of npcs.values()) {
    const view = { id: n.id, name: n.name, classId: n.classId, level: 1, x: Math.round(n.x), y: Math.round(n.y), hp: 100, levelId: n.levelId, npc: true };
    const g = npcByLevel.get(n.levelId);
    if (g) g.push(view); else npcByLevel.set(n.levelId, [view]);
  }

  for (const [levelId, group] of byLevel) {
    // enemy host for this level = the smallest player id present
    let hostId = group[0].id;
    for (const p of group) if (p.id < hostId) hostId = p.id;
    // serialize the shared roster ONCE, then stamp each player's host/you flags
    const roster = [...group.map(pub), ...(npcByLevel.get(levelId) ?? [])];
    const rosterJson = JSON.stringify(roster);
    const party = group.length;
    for (const p of group) {
      if (p.ws.readyState !== WebSocket.OPEN) continue;
      p.ws.send(`{"t":"peers","players":${rosterJson},"host":${p.id === hostId},"party":${party},"you":"${p.id}"}`);
    }
  }

  if (PROFILE) {
    const dt = performance.now() - t0;
    profMax = Math.max(profMax, dt);
    profAcc += dt; profN++;
    if (profN >= 16) {
      const mem = Math.round(process.memoryUsage().rss / 1048576);
      slog('INFO', 'PERF', `tick avg ${(profAcc / profN).toFixed(2)}ms max ${profMax.toFixed(2)}ms · players ${players.size} · rss ${mem}MB`);
      profMax = 0; profAcc = 0; profN = 0;
    }
  }
}, 120);

/** The level's enemy host = the smallest player id currently on that level. */
function hostIdFor(levelId: string): string | undefined {
  let hostId: string | undefined;
  for (const o of players.values()) if (o.levelId === levelId && (!hostId || o.id < hostId)) hostId = o.id;
  return hostId;
}

httpServer.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[server] Port ${PORT} is already in use — the game server (or launcher) is probably already running. Not starting a second copy.`);
    process.exit(1);
  }
  throw err;
});

httpServer.listen(PORT, () => {
  console.log(`StrongBow game server + dashboard on http://localhost:${PORT}`);
  console.log(`  WebSocket sync:  ws://localhost:${PORT}`);
});
