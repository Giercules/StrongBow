import Phaser from 'phaser';
import { PLAY_AREA_UI_DEPTH } from '../core/constants';
import { Content } from '../content/ContentRegistry';
import { audio } from '../systems/AudioSystem';
import type { ShopKind, ItemDefinition, Rarity } from '../core/types';
import type { Hero } from '../entities/Hero';
import { ItemTooltip } from './ItemTooltip';
import { questLog } from '../systems/QuestSystem';
import { salvageYield, reforgeCost, ascendCost, canAfford, pay, grant, fmtCost, reforge, ascend, gradeTag } from '../systems/CraftSystem';

const SERIF = 'MedievalSharp, Georgia, serif';
const TITLE = 'Cinzel, Georgia, serif';
const hx = (s: string): number => parseInt(s.replace('#', ''), 16);
const PAGE = '#e9dcc0';
const PAGE2 = '#f2e9d0';
const GOLD = '#b8923a';
const GOLD_DK = '#6e521f';
const INK = '#3a2a16';
const HEAD = '#7a2a2a';
const PANEL_W = 460;
const PANEL_H = 372;

const RARITY_COLOR: Record<Rarity, string> = {
  common: '#c8c8c8',
  uncommon: '#6fcf6f',
  rare: '#5aa0ff',
  epic: '#c77dff',
  legendary: '#ffb43a',
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
    const cam = this.scene.cameras.main;
    this.backdrop = this.scene.add
      .rectangle(cam.width / 2, cam.height / 2, cam.width, cam.height, 0x05060a, 0.72)
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
    this.render();
  }

  close(): void {
    if (this.keyHandler) this.scene.input.keyboard?.off('keydown', this.keyHandler);
    this.keyHandler = undefined;
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
    // silver tongue + haggling + the town's opinion of you (reputation)
    return Math.min(0.4, (this.buyer.charisma ?? 0) * 0.03) + this.haggleDiscount + questLog.repDiscount();
  }
  private sellBonus(): number {
    return Math.min(0.5, (this.buyer.charisma ?? 0) * 0.04) + questLog.repDiscount();
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
    else this.buyer.inventory.add({ ...def, name: entry.name ?? def.name });
    this.buyer.refreshStats();
    const lvl = this.buyer.gainCharisma(1);
    this.status = `Bought ${entry.name ?? def.name}.` + (lvl ? `  Charisma ${this.buyer.charisma}!` : '');
    audio.sfx('chest');
    this.render();
  }

  private sell(item: ItemDefinition): void {
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

  private render(): void {
    if (!this.container) return;
    this.container.removeAll(true);
    this.tip?.hide();
    const cam = this.scene.cameras.main;
    const cx = cam.width / 2;
    const cy = cam.height / 2;
    const x0 = cx - PANEL_W / 2;
    const y0 = cy - PANEL_H / 2;

    const g = this.scene.add.graphics();
    g.fillStyle(hx('#241a0c'), 1);
    g.fillRoundedRect(x0 - 4, y0 - 4, PANEL_W + 8, PANEL_H + 8, 12);
    g.fillStyle(hx(GOLD), 1);
    g.fillRoundedRect(x0, y0, PANEL_W, PANEL_H, 10);
    g.fillStyle(hx(GOLD_DK), 1);
    g.fillRoundedRect(x0 + 4, y0 + 4, PANEL_W - 8, PANEL_H - 8, 8);
    g.fillStyle(hx(PAGE), 1);
    g.fillRoundedRect(x0 + 8, y0 + 8, PANEL_W - 16, PANEL_H - 16, 6);
    this.pin(g);

    this.text(cx, y0 + 12, this.title.toUpperCase(), HEAD, 21, TITLE).setOrigin(0.5, 0);
    const cha = this.buyer.charisma ?? 0;
    const discPct = Math.round(this.charismaDiscount() * 100);
    const sellPct = Math.round(this.sellBonus() * 100);
    const meta = this.mode === 'buy'
      ? `Gold: ${this.buyer.inventory.gold}    Charisma: ${cha}` + (discPct ? `   (-${discPct}% prices)` : '')
      : `Gold: ${this.buyer.inventory.gold}    Charisma: ${cha}` + (sellPct ? `   (+${sellPct}% payout)` : '');
    this.text(cx, y0 + 38, meta, GOLD_DK, 12).setOrigin(0.5, 0);

    this.button(x0 + 92, y0 + 60, 64, 22, 'BUY', this.mode !== 'buy', () => this.setMode('buy'));
    this.button(x0 + 166, y0 + 60, 64, 22, 'SELL', this.mode !== 'sell', () => this.setMode('sell'));
    if (this.shop === 'blacksmith') this.button(x0 + 240, y0 + 60, 64, 22, 'CRAFT', this.mode !== 'craft', () => this.setMode('craft'));
    if (this.mode === 'buy' && cha >= 1) this.button(x0 + PANEL_W - 96, y0 + 60, 130, 24, this.haggled ? 'HAGGLED' : 'HAGGLE', !this.haggled, () => this.haggle());

    const top = y0 + 92;
    const rowH = 44;
    const PAGE_SIZE = 4;

    let count = 0;
    if (this.mode === 'buy') {
      const allRows = STOCK[this.shop as Exclude<ShopKind, 'home' | 'guild'>] ?? [];
      count = allRows.length;
      const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
      this.page = Math.min(Math.max(this.page, 0), totalPages - 1);
      const rows = allRows.slice(this.page * PAGE_SIZE, this.page * PAGE_SIZE + PAGE_SIZE);
      rows.forEach((entry, i) => {
        const def = Content.item(entry.id);
        if (!def) return;
        this.itemRow(x0, top + i * rowH, rowH, def, entry.name ?? def.name, this.priceFor(entry.price) + 'g', this.buyer.inventory.gold >= this.priceFor(entry.price), () => this.buy(entry, def));
      });
      this.pages(cx, x0, y0, totalPages);
    } else if (this.mode === 'craft') {
      const inv = this.buyer.inventory;
      this.text(x0 + 24, top - 20, `Materials:  ${inv.materials.scrap} scrap iron  ·  ${inv.materials.essence} arcane essence  ·  ${inv.materials.shard} godshards`, GOLD_DK, 11, SERIF, true);
      // every piece of gear you carry or wear can be worked at the forge
      const gear = [...inv.equippedList(), ...inv.bag.filter((b) => b.slot !== 'consumable')];
      count = gear.length;
      if (count === 0) this.text(cx, top + 30, 'Nothing to work — bring Brunda some gear.', INK, 13).setOrigin(0.5, 0);
      const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
      this.page = Math.min(Math.max(this.page, 0), totalPages - 1);
      const rows = gear.slice(this.page * PAGE_SIZE, this.page * PAGE_SIZE + PAGE_SIZE);
      rows.forEach((item, i) => {
        this.craftRow(x0, top + i * rowH, rowH, item, inv.equippedList().includes(item));
      });
      this.pages(cx, x0, y0, totalPages);
    } else {
      const bag = this.buyer.inventory.bag;
      count = bag.length;
      if (count === 0) this.text(cx, top + 30, 'Your bag is empty.', INK, 13).setOrigin(0.5, 0);
      const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
      this.page = Math.min(Math.max(this.page, 0), totalPages - 1);
      const rows = bag.slice(this.page * PAGE_SIZE, this.page * PAGE_SIZE + PAGE_SIZE);
      rows.forEach((item, i) => {
        this.itemRow(x0, top + i * rowH, rowH, item, item.name, this.sellValue(item) + 'g', true, () => this.sell(item));
      });
      this.pages(cx, x0, y0, totalPages);
    }

    if (this.status) this.text(cx, y0 + PANEL_H - 50, this.status, HEAD, 12).setOrigin(0.5, 0);
    this.button(cx, y0 + PANEL_H - 24, 132, 28, 'LEAVE', true, () => this.close());
  }

  private itemRow(x0: number, ry: number, rowH: number, def: ItemDefinition, name: string, priceLabel: string, can: boolean, fn: () => void): void {
    const panel = this.scene.add.graphics();
    panel.fillStyle(hx(PAGE2), 1);
    panel.fillRoundedRect(x0 + 18, ry, PANEL_W - 36, rowH - 8, 5);
    panel.lineStyle(1.5, hx(GOLD_DK), 0.8);
    panel.strokeRoundedRect(x0 + 18, ry, PANEL_W - 36, rowH - 8, 5);
    this.pin(panel);
    this.pin(this.scene.add.image(x0 + 40, ry + (rowH - 8) / 2, def.icon).setScale(1.6));
    this.text(x0 + 60, ry + 5, name, RARITY_COLOR[def.rarity] ?? INK, 13.5, SERIF, true);
    this.text(x0 + 60, ry + 22, this.slotLine(def), INK, 10);
    this.button(x0 + PANEL_W - 86, ry + (rowH - 8) / 2, 110, 26, priceLabel, can, fn);
    const hz = this.scene.add.zone(x0 + 18, ry, PANEL_W - 160, rowH - 8).setScrollFactor(0).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    hz.on('pointerover', () => this.tip.show(def, x0 + 18, ry, 'right'));
    hz.on('pointerout', () => this.tip.hide());
    this.pin(hz);
  }

  /** One forge-work row: name/grade + SALVAGE / REFORGE / ASCEND actions. */
  private craftRow(x0: number, ry: number, rowH: number, item: ItemDefinition, equipped: boolean): void {
    const panel = this.scene.add.graphics();
    panel.fillStyle(hx(PAGE2), 1);
    panel.fillRoundedRect(x0 + 18, ry, PANEL_W - 36, rowH - 8, 5);
    panel.lineStyle(1.5, hx(GOLD_DK), 0.8);
    panel.strokeRoundedRect(x0 + 18, ry, PANEL_W - 36, rowH - 8, 5);
    this.pin(panel);
    this.pin(this.scene.add.image(x0 + 40, ry + (rowH - 8) / 2, item.icon).setScale(1.6));
    this.text(x0 + 60, ry + 5, `${item.name}${equipped ? '  (worn)' : ''}`, RARITY_COLOR[item.rarity] ?? INK, 12, SERIF, true);
    this.text(x0 + 60, ry + 21, gradeTag(item), GOLD_DK, 10);
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
    this.text(cx, y0 + PANEL_H - 50, `Page ${this.page + 1} / ${totalPages}`, GOLD_DK, 11).setOrigin(0.5, 1);
    this.button(x0 + 66, y0 + PANEL_H - 24, 84, 28, '◀ Prev', this.page > 0, () => this.gotoPage(this.page - 1));
    this.button(x0 + PANEL_W - 66, y0 + PANEL_H - 24, 84, 28, 'Next ▶', this.page < totalPages - 1, () => this.gotoPage(this.page + 1));
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

  private button(x: number, y: number, w: number, h: number, label: string, enabled: boolean, fn: () => void): void {
    const cont = this.scene.add.container(x, y).setScrollFactor(0);
    const g = this.scene.add.graphics().setScrollFactor(0);
    g.fillStyle(hx(enabled ? PAGE : '#cbb98f'), 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 5);
    g.lineStyle(2, hx(GOLD_DK), 1);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, 5);
    cont.add(g);
    cont.add(
      this.scene.add
        .text(0, 0, label, { fontFamily: SERIF, fontSize: '13px', color: enabled ? INK : '#8a7a55', fontStyle: 'bold' })
        .setOrigin(0.5)
        .setScrollFactor(0)
    );
    if (enabled) {
      // The interactive zone MUST be pinned individually — container children do
      // not inherit scrollFactor(0), so an un-pinned zone's hit area drifts with
      // the camera scroll (e.g. inside the centred shop interiors) and clicks miss.
      const z = this.scene.add.zone(0, 0, w, h).setScrollFactor(0).setInteractive({ useHandCursor: true });
      z.on('pointerdown', fn);
      cont.add(z);
    }
    this.container!.add(cont);
  }
}
