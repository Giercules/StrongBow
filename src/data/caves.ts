import { Tile } from '../core/constants';
import type { LevelData, SpawnDef, PickupDef, DecorDef, EnemyId, ThemeId } from '../core/types';

// ----------------------------------------------------------------------------
// Overworld CAVES — small hand-built mini-dungeons reached from cave mouths in
// the open world. Unlike the campaign realms they don't descend; a "cavern
// mouth" door returns you to the overworld. Each has its own foes, a locked
// treasure (find the iron key, or pick it as the Thief), and a lore beat tying
// the surface to the stirring Undermaw below.
// ----------------------------------------------------------------------------

export interface CaveOptions {
  id: string;
  name: string;
  theme: ThemeId;
  ambientColor: number;
  foes: EnemyId[];
  chestItems: string[]; // items behind locked chests in the treasure alcove
  subtitle: string;
  chapter: string;
  story: string;
}

function buildCave(o: CaveOptions): LevelData {
  const W = 46;
  const H = 34;
  const tiles: number[][] = [];
  for (let y = 0; y < H; y++) tiles.push(new Array(W).fill(Tile.WALL));
  const decor: DecorDef[] = [];
  const spawns: SpawnDef[] = [];
  const pickups: PickupDef[] = [];

  const carve = (x0: number, y0: number, x1: number, y1: number) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (x > 0 && y > 0 && x < W - 1 && y < H - 1) tiles[y][x] = Tile.FLOOR;
  };

  // chambers: entry (bottom) → corridor → great hall → treasure alcove (top)
  carve(19, 25, 27, 31); // entry
  carve(22, 16, 24, 25); // corridor up
  carve(8, 8, 38, 18);   // great hall
  carve(31, 2, 43, 10);  // treasure alcove (overlaps the hall's east end)
  carve(10, 18, 12, 22); // side nook (west)
  carve(10, 20, 16, 22);

  const startX = 23;
  const startY = 29;
  spawns.push({ kind: 'playerStart', x: startX, y: startY });
  // the cavern mouth — step on it and press Use to climb back to the surface
  spawns.push({ kind: 'door', x: startX, y: startY + 1, interiorId: 'overworld', label: 'Cavern Mouth — leave' });
  decor.push({ x: startX, y: startY + 1, key: 'cave-entrance' });

  // foes: a few spawners through the hall + nook (wild monsters also roam)
  const gens: [number, number][] = [[14, 12], [30, 13], [11, 21], [36, 6]];
  gens.forEach(([gx, gy], i) => {
    spawns.push({ kind: 'generator', x: gx, y: gy, enemyId: o.foes[i % o.foes.length], interval: 5200, maxAlive: 3, hp: 32 });
  });

  // treasure: locked chests in the alcove (each yields themed, graded gear) +
  // one iron key per chest scattered through the cave (a Thief picks them free).
  o.chestItems.forEach((itemId, i) => spawns.push({ kind: 'chest', x: 38 + i * 2, y: 4, itemId }));
  for (const [kx, ky] of [[15, 21], [16, 10], [33, 14]] as [number, number][])
    spawns.push({ kind: 'key', x: kx, y: ky });
  for (const [cx, cy] of [[34, 3], [41, 8]] as [number, number][]) pickups.push({ kind: 'coin', x: cx, y: cy, coin: 60 });

  // examinable lore stone + atmospheric clutter
  decor.push({ x: 16, y: 9, key: 'gravestone' });
  decor.push({ x: 35, y: 9, key: 'crystal' });
  decor.push({ x: 26, y: 17, key: 'crystal' });
  for (const [bx, by] of [[12, 16], [20, 11], [28, 15], [33, 8], [22, 19], [15, 13]] as [number, number][])
    decor.push({ x: bx, y: by, key: by % 2 ? 'bones' : 'rubble' });

  return {
    id: o.id,
    name: o.name,
    width: W,
    height: H,
    tiles,
    spawns,
    pickups,
    decor,
    theme: o.theme,
    ambientColor: o.ambientColor,
    cave: true,
    subtitle: o.subtitle,
    chapter: o.chapter,
    story: o.story,
  };
}

export const CAVE_MINE = buildCave({
  id: 'cave_mine',
  name: 'The Collapsed Silver Mine',
  theme: 'crypt',
  ambientColor: 0x0c0a08,
  foes: ['grunt', 'bone_archer', 'brute'],
  chestItems: ['scroll_mending', 'mana_potion', 'town_portal_scroll'],
  subtitle: 'Cart tracks vanish into the dark.',
  chapter: 'Cave — Silver Mine',
  story:
    'The boarded mouth gives way to old cart rails and the reek of cold iron. They dug too deep here, even before the Undermaw stirred — and what the miners woke never let them leave. Their picks still ring somewhere in the dark.',
});

export const CAVE_HOLLOW = buildCave({
  id: 'cave_hollow',
  name: 'The Hollow Beneath',
  theme: 'shadow',
  ambientColor: 0x08070d,
  foes: ['shadow_stalker', 'void_imp', 'ghost'],
  chestItems: ['scroll_renewal', 'health_potion', 'town_portal_scroll'],
  subtitle: 'The dark here is hungry.',
  chapter: 'Cave — The Hollow',
  story:
    'A tendril of the Undermaw has found the surface and curls through this hollow like a held breath. The air drinks your torchlight. Whatever waits in the deep alcove has been waiting a very long time — claim its hoard and climb back to the sun.',
});

export const CAVES: Record<string, LevelData> = {
  cave_mine: CAVE_MINE,
  cave_hollow: CAVE_HOLLOW,
};
