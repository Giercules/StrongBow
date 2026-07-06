import type { ItemDefinition, HeroClassId, StatMods, EquipSlot, Grade, Rarity } from '../core/types';
import { equipTargets } from '../core/equipment';
import type { Inventory } from './InventorySystem';
import { ARMOR_SETS } from '../data/setItems';

export type ItemCompareVerdict = 'better' | 'worse' | 'equal' | 'none';

const STAT_WEIGHTS: { key: keyof StatMods; w: number }[] = [
  { key: 'damage', w: 3 },
  { key: 'armor', w: 2.5 },
  { key: 'maxHealth', w: 0.08 },
  { key: 'maxMana', w: 0.1 },
  { key: 'fire', w: 2 },
  { key: 'speed', w: 0.15 },
  { key: 'critChance', w: 2 },
  { key: 'regen', w: 4 },
  { key: 'luck', w: 1.5 },
  { key: 'summonBonus', w: 6 },
  { key: 'cdr', w: 2 },
  { key: 'spellChain', w: 5 },
];

const GRADE_RANK: Record<Grade, number> = { cracked: 0, honed: 1, runed: 2, ascendant: 3, godforged: 4 };
const RARITY_RANK: Record<Rarity, number> = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };

function modScore(key: keyof StatMods, v: number): number {
  const w = STAT_WEIGHTS.find((e) => e.key === key)?.w ?? 1;
  const scaled = key === 'critChance' || key === 'cdr' ? v * 100 : v;
  return scaled * w;
}

function itemPowerScore(item: ItemDefinition, classId?: HeroClassId): number {
  let score = 0;
  for (const { key } of STAT_WEIGHTS) {
    const v = item.mods[key];
    if (typeof v === 'number') score += modScore(key, v);
  }
  if (item.effects?.length) score += item.effects.length * 3;
  if (item.unique) score += 14;
  if (item.setId && classId && item.setId === ARMOR_SETS[classId]?.id) score += 9;
  if (item.grade) score += (GRADE_RANK[item.grade] ?? 0) * 2;
  score += (RARITY_RANK[item.rarity] ?? 0) * 0.75;
  return score;
}

/** Worn slot that would receive (or be replaced by) this item. */
export function equipSwapSlot(inventory: Inventory, item: ItemDefinition): EquipSlot | undefined {
  if (item.slot === 'consumable' || item.quest) return undefined;
  const targets = equipTargets(item.slot);
  if (targets.length === 0) return undefined;
  return targets.find((t) => !inventory.equipped[t]) ?? targets[0];
}

/** Currently worn piece that would be swapped out, if any. */
export function wornItemFor(inventory: Inventory, item: ItemDefinition): ItemDefinition | undefined {
  const slot = equipSwapSlot(inventory, item);
  if (!slot) return undefined;
  return inventory.equipped[slot];
}

export function compareItems(
  candidate: ItemDefinition,
  worn: ItemDefinition | undefined,
  classId?: HeroClassId
): ItemCompareVerdict {
  if (candidate.slot === 'consumable' || candidate.quest) return 'none';
  if (!worn) return 'better';
  const diff = itemPowerScore(candidate, classId) - itemPowerScore(worn, classId);
  if (Math.abs(diff) < 1) return 'equal';
  return diff > 0 ? 'better' : 'worse';
}

export function compareVerdictLabel(v: ItemCompareVerdict): string {
  if (v === 'better') return '▲ Upgrade';
  if (v === 'worse') return '▼ Downgrade';
  if (v === 'equal') return '≈ Sidegrade';
  return '';
}

export function compareVerdictColor(v: ItemCompareVerdict): string {
  if (v === 'better') return '#5fd67a';
  if (v === 'worse') return '#e85d5d';
  if (v === 'equal') return '#9a8a66';
  return '#9a8a66';
}

export function compareArrow(v: ItemCompareVerdict): string {
  if (v === 'better') return '▲';
  if (v === 'worse') return '▼';
  return '';
}

export function compareArrowColor(v: ItemCompareVerdict): string {
  return compareVerdictColor(v);
}

/** Tint for a candidate stat line vs the worn piece (undefined = neutral). */
export function statLineCompareColor(
  key: keyof StatMods,
  candidate: ItemDefinition,
  worn?: ItemDefinition
): string | undefined {
  if (!worn) return '#5fd67a';
  const a = candidate.mods[key];
  const b = worn.mods[key];
  const av = typeof a === 'number' ? a : 0;
  const bv = typeof b === 'number' ? b : 0;
  if (av === bv) return undefined;
  return av > bv ? '#5fd67a' : '#e85d5d';
}