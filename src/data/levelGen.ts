import { Tile } from '../core/constants';
import type { LevelData, SpawnDef, PickupDef, DecorDef, EnemyId, ThemeId } from '../core/types';
import { getTheme } from './gen/themes';
import type { RoomShape, HazardKind, SetPieceId } from './gen/themes';
import { PREFABS } from './gen/prefabs';
import type { Room, PrefabCtx } from './gen/prefabs';
import { placeLayout } from './gen/layouts';
import type { LayoutId } from './gen/layouts';

// Generic room+corridor dungeon generator shared by every level. Deterministic
// for a given seed so layouts are stable across reloads and saves. A `theme`
// supplies defaults (hazard, enemies, boss, room shapes, decor, set-pieces);
// any explicit option overrides the theme.
//
// Corridors are 3 tiles wide so the party + companions never bottleneck.

export interface DungeonOptions {
  id: string;
  name: string;
  seed: number;
  width: number;
  height: number;
  cols: number;
  rows: number;
  maxGenerators: number;
  ambientColor?: number;
  generatorEnemies?: EnemyId[];
  bossId?: EnemyId;
  hazard?: HazardKind;
  chestItems?: string[];
  startWeapon?: string;
  // ---- theme-driven extras (all optional) ----
  theme?: ThemeId;
  layout?: LayoutId;
  roomShapes?: RoomShape[];
  setPieces?: SetPieceId[];
  traps?: boolean;
  subtitle?: string;
  themeTint?: number;
  chapter?: string;
  story?: string;
}

function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function buildDungeon(opts: DungeonOptions): LevelData {
  const theme = getTheme(opts.theme);
  const W = opts.width;
  const H = opts.height;
  const cols = opts.cols;
  const rows = opts.rows;
  const rng = lcg(opts.seed);

  const ambientColor = opts.ambientColor ?? theme.ambientColor;
  const themeTint = opts.themeTint ?? theme.themeTint;
  const enemies = opts.generatorEnemies ?? theme.enemies;
  const boss = opts.bossId ?? theme.boss;
  const chestItems = opts.chestItems ?? [];
  const hazard: HazardKind = opts.hazard ?? theme.primaryHazard;
  const shapes = opts.roomShapes ?? theme.roomShapes;
  const setPieces = opts.setPieces ?? theme.setPieces;
  const traps = opts.traps ?? theme.traps;
  const subtitle = opts.subtitle ?? theme.subtitle;
  const layout = opts.layout ?? theme.layout ?? 'grid';

  const tiles: number[][] = [];
  for (let y = 0; y < H; y++) tiles.push(new Array(W).fill(Tile.WALL));
  const decor: DecorDef[] = [];
  const spawns: SpawnDef[] = [];
  const pickups: PickupDef[] = [];

  const inB = (x: number, y: number) => x > 0 && y > 0 && x < W - 1 && y < H - 1;
  const setFloor = (x: number, y: number) => {
    if (inB(x, y)) tiles[y][x] = Tile.FLOOR;
  };

  // ---- 3-wide corridors (centred) so groups flow through cleanly ----
  const corridorH = (x0: number, x1: number, y: number) => {
    const [a, b] = x0 < x1 ? [x0, x1] : [x1, x0];
    for (let i = a; i <= b; i++) for (let dy = -1; dy <= 1; dy++) setFloor(i, y + dy);
  };
  const corridorV = (y0: number, y1: number, x: number) => {
    const [a, b] = y0 < y1 ? [y0, y1] : [y1, y0];
    for (let j = a; j <= b; j++) for (let dx = -1; dx <= 1; dx++) setFloor(x + dx, j);
  };

  // ---- room-shape carving ----
  const carveShape = (room: Room, shape: RoomShape) => {
    const { x, y, w, h, cx, cy } = room;
    if (shape === 'rect' || shape === 'hall') {
      for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) setFloor(i, j);
    } else if (shape === 'circle') {
      const rx = w / 2;
      const ry = h / 2;
      for (let j = y; j < y + h; j++)
        for (let i = x; i < x + w; i++) {
          const nx = (i + 0.5 - (x + rx)) / rx;
          const ny = (j + 0.5 - (y + ry)) / ry;
          if (nx * nx + ny * ny <= 1) setFloor(i, j);
        }
    } else if (shape === 'cross') {
      for (let j = cy - 2; j <= cy + 2; j++) for (let i = x; i < x + w; i++) setFloor(i, j);
      for (let i = cx - 2; i <= cx + 2; i++) for (let j = y; j < y + h; j++) setFloor(i, j);
    } else if (shape === 'cavern') {
      // union of a few overlapping blobs centred on the room -> organic but connected
      const blobs: [number, number, number][] = [[cx, cy, Math.max(3, Math.min(w, h) / 2.2)]];
      const n = 2 + Math.floor(rng() * 3);
      for (let k = 0; k < n; k++) {
        const bx = x + 2 + Math.floor(rng() * Math.max(1, w - 4));
        const by = y + 2 + Math.floor(rng() * Math.max(1, h - 4));
        blobs.push([bx, by, 2 + rng() * 2.5]);
      }
      for (let j = y; j < y + h; j++)
        for (let i = x; i < x + w; i++)
          for (const [bx, by, br] of blobs) {
            const dx = i + 0.5 - bx;
            const dy = j + 0.5 - by;
            if (dx * dx + dy * dy <= br * br) {
              setFloor(i, j);
              break;
            }
          }
    }
    // guarantee a connected centre so corridors always attach
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) setFloor(cx + dx, cy + dy);
  };

  // ---- macro-layout: place + carve the rooms in a theme-specific topology ----
  // (grid catacomb, cavern blobs, cathedral nave, gear-rings, spire, hub, ...).
  const { path, pillars } = placeLayout(layout, {
    W,
    H,
    cols,
    rows,
    rng,
    tiles,
    themeShapes: shapes,
    inB,
    setFloor,
    corridorH,
    corridorV,
    carveShape,
  });

  // GUARANTEED connectivity: thread corridors through the path in order, so the
  // boss room is always reachable whatever silhouette the layout drew. Bespoke
  // layout corridors only ever add extra (prettier) links on top of this spine.
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    if (rng() < 0.5) {
      corridorH(a.cx, b.cx, a.cy);
      corridorV(a.cy, b.cy, b.cx);
    } else {
      corridorV(a.cy, b.cy, a.cx);
      corridorH(a.cx, b.cx, b.cy);
    }
  }

  // ---- branch rooms: side chambers off the main path (exploration + loot) ----
  // Parents exclude the penultimate room so a branch can never tunnel around the
  // locked gate that guards the boss. Connectivity stays guaranteed: each branch
  // is wired straight back to its (already-connected) parent with an L corridor.
  const mkBranch = (x: number, y: number, w: number, h: number): Room => ({ x, y, w, h, cx: x + (w >> 1), cy: y + (h >> 1) });
  const branchRooms: Room[] = [];
  const branchTarget = Math.min(7, Math.max(3, Math.round(path.length * 0.4)));
  const bdirs: [number, number][] = [[0, -1], [0, 1], [-1, 0], [1, 0]];
  for (let b = 0; b < branchTarget; b++) {
    const parent = path[1 + Math.floor(rng() * Math.max(1, path.length - 3))];
    const bw = 8 + Math.floor(rng() * 6);
    const bh = 6 + Math.floor(rng() * 4);
    const [dx, dy] = bdirs[Math.floor(rng() * bdirs.length)];
    const off = 9 + Math.floor(rng() * 8);
    const bcx = Math.max(4 + (bw >> 1), Math.min(W - 5 - (bw >> 1), parent.cx + dx * off));
    const bcy = Math.max(4 + (bh >> 1), Math.min(H - 5 - (bh >> 1), parent.cy + dy * off));
    const room = mkBranch(bcx - (bw >> 1), bcy - (bh >> 1), bw, bh);
    const bshape = shapes[Math.floor(rng() * shapes.length)] ?? 'rect';
    carveShape(room, bshape === 'hall' ? 'rect' : bshape);
    corridorH(parent.cx, room.cx, parent.cy);
    corridorV(parent.cy, room.cy, room.cx);
    branchRooms.push(room);
  }

  const at = (frac: number) => path[Math.max(1, Math.min(path.length - 2, Math.floor(path.length * frac)))];

  // decorative pillar rows the layout asked for (nave colonnades, spire shaft)
  for (const p of pillars) decor.push({ x: p.x, y: p.y, key: 'pillar' });

  // ---- hazards (theme-driven) ----
  const carvePool = (room: Room, tile: number) => {
    const rx = Math.max(2, (room.w >> 1) - 2);
    const ry = Math.max(1, (room.h >> 1) - 2);
    for (let j = -ry; j <= ry; j++)
      for (let i = -rx; i <= rx; i++) {
        if ((i * i) / (rx * rx) + (j * j) / (ry * ry) <= 1) {
          const x = room.cx + i;
          const y = room.cy + j;
          if (inB(x, y) && tiles[y][x] === Tile.FLOOR) tiles[y][x] = tile;
        }
      }
  };
  const freezeRoom = (room: Room) => {
    for (let j = room.y + 1; j < room.y + room.h - 1; j++)
      for (let i = room.x + 1; i < room.x + room.w - 1; i++)
        if (inB(i, j) && tiles[j][i] === Tile.FLOOR) tiles[j][i] = Tile.ICE;
  };
  const scatterSpikes = () => {
    const fracs = [0.3, 0.45, 0.6, 0.75];
    for (const fr of fracs) {
      const room = at(fr);
      const n = 2 + Math.floor(rng() * 3);
      for (let k = 0; k < n; k++) {
        const x = room.x + 2 + Math.floor(rng() * Math.max(1, room.w - 4));
        const y = room.y + 2 + Math.floor(rng() * Math.max(1, room.h - 4));
        if (inB(x, y) && tiles[y][x] === Tile.FLOOR) tiles[y][x] = Tile.SPIKES;
      }
    }
  };

  if (hazard === 'water' || hazard === 'both') carvePool(at(0.35), Tile.WATER);
  if (hazard === 'lava' || hazard === 'both') {
    carvePool(at(0.7), Tile.LAVA);
    carvePool(at(0.55), Tile.LAVA);
  }
  if (hazard === 'poison') {
    carvePool(at(0.4), Tile.POISON);
    carvePool(at(0.68), Tile.POISON);
  }
  if (hazard === 'ice') {
    freezeRoom(at(0.3));
    freezeRoom(at(0.6));
    freezeRoom(at(0.8));
  }
  if (hazard === 'spikes' || traps) scatterSpikes();

  // ---- set-pieces stamped into feature rooms ----
  const featureRooms = new Set<number>();
  const ctx: PrefabCtx = { tiles, W, H, rng, spawns, pickups, decor, enemies, chestItems };
  const candidates: number[] = [];
  for (let i = 1; i < path.length - 1; i++) candidates.push(i);
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  if (setPieces.length) {
    const extraFeatures = Math.min(3, Math.floor(path.length / 12));
    const featureCount = Math.min(candidates.length, setPieces.length + extraFeatures);
    for (let k = 0; k < featureCount; k++) {
      const idx = candidates[k];
      PREFABS[setPieces[k % setPieces.length]](path[idx], ctx);
      featureRooms.add(idx);
    }
  }

  // ---- boss room, exit portal, locked gate ----
  const bossRoom = path[path.length - 1];
  for (let j = bossRoom.y - 1; j < bossRoom.y + bossRoom.h + 1; j++)
    for (let i = bossRoom.x - 1; i < bossRoom.x + bossRoom.w + 1; i++) setFloor(i, j);
  const exitX = bossRoom.x + bossRoom.w - 2;
  const exitY = bossRoom.y + 1;
  if (inB(exitX, exitY)) tiles[exitY][exitX] = Tile.EXIT;
  if (inB(exitX - 1, exitY)) tiles[exitY][exitX - 1] = Tile.EXIT;

  // full-width locked gate across the corridor leading into the boss room
  const pen = path[path.length - 2];
  const lockX = Math.round((pen.cx + bossRoom.cx) / 2);
  const lockY = Math.round((pen.cy + bossRoom.cy) / 2);
  const horizontalRun = tiles[lockY]?.[lockX - 1] === Tile.FLOOR && tiles[lockY]?.[lockX + 1] === Tile.FLOOR;
  for (let d = -1; d <= 1; d++) {
    const gx = horizontalRun ? lockX : lockX + d;
    const gy = horizontalRun ? lockY + d : lockY;
    if (inB(gx, gy) && tiles[gy][gx] === Tile.FLOOR) tiles[gy][gx] = Tile.LOCKED_DOOR;
  }

  // entry door (2-wide) at the start room
  const door0Y = path[0].cy;
  const door0X = path[0].x + path[0].w - 1;
  if (inB(door0X, door0Y) && tiles[door0Y][door0X] === Tile.FLOOR) tiles[door0Y][door0X] = Tile.DOOR;
  if (inB(door0X, door0Y + 1) && tiles[door0Y + 1][door0X] === Tile.FLOOR) tiles[door0Y + 1][door0X] = Tile.DOOR;

  // ---- core spawns ----
  spawns.push({ kind: 'playerStart', x: path[0].cx, y: path[0].cy });
  spawns.push({ kind: 'npc', x: path[0].cx - 2, y: path[0].cy - 1 });

  let placed = 0;
  for (let i = 1; i < path.length - 1 && placed < opts.maxGenerators; i++) {
    if (featureRooms.has(i)) continue;
    const room = path[i];
    const enemyId = enemies[placed % enemies.length];
    spawns.push({
      kind: 'generator',
      x: room.x + 2 + (placed % Math.max(1, room.w - 3)),
      y: room.y + 2 + (placed % Math.max(1, room.h - 3)),
      enemyId,
      interval: 4200 - placed * 120,
      maxAlive: 4,
      hp: 28 + placed * 5,
    });
    placed++;
  }

  chestItems.forEach((itemId, i) => {
    const room = at(0.15 + (i / Math.max(1, chestItems.length)) * 0.7);
    spawns.push({ kind: 'chest', x: room.cx, y: room.cy, itemId });
  });

  spawns.push({ kind: 'shrine', x: at(0.22).cx, y: at(0.22).cy });
  spawns.push({ kind: 'shrine', x: at(0.5).cx, y: at(0.5).cy });
  spawns.push({ kind: 'shrine', x: at(0.78).cx, y: at(0.78).cy });
  spawns.push({ kind: 'key', x: path[Math.max(1, path.length - 3)].cx, y: path[Math.max(1, path.length - 3)].cy });
  spawns.push({ kind: 'boss', x: bossRoom.cx, y: bossRoom.cy, enemyId: boss });

  // keep the player's start tile and boss centre clear of hazards
  setFloor(path[0].cx, path[0].cy);
  setFloor(bossRoom.cx, bossRoom.cy);

  // ---- pickups scattered through every room ----
  for (let i = 0; i < path.length; i++) {
    if (i > 0 && i < path.length - 1 && rng() > 0.72) continue;
    const room = path[i];
    const n = 1 + Math.floor(rng() * 3);
    for (let k = 0; k < n; k++) {
      const px = room.x + 1 + Math.floor(rng() * Math.max(1, room.w - 2));
      const py = room.y + 1 + Math.floor(rng() * Math.max(1, room.h - 2));
      if (!inB(px, py) || tiles[py][px] !== Tile.FLOOR) continue;
      const roll = rng();
      if (roll < 0.6) pickups.push({ kind: 'coin', x: px, y: py, coin: 5 + Math.floor(rng() * 10) });
      else if (roll < 0.8) pickups.push({ kind: 'food', x: px, y: py });
      else if (roll < 0.92) pickups.push({ kind: 'potion', x: px, y: py, itemId: 'health_potion' });
      else pickups.push({ kind: 'potion', x: px, y: py, itemId: 'mana_potion' });
    }
  }
  if (opts.startWeapon) pickups.push({ kind: 'item', itemId: opts.startWeapon, x: path[0].cx + 1, y: path[0].cy });

  // ---- ambient theme decor sprinkled on open floor ----
  if (theme.decorKeys.length) {
    for (let i = 1; i < path.length - 1; i++) {
      if (rng() < 0.55) {
        const room = path[i];
        const x = room.x + 1 + Math.floor(rng() * Math.max(1, room.w - 2));
        const y = room.y + 1 + Math.floor(rng() * Math.max(1, room.h - 2));
        if (inB(x, y) && tiles[y][x] === Tile.FLOOR) {
          decor.push({ x, y, key: theme.decorKeys[Math.floor(rng() * theme.decorKeys.length)] });
        }
      }
    }
  }

  // ---- populate branch rooms: loot, the odd guardian, a little decor ----
  branchRooms.forEach((room, bi) => {
    if (rng() < 0.45)
      spawns.push({ kind: 'generator', x: room.cx, y: Math.max(room.y + 1, room.cy - 1), enemyId: enemies[(placed + bi) % enemies.length], interval: 4400, maxAlive: 3, hp: 26 });
    if (chestItems.length && rng() < 0.5)
      spawns.push({ kind: 'chest', x: room.cx, y: room.cy, itemId: chestItems[bi % chestItems.length] });
    const bn = 2 + Math.floor(rng() * 3);
    for (let k = 0; k < bn; k++) {
      const px = room.x + 1 + Math.floor(rng() * Math.max(1, room.w - 2));
      const py = room.y + 1 + Math.floor(rng() * Math.max(1, room.h - 2));
      if (!inB(px, py) || tiles[py][px] !== Tile.FLOOR) continue;
      const roll = rng();
      if (roll < 0.6) pickups.push({ kind: 'coin', x: px, y: py, coin: 6 + Math.floor(rng() * 12) });
      else if (roll < 0.82) pickups.push({ kind: 'food', x: px, y: py });
      else pickups.push({ kind: 'potion', x: px, y: py, itemId: roll < 0.91 ? 'health_potion' : 'mana_potion' });
    }
    if (theme.decorKeys.length && rng() < 0.6)
      decor.push({ x: room.cx, y: Math.min(room.y + room.h - 2, room.cy + 1), key: theme.decorKeys[Math.floor(rng() * theme.decorKeys.length)] });
  });

  // ---- cap total generators so dense layouts stay fun and performant ----
  const GEN_CAP = Math.min(15, opts.maxGenerators + 4);
  let genCount = 0;
  for (let i = 0; i < spawns.length; i++) {
    if (spawns[i].kind === 'generator' && ++genCount > GEN_CAP) {
      pickups.push({ kind: 'coin', x: spawns[i].x, y: spawns[i].y, coin: 14 + Math.floor(rng() * 16) });
      spawns.splice(i, 1);
      i--;
    }
  }

  // ---- snap every spawn / pickup onto reachable floor ----
  // (circle / cross / cavern rooms can leave their bounding-box corners as wall,
  //  so a raw room-relative offset may land inside solid rock.)
  const walkable = (x: number, y: number) => {
    const t = tiles[y]?.[x];
    return t !== undefined && t !== Tile.WALL && t !== Tile.VOID && t !== Tile.LOCKED_DOOR;
  };
  const snap = (x: number, y: number): { x: number; y: number } => {
    if (walkable(x, y)) return { x, y };
    for (let r = 1; r <= 8; r++) {
      for (let dy = -r; dy <= r; dy++)
        for (let dx = -r; dx <= r; dx++) {
          if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
          if (walkable(x + dx, y + dy)) return { x: x + dx, y: y + dy };
        }
    }
    return { x, y };
  };
  for (const s of spawns) {
    const p = snap(s.x, s.y);
    s.x = p.x;
    s.y = p.y;
  }
  for (const p of pickups) {
    const q = snap(p.x, p.y);
    p.x = q.x;
    p.y = q.y;
  }

  return {
    id: opts.id,
    name: opts.name,
    width: W,
    height: H,
    tiles,
    spawns,
    pickups,
    ambientColor,
    theme: theme.id,
    themeTint,
    decor,
    subtitle,
    chapter: opts.chapter,
    story: opts.story,
  };
}

