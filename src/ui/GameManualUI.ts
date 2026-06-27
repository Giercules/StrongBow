import Phaser from 'phaser';
import { PLAY_AREA_UI_DEPTH } from '../core/constants';
import { MANUAL_PAGES } from '../data/manualContent';
import type { ManualEntry, ManualPage } from '../data/manualContent';
import { audio } from '../systems/AudioSystem';

// Legend-of-Zelda-NES-style manual: parchment pages, ornate border, serif text,
// illustrated bestiary + armory galleries.
const hx = (s: string): number => parseInt(s.replace('#', ''), 16);
const SERIF = 'MedievalSharp, Georgia, serif';
const PANEL_W = 520;
const PANEL_H = 488;
const PAGE = '#e9dcc0';
const PAGE2 = '#f2e9d0';
const INSET = '#d8c79e';
const GOLD = '#b8923a';
const GOLD_DK = '#6e521f';
const INK = '#3a2a16';
const HEAD = '#9a2a2a';
const STAT = '#2e6b34';

export class GameManualUI {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container | null = null;
  private backdrop: Phaser.GameObjects.Rectangle | null = null;
  private page = 0;
  private keyHandler?: (e: KeyboardEvent) => void;
  private onClosed?: () => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  isOpen(): boolean {
    return this.container !== null;
  }

  toggle(): void {
    if (this.container) this.close();
    else this.open();
  }

  open(onClosed?: () => void): void {
    if (this.container) return;
    this.onClosed = onClosed;
    this.page = 0;
    const cam = this.scene.cameras.main;
    this.backdrop = this.scene.add
      .rectangle(cam.width / 2, cam.height / 2, cam.width, cam.height, 0x05060a, 0.72)
      .setScrollFactor(0)
      .setDepth(PLAY_AREA_UI_DEPTH + 4)
      .setInteractive();
    this.backdrop.on('pointerdown', () => this.close());
    this.container = this.scene.add.container(0, 0).setDepth(PLAY_AREA_UI_DEPTH + 5).setScrollFactor(0);
    this.keyHandler = (e) => {
      if (e.key === 'ArrowRight') this.go(1);
      else if (e.key === 'ArrowLeft') this.go(-1);
    };
    this.scene.input.keyboard?.on('keydown', this.keyHandler);
    this.render();
  }

  close(): void {
    if (this.keyHandler) this.scene.input.keyboard?.off('keydown', this.keyHandler);
    this.keyHandler = undefined;
    this.backdrop?.destroy();
    this.backdrop = null;
    this.container?.destroy();
    this.container = null;
    this.onClosed?.();
    this.onClosed = undefined;
  }

  private go(d: number): void {
    this.page = Phaser.Math.Wrap(this.page + d, 0, MANUAL_PAGES.length);
    audio.sfx('ui_move');
    this.render();
  }

  private pin<T extends Phaser.GameObjects.GameObject>(o: T): T {
    (o as unknown as { setScrollFactor?: (n: number) => void }).setScrollFactor?.(0);
    this.container!.add(o);
    return o;
  }

  private label(x: number, y: number, str: string, color: string, size: number, opts: Partial<Phaser.Types.GameObjects.Text.TextStyle> = {}): Phaser.GameObjects.Text {
    return this.pin(
      this.scene.add.text(x, y, str, { fontFamily: SERIF, fontSize: `${size}px`, color, ...opts })
    );
  }

  private render(): void {
    if (!this.container) return;
    this.container.removeAll(true);
    const cam = this.scene.cameras.main;
    const cx = cam.width / 2;
    const cy = cam.height / 2;
    const x0 = cx - PANEL_W / 2;
    const y0 = cy - PANEL_H / 2;

    // ornate frame + parchment page
    const g = this.scene.add.graphics();
    g.fillStyle(hx('#241a0c'), 1);
    g.fillRoundedRect(x0 - 4, y0 - 4, PANEL_W + 8, PANEL_H + 8, 12);
    g.fillStyle(hx(GOLD), 1);
    g.fillRoundedRect(x0, y0, PANEL_W, PANEL_H, 10);
    g.fillStyle(hx(GOLD_DK), 1);
    g.fillRoundedRect(x0 + 4, y0 + 4, PANEL_W - 8, PANEL_H - 8, 8);
    g.fillStyle(hx(PAGE), 1);
    g.fillRoundedRect(x0 + 8, y0 + 8, PANEL_W - 16, PANEL_H - 16, 6);
    g.fillStyle(hx(PAGE2), 1);
    g.fillRoundedRect(x0 + 14, y0 + 40, PANEL_W - 28, PANEL_H - 96, 4);
    // header rule
    g.lineStyle(2, hx(GOLD_DK), 1);
    g.lineBetween(x0 + 20, y0 + 36, x0 + PANEL_W - 20, y0 + 36);
    g.lineBetween(x0 + 20, y0 + PANEL_H - 58, x0 + PANEL_W - 20, y0 + PANEL_H - 58);
    // corner diamonds
    g.fillStyle(hx(HEAD), 1);
    for (const [dx, dy] of [[18, 22], [PANEL_W - 18, 22]] as [number, number][]) {
      g.fillRect(x0 + dx - 3, y0 + dy - 3, 6, 6);
    }
    this.pin(g);

    const pg = MANUAL_PAGES[this.page];
    this.label(cx, y0 + 14, pg.title.toUpperCase(), HEAD, 18, { fontStyle: 'bold' }).setOrigin(0.5, 0);

    if (pg.portrait) this.renderHero(pg, x0, y0);
    else if (pg.kind === 'gallery' && pg.entries) this.renderGallery(pg.entries, x0, y0);
    else this.renderText(pg.body ?? [], x0, y0);

    // footer
    this.label(cx, y0 + PANEL_H - 52, `Page ${this.page + 1} of ${MANUAL_PAGES.length}   -   left / right turn pages`, GOLD_DK, 10).setOrigin(0.5, 0);
    this.button(x0 + 78, y0 + PANEL_H - 22, 120, 'PREV', () => this.go(-1));
    this.button(cx, y0 + PANEL_H - 22, 120, 'CLOSE', () => this.close());
    this.button(x0 + PANEL_W - 78, y0 + PANEL_H - 22, 120, 'NEXT', () => this.go(1));
  }

  private renderText(body: string[], x0: number, y0: number): void {
    const t = this.label(x0 + 28, y0 + 52, body.join('\n\n'), INK, 13.5, {
      lineSpacing: 6,
      wordWrap: { width: PANEL_W - 56 },
    });
    // Shrink long pages (e.g. Hearthwatch, How to Play cont.) so the body text
    // never spills past the bottom rule of the parchment.
    const avail = PANEL_H - 116; // from the top of the text down to the footer rule
    let size = 13.5;
    while (t.height > avail && size > 9) {
      size -= 0.5;
      t.setFontSize(size);
    }
  }

  // A character dossier: large framed portrait on the left, lore text on the right.
  private renderHero(pg: ManualPage, x0: number, y0: number): void {
    const p = pg.portrait!;
    const BOXW = 140;
    const boxX = x0 + 22;
    const boxY = y0 + 50;
    const boxH = PANEL_H - 116; // sits between the header rule and the footer rule

    // framed illustration inset
    const g = this.scene.add.graphics();
    g.fillStyle(hx(INSET), 1);
    g.fillRoundedRect(boxX, boxY, BOXW, boxH, 6);
    g.lineStyle(2, hx(GOLD_DK), 1);
    g.strokeRoundedRect(boxX, boxY, BOXW, boxH, 6);
    this.pin(g);

    // portrait sprite (static idle frame) + soft shadow
    const px = boxX + BOXW / 2;
    const py = boxY + boxH * 0.4;
    const scale = p.scale ?? 5;
    this.pin(this.scene.add.image(px, py + 56, 'fx-shadow').setScale(2.6).setAlpha(0.5));
    this.pin(this.scene.add.image(px, py, p.sheet, p.frame ?? 0).setScale(scale));
    if (p.caption) {
      this.label(px, boxY + boxH - 34, p.caption, HEAD, 13, { fontStyle: 'bold', align: 'center' }).setOrigin(0.5, 0);
    }

    // dossier text column to the right of the picture
    const tx = boxX + BOXW + 16;
    this.label(tx, y0 + 52, (pg.body ?? []).join('\n\n'), INK, 12.5, {
      lineSpacing: 5,
      wordWrap: { width: x0 + PANEL_W - 24 - tx },
    });
  }

  private renderGallery(entries: ManualEntry[], x0: number, y0: number): void {
    const listTop = y0 + 50;
    const rowH = (PANEL_H - 110) / Math.max(1, entries.length);
    entries.forEach((e, i) => {
      const ey = listTop + i * rowH;
      // inset frame for the picture
      const box = this.scene.add.graphics();
      box.fillStyle(hx(INSET), 1);
      box.fillRoundedRect(x0 + 24, ey + 2, 54, rowH - 8, 4);
      box.lineStyle(1.5, hx(GOLD_DK), 1);
      box.strokeRoundedRect(x0 + 24, ey + 2, 54, rowH - 8, 4);
      this.pin(box);
      const img = this.scene.add.image(x0 + 24 + 27, ey + 2 + (rowH - 8) / 2, e.icon, e.frame ?? 0).setScale(e.scale ?? 2);
      this.pin(img);

      const tx = x0 + 92;
      this.label(tx, ey + 6, e.title, INK, 14.5, { fontStyle: 'bold' });
      if (e.tag) this.label(tx, ey + 25, e.tag, STAT, 11.5, { fontStyle: 'bold' });
      this.label(tx, ey + 40, e.lines.join(' '), INK, 11, { wordWrap: { width: PANEL_W - 130 }, lineSpacing: 2 });
    });
  }

  private button(x: number, y: number, w: number, label: string, fn: () => void): void {
    const cont = this.scene.add.container(x, y);
    const g = this.scene.add.graphics();
    g.fillStyle(hx(PAGE), 1);
    g.fillRoundedRect(-w / 2, -13, w, 26, 5);
    g.lineStyle(2, hx(GOLD_DK), 1);
    g.strokeRoundedRect(-w / 2, -13, w, 26, 5);
    cont.add(g);
    const txt = this.scene.add.text(0, 0, label, { fontFamily: SERIF, fontSize: '13px', color: INK, fontStyle: 'bold' }).setOrigin(0.5);
    cont.add(txt);
    const z = this.scene.add.zone(0, 0, w, 26).setInteractive({ useHandCursor: true });
    z.on('pointerdown', fn);
    cont.add(z);
    // Container children don't inherit scrollFactor(0); the interactive zone in
    // particular must be pinned, or its click hit-area drifts with the camera in
    // the scrolling DungeonScene (buttons render in place but can't be clicked).
    g.setScrollFactor(0);
    txt.setScrollFactor(0);
    z.setScrollFactor(0);
    this.pin(cont);
  }
}
