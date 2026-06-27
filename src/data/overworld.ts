import { Tile } from '../core/constants';
import type { LevelData, SpawnDef, PickupDef, DecorDef } from '../core/types';

// ----------------------------------------------------------------------------
// The surface overworld: a large 5-biome map surrounding Hearthwatch. Reached
// from any of the town's four gates; a fortified town-exterior at the centre
// holds a gate back inside. Peaceful for now (town-flagged): lots of detail and
// wandering critters, no monster generators. See StrongBow_Overworld_Map_Design.
// ----------------------------------------------------------------------------

const W = 192;
const H = 128;
// Hearthwatch sits centre-north; players emerge just outside its walls.
const TOWN_X = 96;
const TOWN_Y = 48;

export type OverworldDir = 'north' | 'south' | 'east' | 'west';
/** Where the party appears in the overworld for each town gate used. */
export const OVERWORLD_ENTRIES: Record<OverworldDir, { x: number; y: number }> = {
  north: { x: TOWN_X, y: TOWN_Y - 10 },
  south: { x: TOWN_X, y: TOWN_Y + 11 },
  east: { x: TOWN_X + 16, y: TOWN_Y },
  west: { x: TOWN_X - 16, y: TOWN_Y },
};

type Biome = 'plains' | 'forest' | 'mountain' | 'desert' | 'swamp';

function biomeAt(x: number, y: number): Biome {
  if (y <= 24) return 'mountain';
  if (y >= 100) return 'desert';
  if (x >= 140 && y >= 38 && y <= 112) return 'swamp';
  if (x <= 54) return 'forest';
  return 'plains';
}

function groundTile(b: Biome): number {
  switch (b) {
    case 'mountain': return Tile.ROCK;
    case 'desert': return Tile.SAND;
    case 'swamp': return Tile.MUD;
    default: return Tile.GRASS; // plains + forest
  }
}

export function buildOverworld(): LevelData {
  const tiles: number[][] = [];
  for (let y = 0; y < H; y++) {
    const row: number[] = new Array(W);
    for (let x = 0; x < W; x++) row[x] = groundTile(biomeAt(x, y));
    tiles.push(row);
  }

  const decor: DecorDef[] = [];
  const spawns: SpawnDef[] = [];
  const pickups: PickupDef[] = [];
  const occupied = new Set<string>();
  const road = new Set<string>();
  const key = (x: number, y: number) => `${x},${y}`;
  const inB = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H;
  const setT = (x: number, y: number, t: number) => { if (inB(x, y)) tiles[y][x] = t; };

  // impassable, invisible outer frame
  for (let x = 0; x < W; x++) { setT(x, 0, Tile.VOID); setT(x, H - 1, Tile.VOID); }
  for (let y = 0; y < H; y++) { setT(0, y, Tile.VOID); setT(W - 1, y, Tile.VOID); }

  // ---- a winding river from the north mountains to the south-east swamp ----
  let rx = 70;
  for (let y = 2; y < H - 2; y++) {
    rx += [0, 1, 0, -1, 1, 1, 0][y % 7] + (y > 60 ? 1 : 0);
    rx = Math.max(6, Math.min(W - 7, rx));
    for (let w = 0; w < 3; w++) setT(rx + w, y, Tile.WATER);
  }
  // a few swamp pools in the east
  for (const [cx, cy, rxr, ryr] of [[158, 60, 7, 5], [170, 90, 6, 6], [150, 100, 8, 5]] as number[][]) {
    for (let dy = -ryr; dy <= ryr; dy++)
      for (let dx = -rxr; dx <= rxr; dx++)
        if ((dx * dx) / (rxr * rxr) + (dy * dy) / (ryr * ryr) <= 1) setT(cx + dx, cy + dy, Tile.WATER);
  }

  // ---- roads converging on the town (drawn as walkable dirt decor) ----
  const carveRoad = (x0: number, y0: number, x1: number, y1: number) => {
    let x = x0, y = y0;
    let guard = 0;
    while ((x !== x1 || y !== y1) && guard++ < 600) {
      for (let w = -1; w <= 1; w++) {
        const tx = Math.abs(x1 - x0) > Math.abs(y1 - y0) ? x : x + w;
        const ty = Math.abs(x1 - x0) > Math.abs(y1 - y0) ? y + w : y;
        if (inB(tx, ty) && tiles[ty][tx] !== Tile.WATER && tiles[ty][tx] !== Tile.VOID) {
          road.add(key(tx, ty));
          decor.push({ x: tx, y: ty, key: 'road' });
        }
      }
      if (x < x1) x++; else if (x > x1) x--;
      if (y < y1) y++; else if (y > y1) y--;
    }
  };
  carveRoad(TOWN_X, TOWN_Y, TOWN_X, 4);          // north road
  carveRoad(TOWN_X, TOWN_Y, TOWN_X, H - 6);      // south road
  carveRoad(TOWN_X, TOWN_Y, 6, TOWN_Y - 6);      // west road
  carveRoad(TOWN_X, TOWN_Y, W - 7, TOWN_Y + 8);  // east road

  // bridges where the south road crosses the river
  for (let y = 2; y < H - 2; y++) {
    for (let x = TOWN_X - 2; x <= TOWN_X + 2; x++) {
      if (inB(x, y) && tiles[y][x] === Tile.WATER && road.has(key(x, y))) {
        decor.push({ x, y, key: 'bridge-plank' });
      }
    }
  }

  // ---- Hearthwatch exterior: a small fortified keep with a gate back inside --
  const stampKeep = () => {
    const x0 = TOWN_X - 7, y0 = TOWN_Y - 5, x1 = TOWN_X + 7, y1 = TOWN_Y + 4;
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        occupied.add(key(x, y));
        const edge = x === x0 || x === x1 || y === y0 || y === y1;
        if (edge) decor.push({ x, y, key: 'house-wall' });
      }
    for (let x = x0; x <= x1; x++) decor.push({ x, y: y0, key: 'house-roof-teak' });
    decor.push({ x: x0, y: y0, key: 'town-gate' });
    decor.push({ x: x1, y: y0, key: 'town-gate' });
    decor.push({ x: TOWN_X - 4, y: y0, key: 'banner' });
    decor.push({ x: TOWN_X + 4, y: y0, key: 'banner' });
    // the gate back into town, on the south face
    decor.push({ x: TOWN_X, y: y1, key: 'house-door' });
    spawns.push({ kind: 'door', x: TOWN_X, y: y1 + 1, interiorId: 'town', label: 'Hearthwatch Gate' });
  };
  stampKeep();

  // party appears just south of the keep by default (overworldEntry overrides)
  spawns.push({ kind: 'playerStart', x: TOWN_X, y: TOWN_Y + 11 });

  // a road sign at the southern crossroads
  decor.push({ x: TOWN_X + 3, y: TOWN_Y + 12, key: 'signpost' });

  // ---- landmark POIs (decorative; no combat yet) ----
  decor.push({ x: 150, y: 116, key: 'obelisk' }); // sunken obelisk, deep desert
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1]] as number[][])
    decor.push({ x: 40 + dx * 3, y: 70 + dy * 3, key: 'standing-stone' }); // forest stone circle
  for (const [sx, sy] of [[120, 18], [126, 22], [123, 16]] as number[][])
    decor.push({ x: sx, y: sy, key: 'ruin-pillar' }); // ruined watch on a hill
  decor.push({ x: 30, y: 12, key: 'cave-entrance' });   // mountain mine
  decor.push({ x: 168, y: 30, key: 'cave-entrance' });  // foothill cave
  // enterable cave mini-dungeons (use the mouth to go in; a mouth door leads back)
  spawns.push({ kind: 'door', x: 30, y: 12, interiorId: 'cave_mine', label: 'Collapsed Silver Mine' });
  spawns.push({ kind: 'door', x: 168, y: 30, interiorId: 'cave_hollow', label: 'The Hollow Beneath' });
  decor.push({ x: 64, y: 110, key: 'ruin-pillar' });    // crossroads ruin
  for (const [x, y] of [[148, 70], [176, 96]] as number[][]) decor.push({ x, y, key: 'reeds' });

  // a handful of coins/foragables along the roads for a little reward loop
  for (const [x, y] of [[TOWN_X, 80], [40, TOWN_Y - 6], [150, 56], [TOWN_X, 16]] as number[][])
    pickups.push({ kind: 'coin', x, y, coin: 25 });

  // ---- scatter biome detail (deterministic so the map is stable) ----
  const free = (x: number, y: number): boolean =>
    inB(x, y) && !occupied.has(key(x, y)) && !road.has(key(x, y)) &&
    tiles[y][x] !== Tile.WATER && tiles[y][x] !== Tile.VOID;
  const place = (x: number, y: number, k: string) => {
    if (!free(x, y)) return;
    occupied.add(key(x, y));
    decor.push({ x, y, key: k });
  };
  // hash-based pseudo-random density per biome
  const DECOR_CAP = 2200; // keep the live sprite/Y-sort count sane on the big map
  for (let y = 2; y < H - 2 && decor.length < DECOR_CAP; y++) {
    for (let x = 2; x < W - 2; x++) {
      if (!free(x, y)) continue;
      const b = biomeAt(x, y);
      const h = (x * 73856093) ^ (y * 19349663);
      const hh = (h >>> 0) % 100;
      if (b === 'forest') {
        if (hh < 9) place(x, y, hh % 2 ? 'gnarled-oak' : 'pine');
        else if (hh < 12) place(x, y, 'wildflowers');
        else if (hh < 14) place(x, y, 'boulder');
      } else if (b === 'mountain') {
        if (hh < 6) place(x, y, 'boulder');
        else if (hh < 11) place(x, y, 'pine');
      } else if (b === 'desert') {
        if (hh < 4) place(x, y, 'desert-tree');
        else if (hh < 7) place(x, y, 'boulder');
      } else if (b === 'swamp') {
        if (hh < 7) place(x, y, 'swamp-cypress');
        else if (hh < 12) place(x, y, 'reeds');
      } else { // plains
        if (hh < 3) place(x, y, hh % 2 ? 'gnarled-oak' : 'pine');
        else if (hh < 6) place(x, y, 'wildflowers');
        else if (hh < 8) place(x, y, 'boulder');
      }
    }
  }

  return {
    id: 'overworld',
    name: 'The Wilds of Hearthwatch',
    width: W,
    height: H,
    tiles,
    spawns,
    pickups,
    decor,
    theme: 'town',
    ambientColor: 0x0e1a10,
    town: true,
    overworld: true,
    subtitle: 'The weary surface above the Undermaw.',
    chapter: 'The Overworld',
    story:
      'Beyond Hearthwatch’s walls the land stretches wide and uneasy — forest, foothill, desert and bog, all touched by the hunger below. Roads thread through the wilds; follow them, or wander and see what the surface still hides.',
  };
}

export const OVERWORLD = buildOverworld();
