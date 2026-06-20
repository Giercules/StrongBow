import { buildDungeon } from './levelGen';

// Four themed levels built on the extended generator. Each leans on its theme
// for hazard, enemies, boss, room shapes, decor and set-pieces; only the
// identity, size and loot are specified here.

// ---- The Frozen Cathedral: icy halls, archer choirs, frozen altars ----
export const LEVEL_FROST = buildDungeon({
  id: 'frozen_cathedral',
  name: 'The Frozen Cathedral',
  seed: 0x1ce9a3,
  width: 124,
  height: 88,
  cols: 5,
  rows: 4,
  theme: 'frost',
  chestItems: ['shade_cloak', 'oak_staff', 'warding_ring'],
  maxGenerators: 6,
});

// ---- The Toxic Undercroft: plague sludge, pillared mazes, brute swarms ----
export const LEVEL_TOXIC = buildDungeon({
  id: 'toxic_undercroft',
  name: 'The Toxic Undercroft',
  seed: 0x70a1c5,
  width: 132,
  height: 92,
  cols: 5,
  rows: 4,
  theme: 'toxic',
  chestItems: ['hunters_bow', 'leather_jerkin', 'amulet_of_focus'],
  maxGenerators: 7,
});

// ---- The Clockwork Vault: spike gauntlets, treasure vaults, guardians ----
export const LEVEL_CLOCKWORK = buildDungeon({
  id: 'clockwork_vault',
  name: 'The Clockwork Vault',
  seed: 0xc0c0a7,
  width: 120,
  height: 84,
  cols: 5,
  rows: 4,
  theme: 'clockwork',
  chestItems: ['iron_sword', 'crypt_plate', 'warding_ring'],
  maxGenerators: 6,
});

// ---- The Blood Arena: open rings, wave pits, a boss gauntlet ----
export const LEVEL_ARENA = buildDungeon({
  id: 'blood_arena',
  name: 'The Blood Arena',
  seed: 0xb10043,
  width: 128,
  height: 96,
  cols: 5,
  rows: 4,
  theme: 'arena',
  chestItems: ['ember_blade', 'iron_sword', 'amulet_of_focus'],
  maxGenerators: 7,
});
