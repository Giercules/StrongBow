import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../core/constants';
import { C } from '../rendering/Palette';
import { makeButton } from '../ui/uiHelpers';
import { audio } from '../systems/AudioSystem';
import { Content } from '../content/ContentRegistry';

export class LevelSelectScene extends Phaser.Scene {
  private twoPlayer = false;
  private playersBtn?: Phaser.GameObjects.Container;

  constructor() {
    super('LevelSelectScene');
  }

  create(): void {
    this.twoPlayer = this.registry.get('twoPlayer') ?? false;
    const cx = GAME_WIDTH / 2;

    const g = this.add.graphics();
    g.fillGradientStyle(0x10131f, 0x10131f, 0x05060a, 0x05060a, 1);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    this.add
      .text(cx, 56, 'CHOOSE A DUNGEON', { fontFamily: 'Trebuchet MS, sans-serif', fontSize: '42px', color: C.hudBorder, fontStyle: 'bold' })
      .setOrigin(0.5)
      .setShadow(0, 4, '#000', 10);

    const levels = Content.campaignLevels();
    const colX = [cx - 168, cx + 168];
    levels.forEach((lv, i) => {
      const x = colX[i % 2];
      const y = 140 + Math.floor(i / 2) * 96;
      makeButton(this, x, y, 300, 46, lv.name.toUpperCase(), () => this.pick(lv.id), { size: 15 });
      this.add
        .text(x, y + 30, lv.subtitle ?? '', {
          fontFamily: 'Trebuchet MS, sans-serif',
          fontSize: '11px',
          color: C.inkDim,
          align: 'center',
          wordWrap: { width: 290 },
        })
        .setOrigin(0.5, 0);
    });

    this.refreshPlayersButton();
    makeButton(this, cx, GAME_HEIGHT - 40, 160, 38, 'BACK', () => this.scene.start('MenuScene'), { fill: C.hudBorderDk, size: 14 });
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('MenuScene'));
    this.cameras.main.fadeIn(200, 0, 0, 0);
  }

  private refreshPlayersButton(): void {
    this.playersBtn?.destroy();
    const cx = GAME_WIDTH / 2;
    this.playersBtn = makeButton(
      this,
      cx,
      GAME_HEIGHT - 86,
      220,
      36,
      `PLAYERS:  ${this.twoPlayer ? '2' : '1'}`,
      () => {
        this.twoPlayer = !this.twoPlayer;
        audio.sfx('ui_move');
        this.refreshPlayersButton();
      },
      { size: 14 }
    );
  }

  private pick(id: string): void {
    audio.sfx('ui_select');
    this.registry.set('twoPlayer', this.twoPlayer);
    this.registry.set('levelId', id);
    this.registry.remove('carryParty');
    this.registry.remove('loadSave');
    this.cameras.main.fadeOut(220, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('CharacterSelectScene'));
  }
}
