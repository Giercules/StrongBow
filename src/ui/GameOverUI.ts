import Phaser from 'phaser';
import { framedPanel, makeButton } from './uiHelpers';
import type { Modal } from './uiHelpers';
import { C } from '../rendering/Palette';

export class GameOverUI {
  private scene: Phaser.Scene;
  private modal: Modal | null = null;
  private narration: Phaser.GameObjects.Text | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  isOpen(): boolean {
    return this.modal !== null;
  }

  open(stats: { score: number; time: string }, onContinue: () => void, onMenu: () => void): void {
    if (this.modal) return;
    const m = framedPanel(this.scene, 380, 300, 'THE CRYPT CLAIMS YOU');
    this.modal = m;

    const title = this.scene.add
      .text(m.cx, m.cy - 96, 'YOU DIED', {
        fontFamily: 'MedievalSharp, "Trebuchet MS", cursive',
        fontSize: '34px',
        color: C.hpLow,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    title.setShadow(0, 3, '#000', 6);
    m.add(title);

    const sub = this.scene.add
      .text(m.cx, m.cy - 58, `Score ${stats.score}    Time ${stats.time}`, {
        fontFamily: 'MedievalSharp, "Trebuchet MS", cursive',
        fontSize: '14px',
        color: C.inkDim,
      })
      .setOrigin(0.5);
    m.add(sub);

    // The Dungeon Master's closing words, filled in async via setNarration().
    this.narration = this.scene.add
      .text(m.cx, m.cy - 30, '', {
        fontFamily: 'MedievalSharp, "Trebuchet MS", cursive',
        fontSize: '12.5px',
        color: '#b79bff',
        fontStyle: 'italic',
        align: 'center',
        wordWrap: { width: 320 },
      })
      .setOrigin(0.5, 0);
    m.add(this.narration);

    m.add(
      makeButton(this.scene, m.cx - 84, m.cy + 98, 150, 40, 'CONTINUE  (C)', () => {
        this.close();
        onContinue();
      }, { fill: C.ivy })
    );
    m.add(
      makeButton(this.scene, m.cx + 84, m.cy + 98, 150, 40, 'QUIT  (M)', () => {
        this.close();
        onMenu();
      })
    );
  }

  /** Set the Dungeon Master's epitaph (resolves after the panel opens). */
  setNarration(text: string): void {
    this.narration?.setText(text);
  }

  close(): void {
    this.narration = null;
    this.modal?.destroy();
    this.modal = null;
  }
}
