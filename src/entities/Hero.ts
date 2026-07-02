import Phaser from 'phaser';
import type { HeroClassDef, HeroClassId, Direction, StatBlock } from '../core/types';
import { HEROES } from '../data/heroes';
import { settings } from '../core/GameSettings';
import { SkillSet } from '../systems/SkillSystem';
import { AttributeSet } from '../systems/AttributeSystem';
import { Inventory } from '../systems/InventorySystem';
import { computeStats, xpToNext } from '../systems/StatsSystem';
import { ARMOR_SETS, applySetBonuses, countSetPieces } from '../data/setItems';
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
  /** Optional monster-style skin (non-directional walk/attack anims) for summoned allies. */
  skin?: { walk: string; attack: string };
  // use-leveled rogue/social skills (Charisma via trade, Sneak + Lockpick via use)
  charisma = 0;
  sneakLevel = 0;
  lockpickLevel = 0;
  pickpocketLevel = 0;
  sneaking = false;
  spottedUntil = 0;
  /** Earliest time (ms) the next strike may count as a backstab; falls with Sneak. */
  backstabReadyAt = 0;
  private charismaXP = 0;
  private sneakXP = 0;
  private lockpickXP = 0;
  private pickpocketXP = 0;

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
  auraSpeedBonus = 0;

  /** Bard: the song currently ringing (null = silent). */
  song: 'war' | 'march' | 'hymn' | 'dirge' | null = null;
  /** Druid: true while shifted into Bear form. */
  bearForm = false;
  /** Druid: earliest time the next shapeshift is allowed (short breath between). */
  nextShiftAt = 0;

  /** Equipped pieces of this class's armor set (drives 2/4/5 tier bonuses). */
  setPieces = 0;
  /** Vanguard 5-piece: next time the Undying Bulwark can trigger. */
  private undyingReadyAt = 0;
  /** Scene hook fired when the Undying Bulwark saves this hero. */
  onUndying?: (h: Hero) => void;
  /** Scene hook fired whenever this hero takes real damage (unique powers). */
  onDamaged?: (h: Hero, dmg: number) => void;

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
    // opt into the real-light pipeline when the scene runs enhanced graphics
    if ((scene as unknown as { lightingOn?: boolean }).lightingOn) this.setLighting(true);
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
    // class armor set: count equipped pieces, then fold in the 2/4/5 tier bonuses
    this.setPieces = countSetPieces(this.inventory.equippedList(), ARMOR_SETS[this.classId].id);
    applySetBonuses(this.stats, this.classId, this.setPieces);
    // Druid Bear form: trade the caster's poise for tooth and hide. Savage
    // Fangs ranks and the Wildheart set power deepen the bear further.
    if (this.classId === 'druid' && this.bearForm) {
      const fangs = 1.4 + this.skillSet.rank('dru_fangs') * 0.08 + (this.hasSetPower() ? 0.25 : 0);
      this.stats.maxHealth = Math.round(this.stats.maxHealth * 1.5);
      this.stats.damage = Math.round(this.stats.damage * fangs);
      this.stats.armor += 4;
      this.stats.speed = Math.round(this.stats.speed * 0.95);
    }
    if (this.health !== undefined) this.health = Math.min(this.health, this.stats.maxHealth);
    if (this.mana !== undefined) this.mana = Math.min(this.mana, this.stats.maxMana);
    return this.stats;
  }

  /** True when the full 5-piece class set is worn (unlocks the set power). */
  hasSetPower(): boolean {
    return this.setPieces >= 5;
  }

  /** True when a unique legendary with the given power id is equipped. */
  hasUniquePower(power: string): boolean {
    return this.inventory.equippedList().some((it) => it.unique === power);
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
    const spd = (this.stats.speed + this.auraSpeedBonus) * this.speedMult;
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
    if (this.skin) {
      // Monster-style sheet: single walk/attack clip, mirrored by facing.
      this.setFlipX(this.facing === 'left');
      const key = this.attacking ? this.skin.attack : this.skin.walk;
      if (this.anims.currentAnim?.key !== key) this.play(key, true);
      return;
    }
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
    if (this.sneaking && this.alive) this.setAlpha(0.4); // melt into shadow

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
    const base: Record<HeroClassId, number> = { vanguard: 24, thief: 30, arcanist: 24, warden: 26, necromancer: 40, bard: 30, druid: 24 };
    const cleave = this.classId === 'vanguard' ? this.skillSet.rank('van_cleave') * 4 : 0;
    if (this.classId === 'druid' && this.bearForm) return 34; // a bear's mauling sweep
    return base[this.classId] + cleave;
  }

  attackCooldown(): number {
    return Math.max(170, 360 - this.level * 5 - (this.classId === 'thief' ? 60 : 0));
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
    } else if (this.classId === 'thief') {
      // quick dagger thrust — a thin, fast forward stab
      fx.setScale(1.0, 1.9).setTint(0xcfe0ff);
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
    if (this.classId === 'druid') return this.bearForm ? 'melee' : 'ranged';
    return this.classId === 'arcanist' || this.classId === 'necromancer' ? 'ranged' : 'melee';
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

  /** Grant a brief window of untouchability (Nightveil Cowl, scripted saves). */
  grantIframes(time: number, dur: number): void {
    this.hurtUntil = Math.max(this.hurtUntil, time + dur);
  }

  /** Druid: toggle Bear form. Preserves the current health FRACTION across the
   *  max-health change so shifting is never a free heal — except the Wildheart
   *  set power, which mends a quarter of the new maximum on every shift. */
  shapeshift(time: number): boolean {
    if (this.classId !== 'druid' || !this.alive || time < this.nextShiftAt) return false;
    this.nextShiftAt = time + 900;
    const frac = this.healthRatio();
    this.applyForm(!this.bearForm);
    this.health = Math.max(1, Math.round(this.stats.maxHealth * frac));
    if (this.hasSetPower()) this.heal(Math.round(this.stats.maxHealth * 0.25));
    audio.sfx('hit');
    return true;
  }

  /** Apply bear/human form visuals + stats directly (shapeshift, level carry,
   *  save load) — no cooldown, sfx or Wildheart heal. */
  applyForm(bear: boolean): void {
    if (this.classId !== 'druid') return;
    this.bearForm = bear;
    if (bear) {
      this.skin = { walk: 'druid_bear-walk', attack: 'druid_bear-attack' };
      this.setTexture('druid-bear-sheet', 0);
    } else {
      this.skin = undefined;
      this.setTexture('hero-druid-sheet', 0);
    }
    this.recompute();
  }

  // ---- active class ability ----
  abilityCooldown(): number {
    return Math.round(7000 * (1 - (this.stats.cdr ?? 0)));
  }

  /** Necromancer servant cap: starts at 2, grows to 5 with level, + summon affixes. */
  maxSummons(): number {
    return Math.min(5, 2 + Math.floor((this.level - 1) / 3)) + (this.stats.summonBonus ?? 0);
  }

  /** Use-based progression — returns true on a level-up. */
  gainCharisma(n: number): boolean {
    this.charismaXP += n;
    if (this.charismaXP >= (this.charisma + 1) * 2) { this.charismaXP = 0; this.charisma++; return true; }
    return false;
  }
  gainSneak(n: number): boolean {
    this.sneakXP += n;
    if (this.sneakXP >= (this.sneakLevel + 1) * 6) { this.sneakXP = 0; this.sneakLevel++; return true; }
    return false;
  }
  gainLockpick(n: number): boolean {
    this.lockpickXP += n;
    if (this.lockpickXP >= (this.lockpickLevel + 1) * 3) { this.lockpickXP = 0; this.lockpickLevel++; return true; }
    return false;
  }
  gainPickpocket(n: number): boolean {
    this.pickpocketXP += n;
    if (this.pickpocketXP >= (this.pickpocketLevel + 1) * 3) { this.pickpocketXP = 0; this.pickpocketLevel++; return true; }
    return false;
  }
  /** Backstab recharge in ms — shrinks as Sneak grows (3.5s → 0.8s floor);
   *  the Shadowmaster set power halves it again. */
  backstabCooldown(): number {
    const base = Math.max(800, 3500 - this.sneakLevel * 200);
    return this.classId === 'thief' && this.hasSetPower() ? Math.round(base * 0.5) : base;
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
    this.onDamaged?.(this, actual);
    this.scene.tweens.add({ targets: this, x: this.x + Phaser.Math.Between(-2, 2), duration: 40, yoyo: true, repeat: 2 });
    if (this.health <= 0) {
      // Undying Bulwark (vanguard 5-piece): shrug off one killing blow per 90s.
      if (this.classId === 'vanguard' && this.hasSetPower() && time >= this.undyingReadyAt) {
        this.undyingReadyAt = time + 90000;
        this.health = 1;
        this.hurtUntil = time + 1600; // a breath of invulnerability to escape
        this.onUndying?.(this);
        return actual;
      }
      this.die();
    }
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
