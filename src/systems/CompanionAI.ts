import type { CompanionAISettings } from '../core/types';

export interface Vec {
  x: number;
  y: number;
}
export interface MonsterLike extends Vec {
  active: boolean;
}

export interface CompanionDecision<M> {
  dirX: number;
  dirY: number;
  wantAttack: boolean;
  wantMagic: boolean;
  target: M | null;
}

function dist(a: Vec, b: Vec): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Decide a companion's movement and combat intent for this frame.
 * Priority: snap back if past leash -> assist nearby fight -> follow leader.
 */
export function decideCompanion<M extends MonsterLike>(
  self: Vec,
  leader: Vec | null,
  monsters: M[],
  cfg: CompanionAISettings,
  manaRatio: number,
  attackRange = 22,
  pathDir: Vec | null = null
): CompanionDecision<M> {
  // Prefer a precomputed path step (routes around wall corners) when supplied.
  const towardLeader = (fallbackX: number, fallbackY: number): Vec => {
    if (pathDir && (pathDir.x !== 0 || pathDir.y !== 0)) return { x: pathDir.x, y: pathDir.y };
    return { x: fallbackX, y: fallbackY };
  };
  const none: CompanionDecision<M> = {
    dirX: 0,
    dirY: 0,
    wantAttack: false,
    wantMagic: false,
    target: null,
  };

  // nearest live monster
  let target: M | null = null;
  let best = Infinity;
  for (const m of monsters) {
    if (!m.active) continue;
    const d = dist(self, m);
    if (d < best) {
      best = d;
      target = m;
    }
  }

  const toLeader = leader ? dist(self, leader) : 0;

  // 1) leashed too far -- return to the leader (path-routed)
  if (leader && toLeader > cfg.leashDistance) {
    const ux = (leader.x - self.x) / (toLeader || 1);
    const uy = (leader.y - self.y) / (toLeader || 1);
    const p = towardLeader(ux, uy);
    return { dirX: p.x, dirY: p.y, wantAttack: false, wantMagic: false, target: null };
  }

  // 2) assist if a monster is within the aggression-scaled assist range
  const effectiveAssist = cfg.assistRange * (0.6 + cfg.aggression * 0.8);
  if (target && best <= effectiveAssist) {
    const ux = (target.x - self.x) / (best || 1);
    const uy = (target.y - self.y) / (best || 1);
    const inMelee = best <= attackRange + 4;
    const wantMagic = cfg.useMagic && manaRatio > 0.5 && best < effectiveAssist * 0.7 && best > attackRange;
    return {
      dirX: inMelee ? ux * 0.2 : ux,
      dirY: inMelee ? uy * 0.2 : uy,
      wantAttack: inMelee,
      wantMagic,
      target,
    };
  }

  // 3) follow the leader, keeping a comfortable distance (path-routed)
  if (leader && toLeader > cfg.followDistance) {
    const ux = (leader.x - self.x) / (toLeader || 1);
    const uy = (leader.y - self.y) / (toLeader || 1);
    const p = towardLeader(ux, uy);
    return { dirX: p.x, dirY: p.y, wantAttack: false, wantMagic: false, target };
  }

  return none;
}
