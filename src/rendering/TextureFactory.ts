import Phaser from 'phaser';
import { C, HERO_RAMPS, MONSTER_RAMPS } from './Palette';
import type { HeroRamp, MonsterRamp } from './Palette';
import * as art from './spriteArt';
import * as townArt from './townArt';
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

function addImg(scene: Phaser.Scene, key: string, w: number, h: number, draw: (ctx: Ctx) => void, outline = false, shade = false): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const { canvas, ctx } = newCanvas(w, h);
  draw(ctx);
  if (shade) art.softShade(ctx, 0, 0, w, h);
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
  outline = false,
  shade = false
): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const { canvas, ctx } = newCanvas(fw * count, fh);
  for (let i = 0; i < count; i++) draw(ctx, i * fw, i);
  if (shade) for (let i = 0; i < count; i++) art.softShade(ctx, i * fw, 0, fw, fh);
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
  }, true, true);
}

function makeMonsterSheet(
  scene: Phaser.Scene,
  key: string,
  ramp: MonsterRamp,
  drawer: (ctx: Ctx, ox: number, frame: number, r: MonsterRamp) => void,
  fw = MON_FW,
  fh = MON_FH
): void {
  addSheet(scene, key, fw, fh, 4, (ctx, ox, frame) => drawer(ctx, ox, frame, ramp), true, true);
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
    sheet('generator-sheet', 24, 24, 4, (c, ox, f) => art.drawGenerator(c, ox, f));
    img('chest', 16, 16, (c) => art.drawChest(c, 0, 0, false), true);
    img('chest-open', 16, 16, (c) => art.drawChest(c, 0, 0, true), true);
    img('shrine', 16, 16, (c) => art.drawShrine(c, 0, 0, false), true);
    img('shrine-lit', 16, 16, (c) => art.drawShrine(c, 0, 0, true), true);
    img('pillar', 32, 32, (c) => art.drawPillar(c, 0, 0), true);
    img('bones', 32, 32, (c) => art.drawBones(c, 0, 0), true);
    img('rubble', 32, 32, (c) => art.drawRubble(c, 0, 0), true);
    img('banner', 32, 32, (c) => art.drawBanner(c, 0, 0), true);
    img('crystal', 32, 32, (c) => art.drawCrystal(c, 0, 0), true);
    img('cog', 32, 32, (c) => art.drawCog(c, 0, 0), true);
    img('vines', 32, 32, (c) => art.drawVines(c, 0, 0), true);
    img('blood-stain', 32, 32, (c) => art.drawBloodStain(c, 0, 0));
    img('skull-pike', 32, 32, (c) => art.drawSkullPike(c, 0, 0), true);
    // new themed decor
    img('bog-stump', 32, 32, (c) => art.drawBogStump(c, 0, 0), true);
    img('lilypad', 32, 32, (c) => art.drawLilypad(c, 0, 0));
    img('storm-rod', 32, 32, (c) => art.drawStormRod(c, 0, 0), true);
    img('sky-crystal', 32, 32, (c) => art.drawSkyCrystal(c, 0, 0), true);
    img('void-rift', 32, 32, (c) => art.drawVoidRift(c, 0, 0));
    img('sanctum-glyph', 32, 32, (c) => art.drawSanctumGlyph(c, 0, 0));
    img('brazier', 32, 32, (c) => art.drawBrazier(c, 0, 0), true);
    // more themed decoration
    img('gravestone', 32, 32, (c) => art.drawGravestone(c, 0, 0), true);
    img('candle', 32, 32, (c) => art.drawCandle(c, 0, 0), true);
    img('lava-crack', 32, 32, (c) => art.drawLavaCrack(c, 0, 0));
    img('obsidian', 32, 32, (c) => art.drawObsidian(c, 0, 0), true);
    img('icicle', 32, 32, (c) => art.drawIcicle(c, 0, 0), true);
    img('frost-banner', 32, 32, (c) => art.drawFrostBanner(c, 0, 0), true);
    img('toxic-mushroom', 32, 32, (c) => art.drawToxicMushroom(c, 0, 0), true);
    img('pipe', 32, 32, (c) => art.drawPipe(c, 0, 0), true);
    img('gauge', 32, 32, (c) => art.drawGauge(c, 0, 0), true);
    img('weapon-rack', 32, 32, (c) => art.drawWeaponRack(c, 0, 0), true);
    img('dead-tree', 32, 32, (c) => art.drawDeadTree(c, 0, 0), true);
    img('cattail', 32, 32, (c) => art.drawCattail(c, 0, 0), true);
    img('storm-orb', 32, 32, (c) => art.drawStormOrb(c, 0, 0), true);
    img('bone-pile', 32, 32, (c) => art.drawBonePile(c, 0, 0), true);
    img('rune-circle', 32, 32, (c) => art.drawRuneCircle(c, 0, 0));
    img('idol', 32, 32, (c) => art.drawIdol(c, 0, 0), true);
    img('altar', 32, 32, (c) => art.drawAltar(c, 0, 0), true);
    img('grass-tuft', 32, 32, (c) => townArt.drawGrassTuft(c, 0, 0));
    img('road', 32, 32, (c) => townArt.drawRoad(c, 0, 0, 7));
    img('town-tree', 32, 32, (c) => townArt.drawTownTree(c, 0, 0), true);
    img('town-bush', 32, 32, (c) => townArt.drawTownBush(c, 0, 0), true);
    img('bridge-plank', 32, 32, (c) => townArt.drawBridgePlank(c, 0, 0));
    img('chain', 32, 32, (c) => townArt.drawChain(c, 0, 0));
    img('town-gate', 32, 32, (c) => townArt.drawTownGate(c, 0, 0), true);
    img('house-roof-red', 32, 32, (c) => townArt.drawHouseRoofRed(c, 0, 0), true);
    img('house-roof-blue', 32, 32, (c) => townArt.drawHouseRoofBlue(c, 0, 0), true);
    img('house-roof-green', 32, 32, (c) => townArt.drawHouseRoofGreen(c, 0, 0), true);
    img('house-roof-teak', 32, 32, (c) => townArt.drawHouseRoofTeak(c, 0, 0), true);
    img('house-door', 32, 32, (c) => townArt.drawHouseDoor(c, 0, 0), true);
    img('house-wall', 32, 32, (c) => townArt.drawHouseWall(c, 0, 0));
    img('house-post', 32, 32, (c) => townArt.drawHousePost(c, 0, 0));
    img('house-beam', 32, 32, (c) => townArt.drawHouseBeam(c, 0, 0));
    img('house-base', 32, 32, (c) => townArt.drawHouseBase(c, 0, 0));
    img('house-window', 32, 32, (c) => townArt.drawHouseWindow(c, 0, 0));
    img('wood-floor', 32, 32, (c) => townArt.drawWoodFloor(c, 0, 0));
    img('tavern-wall', 32, 32, (c) => townArt.drawTavernWall(c, 0, 0));
    img('tavern-bar', 32, 32, (c) => townArt.drawTavernBar(c, 0, 0), true);
    img('tavern-table', 32, 32, (c) => townArt.drawTavernTable(c, 0, 0), true);
    img('tavern-stool', 32, 32, (c) => townArt.drawTavernStool(c, 0, 0), true);
    img('hearth', 32, 32, (c) => townArt.drawHearth(c, 0, 0), true);
    img('barrel', 32, 32, (c) => townArt.drawBarrel(c, 0, 0), true);
    img('rug', 32, 32, (c) => townArt.drawRug(c, 0, 0));
    img('shelf', 32, 32, (c) => townArt.drawShelf(c, 0, 0), true);
    img('guild-wall', 32, 32, (c) => townArt.drawGuildWall(c, 0, 0));
    img('training-dummy', 32, 32, (c) => townArt.drawTrainingDummy(c, 0, 0), true);
    img('anvil', 32, 32, (c) => townArt.drawAnvil(c, 0, 0), true);
    img('fountain', 64, 80, (c) => townArt.drawFountain(c, 0, 0), true);
    img('fountain-base', 200, 164, (c) => townArt.drawFountainBase(c, 0, 0));
    img('fx-ripple', 40, 40, (c) => townArt.drawRipple(c, 0, 0));
    img('town-butterfly', 16, 16, (c) => townArt.drawButterfly(c), true);
    img('town-bird', 16, 16, (c) => townArt.drawBird(c), true);
    img('town-dog', 16, 16, (c) => townArt.drawDog(c), true);
    for (let v = 0; v < 7; v++) img(`townsfolk-${v}`, 28, 36, (c) => townArt.drawTownsfolk(c, 0, 0, v), true);

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
    img('icon-shield', 16, 16, art.drawIconShield, true);
    img('icon-helm', 16, 16, art.drawIconHelm, true);
    img('icon-legs', 16, 16, art.drawIconLegs, true);
    img('icon-gloves', 16, 16, art.drawIconGloves, true);
    img('icon-boots', 16, 16, art.drawIconBoots, true);

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
    // neutral white glow — tints cleanly to any colour for themed ambient motes
    img('fx-glow-white', 16, 16, (c) => art.drawGlowDot(c, 'rgba(255,255,255,0.95)'));
    img('fx-arrow', 14, 6, art.drawArrow, true);
    img('fx-bolt', 10, 10, art.drawBolt);
    img('fx-light', 128, 128, (c) => art.drawRadialLight(c, 128, 128));
    img('fx-vignette', 740, 540, (c) => art.drawVignette(c, 740, 540));
    img('fx-edge', 740, 540, (c) => art.drawEdgeTint(c, 740, 540));

    // ---- heroes (outlined) ----
    for (const cls of ['vanguard', 'strider', 'arcanist', 'warden', 'necromancer']) {
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

    // ---- themed regulars (recolours + bespoke shapes) ----
    mon('monster-frost_shade-sheet', MONSTER_RAMPS.frost_shade, art.drawGhost);
    mon('monster-rime_archer-sheet', MONSTER_RAMPS.rime_archer, art.drawBoneArcher);
    mon('monster-plague_ooze-sheet', MONSTER_RAMPS.plague_ooze, art.drawOoze);
    mon('monster-spore_imp-sheet', MONSTER_RAMPS.spore_imp, art.drawImp);
    mon('monster-gear_knight-sheet', MONSTER_RAMPS.gear_knight, art.drawBrute);
    mon('monster-brass_sentinel-sheet', MONSTER_RAMPS.brass_sentinel, art.drawConstruct);
    mon('monster-gladiator-sheet', MONSTER_RAMPS.gladiator, art.drawGrunt);
    mon('monster-mire_lurker-sheet', MONSTER_RAMPS.mire_lurker, art.drawDemon);
    mon('monster-storm_wisp-sheet', MONSTER_RAMPS.storm_wisp, art.drawWisp);
    mon('monster-sky_lancer-sheet', MONSTER_RAMPS.sky_lancer, art.drawBoneArcher);
    mon('monster-shadow_stalker-sheet', MONSTER_RAMPS.shadow_stalker, art.drawStalker);
    mon('monster-void_imp-sheet', MONSTER_RAMPS.void_imp, art.drawImp);
    mon('monster-hollow_knight-sheet', MONSTER_RAMPS.hollow_knight, art.drawBrute);

    // ---- themed bosses ----
    mon('monster-rime_cantor-sheet', MONSTER_RAMPS.rime_cantor, art.drawBoss, BOSS_FW, BOSS_FH);
    mon('monster-rot_sovereign-sheet', MONSTER_RAMPS.rot_sovereign, art.drawBoss, BOSS_FW, BOSS_FH);
    mon('monster-brass_magnus-sheet', MONSTER_RAMPS.brass_magnus, art.drawColossus, BOSS_FW, BOSS_FH);
    mon('monster-arena_champion-sheet', MONSTER_RAMPS.arena_champion, art.drawColossus, BOSS_FW, BOSS_FH);
    mon('monster-mire_leviathan-sheet', MONSTER_RAMPS.mire_leviathan, art.drawColossus, BOSS_FW, BOSS_FH);
    mon('monster-tempest_herald-sheet', MONSTER_RAMPS.tempest_herald, art.drawBoss, BOSS_FW, BOSS_FH);
    mon('monster-umbral_devourer-sheet', MONSTER_RAMPS.umbral_devourer, art.drawBoss, BOSS_FW, BOSS_FH);
    mon('monster-hollow_king-sheet', MONSTER_RAMPS.hollow_king, art.drawBoss, BOSS_FW, BOSS_FH);

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
