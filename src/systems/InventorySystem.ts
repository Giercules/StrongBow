import type { ItemDefinition, ItemSlot, EquipSlot } from '../core/types';
import { equipTargets } from '../core/equipment';

export interface UseResult {
  heal: number;
  mana: number;
  consumed: boolean;
}

// Per-hero inventory: bag, equipped gear, gold and keys.
export class Inventory {
  bag: ItemDefinition[] = [];
  equipped: Partial<Record<EquipSlot, ItemDefinition>> = {};
  gold = 0;
  keys = 0;

  /** Add an item. Equips gear automatically if a matching slot is free. */
  add(item: ItemDefinition): void {
    if (item.slot === 'consumable') {
      this.bag.push(item);
      return;
    }
    const empty = equipTargets(item.slot).find((t) => !this.equipped[t]);
    if (empty) this.equipped[empty] = item;
    else this.bag.push(item);
  }

  equip(item: ItemDefinition): void {
    if (item.slot === 'consumable') return;
    const idx = this.bag.indexOf(item);
    if (idx >= 0) this.bag.splice(idx, 1);
    const targets = equipTargets(item.slot);
    if (targets.length === 0) {
      this.bag.push(item);
      return;
    }
    const slot = targets.find((t) => !this.equipped[t]) ?? targets[0];
    const prev = this.equipped[slot];
    this.equipped[slot] = item;
    if (prev) this.bag.push(prev);
  }

  unequip(slot: EquipSlot): void {
    const prev = this.equipped[slot];
    if (prev) {
      this.bag.push(prev);
      delete this.equipped[slot];
    }
  }

  equippedList(): ItemDefinition[] {
    return Object.values(this.equipped).filter(Boolean) as ItemDefinition[];
  }

  consume(item: ItemDefinition): UseResult {
    const idx = this.bag.indexOf(item);
    if (idx < 0 || item.slot !== 'consumable') return { heal: 0, mana: 0, consumed: false };
    this.bag.splice(idx, 1);
    return { heal: item.heal ?? 0, mana: item.mana ?? 0, consumed: true };
  }

  firstConsumable(kind: 'health' | 'mana'): ItemDefinition | undefined {
    return this.bag.find((i) =>
      i.slot === 'consumable' && (kind === 'health' ? !!i.heal : !!i.mana)
    );
  }

  /** Tidy the bag: weapons → armor → trinkets → consumables, best rarity first. */
  sortBag(): void {
    const slotRank: Record<string, number> = { weapon: 0, shield: 1, head: 2, body: 3, legs: 4, hands: 5, feet: 6, amulet: 7, ring: 8, consumable: 9 };
    const rarityRank: Record<string, number> = { legendary: 0, epic: 1, rare: 2, uncommon: 3, common: 4 };
    this.bag.sort(
      (a, b) =>
        (slotRank[a.slot] ?? 9) - (slotRank[b.slot] ?? 9) ||
        (rarityRank[a.rarity] ?? 9) - (rarityRank[b.rarity] ?? 9) ||
        a.name.localeCompare(b.name)
    );
  }

  addGold(n: number): void {
    this.gold += n;
  }
  addKey(n = 1): void {
    this.keys += n;
  }
  useKey(): boolean {
    if (this.keys > 0) {
      this.keys--;
      return true;
    }
    return false;
  }
}
