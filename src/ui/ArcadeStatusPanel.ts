import Phaser from 'phaser';

export interface ArcadeStatusTheme {
  text: string;
  primary: number;
  secondary: number;
  holo: number;
  holoAlt: number;
  particle: number;
}

type BloomFx = Phaser.Types.Actions.AddEffectBloomReturn;
type ShineFx = Phaser.Types.Actions.AddEffectShineReturn;
type GlowFx = { active: boolean; outerStrength: number; innerStrength: number; color: number; setActive: (v: boolean) => void };
type DispFx = { active: boolean; x: number; y: number; setActive: (v: boolean) => void };

const PANEL_W = 136;
const PANEL_H = 94;

/** Alien arcade status readout — Phaser 4 filters, lights, crisp stacked text. */
export class ArcadeStatusPanel {
  private readonly scene: Phaser.Scene;
  private readonly container: Phaser.GameObjects.Container;
  private readonly plate: Phaser.GameObjects.Image;
  private readonly holoBack: Phaser.GameObjects.Image;
  private readonly holoFront: Phaser.GameObjects.Image;
  private readonly scan: Phaser.GameObjects.Graphics;
  private readonly accents: Phaser.GameObjects.Graphics;
  private readonly line1: Phaser.GameObjects.Text;
  private readonly line2: Phaser.GameObjects.Text;
  private readonly theme: ArcadeStatusTheme;
  private readonly webgl: boolean;
  private readonly scanPos = { v: 0 };
  private motes?: Phaser.GameObjects.Particles.ParticleEmitter;
  private bloomFx?: BloomFx;
  private shineFx?: ShineFx;
  private glowFx?: GlowFx;
  private dispFx?: DispFx;
  private pointLight?: Phaser.GameObjects.Light;
  private tweens: Phaser.Tweens.Tween[] = [];
  private state: 'checking' | 'live' | 'idle' | 'down' = 'checking';

  constructor(scene: Phaser.Scene, x: number, y: number, side: 'left' | 'right', theme: ArcadeStatusTheme) {
    this.scene = scene;
    this.theme = theme;
    this.webgl = scene.game.renderer.type === Phaser.WEBGL;

    const texKey = `arcade-plate-${side}`;
    ArcadeStatusPanel.ensurePlateTexture(scene, texKey, theme.primary);

    this.container = scene.add.container(Math.round(x), Math.round(y)).setDepth(12);

    this.holoBack = scene.add
      .image(0, 0, 'fx-glow-magic')
      .setScale(3.1, 2.2)
      .setAlpha(0)
      .setTint(theme.holo)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.holoFront = scene.add
      .image(0, 0, 'fx-glow-white')
      .setScale(1.65, 1.15)
      .setAlpha(0)
      .setTint(theme.holoAlt)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.plate = scene.add.image(0, 0, texKey);
    this.accents = scene.add.graphics();
    this.scan = scene.add.graphics();

    this.line1 = this.crispText(0, -12, 'CHECKING', 20);
    this.line2 = this.crispText(0, 14, '…', 16);

    this.container.add([this.holoBack, this.holoFront, this.plate, this.accents, this.scan, this.line1, this.line2]);

    if (this.webgl) {
      try {
        this.plate.enableFilters();
        const f = this.plate.filters;
        if (f && (f as any).internal) {
          const filters = (f as any).internal;
          this.glowFx = filters.addGlow(theme.primary, 3, 1, 1, false, 6, 8) as GlowFx;
          this.glowFx.active = false;
          this.dispFx = filters.addDisplacement('fx-glow-magic', 0.007, 0.004) as DispFx;
          this.dispFx.active = false;
        }
        if (scene.lights) {
          scene.lights.enable();
          scene.lights.setAmbientColor(0x050810);
        }
      } catch {
        // Filters/lights may not be available in this renderer or Phaser build;
        // title screen must still load. FX are cosmetic for the status panels.
      }
    }

    this.drawAccents(0x6a7088);
    this.setChecking();
  }

  setLive(line1: string, line2: string): void {
    if (this.state === 'live' && this.line1.text === line1 && this.line2.text === line2) return;
    this.state = 'live';
    this.clearFx();
    this.line1.setText(line1).setColor(this.theme.text);
    this.line2.setText(line2).setColor(this.theme.text);
    this.drawAccents(this.theme.secondary);

    this.tweens.push(
      this.scene.tweens.add({
        targets: this.holoBack,
        alpha: { from: 0.22, to: 0.5 },
        scaleX: { from: 2.9, to: 3.4 },
        scaleY: { from: 2.0, to: 2.45 },
        duration: 820,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      }),
      this.scene.tweens.add({
        targets: this.holoFront,
        alpha: { from: 0.1, to: 0.28 },
        duration: 540,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      }),
      this.scene.tweens.add({
        targets: this.holoBack,
        tint: { from: this.theme.holo, to: this.theme.holoAlt },
        duration: 1200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      }),
    );

    this.scanPos.v = -PANEL_H / 2 + 10;
    const scanCol = this.theme.holoAlt;
    const drawScan = (): void => {
      this.scan.clear();
      this.scan.fillStyle(scanCol, 0.5);
      this.scan.fillRect(-PANEL_W / 2 + 8, this.scanPos.v, PANEL_W - 16, 2);
      this.scan.fillStyle(0xffffff, 0.22);
      this.scan.fillRect(-PANEL_W / 2 + 8, this.scanPos.v + 2, PANEL_W - 16, 1);
    };
    drawScan();
    this.tweens.push(
      this.scene.tweens.add({
        targets: this.scanPos,
        v: PANEL_H / 2 - 12,
        duration: 1000,
        repeat: -1,
        ease: 'Linear',
        onUpdate: drawScan,
        onRepeat: () => { this.scanPos.v = -PANEL_H / 2 + 10; },
      }),
    );

    this.motes = this.scene.add
      .particles(this.container.x, this.container.y, 'fx-glow-white', {
        x: { min: -PANEL_W * 0.4, max: PANEL_W * 0.4 },
        y: { min: -PANEL_H * 0.4, max: PANEL_H * 0.4 },
        speed: { min: 8, max: 28 },
        lifespan: { min: 350, max: 900 },
        scale: { start: 0.28, end: 0 },
        alpha: { start: 0.65, end: 0 },
        frequency: 90,
        quantity: 1,
        tint: this.theme.particle,
        blendMode: 'ADD',
      })
      .setDepth(11.5);

    if (this.webgl) {
      this.bloomFx = Phaser.Actions.AddEffectBloom(this.plate, {
        threshold: 0.28,
        blurRadius: 4,
        blurSteps: 5,
        blurQuality: 1,
        blendAmount: 0.75,
        useInternal: true,
      })[0];
      this.bloomFx.parallelFilters.active = true;

      this.glowFx!.active = true;
      this.glowFx!.color = this.theme.primary;
      this.glowFx!.outerStrength = 5;
      this.glowFx!.innerStrength = 1.2;
      this.tweens.push(
        this.scene.tweens.add({
          targets: this.glowFx,
          outerStrength: { from: 4, to: 9 },
          duration: 700,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        }),
      );

      this.dispFx!.active = true;
      const wobble = { x: 0.006, y: 0.003 };
      this.tweens.push(
        this.scene.tweens.add({
          targets: wobble,
          x: 0.012,
          y: 0.008,
          duration: 1400,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
          onUpdate: () => {
            if (this.dispFx) {
              this.dispFx.x = wobble.x;
              this.dispFx.y = wobble.y;
            }
          },
        }),
      );

      this.shineFx = Phaser.Actions.AddEffectShine(this.plate, {
        duration: 1800,
        repeatDelay: 400,
        direction: this.theme.holo === 0x8b5cff ? 0 : Math.PI,
        scale: 1.15,
        colorFactor: [
          ((this.theme.holoAlt >> 16) & 0xff) / 255 * 1.8,
          ((this.theme.holoAlt >> 8) & 0xff) / 255 * 2.4,
          (this.theme.holoAlt & 0xff) / 255 * 2.8,
          0.85,
        ],
        displacementMap: 'fx-glow-magic',
        displacement: 0.004,
      })[0];

      this.pointLight = this.scene.lights.addLight(this.container.x, this.container.y, 110, this.theme.primary, 0.85);
      this.tweens.push(
        this.scene.tweens.add({
          targets: this.pointLight,
          intensity: { from: 0.55, to: 1.1 },
          duration: 600,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        }),
      );
    }
  }

  setIdle(line1: string, line2: string): void {
    if (this.state === 'idle' && this.line1.text === line1 && this.line2.text === line2) return;
    this.state = 'idle';
    this.clearFx();
    this.line1.setText(line1).setColor('#e0b96a');
    this.line2.setText(line2).setColor('#e0b96a');
    this.drawAccents(0xb5894a);
    this.tweens.push(
      this.scene.tweens.add({
        targets: this.holoBack,
        alpha: { from: 0.05, to: 0.14 },
        tint: 0xb5894a,
        duration: 1800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      }),
    );
    if (this.webgl && this.glowFx) {
      this.glowFx.active = true;
      this.glowFx.color = 0xb5894a;
      this.glowFx.outerStrength = 2;
      this.glowFx.innerStrength = 0.4;
    }
  }

  setDown(line1: string, line2: string): void {
    if (this.state === 'down' && this.line1.text === line1 && this.line2.text === line2) return;
    this.state = 'down';
    this.clearFx();
    this.line1.setText(line1).setColor('#ff6a6a');
    this.line2.setText(line2).setColor('#ff6a6a');
    this.drawAccents(0xff4040);
    this.holoBack.setTint(0xff3030).setAlpha(0.16);
    this.tweens.push(
      this.scene.tweens.add({
        targets: this.plate,
        alpha: { from: 0.45, to: 1 },
        duration: 160,
        yoyo: true,
        repeat: -1,
        ease: 'Stepped',
        repeatDelay: 420,
      }),
    );
    if (this.webgl && this.glowFx) {
      this.glowFx.active = true;
      this.glowFx.color = 0xff4040;
      this.glowFx.outerStrength = 3;
    }
  }

  setChecking(): void {
    if (this.state === 'checking') return;
    this.state = 'checking';
    this.clearFx();
    this.line1.setText('CHECKING').setColor('#8a93bd');
    this.line2.setText('…').setColor('#8a93bd');
    this.drawAccents(0x6a7088);
    this.tweens.push(
      this.scene.tweens.add({
        targets: this.holoBack,
        alpha: { from: 0.02, to: 0.08 },
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      }),
    );
  }

  private clearFx(): void {
    for (const tw of this.tweens) tw.stop();
    this.tweens = [];
    this.motes?.destroy();
    this.motes = undefined;
    this.scan.clear();
    this.holoBack.setAlpha(0);
    this.holoFront.setAlpha(0);
    this.plate.setAlpha(1);

    if (this.bloomFx) {
      this.bloomFx.parallelFilters.destroy();
      this.bloomFx = undefined;
    }
    if (this.shineFx) {
      this.shineFx.tween.stop();
      this.shineFx.tween.destroy();
      this.shineFx.dynamicTexture.destroy();
      this.shineFx.parallelFilters?.destroy();
      this.shineFx = undefined;
    }

    if (this.glowFx) {
      this.glowFx.setActive(false);
      this.glowFx.outerStrength = 3;
    }
    if (this.dispFx) this.dispFx.setActive(false);
    if (this.pointLight) {
      this.scene.lights.removeLight(this.pointLight);
      this.pointLight = undefined;
    }
  }

  private crispText(tx: number, ty: number, content: string, size: number): Phaser.GameObjects.Text {
    const t = this.scene.add
      .text(Math.round(tx), Math.round(ty), content, {
        fontFamily: 'MedievalSharp, "Trebuchet MS", cursive',
        fontSize: `${size}px`,
        color: '#8a93bd',
        fontStyle: 'bold',
        align: 'center',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    t.setResolution(Math.min(2, window.devicePixelRatio || 1));
    return t;
  }

  private drawAccents(col: number): void {
    const l = -PANEL_W / 2;
    const r = PANEL_W / 2;
    const t = -PANEL_H / 2;
    const b = PANEL_H / 2;
    this.accents.clear();
    this.accents.lineStyle(2, col, 0.95);
    this.accents.beginPath();
    this.accents.moveTo(l + 6, t + 18);
    this.accents.lineTo(l + 6, t + 6);
    this.accents.lineTo(l + 20, t + 6);
    this.accents.moveTo(r - 6, t + 18);
    this.accents.lineTo(r - 6, t + 6);
    this.accents.lineTo(r - 20, t + 6);
    this.accents.moveTo(l + 6, b - 18);
    this.accents.lineTo(l + 6, b - 6);
    this.accents.lineTo(l + 20, b - 6);
    this.accents.moveTo(r - 6, b - 18);
    this.accents.lineTo(r - 6, b - 6);
    this.accents.lineTo(r - 20, b - 6);
    this.accents.strokePath();
    this.accents.fillStyle(col, 0.9);
    this.accents.fillCircle(l + 6, t + 6, 2);
    this.accents.fillCircle(r - 6, t + 6, 2);
    this.accents.fillCircle(l + 6, b - 6, 2);
    this.accents.fillCircle(r - 6, b - 6, 2);
  }

  private static ensurePlateTexture(scene: Phaser.Scene, key: string, border: number): void {
    if (scene.textures.exists(key)) return;
    const g = scene.add.graphics();
    g.fillStyle(0x03060c, 1);
    g.fillRoundedRect(0, 0, PANEL_W, PANEL_H, 6);
    g.fillStyle(0x081420, 0.92);
    g.fillRoundedRect(4, 4, PANEL_W - 8, PANEL_H - 8, 4);
    g.lineStyle(1, border, 0.2);
    for (let i = -2; i < 12; i++) {
      g.lineBetween(i * 14, 0, i * 14 - 36, PANEL_H);
    }
    g.lineStyle(2, border, 0.95);
    g.strokeRoundedRect(1, 1, PANEL_W - 2, PANEL_H - 2, 5);
    g.lineStyle(1, 0xffffff, 0.06);
    g.strokeRoundedRect(5, 5, PANEL_W - 10, PANEL_H - 10, 3);
    g.generateTexture(key, PANEL_W, PANEL_H);
    g.destroy();
  }
}

export const AI_STATUS_THEME: ArcadeStatusTheme = {
  text: '#7efcff',
  primary: 0x4fe0ff,
  secondary: 0xc06bff,
  holo: 0x8b5cff,
  holoAlt: 0x4fe0ff,
  particle: 0xb8f8ff,
};

export const SERVER_STATUS_THEME: ArcadeStatusTheme = {
  text: '#6dffe8',
  primary: 0x37e8d6,
  secondary: 0x4fa3ff,
  holo: 0x2fe0c8,
  holoAlt: 0x5fe06a,
  particle: 0xa0fff4,
};