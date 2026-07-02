import Phaser from 'phaser';

// ----------------------------------------------------------------------------
// LanternWisp — the Arcanist's familiar. A flickering blue will-o'-the-wisp
// tied to the failing lanterns of the realms. It hovers at the mage's shoulder,
// casts real light into the dark, and darts ahead to reveal nearby altars.
// Purely a scout + light source: it never fights and has no physics body, so it
// can't affect combat or block anyone.
// ----------------------------------------------------------------------------

export class LanternWisp {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private glow: Phaser.GameObjects.Image;
  private core: Phaser.GameObjects.Image;
  private halo: Phaser.GameObjects.Image;
  private light?: Phaser.GameObjects.Light;
  private trail?: Phaser.GameObjects.Particles.ParticleEmitter;

  x: number;
  y: number;
  /** Where the wisp currently wants to be (hover home, or a scout target). */
  private tx: number;
  private ty: number;
  private phase = Math.random() * Math.PI * 2;

  private static readonly COL = 0x7fbcff;
  private static readonly CORE_COL = 0xdfefff;

  constructor(scene: Phaser.Scene, x: number, y: number, lit: boolean, depth: number) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.tx = x;
    this.ty = y;

    this.halo = scene.add.image(0, 0, 'fx-glow-magic').setBlendMode(Phaser.BlendModes.ADD).setScale(1.6).setAlpha(0.28).setTint(LanternWisp.COL);
    this.glow = scene.add.image(0, 0, 'fx-glow-white').setBlendMode(Phaser.BlendModes.ADD).setScale(0.9).setAlpha(0.6).setTint(LanternWisp.COL);
    this.core = scene.add.image(0, 0, 'fx-glow-white').setBlendMode(Phaser.BlendModes.ADD).setScale(0.42).setAlpha(0.95).setTint(LanternWisp.CORE_COL);
    this.container = scene.add.container(x, y, [this.halo, this.glow, this.core]).setDepth(depth);

    // ember/spark trail so it reads as a living flame drifting through the dark
    if (scene.textures.exists('fx-glow-white')) {
      this.trail = scene.add.particles(x, y, 'fx-glow-white', {
        lifespan: 520,
        speed: { min: 2, max: 12 },
        scale: { start: 0.32, end: 0 },
        alpha: { start: 0.5, end: 0 },
        tint: LanternWisp.COL,
        blendMode: 'ADD',
        frequency: 60,
        quantity: 1,
      });
      this.trail.setDepth(depth - 1);
    }

    if (lit) this.light = scene.lights.addLight(x, y, 150, LanternWisp.COL, 0.8);
  }

  /** Point the wisp at a world position (its hover home, or a scout target). */
  seek(x: number, y: number): void {
    this.tx = x;
    this.ty = y;
  }

  /** True once the wisp has arrived (within `r`) at its current target. */
  arrived(r = 24): boolean {
    return Phaser.Math.Distance.Between(this.x, this.y, this.tx, this.ty) <= r;
  }

  update(time: number, delta: number): void {
    // ease toward the target with a gentle floating bob on top
    const dt = Math.min(1, delta / 16.67);
    const k = 0.12 * dt;
    this.x += (this.tx - this.x) * k;
    this.y += (this.ty - this.y) * k;
    const bobX = Math.sin(time * 0.004 + this.phase) * 4;
    const bobY = Math.cos(time * 0.005 + this.phase) * 3;
    const px = this.x + bobX;
    const py = this.y + bobY;
    this.container.setPosition(px, py).setDepth(py + 30);
    // flame flicker
    const f = 0.55 + Math.sin(time * 0.02 + this.phase) * 0.12 + (Math.random() - 0.5) * 0.06;
    this.glow.setAlpha(Phaser.Math.Clamp(f, 0.35, 0.8));
    this.core.setScale(0.4 + Math.sin(time * 0.03) * 0.05);
    this.halo.setAlpha(0.24 + Math.sin(time * 0.006 + this.phase) * 0.05);
    if (this.trail) this.trail.setPosition(px, py);
    if (this.light) {
      this.light.setPosition(px, py);
      this.light.intensity = Phaser.Math.Clamp(0.78 + Math.sin(time * 0.02 + this.phase) * 0.16, 0.55, 1.0);
    }
  }

  destroy(): void {
    if (this.light) {
      try { this.scene.lights.removeLight(this.light); } catch { /* lights already torn down */ }
      this.light = undefined;
    }
    this.trail?.destroy();
    this.container.destroy();
  }
}
