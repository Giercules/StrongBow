import { Tile } from '../core/constants';
import type { LevelData, SpawnDef, PickupDef, DecorDef } from '../core/types';

// ----------------------------------------------------------------------------
// Sunspire — the sandstone oasis-town of the deep desert, the last waystation of
// the southern caravan roads far to the south-west of Hearthwatch. Where
// Hearthwatch is a green riverside civic town of pitched roofs and cobbles,
// Sunspire is sun-baked adobe on packed sand: a walled town of flat mudbrick
// roofs and domes, built around a stepped Sun Temple whose gilded disc — the
// Sunspire itself — can be seen for miles across the dunes.
//
// Six districts, entered through the south Dune Gate:
//   THE DUNE GATE (south)     — the caravan gate onto the deep desert.
//   THE GRAND BAZAAR (mid)    — a covered souk of striped awnings and spice;
//                               all of Sunspire's trade happens open-air here.
//   THE OASIS (west-centre)   — a palm-ringed reservoir and the great cistern.
//   THE SUN TEMPLE (north)    — a stepped ziggurat crowned by the gilded disc.
//   THE CARAVANSERAI (east)   — Bedouin tents and camel lines; Amira's yard.
//   THE ADOBE QUARTER (west)  — flat-roofed homes, palm gardens and clay ovens.
// ----------------------------------------------------------------------------

export function buildDesertTown(): LevelData {
  const W = 100;
  const H = 92;
  const tiles: number[][] = [];
  for (let y = 0; y < H; y++) tiles.push(new Array(W).fill(Tile.WALL));
  const decor: DecorDef[] = [];
  const spawns: SpawnDef[] = [];
  const pickups: PickupDef[] = [];

  const inB = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H;
  const setT = (x: number, y: number, t: number) => { if (inB(x, y)) tiles[y][x] = t; };
  const rect = (x0: number, y0: number, x1: number, y1: number, t: number) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) setT(x, y, t);
  };
  const roadSet = new Set<string>();
  const noFoliage = new Set<string>();
  const mark = (set: Set<string>, x: number, y: number) => set.add(`${x},${y}`);
  /** Free-standing prop; never lands on a building tile (nothing on a roof). */
  const deco = (x: number, y: number, key: string) => {
    if (inB(x, y) && tiles[y][x] === Tile.WALL) return;
    decor.push({ x, y, key });
    mark(noFoliage, x, y);
  };
  const cx = Math.floor(W / 2); // 50

  // ---- ground: packed sand within a mudbrick curtain wall ----
  rect(3, 3, W - 4, H - 4, Tile.SAND);

  // ======================= THE SUN TEMPLE (north) =========================
  // A three-tier sandstone ziggurat backed against the north wall, crowned by
  // the gilded Sunspire. Solid (WALL footprint) and clad in temple-step tiles.
  const templeTier = (x0: number, x1: number, y0: number, y1: number) => {
    rect(x0, y0, x1, y1, Tile.WALL);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) decor.push({ x, y, key: 'temple-step' });
    for (let y = y0 - 1; y <= y1 + 1; y++) for (let x = x0 - 1; x <= x1 + 1; x++) mark(noFoliage, x, y);
  };
  templeTier(38, 62, 6, 12); // broad base tier
  templeTier(42, 58, 8, 11); // mid tier
  templeTier(46, 54, 8, 10); // upper tier
  decor.push({ x: cx, y: 6, key: 'sun-spire' }); // the gilded disc at the apex
  // ceremonial forecourt paving + flanking guardians
  for (let y = 13; y <= 18; y++) for (let x = 42; x <= 58; x++) { setT(x, y, Tile.SAND); }
  for (let y = 13; y <= 18; y++) for (let x = 44; x <= 56; x++) { decor.push({ x, y, key: 'desert-road' }); mark(roadSet, x, y); mark(noFoliage, x, y); }
  deco(45, 14, 'sphinx');
  deco(55, 14, 'sphinx');
  deco(cx, 15, 'sun-idol');
  deco(43, 17, 'fire-bowl');
  deco(57, 17, 'fire-bowl');
  deco(41, 13, 'sun-banner');
  deco(59, 13, 'sun-banner');
  deco(48, 18, 'sundial');
  deco(52, 18, 'sundial');
  // the Sun-priest keeps the temple steps
  spawns.push({ kind: 'npc', x: cx, y: 17, label: 'Hierophant Qamar', npcRole: 'the sun-priest of the gilded disc', npcId: 'qamar' });

  // ======================= THE OASIS (west-centre) ========================
  // A palm-ringed reservoir fed by the deep cistern; a stone causeway crosses it.
  const oasis = (ocx: number, ocy: number) => {
    for (let dy = -5; dy <= 5; dy++) for (let dx = -7; dx <= 7; dx++) {
      if ((dx * dx) / 52 + (dy * dy) / 28 <= 1) { setT(ocx + dx, ocy + dy, Tile.WATER); mark(noFoliage, ocx + dx, ocy + dy); }
    }
    // stone causeway (walkable SAND) straight across
    for (let dx = -8; dx <= 8; dx++) { setT(ocx + dx, ocy, Tile.SAND); decor.push({ x: ocx + dx, y: ocy, key: 'desert-road' }); mark(roadSet, ocx + dx, ocy); mark(noFoliage, ocx + dx, ocy); }
    // palm ring + reeds on the banks
    for (const [px, py] of [[-8, -4], [-4, -6], [3, -6], [8, -4], [-8, 4], [-3, 6], [4, 6], [8, 4]] as [number, number][]) deco(ocx + px, ocy + py, 'palm');
    for (const [px, py] of [[-6, -5], [1, -6], [6, -5], [-6, 5], [2, 6], [7, 4]] as [number, number][]) deco(ocx + px, ocy + py, 'papyrus');
    deco(ocx, ocy - 3, 'cistern');
    for (const [px, py] of [[-9, 0], [9, 0]] as [number, number][]) deco(ocx + px, ocy + py, 'palm-small');
  };
  oasis(26, 44);
  // a water-carrier draws from the cistern — stand her ON the walkable causeway
  // (the pool itself is solid water, so a bank tile would be unreachable)
  spawns.push({ kind: 'npc', x: 33, y: 44, label: 'Old Nurah', npcRole: 'a water-carrier resting her jars', npcId: 'nurah' });

  // ======================= THE ADOBE QUARTER (west) =======================
  // Flat-roofed homes with palm gardens, clay ovens and cacti.
  const adobe = (x0: number, y0: number, x1: number, y1: number, opts: { dome?: boolean; windows?: boolean } = {}) => {
    rect(x0, y0, x1, y1, Tile.WALL);
    const doorX = Math.floor((x0 + x1) / 2);
    for (let x = x0; x <= x1; x++) { decor.push({ x, y: y0, key: 'adobe-roof' }); decor.push({ x, y: y0 + 1, key: 'adobe-eave' }); }
    for (let y = y0 + 2; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const edge = x === x0 || x === x1;
      let key = 'adobe-wall';
      if (y === y1) key = 'adobe-base';
      else if (edge) key = 'adobe-post';
      else if (opts.windows !== false && y === y0 + 3 && Math.abs(x - doorX) > 1 && (x - x0) % 2 === 1) key = 'adobe-window';
      decor.push({ x, y, key });
    }
    decor.push({ x: doorX, y: y1, key: 'adobe-door' });
    if (opts.dome) decor.push({ x: doorX, y: y0, key: 'adobe-dome' });
    for (let y = y0 - 1; y <= y1 + 1; y++) for (let x = x0 - 1; x <= x1 + 1; x++) mark(noFoliage, x, y);
  };
  adobe(7, 30, 15, 38, { dome: true });
  adobe(7, 44, 14, 51);
  adobe(7, 57, 16, 66, { dome: true });
  adobe(18, 60, 26, 68);
  // garden dressing between the homes
  deco(16, 40, 'clay-oven');
  deco(9, 40, 'palm-small');
  deco(12, 53, 'cactus-barrel');
  deco(17, 55, 'clay-oven');
  deco(8, 68, 'cactus-tall');
  deco(18, 58, 'palm');
  deco(24, 62, 'desert-shrub');
  for (let fy = 53; fy <= 56; fy++) deco(6, fy, 'palm-fence-v');
  for (let fx = 18; fx <= 25; fx++) { if (fx < 21 || fx > 22) deco(fx, 70, 'palm-fence-h'); }
  deco(20, 72, 'sun-bones');

  // ======================= THE CARAVANSERAI (east) ========================
  // A walled yard of Bedouin tents and camel lines — the caravans' home in town.
  for (let fy = 40; fy <= 70; fy++) { deco(70, fy, 'palm-fence-v'); }
  for (let fx = 70; fx <= 92; fx++) { if (fx < 79 || fx > 81) deco(fx, 39, 'palm-fence-h'); }
  adobe(84, 44, 92, 52, { dome: true }); // the caravanserai lodge (rooms round the yard)
  deco(74, 44, 'bedouin-tent');
  deco(80, 46, 'bedouin-tent');
  deco(76, 58, 'bedouin-tent');
  deco(85, 60, 'bedouin-tent');
  deco(73, 52, 'camel');
  deco(82, 54, 'camel');
  deco(88, 64, 'camel');
  deco(72, 62, 'water-trough');
  deco(84, 68, 'water-trough');
  deco(78, 64, 'fire-bowl');
  deco(75, 50, 'crate');
  deco(80, 50, 'barrel');
  deco(86, 56, 'crate');
  deco(72, 67, 'crate');
  deco(90, 60, 'sun-banner');
  deco(72, 41, 'sun-banner');
  deco(88, 56, 'chest'); // the caravan strongbox (shared stash) — open yard, reachable
  // Amira — the Caravan-Mistress, and the target of Tomas's errand from Hearthwatch
  spawns.push({ kind: 'npc', x: 79, y: 56, label: 'Amira', npcRole: 'the Caravan-Mistress of Sunspire', npcId: 'amira' });
  spawns.push({ kind: 'npc', x: 84, y: 62, label: 'Bakhit', npcRole: 'a weathered caravan-guard rolling dice', npcId: 'bakhit' });
  // hire caravan guards (guild) + a caravan smith (blacksmith)
  spawns.push({ kind: 'merchant', shop: 'guild', x: 82, y: 48, label: 'The Caravan Guard' });
  spawns.push({ kind: 'merchant', shop: 'blacksmith', x: 74, y: 66, label: 'Kestrel the Caravan-Smith' });
  deco(73, 66, 'anvil');
  deco(75, 68, 'crate');

  // ======================= THE GRAND BAZAAR (centre-south) ================
  // The souk: rows of striped awnings, spice, pottery and rugs on woven mats.
  // All of Sunspire's shopfronts are here, open to the sky.
  // woven ground mats down the two market aisles
  for (const my of [59, 66, 73]) for (let x = 32; x <= 64; x += 4) { deco(x, my, 'market-mat'); }
  // paved central avenue up the middle of the bazaar
  for (let y = 55; y <= 80; y++) { decor.push({ x: cx, y, key: 'desert-road' }); decor.push({ x: cx + 1, y, key: 'desert-road' }); mark(roadSet, cx, y); mark(roadSet, cx + 1, y); mark(noFoliage, cx, y); mark(noFoliage, cx + 1, y); }

  const stall = (x: number, y: number, awn: string, goods: string, label?: string, shop?: 'apothecary' | 'tavern' | 'home', npc?: [string, string, string]) => {
    deco(x, y, awn);
    deco(x, y + 1, goods);
    if (shop) spawns.push({ kind: 'merchant', shop, x, y: y + 2, label: label ?? 'Trader' });
    if (npc) spawns.push({ kind: 'npc', x: x + 1, y: y + 2, label: npc[0], npcRole: npc[1], npcId: npc[2] });
    deco(x, y + 3, 'hanging-lantern');
  };
  // west aisle of stalls
  stall(34, 58, 'awning-red', 'spice-sacks', 'Zafira’s Spice & Salve', 'apothecary', ['Zafira', 'a keen-eyed spice-apothecary', 'zafira']);
  stall(34, 65, 'awning-gold', 'pottery');
  stall(34, 72, 'awning-blue', 'basket', undefined, undefined, ['Little Rashi', 'a boy hawking dates by the handful', 'rashi']);
  // east aisle of stalls
  stall(62, 58, 'awning-blue', 'hanging-rug', 'The Sandglass', 'tavern', ['Barkeep Idris', 'the keeper of the Sandglass tea-house', 'idris']);
  stall(62, 65, 'awning-red', 'pottery', 'The Caravan Rest', 'home');
  stall(62, 72, 'awning-gold', 'spice-sacks');
  // extra bazaar dressing + crowd
  deco(38, 62, 'hanging-rug');
  deco(58, 69, 'basket');
  deco(44, 76, 'pottery');
  deco(56, 76, 'spice-sacks');
  deco(40, 69, 'fire-bowl');
  deco(60, 62, 'clay-oven');
  for (const [bx, by] of [[42, 55], [58, 55], [36, 78], [64, 78]] as [number, number][]) deco(bx, by, 'sun-banner');
  spawns.push({ kind: 'npc', x: 47, y: 63, label: 'Hafsa', npcRole: 'a rug-merchant calling her wares', npcId: 'hafsa' });
  spawns.push({ kind: 'npc', x: 54, y: 70, label: 'Jibril', npcRole: 'a wandering storyteller between tales', npcId: 'jibril' });

  // ======================= THE DUNE GATE (south) ==========================
  // The caravan gate onto the deep desert; the party arrives just inside it.
  spawns.push({ kind: 'playerStart', x: cx, y: 84 });
  // gatehouse towers flanking the road
  adobe(43, 82, 47, 88, { windows: false });
  adobe(53, 82, 57, 88, { windows: false });
  setT(cx, H - 3, Tile.SAND); setT(cx + 1, H - 3, Tile.SAND);
  setT(cx, H - 2, Tile.SAND); setT(cx + 1, H - 2, Tile.SAND);
  for (let y = 80; y <= H - 2; y++) { decor.push({ x: cx, y, key: 'desert-road' }); decor.push({ x: cx + 1, y, key: 'desert-road' }); mark(roadSet, cx, y); mark(roadSet, cx + 1, y); mark(noFoliage, cx, y); mark(noFoliage, cx + 1, y); }
  deco(48, 83, 'sun-banner');
  deco(52, 83, 'sun-banner');
  deco(45, 86, 'fire-bowl');
  deco(55, 86, 'fire-bowl');
  spawns.push({ kind: 'door', x: cx, y: H - 2, interiorId: 'overworld', dir: 'south', label: 'The Deep Desert' });
  // a gate-warden greets arrivals
  spawns.push({ kind: 'npc', x: 58, y: 84, label: 'Warden Sabah', npcRole: 'the keeper of the Dune Gate', npcId: 'sabah' });

  // ---- rampart accents so the town reads as walled from within ----
  // the north curtain wall's inner face is the only visible rising wall; clad it.
  for (let x = 6; x <= W - 7; x += 1) if ((x < 38 || x > 62)) decor.push({ x, y: 4, key: 'rampart' });
  for (const [rx, ry] of [[6, 20], [6, 40], [6, 74], [93, 74], [93, 34], [40, 82], [60, 82]] as [number, number][]) deco(rx, ry, 'rampart');

  // ---- roads connecting the districts (desert-road on sand) ----
  const road = (x0: number, y0: number, x1: number, y1: number) => {
    if (x0 === x1) for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) { if (inB(x0, y) && tiles[y][x0] === Tile.SAND && !roadSet.has(`${x0},${y}`)) { decor.push({ x: x0, y, key: 'desert-road' }); mark(roadSet, x0, y); mark(noFoliage, x0, y); } }
    else for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) { if (inB(x, y0) && tiles[y0][x] === Tile.SAND && !roadSet.has(`${x},${y0}`)) { decor.push({ x, y: y0, key: 'desert-road' }); mark(roadSet, x, y0); mark(noFoliage, x, y0); } }
  };
  road(cx, 19, cx, 55);       // temple forecourt down to the bazaar
  road(cx + 1, 19, cx + 1, 55);
  road(20, 44, 42, 44);       // oasis causeway east into the centre
  road(34, 52, 66, 52);       // cross-street above the bazaar
  road(30, 46, 30, 60);       // west link into the adobe quarter
  road(66, 52, 70, 52);       // east link to the caravanserai gate

  // ---- foliage / desert scatter on open sand ----
  const openOk = (x: number, y: number) =>
    inB(x, y) && tiles[y][x] === Tile.SAND && !roadSet.has(`${x},${y}`) && !noFoliage.has(`${x},${y}`);
  const scatter = (x: number, y: number, key: string) => { if (openOk(x, y)) { decor.push({ x, y, key }); mark(noFoliage, x, y); } };
  for (const [x, y] of [
    [12, 24], [90, 30], [34, 30], [66, 30], [22, 34], [78, 34],
    [16, 76], [84, 78], [30, 84], [70, 82], [10, 84], [90, 84],
    [64, 40], [36, 42], [88, 40], [14, 20], [86, 22],
  ] as [number, number][]) scatter(x, y, (x + y) % 3 === 0 ? 'cactus-tall' : (x + y) % 3 === 1 ? 'cactus-barrel' : 'desert-shrub');
  for (const [x, y] of [[8, 22], [92, 26], [28, 30], [72, 28], [18, 80], [82, 82], [40, 30], [60, 28]] as [number, number][]) scatter(x, y, 'sand-dune');
  for (const [x, y] of [[24, 26], [76, 24], [12, 78], [88, 76], [34, 84], [66, 84]] as [number, number][]) scatter(x, y, 'tumbleweed');
  for (const [x, y] of [[20, 22], [80, 30], [30, 28], [70, 34]] as [number, number][]) scatter(x, y, 'sun-bones');

  // a few wind-blown grit tufts on the town's quiet margins (kept sparse so the
  // lived-in districts read as swept, not a wasteland)
  for (let y = 6; y < H - 5; y++) for (let x = 6; x < W - 5; x++) {
    if (!openOk(x, y)) continue;
    const h = (x * 13 + y * 29) % 211;
    if (h === 0) { decor.push({ x, y, key: 'desert-shrub' }); mark(noFoliage, x, y); }
    else if (h === 137) { decor.push({ x, y, key: 'tumbleweed' }); mark(noFoliage, x, y); }
  }

  // a little coin along the entry road for a first-visit reward
  for (const [x, y] of [[cx, 78], [cx + 1, 74], [48, 80], [52, 80]] as [number, number][]) pickups.push({ kind: 'coin', x, y, coin: 20 });

  return {
    id: 'desert_town',
    name: 'Sunspire',
    width: W,
    height: H,
    tiles,
    spawns,
    pickups,
    decor,
    theme: 'town',
    ambientColor: 0x241a10,
    town: true,
    subtitle: 'Sunspire — the oasis-town of the deep desert.',
    chapter: 'Sunspire',
    story:
      'Sunspire rises from the dunes far south-west of Hearthwatch — sun-baked adobe on packed sand, its gilded temple-disc burning above the caravan roads. The Grand Bazaar never sleeps; the oasis keeps the town alive; and the caravanserai waits for roads that have lately gone quiet.',
  };
}

export const DESERT_TOWN = buildDesertTown();
