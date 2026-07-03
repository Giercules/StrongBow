import Phaser from 'phaser';
import { framedPanel, makeButton } from './uiHelpers';
import type { Modal } from './uiHelpers';
import { C } from '../rendering/Palette';
import { SET_COLOR } from '../data/setItems';
import { UNIQUE_COLOR } from '../data/uniqueItems';
import { GRADES } from '../data/grades';
import type { ItemDefinition } from '../core/types';
import { audio } from '../systems/AudioSystem';
import { ItemTooltip } from './ItemTooltip';
import { MenuNav } from './MenuNav';

// ----------------------------------------------------------------------------
// LootRollUI — the party dice window. A fine drop goes up for rolls: each
// player throws a d20 (or passes), everyone's dice land live in the list, and
// when the host has every answer the highest roll takes the prize.
//
// The scene owns the roll state (LootRollState); this window just displays one
// roll and reports the local player's choice through the callbacks.
// ----------------------------------------------------------------------------

// sized to fit the NARROWEST play area (min window: 460px between HUD panels)
const PANEL_W = 400;
const PANEL_H = 360;

export interface RollEntry {
  name: string;
  value: number; // 0 = passed
}

export interface LootRollView {
  rollId: string;
  item: ItemDefinition;
  /** My d20 (0 = passed, undefined = not yet thrown). */
  myValue?: number;
  results: RollEntry[];
  winnerName?: string;
  winnerValue?: number;
}

export class LootRollUI {
  private scene: Phaser.Scene;
  private modal: Modal | null = null;
  private view: LootRollView | null = null;
  private onRoll?: (rollId: string) => number; // scene throws the die, returns the value
  private onPass?: (rollId: string) => void;
  private onClosed?: () => void;
  private rolling = false;
  private dieText: Phaser.GameObjects.Text | null = null;
  private dieTimer?: Phaser.Time.TimerEvent;
  private tip?: ItemTooltip;
  private keyHandler?: (e: KeyboardEvent) => void;
  private nav = new MenuNav();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  isOpen(): boolean {
    return this.modal !== null;
  }

  currentRollId(): string {
    return this.view?.rollId ?? '';
  }

  open(view: LootRollView, hooks: { onRoll: (rollId: string) => number; onPass: (rollId: string) => void; onClosed?: () => void }): void {
    if (this.modal) this.close();
    this.view = view;
    this.onRoll = hooks.onRoll;
    this.onPass = hooks.onPass;
    this.onClosed = hooks.onClosed;
    this.rolling = false;
    this.tip = new ItemTooltip(this.scene);
    this.keyHandler = (e) => {
      // Esc handled centrally by the scene (closeAllOverlays keeps it pending)
      if ((e.key === 'r' || e.key === 'R') && this.view?.myValue === undefined && !this.rolling) this.throwDie();
    };
    this.scene.input.keyboard?.on('keydown', this.keyHandler);
    this.nav.attach(this.scene, () => this.close());
    this.render();
  }

  /** The scene pushes fresh results / the winner while the window is open. */
  refresh(view: LootRollView): void {
    if (!this.modal || !this.view || this.view.rollId !== view.rollId) return;
    this.view = view;
    if (!this.rolling) this.render();
  }

  /** Close the window. A USER close before answering counts as a pass (the
   *  button says so); programmatic closes (`passOnClose: false`, e.g. another
   *  menu opening) leave the roll pending so the banner can bring it back. */
  close(passOnClose = true): void {
    if (!this.modal) return;
    if (passOnClose && this.view && this.view.myValue === undefined && !this.view.winnerName && !this.rolling) {
      this.onPass?.(this.view.rollId);
    }
    this.dieTimer?.remove();
    this.dieTimer = undefined;
    if (this.keyHandler) this.scene.input.keyboard?.off('keydown', this.keyHandler);
    this.keyHandler = undefined;
    this.nav.detach();
    this.tip?.destroy();
    this.tip = undefined;
    this.modal?.destroy();
    this.modal = null;
    this.view = null;
    this.rolling = false;
    this.dieText = null;
    this.onClosed?.();
    this.onClosed = undefined;
  }

  private nameColor(it: ItemDefinition): string {
    if (it.unique) return UNIQUE_COLOR;
    if (it.setId) return SET_COLOR;
    if (it.grade) return GRADES[it.grade].color;
    return '#ffe9a8';
  }

  /** Big d20 silhouette with the current face value. */
  private drawDie(m: Modal, x: number, y: number, r: number): void {
    const g = this.scene.add.graphics();
    const pts: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 3;
      pts.push(new Phaser.Math.Vector2(x + Math.cos(a) * r, y + Math.sin(a) * r));
    }
    g.fillStyle(0x1a2340, 1);
    g.fillPoints(pts, true);
    g.lineStyle(2.5, 0xcfa64e, 1);
    g.strokePoints(pts, true, true);
    // inner facet triangle — reads as a d20 at a glance
    const inner: Phaser.Math.Vector2[] = [0, 2, 4].map((i) => {
      const a = -Math.PI / 2 + (i * Math.PI) / 3;
      return new Phaser.Math.Vector2(x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62);
    });
    g.lineStyle(1.5, 0x6e521f, 0.9);
    g.strokePoints(inner, true, true);
    for (let i = 0; i < 6; i++) {
      const j = [0, 2, 4][i % 3];
      const a = -Math.PI / 2 + (j * Math.PI) / 3;
      g.lineBetween(pts[i].x, pts[i].y, x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62);
    }
    m.add(g);
  }

  private throwDie(): void {
    if (!this.view || this.rolling || this.view.myValue !== undefined) return;
    this.rolling = true;
    audio.sfx('ui_move');
    // the die tumbles: cycle faces fast, then settle on the scene's real throw
    let ticks = 0;
    this.dieTimer = this.scene.time.addEvent({
      delay: 70,
      repeat: 13,
      callback: () => {
        ticks++;
        if (!this.dieText?.active) return;
        if (ticks <= 13) {
          this.dieText.setText(`${Phaser.Math.Between(1, 20)}`);
        }
      },
    });
    this.scene.time.delayedCall(70 * 14 + 40, () => {
      this.rolling = false;
      if (!this.view || !this.modal) return;
      const value = this.onRoll?.(this.view.rollId) ?? 0;
      this.view.myValue = value;
      audio.sfx(value >= 15 ? 'levelup' : 'coin');
      this.render();
    });
  }

  private render(): void {
    if (!this.view) return;
    this.modal?.destroy();
    this.modal = framedPanel(this.scene, PANEL_W, PANEL_H, 'ROLL FOR THE SPOILS');
    const m = this.modal;
    this.nav.begin();
    const x0 = m.cx - PANEL_W / 2;
    const y0 = m.cy - PANEL_H / 2;
    const v = this.view;
    const label = (x: number, y: number, s: string, color: string, size: number, bold = false, originX = 0) =>
      m.add(
        this.scene.add
          .text(x, y, s, { fontFamily: 'MedievalSharp, "Trebuchet MS", cursive', fontSize: `${size}px`, color, fontStyle: bold ? 'bold' : 'normal', wordWrap: { width: PANEL_W - 40 } })
          .setOrigin(originX, 0)
      );

    // ---- the prize ----
    m.add(this.scene.add.image(x0 + 34, y0 + 46, v.item.icon).setScale(1.8));
    label(x0 + 54, y0 + 34, v.item.name, this.nameColor(v.item), 14, true);
    label(x0 + 54, y0 + 52, `${v.item.slot}${v.item.grade ? ' · ' + GRADES[v.item.grade].prefix : ''}`, C.inkDim, 10);
    const hz = this.scene.add.zone(x0 + 18, y0 + 30, PANEL_W - 36, 36).setOrigin(0, 0).setInteractive();
    hz.on('pointerover', () => this.tip?.show(v.item, x0 + 18, y0 + 30, 'right'));
    hz.on('pointerout', () => this.tip?.hide());
    m.add(hz);

    // ---- the die ----
    const dieY = y0 + 128;
    this.drawDie(m, m.cx, dieY, 44);
    const face = v.myValue !== undefined && v.myValue > 0 ? `${v.myValue}` : v.myValue === 0 ? '—' : '?';
    this.dieText = this.scene.add
      .text(m.cx, dieY, face, { fontFamily: 'MedievalSharp, "Trebuchet MS", cursive', fontSize: '30px', color: v.myValue !== undefined && v.myValue >= 15 ? '#8affa0' : '#ffe9a8', fontStyle: 'bold' })
      .setOrigin(0.5);
    m.add(this.dieText);

    if (v.myValue === undefined) {
      m.add(makeButton(this.scene, m.cx - 78, y0 + 196, 130, 30, 'ROLL  (R)', () => this.throwDie(), { fill: C.ivy }));
      m.add(makeButton(this.scene, m.cx + 78, y0 + 196, 130, 30, 'PASS', () => {
        if (!this.view) return;
        this.onPass?.(this.view.rollId);
        this.view.myValue = 0;
        this.render();
      }));
    } else if (!v.winnerName) {
      label(m.cx, y0 + 196, v.myValue > 0 ? `You rolled ${v.myValue} — the fates weigh it...` : 'You pass on this one.', v.myValue > 0 ? '#ffe9a8' : C.inkDim, 12, true, 0.5);
      label(m.cx, y0 + 214, 'You can close this — the winner is announced when every roll is in.', C.inkDim, 9.5, false, 0.5);
    }

    // ---- the table's dice so far ----
    let yy = y0 + 238;
    for (const r of v.results.slice(0, 4)) {
      label(x0 + 30, yy, r.name, C.ink, 11);
      label(x0 + PANEL_W - 76, yy, r.value > 0 ? `${r.value}` : 'pass', r.value > 0 ? '#ffe9a8' : C.inkDim, 11, true);
      yy += 17;
    }

    if (v.winnerName) {
      label(m.cx, y0 + PANEL_H - 62, `${v.winnerName} wins with a ${v.winnerValue}!`, '#8affa0', 13, true, 0.5);
    }

    m.add(makeButton(this.scene, m.cx, y0 + PANEL_H - 28, 140, 26, v.myValue === undefined ? 'CLOSE = PASS' : 'CLOSE', () => this.close()));
    this.nav.end();
  }
}
