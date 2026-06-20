import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../core/constants';
import { C } from '../rendering/Palette';
import { makeButton } from '../ui/uiHelpers';
import { audio } from '../systems/AudioSystem';
import { forgeLevel } from '../data/levelForge';

const VIBES: [string, string][] = [
  ['FROZEN CATHEDRAL', 'a frozen cathedral of archers and ice'],
  ['TOXIC SEWERS', 'toxic plague sewers full of brutes'],
  ['CLOCKWORK VAULT', 'a clockwork vault of spike traps'],
  ['BLOOD ARENA', 'a blood arena gauntlet of champions'],
  ['MOLTEN FORGE', 'a molten volcano forge of fire'],
  ['HAUNTED CRYPT', 'a haunted catacomb of the undead'],
];

const SURPRISE = [
  'a huge deadly frozen labyrinth',
  'cramped toxic catacombs swarming with imps',
  'a vast clockwork fortress of traps',
  'a brutal blood colosseum',
  'an endless molten inferno',
  'a sprawling haunted crypt of ghosts',
];

export class ForgeScene extends Phaser.Scene {
  private twoPlayer = false;
  private playersBtn?: Phaser.GameObjects.Container;

  constructor() {
    super('ForgeScene');
  }

  create(): void {
    this.twoPlayer = this.registry.get('twoPlayer') ?? false;
    const cx = GAME_WIDTH / 2;

    const g = this.add.graphics();
    g.fillGradientStyle(0x141026, 0x141026, 0x05060a, 0x05060a, 1);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    for (let i = 0; i < 40; i++) {
      this.add.image((i * 71) % GAME_WIDTH, 430 + ((i * 37) % 100), 'floor-' + (i % 4)).setScale(2).setAlpha(0.1);
    }

    this.add
      .text(cx, 64, 'FORGE A DUNGEON', { fontFamily: 'Trebuchet MS, sans-serif', fontSize: '46px', color: C.hudBorder, fontStyle: 'bold' })
      .setOrigin(0.5)
      .setShadow(0, 4, '#000', 10);
    this.add
      .text(cx, 104, 'Pick a vibe — or describe your own — and a level is built to match.', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '14px',
        color: C.inkDim,
      })
      .setOrigin(0.5);

    // vibe grid 3 x 2
    const colX = [cx - 230, cx, cx + 230];
    VIBES.forEach(([label, desc], i) => {
      const x = colX[i % 3];
      const y = 168 + Math.floor(i / 3) * 58;
      makeButton(this, x, y, 210, 48, label, () => this.forge(desc), { size: 15 });
    });

    makeButton(this, cx, 300, 330, 46, 'DESCRIBE YOUR OWN…', () => this.promptCustom(), { fill: C.ivy, size: 16 });
    makeButton(this, cx, 352, 220, 42, 'SURPRISE ME', () => this.forge(SURPRISE[Math.floor(Math.random() * SURPRISE.length)]), { fill: C.hudBorderDk, size: 15 });

    this.refreshPlayersButton();

    makeButton(this, cx, 478, 160, 40, 'BACK', () => this.scene.start('MenuScene'), { fill: C.hudBorderDk, size: 14 });
    this.input.keyboard?.on('keydown-ESC', () => this.scene.start('MenuScene'));

    this.cameras.main.fadeIn(200, 0, 0, 0);
  }

  private refreshPlayersButton(): void {
    this.playersBtn?.destroy();
    const cx = GAME_WIDTH / 2;
    this.playersBtn = makeButton(
      this,
      cx,
      420,
      220,
      38,
      `PLAYERS:  ${this.twoPlayer ? '2' : '1'}`,
      () => {
        this.twoPlayer = !this.twoPlayer;
        audio.sfx('ui_move');
        this.refreshPlayersButton();
      },
      { size: 14 }
    );
  }

  private promptCustom(): void {
    let desc: string | null = null;
    try {
      desc = window.prompt('Describe your dungeon:\n(e.g. "a huge frozen cathedral of archers")', '');
    } catch {
      desc = null;
    }
    if (desc && desc.trim()) this.forge(desc.trim());
  }

  private forge(desc: string): void {
    audio.sfx('ui_select');
    const level = forgeLevel(desc);
    this.registry.set('twoPlayer', this.twoPlayer);
    this.registry.set('levelId', level.id);
    this.registry.remove('carryParty');
    this.registry.remove('loadSave');
    this.cameras.main.fadeOut(220, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('CharacterSelectScene'));
  }
}
