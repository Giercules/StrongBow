import { Tile } from '../core/constants';
import type { LevelData, SpawnDef, PickupDef, DecorDef } from '../core/types';

// ----------------------------------------------------------------------------
// Hearthwatch — the town-square hub. Hand-built (not procedurally generated):
// a sunlit cobbled plaza ringed by shops, a tavern and the party's lodge, with
// a central fountain and TEN descent portals (one per realm) that unlock as the
// campaign is cleared. The player starts here; clearing a realm returns here.
// ----------------------------------------------------------------------------

// Realm ids MUST match Content.levels keys / Content.levelOrder.
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

export function buildTown(): LevelData {
  const W = 88;
  const H = 60;
  const tiles: number[][] = [];
  for (let y = 0; y < H; y++) tiles.push(new Array(W).fill(Tile.WALL));
  const decor: DecorDef[] = [];
  const spawns: SpawnDef[] = [];
  const pickups: PickupDef[] = [];

  const inB = (x: number, y: number) => x > 0 && y > 0 && x < W - 1 && y < H - 1;
  const setT = (x: number, y: number, t: number) => {
    if (inB(x, y)) tiles[y][x] = t;
  };
  const rect = (x0: number, y0: number, x1: number, y1: number, t: number) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) setT(x, y, t);
  };

  // open cobbled plaza inside the town wall
  rect(2, 2, W - 3, H - 3, Tile.FLOOR);

  // ---- buildings (solid blocks) along the north edge; keepers stand out front ----
  // blacksmith
  rect(6, 3, 16, 10, Tile.WALL);
  decor.push({ x: 11, y: 3, key: 'banner' });
  spawns.push({ kind: 'merchant', shop: 'blacksmith', x: 11, y: 12, label: "Brunda's Forge" });
  // apothecary
  rect(23, 3, 33, 10, Tile.WALL);
  decor.push({ x: 28, y: 3, key: 'banner' });
  spawns.push({ kind: 'merchant', shop: 'apothecary', x: 28, y: 12, label: 'The Green Vial' });
  // tavern
  rect(54, 3, 66, 11, Tile.WALL);
  decor.push({ x: 60, y: 3, key: 'banner' });
  spawns.push({ kind: 'merchant', shop: 'tavern', x: 60, y: 13, label: 'The Gilded Tankard' });
  // party lodge (home)
  rect(72, 3, 82, 11, Tile.WALL);
  decor.push({ x: 77, y: 3, key: 'banner' });
  spawns.push({ kind: 'merchant', shop: 'home', x: 77, y: 13, label: 'Your Lodge' });

  // braziers lighting the shop frontage
  for (const bx of [5, 18, 22, 35, 52, 68, 71, 84]) decor.push({ x: bx, y: 12, key: 'brazier' });

  // ---- central fountain: a ring of water with corner pillars ----
  const fcx = 44;
  const fcy = 28;
  for (let dy = -3; dy <= 3; dy++)
    for (let dx = -4; dx <= 4; dx++) {
      if ((dx * dx) / 16 + (dy * dy) / 9 <= 1) setT(fcx + dx, fcy + dy, Tile.WATER);
    }
  for (const [px, py] of [
    [fcx - 6, fcy - 4],
    [fcx + 6, fcy - 4],
    [fcx - 6, fcy + 4],
    [fcx + 6, fcy + 4],
  ] as [number, number][])
    decor.push({ x: px, y: py, key: 'pillar' });
  decor.push({ x: fcx, y: fcy - 6, key: 'candle' });

  // ---- 10 descent portals: row of 5 north of the fountain, row of 5 south ----
  const xs = [14, 29, 44, 59, 74];
  REALMS.forEach((r, i) => {
    const x = xs[i % 5];
    const y = i < 5 ? 19 : 50;
    spawns.push({ kind: 'portal', realmId: r.id, label: r.name, x, y });
    decor.push({ x: x - 2, y: y - 1, key: 'brazier' });
    decor.push({ x: x + 2, y: y - 1, key: 'brazier' });
  });

  // ---- party start (between the fountain and the southern gates) ----
  spawns.push({ kind: 'playerStart', x: 44, y: 41 });

  // ---- townsfolk who wander the square and can be hailed (AI-flavoured) ----
  const folk: [number, number, string, string][] = [
    [22, 24, 'Old Maren', 'a stooped flower-seller'],
    [64, 24, 'Crier Bom', 'the booming town crier'],
    [36, 37, 'Sister Vael', 'a road-worn pilgrim of the light'],
    [52, 39, 'Garrick', 'an off-duty city watchman'],
    [18, 45, 'Pib', 'a wandering lute-player'],
    [70, 45, 'Hesh', 'a hooded fortune-teller'],
    [44, 48, 'Tomas', 'a nervous merchant down on his luck'],
  ];
  folk.forEach(([x, y, label, role]) => spawns.push({ kind: 'npc', x, y, label, npcRole: role }));

  // ---- a small welcome purse so the shops are usable from the very start ----
  for (const [x, y] of [
    [40, 44],
    [48, 44],
    [42, 47],
    [46, 47],
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
    chapter: 'Town Square',
    story:
      'Welcome to Hearthwatch. Arm yourself at the forge, stock potions at the apothecary, take counsel in the tavern, and rest at your lodge — then step through a gate to descend into the Undermaw.',
  };
}

export const TOWN = buildTown();
