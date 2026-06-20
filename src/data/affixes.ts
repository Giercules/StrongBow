import type { AffixDef } from '../core/types';

// Affix pool — defined for future procedural loot rolling.
export const AFFIXES: AffixDef[] = [
  { id: 'of_the_bear', name: 'of the Bear', slot: 'any', mods: { maxHealth: 20 }, weight: 10 },
  { id: 'of_the_fox', name: 'of the Fox', slot: 'any', mods: { speed: 10 }, weight: 8 },
  { id: 'of_fury', name: 'of Fury', slot: 'weapon', mods: { damage: 4 }, weight: 9 },
  { id: 'of_the_hawk', name: 'of the Hawk', slot: 'weapon', mods: { critChance: 0.05 }, weight: 6 },
  { id: 'of_embers', name: 'of Embers', slot: 'weapon', mods: { fire: 5 }, weight: 5 },
  { id: 'of_warding', name: 'of Warding', slot: 'armor', mods: { armor: 3 }, weight: 9 },
  { id: 'of_renewal', name: 'of Renewal', slot: 'trinket', mods: { regen: 0.5 }, weight: 5 },
  { id: 'of_the_sage', name: 'of the Sage', slot: 'trinket', mods: { maxMana: 25 }, weight: 6 },
];

export function rollAffix(slot: AffixDef['slot']): AffixDef | null {
  const pool = AFFIXES.filter((a) => a.slot === 'any' || a.slot === slot);
  if (pool.length === 0) return null;
  const total = pool.reduce((s, a) => s + a.weight, 0);
  let r = Math.random() * total;
  for (const a of pool) {
    r -= a.weight;
    if (r <= 0) return a;
  }
  return pool[0];
}
