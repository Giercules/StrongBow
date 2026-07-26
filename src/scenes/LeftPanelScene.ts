import Phaser from 'phaser';
import { LEFT_PANEL_WIDTH, GAME_HEIGHT, LOG_REGISTRY_KEY } from '../core/constants';
import { C } from '../rendering/Palette';
import type { LogRegistryData, LogEntry, LogEntryKind } from '../core/types';

const W = LEFT_PANEL_WIDTH;
const PAD = 10;

// Header: title + Dungeon Master box. Log is a hard-clipped window below it.
const DM_BOX_Y = 34;
const DM_BOX_H = 58;
const LOG_TOP = DM_BOX_Y + DM_BOX_H + 12; // first y of the scroll window
const LOG_BOTTOM = GAME_HEIGHT - 14;
const LOG_HEIGHT = LOG_BOTTOM - LOG_TOP;
const LINE_GAP = 3;

function hexNum(s: string): number {
  return parseInt(s.replace('#', ''), 16);
}

const KIND_COLOR: Record<LogEntry['kind'], string> = {
  grok: '#b79bff',
  event: '#e9d6a8',
  combat: '#ff9a6a',
  loot: '#7fe0a0',
  system: '#8a93bd',
};

const KIND_PREFIX: Record<LogEntryKind, string> = {
  grok: '✻ ',
  event: '• ',
  combat: '⚔ ',
  loot: '◆ ',
  system: '· ',
};

function entryPrefix(e: LogEntry): string {
  if (e.kind === 'grok' || e.source) {
    if (e.depth === 'aside') return e.source === 'live' ? '◈ ' : '◇ ';
    if (e.source === 'live') return '✻ ';
    if (e.source === 'local') return '· ';
  }
  return KIND_PREFIX[e.kind];
}

function entryColor(e: LogEntry): string {
  if (e.color) return e.color;
  if (e.source === 'local') return '#8a93bd';
  if (e.kind === 'grok' && e.depth === 'aside') return '#c9a8ff';
  return KIND_COLOR[e.kind];
}

function entryStyle(e: LogEntry): string {
  if (e.depth === 'aside') return 'italic';
  if (e.kind === 'grok' || e.source === 'live') return 'italic';
  return 'normal';
}

// ----------------------------------------------------------------------------
// LeftPanelScene — DnD adventure log + live Dungeon Master feed.
// Log lines live in a masked container strictly below the DM box; a solid header
// plate at higher depth also covers any residual bleed while scrolling.
// ----------------------------------------------------------------------------
export class LeftPanelScene extends Phaser.Scene {
  private lines: Phaser.GameObjects.Text[] = [];
  private logRoot!: Phaser.GameObjects.Container;
  private statusDot!: Phaser.GameObjects.Graphics;
  private grokLabel!: Phaser.GameObjects.Text;
  private moreAbove!: Phaser.GameObjects.Text;
  private moreBelow!: Phaser.GameObjects.Text;
  private scrollHint!: Phaser.GameObjects.Text;
  private logMaskGfx!: Phaser.GameObjects.Graphics;
  private lastSig = '';
  private lastStatus = '';
  private dotPulse = 0;
  private entries: LogEntry[] = [];
  private scrollY = 0;
  private maxScrollY = 0;
  private stick = true;

  constructor() {
    super('LeftPanelScene');
  }

  create(): void {
    this.cameras.main.setViewport(0, 0, W, GAME_HEIGHT);
    this.cameras.main.setScroll(0, 0);
    this.lines = [];
    this.entries = [];
    this.lastSig = '';
    this.lastStatus = '';
    this.scrollY = 0;
    this.maxScrollY = 0;
    this.stick = true;
    this.buildChrome();
    const wheelHandler = (pointer: Phaser.Input.Pointer, _objs: unknown, _dx: number, dy: number) => {
      if (pointer.x > W || this.maxScrollY <= 0) return;
      this.scrollY = Phaser.Math.Clamp(this.scrollY - dy, 0, this.maxScrollY);
      this.stick = this.scrollY <= 2;
      this.layoutLog(this.entries);
    };
    this.input.on('wheel', wheelHandler);
    this.events.once('shutdown', () => {
      this.input.off('wheel', wheelHandler);
      for (const t of this.lines) t.destroy();
      this.lines = [];
      this.logRoot?.destroy(true);
      this.logMaskGfx?.destroy();
    });
  }

  private buildChrome(): void {
    // Match right HUD: arcade cabinet double-gold frame + neon hairline + corner pips.
    const g = this.add.graphics().setDepth(0);
    g.fillStyle(hexNum(C.hudBg), 1);
    g.fillRect(0, 0, W, GAME_HEIGHT);
    g.fillStyle(hexNum(C.hudPanel), 1);
    g.fillRect(4, 4, W - 8, GAME_HEIGHT - 8);
    g.fillStyle(0xffffff, 0.04);
    g.fillRect(4, 4, W - 8, 72);
    g.lineStyle(3, hexNum(C.hudBorder), 1);
    g.strokeRect(4, 4, W - 8, GAME_HEIGHT - 8);
    g.lineStyle(1, hexNum(C.hudBorderDk), 1);
    g.strokeRect(8, 8, W - 16, GAME_HEIGHT - 16);
    g.lineStyle(1, hexNum(C.hudNeon), 0.42);
    g.strokeRect(6, 6, W - 12, GAME_HEIGHT - 12);
    g.fillStyle(hexNum(C.hudBorder), 1);
    for (const [cx, cy, sx, sy] of [
      [5, 5, 1, 1],
      [W - 5, 5, -1, 1],
      [5, GAME_HEIGHT - 5, 1, -1],
      [W - 5, GAME_HEIGHT - 5, -1, -1],
    ] as [number, number, number, number][]) {
      g.fillRect(cx, cy, 16 * sx, 3 * sy);
      g.fillRect(cx, cy, 3 * sx, 16 * sy);
      g.fillStyle(hexNum(C.hudNeon), 1);
      g.fillRect(cx + (sx > 0 ? 0 : -4), cy + (sy > 0 ? 0 : -4), 4, 4);
      g.fillStyle(hexNum(C.ivyHi), 0.95);
      g.fillRect(cx + sx * 8, cy + sy * 8, 3, 3);
      g.fillStyle(hexNum(C.hudBorder), 1);
    }

    const dpi = typeof window !== 'undefined' ? Math.min(2, Math.max(1, window.devicePixelRatio || 1)) : 2;

    // ---- Log layer (depth 5): container + geometry mask ----
    this.logRoot = this.add.container(0, 0).setDepth(5);
    // Mask graphics must stay in the display list (invisible) for reliable clipping.
    this.logMaskGfx = this.add.graphics().setDepth(4);
    this.logMaskGfx.fillStyle(0xffffff, 1);
    this.logMaskGfx.fillRect(PAD - 1, LOG_TOP, W - PAD * 2 + 2, LOG_HEIGHT);
    this.logMaskGfx.setVisible(false);
    const mask = this.logMaskGfx.createGeometryMask();
    this.logRoot.setMask(mask);

    // ---- Header plate (depth 8): solid cover so scroll never shows through ----
    const header = this.add.graphics().setDepth(8);
    header.fillStyle(hexNum(C.hudPanel), 1);
    // Cover from top of panel content down to the log top (includes DM box area).
    header.fillRect(8, 8, W - 16, LOG_TOP - 10);
    // Outer strip to match frame gutters
    header.fillStyle(hexNum(C.hudBg), 1);
    header.fillRect(0, 0, W, 8);
    header.fillRect(0, 0, 8, LOG_TOP);
    header.fillRect(W - 8, 0, 8, LOG_TOP);
    // Re-draw frame top edge so the cover doesn't erase it
    header.lineStyle(3, hexNum(C.hudBorder), 1);
    header.strokeRect(4, 4, W - 8, LOG_TOP - 2);
    header.lineStyle(1, hexNum(C.hudBorderDk), 1);
    header.strokeRect(8, 8, W - 16, LOG_TOP - 6);
    header.lineStyle(1, hexNum(C.hudNeon), 0.4);
    header.strokeRect(6, 6, W - 12, LOG_TOP - 4);

    // Gold + neon corner brackets on header plate
    header.fillStyle(hexNum(C.hudBorder), 1);
    header.fillRect(5, 5, 16, 3);
    header.fillRect(5, 5, 3, 16);
    header.fillRect(W - 21, 5, 16, 3);
    header.fillRect(W - 8, 5, 3, 16);
    header.fillStyle(hexNum(C.hudNeon), 1);
    header.fillRect(5, 5, 4, 4);
    header.fillRect(W - 9, 5, 4, 4);
    header.fillStyle(hexNum(C.ivyHi), 0.95);
    header.fillRect(13, 13, 3, 3);
    header.fillRect(W - 16, 13, 3, 3);

    // Title
    this.add
      .text(W / 2, 12, 'ADVENTURE LOG', {
        fontFamily: 'MedievalSharp, Georgia, serif',
        fontSize: '15px',
        color: C.hudBorder,
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 0)
      .setResolution(dpi)
      .setShadow(0, 1, '#000000', 2, false, true)
      .setDepth(10);

    // DM box (on top of header plate) — neon-edged arcade readout
    const boxY = DM_BOX_Y;
    const boxH = DM_BOX_H;
    const boxInnerW = W - PAD * 2 - 16;
    const dm = this.add.graphics().setDepth(10);
    dm.fillStyle(0x05060a, 0.9);
    dm.fillRoundedRect(PAD, boxY, W - PAD * 2, boxH, 5);
    dm.lineStyle(1.5, hexNum(C.hudBorderDk), 0.95);
    dm.strokeRoundedRect(PAD, boxY, W - PAD * 2, boxH, 5);
    dm.lineStyle(1, 0xc8b0ff, 0.35);
    dm.strokeRoundedRect(PAD + 1, boxY + 1, W - PAD * 2 - 2, boxH - 2, 4);

    this.add
      .text(PAD + 8, boxY + 6, 'DUNGEON MASTER', {
        fontFamily: 'MedievalSharp, Georgia, serif',
        fontSize: '10px',
        color: '#c8b0ff',
        fontStyle: 'bold',
      })
      .setResolution(dpi)
      .setDepth(11);

    this.statusDot = this.add.graphics().setDepth(12);
    this.grokLabel = this.add
      .text(PAD + 20, boxY + 22, 'Grok • offline', {
        fontFamily: 'Georgia, "Trebuchet MS", serif',
        fontSize: '10px',
        color: '#b0b8d0',
        wordWrap: { width: boxInnerW - 12 },
      })
      .setResolution(dpi)
      .setDepth(11);
    this.scrollHint = this.add
      .text(PAD + 8, boxY + 38, 'Narrating your descent…', {
        fontFamily: 'Georgia, "Trebuchet MS", serif',
        fontSize: '9px',
        color: '#8a93b0',
        fontStyle: 'italic',
        wordWrap: { width: boxInnerW },
        lineSpacing: 1,
      })
      .setResolution(dpi)
      .setDepth(11);

    // Divider at log top
    const div = this.add.graphics().setDepth(10);
    div.lineStyle(1, hexNum(C.hudBorderDk), 0.85);
    div.lineBetween(PAD, LOG_TOP - 2, W - PAD, LOG_TOP - 2);

    this.moreAbove = this.add
      .text(W - PAD - 2, LOG_TOP + 2, '▲', { fontFamily: '"Trebuchet MS", sans-serif', fontSize: '9px', color: '#8a93bd' })
      .setOrigin(1, 0)
      .setDepth(12)
      .setVisible(false);
    this.moreBelow = this.add
      .text(W - PAD - 2, LOG_BOTTOM - 10, '▼', { fontFamily: '"Trebuchet MS", sans-serif', fontSize: '9px', color: '#8a93bd' })
      .setOrigin(1, 0)
      .setDepth(12)
      .setVisible(false);

    this.drawStatusDot('offline');
  }

  private drawStatusDot(status: string): void {
    const color = status === 'connected' ? hexNum(C.hpFull) : status === 'thinking' ? hexNum(C.hpMid) : hexNum(C.hpLow);
    const x = PAD + 10;
    const y = 64;
    this.statusDot.clear();
    this.statusDot.fillStyle(color, 0.25);
    this.statusDot.fillCircle(x, y, 6);
    this.statusDot.fillStyle(color, 1);
    this.statusDot.fillCircle(x, y, 3.5);
  }

  update(_time: number, delta: number): void {
    const data = this.registry.get(LOG_REGISTRY_KEY) as LogRegistryData | undefined;
    if (!data) return;

    if (data.grokStatus !== this.lastStatus) {
      this.lastStatus = data.grokStatus;
      this.drawStatusDot(data.grokStatus);
      const label = data.grokStatus === 'connected' ? 'connected' : data.grokStatus === 'thinking' ? 'thinking…' : 'offline';
      this.grokLabel.setText(`${data.grokProvider || 'Grok'} • ${label}`).setColor(
        data.grokStatus === 'connected' ? '#7cf08a' : data.grokStatus === 'thinking' ? '#e0c020' : '#8a93bd'
      );
    }
    if (data.grokStatus === 'thinking') {
      this.dotPulse += delta;
      const a = 0.5 + 0.5 * Math.sin(this.dotPulse / 180);
      this.statusDot.setAlpha(0.5 + 0.5 * a);
    } else {
      this.statusDot.setAlpha(1);
    }

    const sig = data.entries.map((e) => `${e.kind}|${e.source ?? ''}|${e.depth ?? ''}|${e.text}`).join('|');
    if (sig !== this.lastSig) {
      this.lastSig = sig;
      this.entries = data.entries;
      if (this.stick) this.scrollY = 0;
      this.layoutLog(this.entries);
    }
    const scrollable = this.maxScrollY > 0;
    this.scrollHint
      .setText(scrollable ? 'Scroll for history · ✻ live · · local' : '✻ live DM · · offline fallback')
      .setVisible(true);
  }

  /** Newest-at-bottom layout; only fully-in-window lines are shown (no half-bleed). */
  private layoutLog(entries: LogEntry[]): void {
    for (const t of this.lines) t.setVisible(false);
    const wrapW = W - PAD * 2 - 10;

    const heights: number[] = [];
    let total = 0;
    for (let i = entries.length - 1, li = 0; i >= 0; i--, li++) {
      const e = entries[i];
      const t = this.acquireLine(li);
      t.setStyle({ wordWrap: { width: wrapW, useAdvancedWrap: true }, fixedWidth: wrapW });
      t.setText(entryPrefix(e) + e.text)
        .setColor(entryColor(e))
        .setFontStyle(entryStyle(e));
      heights[li] = Math.max(t.height, 12);
      total += heights[li] + LINE_GAP;
    }
    this.maxScrollY = Math.max(0, total - LOG_HEIGHT);
    this.scrollY = Phaser.Math.Clamp(this.scrollY, 0, this.maxScrollY);

    // Stack from bottom of the window; hide any line that would cross LOG_TOP/BOTTOM.
    let yBottom = LOG_BOTTOM + this.scrollY;
    for (let i = entries.length - 1, li = 0; i >= 0; i--, li++) {
      const t = this.lines[li];
      const h = heights[li];
      const top = yBottom - h;
      if (top >= LOG_TOP && top + h <= LOG_BOTTOM) {
        const fade = Phaser.Math.Clamp((top - LOG_TOP) / 36, 0.5, 1);
        t.setPosition(PAD + 2, top).setVisible(true).setAlpha(fade);
      } else {
        // Partially off the window: hide completely (mask + header plate are backup).
        t.setVisible(false);
      }
      yBottom = top - LINE_GAP;
    }

    this.moreAbove.setVisible(this.scrollY < this.maxScrollY - 1);
    this.moreBelow.setVisible(this.scrollY > 1);
  }

  private acquireLine(i: number): Phaser.GameObjects.Text {
    if (this.lines[i]) return this.lines[i];
    const wrapW = W - PAD * 2 - 10;
    const dpi = typeof window !== 'undefined' ? Math.min(2, Math.max(1, window.devicePixelRatio || 1)) : 2;
    const t = this.add
      .text(PAD + 2, 0, '', {
        fontFamily: 'Georgia, "Palatino Linotype", "Trebuchet MS", serif',
        fontSize: '11px',
        color: '#efe4c4',
        lineSpacing: 3,
        wordWrap: { width: wrapW, useAdvancedWrap: true },
        fixedWidth: wrapW,
      })
      .setOrigin(0, 0)
      .setResolution(dpi);
    // Parent under the masked log root (depth 5); header plate at 8 covers overflow.
    this.logRoot.add(t);
    this.lines[i] = t;
    return t;
  }
}
