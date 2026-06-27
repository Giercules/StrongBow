import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../core/constants';
import { C } from '../rendering/Palette';
import { makeButton } from '../ui/uiHelpers';
import { MenuPad, FocusList } from '../ui/MenuPad';
import { audio } from '../systems/AudioSystem';
import { Content } from '../content/ContentRegistry';

export class LevelSelectScene extends Phaser.Scene {
  private twoPlayer = false;
  private playersBtn?: Phaser.GameObjects.Container;
  private pad?: MenuPad;
  private focus?: FocusList;

  constructor() {
    super('LevelSelectScene');
  }

  create(): void {
    this.twoPlayer = this.registry.get('twoPlayer') ?? false;
    this.pad = new MenuPad(this);
    this.focus = new FocusList(this, 50);
    const cx = GAME_WIDTH / 2;

    const g = this.add.graphics();
    g.fillGradientStyle(0x10131f, 0x10131f, 0x05060a, 0x05060a, 1);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    this.add
      .text(cx, 28, 'CHOOSE A DUNGEON', { fontFamily: 'MedievalSharp, "Trebuchet MS", cursive', fontSize: '30px', color: C.hudBorder, fontStyle: 'bold' })
      .setOrigin(0.5)
      .setShadow(0, 3, '#000', 8);

    const levels = Content.campaignLevels();
    const colX = [cx - 150, cx + 150];
    const rowH = 66;
    const startY = 74;
    levels.forEach((lv, i) => {
      const x = colX[i % 2];
      const y = startY + Math.floor(i / 2) * rowH;
      makeButton(this, x, y, 280, 32, lv.name.toUpperCase(), () => this.pick(lv.id), { size: 13 });
      this.focus!.add({ x, y, w: 280, h: 32, activate: () => this.pick(lv.id) });
      const sub = lv.chapter ? `${lv.chapter} · ${lv.subtitle ?? ''}` : lv.subtitle ?? '';
      this.add
        .text(x, y + 18, sub, {
          fontFamily: 'MedievalSharp, "Trebuchet MS", cursive',
          fontSize: '10px',
          color: C.inkDim,
          align: 'center',
          wordWrap: { width: 268 },
        })
        .setOrigin(0.5, 0);
    });

    this.refreshPlayersButton();
    this.focus.add({ x: cx, y: GAME_HEIGHT - 86, w: 220, h: 36, activate: () => this.togglePlayers() });
    makeButton(this, cx, GAME_HEIGHT - 40, 160, 38, 'BACK', () => this.scene.start('MenuScene'), { fill: C.hudBorderDk, size: 14 });
    this.focus.add({ x: cx, y: GAME_HEIGHT - 40, w: 160, h: 38, activate: () => this.scene.start('MenuScene') });
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('MenuScene'));
    // arrow keys + Enter mirror the controller focus navigation
    this.input.keyboard?.on('keydown-UP', () => this.focus?.move(0, -1));
    this.input.keyboard?.on('keydown-DOWN', () => this.focus?.move(0, 1));
    this.input.keyboard?.on('keydown-LEFT', () => this.focus?.move(-1, 0));
    this.input.keyboard?.on('keydown-RIGHT', () => this.focus?.move(1, 0));
    this.input.keyboard?.on('keydown-ENTER', () => this.focus?.activate());
    this.cameras.main.fadeIn(200, 0, 0, 0);
  }

  update(): void {
    if (!this.pad || !this.focus) return;
    this.pad.poll();
    if (this.pad.up()) this.focus.move(0, -1);
    if (this.pad.down()) this.focus.move(0, 1);
    if (this.pad.left()) this.focus.move(-1, 0);
    if (this.pad.right()) this.focus.move(1, 0);
    if (this.pad.confirm()) this.focus.activate();
    if (this.pad.cancel()) this.scene.start('MenuScene');
  }

  private togglePlayers(): void {
    this.twoPlayer = !this.twoPlayer;
    audio.sfx('ui_move');
    this.refreshPlayersButton();
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
      () => this.togglePlayers(),
      { size: 14 }
    );
  }

  private pick(id: string): void {
    audio.sfx('ui_select');
    this.registry.set('twoPlayer', this.twoPlayer);
    this.registry.set('levelId', id);
    this.registry.remove('carryParty');
    this.registry.remove('fromTown');
    this.registry.remove('loadSave');
    this.cameras.main.fadeOut(220, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('CharacterSelectScene'));
  }
}
