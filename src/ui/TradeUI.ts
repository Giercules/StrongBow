import Phaser from 'phaser';
import { framedPanel, makeButton } from './uiHelpers';
import type { Modal } from './uiHelpers';
import { C } from '../rendering/Palette';
import { Content } from '../content/ContentRegistry';
import type { ItemDefinition } from '../core/types';
import type { Hero } from '../entities/Hero';
import { net } from '../net/NetClient';
import { audio } from '../systems/AudioSystem';
import { ItemTooltip } from './ItemTooltip';

// ----------------------------------------------------------------------------
// TradeUI — a live trade window between two players on the same map, relayed
// through the game server. Both sides build an offer (items + gold); editing
// anything clears both READY marks; when both are READY the swap applies on
// each client. Item definitions travel whole (like co-op loot) so minted gear
// resolves on the other side.
// ----------------------------------------------------------------------------

const PANEL_W = 560;
const PANEL_H = 420;
const OFFER_MAX = 5;

export class TradeUI {
  private scene: Phaser.Scene;
  private modal: Modal | null = null;
  private hero!: Hero;
  private partnerId = '';
  private partnerName = '';
  private myOffer: ItemDefinition[] = [];
  private myGold = 0;
  private theirOffer: ItemDefinition[] = [];
  private theirGold = 0;
  private myReady = false;
  private theirReady = false;
  private bagPage = 0;
  private tip?: ItemTooltip;
  private keyHandler?: (e: KeyboardEvent) => void;
  private onClosed?: () => void;
  private onComplete?: (gave: number, got: number) => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  isOpen(): boolean {
    return this.modal !== null;
  }

  currentPartner(): string {
    return this.partnerId;
  }

  open(hero: Hero, partnerId: string, partnerName: string, hooks: { onClosed?: () => void; onComplete?: (gave: number, got: number) => void } = {}): void {
    if (this.modal) return;
    this.hero = hero;
    this.partnerId = partnerId;
    this.partnerName = partnerName;
    this.myOffer = [];
    this.myGold = 0;
    this.theirOffer = [];
    this.theirGold = 0;
    this.myReady = false;
    this.theirReady = false;
    this.bagPage = 0;
    this.onClosed = hooks.onClosed;
    this.onComplete = hooks.onComplete;
    this.tip = new ItemTooltip(this.scene);
    this.keyHandler = (e) => {
      if (e.key === 'Escape') this.cancel();
    };
    this.scene.input.keyboard?.on('keydown', this.keyHandler);
    audio.sfx('ui_select');
    this.render();
  }

  // ---- remote events (routed in by the scene) ----
  remoteUpdate(fromId: string, items: ItemDefinition[], gold: number): void {
    if (fromId !== this.partnerId || !this.modal) return;
    this.theirOffer = items;
    this.theirGold = gold;
    this.myReady = false;
    this.theirReady = false;
    this.render();
  }

  remoteAccept(fromId: string): void {
    if (fromId !== this.partnerId || !this.modal) return;
    this.theirReady = true;
    if (this.myReady) this.complete();
    else this.render();
  }

  remoteCancel(fromId: string): void {
    if (fromId !== this.partnerId || !this.modal) return;
    this.teardown();
  }

  /** Local cancel: tell the partner, then close. */
  cancel(): void {
    if (!this.modal) return;
    net.sendTradeCancel(this.partnerId);
    this.teardown();
  }

  close(): void {
    this.cancel();
  }

  private pushOffer(): void {
    this.myReady = false;
    this.theirReady = false;
    net.sendTradeUpdate(this.partnerId, this.myOffer, this.myGold);
    this.render();
  }

  private ready(): void {
    if (this.myReady) return;
    this.myReady = true;
    net.sendTradeAccept(this.partnerId);
    if (this.theirReady) this.complete();
    else this.render();
  }

  private complete(): void {
    // apply the swap on this side; the partner's client mirrors it
    const inv = this.hero.inventory;
    for (const it of this.myOffer) inv.removeItem(it);
    inv.gold = Math.max(0, inv.gold - this.myGold + this.theirGold);
    for (const it of this.theirOffer) {
      Content.registerItem(it);
      inv.add(it);
    }
    this.hero.refreshStats();
    audio.sfx('coin');
    this.onComplete?.(this.myOffer.length, this.theirOffer.length);
    this.teardown();
  }

  private teardown(): void {
    if (this.keyHandler) this.scene.input.keyboard?.off('keydown', this.keyHandler);
    this.keyHandler = undefined;
    this.tip?.destroy();
    this.modal?.destroy();
    this.modal = null;
    this.partnerId = '';
    this.onClosed?.();
    this.onClosed = undefined;
  }

  private render(): void {
    this.modal?.destroy();
    this.modal = framedPanel(this.scene, PANEL_W, PANEL_H, `TRADING WITH ${this.partnerName.toUpperCase()}`);
    const m = this.modal;
    const x0 = m.cx - PANEL_W / 2;
    const y0 = m.cy - PANEL_H / 2;
    const colW = PANEL_W / 2 - 24;
    const label = (x: number, y: number, s: string, color: string, size: number, bold = false) =>
      m.add(this.scene.add.text(x, y, s, { fontFamily: 'MedievalSharp, "Trebuchet MS", cursive', fontSize: `${size}px`, color, fontStyle: bold ? 'bold' : 'normal' }));

    const itemRow = (x: number, y: number, it: ItemDefinition, action: string | null, fn?: () => void) => {
      const g = this.scene.add.graphics();
      g.fillStyle(0x121a30, 1);
      g.fillRoundedRect(x, y, colW, 26, 4);
      m.add(g);
      m.add(this.scene.add.image(x + 13, y + 13, it.icon).setScale(1));
      m.add(this.scene.add.text(x + 26, y + 4, it.name, { fontFamily: 'MedievalSharp, "Trebuchet MS", cursive', fontSize: '10px', color: '#dfe6ff', wordWrap: { width: colW - 86 } }));
      const hz = this.scene.add.zone(x, y, colW - 56, 26).setOrigin(0, 0).setInteractive();
      hz.on('pointerover', () => this.tip?.show(it, x, y, x < m.cx ? 'right' : 'left'));
      hz.on('pointerout', () => this.tip?.hide());
      m.add(hz);
      if (action && fn) makeButton(this.scene, x + colW - 26, y + 13, 44, 20, action, fn, { size: 10 });
    };

    // ---- my side ----
    label(x0 + 16, y0 + 32, `YOUR OFFER  (${this.myOffer.length}/${OFFER_MAX})  ·  ${this.myGold}g`, '#8ad0ff', 11.5, true);
    this.myOffer.forEach((it, i) => itemRow(x0 + 16, y0 + 50 + i * 30, it, 'PULL', () => {
      this.myOffer.splice(i, 1);
      this.pushOffer();
    }));
    // gold controls
    const gy = y0 + 50 + OFFER_MAX * 30 + 4;
    label(x0 + 16, gy + 2, `Gold (you carry ${this.hero.inventory.gold}g):`, C.inkDim, 10);
    makeButton(this.scene, x0 + 156, gy + 8, 40, 18, '+10', () => { this.myGold = Math.min(this.hero.inventory.gold, this.myGold + 10); this.pushOffer(); }, { size: 10 });
    makeButton(this.scene, x0 + 200, gy + 8, 44, 18, '+100', () => { this.myGold = Math.min(this.hero.inventory.gold, this.myGold + 100); this.pushOffer(); }, { size: 10 });
    makeButton(this.scene, x0 + 246, gy + 8, 36, 18, '0', () => { this.myGold = 0; this.pushOffer(); }, { size: 10 });

    // bag (add to offer)
    label(x0 + 16, gy + 24, 'YOUR BAG — click ADD to offer', C.inkDim, 10, true);
    const bag = this.hero.inventory.bag.filter((b) => !this.myOffer.includes(b));
    const pages = Math.max(1, Math.ceil(bag.length / 3));
    this.bagPage = Math.min(this.bagPage, pages - 1);
    bag.slice(this.bagPage * 3, this.bagPage * 3 + 3).forEach((it, i) => itemRow(x0 + 16, gy + 40 + i * 30, it, 'ADD', () => {
      if (this.myOffer.length >= OFFER_MAX) return;
      this.myOffer.push(it);
      this.pushOffer();
    }));
    if (pages > 1) {
      makeButton(this.scene, x0 + 40, gy + 134, 34, 16, '◀', () => { this.bagPage = Math.max(0, this.bagPage - 1); this.render(); }, { size: 10 });
      makeButton(this.scene, x0 + 220, gy + 134, 34, 16, '▶', () => { this.bagPage = Math.min(pages - 1, this.bagPage + 1); this.render(); }, { size: 10 });
    }

    // ---- their side ----
    label(m.cx + 8, y0 + 32, `${this.partnerName.toUpperCase()} OFFERS  ·  ${this.theirGold}g`, '#ffe9a8', 11.5, true);
    this.theirOffer.forEach((it, i) => itemRow(m.cx + 8, y0 + 50 + i * 30, it, null));
    if (this.theirOffer.length === 0 && this.theirGold === 0) label(m.cx + 16, y0 + 56, 'Nothing yet...', C.inkDim, 10.5);
    label(m.cx + 8, gy + 2, this.theirReady ? `${this.partnerName} is READY.` : `${this.partnerName} is still choosing...`, this.theirReady ? '#8affa0' : C.inkDim, 11, true);
    label(m.cx + 8, gy + 20, this.myReady ? 'You are READY — waiting on them.' : 'Press READY when the deal suits you.', this.myReady ? '#8affa0' : C.inkDim, 10.5);
    label(m.cx + 8, gy + 44, 'Any change to either offer clears both READY marks.', C.inkDim, 9.5);

    makeButton(this.scene, m.cx - 80, y0 + PANEL_H - 26, 130, 26, this.myReady ? 'READY ✓' : 'READY', () => this.ready(), { text: this.myReady ? '#8affa0' : undefined });
    makeButton(this.scene, m.cx + 80, y0 + PANEL_H - 26, 130, 26, 'CANCEL (ESC)', () => this.cancel());
  }
}
