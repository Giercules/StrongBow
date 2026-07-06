import Phaser from 'phaser';
import type { ItemDefinition, HeroClassId } from '../core/types';
import { RARITY_COLOR } from '../data/items';
import { itemStatEntries } from '../data/pickupInfo';
import { ARMOR_SETS, SET_COLOR, setTierColor, setTierLines, setTierPrefix, setTierStatus } from '../data/setItems';
import {
  compareVerdictColor,
  compareVerdictLabel,
  statLineCompareColor,
  type ItemCompareVerdict,
} from '../systems/ItemCompare';

const SERIF = 'MedievalSharp, "Trebuchet MS", cursive';
const numHex = (n: number): string => '#' + n.toString(16).padStart(6, '0');
const cap = (s: string): string => (s ? s[0].toUpperCase() + s.slice(1) : s);
const TOOLTIP_DEPTH = 9990;
const MAXW = 192;
const COMPARE_COL_W = 168;
const COMPARE_MID = 26;
const PAD = 8;

interface TooltipLine {
  t: Phaser.GameObjects.Text;
  ly: number;
}

interface ColumnLayout {
  lines: TooltipLine[];
  w: number;
  h: number;
}

// Floating hover card: item name, type, stats, and flavor. Positioned in scene
// coords with scrollFactor 0, matching the modals it sits over.
export class ItemTooltip {
  private scene: Phaser.Scene;
  private objs: Phaser.GameObjects.GameObject[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  show(item: ItemDefinition, ax: number, ay: number, side: 'left' | 'right' = 'right', equippedSetCount?: number): void {
    this.hide();
    const col = this.buildColumn(item, { equippedSetCount, header: undefined, compareRef: undefined, highlight: false });
    this.placePanel(MAXW, col.h, ax, ay, side, [{ col, x: PAD }]);
    for (const { t, ly } of col.lines) this.objs.push(t);
  }

  /** Side-by-side worn (left) vs hovered (right) with upgrade/downgrade verdict. */
  showCompare(
    candidate: ItemDefinition,
    worn: ItemDefinition | undefined,
    ax: number,
    ay: number,
    side: 'left' | 'right' = 'left',
    verdict: ItemCompareVerdict,
    equippedSetCount?: number,
    classId?: HeroClassId
  ): void {
    this.hide();
    const left = worn
      ? this.buildColumn(worn, { equippedSetCount, header: 'WORN', compareRef: undefined, highlight: false, classId })
      : this.buildEmptyColumn('WORN', '— Empty slot —');
    const right = this.buildColumn(candidate, {
      equippedSetCount,
      header: 'SELECTED',
      compareRef: worn,
      highlight: true,
      classId,
    });
    const totalW = PAD * 2 + left.w + COMPARE_MID + right.w;
    const totalH = Math.max(left.h, right.h);
    const px = this.panelX(totalW, ax, side);
    const py = this.panelY(totalH, ay);

    const g = this.scene.add.graphics().setScrollFactor(0).setDepth(TOOLTIP_DEPTH);
    g.fillStyle(0x0c0e16, 0.97);
    g.fillRoundedRect(px, py, totalW, totalH, 6);
    g.lineStyle(2, 0xb8923a, 1);
    g.strokeRoundedRect(px, py, totalW, totalH, 6);
    g.lineStyle(1, 0x4a5a8a, 0.55);
    g.lineBetween(px + PAD + left.w + COMPARE_MID / 2, py + 8, px + PAD + left.w + COMPARE_MID / 2, py + totalH - 8);
    this.objs = [g];

    const leftX = px + PAD;
    const rightX = px + PAD + left.w + COMPARE_MID;
    for (const { t, ly } of left.lines) {
      t.setPosition(leftX, py + ly);
      this.objs.push(t);
    }
    for (const { t, ly } of right.lines) {
      t.setPosition(rightX, py + ly);
      this.objs.push(t);
    }

    if (verdict !== 'none') {
      const midX = px + PAD + left.w + COMPARE_MID / 2;
      const midY = py + totalH / 2;
      const badge = this.scene.add
        .text(midX, midY, compareVerdictLabel(verdict), {
          fontFamily: SERIF,
          fontSize: '9px',
          color: compareVerdictColor(verdict),
          fontStyle: 'bold',
          align: 'center',
          wordWrap: { width: COMPARE_MID - 2 },
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(TOOLTIP_DEPTH + 1);
      this.objs.push(badge);
    }
  }

  /** Generic hover card (used for stat explanations on the character sheet). */
  showText(title: string, body: string, ax: number, ay: number, side: 'left' | 'right' = 'right'): void {
    this.hide();
    const made: TooltipLine[] = [];
    let y = PAD;
    let maxW = 0;
    const textW = MAXW - PAD * 2;
    const line = (str: string, color: string, size: number): void => {
      const t = this.scene.add
        .text(0, 0, str, {
          fontFamily: SERIF,
          fontSize: `${size}px`,
          color,
          wordWrap: { width: textW, useAdvancedWrap: true },
        })
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(TOOLTIP_DEPTH + 1);
      made.push({ t, ly: y });
      y += t.height + 3;
      maxW = Math.max(maxW, Math.min(textW, t.width));
    };
    line(title, '#ffe9a8', 12);
    line(body, '#bfc9e8', 9.5);

    const w = MAXW;
    const h = y + PAD - 3;
    this.placePanel(w, h, ax, ay, side, [{ col: { lines: made, w: w - PAD * 2, h }, x: PAD }]);
    for (const { t } of made) this.objs.push(t);
  }

  private buildEmptyColumn(header: string, message: string): ColumnLayout {
    const made: TooltipLine[] = [];
    let y = PAD;
    const line = (str: string, color: string, size: number, italic = false): void => {
      const t = this.scene.add
        .text(0, 0, str, {
          fontFamily: SERIF,
          fontSize: `${size}px`,
          color,
          fontStyle: italic ? 'italic' : 'normal',
          wordWrap: { width: COMPARE_COL_W, useAdvancedWrap: true },
        })
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(TOOLTIP_DEPTH + 1);
      made.push({ t, ly: y });
      y += t.height + 3;
    };
    line(header, '#9a8a66', 8.5, true);
    y += 2;
    line(message, '#6a7390', 10, true);
    return { lines: made, w: COMPARE_COL_W, h: y + PAD - 3 };
  }

  private buildColumn(
    item: ItemDefinition,
    opts: {
      equippedSetCount?: number;
      header?: string;
      compareRef?: ItemDefinition;
      highlight: boolean;
      classId?: HeroClassId;
    }
  ): ColumnLayout {
    const made: TooltipLine[] = [];
    let y = PAD;
    const colW = opts.highlight || opts.header ? COMPARE_COL_W : MAXW - PAD * 2;
    const line = (str: string, color: string, size: number, italic = false): void => {
      const t = this.scene.add
        .text(0, 0, str, {
          fontFamily: SERIF,
          fontSize: `${size}px`,
          color,
          fontStyle: italic ? 'italic' : 'normal',
          wordWrap: { width: colW, useAdvancedWrap: true },
        })
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(TOOLTIP_DEPTH + 1);
      made.push({ t, ly: y });
      y += t.height + 3;
    };

    if (opts.header) line(opts.header, '#9a8a66', 8.5, true);
    line(item.name, item.setId ? SET_COLOR : numHex(RARITY_COLOR[item.rarity] ?? 0xffffff), opts.highlight ? 12 : 13);
    line(`${cap(item.slot)} · ${cap(item.rarity)}${item.grade ? ' · ' + String(item.grade) : ''}`, '#9a8a66', 9, true);

    const stats = itemStatEntries(item);
    if (stats.length) {
      y += 2;
      for (const entry of stats) {
        const tint =
          opts.compareRef && entry.key
            ? statLineCompareColor(entry.key, item, opts.compareRef) ?? '#bfe3b0'
            : '#bfe3b0';
        line(entry.line, tint, 10);
      }
    }

    const set = item.setId ? Object.values(ARMOR_SETS).find((s) => s.id === item.setId) : undefined;
    if (set) {
      y += 2;
      const count = opts.equippedSetCount ?? 0;
      line(`${set.name} (${cap(set.classId)} set)  ${count}/5`, count > 0 ? SET_COLOR : '#8a93bd', 9);
      setTierLines(set.classId).forEach((tl, i) => {
        const st = setTierStatus(count, i);
        line(setTierPrefix(st) + tl, setTierColor(st), 8);
      });
    }
    if (item.flavor && !opts.header) {
      y += 2;
      line(item.flavor, '#8a93bd', 9, true);
    }

    return { lines: made, w: colW, h: y + PAD - 3 };
  }

  private panelX(w: number, ax: number, side: 'left' | 'right'): number {
    const cam = this.scene.cameras.main;
    let px = side === 'right' ? ax + 14 : ax - w - 14;
    if (px + w > cam.width - 4) px = ax - w - 14;
    if (px < 4) px = ax + 14;
    return Phaser.Math.Clamp(px, 4, Math.max(4, cam.width - w - 4));
  }

  private panelY(h: number, ay: number): number {
    return Phaser.Math.Clamp(ay - 4, 4, Math.max(4, this.scene.cameras.main.height - h - 4));
  }

  private placePanel(
    w: number,
    h: number,
    ax: number,
    ay: number,
    side: 'left' | 'right',
    cols: { col: ColumnLayout; x: number }[]
  ): void {
    const px = this.panelX(w, ax, side);
    const py = this.panelY(h, ay);
    const g = this.scene.add.graphics().setScrollFactor(0).setDepth(TOOLTIP_DEPTH);
    g.fillStyle(0x0c0e16, 0.97);
    g.fillRoundedRect(px, py, w, h, 6);
    g.lineStyle(2, 0xb8923a, 1);
    g.strokeRoundedRect(px, py, w, h, 6);
    this.objs = [g];
    for (const { col, x } of cols) {
      for (const { t, ly } of col.lines) {
        t.setPosition(px + x, py + ly);
        this.objs.push(t);
      }
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