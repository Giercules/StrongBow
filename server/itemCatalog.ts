import { ITEMS } from '../src/data/items';
import { UNIQUES } from '../src/data/uniqueItems';
import { ARMOR_SETS, SET_PIECE_SLOTS } from '../src/data/setItems';
import { ALL_THEME_BASES } from '../src/data/themedItems';
import type { HeroClassId } from '../src/core/types';

/** One grantable entry for the server control panel item browser. */
export interface CatalogEntry {
  id: string;
  name: string;
  slot: string;
  category: 'consumable' | 'scroll' | 'fish' | 'gear' | 'key' | 'special' | 'set' | 'unique' | 'themed';
  grantId: string;
  notes?: string;
}

function itemCategory(id: string, slot: string): CatalogEntry['category'] {
  if (id === 'dungeon_key') return 'key';
  if (id.startsWith('scroll_')) return 'scroll';
  if (id === 'old_boot' || id.includes('trout') || id.includes('perch') || id.includes('carp') || id.includes('scale')) return 'fish';
  if (slot === 'consumable') return 'consumable';
  return 'gear';
}

/** Full searchable list of items admins can grant (static + minted specials). */
export function buildItemCatalog(): CatalogEntry[] {
  const out: CatalogEntry[] = [];

  for (const [id, it] of Object.entries(ITEMS)) {
    out.push({
      id,
      name: it.name,
      slot: it.slot,
      category: itemCategory(id, it.slot),
      grantId: id,
      notes: it.flavor?.slice(0, 80),
    });
  }

  out.push({
    id: 'kit_starter',
    name: 'Starter Kit (new player bundle)',
    slot: 'any',
    category: 'special',
    grantId: 'kit:starter',
    notes: '+400 gold, potions, iron sword, jerkin, 3 keys, town portal scroll',
  });

  out.push(
    { id: 'gear_honed', name: 'Random Honed Gear', slot: 'any', category: 'special', grantId: 'gear', notes: 'Themed drop at Honed grade' },
    { id: 'gear_runed', name: 'Random Runed Gear', slot: 'any', category: 'special', grantId: 'gear:runed', notes: 'Themed drop at Runed grade' },
    { id: 'gear_ascendant', name: 'Random Ascendant Gear', slot: 'any', category: 'special', grantId: 'gear:ascendant', notes: 'Themed drop at Ascendant grade' },
    { id: 'gear_godforged', name: 'Random Godforged Gear', slot: 'any', category: 'special', grantId: 'gear:godforged', notes: 'Themed drop at Godforged grade' },
  );

  for (const u of UNIQUES) {
    out.push({
      id: u.id,
      name: u.name,
      slot: u.slot,
      category: 'unique',
      grantId: `unique:${u.id}`,
      notes: u.powerDesc,
    });
  }

  for (const classId of Object.keys(ARMOR_SETS) as HeroClassId[]) {
    const set = ARMOR_SETS[classId];
    for (const slot of SET_PIECE_SLOTS) {
      const p = set.pieces[slot];
      out.push({
        id: `${set.id}_${slot}`,
        name: p.name,
        slot,
        category: 'set',
        grantId: `set:${classId}:${slot}`,
        notes: `${set.name} · Godforged set piece`,
      });
    }
  }

  for (const b of ALL_THEME_BASES) {
    out.push({
      id: b.id,
      name: b.name,
      slot: b.slot,
      category: 'themed',
      grantId: `theme:${b.id}:honed`,
      notes: `Realm theme: ${b.theme ?? 'town'}`,
    });
  }

  return out.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
}