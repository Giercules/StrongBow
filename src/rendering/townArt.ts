import type { Ctx } from './spriteArt';

// ----------------------------------------------------------------------------
// townArt — extra procedural sprites used only by the Hearthwatch town square:
// foliage, roads, a moat bridge with a chain, varied house roofs, and a few
// little living things (butterflies, birds, a dog) that wander the plaza.
// Self-contained (its own R/PX helpers) so it can grow without touching the
// large core spriteArt module.
// ----------------------------------------------------------------------------

function R(ctx: Ctx, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}
function PX(ctx: Ctx, x: number, y: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 1, 1);
}

// ---- ground -----------------------------------------------------------------

// A grassy tuft to scatter across the lawns (flat decor).
export function drawGrassTuft(ctx: Ctx, ox: number, oy: number): void {
  const g0 = '#3f6a2e', g1 = '#5a9a3e', g2 = '#7fc45a';
  for (const [x, h] of [[8, 8], [13, 12], [18, 10], [23, 8], [27, 6]] as [number, number][]) {
    R(ctx, ox + x, oy + 26 - h, 2, h, g0);
    R(ctx, ox + x, oy + 26 - h, 1, h, g1);
    PX(ctx, ox + x, oy + 26 - h, g2);
  }
  R(ctx, ox + 12, oy + 24, 12, 2, g1);
}

export function drawRoad(ctx: Ctx, ox: number, oy: number, seed = 0): void {
  R(ctx, ox, oy, 32, 32, '#6a5a42');
  const stones = ['#7a6a4e', '#5c4c38', '#857258', '#6f5e46'];
  let s = seed * 2654435761;
  const rnd = (): number => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  for (let gy = 0; gy < 8; gy++) {
    for (let gx = 0; gx < 8; gx++) {
      R(ctx, ox + gx * 4, oy + gy * 4, 4, 4, stones[Math.floor(rnd() * stones.length)]);
      R(ctx, ox + gx * 4, oy + gy * 4, 4, 1, '#4a3c2c');
      R(ctx, ox + gx * 4, oy + gy * 4, 1, 4, '#4a3c2c');
    }
  }
}

export function drawTownTree(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 14, oy + 18, 4, 12, '#4a3320');
  R(ctx, ox + 14, oy + 18, 2, 12, '#5e442a');
  R(ctx, ox + 6, oy + 6, 20, 12, '#2f5a26');
  R(ctx, ox + 8, oy + 4, 16, 14, '#3f7a34');
  R(ctx, ox + 10, oy + 4, 12, 6, '#5aa044');
  R(ctx, ox + 8, oy + 4, 4, 12, '#4a8a3a');
  R(ctx, ox + 20, oy + 6, 4, 10, '#2a4a1e');
  PX(ctx, ox + 12, oy + 6, '#7fc45a'); PX(ctx, ox + 18, oy + 8, '#7fc45a');
  PX(ctx, ox + 11, oy + 13, '#2a4a1e'); PX(ctx, ox + 22, oy + 12, '#2a4a1e');
}

export function drawTownBush(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 6, oy + 16, 20, 10, '#2f5a26');
  R(ctx, ox + 8, oy + 14, 16, 10, '#3f7a34');
  R(ctx, ox + 10, oy + 14, 10, 4, '#5aa044');
  R(ctx, ox + 8, oy + 14, 3, 10, '#4a8a3a');
  PX(ctx, ox + 12, oy + 16, '#7fc45a'); PX(ctx, ox + 20, oy + 18, '#7fc45a');
  R(ctx, ox + 16, oy + 20, 2, 2, '#d2452f'); R(ctx, ox + 10, oy + 22, 2, 2, '#d2452f');
}

export function drawBridgePlank(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox, oy, 32, 32, '#6e4a24');
  for (let i = 0; i < 8; i++) {
    R(ctx, ox, oy + i * 4, 32, 1, '#3a2410');
    R(ctx, ox + 1, oy + i * 4 + 1, 30, 1, '#82592c');
  }
  R(ctx, ox, oy, 2, 32, '#4a3018');
  R(ctx, ox + 30, oy, 2, 32, '#4a3018');
}

export function drawChain(ctx: Ctx, ox: number, oy: number): void {
  const steel = '#9aa0b4', dark = '#5a6072', hi = '#dfe6ff';
  for (let i = 0; i < 3; i++) {
    const x = ox + 4 + i * 10;
    ctx.strokeStyle = steel; ctx.lineWidth = 2; ctx.strokeRect(x, oy + 12, 6, 8);
    R(ctx, x + 1, oy + 12, 4, 2, hi);
    R(ctx, x + 2, oy + 18, 2, 2, dark);
    R(ctx, x + 6, oy + 14, 4, 2, steel);
  }
}

export function drawTownGate(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 2, oy + 4, 6, 24, '#6e5a40');
  R(ctx, ox + 24, oy + 4, 6, 24, '#6e5a40');
  R(ctx, ox + 2, oy + 4, 6, 2, '#9c8050');
  R(ctx, ox + 24, oy + 4, 6, 2, '#9c8050');
  R(ctx, ox + 2, oy + 2, 28, 4, '#5a3a1c');
  R(ctx, ox + 2, oy + 2, 28, 1, '#7a5128');
  R(ctx, ox + 12, oy + 8, 8, 6, '#3a2410');
  R(ctx, ox + 13, oy + 9, 6, 1, '#e0bd84');
  PX(ctx, ox + 15, oy + 11, '#e0bd84');
}

function roof(ctx: Ctx, ox: number, oy: number, base: string, hi: string, dk: string): void {
  R(ctx, ox, oy + 10, 32, 14, base);
  R(ctx, ox, oy + 10, 32, 4, hi);
  for (let x = 0; x < 32; x += 6) R(ctx, ox + x, oy + 14, 2, 10, dk);
  R(ctx, ox, oy + 22, 32, 2, dk);
  R(ctx, ox, oy + 24, 32, 2, '#2a1c0e');
}
export function drawHouseRoofRed(ctx: Ctx, ox: number, oy: number): void { roof(ctx, ox, oy, '#9c3a2a', '#c85a3e', '#5a1e14'); }
export function drawHouseRoofBlue(ctx: Ctx, ox: number, oy: number): void { roof(ctx, ox, oy, '#34507a', '#4f72a8', '#1e2f4a'); }
export function drawHouseRoofGreen(ctx: Ctx, ox: number, oy: number): void { roof(ctx, ox, oy, '#3a6a3a', '#56965a', '#1e3a1e'); }
export function drawHouseRoofTeak(ctx: Ctx, ox: number, oy: number): void { roof(ctx, ox, oy, '#6e4a24', '#8a6132', '#3a2410'); }
export function drawHouseDoor(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 10, oy + 8, 12, 22, '#3a2410');
  R(ctx, ox + 11, oy + 10, 10, 20, '#5a3a1c');
  R(ctx, ox + 11, oy + 10, 3, 20, '#6e4a24');
  R(ctx, ox + 15, oy + 10, 1, 20, '#3a2410');
  R(ctx, ox + 10, oy + 8, 12, 2, '#7a5128');
  PX(ctx, ox + 19, oy + 21, '#cfa64e');
}

// ---- little living things (single-frame; animated by tweens in-scene) ------

export function drawButterfly(ctx: Ctx): void {
  // 16x16 frame; body centred
  R(ctx, 8, 6, 1, 5, '#2a2018');
  // wings
  R(ctx, 4, 5, 4, 3, '#ff9a3a');
  R(ctx, 9, 5, 4, 3, '#ff9a3a');
  R(ctx, 4, 8, 3, 3, '#ffcf5a');
  R(ctx, 10, 8, 3, 3, '#ffcf5a');
  PX(ctx, 5, 6, '#fff4cf');
  PX(ctx, 11, 6, '#fff4cf');
  PX(ctx, 8, 5, '#1a120c');
}

export function drawBird(ctx: Ctx): void {
  // a little brown songbird, 16x16
  R(ctx, 6, 7, 5, 3, '#6e4a2a');
  R(ctx, 6, 7, 5, 1, '#8a6132');
  R(ctx, 10, 6, 2, 2, '#6e4a2a'); // head
  PX(ctx, 11, 6, '#000000'); // eye
  PX(ctx, 12, 7, '#e0a81e'); // beak
  R(ctx, 4, 9, 3, 1, '#3a2410'); // tail
  R(ctx, 7, 6, 3, 1, '#8a6132'); // wing
}

export function drawDog(ctx: Ctx): void {
  // a scruffy hound, side view, 16x16
  const body = '#8a6a42';
  const hi = '#a8865a';
  const dk = '#5a4226';
  R(ctx, 4, 8, 8, 4, body); // body
  R(ctx, 4, 8, 8, 1, hi);
  R(ctx, 11, 6, 3, 3, body); // head
  R(ctx, 13, 7, 1, 2, dk); // snout
  PX(ctx, 12, 7, '#000000'); // eye
  R(ctx, 11, 5, 1, 2, dk); // ear
  R(ctx, 5, 11, 1, 3, dk); // legs
  R(ctx, 7, 11, 1, 3, dk);
  R(ctx, 9, 11, 1, 3, dk);
  R(ctx, 11, 11, 1, 3, dk);
  R(ctx, 3, 8, 1, 3, body); // tail
  PX(ctx, 3, 7, hi);
}

const TF_SKIN = ['#caa07a', '#b07a4e', '#d8b48c', '#9a6e4a', '#c89a6a', '#9a6e4a', '#caa07a'];
const TF_ROBE = ['#7a5a3a', '#3a6a3a', '#cfc4a0', '#465566', '#5a3a7a', '#42305a', '#8a6a3a'];
const TF_ROBE_HI = ['#9a7a52', '#56965a', '#e8e0c0', '#6a7688', '#7a5a9a', '#5a4080', '#a8865a'];

export function drawTownsfolk(ctx: Ctx, ox: number, oy: number, variant: number): void {
  const v = ((variant % 7) + 7) % 7;
  const cx = ox + 14;
  const skin = TF_SKIN[v];
  const robe = TF_ROBE[v];
  const robeHi = TF_ROBE_HI[v];
  const SH = 'rgba(0,0,0,0.18)';
  R(ctx, cx - 4, oy + 26, 3, 6, '#3a2c1c');
  R(ctx, cx + 1, oy + 26, 3, 6, '#3a2c1c');
  R(ctx, cx - 4, oy + 31, 3, 2, '#1a120a');
  R(ctx, cx + 1, oy + 31, 3, 2, '#1a120a');
  R(ctx, cx - 6, oy + 14, 12, 14, robe);
  R(ctx, cx - 6, oy + 14, 12, 2, robeHi);
  R(ctx, cx - 6, oy + 14, 2, 14, robeHi);
  R(ctx, cx + 4, oy + 14, 2, 14, SH);
  R(ctx, cx - 8, oy + 15, 2, 9, robe);
  R(ctx, cx + 6, oy + 15, 2, 9, robe);
  R(ctx, cx - 8, oy + 23, 2, 2, skin);
  R(ctx, cx + 6, oy + 23, 2, 2, skin);
  R(ctx, cx - 4, oy + 5, 8, 9, skin);
  R(ctx, cx - 4, oy + 5, 8, 1, '#e6c89a');
  R(ctx, cx + 2, oy + 6, 1, 7, SH);
  PX(ctx, cx - 2, oy + 9, '#2a1c10');
  PX(ctx, cx + 1, oy + 9, '#2a1c10');
  if (v === 0) {
    R(ctx, cx - 5, oy + 3, 10, 3, '#8a8a92');
    R(ctx, cx - 6, oy + 13, 13, 2, '#8a8a92');
    R(ctx, cx + 6, oy + 22, 4, 4, '#5a3a1c');
    PX(ctx, cx + 6, oy + 22, '#e0457a'); PX(ctx, cx + 8, oy + 22, '#ffd24a'); PX(ctx, cx + 9, oy + 21, '#7a5aff');
  } else if (v === 1) {
    R(ctx, cx - 5, oy + 2, 10, 3, '#243a24'); R(ctx, cx - 7, oy + 4, 14, 2, '#243a24');
    R(ctx, cx + 6, oy + 17, 2, 7, '#e8e0c0');
  } else if (v === 2) {
    R(ctx, cx - 5, oy + 3, 10, 6, robeHi);
    R(ctx, cx - 5, oy + 3, 10, 1, '#fff4cf');
    R(ctx, cx - 6, oy + 6, 1, 6, robe); R(ctx, cx + 5, oy + 6, 1, 6, robe);
    R(ctx, cx - 10, oy + 6, 2, 22, '#5a3a1c');
    PX(ctx, cx - 10, oy + 5, '#cfa64e');
  } else if (v === 3) {
    R(ctx, cx - 4, oy + 3, 8, 3, '#8b94a8'); R(ctx, cx - 4, oy + 3, 8, 1, '#dfe6ff');
    R(ctx, cx - 5, oy + 5, 1, 3, '#8b94a8'); R(ctx, cx + 4, oy + 5, 1, 3, '#8b94a8');
    R(ctx, cx + 9, oy + 1, 2, 28, '#6e4a24'); R(ctx, cx + 8, oy, 4, 4, '#cfd6ff');
  } else if (v === 4) {
    R(ctx, cx - 5, oy + 2, 10, 3, '#7a2a4a'); PX(ctx, cx + 5, oy, '#ffd24a'); PX(ctx, cx + 5, oy + 1, '#ffd24a');
    R(ctx, cx - 12, oy + 16, 6, 8, '#8a5a2a'); R(ctx, cx - 12, oy + 16, 6, 1, '#b07a3a');
    R(ctx, cx - 8, oy + 11, 1, 6, '#6e4a24');
  } else if (v === 5) {
    R(ctx, cx - 6, oy + 2, 12, 9, robe);
    R(ctx, cx - 4, oy + 8, 8, 4, 'rgba(0,0,0,0.55)');
    PX(ctx, cx - 2, oy + 10, '#c79bff'); PX(ctx, cx + 1, oy + 10, '#c79bff');
  } else {
    R(ctx, cx - 4, oy + 4, 8, 2, '#6a4a2a'); R(ctx, cx - 4, oy + 4, 1, 4, '#6a4a2a'); R(ctx, cx + 3, oy + 4, 1, 4, '#6a4a2a');
    R(ctx, cx - 5, oy + 17, 10, 9, '#b89a6a'); R(ctx, cx - 5, oy + 17, 10, 1, '#cdb488');
    R(ctx, cx + 3, oy + 20, 3, 3, '#7a5a2a'); PX(ctx, cx + 4, oy + 21, '#ffd24a');
  }
}



// Town centrepiece: a tiered stone fountain that sits over the plaza pool.
export function drawFountain(ctx: Ctx, ox: number, oy: number): void {
  const stone = '#9a9286', stoneHi = '#bcb4a6', stoneDk = '#6a6258';
  const water = '#2f86b5', waterHi = '#7fc8e8', spray = '#dffaff';
  // lower basin
  R(ctx, ox + 2, oy + 42, 44, 12, stone);
  R(ctx, ox + 2, oy + 42, 44, 3, stoneHi);
  R(ctx, ox + 2, oy + 51, 44, 3, stoneDk);
  R(ctx, ox + 6, oy + 44, 36, 7, water);
  R(ctx, ox + 6, oy + 44, 36, 2, waterHi);
  R(ctx, ox + 12, oy + 48, 8, 1, waterHi); // ripples
  R(ctx, ox + 28, oy + 47, 8, 1, waterHi);
  // pedestal
  R(ctx, ox + 19, oy + 26, 10, 18, stone);
  R(ctx, ox + 19, oy + 26, 3, 18, stoneHi);
  R(ctx, ox + 26, oy + 26, 3, 18, stoneDk);
  // upper basin
  R(ctx, ox + 12, oy + 22, 24, 7, stone);
  R(ctx, ox + 12, oy + 22, 24, 2, stoneHi);
  R(ctx, ox + 12, oy + 27, 24, 2, stoneDk);
  R(ctx, ox + 15, oy + 23, 18, 4, water);
  R(ctx, ox + 15, oy + 23, 18, 1, waterHi);
  // finial + top water bulb
  R(ctx, ox + 21, oy + 12, 6, 10, stone);
  R(ctx, ox + 21, oy + 12, 2, 10, stoneHi);
  ctx.fillStyle = spray; ctx.beginPath(); ctx.arc(ox + 24, oy + 10, 4, 0, Math.PI * 2); ctx.fill();
  PX(ctx, ox + 24, oy + 8, '#ffffff');
  // falling water streams (upper basin -> lower)
  R(ctx, ox + 14, oy + 29, 1, 13, spray);
  R(ctx, ox + 33, oy + 29, 1, 13, spray);
  PX(ctx, ox + 19, oy + 13, spray); PX(ctx, ox + 29, oy + 13, spray); // arc droplets
  PX(ctx, ox + 17, oy + 16, '#bfe9ff'); PX(ctx, ox + 31, oy + 16, '#bfe9ff');
}
