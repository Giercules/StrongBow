import Phaser from 'phaser';
import { DEPTH } from '../core/constants';
import { C } from '../rendering/Palette';
import { addPinned } from './uiHelpers';

// Small reference panel, top-left of the play area, during gameplay.
export class ControlsPanel {
  private container: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, twoPlayer: boolean) {
    this.container = scene.add.container(8, 8).setDepth(DEPTH.CONTROLS);

    const lines = [
      'P1  WASD move · Z attack',
      'E use · Q magic',
      'I inventory · K skills',
    ];
    if (twoPlayer) {
      lines.push('P2  Arrows · RCtrl atk · Enter magic');
    } else {
      lines.push('Press 2 to add Player 2');
    }
    lines.push('O settings · ESC quit');

    const width = 232;
    const height = 14 + lines.length * 15;

    const bg = scene.add.graphics();
    bg.fillStyle(0x05060a, 0.72);
    bg.fillRoundedRect(0, 0, width, height, 6);
    bg.lineStyle(1, parseInt(C.hudBorderDk.slice(1), 16), 0.8);
    bg.strokeRoundedRect(0, 0, width, height, 6);
    addPinned(this.container, bg);

    lines.forEach((ln, i) => {
      const t = scene.add.text(8, 7 + i * 15, ln, {
        fontFamily: 'MedievalSharp, "Trebuchet MS", cursive',
        fontSize: '11px',
        color: i === 0 || (i === 3 && twoPlayer) ? C.hudBorder : C.inkDim,
      });
      addPinned(this.container, t);
    });
  }

  setVisible(v: boolean): void {
    this.container.setVisible(v);
  }

  destroy(): void {
    this.container.destroy();
  }
}
