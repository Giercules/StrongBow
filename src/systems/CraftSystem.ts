import type { ItemDefinition, Grade } from '../core/types';
import { ALL_THEME_BASES } from '../data/themedItems';
import { GRADE_ORDER, GRADES } from '../data/grades';
import { mintItem } from './LootSystem';
import type { Inventory } from './InventorySystem';

// ----------------------------------------------------------------------------
// CraftSystem — Brunda's forge work.
//   SALVAGE  gear → scrap iron / arcane essence / godshards.
//   REFORGE  reroll a graded item's affixes (same grade, fresh mods).
//   ASCEND   raise a graded item one grade (cracked → ... → godforged).
// Set pieces and uniques are too strange to reforge — salvage only.
// ----------------------------------------------------------------------------

export interface MatCost {
  scrap?: number;
  essence?: number;
  shard?: number;
  gold?: number;
}

const BASE_BY_ID = new Map(ALL_THEME_BASES.map((b) => [b.id, b]));

/** What melting an item down yields, by its quality. */
export function salvageYield(item: ItemDefinition): MatCost {
  if (item.setId || item.unique) return { scrap: 3, essence: 2, shard: 1 };
  switch (item.grade) {
    case 'godforged': return { scrap: 3, essence: 2, shard: 1 };
    case 'ascendant': return { scrap: 3, essence: 2 };
    case 'runed': return { scrap: 2, essence: 1 };
    case 'honed': return { scrap: 2 };
    default: return { scrap: 1 };
  }
}

/** True when the forge can rework this item (graded, from a known base). */
export function reworkable(item: ItemDefinition): boolean {
  return !!item.grade && !!item.baseId && BASE_BY_ID.has(item.baseId) && !item.setId && !item.unique;
}

export function reforgeCost(item: ItemDefinition): MatCost | null {
  if (!reworkable(item)) return null;
  const tier = GRADE_ORDER.indexOf(item.grade!);
  return { essence: 1, gold: 60 + tier * 50 };
}

const ASCEND_COSTS: Partial<Record<Grade, MatCost>> = {
  honed: { scrap: 3, gold: 40 },       // cracked -> honed
  runed: { scrap: 5, essence: 1, gold: 100 },
  ascendant: { essence: 3, gold: 220 },
  godforged: { shard: 2, gold: 500 },
};

export function ascendCost(item: ItemDefinition): MatCost | null {
  if (!reworkable(item)) return null;
  const tier = GRADE_ORDER.indexOf(item.grade!);
  if (tier >= GRADE_ORDER.length - 1) return null; // already godforged
  return ASCEND_COSTS[GRADE_ORDER[tier + 1]] ?? null;
}

export function canAfford(inv: Inventory, cost: MatCost): boolean {
  const m = inv.materials;
  return (
    m.scrap >= (cost.scrap ?? 0) &&
    m.essence >= (cost.essence ?? 0) &&
    m.shard >= (cost.shard ?? 0) &&
    inv.gold >= (cost.gold ?? 0)
  );
}

export function pay(inv: Inventory, cost: MatCost): void {
  inv.materials.scrap -= cost.scrap ?? 0;
  inv.materials.essence -= cost.essence ?? 0;
  inv.materials.shard -= cost.shard ?? 0;
  inv.gold -= cost.gold ?? 0;
}

export function grant(inv: Inventory, yieldd: MatCost): void {
  inv.materials.scrap += yieldd.scrap ?? 0;
  inv.materials.essence += yieldd.essence ?? 0;
  inv.materials.shard += yieldd.shard ?? 0;
  inv.gold += yieldd.gold ?? 0;
}

export function fmtCost(cost: MatCost): string {
  const parts: string[] = [];
  if (cost.scrap) parts.push(`${cost.scrap} scrap`);
  if (cost.essence) parts.push(`${cost.essence} essence`);
  if (cost.shard) parts.push(`${cost.shard} godshard`);
  if (cost.gold) parts.push(`${cost.gold}g`);
  return parts.join(' + ') || 'free';
}

/** Reroll the item's affixes: a fresh mint of the same base at the same grade. */
export function reforge(item: ItemDefinition): ItemDefinition | null {
  if (!reworkable(item)) return null;
  const base = BASE_BY_ID.get(item.baseId!);
  if (!base) return null;
  return mintItem(base, item.grade!);
}

/** Raise the item one grade: a fresh mint of the same base, one tier up. */
export function ascend(item: ItemDefinition): ItemDefinition | null {
  if (!reworkable(item)) return null;
  const base = BASE_BY_ID.get(item.baseId!);
  const tier = GRADE_ORDER.indexOf(item.grade!);
  if (!base || tier >= GRADE_ORDER.length - 1) return null;
  return mintItem(base, GRADE_ORDER[tier + 1]);
}

/** Grade label helper for craft rows. */
export function gradeTag(item: ItemDefinition): string {
  return item.grade ? GRADES[item.grade].prefix : item.setId ? 'Set' : item.unique ? 'Unique' : '—';
}
