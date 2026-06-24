// ----------------------------------------------------------------------------
// StrongBow - global constants
// ----------------------------------------------------------------------------

export const TILE_SIZE = 16;

export const LEFT_PANEL_WIDTH = 200;
export const HUD_PANEL_WIDTH = 220;
export const GAME_WIDTH = 960;
export const PLAY_AREA_WIDTH = GAME_WIDTH - LEFT_PANEL_WIDTH - HUD_PANEL_WIDTH;
export const PLAY_AREA_X = LEFT_PANEL_WIDTH;
export const GAME_HEIGHT = 540;

export const SPRITE_SCALE_MIN = 1.0;
export const SPRITE_SCALE_MAX = 2.0;
export const SPRITE_SCALE_DEFAULT = 1.5;

// Camera zoom is fixed (no in-game slider) for a consistent arcade framing.
export const OPTIMAL_ZOOM = 1.0;
export const DEFAULT_ZOOM = OPTIMAL_ZOOM;
export const MIN_ZOOM = 1.0;
export const MAX_ZOOM = 1.0;

export const MAX_PLAYERS = 4;

export const HP_PER_LEVEL = 12;
export const MP_PER_LEVEL = 6;

// Party support tuning
export const GROUP_XP_SHARE = 0.35; // fraction of a kill's XP shared with the rest of the party
export const AURA_RADIUS = 120; // px radius for class group buffs
export const WARDEN_HEAL_INTERVAL = 1000; // ms between Warden healing pulses
// If a companion ends up farther than this from the party leader (stuck behind a
// gate, left across the map on level load, etc.) it blinks straight to them.
export const COMPANION_TELEPORT_DISTANCE = 360; // px
export const COMPANION_TELEPORT_MS = 900; // grace before a too-far companion blinks

export const PLAY_AREA_UI_DEPTH = 9600;

export const HUD_REGISTRY_KEY = 'hudData';
export const LOG_REGISTRY_KEY = 'logData';
export const GENERATORS_TO_DESTROY = 3;

// Difficulty presets: how many generators the exit demands, and an enemy
// density multiplier layered on top of the monster-count cheat.
export const DIFFICULTY = {
  easy: { requiredGenerators: 2, enemyMult: 0.7 },
  moderate: { requiredGenerators: 3, enemyMult: 1 },
  hard: { requiredGenerators: 99, enemyMult: 1.4 },
} as const;

export enum Tile {
  VOID = 0,
  FLOOR = 1,
  WALL = 2,
  DOOR = 3,
  LOCKED_DOOR = 4,
  WATER = 5,
  LAVA = 6,
  EXIT = 7,
  ICE = 8,
  POISON = 9,
  SPIKES = 10,
}

export const WALKABLE_TILES: ReadonlySet<number> = new Set([
  Tile.FLOOR,
  Tile.DOOR,
  Tile.WATER,
  Tile.LAVA,
  Tile.EXIT,
  Tile.ICE,
  Tile.POISON,
  Tile.SPIKES,
]);

export const WATER_SPEED_MULT = 0.7;
export const LAVA_DPS = 14;

// ---- New hazard tuning ----
// Ice: slick footing — you skate faster but with less control (handled as a
// momentum slide in Hero movement). No damage.
export const ICE_SPEED_MULT = 1.32;
export const ICE_SLIP = 0.86; // 0 = instant stop, 1 = frictionless; higher = slippier
// Poison sludge: wades slow and ticks corrosive damage.
export const POISON_SPEED_MULT = 0.78;
export const POISON_DPS = 9;
// Spike traps: telegraphed, then a burst of damage while stood upon.
export const SPIKE_DAMAGE = 15; // per tick
export const SPIKE_TICK_MS = 650;

export const DEPTH = {
  FLOOR: 0,
  DECOR_LOW: 50,
  VIGNETTE: 8500,
  CONTROLS: 8600,
  OVERLAY: 9000,
  BARK: 9200,
  TOP: 9999,
} as const;

export const CLASS_HUD_COLORS: Record<string, number> = {
  vanguard: 0x4fa3ff,
  strider: 0x5fe06a,
  arcanist: 0xc06bff,
  warden: 0xffcf5a,
  necromancer: 0x9b7be0,
};

export const hexStr = (n: number): string => '#' + n.toString(16).padStart(6, '0');
