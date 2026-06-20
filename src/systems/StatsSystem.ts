import type { StatBlock, StatMods, ItemDefinition } from '../core/types';
import { SKILLS } from '../data/skills';
import { ATTRIBUTES } from '../data/attributes';
import { HP_PER_LEVEL, MP_PER_LEVEL } from '../core/constants';

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
  return s;
}

export function xpToNext(level: number): number {
  return Math.floor(40 * Math.pow(level, 1.45));
}
