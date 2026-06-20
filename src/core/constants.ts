// ----------------------------------------------------------------------------
// StrongBow - global constants
// ----------------------------------------------------------------------------

export const TILE_SIZE = 16;

export const PLAY_AREA_WIDTH = 740;
export const HUD_PANEL_WIDTH = 220;
export const GAME_WIDTH = PLAY_AREA_WIDTH + HUD_PANEL_WIDTH;
export const GAME_HEIGHT = 540;

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

export const PLAY_AREA_UI_DEPTH = 9600;

export const HUD_REGISTRY_KEY = 'hudData';
export const GENERATORS_TO_DESTROY = 3;

export enum Tile {
  VOID = 0,
  FLOOR = 1,
  WALL = 2,
  DOOR = 3,
  LOCKED_DOOR = 4,
  WATER = 5,
  LAVA = 6,
  EXIT = 7,
}

export const WALKABLE_TILES: ReadonlySet<number> = new Set([
  Tile.FLOOR,
  Tile.DOOR,
  Tile.WATER,
  Tile.LAVA,
  Tile.EXIT,
]);

export const WATER_SPEED_MULT = 0.7;
export const LAVA_DPS = 14;

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
};

export const hexStr = (n: number): string => '#' + n.toString(16).padStart(6, '0');
