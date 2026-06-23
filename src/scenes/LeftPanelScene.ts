import Phaser from 'phaser';
import { LEFT_PANEL_WIDTH, GAME_HEIGHT, LOG_REGISTRY_KEY } from '../core/constants';
import { C } from '../rendering/Palette';
import type { LogRegistryData, LogEntry } from '../core/types';

const W = LEFT_PANEL_WIDTH;
const PAD = 10;

// Header band holds the title + the Grok "Dungeon Master" status box.
const LOG_TOP = 104;
const LOG_BOTTOM = GAME_HEIGHT - 12;
const LINE_GAP = 4;

function hexNum(s: string): number {
  return parseInt(s.replace('#', ''), 16);
}

// Colour each log line by what kind of moment it narrates.
const KIND_COLOR: Record<LogEntry['kind'], string> = {
  grok: '#b79bff', // the Dungeon Master's arcane voice
  event: '#e9d6a8', // parchment narration
  combat: '#ff9a6a', // strikes + danger
  loot: '#7fe0a0', // treasure
  system: '#8a93bd', // muted UI notes
};

const KIND_PREFIX: Record<LogEntry['kind'], string> = {
  grok: '✻ ', // ✻ sparkle for the DM
  event: '• ',
  combat: '⚔ ', // crossed swords
  loot: '◆ ', // diamond
  system: '· ',
};

// ----------------------------------------------------------------------------
// LeftPanelScene — the DnD adventure log + live Grok "Dungeon Master" feed.
// Reads LOG_REGISTRY_KEY each frame (same registry pattern as HudScene) and
// re-lays the most recent entries bottom-up so the newest line sits at the
// foot of the scroll like a running journal.
// ----------------------------------------------------------------------------
export class LeftPanelScene extends Phaser.Scene {
  private lines: Phaser.GameObjects.Text[] = [];
  private statusDot!: Phaser.GameObjects.Graphics;
  private grokLabel!: Phaser.GameObjects.Text;
  private lastSig = '';
  private lastStatus = '';
  private dotPulse = 0;

  constructor() {
    super('LeftPanelScene');
  }

  create(): void {
    this.cameras.main.setViewport(0, 0, W, GAME_HEIGHT);
    this.cameras.main.setScroll(0, 0);
    this.lines = [];
    this.lastSig = '';
    this.lastStatus = '';
    this.buildChrome();
  }

  private buildChrome(): void {
    const g = this.add.graphics().setDepth(0);
    // outer frame — mirrors the right HUD so both flanks read as one set
    g.fillStyle(hexNum(C.hudBg), 1);
    g.fillRect(0, 0, W, GAME_HEIGHT);
    g.fillStyle(hexNum(C.hudPanel), 1);
    g.fillRect(4, 4, W - 8, GAME_HEIGHT - 8);
    g.lineStyle(2, hexNum(C.hudBorder), 1);
    g.strokeRect(5, 5, W - 10, GAME_HEIGHT - 10);
    g.lineStyle(1, hexNum(C.hudBorderDk), 1);
    g.strokeRect(8, 8, W - 16, GAME_HEIGHT - 16);
    // ivy corner flourishes
    g.fillStyle(hexNum(C.ivy), 1);
    for (const [cx, cy, sx, sy] of [
      [6, 6, 1, 1],
      [W - 6, 6, -1, 1],
      [6, GAME_HEIGHT - 6, 1, -1],
      [W - 6, GAME_HEIGHT - 6, -1, -1],
    ] as [number, number, number, number][]) {
      g.fillRect(cx, cy, 12 * sx, 3 * sy);
      g.fillRect(cx, cy, 3 * sx, 12 * sy);
    }

    // title
    this.add
      .text(W / 2, 12, 'ADVENTURE LOG', { fontFamily: 'MedievalSharp, "Trebuchet MS", cursive', fontSize: '15px', color: C.hudBorder, fontStyle: 'bold' })
      .setOrigin(0.5, 0)
      .setShadow(0, 2, '#000', 4)
      .setDepth(8);

    // Grok / Dungeon Master status box
    const boxY = 34;
    const boxH = 58;
    g.fillStyle(0x05060a, 0.6);
    g.fillRoundedRect(PAD, boxY, W - PAD * 2, boxH, 5);
    g.lineStyle(1, hexNum(C.hudBorderDk), 0.8);
    g.strokeRoundedRect(PAD, boxY, W - PAD * 2, boxH, 5);
    this.add
      .text(PAD + 8, boxY + 6, 'DUNGEON MASTER', { fontFamily: 'MedievalSharp, "Trebuchet MS", cursive', fontSize: '10px', color: '#b79bff', fontStyle: 'bold' })
      .setDepth(8);
    this.statusDot = this.add.graphics().setDepth(9);
    this.grokLabel = this.add
      .text(PAD + 20, boxY + 24, 'Grok • offline', { fontFamily: '"Trebuchet MS", sans-serif', fontSize: '10px', color: C.inkDim })
      .setDepth(8);
    this.add
      .text(PAD + 8, boxY + 40, 'Narrating your descent…', { fontFamily: '"Trebuchet MS", sans-serif', fontSize: '8.5px', color: '#5f678f', fontStyle: 'italic' })
      .setDepth(8);

    // divider above the log scroll
    g.lineStyle(1, hexNum(C.hudBorderDk), 0.7);
    g.lineBetween(PAD, LOG_TOP - 6, W - PAD, LOG_TOP - 6);

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

    // status header — repaint only when it changes (plus a soft pulse while thinking)
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

    // log body — rebuild only when the entry set changes
    const sig = data.entries.map((e) => e.kind[0] + e.text).join('|');
    if (sig === this.lastSig) return;
    this.lastSig = sig;
    this.layoutLog(data.entries);
  }

  /** Lay the most recent entries from the bottom of the scroll upward. */
  private layoutLog(entries: LogEntry[]): void {
    for (const t of this.lines) t.setVisible(false);
    const wrapW = W - PAD * 2 - 4;
    let li = 0;
    let y = LOG_BOTTOM;
    // newest last in array → walk backwards so newest sits at the bottom
    for (let i = entries.length - 1; i >= 0; i--) {
      const e = entries[i];
      const t = this.acquireLine(li++);
      t.setWordWrapWidth(wrapW)
        .setText(KIND_PREFIX[e.kind] + e.text)
        .setColor(KIND_COLOR[e.kind])
        .setFontStyle(e.kind === 'grok' ? 'italic' : 'normal');
      y -= t.height + LINE_GAP;
      if (y < LOG_TOP) {
        t.setVisible(false);
        break;
      }
      // fade older lines toward the top of the scroll
      const fade = Phaser.Math.Clamp((y - LOG_TOP) / 60, 0.35, 1);
      t.setPosition(PAD + 2, y).setVisible(true).setAlpha(fade);
    }
  }

  private acquireLine(i: number): Phaser.GameObjects.Text {
    if (this.lines[i]) return this.lines[i];
    const t = this.add
      .text(PAD + 2, 0, '', {
        fontFamily: 'MedievalSharp, "Trebuchet MS", cursive',
        fontSize: '11px',
        color: '#e9d6a8',
        lineSpacing: 1,
      })
      .setOrigin(0, 0)
      .setDepth(7);
    this.lines[i] = t;
    return t;
  }
}
