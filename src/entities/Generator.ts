import Phaser from 'phaser';
import type { EnemyId } from '../core/types';
import { audio } from '../systems/AudioSystem';
import type { Monster } from './Monster';

// A spawning altar. Periodically emits monsters until destroyed.
export class Generator extends Phaser.Physics.Arcade.Sprite {
  enemyId: EnemyId;
  interval: number;
  maxAlive: number;
  health: number;
  maxHealth: number;
  alive = true;

  private nextSpawnAt = 0;
  private spawned: Monster[] = [];
  private hurtUntil = 0;

  onSpawn?: (g: Generator) => Monster | null;
  onDestroyed?: (g: Generator) => void;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    enemyId: EnemyId,
    interval: number,
    maxAlive: number,
    hp: number
  ) {
    super(scene, x, y, 'generator-sheet', 0);
    this.enemyId = enemyId;
    this.interval = interval;
    this.maxAlive = maxAlive;
    this.maxHealth = hp;
    this.health = hp;

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 0.7);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(14, 12);
    body.setOffset(1, 4);
    body.immovable = true;
    this.setDepth(y);
    this.play('generator');
    this.nextSpawnAt = scene.time.now + interval * (0.5 + Math.random() * 0.5);
  }

  countAlive(): number {
    this.spawned = this.spawned.filter((m) => m && m.alive && m.active);
    return this.spawned.length;
  }

  tick(time: number): void {
    if (!this.alive) return;
    if (time >= this.nextSpawnAt && this.countAlive() < this.maxAlive) {
      this.nextSpawnAt = time + this.interval;
      const m = this.onSpawn?.(this);
      if (m) {
        this.spawned.push(m);
        // little spawn pop
        const pop = this.scene.add
          .image(this.x, this.y - 2, 'fx-glow-green')
          .setDepth(this.y + 5)
          .setScale(0.5);
        this.scene.tweens.add({
          targets: pop,
          alpha: 0,
          scale: 2,
          duration: 300,
          onComplete: () => pop.destroy(),
        });
      }
    }
  }

  takeDamage(raw: number, time: number): boolean {
    if (!this.alive) return false;
    this.health -= Math.max(1, Math.round(raw));
    this.hurtUntil = time + 120;
    this.setTint(0xff8888);
    this.scene.time.delayedCall(110, () => this.clearTint());
    audio.sfx('hit');
    if (this.health <= 0) {
      this.destroyGenerator();
      return true;
    }
    return false;
  }

  private destroyGenerator(): void {
    if (!this.alive) return;
    this.alive = false;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = false;
    audio.sfx('generator_destroy');
    this.onDestroyed?.(this);
    for (let i = 0; i < 6; i++) {
      const p = this.scene.add
        .image(this.x, this.y, 'fx-glow-green')
        .setDepth(this.y + 6);
      this.scene.tweens.add({
        targets: p,
        x: this.x + Phaser.Math.Between(-20, 20),
        y: this.y + Phaser.Math.Between(-18, 8),
        alpha: 0,
        scale: 0.2,
        duration: 400,
        onComplete: () => p.destroy(),
      });
    }
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: 1.4,
      scaleY: 0.3,
      duration: 320,
      onComplete: () => this.destroy(),
    });
  }
}
