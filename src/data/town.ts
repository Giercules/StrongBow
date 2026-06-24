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

export function buildTown(): LevelData {
  const W = 104;
  const H = 76;
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

  rect(3, 3, W - 4, H - 4, Tile.WATER);
  rect(5, 5, W - 6, H - 6, Tile.FLOOR);

  const cx = Math.floor(W / 2);
  const cy = Math.floor(H / 2);

  type Gate = { gx: number; gy: number; bridge: [number, number][]; label: string };
  const gates: Gate[] = [];
  for (const bx of [cx - 1, cx, cx + 1]) {
    setT(bx, 3, Tile.FLOOR);
    setT(bx, 4, Tile.FLOOR);
    setT(bx, H - 5, Tile.FLOOR);
    setT(bx, H - 4, Tile.FLOOR);
  }
  for (const by of [cy - 1, cy, cy + 1]) {
    setT(3, by, Tile.FLOOR);
    setT(4, by, Tile.FLOOR);
    setT(W - 5, by, Tile.FLOOR);
    setT(W - 4, by, Tile.FLOOR);
  }
  for (const bx of [cx - 1, cx, cx + 1]) {
    rect(bx, 0, bx, 2, Tile.FLOOR);
    rect(bx, H - 3, bx, H - 1, Tile.FLOOR);
  }
  for (const by of [cy - 1, cy, cy + 1]) {
    rect(0, by, 2, by, Tile.FLOOR);
    rect(W - 3, by, W - 1, by, Tile.FLOOR);
  }
  const plank = (x: number, y: number) => {
    decor.push({ x, y, key: 'bridge-plank' });
    mark(noFoliage, x, y);
    mark(roadSet, x, y);
  };
  for (const bx of [cx - 1, cx, cx + 1]) {
    plank(bx, 3); plank(bx, 4);
    plank(bx, H - 5); plank(bx, H - 4);
  }
  for (const by of [cy - 1, cy, cy + 1]) {
    plank(3, by); plank(4, by);
    plank(W - 5, by); plank(W - 4, by);
  }
  decor.push({ x: cx - 2, y: H - 5, key: 'chain' });
  decor.push({ x: cx + 2, y: H - 5, key: 'chain' });
  decor.push({ x: cx - 2, y: H - 4, key: 'chain' });
  decor.push({ x: cx + 2, y: H - 4, key: 'chain' });
  decor.push({ x: cx, y: 1, key: 'town-gate' });
  decor.push({ x: cx, y: H - 2, key: 'town-gate' });
  decor.push({ x: 1, y: cy, key: 'town-gate' });
  decor.push({ x: W - 2, y: cy, key: 'town-gate' });
  gates.push({ gx: cx, gy: 1, bridge: [], label: 'North Road' });

  const house = (x0: number, y0: number, x1: number, y1: number, roofKey: string) => {
    rect(x0, y0, x1, y1, Tile.WALL);
    const doorX = Math.floor((x0 + x1) / 2);
    // facade: a header beam under the eaves, timber corner posts, glazed windows
    // on two courses, and a stone ground-floor base.
    for (let y = y0 + 1; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const edge = x === x0 || x === x1;
        let key = 'house-wall';
        if (y === y1) key = 'house-base';
        else if (y === y0 + 1) key = 'house-beam';
        else if (edge) key = 'house-post';
        if ((y === y0 + 3 || y === y0 + 5) && !edge && (x - x0) % 2 === 1) key = 'house-window';
        decor.push({ x, y, key });
      }
    }
    // pitched roof across the top course; door overlaid on the stone base
    for (let x = x0; x <= x1; x++) decor.push({ x, y: y0, key: roofKey });
    decor.push({ x: doorX, y: y1, key: 'house-door' });
    for (let y = y0 - 1; y <= y1 + 1; y++) for (let x = x0 - 1; x <= x1 + 1; x++) mark(noFoliage, x, y);
  };

  house(16, 11, 26, 18, 'house-roof-teak');
  decor.push({ x: 21, y: 11, key: 'banner' });
  spawns.push({ kind: 'merchant', shop: 'blacksmith', x: 21, y: 20, label: "Brunda's Forge" });

  house(33, 11, 43, 18, 'house-roof-green');
  decor.push({ x: 38, y: 11, key: 'banner' });
  spawns.push({ kind: 'merchant', shop: 'apothecary', x: 38, y: 20, label: 'The Green Vial' });

  house(64, 11, 76, 19, 'house-roof-red');
  decor.push({ x: 70, y: 11, key: 'banner' });
  spawns.push({ kind: 'merchant', shop: 'tavern', x: 70, y: 21, label: 'The Gilded Tankard' });

  house(82, 11, 92, 19, 'house-roof-blue');
  decor.push({ x: 87, y: 11, key: 'banner' });
  spawns.push({ kind: 'merchant', shop: 'home', x: 87, y: 21, label: 'Your Lodge' });

  house(20, 54, 28, 60, 'house-roof-red');
  house(80, 54, 90, 60, 'house-roof-green');

  for (const bx of [15, 28, 32, 45, 62, 78, 81, 94]) decor.push({ x: bx, y: 20, key: 'brazier' });

  const fcx = cx; // fountain centred on the plaza
  const fcy = cy;
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
    decor.push({ x: px, y: py, key: 'pillar' });
  decor.push({ x: fcx, y: fcy, key: 'fountain' });

  const roadTile = (x: number, y: number) => {
    if (!inB(x, y) || tiles[y][x] !== Tile.FLOOR) return;
    const k = `${x},${y}`;
    if (roadSet.has(k)) return;
    roadSet.add(k);
    decor.push({ x, y, key: 'road' });
    mark(noFoliage, x, y);
  };
  for (let y = 5; y <= H - 6; y++) {
    roadTile(cx, y);
    roadTile(cx + 1, y);
  }
  for (let x = 5; x <= W - 6; x++) {
    roadTile(x, fcy);
    roadTile(x, fcy + 1);
  }

  const xs = [24, 39, 54, 69, 84];
  REALMS.forEach((r, i) => {
    const x = xs[i % 5];
    const y = i < 5 ? 27 : 58;
    spawns.push({ kind: 'portal', realmId: r.id, label: r.name, x, y });
    decor.push({ x: x - 2, y: y - 1, key: 'brazier' });
    decor.push({ x: x + 2, y: y - 1, key: 'brazier' });
    mark(noFoliage, x, y);
  });

  spawns.push({ kind: 'playerStart', x: 54, y: 49 });

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
  for (const [bx, by] of [
    [fcx - 9, fcy], [fcx + 9, fcy], [fcx, fcy + 9], [fcx, fcy - 9],
    [30, 31], [78, 31], [30, 54], [78, 54], [48, 44], [60, 44],
  ] as [number, number][]) {
    bush(bx, by);
  }

  for (let y = 6; y < H - 6; y++) {
    for (let x = 6; x < W - 6; x++) {
      if (!foliageOk(x, y)) continue;
      if ((x * 13 + y * 29) % 17 === 0) decor.push({ x, y, key: 'grass-tuft' });
    }
  }

  const folk: [number, number, string, string][] = [
    [32, 32, 'Old Maren', 'a stooped flower-seller'],
    [74, 32, 'Crier Bom', 'the booming town crier'],
    [46, 45, 'Sister Vael', 'a road-worn pilgrim of the light'],
    [62, 47, 'Garrick', 'an off-duty city watchman'],
    [28, 53, 'Pib', 'a wandering lute-player'],
    [80, 53, 'Hesh', 'a hooded fortune-teller'],
    [54, 62, 'Tomas', 'a nervous merchant down on his luck'],
  ];
  folk.forEach(([x, y, label, role]) => spawns.push({ kind: 'npc', x, y, label, npcRole: role }));

  for (const [x, y] of [
    [50, 52],
    [58, 52],
    [52, 55],
    [56, 55],
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
      'Welcome to Hearthwatch. Arm yourself at the forge, stock potions at the apothecary, take counsel in the tavern, and rest at your lodge — then cross a bridge and step through a gate to descend into the Undermaw.',
  };
}

export const TOWN = buildTown();
