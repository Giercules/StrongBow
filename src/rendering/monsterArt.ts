import { R, PX, MON_FW, drawGrunt, drawGhost, drawDemon, drawBoneArcher, drawBrute, drawImp, type Ctx } from './spriteArt';
import type { MonsterRamp } from './Palette';

// ============================================================================
// THEMED REGULARS — identity overlays on the shared base shapes.
//
// Nine of the bestiary's regulars used to be pure recolours of five drawers, so
// a Gladiator and a Crypt Grunt were the same creature in different paint. Full
// bespoke art for every one would be a lot of pixels for enemies you see for
// three seconds, so instead each variant keeps its base body — and therefore its
// tuned walk cycle and hitbox — and gains a KIT: helmet, wings, cap, gears.
//
// The rule: the kit must change the SILHOUETTE, not just add colour. A shoulder
// gear that only sits inside the existing outline is decoration; one that breaks
// the edge is identity.
// ============================================================================

/** A crest of spikes/plumes along the top of a head. */
function crest(ctx: Ctx, cx: number, y: number, n: number, h: number, col: string, tip?: string): void {
  for (let i = 0; i < n; i++) {
    const d = i - (n - 1) / 2;
    const hh = Math.max(2, h - Math.abs(d) * 2);
    R(ctx, Math.round(cx + d * 3) - 1, y - hh, 2, hh + 1, col);
    if (tip) PX(ctx, Math.round(cx + d * 3) - 1, y - hh, tip);
  }
}

/** Bat/feather wings behind a body. `phase` swings them with the walk cycle. */
function wings(ctx: Ctx, cx: number, y: number, span: number, phase: number, base: string, edge: string): void {
  for (const s of [-1, 1]) {
    for (let i = 0; i < 4; i++) {
      const len = span * (1 - i * 0.18);
      const wy = y + i * 4 + Math.round(phase * (1 - i * 0.2));
      R(ctx, s < 0 ? cx - len : cx, wy, len, 4, i % 2 ? base : edge);
    }
    R(ctx, cx + s * span - (s < 0 ? 2 : 0), y - 2, 2, 6, edge);
  }
}

// ---------------------------------------------------------------------------
// GLADIATOR (arena) — the Grunt, but drilled and armoured. Helm crest + round
// shield break the blobby ogre outline into something clearly *equipped*.
// ---------------------------------------------------------------------------
export function drawGladiator(ctx: Ctx, ox: number, frame: number, r: MonsterRamp): void {
  drawGrunt(ctx, ox, frame, r);
  const cx = ox + MON_FW / 2;
  const bob = frame === 1 ? -2 : frame === 3 ? 2 : 0;
  const lunge = frame === 3 ? 4 : 0;
  const blood = r.alt ?? '#a01e18';

  // bronze helm over the brow, leaving the glowing eyes visible
  R(ctx, cx - 7, 10 + bob, 14, 5, r.body2);
  R(ctx, cx - 7, 10 + bob, 14, 1, r.accent);
  R(ctx, cx - 1, 13 + bob, 2, 7, r.body2); // nasal bar
  crest(ctx, cx, 10 + bob, 5, 8, blood, '#e0bd7c');

  // strapped round shield on the left arm — the outline-breaking element
  const sx = cx - 15 - lunge;
  ctx.fillStyle = r.body0;
  ctx.beginPath();
  ctx.arc(sx, 25 + bob, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = r.accent;
  ctx.beginPath();
  ctx.arc(sx, 25 + bob, 6.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = blood;
  ctx.beginPath();
  ctx.arc(sx, 25 + bob, 3, 0, Math.PI * 2);
  ctx.fill();
  PX(ctx, sx - 1, 24 + bob, '#ffe2b4');

  // short gladius in the right hand, raised on the attack
  const wx = cx + 12 + lunge;
  const wy = (frame === 3 ? 12 : 18) + bob;
  R(ctx, wx, wy, 3, 14, '#cfd6e8');
  R(ctx, wx, wy, 1, 14, '#ffffff');
  R(ctx, wx - 2, wy + 14, 7, 2, r.accent);
}

// ---------------------------------------------------------------------------
// FROST SHADE (frost) — the Ghost, frozen mid-scream. Icicle crown and rimed
// shards give it a jagged edge where the base ghost is all soft curves.
// ---------------------------------------------------------------------------
export function drawFrostShade(ctx: Ctx, ox: number, frame: number, r: MonsterRamp): void {
  drawGhost(ctx, ox, frame, r);
  const cx = ox + MON_FW / 2;
  const bob = [0, -2, -4, -2][frame % 4];
  const glow = r.glow ?? r.accent;

  // icicle crown — jagged where the ghost is round
  for (let i = 0; i < 7; i++) {
    const d = i - 3;
    const h = 7 - Math.abs(d);
    R(ctx, cx + d * 3 - 1, 4 + bob - h, 2, h + 3, r.body2);
    PX(ctx, cx + d * 3 - 1, 3 + bob - h, '#ffffff');
  }
  // shards hanging off the shroud, breaking the silhouette sideways
  for (const [dx, dy, h] of [[-12, 18, 7], [11, 21, 6], [-9, 27, 5], [9, 30, 8]] as [number, number, number][]) {
    R(ctx, cx + dx, dy + bob, 2, h, r.body2);
    PX(ctx, cx + dx, dy + bob + h, glow);
  }
  // breath of cold streaming from the mouth
  if (frame % 2 === 0) {
    for (let i = 0; i < 4; i++) PX(ctx, cx - 1 + i, 20 + bob + i, glow);
  }
}

// ---------------------------------------------------------------------------
// MIRE LURKER (bog) — the Demon, drowned. Trades the fire core for a swamp-gas
// glow and hangs weed off the wings so the outline goes ragged.
// ---------------------------------------------------------------------------
export function drawMireLurker(ctx: Ctx, ox: number, frame: number, r: MonsterRamp): void {
  drawDemon(ctx, ox, frame, r);
  const cx = ox + MON_FW / 2;
  const bob = frame === 1 || frame === 2 ? -2 : 0;
  const glow = r.glow ?? r.accent;

  // douse the demon's fire core with bog light
  R(ctx, cx - 2, 24 + bob, 5, 5, glow);
  PX(ctx, cx - 1, 25 + bob, '#ffffff');

  // weed trailing from the wings and jaw
  for (const s of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const wx = cx + s * (11 + i * 2);
      R(ctx, wx, 24 + bob + i * 3, 2, 6 + i * 2, r.body0);
      PX(ctx, wx, 30 + bob + i * 3, r.accent);
    }
  }
  // gill slits along the ribs
  for (let i = 0; i < 3; i++) {
    R(ctx, cx - 9, 20 + bob + i * 4, 4, 1, r.body0);
    R(ctx, cx + 5, 20 + bob + i * 4, 4, 1, r.body0);
  }
  // marsh lights orbiting it
  for (const [dx, dy] of [[-14, 12], [13, 16]] as [number, number][]) {
    PX(ctx, cx + dx, dy + bob, glow);
    PX(ctx, cx + dx + 1, dy + bob + 1, '#ffffff');
  }
}

// ---------------------------------------------------------------------------
// RIME ARCHER (frost) — the Bone Archer under a frozen mantle, shooting ice.
// ---------------------------------------------------------------------------
export function drawRimeArcher(ctx: Ctx, ox: number, frame: number, r: MonsterRamp): void {
  drawBoneArcher(ctx, ox, frame, r);
  const cx = ox + MON_FW / 2;
  const bob = frame === 1 || frame === 2 ? -2 : 0;
  const glow = r.glow ?? r.accent;

  // rimed shoulder mantle
  R(ctx, cx - 10, 19 + bob, 20, 5, r.body0);
  R(ctx, cx - 10, 19 + bob, 20, 2, r.body2);
  for (let i = 0; i < 6; i++) R(ctx, cx - 9 + i * 3, 24 + bob, 2, 2 + (i % 2) * 3, r.body2);
  // frost crown
  for (let i = 0; i < 4; i++) {
    const d = i - 1.5;
    R(ctx, Math.round(cx + d * 4) - 1, 4 + bob, 2, 5, r.body2);
    PX(ctx, Math.round(cx + d * 4) - 1, 3 + bob, '#ffffff');
  }
  // the nocked arrow is an icicle
  if (frame === 3) {
    R(ctx, cx - 11, 24 + bob, 6, 3, glow);
    PX(ctx, cx - 12, 25 + bob, '#ffffff');
  }
}

// ---------------------------------------------------------------------------
// SKY LANCER (storm) — the Bone Archer given wings and a lance. Wings make it
// the widest regular in the game, so it reads before it's identified.
// ---------------------------------------------------------------------------
export function drawSkyLancer(ctx: Ctx, ox: number, frame: number, r: MonsterRamp): void {
  const cx = ox + MON_FW / 2;
  const bob = frame === 1 || frame === 2 ? -2 : 0;
  const flap = [0, -3, 0, 3][frame % 4];
  const glow = r.glow ?? r.accent;
  // wings go BEHIND the body, so they're drawn first
  wings(ctx, cx, 18 + bob + flap, 16, flap * 0.5, r.body0, r.body2);
  drawBoneArcher(ctx, ox, frame, r);

  // storm-blue tabard over the ribs
  R(ctx, cx - 6, 22 + bob, 12, 10, r.body1);
  R(ctx, cx - 6, 22 + bob, 12, 2, r.body2);
  R(ctx, cx - 2, 25 + bob, 4, 5, glow);
  // winged helm
  R(ctx, cx - 7, 7 + bob, 14, 4, r.body2);
  for (const s of [-1, 1]) {
    R(ctx, cx + s * 8 - (s < 0 ? 3 : 0), 6 + bob, 3, 5, r.accent);
    R(ctx, cx + s * 10 - (s < 0 ? 2 : 0), 4 + bob, 2, 4, r.accent);
  }
  // couched lance, levelled on the attack frame
  const ly = (frame === 3 ? 24 : 20) + bob;
  const lx = cx + (frame === 3 ? 6 : 8);
  R(ctx, lx, ly, 16, 3, '#b9bfd2');
  R(ctx, lx, ly, 16, 1, '#eef2ff');
  R(ctx, lx + 16, ly - 1, 5, 5, glow);
  PX(ctx, lx + 18, ly, '#ffffff');
}

// ---------------------------------------------------------------------------
// GEAR KNIGHT (clockwork) — the Brute rebuilt as machinery: shoulder gear,
// exhaust stack, visor slit instead of eyes.
// ---------------------------------------------------------------------------
export function drawGearKnight(ctx: Ctx, ox: number, frame: number, r: MonsterRamp): void {
  drawBrute(ctx, ox, frame, r);
  const cx = ox + MON_FW / 2;
  const bob = frame === 1 ? -2 : 0;
  const glow = r.glow ?? r.accent;
  const brass = r.alt ?? '#a4823a';

  // exhaust stack on the left shoulder — breaks the outline upward
  R(ctx, cx - 15, 2 + bob, 6, 12, r.body0);
  R(ctx, cx - 15, 2 + bob, 2, 12, r.body2);
  R(ctx, cx - 16, 0 + bob, 8, 3, brass);
  if (frame === 3) {
    R(ctx, cx - 16, bob - 5, 8, 4, 'rgba(200,190,170,0.5)');
    R(ctx, cx - 15, bob - 9, 6, 4, 'rgba(200,190,170,0.3)');
  }

  // driving gear on the right shoulder, stepping round by frame
  const gx = cx + 13;
  const gy = 10 + bob;
  ctx.fillStyle = brass;
  ctx.beginPath();
  ctx.arc(gx, gy, 6, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 8; i++) {
    const a = (frame / 4) * Math.PI * 2 + (i / 8) * Math.PI * 2;
    R(ctx, Math.round(gx + Math.cos(a) * 7) - 1, Math.round(gy + Math.sin(a) * 7) - 1, 2, 2, r.body2);
  }
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(gx, gy, 2, 0, Math.PI * 2);
  ctx.fill();

  // visor band replaces the brute's eyes
  R(ctx, cx - 6, 11 + bob, 12, 4, '#0d0a04');
  R(ctx, cx - 5, 12 + bob, 10, 2, glow);
  R(ctx, cx - 5, 12 + bob, 3, 2, '#ffffff');
}

// ---------------------------------------------------------------------------
// HOLLOW KNIGHT (sanctum) — the Brute as an empty suit of gilded plate. Horned
// helm and a hollow chest with embers where organs should be.
// ---------------------------------------------------------------------------
export function drawHollowKnight(ctx: Ctx, ox: number, frame: number, r: MonsterRamp): void {
  drawBrute(ctx, ox, frame, r);
  const cx = ox + MON_FW / 2;
  const bob = frame === 1 ? -2 : 0;
  const glow = r.glow ?? r.accent;

  // hollow the chest out and light it from inside
  R(ctx, cx - 6, 23 + bob, 12, 9, '#0a0805');
  for (const [dx, dy] of [[-3, 26], [1, 25], [3, 29], [-1, 30]] as [number, number][]) PX(ctx, cx + dx, dy + bob, glow);
  R(ctx, cx - 2, 27 + bob, 4, 3, glow);
  // gilded ribs framing it
  for (let i = 0; i < 3; i++) {
    R(ctx, cx - 8, 24 + bob + i * 3, 2, 2, r.accent);
    R(ctx, cx + 6, 24 + bob + i * 3, 2, 2, r.accent);
  }
  // horned great helm
  R(ctx, cx - 7, 7 + bob, 14, 5, r.body1);
  R(ctx, cx - 7, 7 + bob, 14, 1, r.accent);
  R(ctx, cx - 6, 11 + bob, 12, 5, '#0a0805');
  R(ctx, cx - 5, 12 + bob, 3, 3, r.eye);
  R(ctx, cx + 2, 12 + bob, 3, 3, r.eye);
  for (const s of [-1, 1]) {
    R(ctx, cx + s * 9 - (s < 0 ? 3 : 0), 4 + bob, 3, 8, r.accent);
    R(ctx, cx + s * 11 - (s < 0 ? 2 : 0), 1 + bob, 2, 6, r.accent);
    PX(ctx, cx + s * 12 - (s < 0 ? 1 : 0), bob, '#fff6cd');
  }
}

// ---------------------------------------------------------------------------
// SPORE IMP (toxic) — the Imp wearing a mushroom cap that overhangs its whole
// head, trailing spores. Top-heavy where the base imp is bat-like.
// ---------------------------------------------------------------------------
export function drawSporeImp(ctx: Ctx, ox: number, frame: number, r: MonsterRamp): void {
  drawImp(ctx, ox, frame, r);
  const cx = ox + MON_FW / 2;
  const bob = [0, -4, -2, -4][frame % 4];
  const glow = r.glow ?? r.accent;

  // cap, wider than the head
  ctx.fillStyle = r.body0;
  ctx.beginPath();
  ctx.ellipse(cx, 8 + bob, 13, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = r.body2;
  ctx.beginPath();
  ctx.ellipse(cx, 6 + bob, 12, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  for (const [dx, dy] of [[-7, -1], [-1, -3], [5, -2], [8, 1]] as [number, number][]) {
    ctx.fillStyle = r.accent;
    ctx.beginPath();
    ctx.ellipse(cx + dx, 6 + bob + dy, 2, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // gill shadow under the front lip
  R(ctx, cx - 11, 11 + bob, 22, 1, 'rgba(0,0,0,0.4)');
  for (let i = 0; i < 7; i++) PX(ctx, cx - 9 + i * 3, 11 + bob, r.detail);
  // drifting spores
  for (const [dx, dy] of [[-12, 16], [12, 20], [-8, 26]] as [number, number][]) {
    PX(ctx, cx + dx, dy + bob, glow);
    PX(ctx, cx + dx + 1, dy + bob + 2, 'rgba(200,255,140,0.6)');
  }
}

// ---------------------------------------------------------------------------
// VOID IMP (shadow) — the Imp with a hole where its middle should be, ringed by
// a halo of void. Reads as "wrong" rather than merely purple.
// ---------------------------------------------------------------------------
export function drawVoidImp(ctx: Ctx, ox: number, frame: number, r: MonsterRamp): void {
  const cx = ox + MON_FW / 2;
  const bob = [0, -4, -2, -4][frame % 4];
  const glow = r.glow ?? r.accent;

  // halo behind the body, counter-rotating with the flap
  ctx.strokeStyle = glow;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  ctx.ellipse(cx, 16 + bob, 15, 13, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - frame * 0.5;
    PX(ctx, Math.round(cx + Math.cos(a) * 15), Math.round(16 + bob + Math.sin(a) * 13), '#ffffff');
  }

  drawImp(ctx, ox, frame, r);

  // punch a void through the torso
  ctx.fillStyle = '#04010c';
  ctx.beginPath();
  ctx.ellipse(cx, 24 + bob, 5, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = glow;
  ctx.beginPath();
  ctx.ellipse(cx, 24 + bob, 5, 6, 0, 0, Math.PI * 2);
  ctx.stroke();
  PX(ctx, cx, 23 + bob, glow);
  // shadow bleeding off the wingtips
  for (const s of [-1, 1]) {
    for (let i = 0; i < 3; i++) PX(ctx, cx + s * (13 + i * 2), 14 + bob + i * 3, i === 0 ? glow : r.body1);
  }
}
