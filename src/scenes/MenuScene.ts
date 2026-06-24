import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../core/constants';
import { C } from '../rendering/Palette';
import { makeButton } from '../ui/uiHelpers';
import { audio } from '../systems/AudioSystem';
import { aiService } from '../ai/AIService';
import { GameManualUI } from '../ui/GameManualUI';
import { hasSave } from '../systems/SaveSystem';
import type { SaveData } from '../systems/SaveSystem';
import { SaveLoadUI } from '../ui/SaveLoadUI';
import { ALL_CLASSES } from '../data/heroes';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    const add = Phaser.BlendModes.ADD;

    // ---- deep dungeon backdrop ----
    const g = this.add.graphics().setDepth(0);
    g.fillGradientStyle(0x161029, 0x161029, 0x05060a, 0x05060a, 1);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    for (let i = 0; i < 70; i++) {
      const x = (i * 53) % GAME_WIDTH;
      const y = 410 + ((i * 31) % 120);
      this.add.image(x, y, 'floor-' + (i % 4)).setScale(2 + (y - 410) / 130).setAlpha(0.1).setDepth(1);
    }

    // ---- great arcane rift behind the title ----
    this.add.image(cx, 132, 'fx-glow-magic').setScale(13).setAlpha(0.3).setBlendMode(add).setDepth(2);
    const rift = this.add.sprite(cx, 132, 'portal-sheet').setScale(5).setAlpha(0.7).setDepth(2).setTint(0xb98cff);
    rift.play('portal');
    this.tweens.add({ targets: rift, angle: 360, duration: 16000, repeat: -1 });
    const riftGlow = this.add.image(cx, 132, 'fx-glow-magic').setScale(7).setAlpha(0.4).setBlendMode(add).setDepth(2);
    this.tweens.add({ targets: riftGlow, alpha: { from: 0.24, to: 0.5 }, scale: { from: 6.2, to: 7.8 }, duration: 2400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // ---- looming Undermaw silhouette ----
    const boss = this.add.sprite(cx, 352, 'monster-hollow_king-sheet').setScale(2.6).setAlpha(0.72).setTint(0x120c1e).setDepth(3);
    boss.play('hollow_king-walk');
    this.tweens.add({ targets: boss, y: 344, duration: 3200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.add.particles(cx, 322, 'fx-glow-white', {
      x: { min: -70, max: 70 }, y: { min: -10, max: 30 }, speedY: { min: -26, max: -10 },
      lifespan: 2600, scale: { start: 0.4, end: 0 }, alpha: { start: 0.5, end: 0 }, frequency: 360, tint: 0xff4a3a, blendMode: 'ADD',
    }).setDepth(3);

    // ---- ledge, pillars + great torches ----
    this.add.rectangle(cx, 472, GAME_WIDTH, 130, 0x0a0812, 0.5).setDepth(3);
    [150, GAME_WIDTH - 150].forEach((x) => this.add.image(x, 372, 'pillar').setScale(2.5).setAlpha(0.85).setDepth(4));
    [108, GAME_WIDTH - 108].forEach((x) => {
      const t = this.add.sprite(x, 150, 'torch-sheet').setScale(5).play('torch').setDepth(7).setTint(0xffb060);
      this.add.image(x, 150, 'fx-glow-warm').setScale(10).setAlpha(0.42).setBlendMode(add).setDepth(6);
      this.tweens.add({ targets: t, scaleY: { from: 5, to: 5.5 }, duration: 220, yoyo: true, repeat: -1 });
    });

    // ---- atmosphere: embers + arcane motes ----
    this.add.particles(0, GAME_HEIGHT, 'fx-glow-warm', {
      x: { min: 0, max: GAME_WIDTH }, y: { min: GAME_HEIGHT - 10, max: GAME_HEIGHT }, speedY: { min: -46, max: -16 }, speedX: { min: -10, max: 10 },
      lifespan: 4600, scale: { start: 0.55, end: 0 }, alpha: { start: 0.5, end: 0 }, frequency: 200, blendMode: 'ADD',
    }).setDepth(8);
    this.add.particles(0, 0, 'fx-glow-white', {
      x: { min: 0, max: GAME_WIDTH }, y: { min: 0, max: GAME_HEIGHT }, speedY: { min: -6, max: 6 }, speedX: { min: -10, max: 10 },
      lifespan: 6000, scale: { start: 0.3, end: 0 }, alpha: { start: 0.28, end: 0 }, frequency: 300, tint: 0xb98cff, blendMode: 'ADD',
    }).setDepth(8);

    // ---- heroes lined up on the ledge, each in a shaft of light ----
    const tints = [0x4fa3ff, 0x5fe06a, 0xc06bff, 0xffcf5a, 0x9b7be0];
    const heroN = ALL_CLASSES.length;
    const heroStep = 100;
    ALL_CLASSES.forEach((cls, i) => {
      const hx = Math.round(cx + (i - (heroN - 1) / 2) * heroStep);
      this.add.image(hx, 430, 'fx-light').setScale(2).setAlpha(0.18).setBlendMode(add).setDepth(5).setTint(tints[i]);
      const s = this.add.sprite(hx, 442, `hero-${cls}-sheet`).setScale(1.5).setDepth(6);
      s.play(`${cls}-idle-down`);
      this.add.image(hx, 466, 'fx-shadow').setScale(1.7).setAlpha(0.5).setDepth(5);
      this.tweens.add({ targets: s, y: 437, duration: 1200 + i * 120, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });

    // ---- cinematic vignette + rare lightning ----
    this.add.image(cx, GAME_HEIGHT / 2, 'fx-vignette').setDisplaySize(GAME_WIDTH, GAME_HEIGHT).setDepth(9).setAlpha(0.85);
    const flash = this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0xbfe0ff, 0).setDepth(9).setBlendMode(add);
    this.time.addEvent({
      delay: 6500, loop: true,
      callback: () => {
        if (Math.random() < 0.6) this.tweens.add({ targets: flash, alpha: 0.45, duration: 60, yoyo: true, repeat: 1 });
      },
    });

    // darkened plate behind the menu buttons for readability
    this.add.rectangle(cx, 298, 322, 198, 0x05060a, 0.5).setStrokeStyle(1, 0x6e521f, 0.6).setDepth(9.2);

    const frame = this.add.graphics().setDepth(9.3);
    frame.lineStyle(4, 0x2a1c0a, 1); frame.strokeRect(10, 10, GAME_WIDTH - 20, GAME_HEIGHT - 20);
    frame.lineStyle(2, 0xcfa64e, 0.9); frame.strokeRect(15, 15, GAME_WIDTH - 30, GAME_HEIGHT - 30);
    frame.lineStyle(1, 0x6e521f, 0.8); frame.strokeRect(19, 19, GAME_WIDTH - 38, GAME_HEIGHT - 38);
    const bracket = (px: number, py: number, dx: number, dy: number): void => {
      frame.fillStyle(0xcfa64e, 1);
      frame.fillRect(dx > 0 ? px : px - 30, py - 2, 30, 4);
      frame.fillRect(px - 2, dy > 0 ? py : py - 30, 4, 30);
      frame.fillStyle(0xffe27a, 1); frame.fillRect(px - 3, py - 3, 6, 6);
      frame.fillStyle(0x2e6b34, 1); frame.fillRect(dx > 0 ? px + 9 : px - 13, dy > 0 ? py + 9 : py - 13, 4, 4);
    };
    bracket(19, 19, 1, 1); bracket(GAME_WIDTH - 19, 19, -1, 1);
    bracket(19, GAME_HEIGHT - 19, 1, -1); bracket(GAME_WIDTH - 19, GAME_HEIGHT - 19, -1, -1);
    this.add.image(cx, 54, 'fx-glow-warm').setScale(5).setAlpha(0.4).setBlendMode(add).setDepth(9.4);
    const crest = this.add.graphics().setDepth(9.55);
    crest.fillStyle(0x140e06, 1); crest.fillCircle(cx, 54, 27);
    crest.lineStyle(3, 0xcfa64e, 1); crest.strokeCircle(cx, 54, 27);
    crest.lineStyle(1, 0x6e521f, 1); crest.strokeCircle(cx, 54, 22);
    crest.lineStyle(3, 0xf0d27a, 1);
    crest.beginPath(); crest.arc(cx - 3, 54, 15, -1.05, 1.05); crest.strokePath();
    crest.lineStyle(1, 0xe8e8f4, 1);
    crest.beginPath(); crest.moveTo(cx + 5, 41); crest.lineTo(cx + 5, 67); crest.strokePath();
    crest.fillStyle(0xffe27a, 1); crest.fillRect(cx - 15, 53, 26, 2);
    crest.fillTriangle(cx + 11, 50, cx + 11, 58, cx + 18, 54);
    crest.fillRect(cx - 16, 51, 2, 6);
    this.tweens.add({ targets: crest, alpha: { from: 0.85, to: 1 }, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const ribbon = this.add.graphics().setDepth(9.7);
    ribbon.fillStyle(0x140e06, 0.9); ribbon.fillRect(cx - 184, 162, 368, 18);
    ribbon.fillStyle(0x2a1c0a, 1);
    ribbon.fillTriangle(cx - 184, 162, cx - 184, 180, cx - 196, 171);
    ribbon.fillTriangle(cx + 184, 162, cx + 184, 180, cx + 196, 171);
    ribbon.lineStyle(1, 0xcfa64e, 0.85); ribbon.strokeRect(cx - 184, 162, 368, 18);
    // ---- epic layered title ----
    this.add.image(cx, 118, 'fx-glow-warm').setScale(9).setAlpha(0.3).setBlendMode(add).setDepth(9.5);
    const titleBack = this.add.text(cx + 3, 121, 'STRONGBOW', { fontFamily: 'Cinzel, Cinzel, Georgia, serif', fontSize: '82px', color: '#000000', fontStyle: 'bold' }).setOrigin(0.5).setAlpha(0.55).setDepth(9.6);
    const title = this.add.text(cx, 118, 'STRONGBOW', { fontFamily: 'Cinzel, Cinzel, Georgia, serif', fontSize: '82px', color: '#f0d27a', fontStyle: 'bold' }).setOrigin(0.5).setDepth(10);
    title.setStroke('#3a2a0c', 7);
    title.setShadow(0, 4, '#1a1206', 10, true, true);
    const titleHi = this.add.text(cx, 116, 'STRONGBOW', { fontFamily: 'Cinzel, Cinzel, Georgia, serif', fontSize: '82px', color: '#fff4cf', fontStyle: 'bold' }).setOrigin(0.5).setDepth(10.1).setAlpha(0.4);
    this.tweens.add({ targets: [title, titleBack, titleHi], scale: { from: 1, to: 1.03 }, duration: 1900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.add.text(cx, 170, 'DESCENT INTO THE UNDERMAW', { fontFamily: 'Cinzel, Georgia, serif', fontSize: '16px', color: '#cfa64e', fontStyle: 'italic' }).setOrigin(0.5).setDepth(10);
    const rg = this.add.graphics().setDepth(10);
    rg.lineStyle(1, 0x6e521f, 0.9);
    rg.lineBetween(cx - 180, 186, cx - 24, 186);
    rg.lineBetween(cx + 24, 186, cx + 180, 186);
    this.add.text(cx, 192, 'ten realms · one hunger · slay it ere it wakes', { fontFamily: 'Cinzel, Georgia, serif', fontSize: '11px', color: '#8a93bd' }).setOrigin(0.5).setDepth(10);

    makeButton(this, cx - 78, 232, 150, 44, '1  PLAYER', () => this.startGame(false), { fill: C.ivy, size: 15 }).setDepth(11);
    makeButton(this, cx + 78, 232, 150, 44, '2  PLAYERS', () => this.startGame(true), { size: 15 }).setDepth(11);
    makeButton(this, cx - 78, 280, 150, 32, 'LEVEL SELECT', () => this.goScene('LevelSelectScene'), { size: 12 }).setDepth(11);
    makeButton(this, cx + 78, 280, 150, 32, 'FORGE A LEVEL', () => this.goScene('ForgeScene'), { fill: C.hudPanel2, size: 12 }).setDepth(11);
    const manual = new GameManualUI(this);
    const saveUI = new SaveLoadUI(this);
    let by = 324;
    if (hasSave()) {
      makeButton(this, cx, by, 220, 30, 'LOAD GAME', () => {
        this.enableAudio();
        audio.sfx('ui_select');
        saveUI.open({ mode: 'load', onLoad: (s) => this.startFromSave(s) });
      }, { fill: C.hudBorderDk, size: 12 }).setDepth(11);
      by += 36;
    }
    makeButton(this, cx, by, 180, 28, 'MANUAL  (H)', () => manual.toggle(), { size: 12 }).setDepth(11);

    // AI connection status - large, glowing, below the characters
    const aiText = this.add
      .text(cx, 486, 'AI: checking...', { fontFamily: 'MedievalSharp, "Trebuchet MS", cursive', fontSize: '15px', color: C.inkDim, fontStyle: 'bold' })
      .setOrigin(0.5)
      .setDepth(12);
    void aiService.checkConnection().then(({ connected, provider }) => {
      if (connected) {
        aiText.setText(`${provider.toUpperCase()} CONNECTED`).setColor('#5fe06a');
        aiText.setShadow(0, 0, '#37d65a', 16, true, true);
        this.tweens.add({ targets: aiText, alpha: { from: 0.65, to: 1 }, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      } else {
        aiText.setText('AI: built-in narration').setColor('#b5894a');
      }
    });

    this.add
      .text(cx, GAME_HEIGHT - 34, 'Click or press 1 / 2 to begin   ·   H manual   ·   sound enables on first click', {
        fontFamily: 'MedievalSharp, "Trebuchet MS", cursive',
        fontSize: '11px',
        color: C.inkDim,
      })
      .setOrigin(0.5)
      .setDepth(10);

    this.input.keyboard?.on('keydown-ONE', () => this.startGame(false));
    this.input.keyboard?.on('keydown-TWO', () => this.startGame(true));
    this.input.keyboard?.on('keydown-H', () => manual.toggle());
    this.input.keyboard?.on('keydown-L', () => this.goScene('LevelSelectScene'));
    this.input.keyboard?.on('keydown-F', () => this.goScene('ForgeScene'));
    this.input.once('pointerdown', () => this.enableAudio());
    this.input.keyboard?.once('keydown', () => this.enableAudio());
  }

  private goScene(key: string): void {
    this.enableAudio();
    audio.sfx('ui_select');
    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(key));
  }

  private startFromSave(save: SaveData): void {
    this.enableAudio();
    audio.sfx('ui_select');
    this.registry.set('twoPlayer', save.twoPlayer);
    const ps = save.allies.filter((a) => a.isPlayer).sort((a, b) => a.playerNum - b.playerNum);
    this.registry.set('p1Class', ps[0]?.classId ?? 'vanguard');
    if (ps[1]) this.registry.set('p2Class', ps[1].classId);
    this.registry.set('levelId', save.levelId ?? 'sunken_crypt');
    this.registry.remove('carryParty');
    this.registry.set('loadSave', save);
    this.cameras.main.fadeOut(220, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('DungeonScene'));
  }

  private enableAudio(): void {
    audio.unlock();
    audio.playMusic('menu');
  }

  private startGame(twoPlayer: boolean): void {
    this.enableAudio();
    audio.sfx('ui_select');
    this.registry.set('twoPlayer', twoPlayer);
    // New game begins in the town hub; the campaign starts locked to realm I.
    this.registry.set('levelId', 'town');
    this.registry.set('unlockedRealms', 1);
    this.registry.remove('carryParty');
    this.registry.remove('fromTown');
    this.registry.remove('loadSave');
    this.cameras.main.fadeOut(220, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('CharacterSelectScene'));
  }
}
