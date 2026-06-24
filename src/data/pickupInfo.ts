import type { ItemDefinition, StatMods } from '../core/types';

const LABELS: { key: keyof StatMods; fmt: (v: number) => string }[] = [
  { key: 'damage', fmt: (v) => `${sign(v)}${v} damage` },
  { key: 'armor', fmt: (v) => `${sign(v)}${v} armor` },
  { key: 'maxHealth', fmt: (v) => `${sign(v)}${v} HP` },
  { key: 'maxMana', fmt: (v) => `${sign(v)}${v} MP` },
  { key: 'fire', fmt: (v) => `${sign(v)}${v} fire` },
  { key: 'speed', fmt: (v) => `${sign(v)}${v} speed` },
  { key: 'critChance', fmt: (v) => `${sign(v)}${Math.round(v * 100)}% crit` },
  { key: 'regen', fmt: (v) => `${sign(v)}${v} regen` },
  { key: 'luck', fmt: (v) => `${sign(v)}${v} luck` },
];

function sign(v: number): string {
  return v >= 0 ? '+' : '';
}

/** "+7 damage, +3% crit" — compact stat summary for an item. */
export function describeItemStats(item: ItemDefinition): string {
  const parts: string[] = [];
  for (const { key, fmt } of LABELS) {
    const v = item.mods[key];
    if (typeof v === 'number' && v !== 0) parts.push(fmt(v));
  }
  if (item.heal) parts.push(`heals ${item.heal}`);
  if (item.mana) parts.push(`restores ${item.mana} mana`);
  return parts.join(', ');
}

/** Full one-line description used in pickup barks. */
export function describeItem(item: ItemDefinition): string {
  const stats = describeItemStats(item);
  return stats ? `${item.name} (${stats})` : item.name;
}

/** One stat per line, for the hover tooltip. */
export function itemStatLines(item: ItemDefinition): string[] {
  const lines: string[] = [];
  for (const { key, fmt } of LABELS) {
    const v = item.mods[key];
    if (typeof v === 'number' && v !== 0) lines.push(fmt(v));
  }
  if (item.heal) lines.push(`Heals ${item.heal} HP`);
  if (item.mana) lines.push(`Restores ${item.mana} MP`);
  for (const e of item.effects ?? []) lines.push(e);
  return lines;
}
