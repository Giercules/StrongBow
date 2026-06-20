// ----------------------------------------------------------------------------
// StrongBow -- shared types
// ----------------------------------------------------------------------------

export type HeroClassId = 'vanguard' | 'strider' | 'arcanist' | 'warden';
export type Direction = 'down' | 'up' | 'left' | 'right';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type ItemSlot = 'weapon' | 'armor' | 'trinket' | 'consumable';
export type EnemyId =
  | 'grunt'
  | 'ghost'
  | 'demon'
  | 'grave_warden'
  | 'bone_archer'
  | 'brute'
  | 'imp'
  | 'molten_colossus';

export type EnemyBehavior = 'melee' | 'ranged' | 'charger' | 'boss';

export interface StatBlock {
  maxHealth: number;
  maxMana: number;
  damage: number;
  speed: number;
  armor: number;
  critChance: number;
  fire: number;
  regen: number;
}

export type StatMods = Partial<StatBlock>;

export interface HeroClassDef {
  id: HeroClassId;
  name: string;
  role: string;
  blurb: string;
  base: StatBlock;
  skillIds: string[];
  signature: string;
}

export interface EnemyDef {
  id: EnemyId;
  name: string;
  health: number;
  damage: number;
  speed: number;
  armor: number;
  xp: number;
  chaseRange: number;
  attackRange: number;
  attackCooldown: number;
  isBoss?: boolean;
  sheet: string;
  scale?: number;
  behavior?: EnemyBehavior;
  /** ranged/charger: ms between special attacks. */
  specialCooldown?: number;
  /** ranged: pixel speed of fired projectiles. */
  projectileSpeed?: number;
  /** ranged: distance the enemy tries to keep from its target. */
  preferredRange?: number;
  /** boss: enemy id summoned during the summon pattern. */
  summons?: EnemyId;
}

export interface ItemDefinition {
  id: string;
  name: string;
  slot: ItemSlot;
  rarity: Rarity;
  icon: string;
  mods: StatMods;
  flavor?: string;
  heal?: number;
  mana?: number;
  effects?: string[];
}

export interface SkillDef {
  id: string;
  classId: HeroClassId;
  name: string;
  description: string;
  maxRank: number;
  icon: string;
  perRank: StatMods;
}

export interface AffixDef {
  id: string;
  name: string;
  slot: ItemSlot | 'any';
  mods: StatMods;
  weight: number;
}

export type SpawnKind =
  | 'generator'
  | 'chest'
  | 'shrine'
  | 'key'
  | 'npc'
  | 'portal'
  | 'boss'
  | 'playerStart';

export interface SpawnDef {
  kind: SpawnKind;
  x: number;
  y: number;
  enemyId?: EnemyId;
  itemId?: string;
  interval?: number;
  maxAlive?: number;
  hp?: number;
}

export interface PickupDef {
  x: number;
  y: number;
  itemId?: string;
  coin?: number;
  kind: 'coin' | 'item' | 'food' | 'potion';
}

export interface LevelData {
  id: string;
  name: string;
  width: number;
  height: number;
  tiles: number[][];
  spawns: SpawnDef[];
  pickups: PickupDef[];
  ambientColor?: number;
}

export interface HudHeroSlot {
  classId: HeroClassId;
  name: string;
  isPlayer: boolean;
  playerNum: number;
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  level: number;
  xp: number;
  xpToNext: number;
  gold: number;
  keys: number;
  alive: boolean;
  score: number;
  skillPoints: number;
  attrPoints: number;
}

export interface HudRegistryData {
  slots: (HudHeroSlot | null)[];
  generatorsLeft: number;
  generatorsTotal: number;
  bossAlive: boolean;
  quest: string;
  levelName: string;
  twoPlayer: boolean;
  elapsedMs: number;
  controls: string[];
}

export interface CompanionAISettings {
  followDistance: number;
  leashDistance: number;
  aggression: number;
  assistRange: number;
  useMagic: boolean;
  aiBarks: boolean;
}

export type AIProviderId = 'openai' | 'anthropic' | 'xai' | 'fallback';

export interface GameplaySettings {
  monsterCount: number;
  xpMultiplier: number;
  playerDamageMult: number;
  godMode: boolean;
  infiniteMana: boolean;
  startLevel: number;
}

export interface GameSettingsData {
  aiProvider: AIProviderId;
  aiQuestEnabled: boolean;
  aiBarksEnabled: boolean;
  muted: boolean;
  musicEnabled: boolean;
  musicVolume: number;
  sfxVolume: number;
  zoom: number;
  companionAI: CompanionAISettings;
  bindings: import('./KeyBindings').GameBindings;
  gameplay: GameplaySettings;
}
