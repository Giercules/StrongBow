#!/usr/bin/env node
/**
 * Gravecaller — D&D-style necromancer hero sheet (40×48 × 12 frames).
 */
const path = require('path');
const { createCanvas } = require('@napi-rs/canvas');
const { R, PX, blob, outlineRegion, writePng } = require('./_pixelHelpers.cjs');

/** Crisp edges without soft-shade blur. */
function sharpFinish(ctx, ox, fw, fh) {
  outlineRegion(ctx, ox, 0, fw, fh);
}

const FW = 40;
const FH = 48;
const N = 12;
const OUT = path.join(__dirname, '..', 'public', 'assets', 'sprites', 'hero-necromancer-sheet.png');

const C = {
  void: '#0c0814',
  black: '#1a1428',
  blackHi: '#2a2440',
  purple: '#5a30a0',
  purpleLt: '#8a58d0',
  purpleHi: '#b080f0',
  gold: '#d8b050',
  goldHi: '#ffe888',
  silver: '#c0c8d8',
  bone: '#e8e2d4',
  boneHi: '#faf6ee',
  boneSh: '#a8a090',
  necro: '#50d070',
  necroHi: '#98ffb0',
  necroCore: '#e0ffe8',
  necroDk: '#287840',
  wood: '#5a4830',
  woodHi: '#8a7858',
  blade: '#c0c8d8',
  bladeHi: '#f0f4ff',
  sh: 'rgba(0,0,0,0.32)',
};

function necroWisp(ctx, ox, x, y, big) {
  const pts = big
    ? [[0, 0, C.necroDk], [1, 0, C.necro], [2, 0, C.necroHi], [0, 1, C.necro], [1, 1, C.necroCore], [2, 1, C.necroHi], [1, 2, C.necro], [0, 2, C.necroDk], [2, 2, C.necro], [-1, 1, C.necroDk], [3, 1, C.necroHi]]
    : [[0, 0, C.necroDk], [1, 0, C.necro], [0, 1, C.necroHi], [1, 1, C.necroCore]];
  for (const [dx, dy, col] of pts) PX(ctx, ox + x + dx, y + dy, col);
}

function scythe(ctx, ox, cx, y, facing, pose) {
  const atk = pose === 3;
  const bob = pose === 1 ? -2 : pose === 2 ? -1 : 0;
  const sy = y + 5 + bob;
  if (facing === 'down') {
    const sx = ox + cx - 16;
    R(ctx, sx, sy + 6, 2, 32, C.wood);
    R(ctx, sx, sy + 6, 1, 32, C.woodHi);
    if (atk) {
      R(ctx, sx - 12, sy + 8, 16, 2, C.blade);
      R(ctx, sx - 14, sy + 7, 4, 3, C.bladeHi);
      R(ctx, sx - 10, sy + 8, 10, 1, C.necroHi);
    } else {
      R(ctx, sx - 6, sy + 2, 8, 2, C.blade);
      R(ctx, sx - 7, sy + 1, 4, 2, C.bladeHi);
      PX(ctx, sx - 8, sy + 2, C.necro);
    }
    R(ctx, sx, sy + 26, 4, 3, C.bone);
    return;
  }
  if (facing === 'up') {
    const sx = ox + cx - 13;
    R(ctx, sx, sy + 4, 2, 28, C.wood);
    R(ctx, sx - 4, sy + 2, 8, 2, C.blade);
    R(ctx, sx - 5, sy + 1, 3, 2, C.bladeHi);
    if (atk) R(ctx, sx - 10, sy + 10, 12, 2, C.necroHi);
    return;
  }
  const sx = ox + cx - 15;
  R(ctx, sx, sy + 4, 2, 30, C.wood);
  R(ctx, sx + 1, sy + 4, 1, 30, C.sh);
  if (atk) {
    R(ctx, sx + 2, sy + 6, 16, 2, C.blade);
    R(ctx, sx + 16, sy + 5, 5, 3, C.bladeHi);
    R(ctx, sx + 4, sy + 6, 12, 1, C.necroHi);
    PX(ctx, sx + 18, sy + 6, C.necroCore);
  } else {
    R(ctx, sx - 5, sy, 7, 2, C.blade);
    R(ctx, sx - 6, sy - 1, 3, 2, C.bladeHi);
    PX(ctx, sx - 7, sy, C.necro);
  }
  R(ctx, sx + 1, sy + 22, 3, 3, C.bone);
}

function staff(ctx, ox, cx, y, facing, pose) {
  const atk = pose === 3;
  const bob = pose === 1 ? -2 : pose === 2 ? -1 : 0;
  if (facing === 'up') return;
  if (facing === 'down') {
    const sx = ox + cx + 11;
    const sy = y + 4 + bob + (atk ? -2 : 0);
    R(ctx, sx, sy + 6, 2, 28, C.wood);
    R(ctx, sx, sy + 6, 1, 28, C.woodHi);
    blob(ctx, sx - 2, sy, 6, 6, C.bone);
    R(ctx, sx - 1, sy + 1, 4, 3, C.black);
    PX(ctx, sx, sy + 2, C.necroCore);
    PX(ctx, sx + 1, sy + 1, C.necro);
    if (atk) {
      necroWisp(ctx, sx + 4, sy - 2, true);
      necroWisp(ctx, sx - 6, sy, true);
      R(ctx, sx - 4, sy + 2, 10, 1, C.necroHi);
    }
    return;
  }
  const sx = ox + cx + 10;
  const sy = y + 6 + bob + (atk ? -4 : 0);
  R(ctx, sx, sy, 2, 26, C.wood);
  blob(ctx, sx - 2, sy - 6, 6, 6, C.bone);
  PX(ctx, sx, sy - 4, C.necroCore);
  if (atk) {
    necroWisp(ctx, sx + 4, sy - 8, true);
    R(ctx, sx + 2, sy - 2, 8, 1, C.necroHi);
  }
}

function hoodFace(ctx, ox, cx, y, facing) {
  if (facing === 'up') {
    R(ctx, ox + cx - 7, y + 1, 14, 9, C.black);
    R(ctx, ox + cx - 5, y + 2, 10, 7, C.purple);
    R(ctx, ox + cx - 5, y + 2, 10, 1, C.purpleHi);
    PX(ctx, ox + cx - 6, y, C.black);
    PX(ctx, ox + cx + 5, y, C.black);
    PX(ctx, ox + cx, y, C.purpleHi);
    R(ctx, ox + cx - 2, y + 5, 4, 3, C.gold);
    PX(ctx, ox + cx - 1, y + 6, C.necroCore);
    return;
  }
  if (facing === 'side') {
    blob(ctx, ox + cx - 5, y + 1, 12, 12, C.bone);
    R(ctx, ox + cx - 5, y + 1, 12, 2, C.boneHi);
    R(ctx, ox + cx + 5, y + 3, 2, 9, C.boneSh);
    R(ctx, ox + cx + 2, y + 4, 3, 4, C.void);
    R(ctx, ox + cx + 3, y + 5, 2, 3, C.necro);
    PX(ctx, ox + cx + 4, y + 6, C.necroCore);
    R(ctx, ox + cx + 1, y + 9, 5, 3, C.bone);
    for (let i = 0; i < 3; i++) PX(ctx, ox + cx + 2 + i, y + 10, C.void);
    R(ctx, ox + cx - 7, y, 2, 10, C.black);
    R(ctx, ox + cx - 6, y - 1, 3, 2, C.black);
    PX(ctx, ox + cx - 5, y - 1, C.purpleHi);
    return;
  }
  // down — large skull dominates; hood is a tight cowl, not a huge cowl blob
  blob(ctx, ox + cx - 8, y + 1, 16, 13, C.bone);
  R(ctx, ox + cx - 8, y + 1, 16, 2, C.boneHi);
  R(ctx, ox + cx - 8, y + 1, 3, 13, C.boneHi);
  R(ctx, ox + cx + 5, y + 3, 3, 11, C.boneSh);
  R(ctx, ox + cx - 5, y + 3, 4, 4, C.void);
  R(ctx, ox + cx + 1, y + 3, 4, 4, C.void);
  R(ctx, ox + cx - 4, y + 4, 3, 3, C.necro);
  R(ctx, ox + cx + 2, y + 4, 3, 3, C.necro);
  PX(ctx, ox + cx - 3, y + 5, C.necroCore);
  PX(ctx, ox + cx + 3, y + 5, C.necroCore);
  PX(ctx, ox + cx - 2, y + 4, C.necroHi);
  PX(ctx, ox + cx + 4, y + 4, C.necroHi);
  R(ctx, ox + cx - 4, y + 9, 8, 4, C.bone);
  R(ctx, ox + cx - 4, y + 9, 8, 1, C.boneHi);
  for (let i = 0; i < 4; i++) PX(ctx, ox + cx - 3 + i, y + 11, C.void);
  R(ctx, ox + cx - 3, y + 12, 6, 1, C.boneSh);
  R(ctx, ox + cx - 9, y, 18, 2, C.black);
  PX(ctx, ox + cx - 8, y - 1, C.black);
  PX(ctx, ox + cx + 7, y - 1, C.black);
  PX(ctx, ox + cx, y - 1, C.purpleHi);
  R(ctx, ox + cx - 10, y + 2, 2, 7, C.black);
  R(ctx, ox + cx + 8, y + 2, 2, 7, C.black);
}

function vestments(ctx, ox, cx, y, facing, pose) {
  const sway = pose === 1 ? -1 : pose === 2 ? 1 : 0;
  const bob = pose === 1 ? -2 : pose === 2 ? -1 : 0;
  const ty = y + 14 + bob;
  if (facing === 'side') {
    R(ctx, ox + cx - 11, ty, 17, 22, C.black);
    R(ctx, ox + cx - 9, ty, 14, 22, C.purple);
    R(ctx, ox + cx - 9, ty, 3, 22, C.purpleLt);
    R(ctx, ox + cx + 2, ty + 2, 4, 20, C.sh);
    R(ctx, ox + cx - 6, ty + 8, 8, 2, C.gold);
    PX(ctx, ox + cx - 2, ty + 9, C.necroCore);
    for (let i = 0; i < 3; i++) {
      const h = 5 + ((i + pose) % 2) * 3;
      R(ctx, ox + cx - 9 + i * 4 + sway, ty + 20 - h, 3, h, C.blackHi);
    }
    R(ctx, ox + cx - 5, ty + 28, 8, 10, C.void);
    R(ctx, ox + cx - 3, ty + 36, 3, 8, C.void);
    PX(ctx, ox + cx - 8, ty + 4, C.bone);
    return;
  }
  if (facing === 'up') {
    const rx = ox + cx - 12 + sway;
    R(ctx, rx, ty, 24, 26, C.black);
    R(ctx, rx + 2, ty, 20, 26, C.purple);
    R(ctx, rx + 9, ty + 2, 6, 22, C.purpleLt);
    R(ctx, rx + 4, ty + 10, 16, 2, C.gold);
    for (let i = 0; i < 5; i++) {
      const h = 6 + ((i + pose) % 2) * 4;
      R(ctx, rx - 1 + i * 5, ty + 24 - h, 4, h, C.blackHi);
    }
    R(ctx, rx + 8, ty + 26, 8, 12, C.void);
    return;
  }
  const rx = ox + cx - 13 + sway;
  R(ctx, rx - 2, ty - 2, 5, 4, C.bone);
  R(ctx, rx + 25, ty - 2, 5, 4, C.bone);
  R(ctx, rx, ty, 26, 24, C.black);
  R(ctx, rx + 2, ty, 22, 24, C.purple);
  R(ctx, rx + 10, ty, 6, 24, C.purpleLt);
  R(ctx, rx, ty, 4, 24, C.purpleLt);
  R(ctx, rx + 22, ty + 2, 4, 22, C.sh);
  R(ctx, rx + 8, ty + 4, 10, 12, C.blackHi);
  R(ctx, rx + 9, ty + 6, 8, 8, C.void);
  PX(ctx, ox + cx, ty + 9, C.necroCore);
  for (let i = 0; i < 4; i++) R(ctx, rx + 9, ty + 7 + i * 2, 6, 1, C.necroDk);
  R(ctx, rx + 5, ty + 16, 16, 2, C.gold);
  R(ctx, rx + 5, ty + 16, 16, 1, C.goldHi);
  for (let i = 0; i < 5; i++) PX(ctx, rx + 7 + i * 3, ty + 17, C.gold);
  R(ctx, rx + 7, ty + 26, 12, 2, C.blackHi);
  R(ctx, rx + 9, ty + 28, 8, 12, C.void);
  R(ctx, rx + 10, ty + 36, 3, 8, C.void);
  R(ctx, rx + 14, ty + 36, 3, 8, C.void);
}

function arms(ctx, ox, cx, y, facing, pose) {
  const atk = pose === 3;
  const bob = pose === 1 ? -2 : pose === 2 ? -1 : 0;
  const ly = y + 16 + bob;
  if (facing === 'down') {
    const spread = atk ? 2 : 0;
    R(ctx, ox + cx - 15 - spread, ly, 6, 4, C.purpleLt);
    R(ctx, ox + cx - 16 - spread, ly + 3, 5, 4, C.bone);
    R(ctx, ox + cx - 15 - spread, ly + 6, 2, 2, C.boneSh);
    R(ctx, ox + cx + 9 + spread, ly + (atk ? -3 : 0), 6, 4, C.purpleLt);
    R(ctx, ox + cx + 10 + spread, ly + 2 + (atk ? -3 : 0), 5, 4, C.bone);
    if (atk || pose === 0) necroWisp(ctx, ox + cx + 15 + spread, ly + (atk ? -4 : 0), atk);
    return;
  }
  if (facing === 'side') {
    R(ctx, ox + cx - 12, ly, 5, 11, C.purpleLt);
    R(ctx, ox + cx - 11, ly + 9, 4, 3, C.bone);
    R(ctx, ox + cx + 5, ly + (atk ? -3 : 0), 6, 4, C.purpleLt);
    R(ctx, ox + cx + 9, ly + 2 + (atk ? -3 : 0), 4, 3, C.bone);
    if (atk) necroWisp(ctx, ox + cx + 12, ly - 4, true);
  }
}

function drawDown(ctx, ox, pose) {
  const cx = 20;
  const y = 5;
  scythe(ctx, ox, cx, y, 'down', pose);
  vestments(ctx, ox, cx, y, 'down', pose);
  arms(ctx, ox, cx, y, 'down', pose);
  staff(ctx, ox, cx, y, 'down', pose);
  hoodFace(ctx, ox, cx, y, 'down');
  if (pose === 3) {
    necroWisp(ctx, ox + 4, y + 8, true);
    necroWisp(ctx, ox + FW - 10, y + 6, true);
    PX(ctx, ox + cx, y - 1, C.necroCore);
  }
}

function drawUp(ctx, ox, pose) {
  const cx = 20;
  const y = 5;
  scythe(ctx, ox, cx, y, 'up', pose);
  vestments(ctx, ox, cx, y, 'up', pose);
  hoodFace(ctx, ox, cx, y, 'up');
}

function drawSide(ctx, ox, pose) {
  const cx = 18;
  const y = 5;
  scythe(ctx, ox, cx, y, 'side', pose);
  vestments(ctx, ox, cx, y, 'side', pose);
  arms(ctx, ox, cx, y, 'side', pose);
  staff(ctx, ox, cx, y, 'side', pose);
  hoodFace(ctx, ox, cx, y, 'side');
}

function buildSheet() {
  const sheet = createCanvas(FW * N, FH);
  const ctx = sheet.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const order = [
    ['down', 0], ['down', 1], ['down', 2], ['down', 3],
    ['up', 0], ['up', 1], ['up', 2], ['up', 3],
    ['side', 0], ['side', 1], ['side', 2], ['side', 3],
  ];
  for (let i = 0; i < order.length; i++) {
    const [facing, pose] = order[i];
    const ox = i * FW;
    if (facing === 'down') drawDown(ctx, ox, pose);
    else if (facing === 'up') drawUp(ctx, ox, pose);
    else drawSide(ctx, ox, pose);
    sharpFinish(ctx, ox, FW, FH);
  }
  return sheet;
}

writePng(buildSheet(), OUT);
console.log('wrote', OUT, `${FW * N}x${FH}`);