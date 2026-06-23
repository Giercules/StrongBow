import type { ItemDefinition, ThemeId, Grade, ItemSlot, StatMods } from '../core/types';
import { THEME_BASES } from '../data/themedItems';
import { GRADES, rollGrade, scaleMods } from '../data/grades';
import { rollAffixes } from '../data/affixes';
import { Content } from '../content/ContentRegistry';

// ----------------------------------------------------------------------------
// LootSystem — turns a level theme + a hero's luck into a freshly minted,
// graded piece of themed equipment. Minted items are registered with the
// ContentRegistry so they survive level transitions and saves (by id).
// ----------------------------------------------------------------------------

let mintSeq = 0;

function mergeMods(into: StatMods, add: StatMods): void {
  for (const [k, v] of Object.entries(add) as [keyof StatMods, number | undefined][]) {
    if (typeof v === 'number') into[k] = (into[k] ?? 0) + v;
  }
}

/** Build a graded instance from a base template and register it. */
export function mintItem(baseItem: ItemDefinition, grade: Grade): ItemDefinition {
  const g = GRADES[grade];
  const mods = scaleMods(baseItem.mods, g.statMult);
  const affixes = rollAffixes(baseItem.slot, g.affixes);
  for (const a of affixes) mergeMods(mods, a.mods);

  // Godforged gear gets a small luck dividend and inherits any base effects.
  if (grade === 'godforged') mergeMods(mods, { luck: 5 });

  const suffix = affixes.length ? ' ' + affixes[affixes.length - 1].name : '';
  const item: ItemDefinition = {
    id: `mint_${mintSeq++}_${baseItem.id}`,
    name: `${g.prefix} ${baseItem.name}${suffix}`,
    slot: baseItem.slot,
    rarity: g.rarity,
    icon: baseItem.icon,
    mods,
    flavor: baseItem.flavor,
    effects: baseItem.effects ? [...baseItem.effects] : undefined,
    grade,
    baseId: baseItem.id,
    theme: baseItem.theme,
  };
  Content.registerItem(item);
  return item;
}

export interface DropOptions {
  /** Never roll below this grade (e.g. boss drops). */
  floor?: Grade;
  /** Restrict to a slot; otherwise any of the theme's bases. */
  slot?: ItemSlot;
}

/** Mint one piece of themed loot for the given theme + luck. */
export function rollDrop(theme: ThemeId, luck: number, opts: DropOptions = {}): ItemDefinition {
  let bases = THEME_BASES[theme] ?? THEME_BASES.crypt;
  if (opts.slot) {
    const filtered = bases.filter((b) => b.slot === opts.slot);
    if (filtered.length) bases = filtered;
  }
  const baseItem = bases[Math.floor(Math.random() * bases.length)];
  const grade = rollGrade(luck, opts.floor ?? 'cracked');
  return mintItem(baseItem, grade);
}

/** Probability that a slain regular monster drops gear, scaled by luck. */
export function monsterDropChance(luck: number): number {
  return Math.min(0.1, 0.02 + luck * 0.0025);
}

/** Probability that a destroyed generator drops gear, scaled by luck. */
export function generatorDropChance(luck: number): number {
  return Math.min(0.45, 0.18 + luck * 0.006);
}

export function eliteDropChance(luck: number): number {
  return Math.min(0.85, 0.55 + luck * 0.01);
}
