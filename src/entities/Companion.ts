import Phaser from 'phaser';
import { Hero } from './Hero';
import { decideCompanion } from '../systems/CompanionAI';
import type { MonsterLike } from '../systems/CompanionAI';
import type { HeroClassId } from '../core/types';
import { settings } from '../core/GameSettings';

// AI-driven ally. Follows the lead player, assists in combat, casts if allowed.
export class Companion extends Hero {
  private aura?: Phaser.GameObjects.Image;
  /** True for raised undead servants (so the party AI doesn't have them cast abilities). */
  isSummon = false;
  /** ms timestamp when a summon crumbles to dust (0 = permanent). */
  expireAt = 0;
  /** ms timestamp the summon was raised (for the lifetime countdown bar). */
  lifeStart = 0;
  /** Thief skeleton: teleport-backstab behaviour + its cooldown gate. */
  isThief = false;
  nextBlink = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, classId: HeroClassId) {
    super(scene, x, y, classId, false, 0);
    this.createAura();
  }

  private createAura(): void {
    this.aura = this.scene.add
      .image(this.x, this.y + 6, 'fx-ally-aura')
      .setDepth(this.y - 2)
      .setAlpha(0.45)
      .setTint(0x5fe0a0);
    this.scene.tweens.add({
      targets: this.aura,
      alpha: { from: 0.25, to: 0.55 },
      scaleX: { from: 0.9, to: 1.05 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  /** Re-skin this companion as a distinct skeletal servant (tank/archer/mage/thief). */
  makeSkeleton(sheet: string, walk: string, attack: string): void {
    this.isSummon = true;
    this.setTexture(sheet, 0);
    this.skin = { walk, attack };
    this.play(walk, true);
    // brighten the ally aura so summoned skeletons read clearly as the player's own.
    if (this.aura) this.aura.setTint(0x9bffd0).setAlpha(0.6);
  }

  aiTick<M extends MonsterLike>(
    time: number,
    delta: number,
    leader: Hero | null,
    monsters: M[],
    pathDir: { x: number; y: number } | null = null,
    sep: { x: number; y: number } = { x: 0, y: 0 }
  ): { castTarget: M | null } {
    const cfg = settings.get('companionAI');
    let castTarget: M | null = null;

    if (this.alive) {
      const manaRatio = this.stats.maxMana > 0 ? this.mana / this.stats.maxMana : 0;
      const d = decideCompanion(this, leader, monsters, cfg, manaRatio, this.reach(), pathDir);
      const ranged = this.weaponStyle() === 'ranged';
      let mx = d.dirX;
      let my = d.dirY;
      if (d.target) {
        const dist = Math.hypot(d.target.x - this.x, d.target.y - this.y);
        this.faceTo(d.target.x - this.x, d.target.y - this.y);
        if (ranged && dist <= this.reach() && dist > 10) {
          // hold position and loose shots from range
          mx = d.dirX * 0.15;
          my = d.dirY * 0.15;
          this.tryMelee(time);
        } else if (d.wantAttack) {
          this.tryMelee(time);
        }
        if (d.wantMagic && this.tryMagic(time)) castTarget = d.target;
      }
      // separation: ease away from crowding allies so the party fans out
      mx += sep.x;
      my += sep.y;
      const len = Math.hypot(mx, my);
      if (len > 1) {
        mx /= len;
        my /= len;
      }
      this.setMoveInput(mx, my);
    } else {
      this.setMoveInput(0, 0);
    }

    this.tick(time, delta);

    if (this.aura) {
      this.aura.setPosition(this.x, this.y + 6);
      this.aura.setDepth(this.y - 2);
      this.aura.setVisible(this.alive && this.visible);
    }
    return { castTarget };
  }

  destroy(fromScene?: boolean): void {
    if (this.aura) this.aura.destroy();
    super.destroy(fromScene);
  }
}
