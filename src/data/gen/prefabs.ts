import { Tile } from '../../core/constants';
import type { SpawnDef, PickupDef, DecorDef, EnemyId } from '../../core/types';
import type { SetPieceId } from './themes';

// ----------------------------------------------------------------------------
// Set-pieces — hand-authored "vaults" stamped into a procedurally chosen room.
// Each prefab mutates the tile grid and pushes spawns / pickups / decor, giving
// otherwise-random levels memorable, deliberate moments.
// ----------------------------------------------------------------------------

export interface Room {
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
}

export interface PrefabCtx {
  tiles: number[][];
  W: number;
  H: number;
  rng: () => number;
  spawns: SpawnDef[];
  pickups: PickupDef[];
  decor: DecorDef[];
  /** Enemy roster the host theme cycles for guardians. */
  enemies: EnemyId[];
  /** Loot pool the theme seeds chests from. */
  chestItems: string[];
}

export type Prefab = (room: Room, ctx: PrefabCtx) => void;

// --- helpers ----------------------------------------------------------------
const inB = (ctx: PrefabCtx, x: number, y: number): boolean => x > 0 && y > 0 && x < ctx.W - 1 && y < ctx.H - 1;

function setFloorTile(ctx: PrefabCtx, x: number, y: number, t: number): void {
  if (!inB(ctx, x, y)) return;
  // never clobber structural / exit tiles
  const cur = ctx.tiles[y][x];
  if (cur === Tile.WALL || cur === Tile.VOID || cur === Tile.EXIT || cur === Tile.LOCKED_DOOR || cur === Tile.DOOR) return;
  ctx.tiles[y][x] = t;
}

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length) % arr.length];
}

function ring(room: Room): [number, number][] {
  return [
    [room.cx, room.y + 1],
    [room.cx, room.y + room.h - 2],
    [room.x + 1, room.cy],
    [room.x + room.w - 2, room.cy],
  ];
}

// --- prefabs ----------------------------------------------------------------

// A loot room: a strong chest ringed with coins, flanked by cogs, with one
// guardian that spawns to defend it.
const treasureVault: Prefab = (room, ctx) => {
  const item = pick(ctx.chestItems.length ? ctx.chestItems : ['iron_sword'], ctx.rng);
  ctx.spawns.push({ kind: 'chest', x: room.cx, y: room.cy, itemId: item });
  const coins: [number, number][] = [
    [room.cx - 1, room.cy - 1],
    [room.cx + 1, room.cy - 1],
    [room.cx - 1, room.cy + 1],
    [room.cx + 1, room.cy + 1],
  ];
  for (const [x, y] of coins) ctx.pickups.push({ kind: 'coin', x, y, coin: 12 + Math.floor(ctx.rng() * 14) });
  ctx.decor.push({ x: room.cx - 2, y: room.cy, key: 'cog' }, { x: room.cx + 2, y: room.cy, key: 'cog' });
  ctx.spawns.push({ kind: 'generator', x: room.cx, y: room.cy - 2, enemyId: pick(ctx.enemies, ctx.rng), interval: 4200, maxAlive: 3, hp: 34 });
};

// A frozen shrine: the whole chamber ices over (leaving a stable pad under the
// shrine) and crystals ring the altar.
const frozenAltar: Prefab = (room, ctx) => {
  for (let y = room.y + 1; y < room.y + room.h - 1; y++)
    for (let x = room.x + 1; x < room.x + room.w - 1; x++) setFloorTile(ctx, x, y, Tile.ICE);
  // stable footing directly under and around the shrine
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) setFloorTile(ctx, room.cx + dx, room.cy + dy, Tile.FLOOR);
  ctx.spawns.push({ kind: 'shrine', x: room.cx, y: room.cy });
  for (const [x, y] of ring(room)) ctx.decor.push({ x, y, key: 'crystal' });
};

// A plague pit: a poison pool in the middle, vines hanging at the rim, a
// guardian lurking on the bank.
const plaguePit: Prefab = (room, ctx) => {
  const rx = Math.max(2, (room.w >> 1) - 2);
  const ry = Math.max(1, (room.h >> 1) - 2);
  for (let y = -ry; y <= ry; y++)
    for (let x = -rx; x <= rx; x++) {
      if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1) setFloorTile(ctx, room.cx + x, room.cy + y, Tile.POISON);
    }
  ctx.decor.push(
    { x: room.x + 2, y: room.y + 1, key: 'vines' },
    { x: room.x + room.w - 3, y: room.y + 1, key: 'vines' },
    { x: room.cx, y: room.y + 1, key: 'vines' }
  );
  ctx.spawns.push({ kind: 'generator', x: room.x + 2, y: room.cy, enemyId: pick(ctx.enemies, ctx.rng), interval: 3800, maxAlive: 4, hp: 30 });
};

// A spike gauntlet: rows of telegraphed spike traps guarding a reward at the
// far end of the chamber.
const spikeGauntlet: Prefab = (room, ctx) => {
  const y0 = room.cy - 1;
  const y1 = room.cy + 1;
  for (let x = room.x + 2; x < room.x + room.w - 3; x++) {
    if ((x - room.x) % 2 === 0) setFloorTile(ctx, x, y0, Tile.SPIKES);
    if ((x - room.x) % 2 === 1) setFloorTile(ctx, x, y1, Tile.SPIKES);
  }
  const item = pick(ctx.chestItems.length ? ctx.chestItems : ['oak_staff'], ctx.rng);
  ctx.spawns.push({ kind: 'chest', x: room.x + room.w - 2, y: room.cy, itemId: item });
  ctx.pickups.push({ kind: 'coin', x: room.x + room.w - 2, y: room.cy - 1, coin: 18 });
};

// The arena ring: bloodstained sand, skulls on pikes, and two generators that
// feed the slaughter.
const arenaRing: Prefab = (room, ctx) => {
  for (const [x, y] of ring(room)) ctx.decor.push({ x, y, key: 'skull-pike' });
  for (let i = 0; i < 5; i++) {
    const x = room.x + 2 + Math.floor(ctx.rng() * Math.max(1, room.w - 4));
    const y = room.y + 2 + Math.floor(ctx.rng() * Math.max(1, room.h - 4));
    ctx.decor.push({ x, y, key: 'blood-stain' });
  }
  ctx.spawns.push(
    { kind: 'generator', x: room.x + 2, y: room.cy, enemyId: pick(ctx.enemies, ctx.rng), interval: 3600, maxAlive: 4, hp: 32 },
    { kind: 'generator', x: room.x + room.w - 3, y: room.cy, enemyId: pick(ctx.enemies, ctx.rng), interval: 3600, maxAlive: 4, hp: 32 }
  );
  for (let i = 0; i < 4; i++) ctx.pickups.push({ kind: 'coin', x: room.cx, y: room.cy, coin: 10 });
};

// Decorative crystal cluster — pure ambience for frost levels.
const crystalCluster: Prefab = (room, ctx) => {
  const n = 4 + Math.floor(ctx.rng() * 3);
  for (let i = 0; i < n; i++) {
    const x = room.x + 1 + Math.floor(ctx.rng() * Math.max(1, room.w - 2));
    const y = room.y + 1 + Math.floor(ctx.rng() * Math.max(1, room.h - 2));
    if (ctx.tiles[y]?.[x] === Tile.FLOOR || ctx.tiles[y]?.[x] === Tile.ICE) ctx.decor.push({ x, y, key: 'crystal' });
  }
};

// A pillared guardian hall: rows of pillars, banners, and a defender.
const guardianHall: Prefab = (room, ctx) => {
  for (let x = room.x + 2; x < room.x + room.w - 2; x += 3) {
    ctx.decor.push({ x, y: room.y + 1, key: 'pillar' });
    ctx.decor.push({ x, y: room.y + room.h - 2, key: 'pillar' });
  }
  ctx.decor.push({ x: room.cx, y: room.y + 1, key: 'banner' });
  ctx.spawns.push({ kind: 'generator', x: room.cx, y: room.cy, enemyId: pick(ctx.enemies, ctx.rng), interval: 4000, maxAlive: 4, hp: 30 });
};

export const PREFABS: Record<SetPieceId, Prefab> = {
  treasureVault,
  frozenAltar,
  plaguePit,
  spikeGauntlet,
  arenaRing,
  crystalCluster,
  guardianHall,
};
