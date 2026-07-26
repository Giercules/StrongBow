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

// ----------------------------------------------------------------------------
// The Wanderer's Gate — the warded river bridge. The great river splits the
// eastern homelands (Hearthwatch) from the western wilds (Sunspire, the deep
// forest). Its one bridge is held by Yara, a veiled nomad who lifts the ward
// only for her lost family heirloom — recovered from a chest in the Molten Deep
// (level 2 of the Undermaw). This ties the second dungeon descent to overworld
// progression. `tiles` is filled in during buildOverworld(); DungeonScene reads
// this record to block the bridge, place the barrier art, and run the quest.
// ----------------------------------------------------------------------------
export const NOMAD_GATE = {
  /** Persistent world-flag id (QuestLog.flags): true once the bridge is opened. */
  flag: 'nomad_river_gate_open',
  npcId: 'wanderer',
  npcName: 'Yara the Wanderer',
  npcRole: 'a veiled nomad who keeps the river bridge',
  itemId: 'lost_heirloom',
  /** Ward tiles that block the bridge until the heirloom is handed over. */
  tiles: [] as { x: number; y: number }[],
  gold: 120,
  xp: 160,
  rep: 6,
  hintLine:
    'Turn back, traveler — this bridge is mine to keep, and the west road with it. I lift the ward for one thing only: my family’s heirloom, a silver locket lost when the ground tore open and swallowed the old road. It fell into the Molten Deep — the second wound of the Undermaw. Bring it to me, and the way west is yours.',
  waitingHint:
    'Still no locket? Seek it in the Molten Deep, the second descent below Hearthwatch. Until it is in my hands, the ward holds.',
  giveLine:
    'That locket — you carry it! After all these years… give it here. Bless you, stranger. The ward is lifted; the west road is open to you now, and my thanks ride with you.',
  openedLine:
    'The bridge is open to you, friend. Go careful on the west road — it is kinder than it was, but not kind.',
  giveLabel: 'HAND OVER THE HEIRLOOM',
};

export type Biome = 'plains' | 'forest' | 'mountain' | 'desert' | 'swamp';

/** Which biome a given overworld tile sits in (used by the encounter system to
 *  theme battles and weight danger). */
export function biomeAt(x: number, y: number): Biome {
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

  // ---- the Hearthrun: one great river running the WHOLE height of the map,
  // north frame to south frame, dividing the eastern homelands (Hearthwatch)
  // from the western wilds (Sunspire, the deep forest). Solid water everywhere
  // (see waterSolid() in DungeonScene) — the only crossing is the warded bridge.
  const RIVER_X = 62;
  const BRIDGE_Y = TOWN_Y; // the caravan road fords here
  // A gentle meander, pinned dead-straight through the bridge band so the gate
  // reads as a clean line and can never be slipped past.
  const riverCenter = (yy: number): number =>
    yy >= BRIDGE_Y - 4 && yy <= BRIDGE_Y + 4
      ? RIVER_X
      : RIVER_X + Math.round(2 * Math.sin(yy * 0.09) + 1.5 * Math.sin(yy * 0.031));
  // Fill rows 1..H-2 so the water butts against the impassable VOID frame at the
  // very top and bottom — no walking around the ends.
  for (let y = 1; y < H - 1; y++) {
    const c = riverCenter(y);
    for (let w = -1; w <= 1; w++) setT(c + w, y, Tile.WATER);
  }
  // a few swamp tarns in the far east (now solid pools to skirt around)
  for (const [cx, cy, rxr, ryr] of [[158, 62, 7, 5], [172, 90, 6, 6], [150, 104, 8, 5]] as number[][]) {
    for (let dy = -ryr; dy <= ryr; dy++)
      for (let dx = -rxr; dx <= rxr; dx++)
        if ((dx * dx) / (rxr * rxr) + (dy * dy) / (ryr * ryr) <= 1) setT(cx + dx, cy + dy, Tile.WATER);
  }

  // ---- roads: consistent width, orthogonal segments first (professional arteries) ----
  const stampRoad = (tx: number, ty: number) => {
    if (!inB(tx, ty) || tiles[ty][tx] === Tile.WATER || tiles[ty][tx] === Tile.VOID) return;
    const k = key(tx, ty);
    if (road.has(k)) return;
    road.add(k);
    decor.push({ x: tx, y: ty, key: 'road' });
  };
  /** Axis-aligned L-path (horizontal then vertical) at a fixed width. */
  const carveRoad = (x0: number, y0: number, x1: number, y1: number, width = 3) => {
    const half = Math.floor((width - 1) / 2);
    // east/west leg first for cleaner junctions at town
    const xStep = x0 <= x1 ? 1 : -1;
    for (let x = x0; x !== x1 + xStep; x += xStep) {
      for (let w = -half; w <= half; w++) stampRoad(x, y0 + w);
    }
    const yStep = y0 <= y1 ? 1 : -1;
    for (let y = y0; y !== y1 + yStep; y += yStep) {
      for (let w = -half; w <= half; w++) stampRoad(x1 + w, y);
    }
  };
  // Eastern homelands arteries (nothing fords the river except the caravan bridge).
  carveRoad(TOWN_X, TOWN_Y, TOWN_X, 6, 3);           // north road
  carveRoad(TOWN_X, TOWN_Y, TOWN_X, H - 8, 3);       // south road
  carveRoad(TOWN_X, TOWN_Y, W - 10, TOWN_Y + 6, 3);  // east road

  // ---- towns seen from the air: little walled clusters of rooftops the party
  // walks straight up to and enters through the gate (not a lone grey keep). ----
  const stampVillage = (
    tcx: number,
    tcy: number,
    o: { roofs: string[]; hall: string; wall: string; gate: string; doorId: string; label: string; gateSide: 'north' | 'south'; surround?: string; comingSoon?: boolean },
  ) => {
    const rx = 6, ry = 4;
    const x0 = tcx - rx, x1 = tcx + rx, y0 = tcy - ry, y1 = tcy + ry;
    for (let y = y0 - 1; y <= y1 + 1; y++) for (let x = x0 - 1; x <= x1 + 1; x++) occupied.add(key(x, y));
    const gateY = o.gateSide === 'north' ? y0 : y1;
    const doorY = o.gateSide === 'north' ? y0 - 1 : y1 + 1;
    // curtain wall, with a gap for the gate on the entry side
    for (let x = x0; x <= x1; x++) {
      if (!(o.gateSide === 'north' && Math.abs(x - tcx) <= 1)) decor.push({ x, y: y0, key: o.wall });
      if (!(o.gateSide === 'south' && Math.abs(x - tcx) <= 1)) decor.push({ x, y: y1, key: o.wall });
    }
    for (let y = y0 + 1; y < y1; y++) { decor.push({ x: x0, y, key: o.wall }); decor.push({ x: x1, y, key: o.wall }); }
    // rooftops packed on a coarse grid, leaving alleys and a central landmark
    let i = 0;
    for (let y = y0 + 2; y <= y1 - 1; y += 2)
      for (let x = x0 + 2; x <= x1 - 1; x += 2) {
        if (Math.abs(x - tcx) <= 1 && Math.abs(y - tcy) <= 1) continue;
        decor.push({ x, y, key: o.roofs[i % o.roofs.length] });
        i++;
      }
    decor.push({ x: tcx, y: tcy, key: o.hall });        // central hall / temple
    decor.push({ x: tcx, y: gateY, key: o.gate });      // the gatehouse
    decor.push({ x: tcx, y: doorY, key: 'house-door' }); // the enterable gate
    spawns.push({ kind: 'door', x: tcx, y: doorY, interiorId: o.doorId, label: o.label, comingSoon: o.comingSoon });
    if (o.surround)
      for (const [dx, dy] of [[-rx - 1, -1], [rx + 1, -1], [-rx - 1, ry], [rx + 1, ry], [-2, -ry - 1], [3, -ry - 1]] as [number, number][]) {
        const px = tcx + dx, py = tcy + dy;
        if (inB(px, py) && tiles[py][px] !== Tile.WATER && tiles[py][px] !== Tile.VOID) { decor.push({ x: px, y: py, key: o.surround }); occupied.add(key(px, py)); }
      }
  };

  // Hearthwatch — green-roofed market town, central plains.
  stampVillage(TOWN_X, TOWN_Y, {
    roofs: ['aerial-cottage-red', 'aerial-cottage-blue', 'aerial-cottage-teak', 'aerial-cottage-green'],
    hall: 'aerial-hall', wall: 'aerial-wall', gate: 'aerial-gate',
    doorId: 'town', label: 'Hearthwatch Gate', gateSide: 'south', surround: 'gnarled-oak',
  });
  // Clear approach plaza south of the gate (road + empty lawn).
  for (let y = TOWN_Y + 5; y <= TOWN_Y + 9; y++)
    for (let x = TOWN_X - 2; x <= TOWN_X + 2; x++) stampRoad(x, y);
  decor.push({ x: TOWN_X - 4, y: TOWN_Y - 4, key: 'banner' });
  decor.push({ x: TOWN_X + 4, y: TOWN_Y - 4, key: 'banner' });

  // Sunspire — sandstone oasis, far south-west desert.
  const SUN_X = 26, SUN_Y = 108;
  stampVillage(SUN_X, SUN_Y, {
    roofs: ['aerial-adobe-a', 'aerial-adobe-b', 'aerial-adobe-a', 'aerial-adobe-b'],
    hall: 'aerial-temple', wall: 'aerial-sandwall', gate: 'aerial-sandgate',
    doorId: 'desert_town', label: 'Sunspire — the Dune Gate', gateSide: 'north', surround: 'desert-tree',
  });
  for (let y = SUN_Y - 8; y <= SUN_Y - 5; y++)
    for (let x = SUN_X - 2; x <= SUN_X + 2; x++) stampRoad(x, y);

  // Frontier settlements (coming soon) — spaced one per biome, not clustered.
  stampVillage(120, 12, {
    roofs: ['aerial-cottage-teak', 'aerial-cottage-red', 'aerial-cottage-blue', 'aerial-cottage-teak'],
    hall: 'aerial-hall', wall: 'aerial-wall', gate: 'aerial-gate',
    doorId: 'comingsoon', label: 'Ravenfell — the Crag-Hold (coming soon)', gateSide: 'south', surround: 'pine', comingSoon: true,
  });
  stampVillage(18, 28, {
    roofs: ['aerial-cottage-blue', 'aerial-cottage-green', 'aerial-cottage-blue', 'aerial-cottage-teak'],
    hall: 'aerial-hall', wall: 'aerial-wall', gate: 'aerial-gate',
    doorId: 'comingsoon', label: 'Frostmere — the Pale Vigil (coming soon)', gateSide: 'south', surround: 'pine', comingSoon: true,
  });
  stampVillage(20, 72, {
    roofs: ['aerial-cottage-green', 'aerial-cottage-teak', 'aerial-cottage-green', 'aerial-cottage-red'],
    hall: 'aerial-hall', wall: 'aerial-wall', gate: 'aerial-gate',
    doorId: 'comingsoon', label: 'Thornhollow — the Deepwood Refuge (coming soon)', gateSide: 'north', surround: 'gnarled-oak', comingSoon: true,
  });
  stampVillage(170, 78, {
    roofs: ['aerial-cottage-teak', 'aerial-cottage-green', 'aerial-cottage-teak', 'aerial-cottage-blue'],
    hall: 'aerial-hall', wall: 'aerial-wall', gate: 'aerial-gate',
    doorId: 'comingsoon', label: 'Mirefen Hold — the Bog-Wardens (coming soon)', gateSide: 'north', surround: 'swamp-cypress', comingSoon: true,
  });
  stampVillage(130, 114, {
    roofs: ['aerial-adobe-a', 'aerial-adobe-b', 'aerial-adobe-a', 'aerial-adobe-b'],
    hall: 'aerial-temple', wall: 'aerial-sandwall', gate: 'aerial-sandgate',
    doorId: 'comingsoon', label: 'Duskmoor — the Ember Bazaar (coming soon)', gateSide: 'north', surround: 'desert-tree', comingSoon: true,
  });

  // Default spawn just south of Hearthwatch (overworldEntry overrides).
  spawns.push({ kind: 'playerStart', x: TOWN_X, y: TOWN_Y + 11 });

  // Caravan road: west to the ford, then south to Sunspire (only river crossing).
  carveRoad(TOWN_X, TOWN_Y, SUN_X, TOWN_Y, 3);
  carveRoad(SUN_X, TOWN_Y, SUN_X, SUN_Y - 6, 3);

  // ---- the warded river bridge + the Wanderer's gate ----
  // Plank every water tile the caravan road fords (rows BRIDGE_Y-1..+1), turning
  // the ford into solid, walkable bridge. carveRoad has already laid road up to
  // both banks; the planks fill the water gap between them.
  const bridgeRows = [BRIDGE_Y - 1, BRIDGE_Y, BRIDGE_Y + 1];
  for (const by of bridgeRows) {
    for (let x = RIVER_X - 3; x <= RIVER_X + 3; x++) {
      if (inB(x, by) && tiles[by][x] === Tile.WATER) {
        setT(x, by, Tile.FLOOR);
        decor.push({ x, y: by, key: 'bridge-plank' });
        road.add(key(x, by));
      }
    }
  }
  // bridge-rail chains along the north/south flanks
  for (const by of [BRIDGE_Y - 2, BRIDGE_Y + 2])
    for (let x = RIVER_X - 1; x <= RIVER_X + 1; x++) decor.push({ x, y: by, key: 'chain' });
  // the ward: the easternmost planked column of each bridge row. Blocked until
  // the heirloom is delivered (enforced at runtime in DungeonScene via NOMAD_GATE).
  const GATE_X = RIVER_X + 1;
  NOMAD_GATE.tiles = bridgeRows.map((by) => ({ x: GATE_X, y: by }));
  // Yara keeps the bridge from the eastern bank, a step short of her ward.
  spawns.push({ kind: 'npc', x: GATE_X + 2, y: BRIDGE_Y, label: NOMAD_GATE.npcName, npcRole: NOMAD_GATE.npcRole, npcId: NOMAD_GATE.npcId });

  // Road signs at junctions (off the carriageway so they don't block the path).
  decor.push({ x: TOWN_X + 4, y: TOWN_Y + 10, key: 'signpost' });
  decor.push({ x: GATE_X + 4, y: BRIDGE_Y - 3, key: 'signpost' });
  decor.push({ x: SUN_X + 4, y: SUN_Y - 7, key: 'signpost' });
  decor.push({ x: TOWN_X + 3, y: 20, key: 'signpost' });

  // ---- landmark POIs — one signature site per biome, set back from roads ----
  decor.push({ x: 152, y: 112, key: 'obelisk' }); // desert
  // forest stone circle (compact)
  for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2], [-2, -2], [2, 2]] as number[][]) {
    decor.push({ x: 38 + dx, y: 68 + dy, key: 'standing-stone' });
    occupied.add(key(38 + dx, 68 + dy));
  }
  // mountain ruin
  for (const [sx, sy] of [[118, 16], [122, 18], [120, 14]] as number[][]) {
    decor.push({ x: sx, y: sy, key: 'ruin-pillar' });
    occupied.add(key(sx, sy));
  }
  // enterable caves on short spurs off the main network
  decor.push({ x: 32, y: 14, key: 'cave-entrance' });
  decor.push({ x: 164, y: 28, key: 'cave-entrance' });
  carveRoad(TOWN_X, 14, 32, 14, 2);
  carveRoad(TOWN_X + 20, TOWN_Y - 10, 164, 28, 2);
  spawns.push({ kind: 'door', x: 32, y: 14, interiorId: 'cave_mine', label: 'Collapsed Silver Mine' });
  spawns.push({ kind: 'door', x: 164, y: 28, interiorId: 'cave_hollow', label: 'The Hollow Beneath' });
  // swamp reed banks already read from scatter; one ruin marker near Mirefen approach
  decor.push({ x: 160, y: 70, key: 'ruin-pillar' });

  // Light coin trail along the main caravan road (reward for following the path).
  for (const [x, y] of [
    [TOWN_X, 72], [TOWN_X, 28], [80, TOWN_Y], [50, TOWN_Y], [SUN_X, 80], [140, TOWN_Y + 6],
  ] as number[][]) pickups.push({ kind: 'coin', x, y, coin: 20 });

  // ---- scatter biome detail (deterministic; keep roads & landmarks clear) ----
  const free = (x: number, y: number): boolean =>
    inB(x, y) && !occupied.has(key(x, y)) && !road.has(key(x, y)) &&
    tiles[y][x] !== Tile.WATER && tiles[y][x] !== Tile.VOID;
  const place = (x: number, y: number, k: string) => {
    if (!free(x, y)) return;
    occupied.add(key(x, y));
    decor.push({ x, y, key: k });
  };
  // Near-road buffer: leave a 1-tile shoulder free of trees so arteries read clean.
  const nearRoad = (x: number, y: number): boolean => {
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++)
        if (road.has(key(x + dx, y + dy))) return true;
    return false;
  };
  const DECOR_CAP = 1600;
  for (let y = 2; y < H - 2 && decor.length < DECOR_CAP; y++) {
    for (let x = 2; x < W - 2; x++) {
      if (!free(x, y) || nearRoad(x, y)) continue;
      const b = biomeAt(x, y);
      const h = (x * 73856093) ^ (y * 19349663);
      const hh = (h >>> 0) % 100;
      // Density tuned per biome: forests denser, plains airier, desert sparse.
      if (b === 'forest') {
        if (hh < 11) place(x, y, hh % 3 === 0 ? 'pine' : 'gnarled-oak');
        else if (hh < 14) place(x, y, 'wildflowers');
        else if (hh < 15) place(x, y, 'boulder');
      } else if (b === 'mountain') {
        if (hh < 7) place(x, y, 'boulder');
        else if (hh < 10) place(x, y, 'pine');
      } else if (b === 'desert') {
        if (hh < 3) place(x, y, 'desert-tree');
        else if (hh < 5) place(x, y, 'boulder');
      } else if (b === 'swamp') {
        if (hh < 8) place(x, y, 'swamp-cypress');
        else if (hh < 12) place(x, y, 'reeds');
      } else { // plains — open country, light scatter
        if (hh < 2) place(x, y, 'gnarled-oak');
        else if (hh < 5) place(x, y, 'wildflowers');
        else if (hh < 6) place(x, y, 'boulder');
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
    music: 'wilds',
    ambientColor: 0x0e1a10,
    town: true,
    overworld: true,
    subtitle: 'Roads, biomes, and the warded west — above the Undermaw.',
    chapter: 'The Overworld',
    story:
      'Beyond Hearthwatch the land opens in five temperaments: plains, forest, mountain, desert, and bog. Follow the caravan roads; the great river cuts the map in two, and only Yara’s bridge grants the west. Caves, ruins, and distant holds wait on the horizon.',
  };
}

export const OVERWORLD = buildOverworld();
