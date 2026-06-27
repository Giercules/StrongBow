// ----------------------------------------------------------------------------
// NetClient — the game's link to the StrongBow game server. Every client (single
// OR multiplayer) connects: it sends the local hero's presence/position and
// receives the other players sharing the same map, plus the server's AI-NPC
// config. Transport is a plain browser WebSocket; resilient to the server being
// offline (the game stays fully playable solo).
// ----------------------------------------------------------------------------

export interface NetPeer {
  id: string;
  name: string;
  classId: string;
  level: number;
  x: number;
  y: number;
  hp: number;
  levelId: string;
  /** True for server-driven AI NPCs (vs. real remote players). */
  npc?: boolean;
}

export interface NetConfig {
  aiNpcsEnabled: boolean;
  aiNpcCount: number;
  motd: string;
}

/** A loot drop the host shares so every party member gets their own instance. */
export interface CoopLoot {
  x: number;
  y: number;
  coin?: number;
  item?: unknown; // a serialized ItemDefinition (kept loose to decouple the net layer)
}

/** One enemy in the host's authoritative co-op snapshot (Tier 2). */
export interface CoopEnemy {
  netId: number;
  enemyId: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  alive: boolean;
}

export interface NetProfile {
  name: string;
  classId: string;
  level: number;
  x: number;
  y: number;
  hp: number;
  levelId: string;
}

export class NetClient {
  private ws: WebSocket | null = null;
  private url = '';
  connected = false;
  id = '';
  peers: NetPeer[] = [];
  config: NetConfig = { aiNpcsEnabled: false, aiNpcCount: 2, motd: '' };
  /** Tier 2 co-op: am I the enemy host for my current map, and how many of us are here. */
  isHost = false;
  partySize = 1;

  onConnect?: (config: NetConfig) => void;
  onDisconnect?: () => void;
  onAnnounce?: (text: string) => void;
  onKicked?: () => void;
  onCoopState?: (enemies: CoopEnemy[]) => void;
  onCoopHit?: (netId: number, dmg: number) => void;
  onCoopReward?: (xp: number, gold: number) => void;
  onCoopLoot?: (loot: CoopLoot) => void;

  private profile: NetProfile = { name: 'Adventurer', classId: 'vanguard', level: 1, x: 0, y: 0, hp: 0, levelId: 'town' };
  private lastSent = 0;
  private wantConnected = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  /** Open (or re-open) a connection to ws://host:port. Safe to call repeatedly;
   *  auto-reconnects in the background if the server drops or isn't up yet. */
  connect(url: string, profile: Partial<NetProfile> = {}): void {
    Object.assign(this.profile, profile);
    this.wantConnected = true;
    if (this.ws && this.url === url && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return; // already linked to this server
    }
    this.url = url;
    this.openSocket();
  }

  private openSocket(): void {
    try {
      this.ws = new WebSocket(this.url);
    } catch {
      this.connected = false;
      this.scheduleReconnect();
      return;
    }
    this.ws.onopen = () => this.send({ t: 'join', ...this.profile });
    this.ws.onmessage = (e) => this.handle(e.data);
    this.ws.onclose = () => {
      this.connected = false;
      this.peers = [];
      this.onDisconnect?.();
      this.scheduleReconnect();
    };
    this.ws.onerror = () => { /* stays solo if unreachable */ };
  }

  private scheduleReconnect(): void {
    if (!this.wantConnected || this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.wantConnected) this.openSocket();
    }, 3000);
  }

  private handle(data: unknown): void {
    let msg: Record<string, unknown>;
    try { msg = JSON.parse(String(data)); } catch { return; }
    switch (msg.t) {
      case 'welcome':
        this.connected = true;
        this.id = String(msg.id ?? '');
        if (msg.config) this.config = msg.config as NetConfig;
        this.onConnect?.(this.config);
        break;
      case 'peers':
        this.peers = (msg.players as NetPeer[]) ?? [];
        this.isHost = !!msg.host;
        this.partySize = Number(msg.party) || 1;
        break;
      case 'coopState':
        this.onCoopState?.((msg.enemies as CoopEnemy[]) ?? []);
        break;
      case 'coopHit':
        this.onCoopHit?.(Number(msg.netId), Number(msg.dmg));
        break;
      case 'coopReward':
        this.onCoopReward?.(Number(msg.xp), Number(msg.gold));
        break;
      case 'coopLoot':
        this.onCoopLoot?.(msg.loot as CoopLoot);
        break;
      case 'config':
        this.config = (msg.config as NetConfig) ?? this.config;
        break;
      case 'announce':
        this.onAnnounce?.(String(msg.text ?? ''));
        break;
      case 'kicked':
        this.onKicked?.();
        this.disconnect();
        break;
    }
  }

  private send(m: unknown): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(m));
  }

  /** Host → party: broadcast the authoritative enemy snapshot. */
  sendCoopState(enemies: CoopEnemy[]): void {
    if (this.connected) this.send({ t: 'coopState', enemies });
  }

  /** Guest → host: report a hit on an enemy for the host to apply. */
  sendCoopHit(netId: number, dmg: number): void {
    if (this.connected) this.send({ t: 'coopHit', netId, dmg });
  }

  /** Host → party: shared XP + gold reward from a co-op kill. */
  sendCoopReward(xp: number, gold: number): void {
    if (this.connected) this.send({ t: 'coopReward', xp, gold });
  }

  /** Host → party: a loot drop so each member spawns their own instance. */
  sendCoopLoot(loot: CoopLoot): void {
    if (this.connected) this.send({ t: 'coopLoot', loot });
  }

  /** Push the local hero's latest state (throttled to ~12/s). Call each frame. */
  update(state: Partial<NetProfile>): void {
    Object.assign(this.profile, state);
    if (!this.connected) return;
    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    if (now - this.lastSent < 80) return;
    this.lastSent = now;
    this.send({ t: 'state', ...this.profile });
  }

  disconnect(): void {
    this.wantConnected = false;
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    try { this.ws?.close(); } catch { /* */ }
    this.ws = null;
    this.connected = false;
    this.peers = [];
  }
}

/** Shared client used across scenes. */
export const net = new NetClient();
