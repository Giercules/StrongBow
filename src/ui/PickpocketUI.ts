import Phaser from 'phaser';
import { framedPanel, makeButton } from './uiHelpers';
import type { Modal } from './uiHelpers';
import { C } from '../rendering/Palette';
import type { ItemDefinition } from '../core/types';

const PANEL_W = 360;
const PANEL_H = 250;

export interface PickpocketLoot {
  gold: number;
  items: ItemDefinition[];
  victim: string;
}

/** A small "you lifted this" reward box, opened (and pausing the game) on a
 *  successful pickpocket — styled like the other framed modals. */
export class PickpocketUI {
  private scene: Phaser.Scene;
  private modal: Modal | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  isOpen(): boolean {
    return this.modal !== null;
  }

  private label(x: number, y: number, str: string, color: string, size = 12, bold = false): Phaser.GameObjects.Text {
    const t = this.scene.add
      .text(x, y, str, {
        fontFamily: 'MedievalSharp, "Trebuchet MS", cursive',
        fontSize: `${size}px`,
        color,
        fontStyle: bold ? 'bold' : 'normal',
        align: 'center',
        wordWrap: { width: PANEL_W - 56 },
      })
      .setOrigin(0.5, 0);
    this.modal!.add(t);
    return t;
  }

  open(loot: PickpocketLoot): void {
    if (this.modal) this.close();
    this.modal = framedPanel(this.scene, PANEL_W, PANEL_H, 'SLEIGHT OF HAND');
    const cx = this.modal.cx;
    const y0 = this.modal.cy - PANEL_H / 2;

    this.label(cx, y0 + 36, `You lift from ${loot.victim}:`, C.inkDim, 12);
    let yy = y0 + 64;
    if (loot.gold > 0) {
      this.modal.add(this.scene.add.image(cx - 56, yy + 10, 'coin-sheet', 0).setScale(1.2).setScrollFactor(0));
      this.label(cx + 8, yy, `${loot.gold} gold`, C.coinHi, 15, true);
      yy += 32;
    }
    for (const it of loot.items) {
      this.modal.add(this.scene.add.image(cx - 64, yy + 9, it.icon).setScale(1.4).setScrollFactor(0));
      this.label(cx + 6, yy, it.name, C.hudBorder, 12.5, true);
      yy += 30;
    }
    if (loot.gold === 0 && loot.items.length === 0) {
      this.label(cx, yy, 'nothing but lint and regret.', C.inkDim, 12);
    }

    this.modal.add(
      makeButton(this.scene, cx, y0 + PANEL_H - 26, 130, 30, 'POCKET IT', () => this.close(), { fill: C.ivy, size: 13 })
    );
  }

  close(): void {
    this.modal?.destroy();
    this.modal = null;
  }
}
