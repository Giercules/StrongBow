import type { AffixDef, ItemSlot } from '../core/types';

// Affix pool — bonus rolls layered onto minted (dropped) gear by its grade.
const ARMOR_SLOTS = new Set<ItemSlot>(['head', 'body', 'legs', 'hands', 'feet', 'shield']);
const JEWEL_SLOTS = new Set<ItemSlot>(['amulet', 'ring']);

export const AFFIXES: AffixDef[] = [
  { id: 'of_the_bear', name: 'of the Bear', slot: 'any', mods: { maxHealth: 20 }, weight: 10 },
  { id: 'of_the_fox', name: 'of the Fox', slot: 'any', mods: { speed: 10 }, weight: 8 },
  { id: 'of_fortune', name: 'of Fortune', slot: 'any', mods: { luck: 5 }, weight: 7 },
  { id: 'of_the_titan', name: 'of the Titan', slot: 'any', mods: { maxHealth: 35, armor: 2 }, weight: 4 },
  { id: 'of_fury', name: 'of Fury', slot: 'weapon', mods: { damage: 4 }, weight: 9 },
  { id: 'of_the_hawk', name: 'of the Hawk', slot: 'weapon', mods: { critChance: 0.05 }, weight: 6 },
  { id: 'of_embers', name: 'of Embers', slot: 'weapon', mods: { fire: 5 }, weight: 5 },
  { id: 'of_slaughter', name: 'of Slaughter', slot: 'weapon', mods: { damage: 7, critChance: 0.04 }, weight: 3 },
  { id: 'of_warding', name: 'of Warding', slot: 'armorAny', mods: { armor: 3 }, weight: 9 },
  { id: 'of_the_bulwark', name: 'of the Bulwark', slot: 'armorAny', mods: { armor: 5, maxHealth: 20 }, weight: 4 },
  { id: 'of_the_sentinel', name: 'of the Sentinel', slot: 'armorAny', mods: { maxHealth: 30 }, weight: 6 },
  { id: 'of_the_anvil', name: 'of the Anvil', slot: 'armorAny', mods: { armor: 4, speed: -4 }, weight: 4 },
  { id: 'of_renewal', name: 'of Renewal', slot: 'jewelry', mods: { regen: 0.5 }, weight: 5 },
  { id: 'of_the_sage', name: 'of the Sage', slot: 'jewelry', mods: { maxMana: 25 }, weight: 6 },
  { id: 'of_the_magpie', name: 'of the Magpie', slot: 'jewelry', mods: { luck: 9 }, weight: 4 },
  { id: 'of_the_legion', name: 'of the Legion', slot: 'jewelry', mods: { summonBonus: 1 }, weight: 5 },
  { id: 'of_alacrity', name: 'of Alacrity', slot: 'any', mods: { cdr: 0.1 }, weight: 5 },
  { id: 'of_arcing', name: 'of Arcing', slot: 'weapon', mods: { spellChain: 1 }, weight: 4 },
];

function matches(a: AffixDef, slot: ItemSlot): boolean {
  if (a.slot === 'any') return true;
  if (a.slot === 'armorAny') return ARMOR_SLOTS.has(slot);
  if (a.slot === 'jewelry') return JEWEL_SLOTS.has(slot);
  return a.slot === slot;
}

/** Roll N distinct affixes valid for a slot. */
export function rollAffixes(slot: ItemSlot, n: number): AffixDef[] {
  const out: AffixDef[] = [];
  const used = new Set<string>();
  for (let i = 0; i < n; i++) {
    const a = rollAffix(slot);
    if (a && !used.has(a.id)) {
      used.add(a.id);
      out.push(a);
    }
  }
  return out;
}

export function rollAffix(slot: ItemSlot): AffixDef | null {
  const pool = AFFIXES.filter((a) => matches(a, slot));
  if (pool.length === 0) return null;
  const total = pool.reduce((s, a) => s + a.weight, 0);
  let r = Math.random() * total;
  for (const a of pool) {
    r -= a.weight;
    if (r <= 0) return a;
  }
  return pool[0];
}
