// ----------------------------------------------------------------------------
// StrongBow -- master palette
//
// A cohesive arcade dungeon palette. All art references these so the whole game
// stays colour-consistent. Values are 0xRRGGBB (or '#rrggbb' strings).
//
// Direction (see docs/ART_DIRECTION.md):
//   • The WORLD is low-key and desaturated — cold stone, wet wood, bruised dark.
//   • Only LIGHT is saturated — flame, magic, eyes, runes, loot, hazards.
//   • Every ramp separates on VALUE first so silhouettes survive a squint test.
//   • Shadows carry a colour cast (never neutral grey); highlights push near-white
//     so additive glows have a genuinely hot core.
// ----------------------------------------------------------------------------
import type { ThemeId } from '../core/types';

export const C = {
  // ---- Floors (warm dithered stone; the crypt default) ----
  // Deepened the low end and warmed the highs so torchlight has somewhere to go.
  floor0: '#1d1309',
  floor1: '#31210f',
  floor2: '#452e17',
  floor3: '#5b3d1f',
  floorHi: '#7a5430',
  floorCrack: '#120b04',
  floorMoss: '#3f5222',

  // ---- Walls (cold lit brick — the complement to the warm floor) ----
  wallDark: '#070c22',
  wallBase: '#16234b',
  wallMid: '#27397a',
  wallLit: '#4a63b8',
  wallHi: '#8fa6e8',
  wallTopDark: '#0f1a3e',
  wallTopLit: '#5872c8',
  wallMortar: '#040713',

  // ---- Doors ----
  doorWood: '#52341a',
  doorWoodHi: '#7d5225',
  doorIron: '#343949',
  doorLock: '#ffc63f',
  doorLockDark: '#9a7320',

  // ---- Hazards (all self-illuminated: these are allowed to be loud) ----
  waterDark: '#07203a',
  waterMid: '#11557f',
  waterHi: '#2f96cc',
  waterFoam: '#c2edff',
  lavaDark: '#460d00',
  lavaMid: '#d13c04',
  lavaHi: '#ff9a1c',
  lavaWhite: '#fff0b4',
  iceDark: '#1c3f5e',
  iceMid: '#6fb8e4',
  iceHi: '#ccf0ff',
  iceWhite: '#f6fdff',
  poisonDark: '#0f2a15',
  poisonMid: '#3d9636',
  poisonHi: '#95ee56',
  poisonGas: '#c4ff62',
  spikeBase: '#141a29',
  spikeSteel: '#96a0b6',
  spikeHi: '#ecf1ff',
  spikeBlood: '#a81616',

  // ---- Themed decor ----
  crystal: '#78ecff',
  crystalHi: '#e8fdff',
  crystalDk: '#245f8c',
  cog: '#a4823a',
  cogHi: '#f4cf68',
  cogDk: '#3f2f0e',
  vine: '#3a7c2e',
  vineHi: '#84dc58',
  bloodDark: '#4d0a0a',
  bloodMid: '#a41515',

  // ---- Exit portal ----
  portal0: '#150636',
  portal1: '#4d16b8',
  portal2: '#9440ff',
  portal3: '#d3a8ff',
  portalCore: '#ffffff',

  // ---- Shadow / vignette ----
  shadow: '#000000',

  // ---- Gold / loot / coins ----
  coinDark: '#8f6208',
  coinMid: '#efb320',
  coinHi: '#ffeb92',
  gem: '#2ff0dc',

  // ---- FX ----
  magicCore: '#ffffff',
  magicHot: '#d3a8ff',
  magicMid: '#8a3cff',
  magicEdge: '#3b13ab',
  fireCore: '#fff6c4',
  fireMid: '#ff9420',
  fireEdge: '#c8360a',
  spark: '#ffe98c',
  heal: '#78f78d',
  allyAura: '#54e6a4',

  // ---- Torch ----
  torchWood: '#3a2614',
  torchFlame0: '#ffefb4',
  torchFlame1: '#ff9420',
  torchFlame2: '#c8360a',

  // ---- UI chrome (arcade cabinet: deep navy + hot gold + neon status) ----
  hudBg: '#02040a',
  hudPanel: '#080e1c',
  hudPanel2: '#101a33',
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

  // ---- Shared light treatment (see ART_DIRECTION "one light direction") ----
  /** Warm upper-left key rim painted on sprite edges. */
  rimWarm: 'rgba(255,236,196,0.30)',
  /** Cool ambient bounce on the lower-right of a form. */
  rimCool: 'rgba(120,160,255,0.16)',
  /** Standard sprite keyline — near-black with an indigo cast. */
  keyline: '#05050c',
  /** Contact shadow beneath anything standing on the ground. */
  contact: 'rgba(0,0,0,0.45)',
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

/**
 * The realm's *light*, as distinct from its *pigment*. Drives glows, ambient
 * motes, screen-edge grade and emissive decor so a realm reads from a thumbnail.
 * Optional so any consumer that only wants wall/floor colours keeps working.
 */
export interface ThemeLight {
  /** The realm's signature saturated accent — runes, eyes, emissive trim. */
  accent: string;
  /** Hot core of that accent (glow centres, sparks). */
  accentHi: string;
  /** Colour of ambient haze layered over the floor. */
  fog: string;
  /** Colour the realm's torches/lamps burn. */
  flame: string;
}

export interface ThemeArt {
  wall: WallColors;
  floor: FloorColors;
  face: FaceColors;
  light: ThemeLight;
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
  main: '#101b3e',
  top: '#8fa6e8',
  upper: '#27397a',
  lower: '#16234b',
  line: '#040713',
};

export const THEME_ART: Record<ThemeId, ThemeArt> = {
  // Cold indigo masonry over warm torch-lit stone — the complementary pairing
  // that makes every flame in the crypt feel like the only warm thing alive.
  crypt: {
    wall: DEFAULT_WALL,
    floor: DEFAULT_FLOOR,
    face: DEFAULT_FACE,
    light: { accent: '#9ab4ff', accentHi: '#e6efff', fog: '#2a3a78', flame: '#ffa040' },
  },
  // Black basalt bled through with orange. The rock is nearly value-0 so the
  // cracks read as molten rather than merely "orange rock".
  molten: {
    wall: { base: '#3d1109', mortar: '#150301', mid: '#631c0c', lit: '#a83512', hi: '#ff8324', dark: '#1a0503', topLit: '#c44a15', topDark: '#250705' },
    floor: { f0: '#120603', f1: '#240d07', f2: '#3c170d', f3: '#5c2411', hi: '#a44418', crack: '#ff5a12', moss: '#7a2c0c' },
    face: { main: '#250705', top: '#ff8324', upper: '#631c0c', lower: '#3d1109', line: '#0e0302' },
    light: { accent: '#ff7a18', accentHi: '#ffe0a0', fog: '#8a2808', flame: '#ff6a10' },
  },
  // Glacial: deep navy shadow, brilliant white-cyan highlight. High value range
  // so ice reads as translucent instead of pale-blue plastic.
  frost: {
    wall: { base: '#25496f', mortar: '#061626', mid: '#4179ab', lit: '#7ec2ec', hi: '#f0fbff', dark: '#0d2138', topLit: '#93d3f7', topDark: '#163150' },
    floor: { f0: '#0e1f30', f1: '#1c3548', f2: '#325a75', f3: '#4c7896', hi: '#a6d6f2', crack: '#081420', moss: '#4b93a6' },
    face: { main: '#123048', top: '#f0fbff', upper: '#4179ab', lower: '#25496f', line: '#06131f' },
    light: { accent: '#8fe8ff', accentHi: '#f4fdff', fog: '#1a5a90', flame: '#a8e0ff' },
  },
  // Acid-green bile over black rot. Yellow-shifted highlights keep it sickly
  // rather than "forest".
  toxic: {
    wall: { base: '#22461d', mortar: '#061105', mid: '#39682a', lit: '#6ba63f', hi: '#c4fb5c', dark: '#0c1a08', topLit: '#5c9636', topDark: '#152a10' },
    floor: { f0: '#0d1808', f1: '#182a10', f2: '#28451b', f3: '#3d6626', hi: '#79bd3e', crack: '#060f04', moss: '#95ee56' },
    face: { main: '#152a10', top: '#c4fb5c', upper: '#39682a', lower: '#22461d', line: '#040c03' },
    light: { accent: '#9cf24e', accentHi: '#e8ffb0', fog: '#246a20', flame: '#a0f050' },
  },
  // Oiled iron underfoot, brass above, amber filament light.
  clockwork: {
    wall: { base: '#403422', mortar: '#0d0a05', mid: '#6d5527', lit: '#ab8531', hi: '#ffdf6b', dark: '#191308', topLit: '#c99a34', topDark: '#2a1f0e' },
    floor: { f0: '#131316', f1: '#1f2026', f2: '#2f3138', f3: '#45474f', hi: '#7e8290', crack: '#08080a', moss: '#8f7028' },
    face: { main: '#261c0e', top: '#ffdf6b', upper: '#6d5527', lower: '#403422', line: '#0b0804' },
    light: { accent: '#ffd24a', accentHi: '#fff4c8', fog: '#6a4a12', flame: '#ffc040' },
  },
  // Sun-bleached sandstone, blood in the grout, hot white-gold key light.
  arena: {
    wall: { base: '#57391f', mortar: '#170c04', mid: '#845c2c', lit: '#bd8f47', hi: '#ffdf9d', dark: '#2b1a0c', topLit: '#cc9c50', topDark: '#382110' },
    floor: { f0: '#271a0f', f1: '#3b2916', f2: '#503b21', f3: '#6b512e', hi: '#a5824b', crack: '#140b05', moss: '#a01e18' },
    face: { main: '#382110', top: '#ffdf9d', upper: '#845c2c', lower: '#57391f', line: '#110903' },
    light: { accent: '#ff8a3a', accentHi: '#ffe2b4', fog: '#8a1810', flame: '#ff7030' },
  },
  // Drowned and desaturated, with luminous swamp gas as the only clean colour.
  bog: {
    wall: { base: '#233324', mortar: '#050d07', mid: '#385030', lit: '#5b7a3e', hi: '#a3d16b', dark: '#0e170f', topLit: '#4d6c36', topDark: '#162217' },
    floor: { f0: '#0d150e', f1: '#152016', f2: '#233421', f3: '#344a33', hi: '#628544', crack: '#050a05', moss: '#5ba33f' },
    face: { main: '#132114', top: '#a3d16b', upper: '#385030', lower: '#233324', line: '#040b05' },
    light: { accent: '#8ce05a', accentHi: '#dcffb0', fog: '#245a30', flame: '#98e070' },
  },
  // Rain-dark slate lit by lightning: cold, blue-violet, high-contrast.
  storm: {
    wall: { base: '#272d5c', mortar: '#06081a', mid: '#454f8c', lit: '#7b8cd4', hi: '#dbe8ff', dark: '#101128', topLit: '#6675c0', topDark: '#191c42' },
    floor: { f0: '#0f1126', f1: '#191d36', f2: '#282e4c', f3: '#3c4364', hi: '#7181b4', crack: '#080915', moss: '#4356a8' },
    face: { main: '#161a3c', top: '#dbe8ff', upper: '#454f8c', lower: '#272d5c', line: '#060716' },
    light: { accent: '#bcd4ff', accentHi: '#ffffff', fog: '#2a3a80', flame: '#d8ecff' },
  },
  // Void: near-black plum with a magenta-violet emissive. The darkest realm.
  shadow: {
    wall: { base: '#241734', mortar: '#05030a', mid: '#38254f', lit: '#5c4180', hi: '#b18ce4', dark: '#0d0718', topLit: '#4c3070', topDark: '#150c28' },
    floor: { f0: '#0b0713', f1: '#140e22', f2: '#1f1733', f3: '#31264a', hi: '#5a4280', crack: '#040209', moss: '#4a2a78' },
    face: { main: '#110920', top: '#b18ce4', upper: '#38254f', lower: '#241734', line: '#04020b' },
    light: { accent: '#c79bff', accentHi: '#f0e0ff', fog: '#3a2060', flame: '#c898ff' },
  },
  // Bone-gold marble under a radiant, holy key light. Warm and bright — the
  // only realm where the *stone itself* is high-value.
  sanctum: {
    wall: { base: '#655840', mortar: '#1a150a', mid: '#8d7c58', lit: '#c6b47e', hi: '#fff6cd', dark: '#332b1c', topLit: '#a99770', topDark: '#3f3623' },
    floor: { f0: '#282318', f1: '#3c3728', f2: '#524b34', f3: '#6d6444', hi: '#b8a76f', crack: '#161207', moss: '#dcb02e' },
    face: { main: '#3f3623', top: '#fff6cd', upper: '#8d7c58', lower: '#655840', line: '#110d05' },
    light: { accent: '#ffd24a', accentHi: '#fffbe6', fog: '#7a6020', flame: '#ffd848' },
  },
  // Town square — sunlit lawns of green grass (roads are stamped as decor on
  // top). The one place with true daylight: high key, low contrast, no gloom.
  town: {
    wall: { base: '#6f5537', mortar: '#221809', mid: '#8a6a41', lit: '#bd995b', hi: '#ffdc9f', dark: '#3a2a17', topLit: '#a98750', topDark: '#42311c' },
    floor: { f0: '#2c5122', f1: '#3d672c', f2: '#4f7d36', f3: '#639645', hi: '#8ace55', crack: '#1f3c17', moss: '#9ada5e' },
    face: { main: '#3a2a17', top: '#ffdc9f', upper: '#8a6a41', lower: '#6f5537', line: '#150d04' },
    light: { accent: '#ffcf7a', accentHi: '#fff6de', fog: '#4a3820', flame: '#ffb868' },
  },
};

export function getThemeArt(id: ThemeId | undefined): ThemeArt {
  return THEME_ART[id ?? 'crypt'] ?? THEME_ART.crypt;
}

/** The realm's signature emissive colour as a Phaser tint (0xRRGGBB). */
export function themeAccent(id: ThemeId | undefined): number {
  return parseInt(getThemeArt(id).light.accent.slice(1), 16);
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
  /** Optional signature glow (spell light, soul-fire, holy radiance). */
  glow?: string;
  /** Optional deep accent used for straps, shadow folds and under-hem. */
  deep?: string;
}

export const HERO_RAMPS: Record<string, HeroRamp> = {
  // Vanguard — Conan-style barbarian: bronzed skin, fur + leather, black mane.
  // Warmer, higher-chroma bronze so bare skin is the class's read at a glance.
  vanguard: {
    skin: '#d0813f',
    skinHi: '#f2b072',
    cloth0: '#2a1a0c', // dark fur cloak
    cloth1: '#77461f', // fur
    cloth2: '#ab7440', // lit fur
    trim: '#d2a95e', // bronze / leather
    trimHi: '#ffe6ac',
    hair: '#1a1109', // black mane
    glow: '#ff9a3a',
    deep: '#160c05',
  },
  // Thief — Drizzt-style drow ranger: ashen grey skin, white hair, dark cloak.
  // Cooled the skin toward violet-grey and pushed the cloak to true black so the
  // silver hair is the only bright value on the sprite.
  thief: {
    skin: '#7d7d97',
    skinHi: '#bfbfd8',
    cloth0: '#120e26', // black cloak
    cloth1: '#2e2551', // dark leather
    cloth2: '#5b4788', // lavender-shadow
    trim: '#bcbcd6', // silver
    trimHi: '#f4f6ff',
    hair: '#f2f6ff', // white-silver hair
    glow: '#a97dff',
    deep: '#080512',
  },
  // Arcanist — Merlin: deep blue robe, gold trim, long white hair + beard.
  arcanist: {
    skin: '#dda57c',
    skinHi: '#f7caa1',
    cloth0: '#0f1650', // deep robe shadow
    cloth1: '#243499', // blue robe
    cloth2: '#5372e8', // lit blue
    trim: '#ffd451', // gold
    trimHi: '#fff4bc',
    hair: '#f3f5fa', // white hair/beard
    glow: '#8fb4ff',
    deep: '#070a2e',
  },
  // Warden — holy cleric: cream + gold robe, hooded, sacred light.
  warden: {
    skin: '#d59a62',
    skinHi: '#f5c18d',
    cloth0: '#665326', // robe shadow
    cloth1: '#cfc193', // cream robe
    cloth2: '#f6eed2', // lit cream
    trim: '#efc94c', // gold
    trimHi: '#fff8ca',
    hair: '#7d6c49',
    glow: '#ffe9a0',
    deep: '#3d3014',
  },
  // Necromancer — arcade lich: bone-white skull, electric violet robes, cyan soul-fire.
  necromancer: {
    skin: '#dde5ef',
    skinHi: '#f8fbff',
    cloth0: '#0e0514',
    cloth1: '#5d24ad',
    cloth2: '#9450f5',
    trim: '#37ecff',
    trimHi: '#c0ffff',
    hair: '#060309',
    glow: '#37ecff',
    deep: '#070211',
  },
  // Bard — swashbuckling skald: wine-red doublet, gold trim, chestnut hair.
  bard: {
    skin: '#dfa87a',
    skinHi: '#f8cda4',
    cloth0: '#33121d',
    cloth1: '#8a3049',
    cloth2: '#bd5170',
    trim: '#e8b74c',
    trimHi: '#fff0ae',
    hair: '#8f5c2c',
    glow: '#ffd98a',
    deep: '#1e0910',
  },
  // Druid — keeper of the old wild: moss-green robes, bark trim, auburn mane.
  druid: {
    skin: '#cf9155',
    skinHi: '#eebb86',
    cloth0: '#1c2b15',
    cloth1: '#42602a',
    cloth2: '#6c9440',
    trim: '#8f713a',
    trimHi: '#d3b252',
    hair: '#734b28',
    glow: '#a8f56a',
    deep: '#101a0c',
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
  /** Optional self-illuminated colour: soul-fire, molten core, rune glow. */
  glow?: string;
  /** Optional secondary material (bone, brass, cloth) for two-tone creatures. */
  alt?: string;
}

export const MONSTER_RAMPS: Record<string, MonsterRamp> = {
  grunt: {
    body0: '#153f17',
    body1: '#2c7a30',
    body2: '#5cc460',
    accent: '#a6ec70',
    eye: '#ffe23a',
    detail: '#0c2610',
    glow: '#ffe23a',
    alt: '#7a5a30',
  },
  ghost: {
    body0: '#1f2f5e',
    body1: '#5872c6',
    body2: '#b0c9ff',
    accent: '#e6f1ff',
    eye: '#ff5a8a',
    detail: '#131e3c',
    glow: '#9fc0ff',
  },
  demon: {
    body0: '#4e0d05',
    body1: '#ae2312',
    body2: '#ec5024',
    accent: '#ffa338',
    eye: '#ffe23a',
    detail: '#2c0702',
    glow: '#ff7a1e',
    alt: '#1a0603',
  },
  grave_warden: {
    body0: '#150f22',
    body1: '#3a2a58',
    body2: '#7053a8',
    accent: '#bd8fff',
    eye: '#3affd0',
    detail: '#08050f',
    glow: '#3affd0',
    alt: '#d8dce8',
  },
  bone_archer: {
    body0: '#79725c',
    body1: '#cdc6a8',
    body2: '#f4eed4',
    accent: '#a03626',
    eye: '#ff5a3a',
    detail: '#433f30',
    glow: '#ff5a3a',
  },
  skel_tank: { body0: '#79725c', body1: '#cdc6a8', body2: '#f4eed4', accent: '#5ab0ff', eye: '#80e8ff', detail: '#433f30', glow: '#80e8ff' },
  skel_archer: { body0: '#79725c', body1: '#cdc6a8', body2: '#f4eed4', accent: '#58e8a8', eye: '#b8ffe0', detail: '#433f30', glow: '#58e8a8' },
  skel_mage: { body0: '#79725c', body1: '#cdc6a8', body2: '#f4eed4', accent: '#c070ff', eye: '#e8c0ff', detail: '#433f30', glow: '#c070ff' },
  skel_thief: { body0: '#79725c', body1: '#cdc6a8', body2: '#f4eed4', accent: '#78ff78', eye: '#c8ffc8', detail: '#433f30', glow: '#78ff78' },
  brute: {
    body0: '#331f13',
    body1: '#734527',
    body2: '#a67142',
    accent: '#c93a2b',
    eye: '#ffd24a',
    detail: '#1a0f07',
    alt: '#8b94a8',
  },
  imp: {
    body0: '#5e0f05',
    body1: '#cc3616',
    body2: '#ff8630',
    accent: '#ffd24a',
    eye: '#fff4b0',
    detail: '#2c0702',
    glow: '#ff8630',
  },
  molten_colossus: {
    body0: '#1d0e0a',
    body1: '#6b2110',
    body2: '#cc4718',
    accent: '#ffb324',
    eye: '#fff4b0',
    detail: '#0d0503',
    glow: '#ff8a1e',
    alt: '#2a2a30',
  },

  // ---- themed regulars ----
  frost_shade: { body0: '#20415e', body1: '#548ac8', body2: '#c8f0ff', accent: '#f0fbff', eye: '#7fe4ff', detail: '#12253f', glow: '#8fe8ff' },
  rime_archer: { body0: '#6f819a', body1: '#c6dcf2', body2: '#f4faff', accent: '#3fa3de', eye: '#7fe4ff', detail: '#31404f', glow: '#8fe8ff' },
  plague_ooze: { body0: '#173517', body1: '#3d842c', body2: '#84cb44', accent: '#c4ff62', eye: '#f0ff8a', detail: '#0a1a06', glow: '#9cf24e' },
  spore_imp: { body0: '#173d1a', body1: '#3d8f38', body2: '#84d858', accent: '#c4ff62', eye: '#f0ff8a', detail: '#0c2610', glow: '#9cf24e' },
  gear_knight: { body0: '#23272f', body1: '#454b59', body2: '#7d8698', accent: '#d9ad4e', eye: '#ffd24a', detail: '#101216', glow: '#ffd24a', alt: '#a4823a' },
  brass_sentinel: { body0: '#402f0e', body1: '#916f2f', body2: '#f0c964', accent: '#fff2b8', eye: '#7fe4ff', detail: '#241a0a', glow: '#7fe4ff' },
  gladiator: { body0: '#3f2213', body1: '#8a5628', body2: '#c99049', accent: '#e0bd7c', eye: '#ffd24a', detail: '#1e0f06', alt: '#a01e18' },
  mire_lurker: { body0: '#11230b', body1: '#325c22', body2: '#628f38', accent: '#a6d95c', eye: '#d4ff6a', detail: '#071105', glow: '#8ce05a' },
  storm_wisp: { body0: '#23274a', body1: '#4665bd', body2: '#a6c6ff', accent: '#f0f7ff', eye: '#ffffff', detail: '#101128', glow: '#bcd4ff' },
  sky_lancer: { body0: '#2f5074', body1: '#6a9ed8', body2: '#d6eaff', accent: '#3a8ad4', eye: '#b0e8ff', detail: '#14222f', glow: '#bcd4ff' },
  shadow_stalker: { body0: '#0f0918', body1: '#2b1e40', body2: '#513c72', accent: '#9370c4', eye: '#c08aff', detail: '#050309', glow: '#c79bff' },
  void_imp: { body0: '#190826', body1: '#42227a', body2: '#7340d4', accent: '#bd8fff', eye: '#e8caff', detail: '#0c041a', glow: '#c79bff' },
  hollow_knight: { body0: '#171510', body1: '#3a3320', body2: '#726237', accent: '#efc94c', eye: '#fff0b0', detail: '#0a0906', glow: '#ffd24a', alt: '#cdc6a8' },

  // ---- themed bosses (each gets a hot signature accent; see drawBoss variants) ----
  rime_cantor: { body0: '#132538', body1: '#356b9e', body2: '#96d0f5', accent: '#d6efff', eye: '#7fffe4', detail: '#08121f', glow: '#8fe8ff', alt: '#f0fbff' },
  rot_sovereign: { body0: '#11200c', body1: '#376b26', body2: '#75b13a', accent: '#c4ff62', eye: '#f0ff8a', detail: '#060f04', glow: '#9cf24e', alt: '#6b5a2c' },
  brass_magnus: { body0: '#241a0a', body1: '#755720', body2: '#cca02c', accent: '#ffd24a', eye: '#7fe4ff', detail: '#100a03', glow: '#ffd24a', alt: '#2a2a30' },
  arena_champion: { body0: '#25130b', body1: '#733b1f', body2: '#b26538', accent: '#e0bd7c', eye: '#ffd24a', detail: '#120705', glow: '#ff8a3a', alt: '#a01e18' },
  mire_leviathan: { body0: '#0a1c0e', body1: '#2c5522', body2: '#5a8f38', accent: '#a6d95c', eye: '#d4ff6a', detail: '#050d05', glow: '#8ce05a', alt: '#cdc6a8' },
  tempest_herald: { body0: '#141838', body1: '#3a4a9e', body2: '#88a3ff', accent: '#d6e4ff', eye: '#ffffff', detail: '#080a18', glow: '#bcd4ff', alt: '#e8f0ff' },
  umbral_devourer: { body0: '#0c0619', body1: '#31164f', body2: '#6231ab', accent: '#bd8fff', eye: '#3affd0', detail: '#04020a', glow: '#c79bff', alt: '#3affd0' },
  hollow_king: { body0: '#130f07', body1: '#3a2f16', body2: '#7a6128', accent: '#ffd24a', eye: '#ff5a3a', detail: '#080602', glow: '#ff5a3a', alt: '#cdc6a8' },
};
