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
  // An opaque, shingled pitched roof that fills the cell so a single row reads
  // as a real roof rather than a thin band.
  R(ctx, ox, oy + 3, 32, 23, base); // roof slab
  R(ctx, ox, oy + 3, 32, 3, hi); // sunlit ridge cap
  R(ctx, ox, oy + 6, 32, 1, dk);
  for (const ry of [10, 15, 20]) {
    R(ctx, ox, oy + ry, 32, 1, dk); // shingle course shadow
    R(ctx, ox, oy + ry + 1, 32, 1, hi); // course highlight
    for (let sx = (ry % 8); sx < 32; sx += 8) R(ctx, ox + sx, oy + ry - 2, 1, 2, dk); // seams
  }
  R(ctx, ox, oy + 24, 32, 2, dk); // eave
  R(ctx, ox, oy + 26, 32, 2, '#241a0e'); // under-eave shadow
  R(ctx, ox, oy + 3, 2, 23, hi); // left gable (lit)
  R(ctx, ox + 30, oy + 3, 2, 23, dk); // right gable (shade)
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

// ---- building facades (seamless plaster + timber framing only where needed) -
export function drawHouseWall(ctx: Ctx, ox: number, oy: number): void {
  // Plain plaster that tiles seamlessly (no edge bands) — framing/footing are
  // applied as separate edge/base tiles by the town builder.
  R(ctx, ox, oy, 32, 32, '#cdbb95');
  for (const [x, y, c] of [
    [6, 5, '#c2af86'], [14, 11, '#d8c79e'], [23, 7, '#c2af86'], [10, 20, '#d8c79e'],
    [19, 25, '#c2af86'], [27, 17, '#d8c79e'], [4, 28, '#c2af86'], [29, 3, '#c2af86'],
  ] as [number, number, string][]) PX(ctx, ox + x, oy + y, c);
}
export function drawHousePost(ctx: Ctx, ox: number, oy: number): void {
  drawHouseWall(ctx, ox, oy);
  R(ctx, ox + 12, oy, 9, 32, '#6e4a24'); // vertical timber post
  R(ctx, ox + 12, oy, 2, 32, '#8a6132');
  R(ctx, ox + 19, oy, 2, 32, '#42301a');
  PX(ctx, ox + 16, oy + 7, '#3a2410');
  PX(ctx, ox + 16, oy + 24, '#3a2410');
}
export function drawHouseBeam(ctx: Ctx, ox: number, oy: number): void {
  drawHouseWall(ctx, ox, oy);
  R(ctx, ox, oy + 1, 32, 6, '#6e4a24'); // horizontal header beam under the eaves
  R(ctx, ox, oy + 1, 32, 1, '#8a6132');
  R(ctx, ox, oy + 6, 32, 1, '#42301a');
}
export function drawHouseBase(ctx: Ctx, ox: number, oy: number): void {
  drawHouseWall(ctx, ox, oy);
  R(ctx, ox, oy + 18, 32, 14, '#8a8276'); // stone ground-floor foundation
  R(ctx, ox, oy + 18, 32, 1, '#a8a092');
  for (let i = 0; i < 32; i += 8) R(ctx, ox + i, oy + 18, 1, 14, '#5f584e');
  R(ctx, ox, oy + 25, 32, 1, '#5f584e');
  R(ctx, ox + 4, oy + 21, 5, 3, '#7a7268');
  R(ctx, ox + 20, oy + 27, 6, 3, '#7a7268');
}
export function drawHouseWindow(ctx: Ctx, ox: number, oy: number): void {
  drawHouseWall(ctx, ox, oy);
  const fr = '#42301a', glass = '#34506e', glassHi = '#4a6e96', glow = '#ffcf7a';
  R(ctx, ox + 6, oy + 6, 20, 16, fr); // frame
  R(ctx, ox + 8, oy + 8, 16, 12, glass);
  R(ctx, ox + 8, oy + 14, 16, 6, glow); // warm interior light
  R(ctx, ox + 8, oy + 8, 7, 6, glassHi);
  R(ctx, ox + 15, oy + 8, 2, 12, fr);
  R(ctx, ox + 8, oy + 13, 16, 1, fr);
  R(ctx, ox + 5, oy + 21, 22, 2, '#7a5128'); // sill
  R(ctx, ox + 5, oy + 21, 22, 1, '#9a7a4a');
  PX(ctx, ox + 10, oy + 10, '#cfe0ff');
}

// ---- tavern / interior furniture (32x32 decor) -----------------------------
export function drawWoodFloor(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox, oy, 32, 32, '#6e4a28');
  for (let i = 0; i < 32; i += 8) {
    R(ctx, ox, oy + i, 32, 1, '#4a3018'); // plank seam
    R(ctx, ox, oy + i + 1, 32, 1, '#82592c'); // plank highlight
  }
  R(ctx, ox + 15, oy, 1, 32, '#3a2410'); // a vertical butt-joint
  PX(ctx, ox + 6, oy + 4, '#5a3c20'); PX(ctx, ox + 22, oy + 12, '#5a3c20');
}
export function drawTavernWall(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox, oy, 32, 32, '#5a4632'); // dark timber wainscot
  R(ctx, ox, oy, 32, 14, '#caa882'); // upper plaster
  R(ctx, ox, oy + 13, 32, 2, '#3a2a18'); // chair rail
  for (let i = 0; i < 32; i += 8) R(ctx, ox + i, oy + 15, 1, 17, '#3a2a18'); // panel seams
  R(ctx, ox, oy, 32, 2, '#d8c0a0');
}
export function drawTavernBar(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox, oy + 5, 32, 19, '#5a3a1c'); // counter front
  R(ctx, ox, oy + 4, 32, 4, '#8a6132'); // bartop
  R(ctx, ox, oy + 4, 32, 1, '#b08a52');
  R(ctx, ox, oy + 8, 32, 1, '#2e1d0e');
  for (let x = 0; x < 32; x += 8) R(ctx, ox + x, oy + 10, 1, 14, '#3a2410'); // panel seams
  R(ctx, ox, oy + 24, 32, 3, '#2e1d0e'); // kick shadow
  R(ctx, ox + 5, oy + 1, 3, 4, '#caa56a'); R(ctx, ox + 21, oy + 1, 3, 4, '#caa56a'); // tankards
}
export function drawTavernTable(ctx: Ctx, ox: number, oy: number): void {
  ctx.fillStyle = '#3a2410'; ctx.beginPath(); ctx.ellipse(ox + 16, oy + 18, 12, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#6e4a24'; ctx.beginPath(); ctx.ellipse(ox + 16, oy + 16, 12, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#8a6132'; ctx.beginPath(); ctx.ellipse(ox + 14, oy + 14, 8, 5, 0, 0, Math.PI * 2); ctx.fill();
  R(ctx, ox + 11, oy + 13, 3, 3, '#caa56a'); // mug
  ctx.fillStyle = '#cdbfa0'; ctx.beginPath(); ctx.ellipse(ox + 19, oy + 17, 3, 2, 0, 0, Math.PI * 2); ctx.fill(); // plate
}
export function drawTavernStool(ctx: Ctx, ox: number, oy: number): void {
  ctx.fillStyle = '#3a2410'; ctx.beginPath(); ctx.ellipse(ox + 16, oy + 17, 6, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#6e4a24'; ctx.beginPath(); ctx.ellipse(ox + 16, oy + 15, 6, 4, 0, 0, Math.PI * 2); ctx.fill();
  R(ctx, ox + 12, oy + 17, 1, 6, '#3a2410'); R(ctx, ox + 19, oy + 17, 1, 6, '#3a2410');
}
export function drawHearth(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 1, oy + 3, 30, 27, '#7a7268'); // stone surround
  R(ctx, ox + 1, oy + 3, 30, 2, '#9a9286');
  R(ctx, ox, oy + 1, 32, 4, '#5f584e'); // mantel
  R(ctx, ox + 7, oy + 12, 18, 18, '#150f0a'); // firebox
  R(ctx, ox + 10, oy + 20, 12, 10, '#d2541c'); // fire
  R(ctx, ox + 13, oy + 22, 6, 8, '#ffb02a');
  PX(ctx, ox + 16, oy + 18, '#fff2b0');
  for (let i = 4; i < 30; i += 8) R(ctx, ox + i, oy + 5, 1, 7, '#5f584e'); // stone seams
}
export function drawBarrel(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 9, oy + 4, 14, 24, '#6e4a24'); // body
  R(ctx, ox + 8, oy + 8, 16, 16, '#6e4a24'); // bulge
  R(ctx, ox + 11, oy + 4, 3, 24, '#8a6132'); // stave highlight
  R(ctx, ox + 8, oy + 9, 16, 2, '#2e1d0e'); R(ctx, ox + 8, oy + 16, 16, 2, '#2e1d0e'); R(ctx, ox + 8, oy + 23, 16, 2, '#2e1d0e'); // hoops
  ctx.fillStyle = '#5a3a1c'; ctx.beginPath(); ctx.ellipse(ox + 16, oy + 5, 7, 2, 0, 0, Math.PI * 2); ctx.fill(); // top
}
export function drawRug(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 1, oy + 6, 30, 20, '#7a2326'); // field
  R(ctx, ox + 1, oy + 6, 30, 2, '#cfa64e'); R(ctx, ox + 1, oy + 24, 30, 2, '#cfa64e'); // gold borders
  R(ctx, ox + 4, oy + 9, 24, 14, '#9a343a');
  ctx.fillStyle = '#cfa64e'; ctx.beginPath(); ctx.moveTo(ox + 16, oy + 10); ctx.lineTo(ox + 24, oy + 16); ctx.lineTo(ox + 16, oy + 22); ctx.lineTo(ox + 8, oy + 16); ctx.closePath(); ctx.fill(); // medallion
  R(ctx, ox + 14, oy + 14, 4, 4, '#7a2326');
}
export function drawShelf(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 1, oy + 6, 30, 3, '#5a3a1c'); R(ctx, ox + 1, oy + 18, 30, 3, '#5a3a1c'); // two boards
  const bot = ['#3a6a3a', '#7a2326', '#34507a', '#caa882', '#5a3a7a'];
  for (let i = 0; i < 5; i++) { R(ctx, ox + 3 + i * 6, oy + 2, 3, 4, bot[i]); R(ctx, ox + 3 + i * 6, oy + 13, 3, 5, bot[(i + 2) % 5]); }
}

// ---- Fighters Guild interior props -----------------------------------------
export function drawGuildWall(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox, oy, 32, 32, '#6a6c78'); // ashlar stone
  R(ctx, ox, oy, 32, 2, '#888a96');
  for (const ry of [0, 8, 16, 24]) R(ctx, ox, oy + ry, 32, 1, '#4a4c58'); // courses
  for (let ry = 0; ry < 32; ry += 8) {
    const off = (ry / 8) % 2 ? 8 : 0;
    for (let sx = off; sx < 32; sx += 16) R(ctx, ox + sx, oy + ry, 1, 8, '#4a4c58'); // staggered seams
  }
  R(ctx, ox, oy + 14, 32, 2, '#5a3a1c'); // timber rail
  R(ctx, ox, oy + 14, 32, 1, '#6e4a24');
  PX(ctx, ox + 7, oy + 5, '#7a7c88'); PX(ctx, ox + 22, oy + 19, '#7a7c88');
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
  R(ctx, ox + 10, oy + 22, 12, 8, '#3a2410'); // wood stump
  R(ctx, ox + 10, oy + 22, 12, 1, '#5a3a1c');
  R(ctx, ox + 9, oy + 16, 14, 5, '#3a3f4a'); // body
  R(ctx, ox + 7, oy + 13, 20, 4, '#4a515e'); // top face
  R(ctx, ox + 7, oy + 13, 20, 1, '#6a727e');
  R(ctx, ox + 4, oy + 13, 5, 2, '#4a515e'); // horn
  R(ctx, ox + 12, oy + 21, 8, 1, '#2a2e36');
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
