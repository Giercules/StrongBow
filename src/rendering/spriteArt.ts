import { C, DEFAULT_WALL, DEFAULT_FLOOR } from './Palette';
import type { HeroRamp, MonsterRamp, WallColors, FloorColors } from './Palette';
import type { ThemeId } from '../core/types';

// ----------------------------------------------------------------------------
// spriteArt — pure 2D-canvas pixel drawing routines.
// NO Phaser / DOM dependencies (only a CanvasRenderingContext2D), so these can
// be rendered both in-browser (TextureFactory) and headless in Node (art QA).
// ----------------------------------------------------------------------------

export type Ctx = CanvasRenderingContext2D;
export type Facing = 'down' | 'up' | 'side';

export const HERO_FW = 20;
export const HERO_FH = 24;
export const MON_FW = 22;
export const MON_FH = 22;
export const BOSS_FW = 40;
export const BOSS_FH = 40;

export const R = (ctx: Ctx, x: number, y: number, w: number, h: number, c: string) => {
  ctx.fillStyle = c;
  ctx.fillRect(x, y, w, h);
};
export const PX = (ctx: Ctx, x: number, y: number, c: string) => {
  ctx.fillStyle = c;
  ctx.fillRect(x, y, 1, 1);
};

/**
 * Draw a 1px dark outline around the opaque pixels in a region. Operates at 1:1
 * device pixels (call from un-transformed contexts only). Gives sprites a bold
 * arcade silhouette that pops against the floor.
 */
export function outlineRegion(ctx: Ctx, x: number, y: number, w: number, h: number, color = '#0a0a14'): void {
  const img = ctx.getImageData(x, y, w, h);
  const d = img.data;
  const a = (px: number, py: number): boolean =>
    px >= 0 && py >= 0 && px < w && py < h && d[(py * w + px) * 4 + 3] > 40;
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  const todo: number[] = [];
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const i = (py * w + px) * 4;
      if (d[i + 3] > 40) continue;
      if (a(px - 1, py) || a(px + 1, py) || a(px, py - 1) || a(px, py + 1)) todo.push(i);
    }
  }
  for (const i of todo) {
    d[i] = r;
    d[i + 1] = g;
    d[i + 2] = b;
    d[i + 3] = 255;
  }
  ctx.putImageData(img, x, y);
}

/**
 * Soft shading pass: rim-lights the upper-left edge of a sprite and deepens the
 * lower-right + bottom into a form shadow, giving flat pixel art a rounder, more
 * dimensional look. Run BEFORE outlineRegion. Pure pixel op (safe, cosmetic).
 */
export function softShade(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  const img = ctx.getImageData(x, y, w, h);
  const d = img.data;
  const a = (px: number, py: number): boolean => px >= 0 && py >= 0 && px < w && py < h && d[(py * w + px) * 4 + 3] > 40;
  const src = new Uint8ClampedArray(d);
  const clamp = (v: number): number => (v < 0 ? 0 : v > 255 ? 255 : v);
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const i = (py * w + px) * 4;
      if (src[i + 3] <= 40) continue;
      let f = 0;
      if (!a(px, py - 1) || !a(px - 1, py)) f += 0.22; // upper-left rim light
      if (!a(px, py + 1) || !a(px + 1, py)) f -= 0.2; // lower-right form shadow
      f -= (py / h) * 0.07; // gentle vertical falloff
      if (f !== 0) {
        d[i] = clamp(src[i] * (1 + f));
        d[i + 1] = clamp(src[i + 1] * (1 + f));
        d[i + 2] = clamp(src[i + 2] * (1 + f));
      }
    }
  }
  ctx.putImageData(img, x, y);
}

export function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// ============================================================================
// TILES
// ============================================================================
export function drawFloor(ctx: Ctx, ox: number, oy: number, seed: number, fp: FloorColors = DEFAULT_FLOOR): void {
  const r = rng(seed);
  R(ctx, ox, oy, 16, 16, fp.f1);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const n = r();
      if (n < 0.14) PX(ctx, ox + x, oy + y, fp.f0);
      else if (n < 0.26) PX(ctx, ox + x, oy + y, fp.f2);
      else if (n < 0.32) PX(ctx, ox + x, oy + y, fp.f3);
      else if (n < 0.345) PX(ctx, ox + x, oy + y, fp.hi);
    }
  }
  // faint flagstone seams along the top/left edges
  ctx.globalAlpha = 0.5;
  R(ctx, ox, oy, 16, 1, fp.f0);
  R(ctx, ox, oy, 1, 16, fp.f0);
  ctx.globalAlpha = 1;

  // one decorative feature per tile for variety (cracks, moss, gravel, puddle, flagstone)
  const deco = r();
  if (deco < 0.13) {
    // puddle - dark reflective water
    const pcx = ox + 4 + Math.floor(r() * 7);
    const pcy = oy + 6 + Math.floor(r() * 5);
    ctx.fillStyle = 'rgba(18,30,50,0.6)';
    ctx.beginPath();
    ctx.ellipse(pcx, pcy, 4, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(20,32,52,0.4)';
    ctx.beginPath();
    ctx.ellipse(pcx, pcy + 1, 5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    PX(ctx, pcx - 1, pcy - 1, '#5f7ea6');
    PX(ctx, pcx + 1, pcy, '#48648a');
  } else if (deco < 0.27) {
    // scattered gravel / pebbles
    for (let i = 0; i < 6; i++) {
      const gx = ox + 2 + Math.floor(r() * 12);
      const gy = oy + 2 + Math.floor(r() * 12);
      PX(ctx, gx, gy, r() < 0.5 ? fp.f0 : fp.hi);
    }
  } else if (deco < 0.34) {
    // big cracked flagstone seam (cross)
    ctx.globalAlpha = 0.6;
    R(ctx, ox + 8, oy + 1, 1, 14, fp.crack);
    R(ctx, ox + 1, oy + 8, 14, 1, fp.crack);
    ctx.globalAlpha = 0.3;
    R(ctx, ox + 9, oy + 1, 1, 14, fp.hi);
    ctx.globalAlpha = 1;
  } else if (deco < 0.5) {
    // jagged crack
    let cx = ox + 3 + Math.floor(r() * 9);
    let cy = oy + 3 + Math.floor(r() * 9);
    for (let i = 0; i < 5; i++) {
      PX(ctx, cx, cy, fp.crack);
      cx += r() < 0.5 ? 1 : 0;
      cy += r() < 0.5 ? 1 : -1;
    }
  } else if (deco < 0.62) {
    // moss patch
    const mx = ox + 2 + Math.floor(r() * 11);
    const my = oy + 2 + Math.floor(r() * 11);
    PX(ctx, mx, my, fp.moss);
    PX(ctx, mx + 1, my, fp.moss);
    PX(ctx, mx, my + 1, fp.moss);
    PX(ctx, mx + 1, my + 1, fp.moss);
  }
}

export function drawWall(ctx: Ctx, ox: number, oy: number, cap: boolean, seed = 0, wp: WallColors = DEFAULT_WALL): void {
  const r = rng(seed * 2654435761 + 11);
  R(ctx, ox, oy, 16, 16, wp.base);
  const rows = [0, 4, 8, 12];
  for (let i = 0; i < rows.length; i++) {
    const ry = rows[i];
    const offset = i % 2 === 0 ? 0 : 8;
    R(ctx, ox, oy + ry, 16, 1, wp.mortar);
    for (let bx = 0; bx < 16; bx += 8) {
      const x = ox + ((bx + offset) % 16);
      // brick face with subtle per-brick tone variation
      const v = r();
      const face = v < 0.34 ? wp.mid : v < 0.7 ? wp.base : wp.lit;
      R(ctx, x, oy + ry + 1, 7, 3, face);
      // top-left bevel highlight (light from upper-left)
      R(ctx, x, oy + ry + 1, 7, 1, wp.hi);
      R(ctx, x, oy + ry + 1, 1, 3, wp.lit);
      // bottom-right bevel shadow
      R(ctx, x, oy + ry + 3, 7, 1, wp.dark);
      R(ctx, x + 6, oy + ry + 1, 1, 3, wp.dark);
      // vertical mortar groove
      R(ctx, x + 7, oy + ry + 1, 1, 3, wp.mortar);
      // weathering: occasional crack or moss fleck
      if (r() < 0.14) PX(ctx, x + 1 + Math.floor(r() * 4), oy + ry + 2, wp.mortar);
      else if (r() < 0.08) PX(ctx, x + 2 + Math.floor(r() * 3), oy + ry + 2, wp.dark);
    }
  }
  // grounding shadow at the very bottom edge
  ctx.globalAlpha = 0.4;
  R(ctx, ox, oy + 14, 16, 2, wp.dark);
  ctx.globalAlpha = 1;
  if (cap) {
    R(ctx, ox, oy, 16, 3, wp.topLit);
    R(ctx, ox, oy, 16, 1, wp.hi);
    R(ctx, ox, oy + 3, 16, 1, wp.topDark);
    ctx.globalAlpha = 0.25;
    R(ctx, ox, oy + 4, 16, 2, wp.hi);
    ctx.globalAlpha = 1;
  }
}

/**
 * Theme-specific decoration painted over the top of a wall tile so each level's
 * wall *tops* (the "roof" you see from above) look distinct — not just recolored.
 * Kept light so the brick still reads through.
 */
export function drawWallRoof(ctx: Ctx, ox: number, oy: number, theme: ThemeId, seed: number): void {
  const r = rng(seed * 8161 + 17);
  const dots = (color: string, n: number) => {
    for (let i = 0; i < n; i++) PX(ctx, ox + Math.floor(r() * 16), oy + Math.floor(r() * 16), color);
  };
  const blob = (color: string, n: number) => {
    for (let i = 0; i < n; i++) R(ctx, ox + 1 + Math.floor(r() * 13), oy + 1 + Math.floor(r() * 13), 2, 2, color);
  };
  switch (theme) {
    case 'molten':
      blob('#7a1a06', 2);
      dots('#ff8a1e', 6);
      dots('#ffd98a', 2);
      break;
    case 'frost':
      dots('#dff1ff', 7);
      dots('#bfe9ff', 4);
      blob('#eaf6ff', 2);
      break;
    case 'toxic':
      blob('#3f8a3a', 3);
      dots('#8ce05a', 4);
      R(ctx, ox + 4 + Math.floor(r() * 8), oy + 8, 1, 4, '#6fae3a'); // drip
      break;
    case 'clockwork':
      for (const [dx, dy] of [[3, 3], [12, 3], [3, 12], [12, 12]] as [number, number][]) {
        PX(ctx, ox + dx, oy + dy, '#e6c264');
        PX(ctx, ox + dx, oy + dy + 1, '#7a5e2a');
      }
      ctx.globalAlpha = 0.5;
      R(ctx, ox, oy + 8, 16, 1, '#2a2214');
      ctx.globalAlpha = 1;
      break;
    case 'arena':
      blob('#9c1818', 2);
      dots('#5a0e0e', 3);
      dots('#caa56a', 3);
      break;
    case 'bog':
      blob('#3f7a34', 4);
      blob('#244d1e', 2);
      dots('#7fce58', 3);
      break;
    case 'storm':
      dots('#b0c8ff', 5);
      dots('#ffffff', 2);
      if (r() < 0.5) {
        const x = ox + 4 + Math.floor(r() * 8);
        const y = oy + 4 + Math.floor(r() * 8);
        R(ctx, x - 1, y, 3, 1, '#cfe0ff');
        R(ctx, x, y - 1, 1, 3, '#cfe0ff');
      }
      break;
    case 'shadow':
      blob('#0c0814', 3);
      dots('#8a6ab0', 3);
      break;
    case 'sanctum':
      dots('#ffd24a', 3);
      dots('#ecdca6', 3);
      if (r() < 0.5) {
        const x = ox + 5 + Math.floor(r() * 6);
        const y = oy + 5 + Math.floor(r() * 6);
        R(ctx, x, y, 3, 1, '#e6c264');
        R(ctx, x + 1, y - 1, 1, 3, '#e6c264');
      }
      break;
    default: // crypt
      dots('#3a4566', 3);
      break;
  }
}

// A carved, glowing arcane sigil set into a wall — themed per realm. Baked onto
// occasional front-facing wall tiles to give the dungeons mystical wall art.
export function drawWallArt(ctx: Ctx, ox: number, oy: number, theme: ThemeId, seed: number): void {
  const accents: Record<ThemeId, string> = {
    crypt: '#8aa0e0',
    molten: '#ff8a1e',
    frost: '#bfe9ff',
    toxic: '#9fd05a',
    clockwork: '#e6c264',
    arena: '#ff7a3a',
    bog: '#82a85a',
    storm: '#b0c8ff',
    shadow: '#b58aff',
    sanctum: '#ffd24a',
  };
  const col = accents[theme] ?? '#8aa0e0';
  const cx = ox + 8;
  const cy = oy + 7;
  const r = rng(seed * 2654435761 + 7);
  // carved recess
  ctx.fillStyle = 'rgba(0,0,0,0.42)';
  ctx.fillRect(ox + 3, oy + 1, 10, 12);
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  ctx.fillRect(ox + 3, oy + 1, 10, 1);
  // rune ring + sigil
  ctx.strokeStyle = col;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, 3.4, 0, Math.PI * 2);
  ctx.stroke();
  R(ctx, cx - 2, cy, 5, 1, col);
  R(ctx, cx, cy - 2, 1, 5, col);
  PX(ctx, cx, cy, '#ffffff');
  // spokes / glyph dots vary a little per tile
  const spokes: [number, number][] = [[-3, -3], [3, -3], [-3, 3], [3, 3]];
  for (const [dx, dy] of spokes) if (r() < 0.85) PX(ctx, cx + dx, cy + dy, col);
}

export function drawDoor(ctx: Ctx, ox: number, oy: number, locked: boolean): void {
  R(ctx, ox, oy, 16, 16, C.wallDark);
  R(ctx, ox + 1, oy, 14, 16, C.wallMid);
  R(ctx, ox + 2, oy + 1, 12, 14, C.doorWood);
  for (let x = ox + 3; x < ox + 14; x += 4) R(ctx, x, oy + 1, 1, 14, C.doorWoodHi);
  R(ctx, ox + 2, oy + 4, 12, 2, C.doorIron);
  R(ctx, ox + 2, oy + 10, 12, 2, C.doorIron);
  for (let x = ox + 3; x < ox + 14; x += 3) {
    PX(ctx, x, oy + 4, C.wallHi);
    PX(ctx, x, oy + 10, C.wallHi);
  }
  if (locked) {
    R(ctx, ox + 6, oy + 6, 4, 5, C.doorLockDark);
    R(ctx, ox + 6, oy + 6, 4, 1, C.doorLock);
    PX(ctx, ox + 7, oy + 8, C.doorLock);
    PX(ctx, ox + 8, oy + 8, C.doorLock);
  } else {
    R(ctx, ox + 11, oy + 7, 2, 2, C.doorLock);
  }
}

export function drawWater(ctx: Ctx, ox: number, frame: number): void {
  R(ctx, ox, 0, 16, 16, C.waterDark);
  const r = rng(11);
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) if (r() < 0.18) PX(ctx, ox + x, y, C.waterMid);
  for (let i = 0; i < 3; i++) {
    const y = (i * 5 + frame * 2) % 16;
    ctx.globalAlpha = 0.8;
    R(ctx, ox + 1, y, 6, 1, C.waterHi);
    R(ctx, ox + 9, (y + 8) % 16, 5, 1, C.waterHi);
    ctx.globalAlpha = 1;
  }
  PX(ctx, ox + ((frame * 3 + 2) % 14) + 1, (frame * 2 + 3) % 14, C.waterFoam);
}

export function drawLava(ctx: Ctx, ox: number, frame: number): void {
  R(ctx, ox, 0, 16, 16, C.lavaDark);
  const r = rng(7);
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      if (r() < 0.4) PX(ctx, ox + x, y, C.lavaMid);
    }
  const cracks = [
    [2, 3, 6],
    [9, 2, 5],
    [4, 9, 7],
    [10, 11, 4],
  ];
  for (const [cx, cy, len] of cracks) {
    for (let i = 0; i < len; i++) {
      const c = (i + frame) % 3 === 0 ? C.lavaWhite : C.lavaHi;
      PX(ctx, ox + cx + i, cy + ((i + frame) % 2), c);
    }
  }
  const bx = (frame * 5 + 3) % 13;
  R(ctx, ox + bx, 12 - frame, 2, 2, C.lavaHi);
  PX(ctx, ox + bx, 12 - frame, C.lavaWhite);
}

// Neutral (greyscale) portal so it tints cleanly to a per-level colour.
export function drawPortal(ctx: Ctx, ox: number, frame: number): void {
  R(ctx, ox, 0, 16, 16, '#101018');
  const cx = ox + 8;
  const cy = 8;
  const rings = [
    [7, '#6a6a7a'],
    [5.5, '#b4b4c4'],
    [4, '#e8e8f2'],
  ];
  for (const [rad, col] of rings as [number, string][]) {
    ctx.strokeStyle = col as string;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rad as number, (rad as number) - 1, (frame / 6) * Math.PI, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + (frame / 6) * Math.PI;
    const rad = 2 + ((i + frame) % 5);
    PX(ctx, Math.round(cx + Math.cos(a) * rad), Math.round(cy + Math.sin(a) * rad), '#dfe0ee');
  }
  R(ctx, cx - 1, cy - 1, 2, 2, '#ffffff');
}

// Frozen sheet — static, baked over a floor tile. Cracked, glassy, with a sheen.
export function drawIce(ctx: Ctx, ox: number, oy: number, seed: number): void {
  const r = rng(seed * 2246822519 + 3);
  ctx.globalAlpha = 0.82;
  R(ctx, ox, oy, 16, 16, C.iceMid);
  ctx.globalAlpha = 1;
  // frosted mottling
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      const n = r();
      if (n < 0.12) PX(ctx, ox + x, oy + y, C.iceDark);
      else if (n < 0.2) PX(ctx, ox + x, oy + y, C.iceHi);
    }
  // diagonal cracks
  let cx = ox + 2 + Math.floor(r() * 6);
  let cy = oy + 2 + Math.floor(r() * 4);
  for (let i = 0; i < 9; i++) {
    PX(ctx, cx, cy, C.iceDark);
    PX(ctx, cx, cy + 1, C.iceWhite);
    cx += 1;
    cy += r() < 0.5 ? 1 : 0;
    if (cy > oy + 14) break;
  }
  // glossy highlight streak (light from upper-left)
  ctx.globalAlpha = 0.5;
  R(ctx, ox + 1, oy + 1, 7, 1, C.iceWhite);
  R(ctx, ox + 1, oy + 1, 1, 6, C.iceWhite);
  ctx.globalAlpha = 1;
  PX(ctx, ox + 11, oy + 3, C.iceWhite);
  PX(ctx, ox + 4, oy + 11, C.iceHi);
}

// Toxic sludge — animated bubbling pool (4-frame sheet, y baked at 0).
export function drawPoison(ctx: Ctx, ox: number, frame: number): void {
  R(ctx, ox, 0, 16, 16, C.poisonDark);
  const r = rng(29);
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) if (r() < 0.34) PX(ctx, ox + x, y, C.poisonMid);
  // drifting surface scum
  for (let i = 0; i < 3; i++) {
    const y = (i * 5 + frame * 2) % 16;
    ctx.globalAlpha = 0.7;
    R(ctx, ox + 2, y, 5, 1, C.poisonHi);
    R(ctx, ox + 9, (y + 7) % 16, 4, 1, C.poisonHi);
    ctx.globalAlpha = 1;
  }
  // rising bubbles that pop on the last frame
  const bubbles = [
    [4, 11, 0],
    [11, 8, 1],
    [7, 13, 2],
  ];
  for (const [bx, by, ph] of bubbles) {
    const f = (frame + ph) % 4;
    const yy = by - f * 2;
    if (f === 3) {
      PX(ctx, ox + bx - 1, yy, C.poisonGas);
      PX(ctx, ox + bx + 1, yy, C.poisonGas);
    } else {
      R(ctx, ox + bx, yy, 2, 2, C.poisonHi);
      PX(ctx, ox + bx, yy, C.poisonGas);
    }
  }
}

// Spike trap — telegraphed retract/extend cycle (4-frame sheet, y baked at 0).
// frame 0 = flush plate (safe-looking), 3 = fully extended steel.
export function drawSpikes(ctx: Ctx, ox: number, frame: number): void {
  // recessed floor plate
  R(ctx, ox, 0, 16, 16, C.spikeBase);
  R(ctx, ox + 1, 1, 14, 14, '#222a3c');
  // bolt holes
  PX(ctx, ox + 2, 2, '#0a0e18');
  PX(ctx, ox + 13, 2, '#0a0e18');
  PX(ctx, ox + 2, 13, '#0a0e18');
  PX(ctx, ox + 13, 13, '#0a0e18');
  const ext = [0, 3, 6, 8][frame % 4]; // how far spikes protrude
  if (ext === 0) {
    // flush — a faint warning grid
    ctx.globalAlpha = 0.5;
    for (let x = 3; x < 14; x += 4) R(ctx, ox + x, 3, 1, 10, '#39435c');
    ctx.globalAlpha = 1;
    return;
  }
  const cols = [3, 7, 11];
  for (const c of cols) {
    const topY = 14 - ext;
    // triangular spike
    for (let i = 0; i < ext; i++) {
      const w = Math.max(1, Math.round((i / ext) * 3));
      R(ctx, ox + c - (w >> 1) + 1, 14 - i, w, 1, C.spikeSteel);
    }
    PX(ctx, ox + c + 1, topY, C.spikeHi);
    if (frame === 3) PX(ctx, ox + c + 1, 14, C.spikeBlood);
  }
}

// ============================================================================
// OBJECTS / DECOR
// ============================================================================
// Neutral (greyscale) flame so the sprite tints cleanly to any element colour.
export function drawTorch(ctx: Ctx, ox: number, frame: number): void {
  R(ctx, ox + 7, 9, 2, 6, '#544c44'); // bracket (neutral)
  R(ctx, ox + 6, 14, 4, 1, '#544c44');
  const sway = [0, 1, 0, -1][frame % 4];
  R(ctx, ox + 6 + sway, 6, 4, 4, '#b9b9c8'); // flame edge
  R(ctx, ox + 6 + sway, 4, 3, 4, '#e6e6f0'); // flame mid
  R(ctx, ox + 7 + sway, 2, 2, 3, '#ffffff'); // flame core
  PX(ctx, ox + 7 + sway, 2, '#ffffff');
  PX(ctx, ox + 8 + sway, 0 + (frame % 2), '#eaeaf2');
}

// A 24x24 arcane summoning rift: a runed stone altar flanked by obelisks, with a
// swirling portal core orbited by rune-motes. Four frames pulse + rotate it.
export function drawGenerator(ctx: Ctx, ox: number, frame: number): void {
  const cx = ox + 12;
  const pulse = [0, 1, 2, 1][frame % 4];
  const rot = (frame / 4) * Math.PI;

  // ---- stone plinth ----
  R(ctx, cx - 8, 17, 16, 5, '#241f38');
  R(ctx, cx - 8, 17, 16, 1, '#4a4068');
  R(ctx, cx - 8, 21, 16, 1, '#120e20');
  R(ctx, cx - 8, 17, 1, 5, '#3a3056');
  R(ctx, cx + 7, 17, 1, 5, '#120e20');
  for (let i = -2; i <= 2; i++) PX(ctx, cx + i * 3, 19, i % 2 === 0 ? '#c79bff' : '#7fe4ff'); // rune row

  // ---- flanking obelisks with glyph glints ----
  R(ctx, cx - 11, 7, 3, 11, '#1c1830');
  R(ctx, cx - 11, 7, 1, 11, '#3a3056');
  R(ctx, cx + 8, 7, 3, 11, '#1c1830');
  R(ctx, cx + 10, 7, 1, 11, '#120e20');
  PX(ctx, cx - 10, 10, '#7fe4ff');
  PX(ctx, cx + 9, 10, '#7fe4ff');
  PX(ctx, cx - 10, 14, '#c79bff');
  PX(ctx, cx + 9, 14, '#c79bff');

  // ---- swirling rift core ----
  const ccy = 10;
  ctx.save();
  ctx.strokeStyle = '#4a18a8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(cx, ccy, 6 + pulse, 6 + pulse, rot, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = '#8a3cff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(cx, ccy, 4 + pulse * 0.5, 5 + pulse * 0.5, rot + 1, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = '#c79bff';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(cx, ccy, 2.5, 3.5, rot, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  R(ctx, cx - 1, ccy - 1, 2, 2, '#ffffff'); // bright core

  // ---- orbiting rune motes ----
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + (frame / 4) * Math.PI * 2;
    PX(ctx, Math.round(cx + Math.cos(a) * 8), Math.round(ccy + Math.sin(a) * 7), i % 2 ? '#7fe4ff' : '#c79bff');
  }
  PX(ctx, cx + [-2, 1, 0, 2][frame % 4], 4 - (frame % 2), '#dffaff'); // rising spark
}

export function drawChest(ctx: Ctx, ox: number, oy: number, open: boolean): void {
  R(ctx, ox + 2, oy + 7, 12, 7, C.doorWood);
  R(ctx, ox + 2, oy + 7, 12, 1, C.doorWoodHi);
  R(ctx, ox + 2, oy + 10, 12, 2, C.coinDark);
  R(ctx, ox + 7, oy + 7, 2, 7, C.coinDark);
  if (!open) {
    R(ctx, ox + 2, oy + 4, 12, 4, C.doorWoodHi);
    R(ctx, ox + 2, oy + 4, 12, 1, '#9a6a30');
    R(ctx, ox + 7, oy + 4, 2, 4, C.coinMid);
    PX(ctx, ox + 7, oy + 8, C.coinHi);
  } else {
    R(ctx, ox + 2, oy + 2, 12, 3, C.doorWood);
    R(ctx, ox + 4, oy + 6, 8, 3, C.coinHi);
    PX(ctx, ox + 5, oy + 6, C.portalCore);
    PX(ctx, ox + 9, oy + 7, C.portalCore);
  }
}

export function drawShrine(ctx: Ctx, ox: number, oy: number, lit: boolean): void {
  R(ctx, ox + 4, oy + 11, 8, 4, C.wallMid);
  R(ctx, ox + 3, oy + 14, 10, 2, C.wallDark);
  R(ctx, ox + 5, oy + 5, 6, 7, C.wallLit);
  R(ctx, ox + 5, oy + 5, 6, 1, C.wallHi);
  R(ctx, ox + 5, oy + 4, 6, 2, C.wallDark);
  if (lit) {
    R(ctx, ox + 6, oy + 1, 4, 4, C.fireMid);
    R(ctx, ox + 7, oy, 2, 3, C.fireCore);
    PX(ctx, ox + 7, oy, C.portalCore);
  } else {
    R(ctx, ox + 6, oy + 3, 4, 1, C.coinDark);
  }
}

export function drawPillar(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 4, oy, 8, 16, C.wallBase);
  R(ctx, ox + 4, oy, 2, 16, C.wallLit);
  R(ctx, ox + 10, oy, 2, 16, C.wallDark);
  R(ctx, ox + 3, oy, 10, 2, C.wallMid);
  R(ctx, ox + 3, oy + 14, 10, 2, C.wallMid);
  R(ctx, ox + 4, oy, 8, 1, C.wallHi);
}

export function drawBones(ctx: Ctx, ox: number, oy: number): void {
  const b = '#cdd2e0';
  const d = '#7d839a';
  R(ctx, ox + 3, oy + 11, 8, 1, b);
  R(ctx, ox + 4, oy + 13, 6, 1, b);
  PX(ctx, ox + 3, oy + 10, b);
  PX(ctx, ox + 10, oy + 12, d);
  R(ctx, ox + 6, oy + 8, 4, 3, b);
  PX(ctx, ox + 7, oy + 9, '#202433');
  PX(ctx, ox + 8, oy + 9, '#202433');
}

export function drawRubble(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 4, oy + 11, 4, 3, C.wallMid);
  R(ctx, ox + 8, oy + 12, 3, 2, C.wallDark);
  R(ctx, ox + 6, oy + 10, 2, 2, C.wallLit);
  PX(ctx, ox + 5, oy + 13, C.wallHi);
}

export function drawBanner(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 5, oy + 1, 6, 11, '#2b59b0');
  R(ctx, ox + 5, oy + 1, 6, 1, C.coinMid);
  R(ctx, ox + 7, oy + 3, 2, 5, C.coinHi);
  R(ctx, ox + 5, oy + 12, 2, 2, C.hudBg);
  R(ctx, ox + 9, oy + 12, 2, 2, C.hudBg);
}

// Ice crystal cluster — frost set-piece decor.
export function drawCrystal(ctx: Ctx, ox: number, oy: number): void {
  // back shard
  R(ctx, ox + 9, oy + 5, 2, 9, C.crystalDk);
  R(ctx, ox + 9, oy + 4, 2, 2, C.crystal);
  // main shard
  R(ctx, ox + 5, oy + 6, 3, 8, C.crystal);
  R(ctx, ox + 5, oy + 6, 1, 8, C.crystalHi);
  R(ctx, ox + 6, oy + 3, 1, 4, C.crystal);
  PX(ctx, ox + 6, oy + 2, C.crystalHi);
  // small shard
  R(ctx, ox + 3, oy + 10, 2, 4, C.crystalDk);
  PX(ctx, ox + 3, oy + 9, C.crystal);
  // base frost
  ctx.globalAlpha = 0.6;
  R(ctx, ox + 2, oy + 13, 11, 2, C.iceHi);
  ctx.globalAlpha = 1;
}

// Brass cog — clockwork set-piece decor.
export function drawCog(ctx: Ctx, ox: number, oy: number): void {
  const cx = ox + 8;
  const cy = oy + 8;
  // teeth
  for (let a = 0; a < 8; a++) {
    const ang = (a / 8) * Math.PI * 2;
    const tx = Math.round(cx + Math.cos(ang) * 6);
    const ty = Math.round(cy + Math.sin(ang) * 6);
    R(ctx, tx - 1, ty - 1, 2, 2, C.cog);
  }
  // body
  ctx.fillStyle = C.cog;
  ctx.beginPath();
  ctx.arc(cx, cy, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.cogHi;
  ctx.beginPath();
  ctx.arc(cx - 1, cy - 1, 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.cogDk;
  ctx.beginPath();
  ctx.arc(cx, cy, 1.6, 0, Math.PI * 2);
  ctx.fill();
}

// Hanging vines / toxic growth — toxic set-piece decor.
export function drawVines(ctx: Ctx, ox: number, oy: number): void {
  for (const [vx, len] of [
    [4, 11],
    [8, 14],
    [12, 9],
  ] as [number, number][]) {
    for (let i = 0; i < len; i++) {
      PX(ctx, ox + vx + (i % 2 === 0 ? 0 : 1), oy + i, i % 3 === 0 ? C.vineHi : C.vine);
    }
    R(ctx, ox + vx - 1, oy + len - 1, 3, 2, C.vineHi);
  }
}

// Blood stain — arena set-piece decor (floor splat).
export function drawBloodStain(ctx: Ctx, ox: number, oy: number): void {
  ctx.fillStyle = C.bloodDark;
  ctx.beginPath();
  ctx.ellipse(ox + 8, oy + 9, 5.5, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.bloodMid;
  ctx.beginPath();
  ctx.ellipse(ox + 7, oy + 8, 3, 1.8, 0, 0, Math.PI * 2);
  ctx.fill();
  PX(ctx, ox + 13, oy + 6, C.bloodMid);
  PX(ctx, ox + 3, oy + 12, C.bloodDark);
  PX(ctx, ox + 12, oy + 12, C.bloodDark);
}

// Skull on a pike — arena/crypt set-piece decor.
export function drawSkullPike(ctx: Ctx, ox: number, oy: number): void {
  const b = '#d8dce8';
  R(ctx, ox + 7, oy + 6, 2, 9, '#5a4a2a'); // pole
  R(ctx, ox + 5, oy + 2, 6, 5, b); // cranium
  R(ctx, ox + 6, oy + 7, 4, 2, b); // jaw
  PX(ctx, ox + 6, oy + 4, '#202433'); // eye
  PX(ctx, ox + 9, oy + 4, '#202433'); // eye
  PX(ctx, ox + 7, oy + 6, '#202433'); // nose
  R(ctx, ox + 5, oy + 2, 6, 1, '#f2f4fa');
}

// --- new themed decor -------------------------------------------------------

// Bog: a rotting mossy stump with a couple of roots.
export function drawBogStump(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 4, oy + 7, 8, 7, '#3a2a1a');
  R(ctx, ox + 4, oy + 7, 8, 1, '#4e3a22');
  R(ctx, ox + 4, oy + 7, 8, 2, '#3f6a2e'); // moss cap
  PX(ctx, ox + 6, oy + 7, '#7fce58');
  PX(ctx, ox + 9, oy + 8, '#7fce58');
  R(ctx, ox + 2, oy + 13, 4, 1, '#2a1e12'); // roots
  R(ctx, ox + 10, oy + 13, 4, 1, '#2a1e12');
  R(ctx, ox + 6, oy + 9, 1, 4, '#241a10');
  R(ctx, ox + 9, oy + 9, 1, 4, '#241a10');
}

// Bog: a flat lilypad with a tiny bloom (sits on the floor).
export function drawLilypad(ctx: Ctx, ox: number, oy: number): void {
  ctx.fillStyle = '#2f6a34';
  ctx.beginPath();
  ctx.ellipse(ox + 8, oy + 9, 6, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3f8a3a';
  ctx.beginPath();
  ctx.ellipse(ox + 7, oy + 8, 4, 2.4, 0, 0, Math.PI * 2);
  ctx.fill();
  R(ctx, ox + 8, oy + 9, 4, 1, '#16331c'); // wedge cut
  PX(ctx, ox + 6, oy + 7, '#e8c0e0'); // bloom
  PX(ctx, ox + 7, oy + 7, '#fff0fa');
}

// Storm: a tall lightning rod crackling at the tip.
export function drawStormRod(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 7, oy + 4, 2, 11, '#8b94a8'); // pole
  R(ctx, ox + 7, oy + 4, 1, 11, '#cfe0ff');
  R(ctx, ox + 5, oy + 13, 6, 2, '#444b60'); // base
  R(ctx, ox + 6, oy + 1, 4, 3, '#b0c8ff'); // crackle ball
  PX(ctx, ox + 8, oy + 0, '#ffffff');
  PX(ctx, ox + 5, oy + 2, '#7fd0ff');
  PX(ctx, ox + 10, oy + 2, '#7fd0ff');
  PX(ctx, ox + 8, oy + 5, '#eaf4ff');
}

// Storm/Frost: a floating cyan crystal shard.
export function drawSkyCrystal(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 7, oy + 3, 2, 10, '#6fb0d8');
  R(ctx, ox + 6, oy + 5, 4, 6, '#9fd8ff');
  R(ctx, ox + 7, oy + 4, 2, 8, '#cfeeff');
  PX(ctx, ox + 8, oy + 4, '#ffffff');
  PX(ctx, ox + 6, oy + 8, '#4a8ab0');
  PX(ctx, ox + 9, oy + 9, '#4a8ab0');
}

// Shadow: a jagged rift leaking violet dark.
export function drawVoidRift(ctx: Ctx, ox: number, oy: number): void {
  ctx.fillStyle = '#0c0814';
  ctx.beginPath();
  ctx.ellipse(ox + 8, oy + 8, 5, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#241636';
  ctx.beginPath();
  ctx.ellipse(ox + 8, oy + 8, 3, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  PX(ctx, ox + 8, oy + 5, '#8a6ab0');
  PX(ctx, ox + 7, oy + 9, '#b58aff');
  PX(ctx, ox + 9, oy + 11, '#6a4f9a');
}

// Sanctum: a glowing rune sigil stamped on the floor.
export function drawSanctumGlyph(ctx: Ctx, ox: number, oy: number): void {
  const g = '#ecdca6';
  R(ctx, ox + 4, oy + 8, 8, 1, g);
  R(ctx, ox + 8, oy + 4, 1, 8, g);
  R(ctx, ox + 5, oy + 5, 6, 6, 'rgba(236,220,166,0.0)');
  // diamond
  PX(ctx, ox + 8, oy + 4, '#fff4cf');
  PX(ctx, ox + 4, oy + 8, g);
  PX(ctx, ox + 12, oy + 8, g);
  PX(ctx, ox + 8, oy + 12, g);
  PX(ctx, ox + 6, oy + 6, '#b0962e');
  PX(ctx, ox + 10, oy + 10, '#b0962e');
}

// Sanctum/Arena: a standing gold brazier with a small flame.
export function drawBrazier(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 6, oy + 9, 4, 5, '#7a5e2a'); // stem
  R(ctx, ox + 5, oy + 13, 6, 1, '#4a3812'); // foot
  R(ctx, ox + 4, oy + 7, 8, 3, '#e6c264'); // bowl
  R(ctx, ox + 4, oy + 7, 8, 1, '#fff0b0');
  R(ctx, ox + 6, oy + 4, 4, 3, C.fireMid); // flame
  R(ctx, ox + 7, oy + 2, 2, 3, C.fireCore);
  PX(ctx, ox + 8, oy + 1, '#fff2b0');
}

// ---- additional themed decoration ----

// Crypt: a weathered gravestone.
export function drawGravestone(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 5, oy + 3, 6, 11, '#6a7388');
  R(ctx, ox + 6, oy + 2, 4, 2, '#6a7388');
  R(ctx, ox + 5, oy + 3, 6, 1, '#9aa0b4');
  R(ctx, ox + 7, oy + 6, 2, 5, '#3a3f52'); // cross
  R(ctx, ox + 6, oy + 7, 4, 1, '#3a3f52');
  R(ctx, ox + 3, oy + 13, 10, 2, '#2a1d12');
  PX(ctx, ox + 4, oy + 12, '#3c4a26');
  PX(ctx, ox + 10, oy + 11, '#3c4a26');
}

// Crypt: a small lit candle.
export function drawCandle(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 7, oy + 8, 2, 6, '#e0dcc0');
  R(ctx, ox + 7, oy + 8, 2, 1, '#ffffff');
  R(ctx, ox + 6, oy + 13, 4, 1, '#5a3a1c'); // holder
  R(ctx, ox + 7, oy + 4, 2, 3, C.fireMid); // flame
  PX(ctx, ox + 7, oy + 3, C.fireCore);
}

// Molten: a glowing crack across the floor (flat decor).
export function drawLavaCrack(ctx: Ctx, ox: number, oy: number): void {
  ctx.strokeStyle = '#ff8a1e';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(ox + 2, oy + 9);
  ctx.lineTo(ox + 6, oy + 6);
  ctx.lineTo(ox + 9, oy + 11);
  ctx.lineTo(ox + 14, oy + 8);
  ctx.stroke();
  ctx.strokeStyle = '#ffd98a';
  ctx.lineWidth = 0.6;
  ctx.stroke();
  PX(ctx, ox + 6, oy + 6, '#fff2b0');
  PX(ctx, ox + 9, oy + 11, '#fff2b0');
}

// Molten: a cluster of obsidian rock with embers.
export function drawObsidian(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 4, oy + 7, 8, 7, '#1a1018');
  R(ctx, ox + 6, oy + 5, 4, 3, '#241624');
  R(ctx, ox + 4, oy + 7, 8, 1, '#3a2a3a');
  PX(ctx, ox + 7, oy + 9, '#c4451c');
  PX(ctx, ox + 9, oy + 11, '#ff8a1e');
  PX(ctx, ox + 6, oy + 12, '#c4451c');
}

// Frost: hanging icicles.
export function drawIcicle(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 3, oy, 11, 1, '#cfeeff');
  for (const [x, len] of [[5, 7], [8, 10], [11, 6]] as [number, number][]) {
    for (let i = 0; i < len; i++) {
      const w = Math.max(1, Math.round((1 - i / len) * 2));
      R(ctx, ox + x - (w >> 1), oy + i, w, 1, i < 2 ? '#eaf6ff' : '#9fd8ff');
    }
  }
}

// Frost: an icy hanging banner (sways).
export function drawFrostBanner(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 5, oy + 1, 6, 12, '#3a6a9a');
  R(ctx, ox + 5, oy + 1, 6, 1, '#cfeaff');
  R(ctx, ox + 5, oy + 1, 1, 12, '#5a8ec0');
  R(ctx, ox + 7, oy + 4, 2, 2, '#cfeaff');
  R(ctx, ox + 6, oy + 7, 4, 1, '#cfeaff');
  PX(ctx, ox + 5, oy + 13, '#3a6a9a');
  PX(ctx, ox + 8, oy + 13, '#3a6a9a');
  PX(ctx, ox + 10, oy + 13, '#3a6a9a');
}

// Toxic: a clump of poisonous mushrooms.
export function drawToxicMushroom(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 6, oy + 9, 2, 5, '#cfc0a0');
  R(ctx, ox + 4, oy + 6, 8, 4, '#6a2c8a');
  R(ctx, ox + 4, oy + 6, 8, 1, '#9a4cc0');
  PX(ctx, ox + 6, oy + 7, '#e0b0ff');
  PX(ctx, ox + 9, oy + 8, '#e0b0ff');
  R(ctx, ox + 10, oy + 11, 2, 3, '#cfc0a0'); // small one
  R(ctx, ox + 9, oy + 9, 4, 3, '#7a3a9a');
  R(ctx, ox + 4, oy + 13, 8, 1, '#3f8a3a');
}

// Clockwork: a brass pipe segment.
export function drawPipe(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 2, oy + 6, 12, 4, '#5a4a28');
  R(ctx, ox + 2, oy + 6, 12, 1, '#8a6e34');
  R(ctx, ox + 2, oy + 9, 12, 1, '#2a2214');
  R(ctx, ox + 1, oy + 5, 3, 6, '#7a5e2a');
  R(ctx, ox + 12, oy + 5, 3, 6, '#7a5e2a');
  PX(ctx, ox + 3, oy + 7, '#e6c264');
  PX(ctx, ox + 13, oy + 7, '#e6c264');
}

// Clockwork: a round gauge dial (glows).
export function drawGauge(ctx: Ctx, ox: number, oy: number): void {
  ctx.fillStyle = '#2a2214';
  ctx.beginPath();
  ctx.arc(ox + 8, oy + 8, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#e6c264';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(ox + 8, oy + 8, 5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = '#ff5a3a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(ox + 8, oy + 8);
  ctx.lineTo(ox + 11, oy + 5);
  ctx.stroke();
  PX(ctx, ox + 8, oy + 8, '#fff4cf');
}

// Arena: a rack of weapons.
export function drawWeaponRack(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 2, oy + 13, 12, 1, '#3a2614');
  R(ctx, ox + 2, oy + 2, 1, 12, '#5a3a1c');
  R(ctx, ox + 13, oy + 2, 1, 12, '#5a3a1c');
  R(ctx, ox + 2, oy + 2, 12, 1, '#5a3a1c');
  R(ctx, ox + 5, oy + 3, 1, 9, '#b9c4dd'); // sword
  R(ctx, ox + 4, oy + 11, 3, 1, '#caa56a');
  R(ctx, ox + 9, oy + 3, 1, 10, '#caa56a'); // spear
  R(ctx, ox + 9, oy + 2, 1, 2, '#dfe6ff');
  R(ctx, ox + 11, oy + 4, 1, 8, '#8a5a30'); // axe haft
  R(ctx, ox + 11, oy + 4, 2, 2, '#b9c4dd');
}

// Bog: a gnarled dead tree.
export function drawDeadTree(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 7, oy + 6, 2, 8, '#2a1e12');
  R(ctx, ox + 7, oy + 6, 1, 8, '#3a2a18');
  R(ctx, ox + 4, oy + 5, 3, 1, '#2a1e12');
  R(ctx, ox + 3, oy + 3, 2, 2, '#2a1e12');
  R(ctx, ox + 9, oy + 4, 3, 1, '#2a1e12');
  R(ctx, ox + 11, oy + 2, 2, 2, '#2a1e12');
  PX(ctx, ox + 4, oy + 4, '#3f6a2e');
  PX(ctx, ox + 11, oy + 3, '#3f6a2e');
  R(ctx, ox + 6, oy + 13, 4, 1, '#16240f');
}

// Bog: reeds / cattails.
export function drawCattail(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 5, oy + 4, 1, 10, '#3f7a34');
  R(ctx, ox + 9, oy + 3, 1, 11, '#3f7a34');
  R(ctx, ox + 11, oy + 6, 1, 8, '#3f7a34');
  R(ctx, ox + 4, oy + 6, 3, 3, '#5a3a1c');
  R(ctx, ox + 8, oy + 5, 3, 3, '#5a3a1c');
  PX(ctx, ox + 5, oy + 3, '#7fce58');
  PX(ctx, ox + 9, oy + 2, '#7fce58');
}

// Storm: a crackling floating orb (glows).
export function drawStormOrb(ctx: Ctx, ox: number, oy: number): void {
  ctx.fillStyle = '#3a4a90';
  ctx.beginPath();
  ctx.arc(ox + 8, oy + 7, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#7f9aff';
  ctx.beginPath();
  ctx.arc(ox + 8, oy + 7, 2.5, 0, Math.PI * 2);
  ctx.fill();
  PX(ctx, ox + 8, oy + 7, '#ffffff');
  PX(ctx, ox + 3, oy + 4, '#cfe0ff');
  PX(ctx, ox + 13, oy + 9, '#cfe0ff');
  PX(ctx, ox + 5, oy + 12, '#cfe0ff');
  R(ctx, ox + 6, oy + 13, 4, 1, '#2a2e4a'); // stand
}

// Shadow: a pile of bones.
export function drawBonePile(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 3, oy + 11, 10, 3, '#c9c2a6');
  R(ctx, ox + 3, oy + 11, 10, 1, '#efe9cf');
  R(ctx, ox + 6, oy + 8, 4, 4, '#efe9cf'); // skull
  PX(ctx, ox + 7, oy + 10, '#3a3020');
  PX(ctx, ox + 9, oy + 10, '#3a3020');
  R(ctx, ox + 4, oy + 9, 1, 3, '#c9c2a6');
  R(ctx, ox + 11, oy + 9, 1, 3, '#c9c2a6');
  PX(ctx, ox + 8, oy + 13, '#8a6ab0');
}

// Shadow: a flat glowing rune circle (flat decor).
export function drawRuneCircle(ctx: Ctx, ox: number, oy: number): void {
  ctx.strokeStyle = '#8a6ab0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(ox + 8, oy + 8, 5, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    PX(ctx, Math.round(ox + 8 + Math.cos(a) * 5), Math.round(oy + 8 + Math.sin(a) * 5), '#c79bff');
  }
  R(ctx, ox + 7, oy + 7, 2, 2, '#b58aff');
}

// Sanctum: a golden idol (glows).
export function drawIdol(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 5, oy + 12, 6, 2, '#7a5e2a'); // base
  R(ctx, ox + 6, oy + 4, 4, 8, '#e6c264');
  R(ctx, ox + 6, oy + 4, 4, 1, '#fff4cf');
  R(ctx, ox + 5, oy + 3, 6, 3, '#e6c264'); // head
  PX(ctx, ox + 7, oy + 5, '#3a2a10');
  PX(ctx, ox + 9, oy + 5, '#3a2a10');
  R(ctx, ox + 7, oy + 8, 2, 2, '#fff4cf'); // gem
}

// Sanctum: a stone altar with a glyph.
export function drawAltar(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 3, oy + 9, 10, 5, '#a89c78');
  R(ctx, ox + 3, oy + 9, 10, 1, '#ecdca6');
  R(ctx, ox + 4, oy + 13, 8, 1, '#3a3426');
  R(ctx, ox + 5, oy + 6, 6, 3, '#8a7e5e'); // pedestal
  PX(ctx, ox + 7, oy + 7, '#ffd24a');
  PX(ctx, ox + 9, oy + 7, '#ffd24a');
}

// ============================================================================
// PICKUPS / ITEMS
// ============================================================================
export function drawCoin(ctx: Ctx, ox: number, frame: number): void {
  const widths = [6, 4, 2, 4];
  const w = widths[frame % 4];
  const x = ox + 8 - w / 2;
  R(ctx, x, 5, w, 6, C.coinMid);
  R(ctx, x, 5, w, 1, C.coinHi);
  R(ctx, x, 10, w, 1, C.coinDark);
  if (w >= 4) PX(ctx, ox + 8 - 1, 7, C.coinHi);
}

export function drawGem(ctx: Ctx): void {
  R(ctx, 6, 6, 4, 4, C.gem);
  R(ctx, 7, 5, 2, 6, C.gem);
  R(ctx, 5, 7, 6, 2, C.gem);
  PX(ctx, 7, 6, C.portalCore);
  PX(ctx, 6, 8, '#1aa094');
}

export function drawFood(ctx: Ctx): void {
  R(ctx, 5, 6, 6, 5, '#a8562a');
  R(ctx, 5, 6, 6, 1, '#c87a3a');
  R(ctx, 9, 10, 3, 3, '#e7d8b0');
  PX(ctx, 11, 12, '#fff3d0');
  PX(ctx, 6, 7, '#d89a55');
}

export function drawPotion(ctx: Ctx, color: string, hi: string): void {
  R(ctx, 6, 3, 4, 2, '#cdd2e0');
  R(ctx, 5, 5, 6, 8, '#1a2030');
  R(ctx, 6, 7, 4, 5, color);
  R(ctx, 6, 7, 1, 5, hi);
  PX(ctx, 7, 8, '#ffffff');
}

export function drawKey(ctx: Ctx): void {
  R(ctx, 5, 6, 3, 3, C.coinMid);
  PX(ctx, 6, 7, C.portal0);
  R(ctx, 8, 7, 5, 1, C.coinMid);
  R(ctx, 11, 8, 1, 2, C.coinMid);
  R(ctx, 9, 8, 1, 2, C.coinMid);
  R(ctx, 5, 6, 3, 1, C.coinHi);
}

export function drawIconSword(ctx: Ctx): void {
  R(ctx, 7, 2, 2, 9, '#cfd6e8');
  R(ctx, 7, 2, 1, 9, '#ffffff');
  R(ctx, 5, 11, 6, 1, C.coinMid);
  R(ctx, 7, 12, 2, 2, C.doorWood);
}
export function drawIconBow(ctx: Ctx): void {
  ctx.strokeStyle = C.doorWoodHi;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(6, 8, 5, -1.1, 1.1);
  ctx.stroke();
  R(ctx, 9, 3, 1, 10, '#e7e2d0');
  R(ctx, 3, 8, 8, 1, '#e7e2d0');
}
export function drawIconStaff(ctx: Ctx): void {
  R(ctx, 7, 5, 2, 9, C.doorWood);
  R(ctx, 6, 3, 4, 3, C.magicMid);
  PX(ctx, 7, 4, C.magicCore);
  PX(ctx, 6, 2, C.magicHot);
  PX(ctx, 10, 3, C.magicHot);
}
export function drawIconMace(ctx: Ctx): void {
  R(ctx, 7, 7, 2, 7, C.doorWood);
  R(ctx, 5, 3, 6, 5, '#aeb6cc');
  R(ctx, 5, 3, 6, 1, '#ffffff');
  PX(ctx, 4, 5, '#aeb6cc');
  PX(ctx, 11, 5, '#aeb6cc');
}
export function drawIconArmor(ctx: Ctx): void {
  R(ctx, 4, 4, 8, 8, '#5a73c0');
  R(ctx, 4, 4, 8, 1, '#a9c4ff');
  R(ctx, 6, 4, 1, 8, '#2a3b6a');
  R(ctx, 9, 4, 1, 8, '#2a3b6a');
  R(ctx, 4, 4, 1, 8, '#a9c4ff');
}
export function drawIconRing(ctx: Ctx): void {
  ctx.strokeStyle = C.coinMid;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(8, 9, 4, 0, Math.PI * 2);
  ctx.stroke();
  R(ctx, 7, 3, 2, 2, C.gem);
  PX(ctx, 7, 3, C.portalCore);
}
export function drawIconAmulet(ctx: Ctx): void {
  ctx.strokeStyle = C.coinMid;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(8, 6, 4, 0.2, Math.PI - 0.2);
  ctx.stroke();
  R(ctx, 6, 8, 4, 4, C.magicMid);
  PX(ctx, 7, 9, C.magicCore);
}

// ============================================================================
// FX
// ============================================================================
export function drawMagicBurst(ctx: Ctx, ox: number, frame: number): void {
  const cx = ox + 16;
  const cy = 16;
  const rad = 3 + frame * 3;
  const alpha = 1 - frame * 0.18;
  ctx.globalAlpha = Math.max(0, alpha);
  ctx.strokeStyle = C.magicMid;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, rad, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = C.magicHot;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, Math.max(0, rad - 2), 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + frame;
    PX(ctx, Math.round(cx + Math.cos(a) * rad), Math.round(cy + Math.sin(a) * rad), C.magicCore);
  }
  if (frame === 0) R(ctx, cx - 2, cy - 2, 4, 4, C.magicCore);
  ctx.globalAlpha = 1;
}

export function drawSlash(ctx: Ctx, ox: number, frame: number): void {
  ctx.globalAlpha = 1 - frame * 0.3;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  const a0 = -0.6 + frame * 0.5;
  ctx.arc(ox + 4, 12, 9 + frame, a0, a0 + 1.4);
  ctx.stroke();
  ctx.strokeStyle = C.spark;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(ox + 4, 12, 7 + frame, a0, a0 + 1.4);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

export function drawFire(ctx: Ctx, ox: number, frame: number): void {
  const cx = ox + 8;
  const h = 6 + frame * 2;
  ctx.globalAlpha = 1 - frame * 0.2;
  R(ctx, cx - 4, 14 - h, 8, h, C.fireEdge);
  R(ctx, cx - 3, 15 - h, 6, h, C.fireMid);
  R(ctx, cx - 1, 16 - h, 2, h - 1, C.fireCore);
  PX(ctx, cx, 16 - h, C.portalCore);
  ctx.globalAlpha = 1;
}

export function drawShadow(ctx: Ctx): void {
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.ellipse(12, 4, 11, 3.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(12, 4, 8, 2.5, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function drawAura(ctx: Ctx, color: string): void {
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(14, 14, 12, 6, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 0.4;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(14, 14, 9, 4, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

export function drawHitStar(ctx: Ctx): void {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(7, 2, 2, 12);
  ctx.fillRect(2, 7, 12, 2);
  ctx.fillStyle = C.spark;
  ctx.fillRect(5, 5, 6, 6);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(7, 7, 2, 2);
}

export function drawRing(ctx: Ctx, ox: number, frame: number, color: string): void {
  ctx.strokeStyle = color;
  ctx.globalAlpha = 1 - frame * 0.22;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(ox + 16, 24, 4 + frame * 4, 2 + frame * 2, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

export function drawGlowDot(ctx: Ctx, color: string): void {
  const g = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 16, 16);
}

export function drawVignette(ctx: Ctx, w: number, h: number): void {
  const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.28, w / 2, h / 2, h * 0.85);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.55, 'rgba(0,0,0,0.18)');
  g.addColorStop(1, 'rgba(3,4,9,0.92)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

// White-edged radial (transparent centre) — tints cleanly to give each level a
// coloured screen-edge grade layered over the dark vignette.
export function drawEdgeTint(ctx: Ctx, w: number, h: number): void {
  const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.34, w / 2, h / 2, h * 0.92);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.7, 'rgba(255,255,255,0.08)');
  g.addColorStop(1, 'rgba(255,255,255,0.55)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

export function drawBoneArcher(ctx: Ctx, ox: number, frame: number, r: MonsterRamp): void {
  const cx = ox + MON_FW / 2;
  const bob = frame === 1 || frame === 2 ? -1 : 0;
  const draw = frame === 3;
  // skull
  R(ctx, cx - 3, 4 + bob, 6, 5, r.body2);
  R(ctx, cx - 3, 4 + bob, 6, 1, r.body1);
  R(ctx, cx - 2, 6 + bob, 2, 2, r.detail);
  R(ctx, cx + 1, 6 + bob, 2, 2, r.detail);
  PX(ctx, cx - 2, 6 + bob, r.eye);
  PX(ctx, cx + 1, 6 + bob, r.eye);
  R(ctx, cx - 2, 9 + bob, 4, 1, r.body1);
  // ribcage torso
  R(ctx, cx - 4, 10 + bob, 8, 7, r.body1);
  R(ctx, cx - 4, 10 + bob, 8, 1, r.body2);
  for (let i = 0; i < 3; i++) R(ctx, cx - 3, 11 + bob + i * 2, 6, 1, r.detail);
  R(ctx, cx - 1, 11 + bob, 2, 6, r.body0);
  // legs
  R(ctx, cx - 3, 17 + bob, 2, 3, r.body0);
  R(ctx, cx + 1, 17 + bob, 2, 3, r.body0);
  // bow on the left limb
  const bx = cx - 6;
  R(ctx, bx, 7 + bob, 1, 11, r.accent);
  PX(ctx, bx - 1, 8 + bob, r.accent);
  PX(ctx, bx - 1, 16 + bob, r.accent);
  if (draw) {
    R(ctx, bx + 1, 12 + bob, 7, 1, '#e6dfba');
    PX(ctx, bx + 8, 12 + bob, r.eye);
  } else {
    R(ctx, bx + 1, 12 + bob, 4, 1, '#e6dfba');
  }
}

export function drawBrute(ctx: Ctx, ox: number, frame: number, r: MonsterRamp): void {
  const cx = ox + MON_FW / 2;
  const bob = frame === 1 ? -1 : 0;
  const lunge = frame === 3 ? 2 : 0;
  // hulking shoulders
  R(ctx, cx - 7, 8 + bob, 14, 10, r.body1);
  R(ctx, cx - 7, 8 + bob, 14, 1, r.body2);
  R(ctx, cx - 7, 8 + bob, 2, 10, r.body2);
  R(ctx, cx + 5, 8 + bob, 2, 10, r.body0);
  // chest armour plate
  R(ctx, cx - 4, 11 + bob, 8, 5, r.detail);
  R(ctx, cx - 4, 11 + bob, 8, 1, r.accent);
  // small sunken head + horns
  R(ctx, cx - 3, 4 + bob, 6, 5, r.body2);
  R(ctx, cx - 2, 6 + bob, 2, 2, r.eye);
  R(ctx, cx + 1, 6 + bob, 2, 2, r.eye);
  PX(ctx, cx - 4, 3 + bob, r.detail);
  PX(ctx, cx + 3, 3 + bob, r.detail);
  // arms + fists
  R(ctx, cx - 9 - lunge, 12 + bob, 3, 5, r.body1);
  R(ctx, cx + 6 + lunge, 12 + bob, 3, 5, r.body1);
  R(ctx, cx - 9 - lunge, 16 + bob, 3, 2, r.accent);
  R(ctx, cx + 6 + lunge, 16 + bob, 3, 2, r.accent);
  // legs
  R(ctx, cx - 4, 18 + bob, 3, 3, r.body0);
  R(ctx, cx + 1, 18 + bob, 3, 3, r.body0);
  if (frame === 3) R(ctx, cx - 2, 10 + bob, 4, 1, '#ffffff');
}

export function drawImp(ctx: Ctx, ox: number, frame: number, r: MonsterRamp): void {
  const cx = ox + MON_FW / 2;
  const bob = [0, -2, -1, -2][frame % 4];
  const wing = frame % 2 === 0 ? 2 : 0;
  // bat wings
  R(ctx, cx - 7 - wing, 8 + bob, 3, 5, r.body0);
  R(ctx, cx + 4 + wing, 8 + bob, 3, 5, r.body0);
  PX(ctx, cx - 7 - wing, 7 + bob, r.detail);
  PX(ctx, cx + 6 + wing, 7 + bob, r.detail);
  // body
  R(ctx, cx - 3, 9 + bob, 6, 6, r.body1);
  R(ctx, cx - 3, 9 + bob, 6, 1, r.body2);
  R(ctx, cx - 2, 11 + bob, 4, 3, r.accent);
  // head + horns
  R(ctx, cx - 3, 5 + bob, 6, 4, r.body2);
  PX(ctx, cx - 3, 4 + bob, r.detail);
  PX(ctx, cx + 2, 4 + bob, r.detail);
  R(ctx, cx - 2, 6 + bob, 2, 1, r.eye);
  R(ctx, cx + 1, 6 + bob, 2, 1, r.eye);
  // tail
  R(ctx, cx + 3, 14 + bob, 3, 1, r.body0);
  PX(ctx, cx + 6, 13 + bob, r.accent);
  // legs
  R(ctx, cx - 2, 15 + bob, 2, 3, r.body0);
  R(ctx, cx + 1, 15 + bob, 2, 3, r.body0);
}

export function drawColossus(ctx: Ctx, ox: number, frame: number, r: MonsterRamp): void {
  const cx = ox + BOSS_FW / 2;
  const bob = [0, -1, -2, 0][frame % 4];
  const cast = frame === 3;
  // legs
  R(ctx, cx - 9, 30 + bob, 6, 8, r.body0);
  R(ctx, cx + 3, 30 + bob, 6, 8, r.body0);
  // massive torso
  R(ctx, cx - 12, 12 + bob, 24, 20, r.body1);
  R(ctx, cx - 12, 12 + bob, 24, 2, r.body2);
  R(ctx, cx - 12, 12 + bob, 3, 20, r.body2);
  R(ctx, cx + 9, 12 + bob, 3, 20, r.body0);
  // glowing molten fissures
  for (let i = 0; i < 5; i++) R(ctx, cx - 9 + i * 4, 16 + bob + (i % 2) * 4, 2, 6, r.accent);
  R(ctx, cx - 6, 22 + bob, 12, 2, C.fireCore);
  // shoulders + arms
  R(ctx, cx - 16, 14 + bob, 5, 10, r.body0);
  R(ctx, cx + 11, 14 + bob, 5, 10, r.body0);
  R(ctx, cx - 16, 23 + bob, 5, 3, r.accent);
  R(ctx, cx + 11, 23 + bob, 5, 3, r.accent);
  // head
  R(ctx, cx - 5, 4 + bob, 10, 9, r.body2);
  R(ctx, cx - 5, 4 + bob, 10, 1, '#ffffff');
  R(ctx, cx - 4, 7 + bob, 3, 3, r.detail);
  R(ctx, cx + 1, 7 + bob, 3, 3, r.detail);
  R(ctx, cx - 4, 7 + bob, 3, 2, r.eye);
  R(ctx, cx + 1, 7 + bob, 3, 2, r.eye);
  R(ctx, cx - 3, 11 + bob, 6, 2, C.fireCore);
  // flame crown when casting
  if (cast) {
    for (let i = 0; i < 5; i++) R(ctx, cx - 5 + i * 2, 1 + bob, 1, 3, C.fireCore);
    R(ctx, cx - 14, 18 + bob, 4, 4, r.accent);
    R(ctx, cx + 10, 18 + bob, 4, 4, r.accent);
  }
}

// --- bespoke themed monsters ------------------------------------------------

// Plague Ooze — a squishing gelatinous blob (bog / toxic).
export function drawOoze(ctx: Ctx, ox: number, frame: number, r: MonsterRamp): void {
  const cx = ox + MON_FW / 2;
  const squish = [0, 1, 2, 1][frame % 4];
  const w = 12 + squish;
  const h = 12 - squish;
  const top = 18 - h;
  ctx.fillStyle = r.body1;
  ctx.beginPath();
  ctx.ellipse(cx, top + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = r.body2;
  ctx.beginPath();
  ctx.ellipse(cx - 1, top + h / 2 - 1, w / 2 - 2, h / 2 - 2, 0, 0, Math.PI * 2);
  ctx.fill();
  R(ctx, cx - 4, top + 1, 3, 2, r.accent); // sheen
  R(ctx, cx - 3, top + h / 2, 2, 2, r.eye);
  R(ctx, cx + 1, top + h / 2, 2, 2, r.eye);
  PX(ctx, cx - 3, top + h / 2, r.detail);
  PX(ctx, cx + 2, top + h / 2, r.detail);
  PX(ctx, cx - 4, top + h, r.body0);
  PX(ctx, cx + 4, top + h - 1, r.body0);
  if (frame === 3) R(ctx, cx - 1, top - 2, 2, 3, r.accent); // spit
}

// Brass Sentinel — a boxy clockwork construct with a glowing core (clockwork).
export function drawConstruct(ctx: Ctx, ox: number, frame: number, r: MonsterRamp): void {
  const cx = ox + MON_FW / 2;
  const bob = frame === 1 ? -1 : 0;
  const fire = frame === 3;
  R(ctx, cx - 4, 17 + bob, 3, 4, r.body0);
  R(ctx, cx + 1, 17 + bob, 3, 4, r.body0);
  R(ctx, cx - 5, 8 + bob, 10, 9, r.body1);
  R(ctx, cx - 5, 8 + bob, 10, 1, r.body2);
  R(ctx, cx - 5, 8 + bob, 1, 9, r.body2);
  R(ctx, cx + 4, 8 + bob, 1, 9, r.body0);
  PX(ctx, cx - 4, 9 + bob, r.accent);
  PX(ctx, cx + 3, 9 + bob, r.accent);
  PX(ctx, cx - 4, 15 + bob, r.accent);
  PX(ctx, cx + 3, 15 + bob, r.accent);
  R(ctx, cx - 2, 11 + bob, 4, 3, r.eye); // core
  PX(ctx, cx - 1, 12 + bob, '#ffffff');
  R(ctx, cx - 3, 3 + bob, 6, 5, r.body2); // head
  R(ctx, cx - 2, 5 + bob, 4, 1, r.eye);
  R(ctx, cx - 7, 9 + bob, 2, 6, r.body1); // arms
  R(ctx, cx + 5, 9 + bob, 2, 6, r.body1);
  if (fire) R(ctx, cx + 7, 11 + bob, 3, 1, r.eye);
}

// Storm Wisp — a floating ball of energy crackling with arcs (storm).
export function drawWisp(ctx: Ctx, ox: number, frame: number, r: MonsterRamp): void {
  const cx = ox + MON_FW / 2;
  const bob = [0, -2, -1, -2][frame % 4];
  const cy = 9 + bob;
  ctx.fillStyle = r.body0;
  ctx.beginPath();
  ctx.ellipse(cx, cy, 6, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = r.body1;
  ctx.beginPath();
  ctx.ellipse(cx, cy, 4.5, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = r.body2;
  ctx.beginPath();
  ctx.ellipse(cx, cy, 3, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  R(ctx, cx - 1, cy - 1, 2, 2, r.eye);
  PX(ctx, cx - 6, cy - 3, r.accent);
  PX(ctx, cx + 6, cy + 2, r.accent);
  PX(ctx, cx - 5, cy + 4, r.accent);
  PX(ctx, cx + 5, cy - 4, r.accent);
  R(ctx, cx - 1, cy + 5, 2, 4, r.body1); // tail
  if (frame === 3) R(ctx, cx - 1, cy - 7, 2, 3, r.eye);
}

// Shadow Stalker — a lanky smoke-bodied prowler with glowing eyes (shadow).
export function drawStalker(ctx: Ctx, ox: number, frame: number, r: MonsterRamp): void {
  const cx = ox + MON_FW / 2;
  const bob = frame === 1 ? -1 : 0;
  const lunge = frame === 3 ? 2 : 0;
  ctx.fillStyle = r.body1;
  ctx.beginPath();
  ctx.ellipse(cx, 12 + bob, 5, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = r.body0;
  ctx.beginPath();
  ctx.ellipse(cx, 15 + bob, 6, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  R(ctx, cx - 3, 5 + bob, 6, 5, r.body2); // head
  R(ctx, cx - 2, 7 + bob, 1, 1, r.eye);
  R(ctx, cx + 1, 7 + bob, 1, 1, r.eye);
  R(ctx, cx - 6 - lunge, 11 + bob, 2, 4, r.accent); // claws
  R(ctx, cx + 4 + lunge, 11 + bob, 2, 4, r.accent);
  R(ctx, cx - 3, 18 + bob, 2, 3, r.body0); // legs
  R(ctx, cx + 1, 18 + bob, 2, 3, r.body0);
  PX(ctx, cx - 5, 9 + bob, r.detail);
  PX(ctx, cx + 5, 13 + bob, r.detail);
}

export function drawRadialLight(ctx: Ctx, w: number, h: number, inner = 'rgba(255,206,130,0.95)', outer = 'rgba(255,150,40,0)'): void {
  const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.min(w, h) / 2);
  g.addColorStop(0, inner);
  g.addColorStop(0.45, 'rgba(255,176,80,0.35)');
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

export function drawArrow(ctx: Ctx, ox = 0): void {
  // wooden shaft
  R(ctx, ox + 2, 2, 8, 2, '#8a5a28');
  R(ctx, ox + 2, 2, 8, 1, '#b5894a');
  // steel head
  R(ctx, ox + 9, 1, 3, 4, '#cfd6e8');
  PX(ctx, ox + 12, 2, '#ffffff');
  PX(ctx, ox + 12, 3, '#ffffff');
  // fletching
  R(ctx, ox + 0, 1, 2, 4, '#c43c2a');
  PX(ctx, ox + 1, 0, '#e05a3a');
  PX(ctx, ox + 1, 5, '#e05a3a');
}

export function drawBolt(ctx: Ctx): void {
  const g = ctx.createRadialGradient(5, 5, 0, 5, 5, 5);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.4, '#c79bff');
  g.addColorStop(1, 'rgba(80,40,200,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 10, 10);
  R(ctx, 4, 4, 2, 2, '#ffffff');
}

// ============================================================================
// HEROES (parametric humanoid)
// ============================================================================
export function legShift(pose: number): [number, number] {
  if (pose === 1) return [-1, 1];
  if (pose === 2) return [1, -1];
  return [0, 0];
}

export function drawWeapon(
  ctx: Ctx,
  ox: number,
  cls: string,
  ramp: HeroRamp,
  facing: Facing,
  pose: number
): void {
  const attack = pose === 3;
  const cx = ox + HERO_FW / 2;
  const handY = 14;
  if (cls === 'vanguard') {
    // a great barbarian broadsword (no shield)
    const hx = facing === 'side' ? cx + 6 : cx + 5;
    const len = attack ? 13 : 10;
    const top = attack ? 2 : 4;
    R(ctx, hx, top, 3, len, ramp.trim); // broad blade
    R(ctx, hx, top, 1, len, ramp.trimHi); // edge shine
    R(ctx, hx + 1, top, 1, len, '#5a5a6a'); // fuller
    R(ctx, hx - 1, top + len, 5, 1, C.coinMid); // crossguard
    R(ctx, hx, top + len + 1, 3, 2, ramp.cloth1); // grip
    PX(ctx, hx + 1, top + len + 3, C.coinHi); // pommel
  } else if (cls === 'strider') {
    const hx = cx + (attack ? 7 : 6);
    ctx.strokeStyle = ramp.trim;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(hx, handY - 2, 5, -1.2, 1.2);
    ctx.stroke();
    R(ctx, hx + 3, handY - 7, 1, 11, ramp.trimHi);
    if (attack) R(ctx, hx - 5, handY - 2, 8, 1, '#ffffff');
  } else if (cls === 'arcanist') {
    const hx = cx + (attack ? 6 : 5);
    R(ctx, hx, 5, 2, 11, C.doorWood);
    R(ctx, hx - 1, 2, 4, 4, attack ? C.magicCore : C.magicMid);
    PX(ctx, hx, 3, C.magicCore);
    if (attack) {
      PX(ctx, hx - 2, 1, C.magicHot);
      PX(ctx, hx + 3, 1, C.magicHot);
    }
  } else if (cls === 'warden') {
    const hx = cx + (attack ? 6 : 5);
    R(ctx, hx, 7, 2, 8, C.doorWood);
    R(ctx, hx - 1, 4, 4, 4, ramp.trim);
    R(ctx, hx - 1, 4, 4, 1, ramp.trimHi);
    PX(ctx, hx, 5, '#ffffff');
  }
}

export function drawHumanoid(
  ctx: Ctx,
  ox: number,
  cls: string,
  ramp: HeroRamp,
  facing: Facing,
  pose: number
): void {
  const cx = ox + HERO_FW / 2;
  const bob = pose === 1 ? -1 : 0;
  const [ll, rl] = legShift(pose);

  if (facing === 'up') drawWeapon(ctx, ox, cls, ramp, facing, pose);

  const tTop = 9 + bob;
  const legTop = 16 + bob;
  const hTop = 3 + bob;
  const sway = pose === 1 ? -1 : pose === 3 ? 1 : 0;

  // ---- cloak / robe behind the body ----
  if (cls === 'vanguard' || cls === 'strider') {
    R(ctx, cx - 4, 10 + bob, 8, 11, ramp.cloth0);
    R(ctx, cx - 4, 10 + bob, 1, 11, ramp.cloth1);
    R(ctx, cx + 3, 10 + bob, 1, 11, '#00000033');
    PX(ctx, cx - 3 + sway, 21 + bob, ramp.cloth0);
    PX(ctx, cx + sway, 21 + bob, ramp.cloth1);
    PX(ctx, cx + 2 + sway, 21 + bob, ramp.cloth0);
  } else {
    R(ctx, cx - 5, 9 + bob, 10, 13, ramp.cloth0); // full robe
    R(ctx, cx - 5, 9 + bob, 1, 13, ramp.cloth1);
    R(ctx, cx + 4, 9 + bob, 1, 13, '#00000030');
    R(ctx, cx - 5, 20 + bob, 10, 1, ramp.trim); // hem
  }

  // ---- legs / lower body ----
  if (cls === 'arcanist' || cls === 'warden') {
    R(ctx, cx - 4 + ll, legTop + 3, 3, 3, ramp.cloth0); // robe skirt feet
    R(ctx, cx + 1 + rl, legTop + 3, 3, 3, ramp.cloth0);
    R(ctx, cx - 4 + ll, legTop + 6, 3, 1, '#0a0a12');
    R(ctx, cx + 1 + rl, legTop + 6, 3, 1, '#0a0a12');
  } else if (cls === 'vanguard') {
    R(ctx, cx - 4 + ll, legTop, 3, 5, ramp.skin); // bare legs
    R(ctx, cx + 1 + rl, legTop, 3, 5, ramp.skin);
    R(ctx, cx - 4 + ll, legTop, 1, 5, ramp.skinHi);
    R(ctx, cx + 1 + rl, legTop, 1, 5, ramp.skinHi);
    R(ctx, cx - 4 + ll, legTop + 4, 3, 3, ramp.cloth1); // fur boots
    R(ctx, cx + 1 + rl, legTop + 4, 3, 3, ramp.cloth1);
  } else {
    R(ctx, cx - 4 + ll, legTop, 3, 6, ramp.cloth1); // leather legs
    R(ctx, cx + 1 + rl, legTop, 3, 6, ramp.cloth1);
    R(ctx, cx - 4 + ll, legTop, 1, 6, ramp.cloth2);
    R(ctx, cx + 1 + rl, legTop, 1, 6, ramp.cloth2);
    R(ctx, cx - 4 + ll, legTop + 5, 3, 2, ramp.trim); // boots
    R(ctx, cx + 1 + rl, legTop + 5, 3, 2, ramp.trim);
  }

  // ---- torso (per class) ----
  if (cls === 'vanguard') {
    // bare, muscled chest + fur loincloth
    R(ctx, cx - 5, tTop, 10, 8, ramp.skin);
    R(ctx, cx - 5, tTop, 10, 1, ramp.skinHi);
    R(ctx, cx - 5, tTop, 2, 8, ramp.skinHi);
    R(ctx, cx + 3, tTop, 2, 8, '#00000022');
    R(ctx, cx - 1, tTop + 1, 1, 5, '#00000022'); // sternum
    R(ctx, cx - 4, tTop + 3, 3, 1, '#0000001c'); // pecs
    R(ctx, cx + 1, tTop + 3, 3, 1, '#0000001c');
    R(ctx, cx - 3, tTop + 5, 6, 1, '#00000014'); // ab line
    R(ctx, cx - 4, tTop + 1, 8, 1, ramp.trim); // baldric strap
    PX(ctx, cx, tTop + 1, ramp.trimHi);
    R(ctx, cx - 5, tTop + 6, 10, 2, ramp.cloth1); // fur loincloth/belt
    R(ctx, cx - 5, tTop + 6, 10, 1, ramp.cloth2);
    R(ctx, cx - 1, tTop + 6, 2, 2, ramp.trim); // buckle
  } else if (cls === 'strider') {
    // dark leather ranger tunic with a baldric
    R(ctx, cx - 5, tTop, 10, 8, ramp.cloth1);
    R(ctx, cx - 5, tTop, 10, 1, ramp.cloth2);
    R(ctx, cx - 5, tTop, 2, 8, ramp.cloth2);
    R(ctx, cx + 3, tTop, 2, 8, ramp.cloth0);
    R(ctx, cx - 4, tTop + 1, 8, 1, ramp.trim);
    R(ctx, cx - 4, tTop + 4, 8, 1, ramp.cloth0);
    R(ctx, cx - 1, tTop + 2, 2, 3, ramp.cloth2);
  } else {
    // robe upper body
    R(ctx, cx - 5, tTop, 10, 8, ramp.cloth1);
    R(ctx, cx - 5, tTop, 10, 1, ramp.cloth2);
    R(ctx, cx - 5, tTop, 2, 8, ramp.cloth2);
    R(ctx, cx + 3, tTop, 2, 8, ramp.cloth0);
    if (cls === 'warden') {
      R(ctx, cx - 1, tTop + 2, 2, 4, ramp.trim); // gold holy symbol
      R(ctx, cx - 2, tTop + 3, 4, 2, ramp.trim);
      PX(ctx, cx, tTop + 3, ramp.trimHi);
    } else {
      R(ctx, cx - 5, tTop + 6, 10, 1, ramp.trim); // sash + arcane glow
      PX(ctx, cx, tTop + 3, C.magicCore);
      PX(ctx, cx - 3, tTop + 4, ramp.trim);
      PX(ctx, cx + 2, tTop + 4, ramp.trim);
    }
  }

  // ---- shoulders ----
  if (cls === 'vanguard') {
    R(ctx, cx - 6, tTop, 2, 3, ramp.cloth1); // fur pauldron
    R(ctx, cx - 6, tTop, 2, 1, ramp.cloth2);
    R(ctx, cx + 4, tTop, 2, 3, ramp.skin); // bare shoulder
  }

  // ---- arms + hands ----
  if (cls === 'arcanist' || cls === 'warden') {
    R(ctx, cx - 7, tTop + 1, 2, 6, ramp.cloth1); // wide sleeves
    R(ctx, cx + 5, tTop + 1, 2, 6, ramp.cloth1);
    R(ctx, cx - 7, tTop + 1, 2, 1, ramp.cloth2);
    R(ctx, cx - 7, tTop + 6, 2, 1, ramp.skin); // hands
    R(ctx, cx + 5, tTop + 6, 2, 1, ramp.skin);
  } else {
    const armC = cls === 'vanguard' ? ramp.skin : ramp.cloth1;
    R(ctx, cx - 6, tTop + 1, 2, 5, armC);
    R(ctx, cx + 4, tTop + 1, 2, 5, armC);
    R(ctx, cx - 6, tTop + 5, 2, 1, ramp.skin); // hands
    R(ctx, cx + 4, tTop + 5, 2, 1, ramp.skin);
    if (cls === 'vanguard') {
      R(ctx, cx - 6, tTop + 4, 2, 1, ramp.trim); // bracers
      R(ctx, cx + 4, tTop + 4, 2, 1, ramp.trim);
    }
  }

  // ---- head ----
  R(ctx, cx - 3, hTop, 6, 6, ramp.skin);
  R(ctx, cx - 3, hTop, 6, 1, ramp.skinHi);
  R(ctx, cx + 2, hTop + 1, 1, 5, '#00000022');

  if (cls === 'vanguard') {
    // black mane + red headband
    R(ctx, cx - 4, hTop - 1, 8, 2, ramp.hair);
    R(ctx, cx - 4, hTop, 1, 5, ramp.hair);
    R(ctx, cx + 3, hTop, 1, 5, ramp.hair);
    R(ctx, cx - 4, hTop + 1, 8, 1, C.hpLow); // headband
    PX(ctx, cx - 4, hTop + 1, '#ff8a7a');
  } else if (cls === 'strider') {
    // long flowing white hair
    R(ctx, cx - 4, hTop - 1, 8, 2, ramp.hair);
    R(ctx, cx - 5, hTop, 2, 8, ramp.hair); // long side locks
    R(ctx, cx + 3, hTop, 2, 8, ramp.hair);
    R(ctx, cx - 4, hTop - 1, 8, 1, ramp.trimHi);
  } else if (cls === 'arcanist') {
    // tall hat + long white beard
    R(ctx, cx - 4, hTop - 1, 8, 2, ramp.cloth2);
    R(ctx, cx - 4, hTop - 1, 8, 1, ramp.trimHi);
    R(ctx, cx - 3, hTop - 3, 6, 3, ramp.cloth2);
    R(ctx, cx - 3, hTop - 3, 1, 3, ramp.cloth1);
    PX(ctx, cx, hTop - 3, C.magicCore);
    R(ctx, cx - 4, hTop + 1, 8, 1, ramp.trim);
    R(ctx, cx - 3, hTop + 4, 6, 4, ramp.hair); // beard
    R(ctx, cx - 2, hTop + 8, 4, 2, ramp.hair);
    R(ctx, cx - 3, hTop + 4, 6, 1, '#ffffff');
  } else {
    // hooded cleric + halo
    R(ctx, cx - 4, hTop - 2, 8, 4, ramp.cloth2);
    R(ctx, cx - 4, hTop - 2, 8, 1, ramp.trimHi);
    R(ctx, cx - 5, hTop, 1, 6, ramp.cloth1);
    R(ctx, cx + 4, hTop, 1, 6, ramp.cloth1);
    PX(ctx, cx - 2, hTop - 3, '#fff4c0');
    PX(ctx, cx + 1, hTop - 3, '#fff4c0');
  }

  // ---- eyes ----
  if (cls !== 'arcanist') {
    const eye = cls === 'strider' ? '#c08aff' : '#2a3b6a'; // drow lavender eyes
    if (facing === 'down') {
      PX(ctx, cx - 2, hTop + 3, eye);
      PX(ctx, cx + 1, hTop + 3, eye);
    } else if (facing === 'side') {
      PX(ctx, cx + 1, hTop + 3, cls === 'strider' ? '#c08aff' : '#1a1024');
      R(ctx, cx + 2, hTop + 2, 1, 2, ramp.skinHi);
    }
  }

  if (facing !== 'up') drawWeapon(ctx, ox, cls, ramp, facing, pose);
}

// ============================================================================
// MONSTERS
// ============================================================================
export function drawGrunt(ctx: Ctx, ox: number, frame: number, r: MonsterRamp): void {
  const cx = ox + MON_FW / 2;
  const bob = frame === 1 ? -1 : frame === 3 ? 1 : 0;
  const lunge = frame === 3 ? 2 : 0;
  R(ctx, cx - 5, 8 + bob, 10, 9, r.body1);
  R(ctx, cx - 5, 8 + bob, 10, 1, r.body2);
  R(ctx, cx - 5, 8 + bob, 2, 9, r.body2);
  R(ctx, cx + 3, 8 + bob, 2, 9, r.body0);
  R(ctx, cx - 2, 11 + bob, 4, 4, r.accent);
  R(ctx, cx - 5, 5 + bob, 2, 3, r.detail);
  R(ctx, cx + 3, 5 + bob, 2, 3, r.detail);
  PX(ctx, cx - 5, 4 + bob, r.body0);
  PX(ctx, cx + 4, 4 + bob, r.body0);
  R(ctx, cx - 3, 6 + bob, 6, 4, r.body1);
  R(ctx, cx - 2, 7 + bob, 2, 2, r.eye);
  R(ctx, cx + 1, 7 + bob, 2, 2, r.eye);
  PX(ctx, cx - 2, 7 + bob, '#ffffff');
  PX(ctx, cx + 1, 7 + bob, '#ffffff');
  if (frame === 3) {
    R(ctx, cx - 2, 10 + bob, 4, 1, '#1a0a0a');
    PX(ctx, cx - 2, 10 + bob, '#ffffff');
    PX(ctx, cx + 1, 10 + bob, '#ffffff');
  }
  R(ctx, cx - 4, 17 + bob, 3, 3, r.body0);
  R(ctx, cx + 1, 17 + bob, 3, 3, r.body0);
  R(ctx, cx - 6 - lunge, 10 + bob, 2, 4, r.body1);
  R(ctx, cx + 4 + lunge, 10 + bob, 2, 4, r.body1);
  PX(ctx, cx - 6 - lunge, 14 + bob, r.accent);
  PX(ctx, cx + 5 + lunge, 14 + bob, r.accent);
}

export function drawGhost(ctx: Ctx, ox: number, frame: number, r: MonsterRamp): void {
  const cx = ox + MON_FW / 2;
  const bob = [0, -1, -2, -1][frame % 4];
  ctx.globalAlpha = 0.92;
  R(ctx, cx - 5, 6 + bob, 10, 9, r.body1);
  R(ctx, cx - 4, 4 + bob, 8, 3, r.body1);
  R(ctx, cx - 3, 3 + bob, 6, 2, r.body2);
  R(ctx, cx - 5, 6 + bob, 2, 9, r.body2);
  R(ctx, cx + 3, 6 + bob, 2, 9, r.body0);
  const phase = frame % 4;
  for (let i = 0; i < 5; i++) {
    const wob = ((i + phase) % 2) * 2;
    R(ctx, cx - 5 + i * 2, 15 + bob - wob, 2, 3 + wob, r.body1);
  }
  R(ctx, cx - 3, 7 + bob, 2, 3, r.detail);
  R(ctx, cx + 1, 7 + bob, 2, 3, r.detail);
  R(ctx, cx - 3, 7 + bob, 2, 1, r.eye);
  R(ctx, cx + 1, 7 + bob, 2, 1, r.eye);
  PX(ctx, cx - 3, 5 + bob, r.accent);
  ctx.globalAlpha = 1;
}

export function drawDemon(ctx: Ctx, ox: number, frame: number, r: MonsterRamp): void {
  const cx = ox + MON_FW / 2;
  const bob = frame === 1 ? -1 : frame === 2 ? -1 : 0;
  const wing = frame === 3 ? 2 : frame === 1 ? 1 : 0;
  R(ctx, cx - 8 - wing, 7 + bob, 3, 6, r.body0);
  R(ctx, cx + 5 + wing, 7 + bob, 3, 6, r.body0);
  R(ctx, cx - 8 - wing, 7 + bob, 1, 6, r.detail);
  R(ctx, cx + 7 + wing, 7 + bob, 1, 6, r.detail);
  R(ctx, cx - 5, 8 + bob, 10, 9, r.body1);
  R(ctx, cx - 5, 8 + bob, 2, 9, r.body2);
  R(ctx, cx + 3, 8 + bob, 2, 9, r.body0);
  R(ctx, cx - 2, 11 + bob, 4, 4, r.accent);
  PX(ctx, cx, 12 + bob, C.fireCore);
  R(ctx, cx - 5, 4 + bob, 2, 4, r.detail);
  R(ctx, cx + 3, 4 + bob, 2, 4, r.detail);
  PX(ctx, cx - 6, 3 + bob, r.detail);
  PX(ctx, cx + 5, 3 + bob, r.detail);
  R(ctx, cx - 3, 6 + bob, 6, 4, r.body1);
  R(ctx, cx - 2, 7 + bob, 2, 2, r.eye);
  R(ctx, cx + 1, 7 + bob, 2, 2, r.eye);
  PX(ctx, cx - 2, 7 + bob, '#fff');
  PX(ctx, cx + 1, 7 + bob, '#fff');
  R(ctx, cx - 4, 17 + bob, 3, 3, r.body0);
  R(ctx, cx + 1, 17 + bob, 3, 3, r.body0);
  R(ctx, cx + 4, 15 + bob, 3, 1, r.body0);
  PX(ctx, cx + 7, 15 + bob, r.accent);
  if (frame === 3) {
    R(ctx, cx - 2, 10 + bob, 4, 1, '#1a0000');
    PX(ctx, cx - 2, 10 + bob, '#fff');
    PX(ctx, cx + 1, 10 + bob, '#fff');
  }
}

export function drawBoss(ctx: Ctx, ox: number, frame: number, r: MonsterRamp): void {
  const cx = ox + BOSS_FW / 2;
  const bob = [0, -1, -2, 0][frame % 4];
  const cast = frame === 3;
  R(ctx, cx - 12, 12 + bob, 24, 22, r.body0);
  R(ctx, cx - 12, 12 + bob, 2, 22, r.body1);
  R(ctx, cx + 10, 12 + bob, 2, 22, r.detail);
  for (let i = 0; i < 6; i++) {
    const h = (i % 2) * 3;
    R(ctx, cx - 12 + i * 4, 32 + bob - h, 3, 4 + h, r.body0);
  }
  R(ctx, cx - 7, 14 + bob, 14, 14, r.body1);
  R(ctx, cx - 7, 14 + bob, 14, 1, r.body2);
  for (let i = 0; i < 4; i++) R(ctx, cx - 6, 17 + bob + i * 2, 12, 1, r.detail);
  R(ctx, cx - 3, 18 + bob, 6, 6, r.accent);
  R(ctx, cx - 1, 20 + bob, 2, 2, C.portalCore);
  R(ctx, cx - 11, 13 + bob, 5, 4, r.body0);
  R(ctx, cx + 6, 13 + bob, 5, 4, r.body0);
  R(ctx, cx - 11, 11 + bob, 2, 3, r.detail);
  R(ctx, cx + 9, 11 + bob, 2, 3, r.detail);
  R(ctx, cx - 5, 4 + bob, 10, 9, '#d8dce8');
  R(ctx, cx - 5, 4 + bob, 10, 1, '#ffffff');
  R(ctx, cx - 4, 7 + bob, 3, 3, r.detail);
  R(ctx, cx + 1, 7 + bob, 3, 3, r.detail);
  R(ctx, cx - 4, 7 + bob, 3, 2, r.eye);
  R(ctx, cx + 1, 7 + bob, 3, 2, r.eye);
  R(ctx, cx - 3, 11 + bob, 6, 2, '#9aa0b4');
  for (let i = 0; i < 5; i++) PX(ctx, cx - 2 + i, 12 + bob, r.detail);
  R(ctx, cx - 5, 2 + bob, 10, 2, C.coinMid);
  R(ctx, cx - 5, 1 + bob, 1, 2, C.coinHi);
  R(ctx, cx - 1, 0 + bob, 2, 2, C.coinHi);
  R(ctx, cx + 4, 1 + bob, 1, 2, C.coinHi);
  PX(ctx, cx, 1 + bob, C.gem);
  const ay = cast ? 6 : 10;
  R(ctx, cx + 9, ay + bob, 2, 14, r.body1);
  R(ctx, cx + 7, ay - 2 + bob, 6, 2, '#aeb6cc');
  R(ctx, cx + 12, ay - 4 + bob, 2, 4, '#dfe6ff');
  if (cast) {
    R(ctx, cx - 14, 16 + bob, 4, 4, r.accent);
    PX(ctx, cx - 13, 17 + bob, C.portalCore);
  }
}
