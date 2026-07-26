import { Tile } from '../core/constants';
import type { LevelData, SpawnDef, DecorDef, ShopKind } from '../core/types';

// Reusable building interiors. Each is a roomy, peaceful space (town: true) the
// player enters from a Hearthwatch building door and leaves by the inner door.
// Rooms hold the building's keeper, themed furniture, a couple of wandering
// patrons for life, and a few strategically-placed light sources.

type Style = 'tavern' | 'guild' | 'forge' | 'apothecary';

export interface InteriorOpts {
  id: string;
  name: string;
  subtitle?: string;
  style: Style;
  keeperLabel: string;
  keeperShop: ShopKind;
}

const WALL_KEY: Record<Style, string> = {
  tavern: 'tavern-wall',
  guild: 'guild-wall',
  forge: 'guild-wall',
  apothecary: 'tavern-wall',
};

const P = (a: [number, number][]): [number, number][] => a;

export function buildInterior(opts: InteriorOpts): LevelData {
  const W = 28;
  const H = 18;
  const tiles: number[][] = [];
  for (let y = 0; y < H; y++) tiles.push(new Array(W).fill(Tile.WALL));
  const decor: DecorDef[] = [];
  const spawns: SpawnDef[] = [];
  const set = (x: number, y: number, t: number) => {
    if (x >= 0 && y >= 0 && x < W && y < H) tiles[y][x] = t;
  };
  const D = (x: number, y: number, key: string) => decor.push({ x, y, key });
  const npc = (x: number, y: number, label: string, role: string) => spawns.push({ kind: 'npc', x, y, label, npcRole: role });

  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) set(x, y, Tile.FLOOR);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (tiles[y][x] === Tile.FLOOR) D(x, y, 'wood-floor');
      else D(x, y, WALL_KEY[opts.style]);
    }

  const dx = Math.floor(W / 2);
  set(dx, H - 1, Tile.DOOR);
  D(dx, H - 1, 'house-door');
  spawns.push({ kind: 'door', x: dx, y: H - 1, interiorId: 'town', label: 'Step outside' });
  spawns.push({ kind: 'playerStart', x: dx, y: H - 3 });

  // strategic ambient light: braziers in the back corners (warm, sparse)
  D(2, 1, 'brazier');
  D(W - 3, 1, 'brazier');
  for (let x = dx - 1; x <= dx + 1; x++) D(x, 8, 'rug');

  if (opts.style === 'tavern') {
    for (let x = 5; x <= 22; x++) D(x, 2, 'tavern-bar');
    for (let x = 5; x <= 22; x += 3) D(x, 0, 'shelf');
    for (const [bx, by] of P([[3, 1], [3, 2], [24, 1], [24, 2]])) D(bx, by, 'barrel');
    D(W - 2, 7, 'hearth');
    D(1, 6, 'banner');
    D(1, 11, 'banner');
    D(12, 1, 'candle');
    D(16, 1, 'candle');
    for (const [tx, ty] of P([[6, 8], [11, 12], [20, 8], [22, 13], [8, 14]])) {
      D(tx, ty, 'tavern-table');
      D(tx - 1, ty, 'tavern-stool');
      D(tx + 1, ty, 'tavern-stool');
      D(tx, ty - 1, 'tavern-stool');
    }
    spawns.push({ kind: 'merchant', x: dx, y: 1, shop: opts.keeperShop, label: opts.keeperLabel });
    npc(6, 9, 'Old Sot', 'a soused regular who never leaves his stool');
    npc(20, 9, 'Mira', 'a travelling bard tuning her lute');
    npc(9, 13, 'a hooded stranger', 'a cloaked figure nursing a dark ale');
  } else if (opts.style === 'guild') {
    for (let x = 4; x <= 24; x += 4) D(x, 1, 'weapon-rack');
    for (const [tx, ty] of P([[5, 9], [22, 9]])) D(tx, ty, 'training-dummy');
    D(10, 5, 'anvil');
    D(18, 5, 'anvil');
    for (const [bx, by] of P([[3, 15], [24, 15], [3, 5], [24, 5]])) D(bx, by, 'crate');
    D(2, 8, 'brazier');
    D(W - 3, 8, 'brazier');
    D(2, 1, 'banner');
    D(W - 3, 1, 'banner');
    D(12, 1, 'candle');
    D(16, 1, 'candle');
    spawns.push({ kind: 'merchant', x: dx, y: 7, shop: opts.keeperShop, label: opts.keeperLabel });
    npc(6, 12, 'Sergeant Hod', 'a scarred drill-sergeant barking orders');
    npc(20, 12, 'Recruit Pell', 'a nervous new recruit polishing a blade');
    npc(14, 14, 'a sellsword', 'a hard-eyed mercenary waiting on coin');
  } else if (opts.style === 'forge') {
    // Legacy path — Brunda's Forge uses buildBrundasForge() instead.
    D(2, 3, 'hearth');
    D(dx, 8, 'anvil');
    spawns.push({ kind: 'merchant', x: dx, y: 5, shop: opts.keeperShop, label: opts.keeperLabel });
  } else {
    for (let x = 4; x <= 25; x += 3) D(x, 0, 'shelf');
    D(dx, 8, 'cauldron');
    for (const [tx, ty] of P([[6, 11], [20, 11]])) {
      D(tx, ty, 'tavern-table');
      D(tx, ty - 1, 'potion-red');
      D(tx + 1, ty - 1, 'potion-blue');
    }
    for (const [bx, by] of P([[3, 14], [24, 14]])) D(bx, by, 'barrel');
    D(2, 7, 'brazier');
    D(W - 3, 7, 'brazier');
    D(1, 5, 'banner');
    D(W - 2, 5, 'banner');
    D(10, 1, 'candle');
    D(18, 1, 'candle');
    spawns.push({ kind: 'merchant', x: dx, y: 3, shop: opts.keeperShop, label: opts.keeperLabel });
    npc(7, 12, 'Goodwife Esa', 'a villager buying salves for her children');
    npc(21, 12, 'a hedge-witch', 'a muttering herbalist haggling over reagents');
  }

  return {
    id: opts.id,
    name: opts.name,
    width: W,
    height: H,
    tiles,
    spawns,
    pickups: [],
    decor,
    theme: 'town',
    music: 'tavern',
    ambientColor: opts.style === 'tavern' ? 0x2a1d12 : opts.style === 'apothecary' ? 0x18241a : 0x1f2230,
    town: true,
    interior: true,
    subtitle: opts.subtitle ?? opts.name,
    chapter: opts.name,
  };
}

/** Shared helpers for dedicated shop interiors. */
function openHall(W: number, H: number): {
  tiles: number[][];
  decor: DecorDef[];
  spawns: SpawnDef[];
  set: (x: number, y: number, t: number) => void;
  D: (x: number, y: number, key: string) => void;
  rect: (x0: number, y0: number, x1: number, y1: number, t: number) => void;
  finish: (floorKey: string, wallKey: string) => void;
  doorSouth: () => number;
} {
  const tiles: number[][] = [];
  for (let y = 0; y < H; y++) tiles.push(new Array(W).fill(Tile.WALL));
  const decor: DecorDef[] = [];
  const spawns: SpawnDef[] = [];
  const set = (x: number, y: number, t: number) => {
    if (x >= 0 && y >= 0 && x < W && y < H) tiles[y][x] = t;
  };
  const D = (x: number, y: number, key: string) => decor.push({ x, y, key });
  const rect = (x0: number, y0: number, x1: number, y1: number, t: number) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, t);
  };
  rect(1, 1, W - 2, H - 2, Tile.FLOOR);
  const finish = (floorKey: string, wallKey: string) => {
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) D(x, y, tiles[y][x] === Tile.FLOOR ? floorKey : wallKey);
  };
  const doorSouth = () => {
    const dx = Math.floor(W / 2);
    set(dx, H - 1, Tile.DOOR);
    D(dx, H - 1, 'house-door');
    spawns.push({ kind: 'door', x: dx, y: H - 1, interiorId: 'town', label: 'Step outside' });
    spawns.push({ kind: 'playerStart', x: dx, y: H - 3 });
    return dx;
  };
  return { tiles, decor, spawns, set, D, rect, finish, doorSouth };
}

/** The Gilded Tankard — long bar, roaring hearth, bard stage, packed common room. */
export function buildGildedTankard(): LevelData {
  const W = 34;
  const H = 22;
  const { tiles, decor, spawns, D, rect, finish, doorSouth } = openHall(W, H);
  // Hearth alcove on the east wall
  rect(30, 4, 32, 10, Tile.WALL);
  finish('wood-floor', 'tavern-wall');

  // ---- grand bar along the north ----
  for (let x = 4; x <= 28; x++) D(x, 2, 'tavern-bar');
  for (let x = 5; x <= 27; x += 3) D(x, 1, 'bar-back');
  D(3, 1, 'ale-kegs');
  D(29, 1, 'ale-kegs');
  D(2, 2, 'barrel');
  D(30, 2, 'barrel');
  // Keep behind the bar
  spawns.push({ kind: 'merchant', x: 16, y: 1, shop: 'tavern', label: 'Innkeep Mira' });

  // ---- hearth wing (east) — the room's warm heart ----
  D(31, 5, 'hearth');
  D(31, 6, 'hearth');
  D(31, 7, 'hearth');
  D(29, 6, 'brazier');
  D(28, 4, 'banner');
  D(28, 9, 'banner');
  // fireside settles
  D(27, 6, 'tavern-stool');
  D(27, 8, 'tavern-stool');
  D(26, 7, 'tavern-table');

  // ---- bard stage (west) ----
  D(3, 6, 'tavern-stage');
  D(4, 6, 'tavern-stage');
  D(5, 6, 'tavern-stage');
  D(2, 5, 'brazier');
  D(2, 8, 'banner');

  // ---- common-room tables ----
  for (const [tx, ty] of [
    [9, 8], [15, 8], [21, 8],
    [10, 12], [16, 12], [22, 12],
    [12, 15], [20, 15],
  ] as [number, number][]) {
    D(tx, ty, 'tavern-table');
    D(tx - 1, ty, 'tavern-stool');
    D(tx + 1, ty, 'tavern-stool');
    D(tx, ty - 1, 'tavern-stool');
  }
  // runner rugs down the aisle
  for (let y = 4; y <= 16; y++) {
    D(15, y, 'rug');
    D(16, y, 'rug');
  }
  // cellar corner
  D(3, 14, 'ale-kegs');
  D(5, 15, 'barrel');
  D(4, 16, 'crate');
  D(28, 14, 'barrel');
  D(30, 15, 'ale-kegs');
  D(8, 3, 'candle');
  D(24, 3, 'candle');
  D(16, 4, 'brazier');

  doorSouth();
  spawns.push({ kind: 'npc', x: 4, y: 7, label: 'Pib', npcRole: 'a travelling bard warming up on the little stage' });
  spawns.push({ kind: 'npc', x: 10, y: 9, label: 'Old Sot', npcRole: 'a soused regular who never leaves his stool' });
  spawns.push({ kind: 'npc', x: 21, y: 9, label: 'Sella', npcRole: 'a chambermaid carrying a tray of tankards' });
  spawns.push({ kind: 'npc', x: 27, y: 7, label: 'a hooded stranger', npcRole: 'a cloaked figure nursing a dark ale by the fire' });
  spawns.push({ kind: 'npc', x: 16, y: 14, label: 'Tomas', npcRole: 'a fretful merchant arguing softly with himself' });

  return {
    id: 'interior_tankard',
    name: 'The Gilded Tankard',
    width: W,
    height: H,
    tiles,
    spawns,
    pickups: [],
    decor,
    theme: 'town',
    music: 'tavern',
    ambientColor: 0x2a1a10,
    town: true,
    interior: true,
    subtitle: 'The Gilded Tankard — warmth, ale, and every rumour in Hearthwatch.',
    chapter: 'The Gilded Tankard',
    story:
      'Smoke, hops, and beeswax. A long oak bar runs the north wall under a mirror of bottles, while a stone hearth on the east throws gold across the common-room tables. On a raised board to the west a bard tunes a lute — and every stool seems to hold a story.',
  };
}

export const INTERIOR_TANKARD = buildGildedTankard();

/** The Fighters Guild — stone hall, practice ring, trophy wall, muster desk. */
export function buildFightersGuild(): LevelData {
  const W = 34;
  const H = 22;
  const { tiles, decor, spawns, D, rect, finish, doorSouth } = openHall(W, H);
  // Shallow north alcove for banners (desk sits on open floor in front)
  rect(13, 1, 20, 1, Tile.WALL);
  finish('guild-floor', 'guild-wall');

  // ---- muster desk ----
  for (let x = 13; x <= 20; x++) D(x, 3, 'guild-desk');
  D(14, 1, 'banner');
  D(19, 1, 'banner');
  D(12, 2, 'brazier');
  D(21, 2, 'brazier');
  spawns.push({ kind: 'merchant', x: 16, y: 2, shop: 'guild', label: 'Guildmaster Tor' });

  // ---- practice ring (center of the hall) ----
  for (let y = 8; y <= 13; y++)
    for (let x = 13; x <= 20; x++) D(x, y, 'guild-ring');
  D(12, 9, 'training-dummy');
  D(12, 12, 'training-dummy');
  D(21, 9, 'training-dummy');
  D(21, 12, 'training-dummy');
  D(16, 7, 'weapon-rack');
  D(17, 7, 'weapon-rack');

  // ---- west armory ----
  for (const y of [4, 6, 8, 10, 12]) D(3, y, 'forge-weapon-wall');
  D(5, 4, 'weapon-rack');
  D(5, 7, 'weapon-rack');
  D(5, 10, 'weapon-rack');
  D(4, 14, 'crate');
  D(6, 14, 'crate');
  D(3, 16, 'guild-trophy');
  D(2, 6, 'brazier');

  // ---- east trophy & barracks ----
  D(30, 4, 'guild-trophy');
  D(28, 4, 'guild-trophy');
  D(30, 7, 'weapon-rack');
  D(28, 8, 'weapon-rack');
  D(30, 10, 'anvil'); // sparring-kit repair
  D(28, 12, 'crate');
  D(30, 14, 'barrel');
  D(31, 6, 'brazier');
  D(31, 12, 'banner');

  // ---- perimeter braziers & candles ----
  for (const [bx, by] of [[8, 3], [25, 3], [8, 16], [25, 16], [16, 15]] as [number, number][])
    D(bx, by, 'brazier');
  D(10, 2, 'candle');
  D(23, 2, 'candle');

  doorSouth();
  spawns.push({ kind: 'npc', x: 12, y: 10, label: 'Sergeant Hod', npcRole: 'a scarred drill-sergeant barking forms in the ring' });
  spawns.push({ kind: 'npc', x: 20, y: 11, label: 'Recruit Pell', npcRole: 'a nervous new recruit polishing a practice blade' });
  spawns.push({ kind: 'npc', x: 29, y: 8, label: 'a sellsword', npcRole: 'a hard-eyed mercenary waiting on coin' });
  spawns.push({ kind: 'npc', x: 5, y: 12, label: 'Armorer Nessa', npcRole: 'a guild armorer inventorying the west racks' });

  return {
    id: 'interior_guild',
    name: 'The Fighters Guild',
    width: W,
    height: H,
    tiles,
    spawns,
    pickups: [],
    decor,
    theme: 'town',
    music: 'tavern',
    ambientColor: 0x1a1c24,
    town: true,
    interior: true,
    subtitle: 'The Fighters Guild — hire steel that answers when you call.',
    chapter: 'The Fighters Guild',
    story:
      'Stone underfoot, iron on the walls. A chalk practice ring dominates the hall, ringed by training dummies and weapon racks. At the north dais Guildmaster Tor takes contracts — and every shield on the trophy wall has a name behind it.',
  };
}

export const INTERIOR_GUILD = buildFightersGuild();

/** Brunda's Forge — a dedicated overhaul: grand furnace, sooty stone, and the
 *  full drama of a master smithy (not the generic rectangular interior kit). */
export function buildBrundasForge(): LevelData {
  const W = 34;
  const H = 22;
  const tiles: number[][] = [];
  for (let y = 0; y < H; y++) tiles.push(new Array(W).fill(Tile.WALL));
  const decor: DecorDef[] = [];
  const spawns: SpawnDef[] = [];
  const set = (x: number, y: number, t: number) => {
    if (x >= 0 && y >= 0 && x < W && y < H) tiles[y][x] = t;
  };
  const D = (x: number, y: number, key: string) => decor.push({ x, y, key });
  const rect = (x0: number, y0: number, x1: number, y1: number, t: number) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, t);
  };

  // ---- open hall ----
  rect(1, 1, W - 2, H - 2, Tile.FLOOR);
  // North furnace alcove: three-tile deep wall mass for the grand hearth
  rect(13, 1, 20, 3, Tile.WALL);

  // Floor / wall cladding
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (tiles[y][x] === Tile.FLOOR) D(x, y, 'forge-floor');
      else D(x, y, 'forge-wall');
    }
  }

  // ---- GRAND FURNACE (north, dead center) — the awe moment ----
  // Hood crowns the alcove; three furnace mouths roar beneath.
  for (const x of [14, 15, 16, 17, 18, 19]) D(x, 1, 'forge-hood');
  for (const x of [15, 16, 17, 18]) D(x, 2, 'forge-furnace');
  D(14, 2, 'forge-furnace');
  D(19, 2, 'forge-furnace');
  // Ember carpet in front of the fire (walkable, glowing)
  for (let y = 4; y <= 5; y++) for (let x = 14; x <= 19; x++) D(x, y, 'forge-embers');
  // Side braziers flanking the alcove like temple lights
  D(11, 2, 'brazier');
  D(22, 2, 'brazier');
  D(12, 1, 'banner');
  D(21, 1, 'banner');

  // ---- master work aisle ----
  // Brunda's anvil on the furnace apron; she stands between fire and steel.
  D(16, 6, 'anvil');
  D(17, 6, 'anvil'); // double-wide master station reads as one massive block
  spawns.push({ kind: 'merchant', x: 16, y: 5, shop: 'blacksmith', label: "Brunda Ironhand" });
  // Bellows to the left of the fire, quench trough to the right
  D(12, 4, 'forge-bellows');
  D(21, 4, 'forge-trough');
  // Tool benches either side of the master anvil
  D(13, 7, 'forge-workbench');
  D(20, 7, 'forge-workbench');

  // ---- west wing: raw materials ----
  D(3, 3, 'forge-ore');
  D(5, 3, 'forge-ore');
  D(4, 5, 'forge-ingots');
  D(6, 5, 'forge-ingots');
  D(3, 7, 'wood-pile');
  D(5, 7, 'crate');
  D(3, 9, 'crate');
  D(6, 8, 'forge-slag');
  D(4, 10, 'barrel');
  D(2, 5, 'brazier');
  D(2, 12, 'forge-weapon-wall');

  // ---- east wing: finished steel ----
  D(28, 3, 'forge-weapon-wall');
  D(30, 3, 'forge-weapon-wall');
  D(29, 5, 'weapon-rack');
  D(31, 5, 'weapon-rack');
  D(28, 7, 'forge-ingots');
  D(30, 7, 'crate');
  D(31, 9, 'barrel');
  D(28, 9, 'forge-slag');
  D(31, 4, 'brazier');
  D(31, 12, 'forge-weapon-wall');

  // ---- apprentice stations (south of the main aisle) ----
  D(8, 11, 'anvil');
  D(9, 10, 'forge-workbench');
  D(7, 12, 'forge-bellows');
  D(25, 11, 'anvil');
  D(24, 10, 'forge-workbench');
  D(26, 12, 'forge-trough');
  D(8, 14, 'crate');
  D(25, 14, 'crate');
  D(10, 14, 'forge-ingots');
  D(23, 14, 'forge-ore');

  // ---- hall lighting & atmosphere ----
  for (const [bx, by] of [[8, 3], [25, 3], [8, 16], [25, 16], [16, 12]] as [number, number][])
    D(bx, by, 'brazier');
  // Ash path down the center toward the door
  for (let y = 8; y <= 17; y++) {
    D(15, y, 'forge-embers');
    D(16, y, 'forge-embers');
    D(17, y, 'forge-embers');
  }
  D(4, 16, 'forge-slag');
  D(29, 16, 'forge-slag');
  D(6, 17, 'wood-pile');
  D(27, 17, 'barrel');

  // ---- exit & start ----
  const dx = Math.floor(W / 2);
  set(dx, H - 1, Tile.DOOR);
  D(dx, H - 1, 'house-door');
  spawns.push({ kind: 'door', x: dx, y: H - 1, interiorId: 'town', label: 'Step outside' });
  spawns.push({ kind: 'playerStart', x: dx, y: H - 3 });

  // Life on the floor
  spawns.push({ kind: 'npc', x: 8, y: 12, label: 'Apprentice Tib', npcRole: 'a soot-streaked apprentice pumping the bellows' });
  spawns.push({ kind: 'npc', x: 25, y: 12, label: 'Apprentice Ryn', npcRole: 'a wiry striker quenching a glowing billet' });
  spawns.push({ kind: 'npc', x: 29, y: 8, label: 'Old Garm', npcRole: 'a retired armorer judging blades with a practised eye' });
  spawns.push({ kind: 'npc', x: 5, y: 14, label: 'Courier Vess', npcRole: 'a road-courier waiting on a repaired greave' });

  return {
    id: 'interior_forge',
    name: "Brunda's Forge",
    width: W,
    height: H,
    tiles,
    spawns,
    pickups: [],
    decor,
    theme: 'town',
    music: 'tavern',
    ambientColor: 0x2a1208, // deep copper-ember dark
    town: true,
    interior: true,
    subtitle: "Brunda's Forge — where the Undermaw's steel is born in fire.",
    chapter: "Brunda's Forge",
    story:
      "Heat hits you like a living thing. At the far end of the hall a grand furnace roars under a soot-black hood, painting the ashlar walls in molten gold. Brunda Ironhand works the master anvil between bellows and quench, and every blade in Hearthwatch has known this fire.",
  };
}

export const INTERIOR_FORGE = buildBrundasForge();

/** The Green Vial — herb loft, glowing vials, bubbling cauldron, green hush. */
export function buildGreenVial(): LevelData {
  const W = 32;
  const H = 20;
  const { tiles, decor, spawns, D, rect, finish, doorSouth } = openHall(W, H);
  // Back work alcove for the cauldron
  rect(12, 1, 19, 3, Tile.WALL);
  finish('apothecary-floor', 'apothecary-wall');

  // ---- hanging herb loft (north beam line) ----
  for (let x = 3; x <= 28; x += 3) D(x, 1, 'herb-bundle');
  D(2, 2, 'brazier');
  D(29, 2, 'brazier');

  // ---- main counter & potion case ----
  for (let x = 8; x <= 23; x++) D(x, 5, 'shelf');
  D(12, 6, 'potion-case');
  D(15, 6, 'potion-case');
  D(18, 6, 'potion-case');
  D(14, 7, 'mortar-pestle');
  D(17, 7, 'mortar-pestle');
  spawns.push({ kind: 'merchant', x: 15, y: 4, shop: 'apothecary', label: 'Herbalist Ysolde' });

  // ---- cauldron alcove (north center) — the awe beat ----
  D(14, 2, 'cauldron');
  D(15, 2, 'cauldron');
  D(16, 2, 'cauldron');
  D(13, 2, 'brazier');
  D(18, 2, 'brazier');
  D(12, 1, 'banner');
  D(19, 1, 'banner');

  // ---- west: raw ingredients ----
  D(3, 5, 'shelf');
  D(3, 7, 'shelf');
  D(3, 9, 'shelf');
  D(5, 6, 'crate');
  D(5, 8, 'barrel');
  D(4, 11, 'herb-bundle');
  D(6, 11, 'flower-bed');
  D(3, 13, 'mortar-pestle');
  D(2, 8, 'candle');

  // ---- east: prepared goods & reading nook ----
  D(28, 5, 'shelf');
  D(28, 7, 'shelf');
  D(28, 9, 'potion-case');
  D(26, 6, 'tavern-table');
  D(26, 7, 'candle');
  D(27, 8, 'tavern-stool');
  D(25, 8, 'tavern-stool');
  D(28, 12, 'barrel');
  D(26, 12, 'crate');
  D(29, 10, 'candle');

  // ---- center aisles ----
  D(10, 10, 'tavern-table');
  D(10, 9, 'potion-red');
  D(11, 9, 'potion-blue');
  D(21, 10, 'tavern-table');
  D(21, 9, 'potion-blue');
  D(22, 9, 'potion-red');
  D(15, 12, 'rug');
  D(16, 12, 'rug');
  D(15, 13, 'rug');
  D(16, 13, 'rug');
  for (const [bx, by] of [[8, 14], [23, 14], [15, 15]] as [number, number][]) D(bx, by, 'brazier');

  doorSouth();
  spawns.push({ kind: 'npc', x: 5, y: 10, label: 'Goodwife Esa', npcRole: 'a villager buying salves for her children' });
  spawns.push({ kind: 'npc', x: 26, y: 9, label: 'a hedge-witch', npcRole: 'a muttering herbalist haggling over reagents' });
  spawns.push({ kind: 'npc', x: 10, y: 12, label: 'Apprentice Lorn', npcRole: 'a freckled apprentice labelling green glass vials' });
  spawns.push({ kind: 'npc', x: 21, y: 12, label: 'Courier Bri', npcRole: 'a courier waiting on a tincture for the road' });

  return {
    id: 'interior_apothecary',
    name: 'The Green Vial',
    width: W,
    height: H,
    tiles,
    spawns,
    pickups: [],
    decor,
    theme: 'town',
    music: 'tavern',
    ambientColor: 0x142018,
    town: true,
    interior: true,
    subtitle: 'The Green Vial — potions, salves, and stranger green things.',
    chapter: 'The Green Vial',
    story:
      'The air tastes of mint, resin, and something older. Bundles of drying herbs hang from every beam, a cauldron murmurs under the north alcove, and glass vials on the main case catch a light that is not entirely of this room. Ysolde watches you the way a gardener watches weather.',
  };
}

export const INTERIOR_APOTHECARY = buildGreenVial();

/** The Heroes' Lodge — rest, stash, map table, beds, and a trophy hall. */
export function buildHeroesLodge(): LevelData {
  const W = 32;
  const H = 20;
  const { tiles, decor, spawns, D, rect, finish, doorSouth } = openHall(W, H);
  // North hearth alcove
  rect(13, 1, 18, 2, Tile.WALL);
  finish('lodge-floor', 'lodge-wall');

  // ---- hearth & sitting room (north) ----
  D(14, 2, 'hearth');
  D(15, 2, 'hearth');
  D(16, 2, 'hearth');
  D(17, 2, 'hearth');
  D(12, 2, 'banner');
  D(19, 2, 'banner');
  D(11, 4, 'lodge-chair');
  D(20, 4, 'lodge-chair');
  D(13, 5, 'lodge-chair');
  D(18, 5, 'lodge-chair');
  D(15, 5, 'rug');
  D(16, 5, 'rug');
  D(10, 3, 'brazier');
  D(21, 3, 'brazier');

  // ---- rest steward (heals party) ----
  spawns.push({ kind: 'merchant', x: 15, y: 4, shop: 'home', label: 'Steward Cal' });

  // ---- strategy table (center) ----
  D(14, 8, 'lodge-table');
  D(15, 8, 'lodge-table');
  D(16, 8, 'lodge-table');
  D(17, 8, 'lodge-table');
  D(13, 9, 'tavern-stool');
  D(18, 9, 'tavern-stool');
  D(15, 10, 'candle');

  // ---- west: bedrooms ----
  D(3, 4, 'lodge-bed');
  D(5, 4, 'lodge-bed');
  D(3, 7, 'lodge-bed');
  D(5, 7, 'lodge-bed');
  D(3, 10, 'lodge-wardrobe');
  D(6, 10, 'lodge-wardrobe');
  D(4, 12, 'chest'); // shared stash
  D(2, 6, 'candle');
  D(7, 6, 'candle');
  D(4, 3, 'banner');

  // ---- east: trophy hall ----
  // Plinths for warden busts (spawnLodgeTrophies fills the actual trophies).
  for (let i = 0; i < 10; i++) {
    const x = 22 + (i % 5) * 2;
    const y = 4 + Math.floor(i / 5) * 4;
    D(x, y, 'trophy-plinth');
  }
  D(28, 3, 'banner');
  D(22, 3, 'banner');
  D(30, 6, 'brazier');
  D(30, 10, 'weapon-rack');
  D(28, 12, 'crate');
  D(30, 12, 'barrel');

  // ---- south: pantry & gear ----
  D(8, 14, 'shelf');
  D(10, 14, 'shelf');
  D(12, 14, 'barrel');
  D(20, 14, 'crate');
  D(22, 14, 'wood-pile');
  D(24, 14, 'chest'); // second stash chest
  D(8, 16, 'flower-bed');
  D(24, 16, 'flower-bed');
  for (const [bx, by] of [[10, 11], [21, 11], [15, 14]] as [number, number][]) D(bx, by, 'brazier');
  // runner from door to hearth
  for (let y = 6; y <= 16; y++) {
    D(15, y, 'rug');
    D(16, y, 'rug');
  }

  doorSouth();
  spawns.push({ kind: 'npc', x: 5, y: 12, label: 'Squire Junn', npcRole: 'a lodge squire airing the party banners' });
  spawns.push({ kind: 'npc', x: 25, y: 9, label: 'Archivist Venn', npcRole: 'the lodge archivist polishing a trophy plaque' });
  spawns.push({ kind: 'npc', x: 12, y: 9, label: 'Cook Heda', npcRole: 'the lodge cook setting out a cold supper' });

  return {
    id: 'interior_lodge',
    name: "Heroes' Lodge",
    width: W,
    height: H,
    tiles,
    spawns,
    pickups: [],
    decor,
    theme: 'town',
    music: 'tavern',
    ambientColor: 0x221810,
    town: true,
    interior: true,
    subtitle: "Heroes' Lodge — rest, stash, and the trophies of the Undermaw.",
    chapter: "Heroes' Lodge",
    story:
      'Your house on Merchant\'s Row. Firelight on oak, a map table scarred by a hundred plans, beds that still hold the shape of exhausted sleep. Steward Cal keeps the hearth and the larder. The east hall waits for trophies — one plinth for every warden you cast down.',
  };
}

export const INTERIOR_LODGE = buildHeroesLodge();
