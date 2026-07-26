import { C } from './Palette';
import { R, PX, rng, type Ctx } from './spriteArt';

// ----------------------------------------------------------------------------
// fxArt — the effects half of StrongBow's procedural art.
//
// Two distinct classes of texture live here, and the difference matters:
//
//   HARD FX  — shards, sparks, rings, arcs, bolts, motes. Drawn with the same
//              crunchy 1px discipline as the sprites (midpoint circles, integer
//              rects) so a shockwave still looks like *pixel art* when it rips
//              across the floor. These sit in the world layer.
//
//   LIGHT FX — bloom dots, glow rings, god rays, fog banks, beam cores. Pure
//              radial/linear gradients meant to be drawn with ADD blending on a
//              layer ABOVE the pixels. Gradients are legal here and only here
//              (ART_DIRECTION principle 9).
//
// Everything is pure canvas — no Phaser, no DOM — so tools/render_preview.cjs
// can bake contact sheets headlessly.
// ----------------------------------------------------------------------------

export type { Ctx };

// ---------------------------------------------------------------- helpers ---

/** Midpoint circle outline, 1px, no anti-aliasing. The backbone of every ring. */
export function pxRing(ctx: Ctx, cx: number, cy: number, rad: number, color: string, squashY = 1): void {
  if (rad < 0.5) return;
  ctx.fillStyle = color;
  // Sample by angle rather than Bresenham so the squash (for ground-plane
  // ellipses) stays even; dedupe via a small set so alpha doesn't double up.
  const seen = new Set<number>();
  const steps = Math.max(12, Math.round(rad * 8));
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const x = Math.round(cx + Math.cos(a) * rad);
    const y = Math.round(cy + Math.sin(a) * rad * squashY);
    const k = y * 512 + x;
    if (seen.has(k)) continue;
    seen.add(k);
    ctx.fillRect(x, y, 1, 1);
  }
}

/** Filled midpoint disc — used for cores and blobs that must stay crunchy. */
export function pxDisc(ctx: Ctx, cx: number, cy: number, rad: number, color: string, squashY = 1): void {
  ctx.fillStyle = color;
  const r2 = rad * rad;
  for (let y = Math.floor(-rad * squashY); y <= Math.ceil(rad * squashY); y++) {
    for (let x = Math.floor(-rad); x <= Math.ceil(rad); x++) {
      const yy = y / squashY;
      if (x * x + yy * yy <= r2) ctx.fillRect(Math.round(cx + x), Math.round(cy + y), 1, 1);
    }
  }
}

/** A pixel arc (start/end in radians). Used for slash sweeps and crescents. */
export function pxArc(ctx: Ctx, cx: number, cy: number, rad: number, a0: number, a1: number, thick: number, color: string): void {
  ctx.fillStyle = color;
  const steps = Math.max(8, Math.round(rad * 6));
  for (let i = 0; i <= steps; i++) {
    const a = a0 + ((a1 - a0) * i) / steps;
    for (let t = 0; t < thick; t++) {
      const rr = rad - t;
      ctx.fillRect(Math.round(cx + Math.cos(a) * rr), Math.round(cy + Math.sin(a) * rr), 1, 1);
    }
  }
}

/** Soft additive bloom. `color` must be an rgba() string. */
export function softGlow(ctx: Ctx, cx: number, cy: number, rad: number, color: string, coreWhite = 0.2): void {
  const mid = color.replace(/,\s*[\d.]+\)$/, ',0.45)');
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(coreWhite, color);
  g.addColorStop(0.6, mid);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
}

// ============================================================================
// HARD FX — world-layer pixel effects
// ============================================================================

export const SHOCK_SIZE = 64;
/**
 * Expanding ground shockwave: a hard pixel ellipse that thins and fades as it
 * grows, with a leading white rim. Squashed to 0.45 so it reads as lying flat on
 * the floor rather than facing the camera — the single biggest cue that a slam
 * happened *in the world* and not on the HUD.
 */
export function drawShockRing(ctx: Ctx, ox: number, frame: number): void {
  const cx = ox + SHOCK_SIZE / 2;
  const cy = SHOCK_SIZE / 2;
  const t = frame / 5;
  const rad = 4 + t * 26;
  const a = 1 - t * 0.85;
  ctx.globalAlpha = Math.max(0, a);
  pxRing(ctx, cx, cy, rad, '#ffffff', 0.45);
  ctx.globalAlpha = Math.max(0, a * 0.7);
  pxRing(ctx, cx, cy, rad - 1, C.spark, 0.45);
  ctx.globalAlpha = Math.max(0, a * 0.4);
  pxRing(ctx, cx, cy, rad - 2.5, C.spark, 0.45);
  // kicked-up grit riding the leading edge
  const r = rng(frame * 977 + 13);
  ctx.globalAlpha = Math.max(0, a * 0.9);
  for (let i = 0; i < 10; i++) {
    const ang = r() * Math.PI * 2;
    const rr = rad + r() * 3;
    PX(ctx, Math.round(cx + Math.cos(ang) * rr), Math.round(cy + Math.sin(ang) * rr * 0.45), '#ffffff');
  }
  ctx.globalAlpha = 1;
}

export const IMPACT_SIZE = 32;
/**
 * Melee contact burst: a 6-spoke asterisk of shards that fly outward and thin.
 * Frame 0 is a solid white flash — that single bright frame is what sells the
 * "something just connected" read even at 60fps.
 */
export function drawImpactBurst(ctx: Ctx, ox: number, frame: number): void {
  const cx = ox + IMPACT_SIZE / 2;
  const cy = IMPACT_SIZE / 2;
  const t = frame / 4;
  if (frame === 0) {
    pxDisc(ctx, cx, cy, 5, '#ffffff');
    pxDisc(ctx, cx, cy, 7, 'rgba(255,255,255,0.35)');
    return;
  }
  const inner = 2 + t * 7;
  const len = 5 - t * 2.5;
  ctx.globalAlpha = 1 - t * 0.7;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    for (let s = 0; s < len; s++) {
      const rr = inner + s;
      const col = s < len * 0.4 ? '#ffffff' : s < len * 0.75 ? C.spark : C.fireMid;
      PX(ctx, Math.round(cx + dx * rr), Math.round(cy + dy * rr), col);
    }
  }
  pxDisc(ctx, cx, cy, Math.max(0, 3 - t * 3), '#ffffff');
  ctx.globalAlpha = 1;
}

export const SLASH_W = 48;
export const SLASH_H = 48;
/**
 * A big crescent sweep for melee swings. The arc rotates AND thins across the 5
 * frames so it reads as a blade travelling through an arc rather than a decal
 * fading out. Drawn facing right; the scene rotates it to the swing direction.
 */
export function drawSlashArc(ctx: Ctx, ox: number, frame: number): void {
  const cx = ox + 10;
  const cy = SLASH_H / 2;
  const t = frame / 4;
  const sweep = 1.5 - t * 0.35;
  const a0 = -sweep / 2 + t * 0.5;
  const rad = 24 + t * 6;
  ctx.globalAlpha = 1 - t * 0.75;
  pxArc(ctx, cx, cy, rad, a0, a0 + sweep, Math.max(1, Math.round(4 - t * 3)), '#ffffff');
  ctx.globalAlpha = (1 - t * 0.75) * 0.85;
  pxArc(ctx, cx, cy, rad - 3, a0 + 0.08, a0 + sweep - 0.08, Math.max(1, Math.round(3 - t * 2)), C.spark);
  ctx.globalAlpha = (1 - t * 0.75) * 0.5;
  pxArc(ctx, cx, cy, rad - 6, a0 + 0.2, a0 + sweep - 0.2, 1, C.fireMid);
  // tip spark that leads the sweep
  if (frame < 3) {
    const tip = a0 + sweep;
    pxDisc(ctx, cx + Math.cos(tip) * rad, cy + Math.sin(tip) * rad, 2 - frame * 0.5, '#ffffff');
  }
  ctx.globalAlpha = 1;
}

/** A single flying debris chunk. Tinted per material by the emitter. */
export function drawShard(ctx: Ctx): void {
  R(ctx, 1, 1, 4, 3, '#ffffff');
  R(ctx, 1, 1, 3, 1, '#ffffff');
  R(ctx, 2, 3, 3, 1, 'rgba(0,0,0,0.35)');
  PX(ctx, 0, 2, 'rgba(255,255,255,0.6)');
}

/** A hot spark with a short trailing tail (points right; emitter rotates it). */
export function drawSpark(ctx: Ctx): void {
  R(ctx, 5, 2, 3, 2, '#ffffff');
  R(ctx, 2, 2, 3, 2, C.spark);
  R(ctx, 0, 3, 2, 1, 'rgba(255,180,60,0.55)');
}

/** Four-point twinkle for crits, loot glints and level-up sparkle. */
export function drawCritStar(ctx: Ctx): void {
  const c = 8;
  R(ctx, c - 1, 0, 2, 16, 'rgba(255,255,255,0.25)');
  R(ctx, 0, c - 1, 16, 2, 'rgba(255,255,255,0.25)');
  R(ctx, c - 1, 2, 2, 12, C.spark);
  R(ctx, 2, c - 1, 12, 2, C.spark);
  R(ctx, c - 1, 5, 2, 6, '#ffffff');
  R(ctx, 5, c - 1, 6, 2, '#ffffff');
  pxDisc(ctx, c, c, 2, '#ffffff');
}

export const PUFF_SIZE = 24;
/**
 * A dissipating smoke/dust puff in 4 frames. Built from overlapping pixel discs
 * that drift apart — cheap, but the clustered-blob silhouette reads far more
 * like hand-drawn smoke than a scaled soft circle does.
 */
export function drawSmokePuff(ctx: Ctx, ox: number, frame: number, tint = 'rgba(210,214,232,'): void {
  const cx = ox + PUFF_SIZE / 2;
  const cy = PUFF_SIZE / 2;
  const t = frame / 3;
  const r = rng(97);
  const blobs = 7;
  // Two passes: a fat low-alpha body, then a smaller bright cap offset up-left
  // to keep the key light consistent even on something as soft as smoke.
  for (let i = 0; i < blobs; i++) {
    const a = (i / blobs) * Math.PI * 2 + 0.4;
    const spread = t * 6.5;
    const bx = cx + Math.cos(a) * spread;
    const by = cy + Math.sin(a) * spread * 0.7 - t * 3;
    const rad = (5.2 - t * 2.0) * (0.75 + r() * 0.45);
    pxDisc(ctx, bx, by, rad, `${tint}${(0.42 - t * 0.30).toFixed(2)})`);
  }
  const r2 = rng(97);
  for (let i = 0; i < blobs; i++) {
    const a = (i / blobs) * Math.PI * 2 + 0.4;
    const spread = t * 6.5;
    const bx = cx + Math.cos(a) * spread - 1;
    const by = cy + Math.sin(a) * spread * 0.7 - t * 3 - 1;
    const rad = (5.2 - t * 2.0) * (0.75 + r2() * 0.45) * 0.55;
    pxDisc(ctx, bx, by, rad, `${tint}${(0.62 - t * 0.48).toFixed(2)})`);
  }
}

export const BOLT_W = 24;
export const BOLT_H = 48;
/**
 * A jagged lightning bolt, 3 frames of flicker. Drawn top-to-bottom in the
 * texture; the scene rotates/stretches it between two points.
 */
export function drawLightning(ctx: Ctx, ox: number, frame: number): void {
  const r = rng(frame * 7919 + 31);
  let x = ox + BOLT_W / 2;
  const seg = 6;
  ctx.globalAlpha = frame === 1 ? 1 : 0.8;
  for (let y = 0; y < BOLT_H; y += seg) {
    const nx = x + Math.round((r() - 0.5) * 9);
    const steps = seg;
    for (let s = 0; s < steps; s++) {
      const px = Math.round(x + ((nx - x) * s) / steps);
      R(ctx, px - 1, y + s, 3, 1, 'rgba(150,190,255,0.55)');
      PX(ctx, px, y + s, '#ffffff');
    }
    // forked branch
    if (r() < 0.35) {
      let bx = nx;
      for (let b = 0; b < 5; b++) {
        bx += r() < 0.5 ? -1 : 1;
        PX(ctx, Math.round(bx), y + seg + b, 'rgba(200,225,255,0.75)');
      }
    }
    x = nx;
  }
  ctx.globalAlpha = 1;
}

export const SIGIL_SIZE = 48;
/**
 * A rotating arcane sigil — outer rune ring, inner counter-rotating triangle,
 * hot core. Used as the cast telegraph under a caster's feet and for portals.
 */
export function drawRuneSigil(ctx: Ctx, ox: number, frame: number, color = C.magicHot): void {
  const cx = ox + SIGIL_SIZE / 2;
  const cy = SIGIL_SIZE / 2;
  const spin = (frame / 6) * Math.PI * 2;
  const SQ = 0.42; // ground-plane squash: the sigil lies on the floor
  ctx.globalAlpha = 0.95;
  pxRing(ctx, cx, cy, 20, color, SQ);
  ctx.globalAlpha = 0.6;
  pxRing(ctx, cx, cy, 11, color, SQ);
  // rune ticks marching around the outer ring (the rotation cue)
  ctx.globalAlpha = 1;
  for (let i = 0; i < 8; i++) {
    const a = spin + (i / 8) * Math.PI * 2;
    const long = i % 2 === 0;
    for (let t = 0; t < (long ? 4 : 2); t++) {
      PX(
        ctx,
        Math.round(cx + Math.cos(a) * (21 + t)),
        Math.round(cy + Math.sin(a) * (21 + t) * SQ),
        long ? '#ffffff' : color
      );
    }
  }
  // three spokes counter-rotating inside — cheap, and the opposed motion is what
  // makes a flat ring read as machinery rather than a decal.
  ctx.globalAlpha = 0.8;
  for (let i = 0; i < 3; i++) {
    const a = -spin + (i / 3) * Math.PI * 2;
    for (let s = 4; s <= 11; s++) {
      PX(ctx, Math.round(cx + Math.cos(a) * s), Math.round(cy + Math.sin(a) * s * SQ), color);
    }
  }
  ctx.globalAlpha = 1;
  pxDisc(ctx, cx, cy, 2.4, '#ffffff');
}

// ---- ambient motes: tiny, cheap, one texture each, tinted by the emitter ----

/** Rising ember: hot core, soft halo. */
export function drawEmber(ctx: Ctx): void {
  softGlow(ctx, 4, 4, 4, 'rgba(255,150,40,0.9)');
  PX(ctx, 4, 4, '#ffffff');
}

/** Six-arm snowflake at 8px — reads as a crystal, not a dot. */
export function drawSnowflake(ctx: Ctx): void {
  const c = 4;
  ctx.fillStyle = 'rgba(230,248,255,0.95)';
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI;
    for (let s = -3; s <= 3; s++) {
      ctx.fillRect(Math.round(c + Math.cos(a) * s), Math.round(c + Math.sin(a) * s), 1, 1);
    }
  }
  PX(ctx, c, c, '#ffffff');
}

/** Fat drifting spore with a dark rim so it reads against bright bog floors. */
export function drawSpore(ctx: Ctx): void {
  pxDisc(ctx, 4, 4, 2.6, 'rgba(150,235,90,0.55)');
  pxDisc(ctx, 4, 4, 1.6, 'rgba(200,255,140,0.9)');
  PX(ctx, 3, 3, '#ffffff');
}

/** Ash flake — irregular, low-alpha, for shadow/molten realms. */
export function drawAsh(ctx: Ctx): void {
  R(ctx, 2, 3, 3, 2, 'rgba(70,60,80,0.75)');
  R(ctx, 3, 2, 2, 3, 'rgba(110,96,124,0.6)');
  PX(ctx, 3, 3, 'rgba(190,170,205,0.7)');
}

/** Rain streak (vertical); the emitter tilts it for wind. */
export function drawRainStreak(ctx: Ctx): void {
  R(ctx, 1, 0, 1, 8, 'rgba(190,215,255,0.5)');
  R(ctx, 1, 2, 1, 4, 'rgba(235,245,255,0.85)');
}

/** Dust mote — the quiet default for crypts and interiors. */
export function drawDustMote(ctx: Ctx): void {
  pxDisc(ctx, 4, 4, 1.6, 'rgba(220,214,196,0.5)');
  PX(ctx, 4, 4, 'rgba(255,250,235,0.9)');
}

/** Blood droplet for hit spray (tinted green/violet for non-red foes). */
export function drawGoreDrop(ctx: Ctx): void {
  R(ctx, 1, 1, 3, 3, '#c01b22');
  R(ctx, 1, 1, 2, 1, '#ff4a52');
  PX(ctx, 3, 3, '#6b0a0e');
}

export const SOUL_SIZE = 16;
/** A rising soul wisp for deaths: a teardrop flame with a bright eye. */
export function drawSoulWisp(ctx: Ctx, ox: number, frame: number): void {
  const cx = ox + 8;
  const t = frame / 3;
  const wob = Math.sin(frame * 1.7) * 1.5;
  ctx.globalAlpha = 1 - t * 0.5;
  pxDisc(ctx, cx + wob, 9 - t * 2, 3.4 - t, 'rgba(150,200,255,0.55)');
  pxDisc(ctx, cx + wob, 8 - t * 2, 2.2 - t * 0.6, 'rgba(220,240,255,0.9)');
  // trailing tail
  for (let i = 0; i < 4; i++) {
    PX(ctx, Math.round(cx + wob * (1 - i / 4)), Math.round(12 - t * 2 + i), `rgba(170,210,255,${0.5 - i * 0.1})`);
  }
  PX(ctx, Math.round(cx + wob), Math.round(7 - t * 2), '#ffffff');
  ctx.globalAlpha = 1;
}

// ============================================================================
// GROUND DECALS — the marks a fight leaves behind
//
// These are the only FX that persist. They are drawn as irregular pixel splats
// rather than soft gradients, because a decal sits ON the floor at the same
// resolution as the floor: blur it and it reads as a lighting artefact instead
// of as a stain. All are authored wide and short so they lie flat in the
// top-down projection, and all are tinted at runtime.
// ============================================================================

export const DECAL_W = 32;
export const DECAL_H = 20;

/** Irregular splat body shared by every decal kind. */
function splat(ctx: Ctx, seed: number, blobs: number, core: string, rim: string, drops: number): void {
  const r = rng(seed);
  const cx = DECAL_W / 2;
  const cy = DECAL_H / 2;
  // rim first, then a smaller core inset — two tones is enough to read as depth
  for (let pass = 0; pass < 2; pass++) {
    const col = pass === 0 ? rim : core;
    const shrink = pass === 0 ? 1 : 0.62;
    const rr = rng(seed); // same shape both passes, just smaller
    for (let i = 0; i < blobs; i++) {
      const a = (i / blobs) * Math.PI * 2 + rr() * 0.6;
      const d = (1.5 + rr() * 5.5) * shrink;
      pxDisc(ctx, cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.55, (2.2 + rr() * 3.4) * shrink, col, 0.6);
    }
  }
  // flung droplets around the edge — the detail that stops it looking stamped
  for (let i = 0; i < drops; i++) {
    const a = r() * Math.PI * 2;
    const d = 8 + r() * 6;
    const x = Math.round(cx + Math.cos(a) * d);
    const y = Math.round(cy + Math.sin(a) * d * 0.55);
    R(ctx, x, y, r() < 0.4 ? 2 : 1, 1, rim);
  }
}

/** A pool of viscera. Tinted per creature by the emitter. */
export function drawDecalBlood(ctx: Ctx): void {
  splat(ctx, 8821, 7, '#b3161d', '#6d0a10', 7);
  // a wet highlight catching the light from the upper left
  PX(ctx, DECAL_W / 2 - 3, DECAL_H / 2 - 2, 'rgba(255,120,120,0.55)');
  PX(ctx, DECAL_W / 2 - 2, DECAL_H / 2 - 2, 'rgba(255,150,150,0.35)');
}

/** Burned ground: a black core ringed with still-hot ember pixels. */
export function drawDecalScorch(ctx: Ctx): void {
  splat(ctx, 4471, 8, '#140a06', '#33170c', 5);
  const r = rng(991);
  for (let i = 0; i < 9; i++) {
    const a = r() * Math.PI * 2;
    const d = 4 + r() * 7;
    PX(ctx, Math.round(DECAL_W / 2 + Math.cos(a) * d), Math.round(DECAL_H / 2 + Math.sin(a) * d * 0.55), i % 2 ? C.fireMid : C.fireEdge);
  }
}

/** A rime patch: crystalline rather than blobby, so it reads as ice not paint. */
export function drawDecalFrost(ctx: Ctx): void {
  splat(ctx, 6113, 7, '#a8dcf4', '#4e86ad', 4);
  const cx = DECAL_W / 2;
  const cy = DECAL_H / 2;
  // radiating fracture spokes
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    for (let s = 2; s < 9; s++) {
      PX(ctx, Math.round(cx + Math.cos(a) * s), Math.round(cy + Math.sin(a) * s * 0.55), s > 6 ? '#ffffff' : '#dff2ff');
    }
  }
}

/** A hole where the floor used to be — void realms and shadow deaths. */
export function drawDecalVoid(ctx: Ctx): void {
  splat(ctx, 2237, 7, '#0a0416', '#241040', 5);
  const r = rng(773);
  for (let i = 0; i < 7; i++) {
    const a = r() * Math.PI * 2;
    const d = 3 + r() * 7;
    PX(ctx, Math.round(DECAL_W / 2 + Math.cos(a) * d), Math.round(DECAL_H / 2 + Math.sin(a) * d * 0.55), i % 3 ? '#8a5ad0' : '#c79bff');
  }
}

/** Fractured stone — heavy slams and boss landings. */
export function drawDecalCrack(ctx: Ctx): void {
  const cx = DECAL_W / 2;
  const cy = DECAL_H / 2;
  const r = rng(5519);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + r() * 0.5;
    let x = cx;
    let y = cy;
    const len = 5 + r() * 8;
    for (let s = 0; s < len; s++) {
      x += Math.cos(a) + (r() - 0.5) * 0.8;
      y += (Math.sin(a) + (r() - 0.5) * 0.8) * 0.55;
      R(ctx, Math.round(x), Math.round(y), 1, 1, 'rgba(8,6,4,0.85)');
      if (s < len - 2) PX(ctx, Math.round(x), Math.round(y) + 1, 'rgba(255,255,255,0.14)');
    }
  }
  pxDisc(ctx, cx, cy, 2.4, 'rgba(8,6,4,0.8)', 0.6);
}

// ============================================================================
// LIGHT FX — additive layers drawn above the pixels
// ============================================================================

/**
 * Soft glow donut — the halo under torches, on loot, around auras. Hollow so it
 * can ring a sprite without washing out its face.
 */
export function drawGlowRing(ctx: Ctx, size: number, color = 'rgba(255,210,120,0.9)'): void {
  const c = size / 2;
  const g = ctx.createRadialGradient(c, c, size * 0.18, c, c, c);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.42, color.replace(/,\s*[\d.]+\)$/, ',0.30)'));
  g.addColorStop(0.66, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
}

/**
 * A 1px-tall gradient strip. Stretch horizontally for beams/lasers; the hot
 * white middle band means a stretched copy still has a believable core.
 */
export function drawBeamCore(ctx: Ctx, w: number, h: number, color = 'rgba(180,140,255,1)'): void {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.3, color.replace(/,\s*[\d.]+\)$/, ',0.55)'));
  g.addColorStop(0.5, 'rgba(255,255,255,1)');
  g.addColorStop(0.7, color.replace(/,\s*[\d.]+\)$/, ',0.55)'));
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/**
 * A vertical shaft of light (god ray). Tapers and fades downward; drawn as a
 * skewed quad so a column of these at varying x reads as sun through a grate.
 */
export function drawGodRay(ctx: Ctx, w: number, h: number, color = 'rgba(255,240,200,0.55)'): void {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, color);
  g.addColorStop(0.55, color.replace(/,\s*[\d.]+\)$/, ',0.16)'));
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(w * 0.34, 0);
  ctx.lineTo(w * 0.66, 0);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();
}

/**
 * A soft horizontal haze bank for ground fog. Several overlapping ellipses of
 * very low alpha; scrolled slowly and tiled, it gives depth without ever
 * obscuring a monster's silhouette.
 */
export function drawFogBank(ctx: Ctx, w: number, h: number, color = 'rgba(150,170,220,0.20)'): void {
  const r = rng(4242);
  for (let i = 0; i < 14; i++) {
    const cx = r() * w;
    const cy = h * (0.3 + r() * 0.5);
    const rx = w * (0.10 + r() * 0.16);
    const ry = h * (0.16 + r() * 0.20);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, ry / rx);
    ctx.beginPath();
    ctx.arc(0, 0, rx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/**
 * A drop-shadow blob with a genuinely soft edge — replaces the old two-ellipse
 * stack. Wider than tall and darkest at the contact point.
 */
export function drawSoftShadow(ctx: Ctx, w: number, h: number): void {
  const cx = w / 2;
  const cy = h / 2;
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, w / 2);
  g.addColorStop(0, 'rgba(0,0,0,0.55)');
  g.addColorStop(0.55, 'rgba(0,0,0,0.30)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, h / w);
  ctx.translate(-cx, -cy);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, w / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Vertical light column for level-ups and boss awakenings — bright hot core,
 * fading top and bottom, so it can be scaled up from the hero's feet.
 */
export function drawLightPillar(ctx: Ctx, w: number, h: number, color = 'rgba(255,214,90,0.9)'): void {
  const g = ctx.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.35, color.replace(/,\s*[\d.]+\)$/, ',0.35)'));
  g.addColorStop(0.5, 'rgba(255,255,255,0.95)');
  g.addColorStop(0.65, color.replace(/,\s*[\d.]+\)$/, ',0.35)'));
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // fade the very top so it doesn't end in a hard line
  const fade = ctx.createLinearGradient(0, 0, 0, h);
  fade.addColorStop(0, 'rgba(0,0,0,1)');
  fade.addColorStop(0.25, 'rgba(0,0,0,0)');
  fade.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
}

/**
 * Screen-space scanline + phosphor grille overlay. Extremely subtle (2–4%) —
 * enough to make flat colour fields feel like a CRT without eating contrast.
 */
export function drawScanlines(ctx: Ctx, w: number, h: number): void {
  ctx.fillStyle = 'rgba(0,0,0,0.14)';
  for (let y = 1; y < h; y += 3) ctx.fillRect(0, y, w, 1);
  ctx.fillStyle = 'rgba(120,160,255,0.03)';
  for (let x = 0; x < w; x += 3) ctx.fillRect(x, 0, 1, h);
}

// ---------------------------------------------------------------- preview ---
/** Frame sequences exposed to tools/render_preview.cjs. */
export function PREVIEW_SEQUENCES(
  c: typeof C
): [string, number, number, number, (ctx: Ctx, ox: number, frame: number) => void][] {
  return [
    ['shock ring', 6, SHOCK_SIZE, SHOCK_SIZE, drawShockRing],
    ['impact burst', 5, IMPACT_SIZE, IMPACT_SIZE, drawImpactBurst],
    ['slash arc', 5, SLASH_W, SLASH_H, drawSlashArc],
    ['smoke puff', 4, PUFF_SIZE, PUFF_SIZE, (ctx, ox, f) => drawSmokePuff(ctx, ox, f)],
    ['lightning', 3, BOLT_W, BOLT_H, drawLightning],
    ['rune sigil', 6, SIGIL_SIZE, SIGIL_SIZE, (ctx, ox, f) => drawRuneSigil(ctx, ox, f, c.magicHot)],
    ['soul wisp', 4, SOUL_SIZE, SOUL_SIZE, drawSoulWisp],
    ['motes', 1, 8, 8, (ctx) => drawEmber(ctx)],
    ['decal blood', 1, DECAL_W, DECAL_H, (ctx) => drawDecalBlood(ctx)],
    ['decal scorch', 1, DECAL_W, DECAL_H, (ctx) => drawDecalScorch(ctx)],
    ['decal frost', 1, DECAL_W, DECAL_H, (ctx) => drawDecalFrost(ctx)],
    ['decal void', 1, DECAL_W, DECAL_H, (ctx) => drawDecalVoid(ctx)],
    ['decal crack', 1, DECAL_W, DECAL_H, (ctx) => drawDecalCrack(ctx)],
  ];
}
