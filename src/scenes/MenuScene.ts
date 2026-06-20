import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../core/constants';
import { C } from '../rendering/Palette';
import { makeButton } from '../ui/uiHelpers';
import { audio } from '../systems/AudioSystem';
import { aiService } from '../ai/AIService';
import { GameManualUI } from '../ui/GameManualUI';
import { hasSave, loadGame } from '../systems/SaveSystem';
import { ALL_CLASSES } from '../data/heroes';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create(): void {
    const cx = GAME_WIDTH / 2;

    const g = this.add.graphics();
    g.fillGradientStyle(0x10131f, 0x10131f, 0x05060a, 0x05060a, 1);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    for (let i = 0; i < 60; i++) {
      const x = (i * 53) % GAME_WIDTH;
      const y = 420 + ((i * 31) % 110);
      this.add.image(x, y, 'floor-' + (i % 4)).setScale(2).setAlpha(0.12);
    }

    this.add.particles(0, GAME_HEIGHT, 'fx-glow-warm', {
      x: { min: 0, max: GAME_WIDTH },
      y: { min: GAME_HEIGHT - 10, max: GAME_HEIGHT },
      speedY: { min: -40, max: -14 },
      speedX: { min: -8, max: 8 },
      lifespan: 4200,
      scale: { start: 0.5, end: 0 },
      alpha: { start: 0.5, end: 0 },
      frequency: 240,
      blendMode: 'ADD',
    });

    // decorative heroes, moved down so they clear the Manual button
    ALL_CLASSES.forEach((cls, i) => {
      const hx = cx - 150 + i * 100;
      const s = this.add.sprite(hx, 416, `hero-${cls}-sheet`).setScale(3.4).setDepth(5);
      s.play(`${cls}-idle-down`);
      this.add.image(hx, 448, 'fx-shadow').setScale(1.8).setAlpha(0.5).setDepth(4);
      this.tweens.add({ targets: s, y: 410, duration: 1200 + i * 120, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });

    [120, GAME_WIDTH - 120].forEach((x) => {
      this.add.sprite(x, 150, 'torch-sheet').setScale(4).play('torch').setDepth(6);
      this.add.image(x, 150, 'fx-glow-warm').setScale(8).setAlpha(0.4).setBlendMode(Phaser.BlendModes.ADD).setDepth(5);
    });

    const title = this.add
      .text(cx, 118, 'STRONGBOW', { fontFamily: 'Trebuchet MS, sans-serif', fontSize: '72px', color: C.hudBorder, fontStyle: 'bold' })
      .setOrigin(0.5)
      .setDepth(10);
    title.setShadow(0, 5, '#000', 12);
    this.tweens.add({ targets: title, scale: { from: 1, to: 1.03 }, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.add
      .text(cx, 172, 'DESCENT INTO THE SUNKEN CRYPT', { fontFamily: 'Trebuchet MS, sans-serif', fontSize: '15px', color: C.inkDim })
      .setOrigin(0.5)
      .setDepth(10);

    makeButton(this, cx - 120, 236, 210, 50, '1  PLAYER', () => this.startGame(false), { fill: C.ivy, size: 18 }).setDepth(11);
    makeButton(this, cx + 120, 236, 210, 50, '2  PLAYERS', () => this.startGame(true), { size: 18 }).setDepth(11);
    makeButton(this, cx - 120, 292, 210, 40, 'LEVEL  SELECT', () => this.goScene('LevelSelectScene'), { size: 15 }).setDepth(11);
    makeButton(this, cx + 120, 292, 210, 40, 'FORGE  A  LEVEL', () => this.goScene('ForgeScene'), { fill: C.hudPanel2, size: 15 }).setDepth(11);
    const manual = new GameManualUI(this);
    let by = 340;
    if (hasSave()) {
      makeButton(this, cx, by, 230, 34, 'CONTINUE  (load save)', () => this.continueGame(), { fill: C.hudBorderDk, size: 13 }).setDepth(11);
      by += 40;
    }
    makeButton(this, cx, by, 190, 32, 'MANUAL  (H)', () => manual.toggle(), { size: 13 }).setDepth(11);

    // AI connection status - large, glowing, below the characters
    const aiText = this.add
      .text(cx, 486, 'AI: checking...', { fontFamily: 'Trebuchet MS, sans-serif', fontSize: '18px', color: C.inkDim, fontStyle: 'bold' })
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
      .text(cx, GAME_HEIGHT - 22, 'Click or press 1 / 2 to begin   -   H manual   -   sound enables on first click', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '12px',
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

  private continueGame(): void {
    const save = loadGame();
    if (!save) return;
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
    this.registry.set('levelId', 'sunken_crypt');
    this.registry.remove('carryParty');
    this.registry.remove('loadSave');
    this.cameras.main.fadeOut(220, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('CharacterSelectScene'));
  }
}
