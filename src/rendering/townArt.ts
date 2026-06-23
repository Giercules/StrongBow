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
  const g0 = '#3f6a2e';
  const g1 = '#5a9a3e';
  const g2 = '#7fc45a';
  for (const [x, h] of [
    [5, 4],
    [7, 6],
    [9, 5],
    [11, 4],
  ] as [number, number][]) {
    R(ctx, ox + x, oy + 13 - h, 1, h, g0);
    PX(ctx, ox + x, oy + 13 - h, g2);
  }
  R(ctx, ox + 6, oy + 12, 5, 1, g1);
}

// A cobbled road tile (flat). Seeded so a row of them looks varied but tiles.
export function drawRoad(ctx: Ctx, ox: number, oy: number, seed = 0): void {
  R(ctx, ox, oy, 16, 16, '#6a5a42');
  const stones = ['#7a6a4e', '#5c4c38', '#857258', '#6f5e46'];
  let s = seed * 2654435761;
  const rnd = (): number => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  for (let gy = 0; gy < 4; gy++) {
    for (let gx = 0; gx < 4; gx++) {
      const c = stones[Math.floor(rnd() * stones.length)];
      R(ctx, ox + gx * 4, oy + gy * 4, 4, 4, c);
      R(ctx, ox + gx * 4, oy + gy * 4, 4, 1, '#4a3c2c'); // mortar lines
      R(ctx, ox + gx * 4, oy + gy * 4, 1, 4, '#4a3c2c');
    }
  }
}

// ---- foliage (upright, gently swayed by the renderer) -----------------------

export function drawTownTree(ctx: Ctx, ox: number, oy: number): void {
  // trunk
  R(ctx, ox + 7, oy + 9, 2, 6, '#4a3320');
  R(ctx, ox + 7, oy + 9, 1, 6, '#5e442a');
  // canopy — layered greens
  R(ctx, ox + 3, oy + 3, 10, 6, '#2f5a26');
  R(ctx, ox + 4, oy + 2, 8, 7, '#3f7a34');
  R(ctx, ox + 5, oy + 2, 6, 3, '#5aa044');
  PX(ctx, ox + 6, oy + 3, '#7fc45a');
  PX(ctx, ox + 9, oy + 4, '#7fc45a');
  PX(ctx, ox + 5, oy + 6, '#2a4a1e');
  PX(ctx, ox + 11, oy + 6, '#2a4a1e');
}

export function drawTownBush(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 3, oy + 8, 10, 5, '#2f5a26');
  R(ctx, ox + 4, oy + 7, 8, 5, '#3f7a34');
  R(ctx, ox + 5, oy + 7, 5, 2, '#5aa044');
  PX(ctx, ox + 6, oy + 8, '#7fc45a');
  PX(ctx, ox + 10, oy + 9, '#7fc45a');
  // a couple of berries
  PX(ctx, ox + 8, oy + 10, '#d2452f');
  PX(ctx, ox + 5, oy + 11, '#d2452f');
}

// ---- moat crossing ----------------------------------------------------------

// Wooden bridge plank tile (flat, laid over the moat water).
export function drawBridgePlank(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox, oy, 16, 16, '#6e4a24');
  for (let i = 0; i < 4; i++) {
    R(ctx, ox, oy + i * 4, 16, 1, '#3a2410'); // plank seams
    R(ctx, ox + 1, oy + i * 4 + 1, 14, 1, '#82592c'); // plank highlight
  }
  R(ctx, ox, oy, 1, 16, '#4a3018');
  R(ctx, ox + 15, oy, 1, 16, '#4a3018');
}

// A heavy chain (drawn along the bridge rope-rail).
export function drawChain(ctx: Ctx, ox: number, oy: number): void {
  const steel = '#9aa0b4';
  const dark = '#5a6072';
  const hi = '#dfe6ff';
  for (let i = 0; i < 3; i++) {
    const x = ox + 2 + i * 5;
    ctx.strokeStyle = steel;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, oy + 6, 3, 4);
    PX(ctx, x + 1, oy + 6, hi);
    PX(ctx, x + 2, oy + 9, dark);
    R(ctx, x + 3, oy + 7, 2, 1, steel); // link joining the next
  }
}

// A timber gate / archway marking a town exit (placed, not yet active).
export function drawTownGate(ctx: Ctx, ox: number, oy: number): void {
  // stone posts
  R(ctx, ox + 1, oy + 2, 3, 12, '#6e5a40');
  R(ctx, ox + 12, oy + 2, 3, 12, '#6e5a40');
  R(ctx, ox + 1, oy + 2, 3, 1, '#9c8050');
  R(ctx, ox + 12, oy + 2, 3, 1, '#9c8050');
  // arch beam
  R(ctx, ox + 1, oy + 1, 14, 2, '#5a3a1c');
  R(ctx, ox + 1, oy + 1, 14, 1, '#7a5128');
  // hanging sign
  R(ctx, ox + 6, oy + 4, 4, 3, '#3a2410');
  PX(ctx, ox + 7, oy + 5, '#e0bd84');
  PX(ctx, ox + 8, oy + 5, '#e0bd84');
}

// ---- houses (varied roofs sit atop the timbered building blocks) -----------

function roof(ctx: Ctx, ox: number, oy: number, base: string, hi: string, dk: string): void {
  R(ctx, ox, oy + 5, 16, 7, base);
  R(ctx, ox, oy + 5, 16, 2, hi);
  for (let x = 0; x < 16; x += 3) R(ctx, ox + x, oy + 7, 1, 5, dk); // shingle seams
  R(ctx, ox - 0, oy + 11, 16, 1, dk);
  // eave
  R(ctx, ox, oy + 12, 16, 1, '#2a1c0e');
}
export function drawHouseRoofRed(ctx: Ctx, ox: number, oy: number): void {
  roof(ctx, ox, oy, '#9c3a2a', '#c85a3e', '#5a1e14');
}
export function drawHouseRoofBlue(ctx: Ctx, ox: number, oy: number): void {
  roof(ctx, ox, oy, '#34507a', '#4f72a8', '#1e2f4a');
}
export function drawHouseRoofGreen(ctx: Ctx, ox: number, oy: number): void {
  roof(ctx, ox, oy, '#3a6a3a', '#56965a', '#1e3a1e');
}
export function drawHouseRoofTeak(ctx: Ctx, ox: number, oy: number): void {
  roof(ctx, ox, oy, '#6e4a24', '#8a6132', '#3a2410');
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
