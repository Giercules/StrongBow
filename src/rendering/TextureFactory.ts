import Phaser from 'phaser';
import { C, HERO_RAMPS, MONSTER_RAMPS } from './Palette';
import type { HeroRamp, MonsterRamp } from './Palette';
import * as art from './spriteArt';
import { HERO_FW, HERO_FH, MON_FW, MON_FH, BOSS_FW, BOSS_FH } from './spriteArt';
import type { Ctx, Facing } from './spriteArt';

// TextureFactory - Phaser adapter that renders the pure spriteArt routines onto
// <canvas> elements and registers them (and sheet frames) with Phaser.

function newCanvas(w: number, h: number): { canvas: HTMLCanvasElement; ctx: Ctx } {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx };
}

function addImg(scene: Phaser.Scene, key: string, w: number, h: number, draw: (ctx: Ctx) => void, outline = false): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const { canvas, ctx } = newCanvas(w, h);
  draw(ctx);
  if (outline) art.outlineRegion(ctx, 0, 0, w, h);
  scene.textures.addCanvas(key, canvas);
}

function addSheet(
  scene: Phaser.Scene,
  key: string,
  fw: number,
  fh: number,
  count: number,
  draw: (ctx: Ctx, ox: number, frame: number) => void,
  outline = false
): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const { canvas, ctx } = newCanvas(fw * count, fh);
  for (let i = 0; i < count; i++) draw(ctx, i * fw, i);
  if (outline) for (let i = 0; i < count; i++) art.outlineRegion(ctx, i * fw, 0, fw, fh);
  const tex = scene.textures.addCanvas(key, canvas);
  if (tex) {
    for (let i = 0; i < count; i++) tex.add(i, 0, i * fw, 0, fw, fh);
  }
}

function makeHeroSheet(scene: Phaser.Scene, cls: string): void {
  const ramp = HERO_RAMPS[cls];
  const facings: Facing[] = ['down', 'up', 'side'];
  addSheet(scene, `hero-${cls}-sheet`, HERO_FW, HERO_FH, 12, (ctx, ox, frame) => {
    const facing = facings[Math.floor(frame / 4)];
    const pose = frame % 4;
    art.drawHumanoid(ctx, ox, cls, ramp, facing, pose);
  }, true);
}

function makeMonsterSheet(
  scene: Phaser.Scene,
  key: string,
  ramp: MonsterRamp,
  drawer: (ctx: Ctx, ox: number, frame: number, r: MonsterRamp) => void,
  fw = MON_FW,
  fh = MON_FH
): void {
  addSheet(scene, key, fw, fh, 4, (ctx, ox, frame) => drawer(ctx, ox, frame, ramp), true);
}

export class TextureFactory {
  // `provided` lists texture keys already supplied by external art (see
  // externalAssets.ts). Those are skipped here so the loaded image wins; every
  // other key is generated procedurally exactly as before.
  static generateAll(scene: Phaser.Scene, provided: ReadonlySet<string> = new Set()): number {
    let count = 0;
    const img = (k: string, w: number, h: number, d: (c: Ctx) => void, outline = false) => {
      if (provided.has(k)) return;
      addImg(scene, k, w, h, d, outline);
      count++;
    };
    const sheet = (k: string, fw: number, fh: number, n: number, d: (c: Ctx, ox: number, f: number) => void, outline = false) => {
      if (provided.has(k)) return;
      addSheet(scene, k, fw, fh, n, d, outline);
      count++;
    };

    // ---- tiles (no outline; must tile seamlessly) ----
    for (let i = 0; i < 4; i++) img(`floor-${i}`, 16, 16, (c) => art.drawFloor(c, 0, 0, 1000 + i * 97));
    img('wall', 16, 16, (c) => art.drawWall(c, 0, 0, false));
    img('wall-top', 16, 16, (c) => art.drawWall(c, 0, 0, true));
    img('door', 16, 16, (c) => art.drawDoor(c, 0, 0, false));
    img('locked-door', 16, 16, (c) => art.drawDoor(c, 0, 0, true));
    sheet('water-sheet', 16, 16, 4, (c, ox, f) => art.drawWater(c, ox, f));
    sheet('lava-sheet', 16, 16, 4, (c, ox, f) => art.drawLava(c, ox, f));
    sheet('poison-sheet', 16, 16, 4, (c, ox, f) => art.drawPoison(c, ox, f));
    sheet('spikes-sheet', 16, 16, 4, (c, ox, f) => art.drawSpikes(c, ox, f));
    img('ice', 16, 16, (c) => art.drawIce(c, 0, 0, 4242));
    sheet('portal-sheet', 16, 16, 6, (c, ox, f) => art.drawPortal(c, ox, f));

    // ---- objects / decor (outlined) ----
    sheet('torch-sheet', 16, 16, 4, (c, ox, f) => art.drawTorch(c, ox, f));
    sheet('generator-sheet', 16, 16, 4, (c, ox, f) => art.drawGenerator(c, ox, f));
    img('chest', 16, 16, (c) => art.drawChest(c, 0, 0, false), true);
    img('chest-open', 16, 16, (c) => art.drawChest(c, 0, 0, true), true);
    img('shrine', 16, 16, (c) => art.drawShrine(c, 0, 0, false), true);
    img('shrine-lit', 16, 16, (c) => art.drawShrine(c, 0, 0, true), true);
    img('pillar', 16, 16, (c) => art.drawPillar(c, 0, 0), true);
    img('bones', 16, 16, (c) => art.drawBones(c, 0, 0), true);
    img('rubble', 16, 16, (c) => art.drawRubble(c, 0, 0), true);
    img('banner', 16, 16, (c) => art.drawBanner(c, 0, 0), true);
    img('crystal', 16, 16, (c) => art.drawCrystal(c, 0, 0), true);
    img('cog', 16, 16, (c) => art.drawCog(c, 0, 0), true);
    img('vines', 16, 16, (c) => art.drawVines(c, 0, 0), true);
    img('blood-stain', 16, 16, (c) => art.drawBloodStain(c, 0, 0));
    img('skull-pike', 16, 16, (c) => art.drawSkullPike(c, 0, 0), true);

    // ---- pickups (outlined) ----
    sheet('coin-sheet', 16, 16, 4, (c, ox, f) => art.drawCoin(c, ox, f), true);
    img('gem', 16, 16, art.drawGem, true);
    img('food', 16, 16, art.drawFood, true);
    img('potion-red', 16, 16, (c) => art.drawPotion(c, C.hpLow, '#ff8a7a'), true);
    img('potion-blue', 16, 16, (c) => art.drawPotion(c, C.manaFill, '#9ac4ff'), true);
    img('key', 16, 16, art.drawKey, true);

    // ---- item icons (outlined) ----
    img('icon-sword', 16, 16, art.drawIconSword, true);
    img('icon-bow', 16, 16, art.drawIconBow, true);
    img('icon-staff', 16, 16, art.drawIconStaff, true);
    img('icon-mace', 16, 16, art.drawIconMace, true);
    img('icon-armor', 16, 16, art.drawIconArmor, true);
    img('icon-ring', 16, 16, art.drawIconRing, true);
    img('icon-amulet', 16, 16, art.drawIconAmulet, true);

    // ---- FX (no outline) ----
    sheet('fx-magic', 32, 32, 5, (c, ox, f) => art.drawMagicBurst(c, ox, f));
    sheet('fx-slash', 16, 24, 3, (c, ox, f) => art.drawSlash(c, ox, f));
    sheet('fx-fire', 16, 16, 4, (c, ox, f) => art.drawFire(c, ox, f));
    sheet('fx-levelup', 32, 28, 5, (c, ox, f) => art.drawRing(c, ox, f, C.coinHi));
    img('fx-shadow', 24, 8, art.drawShadow);
    img('fx-ally-aura', 28, 28, (c) => art.drawAura(c, C.allyAura));
    img('fx-hit', 16, 16, art.drawHitStar);
    img('fx-glow-warm', 16, 16, (c) => art.drawGlowDot(c, 'rgba(255,170,60,0.9)'));
    img('fx-glow-magic', 16, 16, (c) => art.drawGlowDot(c, 'rgba(140,80,255,0.9)'));
    img('fx-glow-green', 16, 16, (c) => art.drawGlowDot(c, 'rgba(120,240,120,0.9)'));
    img('fx-arrow', 14, 6, art.drawArrow, true);
    img('fx-bolt', 10, 10, art.drawBolt);
    img('fx-light', 128, 128, (c) => art.drawRadialLight(c, 128, 128));
    img('fx-vignette', 740, 540, (c) => art.drawVignette(c, 740, 540));

    // ---- heroes (outlined) ----
    for (const cls of ['vanguard', 'strider', 'arcanist', 'warden']) {
      if (provided.has(`hero-${cls}-sheet`)) continue;
      makeHeroSheet(scene, cls);
      count++;
    }

    // ---- monsters (outlined) ----
    const mon = (
      key: string,
      ramp: MonsterRamp,
      drawer: (ctx: Ctx, ox: number, frame: number, r: MonsterRamp) => void,
      fw = MON_FW,
      fh = MON_FH
    ): void => {
      if (provided.has(key)) return;
      makeMonsterSheet(scene, key, ramp, drawer, fw, fh);
      count++;
    };
    mon('monster-grunt-sheet', MONSTER_RAMPS.grunt, art.drawGrunt);
    mon('monster-ghost-sheet', MONSTER_RAMPS.ghost, art.drawGhost);
    mon('monster-demon-sheet', MONSTER_RAMPS.demon, art.drawDemon);
    mon('monster-boss-sheet', MONSTER_RAMPS.grave_warden, art.drawBoss, BOSS_FW, BOSS_FH);
    mon('monster-bone_archer-sheet', MONSTER_RAMPS.bone_archer, art.drawBoneArcher);
    mon('monster-brute-sheet', MONSTER_RAMPS.brute, art.drawBrute);
    mon('monster-imp-sheet', MONSTER_RAMPS.imp, art.drawImp);
    mon('monster-molten_colossus-sheet', MONSTER_RAMPS.molten_colossus, art.drawColossus, BOSS_FW, BOSS_FH);

    // ---- decorative NPC (outlined) ----
    img('npc-elder', HERO_FW, HERO_FH, (c) => {
      const grey: HeroRamp = {
        skin: '#cdb89a',
        skinHi: '#e6d6bc',
        cloth0: '#2a2f3e',
        cloth1: '#444b60',
        cloth2: '#6a7388',
        trim: '#9aa0b4',
        trimHi: '#dfe6ff',
        hair: '#e8e8ee',
      };
      art.drawHumanoid(c, 0, 'warden', grey, 'down', 0);
    }, true);

    return count;
  }
}
