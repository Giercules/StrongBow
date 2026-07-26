#!/usr/bin/env node
/**
 * Art QA preview renderer.
 *
 * Renders the procedural art at 3x nearest-neighbour zoom onto contact sheets so
 * pixel decisions can be judged without launching the game. Mirrors exactly what
 * TextureFactory does (draw -> softShade -> outlineRegion) so what you see here
 * is what the engine registers.
 *
 * Usage:
 *   node tools/render_preview.cjs heroes     -> docs/preview-heroes.png
 *   node tools/render_preview.cjs monsters   -> docs/preview-monsters.png
 *   node tools/render_preview.cjs bosses     -> docs/preview-bosses.png
 *   node tools/render_preview.cjs tiles      -> docs/preview-tiles.png
 *   node tools/render_preview.cjs fx         -> docs/preview-fx.png
 *   node tools/render_preview.cjs all
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { createCanvas } = require('@napi-rs/canvas');

const ROOT = path.join(__dirname, '..');
const BUNDLE_TS = path.join(__dirname, '_artbundle.ts');
const BUNDLE_CJS = path.join(__dirname, '_artbundle.cjs');

function ensureBundle() {
  execSync(
    `npx esbuild "${BUNDLE_TS}" --bundle --format=cjs --platform=node --outfile="${BUNDLE_CJS}"`,
    { cwd: ROOT, stdio: 'pipe' }
  );
}
ensureBundle();
delete require.cache[require.resolve(BUNDLE_CJS)];
const { art, bossArt, monsterArt, C, HERO_RAMPS, MONSTER_RAMPS, THEME_ART } = require(BUNDLE_CJS);
/** Drawers live across three modules; bespoke ones win over the shared base. */
const drawFn = (name) => bossArt[name] || monsterArt[name] || art[name];

const Z = 2; // zoom
const BG = '#12141c';
const PANEL = '#1b1f2b';
const INK = '#e8ecf8';
const DIM = '#7f8aa6';

/** Draw one sprite cell (procedural draw + the engine's shade/outline passes). */
function cell(fw, fh, drawFn, { shade = true, outline = true } = {}) {
  const cv = createCanvas(fw, fh);
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  drawFn(ctx);
  if (shade) art.softShade(ctx, 0, 0, fw, fh);
  if (outline) art.outlineRegion(ctx, 0, 0, fw, fh);
  return cv;
}

function sheet(title, rows, opts = {}) {
  const pad = 14;
  const labelW = opts.labelW ?? 132;
  const gap = 10;
  const headH = 46;
  // measure
  let maxRowW = 0;
  let totalH = headH + pad;
  const rowH = [];
  for (const r of rows) {
    let w = labelW;
    let h = 0;
    for (const c of r.cells) {
      w += c.width * Z + gap;
      h = Math.max(h, c.height * Z);
    }
    maxRowW = Math.max(maxRowW, w);
    rowH.push(h + 18);
    totalH += h + 18 + gap;
  }
  const W = Math.max(560, maxRowW + pad * 2);
  const H = totalH + pad;
  const cv = createCanvas(W, H);
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#ffd24a';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(title, pad, 30);
  ctx.fillStyle = '#2a3145';
  ctx.fillRect(pad, 38, W - pad * 2, 2);

  let y = headH + pad;
  rows.forEach((r, i) => {
    ctx.fillStyle = i % 2 ? PANEL : '#171b26';
    ctx.fillRect(pad, y - 6, W - pad * 2, rowH[i]);
    ctx.fillStyle = INK;
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(r.label, pad + 6, y + 16);
    if (r.note) {
      ctx.fillStyle = DIM;
      ctx.font = '10px sans-serif';
      ctx.fillText(r.note, pad + 6, y + 30);
    }
    let x = pad + labelW;
    for (const c of r.cells) {
      ctx.drawImage(c, 0, 0, c.width, c.height, x, y, c.width * Z, c.height * Z);
      x += c.width * Z + gap;
    }
    y += rowH[i] + gap;
  });
  return cv;
}

function write(name, cv) {
  const out = path.join(ROOT, 'docs', name);
  fs.writeFileSync(out, cv.toBuffer('image/png'));
  console.log(`wrote ${path.relative(ROOT, out)} ${cv.width}x${cv.height}`);
}

// ---------------------------------------------------------------- heroes ----
function heroes() {
  const rows = [];
  for (const cls of Object.keys(HERO_RAMPS)) {
    const ramp = HERO_RAMPS[cls];
    const cells = [];
    for (const facing of ['down', 'up', 'side']) {
      for (let pose = 0; pose < 5; pose++) {
        cells.push(cell(art.HERO_FW, art.HERO_FH, (c) => art.drawHumanoid(c, 0, cls, ramp, facing, pose)));
      }
    }
    rows.push({ label: cls, note: 'down·up·side × idle/walkA/walkB/wind-up/strike', cells });
  }
  write('preview-heroes.png', sheet('HEROES — 40x48 @3x', rows));
}

// -------------------------------------------------------------- monsters ----
const REGULARS = [
  ['grunt', 'drawGrunt', 'grunt'],
  ['gladiator', 'drawGladiator', 'gladiator'],
  ['ghost', 'drawGhost', 'ghost'],
  ['frost_shade', 'drawFrostShade', 'frost_shade'],
  ['demon', 'drawDemon', 'demon'],
  ['mire_lurker', 'drawMireLurker', 'mire_lurker'],
  ['bone_archer', 'drawBoneArcher', 'bone_archer'],
  ['rime_archer', 'drawRimeArcher', 'rime_archer'],
  ['sky_lancer', 'drawSkyLancer', 'sky_lancer'],
  ['brute', 'drawBrute', 'brute'],
  ['gear_knight', 'drawGearKnight', 'gear_knight'],
  ['hollow_knight', 'drawHollowKnight', 'hollow_knight'],
  ['imp', 'drawImp', 'imp'],
  ['spore_imp', 'drawSporeImp', 'spore_imp'],
  ['void_imp', 'drawVoidImp', 'void_imp'],
  ['plague_ooze', 'drawOoze', 'plague_ooze'],
  ['brass_sentinel', 'drawConstruct', 'brass_sentinel'],
  ['storm_wisp', 'drawWisp', 'storm_wisp'],
  ['shadow_stalker', 'drawStalker', 'shadow_stalker'],
];

function monsters() {
  const rows = REGULARS.map(([id, drawer, ramp]) => ({
    label: id,
    note: drawer,
    cells: [0, 1, 2, 3].map((f) =>
      cell(art.MON_FW, art.MON_FH, (c) => drawFn(drawer)(c, 0, f, MONSTER_RAMPS[ramp]))
    ),
  }));
  // skeleton servants render at the small-mob size
  for (const role of ['tank', 'archer', 'mage', 'thief']) {
    rows.push({
      label: `skel_${role}`,
      note: 'drawSkeletonServant',
      cells: [0, 1, 2, 3].map((f) =>
        cell(art.SMALL_MOB_FW, art.SMALL_MOB_FH, (c) =>
          art.drawSkeletonServant(c, 0, f, MONSTER_RAMPS[`skel_${role}`], role)
        )
      ),
    });
  }
  write('preview-monsters.png', sheet('BESTIARY — 44x44 @3x', rows));
}

// ---------------------------------------------------------------- bosses ----
const BOSSES = [
  ['grave_warden', 'drawGraveWarden', 'grave_warden'],
  ['molten_colossus', 'drawMoltenColossus', 'molten_colossus'],
  ['rime_cantor', 'drawRimeCantor', 'rime_cantor'],
  ['rot_sovereign', 'drawRotSovereign', 'rot_sovereign'],
  ['brass_magnus', 'drawBrassMagnus', 'brass_magnus'],
  ['arena_champion', 'drawArenaChampion', 'arena_champion'],
  ['mire_leviathan', 'drawMireLeviathan', 'mire_leviathan'],
  ['tempest_herald', 'drawTempestHerald', 'tempest_herald'],
  ['umbral_devourer', 'drawUmbralDevourer', 'umbral_devourer'],
  ['hollow_king', 'drawHollowKing', 'hollow_king'],
];

function bosses() {
  const rows = BOSSES.map(([id, drawer, ramp]) => ({
    label: id,
    note: drawer,
    cells: [0, 1, 2, 3].map((f) =>
      cell(art.BOSS_FW, art.BOSS_FH, (c) => drawFn(drawer)(c, 0, f, MONSTER_RAMPS[ramp]))
    ),
  }));
  write('preview-bosses.png', sheet('REALM WARDENS — 80x80', rows, { labelW: 150 }));
}

// ----------------------------------------------------------------- tiles ----
function tiles() {
  const themes = Object.keys(THEME_ART);
  const rows = themes.map((t) => {
    const ta = THEME_ART[t];
    const cells = [];
    // a 4x2 block of floor so the dither/tiling reads
    const fl = createCanvas(64, 32);
    const fc = fl.getContext('2d');
    fc.imageSmoothingEnabled = false;
    for (let y = 0; y < 2; y++)
      for (let x = 0; x < 4; x++) art.drawFloor(fc, x * 16, y * 16, 1000 + (x + y * 4) * 97, ta.floor, t);
    cells.push(fl);
    // wall run with caps + roof deco + wall art
    const wl = createCanvas(64, 32);
    const wc = wl.getContext('2d');
    wc.imageSmoothingEnabled = false;
    for (let x = 0; x < 4; x++) {
      art.drawWall(wc, x * 16, 0, true, x, ta.wall);
      art.drawWallRoof(wc, x * 16, 0, t, x + 3);
      art.drawWall(wc, x * 16, 16, false, x + 9, ta.wall);
    }
    art.drawWallArt(wc, 16, 16, t, 5);
    cells.push(wl);
    return { label: t, note: ta.light ? ta.light.accent : '', cells };
  });
  write('preview-tiles.png', sheet('REALM TILES — floor 4x2 · wall 4x2 @3x', rows, { labelW: 110 }));
}

// -------------------------------------------------------------------- fx ----
function fx() {
  let fxArt = null;
  try {
    fxArt = require(BUNDLE_CJS).fxArt;
  } catch (_) { /* not built yet */ }
  const rows = [];
  const seq = (n, fw, fh, fn, opts) => Array.from({ length: n }, (_, f) => cell(fw, fh, (c) => fn(c, 0, f), opts));
  const NO = { shade: false, outline: false };
  rows.push({ label: 'magic burst', cells: seq(5, 32, 32, art.drawMagicBurst, NO) });
  rows.push({ label: 'slash', cells: seq(3, 16, 24, art.drawSlash, NO) });
  rows.push({ label: 'fire', cells: seq(4, 16, 16, art.drawFire, NO) });
  rows.push({ label: 'level-up ring', cells: seq(5, 32, 28, (c, o, f) => art.drawRing(c, o, f, C.coinHi), NO) });
  rows.push({ label: 'torch', cells: seq(4, 16, 16, art.drawTorch, { shade: false }) });
  rows.push({ label: 'portal', cells: seq(6, 16, 16, art.drawPortal, NO) });
  rows.push({ label: 'lava / water', cells: [...seq(4, 16, 16, art.drawLava, NO), ...seq(4, 16, 16, art.drawWater, NO)] });
  if (fxArt) {
    for (const [label, n, fw, fh, fn] of fxArt.PREVIEW_SEQUENCES(C)) {
      rows.push({ label, cells: seq(n, fw, fh, fn, NO) });
    }
  }
  write('preview-fx.png', sheet('FX LIBRARY @3x', rows, { labelW: 120 }));
}

const which = process.argv[2] || 'all';
const jobs = { heroes, monsters, bosses, tiles, fx };
if (which === 'all') for (const k of Object.keys(jobs)) jobs[k]();
else if (jobs[which]) jobs[which]();
else {
  console.error(`Unknown preview "${which}". Try: ${Object.keys(jobs).join(', ')}, all`);
  process.exit(1);
}
