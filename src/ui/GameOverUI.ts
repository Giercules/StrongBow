import Phaser from 'phaser';
import { framedPanel, makeButton } from './uiHelpers';
import type { Modal } from './uiHelpers';
import { C } from '../rendering/Palette';

export class GameOverUI {
  private scene: Phaser.Scene;
  private modal: Modal | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  isOpen(): boolean {
    return this.modal !== null;
  }

  open(stats: { score: number; time: string }, onContinue: () => void, onMenu: () => void): void {
    if (this.modal) return;
    const m = framedPanel(this.scene, 360, 230, 'THE CRYPT CLAIMS YOU');
    this.modal = m;

    const title = this.scene.add
      .text(m.cx, m.cy - 44, 'YOU DIED', {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '34px',
        color: C.hpLow,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    title.setShadow(0, 3, '#000', 6);
    m.add(title);

    const sub = this.scene.add
      .text(m.cx, m.cy - 6, `Score ${stats.score}    Time ${stats.time}`, {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '14px',
        color: C.inkDim,
      })
      .setOrigin(0.5);
    m.add(sub);

    m.add(
      makeButton(this.scene, m.cx - 84, m.cy + 50, 150, 40, 'CONTINUE  (C)', () => {
        this.close();
        onContinue();
      }, { fill: C.ivy })
    );
    m.add(
      makeButton(this.scene, m.cx + 84, m.cy + 50, 150, 40, 'QUIT  (M)', () => {
        this.close();
        onMenu();
      })
    );
  }

  close(): void {
    this.modal?.destroy();
    this.modal = null;
  }
}
