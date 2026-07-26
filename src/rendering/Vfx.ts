import Phaser from 'phaser';
import { settings } from '../core/GameSettings';
import { DEPTH } from '../core/constants';

// ----------------------------------------------------------------------------
// Vfx — StrongBow's juice system.
//
// One instance per gameplay scene. Everything that makes an action *feel* like
// it landed lives here: impacts, debris, hit-stop, screen trauma, trails, death
// bursts, pickups, level-ups, boss transitions.
//
// Two design decisions worth knowing before editing:
//
//  1. PARTICLES ARE HAND-POOLED, NOT TWEENED. A burst of debris spawns plain
//     Images from a free-list and is integrated in update(). No tween objects,
//     no per-particle allocation, no GC sawtooth mid-fight — and it buys real
//     motion (gravity, drag, ground settle, spin) that a scale/alpha tween
//     cannot express. Total live particles are capped; the oldest is recycled.
//
//  2. SHAKE IS TRAUMA, NOT EVENTS. Callers request trauma; the camera shake is
//     derived from the accumulated value and decays. Ten hits in a second give a
//     sustained rumble instead of ten restarted, stacking shakes — and the cap
//     means a screenful of explosions still can't induce motion sickness.
//
// See docs/ART_DIRECTION.md, principle 7.
// ----------------------------------------------------------------------------

/** One pooled particle. Plain data — no tweens, integrated by hand in update(). */
interface Mote {
  img: Phaser.GameObjects.Image;
  key: string;
  vx: number;
  vy: number;
  /** Downward pull in px/s². Negative floats the mote upward (embers, souls). */
  grav: number;
  /** Per-second velocity retention (0.02 = heavy air, 1 = frictionless). */
  drag: number;
  life: number;
  maxLife: number;
  spin: number;
  scale0: number;
  scale1: number;
  alpha0: number;
  alpha1: number;
  /** Depth is (spawnY + bias) so FX sort correctly against world sprites. */
  bias: number;
  /** Motes with settle>0 stop dead when their life crosses that fraction — the
   *  "debris lands on the floor" beat that makes a hit feel physical. */
  settle: number;
  born: number;
}

export interface ImpactOptions {
  /** Unit direction the blow travelled — drives the spray cone. */
  dirX?: number;
  dirY?: number;
  crit?: boolean;
  /** Tint for sparks/flash. Defaults to hot white. */
  tint?: number;
  /** 0.5 = glancing, 1 = normal, 2 = siege. Scales every sub-effect at once. */
  power?: number;
  /** Colour of ejected viscera; omit for a purely metallic spark hit. */
  gore?: number;
  /** Suppress the ground shockwave (used for rapid multi-hits). */
  noRing?: boolean;
}

export interface DeathOptions {
  tint?: number;
  scale?: number;
  boss?: boolean;
  /** Emit a rising soul wisp (undead / spirits). */
  soul?: boolean;
}

export interface SlashOptions {
  tint?: number;
  /** Arc length along the swing. */
  scale?: number;
  /** Arc thickness across the swing (1 = square, <1 = a flatter, faster-looking cut). */
  scaleY?: number;
  /** Animation playback rate. <1 = heavy and lingering, >1 = a quick flick. */
  speed?: number;
}

/** How each weapon family swings. Keyed by Hero.swingKind(). */
interface SwingProfile {
  scale: number;
  scaleY: number;
  speed: number;
  /** ms before a trailing echo arc; 0 = none. Sells weight on heavy weapons. */
  echo: number;
  /** How far the echo arc rotates past the first. */
  echoTurn: number;
  /** Dust motes kicked up along the arc. */
  grit: number;
  /** >1 draws this many thin parallel arcs instead of one (claws). */
  rakes?: number;
}

const SWING: Record<string, SwingProfile> = {
  // quick and small — the arc is gone before you finish reading it
  dagger: { scale: 0.62, scaleY: 0.72, speed: 1.75, echo: 0, echoTurn: 0, grit: 0 },
  // the neutral reference every other profile is tuned against
  sword: { scale: 1.0, scaleY: 0.9, speed: 1.15, echo: 0, echoTurn: 0, grit: 2 },
  greatsword: { scale: 1.3, scaleY: 1.0, speed: 0.8, echo: 58, echoTurn: 0.24, grit: 6 },
  // heavy overhead: slow, thick, with a trailing echo and real dust
  mace: { scale: 1.18, scaleY: 1.05, speed: 0.72, echo: 55, echoTurn: 0.22, grit: 6 },
  maul: { scale: 1.38, scaleY: 1.12, speed: 0.58, echo: 72, echoTurn: 0.28, grit: 10 },
  axe: { scale: 1.22, scaleY: 1.0, speed: 0.78, echo: 60, echoTurn: 0.3, grit: 7 },
  // long and light: covers ground without feeling weighty
  staff: { scale: 1.12, scaleY: 0.62, speed: 1.05, echo: 0, echoTurn: 0, grit: 1 },
  // a thrust, not a sweep: long and very flat
  spear: { scale: 1.3, scaleY: 0.34, speed: 1.4, echo: 0, echoTurn: 0, grit: 1 },
  // the widest cut in the game — the Deathlord's reaping sweep, curling backward
  scythe: { scale: 1.48, scaleY: 0.88, speed: 0.85, echo: 62, echoTurn: -0.34, grit: 5 },
  // bear form: three parallel rakes instead of one arc
  claw: { scale: 1.0, scaleY: 0.5, speed: 1.5, echo: 0, echoTurn: 0, grit: 3, rakes: 3 },
  default: { scale: 1.0, scaleY: 0.9, speed: 1.15, echo: 0, echoTurn: 0, grit: 2 },
};

export type DecalKind = 'blood' | 'scorch' | 'frost' | 'void' | 'crack';

const MAX_MOTES = 420;
/** Live floor decals. Past this the oldest fades out — a battlefield, not a leak. */
const MAX_DECALS = 56;

export class Vfx {
  private scene: Phaser.Scene;
  private live: Mote[] = [];
  private free = new Map<string, Phaser.GameObjects.Image[]>();
  /** Persistent floor decals, oldest first. */
  private decals: Phaser.GameObjects.Image[] = [];

  /** 0..1 camera trauma; shake amplitude is trauma² so small hits stay subtle. */
  private trauma = 0;
  private traumaCap = 1;
  /** True while this system owns the camera's shake effect. */
  private shaking = false;

  /** Remaining real-time ms of hit-stop. */
  private stopMs = 0;
  private stopStrength = 1;

  /** Base zoom to return to after a punch. */
  private baseZoom = 1;
  private zoomPunchMs = 0;
  private zoomPunchAmt = 0;

  /** Cheap mode: half the particles, no bloom layers, no zoom punch. */
  private rich = true;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.rich = settings.get('enhancedGraphics') !== false;
    this.baseZoom = scene.cameras.main.zoom || 1;
  }

  /** Re-read the graphics quality setting (call after the options menu closes). */
  refreshQuality(): void {
    this.rich = settings.get('enhancedGraphics') !== false;
  }

  setBaseZoom(z: number): void {
    this.baseZoom = z;
  }

  // ==========================================================================
  // Core loop
  // ==========================================================================

  update(delta: number): void {
    const dt = Math.min(delta, 50) / 1000; // clamp so an alt-tab can't launch debris
    this.stepMotes(dt);
    this.stepTrauma(dt);
    this.stepTimeEffects(delta);
  }

  private stepMotes(dt: number): void {
    for (let i = this.live.length - 1; i >= 0; i--) {
      const m = this.live[i];
      m.life -= dt;
      if (m.life <= 0) {
        this.retire(i);
        continue;
      }
      const t = 1 - m.life / m.maxLife; // 0 at birth -> 1 at death
      const settled = m.settle > 0 && t >= m.settle;
      if (!settled) {
        m.vy += m.grav * dt;
        const k = Math.pow(m.drag, dt);
        m.vx *= k;
        m.vy *= k;
        m.img.x += m.vx * dt;
        m.img.y += m.vy * dt;
        if (m.spin) m.img.rotation += m.spin * dt;
      }
      m.img.setAlpha(m.alpha0 + (m.alpha1 - m.alpha0) * t);
      const s = m.scale0 + (m.scale1 - m.scale0) * t;
      m.img.setScale(s);
      m.img.setDepth(m.img.y + m.bias);
    }
  }

  private stepTrauma(dt: number): void {
    const cam = this.scene.cameras.main;
    const shake = cam.shakeEffect;
    if (this.trauma <= 0) {
      // effectComplete() (not reset()) is what restores the camera's scroll
      // offset — reset leaves the last random nudge baked in.
      if (this.shaking && shake?.isRunning) shake.effectComplete();
      this.shaking = false;
      return;
    }
    this.trauma = Math.max(0, this.trauma - dt * 1.9);
    const amp = this.trauma * this.trauma * 0.016 * this.traumaCap;
    if (amp < 0.00025) {
      this.trauma = 0;
      if (this.shaking && shake?.isRunning) shake.effectComplete();
      this.shaking = false;
      return;
    }
    // Phaser exposes shake intensity as a live Vector2, so one long-running
    // shake can be *modulated* by trauma instead of being restarted per hit.
    // That's the whole trick: ten hits blend into one decaying rumble.
    if (!shake?.isRunning) {
      cam.shake(600, amp, true);
      this.shaking = true;
    } else {
      shake.intensity.set(amp, amp);
      // keep it from ever completing on its own while trauma remains
      if (shake.progress > 0.8) cam.shake(600, amp, true);
    }
  }

  /**
   * Restore the world/animation time scales. Guarded because this also runs from
   * destroy(), which fires on SHUTDOWN *after* Phaser has torn the physics world
   * down — touching `physics.world.timeScale` there throws on a scene restart.
   */
  private resetTimeScales(): void {
    const world = this.scene.physics?.world;
    if (world) world.timeScale = 1;
    if (this.scene.anims) this.scene.anims.globalTimeScale = 1;
  }

  private stepTimeEffects(deltaMs: number): void {
    if (this.stopMs > 0) {
      this.stopMs -= deltaMs;
      if (this.stopMs <= 0) {
        this.stopMs = 0;
        this.resetTimeScales();
      }
    }
    if (this.zoomPunchMs > 0) {
      this.zoomPunchMs -= deltaMs;
      const cam = this.scene.cameras.main;
      if (this.zoomPunchMs <= 0) {
        this.zoomPunchMs = 0;
        cam.setZoom(this.baseZoom);
      } else {
        // ease back out over the punch window
        const k = this.zoomPunchMs / 120;
        cam.setZoom(this.baseZoom * (1 + this.zoomPunchAmt * Math.min(1, k)));
      }
    }
  }

  destroy(): void {
    for (const m of this.live) m.img.destroy();
    this.live.length = 0;
    for (const d of this.decals) d.destroy();
    this.decals.length = 0;
    for (const arr of this.free.values()) for (const img of arr) img.destroy();
    this.free.clear();
    this.stopMs = 0;
    this.trauma = 0;
    this.shaking = false;
    this.resetTimeScales();
  }

  // ==========================================================================
  // Camera & time
  // ==========================================================================

  /** Add camera trauma. 0.15 = a light hit, 0.4 = a heavy blow, 1 = boss death. */
  addTrauma(amount: number): void {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  /**
   * Freeze the world for a beat. Slows physics + animation on the *render* side
   * only — gameplay cooldowns run off absolute scene time and are untouched, so
   * hit-stop can never desync combat.
   */
  hitStop(ms: number, strength = 0.12): void {
    if (ms <= this.stopMs) return; // never shorten an in-flight stop
    this.stopMs = ms;
    this.stopStrength = strength;
    this.scene.physics.world.timeScale = 1 / Math.max(0.02, strength);
    this.scene.anims.globalTimeScale = strength;
  }

  /** A quick dolly-in on the moment of a crit or a boss kill. */
  zoomPunch(amount = 0.05, ms = 110): void {
    if (!this.rich) return;
    this.zoomPunchAmt = amount;
    this.zoomPunchMs = ms;
  }

  /**
   * A full-screen colour flash. Camera.flash() has no alpha parameter — its
   * overlay always fades 1 -> 0 — so `strength` is applied by darkening the
   * colour itself, which produces the same perceived intensity ramp.
   */
  flash(color = 0xffffff, ms = 120, strength = 0.5): void {
    const c = Phaser.Display.Color.IntegerToRGB(color);
    const k = Phaser.Math.Clamp(strength, 0, 1);
    this.scene.cameras.main.flash(ms, Math.round(c.r * k), Math.round(c.g * k), Math.round(c.b * k), true);
  }

  // ==========================================================================
  // Particle pool
  // ==========================================================================

  private take(key: string): Phaser.GameObjects.Image | null {
    if (!this.scene.textures.exists(key)) return null;
    const bucket = this.free.get(key);
    const img = bucket && bucket.length ? bucket.pop()! : this.scene.add.image(0, 0, key);
    img.setActive(true).setVisible(true).setRotation(0).setBlendMode(Phaser.BlendModes.NORMAL).clearTint();
    return img;
  }

  private retire(index: number): void {
    const m = this.live[index];
    this.live.splice(index, 1);
    m.img.setActive(false).setVisible(false);
    let bucket = this.free.get(m.key);
    if (!bucket) this.free.set(m.key, (bucket = []));
    if (bucket.length < 64) bucket.push(m.img);
    else m.img.destroy();
  }

  /** Spawn one pooled mote. Returns false if the texture is missing. */
  private emit(
    key: string,
    x: number,
    y: number,
    o: {
      vx?: number;
      vy?: number;
      grav?: number;
      drag?: number;
      life?: number;
      spin?: number;
      scale0?: number;
      scale1?: number;
      alpha0?: number;
      alpha1?: number;
      tint?: number;
      add?: boolean;
      bias?: number;
      settle?: number;
      rotation?: number;
    } = {}
  ): boolean {
    if (this.live.length >= MAX_MOTES) this.retire(0); // recycle the oldest
    const img = this.take(key);
    if (!img) return false;
    const life = o.life ?? 0.4;
    img.setPosition(x, y);
    if (o.tint !== undefined) img.setTint(o.tint);
    if (o.add) img.setBlendMode(Phaser.BlendModes.ADD);
    if (o.rotation !== undefined) img.setRotation(o.rotation);
    const s0 = o.scale0 ?? 1;
    img.setScale(s0).setAlpha(o.alpha0 ?? 1).setDepth(y + (o.bias ?? 8));
    this.live.push({
      img,
      key,
      vx: o.vx ?? 0,
      vy: o.vy ?? 0,
      grav: o.grav ?? 0,
      drag: o.drag ?? 0.25,
      life,
      maxLife: life,
      spin: o.spin ?? 0,
      scale0: s0,
      scale1: o.scale1 ?? s0,
      alpha0: o.alpha0 ?? 1,
      alpha1: o.alpha1 ?? 0,
      bias: o.bias ?? 8,
      settle: o.settle ?? 0,
      born: this.scene.time.now,
    });
    return true;
  }

  /** Scale a requested particle count by the quality setting. */
  private n(count: number): number {
    return this.rich ? count : Math.max(1, Math.round(count * 0.45));
  }

  // ==========================================================================
  // Combat feedback
  // ==========================================================================

  /**
   * The full "something connected" package: contact flash, directional spark
   * spray, debris, optional gore, a ground ring, trauma and hit-stop — all
   * scaled by `power` so one call covers a jab and a siege blow alike.
   */
  impact(x: number, y: number, o: ImpactOptions = {}): void {
    const p = o.power ?? 1;
    const crit = !!o.crit;
    const tint = o.tint ?? 0xffffff;
    const dx = o.dirX ?? 0;
    const dy = o.dirY ?? -0.4;
    const ang = Math.atan2(dy, dx);

    // 1. contact flash — one bright frame is what the eye actually catches
    const burst = this.scene.add
      .sprite(x, y, 'fx-impact')
      .setDepth(y + 14)
      .setScale((crit ? 1.5 : 1) * p)
      .setTint(tint)
      .setBlendMode(Phaser.BlendModes.ADD);
    burst.play('fx-impact');
    burst.once('animationcomplete', () => burst.destroy());

    // 2. spark spray, biased along the blow's direction
    const sparks = this.n(crit ? 12 : 6) * Math.min(2, p);
    for (let i = 0; i < sparks; i++) {
      const a = ang + Phaser.Math.FloatBetween(-0.85, 0.85);
      const sp = Phaser.Math.FloatBetween(90, 260) * p;
      this.emit('fx-spark', x, y, {
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        grav: 320,
        drag: 0.06,
        life: Phaser.Math.FloatBetween(0.18, 0.36),
        rotation: a,
        scale0: crit ? 1.2 : 0.9,
        scale1: 0.3,
        alpha0: 1,
        tint,
        add: true,
        bias: 14,
      });
    }

    // 3. chunks knocked loose — these settle on the floor and sell the weight
    if (p >= 0.9) {
      const chunks = this.n(crit ? 6 : 3);
      for (let i = 0; i < chunks; i++) {
        const a = ang + Phaser.Math.FloatBetween(-1.2, 1.2);
        const sp = Phaser.Math.FloatBetween(60, 170) * p;
        this.emit('fx-shard', x, y - 2, {
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp - 40,
          grav: 620,
          drag: 0.3,
          life: Phaser.Math.FloatBetween(0.45, 0.8),
          spin: Phaser.Math.FloatBetween(-14, 14),
          scale0: 1,
          scale1: 0.85,
          alpha0: 0.95,
          tint: o.gore ?? 0xc8ccd8,
          bias: 6,
          settle: 0.62,
        });
      }
    }

    // 4. viscera for fleshy targets
    if (o.gore !== undefined) {
      const drops = this.n(crit ? 8 : 4);
      for (let i = 0; i < drops; i++) {
        const a = ang + Phaser.Math.FloatBetween(-1.0, 1.0);
        const sp = Phaser.Math.FloatBetween(50, 190) * p;
        this.emit('fx-gore', x, y, {
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp - 30,
          grav: 700,
          drag: 0.35,
          life: Phaser.Math.FloatBetween(0.35, 0.7),
          scale0: Phaser.Math.FloatBetween(0.7, 1.3),
          scale1: 0.5,
          alpha0: 1,
          tint: o.gore,
          bias: 5,
          settle: 0.7,
        });
      }
    }

    // 5. ground ring only for real blows — spamming it on every tick is noise
    if (!o.noRing && (crit || p >= 1.4)) this.shockwave(x, y + 4, { scale: 0.5 * p, tint });

    // 6. crits get a signature star + a dolly punch
    if (crit) {
      this.emit('fx-crit-star', x, y - 4, {
        life: 0.3,
        scale0: 0.6,
        scale1: 2.1,
        alpha0: 1,
        tint,
        add: true,
        bias: 18,
        drag: 1,
      });
      this.zoomPunch(0.045, 110);
    }

    this.addTrauma(crit ? 0.34 * p : 0.14 * p);
    this.hitStop(crit ? 78 : 34, crit ? 0.08 : 0.2);
  }

  /** A single blade sweep at `angle` radians. */
  slash(x: number, y: number, angle: number, o: SlashOptions = {}): void {
    const s = this.scene.add
      .sprite(x, y, 'fx-slash-arc')
      .setDepth(y + 16)
      .setRotation(angle)
      .setScale(o.scale ?? 1, (o.scale ?? 1) * (o.scaleY ?? 1))
      .setBlendMode(Phaser.BlendModes.ADD);
    if (o.tint !== undefined) s.setTint(o.tint);
    s.play('fx-slash-arc');
    // Heavier weapons play the same 5 frames more slowly, which is most of what
    // makes a maul feel like a maul: the arc lingers where a dagger's is gone.
    if (o.speed) s.anims.timeScale = o.speed;
    s.once('animationcomplete', () => s.destroy());
  }

  /**
   * A weapon's swing, shaped by what's actually in the hero's hand.
   *
   * A single generic arc made every class swing identically, which flattened the
   * one place their differences should be most legible — the moment of the hit.
   * Each weapon family now gets its own arc width, height, playback speed and
   * follow-through; daggers flick, mauls heave, scythes sweep the whole screen,
   * claws leave three parallel rakes.
   */
  weaponSwing(x: number, y: number, angle: number, kind: string, tint: number, reachScale = 1): void {
    const p = SWING[kind] ?? SWING.default;
    const base = p.scale * reachScale;

    if (p.rakes && p.rakes > 1) {
      // claws: several thin parallel arcs fanned across the swing
      for (let i = 0; i < p.rakes; i++) {
        const spreadOffset = (i - (p.rakes - 1) / 2) * 0.22;
        this.scene.time.delayedCall(i * 22, () =>
          this.slash(x, y, angle + spreadOffset, { tint, scale: base * 0.72, scaleY: 0.42, speed: p.speed })
        );
      }
      return;
    }

    this.slash(x, y, angle, { tint, scale: base, scaleY: p.scaleY, speed: p.speed });

    // Heavy weapons get an echo arc a beat behind the first, offset along the
    // swing — that lag is what reads as MASS rather than as a bigger sprite.
    if (p.echo) {
      this.scene.time.delayedCall(p.echo, () =>
        this.slash(x, y, angle + p.echoTurn, { tint: 0xffffff, scale: base * 0.82, scaleY: p.scaleY, speed: p.speed * 1.2 })
      );
    }
    // ...and they kick dust off the ground where the arc passes.
    if (p.grit) {
      const n = this.n(p.grit);
      for (let i = 0; i < n; i++) {
        const a = angle + Phaser.Math.FloatBetween(-0.7, 0.7);
        const d = Phaser.Math.FloatBetween(10, 26 * base);
        this.emit('fx-mote-dust', x + Math.cos(a) * d, y + Math.sin(a) * d + 6, {
          vx: Math.cos(a) * 40,
          vy: -Phaser.Math.FloatBetween(10, 40),
          drag: 0.3,
          life: Phaser.Math.FloatBetween(0.25, 0.5),
          scale0: 1.2,
          scale1: 0.3,
          alpha0: 0.5,
          bias: 4,
        });
      }
    }
  }

  /** A flat expanding ring on the ground — slams, novas, landings, phase flips. */
  shockwave(x: number, y: number, o: { scale?: number; tint?: number } = {}): void {
    const s = this.scene.add
      .sprite(x, y, 'fx-shock')
      .setDepth(y - 2)
      .setScale(o.scale ?? 1)
      .setBlendMode(Phaser.BlendModes.ADD);
    if (o.tint !== undefined) s.setTint(o.tint);
    s.play('fx-shock');
    s.once('animationcomplete', () => s.destroy());
  }

  /** Loose chunks flying off in every direction (breakables, armour, stone). */
  debris(x: number, y: number, count: number, o: { tint?: number; speed?: number; life?: number } = {}): void {
    const n = this.n(count);
    for (let i = 0; i < n; i++) {
      const a = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const sp = Phaser.Math.FloatBetween(40, o.speed ?? 160);
      this.emit('fx-shard', x, y, {
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 60,
        grav: 600,
        drag: 0.3,
        life: o.life ?? Phaser.Math.FloatBetween(0.5, 0.9),
        spin: Phaser.Math.FloatBetween(-16, 16),
        scale0: Phaser.Math.FloatBetween(0.8, 1.5),
        scale1: 0.7,
        tint: o.tint ?? 0xc8ccd8,
        bias: 6,
        settle: 0.6,
      });
    }
  }

  /** Additive sparks with no gravity — magic fizzle, metal grind, enchantments. */
  sparks(x: number, y: number, count: number, tint = 0xffe98c, speed = 150): void {
    const n = this.n(count);
    for (let i = 0; i < n; i++) {
      const a = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const sp = Phaser.Math.FloatBetween(speed * 0.35, speed);
      this.emit('fx-spark', x, y, {
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        drag: 0.08,
        life: Phaser.Math.FloatBetween(0.2, 0.45),
        rotation: a,
        scale0: 1,
        scale1: 0.2,
        tint,
        add: true,
        bias: 12,
      });
    }
  }

  /**
   * A kill. Smoke, debris, a ring and — for the undead — a soul that peels off
   * and drifts up. Bosses get the whole thing at siege scale plus a white flash.
   */
  death(x: number, y: number, o: DeathOptions = {}): void {
    const sc = o.scale ?? 1;
    const tint = o.tint ?? 0xffffff;

    const puff = this.scene.add
      .sprite(x, y - 4, 'fx-puff')
      .setDepth(y + 10)
      .setScale(sc * (o.boss ? 3.2 : 1.4));
    puff.play('fx-puff');
    puff.once('animationcomplete', () => puff.destroy());

    this.debris(x, y - 2, o.boss ? 22 : 8, { tint, speed: o.boss ? 300 : 190 });
    this.sparks(x, y - 6, o.boss ? 20 : 8, tint, o.boss ? 280 : 160);
    this.shockwave(x, y + 3, { scale: sc * (o.boss ? 1.6 : 0.55), tint });

    if (o.soul !== false) {
      const soul = this.scene.add
        .sprite(x, y - 6, 'fx-soul')
        .setDepth(y + 22)
        .setScale(o.boss ? 2.4 : 1.2)
        .setTint(tint)
        .setBlendMode(Phaser.BlendModes.ADD);
      soul.play('fx-soul');
      this.scene.tweens.add({
        targets: soul,
        y: soul.y - (o.boss ? 64 : 34),
        alpha: 0,
        duration: o.boss ? 900 : 520,
        ease: 'Sine.easeOut',
        onComplete: () => soul.destroy(),
      });
    }

    this.addTrauma(o.boss ? 0.95 : 0.2);
    if (o.boss) {
      this.hitStop(160, 0.05);
      this.flash(0xffffff, 220, 0.6);
      this.zoomPunch(0.09, 240);
    }
  }

  // ==========================================================================
  // Ground decals — the only FX that persist
  // ==========================================================================

  /**
   * Stamp a lasting mark on the floor.
   *
   * A room that looks identical before and after a fight throws away the
   * player's whole history with it. Decals are the cheapest possible memory:
   * a hard cap of {@link MAX_DECALS} live at once, and pushing past it fades the
   * OLDEST out rather than popping it, so a long fight leaves a battlefield
   * instead of an ever-growing draw list.
   *
   * They sit between the floor tiles and the level's own floor coverings (see
   * DEPTH.DECAL), and are given a random flip and rotation so repeated stamps
   * never tile visibly.
   */
  decal(x: number, y: number, kind: DecalKind, o: { scale?: number; tint?: number; alpha?: number } = {}): void {
    if (!this.rich) return; // cheap mode keeps the floor clean
    const key = `fx-decal-${kind}`;
    if (!this.scene.textures.exists(key)) return;
    const img = this.scene.add
      .image(x, y, key)
      .setDepth(DEPTH.DECAL)
      .setScale((o.scale ?? 1) * Phaser.Math.FloatBetween(0.85, 1.25))
      .setAlpha(0)
      .setFlipX(Math.random() < 0.5)
      .setAngle(Phaser.Math.Between(-12, 12));
    if (o.tint !== undefined) img.setTint(o.tint);
    const target = o.alpha ?? 0.62;
    this.scene.tweens.add({ targets: img, alpha: target, duration: 90 });
    this.decals.push(img);

    while (this.decals.length > MAX_DECALS) {
      const old = this.decals.shift();
      if (!old) break;
      this.scene.tweens.add({
        targets: old,
        alpha: 0,
        duration: 900,
        onComplete: () => old.destroy(),
      });
    }
  }

  /** Convenience: the right decal for a creature that just died. */
  deathDecal(x: number, y: number, gore: number | undefined, tint: number): void {
    if (gore !== undefined) this.decal(x, y + 4, 'blood', { tint: gore, scale: 1.05 });
    else this.decal(x, y + 4, 'scorch', { tint, alpha: 0.42, scale: 0.9 });
  }

  // ==========================================================================
  // Rewards & world flourishes
  // ==========================================================================

  /** A collected pickup: a bright pop plus motes that suck inward. */
  pickup(x: number, y: number, tint = 0xffd24a): void {
    this.emit('fx-glow-white', x, y, {
      life: 0.28,
      scale0: 0.7,
      scale1: 2.2,
      alpha0: 0.9,
      tint,
      add: true,
      bias: 16,
      drag: 1,
    });
    const n = this.n(6);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      this.emit('fx-spark', x + Math.cos(a) * 12, y + Math.sin(a) * 8, {
        vx: -Math.cos(a) * 55,
        vy: -Math.sin(a) * 40 - 30,
        drag: 0.4,
        life: 0.34,
        rotation: a + Math.PI,
        scale0: 0.9,
        scale1: 0.2,
        tint,
        add: true,
        bias: 15,
      });
    }
  }

  /** Level-up: a column of light, a gold ring and a fountain of sparks. */
  levelUp(x: number, y: number, tint = 0xffd24a): void {
    if (this.scene.textures.exists('fx-pillar')) {
      const pillar = this.scene.add
        .image(x, y - 60, 'fx-pillar')
        .setDepth(y + 24)
        .setScale(0.6, 0.55)
        .setAlpha(0)
        .setTint(tint)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.scene.tweens.add({ targets: pillar, alpha: 0.9, duration: 130, ease: 'Quad.easeOut' });
      this.scene.tweens.add({
        targets: pillar,
        alpha: 0,
        scaleX: 1.4,
        delay: 220,
        duration: 620,
        ease: 'Quad.easeIn',
        onComplete: () => pillar.destroy(),
      });
    }
    this.shockwave(x, y + 4, { scale: 0.9, tint });
    const n = this.n(22);
    for (let i = 0; i < n; i++) {
      const a = Phaser.Math.FloatBetween(0, Math.PI * 2);
      this.emit('fx-spark', x + Math.cos(a) * 10, y + 6, {
        vx: Math.cos(a) * Phaser.Math.FloatBetween(20, 70),
        vy: Phaser.Math.FloatBetween(-210, -90),
        grav: 230,
        drag: 0.5,
        life: Phaser.Math.FloatBetween(0.6, 1.1),
        rotation: -Math.PI / 2,
        scale0: 1.1,
        scale1: 0.3,
        tint,
        add: true,
        bias: 20,
      });
    }
    this.emit('fx-crit-star', x, y - 18, {
      life: 0.5,
      scale0: 0.4,
      scale1: 3,
      alpha0: 1,
      tint,
      add: true,
      bias: 26,
      drag: 1,
    });
    this.addTrauma(0.22);
  }

  /** Green motes spiralling up out of the ground — heals, regen ticks, shrines. */
  heal(x: number, y: number, tint = 0x78f78d): void {
    const n = this.n(8);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      this.emit('fx-mote-dust', x + Math.cos(a) * 11, y + 6, {
        vx: Math.cos(a) * 12,
        vy: Phaser.Math.FloatBetween(-70, -34),
        drag: 0.6,
        life: Phaser.Math.FloatBetween(0.5, 0.9),
        scale0: 1.4,
        scale1: 0.4,
        alpha0: 0.95,
        tint,
        add: true,
        bias: 12,
      });
    }
  }

  /**
   * A rotating rune circle beneath a caster. Returns the sprite so the caller
   * can kill it early if the cast is interrupted.
   */
  castSigil(x: number, y: number, tint = 0xd3a8ff, ms = 700, scale = 1): Phaser.GameObjects.Sprite {
    const s = this.scene.add
      .sprite(x, y, 'fx-sigil')
      .setDepth(y - 3)
      .setScale(scale * 0.5)
      .setAlpha(0)
      .setTint(tint)
      .setBlendMode(Phaser.BlendModes.ADD);
    s.play('fx-sigil');
    this.scene.tweens.add({ targets: s, alpha: 0.95, scale: scale, duration: 150, ease: 'Back.easeOut' });
    this.scene.tweens.add({
      targets: s,
      alpha: 0,
      scale: scale * 1.35,
      delay: Math.max(0, ms - 200),
      duration: 200,
      onComplete: () => s.destroy(),
    });
    return s;
  }

  /** A stretched additive beam between two points. */
  beam(x1: number, y1: number, x2: number, y2: number, tint = 0xb48cff, width = 6, ms = 220): void {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const img = this.scene.add
      .image((x1 + x2) / 2, (y1 + y2) / 2, 'fx-beam')
      .setDepth(Math.max(y1, y2) + 14)
      .setRotation(Math.atan2(dy, dx))
      .setDisplaySize(len, width)
      .setTint(tint)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({
      targets: img,
      alpha: 0,
      scaleY: 0.2,
      duration: ms,
      ease: 'Quad.easeIn',
      onComplete: () => img.destroy(),
    });
    this.sparks(x2, y2, 5, tint, 120);
  }

  /** A crackling bolt between two points (chain lightning, storm procs). */
  lightning(x1: number, y1: number, x2: number, y2: number, tint = 0xbcd4ff): void {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const s = this.scene.add
      .sprite((x1 + x2) / 2, (y1 + y2) / 2, 'fx-lightning')
      .setDepth(Math.max(y1, y2) + 16)
      // the texture is drawn vertically, so rotate an extra 90°
      .setRotation(Math.atan2(dy, dx) + Math.PI / 2)
      .setDisplaySize(14, len)
      .setTint(tint)
      .setBlendMode(Phaser.BlendModes.ADD);
    s.play('fx-lightning');
    s.once('animationcomplete', () => s.destroy());
    this.sparks(x2, y2, 6, tint, 140);
    this.addTrauma(0.08);
  }

  /**
   * A frozen ghost of a sprite that fades in place. Spawn a few per dash and the
   * motion reads as speed instead of teleportation.
   */
  afterimage(src: Phaser.GameObjects.Sprite, o: { tint?: number; life?: number; alpha?: number } = {}): void {
    if (!this.rich) return;
    const ghost = this.scene.add
      .sprite(src.x, src.y, src.texture.key, src.frame.name)
      .setOrigin(src.originX, src.originY)
      .setScale(src.scaleX, src.scaleY)
      .setFlipX(src.flipX)
      .setDepth(src.depth - 1)
      .setAlpha(o.alpha ?? 0.45)
      .setTint(o.tint ?? 0x9fc0ff)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({
      targets: ghost,
      alpha: 0,
      duration: o.life ?? 220,
      ease: 'Quad.easeOut',
      onComplete: () => ghost.destroy(),
    });
  }

  /** A one-off additive glow blip (procs, buffs, telegraph pings). */
  glow(x: number, y: number, o: { tint?: number; scale?: number; life?: number; bias?: number } = {}): void {
    const s = o.scale ?? 1;
    this.emit('fx-glow-white', x, y, {
      life: o.life ?? 0.32,
      scale0: s * 0.5,
      scale1: s * 2,
      alpha0: 0.85,
      tint: o.tint ?? 0xffffff,
      add: true,
      bias: o.bias ?? 12,
      drag: 1,
    });
  }

  /**
   * A boss crossing into phase 2: the arena wakes up. Ring, flash, debris storm
   * and a long rumble — deliberately the loudest thing in the vocabulary short
   * of the kill itself.
   */
  bossPhase(x: number, y: number, tint = 0xff5a3a): void {
    this.shockwave(x, y + 6, { scale: 2.6, tint });
    this.shockwave(x, y + 6, { scale: 1.5, tint: 0xffffff });
    this.debris(x, y, 18, { tint, speed: 280 });
    this.sparks(x, y - 10, 24, tint, 300);
    this.flash(tint, 260, 0.45);
    this.addTrauma(0.85);
    this.hitStop(120, 0.06);
    const n = this.n(10);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      this.emit('fx-mote-ember', x + Math.cos(a) * 20, y + Math.sin(a) * 12, {
        vx: Math.cos(a) * 40,
        vy: -Phaser.Math.FloatBetween(40, 120),
        drag: 0.5,
        life: Phaser.Math.FloatBetween(0.8, 1.5),
        scale0: 2,
        scale1: 0.4,
        tint,
        add: true,
        bias: 18,
      });
    }
  }
}
