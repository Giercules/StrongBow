import Phaser from 'phaser';
import { framedPanel, makeButton } from './uiHelpers';
import type { Modal } from './uiHelpers';
import { C } from '../rendering/Palette';
import { questLog } from '../systems/QuestSystem';
import type { Quest } from '../systems/QuestSystem';
import type { Hero } from '../entities/Hero';
import { audio } from '../systems/AudioSystem';

// sized to fit the NARROWEST play area (min window: 460px between HUD panels)
const PANEL_W = 450;
const PANEL_H = 430;

const KIND_TAG: Record<string, string> = { bounty: 'BOUNTY', gather: 'RELICS', rescue: 'RESCUE' };
const KIND_COLOR: Record<string, string> = { bounty: '#ff8a6a', gather: '#8ad0ff', rescue: '#8affa0' };

/** The Hearthwatch notice board: accept contracts, track them, claim payouts. */
export class QuestBoardUI {
  private scene: Phaser.Scene;
  private modal: Modal | null = null;
  private hero!: Hero;
  private onClosed?: () => void;
  private onAccepted?: (q: Quest) => void;
  private onTurnedIn?: (q: Quest) => void;
  private keyHandler?: (e: KeyboardEvent) => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  isOpen(): boolean {
    return this.modal !== null;
  }

  open(hero: Hero, unlockedRealms: number, hooks: { onClosed?: () => void; onAccepted?: (q: Quest) => void; onTurnedIn?: (q: Quest) => void } = {}): void {
    if (this.modal) return;
    this.hero = hero;
    this.onClosed = hooks.onClosed;
    this.onAccepted = hooks.onAccepted;
    this.onTurnedIn = hooks.onTurnedIn;
    questLog.refreshOffers(unlockedRealms);
    this.keyHandler = (e) => {
      if (e.key === 'Escape') this.close();
    };
    this.scene.input.keyboard?.on('keydown', this.keyHandler);
    this.render();
  }

  close(): void {
    if (this.keyHandler) this.scene.input.keyboard?.off('keydown', this.keyHandler);
    this.keyHandler = undefined;
    this.modal?.destroy();
    this.modal = null;
    this.onClosed?.();
    this.onClosed = undefined;
  }

  private render(): void {
    this.modal?.destroy();
    this.modal = framedPanel(this.scene, PANEL_W, PANEL_H, 'HEARTHWATCH NOTICE BOARD');
    const m = this.modal;
    const x0 = m.cx - PANEL_W / 2;
    const y0 = m.cy - PANEL_H / 2;
    const label = (x: number, y: number, s: string, color: string, size: number, bold = false) =>
      m.add(this.scene.add.text(x, y, s, { fontFamily: 'MedievalSharp, "Trebuchet MS", cursive', fontSize: `${size}px`, color, fontStyle: bold ? 'bold' : 'normal' }));

    label(x0 + 20, y0 + 32, `Standing: ${questLog.repTitle()}  ·  Reputation ${questLog.reputation}`, '#ffe9a8', 12, true);

    // ---- posted contracts ----
    label(x0 + 20, y0 + 54, 'POSTED CONTRACTS', C.inkDim, 11, true);
    let yy = y0 + 72;
    const canAccept = questLog.active.length < 3;
    if (questLog.offers.length === 0) label(x0 + 24, yy, 'The board is bare — check back after your next descent.', C.inkDim, 11);
    for (const q of questLog.offers.slice(0, 3)) {
      this.questRow(m, x0 + 16, yy, q, canAccept ? 'ACCEPT' : 'LOG FULL', canAccept, () => {
        if (questLog.accept(q.id)) {
          audio.sfx('ui_select');
          this.onAccepted?.(q);
          this.render();
        }
      });
      yy += 62;
    }

    // ---- your log ----
    yy = Math.max(yy + 6, y0 + 262);
    label(x0 + 20, yy - 18, `YOUR CONTRACTS  (${questLog.active.length}/3)`, C.inkDim, 11, true);
    if (questLog.active.length === 0) label(x0 + 24, yy + 2, 'None yet. A little coin never hurt anyone.', C.inkDim, 11);
    for (const q of questLog.active) {
      const ready = q.done && !q.turnedIn;
      this.questRow(m, x0 + 16, yy, q, ready ? 'CLAIM' : `${q.progress}/${q.need}`, ready, () => {
        const paid = questLog.turnIn(q.id);
        if (paid) {
          this.hero.inventory.gold += paid.gold;
          this.hero.gainXP(paid.xp);
          audio.sfx('coin');
          this.onTurnedIn?.(paid);
          this.render();
        }
      });
      yy += 46;
    }

    m.add(makeButton(this.scene, m.cx, y0 + PANEL_H - 26, 130, 26, 'CLOSE  (ESC)', () => this.close()));
  }

  private questRow(m: Modal, x: number, y: number, q: Quest, action: string, enabled: boolean, fn: () => void): void {
    const w = PANEL_W - 32;
    const g = this.scene.add.graphics();
    const compact = action.includes('/') || action === 'CLAIM';
    const h = compact ? 40 : 56;
    g.fillStyle(0x121a30, 1);
    g.fillRoundedRect(x, y, w, h, 5);
    g.lineStyle(1, q.done && !q.turnedIn ? 0x39ff6a : 0x3a4468, 1);
    g.strokeRoundedRect(x, y, w, h, 5);
    m.add(g);
    const label = (lx: number, ly: number, s: string, color: string, size: number, bold = false) =>
      m.add(this.scene.add.text(lx, ly, s, { fontFamily: 'MedievalSharp, "Trebuchet MS", cursive', fontSize: `${size}px`, color, fontStyle: bold ? 'bold' : 'normal', wordWrap: { width: w - 130 } }));
    label(x + 10, y + 5, `[${KIND_TAG[q.kind]}]`, KIND_COLOR[q.kind], 10, true);
    label(x + 74, y + 4, q.title, '#ffe9a8', 12.5, true);
    if (!compact) label(x + 10, y + 22, q.desc, C.ink, 10);
    label(x + 10, y + h - 15, `${q.gold}g  ·  ${q.xp} XP  ·  +${q.rep} rep`, '#8ad0ff', 10);
    if (enabled) m.add(makeButton(this.scene, x + w - 52, y + h / 2, 84, 24, action, fn, { text: q.done ? '#8affa0' : undefined }));
    else m.add(this.scene.add.text(x + w - 90, y + h / 2 - 7, action, { fontFamily: 'MedievalSharp, "Trebuchet MS", cursive', fontSize: '12px', color: C.inkDim }));
  }
}
