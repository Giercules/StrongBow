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
  const g0 = '#2f5a26', g1 = '#4a8a3a', g2 = '#6ab04a', g3 = '#8fd060';
  // soft ground shadow so the clump sits in the world
  R(ctx, ox + 8, oy + 26, 18, 3, 'rgba(20,30,12,0.22)');
  for (const [x, h, lean] of [
    [7, 7, 0], [11, 12, -1], [15, 14, 0], [19, 11, 1], [23, 9, 0], [26, 6, 1],
  ] as [number, number, number][]) {
    R(ctx, ox + x + lean, oy + 27 - h, 2, h, g0);
    R(ctx, ox + x + lean, oy + 27 - h, 1, h - 1, g1);
    PX(ctx, ox + x + lean, oy + 27 - h, g3);
    if (h > 9) PX(ctx, ox + x + lean + 1, oy + 28 - h, g2);
  }
  // seed-head tips
  PX(ctx, ox + 15, oy + 12, g3);
  PX(ctx, ox + 19, oy + 15, g2);
}

export function drawRoad(ctx: Ctx, ox: number, oy: number, seed = 0): void {
  // Packed cobbles with soft mortar so multi-tile streets read as one continuous
  // pavement instead of hard 32px grid seams. Warm dirt undertone peeks through.
  R(ctx, ox, oy, 32, 32, '#5a4a36');
  const stones = ['#7a6a4e', '#6f5e46', '#857258', '#5c4c38', '#8a7858', '#6a5a42'];
  let s = (seed + 17) * 2654435761;
  const rnd = (): number => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  for (let gy = 0; gy < 8; gy++) {
    for (let gx = 0; gx < 8; gx++) {
      const jitter = Math.floor(rnd() * 2);
      const px = ox + gx * 4 + (gy % 2);
      const py = oy + gy * 4;
      R(ctx, px, py, 4 - jitter, 4 - (jitter ? 1 : 0), stones[Math.floor(rnd() * stones.length)]);
      // mortar shadow under each cobble lip
      R(ctx, px, py + 3, 3, 1, 'rgba(40,30,18,0.35)');
    }
  }
  // faint edge wear so road bands look worn, not stamped
  R(ctx, ox, oy, 32, 1, 'rgba(30,22,12,0.18)');
  R(ctx, ox, oy + 31, 32, 1, 'rgba(30,22,12,0.22)');
}

export function drawTownTree(ctx: Ctx, ox: number, oy: number): void {
  // Layered canopy with a trunk that has bark light/shade, plus ground shadow.
  R(ctx, ox + 10, oy + 28, 12, 3, 'rgba(20,24,12,0.3)');
  R(ctx, ox + 14, oy + 16, 5, 14, '#3a2818');
  R(ctx, ox + 14, oy + 16, 2, 14, '#5e442a');
  R(ctx, ox + 17, oy + 18, 1, 10, '#2a1c10');
  // canopy masses (dark back, mid, sunlit front)
  R(ctx, ox + 5, oy + 6, 22, 14, '#24481c');
  R(ctx, ox + 7, oy + 3, 18, 14, '#37662a');
  R(ctx, ox + 9, oy + 2, 14, 10, '#4d8a38');
  R(ctx, ox + 11, oy + 3, 8, 6, '#6ab04a');
  R(ctx, ox + 6, oy + 8, 5, 8, '#2f5a26'); // left shade lobe
  R(ctx, ox + 20, oy + 7, 5, 9, '#2a4a1e'); // right shade lobe
  PX(ctx, ox + 13, oy + 5, '#8fd060');
  PX(ctx, ox + 17, oy + 7, '#8fd060');
  PX(ctx, ox + 12, oy + 12, '#1e3a16');
  PX(ctx, ox + 21, oy + 11, '#1e3a16');
}

export function drawTownBush(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 8, oy + 26, 16, 3, 'rgba(20,24,12,0.25)');
  R(ctx, ox + 5, oy + 16, 22, 11, '#24481c');
  R(ctx, ox + 7, oy + 13, 18, 12, '#37662a');
  R(ctx, ox + 9, oy + 12, 12, 8, '#4d8a38');
  R(ctx, ox + 11, oy + 13, 6, 4, '#6ab04a');
  R(ctx, ox + 6, oy + 17, 4, 8, '#2f5a26');
  PX(ctx, ox + 12, oy + 15, '#8fd060');
  PX(ctx, ox + 18, oy + 17, '#8fd060');
  // berries
  R(ctx, ox + 14, oy + 20, 2, 2, '#d2452f');
  R(ctx, ox + 10, oy + 22, 2, 2, '#c03828');
  R(ctx, ox + 19, oy + 21, 2, 2, '#d2452f');
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

// Pitched roof as a south-facing 3/4 plane across THREE stacked tiles:
// `ridge` (apex + far slope), `mid` (main shingle field), `eave` (overhang).
// Depth comes from gradient shade (darker near ridge, lighter near eaves),
// staggered shingles, barge boards, and a hard fascia cast-shadow onto walls.
type RoofPart = 'ridge' | 'mid' | 'eave';
function pitchedRoof(ctx: Ctx, ox: number, oy: number, base: string, hi: string, dk: string, part: RoofPart): void {
  // Clear so end-caps / barge boards can leave a roof silhouette against sky.
  ctx.clearRect(ox, oy, 32, 32);
  R(ctx, ox, oy, 32, 32, base);

  // Vertical form-shadow: roof plane falls away from the sun (upper = darker).
  if (part === 'ridge') {
    R(ctx, ox, oy, 32, 10, dk);
    R(ctx, ox, oy + 8, 32, 6, 'rgba(0,0,0,0.22)');
    // ridge beam / cap
    R(ctx, ox, oy + 9, 32, 4, hi);
    R(ctx, ox, oy + 9, 32, 1, 'rgba(255,255,255,0.18)');
    R(ctx, ox, oy + 12, 32, 1, 'rgba(0,0,0,0.4)');
    // small ridge finials every so often (ornamental)
    for (let fx = 6; fx < 28; fx += 10) {
      R(ctx, ox + fx, oy + 6, 2, 4, dk);
      PX(ctx, ox + fx, oy + 5, hi);
    }
  } else if (part === 'mid') {
    R(ctx, ox, oy, 32, 10, 'rgba(0,0,0,0.12)');
    R(ctx, ox, oy + 18, 32, 14, 'rgba(255,255,255,0.04)');
  } else {
    // eave: lighter near the lip, deep shade under the overhang
    R(ctx, ox, oy, 32, 18, 'rgba(0,0,0,0.10)');
    R(ctx, ox, oy + 18, 32, 8, 'rgba(255,255,255,0.05)');
  }

  // Continuous shingle courses with running-bond stagger.
  const startY = part === 'ridge' ? 14 : 0;
  for (let ry = startY; ry < (part === 'eave' ? 24 : 32); ry += 4) {
    R(ctx, ox, oy + ry, 32, 1, dk);
    R(ctx, ox, oy + ry + 1, 32, 1, hi);
    const off = ((ry / 4) | 0) % 2 ? 3 : 0;
    for (let sx = -off; sx < 32; sx += 7) {
      R(ctx, ox + sx + 6, oy + ry + 1, 1, 3, dk);
      if (sx + 7 < 32) R(ctx, ox + sx + 7, oy + ry + 2, 1, 2, hi);
    }
  }

  // Barge boards frame the plane (left lit / right shaded).
  R(ctx, ox, oy, 2, 32, hi);
  R(ctx, ox + 1, oy, 1, 32, 'rgba(255,255,255,0.12)');
  R(ctx, ox + 30, oy, 2, 32, dk);
  R(ctx, ox + 30, oy, 1, 32, 'rgba(0,0,0,0.2)');

  if (part === 'eave') {
    // Thick timber fascia + hard drop-shadow onto the wall course below.
    R(ctx, ox, oy + 24, 32, 4, '#4a3420');
    R(ctx, ox, oy + 24, 32, 1, '#7a5830');
    R(ctx, ox, oy + 27, 32, 1, '#2a1a0c');
    R(ctx, ox, oy + 28, 32, 4, 'rgba(12,8,4,0.55)');
    // gutter drip line
    for (let x = 3; x < 30; x += 5) PX(ctx, ox + x, oy + 28, '#5a7088');
  }
}

// Thatch: thick bundled straw in overlapping shaggy layers.
function thatchRoof(ctx: Ctx, ox: number, oy: number, part: RoofPart): void {
  const s0 = '#a3822f', s1 = '#c39a3f', s2 = '#7a5e22', s3 = '#e0c063';
  ctx.clearRect(ox, oy, 32, 32);
  R(ctx, ox, oy, 32, 32, s1);
  for (let x = 0; x < 32; x += 2) R(ctx, ox + x, oy, 1, 32, (x % 6 === 0) ? s2 : (x % 4 === 0 ? s3 : s0));
  let startY = 2;
  if (part === 'ridge') {
    R(ctx, ox, oy, 32, 10, s2);
    R(ctx, ox, oy + 8, 32, 3, '#5a3c18');
    R(ctx, ox, oy + 8, 32, 1, s3); // bound ridge withy
    startY = 12;
  }
  if (part === 'mid') R(ctx, ox, oy + 20, 32, 12, 'rgba(0,0,0,0.06)');
  if (part === 'eave') R(ctx, ox, oy, 32, 20, 'rgba(0,0,0,0.10)');
  for (let ry = startY; ry < (part === 'eave' ? 22 : 32); ry += 6) {
    R(ctx, ox, oy + ry, 32, 2, 'rgba(40,26,10,0.45)');
    R(ctx, ox, oy + ry + 2, 32, 1, s3);
  }
  R(ctx, ox, oy, 2, 32, s3);
  R(ctx, ox + 30, oy, 2, 32, s2);
  if (part === 'eave') {
    for (let x = 0; x < 32; x += 3) {
      const h = 5 + ((x * 7) % 4);
      R(ctx, ox + x, oy + 27 - h, 3, h, s0);
      R(ctx, ox + x, oy + 27 - h, 3, 1, s3);
    }
    R(ctx, ox, oy + 28, 32, 4, 'rgba(16,10,6,0.55)');
  }
}

export function drawHouseRoofRed(ctx: Ctx, ox: number, oy: number): void { pitchedRoof(ctx, ox, oy, '#9c3a2a', '#c85a3e', '#5a1e14', 'ridge'); }
export function drawHouseRoofBlue(ctx: Ctx, ox: number, oy: number): void { pitchedRoof(ctx, ox, oy, '#34507a', '#4f72a8', '#1e2f4a', 'ridge'); }
export function drawHouseRoofGreen(ctx: Ctx, ox: number, oy: number): void { pitchedRoof(ctx, ox, oy, '#3a6a3a', '#56965a', '#1e3a1e', 'ridge'); }
export function drawHouseRoofTeak(ctx: Ctx, ox: number, oy: number): void { pitchedRoof(ctx, ox, oy, '#6e4a24', '#8a6132', '#3a2410', 'ridge'); }
export function drawHouseRoofSlate(ctx: Ctx, ox: number, oy: number): void { pitchedRoof(ctx, ox, oy, '#4a545f', '#6b7784', '#2a323b', 'ridge'); }
export function drawHouseRoofThatch(ctx: Ctx, ox: number, oy: number): void { thatchRoof(ctx, ox, oy, 'ridge'); }
export function drawHouseMidRed(ctx: Ctx, ox: number, oy: number): void { pitchedRoof(ctx, ox, oy, '#9c3a2a', '#c85a3e', '#5a1e14', 'mid'); }
export function drawHouseMidBlue(ctx: Ctx, ox: number, oy: number): void { pitchedRoof(ctx, ox, oy, '#34507a', '#4f72a8', '#1e2f4a', 'mid'); }
export function drawHouseMidGreen(ctx: Ctx, ox: number, oy: number): void { pitchedRoof(ctx, ox, oy, '#3a6a3a', '#56965a', '#1e3a1e', 'mid'); }
export function drawHouseMidTeak(ctx: Ctx, ox: number, oy: number): void { pitchedRoof(ctx, ox, oy, '#6e4a24', '#8a6132', '#3a2410', 'mid'); }
export function drawHouseMidSlate(ctx: Ctx, ox: number, oy: number): void { pitchedRoof(ctx, ox, oy, '#4a545f', '#6b7784', '#2a323b', 'mid'); }
export function drawHouseMidThatch(ctx: Ctx, ox: number, oy: number): void { thatchRoof(ctx, ox, oy, 'mid'); }
export function drawHouseEaveRed(ctx: Ctx, ox: number, oy: number): void { pitchedRoof(ctx, ox, oy, '#9c3a2a', '#c85a3e', '#5a1e14', 'eave'); }
export function drawHouseEaveBlue(ctx: Ctx, ox: number, oy: number): void { pitchedRoof(ctx, ox, oy, '#34507a', '#4f72a8', '#1e2f4a', 'eave'); }
export function drawHouseEaveGreen(ctx: Ctx, ox: number, oy: number): void { pitchedRoof(ctx, ox, oy, '#3a6a3a', '#56965a', '#1e3a1e', 'eave'); }
export function drawHouseEaveTeak(ctx: Ctx, ox: number, oy: number): void { pitchedRoof(ctx, ox, oy, '#6e4a24', '#8a6132', '#3a2410', 'eave'); }
export function drawHouseEaveSlate(ctx: Ctx, ox: number, oy: number): void { pitchedRoof(ctx, ox, oy, '#4a545f', '#6b7784', '#2a323b', 'eave'); }
export function drawHouseEaveThatch(ctx: Ctx, ox: number, oy: number): void { thatchRoof(ctx, ox, oy, 'eave'); }

// Compact chimney for the ridge tile — short stack + pot, no tall slab down the slope.
export function drawChimney(ctx: Ctx, ox: number, oy: number): void {
  const st = '#8a8276', stHi = '#aaa294', stDk = '#5f584e', mortar = '#635c52', pot = '#9c4a34', potHi = '#c05a40';
  R(ctx, ox + 12, oy + 14, 8, 10, st);
  R(ctx, ox + 12, oy + 14, 2, 10, stHi);
  R(ctx, ox + 18, oy + 14, 2, 10, stDk);
  for (let by = 16; by < 24; by += 3) R(ctx, ox + 12, oy + by, 8, 1, mortar);
  R(ctx, ox + 11, oy + 12, 10, 3, stDk);
  R(ctx, ox + 11, oy + 12, 10, 1, stHi);
  R(ctx, ox + 13, oy + 8, 6, 5, pot);
  R(ctx, ox + 13, oy + 8, 6, 1, potHi);
  R(ctx, ox + 14, oy + 8, 4, 1, '#3a1c14');
  R(ctx, ox + 15, oy + 4, 3, 4, 'rgba(214,208,202,0.45)');
  PX(ctx, ox + 17, oy + 3, 'rgba(214,208,202,0.30)');
}

// Hanging shop sign board with a small painted trade glyph, hung from an iron
// bracket. `glyph` selects the trade: anvil, vial, sword, tankard, coin, loaf.
export function drawShopSign(ctx: Ctx, ox: number, oy: number, glyph: string): void {
  drawHouseWall(ctx, ox, oy);
  const iron = '#2c2f3a', wood = '#6e4a24', woodHi = '#9a6c38', board = '#c9a86a', boardHi = '#e0c68a', boardDk = '#8a6a3a';
  // wall bracket + hanging chains
  R(ctx, ox + 2, oy + 4, 12, 2, iron); // bracket arm
  R(ctx, ox + 2, oy + 4, 2, 8, iron); // wall mount
  R(ctx, ox + 6, oy + 6, 1, 4, '#555b6e'); R(ctx, ox + 12, oy + 6, 1, 4, '#555b6e'); // chains
  // board
  R(ctx, ox + 3, oy + 10, 20, 15, wood);
  R(ctx, ox + 4, oy + 11, 18, 13, board);
  R(ctx, ox + 4, oy + 11, 18, 1, boardHi);
  R(ctx, ox + 4, oy + 23, 18, 1, boardDk);
  const gx = ox + 13, gy = oy + 17; // glyph centre
  const g = '#3a2a18';
  if (glyph === 'anvil') { R(ctx, gx - 5, gy, 10, 3, iron); R(ctx, gx - 7, gy, 4, 2, iron); R(ctx, gx - 2, gy + 3, 4, 4, iron); }
  else if (glyph === 'vial') { R(ctx, gx - 2, gy - 5, 4, 4, '#7fd06a'); R(ctx, gx - 3, gy - 1, 6, 6, '#3a7a3a'); R(ctx, gx - 1, gy - 7, 2, 2, g); }
  else if (glyph === 'sword') { R(ctx, gx - 1, gy - 6, 2, 10, '#c8ccd8'); R(ctx, gx - 3, gy + 3, 6, 2, g); R(ctx, gx - 1, gy + 4, 2, 3, wood); }
  else if (glyph === 'tankard') { R(ctx, gx - 4, gy - 4, 8, 9, '#caa56a'); R(ctx, gx - 4, gy - 5, 8, 2, '#efe6c8'); R(ctx, gx + 4, gy - 2, 2, 4, '#8a6a3a'); }
  else if (glyph === 'coin') { ctx.fillStyle = '#e0b24e'; ctx.beginPath(); ctx.arc(gx, gy, 5, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#8a6a2a'; ctx.fillRect(gx - 1, gy - 2, 2, 4); }
  else { R(ctx, gx - 5, gy - 3, 10, 7, '#c98a4a'); R(ctx, gx - 5, gy - 3, 10, 2, '#e0b070'); PX(ctx, gx - 2, gy, g); PX(ctx, gx + 1, gy + 1, g); } // loaf
}
export function drawHouseDoor(ctx: Ctx, ox: number, oy: number): void {
  // Ground floor: stone plinth, recessed oak door with iron bands, two steps.
  drawHouseBase(ctx, ox, oy);
  const st = '#8a8276', stHi = '#a8a092', stDk = '#5f584e', recess = '#1a120a';
  const wood = '#5a3a1c', woodHi = '#7a5128', woodDk = '#3a2410';
  // stone jambs + lintel
  R(ctx, ox + 6, oy + 6, 5, 6, st);
  R(ctx, ox + 21, oy + 6, 5, 6, st);
  R(ctx, ox + 7, oy + 4, 18, 5, stHi);
  R(ctx, ox + 7, oy + 4, 18, 1, '#c8c0b0');
  R(ctx, ox + 7, oy + 8, 18, 1, stDk);
  // opening + door leaf
  R(ctx, ox + 8, oy + 9, 16, 19, recess);
  R(ctx, ox + 9, oy + 10, 14, 17, wood);
  R(ctx, ox + 9, oy + 10, 3, 17, woodHi);
  for (const px of [12, 16, 19]) R(ctx, ox + px, oy + 10, 1, 17, woodDk);
  R(ctx, ox + 9, oy + 15, 14, 2, '#3a3f4a'); // iron band
  R(ctx, ox + 9, oy + 22, 14, 2, '#3a3f4a');
  R(ctx, ox + 9, oy + 15, 14, 1, '#5a626e');
  PX(ctx, ox + 20, oy + 18, '#cfa64e'); // latch
  // entry steps (projecting plinth)
  R(ctx, ox + 8, oy + 27, 16, 3, st);
  R(ctx, ox + 7, oy + 29, 18, 2, stDk);
  R(ctx, ox + 8, oy + 27, 16, 1, stHi);
}

// ---- building facades (half-timbered plaster bays + stone footing) ----------
export function drawHouseWall(ctx: Ctx, ox: number, oy: number): void {
  // Lime-washed plaster bay with a vertical oak stud so runs of wall read as
  // framed panels, not one flat slab. Footing / beam / posts are separate tiles.
  R(ctx, ox, oy, 32, 32, '#d8c6a0');
  // plaster mottle
  for (const [x, y, c] of [
    [5, 4, '#c9b58c'], [22, 6, '#c9b58c'], [9, 18, '#e8d8b0'], [18, 24, '#c9b58c'],
    [26, 14, '#e8d8b0'], [3, 27, '#c9b58c'], [28, 3, '#c9b58c'], [12, 12, '#e0cfa4'],
  ] as [number, number, string][]) PX(ctx, ox + x, oy + y, c);
  // mid stud
  R(ctx, ox + 14, oy, 4, 32, '#6e4a24');
  R(ctx, ox + 14, oy, 1, 32, '#8a6132');
  R(ctx, ox + 17, oy, 1, 32, '#42301a');
  // horizontal mid-rail (half-timber crosspiece)
  R(ctx, ox, oy + 14, 32, 3, '#6e4a24');
  R(ctx, ox, oy + 14, 32, 1, '#8a6132');
  R(ctx, ox, oy + 16, 32, 1, '#42301a');
}
export function drawHousePost(ctx: Ctx, ox: number, oy: number): void {
  // Corner post: full timber upright with diagonal brace into the plaster bay.
  R(ctx, ox, oy, 32, 32, '#d8c6a0');
  for (const [x, y] of [[6, 5], [24, 20], [10, 26]] as [number, number][]) PX(ctx, ox + x, oy + y, '#c9b58c');
  R(ctx, ox + 10, oy, 12, 32, '#6e4a24');
  R(ctx, ox + 10, oy, 3, 32, '#8a6132');
  R(ctx, ox + 19, oy, 3, 32, '#42301a');
  // diagonal brace
  for (let i = 0; i < 10; i++) R(ctx, ox + 4 + i, oy + 8 + i, 3, 2, '#5a3a1c');
  R(ctx, ox + 4, oy + 8, 12, 2, '#6e4a24');
  PX(ctx, ox + 15, oy + 12, '#3a2410');
  PX(ctx, ox + 15, oy + 22, '#3a2410');
}
export function drawHouseBeam(ctx: Ctx, ox: number, oy: number): void {
  drawHouseWall(ctx, ox, oy);
  // Deep eave shadow + thick wall-plate beam under the roof.
  R(ctx, ox, oy, 32, 4, 'rgba(12,8,4,0.45)');
  R(ctx, ox, oy + 3, 32, 5, '#5a3a1c');
  R(ctx, ox, oy + 3, 32, 1, '#8a6132');
  R(ctx, ox, oy + 7, 32, 1, '#3a2410');
  // peg marks along the plate
  for (let x = 4; x < 30; x += 7) PX(ctx, ox + x, oy + 5, '#3a2410');
}
export function drawHouseBase(ctx: Ctx, ox: number, oy: number): void {
  // Plaster upper half, substantial ashlar stone plinth on the lower half.
  R(ctx, ox, oy, 32, 16, '#d8c6a0');
  for (const [x, y] of [[5, 3], [20, 8], [12, 12]] as [number, number][]) PX(ctx, ox + x, oy + y, '#c9b58c');
  // mid stud continues into base
  R(ctx, ox + 14, oy, 4, 16, '#6e4a24');
  R(ctx, ox + 14, oy, 1, 16, '#8a6132');
  // ashlar footing
  R(ctx, ox, oy + 14, 32, 18, '#7a7268');
  for (let ry = 14; ry < 32; ry += 6) {
    const off = ((ry / 6) | 0) % 2 ? 6 : 0;
    for (let sx = -off; sx < 32; sx += 12) {
      R(ctx, ox + sx, oy + ry, 12, 6, '#8a8276');
      R(ctx, ox + sx, oy + ry, 12, 1, '#a8a092');
      R(ctx, ox + sx + 11, oy + ry, 1, 6, '#5f584e');
      R(ctx, ox + sx, oy + ry + 5, 12, 1, '#5f584e');
    }
  }
  R(ctx, ox, oy + 14, 32, 1, '#5a3a1c'); // timber sill plate
  R(ctx, ox, oy + 30, 32, 2, '#4a443c'); // ground contact shadow
}
export function drawHouseWindow(ctx: Ctx, ox: number, oy: number): void {
  // Modest leaded casement centered in a plaster bay — not a full-tile glass wall.
  drawHouseWall(ctx, ox, oy);
  const fr = '#3a2712', wood = '#6e4a24', woodHi = '#8a6132';
  // shutter boards (closed look on sides) + frame
  R(ctx, ox + 5, oy + 6, 4, 16, wood);
  R(ctx, ox + 23, oy + 6, 4, 16, wood);
  R(ctx, ox + 5, oy + 6, 1, 16, woodHi);
  R(ctx, ox + 23, oy + 6, 1, 16, woodHi);
  // frame + mullions
  R(ctx, ox + 8, oy + 5, 16, 18, fr);
  const g = ctx.createLinearGradient(0, oy + 7, 0, oy + 20);
  g.addColorStop(0, '#4a6a88');
  g.addColorStop(0.55, '#6a90b0');
  g.addColorStop(1, '#c4a06a'); // warm interior glow at bottom
  ctx.fillStyle = g;
  ctx.fillRect(ox + 9, oy + 6, 14, 15);
  R(ctx, ox + 9, oy + 6, 7, 6, 'rgba(180,210,230,0.35)'); // sky reflection
  R(ctx, ox + 15, oy + 6, 2, 15, fr); // mullion
  R(ctx, ox + 9, oy + 12, 14, 2, fr); // transom
  R(ctx, ox + 8, oy + 20, 16, 2, woodHi); // sill
  R(ctx, ox + 8, oy + 21, 16, 1, '#5a3a1c');
  // flower box under the sill
  R(ctx, ox + 10, oy + 22, 12, 4, '#5a3a1c');
  PX(ctx, ox + 12, oy + 23, '#c8506a');
  PX(ctx, ox + 15, oy + 22, '#e0b24e');
  PX(ctx, ox + 18, oy + 23, '#6aa050');
}

// ---- tavern / interior furniture (32x32 decor) -----------------------------
export function drawWoodFloor(ctx: Ctx, ox: number, oy: number): void {
  // Warm oak boards with grain, nails, and staggered butt-joints.
  const tones = ['#6e4a28', '#7a542e', '#654420', '#745028', '#6a4824'];
  for (let i = 0; i < 32; i += 8) {
    R(ctx, ox, oy + i, 32, 8, tones[(i / 8) % tones.length]);
    R(ctx, ox, oy + i, 32, 1, '#3a2410');
    R(ctx, ox, oy + i + 1, 32, 1, '#8a6034');
    // grain lines
    for (let gx = 3; gx < 30; gx += 7) R(ctx, ox + gx, oy + i + 3, 1, 4, 'rgba(40,24,10,0.25)');
  }
  R(ctx, ox + 15, oy, 1, 16, '#2e1d0e');
  R(ctx, ox + 7, oy + 16, 1, 16, '#2e1d0e');
  R(ctx, ox + 23, oy + 16, 1, 16, '#2e1d0e');
  // nail heads
  for (const [x, y] of [[4, 2], [28, 2], [4, 10], [28, 10], [12, 18], [20, 18], [12, 26], [20, 26]] as [number, number][])
    PX(ctx, ox + x, oy + y, '#3a2a18');
}
export function drawTavernWall(ctx: Ctx, ox: number, oy: number): void {
  // Warm plaster over oak wainscot — cozy inn, not crypt stone.
  R(ctx, ox, oy, 32, 32, '#4a3826');
  R(ctx, ox, oy, 32, 15, '#d0b88a');
  R(ctx, ox, oy, 32, 2, '#e8d4a8');
  R(ctx, ox, oy, 32, 1, 'rgba(255,255,255,0.14)');
  for (const [x, y] of [[5, 4], [18, 7], [26, 3], [9, 10], [22, 11]] as [number, number][])
    PX(ctx, ox + x, oy + y, '#b89a6a');
  // chair rail
  R(ctx, ox, oy + 13, 32, 3, '#5a3a1c');
  R(ctx, ox, oy + 13, 32, 1, '#8a6132');
  R(ctx, ox, oy + 15, 32, 1, '#3a2410');
  // wainscot planks
  for (let i = 0; i < 32; i += 8) {
    R(ctx, ox + i, oy + 16, 1, 14, '#2e2013');
    R(ctx, ox + i + 1, oy + 16, 1, 14, '#6a4a2e');
    R(ctx, ox + i + 2, oy + 16, 5, 14, '#5a3a1c');
  }
  R(ctx, ox, oy + 30, 32, 2, '#1e140c');
}
export function drawTavernBar(ctx: Ctx, ox: number, oy: number): void {
  // Deep oak bar with panelled front, polished top, and lined tankards.
  R(ctx, ox, oy + 6, 32, 20, '#4a3018');
  R(ctx, ox, oy + 4, 32, 4, '#8a6132');
  R(ctx, ox, oy + 4, 32, 1, '#c49a5a');
  R(ctx, ox, oy + 7, 32, 1, '#2e1d0e');
  for (let x = 0; x < 32; x += 8) {
    R(ctx, ox + x, oy + 10, 1, 14, '#2e1d0e');
    R(ctx, ox + x + 1, oy + 11, 6, 10, '#5a3a1c');
    R(ctx, ox + x + 2, oy + 12, 4, 2, '#6e4a24'); // panel inset
  }
  R(ctx, ox, oy + 24, 32, 4, '#2e1d0e');
  // tankards + coasters on the rail
  R(ctx, ox + 4, oy + 1, 4, 4, '#c9a86a');
  R(ctx, ox + 4, oy + 1, 4, 1, '#e8d4a8');
  R(ctx, ox + 14, oy, 4, 5, '#b8923a');
  R(ctx, ox + 14, oy, 4, 1, '#e0c068');
  R(ctx, ox + 24, oy + 1, 4, 4, '#c9a86a');
  PX(ctx, ox + 25, oy + 2, '#efe6c8'); // foam
}
export function drawTavernTable(ctx: Ctx, ox: number, oy: number): void {
  // Round oak board on a pedestal, with tankard + candle stump.
  R(ctx, ox + 10, oy + 22, 12, 6, '#3a2410'); // pedestal
  R(ctx, ox + 12, oy + 20, 8, 4, '#4a3018');
  ctx.fillStyle = '#2e1d0e';
  ctx.beginPath(); ctx.ellipse(ox + 16, oy + 19, 13, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#6e4a24';
  ctx.beginPath(); ctx.ellipse(ox + 16, oy + 17, 13, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#8a6132';
  ctx.beginPath(); ctx.ellipse(ox + 14, oy + 15, 8, 4, 0, 0, Math.PI * 2); ctx.fill();
  R(ctx, ox + 10, oy + 13, 4, 4, '#c9a86a'); // mug
  R(ctx, ox + 10, oy + 13, 4, 1, '#e8d4a8');
  R(ctx, ox + 19, oy + 14, 3, 3, '#efe6c8'); // plate
  R(ctx, ox + 20, oy + 11, 2, 3, '#e8e2cc'); // candle
  PX(ctx, ox + 20, oy + 10, '#ffb02a');
}
export function drawTavernStool(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 11, oy + 22, 2, 6, '#3a2410');
  R(ctx, ox + 19, oy + 22, 2, 6, '#3a2410');
  R(ctx, ox + 10, oy + 20, 12, 2, '#4a3018'); // rung
  ctx.fillStyle = '#2e1d0e';
  ctx.beginPath(); ctx.ellipse(ox + 16, oy + 18, 7, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#6e4a24';
  ctx.beginPath(); ctx.ellipse(ox + 16, oy + 16, 7, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#8a6132';
  ctx.beginPath(); ctx.ellipse(ox + 15, oy + 15, 4, 2, 0, 0, Math.PI * 2); ctx.fill();
}
export function drawHearth(ctx: Ctx, ox: number, oy: number): void {
  // Grand stone fireplace with mantel, ashlar, and a living fire.
  R(ctx, ox, oy + 2, 32, 28, '#6a6258');
  for (let ry = 4; ry < 28; ry += 6) {
    const off = (ry / 6) % 2 ? 4 : 0;
    for (let sx = -off; sx < 32; sx += 10) {
      R(ctx, ox + sx, oy + ry, 10, 6, '#7a7268');
      R(ctx, ox + sx, oy + ry, 10, 1, '#9a9286');
      R(ctx, ox + sx + 9, oy + ry, 1, 6, '#4a443c');
    }
  }
  R(ctx, ox, oy, 32, 5, '#5a5048'); // mantel
  R(ctx, ox, oy, 32, 1, '#8a8276');
  R(ctx, ox + 2, oy + 1, 6, 3, '#c9a86a'); // mantel candlestick left
  R(ctx, ox + 24, oy + 1, 6, 3, '#c9a86a');
  PX(ctx, ox + 4, oy, '#ffb02a');
  PX(ctx, ox + 26, oy, '#ffb02a');
  // firebox
  R(ctx, ox + 6, oy + 10, 20, 18, '#0e0a06');
  R(ctx, ox + 7, oy + 22, 18, 5, '#3a1c0c'); // coals
  R(ctx, ox + 8, oy + 18, 16, 8, '#d2541c');
  R(ctx, ox + 10, oy + 14, 12, 8, '#ff7a2a');
  R(ctx, ox + 12, oy + 11, 8, 6, '#ffb02a');
  PX(ctx, ox + 15, oy + 10, '#fff2b0');
  R(ctx, ox + 6, oy + 27, 20, 2, '#3a3f4a'); // iron fender
}
export function drawBarrel(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 8, oy + 4, 16, 24, '#5a3a1c');
  R(ctx, ox + 7, oy + 8, 18, 16, '#6e4a24');
  R(ctx, ox + 10, oy + 4, 3, 24, '#8a6132');
  R(ctx, ox + 20, oy + 6, 2, 20, '#3a2410');
  for (const hy of [8, 15, 22]) {
    R(ctx, ox + 7, oy + hy, 18, 2, '#2e1d0e');
    R(ctx, ox + 7, oy + hy, 18, 1, '#4a515e'); // iron hoop glint
  }
  ctx.fillStyle = '#4a3018';
  ctx.beginPath(); ctx.ellipse(ox + 16, oy + 5, 8, 2.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#6e4a24';
  ctx.beginPath(); ctx.ellipse(ox + 16, oy + 4, 7, 2, 0, 0, Math.PI * 2); ctx.fill();
  PX(ctx, ox + 14, oy + 4, '#8a6132');
}
export function drawRug(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 1, oy + 5, 30, 22, '#5a181c');
  R(ctx, ox + 1, oy + 5, 30, 2, '#cfa64e');
  R(ctx, ox + 1, oy + 25, 30, 2, '#cfa64e');
  R(ctx, ox + 1, oy + 5, 2, 22, '#cfa64e');
  R(ctx, ox + 29, oy + 5, 2, 22, '#cfa64e');
  R(ctx, ox + 4, oy + 8, 24, 16, '#8a2a30');
  // diamond medallion
  ctx.fillStyle = '#cfa64e';
  ctx.beginPath();
  ctx.moveTo(ox + 16, oy + 10);
  ctx.lineTo(ox + 24, oy + 16);
  ctx.lineTo(ox + 16, oy + 22);
  ctx.lineTo(ox + 8, oy + 16);
  ctx.closePath();
  ctx.fill();
  R(ctx, ox + 13, oy + 14, 6, 4, '#5a181c');
  PX(ctx, ox + 16, oy + 15, '#e8c868');
}
export function drawShelf(ctx: Ctx, ox: number, oy: number): void {
  // Two boards with brackets and a mixed stock of bottles / jars.
  R(ctx, ox + 1, oy + 8, 30, 3, '#5a3a1c');
  R(ctx, ox + 1, oy + 8, 30, 1, '#8a6132');
  R(ctx, ox + 1, oy + 20, 30, 3, '#5a3a1c');
  R(ctx, ox + 1, oy + 20, 30, 1, '#8a6132');
  R(ctx, ox + 2, oy + 11, 2, 9, '#3a2410'); // brackets
  R(ctx, ox + 28, oy + 11, 2, 9, '#3a2410');
  const bot = ['#3a6a3a', '#7a2326', '#34507a', '#caa882', '#5a3a7a', '#c05040'];
  for (let i = 0; i < 6; i++) {
    R(ctx, ox + 3 + i * 5, oy + 3, 3, 5, bot[i]);
    R(ctx, ox + 3 + i * 5, oy + 3, 3, 1, '#e0d0a0');
    R(ctx, ox + 4 + i * 5, oy + 14, 3, 6, bot[(i + 2) % 6]);
  }
}

// ---- Fighters Guild interior props -----------------------------------------
export function drawGuildWall(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox, oy, 32, 32, '#63656f'); // stone base
  // ashlar blocks with per-stone shading for a 3D masonry read (staggered rows)
  for (let ry = 0; ry < 32; ry += 8) {
    const off = (ry / 8) % 2 ? 8 : 0;
    for (let sx = -off; sx < 32; sx += 16) {
      R(ctx, ox + sx, oy + ry, 16, 8, '#6a6c78');
      R(ctx, ox + sx, oy + ry, 16, 1, '#888a96'); // top highlight
      R(ctx, ox + sx, oy + ry, 1, 8, '#7a7c88'); // left highlight
      R(ctx, ox + sx, oy + ry + 7, 16, 1, '#45474f'); // bottom shadow
      R(ctx, ox + sx + 15, oy + ry, 1, 8, '#45474f'); // right shadow
    }
  }
  for (let ry = 0; ry <= 32; ry += 8) R(ctx, ox, oy + ry, 32, 1, '#3f414b'); // mortar courses
  R(ctx, ox, oy + 14, 32, 2, '#5a3a1c'); // timber rail
  R(ctx, ox, oy + 14, 32, 1, '#6e4a24');
  PX(ctx, ox + 7, oy + 5, '#9a9ca8'); PX(ctx, ox + 22, oy + 19, '#9a9ca8');
}
export function drawTrainingDummy(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 15, oy + 18, 3, 12, '#5a3a1c'); // post
  R(ctx, ox + 13, oy + 28, 7, 2, '#3a2410'); // foot
  R(ctx, ox + 8, oy + 11, 16, 2, '#5a3a1c'); // cross-arm
  R(ctx, ox + 11, oy + 8, 10, 11, '#b8923a'); // burlap torso
  R(ctx, ox + 11, oy + 8, 10, 1, '#d2ac52');
  R(ctx, ox + 11, oy + 12, 10, 1, '#6e4a24'); R(ctx, ox + 11, oy + 15, 10, 1, '#6e4a24'); // straps
  ctx.fillStyle = '#caa84a'; ctx.beginPath(); ctx.arc(ox + 16, oy + 5, 4, 0, Math.PI * 2); ctx.fill(); // head
  PX(ctx, ox + 14, oy + 14, '#3a2410'); // a gash
}
export function drawAnvil(ctx: Ctx, ox: number, oy: number): void {
  // Master anvil: heavy steel body on an oaken block, with a horn, hardy hole,
  // and a cooling blade resting on the face — the heart of Brunda's floor.
  R(ctx, ox + 8, oy + 22, 16, 9, '#3a2410'); // oak stump
  R(ctx, ox + 8, oy + 22, 16, 1, '#6e4a24');
  R(ctx, ox + 8, oy + 28, 16, 1, '#24180c');
  for (let i = 10; i < 24; i += 4) R(ctx, ox + i, oy + 23, 1, 6, '#2a1a0c'); // stump rings
  // steel body
  R(ctx, ox + 7, oy + 14, 18, 9, '#3a3f4a');
  R(ctx, ox + 7, oy + 14, 2, 9, '#5a626e');
  R(ctx, ox + 22, oy + 14, 3, 9, '#2a2e36');
  // face plate (lit)
  R(ctx, ox + 5, oy + 11, 22, 5, '#4a515e');
  R(ctx, ox + 5, oy + 11, 22, 1, '#8a929e');
  R(ctx, ox + 5, oy + 15, 22, 1, '#2a2e36');
  // horn (left)
  R(ctx, ox + 1, oy + 12, 6, 3, '#4a515e');
  R(ctx, ox + 1, oy + 12, 6, 1, '#6a727e');
  // heel / hardy
  R(ctx, ox + 24, oy + 12, 5, 4, '#3a3f4a');
  PX(ctx, ox + 14, oy + 13, '#1a1c22'); // hardy hole
  // resting hot blade (ember glow)
  R(ctx, ox + 10, oy + 9, 12, 2, '#c8ccd4');
  R(ctx, ox + 10, oy + 9, 4, 2, '#ff7a2a');
  PX(ctx, ox + 11, oy + 9, '#ffd080');
  R(ctx, ox + 20, oy + 8, 3, 4, '#5a3a1c'); // hilt
}

// ---- Brunda's Forge: sooty stone, grand furnace, and workshop props --------

/** Heat-stained ashlar walls — dark masonry with soot streaks and ember glow. */
export function drawForgeWall(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox, oy, 32, 32, '#3a3430');
  for (let ry = 0; ry < 32; ry += 8) {
    const off = (ry / 8) % 2 ? 8 : 0;
    for (let sx = -off; sx < 32; sx += 16) {
      const warm = (ry > 18) ? '#4a3a32' : '#454038';
      R(ctx, ox + sx, oy + ry, 16, 8, warm);
      R(ctx, ox + sx, oy + ry, 16, 1, '#5a5248');
      R(ctx, ox + sx, oy + ry + 7, 16, 1, '#2a2622');
      R(ctx, ox + sx + 15, oy + ry, 1, 8, '#2a2622');
    }
  }
  for (let ry = 0; ry <= 32; ry += 8) R(ctx, ox, oy + ry, 32, 1, '#1e1a16');
  // soot streaks + heat discoloration near the floor
  for (const [x, y] of [[4, 2], [18, 6], [9, 14], [22, 20], [6, 26], [26, 28]] as [number, number][])
    PX(ctx, ox + x, oy + y, '#2a221c');
  R(ctx, ox, oy + 24, 32, 8, 'rgba(80,30,10,0.12)'); // floor-heat wash
  R(ctx, ox, oy + 28, 32, 4, 'rgba(0,0,0,0.25)');
}

/** Packed flagstones stained with ash, slag flecks, and quench-water darks. */
export function drawForgeFloor(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox, oy, 32, 32, '#3a342e');
  const stones = ['#4a443c', '#3e3832', '#524a42', '#35302a', '#464038'];
  let s = 91013;
  const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  for (let gy = 0; gy < 4; gy++) {
    for (let gx = 0; gx < 4; gx++) {
      const px = ox + gx * 8 + (gy % 2 ? 2 : 0);
      const py = oy + gy * 8;
      R(ctx, px, py, 7, 7, stones[Math.floor(rnd() * stones.length)]);
      R(ctx, px, py, 7, 1, '#5a5248');
      R(ctx, px, py + 6, 7, 1, '#2a2620');
    }
  }
  // ash smear + slag sparkles
  R(ctx, ox + 4, oy + 18, 10, 3, 'rgba(20,16,12,0.35)');
  R(ctx, ox + 16, oy + 8, 8, 2, 'rgba(20,16,12,0.28)');
  PX(ctx, ox + 7, oy + 22, '#6a5a48');
  PX(ctx, ox + 20, oy + 14, '#8a4a28');
  PX(ctx, ox + 12, oy + 5, '#5a4030');
}

/** Ember carpet — walkable floor glow in front of the grand furnace. */
export function drawForgeEmbers(ctx: Ctx, ox: number, oy: number): void {
  drawForgeFloor(ctx, ox, oy);
  R(ctx, ox + 2, oy + 4, 28, 24, 'rgba(180,40,10,0.18)');
  for (const [x, y, c] of [
    [8, 10, '#ff7a2a'], [14, 16, '#ffb02a'], [20, 12, '#ff5a1a'],
    [11, 22, '#d2541c'], [18, 20, '#ffcf5a'], [24, 18, '#ff8a1e'],
    [6, 18, '#c04018'], [16, 8, '#ffd080'],
  ] as [number, number, string][]) PX(ctx, ox + x, oy + y, c);
}

/** Grand furnace mouth — the roaring heart of the shop (solid). */
export function drawForgeFurnace(ctx: Ctx, ox: number, oy: number): void {
  // stone arch surround
  R(ctx, ox, oy, 32, 32, '#4a4038');
  for (let i = 0; i < 32; i += 8) {
    R(ctx, ox + i, oy, 8, 6, '#5a5048');
    R(ctx, ox + i, oy, 8, 1, '#7a7068');
    R(ctx, ox + i + 7, oy, 1, 6, '#2a2420');
  }
  // arch pillars
  R(ctx, ox + 1, oy + 4, 6, 28, '#5a5048');
  R(ctx, ox + 25, oy + 4, 6, 28, '#5a5048');
  R(ctx, ox + 1, oy + 4, 2, 28, '#7a7068');
  R(ctx, ox + 29, oy + 4, 2, 28, '#3a342e');
  // keystone
  R(ctx, ox + 12, oy + 2, 8, 6, '#6a6058');
  R(ctx, ox + 13, oy + 3, 6, 1, '#8a8078');
  // firebox void
  R(ctx, ox + 7, oy + 8, 18, 22, '#0a0604');
  // roaring coals + flame tongues
  R(ctx, ox + 8, oy + 22, 16, 7, '#5a1808');
  R(ctx, ox + 9, oy + 20, 14, 6, '#d2541c');
  R(ctx, ox + 11, oy + 16, 10, 8, '#ff7a2a');
  R(ctx, ox + 13, oy + 12, 6, 8, '#ffb02a');
  R(ctx, ox + 14, oy + 9, 4, 6, '#fff2b0');
  PX(ctx, ox + 15, oy + 8, '#fff8e0');
  // heat shimmer lines
  R(ctx, ox + 10, oy + 10, 1, 4, 'rgba(255,200,100,0.35)');
  R(ctx, ox + 20, oy + 11, 1, 5, 'rgba(255,200,100,0.28)');
  // iron grate at the lip
  R(ctx, ox + 7, oy + 28, 18, 2, '#2a2e36');
  for (let x = 8; x < 24; x += 3) R(ctx, ox + x, oy + 26, 1, 4, '#3a3f4a');
}

/** Overhanging iron hood / flue above the furnace mouth. */
export function drawForgeHood(ctx: Ctx, ox: number, oy: number): void {
  // soot-black iron canopy
  R(ctx, ox + 2, oy + 8, 28, 18, '#2a2e36');
  R(ctx, ox + 2, oy + 8, 28, 2, '#4a515e');
  R(ctx, ox + 2, oy + 8, 2, 18, '#3a3f4a');
  R(ctx, ox + 28, oy + 8, 2, 18, '#1a1c22');
  // flared mouth
  R(ctx, ox, oy + 22, 32, 6, '#3a3f4a');
  R(ctx, ox, oy + 22, 32, 1, '#5a626e');
  R(ctx, ox, oy + 26, 32, 2, '#1a1c22');
  // flue stack
  R(ctx, ox + 11, oy, 10, 10, '#2a2e36');
  R(ctx, ox + 11, oy, 10, 1, '#4a515e');
  R(ctx, ox + 13, oy + 2, 6, 6, '#1a120c'); // dark throat
  // rivets
  for (const [x, y] of [[4, 12], [27, 12], [4, 20], [27, 20], [16, 10]] as [number, number][])
    PX(ctx, ox + x, oy + y, '#6a727e');
  // hanging heat glow under the hood
  R(ctx, ox + 6, oy + 24, 20, 3, 'rgba(255,100,30,0.25)');
}

/** Leather-and-wood bellows for feeding the grand furnace. */
export function drawForgeBellows(ctx: Ctx, ox: number, oy: number): void {
  // wooden lever arms
  R(ctx, ox + 4, oy + 6, 4, 20, '#6e4a24');
  R(ctx, ox + 24, oy + 6, 4, 20, '#6e4a24');
  R(ctx, ox + 4, oy + 6, 1, 20, '#8a6132');
  R(ctx, ox + 24, oy + 6, 1, 20, '#8a6132');
  // leather bag (pleated)
  R(ctx, ox + 6, oy + 10, 20, 14, '#5a3a1c');
  for (let i = 12; i < 22; i += 3) R(ctx, ox + 7, oy + i, 18, 1, '#3a2410');
  R(ctx, ox + 8, oy + 12, 16, 8, '#7a5128');
  R(ctx, ox + 8, oy + 12, 16, 1, '#9a6c38');
  // nozzle toward the fire
  R(ctx, ox + 22, oy + 16, 8, 4, '#3a3f4a');
  R(ctx, ox + 28, oy + 17, 3, 2, '#2a2e36');
  // base board
  R(ctx, ox + 3, oy + 26, 26, 4, '#4a3018');
  R(ctx, ox + 3, oy + 26, 26, 1, '#6e4a24');
}

/** Stone quench trough filled with dark water. */
export function drawForgeTrough(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 2, oy + 10, 28, 18, '#5a5048'); // stone basin
  R(ctx, ox + 2, oy + 10, 28, 2, '#7a7068');
  R(ctx, ox + 2, oy + 26, 28, 2, '#3a342e');
  R(ctx, ox + 4, oy + 12, 24, 12, '#1a2838'); // water
  R(ctx, ox + 5, oy + 13, 10, 4, '#2a4058'); // highlight
  R(ctx, ox + 6, oy + 14, 6, 2, 'rgba(180,210,230,0.35)');
  // steam wisps
  PX(ctx, ox + 12, oy + 8, 'rgba(200,210,220,0.4)');
  PX(ctx, ox + 16, oy + 6, 'rgba(200,210,220,0.3)');
  PX(ctx, ox + 20, oy + 9, 'rgba(200,210,220,0.35)');
  // iron rim
  R(ctx, ox + 3, oy + 11, 26, 1, '#3a3f4a');
}

/** Heavy workbench with tools and a half-shaped billet. */
export function drawForgeWorkbench(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 1, oy + 12, 30, 14, '#5a3a1c'); // top
  R(ctx, ox + 1, oy + 12, 30, 2, '#8a6132');
  R(ctx, ox + 1, oy + 24, 30, 2, '#3a2410');
  R(ctx, ox + 3, oy + 26, 4, 5, '#3a2410'); // legs
  R(ctx, ox + 25, oy + 26, 4, 5, '#3a2410');
  // tools on the board
  R(ctx, ox + 4, oy + 8, 2, 8, '#4a515e'); // hammer handle vertical
  R(ctx, ox + 2, oy + 6, 6, 3, '#3a3f4a'); // hammer head
  R(ctx, ox + 12, oy + 9, 10, 2, '#c8ccd4'); // billet
  R(ctx, ox + 12, oy + 9, 3, 2, '#ff7a2a'); // hot end
  R(ctx, ox + 24, oy + 7, 2, 8, '#6e4a24'); // tongs
  R(ctx, ox + 22, oy + 6, 6, 2, '#3a3f4a');
}

/** Stack of finished iron ingots. */
export function drawForgeIngots(ctx: Ctx, ox: number, oy: number): void {
  const stack = (x: number, y: number, c: string, hi: string) => {
    R(ctx, ox + x, oy + y, 12, 5, c);
    R(ctx, ox + x, oy + y, 12, 1, hi);
    R(ctx, ox + x, oy + y + 4, 12, 1, '#2a2e36');
  };
  stack(4, 20, '#4a515e', '#6a727e');
  stack(10, 16, '#3a3f4a', '#5a626e');
  stack(6, 12, '#4a515e', '#7a828e');
  stack(14, 18, '#3a3f4a', '#5a626e');
  stack(12, 8, '#5a626e', '#8a929e'); // top prize ingot, brighter
  PX(ctx, ox + 16, oy + 9, '#c8ccd4');
}

/** Raw ore pile — rough ochre/iron rocks. */
export function drawForgeOre(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 4, oy + 18, 24, 10, '#3a2a1c');
  for (const [x, y, c] of [
    [8, 14, '#5a3a22'], [14, 12, '#4a3020'], [20, 15, '#6a4428'],
    [10, 18, '#3a2410'], [16, 16, '#7a4a2a'], [22, 20, '#5a3820'],
    [12, 22, '#4a2e18'], [18, 21, '#6a4030'],
  ] as [number, number, string][]) {
    R(ctx, ox + x, oy + y, 5, 4, c);
    R(ctx, ox + x, oy + y, 5, 1, '#8a6040');
  }
  // iron flecks
  PX(ctx, ox + 11, oy + 15, '#6a727e');
  PX(ctx, ox + 19, oy + 17, '#8a929e');
  PX(ctx, ox + 15, oy + 20, '#5a626e');
}

/** Cooled slag clinker — waste of the forge floor. */
export function drawForgeSlag(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 6, oy + 16, 20, 12, '#2a221c');
  for (const [x, y, c] of [
    [8, 18, '#3a2e28'], [14, 16, '#4a3830'], [18, 20, '#2e2620'],
    [10, 22, '#5a4030'], [16, 24, '#3a3028'], [20, 18, '#4a2a20'],
  ] as [number, number, string][]) R(ctx, ox + x, oy + y, 4, 3, c);
  PX(ctx, ox + 12, oy + 17, '#8a4a28');
  PX(ctx, ox + 17, oy + 21, '#6a3820');
}

/** Wall-mounted rack of finished blades (more imposing than the outdoor rack). */
export function drawForgeWeaponWall(ctx: Ctx, ox: number, oy: number): void {
  // timber backboard
  R(ctx, ox + 2, oy + 2, 28, 28, '#3a2410');
  R(ctx, ox + 2, oy + 2, 28, 1, '#6e4a24');
  R(ctx, ox + 2, oy + 2, 1, 28, '#5a3a1c');
  // three hanging blades
  for (const [x, tip] of [[7, '#c8ccd4'], [15, '#e0c068'], [23, '#a8b0c0']] as [number, string][]) {
    R(ctx, ox + x, oy + 6, 3, 18, tip);
    R(ctx, ox + x, oy + 6, 3, 1, '#f0f4ff');
    R(ctx, ox + x - 1, oy + 22, 5, 3, '#5a3a1c'); // guard
    R(ctx, ox + x, oy + 24, 3, 5, '#3a2410'); // grip
  }
  // iron brackets
  R(ctx, ox + 4, oy + 5, 24, 2, '#3a3f4a');
  R(ctx, ox + 4, oy + 20, 24, 1, '#3a3f4a');
}

export function drawCrate(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 2, oy + 6, 28, 24, '#5a3a1c');
  R(ctx, ox + 2, oy + 6, 28, 2, '#8a6132');
  R(ctx, ox + 2, oy + 6, 3, 24, '#6e4a24');
  R(ctx, ox + 27, oy + 6, 3, 24, '#3a2410');
  R(ctx, ox + 2, oy + 28, 28, 2, '#2e1d0e');
  // lid boards
  R(ctx, ox + 3, oy + 4, 26, 3, '#6e4a24');
  R(ctx, ox + 3, oy + 4, 26, 1, '#9a6c38');
  // cross brace
  ctx.strokeStyle = '#3a2410'; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(ox + 5, oy + 8); ctx.lineTo(ox + 27, oy + 28);
  ctx.moveTo(ox + 27, oy + 8); ctx.lineTo(ox + 5, oy + 28);
  ctx.stroke();
  // iron corners
  R(ctx, ox + 2, oy + 6, 4, 3, '#3a3f4a');
  R(ctx, ox + 26, oy + 6, 4, 3, '#3a3f4a');
  R(ctx, ox + 2, oy + 27, 4, 3, '#3a3f4a');
  R(ctx, ox + 26, oy + 27, 4, 3, '#3a3f4a');
}
export function drawCauldron(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 8, oy + 26, 3, 5, '#1c1c22');
  R(ctx, ox + 21, oy + 26, 3, 5, '#1c1c22');
  R(ctx, ox + 14, oy + 27, 4, 4, '#1c1c22'); // middle foot
  ctx.fillStyle = '#14141a';
  ctx.beginPath(); ctx.ellipse(ox + 16, oy + 18, 13, 11, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#2a2a34';
  ctx.beginPath(); ctx.ellipse(ox + 16, oy + 12, 13, 5, 0, 0, Math.PI * 2); ctx.fill();
  R(ctx, ox + 5, oy + 12, 22, 2, '#3a3a48'); // rim
  // bubbling green brew
  ctx.fillStyle = '#2a6a2a';
  ctx.beginPath(); ctx.ellipse(ox + 16, oy + 13, 10, 3.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#5fc05a';
  ctx.beginPath(); ctx.ellipse(ox + 14, oy + 12, 5, 2, 0, 0, Math.PI * 2); ctx.fill();
  PX(ctx, ox + 12, oy + 11, '#caffb0');
  PX(ctx, ox + 18, oy + 12, '#caffb0');
  PX(ctx, ox + 15, oy + 10, '#a0e888');
  R(ctx, ox + 3, oy + 16, 4, 2, '#3a3a42');
  R(ctx, ox + 25, oy + 16, 4, 2, '#3a3a42');
  // steam
  PX(ctx, ox + 13, oy + 6, 'rgba(200,230,200,0.4)');
  PX(ctx, ox + 18, oy + 5, 'rgba(200,230,200,0.3)');
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



// Town centrepiece: an ornate tiered stone fountain (HD) that sits over the pool.
export function drawFountain(ctx: Ctx, ox: number, oy: number): void {
  const st = '#9a9286', stHi = '#c4bcae', stDk = '#6a6258', stSh = '#4e463e';
  const w0 = '#1f6a9a', w1 = '#2f86b5', wHi = '#7fc8e8', wLt = '#bfe9ff', sp = '#dffaff';
  const gold = '#cfa64e';
  const ell = (cx: number, cy: number, rx: number, ry: number, col: string): void => {
    ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
  };
  // ground shadow
  ell(ox + 32, oy + 76, 27, 5, 'rgba(0,0,0,0.28)');
  // ---- lower basin (round stone bowl) ----
  ell(ox + 32, oy + 64, 26, 12, st);
  ell(ox + 32, oy + 62, 26, 10, stHi); // lit upper curve
  ell(ox + 32, oy + 66, 24, 9, st);
  R(ctx, ox + 6, oy + 64, 52, 8, st); // body
  R(ctx, ox + 6, oy + 70, 52, 4, stDk); // lower shade
  ell(ox + 32, oy + 60, 24, 8, gold); // gold rim
  ell(ox + 32, oy + 61, 22, 7, w0); // water
  ell(ox + 32, oy + 60, 20, 6, w1);
  ell(ox + 30, oy + 59, 14, 4, wHi); // sheen
  R(ctx, ox + 18, oy + 62, 12, 1, wLt); R(ctx, ox + 36, oy + 64, 12, 1, wLt); // ripples
  PX(ctx, ox + 24, oy + 60, '#ffffff'); PX(ctx, ox + 41, oy + 61, '#ffffff');
  R(ctx, ox + 6, oy + 64, 3, 8, stHi); R(ctx, ox + 55, oy + 64, 3, 8, stSh); // side light/shade
  // ---- pedestal ----
  R(ctx, ox + 24, oy + 50, 16, 6, st); R(ctx, ox + 24, oy + 50, 16, 1, stHi); // flared foot
  R(ctx, ox + 26, oy + 36, 12, 15, st);
  R(ctx, ox + 26, oy + 36, 4, 15, stHi); R(ctx, ox + 34, oy + 36, 4, 15, stDk);
  R(ctx, ox + 25, oy + 40, 14, 2, gold); // carved gold band
  R(ctx, ox + 27, oy + 45, 10, 1, stSh);
  // ---- upper basin ----
  ell(ox + 32, oy + 34, 18, 6, st);
  ell(ox + 32, oy + 33, 18, 5, gold); // gold rim
  R(ctx, ox + 16, oy + 34, 32, 4, st); // underside
  R(ctx, ox + 16, oy + 36, 32, 2, stDk);
  ell(ox + 32, oy + 33, 15, 4, w0);
  ell(ox + 32, oy + 32, 13, 3, w1);
  ell(ox + 31, oy + 32, 8, 2, wHi);
  PX(ctx, ox + 27, oy + 32, '#ffffff'); PX(ctx, ox + 37, oy + 33, wLt);
  // ---- top tier + finial ----
  R(ctx, ox + 29, oy + 22, 6, 11, st); R(ctx, ox + 29, oy + 22, 2, 11, stHi);
  ell(ox + 32, oy + 20, 8, 3, st);
  ell(ox + 32, oy + 19, 8, 2, gold);
  ell(ox + 32, oy + 19, 6, 2, w1);
  // spout bulb
  ell(ox + 32, oy + 12, 5, 5, sp);
  ell(ox + 32, oy + 12, 3, 3, wHi);
  PX(ctx, ox + 32, oy + 8, '#ffffff');
  // ---- spray arcs + cascading streams ----
  PX(ctx, ox + 26, oy + 9, wLt); PX(ctx, ox + 38, oy + 9, wLt);
  PX(ctx, ox + 23, oy + 13, sp); PX(ctx, ox + 41, oy + 13, sp);
  PX(ctx, ox + 21, oy + 18, wLt); PX(ctx, ox + 43, oy + 18, wLt);
  R(ctx, ox + 23, oy + 22, 1, 10, sp); R(ctx, ox + 40, oy + 22, 1, 10, sp); // top -> upper basin
  R(ctx, ox + 17, oy + 37, 1, 20, wLt); R(ctx, ox + 46, oy + 37, 1, 20, wLt); // upper -> lower
  // faint moss on the old stone
  PX(ctx, ox + 9, oy + 70, '#5a7a3a'); PX(ctx, ox + 54, oy + 71, '#5a7a3a');
}


// The fountain's cement foundation + raised stone pool rim. Drawn UNDER the
// ornate fountain at a low depth; its open centre is left transparent so the
// animated pool-water tiles show through, making the fountain read as standing
// in the middle of a proper rimmed pool on a paved plaza.
export function drawFountainBase(ctx: Ctx, ox: number, oy: number): void {
  const W = 200, H = 164, cx = 100, cy = 84;
  const cem = [0xb8, 0xb0, 0xa2], cemHi = [0xd8, 0xd2, 0xc6], cemDk = [0x8f, 0x88, 0x7b];
  const stn = [0x9a, 0x92, 0x86], stnHi = [0xc6, 0xbe, 0xb0], stnDk = [0x66, 0x5f, 0x55];
  const gold = [0xcf, 0xa6, 0x4e], goldHi = [0xf0, 0xd2, 0x8a];
  const aspect = 1.30;          // top-down vertical squash
  const RW = 70, RR = 85, RA = 98;  // water / rim-outer / apron-outer radii (px)
  const hx = (v: number[], f: number): string => {
    const c = (i: number): number => Math.max(0, Math.min(255, Math.round(v[i] * f)));
    return `rgb(${c(0)},${c(1)},${c(2)})`;
  };
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = x - cx, dy = (y - cy) * aspect;
      const r = Math.sqrt(dx * dx + dy * dy);
      if (r >= RA) continue;                       // beyond the pad -> transparent
      const ang = Math.atan2(dy, dx);
      const lit = 0.5 + 0.5 * Math.cos(ang + 2.2); // brightest toward upper-left
      if (r < RW) {                                // pool interior: keep water visible
        if (r > RW - 6) {                          // soft rim shadow cast on the water
          const a = ((r - (RW - 6)) / 6) * 0.4;
          ctx.fillStyle = `rgba(8,34,52,${a.toFixed(3)})`;
          ctx.fillRect(ox + x, oy + y, 1, 1);
        }
        continue;
      }
      let col: string;
      if (r < RR) {                                // ---- stone coping ----
        const t = ((ang + Math.PI) / (Math.PI * 2)) * 18;
        const seam = (t % 1) < 0.08 || (t % 1) > 0.92;
        if (r < RW + 3) {
          col = hx(seam ? gold : goldHi, 0.96);    // gold inlay ring at inner lip
        } else {
          let base = stn; let f = 0.78 + lit * 0.36;
          if (seam) f *= 0.66;                     // dark mortar between blocks
          if (dy < 0 && r > RR - 4) base = stnHi;  // lit outer lip
          col = hx(base, f);
        }
      } else {                                     // ---- cement foundation apron ----
        let base = cem; let f = 0.84 + lit * 0.24;
        if (Math.abs(r - (RR + (RA - RR) * 0.55)) < 1.2) { base = cemDk; f = 0.92; } // seam ring
        else if (r > RA - 2) f *= 0.70;            // dark outer edge
        else if (dy < 0 && r < RR + 5) base = cemHi; // lit inner lip
        col = hx(base, f);
      }
      ctx.fillStyle = col;
      ctx.fillRect(ox + x, oy + y, 1, 1);
    }
  }
}

// A thin water-ripple ring; scaled up and faded by a tween it reads as a
// spreading ripple on the pool surface.
export function drawRipple(ctx: Ctx, ox: number, oy: number): void {
  const cx = 20, cy = 20, rx = 17, ry = 12;
  for (let y = 0; y < 40; y++)
    for (let x = 0; x < 40; x++) {
      const nx = (x - cx) / rx, ny = (y - cy) / ry;
      const d = Math.abs(Math.sqrt(nx * nx + ny * ny) - 0.86);
      if (d < 0.14) {
        const a = (1 - d / 0.14) * 0.9;
        ctx.fillStyle = `rgba(207,236,255,${a.toFixed(3)})`;
        ctx.fillRect(ox + x, oy + y, 1, 1);
      }
    }
}

// ---- district decor (Upper & Lower Hearthwatch) ------------------------------

/** Horizontal wooden rail fence — tiles seamlessly side-by-side. */
export function drawFenceH(ctx: Ctx, ox: number, oy: number): void {
  const wood = '#6e4a24', hi = '#9a6c38', dk = '#3a2410';
  R(ctx, ox, oy + 14, 32, 3, wood); // upper rail
  R(ctx, ox, oy + 14, 32, 1, hi);
  R(ctx, ox, oy + 21, 32, 3, wood); // lower rail
  R(ctx, ox, oy + 21, 32, 1, hi);
  for (const px of [3, 15, 27]) {
    R(ctx, ox + px, oy + 10, 3, 18, wood);
    R(ctx, ox + px, oy + 10, 1, 18, hi);
    R(ctx, ox + px, oy + 9, 3, 2, dk); // weathered cap
    R(ctx, ox + px + 2, oy + 12, 1, 16, dk);
  }
}

/** Vertical wooden rail fence — tiles seamlessly top-to-bottom. */
export function drawFenceV(ctx: Ctx, ox: number, oy: number): void {
  const wood = '#6e4a24', hi = '#9a6c38', dk = '#3a2410';
  R(ctx, ox + 14, oy, 3, 32, wood); // single rail line running down
  R(ctx, ox + 14, oy, 1, 32, hi);
  for (const py of [2, 14, 26]) {
    R(ctx, ox + 12, oy + py, 7, 4, wood);
    R(ctx, ox + 12, oy + py, 7, 1, hi);
    R(ctx, ox + 12, oy + py + 3, 7, 1, dk);
  }
}

/** Dense trimmed box hedge — tiles side-by-side into garden walls. */
export function drawHedge(ctx: Ctx, ox: number, oy: number): void {
  const g0 = '#24481c', g1 = '#37662a', g2 = '#4d8a38', g3 = '#6ab04a';
  R(ctx, ox, oy + 12, 32, 16, g1);
  R(ctx, ox, oy + 10, 32, 4, g2); // sunlit top face
  R(ctx, ox, oy + 24, 32, 4, g0); // ground shadow row
  for (let i = 0; i < 10; i++) {
    const x = (i * 13 + 5) % 30;
    PX(ctx, ox + x, oy + 11 + ((i * 7) % 4), g3);
    PX(ctx, ox + ((i * 11 + 9) % 30), oy + 17 + ((i * 5) % 7), i % 3 ? g2 : g0);
  }
}

/** Wrought-iron lamp post with a warm glass lantern (scene adds the glow). */
export function drawLampPost(ctx: Ctx, ox: number, oy: number): void {
  const iron = '#2c2f3a', ironHi = '#565c70', glass = '#ffd98a', flame = '#fff2c0';
  R(ctx, ox + 15, oy + 8, 3, 22, iron);
  R(ctx, ox + 15, oy + 8, 1, 22, ironHi);
  R(ctx, ox + 12, oy + 28, 9, 3, iron); // base plinth
  R(ctx, ox + 12, oy + 28, 9, 1, ironHi);
  R(ctx, ox + 13, oy + 2, 7, 8, iron); // lantern housing
  R(ctx, ox + 14, oy + 3, 5, 6, glass);
  R(ctx, ox + 15, oy + 4, 3, 3, flame);
  PX(ctx, ox + 16, oy + 4, '#ffffff');
  R(ctx, ox + 14, oy, 5, 2, iron); // cap
  PX(ctx, ox + 12, oy + 5, glass); // light spill
  PX(ctx, ox + 20, oy + 6, glass);
}

/** Market stall: timber counter under a striped canvas awning. */
function stall(ctx: Ctx, ox: number, oy: number, c0: string, c1: string): void {
  const wood = '#6e4a24', woodHi = '#9a6c38', dk = '#3a2410';
  // legs
  R(ctx, ox + 4, oy + 12, 2, 16, dk);
  R(ctx, ox + 26, oy + 12, 2, 16, dk);
  // counter
  R(ctx, ox + 2, oy + 20, 28, 8, wood);
  R(ctx, ox + 2, oy + 20, 28, 2, woodHi);
  R(ctx, ox + 2, oy + 27, 28, 1, dk);
  // goods on the counter
  R(ctx, ox + 6, oy + 17, 5, 4, '#d2452f'); // apples
  PX(ctx, ox + 7, oy + 17, '#ff7a5a');
  R(ctx, ox + 14, oy + 16, 6, 5, '#c9a94e'); // bread
  PX(ctx, ox + 15, oy + 16, '#eed37a');
  R(ctx, ox + 23, oy + 17, 4, 4, '#7fb84a'); // greens
  // striped awning
  for (let i = 0; i < 8; i++) R(ctx, ox + i * 4, oy + 6, 4, 6, i % 2 ? c0 : c1);
  R(ctx, ox, oy + 4, 32, 3, c0);
  R(ctx, ox, oy + 4, 32, 1, '#ffffff');
  R(ctx, ox, oy + 11, 32, 1, dk); // awning shadow line
  for (let i = 0; i < 8; i++) PX(ctx, ox + i * 4 + 1, oy + 12, i % 2 ? c0 : c1); // scalloped hem
}
export function drawStallRed(ctx: Ctx, ox: number, oy: number): void {
  stall(ctx, ox, oy, '#b83a2e', '#efe6c8');
}
export function drawStallBlue(ctx: Ctx, ox: number, oy: number): void {
  stall(ctx, ox, oy, '#2e5a9a', '#efe6c8');
}

/** Stone well with an A-frame roof, windlass and hanging bucket. */
export function drawWell(ctx: Ctx, ox: number, oy: number): void {
  const stn = '#8a8274', stnHi = '#b6ae9e', stnDk = '#57503f';
  const wood = '#6e4a24', woodHi = '#9a6c38';
  // stone ring
  R(ctx, ox + 6, oy + 20, 20, 8, stn);
  R(ctx, ox + 6, oy + 20, 20, 2, stnHi);
  R(ctx, ox + 6, oy + 26, 20, 2, stnDk);
  for (const sx of [9, 14, 19, 24]) R(ctx, ox + sx, oy + 22, 1, 4, stnDk); // block seams
  R(ctx, ox + 9, oy + 22, 14, 2, '#0e2940'); // dark water inside
  PX(ctx, ox + 12, oy + 22, '#2f86b5');
  // posts + pitched roof
  R(ctx, ox + 7, oy + 6, 2, 15, wood);
  R(ctx, ox + 23, oy + 6, 2, 15, wood);
  R(ctx, ox + 4, oy + 4, 24, 3, '#7a3a28'); // shingle roof
  R(ctx, ox + 6, oy + 2, 20, 3, '#9a4a32');
  R(ctx, ox + 10, oy, 12, 3, '#b85a3a');
  R(ctx, ox + 4, oy + 6, 24, 1, '#3a2410');
  // windlass + rope + bucket
  R(ctx, ox + 9, oy + 9, 14, 2, woodHi);
  R(ctx, ox + 15, oy + 11, 1, 7, '#cfc9af');
  R(ctx, ox + 13, oy + 18, 5, 4, wood);
  R(ctx, ox + 13, oy + 18, 5, 1, woodHi);
}

/** Two-wheeled wooden hand cart loaded with sacks. */
export function drawCart(ctx: Ctx, ox: number, oy: number): void {
  const wood = '#6e4a24', woodHi = '#9a6c38', dk = '#3a2410';
  // bed
  R(ctx, ox + 4, oy + 14, 22, 8, wood);
  R(ctx, ox + 4, oy + 14, 22, 2, woodHi);
  R(ctx, ox + 4, oy + 21, 22, 1, dk);
  R(ctx, ox + 3, oy + 12, 2, 10, dk); // front board
  // handles
  R(ctx, ox + 26, oy + 15, 5, 2, wood);
  PX(ctx, ox + 30, oy + 15, woodHi);
  // sacks
  R(ctx, ox + 7, oy + 9, 6, 6, '#c9b083');
  R(ctx, ox + 7, oy + 9, 6, 1, '#e2cda2');
  PX(ctx, ox + 9, oy + 8, '#8a734e');
  R(ctx, ox + 15, oy + 10, 6, 5, '#b09a6e');
  PX(ctx, ox + 17, oy + 9, '#8a734e');
  // wheel
  ctx.fillStyle = dk;
  ctx.beginPath(); ctx.arc(ox + 15, oy + 24, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = wood;
  ctx.beginPath(); ctx.arc(ox + 15, oy + 24, 4, 0, Math.PI * 2); ctx.fill();
  R(ctx, ox + 14, oy + 20, 1, 8, dk); // spokes
  R(ctx, ox + 11, oy + 23, 8, 1, dk);
  PX(ctx, ox + 15, oy + 24, '#cfa64e'); // hub
}

/** Golden hay bale. */
export function drawHayBale(ctx: Ctx, ox: number, oy: number): void {
  const hay = '#c9a94e', hayHi = '#eed37a', hayDk = '#8a6e2a';
  R(ctx, ox + 5, oy + 12, 22, 14, hay);
  R(ctx, ox + 5, oy + 12, 22, 3, hayHi);
  R(ctx, ox + 5, oy + 23, 22, 3, hayDk);
  for (let i = 0; i < 8; i++) PX(ctx, ox + 6 + i * 3, oy + 15 + (i % 3) * 3, i % 2 ? hayHi : hayDk);
  R(ctx, ox + 10, oy + 12, 2, 14, '#6e4a24'); // binding cords
  R(ctx, ox + 20, oy + 12, 2, 14, '#6e4a24');
  PX(ctx, ox + 8, oy + 10, hayHi); // stray straws
  PX(ctx, ox + 24, oy + 11, hay);
}

/** Flat bed of flowers on tilled soil (floor-level decor). */
export function drawFlowerBed(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 4, oy + 8, 24, 18, '#3a2a18'); // tilled soil
  R(ctx, ox + 4, oy + 8, 24, 2, '#4e3a22');
  for (let i = 0; i < 6; i++) {
    const fx = ox + 6 + (i % 3) * 8 + (i > 2 ? 3 : 0);
    const fy = oy + 11 + Math.floor(i / 3) * 7;
    const col = ['#e0574a', '#e8c93e', '#c07be0'][i % 3];
    R(ctx, fx, fy + 3, 1, 3, '#4a8a3a'); // stem
    R(ctx, fx - 1, fy, 3, 3, col);
    PX(ctx, fx, fy + 1, '#fff2c0'); // centre
  }
}

/** Village quest board: posted parchments under a little shingle roof. */
export function drawQuestBoard(ctx: Ctx, ox: number, oy: number): void {
  const wood = '#6e4a24', woodHi = '#9a6c38', dk = '#3a2410';
  // posts
  R(ctx, ox + 4, oy + 8, 3, 22, wood);
  R(ctx, ox + 25, oy + 8, 3, 22, wood);
  R(ctx, ox + 4, oy + 8, 1, 22, woodHi);
  R(ctx, ox + 25, oy + 8, 1, 22, woodHi);
  // board
  R(ctx, ox + 2, oy + 9, 28, 14, '#5a3a1c');
  R(ctx, ox + 3, oy + 10, 26, 12, '#7a5128');
  R(ctx, ox + 2, oy + 22, 28, 1, dk);
  // little shingle roof
  R(ctx, ox + 1, oy + 6, 30, 3, '#7a3a28');
  R(ctx, ox + 3, oy + 4, 26, 3, '#9a4a32');
  R(ctx, ox + 1, oy + 8, 30, 1, dk);
  // pinned notices
  R(ctx, ox + 5, oy + 12, 6, 8, '#e8e2cc');
  R(ctx, ox + 13, oy + 11, 7, 9, '#efe6c8');
  R(ctx, ox + 22, oy + 13, 6, 7, '#e2d8b8');
  PX(ctx, ox + 7, oy + 11, '#b83a2e'); // wax pins
  PX(ctx, ox + 16, oy + 10, '#2e5a9a');
  PX(ctx, ox + 24, oy + 12, '#b83a2e');
  for (const [lx, ly, lw] of [[6, 14, 4], [6, 16, 3], [14, 13, 5], [14, 15, 4], [14, 17, 5], [23, 15, 4]] as [number, number, number][])
    R(ctx, ox + lx, oy + ly, lw, 1, '#8a734e'); // scribbled lines
}

/** Weathered stone statue of a hero on a plinth — a proud town centrepiece. */
export function drawStatue(ctx: Ctx, ox: number, oy: number): void {
  const stn = '#9a9486', stnHi = '#c8c2b2', stnDk = '#5e594c';
  // plinth
  R(ctx, ox + 8, oy + 24, 16, 6, stn);
  R(ctx, ox + 8, oy + 24, 16, 1, stnHi);
  R(ctx, ox + 8, oy + 29, 16, 1, stnDk);
  R(ctx, ox + 10, oy + 22, 12, 2, stnDk);
  // legs + torso
  R(ctx, ox + 13, oy + 16, 6, 6, stn);
  R(ctx, ox + 12, oy + 9, 8, 8, stn);
  R(ctx, ox + 12, oy + 9, 3, 8, stnHi);
  // head
  R(ctx, ox + 13, oy + 4, 5, 5, stn);
  R(ctx, ox + 13, oy + 4, 5, 1, stnHi);
  // raised sword arm
  R(ctx, ox + 19, oy + 8, 3, 2, stn);
  R(ctx, ox + 21, oy + 1, 2, 9, stnHi);
  PX(ctx, ox + 21, oy, '#ffffff');
  // shield arm
  R(ctx, ox + 10, oy + 10, 3, 6, stnDk);
  // moss + weathering
  PX(ctx, ox + 9, oy + 26, '#5a7a3a');
  PX(ctx, ox + 22, oy + 27, '#5a7a3a');
  PX(ctx, ox + 14, oy + 12, stnDk);
}

/** A stack of split firewood — round log-ends piled into a pyramid. */
export function drawWoodPile(ctx: Ctx, ox: number, oy: number): void {
  const bark = '#5a3a1c', barkHi = '#7a5128', ring = '#c9a86a', ringDk = '#8a6a3a';
  R(ctx, ox + 4, oy + 26, 24, 3, 'rgba(0,0,0,0.32)');
  const log = (lx: number, ly: number, r: number) => {
    ctx.fillStyle = bark;
    ctx.beginPath(); ctx.arc(ox + lx, oy + ly, r, 0, Math.PI * 2); ctx.fill();
    // bark crescent
    R(ctx, ox + lx - r + 1, oy + ly - 1, 2, r, barkHi);
    ctx.fillStyle = ring;
    ctx.beginPath(); ctx.arc(ox + lx, oy + ly, r * 0.55, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = ringDk;
    ctx.beginPath(); ctx.arc(ox + lx, oy + ly, r * 0.25, 0, Math.PI * 2); ctx.fill();
    PX(ctx, ox + lx - 1, oy + ly - 1, '#e0c68a');
  };
  log(9, 23, 5); log(17, 23, 5); log(25, 23, 4);
  log(13, 17, 4); log(21, 17, 5);
  log(17, 12, 4);
}

/** Tilled soil with sprouting green crop rows (flat, floor-level decor). */
export function drawCropRow(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 2, oy + 7, 28, 21, '#4a3320'); // soil
  R(ctx, ox + 2, oy + 7, 28, 2, '#5e442a');
  for (let ry = 0; ry < 3; ry++) {
    const y = oy + 10 + ry * 6;
    R(ctx, ox + 2, y + 4, 28, 2, '#382717'); // furrow shadow
    for (let cx3 = 4; cx3 < 30; cx3 += 4) { R(ctx, ox + cx3, y, 2, 4, '#4a8a3a'); PX(ctx, ox + cx3, y, '#7fc45a'); }
  }
}

/** A mossy grey shore boulder for the water's edge. */
export function drawShoreRock(ctx: Ctx, ox: number, oy: number): void {
  const r = '#7c766c', rHi = '#9c968a', rDk = '#54504a', moss = '#5a7a3a';
  ctx.fillStyle = r; ctx.beginPath(); ctx.ellipse(ox + 16, oy + 18, 10, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = rHi; ctx.beginPath(); ctx.ellipse(ox + 13, oy + 15, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
  R(ctx, ox + 7, oy + 21, 18, 2, rDk);
  PX(ctx, ox + 20, oy + 20, moss); PX(ctx, ox + 10, oy + 21, moss); R(ctx, ox + 14, oy + 22, 4, 1, moss);
}

/** A little mallard duck paddling, trailing a bright wake. */
export function drawDuck(ctx: Ctx, ox: number, oy: number): void {
  const body = '#5a4a34', bodyHi = '#7a6444', head = '#2f5a3a', headHi = '#3f7a4a', beak = '#e0a81e', wake = '#bfe9ff';
  R(ctx, ox + 8, oy + 22, 15, 1, wake); // wake
  PX(ctx, ox + 7, oy + 21, wake); PX(ctx, ox + 23, oy + 21, wake);
  ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(ox + 15, oy + 18, 7, 4, 0, 0, Math.PI * 2); ctx.fill();
  R(ctx, ox + 9, oy + 16, 4, 2, bodyHi); // wing highlight
  R(ctx, ox + 20, oy + 15, 3, 2, body); // tail
  R(ctx, ox + 19, oy + 11, 4, 5, head); // head
  R(ctx, ox + 19, oy + 11, 4, 1, headHi);
  R(ctx, ox + 22, oy + 13, 2, 1, beak); // beak
  PX(ctx, ox + 21, oy + 12, '#000000');
}

/** A wooden mooring post with an iron ring at the water's edge. */
export function drawMooringPost(ctx: Ctx, ox: number, oy: number): void {
  const wood = '#6e4a24', woodHi = '#9a6c38', dk = '#3a2410';
  R(ctx, ox + 4, oy + 26, 12, 2, 'rgba(0,0,0,0.28)'); // ground shadow
  R(ctx, ox + 13, oy + 8, 5, 20, wood);
  R(ctx, ox + 13, oy + 8, 2, 20, woodHi);
  R(ctx, ox + 17, oy + 8, 1, 20, dk);
  R(ctx, ox + 12, oy + 6, 7, 3, dk); // cap
  R(ctx, ox + 12, oy + 6, 7, 1, woodHi);
  ctx.strokeStyle = '#3a3f4a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(ox + 18, oy + 14, 3, 0, Math.PI * 2); ctx.stroke(); // iron ring
}

// ---- Gilded Tankard / Fighters Guild / Green Vial set-pieces ---------------

/** Polished flagstones for the guild hall. */
export function drawGuildFloor(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox, oy, 32, 32, '#4a4c54');
  for (let gy = 0; gy < 4; gy++) {
    for (let gx = 0; gx < 4; gx++) {
      const px = ox + gx * 8;
      const py = oy + gy * 8;
      const lit = (gx + gy) % 2 === 0;
      R(ctx, px, py, 8, 8, lit ? '#5a5c66' : '#42444c');
      R(ctx, px, py, 8, 1, '#6a6c78');
      R(ctx, px, py + 7, 8, 1, '#2e3036');
      R(ctx, px + 7, py, 1, 8, '#2e3036');
    }
  }
  // scuffed wear in the middle of the tile
  R(ctx, ox + 10, oy + 12, 12, 6, 'rgba(30,30,36,0.2)');
}

/** Practice-ring chalk mark on the guild floor (walkable). */
export function drawGuildRing(ctx: Ctx, ox: number, oy: number): void {
  drawGuildFloor(ctx, ox, oy);
  ctx.strokeStyle = '#c9b083';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(ox + 16, oy + 16, 12, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(201,176,131,0.45)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(ox + 16, oy + 16, 8, 0, Math.PI * 2);
  ctx.stroke();
}

/** Recruiting desk / muster table for the guild sergeant. */
export function drawGuildDesk(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 2, oy + 12, 28, 14, '#3a3f4a'); // slate-topped oak
  R(ctx, ox + 2, oy + 10, 28, 4, '#5a3a1c');
  R(ctx, ox + 2, oy + 10, 28, 1, '#8a6132');
  R(ctx, ox + 4, oy + 26, 4, 5, '#2e1d0e');
  R(ctx, ox + 24, oy + 26, 4, 5, '#2e1d0e');
  // parchment + quill + coin purse
  R(ctx, ox + 6, oy + 12, 10, 8, '#e8e2cc');
  R(ctx, ox + 7, oy + 13, 8, 1, '#8a734e');
  R(ctx, ox + 7, oy + 15, 6, 1, '#8a734e');
  R(ctx, ox + 18, oy + 11, 2, 8, '#5a3a1c'); // quill
  PX(ctx, ox + 18, oy + 10, '#c8ccd4');
  R(ctx, ox + 22, oy + 14, 6, 4, '#8a6a2a'); // purse
  PX(ctx, ox + 24, oy + 15, '#e0b24e');
}

/** Trophy rack of shields and helms on the guild wall. */
export function drawGuildTrophy(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 2, oy + 4, 28, 24, '#3a2410');
  R(ctx, ox + 2, oy + 4, 28, 1, '#6e4a24');
  // shields
  ctx.fillStyle = '#4a515e';
  ctx.beginPath(); ctx.ellipse(ox + 10, oy + 16, 6, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#7a2326';
  ctx.beginPath(); ctx.ellipse(ox + 10, oy + 16, 4, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#c8ccd4';
  ctx.beginPath(); ctx.ellipse(ox + 22, oy + 15, 5, 7, 0, 0, Math.PI * 2); ctx.fill();
  R(ctx, ox + 20, oy + 12, 4, 3, '#3a3f4a'); // helm
  R(ctx, ox + 21, oy + 10, 2, 2, '#4a515e');
  // crossed blades
  R(ctx, ox + 12, oy + 6, 2, 14, '#a8b0c0');
  R(ctx, ox + 18, oy + 8, 2, 12, '#a8b0c0');
}

/** Herb-green plaster wall for the apothecary. */
export function drawApothecaryWall(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox, oy, 32, 32, '#2a3a28');
  R(ctx, ox, oy, 32, 18, '#3a5a3a');
  R(ctx, ox, oy, 32, 2, '#4a7048');
  for (const [x, y] of [[4, 5], [14, 8], [24, 4], [8, 12], [20, 14]] as [number, number][])
    PX(ctx, ox + x, oy + y, '#2e4a2e');
  // timber rail mid-wall
  R(ctx, ox, oy + 16, 32, 3, '#4a3018');
  R(ctx, ox, oy + 16, 32, 1, '#6e4a24');
  // lower wainscot
  for (let i = 0; i < 32; i += 8) {
    R(ctx, ox + i, oy + 19, 1, 13, '#2a1c10');
    R(ctx, ox + i + 1, oy + 19, 6, 13, '#3a2818');
  }
  R(ctx, ox, oy + 30, 32, 2, '#1a140c');
}

/** Flagstone floor with faint herb stains for the apothecary. */
export function drawApothecaryFloor(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox, oy, 32, 32, '#3a3830');
  for (let gy = 0; gy < 4; gy++) {
    for (let gx = 0; gx < 4; gx++) {
      const px = ox + gx * 8 + (gy % 2 ? 1 : 0);
      const py = oy + gy * 8;
      R(ctx, px, py, 7, 7, (gx + gy) % 2 ? '#4a463c' : '#3e3a32');
      R(ctx, px, py, 7, 1, '#5a564c');
    }
  }
  // green/amber stain flecks
  PX(ctx, ox + 8, oy + 14, 'rgba(80,140,60,0.35)');
  PX(ctx, ox + 20, oy + 22, 'rgba(180,120,40,0.3)');
  PX(ctx, ox + 14, oy + 8, 'rgba(60,100,80,0.3)');
}

/** Bundles of drying herbs hanging from a beam. */
export function drawHerbBundle(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 4, oy + 2, 24, 3, '#5a3a1c'); // beam
  R(ctx, ox + 4, oy + 2, 24, 1, '#8a6132');
  for (const [x, c0, c1] of [
    [6, '#3a6a3a', '#5a9a4a'],
    [12, '#5a4a28', '#8a7a3a'],
    [18, '#4a3a6a', '#7a5a9a'],
    [24, '#6a3a2a', '#9a5a3a'],
  ] as [number, string, string][]) {
    R(ctx, ox + x, oy + 5, 1, 4, '#cfc9af'); // twine
    R(ctx, ox + x - 2, oy + 9, 5, 12, c0);
    R(ctx, ox + x - 1, oy + 10, 3, 8, c1);
    PX(ctx, ox + x, oy + 11, '#a0d080');
  }
}

/** Mortar and pestle on a small stand. */
export function drawMortarPestle(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 10, oy + 22, 12, 6, '#5a3a1c'); // stand
  R(ctx, ox + 10, oy + 22, 12, 1, '#8a6132');
  ctx.fillStyle = '#6a6258';
  ctx.beginPath(); ctx.ellipse(ox + 16, oy + 18, 9, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#4a443c';
  ctx.beginPath(); ctx.ellipse(ox + 16, oy + 16, 7, 4, 0, 0, Math.PI * 2); ctx.fill();
  // pestle
  R(ctx, ox + 18, oy + 8, 3, 12, '#8a8276');
  R(ctx, ox + 17, oy + 6, 5, 4, '#9a9286');
  PX(ctx, ox + 19, oy + 7, '#c8c2b2');
  // ground herbs in mortar
  R(ctx, ox + 13, oy + 15, 6, 2, '#4a8a3a');
}

/** Display case of glowing vials (apothecary counter feature). */
export function drawPotionCase(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 2, oy + 10, 28, 18, '#3a2410');
  R(ctx, ox + 2, oy + 10, 28, 2, '#6e4a24');
  R(ctx, ox + 3, oy + 12, 26, 14, '#1a2030'); // glass shadow
  // vials
  for (const [x, c] of [[6, '#d2452f'], [12, '#3a7ad0'], [18, '#4a9a3a'], [24, '#c07be0']] as [number, string][]) {
    R(ctx, ox + x, oy + 14, 4, 10, c);
    R(ctx, ox + x, oy + 14, 4, 2, 'rgba(255,255,255,0.35)');
    R(ctx, ox + x + 1, oy + 12, 2, 2, '#cfc9af'); // cork
  }
  R(ctx, ox + 2, oy + 26, 28, 2, '#2e1d0e');
}

/** Small raised stage for the tavern bard. */
export function drawTavernStage(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox, oy + 10, 32, 20, '#4a3018');
  R(ctx, ox, oy + 10, 32, 2, '#8a6132');
  for (let i = 0; i < 32; i += 8) R(ctx, ox + i, oy + 12, 1, 16, '#3a2410');
  R(ctx, ox, oy + 28, 32, 2, '#2e1d0e');
  // footlights
  R(ctx, ox + 4, oy + 26, 4, 2, '#ffb02a');
  R(ctx, ox + 14, oy + 26, 4, 2, '#ffb02a');
  R(ctx, ox + 24, oy + 26, 4, 2, '#ffb02a');
}

/** Stack of ale kegs for the tankard cellar corner. */
export function drawAleKegs(ctx: Ctx, ox: number, oy: number): void {
  const keg = (x: number, y: number, w: number, h: number) => {
    R(ctx, ox + x, oy + y, w, h, '#5a3a1c');
    R(ctx, ox + x + 1, oy + y, 2, h, '#8a6132');
    R(ctx, ox + x, oy + y + 2, w, 2, '#2e1d0e');
    R(ctx, ox + x, oy + y + h - 4, w, 2, '#2e1d0e');
    PX(ctx, ox + x + w - 3, oy + y + (h >> 1), '#3a3f4a'); // bung
  };
  keg(4, 16, 12, 14);
  keg(16, 14, 12, 16);
  keg(10, 6, 12, 12);
}

/** Grand bar back with bottles for the tankard. */
export function drawBarBack(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox, oy, 32, 32, '#3a2410');
  R(ctx, ox, oy, 32, 2, '#6e4a24');
  // mirror
  R(ctx, ox + 4, oy + 4, 24, 12, '#2a3848');
  R(ctx, ox + 5, oy + 5, 10, 5, 'rgba(180,210,230,0.25)');
  // bottle rows
  for (let i = 0; i < 5; i++) {
    const c = ['#7a2326', '#3a6a3a', '#c9a86a', '#34507a', '#5a3a7a'][i];
    R(ctx, ox + 5 + i * 5, oy + 18, 3, 8, c);
    R(ctx, ox + 5 + i * 5, oy + 18, 3, 1, 'rgba(255,255,255,0.3)');
  }
  R(ctx, ox + 2, oy + 28, 28, 2, '#5a3a1c');
}

// ---- Hero's Lodge (home base) ----------------------------------------------

/** Soft plaster + timber walls for the lodge. */
export function drawLodgeWall(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox, oy, 32, 32, '#3a2e22');
  R(ctx, ox, oy, 32, 16, '#c4a878');
  R(ctx, ox, oy, 32, 2, '#d8c49a');
  for (const [x, y] of [[5, 4], [16, 7], [25, 3], [10, 11]] as [number, number][])
    PX(ctx, ox + x, oy + y, '#b09060');
  R(ctx, ox, oy + 14, 32, 3, '#5a3a1c');
  R(ctx, ox, oy + 14, 32, 1, '#8a6132');
  for (let i = 0; i < 32; i += 8) {
    R(ctx, ox + i, oy + 17, 1, 15, '#2a1c10');
    R(ctx, ox + i + 1, oy + 17, 6, 15, '#4a3018');
  }
  R(ctx, ox, oy + 30, 32, 2, '#1a120c');
}

/** Warm plank floor for the lodge. */
export function drawLodgeFloor(ctx: Ctx, ox: number, oy: number): void {
  drawWoodFloor(ctx, ox, oy);
  // slightly richer polish
  R(ctx, ox, oy, 32, 1, 'rgba(200,160,80,0.08)');
}

/** Simple bed with quilt and pillow. */
export function drawLodgeBed(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 2, oy + 10, 28, 18, '#5a3a1c'); // frame
  R(ctx, ox + 2, oy + 10, 28, 2, '#8a6132');
  R(ctx, ox + 4, oy + 12, 24, 14, '#3a5a7a'); // quilt field
  for (let i = 0; i < 4; i++) R(ctx, ox + 4 + i * 6, oy + 12, 1, 14, '#2a4a6a');
  R(ctx, ox + 4, oy + 18, 24, 2, '#c07be0'); // stripe
  R(ctx, ox + 4, oy + 12, 8, 6, '#e8e2cc'); // pillow
  R(ctx, ox + 4, oy + 12, 8, 1, '#ffffff');
  R(ctx, ox + 2, oy + 26, 4, 4, '#3a2410'); // leg
  R(ctx, ox + 26, oy + 26, 4, 4, '#3a2410');
}

/** Wardrobe / armoire for the dressing corner. */
export function drawLodgeWardrobe(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 4, oy + 2, 24, 28, '#5a3a1c');
  R(ctx, ox + 4, oy + 2, 24, 2, '#8a6132');
  R(ctx, ox + 5, oy + 5, 10, 22, '#6e4a24'); // left door
  R(ctx, ox + 17, oy + 5, 10, 22, '#6e4a24'); // right door
  R(ctx, ox + 5, oy + 5, 10, 1, '#9a6c38');
  R(ctx, ox + 17, oy + 5, 10, 1, '#9a6c38');
  PX(ctx, ox + 13, oy + 16, '#cfa64e'); // handles
  PX(ctx, ox + 18, oy + 16, '#cfa64e');
  R(ctx, ox + 4, oy + 28, 24, 2, '#3a2410');
}

/** Dining / strategy table with map. */
export function drawLodgeTable(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 3, oy + 12, 26, 14, '#5a3a1c');
  R(ctx, ox + 3, oy + 12, 26, 2, '#8a6132');
  R(ctx, ox + 5, oy + 26, 3, 5, '#3a2410');
  R(ctx, ox + 24, oy + 26, 3, 5, '#3a2410');
  // map parchment
  R(ctx, ox + 7, oy + 14, 18, 10, '#e8e2cc');
  R(ctx, ox + 8, oy + 15, 6, 1, '#5a7a3a'); // coast line
  R(ctx, ox + 12, oy + 17, 8, 1, '#3a5a7a');
  PX(ctx, ox + 16, oy + 19, '#b83a2e'); // X marks
  PX(ctx, ox + 20, oy + 16, '#b83a2e');
  R(ctx, ox + 22, oy + 14, 3, 4, '#c9a86a'); // mug
}

/** Trophy plinth base (statue stands on top in-scene). */
export function drawTrophyPlinth(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 6, oy + 18, 20, 10, '#6a6258');
  R(ctx, ox + 6, oy + 18, 20, 2, '#9a9286');
  R(ctx, ox + 6, oy + 26, 20, 2, '#4a443c');
  R(ctx, ox + 8, oy + 14, 16, 5, '#5a544c');
  R(ctx, ox + 8, oy + 14, 16, 1, '#8a8276');
  // brass plaque
  R(ctx, ox + 10, oy + 20, 12, 4, '#8a6a2a');
  R(ctx, ox + 11, oy + 21, 10, 1, '#c9a84e');
}

/** Soft armchair by the fire. */
export function drawLodgeChair(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 8, oy + 10, 16, 14, '#6a2a2e'); // seat back
  R(ctx, ox + 8, oy + 10, 16, 2, '#8a3a40');
  R(ctx, ox + 6, oy + 18, 20, 8, '#5a2226'); // seat
  R(ctx, ox + 6, oy + 18, 20, 2, '#7a3238');
  R(ctx, ox + 7, oy + 26, 3, 5, '#3a2410');
  R(ctx, ox + 22, oy + 26, 3, 5, '#3a2410');
  R(ctx, ox + 6, oy + 14, 3, 8, '#6a2a2e'); // arms
  R(ctx, ox + 23, oy + 14, 3, 8, '#6a2a2e');
}
