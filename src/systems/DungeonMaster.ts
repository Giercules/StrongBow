import { Tile } from '../core/constants';

/** Tracks what the DM has already narrated so we don't spam API calls or repeat fluff. */
export class DungeonMaster {
  private examined = new Set<string>();
  private lastBarkAt = 0;
  private lastExamineAiAt = 0;
  private lastNpcChatAt = 0;

  static readonly BARK_COOLDOWN_MS = 8000;
  static readonly EXAMINE_AI_COOLDOWN_MS = 18000;
  static readonly NPC_CHAT_COOLDOWN_MS = 12000;

  wasExamined(key: string): boolean {
    return this.examined.has(key);
  }

  markExamined(key: string): void {
    this.examined.add(key);
  }

  canBark(now: number, force = false): boolean {
    if (force) return true;
    return now - this.lastBarkAt >= DungeonMaster.BARK_COOLDOWN_MS;
  }

  recordBark(now: number): void {
    this.lastBarkAt = now;
  }

  /** Stable key for an examine target — used to suppress repeat narration. */
  static examineKey(opts: { npc?: boolean; decor?: string; tile?: number }): string {
    if (opts.npc) return 'npc:gate-warden';
    if (opts.decor) return `decor:${opts.decor}`;
    if (opts.tile != null) return `tile:${opts.tile}`;
    return 'floor';
  }

  /** Hand-crafted lore exists for these; AI should only embellish the first time. */
  static isNoteworthyExamine(key: string): boolean {
    if (key === 'floor') return false;
    if (key.startsWith('tile:')) {
      const tile = Number(key.slice(5));
      return tile === Tile.EXIT || tile === Tile.LAVA || tile === Tile.POISON || tile === Tile.SPIKES;
    }
    return true;
  }

  /** Whether to spend an AI call on this first-time examine. */
  shouldAiExamine(key: string, now: number): boolean {
    if (!DungeonMaster.isNoteworthyExamine(key)) return false;
    if (now - this.lastExamineAiAt < DungeonMaster.EXAMINE_AI_COOLDOWN_MS) return false;
    // Weight toward rarer scene dressing — skip mundane clutter most of the time.
    if (key.startsWith('decor:')) return Math.random() < 0.45;
    return Math.random() < 0.7;
  }

  recordAiExamine(now: number): void {
    this.lastExamineAiAt = now;
  }

  /** Town CHAT already has solid static lines — Grok only occasionally deepens it. */
  shouldNpcAiChat(now: number): boolean {
    if (now - this.lastNpcChatAt < DungeonMaster.NPC_CHAT_COOLDOWN_MS) return false;
    return Math.random() < 0.35;
  }

  recordNpcChat(now: number): void {
    this.lastNpcChatAt = now;
  }

  /** Short dismissive line when the player re-examines something. */
  static repeatExamineLine(key: string): string {
    const lines = [
      'You have already taken its measure.',
      'Nothing new catches your eye.',
      'The dark offers no fresh detail.',
      'You studied this before. Best press on.',
      'Same sight, same silence.',
      'No new secrets here — move along.',
    ];
    let h = 0;
    for (let i = 0; i < key.length; i++) h = (h + key.charCodeAt(i)) % lines.length;
    return lines[h];
  }
}