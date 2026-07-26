// ----------------------------------------------------------------------------
// StrongBow -- master palette
// A cohesive arcade dungeon palette. All art references these so the whole
// game stays colour-consistent. Values are 0xRRGGBB (or '#rrggbb' strings).
// ----------------------------------------------------------------------------
import type { ThemeId } from '../core/types';

export const C = {
  // ---- Floors (warm dithered stone) ----
  floor0: '#2a1d12',
  floor1: '#3a2817',
  floor2: '#4a341f',
  floor3: '#5c4227',
  floorHi: '#6f5230',
  floorCrack: '#1c130b',
  floorMoss: '#3c4a26',

  // ---- Walls (cold lit brick) ----
  wallDark: '#0c1430',
  wallBase: '#1b2a55',
  wallMid: '#2c4080',
  wallLit: '#4a63b0',
  wallHi: '#7d96d8',
  wallTopDark: '#14224a',
  wallTopLit: '#5570c0',
  wallMortar: '#070b1c',

  // ---- Doors ----
  doorWood: '#5a3a1c',
  doorWoodHi: '#7a5128',
  doorIron: '#3a3f52',
  doorLock: '#e0b03a',
  doorLockDark: '#9a7320',

  // ---- Hazards ----
  waterDark: '#0e2940',
  waterMid: '#155074',
  waterHi: '#2f86b5',
  waterFoam: '#a9e3ff',
  lavaDark: '#5a1500',
  lavaMid: '#c43c06',
  lavaHi: '#ff8a1e',
  lavaWhite: '#ffd98a',
  iceDark: '#2a4a66',
  iceMid: '#6fb0d8',
  iceHi: '#bfe9ff',
  iceWhite: '#f2fbff',
  poisonDark: '#16331c',
  poisonMid: '#3f8a3a',
  poisonHi: '#8ce05a',
  poisonGas: '#b6f06a',
  spikeBase: '#1a2030',
  spikeSteel: '#8b94a8',
  spikeHi: '#dfe6ff',
  spikeBlood: '#a01818',

  // ---- Themed decor ----
  crystal: '#7fe4ff',
  crystalHi: '#dffaff',
  crystalDk: '#2f6f9a',
  cog: '#9a7b3a',
  cogHi: '#e6c264',
  cogDk: '#4a3812',
  vine: '#3f7a34',
  vineHi: '#7fce58',
  bloodDark: '#5a0e0e',
  bloodMid: '#9c1818',

  // ---- Exit portal ----
  portal0: '#1a0a3a',
  portal1: '#4a18a8',
  portal2: '#8a3cff',
  portal3: '#c79bff',
  portalCore: '#ffffff',

  // ---- Shadow / vignette ----
  shadow: '#000000',

  // ---- Gold / loot / coins ----
  coinDark: '#9a6e10',
  coinMid: '#e0a81e',
  coinHi: '#ffe27a',
  gem: '#39e0d0',

  // ---- FX ----
  magicCore: '#ffffff',
  magicHot: '#c79bff',
  magicMid: '#7a3cff',
  magicEdge: '#3a18a8',
  fireCore: '#fff2b0',
  fireMid: '#ff8a1e',
  fireEdge: '#c43c06',
  spark: '#ffe27a',
  heal: '#7cf08a',
  allyAura: '#5fe0a0',

  // ---- Torch ----
  torchWood: '#3a2614',
  torchFlame0: '#ffd98a',
  torchFlame1: '#ff8a1e',
  torchFlame2: '#c43c06',

  // ---- UI chrome (arcade cabinet: deep navy + hot gold + neon status) ----
  hudBg: '#03050c',
  hudPanel: '#0a1020',
  hudPanel2: '#121c36',
  hudBorder: '#ffd24a',
  hudBorderDk: '#8a6418',
  hudNeon: '#fff0b8',
  ivy: '#2f9a48',
  ivyHi: '#5ee06a',
  ink: '#f4f7ff',
  inkDim: '#9aa6d0',
  hpFull: '#3dff6a',
  hpMid: '#ffd020',
  hpLow: '#ff3a3a',
  manaFill: '#4ab8ff',
  xpFill: '#d898ff',
} as const;

// ----------------------------------------------------------------------------
// Per-theme tile palettes — give every level its own walls, floors and the 3D
// wall front-face overhang colour so no two themes look alike.
// ----------------------------------------------------------------------------
export interface WallColors {
  base: string;
  mortar: string;
  mid: string;
  lit: string;
  hi: string;
  dark: string;
  topLit: string;
  topDark: string;
}
export interface FloorColors {
  f0: string;
  f1: string;
  f2: string;
  f3: string;
  hi: string;
  crack: string;
  moss: string;
}
/** Colours for the faux-3D wall front face drawn under each wall in the scene. */
export interface FaceColors {
  main: string;
  top: string;
  upper: string;
  lower: string;
  line: string;
}
export interface ThemeArt {
  wall: WallColors;
  floor: FloorColors;
  face: FaceColors;
}

export const DEFAULT_WALL: WallColors = {
  base: C.wallBase,
  mortar: C.wallMortar,
  mid: C.wallMid,
  lit: C.wallLit,
  hi: C.wallHi,
  dark: C.wallDark,
  topLit: C.wallTopLit,
  topDark: C.wallTopDark,
};
export const DEFAULT_FLOOR: FloorColors = {
  f0: C.floor0,
  f1: C.floor1,
  f2: C.floor2,
  f3: C.floor3,
  hi: C.floorHi,
  crack: C.floorCrack,
  moss: C.floorMoss,
};
const DEFAULT_FACE: FaceColors = {
  main: '#16234a',
  top: '#7d96d8',
  upper: '#2c4080',
  lower: '#1b2a55',
  line: '#070b1c',
};

export const THEME_ART: Record<ThemeId, ThemeArt> = {
  crypt: {
    wall: DEFAULT_WALL,
    floor: DEFAULT_FLOOR,
    face: DEFAULT_FACE,
  },
  molten: {
    wall: { base: '#4a1810', mortar: '#1a0604', mid: '#6e2412', lit: '#a83a14', hi: '#ff7a28', dark: '#240806', topLit: '#c04a18', topDark: '#2e0c08' },
    floor: { f0: '#1a0a06', f1: '#2e120c', f2: '#4a1e12', f3: '#6a2c16', hi: '#a84820', crack: '#100404', moss: '#7a3010' },
    face: { main: '#2e0c08', top: '#ff7a28', upper: '#6e2412', lower: '#4a1810', line: '#140404' },
  },
  frost: {
    wall: { base: '#2e5278', mortar: '#0a1e32', mid: '#4a7aa8', lit: '#7eb8e0', hi: '#e8f6ff', dark: '#142840', topLit: '#8ec8f0', topDark: '#1e3a58' },
    floor: { f0: '#162838', f1: '#243e52', f2: '#3a5e78', f3: '#527a96', hi: '#9ec8e8', crack: '#0e1c28', moss: '#4a8090' },
    face: { main: '#1a3850', top: '#e8f6ff', upper: '#4a7aa8', lower: '#2e5278', line: '#0a1a2c' },
  },
  toxic: {
    wall: { base: '#284a24', mortar: '#0a180a', mid: '#3e6a32', lit: '#68a048', hi: '#b8f060', dark: '#122010', topLit: '#5a9040', topDark: '#1a2e16' },
    floor: { f0: '#121e0c', f1: '#1e3016', f2: '#2e4a22', f3: '#426a2e', hi: '#7ab848', crack: '#0a1206', moss: '#8ce05a' },
    face: { main: '#1a2e12', top: '#b8f060', upper: '#3e6a32', lower: '#284a24', line: '#081208' },
  },
  clockwork: {
    wall: { base: '#423828', mortar: '#120e08', mid: '#6a5630', lit: '#a0803c', hi: '#ffe070', dark: '#1e1810', topLit: '#c09840', topDark: '#2e2414' },
    floor: { f0: '#1a1a18', f1: '#282826', f2: '#3a3a36', f3: '#52524c', hi: '#8a8a78', crack: '#0e0e0c', moss: '#8a6e30' },
    face: { main: '#2a2014', top: '#ffe070', upper: '#6a5630', lower: '#423828', line: '#100c06' },
  },
  arena: {
    wall: { base: '#563e28', mortar: '#1a1008', mid: '#7e5e38', lit: '#b08850', hi: '#f0d090', dark: '#2e2014', topLit: '#c09858', topDark: '#3a2818' },
    floor: { f0: '#2a1e14', f1: '#3e2c1c', f2: '#524028', f3: '#6a5434', hi: '#a08050', crack: '#180e08', moss: '#9a2820' },
    face: { main: '#3a2818', top: '#f0d090', upper: '#7e5e38', lower: '#563e28', line: '#140c06' },
  },
  bog: {
    wall: { base: '#28382a', mortar: '#08120c', mid: '#3e5434', lit: '#5e7a44', hi: '#9ec868', dark: '#121c14', topLit: '#52703c', topDark: '#1c2a1c' },
    floor: { f0: '#121a14', f1: '#1c281c', f2: '#2c3c28', f3: '#3e5240', hi: '#6a8a48', crack: '#080e08', moss: '#5a9a40' },
    face: { main: '#18281c', top: '#9ec868', upper: '#3e5434', lower: '#28382a', line: '#061008' },
  },
  storm: {
    wall: { base: '#2e3460', mortar: '#0a0c20', mid: '#4a5288', lit: '#7a88c8', hi: '#c8dcff', dark: '#161830', topLit: '#6a78b8', topDark: '#202448' },
    floor: { f0: '#14162c', f1: '#20243c', f2: '#303650', f3: '#464c68', hi: '#7a88b8', crack: '#0c0c1a', moss: '#4a5aa0' },
    face: { main: '#1c2040', top: '#c8dcff', upper: '#4a5288', lower: '#2e3460', line: '#0a0c1a' },
  },
  shadow: {
    wall: { base: '#2a1e3a', mortar: '#08060e', mid: '#3e2e58', lit: '#5e4a80', hi: '#a888d8', dark: '#120c1e', topLit: '#523a70', topDark: '#1a1230' },
    floor: { f0: '#100c18', f1: '#1a1428', f2: '#261e38', f3: '#3a2e50', hi: '#5e4a80', crack: '#06040c', moss: '#4a3070' },
    face: { main: '#160e24', top: '#a888d8', upper: '#3e2e58', lower: '#2a1e3a', line: '#060410' },
  },
  sanctum: {
    wall: { base: '#5e5440', mortar: '#1c180e', mid: '#827456', lit: '#b8a878', hi: '#fff0b8', dark: '#362e20', topLit: '#a09068', topDark: '#403828' },
    floor: { f0: '#2a261c', f1: '#3e3a2c', f2: '#524c38', f3: '#6a6248', hi: '#b0a070', crack: '#18140c', moss: '#d0a830' },
    face: { main: '#403828', top: '#fff0b8', upper: '#827456', lower: '#5e5440', line: '#141008' },
  },
  // Town square — sunlit lawns of green grass (roads are stamped as decor on top).
  town: {
    wall: { base: '#6a5238', mortar: '#241a10', mid: '#806440', lit: '#b09058', hi: '#f0d098', dark: '#3a2c1c', topLit: '#a08050', topDark: '#42301e' },
    floor: { f0: '#2a4a24', f1: '#3a5e2e', f2: '#4a7238', f3: '#5e8a48', hi: '#80c058', crack: '#1e3818', moss: '#90d060' },
    face: { main: '#3a2c1c', top: '#f0d098', upper: '#806440', lower: '#6a5238', line: '#160e06' },
  },
};

export function getThemeArt(id: ThemeId | undefined): ThemeArt {
  return THEME_ART[id ?? 'crypt'] ?? THEME_ART.crypt;
}

// ---- Hero colour ramps (shadow, base, light, trim) ----
export interface HeroRamp {
  skin: string;
  skinHi: string;
  cloth0: string; // darkest
  cloth1: string;
  cloth2: string; // brightest
  trim: string; // metal / accent
  trimHi: string;
  hair: string;
}

export const HERO_RAMPS: Record<string, HeroRamp> = {
  // Vanguard — Conan-style barbarian: bronzed skin, fur + leather, black mane.
  vanguard: {
    skin: '#c97e44',
    skinHi: '#e6a86a',
    cloth0: '#2e1d10', // dark fur cloak
    cloth1: '#6e4423', // fur
    cloth2: '#9c6a3c', // lit fur
    trim: '#c8a25e', // bronze / leather
    trimHi: '#f0d79a',
    hair: '#1f160e', // black mane
  },
  // Thief — Drizzt-style drow ranger: ashen grey skin, white hair, dark cloak.
  thief: {
    skin: '#808096',
    skinHi: '#b8b8ce',
    cloth0: '#1a1530', // black cloak
    cloth1: '#332a52', // dark leather
    cloth2: '#59477e', // lavender-shadow
    trim: '#b6b6cc', // silver
    trimHi: '#eef0ff',
    hair: '#eef2ff', // white-silver hair
  },
  // Arcanist — Merlin: deep blue robe, gold trim, long white hair + beard.
  arcanist: {
    skin: '#d6a07a',
    skinHi: '#f0c39c',
    cloth0: '#161f52', // deep robe shadow
    cloth1: '#26368c', // blue robe
    cloth2: '#4f6ad6', // lit blue
    trim: '#ffd45a', // gold
    trimHi: '#fff0b0',
    hair: '#eef0f4', // white hair/beard
  },
  // Warden — holy cleric: cream + gold robe, hooded, sacred light.
  warden: {
    skin: '#cf9763',
    skinHi: '#efb98a',
    cloth0: '#6a5a2e', // robe shadow
    cloth1: '#c7ba8e', // cream robe
    cloth2: '#efe6c8', // lit cream
    trim: '#e6c24a', // gold
    trimHi: '#fff4c0',
    hair: '#7a6a4a',
  },
  // Necromancer — arcade lich: bone-white skull, electric violet robes, cyan soul-fire.
  necromancer: {
    skin: '#d8e0ea',
    skinHi: '#f4f8ff',
    cloth0: '#120818',
    cloth1: '#5a28a0',
    cloth2: '#8a48e8',
    trim: '#40e8ff',
    trimHi: '#b0ffff',
    hair: '#080410',
  },
  // Bard — swashbuckling skald: wine-red doublet, gold trim, chestnut hair.
  bard: {
    skin: '#d8a276',
    skinHi: '#f2c79e',
    cloth0: '#3a1622',
    cloth1: '#7e2f47',
    cloth2: '#b04a66',
    trim: '#e0b04a',
    trimHi: '#ffe9a8',
    hair: '#8a5a2e',
  },
  // Druid — keeper of the old wild: moss-green robes, bark trim, auburn mane.
  druid: {
    skin: '#c98e5a',
    skinHi: '#e8b584',
    cloth0: '#22301a',
    cloth1: '#41592a',
    cloth2: '#64883e',
    trim: '#8a6e3a',
    trimHi: '#c9a94e',
    hair: '#6e4a2a',
  },
};

// ---- Monster ramps ----
export interface MonsterRamp {
  body0: string;
  body1: string;
  body2: string;
  accent: string;
  eye: string;
  detail: string;
}

export const MONSTER_RAMPS: Record<string, MonsterRamp> = {
  grunt: {
    body0: '#1c4a1e',
    body1: '#2f7a33',
    body2: '#56b85a',
    accent: '#9adf6a',
    eye: '#ffe23a',
    detail: '#123314',
  },
  ghost: {
    body0: '#2a3b6a',
    body1: '#5a73c0',
    body2: '#a9c4ff',
    accent: '#dceaff',
    eye: '#ff5a8a',
    detail: '#1a2746',
  },
  demon: {
    body0: '#5a1208',
    body1: '#a82414',
    body2: '#e04a26',
    accent: '#ff9a3a',
    eye: '#ffe23a',
    detail: '#380a04',
  },
  grave_warden: {
    body0: '#1a1426',
    body1: '#382a52',
    body2: '#6a4f9a',
    accent: '#b58aff',
    eye: '#3affd0',
    detail: '#0c0814',
  },
  bone_archer: {
    body0: '#7d7660',
    body1: '#c9c2a6',
    body2: '#efe9cf',
    accent: '#9b3a2a',
    eye: '#ff5a3a',
    detail: '#4a4636',
  },
  skel_tank: { body0: '#7d7660', body1: '#c9c2a6', body2: '#efe9cf', accent: '#5ab0ff', eye: '#80e8ff', detail: '#4a4636' },
  skel_archer: { body0: '#7d7660', body1: '#c9c2a6', body2: '#efe9cf', accent: '#58e8a8', eye: '#b8ffe0', detail: '#4a4636' },
  skel_mage: { body0: '#7d7660', body1: '#c9c2a6', body2: '#efe9cf', accent: '#c070ff', eye: '#e8c0ff', detail: '#4a4636' },
  skel_thief: { body0: '#7d7660', body1: '#c9c2a6', body2: '#efe9cf', accent: '#78ff78', eye: '#c8ffc8', detail: '#4a4636' },
  brute: {
    body0: '#3a2418',
    body1: '#6e4326',
    body2: '#9c6a3c',
    accent: '#c0392b',
    eye: '#ffd24a',
    detail: '#1f120a',
  },
  imp: {
    body0: '#6a1408',
    body1: '#c4361a',
    body2: '#ff7a2a',
    accent: '#ffd24a',
    eye: '#fff4b0',
    detail: '#360a04',
  },
  molten_colossus: {
    body0: '#2a1410',
    body1: '#6e2414',
    body2: '#c4451c',
    accent: '#ffae2a',
    eye: '#fff0a0',
    detail: '#140805',
  },

  // ---- themed regulars ----
  frost_shade: { body0: '#2a4a66', body1: '#5a86c0', body2: '#bfe9ff', accent: '#eaf6ff', eye: '#7fe4ff', detail: '#1a2746' },
  rime_archer: { body0: '#7a8aa0', body1: '#c2d6ec', body2: '#eef6ff', accent: '#4aa3d8', eye: '#7fe4ff', detail: '#3a4656' },
  plague_ooze: { body0: '#1c3a18', body1: '#3f7a2e', body2: '#7fbf44', accent: '#b6f06a', eye: '#eaff8a', detail: '#0e2009' },
  spore_imp: { body0: '#1c4a1e', body1: '#3f8a3a', body2: '#7fce58', accent: '#b6f06a', eye: '#eaff8a', detail: '#123314' },
  gear_knight: { body0: '#2a2e36', body1: '#4a4f5e', body2: '#7a8294', accent: '#cfa64e', eye: '#ffd24a', detail: '#15171c' },
  brass_sentinel: { body0: '#4a3812', body1: '#8a6e34', body2: '#e6c264', accent: '#fff0b0', eye: '#7fe4ff', detail: '#2a2010' },
  gladiator: { body0: '#4a2a18', body1: '#8a5a30', body2: '#c08a4c', accent: '#d8b87a', eye: '#ffd24a', detail: '#241208' },
  mire_lurker: { body0: '#16280f', body1: '#345a26', body2: '#5e8a3a', accent: '#9fd05a', eye: '#cfff6a', detail: '#0a1607' },
  storm_wisp: { body0: '#2a2e4a', body1: '#4a64b0', body2: '#9fc0ff', accent: '#eaf4ff', eye: '#ffffff', detail: '#161830' },
  sky_lancer: { body0: '#3a5a7a', body1: '#6a9ad0', body2: '#cfe6ff', accent: '#3a86c8', eye: '#b0e8ff', detail: '#1a2a3a' },
  shadow_stalker: { body0: '#140e1e', body1: '#2e2240', body2: '#4e3a68', accent: '#8a6ab0', eye: '#c08aff', detail: '#08060e' },
  void_imp: { body0: '#1e0e36', body1: '#3e2468', body2: '#6a3cc0', accent: '#b58aff', eye: '#e2c0ff', detail: '#100620' },
  hollow_knight: { body0: '#1c1a14', body1: '#3a3424', body2: '#6a5e3a', accent: '#e6c264', eye: '#fff0b0', detail: '#0e0c08' },

  // ---- themed bosses ----
  rime_cantor: { body0: '#1a2a40', body1: '#3a6a9a', body2: '#8fc8f0', accent: '#cfeaff', eye: '#7fffe4', detail: '#0c1626' },
  rot_sovereign: { body0: '#16240f', body1: '#3a6a2a', body2: '#6faa3a', accent: '#b6f06a', eye: '#eaff8a', detail: '#0a1607' },
  brass_magnus: { body0: '#2a2010', body1: '#6e5424', body2: '#c0982e', accent: '#ffd24a', eye: '#7fe4ff', detail: '#140e05' },
  arena_champion: { body0: '#2a1810', body1: '#6e3e24', body2: '#a8603a', accent: '#d8b87a', eye: '#ffd24a', detail: '#160a06' },
  mire_leviathan: { body0: '#0e2012', body1: '#2e5226', body2: '#54863a', accent: '#9fd05a', eye: '#cfff6a', detail: '#081208' },
  tempest_herald: { body0: '#1a1e3a', body1: '#3a4a90', body2: '#7f9aff', accent: '#cfe0ff', eye: '#ffffff', detail: '#0c0e1e' },
  umbral_devourer: { body0: '#100820', body1: '#2e1850', body2: '#5a2ea0', accent: '#b58aff', eye: '#3affd0', detail: '#06040e' },
  hollow_king: { body0: '#16120a', body1: '#3a3018', body2: '#6e5a2a', accent: '#ffd24a', eye: '#ff5a3a', detail: '#0a0805' },
};
