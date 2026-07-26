import Phaser from 'phaser';
import type { EnemyBehavior, EnemyDef, EnemyId } from '../core/types';
import { ENEMIES, BOSS_PHASE2 } from '../data/enemies';
import { audio } from '../systems/AudioSystem';
import { settings } from '../core/GameSettings';
import { ENEMY_SCALE_DEFAULT, ENEMY_SPRITE_BASE, SPRITE_SCALE_DEFAULT } from '../core/constants';
import { Hero } from './Hero';
import type { Vfx } from '../rendering/Vfx';

type ArcadeBody = Phaser.Physics.Arcade.Body;

// Phaser 4 separated tint COLOUR from tint MODE, but `Phaser.TintModes` ships
// only in the type definitions — the runtime namespace exposes BlendModes and
// ScaleModes and stops there, so `Phaser.TintModes.FILL` is undefined at run
// time even though it type-checks. setTintMode() takes a plain number, so use
// the documented values directly.
const TINT_MULTIPLY = 0;
const TINT_FILL = 1;

/** Blood colour per creature family — skeletons spark, oozes splash, demons burn.
 *  Undefined means "no viscera": constructs and spirits shed sparks instead. */
export const MONSTER_GORE: Record<string, number | undefined> = {
  grunt: 0x6fbf4a,
  gladiator: 0xc01b22,
  brute: 0xc01b22,
  demon: 0xff5a1e,
  imp: 0xff7a2a,
  spore_imp: 0x9cf24e,
  void_imp: 0xc79bff,
  mire_lurker: 0x8ce05a,
  plague_ooze: 0x9cf24e,
  molten_colossus: 0xff8a1e,
  arena_champion: 0xc01b22,
  mire_leviathan: 0x8ce05a,
  rot_sovereign: 0x9cf24e,
};

/** The colour a creature's death burst throws. Falls back to its gore, then to
 *  a pale spirit white — so every kill still reads as *this* realm's kill. */
const DEATH_TINT: Record<string, number> = {
  ghost: 0x9fc0ff,
  frost_shade: 0x8fe8ff,
  rime_archer: 0x8fe8ff,
  rime_cantor: 0x8fe8ff,
  storm_wisp: 0xbcd4ff,
  sky_lancer: 0xbcd4ff,
  tempest_herald: 0xbcd4ff,
  shadow_stalker: 0xc79bff,
  void_imp: 0xc79bff,
  umbral_devourer: 0xc79bff,
  grave_warden: 0x3affd0,
  bone_archer: 0xf4eed4,
  hollow_knight: 0xffd24a,
  hollow_king: 0xff5a3a,
  gear_knight: 0xffd24a,
  brass_sentinel: 0xffd24a,
  brass_magnus: 0xffd24a,
  molten_colossus: 0xff8a1e,
  skel_tank: 0xf4eed4,
  skel_archer: 0xf4eed4,
  skel_mage: 0xf4eed4,
  skel_thief: 0xf4eed4,
};

/** On-hit / ability statuses a monster can suffer. burn/chill/shock are the
 *  originals; the rest arrive with the Class Ability Expansion. */
export type MonsterStatus = 'burn' | 'chill' | 'shock' | 'stun' | 'root' | 'vuln' | 'bleed' | 'poison' | 'fear';

export class Monster extends Phaser.Physics.Arcade.Sprite {
  def: EnemyDef;
  enemyId: EnemyId;
  health: number;
  maxHealth: number;
  alive = true;
  isBoss: boolean;
  private hpBar?: Phaser.GameObjects.Graphics;

  /** Stable network id for co-op enemy sync (assigned by the scene on spawn). */
  netId = 0;

  // per-enemy stealth detection: this monster sees a sneaking thief only after
  // it has personally spotted them (spotting one foe never alerts the rest).
  spottedUntil = 0;
  spottedAlly: Hero | null = null;
  /** True once this foe has been successfully pickpocketed (can't be re-robbed). */
  pickpocketed = false;

  private nextAttackAt = 0;
  private hurtUntil = 0;
  /** Solid-white silhouette flash on contact — short and violent (~90ms). */
  private flashUntil = 0;
  /** Idle breathing phase, offset per monster so a pack never pulses in sync. */
  private readonly idlePhase = Math.random() * Math.PI * 2;
  /** Rest scale; the breathe/lean squash multiplies this rather than compounding. */
  private baseScale = 1;
  /** Trailing HP-bar ghost (see drawHpBar). */
  private lagHp = 1;
  private lagAt = 0;
  /** Standing aura for elites/bosses — see attachAura. */
  private auraRing?: Phaser.GameObjects.Sprite;
  private auraMotes: Phaser.GameObjects.Image[] = [];
  private auraTint = 0xffd24a;
  private attacking = false;
  private attackUntil = 0;
  private aggroed = false;
  private healAcc = 0;

  // elite + status state
  isElite = false;
  dmgMult = 1;
  /** Bonus armor from realm / party scaling (added to def.armor). */
  armorBonus = 0;
  /** True once realm or arena scaling has been applied. */
  scaleApplied = false;
  private burnUntil = 0;
  private burnTickAt = 0;
  private burnDmg = 5;
  private chillUntil = 0;
  private shockUntil = 0;
  private knockUntil = 0;
  private knockVx = 0;
  private knockVy = 0;
  // expanded ability statuses (Class Ability Expansion)
  private stunUntil = 0;
  private rootUntil = 0;
  private vulnUntil = 0;
  private vulnMult = 1.25;
  private bleedUntil = 0;
  private bleedTickAt = 0;
  private bleedDmg = 6;
  private poisonUntil = 0;
  private poisonTickAt = 0;
  private poisonDmg = 5;
  private fearUntil = 0;
  private tauntUntil = 0;
  private tauntBy: Hero | null = null;

  /** True while any hard crowd-control locks this foe out of acting. */
  isStunned(time: number): boolean {
    return time < this.stunUntil;
  }

  /** True while a fire DoT is burning this foe (drives Meltdown detonations). */
  isBurning(time: number): boolean {
    return time < this.burnUntil;
  }

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
  onPhase2?: (m: Monster) => void;

  /** True once a boss has crossed half health and changed the fight. */
  phase2 = false;

  constructor(scene: Phaser.Scene, x: number, y: number, enemyId: EnemyId, hpOverride?: number) {
    super(scene, x, y, ENEMIES[enemyId].sheet, 0);
    this.enemyId = enemyId;
    this.def = ENEMIES[enemyId];
    this.isBoss = !!this.def.isBoss;
    this.maxHealth = hpOverride ?? this.def.health;
    this.health = this.maxHealth;

    scene.add.existing(this);
    scene.physics.add.existing(this);
    // opt into the real-light pipeline when the scene runs enhanced graphics
    if ((scene as unknown as { lightingOn?: boolean }).lightingOn) this.setLighting(true);
    this.setOrigin(0.5, 0.82);
    // Enemies default to 200%; heroes use the global 150% slider independently.
    const scale =
      (this.def.scale ?? 1) *
      ENEMY_SPRITE_BASE *
      ENEMY_SCALE_DEFAULT *
      (settings.spriteScale() / SPRITE_SCALE_DEFAULT);
    this.baseScale = scale;
    this.setScale(scale);
    const body = this.body as ArcadeBody;
    const bw = this.width * 0.42;
    const bh = this.height * 0.4;
    body.setSize(bw, bh);
    body.setOffset((this.width - bw) / 2, this.height * 0.42);
    this.setDepth(y);
    this.hpBar = scene.add.graphics();
    this.play(`${enemyId}-walk`);
    if (this.isBoss) this.setTint(0xffffff);
  }

  healthRatio(): number {
    return Phaser.Math.Clamp(this.health / this.maxHealth, 0, 1);
  }

  /**
   * Permanently resize this monster (elite promotion, boss phase 2).
   *
   * tick() rewrites scaleX/scaleY every frame from `baseScale` to drive the idle
   * breathe, so callers must go through here — a bare setScale() would be undone
   * on the very next frame.
   */
  scaleBy(mult: number): void {
    this.baseScale *= mult;
    this.setScale(this.baseScale);
  }

  /**
   * Attach a standing aura: a rune sigil rotating on the ground plus motes
   * orbiting the body.
   *
   * Elites used to be signalled by a gold tint alone, which is invisible against
   * a gold realm and reads as a status effect everywhere else. A ring on the
   * FLOOR is unambiguous, survives any palette, and — because it's drawn beneath
   * the sprite — tells you the danger radius before the thing is even in reach.
   *
   * Owned by the monster so it tracks and dies with it; nothing else has to
   * remember it exists.
   */
  attachAura(tint: number, radius = 1, motes = 4): void {
    if (this.auraRing) return;
    this.auraTint = tint;
    if (this.scene.textures.exists('fx-sigil')) {
      this.auraRing = this.scene.add
        .sprite(this.x, this.y, 'fx-sigil')
        .setScale(radius)
        .setAlpha(0.6)
        .setTint(tint)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(this.y - 4);
      this.auraRing.play('fx-sigil');
    }
    for (let i = 0; i < motes; i++) {
      const m = this.scene.add
        .image(this.x, this.y, 'fx-glow-white')
        .setScale(0.55)
        .setAlpha(0.85)
        .setTint(tint)
        .setBlendMode(Phaser.BlendModes.ADD);
      m.setData('phase', (i / motes) * Math.PI * 2);
      this.auraMotes.push(m);
    }
  }

  /** Keep the aura glued to the body and spin the motes. Called from tick(). */
  private updateAura(time: number): void {
    if (!this.auraRing && !this.auraMotes.length) return;
    const rad = this.displayWidth * 0.42;
    if (this.auraRing) {
      this.auraRing.setPosition(this.x, this.y + 2).setDepth(this.y - 4);
      // breathe the ring so a stationary elite still moves
      this.auraRing.setAlpha(0.45 + Math.sin(time * 0.004 + this.idlePhase) * 0.16);
    }
    for (const m of this.auraMotes) {
      const ph = (m.getData('phase') as number) + time * 0.0022;
      // Orbit on a squashed ellipse and depth-sort front/back, so the motes
      // visibly pass BEHIND the monster on the far half of the circle.
      const front = Math.sin(ph) > 0;
      m.setPosition(this.x + Math.cos(ph) * rad, this.y - this.displayHeight * 0.28 + Math.sin(ph) * rad * 0.34);
      m.setDepth(this.y + (front ? 6 : -6));
      m.setAlpha(front ? 0.9 : 0.4);
      m.setScale(0.5 + (front ? 0.18 : 0));
    }
  }

  private destroyAura(): void {
    this.auraRing?.destroy();
    this.auraRing = undefined;
    for (const m of this.auraMotes) m.destroy();
    this.auraMotes.length = 0;
  }

  /** The aura and HP bar are separate objects, so they have to be cleaned up on
   *  every teardown path — not just death (scene shutdown destroys sprites
   *  directly, which would otherwise leave the ring and motes orphaned). */
  destroy(fromScene?: boolean): void {
    this.destroyAura();
    this.hpBar?.destroy();
    this.hpBar = undefined;
    super.destroy(fromScene);
  }

  /** The scene's juice system, if this monster lives in a scene that has one. */
  private fx(): Vfx | undefined {
    return (this.scene as unknown as { vfx?: Vfx })?.vfx;
  }

  /** This creature's viscera colour, or undefined for bloodless things. */
  private goreTint(): number | undefined {
    return MONSTER_GORE[this.enemyId];
  }

  /** Small floating HP meter pinned above the monster's head — arcade chip style. */
  private drawHpBar(): void {
    if (!this.hpBar) return;
    const ratio = this.healthRatio();
    const w = Phaser.Math.Clamp(this.displayWidth * 0.55, 16, 64);
    const h = this.isBoss ? 6 : 4;
    const x = this.x - w / 2;
    const y = this.y - this.displayHeight * 0.82 - 8;
    const col = ratio > 0.5 ? 0x3dff6a : ratio > 0.25 ? 0xffd020 : 0xff3a3a;

    // Trailing damage ghost: the real bar snaps, a pale sliver behind it drains
    // over ~0.4s. It turns "I hit it" into "I hit it THIS hard" without a number.
    const now = this.scene.time.now;
    if (ratio > this.lagHp) this.lagHp = ratio;
    else this.lagHp = Math.max(ratio, this.lagHp - (now - this.lagAt) / 420);
    this.lagAt = now;

    this.hpBar
      .clear()
      .setVisible(true)
      .setDepth(this.y + 20)
      .fillStyle(0x000000, 0.78)
      .fillRect(x - 1, y - 1, w + 2, h + 2)
      .lineStyle(1, this.isBoss ? 0xffd24a : 0x8a6418, this.isBoss ? 0.95 : 0.7)
      .strokeRect(x - 1, y - 1, w + 2, h + 2);
    if (this.lagHp > ratio + 0.004) {
      this.hpBar.fillStyle(0xff8a8a, 0.8).fillRect(x + w * ratio, y, w * (this.lagHp - ratio), h);
    }
    this.hpBar.fillStyle(col, 1).fillRect(x, y, w * ratio, h);
    if (ratio > 0.02 && h >= 3) {
      this.hpBar.fillStyle(0xffffff, 0.35).fillRect(x, y, w * ratio, 1);
      this.hpBar.fillStyle(0x000000, 0.22).fillRect(x, y + h - 1, w * ratio, 1);
    }
    // Bosses get a phase pip at the halfway mark so the turn is telegraphed.
    if (this.isBoss) {
      this.hpBar.fillStyle(this.phase2 ? 0xff5a3a : 0xffd24a, 0.9).fillRect(x + w / 2 - 1, y - 1, 2, h + 2);
    }
  }

  tick(time: number, delta: number, heroes: Hero[]): void {
    if (!this.alive) return;
    this.drawHpBar();
    this.updateAura(time);
    const body = this.body as ArcadeBody;

    // knockback overrides movement for a brief window
    if (time < this.knockUntil) {
      const k = (this.knockUntil - time) / 150;
      body.setVelocity(this.knockVx * k, this.knockVy * k);
      this.setDepth(this.y);
      return;
    }

    // burn damage-over-time
    if (time < this.burnUntil && time >= this.burnTickAt) {
      this.burnTickAt = time + 380;
      this.health -= this.burnDmg;
      const f = this.scene.add.image(this.x, this.y - 6, 'fx-glow-warm').setTint(0xff8a1e).setDepth(this.y + 9).setScale(0.7).setBlendMode(Phaser.BlendModes.ADD);
      this.scene.tweens.add({ targets: f, alpha: 0, y: this.y - 14, duration: 300, onComplete: () => f.destroy() });
      if (this.health <= 0) {
        this.die();
        return;
      }
    }
    // bleed damage-over-time (physical — dark red motes)
    if (time < this.bleedUntil && time >= this.bleedTickAt) {
      this.bleedTickAt = time + 500;
      this.health -= this.bleedDmg;
      const f = this.scene.add.image(this.x, this.y - 4, 'fx-hit').setTint(0xd11f2a).setDepth(this.y + 9).setScale(0.5);
      this.scene.tweens.add({ targets: f, alpha: 0, y: this.y + 2, duration: 320, onComplete: () => f.destroy() });
      if (this.health <= 0) {
        this.die();
        return;
      }
    }
    // poison damage-over-time (corrosive green)
    if (time < this.poisonUntil && time >= this.poisonTickAt) {
      this.poisonTickAt = time + 440;
      this.health -= this.poisonDmg;
      const f = this.scene.add.image(this.x, this.y - 6, 'fx-glow-green').setTint(0x8ef06a).setDepth(this.y + 9).setScale(0.6).setBlendMode(Phaser.BlendModes.ADD);
      this.scene.tweens.add({ targets: f, alpha: 0, y: this.y - 14, duration: 320, onComplete: () => f.destroy() });
      if (this.health <= 0) {
        this.die();
        return;
      }
    }

    // nearest alive hero — unless a taunt drags this foe's gaze to one hero
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
    if (time < this.tauntUntil && this.tauntBy && this.tauntBy.alive && this.tauntBy.active) {
      target = this.tauntBy;
      best = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);
    }

    if (this.attacking && time > this.attackUntil) {
      this.attacking = false;
      this.play(`${this.enemyId}-walk`, true);
    }

    const beh: EnemyBehavior = this.def.behavior ?? 'melee';
    const stunned = time < this.stunUntil;
    const feared = time < this.fearUntil;
    if (stunned) {
      // hard crowd control: frozen in place, cannot act
      body.setVelocity(0, 0);
      this.telegraphUntil = 0;
      this.pendingSpecial = null;
    } else if (feared && target) {
      // panic: sprint directly away from the nearest hero, no attacks
      const fx = this.x - target.x;
      const fy = this.y - target.y;
      const fl = Math.hypot(fx, fy) || 1;
      body.setVelocity((fx / fl) * this.def.speed, (fy / fl) * this.def.speed);
      this.setFlipX(target.x - this.x < 0);
    } else if (target && best <= this.def.chaseRange) {
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

    // root pins the foe in place but still lets it strike a hero within reach
    if (!stunned && time < this.rootUntil) body.setVelocity(0, 0);
    // chill slows movement
    if (time < this.chillUntil) body.setVelocity(body.velocity.x * 0.5, body.velocity.y * 0.5);

    // boss slow self-regen to make the fight a real gate
    if (this.isBoss && this.health < this.maxHealth) {
      this.healAcc += (delta / 1000) * 3;
      if (this.healAcc >= 1) {
        this.health = Math.min(this.maxHealth, this.health + Math.floor(this.healAcc));
        this.healAcc -= Math.floor(this.healAcc);
      }
    }

    this.setAlpha(this.enemyId === 'ghost' ? 0.92 : 1);

    // Tint priority, loudest first. The hurt flash is a *fill* (solid white
    // silhouette) rather than a multiply — it's the single clearest "that hit
    // registered" signal available without a custom shader, and it beats the old
    // alpha dip because it reads even against a bright floor.
    if (time < this.flashUntil) {
      this.setTint(0xffffff).setTintMode(TINT_FILL);
    } else {
      // Phaser 4 keeps tint colour and tint mode separate, so leaving the flash
      // means explicitly restoring MULTIPLY — otherwise the sprite stays a solid
      // silhouette forever.
      this.setTintMode(TINT_MULTIPLY);
      if (time < this.telegraphUntil) {
        // wind-up pulses so a telegraph can't be mistaken for a status tint
        const k = Math.sin(time * 0.045) * 0.5 + 0.5;
        this.setTint(k > 0.5 ? 0xffd0a0 : 0xff7a3a);
      } else if (time < this.stunUntil) this.setTint(0xfff3b0);
      else if (time < this.poisonUntil) this.setTint(0x9be36a);
      else if (time < this.burnUntil) this.setTint(0xff8a4a);
      else if (time < this.chillUntil) this.setTint(0x9fd0ff);
      else if (time < this.fearUntil) this.setTint(0xc9a6ff);
      else if (this.isElite) this.setTint(0xffe08a);
      else if (this.isBoss) this.setTint(0xffffff);
      else this.clearTint();
    }

    // Secondary motion: a slow breath on the idle, and a squash-and-stretch that
    // leans into the direction of travel. Costs nothing and stops a standing
    // pack from looking like a row of decals.
    const spd = Math.hypot(body.velocity.x, body.velocity.y);
    const breathe = Math.sin(time * 0.004 + this.idlePhase) * 0.012;
    const lean = Math.min(0.05, spd * 0.00035);
    this.setScale(this.baseScale * (1 - breathe - lean * 0.5), this.baseScale * (1 + breathe + lean));

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
        target.takeDamage(Math.round(this.def.damage * this.dmgMult), time);
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
    const p2 = this.phase2 ? BOSS_PHASE2[this.enemyId] : undefined;
    if (time >= this.nextSpecialAt && best <= this.def.chaseRange) {
      this.nextSpecialAt = time + (this.def.specialCooldown ?? 4000) * (p2?.cdMult ?? 1);
      const r = Math.random();
      this.attacking = true;
      this.attackUntil = time + 520;
      this.play(`${this.enemyId}-attack`, true);
      body.setVelocity(0, 0);
      if (hr < 0.4 && (best < 150 || r < 0.45)) {
        this.telegraphUntil = time + 520;
        this.pendingSpecial = 'nova';
      } else if (this.def.summons && hr < 0.7 && r < 0.5 + (p2?.addBias ?? 0)) {
        this.telegraphUntil = time + 460;
        this.pendingSpecial = 'summon';
      } else {
        this.telegraphUntil = time + 440;
        this.pendingSpecial = 'volley';
      }
      return;
    }

    const spd = this.def.speed * (p2?.speedMult ?? 1);
    if (best > this.def.attackRange) {
      body.setVelocity(ux * spd, uy * spd);
    } else {
      body.setVelocity(0, 0);
      if (time >= this.nextAttackAt) this.strike(target, time);
    }
  }

  private fireVolley(): void {
    const n = (this.phase2 ? BOSS_PHASE2[this.enemyId]?.volleyShots : undefined) ?? 10;
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
    const dealt = target.takeDamage(Math.round(this.def.damage * this.dmgMult), time);
    if (this.isBoss && dealt > 0) this.health = Math.min(this.maxHealth, this.health + 6);
  }

  /** Apply an on-hit / ability status. `mag` tunes the scaling variants:
   *  burn/bleed/poison = damage per tick, vuln = damage-taken multiplier.
   *  Hard CC (stun/root/fear) is downgraded on bosses so they never lock. */
  applyStatus(type: MonsterStatus, dur: number, time: number, mag = 0): void {
    switch (type) {
      case 'burn':
        this.burnUntil = Math.max(this.burnUntil, time + dur);
        if (mag > 0) this.burnDmg = mag;
        break;
      case 'chill':
        this.chillUntil = Math.max(this.chillUntil, time + dur);
        break;
      case 'shock':
        this.shockUntil = Math.max(this.shockUntil, time + dur);
        break;
      case 'stun':
        // bosses shrug off a stun into a heavy chill instead of freezing
        if (this.isBoss) this.chillUntil = Math.max(this.chillUntil, time + dur);
        else this.stunUntil = Math.max(this.stunUntil, time + dur);
        break;
      case 'root':
        if (!this.isBoss) this.rootUntil = Math.max(this.rootUntil, time + dur);
        break;
      case 'vuln':
        this.vulnUntil = Math.max(this.vulnUntil, time + dur);
        if (mag > 0) this.vulnMult = mag;
        break;
      case 'bleed':
        this.bleedUntil = Math.max(this.bleedUntil, time + dur);
        if (mag > 0) this.bleedDmg = mag;
        break;
      case 'poison':
        this.poisonUntil = Math.max(this.poisonUntil, time + dur);
        if (mag > 0) this.poisonDmg = mag;
        break;
      case 'fear':
        if (!this.isBoss) this.fearUntil = Math.max(this.fearUntil, time + dur);
        break;
    }
  }

  /** Force this foe to fixate on one hero (Vanguard Battle Roar). Bosses ignore. */
  taunt(by: Hero, dur: number, time: number): void {
    if (this.isBoss) return;
    this.tauntBy = by;
    this.tauntUntil = Math.max(this.tauntUntil, time + dur);
  }

  /** Shove the monster with a brief, decaying impulse. */
  knock(vx: number, vy: number, time: number): void {
    if (this.isBoss) return; // bosses stand firm
    this.knockVx = vx;
    this.knockVy = vy;
    this.knockUntil = time + 150;
  }

  takeDamage(raw: number, time: number): boolean {
    if (!this.alive) return false;
    if (time < this.shockUntil) raw *= 1.3; // shocked enemies take more
    if (time < this.vulnUntil) raw *= this.vulnMult; // marked / vulnerable foes take even more
    const actual = Math.max(1, Math.round(raw - (this.def.armor + this.armorBonus) * 0.5));
    this.health -= actual;
    this.hurtUntil = time + 120;
    this.flashUntil = time + 90;
    this.setTint(0xffffff).setTintMode(TINT_FILL);
    audio.sfx('hit');
    // A hit shoves the sprite back along the blow and snaps it home — the recoil
    // is what makes damage feel transferred rather than merely subtracted.
    const fx = this.fx();
    if (fx) {
      fx.sparks(this.x, this.y - 6, 3, 0xfff0c0, 110);
      const g = this.goreTint();
      if (g !== undefined) fx.glow(this.x, this.y - 6, { tint: g, scale: 0.5, life: 0.16 });
    } else {
      const hit = this.scene.add.image(this.x, this.y - 6, 'fx-hit').setDepth(this.y + 10);
      this.scene.tweens.add({ targets: hit, alpha: 0, scale: 1.6, duration: 160, onComplete: () => hit.destroy() });
    }
    if (this.health <= 0) {
      this.die();
      return true;
    }
    // realm wardens turn the fight at half health
    if (this.isBoss && !this.phase2 && this.health <= this.maxHealth / 2) {
      this.phase2 = true;
      this.onPhase2?.(this);
    }
    return false;
  }

  private die(): void {
    if (!this.alive) return;
    this.alive = false;
    this.hpBar?.destroy();
    this.hpBar = undefined;
    // The aura outlives nothing: an orphaned ring spinning over a corpse is the
    // classic "ghost object" bug, so tear it down on the same frame.
    this.destroyAura();
    const body = this.body as ArcadeBody;
    body.setVelocity(0, 0);
    body.enable = false;
    audio.sfx(this.isBoss ? 'boss_roar' : 'monster_die');
    if (this.onDeath) this.onDeath(this);

    // Death is a two-beat move: a brief white-hot blowout, then the collapse.
    // Splitting it means the eye registers *which* thing died before the sprite
    // stops being readable.
    this.setTint(0xffffff).setTintMode(TINT_FILL);
    const deathTint = DEATH_TINT[this.enemyId] ?? (this.goreTint() ?? 0xdfe6ff);
    const fx = this.fx();
    fx?.death(this.x, this.y, {
      tint: deathTint,
      scale: this.isBoss ? 2 : 1,
      boss: this.isBoss,
      soul: this.goreTint() === undefined,
    });
    // Leave a mark. Fleshy things pool, bloodless things scorch — and a warden
    // cracks the floor it fell on.
    fx?.deathDecal(this.x, this.y, this.goreTint(), deathTint);
    if (this.isBoss) fx?.decal(this.x, this.y + 4, 'crack', { scale: 2.4, alpha: 0.7 });
    this.scene.tweens.add({
      targets: this,
      scaleX: this.scaleX * 1.25,
      scaleY: this.scaleY * 1.25,
      duration: 70,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.setTintMode(TINT_MULTIPLY);
        this.clearTint();
        this.scene?.tweens.add({
          targets: this,
          alpha: 0,
          scaleX: this.scaleX * 1.15,
          scaleY: this.scaleY * 0.3,
          angle: Phaser.Math.Between(-60, 60),
          duration: this.isBoss ? 520 : 300,
          ease: 'Quad.easeIn',
          onComplete: () => this.destroy(),
        });
      },
    });
  }
}
