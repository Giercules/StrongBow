import type { StatBlock, StatMods, ItemDefinition } from '../core/types';
import { SKILLS } from '../data/skills';
import { ATTRIBUTES } from '../data/attributes';
import {
  HP_PER_LEVEL,
  MP_PER_LEVEL,
  XP_CURVE_BASE,
  XP_CURVE_EXP,
  FELLOWSHIP_XP_SOLO,
  FELLOWSHIP_XP_PER_ALLY,
  FELLOWSHIP_XP_CAP,
} from '../core/constants';

function addMods(into: StatBlock, mods: StatMods, scale = 1): void {
  (Object.keys(mods) as (keyof StatBlock)[]).forEach((k) => {
    const v = mods[k];
    if (typeof v === 'number') into[k] = (into[k] ?? 0) + v * scale;
  });
}

export function computeStats(
  base: StatBlock,
  level: number,
  equipped: ItemDefinition[],
  skillRanks: Record<string, number>,
  attributeRanks: Record<string, number> = {}
): StatBlock {
  const s: StatBlock = { ...base };

  for (const item of equipped) addMods(s, item.mods);

  for (const [id, rank] of Object.entries(skillRanks)) {
    const skill = SKILLS[id];
    if (skill && rank > 0) addMods(s, skill.perRank, rank);
  }

  for (const [id, rank] of Object.entries(attributeRanks)) {
    const attr = ATTRIBUTES[id];
    if (attr && rank > 0) addMods(s, attr.perRank, rank);
  }

  const levelsGained = Math.max(0, level - 1);
  s.maxHealth += levelsGained * HP_PER_LEVEL;
  s.maxMana += levelsGained * MP_PER_LEVEL;

  s.maxHealth = Math.max(1, Math.round(s.maxHealth));
  s.maxMana = Math.max(0, Math.round(s.maxMana));
  s.damage = Math.max(1, Math.round(s.damage));
  s.speed = Math.max(40, Math.round(s.speed));
  s.armor = Math.max(0, s.armor);
  s.critChance = Math.min(0.75, Math.max(0, s.critChance));
  s.fire = Math.max(0, s.fire);
  s.regen = Math.max(0, s.regen);
  s.luck = Math.max(0, Math.round(s.luck ?? 0));
  s.summonBonus = Math.max(0, Math.round(s.summonBonus ?? 0));
  s.cdr = Math.min(0.6, Math.max(0, s.cdr ?? 0));
  s.spellChain = Math.max(0, Math.round(s.spellChain ?? 0));
  return s;
}

/** XP required to climb from `level` to the next. The single source of truth —
 *  the HUD and character sheet both read this, so the bars can't drift from the
 *  ladder the way they did when the formula was copy-pasted into each of them. */
export function xpToNext(level: number): number {
  return Math.floor(XP_CURVE_BASE * Math.pow(level, XP_CURVE_EXP));
}

/**
 * Share of a kill's XP each living roster member banks, by how many of them
 * there are. Summons don't count — they're spent conjurations, not comrades.
 *
 * Deliberately rises with the company: a lone hero banks less than the full
 * kill, a full roster banks more. Bigger parties also face tougher monsters
 * (see MonsterScaling.partySizeAdjustment), so the extra XP is paid for.
 */
export function fellowshipXpScale(livingRoster: number): number {
  const n = Math.max(1, livingRoster);
  return Math.min(FELLOWSHIP_XP_CAP, FELLOWSHIP_XP_SOLO + FELLOWSHIP_XP_PER_ALLY * (n - 1));
}
