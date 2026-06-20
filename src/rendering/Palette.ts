// ----------------------------------------------------------------------------
// StrongBow -- master palette
// A cohesive arcade dungeon palette. All art references these so the whole
// game stays colour-consistent. Values are 0xRRGGBB (or '#rrggbb' strings).
// ----------------------------------------------------------------------------

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
};
