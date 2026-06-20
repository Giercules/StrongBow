import { Tile } from '../core/constants';
import type { LevelData, SpawnDef, PickupDef } from '../core/types';

// Sunken Crypt - deterministic room+corridor generator (88 x 64 tiles).
const W = 88;
const H = 64;

function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

interface Room {
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
}

export function buildSunkenCrypt(): LevelData {
  const rng = lcg(0x5713b0);
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

  const cols = 4;
  const rows = 3;
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
  corridorV(grid[0].cy, grid[cols].cy, grid[0].cx);
  corridorH(grid[cols].cx, grid[cols + 1].cx, grid[cols].cy);

  const waterRoom = path[3];
  carveRect(waterRoom.x + 2, waterRoom.y + 2, Math.max(3, waterRoom.w - 4), Math.max(2, waterRoom.h - 4), Tile.WATER);
  const lavaRoom = path[7];
  carveRect(lavaRoom.x + 2, lavaRoom.y + 1, Math.max(3, lavaRoom.w - 4), 2, Tile.LAVA);
  const lavaRoom2 = path[5];
  carveRect(lavaRoom2.x + Math.floor(lavaRoom2.w / 2), lavaRoom2.y + 2, 2, Math.max(2, lavaRoom2.h - 4), Tile.LAVA);

  const bossRoom = path[path.length - 1];
  carveRect(bossRoom.x - 1, bossRoom.y - 1, bossRoom.w + 2, bossRoom.h + 2, Tile.FLOOR);
  const exitX = bossRoom.x + bossRoom.w - 2;
  const exitY = bossRoom.y + 1;
  tiles[exitY][exitX] = Tile.EXIT;
  tiles[exitY][exitX - 1] = Tile.EXIT;

  const pen = path[path.length - 2];
  const lockX = Math.round((pen.cx + bossRoom.cx) / 2);
  const lockY = bossRoom.cy;
  if (tiles[lockY] && tiles[lockY][lockX] === Tile.FLOOR) {
    tiles[lockY][lockX] = Tile.LOCKED_DOOR;
  }

  if (tiles[path[0].cy][path[0].x + path[0].w] !== undefined)
    tiles[path[0].cy][path[0].x + path[0].w - 1] = Tile.DOOR;

  const spawns: SpawnDef[] = [];
  spawns.push({ kind: 'playerStart', x: path[0].cx, y: path[0].cy });
  spawns.push({ kind: 'npc', x: path[0].cx - 2, y: path[0].cy - 1 });

  const genEnemies: ('grunt' | 'ghost' | 'demon')[] = ['grunt', 'grunt', 'ghost', 'grunt', 'demon', 'ghost', 'demon', 'grunt'];
  let gi = 0;
  for (let i = 1; i < path.length - 1 && gi < 8; i++) {
    const room = path[i];
    const count = gi < 4 ? 1 : i % 2 === 0 ? 2 : 1;
    for (let k = 0; k < count && gi < 8; k++) {
      spawns.push({
        kind: 'generator',
        x: room.x + 2 + ((k * 3 + 1) % Math.max(1, room.w - 3)),
        y: room.y + 2 + (k % Math.max(1, room.h - 3)),
        enemyId: genEnemies[gi],
        interval: 4200 - gi * 120,
        maxAlive: 4,
        hp: 28 + gi * 4,
      });
      gi++;
    }
  }

  spawns.push({ kind: 'chest', x: path[1].cx, y: path[1].cy, itemId: 'leather_jerkin' });
  spawns.push({ kind: 'chest', x: path[4].cx, y: path[4].cy, itemId: 'hunters_bow' });
  spawns.push({ kind: 'chest', x: path[8].cx, y: path[8].cy, itemId: 'ember_blade' });
  spawns.push({ kind: 'shrine', x: path[2].cx, y: path[2].cy });
  spawns.push({ kind: 'shrine', x: path[6].cx, y: path[6].cy });
  spawns.push({ kind: 'key', x: path[Math.max(1, path.length - 3)].cx, y: path[Math.max(1, path.length - 3)].cy });
  spawns.push({ kind: 'boss', x: bossRoom.cx, y: bossRoom.cy, enemyId: 'grave_warden' });

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

  pickups.push({ kind: 'item', itemId: 'crypt_knife', x: path[0].cx + 1, y: path[0].cy });

  return {
    id: 'sunken_crypt',
    name: 'The Sunken Crypt',
    width: W,
    height: H,
    tiles,
    spawns,
    pickups,
    ambientColor: 0x0a0c16,
  };
}

export const LEVEL1 = buildSunkenCrypt();
