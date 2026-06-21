import type { ItemDefinition, ItemSlot } from '../core/types';

export interface UseResult {
  heal: number;
  mana: number;
  consumed: boolean;
}

// Per-hero inventory: bag, equipped gear, gold and keys.
export class Inventory {
  bag: ItemDefinition[] = [];
  equipped: Partial<Record<ItemSlot, ItemDefinition>> = {};
  gold = 0;
  keys = 0;

  /** Add an item. Equips gear automatically if the slot is empty. */
  add(item: ItemDefinition): void {
    if (item.slot === 'consumable') {
      this.bag.push(item);
      return;
    }
    if (!this.equipped[item.slot]) {
      this.equipped[item.slot] = item;
    } else {
      this.bag.push(item);
    }
  }

  equip(item: ItemDefinition): void {
    if (item.slot === 'consumable') return;
    const idx = this.bag.indexOf(item);
    if (idx >= 0) this.bag.splice(idx, 1);
    const prev = this.equipped[item.slot];
    this.equipped[item.slot] = item;
    if (prev) this.bag.push(prev);
  }

  unequip(slot: ItemSlot): void {
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
    const slotRank: Record<string, number> = { weapon: 0, armor: 1, trinket: 2, consumable: 3 };
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
