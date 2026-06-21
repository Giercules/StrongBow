import { buildDungeon } from './levelGen';

// Chapters III–X of the Descent into the Undermaw. Each leans on its theme for
// hazard, enemies, boss, room shapes, decor and set-pieces; only identity, size,
// difficulty and story beats are specified here. Bosses come from the theme.

// ---- Chapter III — The Frozen Cathedral ----
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
  maxGenerators: 7,
  chapter: 'Chapter III',
  subtitle: 'Frostbound nave of the shattered choir.',
  story:
    'The descent freezes over. In the Frozen Cathedral the shattered choir still sings — silence the Rime Cantor before its hymn wakes the deep.',
});

// ---- Chapter IV — The Toxic Undercroft ----
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
  chapter: 'Chapter IV',
  subtitle: 'Plague-drowned vaults beneath the city.',
  story:
    'The ice gives way to rot. Wade the Toxic Undercroft and end the Rot Sovereign before its plague climbs back to the surface.',
});

// ---- Chapter V — The Clockwork Vault ----
export const LEVEL_CLOCKWORK = buildDungeon({
  id: 'clockwork_vault',
  name: 'The Clockwork Vault',
  seed: 0xc0c0a7,
  width: 128,
  height: 88,
  cols: 5,
  rows: 4,
  theme: 'clockwork',
  chestItems: ['iron_sword', 'crypt_plate', 'warding_ring'],
  maxGenerators: 8,
  chapter: 'Chapter V',
  subtitle: 'The guarded treasury of gears and greed.',
  story:
    'A vault of brass and greed bars the way down. Tear through the Clockwork Vault and break Brass Magnus, the final lock on the descent.',
});

// ---- Chapter VI — The Blood Arena ----
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
  maxGenerators: 8,
  chapter: 'Chapter VI',
  subtitle: 'Bleed for the roar of the crowd.',
  story:
    'The hunger built a Blood Arena to feed on the fallen. Win the pit, then put down its Undying Champion before the gate below will open.',
});

// ---- Chapter VII — The Drowned Bog ----
export const LEVEL_BOG = buildDungeon({
  id: 'drowned_bog',
  name: 'The Drowned Bog',
  seed: 0xb09a11,
  width: 136,
  height: 96,
  cols: 5,
  rows: 4,
  theme: 'bog',
  chestItems: ['hunters_bow', 'crypt_plate', 'amulet_of_focus'],
  maxGenerators: 8,
  chapter: 'Chapter VII',
  subtitle: 'The marsh remembers everyone it swallowed.',
  story:
    'Beneath the arena spreads a Drowned Bog that swallows all who enter. Cross the black water and harpoon the Mire Leviathan in its depths.',
});

// ---- Chapter VIII — The Storm Spire ----
export const LEVEL_STORM = buildDungeon({
  id: 'storm_spire',
  name: 'The Storm Spire',
  seed: 0x57012e,
  width: 132,
  height: 96,
  cols: 5,
  rows: 4,
  theme: 'storm',
  chestItems: ['shade_cloak', 'oak_staff', 'amulet_of_focus'],
  maxGenerators: 9,
  chapter: 'Chapter VIII',
  subtitle: 'Climb into the eye of the endless gale.',
  story:
    'A Storm Spire pierces up through the dark, crackling with stolen sky. Climb it against the gale and ground the Tempest Herald at its peak.',
});

// ---- Chapter IX — The Shadow Warren ----
export const LEVEL_SHADOW = buildDungeon({
  id: 'shadow_warren',
  name: 'The Shadow Warren',
  seed: 0x5ad000,
  width: 140,
  height: 100,
  cols: 5,
  rows: 4,
  theme: 'shadow',
  chestItems: ['shade_cloak', 'ember_blade', 'amulet_of_focus'],
  maxGenerators: 9,
  chapter: 'Chapter IX',
  subtitle: 'Where the light goes to be eaten.',
  story:
    'Now the light itself begins to fail. Brave the Shadow Warren and cut down the Umbral Devourer that feeds on every flame you carry.',
});

// ---- Chapter X — Sanctum of the Undermaw (finale) ----
export const LEVEL_SANCTUM = buildDungeon({
  id: 'undermaw_sanctum',
  name: 'Sanctum of the Undermaw',
  seed: 0x0d00d1,
  width: 140,
  height: 104,
  cols: 5,
  rows: 4,
  theme: 'sanctum',
  chestItems: ['crypt_plate', 'ember_blade', 'amulet_of_focus'],
  maxGenerators: 10,
  chapter: 'Chapter X',
  subtitle: 'The last door before the hunger itself.',
  story:
    'One door remains. In the Sanctum of the Undermaw, slay the Hollow King and seal the hunger forever — before it wakes the world entire.',
});
