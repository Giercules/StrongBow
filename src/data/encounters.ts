import { Tile } from '../core/constants';
import type { LevelData, SpawnDef, DecorDef, EnemyId } from '../core/types';
import type { Biome } from './overworld';

// ----------------------------------------------------------------------------
// Overworld combat encounters. Travelling the Wilds fills a hidden danger meter
// (weighted by biome, difficulty and party level); when it trips, the party is
// swept into a one-off, biome-themed battle ARENA — a bounded clearing they must
// fight clear before returning to the exact tile the ambush sprang from. The
// arena reuses the whole real-time combat engine (see DungeonScene.arena paths).
// ----------------------------------------------------------------------------

export interface EncounterSpec {
  biome: Biome;
  foes: EnemyId[];
  elite: boolean;
  ambush: boolean;
  level: number;
  name: string;
  flavor: string;
}

// Rosters drawn from the campaign's proven core foes, flavoured per biome.
const BIOME_ROSTER: Record<Biome, EnemyId[]> = {
  plains: ['grunt', 'bone_archer', 'ghost'],
  forest: ['grunt', 'brute', 'bone_archer'],
  mountain: ['brute', 'grunt', 'bone_archer'],
  desert: ['imp', 'brute', 'demon'],
  swamp: ['ghost', 'imp', 'demon'],
};
// How dangerous each biome feels — scales both encounter rate and pack size.
export const BIOME_DANGER: Record<Biome, number> = {
  plains: 1.0, forest: 1.35, mountain: 1.55, desert: 1.95, swamp: 2.3,
};
const BIOME_NAME: Record<Biome, string> = {
  plains: 'the open plains', forest: 'the deep wood', mountain: 'the high crags',
  desert: 'the deep desert', swamp: 'the black mire',
};
const BIOME_GROUND: Record<Biome, number> = {
  plains: Tile.GRASS, forest: Tile.GRASS, mountain: Tile.ROCK, desert: Tile.SAND, swamp: Tile.MUD,
};
const BIOME_AMBIENT: Record<Biome, number> = {
  plains: 0x121a26, forest: 0x0e1a12, mountain: 0x15161f, desert: 0x241a10, swamp: 0x0d1712,
};
const BIOME_PROPS: Record<Biome, string[]> = {
  plains: ['pine', 'gnarled-oak', 'wildflowers'],
  forest: ['gnarled-oak', 'pine', 'boulder'],
  mountain: ['boulder', 'pine', 'standing-stone'],
  desert: ['desert-tree', 'boulder'],
  swamp: ['swamp-cypress', 'reeds'],
};

function lcg(seed: number): () => number {
  let s = (seed >>> 0) || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

/** Roll a pack for the given biome, difficulty (enemy multiplier) and party level.
 *  Count is deliberately a bit random so no two ambushes feel identical. */
export function rollEncounter(biome: Biome, difficultyMult: number, partyLevel: number, rng: () => number = Math.random): EncounterSpec {
  const roster = BIOME_ROSTER[biome];
  const danger = BIOME_DANGER[biome];
  const base = danger * 1.7 + partyLevel * 0.12 + rng() * 2.4;
  const count = Math.max(1, Math.min(8, Math.round(base * difficultyMult)));
  const ambush = biome === 'swamp' ? rng() < 0.5 : rng() < 0.16;
  const elite = count >= 3 && rng() < 0.24;
  const foes: EnemyId[] = [];
  for (let i = 0; i < count; i++) foes.push(roster[Math.floor(rng() * roster.length)]);
  const place = BIOME_NAME[biome];
  const name = ambush ? `Ambush in ${place}` : elite ? `A champion prowls ${place}` : `A pack blocks the road`;
  const flavor = ambush
    ? `Something breaks cover in ${place} — no quarter, no warning.`
    : elite
    ? `A champion and its pack bar the way through ${place}.`
    : `${count} foes rise up out of ${place} to bar the road.`;
  return { biome, foes, elite, ambush, level: partyLevel, name, flavor };
}

/** Build the bounded biome clearing the encounter is fought in. Re-registered
 *  under a fixed id each trigger (see DungeonScene.triggerEncounter). */
export function buildArena(spec: EncounterSpec, seed: number): LevelData {
  const W = 48, H = 34;
  const g = BIOME_GROUND[spec.biome];
  const rng = lcg(seed);
  const tiles: number[][] = [];
  for (let y = 0; y < H; y++) {
    const row: number[] = new Array(W);
    for (let x = 0; x < W; x++) row[x] = x < 2 || y < 2 || x >= W - 2 || y >= H - 2 ? Tile.VOID : g;
    tiles.push(row);
  }
  const decor: DecorDef[] = [];
  const props = BIOME_PROPS[spec.biome];
  const prop = () => props[Math.floor(rng() * props.length)];
  const cx = Math.floor(W / 2);
  // a natural tree/rock ring just inside the void edge (with a gap at the
  // bottom-centre where the party enters and can retreat).
  for (let x = 3; x <= W - 4; x += 2) {
    decor.push({ x, y: 2, key: prop() });
    if (Math.abs(x - cx) > 3) decor.push({ x, y: H - 3, key: prop() });
  }
  for (let y = 4; y <= H - 5; y += 2) { decor.push({ x: 2, y, key: prop() }); decor.push({ x: W - 3, y, key: prop() }); }
  // a little scattered cover in the mid-field (kept off the centre lane)
  for (let i = 0; i < 7; i++) {
    const x = 6 + Math.floor(rng() * (W - 12));
    const y = 8 + Math.floor(rng() * (H - 18));
    if (Math.abs(x - cx) < 4) continue;
    decor.push({ x, y, key: prop() });
  }

  const spawns: SpawnDef[] = [{ kind: 'playerStart', x: cx, y: H - 6 }];

  return {
    id: 'encounter_arena',
    name: spec.name,
    width: W,
    height: H,
    tiles,
    spawns,
    pickups: [],
    decor,
    ambientColor: BIOME_AMBIENT[spec.biome],
    arena: true,
    arenaFoes: spec.foes,
    arenaElite: spec.elite,
    arenaAmbush: spec.ambush,
    arenaBiomeName: BIOME_NAME[spec.biome],
    arenaLevel: spec.level,
    subtitle: spec.flavor,
    chapter: 'Encounter',
    story: spec.flavor,
  };
}
