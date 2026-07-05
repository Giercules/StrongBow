import type { Ctx } from './spriteArt';

// ----------------------------------------------------------------------------
// desertTownArt — procedural pixel art for Sunspire, the sandstone oasis-town of
// the deep desert. Sun-baked adobe architecture, a stepped Sun Temple, a covered
// bazaar (souk) of striped awnings and spice, a palm oasis, and a caravanserai of
// Bedouin tents and camels. Self-contained (its own R/PX helpers) so it can grow
// without touching townArt or the core spriteArt module. Warm ochre palette,
// hard-edged, dark-fantasy but bright with heat.
// ----------------------------------------------------------------------------

function R(ctx: Ctx, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}
function PX(ctx: Ctx, x: number, y: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 1, 1);
}
/** Tiny deterministic RNG so speckle is stable every bake. */
function rng(seed: number): () => number {
  let s = (seed * 2654435761) >>> 0;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

// Shared ochre-sandstone palette for the adobe architecture.
const SAND0 = '#c9a86a'; // plaster base
const SAND1 = '#d8bd82'; // sunlit
const SAND2 = '#a8814c'; // shade
const SAND3 = '#8a6638'; // deep shade / mortar
const SANDHI = '#ecd7a2'; // highlight catch-light
const CLAY = '#7a4f2c'; // timber / palm-log brown
const CLAYHI = '#9a6a3c';

// ============================================================================
// BUILDING FACADE TILES (opaque, 32x32, tile seamlessly — go in buildingTiles)
// ============================================================================

/** Sandstone plaster wall: mudbrick courses with weathered plaster patches. */
export function drawAdobeWall(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox, oy, 32, 32, SAND0);
  const r = rng(7);
  // faint mudbrick courses
  for (let cy = 0; cy < 32; cy += 8) {
    R(ctx, ox, oy + cy, 32, 1, SAND3);
    R(ctx, ox, oy + cy + 1, 32, 1, SAND1);
    const off = (cy / 8) % 2 ? 8 : 0;
    for (let bx = off; bx < 32; bx += 16) R(ctx, ox + bx, oy + cy, 1, 8, SAND3);
  }
  // sun-weathered plaster mottling
  for (let i = 0; i < 18; i++) {
    const x = Math.floor(r() * 32), y = Math.floor(r() * 32);
    PX(ctx, ox + x, oy + y, r() < 0.5 ? SAND1 : SAND2);
  }
  R(ctx, ox, oy, 32, 1, SANDHI); // top catch-light
}

/** Flat mudbrick roof / parapet — the top course of an adobe building. Reads
 *  as a flat sun-roof with a low parapet lip and a projecting waterspout. */
export function drawAdobeRoof(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox, oy, 32, 32, SAND2);
  // flat roof deck (baked earth, slightly darker, faint cracks)
  R(ctx, ox, oy + 6, 32, 26, SAND0);
  const r = rng(21);
  for (let i = 0; i < 10; i++) R(ctx, ox + Math.floor(r() * 30), oy + 8 + Math.floor(r() * 20), 2, 1, SAND2);
  // parapet lip along the top with crenel gaps
  R(ctx, ox, oy, 32, 6, SAND1);
  R(ctx, ox, oy, 32, 1, SANDHI);
  R(ctx, ox, oy + 5, 32, 1, SAND3);
  for (let bx = 2; bx < 32; bx += 8) R(ctx, ox + bx, oy, 3, 3, SAND2); // merlon shadows
  // projecting wooden waterspout
  R(ctx, ox + 24, oy + 7, 6, 2, CLAY);
  R(ctx, ox + 28, oy + 7, 2, 4, CLAY);
}

/** Lintel course: the wall row just under the roof, with projecting viga roof
 *  beams (round palm-log ends) — the signature adobe detail. */
export function drawAdobeEave(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox, oy, 32, 32, SAND0);
  for (let cy = 8; cy < 32; cy += 8) {
    R(ctx, ox, oy + cy, 32, 1, SAND3);
    R(ctx, ox, oy + cy + 1, 32, 1, SAND1);
  }
  // projecting viga beam-ends poking through the plaster
  for (let bx = 3; bx < 32; bx += 9) {
    R(ctx, ox + bx, oy + 2, 4, 3, CLAY);
    R(ctx, ox + bx, oy + 2, 4, 1, CLAYHI);
    PX(ctx, ox + bx + 1, oy + 3, '#3a2410');
  }
  R(ctx, ox, oy, 32, 1, SANDHI);
}

/** Wall base: sandstone with a broad ground shadow + a mud-plaster plinth. */
export function drawAdobeBase(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox, oy, 32, 32, SAND0);
  R(ctx, ox, oy, 32, 1, SAND3);
  R(ctx, ox, oy + 1, 32, 1, SAND1);
  // darker rubble-stone plinth at the very bottom
  R(ctx, ox, oy + 22, 32, 10, SAND2);
  R(ctx, ox, oy + 22, 32, 1, SAND3);
  for (let sx = 0; sx < 32; sx += 6) { R(ctx, ox + sx, oy + 23, 5, 8, SAND3); R(ctx, ox + sx + 1, oy + 24, 3, 3, '#93693a'); }
  R(ctx, ox, oy + 30, 32, 2, 'rgba(20,12,6,0.4)'); // contact shadow
}

/** Corner quoin / pilaster — a shaded vertical buttress edge. */
export function drawAdobePost(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox, oy, 32, 32, SAND2);
  R(ctx, ox + 4, oy, 24, 32, SAND0);
  R(ctx, ox + 4, oy, 2, 32, SANDHI);
  R(ctx, ox + 26, oy, 2, 32, SAND3);
  for (let cy = 0; cy < 32; cy += 8) { R(ctx, ox + 4, oy + cy, 24, 1, SAND3); R(ctx, ox + 4, oy + cy + 1, 24, 1, SAND1); }
}

/** Arched shuttered window with a warm interior glow and a carved surround. */
export function drawAdobeWindow(ctx: Ctx, ox: number, oy: number): void {
  drawAdobeWall(ctx, ox, oy);
  // carved keyhole-arch surround
  R(ctx, ox + 9, oy + 8, 14, 18, SAND2);
  R(ctx, ox + 10, oy + 6, 12, 4, SAND2);
  R(ctx, ox + 11, oy + 5, 10, 2, SAND1);
  // dark recess with warm lamplight within
  R(ctx, ox + 11, oy + 10, 10, 15, '#2a1a10');
  R(ctx, ox + 12, oy + 12, 8, 11, 'rgba(255,176,72,0.55)');
  R(ctx, ox + 13, oy + 14, 6, 7, 'rgba(255,206,120,0.7)');
  // turned-wood mashrabiya lattice
  for (let i = 0; i < 3; i++) R(ctx, ox + 12 + i * 3, oy + 10, 1, 15, CLAY);
  R(ctx, ox + 11, oy + 16, 10, 1, CLAY);
  R(ctx, ox + 10, oy + 6, 12, 1, SANDHI);
}

/** Keyhole-arched door of banded palm wood in a painted sandstone frame. */
export function drawAdobeDoor(ctx: Ctx, ox: number, oy: number): void {
  drawAdobeWall(ctx, ox, oy);
  // teal-painted arched frame (a splash of colour against the ochre)
  R(ctx, ox + 7, oy + 5, 18, 27, '#2f6a6a');
  R(ctx, ox + 8, oy + 3, 16, 4, '#2f6a6a');
  R(ctx, ox + 9, oy + 2, 14, 2, '#3f8a8a');
  // recessed keyhole door
  R(ctx, ox + 10, oy + 8, 12, 24, '#4a2e18');
  R(ctx, ox + 11, oy + 6, 10, 4, '#4a2e18');
  // vertical plank banding + iron studs
  for (let i = 0; i < 4; i++) { R(ctx, ox + 11 + i * 3, oy + 8, 1, 24, '#31200f'); R(ctx, ox + 12 + i * 3, oy + 9, 1, 22, '#5e3c20'); }
  for (let sy = 12; sy < 30; sy += 6) { PX(ctx, ox + 13, oy + sy, '#c9a86a'); PX(ctx, ox + 19, oy + sy, '#c9a86a'); }
  R(ctx, ox + 16, oy + 18, 2, 3, '#e0bd84'); // ring handle
  R(ctx, ox + 8, oy + 3, 16, 1, '#4fb0a0'); // frame catch-light
}

/** Sandstone rampart battlement — the town's crenellated curtain wall (32x32,
 *  a building facade tile). Reads as a mudbrick defensive wall with merlons. */
export function drawRampart(ctx: Ctx, ox: number, oy: number): void {
  // crenellated top: merlons with embrasure gaps
  R(ctx, ox, oy, 32, 8, 'rgba(0,0,0,0)');
  for (let bx = 0; bx < 32; bx += 8) {
    R(ctx, ox + bx, oy, 5, 8, SAND1);
    R(ctx, ox + bx, oy, 5, 1, SANDHI);
    R(ctx, ox + bx, oy + 7, 5, 1, SAND3);
  }
  R(ctx, ox, oy + 7, 32, 1, SAND3);
  // wall body with mudbrick courses
  R(ctx, ox, oy + 8, 32, 24, SAND0);
  for (let cy = 11; cy < 32; cy += 7) {
    R(ctx, ox, oy + cy, 32, 1, SAND3);
    R(ctx, ox, oy + cy + 1, 32, 1, SAND1);
    const off = ((cy - 11) / 7) % 2 ? 8 : 0;
    for (let bx = off; bx < 32; bx += 16) R(ctx, ox + bx, oy + cy, 1, 7, SAND3);
  }
  const r = rng(33);
  for (let i = 0; i < 14; i++) PX(ctx, ox + Math.floor(r() * 32), oy + 10 + Math.floor(r() * 21), r() < 0.5 ? SAND1 : SAND2);
}

// ============================================================================
// TEMPLE & LANDMARKS (props, outlined, transparent bg)
// ============================================================================

/** A broad stepped sandstone temple tier (for building the ziggurat body). */
export function drawTempleStep(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox, oy + 4, 32, 28, SAND2);
  R(ctx, ox + 2, oy + 4, 28, 6, SAND1);
  R(ctx, ox + 2, oy + 4, 28, 1, SANDHI);
  R(ctx, ox, oy + 10, 32, 1, SAND3);
  R(ctx, ox, oy + 11, 32, 21, SAND0);
  // engraved fluting
  for (let x = 4; x < 30; x += 5) R(ctx, ox + x, oy + 12, 1, 18, SAND3);
  // painted band
  R(ctx, ox, oy + 24, 32, 3, '#b5622f');
  R(ctx, ox, oy + 24, 32, 1, '#d9863f');
  for (let x = 2; x < 32; x += 6) PX(ctx, ox + x, oy + 25, '#f0c15a');
}

/** The Sunspire itself: a slim obelisk crowned by a gilded sun-disc that the
 *  whole town is named for (32x48, glows). */
export function drawSunSpire(ctx: Ctx, ox: number, oy: number): void {
  // tapering sandstone obelisk
  R(ctx, ox + 12, oy + 14, 8, 34, SAND2);
  R(ctx, ox + 13, oy + 14, 5, 34, SAND0);
  R(ctx, ox + 14, oy + 14, 2, 34, SAND1);
  ctx.fillStyle = SAND2;
  ctx.beginPath(); ctx.moveTo(ox + 12, oy + 14); ctx.lineTo(ox + 16, oy + 9); ctx.lineTo(ox + 20, oy + 14); ctx.closePath(); ctx.fill();
  // carved sun glyphs down the shaft
  for (let sy = 20; sy < 46; sy += 7) { PX(ctx, ox + 15, oy + sy, '#7a4f2c'); PX(ctx, ox + 16, oy + sy, '#7a4f2c'); }
  // gilded sun-disc
  const g0 = '#e8a92a', g1 = '#ffd964', g2 = '#b6791e';
  R(ctx, ox + 9, oy + 3, 14, 10, g0);
  R(ctx, ox + 11, oy + 2, 10, 11, g1);
  R(ctx, ox + 13, oy + 1, 6, 12, g1);
  R(ctx, ox + 10, oy + 10, 12, 2, g2);
  PX(ctx, ox + 15, oy + 5, '#fff0b0'); PX(ctx, ox + 16, oy + 6, '#fff0b0');
  // radiating sun-rays
  for (const [rx, ry] of [[6, 6], [25, 6], [8, 1], [23, 1], [4, 9], [27, 9]] as [number, number][]) {
    R(ctx, ox + rx, oy + ry, 2, 2, g1);
  }
  R(ctx, ox + 5, oy + 46, 22, 2, SAND3); // base shadow
}

/** Golden sun-disc shrine idol (warm glow prop for the temple plaza). */
export function drawSunIdol(ctx: Ctx, ox: number, oy: number): void {
  // stone plinth
  R(ctx, ox + 8, oy + 24, 16, 7, SAND2);
  R(ctx, ox + 8, oy + 24, 16, 1, SAND1);
  R(ctx, ox + 6, oy + 30, 20, 2, SAND3);
  // gilded disc on a short pillar
  R(ctx, ox + 14, oy + 18, 4, 7, '#b6791e');
  const g1 = '#ffd964', g0 = '#e8a92a', g2 = '#b6791e';
  R(ctx, ox + 10, oy + 6, 12, 12, g0);
  R(ctx, ox + 12, oy + 5, 8, 14, g1);
  R(ctx, ox + 11, oy + 15, 10, 2, g2);
  PX(ctx, ox + 15, oy + 9, '#fff0b0'); PX(ctx, ox + 16, oy + 10, '#fff0b0');
  // rays
  for (const [rx, ry] of [[6, 10], [24, 10], [8, 4], [22, 4], [15, 1], [4, 14], [26, 14]] as [number, number][])
    R(ctx, ox + rx, oy + ry, 2, 2, g1);
}

/** A guardian sphinx / lion statue flanking the temple stairs. */
export function drawSphinx(ctx: Ctx, ox: number, oy: number): void {
  const st = '#b89a62', stHi = '#d2b784', stLo = '#8a6d3e';
  // plinth
  R(ctx, ox + 4, oy + 26, 24, 5, stLo);
  R(ctx, ox + 4, oy + 26, 24, 1, st);
  // couchant body
  R(ctx, ox + 6, oy + 16, 20, 11, st);
  R(ctx, ox + 6, oy + 16, 20, 1, stHi);
  R(ctx, ox + 6, oy + 25, 20, 2, stLo);
  // forelegs
  R(ctx, ox + 22, oy + 20, 3, 7, st);
  R(ctx, ox + 25, oy + 25, 4, 2, stLo); // paws
  // head + nemes headdress
  R(ctx, ox + 21, oy + 8, 8, 9, st);
  R(ctx, ox + 20, oy + 7, 10, 4, '#2f6a6a'); // striped headcloth
  R(ctx, ox + 20, oy + 7, 10, 1, '#4fb0a0');
  R(ctx, ox + 19, oy + 11, 2, 6, '#2f6a6a'); R(ctx, ox + 29, oy + 11, 2, 6, '#2f6a6a');
  PX(ctx, ox + 24, oy + 12, '#1a120a'); // eye
  R(ctx, ox + 27, oy + 14, 2, 1, stLo); // muzzle
}

/** A carved stone sundial on a fluted pillar. */
export function drawSundial(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 12, oy + 14, 8, 16, SAND2);
  R(ctx, ox + 13, oy + 14, 5, 16, SAND0);
  R(ctx, ox + 8, oy + 28, 16, 3, SAND3);
  for (let x = 13; x < 18; x += 2) R(ctx, ox + x, oy + 16, 1, 12, SAND3);
  // dial plate
  R(ctx, ox + 6, oy + 9, 20, 7, SAND1);
  R(ctx, ox + 6, oy + 9, 20, 1, SANDHI);
  R(ctx, ox + 6, oy + 15, 20, 1, SAND3);
  for (let x = 8; x < 26; x += 3) PX(ctx, ox + x, oy + 11, SAND3); // hour marks
  // gnomon + its shadow
  ctx.fillStyle = '#6b5a44';
  ctx.beginPath(); ctx.moveTo(ox + 16, oy + 15); ctx.lineTo(ox + 16, oy + 6); ctx.lineTo(ox + 20, oy + 15); ctx.closePath(); ctx.fill();
  R(ctx, ox + 12, oy + 13, 4, 1, 'rgba(0,0,0,0.35)');
}

// ============================================================================
// THE GRAND BAZAAR / SOUK (props, outlined)
// ============================================================================

function awning(ctx: Ctx, ox: number, oy: number, c0: string, c1: string): void {
  // posts + trestle
  R(ctx, ox + 3, oy + 14, 2, 16, CLAY);
  R(ctx, ox + 27, oy + 14, 2, 16, CLAY);
  R(ctx, ox + 4, oy + 22, 24, 6, '#6b4a28');
  R(ctx, ox + 4, oy + 22, 24, 1, '#8a6338');
  // goods on the trestle
  for (let x = 6; x < 26; x += 5) { R(ctx, ox + x, oy + 18, 3, 4, '#9a5a2a'); PX(ctx, ox + x + 1, oy + 18, '#d98b3a'); }
  // striped canopy (scalloped front edge)
  R(ctx, ox + 1, oy + 6, 30, 9, c0);
  for (let x = 1; x < 31; x += 6) R(ctx, ox + x, oy + 6, 3, 9, c1);
  R(ctx, ox + 1, oy + 6, 30, 2, 'rgba(255,255,255,0.18)');
  R(ctx, ox, oy + 5, 32, 2, '#3a2a18'); // ridge pole
  for (let x = 2; x < 32; x += 5) { ctx.fillStyle = c0; ctx.beginPath(); ctx.moveTo(ox + x, oy + 15); ctx.lineTo(ox + x + 2, oy + 18); ctx.lineTo(ox + x + 4, oy + 15); ctx.closePath(); ctx.fill(); } // scallops
}

export function drawAwningRed(ctx: Ctx, ox: number, oy: number): void { awning(ctx, ox, oy, '#a83a2e', '#e0e0d0'); }
export function drawAwningBlue(ctx: Ctx, ox: number, oy: number): void { awning(ctx, ox, oy, '#2f5f8a', '#e0e0d0'); }
export function drawAwningGold(ctx: Ctx, ox: number, oy: number): void { awning(ctx, ox, oy, '#c58a1e', '#7a2f4a'); }

/** Open burlap sacks brimming with colourful spices. */
export function drawSpiceSacks(ctx: Ctx, ox: number, oy: number): void {
  const spice = ['#c0421e', '#d99a1e', '#7a8a2a', '#8a3a6a', '#b5622f'];
  const sack = '#b89a6a', sackLo = '#8a6d44';
  const pos: [number, number][] = [[4, 16], [12, 14], [20, 16], [11, 22]];
  pos.forEach(([x, y], i) => {
    R(ctx, ox + x, oy + y, 9, 12, sack);
    R(ctx, ox + x, oy + y, 9, 1, '#cdb488');
    R(ctx, ox + x, oy + y + 10, 9, 2, sackLo);
    R(ctx, ox + x, oy + y + 11, 9, 1, 'rgba(20,12,6,0.4)');
    // folded rim + heaped spice mound
    R(ctx, ox + x + 1, oy + y - 2, 7, 3, sackLo);
    R(ctx, ox + x + 2, oy + y - 3, 5, 2, spice[i % spice.length]);
    PX(ctx, ox + x + 3, oy + y - 3, '#fff0c0');
  });
}

/** A stack of clay amphorae and water jars. */
export function drawPottery(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 3, oy + 12, 8, 16, '#a5613a'); R(ctx, ox + 4, oy + 12, 2, 16, '#c07c4a'); R(ctx, ox + 5, oy + 9, 4, 4, '#a5613a'); R(ctx, ox + 4, oy + 9, 6, 1, '#c07c4a');
  R(ctx, ox + 3, oy + 28, 8, 1, 'rgba(20,12,6,0.4)');
  R(ctx, ox + 13, oy + 16, 8, 13, '#8a6a45'); R(ctx, ox + 14, oy + 16, 2, 13, '#a5875a'); R(ctx, ox + 15, oy + 13, 4, 4, '#8a6a45');
  R(ctx, ox + 21, oy + 14, 8, 15, '#b5772f'); R(ctx, ox + 22, oy + 14, 2, 15, '#d19a4a'); R(ctx, ox + 23, oy + 11, 4, 4, '#b5772f'); R(ctx, ox + 22, oy + 11, 6, 1, '#d19a4a');
  for (const [px, py] of [[6, 18], [16, 21], [24, 19]] as [number, number][]) { R(ctx, ox + px, oy + py, 3, 1, '#2f6a6a'); PX(ctx, ox + px + 1, oy + py + 2, '#3a2410'); }
}

/** A display of rolled and hanging carpets in rich colours. */
export function drawHangingRug(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 2, oy + 4, 2, 24, CLAY); // rail posts
  R(ctx, ox + 28, oy + 4, 2, 24, CLAY);
  R(ctx, ox + 2, oy + 4, 28, 2, '#5e3c20'); // rail
  const rugs: [number, string, string][] = [[5, '#8a2f3a', '#e0c15a'], [13, '#2f5f6a', '#d9863f'], [21, '#6a3a7a', '#5aa044']];
  for (const [x, base, motif] of rugs) {
    R(ctx, ox + x, oy + 6, 7, 20, base);
    R(ctx, ox + x, oy + 6, 7, 1, 'rgba(255,255,255,0.2)');
    R(ctx, ox + x, oy + 25, 7, 1, '#2a1a10');
    // woven motif
    for (let my = 9; my < 24; my += 4) { PX(ctx, ox + x + 3, oy + my, motif); PX(ctx, ox + x + 1, oy + my + 1, motif); PX(ctx, ox + x + 5, oy + my + 1, motif); }
    // fringe
    for (let fx = 0; fx < 7; fx += 2) R(ctx, ox + x + fx, oy + 26, 1, 2, '#d9c290');
  }
}

/** Woven baskets heaped with dates and figs. */
export function drawBasket(ctx: Ctx, ox: number, oy: number): void {
  const w0 = '#a9793f', w1 = '#c99a58', w2 = '#7a5527';
  const basket = (bx: number, by: number, bw: number) => {
    R(ctx, ox + bx, oy + by, bw, 9, w0);
    for (let wy = 0; wy < 9; wy += 2) R(ctx, ox + bx, oy + by + wy, bw, 1, w2);
    for (let wx = 0; wx < bw; wx += 3) R(ctx, ox + bx + wx, oy + by, 1, 9, w1);
    R(ctx, ox + bx - 1, oy + by, bw + 2, 2, w1); // rim
    R(ctx, ox + bx, oy + by + 9, bw, 1, 'rgba(20,12,6,0.4)');
  };
  basket(4, 18, 11);
  basket(17, 20, 11);
  // heaped dates / figs
  for (const [dx, dy, c] of [[6, 15, '#5a3418'], [9, 14, '#6e421f'], [12, 16, '#4a2c14'], [19, 17, '#3a5a2a'], [22, 16, '#4a6a30'], [24, 18, '#3a5a2a']] as [number, number, string][]) {
    R(ctx, ox + dx, oy + dy, 3, 3, c); PX(ctx, ox + dx, oy + dy, '#8a6a3a');
  }
}

/** A pierced-brass lantern glowing on a hooked post (warm glow prop). */
export function drawHangingLantern(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 22, oy + 2, 2, 26, '#3a2c1a'); // post
  R(ctx, ox + 10, oy + 3, 14, 2, '#3a2c1a'); // hook arm
  R(ctx, ox + 11, oy + 5, 1, 3, '#2a2018'); // chain
  const br = '#b8862a', brHi = '#e6c15a', brLo = '#7a561a';
  R(ctx, ox + 7, oy + 8, 10, 12, br);
  R(ctx, ox + 7, oy + 8, 10, 1, brHi);
  R(ctx, ox + 7, oy + 19, 10, 1, brLo);
  R(ctx, ox + 9, oy + 6, 6, 3, br); // cap
  R(ctx, ox + 10, oy + 4, 4, 2, br);
  R(ctx, ox + 11, oy + 20, 4, 3, br); // finial
  // pierced glow
  R(ctx, ox + 9, oy + 10, 6, 8, 'rgba(255,190,90,0.75)');
  for (const [gx, gy] of [[10, 12], [13, 12], [11, 15], [10, 16], [13, 16]] as [number, number][]) PX(ctx, ox + gx, oy + gy, '#fff0c0');
  R(ctx, ox + 8, oy + 9, 1, 10, brLo); R(ctx, ox + 15, oy + 9, 1, 10, brLo); // frame bars
}

// ============================================================================
// OASIS & DESERT FLORA (props, outlined)
// ============================================================================

/** A tall date palm (32x48). Trunk of stacked frond-scars, a spray of fronds
 *  and a cluster of dates. Goes in swayDecor for a hot-breeze sway. */
export function drawPalm(ctx: Ctx, ox: number, oy: number): void {
  // curving trunk
  const tr = '#7a5730', trHi = '#9a744a', trLo = '#54391f';
  for (let i = 0; i < 9; i++) {
    const ty = oy + 44 - i * 4;
    const tx = ox + 14 + Math.round(Math.sin(i * 0.5) * 2);
    R(ctx, tx, ty, 5, 4, tr);
    R(ctx, tx, ty, 5, 1, trLo); // frond-scar ring
    R(ctx, tx, ty + 1, 1, 3, trHi);
  }
  const crownX = ox + 16, crownY = oy + 8;
  R(ctx, crownX - 2, crownY, 5, 6, trLo); // crown shaft
  // fronds radiating out and drooping
  const f0 = '#3f6a2a', f1 = '#5a8f38', f2 = '#2c4a1c';
  const fronds: [number, number, number, number][] = [
    [-13, 4, -4, -2], [13, 4, 4, -2], [-11, -4, -3, -6], [11, -4, 3, -6],
    [-6, -8, -1, -9], [6, -8, 1, -9], [0, -10, 0, -10],
  ];
  for (const [ex, ey, cxk, cyk] of fronds) {
    const col = (ex + ey) % 2 ? f0 : f1;
    ctx.strokeStyle = col; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(crownX, crownY);
    ctx.lineTo(crownX + cxk * 2, crownY + cyk); // arch up
    ctx.lineTo(crownX + ex * 1.6, crownY + ey + 4); // droop out
    ctx.stroke();
    // leaflets
    PX(ctx, crownX + ex, crownY + ey + 3, f2);
    PX(ctx, crownX + Math.round(ex * 0.6), crownY + Math.round(ey * 0.6) - 2, col);
  }
  R(ctx, crownX - 3, crownY - 1, 6, 3, f1); // crown fill
  // date cluster
  for (const [dx, dy] of [[2, 4], [4, 5], [3, 7], [1, 6]] as [number, number][]) R(ctx, crownX + dx, crownY + dy, 2, 2, '#b5622f');
}

/** A low fan-palm shrub (swayDecor). */
export function drawPalmSmall(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 14, oy + 20, 4, 10, '#6a4a28');
  R(ctx, ox + 15, oy + 20, 1, 10, '#8a6338');
  const g0 = '#3f6a2a', g1 = '#5a8f38';
  for (const [ex, ey] of [[-10, 6], [10, 6], [-7, -2], [7, -2], [0, -8], [-3, -6], [3, -6]] as [number, number][]) {
    ctx.strokeStyle = (ex + ey) % 2 ? g0 : g1; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(ox + 16, oy + 20); ctx.lineTo(ox + 16 + ex, oy + 20 + ey); ctx.stroke();
  }
  R(ctx, ox + 13, oy + 18, 6, 3, g1);
}

/** Papyrus / reed clump at the oasis edge (swayDecor). */
export function drawPapyrus(ctx: Ctx, ox: number, oy: number): void {
  const stalk = '#6a8a3a', stalkHi = '#88a850', head = '#8f7a3a';
  for (const [x, h] of [[8, 20], [12, 26], [16, 22], [20, 27], [24, 19]] as [number, number][]) {
    R(ctx, ox + x, oy + 30 - h, 2, h, stalk);
    R(ctx, ox + x, oy + 30 - h, 1, h, stalkHi);
    // burst head
    for (const [hx, hy] of [[-2, -2], [2, -2], [0, -3], [-1, 0], [1, 0]] as [number, number][])
      R(ctx, ox + x + hx, oy + 30 - h + hy, 1, 3, head);
    PX(ctx, ox + x, oy + 30 - h - 3, '#c0a860');
  }
  R(ctx, ox + 6, oy + 28, 22, 2, '#3a4a1e');
}

/** A tall saguaro cactus (32x48). */
export function drawCactusTall(ctx: Ctx, ox: number, oy: number): void {
  const g0 = '#3f7a4a', g1 = '#57a066', g2 = '#2c5836';
  R(ctx, ox + 13, oy + 12, 7, 34, g0); // main column
  R(ctx, ox + 14, oy + 12, 2, 34, g1);
  R(ctx, ox + 18, oy + 12, 1, 34, g2);
  R(ctx, ox + 13, oy + 10, 7, 4, g0); // rounded top
  R(ctx, ox + 14, oy + 9, 5, 2, g1);
  // arms
  R(ctx, ox + 7, oy + 22, 6, 4, g0); R(ctx, ox + 7, oy + 16, 4, 8, g0); R(ctx, ox + 8, oy + 15, 2, 9, g1);
  R(ctx, ox + 20, oy + 26, 6, 4, g0); R(ctx, ox + 22, oy + 20, 4, 10, g0); R(ctx, ox + 23, oy + 19, 2, 11, g1);
  // ribs + spines
  for (let sy = 12; sy < 46; sy += 3) { PX(ctx, ox + 15, oy + sy, g2); PX(ctx, ox + 17, oy + sy, '#d8e0a0'); }
  R(ctx, ox + 22, oy + 18, 2, 2, '#e0457a'); // crown flower
  R(ctx, ox + 6, oy + 44, 20, 2, SAND3);
}

/** A round barrel cactus with a bright bloom. */
export function drawCactusBarrel(ctx: Ctx, ox: number, oy: number): void {
  const g0 = '#3f7a4a', g1 = '#57a066', g2 = '#2c5836';
  R(ctx, ox + 8, oy + 14, 16, 16, g0);
  R(ctx, ox + 10, oy + 12, 12, 18, g0);
  R(ctx, ox + 10, oy + 12, 4, 18, g1);
  R(ctx, ox + 20, oy + 14, 3, 14, g2);
  for (let rx = 11; rx < 23; rx += 3) { R(ctx, ox + rx, oy + 13, 1, 16, g2); for (let sy = 15; sy < 29; sy += 4) PX(ctx, ox + rx, oy + sy, '#d8e0a0'); }
  R(ctx, ox + 13, oy + 10, 6, 3, '#ffcf4a'); // bloom
  R(ctx, ox + 14, oy + 9, 4, 2, '#ffe98a');
  R(ctx, ox + 8, oy + 29, 16, 2, SAND3);
}

/** A dry desert scrub bush. */
export function drawDesertShrub(ctx: Ctx, ox: number, oy: number): void {
  const d0 = '#7a6a3a', d1 = '#9a8a4a', d2 = '#5a4c26';
  for (const [x, h] of [[8, 10], [12, 14], [16, 11], [20, 13], [24, 9]] as [number, number][]) {
    R(ctx, ox + x, oy + 24 - h, 2, h, d0);
    R(ctx, ox + x, oy + 24 - h, 1, h, d1);
    PX(ctx, ox + x, oy + 24 - h, d1);
  }
  R(ctx, ox + 10, oy + 22, 12, 2, d2);
  PX(ctx, ox + 13, oy + 12, '#c0b070'); PX(ctx, ox + 19, oy + 14, '#c0b070');
}

/** A tumbleweed. */
export function drawTumbleweed(ctx: Ctx, ox: number, oy: number): void {
  const t0 = '#9a854a', t1 = '#b7a05e', t2 = '#6f5c2e';
  R(ctx, ox + 9, oy + 12, 14, 12, t0);
  R(ctx, ox + 11, oy + 10, 10, 14, t0);
  // tangled twigs
  for (const [x0, y0, x1, y1] of [[10, 14, 22, 20], [11, 20, 21, 12], [9, 16, 23, 17], [14, 10, 16, 24]] as [number, number, number, number][]) {
    ctx.strokeStyle = t2; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(ox + x0, oy + y0); ctx.lineTo(ox + x1, oy + y1); ctx.stroke();
  }
  for (let i = 0; i < 6; i++) PX(ctx, ox + 11 + i * 2, oy + 12 + ((i * 5) % 10), t1);
  R(ctx, ox + 10, oy + 24, 14, 1, 'rgba(20,12,6,0.3)');
}

// ============================================================================
// CARAVANSERAI, FURNITURE & GROUND (props, outlined unless noted)
// ============================================================================

/** A domed stone cistern-well with a water jar (the oasis draw-well). */
export function drawCistern(ctx: Ctx, ox: number, oy: number): void {
  // circular stone kerb
  R(ctx, ox + 6, oy + 16, 20, 12, SAND2);
  R(ctx, ox + 8, oy + 14, 16, 14, SAND0);
  R(ctx, ox + 8, oy + 14, 16, 2, SANDHI);
  R(ctx, ox + 10, oy + 18, 12, 8, '#1a2a30'); // dark water
  R(ctx, ox + 12, oy + 20, 8, 4, '#2f5f6a');
  PX(ctx, ox + 14, oy + 21, '#6fb0b0');
  R(ctx, ox + 6, oy + 26, 20, 2, SAND3);
  // little dome canopy on posts
  R(ctx, ox + 8, oy + 4, 2, 12, CLAY);
  R(ctx, ox + 22, oy + 4, 2, 12, CLAY);
  R(ctx, ox + 6, oy + 2, 20, 4, SAND1);
  ctx.fillStyle = SAND2; ctx.beginPath(); ctx.moveTo(ox + 8, oy + 2); ctx.lineTo(ox + 16, oy - 2); ctx.lineTo(ox + 24, oy + 2); ctx.closePath(); ctx.fill();
  R(ctx, ox + 15, oy + 6, 2, 3, '#3a2c1a'); // bucket rope
}

/** A tripod fire-bowl / desert brazier (warm glow prop). */
export function drawFireBowl(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 10, oy + 20, 3, 9, '#3a2c1a'); R(ctx, ox + 19, oy + 20, 3, 9, '#3a2c1a'); R(ctx, ox + 14, oy + 22, 4, 8, '#3a2c1a'); // legs
  R(ctx, ox + 8, oy + 27, 16, 3, 'rgba(20,12,6,0.4)');
  const br = '#8a6a2a', brHi = '#c0a04a';
  R(ctx, ox + 7, oy + 15, 18, 7, br);
  R(ctx, ox + 7, oy + 15, 18, 2, brHi);
  R(ctx, ox + 9, oy + 20, 14, 2, '#5a441c');
  // embers + flame
  R(ctx, ox + 10, oy + 13, 12, 3, '#7a2a10');
  for (const [fx, fy] of [[12, 10], [15, 8], [18, 11], [14, 12], [17, 12]] as [number, number][]) { R(ctx, ox + fx, oy + fy, 2, 3, '#e8641e'); PX(ctx, ox + fx, oy + fy, '#ffd24a'); }
  PX(ctx, ox + 15, oy + 6, '#ffe98a');
}

/** A domed clay oven / tandoor (warm glow prop). */
export function drawClayOven(ctx: Ctx, ox: number, oy: number): void {
  const c0 = '#a5613a', c1 = '#c07c4a', c2 = '#7a4325';
  // beehive dome
  R(ctx, ox + 7, oy + 16, 18, 14, c0);
  R(ctx, ox + 9, oy + 10, 14, 8, c0);
  R(ctx, ox + 11, oy + 7, 10, 5, c0);
  R(ctx, ox + 9, oy + 10, 5, 18, c1); // lit left
  R(ctx, ox + 20, oy + 12, 4, 16, c2); // shade right
  for (let ry = 12; ry < 30; ry += 4) R(ctx, ox + 7, oy + ry, 18, 1, c2); // clay coil courses
  // mouth with fire
  R(ctx, ox + 13, oy + 20, 6, 8, '#2a1408');
  R(ctx, ox + 14, oy + 23, 4, 5, '#e8641e');
  PX(ctx, ox + 15, oy + 24, '#ffd24a'); PX(ctx, ox + 16, oy + 25, '#ffe98a');
  R(ctx, ox + 6, oy + 28, 20, 2, SAND3);
}

/** A large striped Bedouin caravan tent (32x48). */
export function drawBedouinTent(ctx: Ctx, ox: number, oy: number): void {
  const cloth = '#6a4a2e', clothLo = '#4a3018', stripe = '#a83a2e', stripe2 = '#c58a1e';
  // guy-lines + pegs
  ctx.strokeStyle = '#3a2c1a'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(ox + 16, oy + 12); ctx.lineTo(ox + 2, oy + 44); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(ox + 16, oy + 12); ctx.lineTo(ox + 30, oy + 44); ctx.stroke();
  // sloping roof cloth
  ctx.fillStyle = cloth;
  ctx.beginPath(); ctx.moveTo(ox + 16, oy + 8); ctx.lineTo(ox + 1, oy + 30); ctx.lineTo(ox + 31, oy + 30); ctx.closePath(); ctx.fill();
  ctx.fillStyle = clothLo;
  ctx.beginPath(); ctx.moveTo(ox + 16, oy + 8); ctx.lineTo(ox + 16, oy + 30); ctx.lineTo(ox + 31, oy + 30); ctx.closePath(); ctx.fill();
  // ridge + stripes
  R(ctx, ox + 15, oy + 8, 2, 22, '#2a2018');
  for (let sx = 4; sx < 30; sx += 6) R(ctx, ox + sx, oy + 12 + Math.abs(16 - sx) / 2, 2, 16, (sx % 12 === 4) ? stripe : stripe2);
  // tent walls + shaded doorway
  R(ctx, ox + 4, oy + 30, 24, 14, cloth);
  R(ctx, ox + 4, oy + 30, 24, 1, '#8a6338');
  for (let sx = 5; sx < 28; sx += 5) R(ctx, ox + sx, oy + 30, 2, 14, clothLo);
  R(ctx, ox + 13, oy + 34, 8, 10, '#1a1008'); // door flap opening
  R(ctx, ox + 12, oy + 33, 2, 11, stripe); // pinned-back flap
  R(ctx, ox + 4, oy + 44, 24, 2, 'rgba(20,12,6,0.4)');
}

/** A resting/standing dromedary camel, facing right (wander code may flip X). */
export function drawCamel(ctx: Ctx, ox: number, oy: number): void {
  const body = '#b58a52', dark = '#8a6338', light = '#cda870';
  R(ctx, ox + 5, oy + 12, 16, 8, body); // barrel body
  R(ctx, ox + 5, oy + 12, 16, 1, light);
  R(ctx, ox + 9, oy + 9, 5, 5, body); // hump
  R(ctx, ox + 10, oy + 8, 3, 2, light);
  // neck + head
  R(ctx, ox + 19, oy + 6, 3, 8, body);
  R(ctx, ox + 21, oy + 4, 4, 4, body);
  R(ctx, ox + 24, oy + 5, 2, 2, body); // muzzle
  PX(ctx, ox + 23, oy + 5, '#1a120a'); // eye
  R(ctx, ox + 21, oy + 3, 1, 2, dark); // ear
  // legs
  for (const lx of [6, 10, 15, 19]) { R(ctx, ox + lx, oy + 20, 2, 8, dark); R(ctx, ox + lx, oy + 27, 2, 1, '#3a2a18'); }
  // saddle blanket
  R(ctx, ox + 7, oy + 12, 8, 3, '#a83a2e'); PX(ctx, ox + 9, oy + 13, '#e0c15a'); PX(ctx, ox + 12, oy + 13, '#e0c15a');
}

/** A stone water-trough for the caravan animals. */
export function drawWaterTrough(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 3, oy + 14, 26, 10, SAND2);
  R(ctx, ox + 4, oy + 15, 24, 8, SAND0);
  R(ctx, ox + 5, oy + 16, 22, 5, '#2f5f6a'); // water
  R(ctx, ox + 5, oy + 16, 22, 1, '#6fb0b0');
  for (let wx = 7; wx < 26; wx += 5) PX(ctx, ox + wx, oy + 18, '#a0d8d8');
  R(ctx, ox + 3, oy + 22, 26, 2, SAND3);
  R(ctx, ox + 3, oy + 23, 26, 1, 'rgba(20,12,6,0.4)');
}

/** Sun-bleached bones — a skull and ribs half-sunk in the sand. */
export function drawSunBones(ctx: Ctx, ox: number, oy: number): void {
  const bone = '#d8cdb0', boneLo = '#b0a488', boneHi = '#efe6cf';
  // long skull
  R(ctx, ox + 6, oy + 16, 12, 7, bone);
  R(ctx, ox + 6, oy + 16, 12, 1, boneHi);
  R(ctx, ox + 4, oy + 18, 3, 4, bone); // snout
  R(ctx, ox + 16, oy + 15, 4, 5, bone); // brow
  PX(ctx, ox + 9, oy + 19, '#2a1a10'); PX(ctx, ox + 13, oy + 19, '#2a1a10'); // eye sockets
  R(ctx, ox + 15, oy + 12, 2, 4, boneLo); R(ctx, ox + 18, oy + 11, 2, 5, boneLo); // horns
  // curved ribs
  for (let i = 0; i < 4; i++) { const rx = ox + 20 + i * 2; R(ctx, rx, oy + 18, 1, 7, bone); R(ctx, rx, oy + 24, 3, 1, boneLo); }
  R(ctx, ox + 4, oy + 23, 24, 1, 'rgba(180,140,80,0.4)'); // sand line
}

/** A palm-log fence rail (horizontal), matching the town's rustic edges. */
export function drawPalmFenceH(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox, oy + 12, 32, 5, CLAY);
  R(ctx, ox, oy + 12, 32, 1, CLAYHI);
  R(ctx, ox, oy + 16, 32, 1, '#3a2410');
  for (let x = 2; x < 32; x += 6) { R(ctx, ox + x, oy + 12, 1, 5, '#3a2410'); PX(ctx, ox + x + 2, oy + 14, '#a5754a'); }
  R(ctx, ox + 6, oy + 10, 3, 14, CLAY); R(ctx, ox + 22, oy + 10, 3, 14, CLAY); // posts
  R(ctx, ox + 6, oy + 10, 1, 14, CLAYHI); R(ctx, ox + 22, oy + 10, 1, 14, CLAYHI);
}

/** A palm-log fence post (vertical run). */
export function drawPalmFenceV(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 12, oy, 6, 32, CLAY);
  R(ctx, ox + 12, oy, 1, 32, CLAYHI);
  R(ctx, ox + 17, oy, 1, 32, '#3a2410');
  for (let y = 2; y < 32; y += 6) R(ctx, ox + 12, oy + y, 6, 1, '#3a2410');
  R(ctx, ox + 10, oy + 8, 10, 3, CLAY); R(ctx, ox + 10, oy + 20, 10, 3, CLAY); // rails
}

/** Sandstone flagstone paving (flat, floor-level decor for plazas/streets). */
export function drawDesertRoad(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox, oy, 32, 32, '#c2a566');
  const r = rng(51);
  const shades = ['#cdb478', '#b0925a', '#d8bd82', '#a1834e'];
  for (let gy = 0; gy < 4; gy++) for (let gx = 0; gx < 4; gx++) {
    const w = 7 + Math.floor(r() * 2), h = 7 + Math.floor(r() * 2);
    R(ctx, ox + gx * 8, oy + gy * 8, 8, 8, shades[Math.floor(r() * shades.length)]);
    R(ctx, ox + gx * 8, oy + gy * 8, w, 1, '#8a6d3e'); // joint shadow
    R(ctx, ox + gx * 8, oy + gy * 8, 1, h, '#8a6d3e');
    if (r() < 0.3) PX(ctx, ox + gx * 8 + 3, oy + gy * 8 + 4, '#e6d19a');
  }
}

/** A woven ground mat / market rug (flat, floor-level decor for stall floors). */
export function drawMarketMat(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 2, oy + 4, 28, 24, '#7a3a3a');
  R(ctx, ox + 4, oy + 6, 24, 20, '#8a4a2a');
  // border + diamond motif
  R(ctx, ox + 2, oy + 4, 28, 2, '#d9a94a');
  R(ctx, ox + 2, oy + 26, 28, 2, '#d9a94a');
  R(ctx, ox + 2, oy + 4, 2, 24, '#d9a94a');
  R(ctx, ox + 28, oy + 4, 2, 24, '#d9a94a');
  for (let x = 8; x < 26; x += 8) { PX(ctx, ox + x, oy + 15, '#e0c15a'); PX(ctx, ox + x - 1, oy + 14, '#2f6a6a'); PX(ctx, ox + x + 1, oy + 16, '#2f6a6a'); }
  for (let fx = 3; fx < 30; fx += 2) { R(ctx, ox + fx, oy + 2, 1, 2, '#c9a86a'); R(ctx, ox + fx, oy + 28, 1, 2, '#c9a86a'); } // fringe
}

/** A low ridged sand dune drift (flat-ish decor). */
export function drawSandDune(ctx: Ctx, ox: number, oy: number): void {
  ctx.fillStyle = '#d4b878';
  ctx.beginPath(); ctx.moveTo(ox + 1, oy + 26); ctx.lineTo(ox + 12, oy + 14); ctx.lineTo(ox + 22, oy + 20); ctx.lineTo(ox + 31, oy + 26); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#e6cf96';
  ctx.beginPath(); ctx.moveTo(ox + 1, oy + 26); ctx.lineTo(ox + 12, oy + 14); ctx.lineTo(ox + 14, oy + 16); ctx.lineTo(ox + 4, oy + 26); ctx.closePath(); ctx.fill();
  R(ctx, ox + 1, oy + 26, 30, 2, '#b5985a'); // wind-shadow lee
  for (let i = 0; i < 5; i++) PX(ctx, ox + 6 + i * 4, oy + 22 - i, '#f0dca8'); // ripple crest
}

/** An ochre pennant / sun-banner (swayDecor). */
export function drawSunBanner(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 6, oy + 2, 2, 28, '#4a3018'); // pole
  R(ctx, ox + 6, oy + 1, 3, 2, '#e0c15a'); // finial
  // triangular pennant
  ctx.fillStyle = '#c58a1e';
  ctx.beginPath(); ctx.moveTo(ox + 8, oy + 4); ctx.lineTo(ox + 26, oy + 9); ctx.lineTo(ox + 8, oy + 18); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#a83a2e';
  ctx.beginPath(); ctx.moveTo(ox + 8, oy + 10); ctx.lineTo(ox + 20, oy + 12); ctx.lineTo(ox + 8, oy + 18); ctx.closePath(); ctx.fill();
  R(ctx, ox + 8, oy + 4, 14, 1, '#e6c15a');
  // gold sun sigil
  R(ctx, ox + 11, oy + 8, 3, 3, '#ffd964'); PX(ctx, ox + 12, oy + 9, '#fff0b0');
}

/** A plaster dome to crown a temple or grand house (32x40, prop). */
export function drawAdobeDome(ctx: Ctx, ox: number, oy: number): void {
  const c0 = SAND0, c1 = SAND1, c2 = SAND2;
  // drum
  R(ctx, ox + 6, oy + 26, 20, 12, c2);
  R(ctx, ox + 7, oy + 26, 18, 12, c0);
  for (let x = 8; x < 25; x += 4) R(ctx, ox + x, oy + 28, 1, 8, c2);
  // dome body (stacked rounding rects)
  R(ctx, ox + 8, oy + 20, 16, 8, c0);
  R(ctx, ox + 10, oy + 14, 12, 8, c0);
  R(ctx, ox + 12, oy + 9, 8, 7, c0);
  R(ctx, ox + 14, oy + 6, 4, 5, c0);
  R(ctx, ox + 9, oy + 16, 4, 12, c1); // lit flank
  R(ctx, ox + 21, oy + 16, 3, 12, c2); // shade flank
  // ribs
  for (const rx of [12, 16, 20]) R(ctx, ox + rx, oy + 8, 1, 20, c2);
  R(ctx, ox + 15, oy + 2, 2, 5, '#b6791e'); // gilded finial
  R(ctx, ox + 14, oy + 1, 4, 2, '#ffd964');
}

// ============================================================================
// DESERT TOWNSFOLK (28x36 sheet, 6 robed variants — mirrors drawTownsfolk API)
// ============================================================================

const DF_SKIN = ['#b5875a', '#a06a3e', '#c99a68', '#8a5a34', '#b07a4a', '#9a6a42'];
const DF_ROBE = ['#d8c088', '#7a3a3a', '#2f5f6a', '#e0e0d0', '#8a5a2a', '#6a4a7a'];
const DF_ROBE_HI = ['#ecd7a2', '#a05050', '#4f8a94', '#f2f2e6', '#b07a3a', '#8a6a9a'];

export function drawDesertfolk(ctx: Ctx, ox: number, oy: number, variant: number): void {
  const v = ((variant % 6) + 6) % 6;
  const cx = ox + 14;
  const skin = DF_SKIN[v];
  const robe = DF_ROBE[v];
  const robeHi = DF_ROBE_HI[v];
  const SH = 'rgba(0,0,0,0.2)';
  // sandals
  R(ctx, cx - 4, oy + 30, 3, 3, '#5a3a1c');
  R(ctx, cx + 1, oy + 30, 3, 3, '#5a3a1c');
  // long flowing robe (djellaba) to the ankles
  R(ctx, cx - 6, oy + 13, 12, 18, robe);
  R(ctx, cx - 6, oy + 13, 12, 2, robeHi);
  R(ctx, cx - 6, oy + 13, 2, 18, robeHi);
  R(ctx, cx + 4, oy + 13, 2, 18, SH);
  R(ctx, cx - 1, oy + 20, 2, 11, SH); // centre fold
  // sleeves
  R(ctx, cx - 8, oy + 14, 2, 12, robe);
  R(ctx, cx + 6, oy + 14, 2, 12, robe);
  R(ctx, cx - 8, oy + 25, 2, 2, skin);
  R(ctx, cx + 6, oy + 25, 2, 2, skin);
  // sash belt
  R(ctx, cx - 6, oy + 20, 12, 2, '#a83a2e');
  PX(ctx, cx, oy + 20, '#e0c15a');
  // face
  R(ctx, cx - 4, oy + 5, 8, 9, skin);
  R(ctx, cx - 4, oy + 5, 8, 1, '#e6c89a');
  R(ctx, cx + 2, oy + 6, 1, 7, SH);
  PX(ctx, cx - 2, oy + 9, '#2a1c10');
  PX(ctx, cx + 1, oy + 9, '#2a1c10');
  // headwear per variant
  if (v === 0) {
    // keffiyeh with agal cord
    R(ctx, cx - 6, oy + 2, 12, 6, '#e0e0d0');
    R(ctx, cx - 6, oy + 2, 12, 1, '#f2f2e6');
    R(ctx, cx - 6, oy + 3, 12, 1, '#a83a2e'); R(ctx, cx - 6, oy + 5, 12, 1, '#a83a2e'); // black-cord banding
    R(ctx, cx - 7, oy + 7, 3, 8, '#e0e0d0'); // drape
  } else if (v === 1) {
    // tall tagelmust / turban
    R(ctx, cx - 5, oy + 1, 10, 6, robe);
    R(ctx, cx - 5, oy + 1, 10, 1, robeHi);
    R(ctx, cx - 6, oy + 4, 12, 2, '#5a2a2a');
    R(ctx, cx + 4, oy + 6, 2, 8, '#7a3a3a'); // tail
  } else if (v === 2) {
    // fez + veil
    R(ctx, cx - 4, oy + 1, 8, 5, '#a83a2e');
    R(ctx, cx - 4, oy + 1, 8, 1, '#c85a3e');
    PX(ctx, cx + 3, oy, '#2a1a10'); R(ctx, cx + 3, oy + 1, 1, 3, '#2a1a10'); // tassel
    R(ctx, cx - 5, oy + 12, 10, 5, robeHi); // veil across shoulders
  } else if (v === 3) {
    // wide straw sun-hat
    R(ctx, cx - 8, oy + 4, 16, 2, '#c9a850');
    R(ctx, cx - 8, oy + 4, 16, 1, '#e0c470');
    R(ctx, cx - 4, oy, 8, 5, '#b89440');
  } else if (v === 4) {
    // hooded burnous
    R(ctx, cx - 6, oy + 1, 12, 8, robe);
    R(ctx, cx - 6, oy + 1, 12, 1, robeHi);
    R(ctx, cx - 5, oy + 8, 3, 5, robe); R(ctx, cx + 2, oy + 8, 3, 5, robe); // hood sides
  } else {
    // veiled fortune-teller with beaded circlet + basket
    R(ctx, cx - 5, oy + 2, 10, 4, '#4a2c5a');
    R(ctx, cx - 5, oy + 3, 10, 1, '#c9a850');
    R(ctx, cx - 4, oy + 10, 8, 3, 'rgba(0,0,0,0.4)'); // face veil
    R(ctx, cx + 6, oy + 18, 5, 6, '#a9793f'); R(ctx, cx + 6, oy + 18, 5, 1, '#c99a58'); // carried basket
  }
}
