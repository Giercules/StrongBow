import { Tile } from '../core/constants';
import type { LevelData, SpawnDef, PickupDef, DecorDef } from '../core/types';

const REALMS: { id: string; name: string }[] = [
  { id: 'sunken_crypt', name: 'Sunken Crypt' },
  { id: 'molten_deep', name: 'Molten Deep' },
  { id: 'frozen_cathedral', name: 'Frozen Cathedral' },
  { id: 'toxic_undercroft', name: 'Toxic Undercroft' },
  { id: 'clockwork_vault', name: 'Clockwork Vault' },
  { id: 'blood_arena', name: 'Blood Arena' },
  { id: 'drowned_bog', name: 'Drowned Bog' },
  { id: 'storm_spire', name: 'Storm Spire' },
  { id: 'shadow_warren', name: 'Shadow Warren' },
  { id: 'undermaw_sanctum', name: 'Sanctum of the Undermaw' },
];

// Hearthwatch is two districts divided by the river Hearthrun:
//   UPPER HEARTHWATCH (north) — the civic quarter: the five shops, the fountain
//   plaza with its hero statues, and the High Court where realms I–V open.
//   LOWER HEARTHWATCH (south) — the commons: the market square, cottages with
//   fenced gardens, a farmstead, a wayside shrine, and the Deep Court (VI–X).
// Three bridges cross the river; four gatehouses lead out to the Wilds.
export function buildTown(): LevelData {
  const W = 104;
  const H = 112;
  const tiles: number[][] = [];
  for (let y = 0; y < H; y++) tiles.push(new Array(W).fill(Tile.WALL));
  const decor: DecorDef[] = [];
  const spawns: SpawnDef[] = [];
  const pickups: PickupDef[] = [];

  const inB = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H;
  const setT = (x: number, y: number, t: number) => {
    if (inB(x, y)) tiles[y][x] = t;
  };
  const rect = (x0: number, y0: number, x1: number, y1: number, t: number) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) setT(x, y, t);
  };
  const roadSet = new Set<string>();
  const noFoliage = new Set<string>();
  const mark = (set: Set<string>, x: number, y: number) => set.add(`${x},${y}`);
  /** Place a free-standing prop and keep grass tufts / trees from spawning under
   *  it. Props are never placed on a building tile, so nothing lands on a roof
   *  even if a structure later grows to overlap the spot. */
  const deco = (x: number, y: number, key: string) => {
    if (inB(x, y) && tiles[y][x] === Tile.WALL) return;
    decor.push({ x, y, key });
    mark(noFoliage, x, y);
  };

  // ---- ground: moat ring, lawns, and the river Hearthrun ----
  rect(3, 3, W - 4, H - 4, Tile.WATER);
  rect(5, 5, W - 6, H - 6, Tile.FLOOR);

  const cx = Math.floor(W / 2); // 52
  const RIVER_Y0 = 52;
  const RIVER_Y1 = 55;
  rect(5, RIVER_Y0, W - 6, RIVER_Y1, Tile.WATER);

  // ---- overworld gatehouses (N + W serve Upper, S + E serve Lower) ----
  const WGATE_Y = 34;
  const EGATE_Y = 75;
  const plank = (x: number, y: number) => {
    decor.push({ x, y, key: 'bridge-plank' });
    mark(noFoliage, x, y);
    mark(roadSet, x, y);
  };
  for (const bx of [cx - 1, cx, cx + 1]) {
    setT(bx, 3, Tile.FLOOR); setT(bx, 4, Tile.FLOOR);
    setT(bx, H - 5, Tile.FLOOR); setT(bx, H - 4, Tile.FLOOR);
    rect(bx, 0, bx, 2, Tile.FLOOR);
    rect(bx, H - 3, bx, H - 1, Tile.FLOOR);
    plank(bx, 3); plank(bx, 4);
    plank(bx, H - 5); plank(bx, H - 4);
  }
  for (const by of [WGATE_Y - 1, WGATE_Y, WGATE_Y + 1]) {
    setT(3, by, Tile.FLOOR); setT(4, by, Tile.FLOOR);
    rect(0, by, 2, by, Tile.FLOOR);
    plank(3, by); plank(4, by);
  }
  for (const by of [EGATE_Y - 1, EGATE_Y, EGATE_Y + 1]) {
    setT(W - 5, by, Tile.FLOOR); setT(W - 4, by, Tile.FLOOR);
    rect(W - 3, by, W - 1, by, Tile.FLOOR);
    plank(W - 5, by); plank(W - 4, by);
  }
  deco(cx, 1, 'town-gate');
  deco(cx, H - 2, 'town-gate');
  deco(1, WGATE_Y, 'town-gate');
  deco(W - 2, EGATE_Y, 'town-gate');
  spawns.push({ kind: 'door', x: cx, y: 1, interiorId: 'overworld', dir: 'north', label: 'North Road' });
  spawns.push({ kind: 'door', x: cx, y: H - 2, interiorId: 'overworld', dir: 'south', label: 'South Road' });
  spawns.push({ kind: 'door', x: 1, y: WGATE_Y, interiorId: 'overworld', dir: 'west', label: 'West Road' });
  spawns.push({ kind: 'door', x: W - 2, y: EGATE_Y, interiorId: 'overworld', dir: 'east', label: 'East Road' });

  // ---- three river bridges (centre high street + west + east lanes) ----
  const riverBridge = (x0: number) => {
    for (let x = x0; x <= x0 + 2; x++) {
      for (let y = RIVER_Y0; y <= RIVER_Y1; y++) {
        setT(x, y, Tile.FLOOR);
        plank(x, y);
      }
    }
    decor.push({ x: x0 - 1, y: RIVER_Y0, key: 'chain' });
    decor.push({ x: x0 + 3, y: RIVER_Y0, key: 'chain' });
    decor.push({ x: x0 - 1, y: RIVER_Y1, key: 'chain' });
    decor.push({ x: x0 + 3, y: RIVER_Y1, key: 'chain' });
  };
  riverBridge(cx - 1); // high street bridge
  riverBridge(22); // west lane
  riverBridge(80); // east lane

  // ---- buildings ----
  // `roof` is a colour short-name: red | blue | green | teak | slate | thatch.
  // Three-course pitched roof (ridge/mid/eave) + half-timber walls. Prefer short
  // wall stacks so the roof is ~40% of the silhouette (not a tall beige tower).
  type HouseOpts = { signGlyph?: string; chimneyAt?: 'left' | 'right' };
  const house = (x0: number, y0: number, x1: number, y1: number, roof: string, opts?: HouseOpts | string) => {
    const o: HouseOpts = typeof opts === 'string' ? { signGlyph: opts } : (opts ?? {});
    rect(x0, y0, x1, y1, Tile.WALL);
    const doorX = Math.floor((x0 + x1) / 2);
    const w = x1 - x0 + 1;
    const wallTop = y0 + 3; // first wall row under the eave
    const wallBot = y1 - 1;
    const wallRows = Math.max(0, wallBot - wallTop + 1);
    // One window course for cottages, two for halls (even spacing, never on posts).
    const windowRows = new Set<number>();
    if (wallRows >= 4) {
      windowRows.add(wallTop + 1);
      if (wallRows >= 6) windowRows.add(wallTop + Math.floor(wallRows * 0.55));
    } else if (wallRows >= 2) {
      windowRows.add(wallTop + 1);
    }
    for (let x = x0; x <= x1; x++) {
      decor.push({ x, y: y0, key: `house-roof-${roof}` });
      decor.push({ x, y: y0 + 1, key: `house-mid-${roof}` });
      decor.push({ x, y: y0 + 2, key: `house-eave-${roof}` });
    }
    for (let y = y0 + 3; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const edge = x === x0 || x === x1;
        let key = 'house-wall';
        if (y === y1) key = 'house-base';
        else if (y === y0 + 3) key = 'house-beam';
        else if (edge) key = 'house-post';
        // Windows: skip door column and adjacent, keep a regular bay rhythm.
        else if (
          windowRows.has(y) &&
          Math.abs(x - doorX) > 1 &&
          (x - x0) % 2 === 1
        ) key = 'house-window';
        decor.push({ x, y, key });
      }
    }
    decor.push({ x: doorX, y: y1, key: 'house-door' });
    const chimX = o.chimneyAt === 'right' ? x1 - (w >= 8 ? 2 : 1) : x0 + (w >= 8 ? 2 : 1);
    decor.push({ x: chimX, y: y0, key: 'chimney' });
    // Sign hangs under the eave on the wall plate (beam row), not mid-roof.
    if (o.signGlyph) decor.push({ x: Math.min(x1 - 1, doorX + 2), y: y0 + 3, key: `shop-sign-${o.signGlyph}` });
    for (let y = y0 - 1; y <= y1 + 1; y++) for (let x = x0 - 1; x <= x1 + 1; x++) mark(noFoliage, x, y);
  };

  // ======================= UPPER HEARTHWATCH (civic) =======================
  // Merchant's Row — five trade houses share a 3-tile cobbled forecourt (y=19–21).
  // Buildings sit on a common front line so eaves and doors align.
  house(15, 10, 25, 18, 'slate', { signGlyph: 'anvil', chimneyAt: 'right' });
  spawns.push({ kind: 'door', x: 20, y: 18, interiorId: 'interior_forge', label: "Brunda's Forge" });
  house(32, 10, 42, 18, 'green', { signGlyph: 'vial' });
  spawns.push({ kind: 'door', x: 37, y: 18, interiorId: 'interior_apothecary', label: 'The Green Vial' });
  house(48, 9, 60, 18, 'red', { signGlyph: 'sword', chimneyAt: 'right' });
  spawns.push({ kind: 'door', x: 54, y: 18, interiorId: 'interior_guild', label: 'Fighters Guild' });
  house(65, 10, 76, 18, 'teak', { signGlyph: 'tankard' });
  spawns.push({ kind: 'door', x: 70, y: 18, interiorId: 'interior_tankard', label: 'The Gilded Tankard' });
  house(82, 10, 92, 18, 'blue', { signGlyph: 'coin', chimneyAt: 'right' });
  spawns.push({ kind: 'door', x: 87, y: 18, interiorId: 'interior_lodge', label: "Heroes' Lodge" });

  // Forge yard (west of row): fenced work-court off the forecourt.
  for (let fx = 14; fx <= 27; fx++) { if (fx < 19 || fx > 21) deco(fx, 24, 'fence-h'); }
  for (let fy = 19; fy <= 23; fy++) deco(13, fy, 'fence-v');
  deco(16, 22, 'anvil');
  deco(15, 20, 'wood-pile');
  deco(17, 23, 'crate');
  deco(14, 22, 'barrel');
  deco(26, 22, 'brazier');

  // Apothecary garden between forge and guild.
  deco(28, 22, 'flower-bed');
  deco(30, 23, 'flower-bed');
  deco(43, 22, 'flower-bed');
  deco(29, 24, 'town-bush');
  deco(44, 24, 'crop-row');

  // Guild training yard — racks and dummies stay inside the hedge.
  for (let hx = 47; hx <= 61; hx++) deco(hx, 22, 'hedge');
  deco(50, 23, 'training-dummy');
  deco(58, 23, 'training-dummy');
  deco(54, 24, 'weapon-rack');
  deco(48, 24, 'weapon-rack');
  deco(60, 24, 'weapon-rack');

  // Tankard service court: barrels stacked against the wall, not on the road.
  deco(64, 22, 'barrel');
  deco(77, 22, 'barrel');
  deco(66, 23, 'crate');
  deco(75, 23, 'barrel');
  deco(63, 24, 'brazier');
  deco(78, 24, 'hay-bale');

  // Lodge garden: flowers and a bench — rest & stash live inside the lodge now.
  deco(84, 22, 'flower-bed');
  deco(91, 22, 'flower-bed');
  deco(89, 24, 'town-bush');
  deco(85, 24, 'tavern-stool');
  deco(93, 22, 'tavern-stool');
  deco(90, 23, 'signpost');

  // Merchant's Row lamps at building gaps + a district sign west of the row.
  for (const bx of [14, 27, 44, 62, 78, 94]) deco(bx, 20, 'lamp-post');
  deco(12, 20, 'signpost');

  // Side cottages sit on the west/east avenues with doors facing the street.
  house(7, 24, 13, 30, 'blue');
  deco(8, 31, 'crop-row');
  deco(11, 31, 'crop-row');
  deco(6, 27, 'town-bush');
  deco(9, 32, 'flower-bed');
  house(93, 24, 98, 30, 'green');
  deco(94, 31, 'flower-bed');
  deco(97, 27, 'town-bush');
  deco(92, 32, 'town-bush');

  // ---- fountain plaza (civic heart, south of Merchant's Row) ----
  const fcx = cx;
  const fcy = 30;
  let poolSumX = 0;
  let poolSumY = 0;
  let poolN = 0;
  for (let dy = -4; dy <= 4; dy++)
    for (let dx = -5; dx <= 5; dx++) {
      if ((dx * dx) / 27 + (dy * dy) / 17 <= 1) {
        const px = fcx + dx;
        const py = fcy + dy;
        setT(px, py, Tile.WATER);
        mark(noFoliage, px, py);
        poolSumX += px;
        poolSumY += py;
        poolN++;
      }
    }
  const poolCx = Math.round(poolSumX / poolN);
  const poolCy = Math.round(poolSumY / poolN);
  // Four corner pillars frame the plaza (outside the pool, on pavement).
  for (const [px, py] of [
    [fcx - 7, fcy - 5],
    [fcx + 7, fcy - 5],
    [fcx - 7, fcy + 5],
    [fcx + 7, fcy + 5],
  ] as [number, number][]) {
    deco(px, py, 'pillar');
    decor.push({ x: px, y: py - 1, key: 'banner' });
  }
  decor.push({ x: poolCx, y: poolCy, key: 'fountain' });
  // Hero statues flank the north approach from Merchant's Row.
  deco(48, 24, 'statue');
  deco(56, 24, 'statue');
  // Low hedges define the plaza edge without blocking the high street.
  for (const hx of [44, 45, 46, 47, 58, 59, 60, 61]) {
    deco(hx, 25, 'hedge');
    deco(hx, 36, 'hedge');
  }
  for (const [lx, ly] of [[43, 25], [62, 25], [43, 36], [62, 36]] as [number, number][]) deco(lx, ly, 'lamp-post');
  deco(45, 27, 'flower-bed');
  deco(60, 27, 'flower-bed');
  deco(45, 34, 'flower-bed');
  deco(60, 34, 'flower-bed');
  // Benches sit on plaza pavement, not in the pool.
  deco(47, 32, 'tavern-stool');
  deco(57, 32, 'tavern-stool');
  deco(52, 37, 'quest-board');

  // ---- roads (after buildings so pavement never runs through them) ----
  // Street hierarchy:
  //   3-tile mains — high street + gate avenues + bridges (match gatehouses)
  //   2-tile secondaries — merchant forecourt, market spines, cottage lanes
  //   2-tile service — farm tracks, shrine spurs
  const roadTile = (x: number, y: number) => {
    if (!inB(x, y) || tiles[y][x] !== Tile.FLOOR) return;
    const k = `${x},${y}`;
    if (roadSet.has(k)) return;
    roadSet.add(k);
    decor.push({ x, y, key: 'road' });
    mark(noFoliage, x, y);
  };
  /** Axis-aligned line of given half-width (total width = 2*half + 1 when odd center). */
  const roadV = (xCenter: number, y0: number, y1: number, width: number) => {
    const half = Math.floor((width - 1) / 2);
    const x0 = xCenter - half;
    const x1 = xCenter - half + width - 1;
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++)
      for (let x = x0; x <= x1; x++) roadTile(x, y);
  };
  const roadH = (yCenter: number, x0: number, x1: number, width: number) => {
    const half = Math.floor((width - 1) / 2);
    const y0 = yCenter - half;
    const y1 = yCenter - half + width - 1;
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++)
      for (let y = y0; y <= y1; y++) roadTile(x, y);
  };
  const roadRect = (x0: number, y0: number, x1: number, y1: number) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) roadTile(x, y);
  };

  // High street: 3 tiles, centered on cx (matches north/south gates + bridges).
  roadV(cx, 5, H - 6, 3);
  // West avenue (Upper) and east avenue (Lower): 3 tiles, match gatehouses.
  roadH(WGATE_Y, 5, W - 6, 3);
  roadH(EGATE_Y, 5, W - 6, 3);
  // Merchant's Row forecourt: full 3-tile band in front of shop doors.
  roadH(20, 14, 94, 3);
  // Short 2-tile aprons from forecourt to each shop door.
  for (const sx of [20, 37, 54, 70, 87]) roadV(sx, 18, 20, 2);
  // Fountain plaza paving — continuous band around the pool, flush with high street.
  roadRect(43, 25, 62, 36);

  // ---- descent gate courts (I–V in Upper, VI–X in Lower) ----
  const GATE_XS = [24, 39, 54, 69, 84];
  const court = (y: number, first: number) => {
    // 3-tile deep court terrace the full width of the five gates.
    roadRect(GATE_XS[0] - 5, y - 3, GATE_XS[4] + 5, y + 2);
    for (let i = 0; i < 5; i++) {
      const x = GATE_XS[i];
      const r = REALMS[first + i];
      spawns.push({ kind: 'portal', realmId: r.id, label: r.name, x, y });
      // Brazier pair per gate, on the court edge (not on the portal tile).
      deco(x - 2, y + 1, 'brazier');
      deco(x + 2, y + 1, 'brazier');
      if (i > 0) decor.push({ x: (GATE_XS[i - 1] + x) >> 1, y: y - 2, key: 'banner' });
      mark(noFoliage, x, y);
    }
    // Approach spur from high street is already 3-wide via roadV.
    deco(GATE_XS[0] - 6, y, 'lamp-post');
    deco(GATE_XS[4] + 6, y, 'lamp-post');
    deco(GATE_XS[0] - 4, y + 2, 'statue');
    deco(GATE_XS[4] + 4, y + 2, 'statue');
  };
  court(44, 0); // High Court (realms I–V) — closer to plaza for a tight civic core
  court(97, 5); // Deep Court (realms VI–X)

  // ======================= LOWER HEARTHWATCH (commons) =====================
  spawns.push({ kind: 'playerStart', x: 54, y: 58 });

  // ---- market square (west commons): paved 3×3 module off the high street ----
  roadRect(16, 62, 38, 70);
  roadV(27, 60, 71, 2); // market spine (2-wide)
  roadH(61, 38, 53, 2); // spur from high street into the market (meets 3-wide N-S)
  deco(24, 60, 'quest-board');
  deco(19, 63, 'stall-red');
  deco(26, 63, 'stall-blue');
  deco(33, 63, 'stall-red');
  deco(18, 67, 'stall-blue');
  deco(27, 67, 'well');
  deco(35, 66, 'cart');
  deco(36, 69, 'crate');
  deco(37, 69, 'barrel');
  deco(16, 69, 'hay-bale');
  deco(20, 70, 'barrel');
  deco(40, 62, 'lamp-post');
  deco(15, 62, 'lamp-post');
  deco(17, 64, 'brazier');
  deco(34, 64, 'brazier');
  deco(22, 69, 'tavern-stool');
  deco(30, 69, 'tavern-stool');
  deco(14, 64, 'signpost');

  // ---- cottage lane (east commons): two homes, shared garden, 2-tile lane ----
  house(62, 58, 72, 64, 'thatch', { chimneyAt: 'right' });
  house(78, 58, 88, 64, 'teak');
  roadH(66, 60, 90, 2); // cottage lane (2-wide, flush doors at y=64)
  roadV(75, 64, 66, 2); // garden gate gap between the pair
  // Fence encloses the garden south of the lane only (not through the road).
  for (let fx = 62; fx <= 88; fx++) {
    if (fx >= 74 && fx <= 76) continue;
    deco(fx, 70, 'fence-h');
  }
  for (let fy = 67; fy <= 69; fy++) {
    deco(61, fy, 'fence-v');
    deco(89, fy, 'fence-v');
  }
  deco(64, 68, 'flower-bed');
  deco(68, 68, 'flower-bed');
  deco(82, 68, 'flower-bed');
  deco(86, 68, 'flower-bed');
  deco(66, 69, 'town-bush');
  deco(84, 69, 'town-bush');
  deco(75, 68, 'well');
  deco(72, 69, 'wood-pile');
  deco(78, 69, 'wood-pile');
  deco(62, 66, 'lamp-post');
  deco(88, 66, 'lamp-post');

  // ---- farmstead (south-west): barn + paddock, 2-tile track from east avenue ----
  house(14, 80, 24, 86, 'thatch', { chimneyAt: 'right' });
  roadV(19, EGATE_Y, 79, 2); // farm track (2-wide, matches avenue)
  roadH(79, 19, 28, 2); // apron in front of the barn
  // Paddock fence east of the barn with a centered gate.
  for (let fx = 28; fx <= 44; fx++) {
    if (fx !== 35 && fx !== 36) deco(fx, 80, 'fence-h');
    deco(fx, 88, 'fence-h');
  }
  for (let fy = 81; fy <= 87; fy++) {
    deco(27, fy, 'fence-v');
    deco(45, fy, 'fence-v');
  }
  for (const [hx, hy] of [[30, 83], [34, 85], [38, 82], [42, 85]] as [number, number][]) deco(hx, hy, 'hay-bale');
  for (const [cx2, cy2] of [[32, 82], [39, 84], [35, 86], [43, 83]] as [number, number][]) deco(cx2, cy2, 'crop-row');
  deco(40, 87, 'cart');
  deco(25, 82, 'wood-pile');
  deco(13, 80, 'signpost');
  deco(36, 81, 'well');

  // ---- south hamlet: three cottages on a 2-tile cobbled lane ----
  house(42, 79, 50, 84, 'red');
  house(57, 79, 65, 84, 'thatch', { chimneyAt: 'right' });
  house(90, 79, 97, 84, 'slate');
  roadH(86, 40, 98, 2); // hamlet lane (2-wide)
  // Connect high street down to the hamlet lane.
  roadV(cx, 84, 86, 3);
  for (const [gx, gy] of [[41, 81], [51, 81], [56, 81], [66, 81], [89, 81], [98, 81]] as [number, number][])
    deco(gx, gy, 'town-bush');
  deco(46, 85, 'flower-bed');
  deco(61, 85, 'flower-bed');
  deco(93, 85, 'flower-bed');
  deco(53, 82, 'well');
  deco(67, 83, 'wood-pile');
  deco(40, 85, 'barrel');
  deco(88, 85, 'cart');
  for (const lx of [45, 62, 94]) deco(lx, 87, 'lamp-post');

  // ---- wayside shrine (south-east): paved court off the hamlet lane ----
  roadRect(79, 82, 85, 86);
  roadV(82, 86, 90, 2);
  deco(79, 82, 'pillar');
  deco(85, 82, 'pillar');
  deco(79, 86, 'pillar');
  deco(85, 86, 'pillar');
  deco(82, 83, 'idol');
  decor.push({ x: 82, y: 81, key: 'banner' });
  decor.push({ x: 80, y: 81, key: 'banner' });
  deco(80, 85, 'flower-bed');
  deco(84, 85, 'flower-bed');
  deco(81, 84, 'candle');
  deco(83, 84, 'candle');
  deco(77, 84, 'lamp-post');
  deco(87, 84, 'lamp-post');
  deco(78, 87, 'altar');

  // ---- river Hearthrun: promenade, moorings, wetland edges ----
  roadH(RIVER_Y1 + 2, 40, 64, 2); // south-bank riverside walk (2-wide)
  const nearBridge = (x: number) => Math.abs(x - cx) <= 5 || Math.abs(x - 23) <= 4 || Math.abs(x - 81) <= 4;
  for (let x = 8; x <= W - 9; x += 5) {
    if (nearBridge(x)) continue;
    // Keep reeds on the river bank tiles, not on roads/promenade.
    if (!roadSet.has(`${x},${RIVER_Y0 - 1}`)) decor.push({ x, y: RIVER_Y0 - 1, key: (x % 10 === 0) ? 'cattail' : 'reeds' });
    if (!roadSet.has(`${x + 2},${RIVER_Y1 + 1}`)) decor.push({ x: x + 2, y: RIVER_Y1 + 1, key: (x % 10 === 0) ? 'reeds' : 'cattail' });
  }
  for (const [lx, ly] of [[32, 53], [42, 54], [60, 54], [68, 53], [90, 53], [12, 54]] as [number, number][])
    decor.push({ x: lx, y: ly, key: 'lilypad' });
  for (const [rx, ry] of [[15, 51], [37, 51], [64, 51], [88, 51], [28, 56], [72, 56], [95, 56]] as [number, number][])
    deco(rx, ry, 'shore-rock');
  for (const [dx, dy] of [[45, 53], [70, 54], [18, 54], [58, 54]] as [number, number][])
    decor.push({ x: dx, y: dy, key: 'duck' });
  for (const mx of [22, 48, 57, 81]) deco(mx, RIVER_Y0 - 1, 'mooring-post');
  for (const mx of [23, 52, 80]) deco(mx, RIVER_Y1 + 3, 'mooring-post');
  deco(48, 50, 'signpost');
  deco(56, 57, 'signpost');

  // ---- moat-side rushes (on the water edge only) ----
  for (let y = 8; y <= H - 9; y += 7) {
    decor.push({ x: 5, y, key: 'reeds' });
    decor.push({ x: W - 6, y: y + 3, key: 'reeds' });
  }

  // ---- lamp posts along the high street (offset to the road edge, not mid-lane) ----
  for (const [lx, ly] of [
    [50, 22], [55, 22],
    [50, 40], [55, 40],
    [50, 48], [55, 48],
    [50, 60], [55, 60],
    [50, 80], [55, 92],
    [50, 104],
  ] as [number, number][]) deco(lx, ly, 'lamp-post');

  // ---- foliage: perimeter orchard + restrained lawn plantings ----
  const foliageOk = (x: number, y: number) =>
    inB(x, y) && tiles[y][x] === Tile.FLOOR && !roadSet.has(`${x},${y}`) && !noFoliage.has(`${x},${y}`);
  const tree = (x: number, y: number) => { if (foliageOk(x, y)) decor.push({ x, y, key: 'town-tree' }); };
  const bush = (x: number, y: number) => { if (foliageOk(x, y)) decor.push({ x, y, key: 'town-bush' }); };
  // Perimeter belt just inside the moat.
  for (let x = 8; x <= W - 9; x += 7) {
    tree(x, 7);
    tree(x + 3, H - 8);
  }
  for (let y = 12; y <= H - 12; y += 8) {
    tree(7, y);
    tree(W - 8, y);
  }
  // Small orchards in open lawns (kept off streets and courts).
  for (const [tx, ty] of [
    [12, 38], [18, 40], [28, 38],
    [76, 38], [84, 40], [92, 38],
    [14, 48], [90, 48],
    [20, 72], [34, 74], [70, 72],
  ] as [number, number][]) tree(tx, ty);
  // Riverside willows — set back from the bridges and promenade.
  for (let x = 12; x <= W - 12; x += 11) {
    if (nearBridge(x)) continue;
    tree(x, RIVER_Y0 - 3);
    tree(x + 5, RIVER_Y1 + 4);
  }
  for (const [bx, by] of [
    [fcx - 10, fcy], [fcx + 10, fcy],
    [30, 28], [74, 28],
    [12, 48], [92, 48],
    [46, 60], [58, 72],
    [20, 88], [70, 90], [90, 92],
  ] as [number, number][]) bush(bx, by);

  // Sparse lawn tufts / wildflowers (lower density so props stay readable).
  for (let y = 6; y < H - 6; y++) {
    for (let x = 6; x < W - 6; x++) {
      if (!foliageOk(x, y)) continue;
      const h = (x * 13 + y * 29) % 29;
      if (h === 0) decor.push({ x, y, key: 'grass-tuft' });
      else if (h === 14) decor.push({ x, y, key: 'wildflowers' });
    }
  }

  // ---- townsfolk (spread across both districts, standing on open floor) ----
  const folk: [number, number, string, string, string?][] = [
    // Upper Hearthwatch
    [46, 32, 'Crier Bom', 'the booming town crier'],
    [58, 33, 'Pib', 'a wandering lute-player'],
    [40, 44, 'Garrick', 'an off-duty city watchman'],
    [70, 22, 'Sella', 'a chambermaid from the Tankard'],
    // Lower Hearthwatch
    [24, 65, 'Old Maren', 'a stooped flower-seller'],
    // Tomas gives the cross-town errand to Sunspire (his sister Amira).
    [31, 68, 'Tomas', 'a fretful merchant fearing for his sister in the desert', 'tomas'],
    [75, 67, 'Hesh', 'a hooded fortune-teller'],
    [82, 85, 'Sister Vael', 'a road-worn pilgrim of the light'],
    [30, 80, 'Farmer Wen', 'a sun-leathered farmhand'],
    [60, 97, 'Warden Ost', 'the keeper of the Deep Court gates'],
  ];
  folk.forEach(([x, y, label, role, npcId]) => spawns.push({ kind: 'npc', x, y, label, npcRole: role, npcId }));

  for (const [x, y] of [
    [50, 58],
    [58, 58],
    [52, 61],
    [56, 61],
  ] as [number, number][])
    pickups.push({ kind: 'coin', x, y, coin: 30 });

  return {
    id: 'town',
    name: 'Hearthwatch',
    width: W,
    height: H,
    tiles,
    spawns,
    pickups,
    decor,
    theme: 'town',
    ambientColor: 0x1a1610,
    town: true,
    subtitle: 'Hearthwatch — the last free town above the Undermaw.',
    chapter: 'Hearthwatch',
    story:
      'Welcome to Hearthwatch, the last free town above the Undermaw. Upper Hearthwatch holds the shops, the fountain plaza and the High Court gates (realms I–V); cross the river Hearthrun to Lower Hearthwatch for the market, the farmstead and the Deep Court (realms VI–X).',
  };
}

export const TOWN = buildTown();
