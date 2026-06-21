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

  // ---- UI chrome ----
  hudBg: '#070a12',
  hudPanel: '#0d1322',
  hudPanel2: '#121a30',
  hudBorder: '#cfa64e',
  hudBorderDk: '#6e521f',
  ivy: '#2e6b34',
  ivyHi: '#48a052',
  ink: '#dfe6ff',
  inkDim: '#8a93bd',
  hpFull: '#37d65a',
  hpMid: '#e0c020',
  hpLow: '#e0392e',
  manaFill: '#3a8aff',
  xpFill: '#c79bff',
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
  crypt: { wall: DEFAULT_WALL, floor: DEFAULT_FLOOR, face: DEFAULT_FACE },
  molten: {
    wall: { base: '#3a1410', mortar: '#1a0805', mid: '#5a1e10', lit: '#8a3416', hi: '#d6661e', dark: '#200a06', topLit: '#7a2a12', topDark: '#2a0e08' },
    floor: { f0: '#1c0e08', f1: '#2c1610', f2: '#3e2014', f3: '#52301a', hi: '#7a4520', crack: '#140805', moss: '#5a2a10' },
    face: { main: '#2a0e08', top: '#d6661e', upper: '#5a1e10', lower: '#3a1410', line: '#120504' },
  },
  frost: {
    wall: { base: '#2a4a6e', mortar: '#0e2236', mid: '#3f6e98', lit: '#6fa6cc', hi: '#cfeaff', dark: '#15324c', topLit: '#6f9ec8', topDark: '#244660' },
    floor: { f0: '#1c3346', f1: '#2a4659', f2: '#3a5a70', f3: '#4e7088', hi: '#87b3cf', crack: '#122636', moss: '#3a6a7a' },
    face: { main: '#1f3e58', top: '#cfeaff', upper: '#3f6e98', lower: '#2a4a6e', line: '#0c1e30' },
  },
  toxic: {
    wall: { base: '#243a22', mortar: '#0c1a0c', mid: '#3a5a30', lit: '#5e8a44', hi: '#9fd05a', dark: '#14240f', topLit: '#4e7a3a', topDark: '#1e3018' },
    floor: { f0: '#16240f', f1: '#23341a', f2: '#324326', f3: '#445a30', hi: '#6f8a3e', crack: '#0c1608', moss: '#6fae3a' },
    face: { main: '#1c3014', top: '#9fd05a', upper: '#3a5a30', lower: '#243a22', line: '#0a1408' },
  },
  clockwork: {
    wall: { base: '#3a3220', mortar: '#14100a', mid: '#5a4a28', lit: '#8a6e34', hi: '#e6c264', dark: '#221c10', topLit: '#7a5e2a', topDark: '#2a2214' },
    floor: { f0: '#20201f', f1: '#2c2c2b', f2: '#3a3a39', f3: '#4c4c4a', hi: '#7a7a70', crack: '#121211', moss: '#6a5a2a' },
    face: { main: '#2a2214', top: '#e6c264', upper: '#5a4a28', lower: '#3a3220', line: '#100c08' },
  },
  arena: {
    wall: { base: '#4a3a26', mortar: '#1c1208', mid: '#6e5634', lit: '#9c7e4c', hi: '#d8b87a', dark: '#2c2014', topLit: '#8a6e40', topDark: '#34281a' },
    floor: { f0: '#2e2418', f1: '#3e3020', f2: '#4e3e28', f3: '#604e32', hi: '#8a7048', crack: '#1c1208', moss: '#7a2a20' },
    face: { main: '#34281a', top: '#d8b87a', upper: '#6e5634', lower: '#4a3a26', line: '#160e06' },
  },
  bog: {
    wall: { base: '#243026', mortar: '#0a120c', mid: '#36482f', lit: '#50663c', hi: '#82a85a', dark: '#141d14', topLit: '#46603a', topDark: '#1c281c' },
    floor: { f0: '#16201a', f1: '#202c20', f2: '#2c3a28', f3: '#3a4a30', hi: '#5a6a3a', crack: '#0a1209', moss: '#4a7a38' },
    face: { main: '#1a281c', top: '#82a85a', upper: '#36482f', lower: '#243026', line: '#08120a' },
  },
  storm: {
    wall: { base: '#2a2e4a', mortar: '#0c0e1e', mid: '#3f4670', lit: '#6a72b0', hi: '#b0c8ff', dark: '#161830', topLit: '#5a64a0', topDark: '#20243e' },
    floor: { f0: '#1a1c30', f1: '#24263e', f2: '#30344e', f3: '#40445e', hi: '#6a72a0', crack: '#0e0e1c', moss: '#3a4a8a' },
    face: { main: '#1e2038', top: '#b0c8ff', upper: '#3f4670', lower: '#2a2e4a', line: '#0a0c18' },
  },
  shadow: {
    wall: { base: '#221a30', mortar: '#08060e', mid: '#342648', lit: '#4e3a68', hi: '#8a6ab0', dark: '#140e1e', topLit: '#44345e', topDark: '#1a1228' },
    floor: { f0: '#140e1c', f1: '#1e1628', f2: '#281e36', f3: '#342848', hi: '#4e3a68', crack: '#08060e', moss: '#3a2a5a' },
    face: { main: '#181024', top: '#8a6ab0', upper: '#342648', lower: '#221a30', line: '#060410' },
  },
  sanctum: {
    wall: { base: '#524a3a', mortar: '#1c180f', mid: '#726a52', lit: '#a89c78', hi: '#ecdca6', dark: '#322c20', topLit: '#8a7e5e', topDark: '#3a3426' },
    floor: { f0: '#2e2a20', f1: '#3e3a2c', f2: '#504a38', f3: '#645c46', hi: '#9a8e68', crack: '#1a160e', moss: '#b0962e' },
    face: { main: '#3a3426', top: '#ecdca6', upper: '#726a52', lower: '#524a3a', line: '#161208' },
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
  vanguard: {
    skin: '#c98d5a',
    skinHi: '#e6b27e',
    cloth0: '#15356e',
    cloth1: '#2b59b0',
    cloth2: '#4f8af0',
    trim: '#b9c4dd',
    trimHi: '#eef3ff',
    hair: '#3a2a18',
  },
  strider: {
    skin: '#cf9763',
    skinHi: '#eeb886',
    cloth0: '#15401f',
    cloth1: '#2c7a38',
    cloth2: '#56c264',
    trim: '#caa56a',
    trimHi: '#f2dca0',
    hair: '#241a10',
  },
  arcanist: {
    skin: '#d6a07a',
    skinHi: '#f0c39c',
    cloth0: '#34146e',
    cloth1: '#6a2cc0',
    cloth2: '#a865ff',
    trim: '#ffd45a',
    trimHi: '#fff0b0',
    hair: '#e8e2ff',
  },
  warden: {
    skin: '#cf9763',
    skinHi: '#efb98a',
    cloth0: '#5a4410',
    cloth1: '#a07f1e',
    cloth2: '#ecc23e',
    trim: '#dfe6ff',
    trimHi: '#ffffff',
    hair: '#6a5230',
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
