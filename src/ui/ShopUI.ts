import Phaser from 'phaser';
import { GAME_HEIGHT, MAX_SHOP_BUY_DISCOUNT, MAX_SHOP_SELL_BONUS, PLAY_AREA_UI_DEPTH, PLAY_AREA_WIDTH } from '../core/constants';
import { Content } from '../content/ContentRegistry';
import { audio } from '../systems/AudioSystem';
import type { ShopKind, ItemDefinition, Rarity } from '../core/types';
import type { Hero } from '../entities/Hero';
import { ItemTooltip } from './ItemTooltip';
import { questLog } from '../systems/QuestSystem';
import { salvageYield, reforgeCost, ascendCost, canAfford, pay, grant, fmtCost, reforge, ascend, gradeTag } from '../systems/CraftSystem';
import { MenuNav } from './MenuNav';
import { C } from '../rendering/Palette';

const SERIF = 'MedievalSharp, Georgia, serif';
const TITLE = 'Cinzel, Georgia, serif';
const hx = (s: string): number => parseInt(s.replace('#', ''), 16);
const PANEL_W = 500;
const PANEL_H = 420;

const RARITY_COLOR: Record<Rarity, string> = {
  common: '#c8d0e0',
  uncommon: '#6fe07a',
  rare: '#5ab0ff',
  epic: '#d08cff',
  legendary: '#ffd24a',
};

interface StockEntry {
  id: string;
  price: number;
  name?: string;
}

// What each keeper sells. Ids must exist in the item registry.
const STOCK: Record<Exclude<ShopKind, 'home' | 'guild'>, StockEntry[]> = {
  blacksmith: [
    { id: 'iron_sword', price: 120 },
    { id: 'ember_blade', price: 230 },
    { id: 'hunters_bow', price: 160 },
    { id: 'crypt_plate', price: 190 },
    { id: 'leather_jerkin', price: 95 },
    { id: 'oak_shield', price: 110 },
    { id: 'iron_helm', price: 90 },
    { id: 'iron_greaves', price: 85 },
    { id: 'leather_gloves', price: 70 },
    { id: 'traveler_boots', price: 80 },
    { id: 'dungeon_key', price: 40 },
    { id: '__mat_scrap', price: 22, name: 'Scrap Iron' },
    { id: '__mat_essence', price: 48, name: 'Arcane Essence' },
    { id: '__mat_shard', price: 165, name: 'Godshard' },
  ],
  apothecary: [
    { id: 'health_potion', price: 30 },
    { id: 'mana_potion', price: 30 },
    { id: 'town_portal_scroll', price: 60 },
    { id: 'scroll_mending', price: 45 },
    { id: 'scroll_renewal', price: 45 },
    { id: 'warding_ring', price: 120 },
    { id: 'amulet_of_focus', price: 140 },
  ],
  tavern: [
    { id: 'health_potion', price: 24, name: 'Hearty Stew' },
    { id: 'mana_potion', price: 24, name: 'Spiced Wine' },
    { id: 'oak_staff', price: 150 },
  ],
};

const SHOP_TITLE: Record<ShopKind, string> = {
  blacksmith: 'BLACKSMITH',
  apothecary: 'APOTHECARY',
  tavern: 'TAVERN',
  home: 'LODGE',
  guild: 'FIGHTERS GUILD',
};

export class ShopUI {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container | null = null;
  private keyHandler?: (e: KeyboardEvent) => void;
  private shop: ShopKind = 'blacksmith';
  private title = 'SHOP';
  private buyer!: Hero;
  private status = '';
  private page = 0;
  private onClosed?: () => void;
  private tip!: ItemTooltip;
  private backdrop: Phaser.GameObjects.Rectangle | null = null;
  private mode: 'buy' | 'sell' | 'craft' = 'buy';
  private haggled = false;
  private haggleDiscount = 0;
  private nav = new MenuNav();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  isOpen(): boolean {
    return this.container !== null;
  }

  open(shop: ShopKind, buyer: Hero, label: string, onClosed?: () => void): void {
    if (this.container) return;
    this.shop = shop;
    this.title = label || SHOP_TITLE[shop];
    this.buyer = buyer;
    this.status = '';
    this.page = 0;
    this.mode = 'buy';
    this.haggled = false;
    this.haggleDiscount = 0;
    this.onClosed = onClosed;
    this.backdrop = this.scene.add
      .rectangle(PLAY_AREA_WIDTH / 2, GAME_HEIGHT / 2, PLAY_AREA_WIDTH, GAME_HEIGHT, 0x03050c, 0.78)
      .setScrollFactor(0)
      .setDepth(PLAY_AREA_UI_DEPTH + 5)
      .setInteractive();
    this.backdrop.on('pointerdown', () => this.close());
    this.container = this.scene.add.container(0, 0).setDepth(PLAY_AREA_UI_DEPTH + 6).setScrollFactor(0);
    this.keyHandler = (e) => {
      if (e.key === 'Escape') this.close();
    };
    this.scene.input.keyboard?.on('keydown', this.keyHandler);
    audio.sfx('ui_select');
    this.tip = new ItemTooltip(this.scene);
    this.nav.attach(this.scene, () => this.close());
    this.render();
  }

  close(): void {
    if (this.keyHandler) this.scene.input.keyboard?.off('keydown', this.keyHandler);
    this.keyHandler = undefined;
    this.nav.detach();
    this.tip?.destroy();
    this.backdrop?.destroy();
    this.backdrop = null;
    this.container?.destroy();
    this.container = null;
    this.onClosed?.();
    this.onClosed = undefined;
  }

  private pin<T extends Phaser.GameObjects.GameObject>(o: T): T {
    (o as unknown as { setScrollFactor?: (n: number) => void }).setScrollFactor?.(0);
    this.container!.add(o);
    return o;
  }

  private charismaDiscount(): number {
    return Math.min(MAX_SHOP_BUY_DISCOUNT, (this.buyer.charisma ?? 0) * 0.03 + this.haggleDiscount + questLog.repDiscount());
  }
  private sellBonus(): number {
    return Math.min(MAX_SHOP_SELL_BONUS, (this.buyer.charisma ?? 0) * 0.04 + questLog.repDiscount());
  }
  private priceFor(base: number): number {
    return Math.max(1, Math.round(base * (1 - this.charismaDiscount())));
  }
  private sellValue(item: ItemDefinition): number {
    const rb: Record<string, number> = { common: 10, uncommon: 28, rare: 60, epic: 120, legendary: 240 };
    let v = rb[item.rarity] ?? 10;
    const g = item.grade;
    if (g) v = Math.round(v * (g === 'godforged' ? 3 : g === 'ascendant' ? 2.2 : g === 'runed' ? 1.6 : g === 'honed' ? 1.2 : 1));
    return Math.max(2, Math.round(v * (1 + this.sellBonus())));
  }

  private setMode(m: 'buy' | 'sell' | 'craft'): void {
    this.mode = m;
    this.page = 0;
    this.status = '';
    audio.sfx('ui_move');
    this.render();
  }

  private haggle(): void {
    if (this.haggled) return;
    this.haggled = true;
    const chance = 0.5 + (this.buyer.charisma ?? 0) * 0.03;
    if (Math.random() < chance) {
      this.haggleDiscount = Math.min(0.25, this.haggleDiscount + 0.15);
      this.status = 'You sweet-talk the keeper down!';
      audio.sfx('coin');
    } else {
      this.haggleDiscount = Math.max(0, this.haggleDiscount - 0.05);
      this.status = 'The keeper scoffs at your haggling.';
      audio.sfx('ui_move');
    }
    this.render();
  }

  private buy(entry: StockEntry, def: ItemDefinition): void {
    const price = this.priceFor(entry.price);
    if (this.buyer.inventory.gold < price) {
      this.status = 'Not enough gold.';
      audio.sfx('ui_move');
      this.render();
      return;
    }
    this.buyer.inventory.gold -= price;
    if (entry.id === 'dungeon_key') this.buyer.inventory.addKey(1);
    else if (entry.id === '__mat_scrap') this.buyer.inventory.materials.scrap += 1;
    else if (entry.id === '__mat_essence') this.buyer.inventory.materials.essence += 1;
    else if (entry.id === '__mat_shard') this.buyer.inventory.materials.shard += 1;
    else this.buyer.inventory.add(Content.cloneItem({ ...def, name: entry.name ?? def.name }));
    if (!entry.id.startsWith('__mat_')) this.buyer.refreshStats();
    const lvl = this.buyer.gainCharisma(1);
    this.status = `Bought ${entry.name ?? def.name}.` + (lvl ? `  Charisma ${this.buyer.charisma}!` : '');
    audio.sfx('chest');
    this.render();
  }

  private sell(item: ItemDefinition): void {
    if (item.quest) {
      this.status = 'That is not for sale.';
      audio.sfx('ui_move');
      this.render();
      return;
    }
    const v = this.sellValue(item);
    const i = this.buyer.inventory.bag.indexOf(item);
    if (i < 0) return;
    this.buyer.inventory.bag.splice(i, 1);
    this.buyer.inventory.gold += v;
    this.buyer.refreshStats();
    const lvl = this.buyer.gainCharisma(1);
    this.status = `Sold ${item.name} for ${v}g.` + (lvl ? `  Charisma ${this.buyer.charisma}!` : '');
    audio.sfx('coin');
    this.render();
  }

  private drawArcadeFrame(g: Phaser.GameObjects.Graphics, x0: number, y0: number, w: number, h: number): void {
    // Outer deep plate
    g.fillStyle(hx(C.hudBg), 0.98);
    g.fillRoundedRect(x0 - 6, y0 - 6, w + 12, h + 12, 10);
    // Inner navy panel
    g.fillStyle(hx(C.hudPanel), 1);
    g.fillRoundedRect(x0, y0, w, h, 8);
    // Top sheen
    g.fillStyle(0xffffff, 0.05);
    g.fillRoundedRect(x0 + 4, y0 + 4, w - 8, 36, 4);
    // Gold double-rail
    g.lineStyle(3, hx(C.hudBorder), 1);
    g.strokeRoundedRect(x0 + 2, y0 + 2, w - 4, h - 4, 7);
    g.lineStyle(1, hx(C.hudBorderDk), 1);
    g.strokeRoundedRect(x0 + 7, y0 + 7, w - 14, h - 14, 5);
    // Neon hairline
    g.lineStyle(1, hx(C.hudNeon), 0.45);
    g.strokeRoundedRect(x0 + 4, y0 + 4, w - 8, h - 8, 6);
    // Corner brackets + neon pips
    g.fillStyle(hx(C.hudBorder), 1);
    for (const [px, py, sx, sy] of [
      [x0 + 3, y0 + 3, 1, 1],
      [x0 + w - 3, y0 + 3, -1, 1],
      [x0 + 3, y0 + h - 3, 1, -1],
      [x0 + w - 3, y0 + h - 3, -1, -1],
    ] as [number, number, number, number][]) {
      g.fillRect(px, py, 16 * sx, 3 * sy);
      g.fillRect(px, py, 3 * sx, 16 * sy);
    }
    g.fillStyle(hx(C.hudNeon), 1);
    for (const [px, py] of [
      [x0 + 5, y0 + 5],
      [x0 + w - 9, y0 + 5],
      [x0 + 5, y0 + h - 9],
      [x0 + w - 9, y0 + h - 9],
    ] as [number, number][]) {
      g.fillRect(px, py, 4, 4);
    }
    // Title plaque
    g.fillStyle(hx(C.hudBorderDk), 1);
    g.fillRoundedRect(x0 + 48, y0 - 4, w - 96, 30, 6);
    g.fillStyle(hx(C.hudBorder), 1);
    g.fillRoundedRect(x0 + 50, y0 - 2, w - 100, 26, 5);
    g.fillStyle(hx(C.hudNeon), 0.4);
    g.fillRoundedRect(x0 + 56, y0, w - 112, 8, 3);
  }

  private render(): void {
    if (!this.container) return;
    this.container.removeAll(true);
    this.tip?.hide();
    this.nav.begin();
    const cx = PLAY_AREA_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const x0 = cx - PANEL_W / 2;
    const y0 = cy - PANEL_H / 2;

    const g = this.scene.add.graphics();
    this.drawArcadeFrame(g, x0, y0, PANEL_W, PANEL_H);
    this.pin(g);

    // Title on gold plaque
    this.text(cx, y0 + 11, this.title.toUpperCase(), '#1a1206', 16, TITLE, true).setOrigin(0.5, 0.5);

    const cha = this.buyer.charisma ?? 0;
    const discPct = Math.round(this.charismaDiscount() * 100);
    const sellPct = Math.round(this.sellBonus() * 100);

    // Mode tabs
    const tabY = y0 + 42;
    let tabX = x0 + 78;
    this.tab(tabX, tabY, 78, 26, 'BUY', this.mode === 'buy', () => this.setMode('buy'));
    tabX += 88;
    this.tab(tabX, tabY, 78, 26, 'SELL', this.mode === 'sell', () => this.setMode('sell'));
    tabX += 88;
    if (this.shop === 'blacksmith') {
      this.tab(tabX, tabY, 78, 26, 'CRAFT', this.mode === 'craft', () => this.setMode('craft'));
      tabX += 88;
    }
    if (this.mode === 'buy' && cha >= 1) {
      this.button(x0 + PANEL_W - 78, tabY, 120, 26, this.haggled ? 'HAGGLED' : 'HAGGLE', !this.haggled, () => this.haggle());
    }

    // Gold meter strip
    const metaY = y0 + 68;
    const metaG = this.scene.add.graphics();
    metaG.fillStyle(0x05060a, 0.75);
    metaG.fillRoundedRect(x0 + 18, metaY, PANEL_W - 36, 22, 4);
    metaG.lineStyle(1, hx(C.hudBorderDk), 0.7);
    metaG.strokeRoundedRect(x0 + 18, metaY, PANEL_W - 36, 22, 4);
    this.pin(metaG);
    const meta =
      this.mode === 'buy'
        ? `◆ ${this.buyer.inventory.gold}g   ·   CHA ${cha}` + (discPct ? `   ·   −${discPct}%` : '')
        : this.mode === 'sell'
          ? `◆ ${this.buyer.inventory.gold}g   ·   CHA ${cha}` + (sellPct ? `   ·   +${sellPct}% sell` : '')
          : `◆ ${this.buyer.inventory.gold}g   ·   Bring gear to the forge`;
    this.text(cx, metaY + 11, meta, C.hudBorder, 12).setOrigin(0.5, 0.5);

    const top = y0 + 100;
    const rowH = 46;
    const PAGE_SIZE = 4;

    let count = 0;
    if (this.mode === 'buy') {
      const allRows = STOCK[this.shop as Exclude<ShopKind, 'home' | 'guild'>] ?? [];
      count = allRows.length;
      const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
      this.page = Math.min(Math.max(this.page, 0), totalPages - 1);
      const rows = allRows.slice(this.page * PAGE_SIZE, this.page * PAGE_SIZE + PAGE_SIZE);
      rows.forEach((entry, i) => {
        const mat = entry.id.startsWith('__mat_');
        const def = mat
          ? ({ id: entry.id, name: entry.name ?? 'Material', slot: 'consumable' as const, rarity: 'uncommon' as const, icon: 'icon-amulet', mods: {} })
          : Content.item(entry.id);
        if (!def) return;
        this.itemRow(x0, top + i * rowH, rowH, def, entry.name ?? def.name, this.priceFor(entry.price) + 'g', this.buyer.inventory.gold >= this.priceFor(entry.price), () => this.buy(entry, def));
      });
      this.pages(cx, x0, y0, totalPages);
    } else if (this.mode === 'craft') {
      const inv = this.buyer.inventory;
      this.text(x0 + 24, top - 18, `Materials:  ${inv.materials.scrap} scrap  ·  ${inv.materials.essence} essence  ·  ${inv.materials.shard} shards`, C.inkDim, 11, SERIF, true);
      const gear = [...inv.equippedList(), ...inv.bag.filter((b) => b.slot !== 'consumable')];
      count = gear.length;
      if (count === 0) this.text(cx, top + 30, 'Nothing to work — bring Brunda some gear.', C.inkDim, 13).setOrigin(0.5, 0);
      const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
      this.page = Math.min(Math.max(this.page, 0), totalPages - 1);
      const rows = gear.slice(this.page * PAGE_SIZE, this.page * PAGE_SIZE + PAGE_SIZE);
      rows.forEach((item, i) => {
        this.craftRow(x0, top + i * rowH, rowH, item, inv.equippedList().includes(item));
      });
      this.pages(cx, x0, y0, totalPages);
    } else {
      const bag = this.buyer.inventory.bag.filter((it) => !it.quest);
      count = bag.length;
      if (count === 0) this.text(cx, top + 30, 'Your bag is empty.', C.inkDim, 13).setOrigin(0.5, 0);
      const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
      this.page = Math.min(Math.max(this.page, 0), totalPages - 1);
      const rows = bag.slice(this.page * PAGE_SIZE, this.page * PAGE_SIZE + PAGE_SIZE);
      rows.forEach((item, i) => {
        this.itemRow(x0, top + i * rowH, rowH, item, item.name, this.sellValue(item) + 'g', true, () => this.sell(item));
      });
      this.pages(cx, x0, y0, totalPages);
    }

    if (this.status) this.text(cx, y0 + PANEL_H - 54, this.status, C.hpMid, 12).setOrigin(0.5, 0);
    this.button(cx, y0 + PANEL_H - 26, 140, 30, 'LEAVE', true, () => this.close());
    this.nav.end();
  }

  private itemRow(x0: number, ry: number, rowH: number, def: ItemDefinition, name: string, priceLabel: string, can: boolean, fn: () => void): void {
    const panel = this.scene.add.graphics();
    panel.fillStyle(hx(C.hudPanel2), 1);
    panel.fillRoundedRect(x0 + 18, ry, PANEL_W - 36, rowH - 8, 5);
    panel.fillStyle(0xffffff, 0.04);
    panel.fillRoundedRect(x0 + 20, ry + 2, PANEL_W - 40, 10, 3);
    panel.lineStyle(1.5, hx(C.hudBorderDk), 0.85);
    panel.strokeRoundedRect(x0 + 18, ry, PANEL_W - 36, rowH - 8, 5);
    panel.lineStyle(1, hx(C.hudNeon), 0.2);
    panel.strokeRoundedRect(x0 + 19, ry + 1, PANEL_W - 38, rowH - 10, 4);
    // rarity accent bar
    panel.fillStyle(hx(RARITY_COLOR[def.rarity] ?? C.ink), 0.9);
    panel.fillRect(x0 + 18, ry + 2, 3, rowH - 12);
    this.pin(panel);
    this.pin(this.scene.add.image(x0 + 42, ry + (rowH - 8) / 2, def.icon).setScale(1.65));
    this.text(x0 + 62, ry + 6, name, RARITY_COLOR[def.rarity] ?? C.ink, 13.5, SERIF, true);
    this.text(x0 + 62, ry + 24, this.slotLine(def), C.inkDim, 10);
    this.button(x0 + PANEL_W - 86, ry + (rowH - 8) / 2, 110, 28, priceLabel, can, fn);
    const hz = this.scene.add.zone(x0 + 18, ry, PANEL_W - 160, rowH - 8).setScrollFactor(0).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    hz.on('pointerover', () => this.tip.show(def, x0 + 18, ry, 'right'));
    hz.on('pointerout', () => this.tip.hide());
    this.pin(hz);
  }

  private craftRow(x0: number, ry: number, rowH: number, item: ItemDefinition, equipped: boolean): void {
    const panel = this.scene.add.graphics();
    panel.fillStyle(hx(C.hudPanel2), 1);
    panel.fillRoundedRect(x0 + 18, ry, PANEL_W - 36, rowH - 8, 5);
    panel.fillStyle(0xffffff, 0.04);
    panel.fillRoundedRect(x0 + 20, ry + 2, PANEL_W - 40, 10, 3);
    panel.lineStyle(1.5, hx(C.hudBorderDk), 0.85);
    panel.strokeRoundedRect(x0 + 18, ry, PANEL_W - 36, rowH - 8, 5);
    panel.fillStyle(hx(RARITY_COLOR[item.rarity] ?? C.ink), 0.9);
    panel.fillRect(x0 + 18, ry + 2, 3, rowH - 12);
    this.pin(panel);
    this.pin(this.scene.add.image(x0 + 42, ry + (rowH - 8) / 2, item.icon).setScale(1.65));
    this.text(x0 + 62, ry + 6, `${item.name}${equipped ? '  (worn)' : ''}`, RARITY_COLOR[item.rarity] ?? C.ink, 12, SERIF, true);
    this.text(x0 + 62, ry + 23, gradeTag(item), C.hudBorder, 10);
    const hz = this.scene.add.zone(x0 + 18, ry, 180, rowH - 8).setScrollFactor(0).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    hz.on('pointerover', () => this.tip.show(item, x0 + 18, ry, 'right'));
    hz.on('pointerout', () => this.tip.hide());
    this.pin(hz);

    const inv = this.buyer.inventory;
    const bx = x0 + PANEL_W - 60;
    this.button(bx - 148, ry + (rowH - 8) / 2, 68, 24, 'SALVAGE', true, () => this.salvage(item));
    const rCost = reforgeCost(item);
    this.button(bx - 74, ry + (rowH - 8) / 2, 68, 24, 'REFORGE', !!rCost && canAfford(inv, rCost), () => this.reforgeItem(item));
    const aCost = ascendCost(item);
    this.button(bx, ry + (rowH - 8) / 2, 62, 24, 'ASCEND', !!aCost && canAfford(inv, aCost), () => this.ascendItem(item));
  }

  private salvage(item: ItemDefinition): void {
    const inv = this.buyer.inventory;
    const y = salvageYield(item);
    if (!inv.removeItem(item)) return;
    grant(inv, y);
    this.buyer.refreshStats();
    this.status = `${item.name} melts down: +${fmtCost(y)}.`;
    audio.sfx('hit');
    this.render();
  }

  private reforgeItem(item: ItemDefinition): void {
    const inv = this.buyer.inventory;
    const cost = reforgeCost(item);
    if (!cost || !canAfford(inv, cost)) {
      this.status = cost ? `Reforging needs ${fmtCost(cost)}.` : 'Brunda cannot rework that one.';
      this.render();
      return;
    }
    pay(inv, cost);
    const next = reforge(item);
    if (next) {
      inv.replaceItem(item, next);
      this.buyer.refreshStats();
      this.status = `The affixes run molten and reset: ${next.name}.`;
      audio.sfx('magic');
    }
    this.render();
  }

  private ascendItem(item: ItemDefinition): void {
    const inv = this.buyer.inventory;
    const cost = ascendCost(item);
    if (!cost || !canAfford(inv, cost)) {
      this.status = cost ? `Ascending needs ${fmtCost(cost)}.` : 'That piece can climb no higher.';
      this.render();
      return;
    }
    pay(inv, cost);
    const next = ascend(item);
    if (next) {
      inv.replaceItem(item, next);
      this.buyer.refreshStats();
      this.status = `Brunda works a wonder: ${next.name}!`;
      audio.sfx('levelup');
    }
    this.render();
  }

  private pages(cx: number, x0: number, y0: number, totalPages: number): void {
    if (totalPages <= 1) return;
    this.text(cx, y0 + PANEL_H - 54, `Page ${this.page + 1} / ${totalPages}`, C.inkDim, 11).setOrigin(0.5, 1);
    this.button(x0 + 70, y0 + PANEL_H - 26, 90, 30, '◀ Prev', this.page > 0, () => this.gotoPage(this.page - 1));
    this.button(x0 + PANEL_W - 70, y0 + PANEL_H - 26, 90, 30, 'Next ▶', this.page < totalPages - 1, () => this.gotoPage(this.page + 1));
  }

  private gotoPage(p: number): void {
    this.page = p;
    audio.sfx('ui_move');
    this.render();
  }

  private slotLine(def: ItemDefinition): string {
    const mods = def.mods ?? {};
    const parts: string[] = [];
    if (def.heal) parts.push(`+${def.heal} HP`);
    if (def.mana) parts.push(`+${def.mana} MP`);
    for (const [k, v] of Object.entries(mods)) if (v) parts.push(`+${v} ${k}`);
    return `${def.slot}${parts.length ? '  ·  ' + parts.slice(0, 3).join(', ') : ''}`;
  }

  private text(
    x: number,
    y: number,
    str: string,
    color: string,
    size: number,
    font = SERIF,
    bold = false
  ): Phaser.GameObjects.Text {
    return this.pin(
      this.scene.add.text(x, y, str, { fontFamily: font, fontSize: `${size}px`, color, fontStyle: bold ? 'bold' : 'normal' })
    );
  }

  /** Active tab = gold fill; inactive = navy with gold rim. */
  private tab(x: number, y: number, w: number, h: number, label: string, active: boolean, fn: () => void, locked = false): void {
    const cont = this.scene.add.container(x, y).setScrollFactor(0);
    const g = this.scene.add.graphics().setScrollFactor(0);
    if (active && !locked) {
      g.fillStyle(hx(C.hudBorder), 1);
      g.fillRoundedRect(-w / 2, -h / 2, w, h, 5);
      g.fillStyle(hx(C.hudNeon), 0.35);
      g.fillRoundedRect(-w / 2 + 2, -h / 2 + 2, w - 4, 6, 3);
    } else {
      g.fillStyle(hx(C.hudPanel2), 1);
      g.fillRoundedRect(-w / 2, -h / 2, w, h, 5);
      g.lineStyle(1.5, hx(locked ? C.hudBorderDk : C.hudBorder), locked ? 0.5 : 0.85);
      g.strokeRoundedRect(-w / 2, -h / 2, w, h, 5);
    }
    cont.add(g);
    cont.add(
      this.scene.add
        .text(0, 0, label, {
          fontFamily: SERIF,
          fontSize: '12px',
          color: active && !locked ? '#1a1206' : locked ? '#6a7088' : C.ink,
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
    );
    if (!locked) {
      const z = this.scene.add.zone(0, 0, w, h).setScrollFactor(0).setInteractive({ useHandCursor: true });
      z.on('pointerdown', fn);
      cont.add(z);
      this.nav.register(x, y, w, h, fn);
    }
    this.container!.add(cont);
  }

  private button(x: number, y: number, w: number, h: number, label: string, enabled: boolean, fn: () => void): void {
    const cont = this.scene.add.container(x, y).setScrollFactor(0);
    const g = this.scene.add.graphics().setScrollFactor(0);
    g.fillStyle(hx(enabled ? C.hudPanel2 : C.hudBg), 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 5);
    if (enabled) {
      g.fillStyle(0xffffff, 0.06);
      g.fillRoundedRect(-w / 2 + 2, -h / 2 + 2, w - 4, Math.max(4, h * 0.35), 3);
    }
    g.lineStyle(enabled ? 2 : 1.5, hx(enabled ? C.hudBorder : C.hudBorderDk), enabled ? 1 : 0.55);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, 5);
    if (enabled) {
      g.lineStyle(1, hx(C.hudNeon), 0.35);
      g.strokeRoundedRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4, 4);
    }
    cont.add(g);
    cont.add(
      this.scene.add
        .text(0, 0, label, {
          fontFamily: SERIF,
          fontSize: '13px',
          color: enabled ? C.ink : '#5a6080',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
    );
    if (enabled) {
      const z = this.scene.add.zone(0, 0, w, h).setScrollFactor(0).setInteractive({ useHandCursor: true });
      z.on('pointerdown', fn);
      cont.add(z);
      this.nav.register(x, y, w, h, fn);
    }
    this.container!.add(cont);
  }
}
