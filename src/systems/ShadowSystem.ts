import Phaser from 'phaser';

type ShadowTarget = Phaser.GameObjects.Sprite | Phaser.GameObjects.Image;

interface ShadowPair {
  target: ShadowTarget;
  shadow: Phaser.GameObjects.Image;
  offsetY: number;
  baseScale: number;
}

// Attaches soft elliptical shadows beneath world entities and keeps them synced.
export class ShadowSystem {
  private scene: Phaser.Scene;
  private pairs: ShadowPair[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  add(target: ShadowTarget, offsetY = 6, baseScale = 1): void {
    const shadow = this.scene.add.image(target.x, target.y + offsetY, 'fx-shadow');
    shadow.setScale(baseScale);
    shadow.setAlpha(0.85);
    shadow.setDepth(target.y - 1);
    this.pairs.push({ target, shadow, offsetY, baseScale });
  }

  update(): void {
    for (let i = this.pairs.length - 1; i >= 0; i--) {
      const p = this.pairs[i];
      if (!p.target || !p.target.active || !p.target.scene) {
        p.shadow.destroy();
        this.pairs.splice(i, 1);
        continue;
      }
      p.shadow.setPosition(p.target.x, p.target.y + p.offsetY);
      p.shadow.setVisible(p.target.visible);
      p.shadow.setDepth(p.target.y - 1);
      p.shadow.setScale(p.baseScale, p.baseScale);
    }
  }

  removeAll(): void {
    for (const p of this.pairs) p.shadow.destroy();
    this.pairs = [];
  }
}
