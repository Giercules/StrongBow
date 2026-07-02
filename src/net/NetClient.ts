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
  onGrant?: (gold: number, itemId?: string) => void;
  // player-to-player trading (relayed by the server to the named peer)
  onTradeRequest?: (fromId: string, fromName: string) => void;
  onTradeUpdate?: (fromId: string, items: unknown[], gold: number) => void;
  onTradeAccept?: (fromId: string) => void;
  onTradeCancel?: (fromId: string) => void;

  private profile: NetProfile = { name: 'Adventurer', classId: 'vanguard', level: 1, x: 0, y: 0, hp: 0, levelId: 'town' };
  private lastSent = 0;
  private wantConnected = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private keepalive: ReturnType<typeof setInterval> | null = null;

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
    // Detach + close any previous socket first. Without this, switching server
    // URLs leaks the old connection, and its onclose fires a reconnect loop
    // that opens DUPLICATE sockets (ghost players on the server roster).
    if (this.ws) {
      const old = this.ws;
      old.onopen = null;
      old.onmessage = null;
      old.onclose = null;
      old.onerror = null;
      try { old.close(); } catch { /* already closed */ }
      this.ws = null;
    }
    try {
      this.ws = new WebSocket(this.url);
    } catch {
      this.connected = false;
      this.scheduleReconnect();
      return;
    }
    this.ws.onopen = () => {
      this.send({ t: 'join', ...this.profile });
      // keepalive so a backgrounded tab (throttled rAF) isn't dropped by the server
      if (this.keepalive) clearInterval(this.keepalive);
      this.keepalive = setInterval(() => this.send({ t: 'ping' }), 5000);
    };
    this.ws.onmessage = (e) => this.handle(e.data);
    this.ws.onclose = () => {
      this.connected = false;
      this.peers = [];
      if (this.keepalive) { clearInterval(this.keepalive); this.keepalive = null; }
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
      case 'peers': {
        // The server now sends the whole level roster (one shared, pre-serialized
        // list) including us; drop our own id so we don't render a ghost of self.
        const list = (msg.players as NetPeer[]) ?? [];
        const me = typeof msg.you === 'string' ? msg.you : this.id;
        this.peers = me ? list.filter((p) => p.id !== me) : list;
        this.isHost = !!msg.host;
        this.partySize = Number(msg.party) || 1;
        break;
      }
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
      case 'grant':
        this.onGrant?.(Number(msg.gold) || 0, typeof msg.itemId === 'string' ? msg.itemId : undefined);
        break;
      case 'tradeRequest':
        this.onTradeRequest?.(String(msg.fromId ?? ''), String(msg.fromName ?? 'Adventurer'));
        break;
      case 'tradeUpdate':
        this.onTradeUpdate?.(String(msg.fromId ?? ''), (msg.items as unknown[]) ?? [], Number(msg.gold) || 0);
        break;
      case 'tradeAccept':
        this.onTradeAccept?.(String(msg.fromId ?? ''));
        break;
      case 'tradeCancel':
        this.onTradeCancel?.(String(msg.fromId ?? ''));
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

  /** Ask a nearby player to trade. */
  sendTradeRequest(to: string): void {
    if (this.connected) this.send({ t: 'tradeRequest', to });
  }

  /** Update my side of an open trade: offered items (full defs) + gold. */
  sendTradeUpdate(to: string, items: unknown[], gold: number): void {
    if (this.connected) this.send({ t: 'tradeUpdate', to, items, gold });
  }

  sendTradeAccept(to: string): void {
    if (this.connected) this.send({ t: 'tradeAccept', to });
  }

  sendTradeCancel(to: string): void {
    if (this.connected) this.send({ t: 'tradeCancel', to });
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

  /** Detach every scene-bound callback. A scene MUST call this on shutdown —
   *  otherwise a late server message runs against destroyed game objects. */
  clearCallbacks(): void {
    this.onConnect = undefined;
    this.onDisconnect = undefined;
    this.onAnnounce = undefined;
    this.onKicked = undefined;
    this.onCoopState = undefined;
    this.onCoopHit = undefined;
    this.onCoopReward = undefined;
    this.onCoopLoot = undefined;
    this.onGrant = undefined;
    this.onTradeRequest = undefined;
    this.onTradeUpdate = undefined;
    this.onTradeAccept = undefined;
    this.onTradeCancel = undefined;
  }

  disconnect(): void {
    this.wantConnected = false;
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    if (this.keepalive) { clearInterval(this.keepalive); this.keepalive = null; }
    try { this.ws?.close(); } catch { /* */ }
    this.ws = null;
    this.connected = false;
    this.peers = [];
  }
}

/** Shared client used across scenes. */
export const net = new NetClient();
