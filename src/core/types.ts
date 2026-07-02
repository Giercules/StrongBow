// ----------------------------------------------------------------------------
// StrongBow -- shared types
// ----------------------------------------------------------------------------

export type HeroClassId = 'vanguard' | 'thief' | 'arcanist' | 'warden' | 'necromancer' | 'bard' | 'druid';
export type Direction = 'down' | 'up' | 'left' | 'right';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type ItemSlot =
  | 'weapon'
  | 'shield'
  | 'head'
  | 'body'
  | 'legs'
  | 'hands'
  | 'feet'
  | 'amulet'
  | 'ring'
  | 'consumable';

/** Where a piece of gear is actually worn. Most ItemSlots map 1:1 to an
 *  EquipSlot; rings can fill either of two ring slots. */
export type EquipSlot =
  | 'weapon'
  | 'shield'
  | 'head'
  | 'body'
  | 'legs'
  | 'hands'
  | 'feet'
  | 'amulet'
  | 'ring1'
  | 'ring2';

/** Slot selector for affixes: a concrete slot, 'any', all armour, or jewellery. */
export type AffixSlot = ItemSlot | 'any' | 'armorAny' | 'jewelry';

/** Equipment quality grades, weakest -> strongest. Each tier scales an item's
 *  base mods and adds more bonus affixes (and a luck-scaled shot at extra rolls). */
export type Grade = 'cracked' | 'honed' | 'runed' | 'ascendant' | 'godforged';

export type EnemyId =
  // --- originals ---
  | 'grunt'
  | 'ghost'
  | 'demon'
  | 'grave_warden'
  | 'bone_archer'
  | 'brute'
  | 'imp'
  | 'molten_colossus'
  // --- themed regulars ---
  | 'frost_shade'
  | 'rime_archer'
  | 'plague_ooze'
  | 'spore_imp'
  | 'gear_knight'
  | 'brass_sentinel'
  | 'gladiator'
  | 'mire_lurker'
  | 'storm_wisp'
  | 'sky_lancer'
  | 'shadow_stalker'
  | 'void_imp'
  | 'hollow_knight'
  // --- themed bosses ---
  | 'rime_cantor'
  | 'rot_sovereign'
  | 'brass_magnus'
  | 'arena_champion'
  | 'mire_leviathan'
  | 'tempest_herald'
  | 'umbral_devourer'
  | 'hollow_king';

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
  /** Fortune — raises loot drop rate and the odds of higher equipment grades. */
  luck: number;
  /** Extra maximum summoned servants (Necromancer). */
  summonBonus?: number;
  /** Active-ability cooldown reduction, 0..0.6. */
  cdr?: number;
  /** Extra foes a projectile arcs to on hit (spell chain). */
  spellChain?: number;
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
  /** Consumable scroll effect, if any. */
  scroll?: 'town_portal' | 'mending' | 'renewal';
  /** Quality grade for minted (dropped) gear; absent on static/consumable items. */
  grade?: Grade;
  /** Base template id this item was minted from (minted gear only). */
  baseId?: string;
  /** Theme this item is themed to (minted gear only). */
  theme?: ThemeId;
  /** Class armor-set membership (e.g. 'set_thief'). Set pieces are Godforged-
   *  tier and grant tiered bonuses at 2/4/5 equipped pieces. */
  setId?: string;
  /** Unique-legendary power id (e.g. 'sunfall') — named, build-warping items. */
  unique?: string;
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
  slot: AffixSlot;
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
  | 'merchant'
  | 'boss'
  | 'door'
  | 'playerStart';

/** Town merchant flavours — each opens a different shop / interaction. */
export type ShopKind = 'blacksmith' | 'apothecary' | 'tavern' | 'home' | 'guild';

export interface SpawnDef {
  kind: SpawnKind;
  x: number;
  y: number;
  enemyId?: EnemyId;
  itemId?: string;
  interval?: number;
  maxAlive?: number;
  hp?: number;
  /** portal: campaign level id this gate descends into. */
  realmId?: string;
  /** merchant: which shop/interaction this keeper offers. */
  shop?: ShopKind;
  /** npc/merchant/portal: display + examine label. */
  label?: string;
  /** npc: role word used for examine flavour + AI barks. */
  npcRole?: string;
  /** door: level id this entrance leads to ('town' to step back outside). */
  interiorId?: string;
  /** door to the overworld: which edge of town this gate is, used to pick the
   *  overworld entry point and the town tile to return to. */
  dir?: 'north' | 'south' | 'east' | 'west';
}

export interface PickupDef {
  x: number;
  y: number;
  itemId?: string;
  coin?: number;
  kind: 'coin' | 'item' | 'food' | 'potion';
}

/** A purely cosmetic, hand-placed decoration stamped at a tile. */
export interface DecorDef {
  x: number;
  y: number;
  /** Texture key, e.g. 'crystal' | 'cog' | 'vines' | 'blood-stain' | 'skull-pike' | 'pillar' | 'banner'. */
  key: string;
}

export type ThemeId =
  | 'crypt'
  | 'molten'
  | 'frost'
  | 'toxic'
  | 'clockwork'
  | 'arena'
  | 'bog'
  | 'storm'
  | 'shadow'
  | 'sanctum'
  | 'town';

export interface LevelData {
  id: string;
  name: string;
  width: number;
  height: number;
  tiles: number[][];
  spawns: SpawnDef[];
  pickups: PickupDef[];
  ambientColor?: number;
  /** Visual theme tag — drives the floor/wall tint and ambient mood. */
  theme?: ThemeId;
  /** Multiply-tint applied to the baked floor/wall layer for instant theme identity. */
  themeTint?: number;
  /** Hand-placed cosmetic decorations. */
  decor?: DecorDef[];
  /** One-line subtitle shown on the loading/quest banner (AI- or theme-authored). */
  subtitle?: string;
  /** Campaign chapter label, e.g. "Chapter III". */
  chapter?: string;
  /** Story beat narrated when the party enters this level. */
  story?: string;
  /** True for the town-square hub: no combat, portals descend into realms. */
  town?: boolean;
  /** True for building interiors (peaceful rooms reached from town). */
  interior?: boolean;
  /** True for the surface overworld (peaceful, biome ground, wandering critters). */
  overworld?: boolean;
  /** True for an overworld cave mini-dungeon (combat; a mouth door returns to the overworld). */
  cave?: boolean;
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

export type Difficulty = 'easy' | 'moderate' | 'hard';

export interface GameplaySettings {
  difficulty: Difficulty;
  monsterCount: number;
  xpMultiplier: number;
  playerDamageMult: number;
  godMode: boolean;
  infiniteMana: boolean;
  startLevel: number;
  /** Loot drop-rate multiplier (cheat). 1 = normal, 0 = no gear drops. */
  lootMult: number;
  /** Gold drop multiplier (cheat). 1 = normal, 0 = no gold drops. */
  goldMult: number;
  /** Roaming wild monsters (not from altars) per level (cheat). 1 = normal, 0 = none. */
  wildMonsters: number;
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
  spriteScale: number;
  showMinimap: boolean;
  /** Phaser 4 renderer upgrades: real-time lights, bloom/vignette filters,
   *  smooth pixel-art scaling. Applies on next descent (scene restart). */
  enhancedGraphics: boolean;
  musicTrack: string;
  companionAI: CompanionAISettings;
  bindings: import('./KeyBindings').GameBindings;
  gameplay: GameplaySettings;
}

export interface LogEntry {
  text: string;
  kind: 'event' | 'grok' | 'system' | 'combat' | 'loot';
  /** Optional per-line colour override (e.g. bright green for set pieces). */
  color?: string;
}

export interface LogRegistryData {
  entries: LogEntry[];
  grokStatus: 'offline' | 'connected' | 'thinking';
  grokProvider: string;
}
