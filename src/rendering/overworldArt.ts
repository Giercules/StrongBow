import type { Ctx } from './spriteArt';

// ----------------------------------------------------------------------------
// overworldArt — procedural pixel art for the surface overworld: biome ground
// tiles (baked into the level background), biome decor/props, and wandering
// critters. Self-contained (own helpers) so it can grow without touching the
// core spriteArt or townArt modules. Dark-fantasy, muted, hard-edged.
// ----------------------------------------------------------------------------

function R(ctx: Ctx, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}
function PX(ctx: Ctx, x: number, y: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 1, 1);
}
/** Tiny deterministic RNG so a (seed) gives stable speckle each bake. */
function rng(seed: number): () => number {
  let s = (seed * 2654435761) >>> 0;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

// ---- biome ground tiles (16x16, opaque, drawn onto the level bake) ----------

export function drawGrassGround(ctx: Ctx, ox: number, oy: number, seed = 0): void {
  R(ctx, ox, oy, 16, 16, '#3a5a2c');
  const r = rng(seed + 11);
  const shades = ['#456a32', '#33502a', '#4f7838', '#2e4a26'];
  for (let i = 0; i < 22; i++) {
    const x = Math.floor(r() * 16), y = Math.floor(r() * 16);
    PX(ctx, ox + x, oy + y, shades[Math.floor(r() * shades.length)]);
  }
  // a couple of blade tufts
  for (let i = 0; i < 3; i++) {
    const x = ox + 2 + Math.floor(r() * 12), y = oy + 6 + Math.floor(r() * 8);
    R(ctx, x, y - 2, 1, 2, '#5f9a44');
  }
}

export function drawSandGround(ctx: Ctx, ox: number, oy: number, seed = 0): void {
  R(ctx, ox, oy, 16, 16, '#c9aa6a');
  const r = rng(seed + 23);
  const shades = ['#d8bd80', '#bb9858', '#cdb070', '#a8854c'];
  for (let i = 0; i < 18; i++) {
    const x = Math.floor(r() * 16), y = Math.floor(r() * 16);
    PX(ctx, ox + x, oy + y, shades[Math.floor(r() * shades.length)]);
  }
  // wind ripples
  for (let y = 3; y < 16; y += 5) {
    const off = Math.floor(r() * 4);
    R(ctx, ox + off, oy + y, 10, 1, '#b59556');
  }
}

export function drawMudGround(ctx: Ctx, ox: number, oy: number, seed = 0): void {
  R(ctx, ox, oy, 16, 16, '#3f3a2a');
  const r = rng(seed + 31);
  const shades = ['#4a4430', '#332f22', '#514a33', '#2a2719'];
  for (let i = 0; i < 20; i++) {
    const x = Math.floor(r() * 16), y = Math.floor(r() * 16);
    PX(ctx, ox + x, oy + y, shades[Math.floor(r() * shades.length)]);
  }
  // scummy puddles with a sickly tint
  for (let i = 0; i < 2; i++) {
    const x = ox + 2 + Math.floor(r() * 9), y = oy + 2 + Math.floor(r() * 9);
    R(ctx, x, y, 4, 2, '#3b4a36');
    PX(ctx, x + 1, y, '#54684a');
  }
}

export function drawRockGround(ctx: Ctx, ox: number, oy: number, seed = 0): void {
  R(ctx, ox, oy, 16, 16, '#5b5852');
  const r = rng(seed + 47);
  const shades = ['#6a665e', '#4c4943', '#736f66', '#403d38'];
  for (let i = 0; i < 22; i++) {
    const x = Math.floor(r() * 16), y = Math.floor(r() * 16);
    PX(ctx, ox + x, oy + y, shades[Math.floor(r() * shades.length)]);
  }
  // a few cracks / gravel chips
  for (let i = 0; i < 3; i++) {
    const x = ox + Math.floor(r() * 14), y = oy + Math.floor(r() * 14);
    R(ctx, x, y, 2, 1, '#383530');
  }
}

// ---- biome decor / props (transparent bg) -----------------------------------

export function drawPine(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 14, oy + 22, 4, 9, '#3a2a1a');
  R(ctx, ox + 15, oy + 22, 2, 9, '#4a3622');
  // dark conifer tiers
  const g0 = '#243f22', g1 = '#2f5230', g2 = '#1c3019';
  for (let i = 0; i < 4; i++) {
    const w = 20 - i * 3;
    const y = oy + 4 + i * 5;
    ctx.fillStyle = i % 2 === 0 ? g0 : g1;
    ctx.beginPath();
    ctx.moveTo(ox + 16, y);
    ctx.lineTo(ox + 16 - w / 2, y + 7);
    ctx.lineTo(ox + 16 + w / 2, y + 7);
    ctx.closePath();
    ctx.fill();
  }
  PX(ctx, ox + 16, oy + 3, '#3f6a38');
  R(ctx, ox + 10, oy + 25, 12, 2, g2);
}

export function drawGnarledOak(ctx: Ctx, ox: number, oy: number): void {
  // twisted dark trunk
  R(ctx, ox + 13, oy + 16, 5, 15, '#3b2a1b');
  R(ctx, ox + 14, oy + 16, 2, 15, '#4d3826');
  R(ctx, ox + 9, oy + 18, 5, 3, '#3b2a1b');
  R(ctx, ox + 18, oy + 20, 5, 3, '#3b2a1b');
  // sparse ominous canopy
  const c0 = '#2c4a26', c1 = '#3a6230', c2 = '#22381e';
  R(ctx, ox + 5, oy + 6, 22, 12, c0);
  R(ctx, ox + 7, oy + 4, 18, 12, c1);
  R(ctx, ox + 9, oy + 3, 8, 5, '#46743a');
  R(ctx, ox + 4, oy + 9, 5, 7, c2);
  R(ctx, ox + 23, oy + 8, 5, 8, c2);
  PX(ctx, ox + 11, oy + 6, '#5a8c46');
  PX(ctx, ox + 20, oy + 9, '#5a8c46');
}

export function drawSwampCypress(ctx: Ctx, ox: number, oy: number): void {
  // pale dead trunk with knees
  R(ctx, ox + 14, oy + 10, 4, 21, '#5a5240');
  R(ctx, ox + 15, oy + 10, 1, 21, '#6e6650');
  R(ctx, ox + 11, oy + 28, 2, 3, '#4a4334');
  R(ctx, ox + 19, oy + 28, 2, 3, '#4a4334');
  // murky canopy + hanging moss
  R(ctx, ox + 7, oy + 4, 18, 9, '#3d4a30');
  R(ctx, ox + 9, oy + 2, 14, 8, '#4a5a38');
  for (let i = 0; i < 5; i++) {
    const x = ox + 8 + i * 4;
    R(ctx, x, oy + 11, 1, 5 + (i % 3) * 2, '#6f7a52');
  }
}

export function drawDesertTree(ctx: Ctx, ox: number, oy: number): void {
  // sparse wind-swept acacia
  R(ctx, ox + 14, oy + 14, 4, 17, '#6a5236');
  R(ctx, ox + 15, oy + 14, 1, 17, '#806a48');
  R(ctx, ox + 10, oy + 15, 5, 2, '#6a5236');
  R(ctx, ox + 17, oy + 13, 6, 2, '#6a5236');
  // flat-topped dusty canopy
  R(ctx, ox + 6, oy + 8, 20, 5, '#5f6a3a');
  R(ctx, ox + 8, oy + 6, 16, 4, '#6f7a44');
  PX(ctx, ox + 12, oy + 7, '#869154');
  PX(ctx, ox + 19, oy + 8, '#869154');
}

export function drawBoulder(ctx: Ctx, ox: number, oy: number): void {
  const a = '#6b675e', b = '#54504a', c = '#7d7970', d = '#403d38';
  R(ctx, ox + 6, oy + 14, 20, 13, b);
  R(ctx, ox + 8, oy + 11, 16, 6, a);
  R(ctx, ox + 11, oy + 9, 10, 4, c);
  R(ctx, ox + 6, oy + 24, 20, 3, d);
  PX(ctx, ox + 12, oy + 12, c);
  R(ctx, ox + 16, oy + 16, 6, 1, d);
  // mossy patch
  R(ctx, ox + 8, oy + 22, 5, 2, '#3f5a2e');
}

export function drawReeds(ctx: Ctx, ox: number, oy: number): void {
  const g0 = '#5a6a36', g1 = '#46532a', g2 = '#7a8a4a';
  for (const [x, h] of [[8, 16], [12, 20], [16, 14], [20, 18], [24, 12]] as [number, number][]) {
    R(ctx, ox + x, oy + 30 - h, 2, h, g0);
    R(ctx, ox + x, oy + 30 - h, 1, h, g1);
    R(ctx, ox + x, oy + 30 - h, 1, 3, g2); // seed head
  }
  R(ctx, ox + 6, oy + 28, 22, 2, '#3a4626');
}

export function drawWildflowers(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 6, oy + 12, 4, 4, '#436a32');
  R(ctx, ox + 14, oy + 14, 4, 3, '#436a32');
  R(ctx, ox + 20, oy + 11, 4, 4, '#436a32');
  PX(ctx, ox + 7, oy + 11, '#e6d24a'); PX(ctx, ox + 8, oy + 11, '#e6d24a');
  PX(ctx, ox + 15, oy + 13, '#d57ad0');
  PX(ctx, ox + 21, oy + 10, '#9ac2ff'); PX(ctx, ox + 22, oy + 10, '#9ac2ff');
}

export function drawObelisk(ctx: Ctx, ox: number, oy: number): void {
  // tall weathered monolith with faint corrupted runes (drawn in 32x48)
  R(ctx, ox + 11, oy + 4, 10, 40, '#2b2730');
  R(ctx, ox + 12, oy + 4, 8, 40, '#3a3543');
  R(ctx, ox + 13, oy + 4, 2, 40, '#4a4456');
  ctx.fillStyle = '#1e1b24';
  ctx.beginPath();
  ctx.moveTo(ox + 11, oy + 4); ctx.lineTo(ox + 16, oy); ctx.lineTo(ox + 21, oy + 4); ctx.closePath(); ctx.fill();
  // glowing purple cracks
  PX(ctx, ox + 15, oy + 12, '#a85cff'); PX(ctx, ox + 15, oy + 13, '#a85cff');
  PX(ctx, ox + 16, oy + 20, '#bb78ff'); PX(ctx, ox + 14, oy + 28, '#a85cff');
  R(ctx, ox + 8, oy + 44, 16, 4, '#2a2620'); // sandy base
}

export function drawRuinPillar(ctx: Ctx, ox: number, oy: number): void {
  const a = '#9a8f76', b = '#7d735c', c = '#b6ab90';
  R(ctx, ox + 10, oy + 6, 12, 22, b);
  R(ctx, ox + 11, oy + 6, 9, 22, a);
  R(ctx, ox + 12, oy + 6, 2, 22, c);
  // fluting + broken top
  for (let x = ox + 12; x < ox + 21; x += 3) R(ctx, x, oy + 8, 1, 18, '#6b6250');
  ctx.fillStyle = '#6b6250';
  ctx.beginPath();
  ctx.moveTo(ox + 10, oy + 6); ctx.lineTo(ox + 14, oy + 2); ctx.lineTo(ox + 22, oy + 6); ctx.closePath(); ctx.fill();
  R(ctx, ox + 7, oy + 27, 18, 4, '#6b6250'); // base
  R(ctx, ox + 5, oy + 29, 22, 2, '#564e3f');
}

export function drawStandingStone(ctx: Ctx, ox: number, oy: number): void {
  const a = '#6f6a60', b = '#565149', c = '#827c70';
  R(ctx, ox + 9, oy + 8, 13, 22, b);
  R(ctx, ox + 10, oy + 7, 10, 23, a);
  R(ctx, ox + 12, oy + 6, 5, 24, c);
  R(ctx, ox + 6, oy + 28, 20, 3, '#403c34');
  // faint carved rune
  PX(ctx, ox + 14, oy + 15, '#8fa0c0'); PX(ctx, ox + 15, oy + 16, '#8fa0c0'); PX(ctx, ox + 14, oy + 17, '#8fa0c0');
}

export function drawSignpost(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 14, oy + 8, 3, 22, '#5a4730');
  R(ctx, ox + 15, oy + 8, 1, 22, '#6e5840');
  R(ctx, ox + 4, oy + 10, 14, 5, '#7a6242');
  R(ctx, ox + 4, oy + 10, 14, 1, '#92774f');
  R(ctx, ox + 16, oy + 17, 12, 5, '#7a6242');
  R(ctx, ox + 16, oy + 17, 12, 1, '#92774f');
  // faux carved text
  R(ctx, ox + 6, oy + 12, 9, 1, '#4a3a26');
  R(ctx, ox + 18, oy + 19, 8, 1, '#4a3a26');
}

export function drawCaveEntrance(ctx: Ctx, ox: number, oy: number): void {
  const rock = '#4f4a43', rockHi = '#65605700', rockLo = '#383531';
  R(ctx, ox + 3, oy + 8, 26, 22, rock);
  R(ctx, ox + 3, oy + 28, 26, 3, rockLo);
  R(ctx, ox + 6, oy + 8, 20, 2, '#6a655c');
  void rockHi;
  // dark mouth
  ctx.fillStyle = '#0a0a0c';
  ctx.beginPath();
  ctx.moveTo(ox + 9, oy + 30); ctx.lineTo(ox + 11, oy + 16); ctx.lineTo(ox + 16, oy + 12);
  ctx.lineTo(ox + 21, oy + 16); ctx.lineTo(ox + 23, oy + 30); ctx.closePath(); ctx.fill();
  PX(ctx, ox + 16, oy + 26, '#1c1c22');
  // loose stones
  R(ctx, ox + 5, oy + 29, 3, 2, '#5a554c');
  R(ctx, ox + 24, oy + 28, 3, 3, '#5a554c');
}

// ---- critters (transparent bg, face right; wander code flips X) --------------

export function drawDeer(ctx: Ctx, ox: number, oy: number): void {
  const body = '#8a6440', dark = '#6e4e30', light = '#a07a4e';
  R(ctx, ox + 4, oy + 8, 10, 5, body);
  R(ctx, ox + 4, oy + 8, 10, 1, light);
  R(ctx, ox + 12, oy + 5, 4, 4, body); // neck/head
  R(ctx, ox + 15, oy + 4, 3, 2, body); // muzzle
  // antlers
  PX(ctx, ox + 13, oy + 2, dark); PX(ctx, ox + 14, oy + 1, dark); PX(ctx, ox + 15, oy + 2, dark);
  // legs
  R(ctx, ox + 5, oy + 13, 1, 3, dark); R(ctx, ox + 8, oy + 13, 1, 3, dark);
  R(ctx, ox + 11, oy + 13, 1, 3, dark); R(ctx, ox + 13, oy + 13, 1, 3, dark);
  PX(ctx, ox + 7, oy + 9, light); PX(ctx, ox + 9, oy + 10, light); // dappled
}

export function drawRabbit(ctx: Ctx, ox: number, oy: number): void {
  const fur = '#9a8f7e', dark = '#7a7062', hi = '#b6ac9a';
  R(ctx, ox + 5, oy + 9, 6, 4, fur);
  R(ctx, ox + 5, oy + 9, 6, 1, hi);
  R(ctx, ox + 10, oy + 7, 3, 3, fur); // head
  R(ctx, ox + 9, oy + 4, 1, 4, dark); R(ctx, ox + 11, oy + 4, 1, 4, dark); // ears
  PX(ctx, ox + 4, oy + 10, hi); // tail
  R(ctx, ox + 6, oy + 12, 1, 2, dark); R(ctx, ox + 9, oy + 12, 1, 2, dark);
  PX(ctx, ox + 12, oy + 8, '#1a1a1a'); // eye
}

export function drawFox(ctx: Ctx, ox: number, oy: number): void {
  const fur = '#b5662e', dark = '#8a4a1e', white = '#e6ddd0';
  R(ctx, ox + 3, oy + 8, 9, 4, fur);
  R(ctx, ox + 11, oy + 6, 3, 3, fur); // head
  PX(ctx, ox + 11, oy + 5, dark); PX(ctx, ox + 13, oy + 5, dark); // ears
  R(ctx, ox + 13, oy + 8, 2, 1, white); // snout
  R(ctx, ox + 2, oy + 8, 3, 2, dark); // tail base
  PX(ctx, ox + 1, oy + 9, white); // tail tip
  R(ctx, ox + 5, oy + 12, 1, 2, dark); R(ctx, ox + 9, oy + 12, 1, 2, dark);
  PX(ctx, ox + 13, oy + 7, '#161616');
}

export function drawFrog(ctx: Ctx, ox: number, oy: number): void {
  const g = '#4f7a36', gd = '#3a5a28', gh = '#69a048';
  R(ctx, ox + 5, oy + 9, 7, 4, g);
  R(ctx, ox + 5, oy + 9, 7, 1, gh);
  R(ctx, ox + 5, oy + 7, 2, 2, g); R(ctx, ox + 10, oy + 7, 2, 2, g); // eye bumps
  PX(ctx, ox + 5, oy + 7, '#e8d24a'); PX(ctx, ox + 11, oy + 7, '#e8d24a');
  R(ctx, ox + 4, oy + 12, 2, 1, gd); R(ctx, ox + 11, oy + 12, 2, 1, gd); // feet
  PX(ctx, ox + 8, oy + 11, gd);
}

export function drawBoar(ctx: Ctx, ox: number, oy: number): void {
  const body = '#4a4038', dark = '#332c26', bristle = '#5e544a';
  R(ctx, ox + 3, oy + 7, 11, 6, body);
  R(ctx, ox + 3, oy + 7, 11, 1, bristle);
  R(ctx, ox + 12, oy + 8, 4, 4, body); // head
  R(ctx, ox + 15, oy + 10, 2, 2, dark); // snout
  PX(ctx, ox + 16, oy + 9, '#d8d2c4'); // tusk
  R(ctx, ox + 5, oy + 13, 2, 3, dark); R(ctx, ox + 8, oy + 13, 2, 3, dark);
  R(ctx, ox + 11, oy + 13, 2, 3, dark);
  PX(ctx, ox + 14, oy + 9, '#141414');
}

export function drawCrow(ctx: Ctx, ox: number, oy: number): void {
  const b = '#1c1c24', hi = '#3a3a48';
  R(ctx, ox + 5, oy + 7, 7, 3, b);
  R(ctx, ox + 11, oy + 6, 3, 2, b); // head
  PX(ctx, ox + 14, oy + 6, '#caa23a'); // beak
  R(ctx, ox + 6, oy + 6, 4, 1, hi); // wing sheen
  R(ctx, ox + 4, oy + 8, 2, 1, b); // tail
  PX(ctx, ox + 12, oy + 6, '#caa23a');
}
