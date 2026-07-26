import { R, PX, rng, stepBar, BOSS_FW, type Ctx } from './spriteArt';
import { C } from './Palette';
import type { MonsterRamp } from './Palette';

// ============================================================================
// REALM WARDENS — bespoke boss silhouettes (80×80; frames 0-2 idle, 3 = attack)
//
// These replace the old "one shape, ten palettes" approach, which was the single
// most algorithmic-looking thing in the game: eight wardens sharing two outlines.
//
// A boss is the most-screenshotted thing in a run, so each gets its own
// SILHOUETTE. The test: squint until the colour disappears and you should still
// know which warden you are fighting. Every one is built around a different
// negative-space idea — vertical pipes, a mushroom overhang, industrial boxes, a
// plumed crest, a low coil, spread wings, a ragged mass, a hollow shell.
//
// Conventions shared with spriteArt: integer rects only, light from the upper
// left, `r.glow`/`r.accent` are the only saturated colours, frame 3 is the
// attack pose and is allowed to break the silhouette.
// ============================================================================

/** Soft contact pool so a boss sits IN the floor rather than on top of it. */
function bossBase(ctx: Ctx, cx: number, y: number, halfW: number): void {
  ctx.fillStyle = 'rgba(0,0,0,0.34)';
  ctx.beginPath();
  ctx.ellipse(cx, y, halfW, halfW * 0.26, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** A glowing eye pair with a hot white core — the arcade "it is looking at you". */
function glowEyes(ctx: Ctx, cx: number, y: number, gap: number, w: number, h: number, col: string): void {
  R(ctx, cx - gap - w, y, w, h, col);
  R(ctx, cx + gap, y, w, h, col);
  R(ctx, cx - gap - w + 1, y + Math.max(0, h - 2), Math.max(1, w - 2), 1, '#ffffff');
  R(ctx, cx + gap + 1, y + Math.max(0, h - 2), Math.max(1, w - 2), 1, '#ffffff');
}

/** Irregular dagged hem — the classic "this robe is ancient" tell. */
function tatterHem(ctx: Ctx, x: number, y: number, w: number, col: string, seed: number, maxLen = 7): void {
  const rr = rng(seed);
  for (let i = 0; i < w; i += 2) {
    const len = 1 + Math.floor(rr() * maxLen);
    R(ctx, x + i, y, 2, len, col);
  }
}

// ---------------------------------------------------------------------------
// RIME CANTOR (frost) — a singing ice-priest. Silhouette: a narrow vertical
// figure in front of a fanned rank of organ pipes. Reads as "tall and thin"
// against every other warden's mass.
// ---------------------------------------------------------------------------
export function drawRimeCantor(ctx: Ctx, ox: number, frame: number, r: MonsterRamp): void {
  const cx = ox + BOSS_FW / 2;
  const bob = [0, -2, -3, -1][frame % 4];
  const sing = frame === 3;
  const glow = r.glow ?? r.accent;
  bossBase(ctx, cx, 70, 22);

  // ---- fanned ice organ pipes behind the body (the signature shape) ----
  for (let i = 0; i < 7; i++) {
    const d = i - 3;
    const px = cx + d * 9 - 2;
    const h = 46 - Math.abs(d) * 7 + (sing ? 4 - Math.abs(d) : 0);
    const top = 56 - h + bob;
    R(ctx, px, top, 5, h, r.body0);
    R(ctx, px, top, 2, h, r.body1);
    R(ctx, px, top, 5, 2, r.body2); // frosted cap
    if (sing || Math.abs(d) < 2) R(ctx, px + 1, top + 3, 1, h - 6, glow);
  }

  // ---- robe: narrow at the shoulders, flaring into a frozen skirt ----
  R(ctx, cx - 9, 22 + bob, 18, 6, r.body1);
  R(ctx, cx - 11, 28 + bob, 22, 20, r.body1);
  R(ctx, cx - 14, 48 + bob, 28, 14, r.body1);
  R(ctx, cx - 14, 48 + bob, 6, 14, r.body2); // lit left face
  R(ctx, cx + 9, 28 + bob, 5, 34, 'rgba(0,0,0,0.28)'); // shadowed right face
  R(ctx, cx - 11, 28 + bob, 5, 20, r.body2);
  tatterHem(ctx, cx - 14, 62 + bob, 28, r.body0, 991, 8); // dissolving into frost

  // ---- stole of light down the chest ----
  R(ctx, cx - 2, 26 + bob, 4, 30, glow);
  R(ctx, cx - 1, 26 + bob, 2, 30, '#ffffff');

  // ---- conducting arms: raised, and higher still on the sing frame ----
  const armY = (sing ? 12 : 20) + bob;
  for (const s of [-1, 1]) {
    R(ctx, cx + s * 14 - 2, armY, 4, 18, r.body1);
    R(ctx, cx + s * 14 - 2, armY, 4, 3, r.body2);
    R(ctx, cx + s * 16 - 3, armY - 4, 5, 5, r.accent); // frozen hand
    if (sing) R(ctx, cx + s * 17 - 3, armY - 9, 3, 5, glow);
  }

  // ---- hooded head with a hollow singing mouth ----
  R(ctx, cx - 8, 6 + bob, 16, 18, r.body1);
  R(ctx, cx - 8, 6 + bob, 16, 2, r.body2);
  R(ctx, cx - 8, 6 + bob, 3, 18, r.body2);
  R(ctx, cx - 6, 10 + bob, 12, 12, '#0a1a28'); // shadowed face recess
  glowEyes(ctx, cx, 13 + bob, 2, 4, 3, r.eye);
  // the mouth is a vertical slit of light — it *sings*, so it opens on frame 3
  R(ctx, cx - 1, 17 + bob, 3, sing ? 6 : 3, glow);
  if (sing) {
    R(ctx, cx - 2, 18 + bob, 5, 4, '#ffffff');
    // sound made visible: arcs of cold spilling out of the mouth
    for (let i = 0; i < 3; i++) {
      ctx.globalAlpha = 0.45 - i * 0.12;
      ctx.strokeStyle = glow;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, 20 + bob, 10 + i * 7, -0.9, 0.9);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  // crown of icicles
  for (let i = 0; i < 5; i++) {
    const d = i - 2;
    R(ctx, cx + d * 4 - 1, 2 + bob - Math.abs(d), 2, 5 + (2 - Math.abs(d)) * 2, r.accent);
    PX(ctx, cx + d * 4 - 1, 1 + bob - Math.abs(d), '#ffffff');
  }
}

// ---------------------------------------------------------------------------
// ROT SOVEREIGN (toxic) — a bloated fungal king. Silhouette: a mushroom cap
// WIDER than the body it sits on, on root legs. Squat and top-heavy: the exact
// inverse of the Cantor.
// ---------------------------------------------------------------------------
export function drawRotSovereign(ctx: Ctx, ox: number, frame: number, r: MonsterRamp): void {
  const cx = ox + BOSS_FW / 2;
  const breathe = [0, 1, 2, 1][frame % 4];
  const burst = frame === 3;
  const glow = r.glow ?? r.accent;
  bossBase(ctx, cx, 72, 26);

  // ---- root legs, splayed and gnarled ----
  for (const s of [-1, 1]) {
    R(ctx, cx + s * 12 - 4, 54, 8, 16, r.body0);
    R(ctx, cx + s * 18 - 3, 62, 12, 6, r.body0);
    R(ctx, cx + s * 12 - 4, 54, 3, 16, r.body1);
    for (let i = 0; i < 3; i++) PX(ctx, cx + s * 14 + i * s * 2, 66 + (i % 2), r.detail);
  }

  // ---- bloated sack of a body ----
  ctx.fillStyle = r.body1;
  ctx.beginPath();
  ctx.ellipse(cx, 46 + breathe, 24 + breathe, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = r.body2;
  ctx.beginPath();
  ctx.ellipse(cx - 6, 41 + breathe, 15, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.26)';
  ctx.beginPath();
  ctx.ellipse(cx + 10, 52 + breathe, 12, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  // pustules — the emissive read, swelling with the breath
  for (const [dx, dy, rad] of [[-13, 46, 3], [-3, 54, 4], [9, 44, 3], [14, 55, 2], [2, 40, 2]] as [number, number, number][]) {
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.ellipse(cx + dx, dy + breathe, rad + (burst ? 1 : 0), rad + (burst ? 1 : 0), 0, 0, Math.PI * 2);
    ctx.fill();
    PX(ctx, cx + dx - 1, dy + breathe - 1, '#ffffff');
  }

  // ---- stubby arms ----
  for (const s of [-1, 1]) {
    R(ctx, cx + s * 24 - 3, 38, 7, 18, r.body1);
    R(ctx, cx + s * 24 - 3, 38, 7, 3, r.body2);
    R(ctx, cx + s * 26 - 4, 54, 9, 7, r.body0); // heavy fist
  }

  // ---- the mushroom crown: wider than everything under it ----
  const capY = 22 + breathe;
  ctx.fillStyle = r.body0;
  ctx.beginPath();
  ctx.ellipse(cx, capY + 6, 34, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = r.body2;
  ctx.beginPath();
  ctx.ellipse(cx, capY + 3, 33, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = r.body1;
  ctx.beginPath();
  ctx.ellipse(cx + 8, capY + 6, 22, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  // gill shadow under the cap's front lip
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(cx - 30, capY + 12, 60, 3);
  for (let i = 0; i < 13; i++) PX(ctx, cx - 28 + i * 5, capY + 13, r.detail);
  for (const [dx, dy] of [[-22, 2], [-9, -3], [6, -4], [19, 1], [-16, 6], [13, 6]] as [number, number][]) {
    ctx.fillStyle = r.accent;
    ctx.beginPath();
    ctx.ellipse(cx + dx, capY + dy + 3, 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // ---- face tucked in the shadow beneath the cap ----
  R(ctx, cx - 9, capY + 15, 18, 11, r.body0);
  glowEyes(ctx, cx, capY + 18, 3, 5, 4, r.eye);
  R(ctx, cx - 5, capY + 24, 10, 2, r.detail);
  for (let i = 0; i < 4; i++) PX(ctx, cx - 4 + i * 3, capY + 23, r.body2); // tusks

  if (burst) {
    // a cloud of spores coughed out of the gills
    const rr = rng(7717);
    ctx.globalAlpha = 0.75;
    for (let i = 0; i < 22; i++) {
      const a = rr() * Math.PI * 2;
      const d = 24 + rr() * 16;
      R(ctx, Math.round(cx + Math.cos(a) * d), Math.round(capY + 8 + Math.sin(a) * d * 0.55), 2, 2, i % 3 ? glow : '#ffffff');
    }
    ctx.globalAlpha = 1;
  }
}

// ---------------------------------------------------------------------------
// BRASS MAGNUS (clockwork) — an industrial siege engine. Silhouette: a strict
// rectangle broken by two chimney stacks and one huge exposed gear. The only
// warden built entirely from straight lines.
// ---------------------------------------------------------------------------
export function drawBrassMagnus(ctx: Ctx, ox: number, frame: number, r: MonsterRamp): void {
  const cx = ox + BOSS_FW / 2;
  const bob = [0, -1, -2, 0][frame % 4];
  const vent = frame === 3;
  const glow = r.glow ?? r.accent;
  const iron = r.alt ?? '#2a2a30';
  bossBase(ctx, cx, 72, 26);

  // ---- tread feet ----
  for (const s of [-1, 1]) {
    R(ctx, cx + s * 15 - 9, 58 + bob, 18, 12, iron);
    R(ctx, cx + s * 15 - 9, 58 + bob, 18, 2, r.body2);
    for (let i = 0; i < 4; i++) R(ctx, cx + s * 15 - 8 + i * 4, 66 + bob, 3, 4, r.body0);
  }

  // ---- chimney stacks: the tell you can read from across the room ----
  for (const s of [-1, 1]) {
    R(ctx, cx + s * 19 - 4, 4 + bob, 8, 18, iron);
    R(ctx, cx + s * 19 - 4, 4 + bob, 3, 18, r.body1);
    R(ctx, cx + s * 19 - 5, 2 + bob, 10, 3, r.body2); // flared rim
    if (vent) {
      for (let i = 0; i < 3; i++) {
        ctx.globalAlpha = 0.6 - i * 0.16;
        R(ctx, cx + s * 19 - 4 - i, bob - 3 - i * 4, 8 + i * 2, 4, '#cbb9a0');
      }
      ctx.globalAlpha = 1;
    }
  }

  // ---- boiler torso ----
  R(ctx, cx - 22, 20 + bob, 44, 40, r.body1);
  R(ctx, cx - 22, 20 + bob, 44, 3, r.body2);
  R(ctx, cx - 22, 20 + bob, 5, 40, r.body2);
  R(ctx, cx + 17, 20 + bob, 5, 40, 'rgba(0,0,0,0.3)');
  for (const by of [26, 50]) {
    R(ctx, cx - 22, by + bob, 44, 4, r.body0);
    for (let i = 0; i < 9; i++) PX(ctx, cx - 19 + i * 5, by + 1 + bob, r.accent);
  }

  // ---- the great gear: teeth step round by frame, so it visibly turns ----
  const spin = (frame / 4) * Math.PI * 2;
  const gy = 40 + bob;
  ctx.fillStyle = iron;
  ctx.beginPath();
  ctx.arc(cx, gy, 13, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 10; i++) {
    const a = spin + (i / 10) * Math.PI * 2;
    R(ctx, Math.round(cx + Math.cos(a) * 14) - 2, Math.round(gy + Math.sin(a) * 14) - 2, 4, 4, r.body2);
  }
  ctx.fillStyle = r.body2;
  ctx.beginPath();
  ctx.arc(cx, gy, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = vent ? '#ffffff' : glow;
  ctx.beginPath();
  ctx.arc(cx, gy, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx - 1, gy - 1, 2, 0, Math.PI * 2);
  ctx.fill();

  // ---- piston arms (segmented so they read as machinery, not limbs) ----
  for (const s of [-1, 1]) {
    const ax = cx + s * 28;
    R(ctx, ax - 5, 24 + bob, 10, 10, r.body2); // shoulder block
    R(ctx, ax - 3, 34 + bob, 6, 12, iron); // piston rod
    R(ctx, ax - 2, 34 + bob, 2, 12, '#cfd6e8'); // polished shaft
    R(ctx, ax - 6, 46 + bob + (vent ? 4 : 0), 12, 12, r.body1); // hammer fist
    R(ctx, ax - 6, 46 + bob + (vent ? 4 : 0), 12, 2, r.body2);
  }

  // ---- small armoured head with a visor slit ----
  R(ctx, cx - 10, 8 + bob, 20, 14, r.body1);
  R(ctx, cx - 10, 8 + bob, 20, 2, r.body2);
  R(ctx, cx - 8, 12 + bob, 16, 5, '#0d0a04');
  R(ctx, cx - 7, 13 + bob, 14, 3, r.eye);
  R(ctx, cx - 7, 13 + bob, 4, 3, '#ffffff');
  R(ctx, cx - 6, 19 + bob, 12, 3, iron); // jaw grille
  for (let i = 0; i < 5; i++) PX(ctx, cx - 5 + i * 3, 20 + bob, r.body2);
}

// ---------------------------------------------------------------------------
// ARENA CHAMPION (arena) — the crowd's undefeated titan. Silhouette: a tall
// plumed crest over a wide tower shield, deliberately asymmetric (shield left,
// trident right) so it reads instantly even when mirrored.
// ---------------------------------------------------------------------------
export function drawArenaChampion(ctx: Ctx, ox: number, frame: number, r: MonsterRamp): void {
  const cx = ox + BOSS_FW / 2;
  const bob = [0, -2, -3, -1][frame % 4];
  const thrust = frame === 3;
  const blood = r.alt ?? '#a01e18';
  bossBase(ctx, cx, 72, 24);

  // ---- planted legs in greaves ----
  for (const s of [-1, 1]) {
    R(ctx, cx + s * 11 - 5, 48 + bob, 10, 18, r.body1);
    R(ctx, cx + s * 11 - 5, 48 + bob, 3, 18, r.body2);
    R(ctx, cx + s * 13 - 8, 64 + bob, 15, 6, r.body0); // sandal
    R(ctx, cx + s * 11 - 5, 52 + bob, 10, 3, r.accent); // greave band
  }

  // ---- kilt of leather strips ----
  R(ctx, cx - 16, 42 + bob, 32, 8, r.body0);
  for (let i = 0; i < 8; i++) R(ctx, cx - 15 + i * 4, 50 + bob, 3, 6 + (i % 2) * 3, r.body1);

  // ---- torso: heavy, tapering to the waist ----
  R(ctx, cx - 18, 20 + bob, 36, 24, r.body1);
  R(ctx, cx - 18, 20 + bob, 36, 3, r.body2);
  R(ctx, cx - 18, 20 + bob, 5, 24, r.body2);
  R(ctx, cx + 13, 20 + bob, 5, 24, 'rgba(0,0,0,0.3)');
  R(ctx, cx - 12, 26 + bob, 24, 12, r.accent); // bronze cuirass
  R(ctx, cx - 12, 26 + bob, 24, 2, r.body2);
  R(ctx, cx - 4, 29 + bob, 8, 7, blood); // champion's sigil
  R(ctx, cx - 2, 31 + bob, 4, 3, '#ffe2b4');

  // ---- pauldrons ----
  for (const s of [-1, 1]) {
    R(ctx, cx + s * 22 - 6, 18 + bob, 12, 12, r.body2);
    R(ctx, cx + s * 22 - 6, 18 + bob, 12, 2, r.accent);
    R(ctx, cx + s * 22 - 6, 28 + bob, 12, 2, r.body0);
  }

  // ---- LEFT: tower shield (the wide half of the silhouette) ----
  R(ctx, cx - 38, 20 + bob, 16, 34, r.body0);
  R(ctx, cx - 37, 21 + bob, 14, 32, r.accent);
  R(ctx, cx - 37, 21 + bob, 3, 32, r.body2);
  R(ctx, cx - 34, 30 + bob, 8, 14, blood);
  R(ctx, cx - 32, 34 + bob, 4, 6, '#ffe2b4');
  for (let i = 0; i < 5; i++) {
    PX(ctx, cx - 36, 24 + bob + i * 7, r.body2);
    PX(ctx, cx - 24, 24 + bob + i * 7, r.body2);
  }

  // ---- RIGHT: trident, thrust forward on the attack ----
  // Held low enough that the tines stay inside the 80px frame at idle; the
  // thrust drops it further and pushes it out to the side.
  const tx = cx + 26 + (thrust ? 8 : 0);
  const ty = (thrust ? 30 : 20) + bob;
  R(ctx, tx, ty, 4, 44, r.body0);
  R(ctx, tx + 1, ty, 1, 44, r.body1);
  R(ctx, tx - 7, ty - 4, 18, 4, '#cfd6e8'); // crossbar
  for (const d of [-6, 1, 8]) {
    R(ctx, tx + d, ty - 14, 3, 11, '#cfd6e8');
    R(ctx, tx + d, ty - 14, 1, 11, '#ffffff');
    PX(ctx, tx + d + 1, ty - 16, '#ffffff');
  }
  R(ctx, cx + 20, 30 + bob, 10, 10, r.body1); // gripping fist

  // ---- crested helm: the tall half of the silhouette ----
  const hy = 9 + bob;
  R(ctx, cx - 10, hy, 20, 17, r.body2);
  R(ctx, cx - 10, hy, 20, 2, r.accent);
  R(ctx, cx - 8, hy + 6, 16, 8, '#150a05'); // dark eye slot
  glowEyes(ctx, cx, hy + 8, 2, 5, 4, r.eye);
  R(ctx, cx - 1, hy + 6, 2, 11, r.body2); // nasal bar
  R(ctx, cx - 10, hy + 15, 20, 3, r.body0); // cheek guards
  // Horsehair crest, swept back. Peaks at 9px so the tallest plume still lands
  // inside the frame with the idle bob applied.
  for (let i = 0; i < 9; i++) {
    const h = 9 - Math.abs(i - 3);
    R(ctx, cx - 8 + i * 2, hy - h, 2, h + 1, blood);
    PX(ctx, cx - 8 + i * 2, hy - h, '#e0bd7c');
  }
}

// ---------------------------------------------------------------------------
// MIRE LEVIATHAN (bog) — the drowned thing. Silhouette: a LOW coiled mass with
// a long neck and a crocodilian jaw. The only warden with no legs and no
// vertical symmetry.
// ---------------------------------------------------------------------------
export function drawMireLeviathan(ctx: Ctx, ox: number, frame: number, r: MonsterRamp): void {
  const cx = ox + BOSS_FW / 2;
  const sway = [0, 2, 0, -2][frame % 4];
  const roar = frame === 3;
  const glow = r.glow ?? r.accent;
  const bone = r.alt ?? '#cdc6a8';
  bossBase(ctx, cx, 72, 30);

  // ---- coils half-sunk in the mire ----
  for (const [dx, dy, rx, ry] of [[-20, 60, 16, 9], [6, 63, 20, 10], [24, 58, 13, 8]] as [number, number, number, number][]) {
    ctx.fillStyle = r.body1;
    ctx.beginPath();
    ctx.ellipse(cx + dx, dy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = r.body2;
    ctx.beginPath();
    ctx.ellipse(cx + dx - 3, dy - 3, rx - 5, ry - 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 11; i++) R(ctx, cx - 30 + i * 6, 50 + (i % 2) * 3, 4, 4, r.body0); // scute ridge

  // ---- rising neck (S-curve built from stacked segments) ----
  for (let i = 0; i < 7; i++) {
    const t = i / 6;
    const nx = cx - 4 + Math.sin(t * 2.2) * 10 + sway * t;
    const ny = 52 - i * 6;
    const w = 16 - i;
    R(ctx, Math.round(nx - w / 2), ny, w, 8, r.body1);
    R(ctx, Math.round(nx - w / 2), ny, Math.max(2, w - 11), 8, r.body2);
    R(ctx, Math.round(nx - 2), ny - 1, 4, 3, r.body0); // dorsal scute
  }

  // ---- head: long jaw pointing right ----
  const hx = cx + 6 + sway;
  const hy = 12;
  R(ctx, hx - 10, hy, 22, 12, r.body1);
  R(ctx, hx - 10, hy, 22, 3, r.body2);
  R(ctx, hx + 10, hy + 2, 16, 8, r.body1); // snout
  R(ctx, hx + 10, hy + 2, 16, 2, r.body2);
  const jaw = hy + (roar ? 18 : 10); // lower jaw drops on the roar
  R(ctx, hx + 8, jaw, 17, 5, r.body0);
  R(ctx, hx + 8, jaw + 3, 17, 2, r.body1);
  for (let i = 0; i < 7; i++) {
    R(ctx, Math.round(hx + 10 + i * 2.3), hy + 9, 2, 3, bone);
    R(ctx, Math.round(hx + 10 + i * 2.3), jaw - 3, 2, 3, bone);
  }
  if (roar) {
    ctx.fillStyle = 'rgba(20,40,18,0.85)';
    ctx.fillRect(hx + 9, hy + 11, 17, 8);
    R(ctx, hx + 12, hy + 13, 11, 4, glow); // gullet light
  }
  R(ctx, hx + 2, hy + 2, 6, 5, r.eye); // eye set high and forward, crocodilian
  R(ctx, hx + 3, hy + 3, 2, 3, '#0a1207');
  R(ctx, hx + 1, hy, 8, 2, r.body0); // brow ridge

  // ---- frills / tendrils framing the head ----
  for (const s of [-1, 1]) {
    for (let i = 0; i < 3; i++) R(ctx, hx - 12 - i * 3, hy + 2 + i * 4 + s * 3, 4 + i * 2, 2, r.accent);
  }
  for (let i = 0; i < 4; i++) {
    const t = i / 3;
    R(ctx, Math.round(hx - 16 - t * 10 + sway), Math.round(hy + 14 + t * 12), 3, 3, r.body0);
  }
  for (const [dx, dy] of [[-26, 26], [30, 34], [-14, 8], [22, 6]] as [number, number][]) {
    R(ctx, cx + dx, dy, 3, 3, glow); // marsh lights
    PX(ctx, cx + dx, dy, '#ffffff');
  }
}

// ---------------------------------------------------------------------------
// TEMPEST HERALD (storm) — the sky's messenger. Silhouette: a WIDE horizontal
// wingspan under a halo, dissolving into rain below. Nothing else in the game is
// wider than it is tall.
// ---------------------------------------------------------------------------
export function drawTempestHerald(ctx: Ctx, ox: number, frame: number, r: MonsterRamp): void {
  const cx = ox + BOSS_FW / 2;
  const bob = [0, -3, -5, -3][frame % 4];
  const strike = frame === 3;
  const glow = r.glow ?? r.accent;
  const flare = r.alt ?? '#e8f0ff';
  bossBase(ctx, cx, 72, 18);

  // ---- wings: swept triangles, wider on the strike frame ----
  const spread = strike ? 38 : 32;
  for (const s of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      const len = spread * (1 - (i / 4) * 0.32);
      const wy = 22 + bob + i * 5;
      R(ctx, s < 0 ? cx - len : cx, wy, len, 5, i % 2 ? r.body1 : r.body0);
      R(ctx, s < 0 ? cx - len : cx + len - 4, wy, 4, 5, r.body2); // lit leading edge
    }
    R(ctx, cx + s * spread - (s < 0 ? 3 : 0), 20 + bob, 3, 6, glow); // wingtip spark
  }

  // ---- armoured torso ----
  R(ctx, cx - 12, 22 + bob, 24, 26, r.body1);
  R(ctx, cx - 12, 22 + bob, 24, 3, r.body2);
  R(ctx, cx - 12, 22 + bob, 4, 26, r.body2);
  R(ctx, cx + 8, 22 + bob, 4, 26, 'rgba(0,0,0,0.28)');
  R(ctx, cx - 7, 28 + bob, 14, 12, glow); // storm-core chest
  R(ctx, cx - 4, 31 + bob, 8, 6, '#ffffff');

  // ---- arms spread wide, palms open ----
  for (const s of [-1, 1]) {
    R(ctx, cx + s * 17 - 3, 24 + bob, 7, 20, r.body1);
    R(ctx, cx + s * 17 - 3, 24 + bob, 7, 2, r.body2);
    R(ctx, cx + s * 19 - 4, 44 + bob, 9, 7, flare); // gauntlet
    if (strike) R(ctx, cx + s * 19 - 3, 51 + bob, 6, 8, glow);
  }

  // ---- lower body raining out instead of legs ----
  R(ctx, cx - 10, 48 + bob, 20, 10, r.body0);
  for (let i = 0; i < 10; i++) {
    const rr = rng(i * 313 + frame * 7);
    const h = 6 + Math.floor(rr() * 10);
    ctx.globalAlpha = 0.5 + rr() * 0.4;
    R(ctx, Math.round(cx - 12 + i * 2.6), 58 + bob, 1, h, flare);
  }
  ctx.globalAlpha = 1;

  // ---- helm with a visor band of light ----
  R(ctx, cx - 9, 6 + bob, 18, 17, r.body1);
  R(ctx, cx - 9, 6 + bob, 18, 2, r.body2);
  R(ctx, cx - 9, 6 + bob, 3, 17, r.body2);
  R(ctx, cx - 7, 12 + bob, 14, 4, '#070914');
  R(ctx, cx - 6, 13 + bob, 12, 2, r.eye);
  R(ctx, cx - 6, 13 + bob, 3, 2, '#ffffff');
  for (const s of [-1, 1]) {
    R(ctx, cx + s * 10 - (s < 0 ? 4 : 0), 8 + bob, 4, 10, flare); // swept helm fins
    R(ctx, cx + s * 13 - (s < 0 ? 3 : 0), 5 + bob, 3, 6, flare);
  }

  // ---- crackling halo ----
  ctx.strokeStyle = glow;
  ctx.lineWidth = 1;
  ctx.globalAlpha = strike ? 1 : 0.75;
  ctx.beginPath();
  ctx.ellipse(cx, 2 + bob, 16, 5, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + frame * 0.4;
    PX(ctx, Math.round(cx + Math.cos(a) * 16), Math.round(2 + bob + Math.sin(a) * 5), '#ffffff');
  }
  if (strike) {
    // a bolt drops from the halo straight through the body
    const rr = rng(frame * 991);
    let lx = cx;
    for (let y = 4 + bob; y < 46 + bob; y += 4) {
      const nx = lx + Math.round((rr() - 0.5) * 7);
      R(ctx, Math.min(lx, nx), y, Math.abs(nx - lx) + 1, 1, '#ffffff');
      R(ctx, nx, y, 1, 4, '#ffffff');
      lx = nx;
    }
  }
}

// ---------------------------------------------------------------------------
// UMBRAL DEVOURER (shadow) — a hole in the world that eats. Silhouette: a
// ragged headless mass with a vertical maw and scattered eyes. Deliberately
// asymmetric and unstable: no two frames share an outline.
// ---------------------------------------------------------------------------
export function drawUmbralDevourer(ctx: Ctx, ox: number, frame: number, r: MonsterRamp): void {
  const cx = ox + BOSS_FW / 2;
  const pulse = [0, 2, 3, 1][frame % 4];
  const feed = frame === 3;
  const glow = r.glow ?? r.accent;
  const soul = r.alt ?? '#3affd0';
  bossBase(ctx, cx, 70, 26);

  // ---- the mass: stacked jagged bands, reshaped per frame by its own seed ----
  const rr = rng(frame * 8887 + 41);
  for (let i = 0; i < 11; i++) {
    const t = Math.sin((i / 10) * Math.PI); // fattest in the middle
    const w = Math.round(14 + t * 26 + pulse);
    const jitter = Math.round((rr() - 0.5) * 6);
    R(ctx, Math.round(cx - w / 2 + jitter), 12 + i * 5, w, 6, i < 4 ? r.body1 : r.body0);
    R(ctx, Math.round(cx - w / 2 + jitter), 12 + i * 5, 4, 6, r.body2);
  }
  for (let i = 0; i < 9; i++) {
    const h = 6 + Math.floor(rr() * 10);
    R(ctx, cx - 16 + i * 4, 12 - h, 3, h, r.body1); // ragged crown of spines
  }
  tatterHem(ctx, cx - 22, 66, 44, r.body0, frame * 77 + 3, 9);

  // ---- tendrils reaching out sideways ----
  for (const s of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      let tx = cx + s * (18 + pulse);
      const ty = 24 + i * 12;
      for (let k = 0; k < 6; k++) {
        tx += s * 3;
        R(ctx, tx, ty + Math.round(Math.sin(k * 0.9 + frame) * 3), 3, 3, r.body1);
      }
    }
  }

  // ---- the maw: a vertical lens of teeth, wide open when feeding ----
  const mw = feed ? 16 : 9;
  const mh = feed ? 34 : 26;
  ctx.fillStyle = '#02010a';
  ctx.beginPath();
  ctx.ellipse(cx, 38, mw / 2, mh / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = glow;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(cx, 38, mw / 2, mh / 2, 0, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 7; i++) {
    const ty = Math.round(38 - mh / 2 + 3 + (i * (mh - 6)) / 6);
    R(ctx, Math.round(cx - mw / 2 + 1), ty, 2, 2, '#e8e0f4');
    R(ctx, Math.round(cx + mw / 2 - 3), ty + 2, 2, 2, '#e8e0f4');
  }
  if (feed) {
    R(ctx, cx - 3, 30, 6, 16, soul); // the light it just swallowed
    R(ctx, cx - 1, 32, 2, 12, '#ffffff');
  }

  // ---- scattered eyes: never in a row, so it reads as *wrong* ----
  for (const [dx, dy, sz] of [
    [-16, 20, 4], [12, 16, 3], [-9, 46, 3], [17, 40, 4], [-19, 34, 3], [5, 56, 3], [20, 58, 2],
  ] as [number, number, number][]) {
    if ((frame + dx) % 4 === 3 && !feed) continue; // some blink
    R(ctx, cx + dx, dy, sz + 1, sz, r.eye);
    PX(ctx, cx + dx + 1, dy + Math.max(0, sz - 2), '#ffffff');
  }
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + frame * 0.5;
    PX(ctx, Math.round(cx + Math.cos(a) * 30), Math.round(38 + Math.sin(a) * 22), soul); // stolen light
  }
}

// ---------------------------------------------------------------------------
// HOLLOW KING (sanctum) — the empty crown. Silhouette: a tall spiked crown, a
// cape, and a planted greatsword. The armour is HOLLOW, which is the whole
// idea, so the chest is a void with embers in it.
// ---------------------------------------------------------------------------
export function drawHollowKing(ctx: Ctx, ox: number, frame: number, r: MonsterRamp): void {
  const cx = ox + BOSS_FW / 2;
  const bob = [0, -2, -3, -1][frame % 4];
  const raise = frame === 3;
  const glow = r.glow ?? r.accent;
  const bone = r.alt ?? '#cdc6a8';
  bossBase(ctx, cx, 72, 24);

  // ---- cape behind everything ----
  R(ctx, cx - 24, 22 + bob, 48, 40, r.body0);
  R(ctx, cx - 24, 22 + bob, 8, 40, r.body1);
  R(ctx, cx - 26, 40 + bob, 52, 24, r.body0);
  tatterHem(ctx, cx - 26, 62 + bob, 52, r.body0, 555, 8);
  for (let i = 0; i < 7; i++) R(ctx, cx - 22 + i * 7, 24 + bob, 1, 38, 'rgba(0,0,0,0.25)'); // folds

  // ---- sabatons + greaves ----
  for (const s of [-1, 1]) {
    R(ctx, cx + s * 10 - 5, 52 + bob, 10, 14, r.body1);
    R(ctx, cx + s * 10 - 5, 52 + bob, 3, 14, r.body2);
    R(ctx, cx + s * 11 - 8, 64 + bob, 15, 6, r.body0);
    R(ctx, cx + s * 11 - 8, 64 + bob, 15, 2, r.body1);
  }

  // ---- breastplate with a HOLLOW core ----
  R(ctx, cx - 17, 22 + bob, 34, 30, r.body1);
  R(ctx, cx - 17, 22 + bob, 34, 3, r.body2);
  R(ctx, cx - 17, 22 + bob, 5, 30, r.body2);
  R(ctx, cx + 12, 22 + bob, 5, 30, 'rgba(0,0,0,0.32)');
  R(ctx, cx - 16, 44 + bob, 32, 4, r.accent); // gilded belt
  R(ctx, cx - 9, 27 + bob, 18, 16, '#050301'); // the void where a chest should be
  for (const [dx, dy] of [[-5, 32], [2, 29], [4, 37], [-2, 39], [6, 33]] as [number, number][]) {
    PX(ctx, cx + dx, dy + bob, glow);
  }
  R(ctx, cx - 3, 33 + bob, 6, 5, glow);
  R(ctx, cx - 1, 34 + bob, 2, 3, '#ffffff');
  for (let i = 0; i < 4; i++) {
    R(ctx, cx - 12, 28 + bob + i * 4, 3, 2, r.accent); // gilded ribs framing the hollow
    R(ctx, cx + 9, 28 + bob + i * 4, 3, 2, r.accent);
  }

  // ---- pauldrons crowned with small spikes ----
  for (const s of [-1, 1]) {
    R(ctx, cx + s * 21 - 6, 19 + bob, 13, 13, r.body2);
    R(ctx, cx + s * 21 - 6, 19 + bob, 13, 2, r.accent);
    R(ctx, cx + s * 21 - 6, 30 + bob, 13, 2, r.body0);
    for (let i = 0; i < 3; i++) R(ctx, cx + s * 21 - 5 + i * 4, 15 + bob, 2, 5, bone);
  }

  // ---- the greatsword: planted point-down, hoisted on the attack ----
  const sx = cx + 27;
  const sy = (raise ? 2 : 12) + bob;
  const blade = raise ? 46 : 52;
  R(ctx, sx - 3, sy, 7, blade, '#b9bfd2');
  R(ctx, sx - 3, sy, 3, blade, '#eef2ff'); // lit edge
  R(ctx, sx - 1, sy + 4, 2, blade - 8, glow); // runic fuller
  R(ctx, sx - 9, sy - 5, 19, 5, r.accent); // crossguard
  R(ctx, sx - 2, sy - 12, 5, 8, r.body1); // grip
  R(ctx, sx - 3, sy - 15, 7, 4, r.accent); // pommel
  R(ctx, cx + 20, 30 + bob, 11, 11, r.body1); // gauntlet on the grip
  R(ctx, cx + 20, 30 + bob, 11, 2, r.body2);

  // ---- great helm, empty inside ----
  R(ctx, cx - 11, 4 + bob, 22, 19, r.body1);
  R(ctx, cx - 11, 4 + bob, 22, 2, r.body2);
  R(ctx, cx - 11, 4 + bob, 4, 19, r.body2);
  R(ctx, cx - 8, 10 + bob, 16, 6, '#050301'); // eye band: nothing home
  glowEyes(ctx, cx, 11 + bob, 3, 5, 4, r.eye);
  R(ctx, cx - 1, 8 + bob, 2, 14, r.body2); // nasal ridge
  for (let i = 0; i < 6; i++) PX(ctx, cx - 7 + i * 3, 19 + bob, r.body0); // breath slots

  // ---- the crown: five spikes, the centre one tallest ----
  for (let i = 0; i < 5; i++) {
    const d = i - 2;
    const h = 11 - Math.abs(d) * 3;
    R(ctx, cx + d * 6 - 2, 2 + bob - h, 4, h + 3, r.accent);
    R(ctx, cx + d * 6 - 2, 2 + bob - h, 1, h + 3, '#fff6cd');
    PX(ctx, cx + d * 6 - 1, 1 + bob - h, glow);
  }
  R(ctx, cx - 13, 2 + bob, 26, 4, r.accent);
  R(ctx, cx - 13, 2 + bob, 26, 1, '#fff6cd');
  if (raise) {
    for (let i = 0; i < 5; i++) R(ctx, sx - 8 + i * 4, sy - 22 - (i % 2) * 4, 2, 8, glow); // judgement
  }
}

// ---------------------------------------------------------------------------
// GRAVE WARDEN (crypt) — the first realm's keeper, and the first boss anyone
// ever meets. Silhouette: a hunched gravedigger under a heavy hood, one long
// diagonal scythe, a soul-lantern swinging off the other hand. The diagonal is
// the whole read: nothing else in the roster cuts across its own frame.
// ---------------------------------------------------------------------------
export function drawGraveWarden(ctx: Ctx, ox: number, frame: number, r: MonsterRamp): void {
  const cx = ox + BOSS_FW / 2;
  const bob = [0, -2, -3, -1][frame % 4];
  const reap = frame === 3;
  const glow = r.glow ?? r.accent;
  const bone = r.alt ?? '#d8dce8';
  bossBase(ctx, cx, 70, 22);

  // ---- robe: broad at the hem, hunched at the shoulders ----
  R(ctx, cx - 10, 24 + bob, 20, 8, r.body1); // hunched shoulders
  R(ctx, cx - 14, 32 + bob, 28, 18, r.body1);
  R(ctx, cx - 18, 50 + bob, 36, 14, r.body1);
  R(ctx, cx - 18, 50 + bob, 6, 14, r.body2); // lit left face
  R(ctx, cx + 9, 32 + bob, 5, 32, 'rgba(0,0,0,0.30)');
  R(ctx, cx - 14, 32 + bob, 5, 18, r.body2);
  tatterHem(ctx, cx - 18, 64 + bob, 36, r.body0, 313, 8);
  // grave-dirt climbing the hem
  for (let i = 0; i < 10; i++) R(ctx, cx - 16 + i * 4, 58 + bob + (i % 3), 3, 3, r.body0);

  // ---- the scythe: one long diagonal, low-right to high-left ----
  const sy0 = (reap ? 60 : 54) + bob;
  const sx1 = cx - 10;
  const sy1 = (reap ? 4 : 8) + bob;
  stepBar(ctx, cx + 22, sy0, sx1, sy1, 4, '#3a2c1c', '#6a5330');
  // the blade hooks off the top, sweeping further right on the reap frame
  const bx = sx1 + (reap ? 4 : 0);
  for (let i = 0; i < 20; i++) {
    const t = i / 19;
    const px = Math.round(bx + t * (reap ? 32 : 24));
    const py = Math.round(sy1 + Math.sin(t * 2.1) * (reap ? 14 : 11));
    // 4px-deep blade with a lit top edge — thin enough and it vanished against
    // the hood at gameplay scale.
    R(ctx, px, py, 3, 4, i < 15 ? '#c6ccdd' : bone);
    R(ctx, px, py, 3, 1, '#ffffff');
    if (i > 14) PX(ctx, px, py + 4, r.accent); // gilded spine near the tip
  }
  if (reap) {
    // the cut it just made, still hanging in the air
    for (let i = 0; i < 12; i++) {
      const t = i / 11;
      ctx.globalAlpha = 0.7 - t * 0.5;
      R(ctx, Math.round(bx + t * 34), Math.round(sy1 + 6 + Math.sin(t * 2.1) * 14), 2, 2, glow);
    }
    ctx.globalAlpha = 1;
  }

  // ---- soul lantern swinging from the off hand ----
  const lx = cx - 22;
  const ly = 34 + bob + (frame % 2 ? 2 : 0);
  R(ctx, lx - 1, ly - 8, 2, 8, r.body0); // chain
  R(ctx, lx - 5, ly, 10, 11, r.body0); // frame
  R(ctx, lx - 4, ly + 1, 8, 9, '#0a0714'); // glass
  R(ctx, lx - 3, ly + 3, 6, 6, glow); // the soul inside
  R(ctx, lx - 2, ly + 4, 3, 3, '#ffffff');
  R(ctx, lx - 5, ly - 2, 10, 2, r.accent); // cap
  for (let i = 0; i < 3; i++) PX(ctx, lx - 2 + i * 2, ly - 5 - i * 3 - (frame % 3), glow); // leaking souls

  // ---- skeletal hands, shaded so they read as bone rather than white blocks ----
  R(ctx, cx + 16, 44 + bob, 8, 7, bone);
  R(ctx, cx + 16, 44 + bob, 8, 2, '#ffffff');
  R(ctx, cx + 16, 49 + bob, 8, 2, r.body0);
  for (let i = 0; i < 3; i++) PX(ctx, cx + 17 + i * 3, 47 + bob, r.body0); // knuckles
  R(ctx, cx - 25, ly - 12, 8, 7, bone);
  R(ctx, cx - 25, ly - 12, 8, 2, '#ffffff');
  R(ctx, cx - 25, ly - 7, 8, 2, r.body0);
  for (let i = 0; i < 3; i++) PX(ctx, cx - 24 + i * 3, ly - 9, r.body0);

  // ---- deep hood with nothing but two lights inside ----
  R(ctx, cx - 11, 6 + bob, 22, 22, r.body1);
  R(ctx, cx - 11, 6 + bob, 22, 2, r.body2);
  R(ctx, cx - 11, 6 + bob, 4, 22, r.body2);
  R(ctx, cx - 13, 12 + bob, 3, 14, r.body0); // hood edges pulled forward
  R(ctx, cx + 10, 12 + bob, 3, 14, r.body0);
  R(ctx, cx - 8, 12 + bob, 16, 15, '#05030b'); // the void under the hood
  glowEyes(ctx, cx, 17 + bob, 3, 5, 4, r.eye);
  if (reap) for (let i = 0; i < 5; i++) PX(ctx, cx - 4 + i * 2, 25 + bob, bone); // a hint of jaw
  // iron circlet pinning the hood
  R(ctx, cx - 12, 9 + bob, 24, 3, r.accent);
  R(ctx, cx - 12, 9 + bob, 24, 1, '#e8d8ff');
  for (let i = 0; i < 5; i++) PX(ctx, cx - 8 + i * 4, 10 + bob, glow);
}

// ---------------------------------------------------------------------------
// MOLTEN COLOSSUS (molten) — a mountain that stood up. Silhouette: deliberately
// ASYMMETRIC — one enormous boulder fist dragging low, the other arm a snapped
// stump — over a cracked chest that vents fire. The only warden that is not
// bilaterally symmetric, which is what makes it read as rock rather than armour.
// ---------------------------------------------------------------------------
export function drawMoltenColossus(ctx: Ctx, ox: number, frame: number, r: MonsterRamp): void {
  const cx = ox + BOSS_FW / 2;
  const bob = [0, -2, -3, 0][frame % 4];
  const erupt = frame === 3;
  const glow = r.glow ?? r.accent;
  const slag = r.alt ?? '#2a2a30';
  bossBase(ctx, cx, 74, 28);

  // ---- squat basalt legs ----
  for (const s of [-1, 1]) {
    R(ctx, cx + s * 13 - 8, 54 + bob, 16, 18, r.body0);
    R(ctx, cx + s * 13 - 8, 54 + bob, 4, 18, r.body1);
    R(ctx, cx + s * 14 - 11, 68 + bob, 21, 6, r.body0);
    for (let i = 0; i < 3; i++) PX(ctx, cx + s * 14 - 8 + i * 5, 72 + bob, glow); // magma between the toes
  }

  // ---- boulder torso, wider on the left where the great arm hangs ----
  R(ctx, cx - 26, 20 + bob, 46, 38, r.body1);
  R(ctx, cx - 26, 20 + bob, 46, 4, r.body2);
  R(ctx, cx - 26, 20 + bob, 7, 38, r.body2);
  R(ctx, cx + 15, 20 + bob, 5, 38, 'rgba(0,0,0,0.32)');
  // broken plates of cooled crust
  for (const [px, py, pw, ph] of [[-22, 26, 12, 9], [-8, 24, 14, 7], [6, 30, 11, 10], [-18, 40, 10, 8], [2, 44, 13, 8]] as [number, number, number, number][]) {
    R(ctx, cx + px, py + bob, pw, ph, r.body0);
    R(ctx, cx + px, py + bob, pw, 1, r.body2);
  }

  // ---- the wound: a cracked-open chest full of magma ----
  const gw = erupt ? 22 : 18;
  R(ctx, cx - gw / 2, 30 + bob, gw, 20, '#1a0603');
  for (let i = 0; i < 6; i++) {
    const w = gw - 4 - Math.abs(i - 2.5) * 2;
    R(ctx, cx - w / 2, 32 + bob + i * 3, w, 2, i % 2 ? glow : C.fireMid);
  }
  R(ctx, cx - 3, 36 + bob, 6, 8, C.fireCore);
  R(ctx, cx - 1, 38 + bob, 2, 4, '#ffffff');
  // veins spidering out of the wound across the crust
  for (const [vx, vy, dx, dy] of [[-9, 34, -14, -8], [9, 34, 15, -6], [-9, 46, -13, 9], [9, 46, 14, 10]] as [number, number, number, number][]) {
    stepBar(ctx, cx + vx, vy + bob, cx + vx + dx, vy + bob + dy, 2, C.fireEdge, glow);
  }

  // ---- LEFT: the great fist, dragging near the floor; it rears up to erupt ----
  // Kept inside x=1 at its widest so the fist never clips the frame edge.
  const fy = (erupt ? 22 : 38) + bob;
  R(ctx, cx - 33, 24 + bob, 12, 18, r.body1); // shoulder mass
  R(ctx, cx - 33, 24 + bob, 12, 3, r.body2);
  R(ctx, cx - 31, fy, 10, 14, r.body0); // forearm
  R(ctx, cx - 39, fy + 10, 22, 19, r.body1); // the boulder fist
  R(ctx, cx - 39, fy + 10, 22, 4, r.body2);
  R(ctx, cx - 39, fy + 10, 5, 19, r.body2);
  R(ctx, cx - 39, fy + 27, 22, 2, r.body0); // grounded underside
  // Four blocky knuckles across the top: without these it reads as a crate
  // rather than a hand.
  for (let i = 0; i < 4; i++) {
    R(ctx, cx - 38 + i * 5, fy + 12, 4, 6, r.body0);
    R(ctx, cx - 38 + i * 5, fy + 12, 4, 1, r.body2);
  }
  if (erupt) for (let i = 0; i < 4; i++) R(ctx, cx - 38 + i * 5, fy + 7, 3, 4, glow); // heat off the knuckles

  // ---- RIGHT: a stump, snapped off long ago and still glowing inside ----
  R(ctx, cx + 18, 26 + bob, 12, 16, r.body1);
  R(ctx, cx + 18, 26 + bob, 12, 3, r.body2);
  R(ctx, cx + 19, 42 + bob, 10, 5, slag); // the shear plane
  for (let i = 0; i < 4; i++) PX(ctx, cx + 20 + i * 2, 44 + bob, glow);

  // ---- head: a cracked block sunk between the shoulders ----
  R(ctx, cx - 11, 4 + bob, 22, 18, r.body1);
  R(ctx, cx - 11, 4 + bob, 22, 3, r.body2);
  R(ctx, cx - 11, 4 + bob, 4, 18, r.body2);
  R(ctx, cx - 8, 10 + bob, 16, 6, '#120503');
  glowEyes(ctx, cx, 11 + bob, 3, 5, 4, r.eye);
  R(ctx, cx - 7, 18 + bob, 14, 4, '#120503'); // grinding mouth
  for (let i = 0; i < 6; i++) R(ctx, Math.round(cx - 6 + i * 2.4), 18 + bob, 2, 3, i % 2 ? C.fireMid : glow);
  // crown of slag spikes
  for (let i = 0; i < 5; i++) {
    const d = i - 2;
    const h = 5 - Math.abs(d) * 2;
    R(ctx, cx + d * 5 - 1, 4 + bob - h, 3, h + 1, slag);
    PX(ctx, cx + d * 5 - 1, 3 + bob - h, glow);
  }
  if (erupt) {
    // a column of embers blown out of the wound
    const rr = rng(frame * 4441);
    for (let i = 0; i < 16; i++) {
      const a = -Math.PI / 2 + (rr() - 0.5) * 1.4;
      const d = 22 + rr() * 24;
      R(ctx, Math.round(cx + Math.cos(a) * d), Math.round(38 + bob + Math.sin(a) * d), 2, 2, i % 3 ? glow : '#ffffff');
    }
  }
}
