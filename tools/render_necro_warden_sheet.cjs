#!/usr/bin/env node
/**
 * Pale King / Deathlord form — armored Grave Warden (44×44 × 4 frames).
 * Necromancer full-set transformation sprite.
 */
const path = require('path');
const { createCanvas } = require('@napi-rs/canvas');
const { R, PX, blob, finishFrame, writePng } = require('./_pixelHelpers.cjs');

const FW = 44;
const FH = 44;
const OUT = path.join(__dirname, '..', 'public', 'assets', 'sprites', 'necro-warden-sheet.png');

const C = {
  void: '#0c0814',
  robe: '#2a1058',
  robeLt: '#5a30a0',
  robeHi: '#8a58d0',
  gold: '#e8c050',
  goldHi: '#fff0a0',
  bone: '#e8e4dc',
  boneHi: '#ffffff',
  boneSh: '#a0a098',
  necro: '#50d070',
  necroHi: '#98ffb0',
  necroCore: '#e0ffe8',
  blade: '#c8d0e0',
  bladeHi: '#f4f8ff',
  wood: '#5a4830',
  sh: 'rgba(0,0,0,0.36)',
};

function drawFrame(ctx, ox, frame) {
  const cx = ox + 22;
  const bob = [0, -2, -1, 0][frame];
  const cast = frame === 3;

  R(ctx, cx - 14, 16 + bob, 28, 24, C.void);
  R(ctx, cx - 12, 16 + bob, 24, 24, C.robe);
  R(ctx, cx - 12, 16 + bob, 24, 3, C.robeHi);
  R(ctx, cx - 12, 16 + bob, 4, 24, C.robeLt);
  R(ctx, cx + 8, 18 + bob, 4, 22, C.sh);
  for (let i = 0; i < 5; i++) {
    const h = 5 + (i % 2) * 4;
    R(ctx, cx - 12 + i * 5, 36 + bob - h, 4, h, C.void);
    PX(ctx, cx - 10 + i * 5, 35 + bob - h, C.necro);
  }
  R(ctx, cx - 6, 22 + bob, 12, 10, C.gold);
  R(ctx, cx - 4, 24 + bob, 8, 6, C.necroCore);
  PX(ctx, cx - 1, 26 + bob, C.necroHi);
  for (let i = 0; i < 4; i++) R(ctx, cx - 5, 23 + bob + i * 2, 10, 1, C.robeHi);

  blob(ctx, cx - 8, 4 + bob, 16, 14, C.bone);
  R(ctx, cx - 8, 4 + bob, 16, 2, C.boneHi);
  R(ctx, cx + 6, 6 + bob, 2, 11, C.boneSh);
  R(ctx, cx - 8, 2 + bob, 16, 3, C.gold);
  PX(ctx, cx - 6, 1 + bob, C.goldHi);
  PX(ctx, cx - 1, 0 + bob, C.necroCore);
  PX(ctx, cx + 4, 1 + bob, C.goldHi);
  R(ctx, cx - 5, 8 + bob, 4, 3, C.void);
  R(ctx, cx + 1, 8 + bob, 4, 3, C.void);
  PX(ctx, cx - 4, 9 + bob, C.necroCore);
  PX(ctx, cx + 2, 9 + bob, C.necroCore);
  R(ctx, cx - 4, 12 + bob, 8, 2, C.boneSh);
  for (let i = 0; i < 4; i++) PX(ctx, cx - 3 + i * 2, 13 + bob, C.void);

  const ay = cast ? 6 : 14;
  R(ctx, cx + 12, ay + bob, 3, 26, C.wood);
  R(ctx, cx + 10, ay - 8 + bob, 12, 3, C.blade);
  R(ctx, cx + 20, ay - 12 + bob, 4, 8, C.bladeHi);
  R(ctx, cx + 10, ay - 8 + bob, 12, 1, C.necroHi);

  R(ctx, cx - 8, 38 + bob, 6, 4, C.robe);
  R(ctx, cx + 2, 38 + bob, 6, 4, C.robe);

  if (cast) {
    R(ctx, cx - 18, 18 + bob, 10, 10, C.necro);
    R(ctx, cx - 16, 20 + bob, 6, 6, C.necroCore);
    for (let i = 0; i < 5; i++) PX(ctx, cx - 14 + i * 2, 16 + bob, C.necroHi);
    R(ctx, cx + 8, ay - 14 + bob, 14, 2, C.necroHi);
  }
}

const sheet = createCanvas(FW * 4, FH);
const ctx = sheet.getContext('2d');
ctx.imageSmoothingEnabled = false;
for (let f = 0; f < 4; f++) {
  const ox = f * FW;
  drawFrame(ctx, ox, f);
  finishFrame(ctx, ox, FW, FH);
}
writePng(sheet, OUT);
console.log('wrote', OUT);