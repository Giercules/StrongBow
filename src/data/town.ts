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
  // A steep THREE-course pitched roof (ridge + mid slope + overhanging eave)
  // sits on top; below it a header beam, timber corner posts, glazed windows on
  // the middle courses, and a stone ground-floor base — so the house reads as a
  // tall, properly-roofed building instead of a flat wall with a thin hat. A
  // brick chimney rises from the ridge; an optional hanging trade sign marks a
  // shopfront.
  const house = (x0: number, y0: number, x1: number, y1: number, roof: string, signGlyph?: string) => {
    rect(x0, y0, x1, y1, Tile.WALL);
    const doorX = Math.floor((x0 + x1) / 2);
    const w = x1 - x0 + 1;
    // three-course steep roof
    for (let x = x0; x <= x1; x++) {
      decor.push({ x, y: y0, key: `house-roof-${roof}` });
      decor.push({ x, y: y0 + 1, key: `house-mid-${roof}` });
      decor.push({ x, y: y0 + 2, key: `house-eave-${roof}` });
    }
    // timber-framed walls under the eaves
    for (let y = y0 + 3; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const edge = x === x0 || x === x1;
        let key = 'house-wall';
        if (y === y1) key = 'house-base';
        else if (y === y0 + 3) key = 'house-beam';
        else if (edge) key = 'house-post';
        else if ((y === y0 + 5 || y === y0 + 7) && y < y1 && Math.abs(x - doorX) > 1 && (x - x0) % 2 === 1) key = 'house-window';
        decor.push({ x, y, key });
      }
    }
    decor.push({ x: doorX, y: y1, key: 'house-door' });
    // a stone chimney set to one side of the upper slope, breathing smoke
    decor.push({ x: x0 + (w >= 8 ? 2 : 1), y: y0 + 1, key: 'chimney' });
    // a hanging trade sign high on the storefront, clear of the door bay
    if (signGlyph) decor.push({ x: Math.min(x1 - 1, doorX + 2), y: y0 + 4, key: `shop-sign-${signGlyph}` });
    for (let y = y0 - 1; y <= y1 + 1; y++) for (let x = x0 - 1; x <= x1 + 1; x++) mark(noFoliage, x, y);
  };

  // ======================= UPPER HEARTHWATCH (civic) =======================
  // Brunda's Forge — a stout slate-roofed smithy with a working yard.
  house(16, 9, 26, 20, 'slate', 'anvil');
  spawns.push({ kind: 'door', x: 21, y: 20, interiorId: 'interior_forge', label: "Brunda's Forge" });
  deco(28, 21, 'anvil');
  deco(30, 23, 'crate');
  deco(31, 21, 'barrel');
  deco(29, 25, 'cart');

  // The Green Vial — apothecary under a mossy green roof, herb beds out front.
  house(33, 10, 43, 20, 'green', 'vial');
  spawns.push({ kind: 'door', x: 38, y: 20, interiorId: 'interior_apothecary', label: 'The Green Vial' });
  deco(32, 22, 'flower-bed');
  deco(44, 22, 'flower-bed');
  deco(31, 24, 'town-bush');
  deco(45, 24, 'town-bush');

  // The Fighters Guild — a grand red-tiled hall; training yard out front.
  house(48, 8, 60, 20, 'red', 'sword');
  decor.push({ x: 47, y: 16, key: 'weapon-rack' });
  decor.push({ x: 61, y: 16, key: 'weapon-rack' });
  spawns.push({ kind: 'door', x: 54, y: 20, interiorId: 'interior_guild', label: 'Fighters Guild' });
  deco(50, 23, 'training-dummy');
  deco(58, 23, 'training-dummy');
  deco(54, 24, 'weapon-rack');

  // The Gilded Tankard — timber tavern; ale barrels stacked by the door.
  house(64, 10, 76, 20, 'teak', 'tankard');
  spawns.push({ kind: 'door', x: 70, y: 20, interiorId: 'interior_tankard', label: 'The Gilded Tankard' });
  deco(63, 22, 'barrel');
  deco(77, 22, 'barrel');
  deco(65, 23, 'crate');
  deco(75, 23, 'barrel');

  // Your Lodge — blue-roofed home holding the shared stash.
  house(82, 9, 92, 20, 'blue', 'coin');
  spawns.push({ kind: 'merchant', shop: 'home', x: 87, y: 21, label: 'Your Lodge' });
  deco(90, 22, 'chest'); // the shared lodge stash
  deco(83, 23, 'flower-bed');
  deco(91, 23, 'flower-bed');
  deco(89, 24, 'town-bush');

  // lamp-posts + a couple of braziers light the shop forecourt
  for (const bx of [14, 30, 46, 62, 78, 94]) deco(bx, 22, 'lamp-post');
  for (const bx of [28, 44, 80]) deco(bx, 25, 'brazier');

  // lived-in cottages tucked into the civic quarter's side lawns
  house(7, 23, 13, 30, 'blue');
  deco(8, 32, 'crop-row');
  deco(11, 32, 'crop-row');
  deco(6, 26, 'town-bush');
  deco(9, 31, 'flower-bed');
  deco(14, 24, 'wood-pile');
  house(93, 23, 98, 30, 'green');
  deco(94, 32, 'flower-bed');
  deco(97, 26, 'town-bush');
  deco(92, 31, 'town-bush');

  // ---- fountain plaza ----
  const fcx = cx;
  const fcy = 33;
  for (let dy = -4; dy <= 4; dy++)
    for (let dx = -5; dx <= 5; dx++) {
      if ((dx * dx) / 27 + (dy * dy) / 17 <= 1) {
        setT(fcx + dx, fcy + dy, Tile.WATER);
        mark(noFoliage, fcx + dx, fcy + dy);
      }
    }
  for (const [px, py] of [
    [fcx - 6, fcy - 4],
    [fcx + 6, fcy - 4],
    [fcx - 6, fcy + 4],
    [fcx + 6, fcy + 4],
  ] as [number, number][])
    deco(px, py, 'pillar');
  decor.push({ x: fcx, y: fcy, key: 'fountain' });
  // hero statues flank the high street at the plaza's north entrance
  deco(49, 26, 'statue');
  deco(56, 26, 'statue');
  // trimmed hedges square the plaza off; lamp posts mark its corners
  for (const hx of [45, 46, 47, 48, 57, 58, 59, 60]) {
    deco(hx, 27, 'hedge');
    deco(hx, 39, 'hedge');
  }
  for (const [lx, ly] of [[43, 27], [62, 27], [43, 39], [62, 39]] as [number, number][]) deco(lx, ly, 'lamp-post');
  deco(46, 30, 'flower-bed');
  deco(59, 30, 'flower-bed');
  deco(46, 37, 'flower-bed');
  deco(59, 37, 'flower-bed');

  // ---- roads (after buildings so pavement never runs through them) ----
  const roadTile = (x: number, y: number) => {
    if (!inB(x, y) || tiles[y][x] !== Tile.FLOOR) return;
    const k = `${x},${y}`;
    if (roadSet.has(k)) return;
    roadSet.add(k);
    decor.push({ x, y, key: 'road' });
    mark(noFoliage, x, y);
  };
  // high street (N-S) and the two district avenues (E-W)
  for (let y = 5; y <= H - 6; y++) {
    roadTile(cx, y);
    roadTile(cx + 1, y);
  }
  for (let x = 5; x <= W - 6; x++) {
    roadTile(x, WGATE_Y - 1);
    roadTile(x, WGATE_Y);
    roadTile(x, EGATE_Y - 1);
    roadTile(x, EGATE_Y);
  }
  // plaza pavement around the fountain pool
  for (let y = 28; y <= 38; y++) for (let x = 44; x <= 61; x++) roadTile(x, y);

  // ---- descent gate courts (I–V in Upper, VI–X in Lower) ----
  const GATE_XS = [24, 39, 54, 69, 84];
  const court = (y: number, first: number) => {
    for (let i = 0; i < 5; i++) {
      const x = GATE_XS[i];
      const r = REALMS[first + i];
      // paved pad under each gate
      for (let py = y - 2; py <= y + 2; py++) for (let px = x - 3; px <= x + 3; px++) roadTile(px, py);
      spawns.push({ kind: 'portal', realmId: r.id, label: r.name, x, y });
      deco(x - 2, y - 1, 'brazier');
      deco(x + 2, y - 1, 'brazier');
      mark(noFoliage, x, y);
    }
    deco(GATE_XS[0] - 8, y, 'lamp-post');
    deco(GATE_XS[4] + 8, y, 'lamp-post');
  };
  court(45, 0); // the High Court (realms I–V)
  court(97, 5); // the Deep Court (realms VI–X)

  // ======================= LOWER HEARTHWATCH (commons) =====================
  spawns.push({ kind: 'playerStart', x: 54, y: 58 });

  // ---- market square (west of the high street) ----
  for (let y = 62; y <= 70; y++) for (let x = 16; x <= 38; x++) roadTile(x, y);
  // the notice board — contracts, payouts, reputation (one per district)
  deco(24, 59, 'quest-board');
  deco(40, 30, 'quest-board');
  deco(19, 61, 'stall-red');
  deco(26, 61, 'stall-blue');
  deco(33, 61, 'stall-red');
  deco(16, 66, 'stall-blue');
  deco(27, 66, 'well');
  deco(36, 64, 'cart');
  deco(37, 69, 'crate');
  deco(39, 69, 'barrel');
  deco(15, 70, 'hay-bale');
  deco(21, 71, 'barrel');
  deco(41, 62, 'lamp-post');
  deco(14, 62, 'lamp-post');

  // ---- cottages with fenced gardens (east of the high street) ----
  house(62, 57, 72, 65, 'thatch'); // thatched cottage
  house(78, 57, 88, 65, 'teak'); // timber-framed cottage
  // shared garden runs behind a rail fence; a gap at x=74..76 forms the gate
  for (let fx = 62; fx <= 88; fx++) {
    if (fx >= 74 && fx <= 76) continue;
    deco(fx, 71, 'fence-h');
  }
  for (let fy = 67; fy <= 70; fy++) {
    deco(61, fy, 'fence-v');
    deco(89, fy, 'fence-v');
  }
  deco(64, 68, 'flower-bed');
  deco(68, 69, 'flower-bed');
  deco(82, 68, 'flower-bed');
  deco(86, 69, 'flower-bed');
  deco(66, 67, 'town-bush');
  deco(70, 68, 'town-bush');
  deco(80, 68, 'town-bush');
  deco(84, 67, 'town-bush');
  deco(75, 69, 'well');
  deco(72, 69, 'wood-pile');
  deco(78, 69, 'wood-pile');

  // ---- farmstead (south-west): thatched barn + fenced field ----
  house(14, 79, 24, 87, 'thatch');
  for (let fx = 28; fx <= 44; fx++) {
    if (fx !== 36 && fx !== 37) deco(fx, 80, 'fence-h'); // gap = field gate
    deco(fx, 88, 'fence-h');
  }
  for (let fy = 81; fy <= 87; fy++) {
    deco(27, fy, 'fence-v');
    deco(45, fy, 'fence-v');
  }
  for (const [hx, hy] of [[30, 83], [34, 85], [38, 82], [42, 85], [31, 87]] as [number, number][]) deco(hx, hy, 'hay-bale');
  for (const [cx2, cy2] of [[32, 82], [39, 84], [35, 86], [43, 82]] as [number, number][]) deco(cx2, cy2, 'crop-row');
  deco(40, 87, 'cart');
  deco(26, 79, 'hay-bale');
  deco(25, 84, 'wood-pile');

  // ---- a south hamlet: cottages of varied build flanking the high street ----
  house(42, 78, 50, 85, 'red');
  house(57, 78, 65, 85, 'thatch');
  house(90, 78, 97, 85, 'slate');
  for (const [gx, gy] of [[41, 82], [51, 80], [56, 82], [66, 81], [89, 82], [98, 82]] as [number, number][]) deco(gx, gy, 'town-bush');
  deco(46, 87, 'flower-bed');
  deco(61, 87, 'flower-bed');
  deco(93, 87, 'flower-bed');
  deco(52, 82, 'well');
  deco(67, 84, 'wood-pile');
  deco(40, 86, 'barrel');
  deco(88, 86, 'cart');
  for (const lx of [45, 62, 94]) deco(lx, 88, 'lamp-post');

  // ---- wayside shrine (south-east): a paved circle with a glowing idol ----
  for (let py = 82; py <= 86; py++) for (let px = 79; px <= 85; px++) roadTile(px, py);
  deco(79, 82, 'pillar');
  deco(85, 82, 'pillar');
  deco(79, 86, 'pillar');
  deco(85, 86, 'pillar');
  deco(82, 83, 'idol');
  decor.push({ x: 82, y: 81, key: 'banner' });
  deco(80, 85, 'flower-bed');
  deco(84, 85, 'flower-bed');
  deco(77, 84, 'lamp-post');
  deco(87, 84, 'lamp-post');

  // ---- riverbanks: rushes, reeds, lilypads, mooring posts, ducks + a signpost -
  const nearBridge = (x: number) => Math.abs(x - cx) <= 4 || Math.abs(x - 23) <= 3 || Math.abs(x - 81) <= 3;
  for (let x = 8; x <= W - 9; x += 4) {
    if (nearBridge(x)) continue;
    decor.push({ x, y: RIVER_Y0 - 1, key: (x % 8 === 0) ? 'cattail' : 'reeds' }); // north bank
    decor.push({ x: x + 2, y: RIVER_Y1 + 1, key: (x % 8 === 0) ? 'reeds' : 'cattail' }); // south bank
  }
  for (const [lx, ly] of [[32, 53], [42, 54], [60, 54], [68, 53], [90, 53], [12, 54], [50, 53]] as [number, number][])
    decor.push({ x: lx, y: ly, key: 'lilypad' });
  for (const [rx, ry] of [[15, 51], [37, 51], [64, 51], [88, 51], [28, 56], [72, 56], [95, 56]] as [number, number][])
    deco(rx, ry, 'shore-rock');
  for (const [dx, dy] of [[45, 53], [70, 54], [18, 54]] as [number, number][])
    decor.push({ x: dx, y: dy, key: 'duck' });
  deco(48, 50, 'mooring-post');
  deco(57, 57, 'mooring-post');
  deco(49, 50, 'signpost');
  deco(56, 57, 'signpost');

  // ---- moat-side rushes so the town's water edges read as living wetland ----
  for (let y = 8; y <= H - 9; y += 6) {
    decor.push({ x: 5, y, key: 'reeds' });
    decor.push({ x: W - 6, y: y + 3, key: 'reeds' });
  }

  // ---- lamp posts along the high street ----
  for (const [lx, ly] of [[50, 24], [55, 24], [50, 48], [55, 48], [50, 60], [55, 60], [50, 80], [55, 92], [50, 104]] as [number, number][])
    deco(lx, ly, 'lamp-post');

  // ---- foliage ----
  const foliageOk = (x: number, y: number) =>
    inB(x, y) && tiles[y][x] === Tile.FLOOR && !roadSet.has(`${x},${y}`) && !noFoliage.has(`${x},${y}`);
  const tree = (x: number, y: number) => { if (foliageOk(x, y)) decor.push({ x, y, key: 'town-tree' }); };
  const bush = (x: number, y: number) => { if (foliageOk(x, y)) decor.push({ x, y, key: 'town-bush' }); };
  for (let x = 8; x <= W - 9; x += 6) {
    tree(x, 7);
    tree(x + 3, H - 8);
  }
  for (let y = 10; y <= H - 11; y += 7) {
    tree(7, y);
    tree(W - 8, y);
  }
  // orchard rows fill the Upper district's open lawns
  for (const [tx, ty] of [
    [12, 26], [16, 28], [20, 26], [24, 28], [12, 31], [20, 31],
    [28, 27], [32, 29], [36, 26], [16, 41], [24, 40], [32, 41],
    [72, 26], [76, 29], [80, 26], [84, 29], [88, 26], [92, 29],
    [68, 40], [76, 41], [84, 40], [92, 41],
  ] as [number, number][]) tree(tx, ty);
  // riverside willows on both banks
  for (let x = 11; x <= W - 11; x += 9) {
    tree(x, RIVER_Y0 - 3);
    tree(x + 4, RIVER_Y1 + 3);
  }
  for (const [bx, by] of [
    [fcx - 9, fcy], [fcx + 9, fcy],
    [30, 26], [74, 26], [14, 40], [90, 40],
    [12, 48], [92, 48], [46, 60], [58, 66],
    [20, 76], [50, 88], [70, 90], [90, 92],
    [34, 74], [66, 78],
  ] as [number, number][]) {
    bush(bx, by);
  }

  // scattered tufts + wildflowers across both districts' lawns
  for (let y = 6; y < H - 6; y++) {
    for (let x = 6; x < W - 6; x++) {
      if (!foliageOk(x, y)) continue;
      const h = (x * 13 + y * 29) % 23;
      if (h === 0) decor.push({ x, y, key: 'grass-tuft' });
      else if (h === 11) decor.push({ x, y, key: 'wildflowers' });
    }
  }

  // ---- townsfolk (spread across both districts) ----
  const folk: [number, number, string, string][] = [
    // Upper Hearthwatch
    [46, 33, 'Crier Bom', 'the booming town crier'],
    [58, 36, 'Pib', 'a wandering lute-player'],
    [40, 45, 'Garrick', 'an off-duty city watchman'],
    [70, 24, 'Sella', 'a chambermaid from the Tankard'],
    // Lower Hearthwatch
    [24, 64, 'Old Maren', 'a stooped flower-seller'],
    [31, 68, 'Tomas', 'a nervous merchant down on his luck'],
    [75, 67, 'Hesh', 'a hooded fortune-teller'],
    [82, 86, 'Sister Vael', 'a road-worn pilgrim of the light'],
    [30, 79, 'Farmer Wen', 'a sun-leathered farmhand'],
    [60, 97, 'Warden Ost', 'the keeper of the Deep Court gates'],
  ];
  folk.forEach(([x, y, label, role]) => spawns.push({ kind: 'npc', x, y, label, npcRole: role }));

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
