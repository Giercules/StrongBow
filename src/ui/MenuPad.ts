import Phaser from 'phaser';
import { audio } from '../systems/AudioSystem';

const DEAD = 0.5;
type Dir = 'up' | 'down' | 'left' | 'right' | 'confirm' | 'cancel';
const DIRS: Dir[] = ['up', 'down', 'left', 'right', 'confirm', 'cancel'];

/**
 * Edge-triggered gamepad reader for menu screens: D-pad + left stick give
 * direction, A = confirm, B = cancel. Call poll() once per frame, then read the
 * rising-edge getters. Reuses the first *connected* pad (slots can be sparse).
 */
export class MenuPad {
  private scene: Phaser.Scene;
  private prev: Record<Dir, boolean> = { up: false, down: false, left: false, right: false, confirm: false, cancel: false };
  private edge: Record<Dir, boolean> = { up: false, down: false, left: false, right: false, confirm: false, cancel: false };

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  private pad(): Phaser.Input.Gamepad.Gamepad | undefined {
    const gp = this.scene.input.gamepad;
    if (!gp) return undefined;
    return gp.gamepads.find((g): g is Phaser.Input.Gamepad.Gamepad => !!g && g.connected);
  }

  connected(): boolean {
    return !!this.pad();
  }

  poll(): void {
    const pad = this.pad();
    const sx = pad?.leftStick?.x ?? 0;
    const sy = pad?.leftStick?.y ?? 0;
    const now: Record<Dir, boolean> = {
      up: !!pad && (pad.up || sy < -DEAD),
      down: !!pad && (pad.down || sy > DEAD),
      left: !!pad && (pad.left || sx < -DEAD),
      right: !!pad && (pad.right || sx > DEAD),
      confirm: !!pad && (pad.A || !!pad.buttons[0]?.pressed),
      cancel: !!pad && (pad.B || !!pad.buttons[1]?.pressed),
    };
    for (const k of DIRS) {
      this.edge[k] = now[k] && !this.prev[k];
      this.prev[k] = now[k];
    }
  }

  up(): boolean { return this.edge.up; }
  down(): boolean { return this.edge.down; }
  left(): boolean { return this.edge.left; }
  right(): boolean { return this.edge.right; }
  confirm(): boolean { return this.edge.confirm; }
  cancel(): boolean { return this.edge.cancel; }
}

export interface Focusable {
  /** Centre x of the widget (as passed to makeButton). */
  x: number;
  /** Centre y of the widget. */
  y: number;
  w: number;
  h: number;
  activate: () => void;
}

/**
 * A set of on-screen buttons with a moving focus highlight. Directional moves
 * use nearest-neighbour-in-direction, so it works for rows, columns, and grids
 * without per-scene index bookkeeping.
 */
export class FocusList {
  private items: Focusable[] = [];
  private idx = 0;
  private hl: Phaser.GameObjects.Graphics;
  private color: number;

  constructor(scene: Phaser.Scene, depth = 50, color = 0xffe27a) {
    this.color = color;
    this.hl = scene.add.graphics().setDepth(depth).setScrollFactor(0);
  }

  add(f: Focusable): void {
    this.items.push(f);
    if (this.items.length === 1) this.redraw();
  }

  clear(): void {
    this.items = [];
    this.idx = 0;
    this.hl.clear();
  }

  count(): number {
    return this.items.length;
  }

  setIndex(i: number): void {
    if (i >= 0 && i < this.items.length) {
      this.idx = i;
      this.redraw();
    }
  }

  private redraw(): void {
    const f = this.items[this.idx];
    this.hl.clear();
    if (!f) return;
    this.hl.lineStyle(3, this.color, 1);
    this.hl.strokeRoundedRect(f.x - f.w / 2 - 4, f.y - f.h / 2 - 4, f.w + 8, f.h + 8, 7);
  }

  /** Move focus to the nearest item in the (dx,dy) direction. */
  move(dx: number, dy: number): void {
    const cur = this.items[this.idx];
    if (!cur) return;
    let best = -1;
    let bestScore = Infinity;
    this.items.forEach((f, i) => {
      if (i === this.idx) return;
      const along = (f.x - cur.x) * dx + (f.y - cur.y) * dy; // progress in the pressed direction
      if (along <= 1) return; // must be ahead of the current item
      const perp = Math.abs((f.x - cur.x) * dy - (f.y - cur.y) * dx);
      const score = along + perp * 3; // prefer well-aligned, then nearest
      if (score < bestScore) {
        bestScore = score;
        best = i;
      }
    });
    if (best >= 0) {
      this.idx = best;
      this.redraw();
      audio.sfx('ui_move');
    }
  }

  activate(): void {
    this.items[this.idx]?.activate();
  }
}
