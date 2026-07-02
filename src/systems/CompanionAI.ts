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

/** Combat envelope for a companion. Melee units close in; ranged units hold a
 *  standoff distance and kite so archers/mages actually fight from afar. */
export interface CombatProfile {
  /** Melee reach (px). */
  attackRange: number;
  /** True for bow/staff wielders (arcanist, necromancer, skeleton archer/mage). */
  ranged: boolean;
  /** Farthest distance a ranged unit will loose a shot from. */
  fireRange: number;
  /** Distance a ranged unit tries to keep between itself and its target. */
  standoff: number;
  /** Closer than this, a ranged unit backs away (kites) while shooting. */
  minKite: number;
}

function dist(a: Vec, b: Vec): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Decide a companion's movement and combat intent for this frame.
 * Priority: snap back if past leash -> engage a nearby foe -> follow leader.
 * Melee units run into reach; ranged units hold at `standoff` and kite.
 */
export function decideCompanion<M extends MonsterLike>(
  self: Vec,
  leader: Vec | null,
  monsters: M[],
  cfg: CompanionAISettings,
  manaRatio: number,
  profile: CombatProfile,
  pathDir: Vec | null = null
): CompanionDecision<M> {
  const { attackRange, ranged, fireRange, standoff, minKite } = profile;
  // Prefer a precomputed path step (routes around wall corners) when supplied.
  const towardLeader = (fallbackX: number, fallbackY: number): Vec => {
    if (pathDir && (pathDir.x !== 0 || pathDir.y !== 0)) return { x: pathDir.x, y: pathDir.y };
    return { x: fallbackX, y: fallbackY };
  };
  const none: CompanionDecision<M> = { dirX: 0, dirY: 0, wantAttack: false, wantMagic: false, target: null };

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

  // 1) leashed too far -- return to the leader (path-routed). Checked first so a
  //    kiting archer can't strand itself across the map from the party.
  if (leader && toLeader > cfg.leashDistance) {
    const ux = (leader.x - self.x) / (toLeader || 1);
    const uy = (leader.y - self.y) / (toLeader || 1);
    const p = towardLeader(ux, uy);
    return { dirX: p.x, dirY: p.y, wantAttack: false, wantMagic: false, target: null };
  }

  // 2) engage a foe within our combat envelope
  const meleeAssist = cfg.assistRange * (0.6 + cfg.aggression * 0.8);
  const engage = ranged ? Math.max(fireRange, meleeAssist) : meleeAssist;
  if (target && best <= engage) {
    const ux = (target.x - self.x) / (best || 1);
    const uy = (target.y - self.y) / (best || 1);
    if (ranged) {
      // Hold the standoff line: approach if too far, back off if too close,
      // stand and shoot in the sweet spot. Fire whenever in fireRange.
      let dirX = 0;
      let dirY = 0;
      if (best > standoff) {
        dirX = ux;
        dirY = uy;
      } else if (best < minKite) {
        dirX = -ux;
        dirY = -uy;
      }
      const wantAttack = best <= fireRange && best > 12; // loose a shot
      return { dirX, dirY, wantAttack, wantMagic: false, target };
    }
    // melee: close in and swing; may nova if it has spare mana and a gap to cover
    const inMelee = best <= attackRange + 4;
    const wantMagic = cfg.useMagic && manaRatio > 0.5 && best < engage * 0.7 && best > attackRange;
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
