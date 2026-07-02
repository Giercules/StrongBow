import type { EnemyId } from '../core/types';
import { ENEMIES } from '../data/enemies';

// ----------------------------------------------------------------------------
// QuestSystem — the Hearthwatch notice board and the town's opinion of you.
//
// Contracts come in three shapes:
//   BOUNTY — slay N of a named foe (anywhere they roam).
//   GATHER — recover N Undermaw relics from a realm (kills there uncover them).
//   RESCUE — a caged villager waits somewhere in a realm; set them free.
// Rewards pay gold + XP + REPUTATION. Reputation is the party's standing in
// Hearthwatch: it sweetens shop prices and unlocks warmer townsfolk dialogue.
// The log is a session singleton (like settings/audio) persisted via SaveData.
// ----------------------------------------------------------------------------

export type QuestKind = 'bounty' | 'gather' | 'rescue';

export interface Quest {
  id: string;
  kind: QuestKind;
  title: string;
  desc: string;
  targetEnemy?: EnemyId;
  realmId: string;
  realmName: string;
  need: number;
  progress: number;
  gold: number;
  xp: number;
  rep: number;
  done: boolean;
  turnedIn: boolean;
}

export interface QuestLogState {
  reputation: number;
  offers: Quest[];
  active: Quest[];
}

/** Foes worth a bounty in each realm (non-boss regulars of its theme). */
const REALM_ENEMIES: Record<string, EnemyId[]> = {
  sunken_crypt: ['grunt', 'ghost', 'bone_archer', 'brute'],
  molten_deep: ['imp', 'demon'],
  frozen_cathedral: ['frost_shade', 'rime_archer'],
  toxic_undercroft: ['plague_ooze', 'spore_imp'],
  clockwork_vault: ['gear_knight', 'brass_sentinel'],
  blood_arena: ['gladiator'],
  drowned_bog: ['mire_lurker'],
  storm_spire: ['storm_wisp', 'sky_lancer'],
  shadow_warren: ['shadow_stalker', 'void_imp'],
  undermaw_sanctum: ['hollow_knight', 'void_imp'],
};

const REALM_NAMES: Record<string, string> = {
  sunken_crypt: 'Sunken Crypt',
  molten_deep: 'Molten Deep',
  frozen_cathedral: 'Frozen Cathedral',
  toxic_undercroft: 'Toxic Undercroft',
  clockwork_vault: 'Clockwork Vault',
  blood_arena: 'Blood Arena',
  drowned_bog: 'Drowned Bog',
  storm_spire: 'Storm Spire',
  shadow_warren: 'Shadow Warren',
  undermaw_sanctum: 'Sanctum of the Undermaw',
};

const REALM_ORDER = Object.keys(REALM_ENEMIES);

export const REP_TIERS: { at: number; title: string }[] = [
  { at: 0, title: 'Stranger' },
  { at: 10, title: 'Known in the Market' },
  { at: 25, title: 'Friend of Hearthwatch' },
  { at: 50, title: 'Shield of the Town' },
  { at: 100, title: 'Legend of the Undermaw' },
];

let questSeq = 0;

export class QuestLog {
  reputation = 0;
  offers: Quest[] = [];
  active: Quest[] = [];

  repTitle(): string {
    let title = REP_TIERS[0].title;
    for (const t of REP_TIERS) if (this.reputation >= t.at) title = t.title;
    return title;
  }

  /** Shop sweetener from standing: up to 12% better buy AND sell prices. */
  repDiscount(): number {
    return Math.min(0.12, this.reputation * 0.0015);
  }

  /** Keep three fresh contracts pinned, drawn from unlocked realms only. */
  refreshOffers(unlockedRealms: number): void {
    const pool = REALM_ORDER.slice(0, Math.max(1, Math.min(unlockedRealms, REALM_ORDER.length)));
    while (this.offers.length < 3) {
      const realmId = pool[Math.floor(Math.random() * pool.length)];
      const tier = REALM_ORDER.indexOf(realmId);
      const roll = Math.random();
      const kind: QuestKind = roll < 0.45 ? 'bounty' : roll < 0.75 ? 'gather' : 'rescue';
      this.offers.push(this.mint(kind, realmId, tier));
    }
  }

  private mint(kind: QuestKind, realmId: string, tier: number): Quest {
    const realmName = REALM_NAMES[realmId] ?? realmId;
    const base: Omit<Quest, 'title' | 'desc' | 'need' | 'gold' | 'xp' | 'rep'> = {
      id: `q_${questSeq++}_${Math.floor(Math.random() * 1e6)}`,
      kind,
      realmId,
      realmName,
      progress: 0,
      done: false,
      turnedIn: false,
    };
    if (kind === 'bounty') {
      const foes = REALM_ENEMIES[realmId];
      const target = foes[Math.floor(Math.random() * foes.length)];
      const need = 6 + Math.floor(Math.random() * 5) + tier;
      return {
        ...base,
        targetEnemy: target,
        title: `Bounty: ${ENEMIES[target].name}s`,
        desc: `The town posts coin for ${need} ${ENEMIES[target].name}s put down. They den in the ${realmName}.`,
        need,
        gold: 50 + tier * 35 + need * 6,
        xp: 60 + tier * 50,
        rep: 3 + Math.floor(tier / 2),
      };
    }
    if (kind === 'gather') {
      const need = 3 + Math.floor(Math.random() * 2) + Math.floor(tier / 3);
      return {
        ...base,
        title: `Relics of the ${realmName}`,
        desc: `The archivists will pay for ${need} Undermaw relics. Slay the ${realmName}'s creatures and search what they guarded.`,
        need,
        gold: 80 + tier * 45,
        xp: 70 + tier * 55,
        rep: 4 + Math.floor(tier / 2),
      };
    }
    return {
      ...base,
      title: `Rescue in the ${realmName}`,
      desc: `A villager was dragged below and caged somewhere in the ${realmName}. Find them and break the lock.`,
      need: 1,
      gold: 40 + tier * 30,
      xp: 90 + tier * 60,
      rep: 6 + Math.floor(tier / 2),
    };
  }

  accept(id: string): Quest | null {
    const idx = this.offers.findIndex((q) => q.id === id);
    if (idx < 0 || this.active.length >= 3) return null;
    const q = this.offers.splice(idx, 1)[0];
    this.active.push(q);
    return q;
  }

  abandon(id: string): void {
    this.active = this.active.filter((q) => q.id !== id);
  }

  /** Advance bounty/gather progress on a kill. Returns quests that advanced. */
  onKill(enemyId: EnemyId, levelId: string): Quest[] {
    const advanced: Quest[] = [];
    for (const q of this.active) {
      if (q.done) continue;
      if (q.kind === 'bounty' && q.targetEnemy === enemyId) {
        q.progress++;
        advanced.push(q);
      } else if (q.kind === 'gather' && q.realmId === levelId && Math.random() < 0.4) {
        q.progress++;
        advanced.push(q);
      }
      if (q.progress >= q.need) q.done = true;
    }
    return advanced;
  }

  /** A rescue quest waiting to place its cage in this realm, if any. */
  pendingRescue(levelId: string): Quest | null {
    return this.active.find((q) => q.kind === 'rescue' && q.realmId === levelId && !q.done) ?? null;
  }

  completeRescue(id: string): void {
    const q = this.active.find((qq) => qq.id === id);
    if (q) {
      q.progress = q.need;
      q.done = true;
    }
  }

  /** Contracts finished and awaiting payout at the board. */
  readyToTurnIn(): Quest[] {
    return this.active.filter((q) => q.done && !q.turnedIn);
  }

  turnIn(id: string): Quest | null {
    const q = this.active.find((qq) => qq.id === id && qq.done && !qq.turnedIn);
    if (!q) return null;
    q.turnedIn = true;
    this.active = this.active.filter((qq) => qq !== q);
    this.reputation += q.rep;
    return q;
  }

  serialize(): QuestLogState {
    return { reputation: this.reputation, offers: this.offers, active: this.active };
  }

  restore(state?: QuestLogState): void {
    if (!state) return;
    this.reputation = state.reputation ?? 0;
    this.offers = state.offers ?? [];
    this.active = state.active ?? [];
  }
}

/** The one town notice board, shared across scenes for the whole session. */
export const questLog = new QuestLog();
