import { Tile } from '../core/constants';
import type { LevelData, SpawnDef, DecorDef, ShopKind } from '../core/types';

// Reusable building interiors. Each is a small peaceful room (town: true) that
// the player enters by stepping to a building door in Hearthwatch and pressing
// the interact key. The room holds the building's keeper NPC plus furniture, and
// an exit door (a 'door' spawn whose interiorId is 'town') to step back outside.

export interface InteriorOpts {
  id: string;
  name: string;
  subtitle?: string;
  style: 'tavern' | 'guild';
  keeperLabel: string;
  keeperShop: ShopKind;
}

const WALL_KEY: Record<InteriorOpts['style'], string> = {
  tavern: 'tavern-wall',
  guild: 'guild-wall',
};

export function buildInterior(opts: InteriorOpts): LevelData {
  const W = 19;
  const H = 13;
  const tiles: number[][] = [];
  for (let y = 0; y < H; y++) tiles.push(new Array(W).fill(Tile.WALL));
  const decor: DecorDef[] = [];
  const spawns: SpawnDef[] = [];
  const set = (x: number, y: number, t: number) => {
    if (x >= 0 && y >= 0 && x < W && y < H) tiles[y][x] = t;
  };
  const D = (x: number, y: number, key: string) => decor.push({ x, y, key });

  // carve the floor
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) set(x, y, Tile.FLOOR);

  // floorboards everywhere, then panelled walls over the border
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (tiles[y][x] === Tile.FLOOR) D(x, y, 'wood-floor');
      else D(x, y, WALL_KEY[opts.style]);
    }

  // exit door punched through the bottom wall
  const dx = Math.floor(W / 2);
  set(dx, H - 1, Tile.DOOR);
  D(dx, H - 1, 'house-door');
  spawns.push({ kind: 'door', x: dx, y: H - 1, interiorId: 'town', label: 'Step outside' });
  spawns.push({ kind: 'playerStart', x: dx, y: H - 3 });

  // a warm rug down the middle
  for (let x = dx - 1; x <= dx + 1; x++) D(x, 7, 'rug');

  if (opts.style === 'tavern') {
    // long bar across the back with shelves of bottles behind it
    for (let x = 4; x <= 14; x++) D(x, 2, 'tavern-bar');
    for (let x = 4; x <= 14; x += 2) D(x, 0, 'shelf');
    D(2, 2, 'barrel');
    D(16, 2, 'barrel');
    D(3, 1, 'barrel');
    // hearth on the right wall + a banner on the left
    D(17, 5, 'hearth');
    D(1, 4, 'banner');
    // tables with stools
    for (const [tx, ty] of [[5, 6], [13, 6], [6, 10], [12, 10]] as [number, number][]) {
      D(tx, ty, 'tavern-table');
      D(tx - 1, ty, 'tavern-stool');
      D(tx + 1, ty, 'tavern-stool');
      D(tx, ty - 1, 'tavern-stool');
    }
    D(2, 9, 'candle');
    D(16, 9, 'candle');
    // the keeper stands behind the bar
    spawns.push({ kind: 'merchant', x: 9, y: 1, shop: opts.keeperShop, label: opts.keeperLabel });
  } else {
    // Fighters Guild: weapon racks, training dummies, an anvil, banners.
    for (let x = 3; x <= 15; x += 3) D(x, 1, 'weapon-rack');
    D(2, 1, 'banner');
    D(16, 1, 'banner');
    D(4, 6, 'training-dummy');
    D(14, 6, 'training-dummy');
    D(9, 3, 'anvil');
    D(2, 10, 'barrel');
    D(16, 10, 'barrel');
    D(2, 5, 'brazier');
    D(16, 5, 'brazier');
    // the guildmaster waits at the hiring desk
    spawns.push({ kind: 'merchant', x: 9, y: 5, shop: opts.keeperShop, label: opts.keeperLabel });
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
    ambientColor: opts.style === 'tavern' ? 0x2a1d12 : 0x1f2230,
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
