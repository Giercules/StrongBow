import Phaser from 'phaser';
import { framedPanel, makeButton } from './uiHelpers';
import type { Modal } from './uiHelpers';
import { C } from '../rendering/Palette';
import { RARITY_COLOR } from '../data/items';
import { SET_COLOR } from '../data/setItems';
import { UNIQUE_COLOR } from '../data/uniqueItems';
import { Content } from '../content/ContentRegistry';
import type { ItemDefinition } from '../core/types';
import type { Hero } from '../entities/Hero';
import { audio } from '../systems/AudioSystem';
import { ItemTooltip } from './ItemTooltip';

// ----------------------------------------------------------------------------
// StashUI — the oaken chest in your Lodge. Its contents live in their own
// localStorage key OUTSIDE the save slots, so everything stored is shared
// across every save and every character. 24 slots.
// ----------------------------------------------------------------------------

const STASH_KEY = 'strongbow_stash_v1';
export const STASH_SLOTS = 24;
// sized to fit the NARROWEST play area (min window: 460px between HUD panels)
const PANEL_W = 450;
const PANEL_H = 400;
const PAGE_SIZE = 7;

export function loadStash(): ItemDefinition[] {
  try {
    const raw = localStorage.getItem(STASH_KEY);
    if (!raw) return [];
    const items = JSON.parse(raw) as ItemDefinition[];
    // re-register so ids resolve if anything references them later
    for (const it of items) if (it.grade || it.setId || it.unique) Content.registerItem(it);
    return items;
  } catch {
    return [];
  }
}

export function saveStash(items: ItemDefinition[]): void {
  try {
    localStorage.setItem(STASH_KEY, JSON.stringify(items.slice(0, STASH_SLOTS)));
  } catch {
    /* storage full/blocked — the chest jams silently */
  }
}

export class StashUI {
  private scene: Phaser.Scene;
  private modal: Modal | null = null;
  private hero!: Hero;
  private stash: ItemDefinition[] = [];
  private stashPage = 0;
  private bagPage = 0;
  private tip?: ItemTooltip;
  private keyHandler?: (e: KeyboardEvent) => void;
  private onClosed?: () => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  isOpen(): boolean {
    return this.modal !== null;
  }

  open(hero: Hero, onClosed?: () => void): void {
    if (this.modal) return;
    this.hero = hero;
    this.onClosed = onClosed;
    this.stash = loadStash();
    this.stashPage = 0;
    this.bagPage = 0;
    this.tip = new ItemTooltip(this.scene);
    this.keyHandler = (e) => {
      if (e.key === 'Escape') this.close();
    };
    this.scene.input.keyboard?.on('keydown', this.keyHandler);
    audio.sfx('chest');
    this.render();
  }

  close(): void {
    if (this.keyHandler) this.scene.input.keyboard?.off('keydown', this.keyHandler);
    this.keyHandler = undefined;
    saveStash(this.stash);
    this.tip?.destroy();
    this.modal?.destroy();
    this.modal = null;
    this.onClosed?.();
    this.onClosed = undefined;
  }

  private nameColor(it: ItemDefinition): string {
    if (it.unique) return UNIQUE_COLOR;
    if (it.setId) return SET_COLOR;
    const n = RARITY_COLOR[it.rarity];
    return n !== undefined ? '#' + n.toString(16).padStart(6, '0') : '#dfe6ff';
  }

  private render(): void {
    this.modal?.destroy();
    this.modal = framedPanel(this.scene, PANEL_W, PANEL_H, 'LODGE STASH — SHARED ACROSS ALL HEROES');
    const m = this.modal;
    const x0 = m.cx - PANEL_W / 2;
    const y0 = m.cy - PANEL_H / 2;
    const colW = PANEL_W / 2 - 24;
    const label = (x: number, y: number, s: string, color: string, size: number, bold = false) =>
      m.add(this.scene.add.text(x, y, s, { fontFamily: 'MedievalSharp, "Trebuchet MS", cursive', fontSize: `${size}px`, color, fontStyle: bold ? 'bold' : 'normal' }));

    label(x0 + 20, y0 + 34, `STASH  (${this.stash.length}/${STASH_SLOTS})`, '#ffe9a8', 12, true);
    label(m.cx + 8, y0 + 34, `${this.hero.def.name.toUpperCase()}'S BAG  (${this.hero.inventory.bag.length})`, '#8ad0ff', 12, true);

    const row = (x: number, y: number, it: ItemDefinition, action: string, fn: () => void) => {
      const g = this.scene.add.graphics();
      g.fillStyle(0x121a30, 1);
      g.fillRoundedRect(x, y, colW, 32, 4);
      g.lineStyle(1, 0x3a4468, 1);
      g.strokeRoundedRect(x, y, colW, 32, 4);
      m.add(g);
      m.add(this.scene.add.image(x + 16, y + 16, it.icon).setScale(1.2));
      const nm = this.scene.add.text(x + 32, y + 4, it.name, { fontFamily: 'MedievalSharp, "Trebuchet MS", cursive', fontSize: '10.5px', color: this.nameColor(it), wordWrap: { width: colW - 96 } });
      m.add(nm);
      const hz = this.scene.add.zone(x, y, colW - 60, 32).setOrigin(0, 0).setInteractive({ useHandCursor: true });
      hz.on('pointerover', () => this.tip?.show(it, x, y, x < m.cx ? 'right' : 'left'));
      hz.on('pointerout', () => this.tip?.hide());
      m.add(hz);
      m.add(makeButton(this.scene, x + colW - 30, y + 16, 50, 22, action, fn, { size: 11 }));
    };

    // stash column
    const sPages = Math.max(1, Math.ceil(this.stash.length / PAGE_SIZE));
    this.stashPage = Math.min(this.stashPage, sPages - 1);
    this.stash.slice(this.stashPage * PAGE_SIZE, this.stashPage * PAGE_SIZE + PAGE_SIZE).forEach((it, i) => {
      row(x0 + 16, y0 + 56 + i * 38, it, 'TAKE', () => {
        this.stash = this.stash.filter((s) => s !== it);
        Content.registerItem(it);
        this.hero.inventory.add(it);
        this.hero.refreshStats();
        saveStash(this.stash);
        audio.sfx('coin');
        this.render();
      });
    });
    if (this.stash.length === 0) label(x0 + 24, y0 + 66, 'Empty. Store treasures for any hero to claim.', C.inkDim, 10.5);
    if (sPages > 1) {
      m.add(makeButton(this.scene, x0 + 60, y0 + PANEL_H - 58, 60, 20, '◀', () => { this.stashPage = Math.max(0, this.stashPage - 1); this.render(); }, { size: 11 }));
      m.add(makeButton(this.scene, x0 + 190, y0 + PANEL_H - 58, 60, 20, '▶', () => { this.stashPage = Math.min(sPages - 1, this.stashPage + 1); this.render(); }, { size: 11 }));
      label(x0 + 125, y0 + PANEL_H - 66, `${this.stashPage + 1}/${sPages}`, C.inkDim, 10);
    }

    // bag column (gear + consumables both stashable)
    const bag = this.hero.inventory.bag;
    const bPages = Math.max(1, Math.ceil(bag.length / PAGE_SIZE));
    this.bagPage = Math.min(this.bagPage, bPages - 1);
    bag.slice(this.bagPage * PAGE_SIZE, this.bagPage * PAGE_SIZE + PAGE_SIZE).forEach((it, i) => {
      row(m.cx + 8, y0 + 56 + i * 38, it, 'STORE', () => {
        if (this.stash.length >= STASH_SLOTS) {
          audio.sfx('ui_move');
          return;
        }
        this.hero.inventory.removeItem(it);
        this.stash.push(it);
        saveStash(this.stash);
        audio.sfx('chest');
        this.render();
      });
    });
    if (bag.length === 0) label(m.cx + 16, y0 + 66, 'Your bag is empty.', C.inkDim, 10.5);
    if (bPages > 1) {
      m.add(makeButton(this.scene, m.cx + 52, y0 + PANEL_H - 58, 60, 20, '◀', () => { this.bagPage = Math.max(0, this.bagPage - 1); this.render(); }, { size: 11 }));
      m.add(makeButton(this.scene, m.cx + 182, y0 + PANEL_H - 58, 60, 20, '▶', () => { this.bagPage = Math.min(bPages - 1, this.bagPage + 1); this.render(); }, { size: 11 }));
      label(m.cx + 117, y0 + PANEL_H - 66, `${this.bagPage + 1}/${bPages}`, C.inkDim, 10);
    }

    m.add(makeButton(this.scene, m.cx, y0 + PANEL_H - 26, 130, 26, 'CLOSE  (ESC)', () => this.close()));
  }
}
