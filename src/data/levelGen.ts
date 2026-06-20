import { Tile } from '../core/constants';
import type { LevelData, SpawnDef, PickupDef, EnemyId } from '../core/types';

// Generic room+corridor dungeon generator shared by every level. Deterministic
// for a given seed so layouts are stable across reloads and saves.

export interface DungeonOptions {
  id: string;
  name: string;
  seed: number;
  width: number;
  height: number;
  cols: number;
  rows: number;
  ambientColor: number;
  generatorEnemies: EnemyId[];
  bossId: EnemyId;
  hazard: 'water' | 'lava' | 'both' | 'none';
  chestItems: string[];
  maxGenerators: number;
  startWeapon?: string;
}

interface Room {
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
}

function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function buildDungeon(opts: DungeonOptions): LevelData {
  const W = opts.width;
  const H = opts.height;
  const cols = opts.cols;
  const rows = opts.rows;
  const rng = lcg(opts.seed);

  const tiles: number[][] = [];
  for (let y = 0; y < H; y++) tiles.push(new Array(W).fill(Tile.WALL));

  const carveRect = (x: number, y: number, w: number, h: number, t: number) => {
    for (let j = y; j < y + h; j++)
      for (let i = x; i < x + w; i++)
        if (i > 0 && i < W - 1 && j > 0 && j < H - 1) tiles[j][i] = t;
  };
  const corridorH = (x0: number, x1: number, y: number) => {
    const [a, b] = x0 < x1 ? [x0, x1] : [x1, x0];
    for (let i = a; i <= b; i++) {
      tiles[y][i] = Tile.FLOOR;
      tiles[y + 1][i] = Tile.FLOOR;
    }
  };
  const corridorV = (y0: number, y1: number, x: number) => {
    const [a, b] = y0 < y1 ? [y0, y1] : [y1, y0];
    for (let j = a; j <= b; j++) {
      tiles[j][x] = Tile.FLOOR;
      tiles[j][x + 1] = Tile.FLOOR;
    }
  };

  const cellW = Math.floor(W / cols);
  const cellH = Math.floor(H / rows);
  const grid: Room[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const rw = 9 + Math.floor(rng() * 6);
      const rh = 6 + Math.floor(rng() * 4);
      const baseX = c * cellW;
      const baseY = r * cellH;
      const rx = Math.min(W - rw - 2, baseX + 2 + Math.floor(rng() * Math.max(1, cellW - rw - 3)));
      const ry = Math.min(H - rh - 2, baseY + 2 + Math.floor(rng() * Math.max(1, cellH - rh - 3)));
      carveRect(rx, ry, rw, rh, Tile.FLOOR);
      grid.push({ x: rx, y: ry, w: rw, h: rh, cx: rx + (rw >> 1), cy: ry + (rh >> 1) });
    }
  }

  // snake ordering for a single long path through every room
  const path: Room[] = [];
  for (let r = 0; r < rows; r++) {
    const rowRooms = grid.slice(r * cols, r * cols + cols);
    if (r % 2 === 1) rowRooms.reverse();
    path.push(...rowRooms);
  }

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
  // a couple of extra cross links so the map is not a single thread
  if (rows > 1) {
    corridorV(grid[0].cy, grid[cols].cy, grid[0].cx);
    corridorH(grid[cols].cx, grid[cols + 1].cx, grid[cols].cy);
  }

  const at = (frac: number) => path[Math.max(1, Math.min(path.length - 2, Math.floor(path.length * frac)))];

  if (opts.hazard === 'water' || opts.hazard === 'both') {
    const wr = at(0.35);
    carveRect(wr.x + 2, wr.y + 2, Math.max(3, wr.w - 4), Math.max(2, wr.h - 4), Tile.WATER);
  }
  if (opts.hazard === 'lava' || opts.hazard === 'both') {
    const lr = at(0.7);
    carveRect(lr.x + 2, lr.y + 1, Math.max(3, lr.w - 4), 2, Tile.LAVA);
    const lr2 = at(0.55);
    carveRect(lr2.x + Math.floor(lr2.w / 2), lr2.y + 2, 2, Math.max(2, lr2.h - 4), Tile.LAVA);
  }

  const bossRoom = path[path.length - 1];
  carveRect(bossRoom.x - 1, bossRoom.y - 1, bossRoom.w + 2, bossRoom.h + 2, Tile.FLOOR);
  const exitX = bossRoom.x + bossRoom.w - 2;
  const exitY = bossRoom.y + 1;
  tiles[exitY][exitX] = Tile.EXIT;
  tiles[exitY][exitX - 1] = Tile.EXIT;

  const pen = path[path.length - 2];
  const lockX = Math.round((pen.cx + bossRoom.cx) / 2);
  const lockY = bossRoom.cy;
  if (tiles[lockY] && tiles[lockY][lockX] === Tile.FLOOR) tiles[lockY][lockX] = Tile.LOCKED_DOOR;

  if (tiles[path[0].cy][path[0].x + path[0].w] !== undefined)
    tiles[path[0].cy][path[0].x + path[0].w - 1] = Tile.DOOR;

  const spawns: SpawnDef[] = [];
  spawns.push({ kind: 'playerStart', x: path[0].cx, y: path[0].cy });
  spawns.push({ kind: 'npc', x: path[0].cx - 2, y: path[0].cy - 1 });

  // generators: cycle the enemy pool through interior rooms
  const genCount = Math.min(opts.maxGenerators, Math.max(1, path.length - 2));
  for (let gi = 0; gi < genCount; gi++) {
    const room = path[1 + gi];
    const enemyId = opts.generatorEnemies[gi % opts.generatorEnemies.length];
    spawns.push({
      kind: 'generator',
      x: room.x + 2 + (gi % Math.max(1, room.w - 3)),
      y: room.y + 2 + (gi % Math.max(1, room.h - 3)),
      enemyId,
      interval: 4200 - gi * 120,
      maxAlive: 4,
      hp: 28 + gi * 5,
    });
  }

  // chests spread along the path
  opts.chestItems.forEach((itemId, i) => {
    const room = at(0.15 + (i / Math.max(1, opts.chestItems.length)) * 0.7);
    spawns.push({ kind: 'chest', x: room.cx, y: room.cy, itemId });
  });

  spawns.push({ kind: 'shrine', x: at(0.25).cx, y: at(0.25).cy });
  spawns.push({ kind: 'shrine', x: at(0.6).cx, y: at(0.6).cy });
  spawns.push({ kind: 'key', x: path[Math.max(1, path.length - 3)].cx, y: path[Math.max(1, path.length - 3)].cy });
  spawns.push({ kind: 'boss', x: bossRoom.cx, y: bossRoom.cy, enemyId: opts.bossId });

  const pickups: PickupDef[] = [];
  for (let i = 0; i < path.length; i++) {
    const room = path[i];
    const n = 2 + Math.floor(rng() * 3);
    for (let k = 0; k < n; k++) {
      const px = room.x + 1 + Math.floor(rng() * Math.max(1, room.w - 2));
      const py = room.y + 1 + Math.floor(rng() * Math.max(1, room.h - 2));
      if (tiles[py][px] !== Tile.FLOOR) continue;
      const roll = rng();
      if (roll < 0.6) pickups.push({ kind: 'coin', x: px, y: py, coin: 5 + Math.floor(rng() * 10) });
      else if (roll < 0.8) pickups.push({ kind: 'food', x: px, y: py });
      else if (roll < 0.92) pickups.push({ kind: 'potion', x: px, y: py, itemId: 'health_potion' });
      else pickups.push({ kind: 'potion', x: px, y: py, itemId: 'mana_potion' });
    }
  }
  if (opts.startWeapon) pickups.push({ kind: 'item', itemId: opts.startWeapon, x: path[0].cx + 1, y: path[0].cy });

  return {
    id: opts.id,
    name: opts.name,
    width: W,
    height: H,
    tiles,
    spawns,
    pickups,
    ambientColor: opts.ambientColor,
  };
}
