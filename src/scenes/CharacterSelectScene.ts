import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, CLASS_HUD_COLORS } from '../core/constants';
import { C } from '../rendering/Palette';
import { HEROES, ALL_CLASSES } from '../data/heroes';
import { audio } from '../systems/AudioSystem';
import { MenuPad } from '../ui/MenuPad';
import type { HeroClassId } from '../core/types';

const numHex = (n: number): string => '#' + n.toString(16).padStart(6, '0');
const hexNum = (s: string): number => parseInt(s.replace('#', ''), 16);

export class CharacterSelectScene extends Phaser.Scene {
  private twoPlayer = false;
  private picking = 1;
  private cursor = 0;
  private p1?: HeroClassId;
  private cards: Phaser.GameObjects.Container[] = [];
  private highlight!: Phaser.GameObjects.Graphics;
  private prompt!: Phaser.GameObjects.Text;
  private cardW = 200;
  private cardH = 290;
  private pad?: MenuPad;
  private detailName!: Phaser.GameObjects.Text;
  private detailSig!: Phaser.GameObjects.Text;
  private detailBlurb!: Phaser.GameObjects.Text;

  constructor() {
    super('CharacterSelectScene');
  }

  create(): void {
    this.twoPlayer = this.registry.get('twoPlayer') ?? false;
    this.picking = 1;
    this.cursor = 0;
    this.p1 = undefined;
    this.cards = [];
    this.pad = new MenuPad(this);

    // Carry the title anthem seamlessly into character select. playMusic('menu')
    // is idempotent — if the menu slot is already sounding (the usual path in
    // from the title) it returns without restarting, so the song continues from
    // exactly where it was; if audio was stopped it (re)starts it here.
    audio.unlock();
    audio.playMusic('menu');

    this.cameras.main.fadeIn(220, 0, 0, 0);
    const g = this.add.graphics();
    g.fillGradientStyle(0x10131f, 0x10131f, 0x03050c, 0x03050c, 1);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    // Arcade cabinet outer frame
    const frame = this.add.graphics().setDepth(50);
    frame.lineStyle(4, 0x2a1c0a, 1);
    frame.strokeRect(8, 8, GAME_WIDTH - 16, GAME_HEIGHT - 16);
    frame.lineStyle(2, hexNum(C.hudBorder), 0.95);
    frame.strokeRect(13, 13, GAME_WIDTH - 26, GAME_HEIGHT - 26);
    frame.lineStyle(1, hexNum(C.hudBorderDk), 0.85);
    frame.strokeRect(17, 17, GAME_WIDTH - 34, GAME_HEIGHT - 34);
    frame.lineStyle(1, hexNum(C.hudNeon), 0.35);
    frame.strokeRect(15, 15, GAME_WIDTH - 30, GAME_HEIGHT - 30);
    for (const [px, py, sx, sy] of [
      [15, 15, 1, 1], [GAME_WIDTH - 15, 15, -1, 1],
      [15, GAME_HEIGHT - 15, 1, -1], [GAME_WIDTH - 15, GAME_HEIGHT - 15, -1, -1],
    ] as [number, number, number, number][]) {
      frame.fillStyle(hexNum(C.hudBorder), 1);
      frame.fillRect(px, py, 22 * sx, 3 * sy);
      frame.fillRect(px, py, 3 * sx, 22 * sy);
      frame.fillStyle(hexNum(C.hudNeon), 1);
      frame.fillRect(px + (sx > 0 ? 0 : -5), py + (sy > 0 ? 0 : -5), 5, 5);
    }
    this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'fx-vignette').setDisplaySize(GAME_WIDTH, GAME_HEIGHT).setDepth(1).setAlpha(0.55);
    this.add.particles(0, GAME_HEIGHT, 'fx-glow-warm', {
      x: { min: 0, max: GAME_WIDTH }, y: { min: GAME_HEIGHT - 6, max: GAME_HEIGHT },
      speedY: { min: -28, max: -10 }, lifespan: 3200, scale: { start: 0.4, end: 0 },
      alpha: { start: 0.35, end: 0 }, frequency: 280, blendMode: 'ADD',
    }).setDepth(2);

    this.prompt = this.add
      .text(GAME_WIDTH / 2, 44, '', { fontFamily: 'MedievalSharp, "Trebuchet MS", cursive', fontSize: '24px', color: C.ink, fontStyle: 'bold' })
      .setOrigin(0.5)
      .setDepth(10)
      .setShadow(0, 2, '#000000', 4, true, true);

    this.highlight = this.add.graphics().setDepth(20);

    const gap = 14;
    const cardW = Math.min(180, Math.floor((GAME_WIDTH - 40 - (ALL_CLASSES.length - 1) * gap) / ALL_CLASSES.length));
    this.cardW = cardW;
    this.cardH = 290;
    const totalW = ALL_CLASSES.length * cardW + (ALL_CLASSES.length - 1) * gap;
    const startX = (GAME_WIDTH - totalW) / 2;

    ALL_CLASSES.forEach((cls, i) => {
      const x = startX + i * (cardW + gap);
      this.cards.push(this.buildCard(cls, x, 78, cardW, this.cardH, i));
    });

    // one wide detail strip below the row shows the HIGHLIGHTED hero's story —
    // seven cards leave no room for per-card prose without overflowing.
    const dg = this.add.graphics().setDepth(8);
    dg.fillStyle(0x0a1020, 0.97);
    dg.fillRoundedRect(GAME_WIDTH / 2 - 360, 384, 720, 108, 8);
    dg.fillStyle(0xffffff, 0.04);
    dg.fillRoundedRect(GAME_WIDTH / 2 - 356, 388, 712, 28, 4);
    dg.lineStyle(2.5, hexNum(C.hudBorder), 1);
    dg.strokeRoundedRect(GAME_WIDTH / 2 - 360, 384, 720, 108, 8);
    dg.lineStyle(1, hexNum(C.hudBorderDk), 1);
    dg.strokeRoundedRect(GAME_WIDTH / 2 - 356, 388, 712, 100, 6);
    dg.lineStyle(1, hexNum(C.hudNeon), 0.4);
    dg.strokeRoundedRect(GAME_WIDTH / 2 - 358, 386, 716, 104, 7);
    this.detailName = this.add
      .text(GAME_WIDTH / 2, 396, '', { fontFamily: 'MedievalSharp, "Trebuchet MS", cursive', fontSize: '15px', color: '#ffe9a8', fontStyle: 'bold' })
      .setOrigin(0.5, 0)
      .setDepth(9);
    this.detailSig = this.add
      .text(GAME_WIDTH / 2, 418, '', { fontFamily: 'MedievalSharp, "Trebuchet MS", cursive', fontSize: '12px', color: C.ink, align: 'center', wordWrap: { width: 680 } })
      .setOrigin(0.5, 0)
      .setDepth(9);
    this.detailBlurb = this.add
      .text(GAME_WIDTH / 2, 458, '', { fontFamily: 'MedievalSharp, "Trebuchet MS", cursive', fontSize: '11px', color: C.inkDim, align: 'center', wordWrap: { width: 680 } })
      .setOrigin(0.5, 0)
      .setDepth(9);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 24, '◀ ▶ / A D to move   ·   ENTER or click to choose   ·   1–7 quick pick', {
        fontFamily: 'MedievalSharp, "Trebuchet MS", cursive',
        fontSize: '12px',
        color: C.inkDim,
      })
      .setOrigin(0.5)
      .setDepth(10);

    this.updatePrompt();
    this.updateHighlight();

    const kb = this.input.keyboard!;
    kb.on('keydown-LEFT', () => this.move(-1));
    kb.on('keydown-A', () => this.move(-1));
    kb.on('keydown-RIGHT', () => this.move(1));
    kb.on('keydown-D', () => this.move(1));
    kb.on('keydown-ENTER', () => this.choose(this.cursor));
    kb.on('keydown-SPACE', () => this.choose(this.cursor));
    const numKeys = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN'];
    for (let n = 1; n <= Math.min(ALL_CLASSES.length, numKeys.length); n++) kb.on(`keydown-${numKeys[n - 1]}`, () => this.choose(n - 1));
  }

  update(): void {
    if (!this.pad) return;
    this.pad.poll();
    if (this.pad.left() || this.pad.up()) this.move(-1);
    if (this.pad.right() || this.pad.down()) this.move(1);
    if (this.pad.confirm()) this.choose(this.cursor);
  }

  private buildCard(cls: HeroClassId, x: number, y: number, w: number, h: number, idx: number): Phaser.GameObjects.Container {
    const def = HEROES[cls];
    const color = CLASS_HUD_COLORS[cls];
    const cont = this.add.container(x, y).setDepth(5);

    const bg = this.add.graphics();
    bg.fillStyle(0x0a1020, 1);
    bg.fillRoundedRect(0, 0, w, h, 8);
    bg.fillStyle(0xffffff, 0.04);
    bg.fillRoundedRect(2, 2, w - 4, 40, 6);
    bg.lineStyle(2, color, 0.95);
    bg.strokeRoundedRect(0, 0, w, h, 8);
    bg.lineStyle(1, 0x8a6418, 0.7);
    bg.strokeRoundedRect(3, 3, w - 6, h - 6, 6);
    bg.fillStyle(color, 0.2);
    bg.fillRoundedRect(0, 0, w, 56, 8);
    // neon corner pips
    bg.fillStyle(0xffe9a0, 0.9);
    bg.fillRect(4, 4, 4, 4);
    bg.fillRect(w - 8, 4, 4, 4);
    bg.fillRect(4, h - 8, 4, 4);
    bg.fillRect(w - 8, h - 8, 4, 4);
    cont.add(bg);

    // the name shrinks to fit the card so seven-across never overflows
    const nameSize = Math.max(11, Math.min(18, Math.floor((w - 16) / (def.name.length * 0.62))));
    cont.add(this.add.text(w / 2, 12, def.name, { fontFamily: 'MedievalSharp, "Trebuchet MS", cursive', fontSize: `${nameSize}px`, color: numHex(color), fontStyle: 'bold' }).setOrigin(0.5, 0));
    cont.add(this.add.text(w / 2, 36, def.role.toUpperCase(), { fontFamily: 'MedievalSharp, "Trebuchet MS", cursive', fontSize: '10px', color: C.inkDim }).setOrigin(0.5, 0));

    cont.add(this.add.image(w / 2, 118, 'fx-light').setScale(1.1).setAlpha(0.22).setBlendMode(Phaser.BlendModes.ADD).setTint(color));
    const spr = this.add.sprite(w / 2, 118, `hero-${cls}-sheet`).setScale(1.9);
    spr.play(`${cls}-idle-down`);
    cont.add(this.add.image(w / 2, 144, 'fx-shadow').setScale(1.8).setAlpha(0.55));
    cont.add(spr);
    this.tweens.add({ targets: spr, y: 112, duration: 1100 + idx * 90, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // stats
    const stats: [string, number, number][] = [
      ['HP', def.base.maxHealth, 120],
      ['MP', def.base.maxMana, 100],
      ['DMG', def.base.damage, 16],
      ['SPD', def.base.speed, 170],
    ];
    stats.forEach((st, i) => {
      const sy = 186 + i * 22;
      cont.add(this.add.text(10, sy, st[0], { fontFamily: 'MedievalSharp, "Trebuchet MS", cursive', fontSize: '10px', color: C.inkDim }).setOrigin(0, 0.5));
      const bar = this.add.graphics();
      const bw = w - 50;
      const fillW = bw * Phaser.Math.Clamp(st[1] / st[2], 0, 1);
      bar.fillStyle(0x000000, 0.6);
      bar.fillRect(40, sy - 5, bw, 9);
      bar.fillStyle(color, 1);
      bar.fillRect(40, sy - 5, fillW, 9);
      bar.fillStyle(0xffffff, 0.28);
      bar.fillRect(40, sy - 5, fillW, 2);
      bar.lineStyle(1, 0x8a6418, 0.6);
      bar.strokeRect(40, sy - 5, bw, 9);
      cont.add(bar);
    });

    const zone = this.add.zone(0, 0, w, h).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => {
      this.cursor = idx;
      this.updateHighlight();
      audio.sfx('ui_move');
    });
    zone.on('pointerdown', () => this.choose(idx));
    cont.add(zone);

    return cont;
  }

  private move(d: number): void {
    this.cursor = Phaser.Math.Wrap(this.cursor + d, 0, ALL_CLASSES.length);
    audio.sfx('ui_move');
    this.updateHighlight();
  }

  private updateHighlight(): void {
    const card = this.cards[this.cursor];
    const gold = parseInt(C.hudBorder.slice(1), 16);
    const neon = parseInt(C.hudNeon.slice(1), 16);
    this.highlight.clear();
    this.highlight.lineStyle(4, gold, 1);
    this.highlight.strokeRoundedRect(card.x - 4, card.y - 4, this.cardW + 8, this.cardH + 8, 10);
    this.highlight.lineStyle(1.5, neon, 0.75);
    this.highlight.strokeRoundedRect(card.x - 1, card.y - 1, this.cardW + 2, this.cardH + 2, 8);
    this.highlight.fillStyle(neon, 1);
    this.highlight.fillRect(card.x - 2, card.y - 2, 5, 5);
    this.highlight.fillRect(card.x + this.cardW - 3, card.y - 2, 5, 5);
    this.highlight.fillRect(card.x - 2, card.y + this.cardH - 3, 5, 5);
    this.highlight.fillRect(card.x + this.cardW - 3, card.y + this.cardH - 3, 5, 5);
    // the detail strip tells the highlighted hero's story
    const def = HEROES[ALL_CLASSES[this.cursor]];
    if (this.detailName) {
      this.detailName.setText(`${def.name} — ${def.role}`).setColor(numHex(CLASS_HUD_COLORS[ALL_CLASSES[this.cursor]]));
      this.detailSig.setText(def.signature);
      this.detailBlurb.setText(def.blurb);
    }
  }

  private updatePrompt(): void {
    if (this.picking === 1) {
      this.prompt.setText('PLAYER 1 — CHOOSE YOUR HERO').setColor(numHex(CLASS_HUD_COLORS.vanguard));
    } else {
      this.prompt.setText('PLAYER 2 — CHOOSE YOUR HERO').setColor(numHex(CLASS_HUD_COLORS.thief));
    }
  }

  private choose(idx: number): void {
    this.cursor = idx;
    this.updateHighlight();
    const cls = ALL_CLASSES[idx];
    audio.sfx('ui_select');
    if (this.picking === 1) {
      this.p1 = cls;
      this.registry.set('p1Class', cls);
      if (this.twoPlayer) {
        this.picking = 2;
        this.updatePrompt();
        return;
      }
    } else {
      this.registry.set('p2Class', cls);
    }
    this.startDungeon();
  }

  private startDungeon(): void {
    this.cameras.main.fadeOut(240, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('DungeonScene'));
  }
}
