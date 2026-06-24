import type { Room } from './prefabs';
import type { RoomShape } from './themes';

// ----------------------------------------------------------------------------
// Macro-layouts — the large-scale SHAPE of a level, independent of its theme
// skin. Every realm used to be the same 5x4 room grid threaded by one snake of
// corridors, so they all read identically. Each layout below lays its rooms out
// with a completely different topology (caves, a cathedral nave, concentric
// gear-rings, a vertical spire, a radial temple hub, ...).
//
// Contract: a layout carves its rooms (and any signature corridors) into the
// tile grid and returns an ORDERED `path` whose first room is the party start
// and last room is the boss room. levelGen then GUARANTEES connectivity by also
// threading corridors between consecutive path rooms, so a layout can never
// strand the boss — its bespoke carving only ever adds extra, prettier links.
// ----------------------------------------------------------------------------

export type LayoutId =
  | 'grid'
  | 'caverns'
  | 'cathedral'
  | 'warren'
  | 'rings'
  | 'arena'
  | 'scatter'
  | 'spire'
  | 'hub';

export interface LayoutCtx {
  W: number;
  H: number;
  cols: number;
  rows: number;
  rng: () => number;
  tiles: number[][];
  /** Room shapes the host theme allows (grid / warren draw from these). */
  themeShapes: RoomShape[];
  inB: (x: number, y: number) => boolean;
  setFloor: (x: number, y: number) => void;
  corridorH: (x0: number, x1: number, y: number) => void;
  corridorV: (y0: number, y1: number, x: number) => void;
  carveShape: (room: Room, shape: RoomShape) => void;
}

export interface LayoutResult {
  /** Ordered start -> ... -> boss. */
  path: Room[];
  /** Path indices that should get decorative pillar rows. */
  halls: Set<number>;
  /** Extra pillar decor the layout wants stamped (naves, spire shaft, ...). */
  pillars: { x: number; y: number }[];
}

const mkRoom = (x: number, y: number, w: number, h: number): Room => ({
  x,
  y,
  w,
  h,
  cx: x + (w >> 1),
  cy: y + (h >> 1),
});

const dist = (a: Room, b: Room): number => Math.hypot(a.cx - b.cx, a.cy - b.cy);

// ---------------------------------------------------------------------------
// grid — the classic orthogonal catacomb (Crypt). Tidy aligned rooms, snaked.
// ---------------------------------------------------------------------------
function gridLayout(ctx: LayoutCtx): LayoutResult {
  const { W, H, cols, rows, rng, themeShapes, carveShape, corridorH, corridorV } = ctx;
  const cellW = Math.floor(W / cols);
  const cellH = Math.floor(H / rows);
  const grid: Room[] = [];
  const gShape: RoomShape[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const rw = 10 + Math.floor(rng() * 6);
      const rh = 7 + Math.floor(rng() * 4);
      const bx = c * cellW;
      const by = r * cellH;
      const rx = Math.min(W - rw - 2, bx + 2 + Math.floor(rng() * Math.max(1, cellW - rw - 3)));
      const ry = Math.min(H - rh - 2, by + 2 + Math.floor(rng() * Math.max(1, cellH - rh - 3)));
      const room = mkRoom(rx, ry, rw, rh);
      const shape = themeShapes[(r * cols + c) % themeShapes.length] ?? 'rect';
      carveShape(room, shape);
      grid.push(room);
      gShape.push(shape);
    }
  }
  const path: Room[] = [];
  const halls = new Set<number>();
  const pillars: { x: number; y: number }[] = [];
  let pi = 0;
  for (let r = 0; r < rows; r++) {
    const order: number[] = [];
    for (let c = 0; c < cols; c++) order.push(r * cols + c);
    if (r % 2 === 1) order.reverse();
    for (const gi of order) {
      path.push(grid[gi]);
      if (gShape[gi] === 'hall') {
        halls.add(pi);
        const rm = grid[gi];
        for (let x = rm.x + 2; x < rm.x + rm.w - 2; x += 3) {
          pillars.push({ x, y: rm.y + 1 });
          pillars.push({ x, y: rm.y + rm.h - 2 });
        }
      }
      pi++;
    }
  }
  // a couple of extra cross links so the map is not a single thread
  if (grid.length > cols + 1) {
    corridorV(grid[0].cy, grid[cols].cy, grid[0].cx);
    corridorH(grid[cols].cx, grid[cols + 1].cx, grid[cols].cy);
  }
  return { path, halls, pillars };
}

// ---------------------------------------------------------------------------
// caverns — a handful of big organic blobs (Molten Deep). Few, large, jagged.
// ---------------------------------------------------------------------------
function cavernsLayout(ctx: LayoutCtx): LayoutResult {
  const { W, H, rng, carveShape } = ctx;
  const cols = 4;
  const rows = 3;
  const cellW = Math.floor(W / cols);
  const cellH = Math.floor(H / rows);
  const grid: Room[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const rw = 15 + Math.floor(rng() * 7);
      const rh = 11 + Math.floor(rng() * 5);
      const bx = c * cellW;
      const by = r * cellH;
      const rx = Math.min(W - rw - 2, bx + 1 + Math.floor(rng() * Math.max(1, cellW - rw - 1)));
      const ry = Math.min(H - rh - 2, by + 1 + Math.floor(rng() * Math.max(1, cellH - rh - 1)));
      const room = mkRoom(Math.max(2, rx), Math.max(2, ry), rw, rh);
      carveShape(room, 'cavern');
      grid.push(room);
    }
  }
  const path: Room[] = [];
  for (let r = 0; r < rows; r++) {
    const order: number[] = [];
    for (let c = 0; c < cols; c++) order.push(r * cols + c);
    if (r % 2 === 1) order.reverse();
    for (const gi of order) path.push(grid[gi]);
  }
  return { path, halls: new Set(), pillars: [] };
}

// ---------------------------------------------------------------------------
// cathedral — one long central nave with symmetric side chapels (Frost). Grand
// and processional: enter at the west door, march the nave to the east apse.
// ---------------------------------------------------------------------------
function cathedralLayout(ctx: LayoutCtx): LayoutResult {
  const { W, H, carveShape, setFloor, corridorV } = ctx;
  const cy = H >> 1;
  const naveHalf = 4; // 9-tile-tall nave
  const x0 = 6;
  const x1 = W - 8;
  for (let x = x0; x <= x1; x++) for (let dy = -naveHalf; dy <= naveHalf; dy++) setFloor(x, cy + dy);

  const path: Room[] = [];
  const pillars: { x: number; y: number }[] = [];
  const start = mkRoom(x0 - 1, cy - 4, 9, 9);
  carveShape(start, 'rect');
  path.push(start);

  const n = Math.max(8, Math.round((x1 - x0) / 13));
  const span = x1 - x0 - 20;
  for (let i = 0; i < n; i++) {
    const px = x0 + 12 + Math.floor(span * (i / (n - 1)));
    const above = i % 2 === 0;
    const cw = 10;
    const ch = 8;
    const ry = above ? cy - naveHalf - 2 - ch : cy + naveHalf + 2;
    const chapel = mkRoom(px - (cw >> 1), ry, cw, ch);
    carveShape(chapel, 'rect');
    corridorV(above ? chapel.y + chapel.h - 1 : chapel.y, cy, chapel.cx);
    path.push(chapel);
  }

  const boss = mkRoom(x1 - 12, cy - 7, 14, 15);
  carveShape(boss, 'rect');
  path.push(boss);

  // colonnade lining the nave
  for (let x = x0 + 4; x <= x1 - 6; x += 5) {
    pillars.push({ x, y: cy - naveHalf });
    pillars.push({ x, y: cy + naveHalf });
  }
  return { path, halls: new Set(), pillars };
}

// ---------------------------------------------------------------------------
// warren — a dense lattice of small rooms knotted with extra loops (Toxic /
// Shadow). Cramped and maze-like; easy to lose your bearings.
// ---------------------------------------------------------------------------
function warrenLayout(ctx: LayoutCtx): LayoutResult {
  const { W, H, rng, themeShapes, carveShape, corridorH, corridorV } = ctx;
  const cols = Math.max(5, Math.round(W / 22));
  const rows = Math.max(4, Math.round(H / 18));
  const cellW = Math.floor(W / cols);
  const cellH = Math.floor(H / rows);
  const grid: Room[] = [];
  const allowCircle = themeShapes.includes('circle');
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const rw = 6 + Math.floor(rng() * 4);
      const rh = 5 + Math.floor(rng() * 3);
      const bx = c * cellW;
      const by = r * cellH;
      const rx = Math.min(W - rw - 2, bx + 1 + Math.floor(rng() * Math.max(1, cellW - rw - 1)));
      const ry = Math.min(H - rh - 2, by + 1 + Math.floor(rng() * Math.max(1, cellH - rh - 1)));
      const room = mkRoom(Math.max(2, rx), Math.max(2, ry), rw, rh);
      carveShape(room, allowCircle && rng() < 0.4 ? 'circle' : 'rect');
      grid.push(room);
    }
  }
  const path: Room[] = [];
  for (let r = 0; r < rows; r++) {
    const order: number[] = [];
    for (let c = 0; c < cols; c++) order.push(r * cols + c);
    if (r % 2 === 1) order.reverse();
    for (const gi of order) path.push(grid[gi]);
  }
  // knot in extra short-circuit links for a true warren feel
  const links = Math.floor(grid.length * 0.5);
  for (let k = 0; k < links; k++) {
    const a = grid[Math.floor(rng() * grid.length)];
    const b = grid[Math.floor(rng() * grid.length)];
    if (a === b) continue;
    if (rng() < 0.5) {
      corridorH(a.cx, b.cx, a.cy);
      corridorV(a.cy, b.cy, b.cx);
    } else {
      corridorV(a.cy, b.cy, a.cx);
      corridorH(a.cx, b.cx, b.cy);
    }
  }
  return { path, halls: new Set(), pillars: [] };
}

// ---------------------------------------------------------------------------
// rings — concentric square ring-corridors joined by N/E/S/W spokes, rooms at
// every intersection (Clockwork). Start at the hub, spiral out to the boss.
// ---------------------------------------------------------------------------
function ringsLayout(ctx: LayoutCtx): LayoutResult {
  const { W, H, carveShape, corridorH, corridorV } = ctx;
  const cx = W >> 1;
  const cy = H >> 1;
  const m = Math.min(W, H);
  const radii = [Math.round(m * 0.13), Math.round(m * 0.24), Math.round(m * 0.34), Math.round(m * 0.44)];
  for (const r of radii) {
    corridorH(cx - r, cx + r, cy - r);
    corridorH(cx - r, cx + r, cy + r);
    corridorV(cy - r, cy + r, cx - r);
    corridorV(cy - r, cy + r, cx + r);
  }
  const rC = radii[radii.length - 1];
  corridorV(cy, cy - rC, cx);
  corridorV(cy, cy + rC, cx);
  corridorH(cx, cx - rC, cy);
  corridorH(cx, cx + rC, cy);

  const path: Room[] = [];
  const center = mkRoom(cx - 4, cy - 3, 9, 7);
  carveShape(center, 'circle');
  path.push(center);
  const cardinals = (r: number): [number, number][] => [
    [cx, cy - r],
    [cx + r, cy],
    [cx, cy + r],
    [cx - r, cy],
  ];
  for (const r of radii) {
    for (const [px, py] of cardinals(r)) {
      const room = mkRoom(Math.max(2, px - 4), Math.max(2, py - 3), 9, 7);
      carveShape(room, 'rect');
      path.push(room);
    }
  }
  const boss = mkRoom(cx - 6, Math.max(2, cy - rC - 9), 13, 11);
  carveShape(boss, 'circle');
  corridorV(cy - rC, boss.cy, cx);
  path.push(boss);
  return { path, halls: new Set(), pillars: [] };
}

// ---------------------------------------------------------------------------
// arena — a chain of huge circular pits linked by short antechambers (Blood
// Arena). Wide-open killing floors with nowhere to hide.
// ---------------------------------------------------------------------------
function arenaLayout(ctx: LayoutCtx): LayoutResult {
  const { W, H, rng, carveShape } = ctx;
  const path: Room[] = [];
  const midY = H >> 1;
  const start = mkRoom(4, midY - 4, 9, 9);
  carveShape(start, 'rect');
  path.push(start);
  const bigW = 22;
  const bigH = 18;
  const n = 4;
  const span = W - 16 - bigW;
  for (let i = 0; i < n; i++) {
    const bx = 8 + Math.floor((span * (i + 1)) / (n + 1)) - (bigW >> 1);
    const by = midY - (bigH >> 1) + Math.floor((rng() - 0.5) * 12);
    const pit = mkRoom(Math.max(2, bx), Math.max(2, Math.min(H - bigH - 2, by)), bigW, bigH);
    carveShape(pit, 'circle');
    path.push(pit);
    const ante = mkRoom(Math.min(W - 11, pit.x + bigW + 1), midY - 3, 9, 7);
    carveShape(ante, 'rect');
    path.push(ante);
  }
  const boss = mkRoom(W - bigW - 4, midY - 10, bigW, 20);
  carveShape(boss, 'circle');
  path.push(boss);
  return { path, halls: new Set(), pillars: [] };
}

// ---------------------------------------------------------------------------
// scatter — many small caves strewn at random, linked nearest-to-nearest
// (Drowned Bog). A sprawling, trackless organic web.
// ---------------------------------------------------------------------------
function scatterLayout(ctx: LayoutCtx): LayoutResult {
  const { W, H, rng, carveShape } = ctx;
  const target = 18;
  const rooms: Room[] = [];
  let tries = 0;
  while (rooms.length < target && tries < 500) {
    tries++;
    const rw = 8 + Math.floor(rng() * 6);
    const rh = 6 + Math.floor(rng() * 4);
    const rx = 2 + Math.floor(rng() * (W - rw - 4));
    const ry = 2 + Math.floor(rng() * (H - rh - 4));
    const room = mkRoom(rx, ry, rw, rh);
    if (rooms.some((o) => dist(o, room) < 15)) continue;
    rooms.push(room);
  }
  rooms.forEach((r) => carveShape(r, 'cavern'));
  // nearest-neighbour chain starting from the west-most cave
  const remaining = rooms.slice().sort((a, b) => a.cx - b.cx);
  const start = remaining.shift()!;
  const path: Room[] = [start];
  let cur = start;
  while (remaining.length) {
    let bi = 0;
    let bd = Infinity;
    remaining.forEach((r, i) => {
      const d = dist(r, cur);
      if (d < bd) {
        bd = d;
        bi = i;
      }
    });
    cur = remaining.splice(bi, 1)[0];
    path.push(cur);
  }
  // make sure the boss room (last) is genuinely far from the start
  let fi = 1;
  for (let i = 1; i < path.length; i++) if (dist(path[i], start) > dist(path[fi], start)) fi = i;
  if (fi !== path.length - 1) {
    const far = path.splice(fi, 1)[0];
    path.push(far);
  }
  return { path, halls: new Set(), pillars: [] };
}

// ---------------------------------------------------------------------------
// spire — a tall central shaft with landings alternating left/right (Storm
// Spire). Begin at the base, climb to the peak where the boss waits.
// ---------------------------------------------------------------------------
function spireLayout(ctx: LayoutCtx): LayoutResult {
  const { W, H, carveShape, setFloor, corridorH } = ctx;
  const cx = W >> 1;
  const yTop = 6;
  const yBot = H - 7;
  for (let y = yTop; y <= yBot; y++) for (let dx = -2; dx <= 2; dx++) setFloor(cx + dx, y);

  const path: Room[] = [];
  const pillars: { x: number; y: number }[] = [];
  const start = mkRoom(cx - 4, yBot - 8, 9, 9);
  carveShape(start, 'rect');
  path.push(start);

  const landings = 9;
  for (let i = 0; i < landings; i++) {
    const ly = yBot - 12 - Math.floor(((yBot - yTop - 24) * i) / (landings - 1));
    const left = i % 2 === 0;
    const lw = 11;
    const lh = 8;
    const lx = left ? cx - 4 - lw : cx + 5;
    const shape: RoomShape = i % 3 === 2 ? 'circle' : 'rect';
    const landing = mkRoom(Math.max(2, lx), ly - (lh >> 1), lw, lh);
    carveShape(landing, shape);
    corridorH(left ? landing.x + landing.w - 1 : landing.x, cx, landing.cy);
    path.push(landing);
  }

  const boss = mkRoom(cx - 6, yTop, 13, 11);
  carveShape(boss, 'circle');
  path.push(boss);

  for (let y = yTop + 3; y <= yBot - 3; y += 5) {
    pillars.push({ x: cx - 3, y });
    pillars.push({ x: cx + 3, y });
  }
  return { path, halls: new Set(), pillars };
}

// ---------------------------------------------------------------------------
// hub — a great central hall with rooms radiating like spokes on a wheel
// (Sanctum finale). Enter from a southern spoke, pass through the hall, and the
// boss waits beyond the northern spoke.
// ---------------------------------------------------------------------------
function hubLayout(ctx: LayoutCtx): LayoutResult {
  const { W, H, carveShape, corridorH, corridorV } = ctx;
  const cx = W >> 1;
  const cy = H >> 1;
  const R = Math.round(Math.min(W, H) * 0.34);
  const center = mkRoom(cx - 11, cy - 9, 23, 19);
  carveShape(center, 'cross');

  const n = 7;
  const spokes: Room[] = [];
  for (let i = 0; i < n; i++) {
    const ang = (Math.PI * 2 * i) / n - Math.PI / 2;
    const sx = cx + Math.round(Math.cos(ang) * R);
    const sy = cy + Math.round(Math.sin(ang) * R);
    const room = mkRoom(Math.max(2, sx - 5), Math.max(2, sy - 4), 11, 9);
    carveShape(room, 'rect');
    corridorH(cx, room.cx, cy);
    corridorV(cy, room.cy, room.cx);
    spokes.push(room);
  }

  // start = southern-most spoke, boss = beyond the northern-most spoke
  let si = 0;
  let ti = 0;
  spokes.forEach((r, i) => {
    if (r.cy > spokes[si].cy) si = i;
    if (r.cy < spokes[ti].cy) ti = i;
  });
  const path: Room[] = [];
  path.push(spokes[si]);
  path.push(center);
  spokes.forEach((r, i) => {
    if (i !== si && i !== ti) path.push(r);
  });
  path.push(spokes[ti]);
  const top = spokes[ti];
  const boss = mkRoom(top.cx - 7, Math.max(2, top.cy - 13), 15, 12);
  carveShape(boss, 'circle');
  corridorV(top.cy, boss.cy, top.cx);
  path.push(boss);
  return { path, halls: new Set(), pillars: [] };
}

export function placeLayout(layout: LayoutId, ctx: LayoutCtx): LayoutResult {
  switch (layout) {
    case 'caverns':
      return cavernsLayout(ctx);
    case 'cathedral':
      return cathedralLayout(ctx);
    case 'warren':
      return warrenLayout(ctx);
    case 'rings':
      return ringsLayout(ctx);
    case 'arena':
      return arenaLayout(ctx);
    case 'scatter':
      return scatterLayout(ctx);
    case 'spire':
      return spireLayout(ctx);
    case 'hub':
      return hubLayout(ctx);
    case 'grid':
    default:
      return gridLayout(ctx);
  }
}
