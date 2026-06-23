import Phaser from 'phaser';
import { PLAY_AREA_UI_DEPTH } from '../core/constants';
import { Content } from '../content/ContentRegistry';
import { audio } from '../systems/AudioSystem';
import type { ShopKind, ItemDefinition, Rarity } from '../core/types';
import type { Hero } from '../entities/Hero';

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
const STOCK: Record<Exclude<ShopKind, 'home'>, StockEntry[]> = {
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
  ],
  apothecary: [
    { id: 'health_potion', price: 30 },
    { id: 'mana_potion', price: 30 },
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
};

export class ShopUI {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container | null = null;
  private keyHandler?: (e: KeyboardEvent) => void;
  private shop: ShopKind = 'blacksmith';
  private title = 'SHOP';
  private buyer!: Hero;
  private status = '';
  private onClosed?: () => void;

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
    this.onClosed = onClosed;
    this.container = this.scene.add.container(0, 0).setDepth(PLAY_AREA_UI_DEPTH + 6).setScrollFactor(0);
    this.keyHandler = (e) => {
      if (e.key === 'Escape') this.close();
    };
    this.scene.input.keyboard?.on('keydown', this.keyHandler);
    audio.sfx('ui_select');
    this.render();
  }

  close(): void {
    if (this.keyHandler) this.scene.input.keyboard?.off('keydown', this.keyHandler);
    this.keyHandler = undefined;
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

  private buy(entry: StockEntry, def: ItemDefinition): void {
    if (this.buyer.inventory.gold < entry.price) {
      this.status = 'Not enough gold.';
      audio.sfx('ui_move');
      this.render();
      return;
    }
    this.buyer.inventory.gold -= entry.price;
    this.buyer.inventory.add({ ...def, name: entry.name ?? def.name });
    this.buyer.refreshStats();
    this.status = `Bought ${entry.name ?? def.name}.`;
    audio.sfx('chest');
    this.render();
  }

  private render(): void {
    if (!this.container) return;
    this.container.removeAll(true);
    const cam = this.scene.cameras.main;
    const cx = cam.width / 2;
    const cy = cam.height / 2;
    const x0 = cx - PANEL_W / 2;
    const y0 = cy - PANEL_H / 2;

    const backdrop = this.scene.add.rectangle(cx, cy, cam.width, cam.height, 0x05060a, 0.72).setInteractive();
    backdrop.on('pointerdown', () => this.close());
    this.pin(backdrop);

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

    this.text(cx, y0 + 16, this.title.toUpperCase(), HEAD, 22, TITLE).setOrigin(0.5, 0);
    this.text(cx, y0 + 44, `Party gold: ${this.buyer.inventory.gold}`, GOLD_DK, 13).setOrigin(0.5, 0);

    const rows = STOCK[this.shop as Exclude<ShopKind, 'home'>] ?? [];
    const top = y0 + 74;
    const rowH = 46;
    rows.forEach((entry, i) => {
      const def = Content.item(entry.id);
      if (!def) return;
      const ry = top + i * rowH;
      const panel = this.scene.add.graphics();
      panel.fillStyle(hx(PAGE2), 1);
      panel.fillRoundedRect(x0 + 18, ry, PANEL_W - 36, rowH - 8, 5);
      panel.lineStyle(1.5, hx(GOLD_DK), 0.8);
      panel.strokeRoundedRect(x0 + 18, ry, PANEL_W - 36, rowH - 8, 5);
      this.pin(panel);

      this.pin(this.scene.add.image(x0 + 40, ry + (rowH - 8) / 2, def.icon).setScale(1.6));
      const name = entry.name ?? def.name;
      this.text(x0 + 60, ry + 6, name, RARITY_COLOR[def.rarity] ?? INK, 14, SERIF, true);
      this.text(x0 + 60, ry + 24, this.slotLine(def), INK, 10.5);

      const canAfford = this.buyer.inventory.gold >= entry.price;
      this.button(x0 + PANEL_W - 86, ry + (rowH - 8) / 2, 110, 28, `${entry.price}g`, canAfford, () => this.buy(entry, def));
    });

    if (this.status) this.text(cx, y0 + PANEL_H - 52, this.status, HEAD, 12).setOrigin(0.5, 0);
    this.button(cx, y0 + PANEL_H - 28, 150, 30, 'LEAVE', true, () => this.close());
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
    const cont = this.scene.add.container(x, y);
    const g = this.scene.add.graphics();
    g.fillStyle(hx(enabled ? PAGE : '#cbb98f'), 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 5);
    g.lineStyle(2, hx(GOLD_DK), 1);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, 5);
    cont.add(g);
    cont.add(
      this.scene.add
        .text(0, 0, label, { fontFamily: SERIF, fontSize: '13px', color: enabled ? INK : '#8a7a55', fontStyle: 'bold' })
        .setOrigin(0.5)
    );
    if (enabled) {
      const z = this.scene.add.zone(0, 0, w, h).setInteractive({ useHandCursor: true });
      z.on('pointerdown', fn);
      cont.add(z);
    }
    this.pin(cont);
  }
}
