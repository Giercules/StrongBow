import Phaser from 'phaser';
import { framedPanel, makeButton, addPinned, truncateToWidth } from './uiHelpers';
import type { Modal } from './uiHelpers';
import { C } from '../rendering/Palette';
import { RARITY_COLOR } from '../data/items';
import { MenuNav } from './MenuNav';
import { ItemTooltip } from './ItemTooltip';
import { compareArrow, compareArrowColor, compareItems, wornItemFor } from '../systems/ItemCompare';
import { audio } from '../systems/AudioSystem';
import type { Hero } from '../entities/Hero';
import type { ItemDefinition, EquipSlot } from '../core/types';
import { EQUIP_SLOTS, EQUIP_SLOT_LABEL } from '../core/equipment';
import { ARMOR_SETS, SET_COLOR } from '../data/setItems';

/** One display row in the backpack: consumables stack into a single row. */
interface BagRow {
  item: ItemDefinition;
  count: number;
}

const PANEL_W = 480;
const PANEL_H = 430;
const SLOTS: EquipSlot[] = EQUIP_SLOTS;
const BAG_PER_PAGE = 9; // keeps the 1-9 hotkeys mapped to exactly one page
const EQ_ROW_W = 200;
const BAG_ROW_W = PANEL_W / 2 - 40;
const numHex = (n: number): string => '#' + n.toString(16).padStart(6, '0');

export class InventoryUI {
  private scene: Phaser.Scene;
  private modal: Modal | null = null;
  private content: Phaser.GameObjects.Container | null = null;
  private hero: Hero | null = null;
  private sel = 0;
  private bagPage = 0;
  private keyHandler?: (e: KeyboardEvent) => void;
  private tip!: ItemTooltip;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  isOpen(): boolean {
    return this.modal !== null;
  }

  open(hero: Hero): void {
    if (this.modal) this.close();
    this.hero = hero;
    this.sel = 0;
    this.bagPage = 0;
    this.modal = framedPanel(this.scene, PANEL_W, PANEL_H, `INVENTORY - ${hero.def.name}`);
    this.content = this.scene.add.container(0, 0).setDepth(this.modal.container.depth + 1);
    this.modal.add(this.content);
    this.keyHandler = (e) => this.onKey(e);
    this.scene.input.keyboard?.on('keydown', this.keyHandler);
    this.tip = new ItemTooltip(this.scene);
    // pad-only nav: the inventory has its own full keyboard scheme already
    this.nav.attach(this.scene, () => this.close(), { keyboard: false });
    this.rebuild();
  }

  close(): void {
    if (this.keyHandler) this.scene.input.keyboard?.off('keydown', this.keyHandler);
    this.keyHandler = undefined;
    this.nav.detach();
    this.tip?.destroy();
    this.content = null;
    this.modal?.destroy();
    this.modal = null;
    this.hero = null;
  }

  private onKey(e: KeyboardEvent): void {
    if (!this.hero) return;
    const h = this.hero;
    if (e.key === 'ArrowUp') {
      this.sel = (this.sel + SLOTS.length - 1) % SLOTS.length;
      this.rebuild();
    } else if (e.key === 'ArrowDown') {
      this.sel = (this.sel + 1) % SLOTS.length;
      this.rebuild();
    } else if (e.key === 'ArrowLeft') {
      this.changePage(-1);
    } else if (e.key === 'ArrowRight') {
      this.changePage(1);
    } else if (e.key === 'u' || e.key === 'U') {
      h.inventory.unequip(SLOTS[this.sel]);
      h.refreshStats();
      audio.sfx('ui_select');
      this.rebuild();
    } else if (e.key === 's' || e.key === 'S') {
      h.inventory.sortBag();
      this.bagPage = 0;
      audio.sfx('ui_select');
      this.rebuild();
    } else if (e.key === 'c' || e.key === 'C') {
      const cons = h.inventory.firstConsumable('health') ?? h.inventory.firstConsumable('mana');
      if (cons) this.useItem(cons);
    } else if (e.key >= '1' && e.key <= '9') {
      const row = this.bagRows()[this.bagPage * BAG_PER_PAGE + Number(e.key) - 1];
      if (row) this.useItem(row.item);
    }
  }

  /** Bag entries with identical consumables (potions/scrolls) stacked as xN.
   *  Gear never stacks — every piece can roll differently. */
  private bagRows(): BagRow[] {
    const rows: BagRow[] = [];
    const stacks = new Map<string, BagRow>();
    for (const it of this.hero?.inventory.bag ?? []) {
      if (it.slot === 'consumable') {
        const st = stacks.get(it.id);
        if (st) {
          st.count++;
          continue;
        }
        const row = { item: it, count: 1 };
        stacks.set(it.id, row);
        rows.push(row);
      } else {
        rows.push({ item: it, count: 1 });
      }
    }
    return rows;
  }

  private changePage(d: number): void {
    if (!this.hero) return;
    const pageCount = Math.max(1, Math.ceil(this.bagRows().length / BAG_PER_PAGE));
    this.bagPage = Phaser.Math.Wrap(this.bagPage + d, 0, pageCount);
    audio.sfx('ui_move');
    this.rebuild();
  }

  private label(x: number, y: number, str: string, color: string, size = 12, bold = false): Phaser.GameObjects.Text {
    const t = this.scene.add
      .text(x, y, str, { fontFamily: 'MedievalSharp, "Trebuchet MS", cursive', fontSize: `${size}px`, color, fontStyle: bold ? 'bold' : 'normal' })
      .setOrigin(0, 0);
    addPinned(this.content!, t);
    return t;
  }

  private icon(x: number, y: number, key: string): void {
    addPinned(this.content!, this.scene.add.image(x, y, key).setScale(1.5).setOrigin(0, 0));
  }

  private nav = new MenuNav();

  private rebuild(): void {
    if (!this.content || !this.hero) return;
    const hero = this.hero;
    this.tip?.hide();
    this.content.removeAll(true);
    this.nav.begin();
    const x0 = this.modal!.cx - PANEL_W / 2;
    const y0 = this.modal!.cy - PANEL_H / 2;
    const leftX = x0 + 24;
    const rightX = x0 + PANEL_W / 2 + 14;

    this.label(leftX, y0 + 34, 'EQUIPPED   Up/Dn - U unequip', C.hudBorder, 11, true);
    SLOTS.forEach((slot, i) => {
      const yy = y0 + 50 + i * 21;
      const item = hero.inventory.equipped[slot];
      const box = this.scene.add.graphics();
      box.fillStyle(i === this.sel ? 0x2a3358 : 0x000000, i === this.sel ? 0.9 : 0.35);
      box.fillRoundedRect(leftX, yy, EQ_ROW_W, 19, 3);
      box.lineStyle(i === this.sel ? 2 : 1, i === this.sel ? parseInt(C.hudBorder.slice(1), 16) : 0x6e521f, 0.9);
      box.strokeRoundedRect(leftX, yy, EQ_ROW_W, 19, 3);
      addPinned(this.content!, box);
      this.label(leftX + 6, yy + 5, EQUIP_SLOT_LABEL[slot], C.inkDim, 8.5);
      if (item) {
        addPinned(this.content!, this.scene.add.image(leftX + 50, yy + 2, item.icon).setScale(0.9).setOrigin(0, 0));
        const nm = truncateToWidth(this.scene, item.name, EQ_ROW_W - 70 - 6, 9.5, true);
        this.label(leftX + 70, yy + 5, nm, item.setId ? SET_COLOR : numHex(RARITY_COLOR[item.rarity]), 9.5, true);
        const ez = this.scene.add.zone(leftX, yy, EQ_ROW_W, 19).setOrigin(0, 0).setInteractive({ useHandCursor: true });
        const setCount = item.setId === ARMOR_SETS[hero.classId].id ? hero.setPieces : undefined;
        ez.on('pointerover', () => this.tip.show(item, leftX + EQ_ROW_W, yy, 'right', setCount));
        ez.on('pointerout', () => this.tip.hide());
        addPinned(this.content!, ez);
      } else {
        this.label(leftX + 70, yy + 5, '—', C.inkDim, 9.5);
      }
    });

    const s = hero.stats;
    const statsHdrY = y0 + 50 + SLOTS.length * 21 + 6;
    this.label(leftX, statsHdrY, 'STATS', C.hudBorder, 11, true);
    const stats = [
      `HP ${Math.ceil(hero.health)}/${s.maxHealth}   MP ${Math.ceil(hero.mana)}/${s.maxMana}`,
      `DMG ${s.damage}  ARM ${s.armor}  SPD ${s.speed}  CRIT ${Math.round(s.critChance * 100)}%`,
    ];
    stats.forEach((st, i) => this.label(leftX, statsHdrY + 16 + i * 15, st, C.ink, 10));
    this.label(leftX, y0 + PANEL_H - 28, `Gold ${hero.inventory.gold}   Keys ${hero.inventory.keyCount()}   Score ${hero.score}`, C.coinHi, 11, true);

    const bag = hero.inventory.bag;
    const rows = this.bagRows();
    const pageCount = Math.max(1, Math.ceil(rows.length / BAG_PER_PAGE));
    if (this.bagPage >= pageCount) this.bagPage = pageCount - 1;
    const start = this.bagPage * BAG_PER_PAGE;
    const pageRows = rows.slice(start, start + BAG_PER_PAGE);

    this.label(rightX, y0 + 38, `BACKPACK (${bag.length})  1-9 equip/use`, C.hudBorder, 11, true);
    this.label(rightX, y0 + 53, `C drink   S sort   <-/-> page ${this.bagPage + 1}/${pageCount}`, C.inkDim, 9);
    if (rows.length === 0) this.label(rightX, y0 + 76, 'Empty - loot chests and the dead.', C.inkDim, 10);
    pageRows.forEach((row, i) => {
      const item = row.item;
      const gy = y0 + 74 + i * 22;
      this.label(rightX, gy, `${i + 1}`, C.coinHi, 10, true);
      this.icon(rightX + 16, gy, item.icon);
      const nameCol = item.setId ? SET_COLOR : numHex(RARITY_COLOR[item.rarity]);
      const verdict = item.slot !== 'consumable' && !item.quest ? compareItems(item, wornItemFor(hero.inventory, item), hero.classId) : 'none';
      const arrow = compareArrow(verdict);
      const stackText = row.count > 1 ? `x${row.count}` : '';
      const suffixReserve = (arrow ? 14 : 0) + (stackText ? 30 : 0) + 6;
      const nm = truncateToWidth(this.scene, item.name, BAG_ROW_W - 36 - suffixReserve, 10, false);
      this.label(rightX + 36, gy + 1, nm, nameCol, 10, false);
      const rowRight = rightX + BAG_ROW_W;
      if (stackText) {
        const stack = this.label(0, gy + 1, stackText, C.coinHi, 10, true);
        stack.setOrigin(1, 0).setX(rowRight - (arrow ? 18 : 4));
      }
      if (arrow) {
        const arr = this.label(0, gy, arrow, compareArrowColor(verdict), 11, true);
        arr.setOrigin(1, 0).setX(rowRight - 4);
      }
      const zone = this.scene.add.zone(rightX, gy, BAG_ROW_W, 20).setOrigin(0, 0).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => this.useItem(item));
      const setCount = item.setId === ARMOR_SETS[hero.classId].id ? hero.setPieces : undefined;
      zone.on('pointerover', () => {
        if (item.slot === 'consumable' || item.quest) {
          this.tip.show(item, rightX, gy, 'left', setCount);
          return;
        }
        const worn = wornItemFor(hero.inventory, item);
        const verdict = compareItems(item, worn, hero.classId);
        this.tip.showCompare(item, worn, rightX, gy, 'left', verdict, setCount, hero.classId);
      });
      zone.on('pointerout', () => this.tip.hide());
      addPinned(this.content!, zone);
      // bag rows are pad-focusable too (A equips/uses the focused item)
      this.nav.register(rightX + BAG_ROW_W / 2, gy + 10, BAG_ROW_W, 20, () => this.useItem(item));
    });

    if (pageCount > 1) {
      this.content.add(makeButton(this.scene, rightX + 36, y0 + PANEL_H - 60, 56, 24, '< PREV', () => this.changePage(-1), { size: 11 }));
      this.content.add(makeButton(this.scene, rightX + 110, y0 + PANEL_H - 60, 56, 24, 'NEXT >', () => this.changePage(1), { size: 11 }));
    }

    this.content.add(makeButton(this.scene, this.modal!.cx + PANEL_W / 2 - 50, y0 + PANEL_H - 22, 80, 26, 'CLOSE', () => this.close()));
    this.nav.end();
  }

  private useItem(item: ItemDefinition): void {
    if (!this.hero) return;
    if (item.scroll) {
      (this.scene as unknown as { useScroll?: (it: ItemDefinition) => void }).useScroll?.(item);
      this.close();
      return;
    }
    if (item.slot === 'consumable') {
      const r = this.hero.inventory.consume(item);
      if (r.consumed) {
        this.hero.heal(r.heal);
        this.hero.restoreMana(r.mana);
        audio.sfx('potion');
      }
    } else {
      this.hero.inventory.equip(item);
      this.hero.refreshStats();
      audio.sfx('ui_select');
    }
    this.rebuild();
  }
}
