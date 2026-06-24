import Phaser from 'phaser';
import type { HeroClassDef, HeroClassId, Direction, StatBlock } from '../core/types';
import { HEROES } from '../data/heroes';
import { settings } from '../core/GameSettings';
import { SkillSet } from '../systems/SkillSystem';
import { AttributeSet } from '../systems/AttributeSystem';
import { Inventory } from '../systems/InventorySystem';
import { computeStats, xpToNext } from '../systems/StatsSystem';
import { audio } from '../systems/AudioSystem';

const MAGIC_COST = 15;
const IFRAME_MS = 800;

export class Hero extends Phaser.Physics.Arcade.Sprite {
  classId: HeroClassId;
  def: HeroClassDef;
  isPlayer: boolean;
  playerNum: number;

  level = 1;
  xp = 0;
  score = 0;
  alive = true;

  skillSet: SkillSet;
  attributes: AttributeSet;
  inventory: Inventory;
  stats: StatBlock;
  health: number;
  mana: number;

  facing: Direction = 'down';
  protected moveX = 0;
  protected moveY = 0;
  speedMult = 1;
  /** 0 = firm footing; higher = slippier (set by ice tiles each frame). */
  slip = 0;

  // transient group-aura buffs, recomputed each frame by DungeonScene.updateAuras
  auraDamageReduction = 0;
  auraCritBonus = 0;
  auraDamageMult = 1;

  attacking = false;
  attackUntil = 0;
  attackDir = { x: 0, y: 1 };
  meleeResolved = false;
  dodging = false;
  private nextDodgeAt = 0;
  private dodgeUntil = 0;
  private dodgeDir = { x: 0, y: 1 };
  private nextAbilityAt = 0;
  private shot: { x: number; y: number } | null = null;
  private castFlag = false;
  private nextAttackAt = 0;
  private hurtUntil = 0;
  private manaRegenAcc = 0;
  private regenAcc = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, classId: HeroClassId, isPlayer: boolean, playerNum: number) {
    super(scene, x, y, `hero-${classId}-sheet`, 0);
    this.classId = classId;
    this.def = HEROES[classId];
    this.isPlayer = isPlayer;
    this.playerNum = playerNum;
    this.skillSet = new SkillSet(classId);
    this.attributes = new AttributeSet();
    this.inventory = new Inventory();

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setOrigin(0.5, 0.82);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(22, 18);
    body.setOffset(9, 26);
    this.setCollideWorldBounds(true);
    this.setDepth(y);
    this.setScale(0.58 * settings.spriteScale());

    this.stats = this.recompute();
    this.health = this.stats.maxHealth;
    this.mana = this.stats.maxMana;
    this.play(`${classId}-idle-down`);
  }

  private cheats() {
    return settings.get('gameplay');
  }

  recompute(): StatBlock {
    this.stats = computeStats(this.def.base, this.level, this.inventory.equippedList(), this.skillSet.ranks, this.attributes.ranks);
    if (this.health !== undefined) this.health = Math.min(this.health, this.stats.maxHealth);
    if (this.mana !== undefined) this.mana = Math.min(this.mana, this.stats.maxMana);
    return this.stats;
  }

  refreshStats(): StatBlock {
    return this.recompute();
  }

  /** Start the hero at a higher level (cheat/enhancement). */
  setStartLevel(level: number): void {
    if (level <= 1) return;
    const gained = level - 1;
    this.level = level;
    this.skillSet.grantPoint(gained);
    this.attributes.grantPoint(gained);
    this.recompute();
    this.health = this.stats.maxHealth;
    this.mana = this.stats.maxMana;
  }

  setMoveInput(dx: number, dy: number): void {
    this.moveX = dx;
    this.moveY = dy;
  }

  protected applyMovement(): void {
    const body = this.body as Phaser.Physics.Arcade.Body | null;
    if (!body) return;
    if (!this.alive) {
      body.setVelocity(0, 0);
      return;
    }
    if (this.dodging) {
      const spd = this.stats.speed * 2.7;
      body.setVelocity(this.dodgeDir.x * spd, this.dodgeDir.y * spd);
      this.faceTo(this.dodgeDir.x, this.dodgeDir.y);
      return;
    }
    let dx = this.moveX;
    let dy = this.moveY;
    const len = Math.hypot(dx, dy);
    if (len > 0) {
      dx /= len;
      dy /= len;
      this.faceTo(dx, dy);
    }
    const spd = this.stats.speed * this.speedMult;
    const targetVx = dx * spd;
    const targetVy = dy * spd;
    if (this.slip > 0) {
      // Icy footing: ease velocity toward the target so the hero skates and
      // keeps gliding briefly after the stick is released.
      const k = 1 - this.slip;
      body.setVelocity(body.velocity.x + (targetVx - body.velocity.x) * k, body.velocity.y + (targetVy - body.velocity.y) * k);
    } else {
      body.setVelocity(targetVx, targetVy);
    }
  }

  faceTo(dx: number, dy: number): void {
    if (Math.abs(dx) > Math.abs(dy)) this.facing = dx < 0 ? 'left' : 'right';
    else this.facing = dy < 0 ? 'up' : 'down';
  }

  private animFacing(): { f: 'down' | 'up' | 'side'; flip: boolean } {
    if (this.facing === 'left') return { f: 'side', flip: true };
    if (this.facing === 'right') return { f: 'side', flip: false };
    return { f: this.facing, flip: false };
  }

  protected updateAnim(): void {
    const { f, flip } = this.animFacing();
    this.setFlipX(flip);
    let state: 'idle' | 'walk' | 'attack' = 'idle';
    if (this.attacking) state = 'attack';
    else if (Math.hypot(this.moveX, this.moveY) > 0.05) state = 'walk';
    const key = `${this.classId}-${state}-${f}`;
    if (this.anims.currentAnim?.key !== key) this.play(key, true);
  }

  tick(time: number, delta: number): void {
    if (this.attacking && time > this.attackUntil) this.attacking = false;
    if (this.dodging && time > this.dodgeUntil) this.dodging = false;
    this.applyMovement();
    this.updateAnim();
    this.setDepth(this.y);

    if (time < this.hurtUntil) this.setAlpha(0.5);
    else if (!this.attacking) this.setAlpha(1);

    if (this.alive) {
      if (this.stats.regen > 0 && this.health < this.stats.maxHealth) {
        this.regenAcc += this.stats.regen * (delta / 1000);
        if (this.regenAcc >= 1) {
          const add = Math.floor(this.regenAcc);
          this.health = Math.min(this.stats.maxHealth, this.health + add);
          this.regenAcc -= add;
        }
      }
      this.manaRegenAcc += (delta / 1000) * 2;
      if (this.manaRegenAcc >= 1 && this.mana < this.stats.maxMana) {
        const add = Math.floor(this.manaRegenAcc);
        this.mana = Math.min(this.stats.maxMana, this.mana + add);
        this.manaRegenAcc -= add;
      }
    }
  }

  reach(): number {
    const base: Record<HeroClassId, number> = { vanguard: 24, strider: 42, arcanist: 24, warden: 26, necromancer: 40 };
    const cleave = this.classId === 'vanguard' ? this.skillSet.rank('van_cleave') * 4 : 0;
    return base[this.classId] + cleave;
  }

  attackCooldown(): number {
    return Math.max(170, 360 - this.level * 5 - (this.classId === 'strider' ? 60 : 0));
  }

  tryMelee(time: number): boolean {
    if (!this.alive || time < this.nextAttackAt) return false;
    this.nextAttackAt = time + this.attackCooldown();
    this.attacking = true;
    this.attackUntil = time + 240;
    this.meleeResolved = false;
    const dirVec: Record<Direction, { x: number; y: number }> = {
      down: { x: 0, y: 1 },
      up: { x: 0, y: -1 },
      left: { x: -1, y: 0 },
      right: { x: 1, y: 0 },
    };
    this.attackDir = dirVec[this.facing];
    if (this.weaponStyle() === 'ranged') {
      this.shot = { x: this.attackDir.x, y: this.attackDir.y };
      audio.sfx(this.classId === 'arcanist' ? 'magic' : 'swing');
    } else {
      this.spawnSlash();
      audio.sfx(this.classId === 'warden' ? 'hit' : 'melee');
    }
    return true;
  }

  private spawnSlash(): void {
    const dir = this.attackDir;
    const ang = Math.atan2(dir.y, dir.x);
    const dist = this.reach() * 0.6;
    const fx = this.scene.add.sprite(this.x + dir.x * dist, this.y + dir.y * dist, 'fx-slash');
    fx.setDepth(this.y + 6).setRotation(ang);
    if (this.classId === 'vanguard') {
      // a great sweeping broadsword arc
      fx.setScale(2.3, 2.1).setTint(0xeaf0ff);
      const trail = this.scene.add
        .sprite(this.x + dir.x * dist * 1.35, this.y + dir.y * dist * 1.35, 'fx-slash')
        .setDepth(this.y + 5)
        .setRotation(ang)
        .setScale(1.7)
        .setAlpha(0.5)
        .setTint(0xffffff);
      trail.play('fx-slash');
      trail.once('animationcomplete', () => trail.destroy());
    } else {
      // warden mace bash
      fx.setScale(1.7).setTint(0xffcf5a);
    }
    fx.play('fx-slash');
    fx.once('animationcomplete', () => fx.destroy());
  }

  attackDamage(): { dmg: number; crit: boolean } {
    let dmg = (this.stats.damage + this.stats.fire * 0.5) * this.auraDamageMult * this.cheats().playerDamageMult;
    const crit = Math.random() < this.stats.critChance + this.auraCritBonus;
    if (crit) dmg *= 2;
    return { dmg: Math.round(dmg), crit };
  }

  canMagic(): boolean {
    return this.alive && (this.cheats().infiniteMana || this.mana >= MAGIC_COST);
  }

  tryMagic(time: number): boolean {
    if (!this.canMagic() || time < this.nextAttackAt) return false;
    if (!this.cheats().infiniteMana) this.mana -= MAGIC_COST;
    this.nextAttackAt = time + 400;
    this.attacking = true;
    this.attackUntil = time + 260;
    this.castFlag = true;
    audio.sfx('magic');
    return true;
  }

  consumeCast(): boolean {
    if (this.castFlag) {
      this.castFlag = false;
      return true;
    }
    return false;
  }

  weaponStyle(): 'melee' | 'ranged' {
    return this.classId === 'strider' || this.classId === 'arcanist' || this.classId === 'necromancer' ? 'ranged' : 'melee';
  }

  /** Scene consumes a queued ranged shot (direction) to spawn a projectile. */
  consumeShot(): { x: number; y: number } | null {
    const s = this.shot;
    this.shot = null;
    return s;
  }

  magicDamage(): number {
    return Math.round((this.stats.damage * 1.4 + this.stats.fire * 2 + this.level * 1.5) * this.auraDamageMult * this.cheats().playerDamageMult);
  }

  // ---- dodge roll ----
  tryDodge(time: number): boolean {
    if (!this.alive || this.dodging || time < this.nextDodgeAt) return false;
    let dx = this.moveX;
    let dy = this.moveY;
    if (dx === 0 && dy === 0) {
      const f: Record<Direction, [number, number]> = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] };
      [dx, dy] = f[this.facing];
    }
    const len = Math.hypot(dx, dy) || 1;
    this.dodgeDir = { x: dx / len, y: dy / len };
    this.dodging = true;
    this.dodgeUntil = time + 200;
    this.nextDodgeAt = time + 850;
    this.hurtUntil = Math.max(this.hurtUntil, time + 280); // i-frames
    audio.sfx('swing');
    return true;
  }

  dodgeCooldownRatio(time: number): number {
    return Phaser.Math.Clamp((this.nextDodgeAt - time) / 850, 0, 1);
  }

  // ---- active class ability ----
  abilityCooldown(): number {
    return Math.round(7000 * (1 - (this.stats.cdr ?? 0)));
  }
  canAbility(time: number): boolean {
    return this.alive && time >= this.nextAbilityAt;
  }
  markAbilityUsed(time: number): void {
    this.nextAbilityAt = time + this.abilityCooldown();
  }
  abilityCooldownRatio(time: number): number {
    return Phaser.Math.Clamp((this.nextAbilityAt - time) / this.abilityCooldown(), 0, 1);
  }

  takeDamage(raw: number, time: number): number {
    if (!this.alive || time < this.hurtUntil) return 0;
    if (this.cheats().godMode) return 0;
    let actual = Math.max(1, Math.round(raw - this.stats.armor * 0.5));
    actual = Math.max(1, Math.round(actual * (1 - this.auraDamageReduction)));
    this.health -= actual;
    this.hurtUntil = time + IFRAME_MS;
    this.setAlpha(0.5);
    audio.sfx('hurt');
    this.scene.tweens.add({ targets: this, x: this.x + Phaser.Math.Between(-2, 2), duration: 40, yoyo: true, repeat: 2 });
    if (this.health <= 0) this.die();
    return actual;
  }

  takeEnvironmentalDamage(n: number): number {
    if (!this.alive || this.cheats().godMode) return 0;
    const mit = Math.min(0.15, this.stats.armor * 0.02);
    const actual = Math.max(1, Math.round(n * (1 - mit) * (1 - this.auraDamageReduction)));
    this.health -= actual;
    if (this.health <= 0) this.die();
    return actual;
  }

  heal(n: number): void {
    if (!this.alive) return;
    this.health = Math.min(this.stats.maxHealth, this.health + n);
  }

  restoreMana(n: number): void {
    this.mana = Math.min(this.stats.maxMana, this.mana + n);
  }

  gainXP(n: number): void {
    if (!this.alive) return;
    this.xp += n;
    let leveled = false;
    while (this.xp >= xpToNext(this.level)) {
      this.xp -= xpToNext(this.level);
      this.level++;
      this.skillSet.grantPoint(1);
      this.attributes.grantPoint(1);
      leveled = true;
    }
    if (leveled) {
      this.recompute();
      this.health = this.stats.maxHealth;
      this.mana = this.stats.maxMana;
      audio.sfx('levelup');
      const fx = this.scene.add.sprite(this.x, this.y, 'fx-levelup').setDepth(this.y + 10);
      fx.play('fx-levelup');
      fx.once('animationcomplete', () => fx.destroy());
    }
  }

  addScore(n: number): void {
    this.score += n;
  }

  die(): void {
    if (!this.alive) return;
    this.alive = false;
    this.health = 0;
    this.attacking = false;
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    body.enable = false;
    this.scene.tweens.add({ targets: this, alpha: 0.25, angle: 90, duration: 400, ease: 'Quad.easeOut' });
  }

  revive(ratio = 0.5): void {
    this.alive = true;
    this.health = Math.max(1, Math.round(this.stats.maxHealth * ratio));
    this.mana = Math.round(this.stats.maxMana * ratio);
    this.setAlpha(1);
    this.setAngle(0);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.enable = true;
  }

  healthRatio(): number {
    return Phaser.Math.Clamp(this.health / this.stats.maxHealth, 0, 1);
  }
}
