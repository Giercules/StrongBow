import Phaser from 'phaser';
import { TextureFactory } from '../rendering/TextureFactory';
import { AnimationRegistry } from '../rendering/AnimationRegistry';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    const count = TextureFactory.generateAll(this);
    AnimationRegistry.register(this);
    // eslint-disable-next-line no-console
    console.log(`StrongBow: generated ${count} texture sets`);
    this.scene.start('MenuScene');
  }
}
