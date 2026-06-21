import Phaser from 'phaser';
import { PLAY_AREA_UI_DEPTH } from '../core/constants';
import { C } from '../rendering/Palette';
import { addPinned, makeButton } from './uiHelpers';
import { listSlots, loadSlot, saveToSlot, deleteSlot, SAVE_SLOT_COUNT } from '../systems/SaveSystem';
import type { SaveData } from '../systems/SaveSystem';

const hx = (s: string): number => parseInt(s.replace('#', ''), 16);
const PANEL_W = 588;
const PANEL_H = 426;

export interface SaveLoadOptions {
  mode: 'full' | 'load'; // full = save+load (in game); load = load only (menu)
  getSaveData?: () => SaveData; // required for saving
  onLoad: (save: SaveData) => void;
  onClose?: () => void;
  /** If false, the window won't close itself on Esc (the host handles it). */
  handleEsc?: boolean;
}

// A windowed save/load browser: slot list on the left, selected slot's preview
// (screenshot + details) on the right, with save / overwrite / load / delete.
export class SaveLoadUI {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container | null = null;
  private opts: SaveLoadOptions | null = null;
  private sel = 0;
  private confirmDelete = false;
  private thumbKey?: string;
  private keyHandler?: (e: KeyboardEvent) => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  isOpen(): boolean {
    return this.container !== null;
  }

  open(opts: SaveLoadOptions): void {
    if (this.container) this.close();
    this.opts = opts;
    this.sel = 0;
    this.confirmDelete = false;
    this.container = this.scene.add.container(0, 0).setDepth(PLAY_AREA_UI_DEPTH + 6).setScrollFactor(0);
    this.keyHandler = (e) => this.onKey(e);
    this.scene.input.keyboard?.on('keydown', this.keyHandler);
    this.render();
  }

  close(): void {
    if (this.keyHandler) this.scene.input.keyboard?.off('keydown', this.keyHandler);
    this.keyHandler = undefined;
    this.clearThumb();
    this.container?.destroy();
    this.container = null;
    const cb = this.opts?.onClose;
    this.opts = null;
    cb?.();
  }

  private clearThumb(): void {
    if (this.thumbKey && this.scene.textures.exists(this.thumbKey)) this.scene.textures.remove(this.thumbKey);
    this.thumbKey = undefined;
  }

  private onKey(e: KeyboardEvent): void {
    if (!this.container) return;
    if (e.key === 'Escape') {
      if (this.opts?.handleEsc !== false) this.close();
    } else if (e.key === 'ArrowUp') {
      this.sel = (this.sel + SAVE_SLOT_COUNT - 1) % SAVE_SLOT_COUNT;
      this.confirmDelete = false;
      this.render();
    } else if (e.key === 'ArrowDown') {
      this.sel = (this.sel + 1) % SAVE_SLOT_COUNT;
      this.confirmDelete = false;
      this.render();
    } else if (e.key === 'Enter') {
      const s = loadSlot(this.sel);
      if (s) this.opts?.onLoad(s);
      else this.doSave();
    }
  }

  private label(x: number, y: number, str: string, color: string, size = 12, bold = false): Phaser.GameObjects.Text {
    const t = this.scene.add
      .text(x, y, str, { fontFamily: 'Trebuchet MS, sans-serif', fontSize: `${size}px`, color, fontStyle: bold ? 'bold' : 'normal' })
      .setOrigin(0, 0);
    addPinned(this.container!, t);
    return t;
  }

  private fmtTime(ms: number): string {
    const s = Math.floor((ms || 0) / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  private fmtDate(ts: number): string {
    try {
      return new Date(ts).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }

  private partyLine(s: SaveData): string {
    const players = s.allies.filter((a) => a.isPlayer).sort((a, b) => a.playerNum - b.playerNum);
    const names = players.map((p) => `${p.classId[0].toUpperCase()}${p.classId.slice(1)} ${p.level}`);
    const allies = s.allies.length - players.length;
    return names.join(', ') + (allies > 0 ? `  +${allies} allies` : '');
  }

  private doSave(): void {
    if (!this.opts?.getSaveData) return;
    saveToSlot(this.sel, this.opts.getSaveData());
    this.confirmDelete = false;
    this.render();
  }

  private doDelete(): void {
    if (!this.confirmDelete) {
      this.confirmDelete = true;
      this.render();
      return;
    }
    deleteSlot(this.sel);
    this.confirmDelete = false;
    this.render();
  }

  private render(): void {
    if (!this.container) return;
    this.container.removeAll(true);
    this.clearThumb();
    const cam = this.scene.cameras.main;
    const cx = cam.width / 2;
    const cy = cam.height / 2;
    const x0 = cx - PANEL_W / 2;
    const y0 = cy - PANEL_H / 2;

    addPinned(this.container, this.scene.add.rectangle(cx, cy, cam.width, cam.height, 0x05060a, 0.66).setInteractive());

    const g = this.scene.add.graphics();
    g.fillStyle(hx(C.hudBg), 0.98);
    g.fillRoundedRect(x0, y0, PANEL_W, PANEL_H, 8);
    g.fillStyle(hx(C.hudPanel), 1);
    g.fillRoundedRect(x0 + 4, y0 + 4, PANEL_W - 8, PANEL_H - 8, 6);
    g.lineStyle(2, hx(C.hudBorder), 1);
    g.strokeRoundedRect(x0 + 4, y0 + 4, PANEL_W - 8, PANEL_H - 8, 6);
    addPinned(this.container, g);

    const mode = this.opts?.mode ?? 'load';
    this.label(cx, y0 + 12, mode === 'full' ? 'SAVE / LOAD' : 'LOAD GAME', C.hudBorder, 16, true).setOrigin(0.5, 0);

    const slots = listSlots();

    // ---- left: slot list ----
    const listX = x0 + 20;
    const rowW = 240;
    const rowH = 50;
    slots.forEach((s, i) => {
      const yy = y0 + 44 + i * rowH;
      const box = this.scene.add.graphics();
      box.fillStyle(i === this.sel ? 0x2a3358 : 0x000000, i === this.sel ? 0.9 : 0.35);
      box.fillRoundedRect(listX, yy, rowW, rowH - 6, 5);
      box.lineStyle(i === this.sel ? 2 : 1, i === this.sel ? hx(C.hudBorder) : hx(C.hudBorderDk), 0.9);
      box.strokeRoundedRect(listX, yy, rowW, rowH - 6, 5);
      addPinned(this.container!, box);
      this.label(listX + 10, yy + 5, `SLOT ${i + 1}`, C.coinHi, 11, true);
      if (s) {
        this.label(listX + 70, yy + 5, `${s.chapter ?? ''} ${s.levelName ?? s.levelId}`.trim(), C.ink, 10.5, true);
        this.label(listX + 70, yy + 22, `${this.fmtDate(s.savedAt)}  ·  ${this.fmtTime(s.elapsedMs)}`, C.inkDim, 9);
      } else {
        this.label(listX + 70, yy + 14, '— empty —', C.inkDim, 10);
      }
      const z = this.scene.add.zone(listX, yy, rowW, rowH - 6).setOrigin(0, 0).setInteractive({ useHandCursor: true });
      z.on('pointerdown', () => {
        this.sel = i;
        this.confirmDelete = false;
        this.render();
      });
      addPinned(this.container!, z);
    });

    // ---- right: selected slot detail ----
    const detX = x0 + 282;
    const sel = slots[this.sel];
    // thumbnail frame
    const tw = 256;
    const th = 144;
    const tx = detX;
    const ty = y0 + 46;
    const fr = this.scene.add.graphics();
    fr.fillStyle(0x000000, 0.5);
    fr.fillRoundedRect(tx, ty, tw, th, 4);
    fr.lineStyle(1, hx(C.hudBorderDk), 1);
    fr.strokeRoundedRect(tx, ty, tw, th, 4);
    addPinned(this.container, fr);

    if (sel?.thumbnail) {
      const key = `savethumb_${this.sel}_${Date.now()}`;
      this.thumbKey = key;
      try {
        this.scene.textures.addBase64(key, sel.thumbnail);
        this.scene.textures.once(`addtexture-${key}`, () => {
          if (!this.container || this.thumbKey !== key) {
            if (this.scene.textures.exists(key)) this.scene.textures.remove(key);
            return;
          }
          addPinned(this.container, this.scene.add.image(tx + 2, ty + 2, key).setOrigin(0, 0).setDisplaySize(tw - 4, th - 4));
        });
      } catch {
        /* ignore decode errors */
      }
    } else {
      this.label(tx + tw / 2, ty + th / 2 - 6, sel ? 'No preview' : '— Empty Slot —', C.inkDim, 12).setOrigin(0.5);
    }

    // details
    let dy = ty + th + 12;
    if (sel) {
      this.label(detX, dy, `${sel.chapter ?? ''} ${sel.levelName ?? sel.levelId}`.trim(), C.hudBorder, 13, true);
      dy += 20;
      this.label(detX, dy, this.partyLine(sel), C.ink, 10.5);
      dy += 16;
      this.label(detX, dy, `Playtime ${this.fmtTime(sel.elapsedMs)}   ·   Saved ${this.fmtDate(sel.savedAt)}`, C.inkDim, 10);
      dy += 15;
      this.label(detX, dy, `${sel.twoPlayer ? '2 players' : '1 player'}   ·   altars cleared ${sel.generatorsDestroyed}`, C.inkDim, 10);
    } else {
      this.label(detX, dy, 'No game saved in this slot.', C.inkDim, 11);
    }

    // ---- action buttons ----
    const by = y0 + PANEL_H - 30;
    if (mode === 'full') {
      this.container.add(
        makeButton(this.scene, detX + 44, by, 84, 26, sel ? 'OVERWRITE' : 'SAVE', () => this.doSave(), { fill: C.ivy, size: 12 })
      );
    }
    this.container.add(
      makeButton(this.scene, detX + 138, by, 70, 26, 'LOAD', () => {
        if (sel) this.opts?.onLoad(sel);
      }, { fill: sel ? C.hudPanel2 : C.hudBg, size: 12 })
    );
    this.container.add(
      makeButton(this.scene, detX + 218, by, 84, 26, this.confirmDelete ? 'CONFIRM?' : 'DELETE', () => {
        if (sel) this.doDelete();
      }, { fill: this.confirmDelete ? C.hpLow : C.hudBg, size: 12 })
    );

    // footer / close
    this.container.add(makeButton(this.scene, x0 + 60, by, 80, 26, 'CLOSE', () => this.close(), { fill: C.hudBorderDk, size: 12 }));
    this.label(x0 + 20, y0 + PANEL_H - 56, '↑↓ select  ·  Enter load/save  ·  Esc close', C.inkDim, 9);
  }
}
