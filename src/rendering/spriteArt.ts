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

// Heroes render at 2x detail (HD): a 40x48 frame with finely shaded pixel art.
// Hero.ts halves its base display scale to keep on-screen size unchanged.
export const HERO_FW = 40;
export const HERO_FH = 48;
export const MON_FW = 44;
export const MON_FH = 44;
export const BOSS_FW = 80;
export const BOSS_FH = 80;

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

// A carved, glowing wall decoration — themed per realm, with several motifs
// (rune ring, diamond sigil, barred window, gargoyle, mounted shield) so the
// dungeon walls feel richly decorated rather than repetitive.
export function drawWallArt(ctx: Ctx, ox: number, oy: number, theme: ThemeId, seed: number): void {
  const accents: Record<ThemeId, string> = {
    crypt: '#9ab0e8',
    molten: '#ff9a3a',
    frost: '#cfeaff',
    toxic: '#a8e05a',
    clockwork: '#f0cc66',
    arena: '#ff8a4a',
    bog: '#92b86a',
    storm: '#c0d4ff',
    shadow: '#c79bff',
    sanctum: '#ffe07a',
    town: '#e0bd84',
  };
  const col = accents[theme] ?? '#9ab0e8';
  const cx = ox + 8;
  const cy = oy + 7;
  const r = rng(seed * 2654435761 + 7);
  const motif = Math.floor(r() * 5);

  // carved recess + lit top edge (common to all motifs)
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(ox + 2, oy + 1, 12, 12);
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(ox + 2, oy + 1, 12, 1);
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(ox + 2, oy + 12, 12, 1);

  if (motif === 0) {
    // rune ring + cross sigil
    ctx.strokeStyle = col;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, 3.6, 0, Math.PI * 2);
    ctx.stroke();
    R(ctx, cx - 2, cy, 5, 1, col);
    R(ctx, cx, cy - 2, 1, 5, col);
    PX(ctx, cx, cy, '#ffffff');
    for (const [dx, dy] of [[-3, -3], [3, -3], [-3, 3], [3, 3]] as [number, number][]) PX(ctx, cx + dx, cy + dy, col);
  } else if (motif === 1) {
    // diamond sigil with a gem
    for (const [dx, dy] of [[0, -4], [-2, -2], [2, -2], [-4, 0], [4, 0], [-2, 2], [2, 2], [0, 4]] as [number, number][]) PX(ctx, cx + dx, cy + dy, col);
    R(ctx, cx - 1, cy - 1, 2, 2, col);
    PX(ctx, cx, cy, '#ffffff');
  } else if (motif === 2) {
    // barred arrow-slit window
    R(ctx, cx - 3, cy - 4, 7, 1, col);
    R(ctx, cx - 3, cy + 4, 7, 1, col);
    for (const bx of [-3, -1, 1, 3]) R(ctx, cx + bx, cy - 3, 1, 7, col);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(cx - 2, cy - 3, 1, 7);
  } else if (motif === 3) {
    // gargoyle visage with glowing eyes
    R(ctx, cx - 3, cy - 2, 6, 1, col); // brow
    R(ctx, cx - 2, cy - 1, 1, 2, col); // eyes
    R(ctx, cx + 1, cy - 1, 1, 2, col);
    PX(ctx, cx - 2, cy - 1, '#ffffff');
    PX(ctx, cx + 1, cy - 1, '#ffffff');
    R(ctx, cx - 2, cy + 2, 4, 1, col); // mouth
    PX(ctx, cx - 2, cy + 3, col);
    PX(ctx, cx + 1, cy + 3, col);
  } else {
    // mounted round shield / boss with rivets
    ctx.strokeStyle = col;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.stroke();
    R(ctx, cx - 1, cy - 1, 2, 2, col);
    PX(ctx, cx, cy, '#ffffff');
    for (const [dx, dy] of [[0, -4], [0, 4], [-4, 0], [4, 0]] as [number, number][]) PX(ctx, cx + dx, cy + dy, col);
  }
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
  R(ctx, ox + 8, oy, 16, 32, C.wallBase);
  R(ctx, ox + 8, oy, 4, 32, C.wallLit);
  R(ctx, ox + 20, oy, 4, 32, C.wallDark);
  R(ctx, ox + 6, oy, 20, 4, C.wallMid); // capital
  R(ctx, ox + 6, oy + 28, 20, 4, C.wallMid); // base
  R(ctx, ox + 8, oy, 16, 2, C.wallHi);
  R(ctx, ox + 12, oy + 6, 1, 20, 'rgba(0,0,0,0.16)'); // flute grooves
  R(ctx, ox + 19, oy + 6, 1, 20, 'rgba(0,0,0,0.16)');
  R(ctx, ox + 15, oy + 6, 2, 20, 'rgba(255,255,255,0.06)');
}

export function drawBones(ctx: Ctx, ox: number, oy: number): void {
  const b = '#cdd2e0';
  const d = '#7d839a';
  R(ctx, ox + 6, oy + 22, 16, 2, b);
  R(ctx, ox + 5, oy + 21, 2, 4, b); R(ctx, ox + 21, oy + 21, 2, 4, b); // bone ends
  R(ctx, ox + 8, oy + 27, 12, 2, b);
  R(ctx, ox + 20, oy + 24, 2, 2, d);
  R(ctx, ox + 12, oy + 15, 8, 7, b); // skull
  R(ctx, ox + 12, oy + 15, 8, 1, '#eef0f6');
  R(ctx, ox + 14, oy + 18, 2, 2, '#202433'); // eyes
  R(ctx, ox + 17, oy + 18, 2, 2, '#202433');
  R(ctx, ox + 15, oy + 21, 2, 1, d); // jaw
}

export function drawRubble(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 8, oy + 20, 9, 7, C.wallMid);
  R(ctx, ox + 16, oy + 22, 7, 5, C.wallDark);
  R(ctx, ox + 11, oy + 17, 5, 4, C.wallLit);
  R(ctx, ox + 8, oy + 20, 9, 1, C.wallHi);
  R(ctx, ox + 11, oy + 17, 5, 1, C.wallHi);
  PX(ctx, ox + 10, oy + 26, C.wallHi);
  PX(ctx, ox + 19, oy + 25, C.wallBase);
}

export function drawBanner(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 10, oy + 2, 12, 22, '#2b59b0');
  R(ctx, ox + 10, oy + 2, 12, 2, C.coinMid); // gold rod
  R(ctx, ox + 10, oy + 2, 3, 22, '#3f72d0'); // lit fold
  R(ctx, ox + 19, oy + 2, 3, 22, '#1d3f86'); // shadow fold
  R(ctx, ox + 14, oy + 6, 4, 10, C.coinHi); // sigil bar
  R(ctx, ox + 13, oy + 9, 6, 3, C.coinHi);
  R(ctx, ox + 10, oy + 24, 4, 4, C.hudBg); // swallowtail
  R(ctx, ox + 18, oy + 24, 4, 4, C.hudBg);
}

export function drawCrystal(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 18, oy + 10, 4, 18, C.crystalDk); // back shard
  R(ctx, ox + 18, oy + 8, 4, 4, C.crystal);
  R(ctx, ox + 10, oy + 12, 6, 16, C.crystal); // main shard
  R(ctx, ox + 10, oy + 12, 2, 16, C.crystalHi);
  R(ctx, ox + 12, oy + 6, 2, 8, C.crystal);
  R(ctx, ox + 12, oy + 6, 1, 8, C.crystalHi);
  PX(ctx, ox + 12, oy + 5, C.crystalHi);
  R(ctx, ox + 6, oy + 20, 4, 8, C.crystalDk); // small shard
  PX(ctx, ox + 6, oy + 19, C.crystal);
  ctx.globalAlpha = 0.6;
  R(ctx, ox + 4, oy + 26, 22, 3, C.iceHi); // frost base
  ctx.globalAlpha = 1;
}

export function drawCog(ctx: Ctx, ox: number, oy: number): void {
  const cx = ox + 16;
  const cy = oy + 16;
  for (let a = 0; a < 10; a++) {
    const ang = (a / 10) * Math.PI * 2;
    R(ctx, Math.round(cx + Math.cos(ang) * 12) - 2, Math.round(cy + Math.sin(ang) * 12) - 2, 4, 4, C.cog);
  }
  ctx.fillStyle = C.cog; ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = C.cogHi; ctx.beginPath(); ctx.arc(cx - 2, cy - 2, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = C.cogDk; ctx.beginPath(); ctx.arc(cx, cy, 3.4, 0, Math.PI * 2); ctx.fill();
  PX(ctx, cx - 3, cy - 3, '#fff0c0');
}

export function drawVines(ctx: Ctx, ox: number, oy: number): void {
  for (const [vx, len] of [[8, 22], [16, 28], [24, 18]] as [number, number][]) {
    for (let i = 0; i < len; i += 2) {
      R(ctx, ox + vx + (i % 4 === 0 ? 0 : 2), oy + i, 2, 2, i % 6 === 0 ? C.vineHi : C.vine);
    }
    R(ctx, ox + vx - 2, oy + len - 2, 6, 4, C.vineHi); // leaf
    R(ctx, ox + vx - 1, oy + len - 1, 4, 2, C.vine);
  }
}

export function drawBloodStain(ctx: Ctx, ox: number, oy: number): void {
  ctx.fillStyle = C.bloodDark; ctx.beginPath(); ctx.ellipse(ox + 16, oy + 18, 11, 7, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = C.bloodMid; ctx.beginPath(); ctx.ellipse(ox + 14, oy + 16, 6, 3.6, 0, 0, Math.PI * 2); ctx.fill();
  R(ctx, ox + 25, oy + 11, 2, 2, C.bloodMid); // splatter
  R(ctx, ox + 6, oy + 24, 2, 2, C.bloodDark);
  R(ctx, ox + 24, oy + 24, 2, 2, C.bloodDark);
  PX(ctx, ox + 13, oy + 15, '#c44');
}

export function drawSkullPike(ctx: Ctx, ox: number, oy: number): void {
  const b = '#d8dce8';
  R(ctx, ox + 14, oy + 12, 4, 18, '#5a4a2a'); // pole
  R(ctx, ox + 14, oy + 12, 1, 18, '#7a6238');
  R(ctx, ox + 10, oy + 4, 12, 10, b); // cranium
  R(ctx, ox + 10, oy + 4, 12, 2, '#f2f4fa');
  R(ctx, ox + 12, oy + 14, 8, 4, b); // jaw
  R(ctx, ox + 12, oy + 8, 3, 3, '#202433'); // eyes
  R(ctx, ox + 18, oy + 8, 3, 3, '#202433');
  R(ctx, ox + 15, oy + 12, 2, 2, '#202433'); // nose
  for (let i = 0; i < 3; i++) PX(ctx, ox + 13 + i * 3, oy + 17, '#5a5f70'); // teeth gaps
}

export function drawBogStump(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 8, oy + 14, 16, 14, '#3a2a1a');
  R(ctx, ox + 8, oy + 14, 16, 3, '#3f6a2e'); // moss cap
  R(ctx, ox + 8, oy + 14, 4, 14, '#4e3a22'); // lit side
  R(ctx, ox + 20, oy + 14, 4, 14, '#241a10'); // shade
  PX(ctx, ox + 12, oy + 14, '#7fce58'); PX(ctx, ox + 18, oy + 15, '#7fce58');
  R(ctx, ox + 12, oy + 18, 2, 8, '#241a10'); // bark cracks
  R(ctx, ox + 18, oy + 18, 2, 8, '#241a10');
  R(ctx, ox + 4, oy + 26, 8, 2, '#2a1e12'); // roots
  R(ctx, ox + 20, oy + 26, 8, 2, '#2a1e12');
}

export function drawLilypad(ctx: Ctx, ox: number, oy: number): void {
  ctx.fillStyle = '#2f6a34'; ctx.beginPath(); ctx.ellipse(ox + 16, oy + 18, 12, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3f8a3a'; ctx.beginPath(); ctx.ellipse(ox + 14, oy + 16, 8, 5, 0, 0, Math.PI * 2); ctx.fill();
  R(ctx, ox + 16, oy + 18, 8, 2, '#16331c'); // wedge cut
  R(ctx, ox + 11, oy + 13, 5, 4, '#e8c0e0'); // bloom
  R(ctx, ox + 12, oy + 14, 3, 2, '#fff0fa');
}

export function drawStormRod(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 14, oy + 8, 4, 22, '#8b94a8'); // pole
  R(ctx, ox + 14, oy + 8, 1, 22, '#cfe0ff');
  R(ctx, ox + 10, oy + 26, 12, 4, '#444b60'); // base
  ctx.fillStyle = '#b0c8ff'; ctx.beginPath(); ctx.arc(ox + 16, oy + 5, 5, 0, Math.PI * 2); ctx.fill();
  PX(ctx, ox + 16, oy + 1, '#ffffff');
  PX(ctx, ox + 10, oy + 4, '#7fd0ff'); PX(ctx, ox + 21, oy + 4, '#7fd0ff');
  R(ctx, ox + 15, oy + 10, 2, 4, '#eaf4ff'); // crackle down pole
}

export function drawSkyCrystal(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 14, oy + 6, 4, 20, '#6fb0d8');
  R(ctx, ox + 12, oy + 10, 8, 12, '#9fd8ff');
  R(ctx, ox + 14, oy + 8, 4, 16, '#cfeeff');
  R(ctx, ox + 15, oy + 8, 1, 14, '#ffffff');
  PX(ctx, ox + 16, oy + 9, '#ffffff');
  R(ctx, ox + 12, oy + 16, 2, 3, '#4a8ab0'); R(ctx, ox + 18, oy + 18, 2, 3, '#4a8ab0');
}

export function drawVoidRift(ctx: Ctx, ox: number, oy: number): void {
  ctx.fillStyle = '#0c0814'; ctx.beginPath(); ctx.ellipse(ox + 16, oy + 16, 10, 12, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#241636'; ctx.beginPath(); ctx.ellipse(ox + 16, oy + 16, 6, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3a2456'; ctx.beginPath(); ctx.ellipse(ox + 16, oy + 16, 3, 4, 0, 0, Math.PI * 2); ctx.fill();
  PX(ctx, ox + 16, oy + 9, '#8a6ab0');
  R(ctx, ox + 14, oy + 18, 2, 2, '#b58aff');
  PX(ctx, ox + 18, oy + 22, '#6a4f9a');
}

export function drawSanctumGlyph(ctx: Ctx, ox: number, oy: number): void {
  const g = '#ecdca6';
  R(ctx, ox + 8, oy + 16, 16, 2, g);
  R(ctx, ox + 16, oy + 8, 2, 16, g);
  R(ctx, ox + 16, oy + 7, 2, 2, '#fff4cf'); // points
  R(ctx, ox + 7, oy + 16, 2, 2, g); R(ctx, ox + 23, oy + 16, 2, 2, g); R(ctx, ox + 16, oy + 23, 2, 2, g);
  ctx.strokeStyle = '#b0962e'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(ox + 16, oy + 16, 7, 0, Math.PI * 2); ctx.stroke();
  PX(ctx, ox + 12, oy + 12, '#fff4cf'); PX(ctx, ox + 20, oy + 20, '#fff4cf');
}

export function drawBrazier(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 12, oy + 18, 8, 10, '#7a5e2a'); // stem
  R(ctx, ox + 12, oy + 18, 2, 10, '#a07e36');
  R(ctx, ox + 10, oy + 26, 12, 2, '#4a3812'); // foot
  R(ctx, ox + 8, oy + 14, 16, 6, '#e6c264'); // bowl
  R(ctx, ox + 8, oy + 14, 16, 2, '#fff0b0');
  R(ctx, ox + 8, oy + 18, 16, 2, '#a07e36');
  R(ctx, ox + 12, oy + 8, 8, 6, C.fireMid); // flame
  R(ctx, ox + 14, oy + 4, 4, 6, C.fireCore);
  PX(ctx, ox + 16, oy + 2, '#fff2b0');
}

export function drawGravestone(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 10, oy + 6, 12, 22, '#6a7388');
  R(ctx, ox + 12, oy + 4, 8, 4, '#6a7388'); // rounded top
  R(ctx, ox + 10, oy + 6, 12, 2, '#9aa0b4'); // lit
  R(ctx, ox + 20, oy + 6, 2, 22, '#4a5168'); // shade
  R(ctx, ox + 14, oy + 12, 4, 10, '#3a3f52'); // cross
  R(ctx, ox + 12, oy + 14, 8, 2, '#3a3f52');
  R(ctx, ox + 6, oy + 26, 20, 4, '#2a1d12'); // mound
  PX(ctx, ox + 8, oy + 25, '#3c4a26'); PX(ctx, ox + 20, oy + 24, '#3c4a26');
}

export function drawCandle(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 13, oy + 14, 6, 14, '#e0dcc0');
  R(ctx, ox + 13, oy + 14, 2, 14, '#ffffff'); // lit side
  R(ctx, ox + 18, oy + 14, 1, 14, '#b8b49a'); // shade
  R(ctx, ox + 11, oy + 26, 10, 2, '#5a3a1c'); // holder
  R(ctx, ox + 14, oy + 8, 4, 6, C.fireMid); // flame
  R(ctx, ox + 15, oy + 5, 2, 4, C.fireCore);
  PX(ctx, ox + 15, oy + 4, '#fff2b0');
}

export function drawLavaCrack(ctx: Ctx, ox: number, oy: number): void {
  ctx.strokeStyle = '#ff8a1e'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(ox + 4, oy + 18); ctx.lineTo(ox + 12, oy + 12); ctx.lineTo(ox + 18, oy + 22); ctx.lineTo(ox + 28, oy + 16); ctx.stroke();
  ctx.strokeStyle = '#ffd98a'; ctx.lineWidth = 1; ctx.stroke();
  R(ctx, ox + 11, oy + 11, 3, 3, '#fff2b0');
  R(ctx, ox + 17, oy + 21, 3, 3, '#fff2b0');
}

export function drawObsidian(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 8, oy + 14, 16, 14, '#1a1018');
  R(ctx, ox + 12, oy + 10, 8, 6, '#241624');
  R(ctx, ox + 8, oy + 14, 16, 2, '#3a2a3a'); // sheen
  R(ctx, ox + 9, oy + 16, 3, 8, '#2e1e2e');
  PX(ctx, ox + 14, oy + 18, '#c4451c'); // embers
  R(ctx, ox + 17, oy + 21, 2, 2, '#ff8a1e');
  PX(ctx, ox + 12, oy + 24, '#c4451c');
}

export function drawIcicle(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 6, oy, 22, 2, '#cfeeff');
  for (const [x, len] of [[10, 14], [16, 20], [22, 12]] as [number, number][]) {
    for (let i = 0; i < len; i++) {
      const w = Math.max(1, Math.round((1 - i / len) * 4));
      R(ctx, ox + x - (w >> 1), oy + i, w, 1, i < 4 ? '#eaf6ff' : '#9fd8ff');
    }
    PX(ctx, ox + x, oy + 2, '#ffffff');
  }
}

export function drawFrostBanner(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 10, oy + 2, 12, 24, '#3a6a9a');
  R(ctx, ox + 10, oy + 2, 12, 2, '#cfeaff'); // rod
  R(ctx, ox + 10, oy + 2, 3, 24, '#5a8ec0'); // lit fold
  R(ctx, ox + 19, oy + 2, 3, 24, '#2a527a'); // shade
  R(ctx, ox + 14, oy + 8, 4, 4, '#cfeaff'); // snowflake
  R(ctx, ox + 12, oy + 13, 8, 2, '#cfeaff');
  R(ctx, ox + 10, oy + 26, 3, 3, '#3a6a9a'); R(ctx, ox + 16, oy + 26, 3, 3, '#3a6a9a'); R(ctx, ox + 20, oy + 26, 2, 3, '#3a6a9a');
}

export function drawToxicMushroom(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 12, oy + 18, 4, 10, '#cfc0a0'); // stalk
  R(ctx, ox + 12, oy + 18, 1, 10, '#e8dcc0');
  R(ctx, ox + 8, oy + 12, 12, 6, '#6a2c8a'); // cap
  R(ctx, ox + 8, oy + 12, 12, 2, '#9a4cc0');
  R(ctx, ox + 12, oy + 14, 3, 2, '#e0b0ff'); R(ctx, ox + 17, oy + 16, 3, 2, '#e0b0ff'); // spots
  R(ctx, ox + 19, oy + 21, 4, 7, '#cfc0a0'); // small one
  R(ctx, ox + 17, oy + 17, 8, 5, '#7a3a9a');
  R(ctx, ox + 17, oy + 17, 8, 1, '#9a4cc0');
  R(ctx, ox + 8, oy + 26, 16, 2, '#3f8a3a'); // moss
}

export function drawPipe(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 4, oy + 12, 24, 8, '#5a4a28');
  R(ctx, ox + 4, oy + 12, 24, 2, '#8a6e34'); // lit
  R(ctx, ox + 4, oy + 18, 24, 2, '#2a2214'); // shade
  R(ctx, ox + 2, oy + 10, 6, 12, '#7a5e2a'); // flanges
  R(ctx, ox + 24, oy + 10, 6, 12, '#7a5e2a');
  R(ctx, ox + 2, oy + 10, 6, 2, '#a07e36');
  R(ctx, ox + 24, oy + 10, 6, 2, '#a07e36');
  PX(ctx, ox + 6, oy + 14, '#e6c264'); PX(ctx, ox + 26, oy + 14, '#e6c264');
}

export function drawGauge(ctx: Ctx, ox: number, oy: number): void {
  ctx.fillStyle = '#2a2214'; ctx.beginPath(); ctx.arc(ox + 16, oy + 16, 10, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#e6c264'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ox + 16, oy + 16, 10, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#1a160c'; ctx.beginPath(); ctx.arc(ox + 16, oy + 16, 7, 0, Math.PI * 2); ctx.fill();
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; PX(ctx, Math.round(ox + 16 + Math.cos(a) * 7), Math.round(oy + 16 + Math.sin(a) * 7), '#e6c264'); }
  ctx.strokeStyle = '#ff5a3a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(ox + 16, oy + 16); ctx.lineTo(ox + 22, oy + 10); ctx.stroke();
  R(ctx, ox + 15, oy + 15, 2, 2, '#fff4cf');
}

export function drawWeaponRack(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 4, oy + 26, 24, 2, '#3a2614'); // base
  R(ctx, ox + 4, oy + 4, 2, 24, '#5a3a1c'); // frame
  R(ctx, ox + 26, oy + 4, 2, 24, '#5a3a1c');
  R(ctx, ox + 4, oy + 4, 24, 2, '#5a3a1c');
  R(ctx, ox + 4, oy + 4, 24, 1, '#7a5128');
  R(ctx, ox + 10, oy + 6, 2, 18, '#b9c4dd'); // sword
  R(ctx, ox + 8, oy + 22, 6, 2, '#caa56a');
  R(ctx, ox + 17, oy + 5, 2, 21, '#caa56a'); // spear
  R(ctx, ox + 17, oy + 3, 2, 4, '#dfe6ff');
  R(ctx, ox + 22, oy + 8, 2, 16, '#8a5a30'); // axe haft
  R(ctx, ox + 21, oy + 7, 5, 4, '#b9c4dd');
}

export function drawDeadTree(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 14, oy + 12, 4, 16, '#2a1e12'); // trunk
  R(ctx, ox + 14, oy + 12, 2, 16, '#3a2a18');
  R(ctx, ox + 8, oy + 10, 6, 2, '#2a1e12'); // branches
  R(ctx, ox + 6, oy + 6, 3, 4, '#2a1e12');
  R(ctx, ox + 18, oy + 8, 6, 2, '#2a1e12');
  R(ctx, ox + 22, oy + 4, 3, 4, '#2a1e12');
  R(ctx, ox + 15, oy + 4, 2, 8, '#2a1e12'); // top
  PX(ctx, ox + 7, oy + 7, '#3f6a2e'); PX(ctx, ox + 23, oy + 5, '#3f6a2e'); // moss
  R(ctx, ox + 11, oy + 26, 10, 2, '#16240f');
}

export function drawCattail(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 10, oy + 8, 2, 20, '#3f7a34'); // reeds
  R(ctx, ox + 18, oy + 6, 2, 22, '#3f7a34');
  R(ctx, ox + 22, oy + 12, 2, 16, '#3f7a34');
  R(ctx, ox + 8, oy + 12, 4, 6, '#5a3a1c'); // heads
  R(ctx, ox + 16, oy + 10, 4, 6, '#5a3a1c');
  R(ctx, ox + 8, oy + 12, 2, 6, '#6e4a24');
  PX(ctx, ox + 10, oy + 6, '#7fce58'); PX(ctx, ox + 18, oy + 4, '#7fce58');
}

export function drawStormOrb(ctx: Ctx, ox: number, oy: number): void {
  ctx.fillStyle = '#3a4a90'; ctx.beginPath(); ctx.arc(ox + 16, oy + 14, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#7f9aff'; ctx.beginPath(); ctx.arc(ox + 16, oy + 14, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#cfe0ff'; ctx.beginPath(); ctx.arc(ox + 15, oy + 13, 2.4, 0, Math.PI * 2); ctx.fill();
  PX(ctx, ox + 16, oy + 14, '#ffffff');
  for (const [dx, dy] of [[-9, -4], [9, 4], [-7, 7], [7, -7]] as [number, number][]) R(ctx, ox + 16 + dx, oy + 14 + dy, 2, 2, '#cfe0ff');
  R(ctx, ox + 12, oy + 26, 8, 2, '#2a2e4a'); // stand
}

export function drawBonePile(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 6, oy + 22, 20, 6, '#c9c2a6');
  R(ctx, ox + 6, oy + 22, 20, 2, '#efe9cf');
  R(ctx, ox + 12, oy + 16, 8, 8, '#efe9cf'); // skull
  R(ctx, ox + 14, oy + 20, 2, 2, '#3a3020'); R(ctx, ox + 18, oy + 20, 2, 2, '#3a3020'); // eyes
  R(ctx, ox + 8, oy + 18, 2, 6, '#c9c2a6'); R(ctx, ox + 22, oy + 18, 2, 6, '#c9c2a6'); // ribs
  R(ctx, ox + 10, oy + 25, 12, 1, '#9a957e');
  PX(ctx, ox + 16, oy + 26, '#8a6ab0');
}

export function drawRuneCircle(ctx: Ctx, ox: number, oy: number): void {
  ctx.strokeStyle = '#8a6ab0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ox + 16, oy + 16, 10, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = '#5a4080'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(ox + 16, oy + 16, 6, 0, Math.PI * 2); ctx.stroke();
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; R(ctx, Math.round(ox + 16 + Math.cos(a) * 10) - 1, Math.round(oy + 16 + Math.sin(a) * 10) - 1, 2, 2, '#c79bff'); }
  R(ctx, ox + 14, oy + 14, 4, 4, '#b58aff');
  PX(ctx, ox + 15, oy + 15, '#e8d0ff');
}

export function drawIdol(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 10, oy + 24, 12, 4, '#7a5e2a'); // base
  R(ctx, ox + 12, oy + 8, 8, 16, '#e6c264'); // body
  R(ctx, ox + 12, oy + 8, 3, 16, '#fff4cf'); // lit
  R(ctx, ox + 18, oy + 8, 2, 16, '#a07e36'); // shade
  R(ctx, ox + 10, oy + 6, 12, 6, '#e6c264'); // head
  R(ctx, ox + 10, oy + 6, 12, 1, '#fff4cf');
  R(ctx, ox + 13, oy + 9, 2, 2, '#3a2a10'); R(ctx, ox + 17, oy + 9, 2, 2, '#3a2a10'); // eyes
  R(ctx, ox + 14, oy + 15, 4, 4, '#fff4cf'); // chest gem
  PX(ctx, ox + 15, oy + 16, '#ffffff');
}

export function drawAltar(ctx: Ctx, ox: number, oy: number): void {
  R(ctx, ox + 6, oy + 18, 20, 10, '#a89c78'); // slab
  R(ctx, ox + 6, oy + 18, 20, 2, '#ecdca6'); // lit top
  R(ctx, ox + 22, oy + 18, 4, 10, '#7a6e50'); // shade
  R(ctx, ox + 8, oy + 26, 16, 2, '#3a3426'); // shadow
  R(ctx, ox + 10, oy + 12, 12, 6, '#8a7e5e'); // pedestal
  R(ctx, ox + 10, oy + 12, 12, 1, '#b0a47e');
  R(ctx, ox + 13, oy + 14, 6, 3, '#ffd24a'); // glyph
  PX(ctx, ox + 14, oy + 15, '#fff4cf'); PX(ctx, ox + 17, oy + 15, '#fff4cf');
}

// ============================================================================
// PICKUPS / ITEMS
// ============================================================================
export function drawCoin(ctx: Ctx, ox: number, frame: number): void {
  const widths = [8, 5, 2, 5];
  const w = widths[frame % 4];
  const x = ox + 8 - w / 2;
  R(ctx, x, 4, w, 8, C.coinMid);
  R(ctx, x, 4, w, 2, C.coinHi);
  R(ctx, x, 11, w, 1, C.coinDark);
  if (w >= 5) {
    R(ctx, ox + 7, 6, 2, 4, '#b8860f');
    PX(ctx, ox + 7, 6, C.coinHi);
    PX(ctx, ox + 8, 9, C.coinDark);
  }
}

export function drawGem(ctx: Ctx): void {
  R(ctx, 7, 3, 2, 2, C.gem);
  R(ctx, 5, 5, 6, 3, C.gem);
  R(ctx, 6, 8, 4, 2, C.gem);
  R(ctx, 7, 10, 2, 1, C.gem);
  R(ctx, 7, 3, 1, 6, '#bafff6');
  R(ctx, 5, 5, 6, 1, '#7af0e4');
  R(ctx, 9, 6, 2, 3, '#1aa094');
  PX(ctx, 7, 5, '#ffffff');
}

export function drawFood(ctx: Ctx): void {
  R(ctx, 4, 5, 6, 6, '#9c4e22');
  R(ctx, 4, 5, 6, 1, '#c87a3a');
  R(ctx, 4, 5, 1, 6, '#b8632a');
  R(ctx, 8, 5, 2, 6, '#6e3416');
  PX(ctx, 6, 7, '#c87a3a');
  PX(ctx, 5, 9, '#7a3a18');
  R(ctx, 9, 10, 4, 3, '#e7d8b0');
  R(ctx, 9, 10, 4, 1, '#fff3d0');
  PX(ctx, 12, 12, '#fff3d0');
}

export function drawPotion(ctx: Ctx, color: string, hi: string): void {
  R(ctx, 6, 2, 4, 2, '#7a5a3a');
  R(ctx, 6, 2, 4, 1, '#9a7a52');
  R(ctx, 7, 4, 2, 1, '#cdd2e0');
  R(ctx, 4, 5, 8, 9, '#10141e');
  R(ctx, 5, 6, 6, 7, color);
  R(ctx, 5, 6, 2, 7, hi);
  R(ctx, 9, 6, 2, 7, 'rgba(0,0,0,0.28)');
  R(ctx, 5, 9, 6, 1, hi);
  PX(ctx, 6, 7, '#ffffff');
  PX(ctx, 8, 11, hi);
  PX(ctx, 7, 12, hi);
}

export function drawKey(ctx: Ctx): void {
  ctx.strokeStyle = C.coinMid;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(5, 7, 2.6, 0, Math.PI * 2);
  ctx.stroke();
  PX(ctx, 5, 7, C.portal0);
  PX(ctx, 4, 6, C.coinHi);
  R(ctx, 7, 6, 6, 2, C.coinMid);
  R(ctx, 7, 6, 6, 1, C.coinHi);
  R(ctx, 11, 8, 1, 3, C.coinMid);
  R(ctx, 9, 8, 1, 2, C.coinMid);
}

export function drawIconSword(ctx: Ctx): void {
  R(ctx, 7, 1, 2, 10, '#cfd6e8');
  R(ctx, 7, 1, 1, 10, '#ffffff');
  R(ctx, 8, 2, 1, 8, '#9aa0b4');
  PX(ctx, 7, 1, '#ffffff');
  R(ctx, 5, 11, 6, 1, C.coinMid);
  PX(ctx, 5, 11, C.coinHi);
  PX(ctx, 10, 11, C.coinHi);
  R(ctx, 7, 12, 2, 3, '#5a3a1c');
  R(ctx, 6, 14, 4, 1, C.coinMid);
}
export function drawIconBow(ctx: Ctx): void {
  ctx.strokeStyle = C.doorWoodHi;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(6, 8, 6, -1.15, 1.15);
  ctx.stroke();
  PX(ctx, 8, 2, C.coinMid);
  PX(ctx, 8, 14, C.coinMid);
  R(ctx, 9, 3, 1, 11, '#e7e2d0');
  R(ctx, 3, 8, 10, 1, '#d8c090');
  R(ctx, 1, 7, 3, 3, '#cfd6ff');
  R(ctx, 12, 7, 1, 3, C.fireMid);
}
export function drawIconStaff(ctx: Ctx): void {
  R(ctx, 7, 5, 2, 10, C.doorWood);
  R(ctx, 7, 5, 1, 10, C.doorWoodHi);
  ctx.fillStyle = C.magicMid;
  ctx.beginPath();
  ctx.arc(8, 4, 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.magicHot;
  ctx.beginPath();
  ctx.arc(8, 4, 1.6, 0, Math.PI * 2);
  ctx.fill();
  PX(ctx, 7, 3, '#ffffff');
  PX(ctx, 4, 3, C.magicHot);
  PX(ctx, 12, 4, C.magicHot);
}
export function drawIconMace(ctx: Ctx): void {
  R(ctx, 7, 8, 2, 7, C.doorWood);
  R(ctx, 7, 8, 1, 7, C.doorWoodHi);
  R(ctx, 5, 3, 6, 5, '#aeb6cc');
  R(ctx, 5, 3, 6, 1, '#ffffff');
  R(ctx, 9, 3, 2, 5, '#6e7488');
  R(ctx, 4, 4, 1, 3, '#aeb6cc');
  R(ctx, 11, 4, 1, 3, '#aeb6cc');
  PX(ctx, 6, 5, '#ffffff');
}
export function drawIconArmor(ctx: Ctx): void {
  R(ctx, 4, 4, 8, 9, '#5a73c0');
  R(ctx, 4, 4, 8, 2, '#a9c4ff');
  R(ctx, 4, 4, 1, 9, '#a9c4ff');
  R(ctx, 11, 4, 1, 9, '#2a3b6a');
  R(ctx, 3, 4, 2, 3, '#7a8fd0');
  R(ctx, 11, 4, 2, 3, '#7a8fd0');
  R(ctx, 7, 6, 2, 6, '#2a3b6a');
  PX(ctx, 6, 6, '#cfe0ff');
  PX(ctx, 9, 6, '#cfe0ff');
  R(ctx, 5, 12, 6, 1, '#2a3b6a');
}
export function drawIconRing(ctx: Ctx): void {
  ctx.strokeStyle = C.coinDark;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(8, 10, 4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = C.coinMid;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(8, 10, 4, 0, Math.PI * 2);
  ctx.stroke();
  R(ctx, 6, 2, 4, 4, C.gem);
  R(ctx, 6, 2, 4, 1, '#bafff6');
  PX(ctx, 7, 3, '#ffffff');
}
export function drawIconAmulet(ctx: Ctx): void {
  ctx.strokeStyle = C.coinMid;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(8, 5, 4, 0.15, Math.PI - 0.15);
  ctx.stroke();
  R(ctx, 5, 8, 6, 5, C.magicMid);
  R(ctx, 5, 8, 6, 1, C.magicHot);
  R(ctx, 9, 8, 2, 5, C.magicEdge);
  PX(ctx, 7, 10, '#ffffff');
  PX(ctx, 6, 9, C.magicCore);
}

export function drawIconShield(ctx: Ctx): void {
  const st = '#7d8aa8', hi = '#b9c4dd', dk = '#444f6e', rim = '#c9a24a';
  R(ctx, 3, 2, 10, 2, rim);
  R(ctx, 3, 4, 10, 3, st); R(ctx, 4, 7, 8, 3, st); R(ctx, 5, 10, 6, 2, st);
  R(ctx, 6, 12, 4, 1, st); R(ctx, 7, 13, 2, 1, st);
  R(ctx, 3, 4, 1, 5, hi); R(ctx, 12, 4, 1, 5, dk); R(ctx, 5, 9, 1, 2, hi); R(ctx, 11, 9, 1, 2, dk);
  R(ctx, 7, 4, 2, 7, rim); R(ctx, 5, 6, 6, 2, rim);
  PX(ctx, 8, 3, '#ffffff');
}
export function drawIconHelm(ctx: Ctx): void {
  const st = '#9aa0b4', hi = '#d6dbe8', dk = '#5a6075';
  R(ctx, 4, 3, 8, 7, st); R(ctx, 4, 3, 8, 1, hi);
  R(ctx, 4, 3, 1, 7, hi); R(ctx, 11, 3, 1, 7, dk);
  R(ctx, 4, 5, 8, 1, dk);
  R(ctx, 5, 6, 6, 2, '#1a1c24'); R(ctx, 6, 6, 1, 2, '#3a4256'); R(ctx, 9, 6, 1, 2, '#3a4256');
  R(ctx, 4, 10, 8, 2, dk);
  R(ctx, 7, 1, 2, 2, '#c9a24a'); PX(ctx, 8, 0, C.fireMid);
}
export function drawIconLegs(ctx: Ctx): void {
  const st = '#9aa0b4', hi = '#d6dbe8', dk = '#5a6075';
  R(ctx, 4, 3, 3, 11, st); R(ctx, 9, 3, 3, 11, st);
  R(ctx, 4, 3, 1, 11, hi); R(ctx, 9, 3, 1, 11, hi);
  R(ctx, 6, 3, 1, 11, dk); R(ctx, 11, 3, 1, 11, dk);
  R(ctx, 4, 3, 3, 1, hi); R(ctx, 9, 3, 3, 1, hi);
  R(ctx, 4, 8, 3, 1, dk); R(ctx, 9, 8, 3, 1, dk);
  R(ctx, 4, 13, 3, 1, dk); R(ctx, 9, 13, 3, 1, dk);
}
export function drawIconGloves(ctx: Ctx): void {
  const lth = '#7a5a34', hi = '#a07a48', dk = '#4e3a20', steel = '#b9c4dd';
  R(ctx, 5, 9, 6, 4, lth); R(ctx, 5, 9, 6, 1, hi); R(ctx, 5, 12, 6, 1, dk);
  R(ctx, 5, 4, 6, 5, lth); R(ctx, 5, 4, 6, 1, hi);
  R(ctx, 5, 3, 1, 3, lth); R(ctx, 7, 3, 1, 3, lth); R(ctx, 9, 3, 1, 3, lth); R(ctx, 11, 4, 1, 3, lth);
  R(ctx, 4, 6, 1, 3, lth);
  R(ctx, 5, 5, 6, 1, steel); PX(ctx, 6, 5, '#ffffff');
}
export function drawIconBoots(ctx: Ctx): void {
  const lth = '#6a4a2a', hi = '#9a6e3e', dk = '#3e2a16', sole = '#241b12';
  R(ctx, 5, 2, 5, 8, lth); R(ctx, 5, 2, 1, 8, hi); R(ctx, 9, 2, 1, 8, dk);
  R(ctx, 3, 10, 9, 3, lth); R(ctx, 3, 10, 9, 1, hi);
  R(ctx, 3, 13, 10, 1, sole);
  R(ctx, 5, 5, 5, 1, dk); PX(ctx, 6, 3, '#caa46a');
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
  const bob = frame === 1 || frame === 2 ? -2 : 0;
  const draw = frame === 3;
  const D = 'rgba(0,0,0,0.22)';
  R(ctx, cx - 6, 8 + bob, 12, 10, r.body2);
  R(ctx, cx - 6, 8 + bob, 12, 2, r.body1);
  R(ctx, cx + 4, 9 + bob, 2, 9, D);
  R(ctx, cx - 4, 12 + bob, 4, 4, r.detail);
  R(ctx, cx + 1, 12 + bob, 4, 4, r.detail);
  R(ctx, cx - 3, 13 + bob, 2, 2, r.eye);
  R(ctx, cx + 2, 13 + bob, 2, 2, r.eye);
  R(ctx, cx - 1, 16 + bob, 2, 2, D);
  R(ctx, cx - 4, 18 + bob, 8, 2, r.body1);
  for (let i = 0; i < 4; i++) PX(ctx, cx - 3 + i * 2, 19 + bob, r.body2);
  R(ctx, cx - 1, 20 + bob, 2, 14, r.body0);
  R(ctx, cx - 8, 21 + bob, 16, 12, r.body1);
  R(ctx, cx - 8, 21 + bob, 16, 1, r.body2);
  R(ctx, cx + 6, 21 + bob, 2, 12, D);
  for (let i = 0; i < 4; i++) { R(ctx, cx - 7, 23 + bob + i * 3, 6, 2, r.detail); R(ctx, cx + 1, 23 + bob + i * 3, 6, 2, r.detail); }
  R(ctx, cx - 5, 34 + bob, 4, 6, r.body0);
  R(ctx, cx + 1, 34 + bob, 4, 6, r.body0);
  R(ctx, cx - 5, 34 + bob, 1, 6, r.body1);
  const bx = cx - 12;
  ctx.strokeStyle = r.accent; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(bx + 4, 26 + bob, 12, 2.0, 4.28); ctx.stroke();
  R(ctx, bx + 1, 16 + bob, 1, 20, '#e6dfba');
  if (draw) { R(ctx, bx + 1, 25 + bob, 16, 2, '#e6dfba'); R(ctx, bx + 16, 24 + bob, 3, 3, r.eye); }
  else R(ctx, bx + 1, 25 + bob, 8, 2, '#e6dfba');
}

export function drawSkeletonServant(ctx: Ctx, ox: number, frame: number, r: MonsterRamp, role: 'tank' | 'archer' | 'mage' | 'thief'): void {
  const cx = ox + MON_FW / 2;
  const bob = frame === 1 || frame === 2 ? -2 : 0;
  const atk = frame === 3;
  const B = r.body2, BH = '#f6f1da', BD = r.body0, SH = 'rgba(0,0,0,0.30)';
  const ac = r.accent;
  // legs + feet
  R(ctx, cx - 4, 32 + bob, 3, 8, B); R(ctx, cx + 1, 32 + bob, 3, 8, B);
  R(ctx, cx - 4, 32 + bob, 1, 8, BH);
  R(ctx, cx - 5, 39 + bob, 4, 2, B); R(ctx, cx + 1, 39 + bob, 4, 2, B);
  // pelvis
  R(ctx, cx - 5, 29 + bob, 10, 3, B); R(ctx, cx - 5, 29 + bob, 10, 1, BH);
  // spine + ribs
  R(ctx, cx - 1, 18 + bob, 2, 12, B);
  for (let i = 0; i < 4; i++) { R(ctx, cx - 6, 19 + bob + i * 3, 5, 1, B); R(ctx, cx + 1, 19 + bob + i * 3, 5, 1, B); }
  R(ctx, cx - 6, 18 + bob, 12, 1, BH);
  R(ctx, cx - 8, 18 + bob, 3, 2, B); R(ctx, cx + 5, 18 + bob, 3, 2, B); // shoulders
  // skull
  R(ctx, cx - 5, 7 + bob, 10, 9, B); R(ctx, cx - 5, 7 + bob, 10, 2, BH); R(ctx, cx + 3, 8 + bob, 2, 8, SH);
  R(ctx, cx - 4, 16 + bob, 8, 2, B); // jaw
  R(ctx, cx - 3, 11 + bob, 3, 3, '#120e0a'); R(ctx, cx + 1, 11 + bob, 3, 3, '#120e0a');
  PX(ctx, cx - 2, 12 + bob, r.eye); PX(ctx, cx + 2, 12 + bob, r.eye);
  R(ctx, cx - 1, 14 + bob, 2, 1, SH);
  for (let i = 0; i < 3; i++) PX(ctx, cx - 3 + i * 3, 17 + bob, BD);
  // ---- role gear ----
  if (role === 'tank') {
    ctx.fillStyle = ac; ctx.beginPath(); ctx.arc(cx - 9, 26 + bob, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = BH; ctx.beginPath(); ctx.arc(cx - 9, 26 + bob, 3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = r.detail; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx - 9, 26 + bob, 8, 0, Math.PI * 2); ctx.stroke();
    R(ctx, cx - 6, 5 + bob, 12, 4, ac); R(ctx, cx - 6, 5 + bob, 12, 1, BH); R(ctx, cx, 3 + bob, 1, 4, ac);
    R(ctx, cx + 6, 20 + bob, 2, 9, B);
  } else if (role === 'archer') {
    const bx = cx - 12;
    ctx.strokeStyle = ac; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(bx + 4, 26 + bob, 12, 2.0, 4.28); ctx.stroke();
    R(ctx, bx + 1, 16 + bob, 1, 20, BH);
    if (atk) { R(ctx, bx + 1, 25 + bob, 16, 1, BH); R(ctx, bx + 15, 24 + bob, 3, 3, r.eye); }
    R(ctx, cx + 6, 20 + bob, 2, 9, B);
  } else if (role === 'mage') {
    R(ctx, cx - 6, 5 + bob, 12, 6, ac); R(ctx, cx - 6, 5 + bob, 12, 1, BH);
    R(ctx, cx - 6, 8 + bob, 2, 4, ac); R(ctx, cx + 4, 8 + bob, 2, 4, ac);
    const sx = cx + 8;
    R(ctx, sx, 8 + bob, 2, 28, '#3a3056'); R(ctx, sx, 8 + bob, 1, 28, '#5a4f7a');
    const oc = atk ? '#eafff0' : ac;
    ctx.fillStyle = '#16331f'; ctx.beginPath(); ctx.arc(sx + 1, 7 + bob, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = oc; ctx.beginPath(); ctx.arc(sx + 1, 7 + bob, 3, 0, Math.PI * 2); ctx.fill();
    PX(ctx, sx, 6 + bob, '#ffffff');
  } else {
    R(ctx, cx - 6, 5 + bob, 12, 5, '#2a3328'); R(ctx, cx - 6, 5 + bob, 12, 1, ac);
    const dx = cx + 7 + (atk ? 2 : 0);
    R(ctx, dx, 16 + bob, 2, 7, '#dfe6ff');
    R(ctx, dx - 1, 22 + bob, 4, 1, ac);
    R(ctx, dx, 23 + bob, 2, 3, '#5a3a1c');
    R(ctx, cx - 8, 20 + bob, 2, 8, B);
  }
}

export function drawBrute(ctx: Ctx, ox: number, frame: number, r: MonsterRamp): void {
  const cx = ox + MON_FW / 2;
  const bob = frame === 1 ? -2 : 0;
  const lunge = frame === 3 ? 4 : 0;
  const D = 'rgba(0,0,0,0.26)';
  R(ctx, cx - 14, 16 + bob, 28, 20, r.body1);
  R(ctx, cx - 14, 16 + bob, 28, 3, r.body2);
  R(ctx, cx - 14, 16 + bob, 4, 20, r.body2);
  R(ctx, cx + 10, 16 + bob, 4, 20, D);
  R(ctx, cx - 8, 22 + bob, 16, 10, r.detail);
  R(ctx, cx - 8, 22 + bob, 16, 2, r.accent);
  for (const sx of [-6, 0, 6]) { PX(ctx, cx + sx, 24 + bob, r.accent); PX(ctx, cx + sx, 30 + bob, r.accent); }
  R(ctx, cx - 6, 8 + bob, 12, 10, r.body2);
  R(ctx, cx - 6, 8 + bob, 12, 1, r.body1);
  R(ctx, cx - 4, 12 + bob, 4, 3, r.eye);
  R(ctx, cx + 1, 12 + bob, 4, 3, r.eye);
  R(ctx, cx - 9, 5 + bob, 3, 4, r.detail);
  R(ctx, cx + 6, 5 + bob, 3, 4, r.detail);
  R(ctx, cx - 4, 16 + bob, 8, 2, r.body0);
  R(ctx, cx - 18 - lunge, 24 + bob, 6, 10, r.body1);
  R(ctx, cx + 12 + lunge, 24 + bob, 6, 10, r.body1);
  R(ctx, cx - 18 - lunge, 32 + bob, 6, 4, r.accent);
  R(ctx, cx + 12 + lunge, 32 + bob, 6, 4, r.accent);
  R(ctx, cx - 8, 36 + bob, 6, 6, r.body0);
  R(ctx, cx + 2, 36 + bob, 6, 6, r.body0);
  if (frame === 3) R(ctx, cx - 4, 20 + bob, 8, 2, '#ffffff');
}

export function drawImp(ctx: Ctx, ox: number, frame: number, r: MonsterRamp): void {
  const cx = ox + MON_FW / 2;
  const bob = [0, -4, -2, -4][frame % 4];
  const wing = frame % 2 === 0 ? 4 : 0;
  for (const s of [-1, 1]) {
    const wx = cx + s * (8 + wing);
    R(ctx, wx - (s < 0 ? 6 : 0), 14 + bob, 6, 10, r.body0);
    R(ctx, wx - (s < 0 ? 6 : -4), 13 + bob, 2, 12, r.detail);
    PX(ctx, wx + (s < 0 ? -6 : 6), 12 + bob, r.detail);
  }
  R(ctx, cx - 6, 18 + bob, 12, 12, r.body1);
  R(ctx, cx - 6, 18 + bob, 12, 2, r.body2);
  R(ctx, cx + 4, 18 + bob, 2, 12, 'rgba(0,0,0,0.22)');
  R(ctx, cx - 4, 22 + bob, 8, 6, r.accent);
  R(ctx, cx - 6, 9 + bob, 12, 9, r.body2);
  R(ctx, cx - 6, 9 + bob, 12, 1, r.body1);
  R(ctx, cx - 7, 5 + bob, 3, 5, r.detail);
  R(ctx, cx + 4, 5 + bob, 3, 5, r.detail);
  R(ctx, cx - 4, 12 + bob, 3, 2, r.eye);
  R(ctx, cx + 2, 12 + bob, 3, 2, r.eye);
  PX(ctx, cx - 3, 12 + bob, '#ffffff');
  PX(ctx, cx + 3, 12 + bob, '#ffffff');
  R(ctx, cx - 3, 16 + bob, 6, 1, r.detail);
  R(ctx, cx + 5, 28 + bob, 6, 2, r.body0);
  R(ctx, cx + 10, 26 + bob, 2, 3, r.accent);
  R(ctx, cx - 4, 30 + bob, 3, 5, r.body0);
  R(ctx, cx + 2, 30 + bob, 3, 5, r.body0);
}

export function drawColossus(ctx: Ctx, ox: number, frame: number, r: MonsterRamp): void {
  const cx = ox + BOSS_FW / 2;
  const bob = [0, -2, -4, 0][frame % 4];
  const cast = frame === 3;
  const D = 'rgba(0,0,0,0.3)';
  R(ctx, cx - 18, 60 + bob, 12, 16, r.body0);
  R(ctx, cx + 6, 60 + bob, 12, 16, r.body0);
  R(ctx, cx - 18, 60 + bob, 3, 16, r.body1);
  R(ctx, cx - 24, 24 + bob, 48, 40, r.body1);
  R(ctx, cx - 24, 24 + bob, 48, 4, r.body2);
  R(ctx, cx - 24, 24 + bob, 6, 40, r.body2);
  R(ctx, cx + 18, 24 + bob, 6, 40, D);
  for (let i = 0; i < 6; i++) R(ctx, cx - 18 + i * 6, 32 + bob + (i % 2) * 8, 3, 12, r.accent);
  R(ctx, cx - 12, 44 + bob, 24, 4, C.fireCore);
  R(ctx, cx - 12, 44 + bob, 24, 1, '#fff4cf');
  R(ctx, cx - 32, 28 + bob, 10, 20, r.body0);
  R(ctx, cx + 22, 28 + bob, 10, 20, r.body0);
  R(ctx, cx - 32, 46 + bob, 10, 6, r.accent);
  R(ctx, cx + 22, 46 + bob, 10, 6, r.accent);
  R(ctx, cx - 10, 8 + bob, 20, 18, r.body2);
  R(ctx, cx - 10, 8 + bob, 20, 2, '#ffffff');
  R(ctx, cx - 8, 14 + bob, 6, 6, r.detail);
  R(ctx, cx + 2, 14 + bob, 6, 6, r.detail);
  R(ctx, cx - 8, 14 + bob, 6, 4, r.eye);
  R(ctx, cx + 2, 14 + bob, 6, 4, r.eye);
  R(ctx, cx - 6, 22 + bob, 12, 3, C.fireCore);
  for (let i = 0; i < 5; i++) PX(ctx, cx - 5 + i * 2.5, 23 + bob, r.body2);
  if (cast) {
    for (let i = 0; i < 7; i++) R(ctx, cx - 10 + i * 3, 2 + bob, 2, 6, C.fireCore);
    R(ctx, cx - 30, 36 + bob, 8, 8, r.accent);
    R(ctx, cx + 22, 36 + bob, 8, 8, r.accent);
  }
}

// --- bespoke themed monsters ------------------------------------------------

export function drawOoze(ctx: Ctx, ox: number, frame: number, r: MonsterRamp): void {
  const cx = ox + MON_FW / 2;
  const squish = [0, 2, 4, 2][frame % 4];
  const w = 26 + squish;
  const h = 26 - squish;
  const top = 38 - h;
  ctx.fillStyle = r.body1;
  ctx.beginPath(); ctx.ellipse(cx, top + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = r.body2;
  ctx.beginPath(); ctx.ellipse(cx - 2, top + h / 2 - 2, w / 2 - 4, h / 2 - 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = r.body0;
  ctx.beginPath(); ctx.ellipse(cx, top + h - 3, w / 2 - 2, 4, 0, 0, Math.PI * 2); ctx.fill();
  R(ctx, cx - 8, top + 3, 6, 4, r.accent);
  R(ctx, cx - 7, top + h / 2, 5, 5, r.eye);
  R(ctx, cx + 2, top + h / 2, 5, 5, r.eye);
  PX(ctx, cx - 6, top + h / 2 + 1, r.detail);
  PX(ctx, cx + 3, top + h / 2 + 1, r.detail);
  for (const dx of [-9, -3, 5, 9]) PX(ctx, cx + dx, top + h - 1, r.body0);
  if (frame === 3) R(ctx, cx - 2, top - 4, 4, 6, r.accent);
}

export function drawConstruct(ctx: Ctx, ox: number, frame: number, r: MonsterRamp): void {
  const cx = ox + MON_FW / 2;
  const bob = frame === 1 ? -2 : 0;
  const fire = frame === 3;
  const D = 'rgba(0,0,0,0.28)';
  R(ctx, cx - 8, 34 + bob, 6, 8, r.body0);
  R(ctx, cx + 2, 34 + bob, 6, 8, r.body0);
  R(ctx, cx - 10, 16 + bob, 20, 18, r.body1);
  R(ctx, cx - 10, 16 + bob, 20, 2, r.body2);
  R(ctx, cx - 10, 16 + bob, 2, 18, r.body2);
  R(ctx, cx + 8, 16 + bob, 2, 18, D);
  for (const c of [[-8, 18], [6, 18], [-8, 30], [6, 30]]) { R(ctx, cx + c[0], bob + c[1], 2, 2, r.accent); }
  R(ctx, cx - 4, 22 + bob, 8, 6, r.eye);
  R(ctx, cx - 2, 24 + bob, 4, 2, '#ffffff');
  R(ctx, cx - 6, 6 + bob, 12, 10, r.body2);
  R(ctx, cx - 6, 6 + bob, 12, 1, r.body1);
  R(ctx, cx - 4, 10 + bob, 8, 2, r.eye);
  R(ctx, cx - 14, 18 + bob, 4, 12, r.body1);
  R(ctx, cx + 10, 18 + bob, 4, 12, r.body1);
  if (fire) R(ctx, cx + 14, 22 + bob, 6, 2, r.eye);
}

export function drawWisp(ctx: Ctx, ox: number, frame: number, r: MonsterRamp): void {
  const cx = ox + MON_FW / 2;
  const bob = [0, -4, -2, -4][frame % 4];
  const cy = 18 + bob;
  for (const [rad, col] of [[12, r.body0], [9, r.body1], [6, r.body2]] as [number, string][]) {
    ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(cx, cy, rad, rad, 0, 0, Math.PI * 2); ctx.fill();
  }
  R(ctx, cx - 2, cy - 2, 4, 4, r.eye);
  PX(ctx, cx - 1, cy - 1, '#ffffff');
  for (const [dx, dy] of [[-12, -6], [12, 4], [-10, 8], [10, -8], [0, -13]] as [number, number][]) {
    R(ctx, cx + dx, cy + dy, 2, 2, r.accent);
  }
  R(ctx, cx - 2, cy + 10, 4, 8, r.body1);
  if (frame === 3) { R(ctx, cx - 2, cy - 16, 4, 6, r.eye); R(ctx, cx - 14, cy, 6, 2, r.accent); }
}

export function drawStalker(ctx: Ctx, ox: number, frame: number, r: MonsterRamp): void {
  const cx = ox + MON_FW / 2;
  const bob = frame === 1 ? -2 : 0;
  const lunge = frame === 3 ? 4 : 0;
  ctx.fillStyle = r.body1;
  ctx.beginPath(); ctx.ellipse(cx, 24 + bob, 10, 14, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = r.body0;
  ctx.beginPath(); ctx.ellipse(cx, 30 + bob, 12, 10, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = r.body2;
  ctx.beginPath(); ctx.ellipse(cx, 14 + bob, 7, 8, 0, 0, Math.PI * 2); ctx.fill();
  R(ctx, cx - 4, 12 + bob, 3, 2, r.eye);
  R(ctx, cx + 2, 12 + bob, 3, 2, r.eye);
  PX(ctx, cx - 3, 12 + bob, '#ffffff');
  PX(ctx, cx + 3, 12 + bob, '#ffffff');
  R(ctx, cx - 13 - lunge, 22 + bob, 4, 9, r.accent);
  R(ctx, cx + 9 + lunge, 22 + bob, 4, 9, r.accent);
  R(ctx, cx - 14 - lunge, 30 + bob, 3, 3, r.accent);
  R(ctx, cx + 11 + lunge, 30 + bob, 3, 3, r.accent);
  R(ctx, cx - 5, 36 + bob, 3, 6, r.body0);
  R(ctx, cx + 2, 36 + bob, 3, 6, r.body0);
  for (const [dx, dy] of [[-10, 18], [10, 22], [0, 6]] as [number, number][]) PX(ctx, cx + dx, dy + bob, r.detail);
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
  if (pose === 1) return [-2, 2];
  if (pose === 2) return [2, -2];
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
  if (cls === 'vanguard') {
    const hx = (facing === 'side' ? cx + 12 : cx + 10) + (attack ? 1 : 0);
    const len = attack ? 26 : 20;
    const top = attack ? 4 : 9;
    R(ctx, hx, top, 5, len, ramp.trim);
    R(ctx, hx, top, 2, len, ramp.trimHi);
    R(ctx, hx + 4, top, 1, len, '#4a4a5a');
    R(ctx, hx + 2, top + 1, 1, len - 2, '#c8ccd8');
    PX(ctx, hx + 2, top - 1, '#ffffff');
    R(ctx, hx - 2, top + len, 9, 2, C.coinMid);
    R(ctx, hx - 2, top + len, 9, 1, C.coinHi);
    R(ctx, hx + 1, top + len + 2, 3, 5, ramp.cloth1);
    R(ctx, hx + 1, top + len + 2, 1, 5, ramp.cloth2);
    R(ctx, hx, top + len + 7, 5, 2, C.coinMid);
    PX(ctx, hx + 2, top + len + 8, C.coinHi);
  } else if (cls === 'strider') {
    const hx = cx + (attack ? 10 : 8);
    R(ctx, hx - 1, 26, 3, 6, C.doorWood);
    R(ctx, hx - 1, 26, 1, 6, C.doorWoodHi);
    ctx.strokeStyle = ramp.trim;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(hx, 28, 11, -1.45, 1.45);
    ctx.stroke();
    ctx.strokeStyle = ramp.trimHi;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(hx, 28, 11, -1.45, 1.45);
    ctx.stroke();
    R(ctx, hx + 1, 16, 2, 2, ramp.trim);
    R(ctx, hx + 1, 38, 2, 2, ramp.trim);
    R(ctx, hx + 3, 17, 1, 22, '#e8e8f4');
    if (attack) {
      R(ctx, hx - 10, 27, 16, 1, '#d8c090');
      R(ctx, hx - 12, 26, 3, 3, '#cfd6ff');
    }
  } else if (cls === 'arcanist') {
    const hx = cx + (attack ? 12 : 10);
    R(ctx, hx, 12, 3, 30, C.doorWood);
    R(ctx, hx, 12, 1, 30, C.doorWoodHi);
    const oc = attack ? C.magicCore : C.magicMid;
    ctx.fillStyle = oc;
    ctx.beginPath();
    ctx.arc(hx + 1, 9, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.magicHot;
    ctx.beginPath();
    ctx.arc(hx + 1, 9, 2.6, 0, Math.PI * 2);
    ctx.fill();
    PX(ctx, hx, 8, '#ffffff');
    if (attack) {
      PX(ctx, hx - 4, 4, C.magicHot);
      PX(ctx, hx + 6, 5, C.magicHot);
      PX(ctx, hx + 1, 2, '#ffffff');
    }
  } else if (cls === 'necromancer') {
    const hx = cx + (attack ? 12 : 10);
    // dark twisted haft topped by a clawed crescent cradling a glowing soul orb
    R(ctx, hx, 7, 3, 35, '#2a2440');
    R(ctx, hx, 7, 1, 35, '#4a3f6a');
    R(ctx, hx - 3, 6, 2, 6, '#3a3358');
    R(ctx, hx + 4, 6, 2, 6, '#3a3358');
    PX(ctx, hx - 3, 5, '#6a5f96');
    PX(ctx, hx + 5, 5, '#6a5f96');
    const orb = attack ? '#b6ffd0' : '#6ee0a0';
    ctx.fillStyle = '#14331e';
    ctx.beginPath(); ctx.arc(hx + 1, 6, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = orb;
    ctx.beginPath(); ctx.arc(hx + 1, 6, 3.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#eafff0';
    ctx.beginPath(); ctx.arc(hx, 5, 1.5, 0, Math.PI * 2); ctx.fill();
    R(ctx, hx, 21, 3, 3, '#cfc9af');
    PX(ctx, hx, 22, '#1a1410');
    PX(ctx, hx + 2, 22, '#1a1410');
    if (attack) { PX(ctx, hx - 4, 2, orb); PX(ctx, hx + 6, 3, orb); PX(ctx, hx + 1, 0, '#ffffff'); }
  } else {
    const hx = cx + (attack ? 12 : 10);
    R(ctx, hx, 16, 3, 22, C.doorWood);
    R(ctx, hx, 16, 1, 22, C.doorWoodHi);
    R(ctx, hx - 2, 9, 7, 7, ramp.trim);
    R(ctx, hx - 2, 9, 7, 2, ramp.trimHi);
    R(ctx, hx - 3, 11, 1, 3, ramp.trim);
    R(ctx, hx + 5, 11, 1, 3, ramp.trim);
    PX(ctx, hx + 1, 12, '#ffffff');
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
  const bob = pose === 1 ? -2 : 0;
  const [ll, rl] = legShift(pose);
  const robe = cls === 'arcanist' || cls === 'warden' || cls === 'necromancer';
  const sway = pose === 1 ? -1 : pose === 3 ? 1 : 0;
  const SH = 'rgba(0,0,0,0.18)';
  const SHd = 'rgba(0,0,0,0.32)';

  const hTop = 8 + bob;
  const tTop = 19 + bob;
  const legTop = 33 + bob;

  if (facing === 'up') drawWeapon(ctx, ox, cls, ramp, facing, pose);

  if (robe) {
    R(ctx, cx - 9, tTop, 18, 25, ramp.cloth0);
    R(ctx, cx - 9, tTop, 3, 25, ramp.cloth1);
    R(ctx, cx + 7, tTop, 2, 25, SHd);
    R(ctx, cx - 9, tTop + 23, 18, 2, ramp.trim);
    R(ctx, cx - 3, tTop + 4, 1, 19, SH);
    R(ctx, cx + 2, tTop + 4, 1, 19, SH);
  } else {
    R(ctx, cx - 8, tTop, 16, 22, ramp.cloth0);
    R(ctx, cx - 8, tTop, 3, 22, ramp.cloth1);
    R(ctx, cx + 6, tTop, 2, 22, SHd);
    PX(ctx, cx - 6 + sway, tTop + 22, ramp.cloth0);
    PX(ctx, cx - 2 + sway, tTop + 23, ramp.cloth1);
    PX(ctx, cx + 2 + sway, tTop + 22, ramp.cloth0);
    PX(ctx, cx + 5 + sway, tTop + 23, ramp.cloth0);
  }

  const lx = cx - 7 + ll;
  const rx = cx + 3 + rl;
  if (robe) {
    R(ctx, lx + 1, legTop + 4, 4, 5, ramp.cloth0);
    R(ctx, rx, legTop + 4, 4, 5, ramp.cloth0);
    R(ctx, lx + 1, legTop + 8, 4, 2, '#0a0a12');
    R(ctx, rx, legTop + 8, 4, 2, '#0a0a12');
  } else if (cls === 'vanguard') {
    R(ctx, lx, legTop, 4, 8, ramp.skin);
    R(ctx, rx, legTop, 4, 8, ramp.skin);
    R(ctx, lx, legTop, 1, 8, ramp.skinHi);
    R(ctx, rx, legTop, 1, 8, ramp.skinHi);
    R(ctx, lx + 3, legTop, 1, 8, SH);
    R(ctx, rx + 3, legTop, 1, 8, SH);
    R(ctx, lx, legTop + 7, 4, 4, ramp.cloth1);
    R(ctx, rx, legTop + 7, 4, 4, ramp.cloth1);
    R(ctx, lx, legTop + 7, 4, 1, ramp.cloth2);
    R(ctx, rx, legTop + 7, 4, 1, ramp.cloth2);
  } else {
    R(ctx, lx, legTop, 4, 9, ramp.cloth1);
    R(ctx, rx, legTop, 4, 9, ramp.cloth1);
    R(ctx, lx, legTop, 1, 9, ramp.cloth2);
    R(ctx, rx, legTop, 1, 9, ramp.cloth2);
    R(ctx, lx + 3, legTop, 1, 9, SH);
    R(ctx, rx + 3, legTop, 1, 9, SH);
    R(ctx, lx, legTop + 8, 4, 3, ramp.trim);
    R(ctx, rx, legTop + 8, 4, 3, ramp.trim);
    R(ctx, lx, legTop + 8, 4, 1, ramp.trimHi);
    R(ctx, rx, legTop + 8, 4, 1, ramp.trimHi);
  }

  const tw = 14;
  const tx = cx - 7;
  if (cls === 'vanguard') {
    R(ctx, tx, tTop, tw, 14, ramp.skin);
    R(ctx, tx, tTop, tw, 2, ramp.skinHi);
    R(ctx, tx, tTop, 3, 14, ramp.skinHi);
    R(ctx, tx + tw - 3, tTop, 3, 14, SH);
    R(ctx, cx - 1, tTop + 2, 1, 8, SH);
    R(ctx, tx + 2, tTop + 4, 4, 1, SH);
    R(ctx, cx + 1, tTop + 4, 4, 1, SH);
    R(ctx, tx + 3, tTop + 8, 8, 1, 'rgba(0,0,0,0.12)');
    R(ctx, tx + 3, tTop + 10, 8, 1, 'rgba(0,0,0,0.12)');
    for (let i = 0; i < tw; i++) R(ctx, tx + i, tTop + 1 + Math.floor(i / 2), 1, 2, ramp.trim);
    R(ctx, tx, tTop + 11, tw, 3, ramp.cloth1);
    R(ctx, tx, tTop + 11, tw, 1, ramp.cloth2);
    R(ctx, cx - 2, tTop + 11, 4, 3, C.coinMid);
    PX(ctx, cx, tTop + 12, C.coinHi);
  } else if (cls === 'strider') {
    R(ctx, tx, tTop, tw, 14, ramp.cloth1);
    R(ctx, tx, tTop, tw, 2, ramp.cloth2);
    R(ctx, tx, tTop, 3, 14, ramp.cloth2);
    R(ctx, tx + tw - 3, tTop, 3, 14, ramp.cloth0);
    R(ctx, tx + 2, tTop + 2, tw - 4, 1, ramp.trim);
    for (let i = 0; i < tw; i++) R(ctx, tx + i, tTop + 3 + Math.floor(i / 2), 1, 2, ramp.cloth0);
    R(ctx, tx, tTop + 10, tw, 2, ramp.trim);
    R(ctx, cx - 1, tTop + 10, 2, 2, C.coinMid);
  } else {
    R(ctx, tx, tTop, tw, 14, ramp.cloth1);
    R(ctx, tx, tTop, tw, 2, ramp.cloth2);
    R(ctx, tx, tTop, 3, 14, ramp.cloth2);
    R(ctx, tx + tw - 3, tTop, 3, 14, ramp.cloth0);
    if (cls === 'warden') {
      R(ctx, tx + 2, tTop + 2, tw - 4, 11, ramp.cloth2);
      R(ctx, cx - 1, tTop + 3, 2, 7, ramp.trim);
      R(ctx, cx - 3, tTop + 5, 6, 2, ramp.trim);
      PX(ctx, cx, tTop + 5, ramp.trimHi);
    } else {
      R(ctx, tx, tTop + 10, tw, 2, ramp.trim);
      PX(ctx, cx, tTop + 6, C.magicCore);
      PX(ctx, cx - 3, tTop + 7, ramp.trim);
      PX(ctx, cx + 3, tTop + 7, ramp.trim);
    }
  }

  if (cls === 'vanguard') {
    R(ctx, cx - 11, tTop - 1, 4, 5, ramp.cloth1);
    R(ctx, cx - 11, tTop - 1, 4, 1, ramp.cloth2);
    R(ctx, cx + 7, tTop - 1, 4, 5, ramp.cloth1);
    R(ctx, cx + 7, tTop - 1, 4, 1, ramp.cloth2);
  }

  if (robe) {
    R(ctx, cx - 11, tTop + 1, 4, 11, ramp.cloth1);
    R(ctx, cx + 7, tTop + 1, 4, 11, ramp.cloth1);
    R(ctx, cx - 11, tTop + 1, 1, 11, ramp.cloth2);
    R(ctx, cx + 10, tTop + 1, 1, 11, ramp.cloth0);
    R(ctx, cx - 10, tTop + 11, 3, 2, ramp.skin);
    R(ctx, cx + 7, tTop + 11, 3, 2, ramp.skin);
  } else {
    const armC = cls === 'vanguard' ? ramp.skin : ramp.cloth1;
    const armHi = cls === 'vanguard' ? ramp.skinHi : ramp.cloth2;
    R(ctx, cx - 10, tTop + 1, 3, 10, armC);
    R(ctx, cx + 7, tTop + 1, 3, 10, armC);
    R(ctx, cx - 10, tTop + 1, 1, 10, armHi);
    R(ctx, cx + 9, tTop + 1, 1, 10, SH);
    R(ctx, cx - 10, tTop + 10, 3, 2, ramp.skin);
    R(ctx, cx + 7, tTop + 10, 3, 2, ramp.skin);
    if (cls === 'vanguard') {
      R(ctx, cx - 10, tTop + 8, 3, 1, ramp.trim);
      R(ctx, cx + 7, tTop + 8, 3, 1, ramp.trim);
    } else {
      R(ctx, cx - 10, tTop + 9, 3, 1, ramp.cloth0);
      R(ctx, cx + 7, tTop + 9, 3, 1, ramp.cloth0);
    }
  }

  const hw = 10;
  const hx0 = cx - 5;
  R(ctx, hx0, hTop, hw, 11, ramp.skin);
  R(ctx, hx0, hTop, hw, 1, ramp.skinHi);
  R(ctx, hx0, hTop, 2, 11, ramp.skinHi);
  R(ctx, hx0 + hw - 2, hTop + 1, 2, 10, SH);
  R(ctx, hx0 + 1, hTop + 10, hw - 2, 1, SH);

  if (cls === 'vanguard') {
    R(ctx, hx0 - 1, hTop - 2, hw + 2, 4, ramp.hair);
    R(ctx, hx0 - 1, hTop, 2, 9, ramp.hair);
    R(ctx, hx0 + hw - 1, hTop, 2, 9, ramp.hair);
    R(ctx, hx0, hTop + 2, hw, 2, C.hpLow);
    R(ctx, hx0, hTop + 2, hw, 1, '#ff8a7a');
  } else if (cls === 'strider') {
    R(ctx, hx0 - 1, hTop - 3, hw + 2, 4, ramp.hair);
    R(ctx, hx0 - 2, hTop, 2, 8, ramp.hair);
    R(ctx, hx0 + hw, hTop, 2, 8, ramp.hair);
    R(ctx, hx0 - 2, hTop + 8, 1, 3, ramp.hair);
    R(ctx, hx0 + hw + 1, hTop + 8, 1, 3, ramp.hair);
    R(ctx, hx0 - 1, hTop - 3, hw + 2, 1, ramp.trimHi);
    R(ctx, hx0 + 1, hTop + 2, hw - 2, 2, ramp.skinHi);
  } else if (cls === 'arcanist') {
    R(ctx, hx0 - 1, hTop - 1, hw + 2, 3, ramp.cloth2);
    R(ctx, hx0 - 1, hTop - 1, hw + 2, 1, ramp.trimHi);
    R(ctx, hx0 + 1, hTop - 5, hw - 2, 5, ramp.cloth2);
    R(ctx, hx0 + 2, hTop - 6, hw - 5, 2, ramp.cloth2);
    R(ctx, hx0 + 1, hTop - 5, 2, 5, ramp.cloth1);
    PX(ctx, hx0 + 3, hTop - 5, C.magicCore);
    R(ctx, hx0, hTop + 2, hw, 1, ramp.trim);
    R(ctx, hx0, hTop + 7, hw, 5, ramp.hair);
    R(ctx, hx0 + 2, hTop + 11, hw - 4, 3, ramp.hair);
    R(ctx, hx0, hTop + 7, hw, 1, '#ffffff');
  } else if (cls === 'warden') {
    R(ctx, hx0 - 1, hTop - 2, hw + 2, 5, ramp.cloth2);
    R(ctx, hx0 - 1, hTop - 2, hw + 2, 1, ramp.trimHi);
    R(ctx, hx0 - 2, hTop, 2, 9, ramp.cloth1);
    R(ctx, hx0 + hw, hTop, 2, 9, ramp.cloth1);
    R(ctx, hx0, hTop - 4, hw, 1, '#fff4c0');
    PX(ctx, hx0 - 1, hTop - 3, '#fff4c0');
    PX(ctx, hx0 + hw, hTop - 3, '#fff4c0');
  } else {
    // necromancer — a deep dark cowl shadowing the face, with cold soul-fire eyes
    R(ctx, hx0 - 2, hTop - 3, hw + 4, 6, ramp.cloth0);
    R(ctx, hx0 - 2, hTop - 3, hw + 4, 1, ramp.cloth1);
    R(ctx, hx0 - 2, hTop, 2, 12, ramp.cloth0);
    R(ctx, hx0 + hw, hTop, 2, 12, ramp.cloth0);
    R(ctx, hx0, hTop + 2, hw, 8, '#0a0a12');
    if (facing !== 'up') {
      R(ctx, hx0 + 2, hTop + 5, 2, 2, '#8affd0');
      R(ctx, hx0 + hw - 4, hTop + 5, 2, 2, '#8affd0');
      PX(ctx, hx0 + 2, hTop + 5, '#dfffe6');
      PX(ctx, hx0 + hw - 4, hTop + 5, '#dfffe6');
    }
  }

  if (cls !== 'arcanist' && cls !== 'necromancer') {
    const eye = cls === 'strider' ? '#c08aff' : '#2a3b6a';
    if (facing === 'down') {
      R(ctx, hx0 + 2, hTop + 5, 2, 2, '#ffffff');
      R(ctx, hx0 + hw - 4, hTop + 5, 2, 2, '#ffffff');
      PX(ctx, hx0 + 3, hTop + 6, eye);
      PX(ctx, hx0 + hw - 3, hTop + 6, eye);
      R(ctx, hx0 + 2, hTop + 4, 2, 1, ramp.hair);
      R(ctx, hx0 + hw - 4, hTop + 4, 2, 1, ramp.hair);
      PX(ctx, cx, hTop + 7, SHd);
      R(ctx, hx0 + 3, hTop + 9, hw - 6, 1, SH);
    } else if (facing === 'side') {
      R(ctx, hx0 + hw - 4, hTop + 5, 2, 2, '#ffffff');
      PX(ctx, hx0 + hw - 3, hTop + 6, eye);
      R(ctx, hx0 + hw - 4, hTop + 4, 2, 1, ramp.hair);
      R(ctx, hx0 + hw - 1, hTop + 6, 2, 2, ramp.skinHi);
      R(ctx, hx0 + hw - 3, hTop + 9, 3, 1, SH);
    }
  } else if (facing !== 'up') {
    PX(ctx, hx0 + 3, hTop + 5, '#cfe0ff');
    PX(ctx, hx0 + hw - 4, hTop + 5, '#cfe0ff');
    R(ctx, hx0 + 2, hTop + 4, 2, 1, '#e8e8ee');
    R(ctx, hx0 + hw - 4, hTop + 4, 2, 1, '#e8e8ee');
  }

  if (facing !== 'up') drawWeapon(ctx, ox, cls, ramp, facing, pose);
}

// ============================================================================
// MONSTERS
// ============================================================================
export function drawGrunt(ctx: Ctx, ox: number, frame: number, r: MonsterRamp): void {
  const cx = ox + MON_FW / 2;
  const bob = frame === 1 ? -2 : frame === 3 ? 2 : 0;
  const lunge = frame === 3 ? 4 : 0;
  const D = 'rgba(0,0,0,0.24)';
  R(ctx, cx - 10, 16 + bob, 20, 18, r.body1);
  R(ctx, cx - 10, 16 + bob, 20, 2, r.body2);
  R(ctx, cx - 10, 16 + bob, 4, 18, r.body2);
  R(ctx, cx + 6, 16 + bob, 4, 18, D);
  R(ctx, cx - 4, 22 + bob, 8, 8, r.accent);
  R(ctx, cx - 4, 22 + bob, 8, 1, r.detail);
  R(ctx, cx - 10, 10 + bob, 5, 6, r.detail);
  R(ctx, cx + 6, 10 + bob, 5, 6, r.detail);
  PX(ctx, cx - 10, 8 + bob, r.body0);
  PX(ctx, cx + 9, 8 + bob, r.body0);
  R(ctx, cx - 6, 12 + bob, 12, 8, r.body1);
  R(ctx, cx - 6, 12 + bob, 12, 1, r.body2);
  R(ctx, cx - 4, 14 + bob, 4, 4, r.eye);
  R(ctx, cx + 1, 14 + bob, 4, 4, r.eye);
  PX(ctx, cx - 3, 15 + bob, '#ffffff');
  PX(ctx, cx + 2, 15 + bob, '#ffffff');
  if (frame === 3) {
    R(ctx, cx - 4, 19 + bob, 8, 2, '#1a0a0a');
    for (let i = 0; i < 4; i++) PX(ctx, cx - 3 + i * 2, 20 + bob, '#ffffff');
  }
  R(ctx, cx - 8, 34 + bob, 6, 6, r.body0);
  R(ctx, cx + 2, 34 + bob, 6, 6, r.body0);
  R(ctx, cx - 12 - lunge, 20 + bob, 4, 9, r.body1);
  R(ctx, cx + 8 + lunge, 20 + bob, 4, 9, r.body1);
  R(ctx, cx - 12 - lunge, 28 + bob, 4, 2, r.accent);
  R(ctx, cx + 8 + lunge, 28 + bob, 4, 2, r.accent);
}

export function drawGhost(ctx: Ctx, ox: number, frame: number, r: MonsterRamp): void {
  const cx = ox + MON_FW / 2;
  const bob = [0, -2, -4, -2][frame % 4];
  ctx.globalAlpha = 0.92;
  R(ctx, cx - 10, 12 + bob, 20, 18, r.body1);
  R(ctx, cx - 8, 8 + bob, 16, 6, r.body1);
  R(ctx, cx - 6, 6 + bob, 12, 4, r.body2);
  R(ctx, cx - 10, 12 + bob, 4, 18, r.body2);
  R(ctx, cx + 6, 12 + bob, 4, 18, 'rgba(0,0,0,0.2)');
  R(ctx, cx - 5, 12 + bob, 10, 8, 'rgba(0,0,0,0.45)');
  R(ctx, cx - 5, 14 + bob, 4, 3, r.detail);
  R(ctx, cx + 1, 14 + bob, 4, 3, r.detail);
  R(ctx, cx - 4, 14 + bob, 2, 2, r.eye);
  R(ctx, cx + 2, 14 + bob, 2, 2, r.eye);
  PX(ctx, cx - 5, 9 + bob, r.accent);
  const phase = frame % 4;
  for (let i = 0; i < 6; i++) {
    const wob = ((i + phase) % 2) * 4;
    R(ctx, cx - 10 + i * 4, 30 + bob - wob, 4, 6 + wob, r.body1);
  }
  ctx.globalAlpha = 1;
}

export function drawDemon(ctx: Ctx, ox: number, frame: number, r: MonsterRamp): void {
  const cx = ox + MON_FW / 2;
  const bob = frame === 1 || frame === 2 ? -2 : 0;
  const wing = frame === 3 ? 4 : frame === 1 ? 2 : 0;
  const D = 'rgba(0,0,0,0.24)';
  for (const s of [-1, 1]) {
    const wx = cx + s * (10 + wing);
    R(ctx, wx - (s < 0 ? 6 : 0), 12 + bob, 6, 12, r.body0);
    R(ctx, wx - (s < 0 ? 6 : -4), 11 + bob, 2, 14, r.detail);
  }
  R(ctx, cx - 10, 16 + bob, 20, 18, r.body1);
  R(ctx, cx - 10, 16 + bob, 4, 18, r.body2);
  R(ctx, cx + 6, 16 + bob, 4, 18, D);
  R(ctx, cx - 4, 22 + bob, 8, 8, r.accent);
  R(ctx, cx - 1, 25 + bob, 3, 3, C.fireCore);
  R(ctx, cx - 10, 8 + bob, 4, 7, r.detail);
  R(ctx, cx + 6, 8 + bob, 4, 7, r.detail);
  PX(ctx, cx - 11, 6 + bob, r.detail);
  PX(ctx, cx + 10, 6 + bob, r.detail);
  R(ctx, cx - 6, 11 + bob, 12, 8, r.body2);
  R(ctx, cx - 6, 11 + bob, 12, 1, r.body1);
  R(ctx, cx - 4, 14 + bob, 4, 3, r.eye);
  R(ctx, cx + 1, 14 + bob, 4, 3, r.eye);
  PX(ctx, cx - 3, 15 + bob, '#fff');
  PX(ctx, cx + 2, 15 + bob, '#fff');
  R(ctx, cx - 8, 34 + bob, 6, 6, r.body0);
  R(ctx, cx + 2, 34 + bob, 6, 6, r.body0);
  R(ctx, cx + 8, 30 + bob, 6, 2, r.body0);
  R(ctx, cx + 13, 28 + bob, 2, 3, r.accent);
  if (frame === 3) { R(ctx, cx - 4, 19 + bob, 8, 2, '#1a0000'); for (let i = 0; i < 4; i++) PX(ctx, cx - 3 + i * 2, 20 + bob, '#fff'); }
}

export function drawBoss(ctx: Ctx, ox: number, frame: number, r: MonsterRamp): void {
  const cx = ox + BOSS_FW / 2;
  const bob = [0, -2, -4, 0][frame % 4];
  const cast = frame === 3;
  const D = 'rgba(0,0,0,0.3)';
  R(ctx, cx - 24, 24 + bob, 48, 44, r.body0);
  R(ctx, cx - 24, 24 + bob, 4, 44, r.body1);
  R(ctx, cx + 20, 24 + bob, 4, 44, D);
  for (let i = 0; i < 7; i++) { const h = (i % 2) * 6; R(ctx, cx - 24 + i * 7, 64 + bob - h, 6, 8 + h, r.body0); }
  R(ctx, cx - 14, 28 + bob, 28, 28, r.body1);
  R(ctx, cx - 14, 28 + bob, 28, 2, r.body2);
  for (let i = 0; i < 4; i++) R(ctx, cx - 12, 34 + bob + i * 4, 24, 2, r.detail);
  R(ctx, cx - 6, 36 + bob, 12, 12, r.accent);
  R(ctx, cx - 3, 40 + bob, 6, 4, C.portalCore);
  R(ctx, cx - 22, 26 + bob, 10, 8, r.body0);
  R(ctx, cx + 12, 26 + bob, 10, 8, r.body0);
  R(ctx, cx - 22, 22 + bob, 4, 6, r.detail);
  R(ctx, cx + 18, 22 + bob, 4, 6, r.detail);
  R(ctx, cx - 10, 8 + bob, 20, 18, '#d8dce8');
  R(ctx, cx - 10, 8 + bob, 20, 2, '#ffffff');
  R(ctx, cx - 8, 14 + bob, 6, 6, r.detail);
  R(ctx, cx + 2, 14 + bob, 6, 6, r.detail);
  R(ctx, cx - 8, 14 + bob, 6, 4, r.eye);
  R(ctx, cx + 2, 14 + bob, 6, 4, r.eye);
  R(ctx, cx - 6, 22 + bob, 12, 3, '#9aa0b4');
  for (let i = 0; i < 6; i++) PX(ctx, cx - 5 + i * 2, 23 + bob, r.detail);
  R(ctx, cx - 10, 4 + bob, 20, 4, C.coinMid);
  R(ctx, cx - 10, 2 + bob, 2, 4, C.coinHi);
  R(ctx, cx - 2, 0 + bob, 4, 4, C.coinHi);
  R(ctx, cx + 8, 2 + bob, 2, 4, C.coinHi);
  PX(ctx, cx, 2 + bob, C.gem);
  const ay = cast ? 10 : 18;
  R(ctx, cx + 18, ay + bob, 4, 28, r.body1);
  R(ctx, cx + 14, ay - 4 + bob, 12, 4, '#aeb6cc');
  R(ctx, cx + 24, ay - 8 + bob, 4, 8, '#dfe6ff');
  if (cast) { R(ctx, cx - 28, 32 + bob, 8, 8, r.accent); R(ctx, cx - 26, 34 + bob, 4, 4, C.portalCore); }
}
