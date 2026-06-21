import Phaser from 'phaser';
import { framedPanel, makeButton, addPinned } from './uiHelpers';
import type { Modal } from './uiHelpers';
import { C } from '../rendering/Palette';
import { RARITY_COLOR } from '../data/items';
import { describeItemStats } from '../data/pickupInfo';
import { audio } from '../systems/AudioSystem';
import type { Hero } from '../entities/Hero';
import type { ItemDefinition, ItemSlot } from '../core/types';

const PANEL_W = 480;
const PANEL_H = 430;
const SLOTS: ItemSlot[] = ['weapon', 'armor', 'trinket'];
const BAG_PER_PAGE = 9; // keeps the 1-9 hotkeys mapped to exactly one page
const numHex = (n: number): string => '#' + n.toString(16).padStart(6, '0');

export class InventoryUI {
  private scene: Phaser.Scene;
  private modal: Modal | null = null;
  private content: Phaser.GameObjects.Container | null = null;
  private hero: Hero | null = null;
  private sel = 0;
  private bagPage = 0;
  private keyHandler?: (e: KeyboardEvent) => void;

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
    this.rebuild();
  }

  close(): void {
    if (this.keyHandler) this.scene.input.keyboard?.off('keydown', this.keyHandler);
    this.keyHandler = undefined;
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
      const item = h.inventory.bag[this.bagPage * BAG_PER_PAGE + Number(e.key) - 1];
      if (item) this.useItem(item);
    }
  }

  private changePage(d: number): void {
    if (!this.hero) return;
    const pageCount = Math.max(1, Math.ceil(this.hero.inventory.bag.length / BAG_PER_PAGE));
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

  private rebuild(): void {
    if (!this.content || !this.hero) return;
    const hero = this.hero;
    this.content.removeAll(true);
    const x0 = this.modal!.cx - PANEL_W / 2;
    const y0 = this.modal!.cy - PANEL_H / 2;
    const leftX = x0 + 24;
    const rightX = x0 + PANEL_W / 2 + 14;

    this.label(leftX, y0 + 38, 'EQUIPPED   Up/Dn select - U unequip', C.hudBorder, 11, true);
    SLOTS.forEach((slot, i) => {
      const yy = y0 + 58 + i * 36;
      const item = hero.inventory.equipped[slot];
      const box = this.scene.add.graphics();
      box.fillStyle(i === this.sel ? 0x2a3358 : 0x000000, i === this.sel ? 0.9 : 0.4);
      box.fillRoundedRect(leftX, yy, 200, 32, 4);
      box.lineStyle(i === this.sel ? 2 : 1, i === this.sel ? parseInt(C.hudBorder.slice(1), 16) : 0x6e521f, 0.9);
      box.strokeRoundedRect(leftX, yy, 200, 32, 4);
      addPinned(this.content!, box);
      this.label(leftX + 6, yy + 3, slot.toUpperCase(), C.inkDim, 8);
      if (item) {
        this.icon(leftX + 6, yy + 13, item.icon);
        this.label(leftX + 28, yy + 4, item.name, numHex(RARITY_COLOR[item.rarity]), 11, true);
        this.label(leftX + 28, yy + 18, describeItemStats(item), C.inkDim, 9);
      } else {
        this.label(leftX + 28, yy + 10, '(empty)', C.inkDim, 10);
      }
    });

    const s = hero.stats;
    this.label(leftX, y0 + 180, 'STATS', C.hudBorder, 12, true);
    const stats = [
      `HP ${Math.ceil(hero.health)}/${s.maxHealth}   MP ${Math.ceil(hero.mana)}/${s.maxMana}`,
      `DMG ${s.damage}   ARM ${s.armor}   SPD ${s.speed}`,
      `CRIT ${Math.round(s.critChance * 100)}%   FIRE ${s.fire}`,
    ];
    stats.forEach((st, i) => this.label(leftX, y0 + 200 + i * 16, st, C.ink, 10.5));
    this.label(leftX, y0 + PANEL_H - 44, `Gold ${hero.inventory.gold}   Keys ${hero.inventory.keys}   Score ${hero.score}`, C.coinHi, 12, true);

    const bag = hero.inventory.bag;
    const pageCount = Math.max(1, Math.ceil(bag.length / BAG_PER_PAGE));
    if (this.bagPage >= pageCount) this.bagPage = pageCount - 1;
    const start = this.bagPage * BAG_PER_PAGE;
    const pageItems = bag.slice(start, start + BAG_PER_PAGE);

    this.label(rightX, y0 + 38, `BACKPACK (${bag.length})  1-9 equip/use`, C.hudBorder, 11, true);
    this.label(rightX, y0 + 53, `C drink   S sort   <-/-> page ${this.bagPage + 1}/${pageCount}`, C.inkDim, 9);
    if (bag.length === 0) this.label(rightX, y0 + 76, 'Empty - loot chests and the dead.', C.inkDim, 10);
    pageItems.forEach((item, i) => {
      const gy = y0 + 74 + i * 22;
      this.label(rightX, gy, `${i + 1}`, C.coinHi, 10, true);
      this.icon(rightX + 16, gy, item.icon);
      this.label(rightX + 36, gy + 1, item.name, numHex(RARITY_COLOR[item.rarity]), 10, false);
      const zone = this.scene.add.zone(rightX, gy, PANEL_W / 2 - 40, 20).setOrigin(0, 0).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => this.useItem(item));
      addPinned(this.content!, zone);
    });

    if (pageCount > 1) {
      this.content.add(makeButton(this.scene, rightX + 36, y0 + PANEL_H - 60, 56, 24, '< PREV', () => this.changePage(-1), { size: 11 }));
      this.content.add(makeButton(this.scene, rightX + 110, y0 + PANEL_H - 60, 56, 24, 'NEXT >', () => this.changePage(1), { size: 11 }));
    }

    this.content.add(makeButton(this.scene, this.modal!.cx + PANEL_W / 2 - 50, y0 + PANEL_H - 22, 80, 26, 'CLOSE', () => this.close()));
  }

  private useItem(item: ItemDefinition): void {
    if (!this.hero) return;
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
