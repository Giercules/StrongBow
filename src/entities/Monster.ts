import Phaser from 'phaser';
import type { EnemyDef, EnemyId } from '../core/types';
import { ENEMIES } from '../data/enemies';
import { audio } from '../systems/AudioSystem';
import { Hero } from './Hero';

export class Monster extends Phaser.Physics.Arcade.Sprite {
  def: EnemyDef;
  enemyId: EnemyId;
  health: number;
  maxHealth: number;
  alive = true;
  isBoss: boolean;

  private nextAttackAt = 0;
  private hurtUntil = 0;
  private attacking = false;
  private attackUntil = 0;
  private aggroed = false;
  private healAcc = 0;

  onDeath?: (m: Monster) => void;

  constructor(scene: Phaser.Scene, x: number, y: number, enemyId: EnemyId, hpOverride?: number) {
    super(scene, x, y, ENEMIES[enemyId].sheet, 0);
    this.enemyId = enemyId;
    this.def = ENEMIES[enemyId];
    this.isBoss = !!this.def.isBoss;
    this.maxHealth = hpOverride ?? this.def.health;
    this.health = this.maxHealth;

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 0.82);
    const scale = this.def.scale ?? 1;
    this.setScale(scale);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(12 * scale, 10 * scale);
    body.setOffset((this.width - 12 * scale) / 2, this.height * 0.55);
    this.setDepth(y);
    this.play(`${enemyId}-walk`);
    if (this.isBoss) this.setTint(0xffffff);
  }

  healthRatio(): number {
    return Phaser.Math.Clamp(this.health / this.maxHealth, 0, 1);
  }

  tick(time: number, delta: number, heroes: Hero[]): void {
    if (!this.alive) return;
    const body = this.body as Phaser.Physics.Arcade.Body;

    // nearest alive hero
    let target: Hero | null = null;
    let best = Infinity;
    for (const h of heroes) {
      if (!h.alive) continue;
      const d = Phaser.Math.Distance.Between(this.x, this.y, h.x, h.y);
      if (d < best) {
        best = d;
        target = h;
      }
    }

    if (this.attacking && time > this.attackUntil) {
      this.attacking = false;
      this.play(`${this.enemyId}-walk`, true);
    }

    if (target && best <= this.def.chaseRange) {
      if (!this.aggroed && this.isBoss) {
        this.aggroed = true;
        audio.sfx('boss_roar');
      }
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const len = Math.hypot(dx, dy) || 1;

      if (best > this.def.attackRange) {
        body.setVelocity((dx / len) * this.def.speed, (dy / len) * this.def.speed);
        this.setFlipX(dx < 0);
      } else {
        body.setVelocity(0, 0);
        if (time >= this.nextAttackAt) {
          this.nextAttackAt = time + this.def.attackCooldown;
          this.attacking = true;
          this.attackUntil = time + 300;
          this.play(`${this.enemyId}-attack`, true);
          const dealt = target.takeDamage(this.def.damage, time);
          // boss leeches a little when it lands a hit
          if (this.isBoss && dealt > 0) this.health = Math.min(this.maxHealth, this.health + 6);
        }
      }
    } else {
      body.setVelocity(0, 0);
    }

    // boss slow self-regen to make the fight a real gate
    if (this.isBoss && this.health < this.maxHealth) {
      this.healAcc += (delta / 1000) * 3;
      if (this.healAcc >= 1) {
        this.health = Math.min(this.maxHealth, this.health + Math.floor(this.healAcc));
        this.healAcc -= Math.floor(this.healAcc);
      }
    }

    if (time < this.hurtUntil) this.setAlpha(0.55);
    else this.setAlpha(this.enemyId === 'ghost' ? 0.92 : 1);

    this.setDepth(this.y);
  }

  takeDamage(raw: number, time: number): boolean {
    if (!this.alive) return false;
    const actual = Math.max(1, Math.round(raw - this.def.armor * 0.5));
    this.health -= actual;
    this.hurtUntil = time + 120;
    this.setAlpha(0.55);
    audio.sfx('hit');
    const hit = this.scene.add
      .image(this.x, this.y - 6, 'fx-hit')
      .setDepth(this.y + 10);
    this.scene.tweens.add({
      targets: hit,
      alpha: 0,
      scale: 1.6,
      duration: 160,
      onComplete: () => hit.destroy(),
    });
    if (this.health <= 0) {
      this.die();
      return true;
    }
    return false;
  }

  private die(): void {
    if (!this.alive) return;
    this.alive = false;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    body.enable = false;
    audio.sfx(this.isBoss ? 'boss_roar' : 'monster_die');
    if (this.onDeath) this.onDeath(this);
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scaleX: this.scaleX * 1.4,
      scaleY: this.scaleY * 0.4,
      angle: Phaser.Math.Between(-60, 60),
      duration: 360,
      ease: 'Quad.easeOut',
      onComplete: () => this.destroy(),
    });
  }
}
