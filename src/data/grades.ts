import type { Grade, Rarity, StatMods } from '../core/types';

// ----------------------------------------------------------------------------
// Equipment grades — the quality tiers that minted (dropped) gear rolls into.
// Weakest -> strongest: Cracked · Honed · Runed · Ascendant · Godforged.
// Each grade scales an item's base mods, grants bonus affix rolls, and the top
// tier stamps a unique perk. Higher Fortune (luck) tilts rolls toward the top.
// ----------------------------------------------------------------------------

export interface GradeDef {
  id: Grade;
  /** Display prefix prepended to the base item name, e.g. "Runed Crypt Knife". */
  prefix: string;
  /** Multiplier applied to every numeric base mod. */
  statMult: number;
  /** Number of random bonus affixes rolled onto the item. */
  affixes: number;
  /** Maps onto the legacy Rarity tier (drives RARITY_COLOR + UI tint). */
  rarity: Rarity;
  /** Hex colour for floating pickup text. */
  color: string;
  /** Base selection weight before luck biasing. */
  weight: number;
  /** Per-grade flavour tag shown after the stat line. */
  tag: string;
}

export const GRADES: Record<Grade, GradeDef> = {
  cracked: {
    id: 'cracked',
    prefix: 'Cracked',
    statMult: 0.7,
    affixes: 0,
    rarity: 'common',
    color: '#c8d0e0',
    weight: 44,
    tag: 'worn and chipped',
  },
  honed: {
    id: 'honed',
    prefix: 'Honed',
    statMult: 1.0,
    affixes: 0,
    rarity: 'uncommon',
    color: '#5fe06a',
    weight: 33,
    tag: 'kept keen',
  },
  runed: {
    id: 'runed',
    prefix: 'Runed',
    statMult: 1.45,
    affixes: 1,
    rarity: 'rare',
    color: '#4fa3ff',
    weight: 15,
    tag: 'etched with one rune',
  },
  ascendant: {
    id: 'ascendant',
    prefix: 'Ascendant',
    statMult: 2.0,
    affixes: 2,
    rarity: 'epic',
    color: '#c06bff',
    weight: 6,
    tag: 'risen beyond its make',
  },
  godforged: {
    id: 'godforged',
    prefix: 'Godforged',
    statMult: 2.8,
    affixes: 3,
    rarity: 'legendary',
    color: '#ffb13a',
    weight: 1.4,
    tag: 'forged by a dead god',
  },
};

export const GRADE_ORDER: Grade[] = ['cracked', 'honed', 'runed', 'ascendant', 'godforged'];

/** Higher grades get an escalating luck bonus to their selection weight, so
 *  Fortune meaningfully shifts the curve toward the top tiers. */
function luckedWeight(g: GradeDef, luck: number): number {
  const tier = GRADE_ORDER.indexOf(g.id); // 0..4
  const lift = 1 + (luck / 100) * tier * tier; // top tier scales hardest
  return g.weight * lift;
}

/** Roll a grade, biased by luck and never below `floor` (e.g. boss drops). */
export function rollGrade(luck: number, floor: Grade = 'cracked'): Grade {
  const minTier = GRADE_ORDER.indexOf(floor);
  const pool = GRADE_ORDER.slice(minTier).map((id) => GRADES[id]);
  const total = pool.reduce((s, g) => s + luckedWeight(g, luck), 0);
  let r = Math.random() * total;
  for (const g of pool) {
    r -= luckedWeight(g, luck);
    if (r <= 0) return g.id;
  }
  return pool[pool.length - 1].id;
}

/** Scale a base mod block by a grade's multiplier (crit stays fractional). */
export function scaleMods(mods: StatMods, mult: number): StatMods {
  const out: StatMods = {};
  for (const [k, v] of Object.entries(mods) as [keyof StatMods, number | undefined][]) {
    if (typeof v !== 'number') continue;
    if (k === 'critChance') out[k] = Math.round(v * mult * 1000) / 1000;
    else if (k === 'regen') out[k] = Math.round(v * mult * 10) / 10;
    else if (k === 'speed') out[k] = Math.round(v * mult); // keep speed penalties/bonuses sane
    else out[k] = Math.round(v * mult);
  }
  return out;
}
