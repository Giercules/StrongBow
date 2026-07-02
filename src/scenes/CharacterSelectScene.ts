import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, CLASS_HUD_COLORS } from '../core/constants';
import { C } from '../rendering/Palette';
import { HEROES, ALL_CLASSES } from '../data/heroes';
import { audio } from '../systems/AudioSystem';
import { MenuPad } from '../ui/MenuPad';
import type { HeroClassId } from '../core/types';

const numHex = (n: number): string => '#' + n.toString(16).padStart(6, '0');

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

    this.cameras.main.fadeIn(220, 0, 0, 0);
    const g = this.add.graphics();
    g.fillGradientStyle(0x10131f, 0x10131f, 0x05060a, 0x05060a, 1);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    this.prompt = this.add
      .text(GAME_WIDTH / 2, 44, '', { fontFamily: 'MedievalSharp, "Trebuchet MS", cursive', fontSize: '24px', color: C.ink, fontStyle: 'bold' })
      .setOrigin(0.5);

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
    const dg = this.add.graphics();
    dg.fillStyle(0x0d1322, 0.96);
    dg.fillRoundedRect(GAME_WIDTH / 2 - 360, 384, 720, 108, 8);
    dg.lineStyle(1.5, 0x6e521f, 1);
    dg.strokeRoundedRect(GAME_WIDTH / 2 - 360, 384, 720, 108, 8);
    this.detailName = this.add
      .text(GAME_WIDTH / 2, 396, '', { fontFamily: 'MedievalSharp, "Trebuchet MS", cursive', fontSize: '15px', color: '#ffe9a8', fontStyle: 'bold' })
      .setOrigin(0.5, 0);
    this.detailSig = this.add
      .text(GAME_WIDTH / 2, 418, '', { fontFamily: 'MedievalSharp, "Trebuchet MS", cursive', fontSize: '12px', color: C.ink, align: 'center', wordWrap: { width: 680 } })
      .setOrigin(0.5, 0);
    this.detailBlurb = this.add
      .text(GAME_WIDTH / 2, 458, '', { fontFamily: 'MedievalSharp, "Trebuchet MS", cursive', fontSize: '11px', color: C.inkDim, align: 'center', wordWrap: { width: 680 } })
      .setOrigin(0.5, 0);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 24, '◀ ▶ / A D to move   ·   ENTER or click to choose   ·   1–7 quick pick', {
        fontFamily: 'MedievalSharp, "Trebuchet MS", cursive',
        fontSize: '12px',
        color: C.inkDim,
      })
      .setOrigin(0.5);

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
    const cont = this.add.container(x, y);

    const bg = this.add.graphics();
    bg.fillStyle(0x0d1322, 1);
    bg.fillRoundedRect(0, 0, w, h, 8);
    bg.lineStyle(2, color, 0.9);
    bg.strokeRoundedRect(0, 0, w, h, 8);
    bg.fillStyle(color, 0.16);
    bg.fillRoundedRect(0, 0, w, 56, 8);
    cont.add(bg);

    // the name shrinks to fit the card so seven-across never overflows
    const nameSize = Math.max(11, Math.min(18, Math.floor((w - 16) / (def.name.length * 0.62))));
    cont.add(this.add.text(w / 2, 12, def.name, { fontFamily: 'MedievalSharp, "Trebuchet MS", cursive', fontSize: `${nameSize}px`, color: numHex(color), fontStyle: 'bold' }).setOrigin(0.5, 0));
    cont.add(this.add.text(w / 2, 36, def.role.toUpperCase(), { fontFamily: 'MedievalSharp, "Trebuchet MS", cursive', fontSize: '10px', color: C.inkDim }).setOrigin(0.5, 0));

    const spr = this.add.sprite(w / 2, 118, `hero-${cls}-sheet`).setScale(1.9);
    spr.play(`${cls}-idle-down`);
    cont.add(this.add.image(w / 2, 144, 'fx-shadow').setScale(1.8).setAlpha(0.5));
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
      bar.fillStyle(0x000000, 0.5);
      bar.fillRect(40, sy - 5, w - 50, 9);
      bar.fillStyle(color, 1);
      bar.fillRect(40, sy - 5, (w - 50) * Phaser.Math.Clamp(st[1] / st[2], 0, 1), 9);
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
    this.highlight.clear();
    this.highlight.lineStyle(4, parseInt(C.hudBorder.slice(1), 16), 1);
    this.highlight.strokeRoundedRect(card.x - 3, card.y - 3, this.cardW + 6, this.cardH + 6, 10);
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
