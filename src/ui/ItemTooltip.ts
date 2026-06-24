import Phaser from 'phaser';
import type { ItemDefinition } from '../core/types';
import { RARITY_COLOR } from '../data/items';
import { itemStatLines } from '../data/pickupInfo';

const SERIF = 'MedievalSharp, "Trebuchet MS", cursive';
const numHex = (n: number): string => '#' + n.toString(16).padStart(6, '0');
const cap = (s: string): string => (s ? s[0].toUpperCase() + s.slice(1) : s);
const TOOLTIP_DEPTH = 9990;
const MAXW = 192;
const PAD = 8;

// Floating hover card: item name, type, stats, and flavor. Positioned in scene
// coords with scrollFactor 0, matching the modals it sits over.
export class ItemTooltip {
  private scene: Phaser.Scene;
  private objs: Phaser.GameObjects.GameObject[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  show(item: ItemDefinition, ax: number, ay: number, side: 'left' | 'right' = 'right'): void {
    this.hide();
    const made: { t: Phaser.GameObjects.Text; ly: number }[] = [];
    let y = PAD;
    let maxW = 0;
    const line = (str: string, color: string, size: number, italic = false, wrap = false): void => {
      const t = this.scene.add
        .text(0, 0, str, {
          fontFamily: SERIF,
          fontSize: `${size}px`,
          color,
          fontStyle: italic ? 'italic' : 'normal',
          ...(wrap ? { wordWrap: { width: MAXW - PAD * 2 } } : {}),
        })
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(TOOLTIP_DEPTH + 1);
      made.push({ t, ly: y });
      y += t.height + 3;
      maxW = Math.max(maxW, t.width);
    };

    line(item.name, numHex(RARITY_COLOR[item.rarity] ?? 0xffffff), 13, false, true);
    line(`${cap(item.slot)} · ${cap(item.rarity)}${item.grade ? ' · ' + String(item.grade) : ''}`, '#9a8a66', 9.5, true);
    const stats = itemStatLines(item);
    if (stats.length) {
      y += 2;
      for (const ln of stats) line(ln, '#bfe3b0', 10.5);
    }
    if (item.flavor) {
      y += 2;
      line(item.flavor, '#8a93bd', 9, true, true);
    }

    const w = Math.max(120, Math.min(MAXW, maxW + PAD * 2));
    const h = y + PAD - 3;

    const cam = this.scene.cameras.main;
    let px = side === 'right' ? ax + 14 : ax - w - 14;
    if (px + w > cam.width - 4) px = ax - w - 14;
    if (px < 4) px = ax + 14;
    px = Phaser.Math.Clamp(px, 4, Math.max(4, cam.width - w - 4));
    const py = Phaser.Math.Clamp(ay - 4, 4, Math.max(4, cam.height - h - 4));

    const g = this.scene.add.graphics().setScrollFactor(0).setDepth(TOOLTIP_DEPTH);
    g.fillStyle(0x0c0e16, 0.97);
    g.fillRoundedRect(px, py, w, h, 6);
    g.lineStyle(2, 0xb8923a, 1);
    g.strokeRoundedRect(px, py, w, h, 6);
    this.objs = [g];
    for (const { t, ly } of made) {
      t.setPosition(px + PAD, py + ly);
      this.objs.push(t);
    }
  }

  hide(): void {
    for (const o of this.objs) o.destroy();
    this.objs = [];
  }

  destroy(): void {
    this.hide();
  }
}
