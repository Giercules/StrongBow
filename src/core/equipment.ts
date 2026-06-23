import type { ItemSlot, EquipSlot } from './types';

// ----------------------------------------------------------------------------
// equipment — the worn-slot model. Separates *what an item is* (ItemSlot) from
// *where it is worn* (EquipSlot); rings fill either of two ring slots.
// ----------------------------------------------------------------------------

/** Worn slots in the order the inventory shows them. */
export const EQUIP_SLOTS: EquipSlot[] = [
  'weapon', 'shield', 'head', 'body', 'legs', 'hands', 'feet', 'amulet', 'ring1', 'ring2',
];

/** Short human label for each worn slot. */
export const EQUIP_SLOT_LABEL: Record<EquipSlot, string> = {
  weapon: 'Weapon',
  shield: 'Shield',
  head: 'Head',
  body: 'Body',
  legs: 'Legs',
  hands: 'Gloves',
  feet: 'Boots',
  amulet: 'Amulet',
  ring1: 'Ring I',
  ring2: 'Ring II',
};

/** The worn slot(s) an item of the given kind may occupy. */
export function equipTargets(slot: ItemSlot): EquipSlot[] {
  if (slot === 'ring') return ['ring1', 'ring2'];
  if (slot === 'consumable') return [];
  return [slot as EquipSlot];
}

/** The item kind that fits a worn slot (ring1/ring2 -> ring). */
export function itemSlotOf(eq: EquipSlot): ItemSlot {
  return eq === 'ring1' || eq === 'ring2' ? 'ring' : (eq as ItemSlot);
}

/** Map a legacy (pre-expansion) worn-slot key onto the new model. */
export function migrateEquipKey(key: string): EquipSlot {
  if (key === 'armor') return 'body';
  if (key === 'trinket') return 'amulet';
  return key as EquipSlot;
}

/** Map a legacy item slot onto the new model (minted gear in old saves). */
export function migrateItemSlot(slot: string, icon?: string): ItemSlot {
  if (slot === 'armor') return 'body';
  if (slot === 'trinket') return icon === 'icon-ring' ? 'ring' : 'amulet';
  return slot as ItemSlot;
}
