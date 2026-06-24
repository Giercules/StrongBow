import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, CLASS_HUD_COLORS } from '../core/constants';
import { C } from '../rendering/Palette';
import { HEROES, ALL_CLASSES } from '../data/heroes';
import { audio } from '../systems/AudioSystem';
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

  constructor() {
    super('CharacterSelectScene');
  }

  create(): void {
    this.twoPlayer = this.registry.get('twoPlayer') ?? false;
    this.picking = 1;
    this.cursor = 0;
    this.p1 = undefined;
    this.cards = [];

    this.cameras.main.fadeIn(220, 0, 0, 0);
    const g = this.add.graphics();
    g.fillGradientStyle(0x10131f, 0x10131f, 0x05060a, 0x05060a, 1);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    this.prompt = this.add
      .text(GAME_WIDTH / 2, 44, '', { fontFamily: 'MedievalSharp, "Trebuchet MS", cursive', fontSize: '24px', color: C.ink, fontStyle: 'bold' })
      .setOrigin(0.5);

    this.highlight = this.add.graphics().setDepth(20);

    const gap = 18;
    const cardW = Math.min(200, Math.floor((GAME_WIDTH - 40 - (ALL_CLASSES.length - 1) * gap) / ALL_CLASSES.length));
    const totalW = ALL_CLASSES.length * cardW + (ALL_CLASSES.length - 1) * gap;
    const startX = (GAME_WIDTH - totalW) / 2;

    ALL_CLASSES.forEach((cls, i) => {
      const x = startX + i * (cardW + gap);
      this.cards.push(this.buildCard(cls, x, 90, cardW, 360, i));
    });

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 24, '◀ ▶ / A D to move   ·   ENTER or click to choose   ·   1–4 quick pick', {
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
    const numKeys = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE'];
    for (let n = 1; n <= Math.min(ALL_CLASSES.length, numKeys.length); n++) kb.on(`keydown-${numKeys[n - 1]}`, () => this.choose(n - 1));
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
    bg.fillRoundedRect(0, 0, w, 64, 8);
    cont.add(bg);

    cont.add(this.add.text(w / 2, 14, def.name, { fontFamily: 'MedievalSharp, "Trebuchet MS", cursive', fontSize: '20px', color: numHex(color), fontStyle: 'bold' }).setOrigin(0.5, 0));
    cont.add(this.add.text(w / 2, 40, def.role.toUpperCase(), { fontFamily: 'MedievalSharp, "Trebuchet MS", cursive', fontSize: '12px', color: C.inkDim }).setOrigin(0.5, 0));

    const spr = this.add.sprite(w / 2, 130, `hero-${cls}-sheet`).setScale(2.1);
    spr.play(`${cls}-idle-down`);
    cont.add(this.add.image(w / 2, 158, 'fx-shadow').setScale(2).setAlpha(0.5));
    cont.add(spr);
    this.tweens.add({ targets: spr, y: 124, duration: 1100 + idx * 90, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // stats
    const stats: [string, number, number][] = [
      ['HP', def.base.maxHealth, 120],
      ['MP', def.base.maxMana, 100],
      ['DMG', def.base.damage, 16],
      ['SPD', def.base.speed, 170],
    ];
    stats.forEach((st, i) => {
      const sy = 196 + i * 22;
      cont.add(this.add.text(14, sy, st[0], { fontFamily: 'MedievalSharp, "Trebuchet MS", cursive', fontSize: '11px', color: C.inkDim }).setOrigin(0, 0.5));
      const bar = this.add.graphics();
      bar.fillStyle(0x000000, 0.5);
      bar.fillRect(46, sy - 5, w - 60, 9);
      bar.fillStyle(color, 1);
      bar.fillRect(46, sy - 5, (w - 60) * Phaser.Math.Clamp(st[1] / st[2], 0, 1), 9);
      cont.add(bar);
    });

    cont.add(
      this.add
        .text(w / 2, 292, def.signature, { fontFamily: 'MedievalSharp, "Trebuchet MS", cursive', fontSize: '10.5px', color: C.ink, align: 'center', wordWrap: { width: w - 24 } })
        .setOrigin(0.5, 0)
    );
    cont.add(
      this.add
        .text(w / 2, 326, def.blurb, { fontFamily: 'MedievalSharp, "Trebuchet MS", cursive', fontSize: '10px', color: C.inkDim, align: 'center', wordWrap: { width: w - 24 } })
        .setOrigin(0.5, 0)
    );

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
    this.highlight.strokeRoundedRect(card.x - 3, card.y - 3, 206, 366, 10);
  }

  private updatePrompt(): void {
    if (this.picking === 1) {
      this.prompt.setText('PLAYER 1 — CHOOSE YOUR HERO').setColor(numHex(CLASS_HUD_COLORS.vanguard));
    } else {
      this.prompt.setText('PLAYER 2 — CHOOSE YOUR HERO').setColor(numHex(CLASS_HUD_COLORS.strider));
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
