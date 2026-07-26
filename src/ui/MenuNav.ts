import Phaser from 'phaser';
import { PLAY_AREA_UI_DEPTH } from '../core/constants';
import { audio } from '../systems/AudioSystem';

// ----------------------------------------------------------------------------
// MenuNav — shared keyboard + gamepad navigation for the pointer-driven modal
// menus (shops, notice board, stash, trade, dialogue, pickpocket, sheets...).
//
// A UI owns one MenuNav: attach() on open, detach() on close, and wrap each
// render pass in begin()/end(). While a pass is between begin and end, every
// button built through uiHelpers.makeButton (or a UI's own button factory
// that calls navCollector()) registers itself as a focus target. Arrows /
// D-Pad / left stick move a gold focus ring, Enter / A / X press the focused
// button, and B backs out via the UI's onBack.
// ----------------------------------------------------------------------------

export interface NavItem {
  x: number; // centre
  y: number;
  w: number;
  h: number;
  fn: () => void;
}

let activeCollector: MenuNav | null = null;

/** The MenuNav currently collecting buttons (during a UI render pass). */
export function navCollector(): MenuNav | null {
  return activeCollector;
}

export type PadDownHandler = (pad: Phaser.Input.Gamepad.Gamepad, button: Phaser.Input.Gamepad.Button, value: number) => void;

/**
 * Subscribe to gamepad button presses by BUTTON INDEX.
 *
 * Phaser's plugin-level 'down' event is `(pad, button, value)` — the third
 * argument is the analog value, which is `1` for any digital press, NOT the
 * button index. Reading it as an index makes every single button look like
 * button 1, which silently turns every menu press into "back": nothing can be
 * selected, the D-pad stops navigating, and a modal opened with Start can never
 * be closed with Start (the modal closes itself, then the scene's own poll
 * re-opens it on the same frame).
 *
 * The index lives on the *button*, so every menu goes through here.
 */
export function onPadDown(scene: Phaser.Scene, handler: (index: number) => void): PadDownHandler | undefined {
  const gp = scene.input.gamepad;
  if (!gp) return undefined;
  const h: PadDownHandler = (_pad, button) => handler(button.index);
  gp.on('down', h);
  return h;
}

/** Detach a listener installed by onPadDown. Safe with undefined. */
export function offPadDown(scene: Phaser.Scene, handler: PadDownHandler | undefined): void {
  if (handler) scene.input.gamepad?.off('down', handler);
}

export class MenuNav {
  private scene: Phaser.Scene | null = null;
  private items: NavItem[] = [];
  private focus = -1; // nothing focused until the first nav input (mouse-first)
  private gfx: Phaser.GameObjects.Graphics | null = null;
  private onBack?: () => void;
  private keyHandler?: (e: KeyboardEvent) => void;
  private padHandler?: PadDownHandler;
  private stickHandler?: () => void;
  private stickPrevX = 0;
  private stickPrevY = 0;

  /** Install input handlers + the focus ring. Call from the UI's open().
   *  `keyboard: false` = pad-only nav, for menus with their own key scheme. */
  attach(scene: Phaser.Scene, onBack: () => void, opts: { keyboard?: boolean } = {}): void {
    this.detach();
    this.scene = scene;
    this.onBack = onBack;
    this.focus = -1;
    this.gfx = scene.add.graphics().setDepth(PLAY_AREA_UI_DEPTH + 40).setScrollFactor(0);
    if (opts.keyboard !== false) {
      this.keyHandler = (e) => this.onKey(e);
      scene.input.keyboard?.on('keydown', this.keyHandler);
    }
    this.padHandler = onPadDown(scene, (index) => this.onPad(index));
    this.stickPrevX = 0;
    this.stickPrevY = 0;
    this.stickHandler = () => this.pollStick();
    scene.events.on(Phaser.Scenes.Events.UPDATE, this.stickHandler);
  }

  /** Remove handlers + ring. Call from the UI's close(). Safe to repeat. */
  detach(): void {
    if (!this.scene) return;
    if (this.keyHandler) this.scene.input.keyboard?.off('keydown', this.keyHandler);
    offPadDown(this.scene, this.padHandler);
    if (this.stickHandler) this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.stickHandler);
    this.keyHandler = undefined;
    this.padHandler = undefined;
    this.stickHandler = undefined;
    this.gfx?.destroy();
    this.gfx = null;
    this.items = [];
    this.scene = null;
  }

  /** Start collecting focus targets for this render pass. */
  begin(): void {
    this.items = [];
    activeCollector = this;
  }

  /** Finish the pass: order targets top-to-bottom and redraw the ring. */
  end(): void {
    if (activeCollector === this) activeCollector = null;
    this.items.sort((a, b) => a.y - b.y || a.x - b.x);
    if (this.focus >= this.items.length) this.focus = this.items.length - 1;
    this.draw();
  }

  register(x: number, y: number, w: number, h: number, fn: () => void): void {
    this.items.push({ x, y, w, h, fn });
  }

  private onKey(e: KeyboardEvent): void {
    if (e.key === 'ArrowUp') this.move(0, -1);
    else if (e.key === 'ArrowDown') this.move(0, 1);
    else if (e.key === 'ArrowLeft') this.move(-1, 0);
    else if (e.key === 'ArrowRight') this.move(1, 0);
    else if (e.key === 'Enter') this.activate();
  }

  private onPad(index: number): void {
    switch (index) {
      case 12: this.move(0, -1); break;
      case 13: this.move(0, 1); break;
      case 14: this.move(-1, 0); break;
      case 15: this.move(1, 0); break;
      case 0: // A
      case 2: // X (Nintendo-position pads report physical A as 1)
        this.activate();
        break;
      case 1: this.onBack?.(); break; // B
    }
  }

  /** Edge-detected left-stick nav (sticks fire no 'down' events). */
  private pollStick(): void {
    const gp = this.scene?.input.gamepad;
    const pad = gp?.gamepads.find((g): g is Phaser.Input.Gamepad.Gamepad => !!g && g.connected);
    if (!pad) return;
    const dz = 0.5;
    const sx = pad.leftStick?.x ?? 0;
    const sy = pad.leftStick?.y ?? 0;
    const zx = sx > dz ? 1 : sx < -dz ? -1 : 0;
    const zy = sy > dz ? 1 : sy < -dz ? -1 : 0;
    if (zy !== 0 && zy !== this.stickPrevY) this.move(0, zy);
    else if (zx !== 0 && zx !== this.stickPrevX) this.move(zx, 0);
    this.stickPrevX = zx;
    this.stickPrevY = zy;
  }

  private move(dx: number, dy: number): void {
    if (this.items.length === 0) return;
    if (this.focus < 0) {
      this.focus = 0;
    } else if (dx !== 0) {
      // prefer a neighbour on the SAME row; fall back to list order
      const cur = this.items[this.focus];
      let best = -1;
      let bestDist = Infinity;
      this.items.forEach((it, i) => {
        if (i === this.focus || Math.abs(it.y - cur.y) > 12) return;
        const d = (it.x - cur.x) * dx;
        if (d > 0 && d < bestDist) {
          bestDist = d;
          best = i;
        }
      });
      this.focus = best >= 0 ? best : Phaser.Math.Wrap(this.focus + dx, 0, this.items.length);
    } else {
      this.focus = Phaser.Math.Wrap(this.focus + dy, 0, this.items.length);
    }
    audio.sfx('ui_move');
    this.draw();
  }

  private activate(): void {
    const it = this.items[this.focus];
    if (it) it.fn();
  }

  private draw(): void {
    if (!this.gfx) return;
    this.gfx.clear();
    const it = this.items[this.focus];
    if (!it) return;
    this.gfx.lineStyle(2.5, 0xffd24a, 1);
    this.gfx.strokeRoundedRect(it.x - it.w / 2 - 4, it.y - it.h / 2 - 4, it.w + 8, it.h + 8, 7);
    this.gfx.lineStyle(1, 0xffd24a, 0.35);
    this.gfx.strokeRoundedRect(it.x - it.w / 2 - 7, it.y - it.h / 2 - 7, it.w + 14, it.h + 14, 9);
  }
}
