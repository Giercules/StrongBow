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
    D(2, 3, 'hearth');
    D(W - 3, 3, 'hearth');
    D(dx, 8, 'anvil');
    for (const rx of [4, 8, 20, 24]) D(rx, 1, 'weapon-rack');
    for (const [bx, by] of P([[3, 13], [24, 13], [6, 13], [21, 13]])) D(bx, by, 'crate');
    D(2, 8, 'brazier');
    D(W - 3, 8, 'brazier');
    D(dx, 1, 'banner');
    D(11, 1, 'candle');
    D(17, 1, 'candle');
    spawns.push({ kind: 'merchant', x: dx, y: 5, shop: opts.keeperShop, label: opts.keeperLabel });
    npc(8, 11, 'Apprentice Tib', 'a soot-streaked apprentice working the bellows');
    npc(20, 11, 'Old Garm', 'a retired armorer swapping war-stories');
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
    ambientColor: opts.style === 'tavern' ? 0x2a1d12 : opts.style === 'apothecary' ? 0x18241a : 0x1f2230,
    town: true,
    interior: true,
    subtitle: opts.subtitle ?? opts.name,
    chapter: opts.name,
  };
}

export const INTERIOR_TANKARD = buildInterior({
  id: 'interior_tankard',
  name: 'The Gilded Tankard',
  subtitle: 'The Gilded Tankard — warmth, ale, and rumour.',
  style: 'tavern',
  keeperLabel: 'The Gilded Tankard',
  keeperShop: 'tavern',
});

export const INTERIOR_GUILD = buildInterior({
  id: 'interior_guild',
  name: 'The Fighters Guild',
  subtitle: 'The Fighters Guild — hire sellswords to march at your side.',
  style: 'guild',
  keeperLabel: 'The Fighters Guild',
  keeperShop: 'guild',
});

export const INTERIOR_FORGE = buildInterior({
  id: 'interior_forge',
  name: "Brunda's Forge",
  subtitle: "Brunda's Forge — steel for the descent.",
  style: 'forge',
  keeperLabel: "Brunda's Forge",
  keeperShop: 'blacksmith',
});

export const INTERIOR_APOTHECARY = buildInterior({
  id: 'interior_apothecary',
  name: 'The Green Vial',
  subtitle: 'The Green Vial — potions, salves and stranger things.',
  style: 'apothecary',
  keeperLabel: 'The Green Vial',
  keeperShop: 'apothecary',
});
