import Phaser from 'phaser';
import type { EnemyBehavior, EnemyDef, EnemyId } from '../core/types';
import { ENEMIES } from '../data/enemies';
import { audio } from '../systems/AudioSystem';
import { Hero } from './Hero';

type ArcadeBody = Phaser.Physics.Arcade.Body;

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

  // special-attack state (ranged / charger / boss)
  private nextSpecialAt = 1500;
  private telegraphUntil = 0;
  private chargeUntil = 0;
  private chargeDx = 0;
  private chargeDy = 0;
  private pendingSpecial: 'volley' | 'nova' | 'summon' | null = null;

  onDeath?: (m: Monster) => void;
  onRanged?: (m: Monster, ux: number, uy: number) => void;
  onSummon?: (m: Monster) => void;
  onNova?: (m: Monster, radius: number) => void;

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
    const body = this.body as ArcadeBody;
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
    const body = this.body as ArcadeBody;

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

    const beh: EnemyBehavior = this.def.behavior ?? 'melee';
    if (target && best <= this.def.chaseRange) {
      if (!this.aggroed && this.isBoss) {
        this.aggroed = true;
        audio.sfx('boss_roar');
      }
      if (beh === 'ranged') this.behaveRanged(body, target, best, time);
      else if (beh === 'charger') this.behaveCharger(body, target, best, time);
      else if (beh === 'boss') this.behaveBoss(body, target, best, time);
      else this.behaveMelee(body, target, best, time);
    } else {
      body.setVelocity(0, 0);
      this.telegraphUntil = 0;
      this.pendingSpecial = null;
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

    if (time < this.telegraphUntil) this.setTint(0xffa070);
    else if (this.isBoss) this.setTint(0xffffff);
    else this.clearTint();

    this.setDepth(this.y);
  }

  // ---- behaviours -----------------------------------------------------------

  private behaveMelee(body: ArcadeBody, target: Hero, best: number, time: number): void {
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const len = Math.hypot(dx, dy) || 1;
    if (best > this.def.attackRange) {
      body.setVelocity((dx / len) * this.def.speed, (dy / len) * this.def.speed);
      this.setFlipX(dx < 0);
    } else {
      body.setVelocity(0, 0);
      if (time >= this.nextAttackAt) this.strike(target, time);
    }
  }

  private behaveRanged(body: ArcadeBody, target: Hero, best: number, time: number): void {
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    this.setFlipX(dx < 0);
    const pr = this.def.preferredRange ?? 120;
    if (best < pr * 0.75) body.setVelocity(-ux * this.def.speed, -uy * this.def.speed);
    else if (best > this.def.attackRange * 0.9) body.setVelocity(ux * this.def.speed, uy * this.def.speed);
    else body.setVelocity(0, 0);
    if (best <= this.def.attackRange && time >= this.nextAttackAt) {
      this.nextAttackAt = time + this.def.attackCooldown;
      this.attacking = true;
      this.attackUntil = time + 300;
      this.play(`${this.enemyId}-attack`, true);
      this.onRanged?.(this, ux, uy);
    }
  }

  private behaveCharger(body: ArcadeBody, target: Hero, best: number, time: number): void {
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    this.setFlipX(dx < 0);
    if (time < this.telegraphUntil) {
      body.setVelocity(0, 0);
      return;
    }
    if (time < this.chargeUntil) {
      body.setVelocity(this.chargeDx * this.def.speed * 3, this.chargeDy * this.def.speed * 3);
      if (best <= this.def.attackRange + 8 && time >= this.nextAttackAt) {
        this.nextAttackAt = time + 700;
        target.takeDamage(this.def.damage, time);
      }
      return;
    }
    if (best > this.def.attackRange) {
      if (best < this.def.chaseRange * 0.85 && time >= this.nextSpecialAt) {
        this.nextSpecialAt = time + (this.def.specialCooldown ?? 3000);
        this.telegraphUntil = time + 450;
        this.chargeUntil = time + 450 + 420;
        this.chargeDx = ux;
        this.chargeDy = uy;
        this.attacking = true;
        this.attackUntil = time + 450;
        this.play(`${this.enemyId}-attack`, true);
        return;
      }
      body.setVelocity(ux * this.def.speed, uy * this.def.speed);
    } else {
      body.setVelocity(0, 0);
      if (time >= this.nextAttackAt) this.strike(target, time);
    }
  }

  private behaveBoss(body: ArcadeBody, target: Hero, best: number, time: number): void {
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    this.setFlipX(dx < 0);

    if (time < this.telegraphUntil) {
      body.setVelocity(0, 0);
      return;
    }
    if (this.pendingSpecial) {
      const sp = this.pendingSpecial;
      this.pendingSpecial = null;
      if (sp === 'volley') this.fireVolley();
      else if (sp === 'nova') this.onNova?.(this, 124);
      else if (sp === 'summon') this.onSummon?.(this);
      return;
    }

    const hr = this.healthRatio();
    if (time >= this.nextSpecialAt && best <= this.def.chaseRange) {
      this.nextSpecialAt = time + (this.def.specialCooldown ?? 4000);
      const r = Math.random();
      this.attacking = true;
      this.attackUntil = time + 520;
      this.play(`${this.enemyId}-attack`, true);
      body.setVelocity(0, 0);
      if (hr < 0.4 && (best < 150 || r < 0.45)) {
        this.telegraphUntil = time + 520;
        this.pendingSpecial = 'nova';
      } else if (this.def.summons && hr < 0.7 && r < 0.5) {
        this.telegraphUntil = time + 460;
        this.pendingSpecial = 'summon';
      } else {
        this.telegraphUntil = time + 440;
        this.pendingSpecial = 'volley';
      }
      return;
    }

    if (best > this.def.attackRange) {
      body.setVelocity(ux * this.def.speed, uy * this.def.speed);
    } else {
      body.setVelocity(0, 0);
      if (time >= this.nextAttackAt) this.strike(target, time);
    }
  }

  private fireVolley(): void {
    const n = 10;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      this.onRanged?.(this, Math.cos(a), Math.sin(a));
    }
    audio.sfx('magic');
  }

  private strike(target: Hero, time: number): void {
    this.nextAttackAt = time + this.def.attackCooldown;
    this.attacking = true;
    this.attackUntil = time + 300;
    this.play(`${this.enemyId}-attack`, true);
    const dealt = target.takeDamage(this.def.damage, time);
    if (this.isBoss && dealt > 0) this.health = Math.min(this.maxHealth, this.health + 6);
  }

  takeDamage(raw: number, time: number): boolean {
    if (!this.alive) return false;
    const actual = Math.max(1, Math.round(raw - this.def.armor * 0.5));
    this.health -= actual;
    this.hurtUntil = time + 120;
    this.setAlpha(0.55);
    audio.sfx('hit');
    const hit = this.scene.add.image(this.x, this.y - 6, 'fx-hit').setDepth(this.y + 10);
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
    const body = this.body as ArcadeBody;
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
