import Phaser from 'phaser';
import {
  TILE_SIZE,
  PLAY_AREA_WIDTH,
  PLAY_AREA_X,
  GAME_HEIGHT,
  DEPTH,
  Tile,
  HERO_SPRITE_SCALE,
  NPC_SPRITE_SCALE,
  WALKABLE_TILES,
  HUD_REGISTRY_KEY,
  LOG_REGISTRY_KEY,
  GENERATORS_TO_DESTROY,
  DIFFICULTY,
  WATER_SPEED_MULT,
  LAVA_DPS,
  ICE_SPEED_MULT,
  ICE_SLIP,
  POISON_SPEED_MULT,
  POISON_DPS,
  SPIKE_DAMAGE,
  SPIKE_TICK_MS,
  OPTIMAL_ZOOM,
  AURA_RADIUS,
  WARDEN_HEAL_INTERVAL,
  GROUP_XP_SHARE,
  GROUP_XP_SHARE_DECAY,
  PARTY_SUMMON_CAP,
  COMPANION_TELEPORT_DISTANCE,
  COMPANION_TELEPORT_MS,
} from '../core/constants';
import * as art from '../rendering/spriteArt';
import * as overworldArt from '../rendering/overworldArt';
import { OVERWORLD_ENTRIES, NOMAD_GATE, biomeAt, type OverworldDir } from '../data/overworld';
import { rollEncounter, buildArena, BIOME_DANGER } from '../data/encounters';
import { getThemeArt, C } from '../rendering/Palette';
import { framedPanel, makeButton } from '../ui/uiHelpers';
import type { Modal } from '../ui/uiHelpers';
import { getTheme } from '../data/gen/themes';
import { settings } from '../core/GameSettings';
import { formatHudControls, formatHudControlsPad } from '../core/KeyBindings';
import type { HeroClassId, LevelData, HudRegistryData, HudHeroSlot, HudPartyGroup, ItemDefinition, ItemSlot, EnemyId, Grade, ThemeId, LogEntry, LogRegistryData } from '../core/types';
import { migrateEquipKey, migrateItemSlot } from '../core/equipment';
import { Content } from '../content/ContentRegistry';
import { ALL_CLASSES } from '../data/heroes';
import { ITEMS } from '../data/items';
import { GRADES, GRADE_ORDER } from '../data/grades';
import { rollDrop, mintItem, monsterDropChance, generatorDropChance, eliteDropChance } from '../systems/LootSystem';
import { ARMOR_SETS, SET_COLOR, rollSetDrop, setDropChance, mintSetPiece, SET_PIECE_SLOTS, type SetPieceSlot } from '../data/setItems';
import { THEME_BASES, ALL_THEME_BASES } from '../data/themedItems';
import { UNIQUES, mintUnique } from '../data/uniqueItems';
import { describeItem } from '../data/pickupInfo';
import { Hero } from '../entities/Hero';
import { Companion } from '../entities/Companion';
import { LanternWisp } from '../entities/LanternWisp';
import { Monster } from '../entities/Monster';
import type { MonsterStatus } from '../entities/Monster';
import { activeFor } from '../data/abilities';
import type { ActiveSlot } from '../data/abilities';
import { Generator } from '../entities/Generator';
import { ShadowSystem } from '../systems/ShadowSystem';
import { DungeonInput } from '../systems/DungeonInput';
import { FlowField } from '../systems/Pathfinding';
import { hiredAlliesFromSave, type SaveData, type SaveAlly } from '../systems/SaveSystem';
import { SaveLoadUI } from '../ui/SaveLoadUI';
import { audio } from '../systems/AudioSystem';
import { aiService, type BarkContext } from '../ai/AIService';
import { DungeonMaster } from '../systems/DungeonMaster';
import { computeRealmMonsterScale, computeArenaMonsterScale } from '../systems/MonsterScaling';
import { computeRealmLootScale, computeArenaLootScale, type LootScale } from '../systems/LootScaling';
import {
  buildTacticalContext,
  decideBardSong,
  decideDruidBear,
  bardWantsEncore,
  wardenWantsAbility,
  vanguardWantsRoar,
  arcanistWantsMeteor,
  type SongId as TacticSongId,
} from '../systems/PartyTactics';
import { InventoryUI } from '../ui/InventoryUI';
import { ShopUI } from '../ui/ShopUI';
import { GuildHireUI } from '../ui/GuildHireUI';
import { ENEMIES, ENEMY_IDS, BOSS_PHASE2 } from '../data/enemies';
import { rollUniqueDrop, uniqueDropChance, UNIQUE_COLOR } from '../data/uniqueItems';
import { questLog, SUNSPIRE_ERRAND } from '../systems/QuestSystem';
import { QuestBoardUI } from '../ui/QuestBoardUI';
import { DialogueUI } from '../ui/DialogueUI';
import { StashUI } from '../ui/StashUI';
import { FishingUI } from '../ui/FishingUI';
import { TradeUI } from '../ui/TradeUI';
import { LootRollUI } from '../ui/LootRollUI';
import type { LootRollView, RollEntry } from '../ui/LootRollUI';

type SkeletonType = 'tank' | 'archer' | 'mage' | 'thief';
const SKELETON_INFO: Record<SkeletonType, { cls: HeroClassId; name: string; sheet: string; walk: string; attack: string }> = {
  tank: { cls: 'vanguard', name: 'skeleton knight', sheet: 'monster-skel_tank-sheet', walk: 'skel_tank-walk', attack: 'skel_tank-attack' },
  archer: { cls: 'arcanist', name: 'skeleton archer', sheet: 'monster-skel_archer-sheet', walk: 'skel_archer-walk', attack: 'skel_archer-attack' },
  mage: { cls: 'arcanist', name: 'skeleton mage', sheet: 'monster-skel_mage-sheet', walk: 'skel_mage-walk', attack: 'skel_mage-attack' },
  thief: { cls: 'vanguard', name: 'skeleton thief', sheet: 'monster-skel_thief-sheet', walk: 'skel_thief-walk', attack: 'skel_thief-attack' },
};
const SKELETON_ORDER: SkeletonType[] = ['tank', 'archer', 'mage', 'thief'];
type SummonChoice = SkeletonType | 'beast';
const BEAST_LEVEL = 8; // necromancer can bind monsters from this level up

const COMPANION_STARTER: Partial<Record<HeroClassId, string>> = {
  vanguard: 'iron_sword',
  thief: 'hunters_bow',
  arcanist: 'oak_staff',
  warden: 'oak_shield',
  necromancer: 'amulet_of_focus',
  bard: 'leather_jerkin',
  druid: 'oak_staff',
};

// --- Arcanist familiars (the "hold ability" radial; tap stays Meteor) --------
type ArcaneType = 'ember' | 'void' | 'homunculus' | 'rootling';
const ARCANE_INFO: Record<ArcaneType, { cls: HeroClassId; name: string; sheet: string; walk: string; attack: string; tint: number }> = {
  // reuse thematically-close monster sheets, re-tinted to read as arcane conjurations
  ember: { cls: 'arcanist', name: 'ember sprite', sheet: 'monster-imp-sheet', walk: 'imp-walk', attack: 'imp-attack', tint: 0xff8a3a },
  void: { cls: 'arcanist', name: 'void imp', sheet: 'monster-void_imp-sheet', walk: 'void_imp-walk', attack: 'void_imp-attack', tint: 0xc07bff },
  homunculus: { cls: 'arcanist', name: 'arcane homunculus', sheet: 'monster-brass_sentinel-sheet', walk: 'brass_sentinel-walk', attack: 'brass_sentinel-attack', tint: 0x8fd0ff },
  rootling: { cls: 'vanguard', name: 'starved rootling', sheet: 'monster-spore_imp-sheet', walk: 'spore_imp-walk', attack: 'spore_imp-attack', tint: 0x8fe06a },
};
// radial wedge order: top, right, bottom, left
const ARCANE_ORDER: ArcaneType[] = ['ember', 'void', 'homunculus', 'rootling'];
const ARCANE_COST = 25;

// --- Bard songs (the "hold ability" radial; tap plays an Encore power chord) --
type SongId = 'war' | 'march' | 'hymn' | 'dirge';
const SONG_INFO: Record<SongId, { name: string; icon: string; tint: number; line: string }> = {
  war: { name: 'War Chant', icon: 'icon-sword', tint: 0xff8a5a, line: 'blades rise with the beat' },
  march: { name: "Traveler's March", icon: 'icon-boots', tint: 0x8ad0ff, line: 'feet fall light and fast' },
  hymn: { name: 'Mending Hymn', icon: 'icon-amulet', tint: 0x8affa0, line: 'wounds close to the melody' },
  dirge: { name: 'Dirge of Dread', icon: 'icon-scroll', tint: 0xc08aff, line: 'foes falter at the sound' },
};
const SONG_ORDER: SongId[] = ['war', 'march', 'hymn', 'dirge'];
import type { ShopKind } from '../core/types';
import { SkillTreeUI } from '../ui/SkillTreeUI';
import { SettingsUI } from '../ui/SettingsUI';
import { GameOverUI } from '../ui/GameOverUI';
import { CharacterSheetUI } from '../ui/CharacterSheetUI';
import { AbilityTreeUI } from '../ui/AbilityTreeUI';
import { GameManualUI } from '../ui/GameManualUI';
import { PickpocketUI, type PickpocketLoot } from '../ui/PickpocketUI';
import { net, type CoopEnemy, type CoopLoot } from '../net/NetClient';
import { getServerUrl, MULTIPLAYER_ENABLED } from '../net/serverConfig';

interface Chest { sprite: Phaser.GameObjects.Image; itemId: string; questItemId?: string; opened: boolean; locked: boolean; x: number; y: number; }
interface Shrine { sprite: Phaser.GameObjects.Image; used: boolean; x: number; y: number; }
interface Pickup { sprite: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite; kind: 'coin' | 'food' | 'potion' | 'key' | 'item'; value: number; itemId?: string; id?: number; }
interface LockedDoor { rect: Phaser.GameObjects.Rectangle; sprite: Phaser.GameObjects.Image; x: number; y: number; open: boolean; }
interface Projectile { spr: Phaser.GameObjects.Sprite; vx: number; vy: number; dmg: number; crit: boolean; bornAt: number; ttl: number; owner: Hero; pierce?: number; hit?: Set<Monster>; }
interface EnemyProjectile { spr: Phaser.GameObjects.Sprite; vx: number; vy: number; dmg: number; bornAt: number; ttl: number; }

/** A persistent ability zone on the ground (fissure, crater, consecration,
 *  smoke, ice field, nature root) that ticks damage/heal/status over time. */
interface GroundZone {
  x: number;
  y: number;
  radius: number;
  owner: Hero;
  expireAt: number;
  nextTickAt: number;
  tickEvery: number;
  dmg: number;
  status?: MonsterStatus;
  statusDur: number;
  statusMag: number;
  slow: boolean;
  healAllies: number;
  gfx: Phaser.GameObjects.Image;
}

/** A slain foe's remains — raw material for Corpse Explosion / Army of the Dead. */
interface Corpse { x: number; y: number; bornAt: number; }

// Per-theme mood: the colour of the party/ambient light and the drifting motes
// (embers rise, snow/sparks fall, spores/dust drift) that fill the play area.
interface Atmosphere {
  lightTint: number;
  particleTint: number;
  flameTint: number; // torch flame + its glow
  portalTint: number; // exit portal + its glow
  edgeTint: number; // screen-edge colour grade
  mode: 'rise' | 'fall' | 'drift';
  frequency: number;
}
const ATMOSPHERE: Record<ThemeId, Atmosphere> = {
  crypt: { lightTint: 0xfff0d0, particleTint: 0x8a93bd, flameTint: 0xff9a3a, portalTint: 0xb58aff, edgeTint: 0x24305a, mode: 'drift', frequency: 520 },
  molten: { lightTint: 0xffb070, particleTint: 0xff8a1e, flameTint: 0xff8a1e, portalTint: 0xff9a3a, edgeTint: 0x6a1e08, mode: 'rise', frequency: 150 },
  frost: { lightTint: 0xbfe0ff, particleTint: 0xeaf6ff, flameTint: 0x9fd0ff, portalTint: 0x7fd0ff, edgeTint: 0x1d4a72, mode: 'fall', frequency: 130 },
  toxic: { lightTint: 0xa8e08a, particleTint: 0x8ce05a, flameTint: 0x9ce05a, portalTint: 0x9ce05a, edgeTint: 0x1e4a1c, mode: 'rise', frequency: 240 },
  clockwork: { lightTint: 0xe6c264, particleTint: 0xffd24a, flameTint: 0xffb84a, portalTint: 0xffd24a, edgeTint: 0x4a3a16, mode: 'fall', frequency: 380 },
  arena: { lightTint: 0xff9a7a, particleTint: 0xff8a1e, flameTint: 0xff7a3a, portalTint: 0xff7a3a, edgeTint: 0x6a1410, mode: 'rise', frequency: 200 },
  bog: { lightTint: 0x9fd0a0, particleTint: 0x7fce58, flameTint: 0x8fd06a, portalTint: 0x8fd06a, edgeTint: 0x1c3a22, mode: 'drift', frequency: 240 },
  storm: { lightTint: 0xb0c8ff, particleTint: 0xcfe0ff, flameTint: 0xcfe0ff, portalTint: 0xcfe0ff, edgeTint: 0x222a5a, mode: 'fall', frequency: 110 },
  shadow: { lightTint: 0x9a7ab0, particleTint: 0x8a6ab0, flameTint: 0xb58aff, portalTint: 0xc79bff, edgeTint: 0x281a44, mode: 'drift', frequency: 300 },
  sanctum: { lightTint: 0xffe0a0, particleTint: 0xffd24a, flameTint: 0xffd24a, portalTint: 0xffe7a0, edgeTint: 0x5a4a1e, mode: 'rise', frequency: 220 },
  town: { lightTint: 0xfff2d8, particleTint: 0xffe6b0, flameTint: 0xffb46a, portalTint: 0xc79bff, edgeTint: 0x3a2e18, mode: 'drift', frequency: 640 },
};

function townsfolkVariant(role: string): number {
  const r = role.toLowerCase();
  if (r.includes('flower')) return 0;
  if (r.includes('crier')) return 1;
  if (r.includes('pilgrim')) return 2;
  if (r.includes('watch')) return 3;
  if (r.includes('lute') || r.includes('minstrel') || r.includes('bard')) return 4;
  if (r.includes('fortune')) return 5;
  if (r.includes('merchant')) return 6;
  let h = 0;
  for (let i = 0; i < r.length; i++) h = (h + r.charCodeAt(i)) % 7;
  return h;
}

/** Robed-folk variant for Sunspire: keffiyeh / turban / fez-veil / sun-hat /
 *  hooded burnous / veiled — chosen from the npcRole, hashed otherwise. */
function desertfolkVariant(role: string): number {
  const r = role.toLowerCase();
  if (r.includes('water') || r.includes('carrier')) return 0;
  if (r.includes('caravan') || r.includes('mistress') || r.includes('guard') || r.includes('warden')) return 1;
  if (r.includes('priest') || r.includes('sun') || r.includes('hierophant')) return 2;
  if (r.includes('boy') || r.includes('date') || r.includes('storyteller')) return 3;
  if (r.includes('spice') || r.includes('apothecar') || r.includes('smith')) return 4;
  if (r.includes('fortune') || r.includes('rug') || r.includes('veil')) return 5;
  let h = 0;
  for (let i = 0; i < r.length; i++) h = (h + r.charCodeAt(i)) % 6;
  return h;
}

// ---- DnD-flavored examine text for hand-placed decor + hazards + the NPC ----
const DECOR_FLAVOR: Record<string, string> = {
  bones: 'Old bones, picked clean. Something still gnaws in the dark.',
  rubble: 'Shattered masonry. The keep did not fall gently.',
  gravestone: 'A worn epitaph reads "He held the line." The rest is lost.',
  candle: 'A votive candle gutters. Someone still prays down here.',
  pillar: 'A great pillar, carved with deeds no one remembers.',
  banner: 'A tattered banner of a house long dead.',
  'frost-banner': 'A frost-stiffened banner, its sigil rimed white.',
  crystal: 'A humming crystal, cold and thick with stored magic.',
  'sky-crystal': 'A shard of sky-glass, crackling faintly with power.',
  cog: 'Brass gears tick on, driven by no hand you can see.',
  gauge: 'A dial twitches toward a pressure that should not exist.',
  pipe: 'Old conduits groan, venting steam and older secrets.',
  vines: 'Choking vines, fat with damp. They twitch when you look away.',
  'blood-stain': 'Dried blood, black with age. A great deal of it.',
  'skull-pike': 'A skull on a pike — a warning, or a trophy.',
  'lava-crack': 'A glowing fissure breathes heat and brimstone.',
  obsidian: 'Glassy black stone, sharp enough to draw blood.',
  icicle: 'Daggers of ice hang overhead. Tread softly.',
  'toxic-mushroom': 'Bruise-purple fungi. Their spores sting the eyes.',
  'weapon-rack': 'A rack of pitted arms — none worth the carrying.',
  'dead-tree': 'A petrified tree, its roots clutching at nothing.',
  cattail: 'Reeds rustle though no wind stirs the bog.',
  'storm-rod': 'A rod crackling with caged lightning. Do not touch.',
  'storm-orb': 'An orb of bound thunder, humming behind your teeth.',
  'void-rift': 'A wound in the world, leaking violet dark.',
  'rune-circle': 'A circle of runes, half-faded, still warm with intent.',
  'sanctum-glyph': 'A holy sigil, its gold light steady against the gloom.',
  idol: 'A gilded idol regards you with patient, empty eyes.',
  altar: 'An altar of pale stone, worn smooth by ten thousand prayers.',
  brazier: 'A standing brazier, its sacred flame refusing the dark.',
  'bog-stump': 'A rotted stump, soft as flesh, weeping black water.',
  lilypad: 'Lilies float on water too still to trust.',
};
const TILE_FLAVOR: Record<number, string> = {
  [Tile.LAVA]: 'Molten rock churns. It would unmake you in moments.',
  [Tile.WATER]: 'Black water, still as glass. Best not to wade deep.',
  [Tile.ICE]: 'Treacherous ice — your footing is anyone’s guess.',
  [Tile.POISON]: 'A sludge of corruption bubbles and reeks.',
  [Tile.SPIKES]: 'Rusted spikes, set to spring. Mind your step.',
  [Tile.EXIT]: 'A portal yawns — the way deeper, or the way out.',
};
const FLOOR_FLAVOR = 'Cold flagstones, slick with the dungeon’s breath.';
const NPC_FLAVOR = 'Elder Mora, last warden of the gate, watches in silence. "Descend," she rasps, "and end it."';

export class DungeonScene extends Phaser.Scene {
  private level!: LevelData;
  private twoPlayer = false;

  private players: Hero[] = [];
  private companions: Companion[] = [];
  private allies: Hero[] = [];
  private summons: Companion[] = [];
  private summonIdx = 0;
  private arcaneIdx = 0;
  private songPulseAt = 0;
  private summonTimerGfx?: Phaser.GameObjects.Graphics;
  private vignette?: Phaser.GameObjects.Image;
  private edgeGrade?: Phaser.GameObjects.Image;
  private selectedSkeleton: SummonChoice = 'tank';
  private questBoardUI!: QuestBoardUI;
  private dialogueUI!: DialogueUI;
  private stashUI!: StashUI;
  private fishingUI!: FishingUI;
  private tradeUI!: TradeUI;
  private lootRollUI!: LootRollUI;
  /** Party loot rolls in flight on this level (host + guests each track). */
  private lootRolls: {
    rollId: string;
    item: ItemDefinition;
    origin: { x: number; y: number };
    myValue?: number;
    results: Map<string, { name: string; value: number }>;
    winnerName?: string;
    winnerValue?: number;
    resolved: boolean;
    hostExpect?: Set<string>;
  }[] = [];
  private lootRollSeq = 0;
  private lootRollBanner: Phaser.GameObjects.Container | null = null;
  /** A caged villager waiting for rescue in this realm (quest-spawned). */
  private rescueCage: { x: number; y: number; parts: Phaser.GameObjects.GameObject[]; questId: string } | null = null;
  private radialOpen = false;
  private radialMode: 'necro' | 'arcane' | 'song' = 'necro';
  private radialPick = 'tank';
  private radial?: Phaser.GameObjects.Container;
  private radialNodes: { t: string; dx: number; dy: number; a0: number; a1: number; g: Phaser.GameObjects.Graphics; icon?: Phaser.GameObjects.Image; txt: Phaser.GameObjects.Text }[] = [];
  private radialCenterId: string | null = null;
  private abilityDownAt = 0;
  /** Class Ability Expansion: persistent ground zones + tracked corpses. */
  private groundZones: GroundZone[] = [];
  private corpses: Corpse[] = [];
  private masteryHealAt = 0;
  private monsters: Monster[] = [];
  private generators: Generator[] = [];
  private foundGens = new Set<Generator>(); // generators revealed on the minimap once explored near
  private blockers: Phaser.GameObjects.Rectangle[] = [];
  private lockedDoors: LockedDoor[] = [];
  /** The Wanderer's warded river bridge: the tiles it seals (until its quest
   *  flag is set) plus the barrier sprites/bodies to tear down when it opens. */
  private worldGate?: {
    blocked: Set<string>;
    sprites: Phaser.GameObjects.GameObject[];
    rects: Phaser.GameObjects.Rectangle[];
  };
  // ---- overworld combat encounters ----
  private encounterDanger = 0;          // hidden danger meter, fills as you travel
  private encounterGraceUntil = 0;      // no ambushes before this time (post-fight breather)
  private lastLeaderTile = { x: -1, y: -1 };
  private safeTiles = new Set<string>(); // roads + near town gates: no ambushes
  private arenaStarted = false;          // arena foes spawned, victory watch armed
  private arenaFoeCount = 0;             // pack size at the start (for the banner)
  private arenaRetreatMs = 0;            // time held in the retreat zone toward a flee
  private arenaResolved = false;         // victory/flee already fired
  private arenaFleeUnlockAt = 0;         // retreat disabled until this time (ambush lock-in)
  private arenaFleeHintShown = false;
  private chests: Chest[] = [];
  private shrines: Shrine[] = [];
  private pickups: Pickup[] = [];
  private projectiles: Projectile[] = [];
  private enemyProjectiles: EnemyProjectile[] = [];
  private torchLights: Phaser.GameObjects.Image[] = [];
  private partyLight?: Phaser.GameObjects.Image;

  // ---- Phaser 4 enhanced graphics (real-time lights + camera filters) ----
  /** True when enhanced graphics are on AND the renderer is WebGL. Entities
   *  read this at spawn to opt into the light pipeline. */
  lightingOn = false;
  private partyLightSrc?: Phaser.GameObjects.Light;
  private torchLightSrcs: Phaser.GameObjects.Light[] = [];
  private auraPulseN = 0;

  // ---- Arcanist familiar: the Lantern Wisp (scout + light, never fights) ----
  private wisp?: LanternWisp;
  private wispScoutUntil = 0;
  private wispNextScout = 0;
  private wispNextBark = 0;
  private static readonly WISP_LINES = [
    'The wisp bobs toward a fading seal in the dark.',
    'Your familiar flares — old lantern-light remembering itself.',
    'The wisp whispers of the hungering dark below.',
    'A cold blue glow steadies at your shoulder.',
    'The wisp shivers; something stirs beyond the torchlight.',
  ];

  private allyGroup!: Phaser.Physics.Arcade.Group;
  private monsterGroup!: Phaser.Physics.Arcade.Group;

  private shadows!: ShadowSystem;
  private cameraTarget!: Phaser.GameObjects.Rectangle;
  private input2!: DungeonInput;

  private inventoryUI!: InventoryUI;
  private skillsUI!: SkillTreeUI;
  private settingsUI!: SettingsUI;
  private gameOverUI!: GameOverUI;
  private sheetUI!: CharacterSheetUI;
  private abilityUI!: AbilityTreeUI;
  private manualUI!: GameManualUI;
  private saveLoadUI!: SaveLoadUI;
  private pickpocketUI!: PickpocketUI;
  private pendingThumb?: string;
  private quitConfirm: Modal | null = null;

  private escKey!: Phaser.Input.Keyboard.Key;
  private continueKey!: Phaser.Input.Keyboard.Key;
  private menuKey!: Phaser.Input.Keyboard.Key;

  private mmDots?: Phaser.GameObjects.Graphics;
  private mmImage?: Phaser.GameObjects.Image;
  private mmBorder?: Phaser.GameObjects.Graphics;
  private mmX = 0;
  private mmY = 0;
  private mmCW = 0;
  private mmCH = 0;
  private lastRightDown = 0;
  private magicQueued = false;

  private barkText!: Phaser.GameObjects.Text;

  // ---- left-panel adventure log + Grok "Dungeon Master" feed ----
  private logEntries: LogEntry[] = [];
  private grokStatus: 'offline' | 'connected' | 'thinking' = 'offline';
  private grokProvider = 'Grok';
  private static readonly LOG_CAP = 40;
  private dm = new DungeonMaster();

  private generatorsDestroyed = 0;
  private generatorsTotal = 0;
  private boss: Monster | null = null;
  private bossAlive = false;
  private bossMusicOn = false;
  private quest = '';
  private startTime = 0;
  private lowHealthWarned = false;
  private questBeat = '';
  private startTile = { x: 4, y: 4 };
  private levelPxW = 0;
  private levelPxH = 0;
  private paused = false;
  private won = false;
  private activeIdx = 0;
  private lavaTick = new Map<Hero, number>();
  private auraHealAt = 0;
  private collectedIds = new Set<number>();
  private flow!: FlowField;
  private nextFlowAt = 0;
  /** Per-companion timer tracking how long it has been beyond teleport range. */
  private compFarSince = new Map<Companion, number>();

  // ---- town-square hub state (only populated when this.level.town) ----
  private shopUI!: ShopUI;
  private guildUI!: GuildHireUI;
  private townNpcs: {
    sprite: Phaser.GameObjects.Sprite;
    homeX: number;
    homeY: number;
    vx: number;
    vy: number;
    nextTurn: number;
    label: string;
    role: string;
    npcId?: string;
    pickpocketed?: boolean;
  }[] = [];
  private portals: { sprite: Phaser.GameObjects.Sprite; realmId: string; label: string; x: number; y: number }[] = [];
  private doors: { x: number; y: number; interiorId: string; label: string; dir?: 'north' | 'south' | 'east' | 'west'; comingSoon?: boolean }[] = [];
  private returnPortal: { x: number; y: number } | null = null;
  private sneakGfx?: Phaser.GameObjects.Graphics;
  private merchants: { sprite: Phaser.GameObjects.Sprite; shop: ShopKind; label: string; x: number; y: number }[] = [];
  private townLife: Phaser.GameObjects.Sprite[] = [];
  /** Ghost sprites for other players + AI NPCs received from the server, by id. */
  private netGhosts = new Map<string, Phaser.GameObjects.Container>();
  /** Suppress join/leave barks until the first peer snapshot has populated. */
  private netSettled = false;
  // Tier 2 co-op: when a guest, local enemies are suppressed and the host's
  // authoritative enemies are rendered instead (keyed by their netId).
  private coopGuest = false;
  private coopEnemies = new Map<number, { spr: Phaser.GameObjects.Sprite; bar: Phaser.GameObjects.Graphics }>();
  private nextNetId = 1;
  private coopLastSent = 0;
  private hudNextSync = 0;

  constructor() {
    super('DungeonScene');
  }

  create(): void {
    this.resetState();
    // Register shutdown cleanup here, not in the constructor: Phaser only injects
    // `this.events` once the SceneManager boots the scene, so touching it in the
    // constructor throws `Cannot read properties of undefined (reading 'on')` and
    // crashes the boot before the title screen appears. `once` auto-clears when the
    // scene shuts down, so restarts don't stack duplicate listeners.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
    this.twoPlayer = this.registry.get('twoPlayer') ?? false;
    const save = this.registry.get('loadSave') as SaveData | undefined;
    const levelId = (save?.levelId as string) ?? (this.registry.get('levelId') as string) ?? 'sunken_crypt';
    this.level = Content.getLevel(levelId);
    if (this.level.id === 'town' && this.registry.get('hireSpent')) {
      const carry = this.registry.get('carryParty') as SaveAlly[] | undefined;
      const veterans = carry?.filter((a) => !a.isPlayer) ?? [];
      if (veterans.length) this.registry.set('companionVeterans', veterans);
      this.registry.set('hiredAllies', []);
      this.registry.remove('hireSpent');
    }

    const wPx = this.level.width * TILE_SIZE;
    const hPx = this.level.height * TILE_SIZE;

    // play viewport sits between the left log panel and the right HUD
    this.levelPxW = wPx;
    this.levelPxH = hPx;
    this.cameras.main.setViewport(PLAY_AREA_X, 0, PLAY_AREA_WIDTH, GAME_HEIGHT);
    if (wPx > PLAY_AREA_WIDTH || hPx > GAME_HEIGHT) this.cameras.main.setBounds(0, 0, wPx, hPx);
    this.cameras.main.setBackgroundColor(this.level.ambientColor ?? 0x05060a);
    this.physics.world.setBounds(0, 0, wPx, hPx);

    // Phaser 4 real-time lighting: dim ambient + warm pools around the party
    // and torches. Purely presentational — physics/AI never read light state.
    this.lightingOn = settings.get('enhancedGraphics') && this.game.renderer.type === Phaser.WEBGL;
    if (this.lightingOn) {
      const atmoL = ATMOSPHERE[this.level.theme ?? 'crypt'] ?? ATMOSPHERE.crypt;
      // Three light tiers so nothing washes out: open-air town/overworld reads as
      // daylight; cozy shop interiors sit at a warm mid-level (not near-white);
      // combat realms stay moody but readable.
      const openAir = !!this.level.town || !!this.level.overworld;
      const interior = !!this.level.interior;
      const ambient = openAir ? 0xe2e5ee : interior ? 0xc4c0b8 : 0xaab0c4;
      this.lights.enable().setAmbientColor(ambient);
      // No travelling point light in cozy interiors: a point light in a small
      // room reads as a hot blob in the middle. Even ambient lights shops
      // cleanly; open-air and combat realms keep a soft party light for depth.
      if (!interior) this.partyLightSrc = this.lights.addLight(0, 0, 400, atmoL.lightTint, openAir ? 0.4 : 0.85);
    }

    this.shadows = new ShadowSystem(this);
    this.allyGroup = this.physics.add.group();
    this.monsterGroup = this.physics.add.group();

    this.renderLevel();
    this.spawnWorldEntities();
    this.setupWorldGate();
    if (this.level.id === 'town') {
      const ret = this.registry.get('townReturn') as { x: number; y: number } | undefined;
      if (ret) {
        this.startTile = { x: ret.x, y: ret.y };
        this.registry.remove('townReturn');
      }
    }
    if (this.level.id === 'overworld') {
      // returning from a cave drops us back at that cave's mouth; otherwise we
      // emerge at the edge matching the town gate we stepped through.
      const ret = this.registry.get('overworldReturn') as { x: number; y: number } | undefined;
      if (ret) {
        this.startTile = { x: ret.x, y: ret.y };
      } else {
        const dir = this.registry.get('overworldEntry') as OverworldDir | undefined;
        const e = dir ? OVERWORLD_ENTRIES[dir] : undefined;
        if (e) this.startTile = { x: e.x, y: e.y };
      }
      this.registry.remove('overworldReturn');
      this.registry.remove('overworldEntry');
    }
    const dret = this.registry.get('dungeonReturnTile') as { x: number; y: number } | undefined;
    if (dret && !this.level.town) {
      this.startTile = { x: dret.x, y: dret.y };
      this.registry.remove('dungeonReturnTile');
    }
    const carry = this.registry.get('carryParty') as SaveAlly[] | undefined;
    this.restoreHiredAllies(save, carry);
    this.createHeroes();
    this.createCompanions();
    if (carry) {
      this.applyPartyCarry(carry);
      this.registry.remove('carryParty');
    }
    // Undying Bulwark (vanguard 5-piece set) needs scene FX when it procs.
    for (const a of this.allies) {
      a.onUndying = (h) => this.undyingProc(h);
      // Aegis of Embers (unique): being struck can burst into a ring of flame
      a.onDamaged = (h) => {
        if (!h.hasUniquePower('embers') || Math.random() > 0.25) return;
        const t = this.time.now;
        this.aoeHit(h, h.x, h.y, 90, Math.round(12 + h.stats.armor * 1.5), t, 'burn', 160);
        const ring = this.add.sprite(h.x, h.y, 'fx-fire').setDepth(h.y + 18).setScale(3.4).setTint(0xff7a2a);
        ring.play('fx-fire');
        ring.once('animationcomplete', () => ring.destroy());
        audio.sfx('magic');
      };
    }
    this.spawnFamiliar();
    this.spawnRescueCage();
    if (this.level.town) this.spawnLodgeTrophies();
    if (this.level.town && !carry && !save) {
      // fresh campaign: each hero starts with 100 gold + a health & mana potion
      for (const p of this.players) {
        p.inventory.gold = 150;
        const hp = Content.item('health_potion');
        const mp = Content.item('mana_potion');
        if (hp) p.inventory.add(hp);
        if (mp) p.inventory.add(mp);
      }
    }
    if (this.level.id === 'town' && this.registry.get('cameByPortal')) this.spawnReturnPortal();
    this.setupColliders();
    if (this.level.arena) this.spawnArenaFoes();
    else this.spawnAmbientMonsters();
    this.applyRealmDifficulty();
    this.flow = new FlowField(this.level.width, this.level.height, (x, y) => this.isWalkable(x, y));
    if (this.level.overworld) this.initOverworldEncounters();

    this.cameraTarget = this.add.rectangle(this.players[0].x, this.players[0].y, 2, 2, 0, 0);
    this.cameras.main.startFollow(this.cameraTarget, true, 0.12, 0.12);
    this.cameras.main.setZoom(OPTIMAL_ZOOM);
    this.centerSmallLevel();
    this.cameras.main.fadeIn(260, 0, 0, 0);
    this.game.events.on('viewportresize', this.onViewportResize, this);
    this.events.once('shutdown', () => this.game.events.off('viewportresize', this.onViewportResize, this));

    const atmo = ATMOSPHERE[this.level.theme ?? 'crypt'] ?? ATMOSPHERE.crypt;
    // Mood is done with depth-sorted overlays that sit BELOW the UI layer, in
    // BOTH modes. We deliberately do NOT use full-camera post filters (bloom/
    // vignette): those also process the UI drawn on this camera and blew out the
    // manual and centered shop panels into a bright hot-spot. Enhanced mode adds
    // real-time lights instead (world sprites only — the UI is never touched).
    this.vignette = this.add
      .image(PLAY_AREA_WIDTH / 2, GAME_HEIGHT / 2, 'fx-vignette')
      .setScrollFactor(0)
      .setDisplaySize(PLAY_AREA_WIDTH, GAME_HEIGHT)
      .setDepth(DEPTH.VIGNETTE);
    this.edgeGrade = this.add
      .image(PLAY_AREA_WIDTH / 2, GAME_HEIGHT / 2, 'fx-edge')
      .setScrollFactor(0)
      .setDisplaySize(PLAY_AREA_WIDTH, GAME_HEIGHT)
      .setDepth(DEPTH.VIGNETTE + 1)
      .setTint(atmo.edgeTint)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.5);
    // A soft travelling glow only when there are no real lights (non-enhanced);
    // enhanced mode gets an actual party light instead (except cozy interiors).
    if (!this.lightingOn) {
      this.partyLight = this.add
        .image(this.cameraTarget.x, this.cameraTarget.y, 'fx-light')
        .setScale(2.6)
        .setAlpha(0.3)
        .setTint(atmo.lightTint)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(DEPTH.VIGNETTE - 1);
    }
    this.spawnAmbience(this.level.theme ?? 'crypt');

    this.input2 = new DungeonInput(this);
    const gp = this.input.gamepad;
    if (gp) {
      gp.on('connected', (pad: Phaser.Input.Gamepad.Gamepad) => {
        console.info('[StrongBow] gamepad connected:', pad.id);
        this.showBark(`Gamepad ready: ${pad.id || 'controller'}`, 4000, 'system');
      });
      // catch a controller that was already awake before this scene started
      this.time.delayedCall(600, () => {
        const pad = gp.gamepads.find((g) => g && g.connected);
        if (pad) this.showBark(`Gamepad ready: ${pad.id || 'controller'}`, 4000, 'system');
      });
    } else {
      console.warn('[StrongBow] gamepad plugin not enabled (input.gamepad)');
    }
    this.inventoryUI = new InventoryUI(this);
    this.skillsUI = new SkillTreeUI(this);
    this.sheetUI = new CharacterSheetUI(this);
    this.abilityUI = new AbilityTreeUI(this);
    this.manualUI = new GameManualUI(this);
    this.gameOverUI = new GameOverUI(this);
    this.saveLoadUI = new SaveLoadUI(this);
    this.pickpocketUI = new PickpocketUI(this);
    this.settingsUI = new SettingsUI(this, { input: this.input2, onOpenManual: () => this.manualUI.open() });
    this.shopUI = new ShopUI(this);
    this.guildUI = new GuildHireUI(this);
    this.questBoardUI = new QuestBoardUI(this);
    this.dialogueUI = new DialogueUI(this);
    this.stashUI = new StashUI(this);
    this.fishingUI = new FishingUI(this);
    this.tradeUI = new TradeUI(this);
    this.lootRollUI = new LootRollUI(this);
    const kb = this.input.keyboard!;
    this.escKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.continueKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.C);
    this.menuKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.M);
    // dodge / class ability / steal are rebindable actions now — see KeyBindings
    kb.on('keydown-F2', () => this.toggleSaveLoad());
    kb.on('keydown-L', () => this.openPendingLootRoll());
    // mouse combat: right = attack, double right-click = magic
    this.input.mouse?.disableContextMenu();
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.rightButtonDown()) {
        const now = this.time.now;
        if (now - this.lastRightDown < 300) this.magicQueued = true;
        this.lastRightDown = now;
      }
    });
    this.buildMinimap();

    this.barkText = this.add
      .text(PLAY_AREA_WIDTH / 2, GAME_HEIGHT - 40, '', {
        fontFamily: 'MedievalSharp, "Trebuchet MS", cursive',
        fontSize: '15px',
        color: '#ffe9a8',
        align: 'center',
        wordWrap: { width: 520 },
        stroke: '#000',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.BARK)
      .setAlpha(0);

    if (save) {
      this.applySave(save);
      this.registry.remove('loadSave');
    }

    audio.unlock();
    audio.setDungeonMusic(this.level.music ?? this.level.theme ?? 'crypt');
    audio.playMusic('dungeon');
    this.startTime = this.time.now;

    if (this.level.town) {
      // first arrival unlocks the first realm; clearing realms unlocks the rest.
      if (this.registry.get('unlockedRealms') === undefined) this.registry.set('unlockedRealms', 1);
      this.quest = this.level.overworld
        ? 'Roam the wilds around Hearthwatch. Step through the keep gate to head back inside.'
        : 'Hearthwatch — gear up, then step through a gate to descend. (Use near a gate or shopkeeper.)';
    } else if (this.level.cave) {
      this.quest = `Delve ${this.level.name}: clear the dens, gather the iron keys, and plunder the locked hoard — then take the cavern mouth back to the surface.`;
      if (!save) void aiService.generateQuest(this.level.name).then((q) => { if (q) this.quest = q; });
    } else {
      this.quest = `Clear ${this.level.name}: destroy the altars and slay its warden.`;
      if (!save) void aiService.generateQuest(this.level.name).then((q) => { if (q) this.quest = q; });
    }
    // Lead with the chapter's own story beat, then let the Dungeon Master (Grok) layer on top.
    const chapterTag = this.level.chapter ? `${this.level.chapter} — ` : '';
    if (this.level.story) this.showBark(`${chapterTag}${this.level.story}`, 8000);
    // Realm intros are set-pieces; town hubs already have static quest + story beats.
    if (!this.level.town) {
      this.dmSetPiece(aiService.generateRealmIntro(this.level.name, this.players[0]?.classId));
    }

    // Bring up the side panels and seed the log + Grok status light.
    this.scene.launch('LeftPanelScene');
    this.scene.launch('HudScene');
    this.syncHudData();
    this.syncLogData();
    this.spawnTownLife();
    this.spawnOverworldLife();
    this.connectToServer();
    void aiService.checkConnection().then(({ connected, provider }) => {
      this.grokProvider = provider === 'xai' ? 'Grok' : provider === 'fallback' ? 'Local DM' : provider.charAt(0).toUpperCase() + provider.slice(1);
      this.setGrokStatus(connected ? 'connected' : 'offline');
    });
  }

  private resetState(): void {
    this.players = [];
    this.companions = [];
    this.allies = [];
    this.monsters = [];
    this.generators = [];
    this.foundGens = new Set();
    this.radialOpen = false;
    this.abilityDownAt = 0;
    this.radial = undefined;
    this.radialNodes = [];
    this.radialCenterId = null;
    this.radialMode = 'necro';
    this.groundZones.forEach((z) => z.gfx.destroy());
    this.groundZones = [];
    this.corpses = [];
    this.blockers = [];
    this.lockedDoors = [];
    this.chests = [];
    this.shrines = [];
    this.pickups = [];
    this.projectiles = [];
    this.enemyProjectiles = [];
    this.torchLights = [];
    this.generatorsDestroyed = 0;
    this.generatorsTotal = 0;
    this.boss = null;
    this.bossAlive = false;
    this.bossMusicOn = false;
    this.lowHealthWarned = false;
    this.questBeat = '';
    this.paused = false;
    this.won = false;
    // the warded gate's blocked tiles are overworld-only — clear any stale set so
    // its coords can't wrongly block the same (x,y) on another level.
    this.worldGate = undefined;
    // per-level encounter state (arena watch + overworld danger meter)
    this.arenaStarted = false;
    this.arenaResolved = false;
    this.arenaRetreatMs = 0;
    this.arenaFleeHintShown = false;
    this.arenaFoeCount = 0;
    this.encounterDanger = 0;
    this.lastLeaderTile = { x: -1, y: -1 };
    this.activeIdx = 0;
    this.lavaTick = new Map();
    this.collectedIds = new Set();
    this.compFarSince = new Map();
    this.lastRightDown = 0;
    this.magicQueued = false;
    this.townNpcs = [];
    this.townLife = [];
    this.netGhosts.clear();
    this.netSettled = false;
    this.coopGuest = false;
    this.coopEnemies.clear();
    this.nextNetId = 1;
    this.summonTimerGfx = undefined;
    this.hudNextSync = 0;
    this.vignette = undefined;
    this.edgeGrade = undefined;
    this.partyLight = undefined;
    this.partyLightSrc = undefined;
    this.torchLightSrcs = [];
    this.lightingOn = false;
    this.auraPulseN = 0;
    this.wisp = undefined;
    this.wispScoutUntil = 0;
    this.wispNextScout = 0;
    this.wispNextBark = 0;
    this.portals = [];
    this.merchants = [];
    this.doors = [];
    this.returnPortal = null;
  }

  private tileCenter(tx: number, ty: number): { x: number; y: number } {
    return { x: tx * TILE_SIZE + TILE_SIZE / 2, y: ty * TILE_SIZE + TILE_SIZE / 2 };
  }

  /** Tile is steppable for pathfinding (open doors count, walls/closed doors don't). */
  /** In the town hubs AND the overworld, open water (moat, river, oasis, the
   *  great Hearthrun) is deep — a solid you skirt around and cross only by
   *  bridge, never wade through. Only the combat realms keep water wade-able. */
  private waterSolid(): boolean {
    return !!this.level.town;
  }

  private isWalkable(tx: number, ty: number): boolean {
    if (ty < 0 || ty >= this.level.height || tx < 0 || tx >= this.level.width) return false;
    const t = this.level.tiles[ty][tx];
    if (t === Tile.WALL || t === Tile.LOCKED_DOOR || t === Tile.VOID) return false;
    if (t === Tile.WATER && this.waterSolid()) return false; // deep water blocks pathing off the bridges
    if (this.gateBlocks(tx, ty)) return false; // the Wanderer's ward seals the bridge until the heirloom is paid
    return true;
  }

  /** True while a warded world gate (e.g. the river bridge) still seals this
   *  tile — before its quest flag is set. Governs both pathing and the player. */
  private gateBlocks(tx: number, ty: number): boolean {
    return this.worldGate ? this.worldGate.blocked.has(`${tx},${ty}`) : false;
  }

  private renderLevel(): void {
    const t = this.level.tiles;
    const W = this.level.width;
    const H = this.level.height;
    const ta = getThemeArt(this.level.theme);
    const atmo = ATMOSPHERE[this.level.theme ?? 'crypt'] ?? ATMOSPHERE.crypt;
    // Hearthwatch (town square + shop interiors) uses faint candlelight, not
    // crypt torches. Combat realms keep their full torch wash.
    const townSquare = this.level.id === 'town';
    // Hearthwatch square, the desert field-towns (e.g. Sunspire) and building
    // interiors all use warm, cozy lighting — no crypt torches or arcane murals
    // grow on their walls, and glow props are dimmed for a lived-in daylight feel.
    const fieldTown = !!this.level.town && !this.level.overworld && this.level.id !== 'town';
    const cozyLighting = townSquare || fieldTown || !!this.level.interior;
    const scatterKeys = (getTheme(this.level.theme).decorKeys.length ? getTheme(this.level.theme).decorKeys : ['bones', 'rubble']).filter(
      (k) => !['pillar', 'idol', 'altar', 'weapon-rack', 'banner', 'frost-banner'].includes(k)
    );
    const isWall = (x: number, y: number) => y >= 0 && y < H && x >= 0 && x < W && t[y][x] === Tile.WALL;
    // A wall has "solid backing" when the tile directly north of it is another
    // wall or the void — i.e. a genuine wall mass, not a thin 1-tile divider
    // with walkable floor behind it. Only backed walls get the tall rising face;
    // thin / lone walls get a short ledge so we never paint a glitchy floating
    // slab over the floor behind them.
    const wallHasSolidBack = (wx: number, wyy: number): boolean => {
      const n = wyy - 1 >= 0 ? t[wyy - 1][wx] : Tile.VOID;
      return n === Tile.WALL || n === Tile.VOID;
    };
    const F = 55; // wall face height in px — 25% taller; towers over ~28px heroes

    // Pre-render the whole floor/wall layer onto ONE canvas texture and show it as
    // a single image. (Phaser 4 RenderTexture.draw did not stamp here -> dark map.)
    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = W * TILE_SIZE;
    bgCanvas.height = H * TILE_SIZE;
    const bgCtx = bgCanvas.getContext('2d')!;
    bgCtx.imageSmoothingEnabled = false;
    // Optional external tile art (externalAssets.ts). If a 'ext-floor' / 'ext-wall'
    // image is loaded it retiles the dungeon; otherwise the procedural tiles draw.
    const extFloor = this.textures.exists('ext-floor') ? (this.textures.get('ext-floor').getSourceImage() as CanvasImageSource) : null;
    const extWall = this.textures.exists('ext-wall') ? (this.textures.get('ext-wall').getSourceImage() as CanvasImageSource) : null;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const tile = t[y][x];
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;
        if (tile === Tile.VOID) continue;
        if (tile === Tile.WALL) {
          if (extWall) bgCtx.drawImage(extWall, px, py, TILE_SIZE, TILE_SIZE);
          else {
            art.drawWall(bgCtx, px, py, !isWall(x, y - 1), x * 7 + y * 13, ta.wall);
            art.drawWallRoof(bgCtx, px, py, this.level.theme ?? 'crypt', x * 13 + y * 7 + 3);
            // murals are drawn on the tall front FACE below (see next pass)
          }
          continue;
        }
        const fseed = x * 131 + y * 17;
        if (extFloor) bgCtx.drawImage(extFloor, px, py, TILE_SIZE, TILE_SIZE);
        else if (tile === Tile.GRASS) overworldArt.drawGrassGround(bgCtx, px, py, fseed);
        else if (tile === Tile.SAND) overworldArt.drawSandGround(bgCtx, px, py, fseed);
        else if (tile === Tile.MUD) overworldArt.drawMudGround(bgCtx, px, py, fseed);
        else if (tile === Tile.ROCK) overworldArt.drawRockGround(bgCtx, px, py, fseed);
        else art.drawFloor(bgCtx, px, py, fseed + 1000, ta.floor);
        if (tile === Tile.DOOR) art.drawDoor(bgCtx, px, py, false);
        else if (tile === Tile.ICE) art.drawIce(bgCtx, px, py, x * 131 + y * 17 + 7);
      }
    }

    // --- cast soft shadows + ambient occlusion from walls onto walkable tiles ---
    const isFloorTile = (cx: number, cy: number): boolean => {
      const tt = cy >= 0 && cy < H && cx >= 0 && cx < W ? t[cy][cx] : Tile.VOID;
      return tt !== Tile.WALL && tt !== Tile.VOID;
    };
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (!isFloorTile(x, y)) continue;
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;
        if (y > 0 && t[y - 1][x] === Tile.WALL) {
          const wy = y - 1; // the wall casting this face
          if (wallHasSolidBack(x, wy)) {
            // Tall 3D wall that RISES UP from its south edge (instead of hanging
            // down over the floor), so walls tower over the heroes without
            // covering the walkable floor — and they cast a shadow onto it.
            const topY = py - F; // screen-top of the wall face
            bgCtx.fillStyle = ta.face.main;
            bgCtx.fillRect(px, topY, TILE_SIZE, F);
            // lit top cap — the wall edge catching the light from above
            bgCtx.fillStyle = ta.wall.topLit;
            bgCtx.fillRect(px, topY, TILE_SIZE, 2);
            bgCtx.fillStyle = ta.wall.hi;
            bgCtx.fillRect(px, topY, TILE_SIZE, 1);
            // stacked stone courses with mortar + running-bond joints
            let course = 0;
            for (let cyy = topY + 3; cyy < py - 1; cyy += 6) {
              const chh = Math.min(5, py - 1 - cyy);
              bgCtx.fillStyle = course % 2 === 0 ? ta.face.upper : ta.face.lower;
              bgCtx.fillRect(px, cyy, TILE_SIZE, chh);
              bgCtx.fillStyle = ta.face.line;
              bgCtx.fillRect(px, cyy + chh, TILE_SIZE, 1);
              const off = course % 2 === 0 ? 4 : 8;
              for (let mx = px + off; mx < px + TILE_SIZE; mx += 8) bgCtx.fillRect(mx, cyy, 1, chh);
              course++;
            }
            // vertical light falloff — darkest toward the base (ambient occlusion)
            const fg = bgCtx.createLinearGradient(0, topY, 0, py);
            fg.addColorStop(0, 'rgba(255,255,255,0.08)');
            fg.addColorStop(0.5, 'rgba(0,0,0,0)');
            fg.addColorStop(1, 'rgba(0,0,0,0.5)');
            bgCtx.fillStyle = fg;
            bgCtx.fillRect(px, topY, TILE_SIZE, F);
            // themed mural carved mid-face (clearly visible on the tall wall)
            if ((x * 3 + wy * 7) % 5 === 0 && wy % 5 !== 0) {
              art.drawWallArt(bgCtx, px, topY + Math.floor((F - 14) / 2), this.level.theme ?? 'crypt', x * 3 + wy);
            }
            // CAST SHADOW the wall throws onto the floor at its base (south side)
            const sh = bgCtx.createLinearGradient(0, py, 0, py + 11);
            sh.addColorStop(0, 'rgba(0,0,0,0.5)');
            sh.addColorStop(1, 'rgba(0,0,0,0)');
            bgCtx.fillStyle = sh;
            bgCtx.fillRect(px, py, TILE_SIZE, 11);
          } else {
            // Thin / free-standing wall (walkable floor directly behind it). A
            // tall riser here would smear a slab over the floor to the north and
            // read as a floating glitch wall — draw a short ledge instead.
            const f2 = 12;
            bgCtx.fillStyle = ta.face.main;
            bgCtx.fillRect(px, py, TILE_SIZE, f2);
            bgCtx.fillStyle = ta.wall.hi;
            bgCtx.fillRect(px, py, TILE_SIZE, 1);
            bgCtx.fillStyle = ta.face.upper;
            bgCtx.fillRect(px, py + 1, TILE_SIZE, 5);
            bgCtx.fillStyle = ta.face.lower;
            bgCtx.fillRect(px, py + 6, TILE_SIZE, 5);
            bgCtx.fillStyle = ta.face.line;
            bgCtx.fillRect(px, py + f2 - 1, TILE_SIZE, 1);
            const sh2 = bgCtx.createLinearGradient(0, py + f2, 0, py + f2 + 6);
            sh2.addColorStop(0, 'rgba(0,0,0,0.4)');
            sh2.addColorStop(1, 'rgba(0,0,0,0)');
            bgCtx.fillStyle = sh2;
            bgCtx.fillRect(px, py + f2, TILE_SIZE, 6);
          }
        }
        if (x > 0 && t[y][x - 1] === Tile.WALL) {
          const grd = bgCtx.createLinearGradient(px, 0, px + 7, 0);
          grd.addColorStop(0, 'rgba(0,0,0,0.4)');
          grd.addColorStop(1, 'rgba(0,0,0,0)');
          bgCtx.fillStyle = grd;
          bgCtx.fillRect(px, py, 7, TILE_SIZE);
        }
        if (y < H - 1 && t[y + 1][x] === Tile.WALL) {
          bgCtx.fillStyle = 'rgba(0,0,0,0.16)';
          bgCtx.fillRect(px, py + TILE_SIZE - 3, TILE_SIZE, 3);
        }
        if (x < W - 1 && t[y][x + 1] === Tile.WALL) {
          bgCtx.fillStyle = 'rgba(0,0,0,0.12)';
          bgCtx.fillRect(px + TILE_SIZE - 3, py, 3, TILE_SIZE);
        }
      }
    }

    const bgKey = 'level-bg';
    if (this.textures.exists(bgKey)) this.textures.remove(bgKey);
    this.textures.addCanvas(bgKey, bgCanvas);
    const bgImg = this.add.image(0, 0, bgKey).setOrigin(0, 0).setDepth(DEPTH.FLOOR);
    if (this.lightingOn) bgImg.setLighting(true); // floors/walls react to torch + party light
    // Walls/floors are now fully themed via per-theme palettes (THEME_ART), so the
    // old flat multiply-tint is no longer applied — colours come from the bake.

    const solidWater = this.waterSolid();
    for (let y = 0; y < H; y++) {
      let runStart = -1;
      for (let x = 0; x <= W; x++) {
        // Walls always block; so does the VOID beyond the map (the invisible
        // outer frame — without a body here the player slides off the edge). In
        // the hub, deep water blocks too so you cross the moat/river/pool only by
        // the bridges (which are FLOOR, not WATER).
        const solid = x < W && (t[y][x] === Tile.WALL || t[y][x] === Tile.VOID || (solidWater && t[y][x] === Tile.WATER));
        if (solid && runStart < 0) runStart = x;
        if (!solid && runStart >= 0) {
          const len = x - runStart;
          this.addBlocker(runStart * TILE_SIZE + (len * TILE_SIZE) / 2, y * TILE_SIZE + TILE_SIZE / 2, len * TILE_SIZE, TILE_SIZE);
          runStart = -1;
        }
      }
    }

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const tile = t[y][x];
        const c = this.tileCenter(x, y);
        if (tile === Tile.WATER) {
          this.add.sprite(c.x, c.y, 'water-sheet').play('water').setDepth(DEPTH.FLOOR + 1);
        } else if (tile === Tile.LAVA) {
          this.add.sprite(c.x, c.y, 'lava-sheet').play('lava').setDepth(DEPTH.FLOOR + 1);
          this.add.image(c.x, c.y, 'fx-glow-warm').setScale(1.6).setAlpha(0.4).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.FLOOR + 2);
        } else if (tile === Tile.POISON) {
          const ps = this.add.sprite(c.x, c.y, 'poison-sheet').play('poison').setDepth(DEPTH.FLOOR + 1);
          ps.anims.setProgress(((x * 7 + y * 13) % 5) / 5);
          this.add.image(c.x, c.y, 'fx-glow-green').setScale(1.4).setAlpha(0.32).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.FLOOR + 2);
        } else if (tile === Tile.SPIKES) {
          const ss = this.add.sprite(c.x, c.y, 'spikes-sheet').play('spikes').setDepth(DEPTH.FLOOR + 1);
          ss.anims.setProgress(((x * 5 + y * 11) % 9) / 9);
        } else if (tile === Tile.ICE) {
          this.add.image(c.x, c.y, 'fx-glow-magic').setScale(1.1).setAlpha(0.12).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.FLOOR + 2);
        } else if (tile === Tile.EXIT) {
          this.add.sprite(c.x, c.y, 'portal-sheet').play('portal').setScale(1.2).setDepth(DEPTH.FLOOR + 3).setTint(atmo.portalTint);
          this.add.image(c.x, c.y, 'fx-glow-white').setScale(3).setAlpha(0.5).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.FLOOR + 2).setTint(atmo.portalTint);
        } else if (tile === Tile.LOCKED_DOOR) {
          const spr = this.add.image(c.x, c.y, 'locked-door').setDepth(c.y);
          const rect = this.addBlocker(c.x, c.y, TILE_SIZE, TILE_SIZE);
          this.lockedDoors.push({ rect, sprite: spr, x, y, open: false });
        }
        // Torches + mural glow mount on the TALL rising face — only on backed
        // walls (on a short ledge they would float in the air above nothing).
        if (tile === Tile.WALL && y + 1 < H && t[y + 1][x] === Tile.FLOOR && wallHasSolidBack(x, y)) {
          const faceBase = c.y + 8; // where the wall meets the floor (south edge)
          if (cozyLighting) {
            // Faint window/candle bloom — no crypt torches, no floor-flooding lights.
            if (x % 4 === 2) {
              const cg = this.add.image(c.x, faceBase - 14, 'fx-glow-warm')
                .setScale(0.55).setAlpha(0.03).setBlendMode(Phaser.BlendModes.ADD)
                .setDepth(c.y).setTint(0xffb860);
              this.tweens.add({ targets: cg, alpha: { from: 0.018, to: 0.045 }, duration: 1500 + Math.random() * 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
            }
          } else if ((x * 5 + y) % 5 === 0) {
            this.add.sprite(c.x, faceBase - Math.round(F * 0.55), 'torch-sheet').play('torch').setDepth(c.y + 2).setTint(atmo.flameTint);
            const light = this.add
              .image(c.x, faceBase - 6, 'fx-light')
              .setScale(1.5)
              .setAlpha(0.26)
              .setBlendMode(Phaser.BlendModes.ADD)
              .setDepth(DEPTH.VIGNETTE - 1)
              .setTint(atmo.flameTint);
            light.setData('ph', Math.random() * 6.28);
            this.torchLights.push(light);
            // a real point light per torch (budgeted: the light cap is 24)
            if (this.lightingOn && this.torchLightSrcs.length < 14) {
              this.torchLightSrcs.push(this.lights.addLight(c.x, faceBase - 10, 175, atmo.flameTint, 1.0));
            }
          }
          // pulsing arcane glow centered on the mid-face mural (not the town square)
          if (!cozyLighting && (x * 3 + y * 7) % 5 === 0 && y % 5 !== 0) {
            const gl = this.add.image(c.x, faceBase - Math.round(F / 2), 'fx-glow-white').setScale(1.2).setAlpha(0.3).setBlendMode(Phaser.BlendModes.ADD).setDepth(c.y).setTint(atmo.particleTint);
            this.tweens.add({ targets: gl, alpha: { from: 0.14, to: 0.4 }, duration: 1500 + Math.random() * 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
          }
        }
        if (tile === Tile.FLOOR && !this.level.town && scatterKeys.length) {
          const hsh = (x * 17 + y * 31) % 37;
          if (hsh === 0 || hsh === 7 || hsh === 19) {
            const key = scatterKeys[(x + y * 3) % scatterKeys.length];
            this.add.image(c.x, c.y, key).setDepth(c.y - 4).setAlpha(0.85).setScale(0.475);
          }
        }
      }
    }

    // ---- hand-placed set-piece decor (larger + livelier for a richer world) ----
    // Floor-level decor renders UNDER characters (DEPTH.FLOOR+1). Interior floor
    // coverings (wood-floor, rug) must be here or they clip anyone standing on
    // them — the "npcs/character vanish on the shop floor" bug.
    const flatDecor = new Set(['blood-stain', 'lilypad', 'sanctum-glyph', 'void-rift', 'lava-crack', 'rune-circle', 'road', 'grass-tuft', 'bridge-plank', 'chain', 'wood-floor', 'rug', 'flower-bed', 'wildflowers', 'crop-row', 'desert-road', 'market-mat', 'sand-dune']);
    const swayDecor = new Set(['banner', 'vines', 'frost-banner', 'cloth', 'cattail', 'toxic-mushroom', 'town-tree', 'town-bush', 'palm', 'palm-small', 'papyrus', 'sun-banner']);
    const glowDecor: Record<string, string> = {
      crystal: 'fx-glow-magic',
      cog: 'fx-glow-warm',
      'sky-crystal': 'fx-glow-magic',
      'storm-rod': 'fx-glow-magic',
      brazier: 'fx-glow-warm',
      idol: 'fx-glow-warm',
      'storm-orb': 'fx-glow-magic',
      'gauge': 'fx-glow-warm',
      'lamp-post': 'fx-glow-warm',
      'sun-idol': 'fx-glow-warm',
      'sun-spire': 'fx-glow-warm',
      'hanging-lantern': 'fx-glow-warm',
      'fire-bowl': 'fx-glow-warm',
      'clay-oven': 'fx-glow-warm',
    };
    // Glowing props that are heavy and planted on the ground — they must not bob.
    const GROUNDED_GLOW = new Set(['brazier', 'idol', 'lamp-post', 'gauge', 'sun-idol', 'sun-spire', 'fire-bowl', 'clay-oven', 'hanging-lantern']);
    const US = 0.75; // upright decor scale (HD decor is 2x res; halved to keep size)
    const FS = 0.65; // flat (floor) decor scale (HD decor is 2x res)
    // Building facade tiles are authored at the native 32px tile size, so they
    // must draw at 1:1 — drawing them at US left 8px gaps between every tile and
    // made the houses look like a broken grid. These tile seamlessly into walls.
    const buildingTiles = new Set([
      'house-wall', 'house-post', 'house-beam', 'house-base', 'house-window', 'house-door',
      'house-gable', 'house-timber', 'chimney',
      'shop-sign-anvil', 'shop-sign-vial', 'shop-sign-sword', 'shop-sign-tankard', 'shop-sign-coin', 'shop-sign-loaf',
      // Sunspire sandstone facades (native 32px — draw 1:1 so they tile seamlessly)
      'adobe-wall', 'adobe-roof', 'adobe-eave', 'adobe-base', 'adobe-window', 'adobe-door', 'adobe-post', 'rampart',
    ]);
    for (const col of ['red', 'blue', 'green', 'teak', 'slate', 'thatch'])
      for (const part of ['roof', 'mid', 'eave']) buildingTiles.add(`house-${part}-${col}`);
    for (const d of this.level.decor ?? []) {
      const dc = this.tileCenter(d.x, d.y);
      if (flatDecor.has(d.key)) {
        this.add.image(dc.x, dc.y, d.key).setDepth(DEPTH.FLOOR + 1).setAlpha(0.9).setScale(FS);
        let glowKey = '';
        let ga = 0;
        if (d.key === 'void-rift') {
          glowKey = 'fx-glow-magic';
          ga = 0.34;
        } else if (d.key === 'sanctum-glyph' || d.key === 'rune-circle') {
          glowKey = 'fx-glow-warm';
          ga = 0.34;
        } else if (d.key === 'lava-crack') {
          glowKey = 'fx-glow-warm';
          ga = 0.42;
        }
        if (glowKey) {
          const gl = this.add.image(dc.x, dc.y, glowKey).setScale(1.7).setAlpha(ga).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.FLOOR + 2);
          this.tweens.add({ targets: gl, alpha: { from: ga * 0.6, to: ga }, scale: { from: 1.5, to: 2 }, duration: 1200 + Math.random() * 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        }
      } else if (glowDecor[d.key]) {
        const s = this.add.image(dc.x, dc.y, d.key).setDepth(dc.y - 2).setScale(US);
        // Hearthwatch props glow much softer than crypt fixtures.
        const gw = cozyLighting ? 0.1 : 1;
        const gScale = cozyLighting ? 1.0 : 1.7;
        const glow = this.add.image(dc.x, dc.y, glowDecor[d.key]).setScale(gScale).setAlpha(0.3 * gw).setBlendMode(Phaser.BlendModes.ADD).setDepth(dc.y - 3);
        this.tweens.add({ targets: glow, alpha: { from: 0.18 * gw, to: 0.42 * gw }, scale: { from: gScale * 0.82, to: gScale * 1.18 }, duration: 1100 + Math.random() * 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        // Heavy ground-fixed props (braziers, lamp-posts, idols) stay planted;
        // only genuinely floaty arcana (crystals, orbs, cogs) hover.
        if (!GROUNDED_GLOW.has(d.key)) this.floatBob(s);
      } else if (d.key === 'fountain') {
        // Anchor on the pool-water centroid (lower basin), not the sprite bbox centre.
        const FOUNTAIN_ORIGIN_Y = 61 / 80;
        const FOUNTAIN_BASE_ORIGIN_Y = 84 / 164;
        const poolY = dc.y;
        this.add.image(dc.x, poolY, 'fountain-base').setOrigin(0.5, FOUNTAIN_BASE_ORIGIN_Y).setDepth(DEPTH.FLOOR + 2);
        for (let i = 0; i < 3; i++) {
          const ring = this.add
            .image(dc.x, poolY, 'fx-ripple')
            .setScale(0.35).setAlpha(0).setDepth(DEPTH.FLOOR + 3)
            .setBlendMode(Phaser.BlendModes.ADD).setTint(0xbfe9ff);
          this.tweens.add({ targets: ring, scale: { from: 0.35, to: 1.5 }, alpha: { from: 0.55, to: 0 }, duration: 2600, delay: i * 860, repeat: -1, ease: 'Sine.easeOut' });
        }
        for (let i = 0; i < 5; i++) {
          const gx = dc.x + (Math.random() * 2 - 1) * 64;
          const gy = poolY + (Math.random() * 2 - 1) * 34;
          const gl = this.add
            .image(gx, gy, 'fx-glow-white')
            .setScale(0.45).setAlpha(0).setDepth(DEPTH.FLOOR + 3)
            .setBlendMode(Phaser.BlendModes.ADD).setTint(0xcdeeff);
          this.tweens.add({ targets: gl, alpha: { from: 0, to: 0.75 }, duration: 700 + Math.random() * 600, delay: Math.random() * 1800, yoyo: true, repeat: -1, repeatDelay: 700 + Math.random() * 1500, ease: 'Sine.easeInOut' });
        }
        this.add.image(dc.x, poolY, 'fountain').setOrigin(0.5, FOUNTAIN_ORIGIN_Y).setDepth(dc.y);
        const spray = this.add.image(dc.x, poolY - 52, 'fx-glow-white').setScale(1.7).setAlpha(0.25).setBlendMode(Phaser.BlendModes.ADD).setDepth(dc.y + 1).setTint(0x9fd0ff);
        this.tweens.add({ targets: spray, alpha: { from: 0.16, to: 0.42 }, scaleY: { from: 1.3, to: 2 }, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      } else if (swayDecor.has(d.key)) {
        const s = this.add.image(dc.x, dc.y, d.key).setDepth(dc.y - 2).setScale(US);
        this.tweens.add({ targets: s, scaleX: { from: US, to: US * 0.9 }, duration: 1400 + Math.random() * 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      } else if (buildingTiles.has(d.key)) {
        this.add.image(dc.x, dc.y, d.key).setDepth(dc.y - 2); // native 32px facade tiles, 1:1
      } else {
        this.add.image(dc.x, dc.y, d.key).setDepth(dc.y - 2).setScale(US);
      }
    }
  }

  private addBlocker(cx: number, cy: number, w: number, h: number): Phaser.GameObjects.Rectangle {
    const r = this.add.rectangle(cx, cy, w, h, 0x000000, 0).setVisible(false);
    this.physics.add.existing(r, true);
    this.blockers.push(r);
    return r;
  }

  /** Raise the Wanderer's ward across the river bridge — unless her heirloom has
   *  already been paid (persistent flag). Each warded tile gets a physics body
   *  (so the player is stopped, not just pathing) and a distinctive barrier
   *  sprite. Called after spawns so it can sit atop the planked bridge. */
  private setupWorldGate(): void {
    if (!this.level.overworld || !NOMAD_GATE.tiles.length) return;
    if (questLog.getFlag(NOMAD_GATE.flag)) return; // already opened in a past visit
    const gate = { blocked: new Set<string>(), sprites: [] as Phaser.GameObjects.GameObject[], rects: [] as Phaser.GameObjects.Rectangle[] };
    for (const tl of NOMAD_GATE.tiles) {
      gate.blocked.add(`${tl.x},${tl.y}`);
      const c = this.tileCenter(tl.x, tl.y);
      gate.rects.push(this.addBlocker(c.x, c.y, TILE_SIZE, TILE_SIZE));
      const post = this.add.image(c.x, c.y + 6, 'ward-gate').setOrigin(0.5, 0.82).setScale(0.75).setDepth(c.y + 1);
      gate.sprites.push(post);
      const glow = this.add.image(c.x, c.y - 6, 'fx-glow-magic').setScale(1.5).setAlpha(0.3).setBlendMode(Phaser.BlendModes.ADD).setDepth(c.y);
      this.tweens.add({ targets: glow, alpha: { from: 0.16, to: 0.44 }, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      gate.sprites.push(glow);
    }
    this.worldGate = gate;
  }

  /** Tear down the warded bridge: consume the heirloom's ward, remove barrier
   *  bodies + sprites, set the persistent flag, and rebuild pathing so the way
   *  west is truly open. */
  private openWorldGate(): void {
    const gate = this.worldGate;
    questLog.setFlag(NOMAD_GATE.flag);
    if (!gate) return;
    for (const r of gate.rects) {
      const i = this.blockers.indexOf(r);
      if (i >= 0) this.blockers.splice(i, 1);
      r.destroy();
    }
    for (const s of gate.sprites) {
      this.tweens.killTweensOf(s); // stop the endless ward-glow pulse so the dissolve is clean
      this.tweens.add({ targets: s, alpha: 0, duration: 600, onComplete: () => s.destroy() });
    }
    this.worldGate = undefined;
    this.flow = new FlowField(this.level.width, this.level.height, (x, y) => this.isWalkable(x, y));
    audio.sfx('portal');
    this.spawnBlink(this.tileCenter(NOMAD_GATE.tiles[0].x, NOMAD_GATE.tiles[0].y).x, this.tileCenter(NOMAD_GATE.tiles[0].x, NOMAD_GATE.tiles[0].y).y);
  }

  // ======================= overworld combat encounters =======================

  /** Precompute the "safe" overworld tiles (roads, bridges, and a ring around
   *  every town gate) where no ambush springs, and set a post-arrival breather. */
  private initOverworldEncounters(): void {
    this.safeTiles.clear();
    const roadKeys = new Set(['road', 'bridge-plank', 'desert-road', 'signpost']);
    for (const d of this.level.decor ?? []) if (roadKeys.has(d.key)) this.safeTiles.add(`${d.x},${d.y}`);
    for (const sp of this.level.spawns) {
      if (sp.kind !== 'door') continue;
      for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) this.safeTiles.add(`${sp.x + dx},${sp.y + dy}`);
    }
    this.encounterDanger = 0;
    this.lastLeaderTile = { x: -1, y: -1 };
    const grace = (this.registry.get('encounterGrace') as number | undefined) ?? 1600;
    this.registry.remove('encounterGrace');
    this.encounterGraceUntil = this.time.now + grace;
  }

  /** Fill the hidden danger meter as the party crosses the Wilds; trip an
   *  encounter when it overflows off the roads. Rate scales with biome,
   *  difficulty and the encounter-rate setting. Standing still / hugging roads
   *  and town gates is safe. */
  private updateOverworldDanger(time: number): void {
    if (this.won || time < this.encounterGraceUntil || this.anyOverlayOpen()) return;
    const rate = settings.get('gameplay').encounterRate ?? 1;
    if (rate <= 0) return;
    const lead = this.players[0];
    if (!lead || !lead.alive) return;
    const tx = Math.floor(lead.x / TILE_SIZE), ty = Math.floor(lead.y / TILE_SIZE);
    if (this.lastLeaderTile.x < 0) { this.lastLeaderTile = { x: tx, y: ty }; return; }
    if (tx === this.lastLeaderTile.x && ty === this.lastLeaderTile.y) return; // no new tile → no danger
    const stepped = Math.abs(tx - this.lastLeaderTile.x) + Math.abs(ty - this.lastLeaderTile.y);
    this.lastLeaderTile = { x: tx, y: ty };
    if (this.safeTiles.has(`${tx},${ty}`)) { this.encounterDanger = Math.max(0, this.encounterDanger - 5); return; }
    const biome = biomeAt(tx, ty);
    const diff = DIFFICULTY[settings.get('gameplay').difficulty].enemyMult;
    this.encounterDanger += stepped * BIOME_DANGER[biome] * rate * diff * (1.9 + Math.random() * 1.3);
    if (this.encounterDanger >= 80) this.triggerEncounter(biome, tx, ty);
  }

  /** Roll a pack, build its biome arena, and sweep the party into it. */
  private triggerEncounter(biome: ReturnType<typeof biomeAt>, tx: number, ty: number): void {
    if (this.won) return;
    this.won = true; // freeze the overworld sim through the transition
    this.encounterDanger = 0;
    const diff = DIFFICULTY[settings.get('gameplay').difficulty].enemyMult;
    const spec = rollEncounter(biome, diff, this.players[0]?.level ?? 1);
    const seed = ((tx * 73856093) ^ (ty * 19349663) ^ (Math.floor(this.time.now) & 0xffff)) >>> 0;
    const arena = buildArena(spec, seed);
    Content.registerDynamic(arena);
    this.registry.set('overworldReturn', { x: tx, y: ty }); // drop the party back here after
    this.registry.set('encounterGrace', 2600);
    this.registry.set('carryParty', this.carryList());
    this.registry.set('levelId', arena.id);
    this.registry.set('twoPlayer', this.twoPlayer);
    this.registry.remove('loadSave');
    this.encounterStinger(spec.ambush);
    audio.sfx('portal');
    this.cameras.main.shake(360, 0.012);
    this.cameras.main.flash(200, 70, 18, 18);
    this.cameras.main.fadeOut(680, 0, 0, 0);
    this.time.delayedCall(1000, () => { this.scene.stop('HudScene'); this.scene.start('DungeonScene'); });
  }

  /** Lay out the encounter pack across the far side of the arena, scale it to the
   *  party's level, crown a champion for elite packs, and open with the banner. */
  private spawnArenaFoes(): void {
    const foes = (this.level.arenaFoes ?? []) as EnemyId[];
    const W = this.level.width;
    const cx = Math.floor(W / 2);
    const cols = Math.max(1, Math.min(foes.length, 5));
    foes.forEach((id, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const gx = Math.max(4, Math.min(W - 5, Math.round(cx + (col - (cols - 1) / 2) * 5)));
      const gy = 5 + row * 4;
      const c = this.tileCenter(gx, gy);
      this.makeMonster(c.x, c.y, id);
    });
    if (this.level.arenaElite && this.monsters.length) this.eliteify(this.monsters[Math.floor(this.monsters.length / 2)]);
    this.arenaFoeCount = this.monsters.length;
    this.arenaStarted = true;
    this.arenaResolved = false;
    this.arenaRetreatMs = 0;
    this.arenaFleeHintShown = false;
    // ambushes lock the party in for a beat; a normal pack lets you break away sooner
    this.arenaFleeUnlockAt = this.time.now + (this.level.arenaAmbush ? 3200 : 900);
    this.encounterIntro();
  }

  /** Watch the arena for victory (all foes down) or a completed retreat. */
  private updateArena(time: number, delta: number): void {
    if (!this.arenaStarted || this.arenaResolved) return;
    if (this.monsters.length === 0) { this.arenaVictory(); return; }
    const lead = this.players[0];
    if (!lead || !lead.alive) return;
    const inZone = Math.floor(lead.y / TILE_SIZE) >= this.level.height - 4 && time >= this.arenaFleeUnlockAt;
    if (!inZone) { this.arenaRetreatMs = 0; this.arenaFleeHintShown = false; return; }
    this.arenaRetreatMs += delta;
    if (!this.arenaFleeHintShown && this.arenaRetreatMs > 250) {
      this.arenaFleeHintShown = true;
      this.showBark('Slipping back toward the treeline… hold the line to break away.', 1800, 'event', '#8ad0ff');
    }
    if (this.arenaRetreatMs > 1300) {
      this.arenaRetreatMs = 0;
      const chance = Math.max(0.35, Math.min(0.9, 0.92 - this.monsters.length * 0.07));
      if (Math.random() < chance) this.arenaFlee();
      else { this.arenaFleeHintShown = false; this.showBark('They cut you off — you couldn’t break away!', 2200, 'system'); }
    }
  }

  /** Cleared the pack: gather the spoils, bank the streak, head back out. */
  private arenaVictory(): void {
    if (this.arenaResolved) return;
    this.arenaResolved = true;
    this.won = true;
    const lead = this.players[0];
    if (lead) this.sweepArenaLoot(lead);
    const streak = ((this.registry.get('encounterStreak') as number | undefined) ?? 0) + 1;
    this.registry.set('encounterStreak', streak);
    const bonus = Math.min(240, Math.round((streak - 1) * 20 * this.lootScale().goldMult));
    if (bonus > 0 && lead) { lead.inventory.addGold(bonus); lead.addScore(bonus); }
    this.arenaBanner('VICTORY', bonus > 0 ? `The road is yours.   Rampage x${streak}  ·  +${bonus}g` : 'The road is yours again.', '#8affa0');
    this.registry.set('encounterGrace', 2600);
    this.returnToOverworld(1300);
  }

  /** Broke away from the fight: no spoils, streak reset, a longer breather. */
  private arenaFlee(): void {
    if (this.arenaResolved) return;
    this.arenaResolved = true;
    this.won = true;
    this.registry.set('encounterStreak', 0);
    this.registry.set('encounterGrace', 3400);
    this.arenaBanner('RETREAT', 'You slip back into the wilds — no spoils, but your skin.', '#8ad0ff');
    audio.sfx('portal');
    this.returnToOverworld(1000);
  }

  /** Pull every ground drop still lying in the arena into the leader's pack so a
   *  clean win never loses loot the party fought for. */
  private sweepArenaLoot(hero: Hero): void {
    let gold = 0, items = 0;
    for (const p of this.pickups) {
      if (p.kind === 'coin') { gold += p.value; hero.addScore(p.value); }
      else if (p.kind === 'food') hero.heal(p.value);
      else if ((p.kind === 'potion' || p.kind === 'item') && p.itemId) { const it = Content.item(p.itemId); if (it) { hero.inventory.add(it); items++; } }
      else if (p.kind === 'key') hero.inventory.addKey(p.value);
      p.sprite.destroy();
    }
    this.pickups = [];
    if (gold) hero.inventory.addGold(gold);
    hero.refreshStats();
    if (gold || items) this.showBark(`Spoils gathered${gold ? ` — +${gold}g` : ''}${items ? `${gold ? ',' : ' —'} ${items} item${items > 1 ? 's' : ''}` : ''}.`, 3200, 'loot', '#ffd76a');
  }

  private returnToOverworld(delayMs: number): void {
    this.registry.set('carryParty', this.carryList());
    this.registry.set('levelId', 'overworld');
    this.registry.set('twoPlayer', this.twoPlayer);
    this.registry.remove('loadSave');
    this.cameras.main.fadeOut(Math.max(300, delayMs - 120), 0, 0, 0);
    this.time.delayedCall(delayMs, () => { this.scene.stop('HudScene'); this.scene.start('DungeonScene'); });
  }

  // ---- encounter cinematics (screen-space, survive the scene transition) ----

  private encounterStinger(ambush: boolean): void {
    const w = PLAY_AREA_WIDTH, h = GAME_HEIGHT;
    const veil = this.add.rectangle(w / 2, h / 2, w, h, ambush ? 0x2a0806 : 0x1a0f04, 0).setScrollFactor(0).setDepth(DEPTH.OVERLAY);
    this.tweens.add({ targets: veil, fillAlpha: 0.5, duration: 500 });
    const t = this.add.text(w / 2, h / 2, ambush ? 'AMBUSH!' : 'ENCOUNTER!', {
      fontFamily: 'MedievalSharp, "Trebuchet MS", cursive', fontSize: '58px', color: ambush ? '#ff5a44' : '#ffd27a', fontStyle: 'bold', stroke: '#000', strokeThickness: 7,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.OVERLAY + 1).setScale(1.5).setAlpha(0);
    this.tweens.add({ targets: t, alpha: 1, scale: 1, duration: 320, ease: 'Back.easeOut' });
  }

  private encounterIntro(): void {
    const w = PLAY_AREA_WIDTH;
    const y = 74;
    const title = this.add.text(w / 2, y, this.level.name.toUpperCase(), {
      fontFamily: 'MedievalSharp, "Trebuchet MS", cursive', fontSize: '30px', color: this.level.arenaAmbush ? '#ff6a54' : '#ffe1a0', fontStyle: 'bold', stroke: '#000', strokeThickness: 6,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.OVERLAY + 1).setAlpha(0);
    const foeword = this.arenaFoeCount === 1 ? 'a lone foe' : `${this.arenaFoeCount} foes`;
    const sub = this.add.text(w / 2, y + 30, `${foeword}${this.level.arenaElite ? ' · a champion among them' : ''} · ${this.level.arenaBiomeName ?? ''}`, {
      fontFamily: 'MedievalSharp, "Trebuchet MS", cursive', fontSize: '15px', color: '#e6dcc4', stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.OVERLAY + 1).setAlpha(0);
    for (const o of [title, sub]) this.tweens.add({ targets: o, alpha: 1, duration: 400, yoyo: true, hold: 2200, delay: 250, onComplete: () => o.destroy() });
    if (this.level.arenaAmbush) { this.cameras.main.shake(300, 0.01); audio.sfx('hit'); }
  }

  private arenaBanner(title: string, sub: string, color: string): void {
    const w = PLAY_AREA_WIDTH, h = GAME_HEIGHT;
    this.add.rectangle(w / 2, h / 2, w, h, 0x05060a, 0.55).setScrollFactor(0).setDepth(DEPTH.OVERLAY);
    this.add.text(w / 2, h / 2 - 12, title, {
      fontFamily: 'MedievalSharp, "Trebuchet MS", cursive', fontSize: '50px', color, fontStyle: 'bold', stroke: '#000', strokeThickness: 6,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.OVERLAY + 1);
    this.add.text(w / 2, h / 2 + 34, sub, {
      fontFamily: 'MedievalSharp, "Trebuchet MS", cursive', fontSize: '15px', color: '#e6dcc4', align: 'center', wordWrap: { width: w - 100 }, stroke: '#000', strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.OVERLAY + 1);
    audio.sfx('victory');
  }

  private spawnWorldEntities(): void {
    for (const sp of this.level.spawns) {
      const c = this.tileCenter(sp.x, sp.y);
      switch (sp.kind) {
        case 'playerStart':
          this.startTile = { x: sp.x, y: sp.y };
          break;
        case 'npc': {
          if (this.level.town) {
            const sheet = sp.npcId === NOMAD_GATE.npcId
              ? 'desertfolk-4' // the veiled Wanderer reads as a robed nomad, not a plains townsperson
              : this.level.id === 'desert_town'
                ? `desertfolk-${desertfolkVariant(sp.npcRole ?? '')}`
                : `townsfolk-${townsfolkVariant(sp.npcRole ?? '')}`;
            const spr = this.add
              .sprite(c.x, c.y, sheet)
              .setScale(NPC_SPRITE_SCALE * settings.spriteScale())
              .setDepth(c.y);
            this.shadows.add(spr);
            this.townNpcs.push({ sprite: spr, homeX: c.x, homeY: c.y, vx: 0, vy: 0, nextTurn: 0, label: sp.label ?? 'Townsfolk', role: sp.npcRole ?? 'a townsperson', npcId: sp.npcId });
          } else {
            const npc = this.add.sprite(c.x, c.y, 'npc-elder').setDepth(c.y).setScale(HERO_SPRITE_SCALE * settings.spriteScale());
            this.shadows.add(npc);
          }
          break;
        }
        case 'portal': {
          const idx = Content.levelOrder.indexOf(sp.realmId ?? '');
          const ur = this.unlockedRealms();
          const unlocked = idx >= 0 && idx < ur;
          const cleared = idx >= 0 && idx < ur - 1;
          const tint = cleared ? 0x7fe0a0 : unlocked ? 0xc79bff : 0x4a4a52;
          const spr = this.add.sprite(c.x, c.y, 'portal-sheet').play('portal').setScale(1.2).setDepth(c.y).setTint(tint);
          const glow = this.add
            .image(c.x, c.y, 'fx-glow-white')
            .setScale(2.4)
            .setAlpha(unlocked ? 0.45 : 0.16)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setDepth(c.y - 1)
            .setTint(tint);
          this.tweens.add({ targets: glow, alpha: { from: unlocked ? 0.3 : 0.1, to: unlocked ? 0.62 : 0.2 }, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
          const state = cleared ? '  ✓ cleared' : unlocked ? '' : '  (sealed)';
          const cap = `${idx + 1}. ${sp.label ?? 'Realm'}${state}`;
          this.add
            .text(c.x, c.y - 30, cap, { fontFamily: 'MedievalSharp, "Trebuchet MS", cursive', fontSize: '11px', color: cleared ? '#9fe7b0' : unlocked ? '#ffe9a8' : '#9a9aa6', align: 'center', stroke: '#000', strokeThickness: 3 })
            .setOrigin(0.5)
            .setDepth(c.y + 40);
          if (cleared) {
            this.add
              .text(c.x, c.y - 46, '✓', { fontFamily: 'MedievalSharp, "Trebuchet MS", cursive', fontSize: '20px', color: '#7fe0a0', stroke: '#08120a', strokeThickness: 4 })
              .setOrigin(0.5)
              .setDepth(c.y + 41);
          }
          this.shadows.add(spr);
          this.portals.push({ sprite: spr, realmId: sp.realmId ?? '', label: sp.label ?? 'Realm', x: sp.x, y: sp.y });
          break;
        }
        case 'merchant': {
          const tintByShop: Record<ShopKind, number> = { blacksmith: 0x9fb6d8, apothecary: 0x9fe07a, tavern: 0xffce6a, home: 0xff9a6a, guild: 0xff8a5a };
          const shop = sp.shop ?? 'home';
          const spr = this.add.sprite(c.x, c.y, 'npc-elder').setDepth(c.y).setTint(tintByShop[shop]).setScale(HERO_SPRITE_SCALE * settings.spriteScale());
          this.shadows.add(spr);
          this.add
            .image(c.x, c.y - 6, 'fx-glow-warm')
            .setScale(1.2)
            .setAlpha(0.25)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setDepth(c.y - 1)
            .setTint(tintByShop[shop]);
          this.add
            .text(c.x, c.y - 24, sp.label ?? 'Merchant', { fontFamily: 'MedievalSharp, "Trebuchet MS", cursive', fontSize: '11px', color: '#ffe9a8', align: 'center', stroke: '#000', strokeThickness: 3 })
            .setOrigin(0.5)
            .setDepth(c.y + 40);
          this.merchants.push({ sprite: spr, shop, label: sp.label ?? 'Merchant', x: sp.x, y: sp.y });
          break;
        }
        case 'door': {
          const glow = this.add.image(c.x, c.y - 4, 'fx-glow-warm').setScale(1.5).setAlpha(0.3).setBlendMode(Phaser.BlendModes.ADD).setDepth(c.y - 1).setTint(0xffce6a);
          this.tweens.add({ targets: glow, alpha: { from: 0.16, to: 0.44 }, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
          this.add
            .text(c.x, c.y - 22, sp.label ?? 'Enter', { fontFamily: 'MedievalSharp, "Trebuchet MS", cursive', fontSize: '10px', color: '#ffe9a8', align: 'center', stroke: '#000', strokeThickness: 3 })
            .setOrigin(0.5)
            .setDepth(c.y + 40);
          this.doors.push({ x: sp.x, y: sp.y, interiorId: sp.interiorId ?? 'town', label: sp.label ?? 'Door', dir: sp.dir, comingSoon: sp.comingSoon });
          break;
        }
        case 'generator':
          this.spawnGenerator(sp.x, sp.y, sp.enemyId ?? 'grunt', sp.interval ?? 4000, sp.maxAlive ?? 4, sp.hp ?? 30);
          break;
        case 'chest': {
          const spr = this.add.image(c.x, c.y, 'chest').setDepth(c.y);
          this.shadows.add(spr, 4);
          spr.setTint(0xbcd0e8); // locked chests read cooler/steely until opened
          this.chests.push({ sprite: spr, itemId: sp.itemId ?? 'health_potion', questItemId: sp.questItemId, opened: false, locked: true, x: sp.x, y: sp.y });
          break;
        }
        case 'shrine': {
          const spr = this.add.image(c.x, c.y, 'shrine').setDepth(c.y);
          this.add.image(c.x, c.y - 6, 'fx-glow-magic').setScale(1.6).setAlpha(0.3).setBlendMode(Phaser.BlendModes.ADD).setDepth(c.y - 1);
          this.shrines.push({ sprite: spr, used: false, x: sp.x, y: sp.y });
          break;
        }
        case 'key': {
          const spr = this.add.image(c.x, c.y, 'key').setDepth(c.y);
          this.floatBob(spr);
          this.pickups.push({ sprite: spr, kind: 'key', value: 1 });
          break;
        }
        case 'boss': {
          const boss = this.makeMonster(c.x, c.y, sp.enemyId ?? 'grave_warden');
          this.boss = boss;
          this.bossAlive = true;
          boss.onDeath = () => this.onBossDeath();
          break;
        }
      }
    }
    this.generatorsTotal = this.generators.length;
    this.spawnPickups();
    this.pickups.forEach((p, i) => (p.id = i));
  }

  private spawnGenerator(tx: number, ty: number, enemyId: string, interval: number, maxAlive: number, hp: number): void {
    const c = this.tileCenter(tx, ty);
    const mc = settings.get('gameplay').monsterCount * DIFFICULTY[settings.get('gameplay').difficulty].enemyMult;
    maxAlive = Math.max(1, Math.round(maxAlive * mc));
    interval = Math.max(700, Math.round(interval / mc));
    const gen = new Generator(this, c.x, c.y, enemyId as never, interval, maxAlive, hp);
    gen.onSpawn = (g) => {
      const m = this.makeMonster(g.x + Phaser.Math.Between(-8, 8), g.y + Phaser.Math.Between(-4, 10), g.enemyId as EnemyId);
      if (Math.random() < 0.07) this.eliteify(m);
      return m;
    };
    gen.onDestroyed = () => {
      this.generatorsDestroyed++;
      this.showBark('A spawning altar is destroyed!', 3400, 'combat');
      const altarsLeft = Math.max(0, this.requiredGenerators() - this.generatorsDestroyed);
      void aiService
        .generateAltarProgress(this.level.name, altarsLeft)
        .then(({ text, live }) => {
          if (text) {
            this.questBeat = text;
            if (live) this.pushLog(text, 'grok', { source: 'live', depth: 'bark' });
          }
        });
      if (altarsLeft === 0) {
        this.grokNarrate(this.barkContext('the last spawning altar falls — the exit stirs awake'), { force: true });
      } else if (Math.random() < 0.4) {
        this.grokNarrate(this.barkContext('the heroes shatter a spawning altar', { altarsLeft }));
      }
      // Altars reliably cough up themed gear (honed or better).
      const ls = this.lootScale();
      if (Math.random() < generatorDropChance(this.bestLuck()) * settings.get('gameplay').lootMult * ls.dropMult) this.dropLoot(gen.x, gen.y, 'honed');
    };
    this.generators.push(gen);
    this.shadows.add(gen, 2);
  }

  private spawnPickups(): void {
    for (const p of this.level.pickups) {
      const c = this.tileCenter(p.x, p.y);
      if (p.kind === 'coin') {
        const spr = this.add.sprite(c.x, c.y, 'coin-sheet').play('coin').setDepth(c.y);
        this.floatBob(spr);
        this.pickups.push({ sprite: spr, kind: 'coin', value: p.coin ?? 5 });
      } else if (p.kind === 'food') {
        const spr = this.add.image(c.x, c.y, 'food').setDepth(c.y);
        this.floatBob(spr);
        this.pickups.push({ sprite: spr, kind: 'food', value: 40 });
      } else if (p.kind === 'potion') {
        const id = p.itemId ?? 'health_potion';
        const spr = this.add.image(c.x, c.y, ITEMS[id]?.icon ?? 'potion-red').setDepth(c.y);
        this.floatBob(spr);
        this.pickups.push({ sprite: spr, kind: 'potion', value: 0, itemId: id });
      } else if (p.kind === 'item' && p.itemId) {
        const item = ITEMS[p.itemId];
        const spr = this.add.image(c.x, c.y, item?.icon ?? 'icon-sword').setDepth(c.y);
        this.add.image(c.x, c.y, 'fx-glow-warm').setScale(1.4).setAlpha(0.4).setBlendMode(Phaser.BlendModes.ADD).setDepth(c.y - 1);
        this.floatBob(spr);
        this.pickups.push({ sprite: spr, kind: 'item', value: 0, itemId: p.itemId });
      }
    }
  }

  private floatBob(spr: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite): void {
    this.tweens.add({ targets: spr, y: spr.y - 3, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  private createHeroes(): void {
    const c = this.tileCenter(this.startTile.x, this.startTile.y);
    const p1 = (this.registry.get('p1Class') as HeroClassId) ?? 'vanguard';
    const h1 = new Hero(this, c.x, c.y, p1, true, 1);
    h1.onDeathlordShift = (hero, active) => this.deathlordFx(hero, active);
    this.players.push(h1);
    this.allyGroup.add(h1);
    this.shadows.add(h1, 3);
    if (this.twoPlayer) {
      const p2 = (this.registry.get('p2Class') as HeroClassId) ?? 'thief';
      const h2 = new Hero(this, c.x + 14, c.y, p2, true, 2);
      h2.onDeathlordShift = (hero, active) => this.deathlordFx(hero, active);
      this.players.push(h2);
      this.allyGroup.add(h2);
      this.shadows.add(h2, 3);
    }
  }

  private createCompanions(): void {
    if (this.level.interior) {
      this.allies = [...this.players];
      return;
    }
    const used = new Set(this.players.map((p) => p.classId));
    // Allies no longer follow for free — only those hired at the Fighters Guild
    // (for this descent) march with the party.
    const hired = (this.registry.get('hiredAllies') as HeroClassId[] | undefined) ?? [];
    const pool = ALL_CLASSES.filter((c) => !used.has(c) && hired.includes(c));
    const c = this.tileCenter(this.startTile.x, this.startTile.y);
    pool.forEach((cls, i) => {
      const comp = new Companion(this, c.x + Phaser.Math.Between(-20, 20), c.y + 16 + i * 6, cls);
      const starterId = COMPANION_STARTER[cls];
      const starter = starterId ? Content.item(starterId) : null;
      if (starter) comp.inventory.equipped[migrateEquipKey(starter.slot)] = starter;
      comp.recompute();
      this.companions.push(comp);
      this.allyGroup.add(comp);
      this.shadows.add(comp, 3);
    });
    this.allies = [...this.players, ...this.companions];
    const veterans = this.registry.get('companionVeterans') as SaveAlly[] | undefined;
    if (veterans?.length) this.applyPartyCarry(veterans);
    const sl = settings.get('gameplay').startLevel;
    if (sl > 1) for (const a of this.allies) a.setStartLevel(sl);
  }

  private setupColliders(): void {
    this.physics.add.collider(this.allyGroup, this.blockers);
    this.physics.add.collider(this.monsterGroup, this.blockers);
    this.physics.add.collider(this.allyGroup, this.generators);
  }

  update(time: number, delta: number): void {
    this.refreshPauseState();
    this.pollMenus();
    this.updateCoop(time);

    if (!this.paused && !this.won) {
      this.handlePlayerInput(time, delta);
      this.updateCompanions(time, delta);
      if (this.level.town) {
        // peaceful hub: no monsters, generators, hazards or boss — just life.
        // Auras still ring here: the Bard's March quickens the walk home and
        // the Warden's regen mends the party between descents.
        this.updateTown(time, delta);
        this.updateWardenRegen(delta);
        this.updateAuras(time);
        this.handlePickups();
        if (this.level.overworld) this.updateOverworldDanger(time);
      } else {
        // In co-op, a guest's enemies are owned by the host (see updateCoop);
        // solo and host both simulate locally as normal.
        if (!this.coopGuest) {
          this.updateMonsters(time, delta);
          this.updateGenerators(time);
        }
        this.updateSneak(time);
        this.resolveCombat(time);
        this.updateWardenRegen(delta);
        this.updateProjectiles(time, delta);
        this.updateEnemyProjectiles(time, delta);
        this.updateGroundZones(time);
        this.updateCorpses(time);
        this.updateAuras(time);
        this.handleHazards(time);
        this.handlePickups();
        this.handleAutoInteractions();
        this.updateBossMusic();
        if (this.level.arena) this.updateArena(time, delta);
        this.checkExit();
        this.checkGameOver();
      }
    } else if (this.gameOverUI.isOpen()) {
      if (Phaser.Input.Keyboard.JustDown(this.continueKey)) this.continueAfterDeath();
      else if (Phaser.Input.Keyboard.JustDown(this.menuKey)) this.quitToMenu();
    }

    this.shadows.update();
    this.updateLighting(time);
    if (this.wisp) this.updateFamiliar(time);
    this.updateCamera();
    this.updateMinimap();
    // ~11 Hz is plenty for HP bars + the m:ss timer, and skips rebuilding the
    // slot/controls object graph on every frame. Gameplay events that need an
    // instant HUD refresh still call syncHudData() directly.
    if (time >= this.hudNextSync) {
      this.hudNextSync = time + 90;
      this.syncHudData();
    }
    this.syncNet();
  }

  private anyOverlayOpen(): boolean {
    return (
      this.inventoryUI.isOpen() ||
      this.skillsUI.isOpen() ||
      this.settingsUI.isOpen() ||
      this.gameOverUI.isOpen() ||
      this.sheetUI.isOpen() ||
      this.abilityUI.isOpen() ||
      this.manualUI.isOpen() ||
      this.pickpocketUI.isOpen() ||
      this.saveLoadUI.isOpen() ||
      this.shopUI.isOpen() ||
      this.guildUI.isOpen() ||
      this.questBoardUI.isOpen() ||
      this.dialogueUI.isOpen() ||
      this.stashUI.isOpen() ||
      this.fishingUI.isOpen() ||
      this.tradeUI.isOpen() ||
      // NOTE: lootRollUI is deliberately NOT here — pausing would freeze the
      // dice timers and, for a party host, everyone's enemies mid-fight.
      this.quitConfirm !== null
    );
  }

  private closeAllOverlays(): void {
    if (this.inventoryUI.isOpen()) this.inventoryUI.close();
    if (this.skillsUI.isOpen()) this.skillsUI.close();
    if (this.settingsUI.isOpen()) this.settingsUI.close();
    if (this.sheetUI.isOpen()) this.sheetUI.close();
    if (this.abilityUI.isOpen()) this.abilityUI.close();
    if (this.manualUI.isOpen()) this.manualUI.close();
    if (this.pickpocketUI.isOpen()) this.pickpocketUI.close();
    if (this.saveLoadUI.isOpen()) this.saveLoadUI.close();
    if (this.shopUI.isOpen()) this.shopUI.close();
    if (this.guildUI.isOpen()) this.guildUI.close();
    if (this.questBoardUI.isOpen()) this.questBoardUI.close();
    if (this.dialogueUI.isOpen()) this.dialogueUI.close();
    if (this.stashUI.isOpen()) this.stashUI.close();
    if (this.fishingUI.isOpen()) this.fishingUI.close();
    if (this.tradeUI.isOpen()) this.tradeUI.close();
    // programmatic close keeps an unanswered roll pending (banner returns)
    if (this.lootRollUI.isOpen()) this.lootRollUI.close(false);
  }

  private pollMenus(): void {
    if (this.input2.capturing || this.gameOverUI.isOpen()) return;

    if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
      if (this.quitConfirm) this.closeQuitConfirm();
      else if (this.manualUI.isOpen()) this.manualUI.close();
      else if (this.lootRollUI.isOpen()) this.lootRollUI.close(false); // stays pending
      else if (this.anyOverlayOpen()) this.closeAllOverlays();
      else this.confirmQuit();
      return;
    }

    // the save/load window swallows other menu hotkeys while open
    if (this.saveLoadUI.isOpen()) return;

    if (this.input2.justDown('p1', 'sheet')) this.toggleSheet(0);
    if (this.input2.justDown('p1', 'inventory')) this.toggleInventory(0);
    if (this.input2.justDown('p1', 'growth')) this.toggleGrowth(0);
    if (this.players[1]) {
      if (this.input2.justDown('p2', 'sheet')) this.toggleSheet(1);
      if (this.input2.justDown('p2', 'inventory')) this.toggleInventory(1);
      if (this.input2.justDown('p2', 'growth')) this.toggleGrowth(1);
    }
    if (this.input2.globalJustDown('settings')) this.toggleSettings();
    if (this.input2.globalJustDown('manual')) this.toggleManual();
    if (this.input2.globalJustDown('joinP2')) this.joinPlayer2();
    if (!this.anyOverlayOpen()) {
      if (this.input2.justDown('p1', 'steal') || this.input2.padJustDown('p1', 'steal')) this.attemptPickpocket(0);
      if (this.players[1] && (this.input2.justDown('p2', 'steal') || this.input2.padJustDown('p2', 'steal'))) this.attemptPickpocket(1);
    }
  }

  private toggleInventory(idx: number): void {
    if (this.inventoryUI.isOpen()) return this.inventoryUI.close();
    const p = this.players[idx];
    if (!p) return;
    this.closeAllOverlays();
    this.inventoryUI.open(p);
  }
  private toggleGrowth(idx: number): void {
    if (this.skillsUI.isOpen()) return this.skillsUI.close();
    const p = this.players[idx];
    if (!p) return;
    this.closeAllOverlays();
    this.skillsUI.open(p);
  }
  private toggleSheet(idx: number): void {
    if (this.sheetUI.isOpen()) return this.sheetUI.close();
    const p = this.players[idx];
    if (!p) return;
    this.closeAllOverlays();
    this.sheetUI.open(p);
  }
  /** Open the Echoes & Sigils screen for a hero (from the character-sheet button). */
  openAbilities(hero: Hero): void {
    this.closeAllOverlays();
    this.abilityUI.open(hero);
  }
  private toggleSettings(): void {
    if (this.settingsUI.isOpen()) return this.settingsUI.close();
    this.closeAllOverlays();
    this.settingsUI.open();
  }
  private toggleManual(): void {
    if (this.manualUI.isOpen()) return this.manualUI.close();
    this.closeAllOverlays();
    this.manualUI.open();
  }

  private refreshPauseState(): void {
    const open = this.anyOverlayOpen();
    if (open !== this.paused) {
      this.paused = open;
      if (open) {
        this.physics.world.pause();
        this.time.timeScale = 0;
      } else {
        this.physics.world.resume();
        this.time.timeScale = 1;
      }
    }
  }

  private handlePlayerInput(time: number, delta: number): void {
    const p1 = this.players[0];
    if (p1?.alive) {
      const m = this.input2.move('p1');
      let mvx = m.x;
      let mvy = m.y;
      // hold left mouse in the play area to walk toward the cursor (keyboard wins)
      const ptr = this.input.activePointer;
      if (mvx === 0 && mvy === 0 && ptr.isDown && ptr.x >= PLAY_AREA_X && ptr.x < PLAY_AREA_X + PLAY_AREA_WIDTH) {
        const wp = this.cameras.main.getWorldPoint(ptr.x, ptr.y);
        const dx = wp.x - p1.x;
        const dy = wp.y - p1.y;
        const d = Math.hypot(dx, dy);
        if (d > 10) {
          mvx = dx / d;
          mvy = dy / d;
        }
      }
      p1.setMoveInput(mvx, mvy);
      if (mvx || mvy) this.activeIdx = 0;
      // right mouse = attack toward the cursor; double right-click = magic
      if (ptr.rightButtonDown() && ptr.x >= PLAY_AREA_X && ptr.x < PLAY_AREA_X + PLAY_AREA_WIDTH) {
        const wp = this.cameras.main.getWorldPoint(ptr.x, ptr.y);
        p1.faceTo(wp.x - p1.x, wp.y - p1.y);
        p1.tryMelee(time);
        this.activeIdx = 0;
      }
      if (this.magicQueued) {
        this.magicQueued = false;
        p1.tryMagic(time);
      }
      if (this.input2.isDown('p1', 'attack')) p1.tryMelee(time);
      if (this.input2.justDown('p1', 'magic')) p1.tryMagic(time);
      if (this.input2.justDown('p1', 'use')) this.interact(p1);
      if ((this.input2.justDown('p1', 'dodge') || this.input2.padJustDown('p1', 'dodge')) && p1.tryDodge(time)) { this.spawnDodgeFx(p1); this.dodgePowers(p1, time); }
      this.handleAbilityInput(p1, time);
      this.handleActiveInput(p1, time);
      this.checkLowHealth(p1);
    }
    if (p1) p1.tick(time, delta);

    const p2 = this.players[1];
    if (p2?.alive) {
      const m = this.input2.move('p2');
      p2.setMoveInput(m.x, m.y);
      if (m.x || m.y) this.activeIdx = 1;
      if (this.input2.isDown('p2', 'attack')) p2.tryMelee(time);
      if (this.input2.justDown('p2', 'magic')) p2.tryMagic(time);
      if (this.input2.justDown('p2', 'use')) this.interact(p2);
      if ((this.input2.justDown('p2', 'dodge') || this.input2.padJustDown('p2', 'dodge')) && p2.tryDodge(time)) { this.spawnDodgeFx(p2); this.dodgePowers(p2, time); }
      this.handleAbilityInputP2(p2, time);
      this.handleActiveInput(p2, time);
    }
    if (p2) p2.tick(time, delta);
  }

  private leader(): Hero | null {
    const active = this.players[this.activeIdx];
    if (active?.alive) return active;
    return this.players.find((p) => p.alive) ?? this.players[0] ?? null;
  }

  private updateCompanions(time: number, delta: number): void {
    const liveMonsters = this.monsters.filter((m) => m.active && m.alive);
    // expire timed-out summons
    for (const sk of this.summons) {
      if (sk.alive && sk.expireAt && time > sk.expireAt) {
        sk.expireAt = 0;
        this.crumbleSummon(sk);
      }
    }
    // pronounced lifetime countdown: a shrinking green→red bar over each summon,
    // and the skeleton blinks in its final 2 seconds before it crumbles.
    if (!this.summonTimerGfx) this.summonTimerGfx = this.add.graphics().setDepth(DEPTH.OVERLAY - 25);
    const tg = this.summonTimerGfx;
    tg.clear();
    for (const sk of this.summons) {
      if (!sk.active || !sk.alive || !sk.expireAt) continue;
      const total = Math.max(1, sk.expireAt - sk.lifeStart);
      const remain = sk.expireAt - time;
      const frac = Phaser.Math.Clamp(remain / total, 0, 1);
      const w = 20;
      const bx = sk.x - w / 2;
      const by = sk.y - 30;
      tg.fillStyle(0x000000, 0.55); tg.fillRect(bx - 1, by - 1, w + 2, 5);
      tg.fillStyle(frac > 0.3 ? 0x8bd98b : 0xff6a4a, 1); tg.fillRect(bx, by, w * frac, 3);
      sk.setAlpha(remain < 2000 ? 0.45 + 0.55 * Math.abs(Math.sin(time / 110)) : 1);
    }
    // Altars are only "targets" for a companion that is right next to one, so the
    // party keeps following the leader instead of peeling off across the room to
    // chase a stationary altar. (Per-companion list built in the loop below.)
    const aliveGens = this.generators.filter((g) => g.alive);
    const GEN_AGGRO_R = 46; // only smash an altar you're basically standing on
    const leader = this.leader();
    if (leader) {
      const ltx = Math.floor(leader.x / TILE_SIZE);
      const lty = Math.floor(leader.y / TILE_SIZE);
      if (this.flow.needsRecompute(ltx, lty) || time >= this.nextFlowAt) {
        this.flow.compute(ltx, lty);
        this.nextFlowAt = time + 400;
      }
    }
    const partyTactics = buildTacticalContext(
      this.allies,
      leader,
      liveMonsters,
      !!this.level.town,
      null,
      'party'
    ).situation;
    // ---- party AI: fire class special abilities when prudent (snapshot so a
    // necromancer summoning mid-pass doesn't disturb iteration) ----
    for (const comp of [...this.companions]) {
      if (!comp.alive || comp.isSummon || !comp.canAbility(time)) continue;
      if (this.companionShouldUseAbility(comp, liveMonsters, partyTactics)) {
        this.useAbility(comp, time, false);
        comp.markAbilityUsed(time);
      } else if (comp.classId === 'arcanist' && this.companionWantsFamiliar(comp)) {
        // Hired Arcanists keep their familiars conjured (mana-gated, like the
        // hired Necromancer's servants) whenever Meteor isn't called for.
        this.summonArcane(comp, ARCANE_ORDER[this.arcaneIdx++ % ARCANE_ORDER.length], true);
        comp.markAbilityUsed(time);
      } else if (comp.classId === 'bard' && !comp.song) {
        const want = decideBardSong(partyTactics);
        this.bardSing(comp, want);
        comp.markAbilityUsed(time);
      }
    }
    // Hired Bards retune to the fight; hired Druids shift with the tide of battle.
    for (const comp of this.companions) {
      if (!comp.alive || comp.isSummon) continue;
      if (comp.classId === 'bard' && comp.song && time >= comp.nextShiftAt) {
        const want: SongId = decideBardSong(partyTactics);
        if (comp.song !== want) {
          comp.nextShiftAt = time + 4000; // don't thrash between tunes
          this.bardSing(comp, want);
        }
      } else if (comp.classId === 'druid') {
        const wantBear = decideDruidBear(partyTactics, comp, liveMonsters);
        if (wantBear !== comp.bearForm && comp.shapeshift(time)) this.shiftFx(comp);
      }
    }
    for (const comp of this.companions) {
      if (comp.isThief && comp.alive) this.thiefStrike(comp, liveMonsters, time);
      // If a companion falls way behind the party (stuck behind a gate, left
      // across the map on level load), blink it to the leader after a grace.
      if (comp.alive && leader && leader.alive) {
        const far = Phaser.Math.Distance.Between(comp.x, comp.y, leader.x, leader.y);
        if (far > COMPANION_TELEPORT_DISTANCE) {
          const since = this.compFarSince.get(comp) ?? time;
          this.compFarSince.set(comp, since);
          if (time - since > COMPANION_TELEPORT_MS) {
            this.teleportCompanion(comp, leader);
            this.compFarSince.delete(comp);
            continue;
          }
        } else {
          this.compFarSince.delete(comp);
        }
      }
      // separation steering: push away from any ally crowding this companion
      let sx = 0;
      let sy = 0;
      if (comp.alive) {
        const SEP_R = 22;
        for (const a of this.allies) {
          if (a === comp || !a.alive) continue;
          const dx = comp.x - a.x;
          const dy = comp.y - a.y;
          const d2 = dx * dx + dy * dy;
          if (d2 > 0.01 && d2 < SEP_R * SEP_R) {
            const dd = Math.sqrt(d2);
            const push = (SEP_R - dd) / SEP_R;
            sx += (dx / dd) * push;
            sy += (dy / dd) * push;
          }
        }
      }
      // Monsters are always combat targets; an altar joins the list only when
      // this companion is already adjacent to it (so following stays smooth).
      let targets: Array<Monster | Generator> = liveMonsters;
      if (comp.alive && aliveGens.length) {
        const nearGens = aliveGens.filter(
          (g) => Phaser.Math.Distance.Between(comp.x, comp.y, g.x, g.y) < GEN_AGGRO_R
        );
        if (nearGens.length) targets = [...liveMonsters, ...nearGens];
      }
      const pathDir = leader && comp.alive ? this.flow.sample(comp.x, comp.y) : null;
      const tactical = buildTacticalContext(
        this.allies,
        leader,
        liveMonsters,
        !!this.level.town,
        (comp.classId === 'bard' ? comp.song : null) as TacticSongId | null,
        comp.classId
      );
      comp.aiTick(time, delta, leader, targets, pathDir, { x: sx * 0.6, y: sy * 0.6 }, tactical);
    }
  }

  /** The living Arcanist the familiar should shadow (player first), if any. */
  private familiarOwner(): Hero | null {
    return this.players.find((p) => p?.alive && p.classId === 'arcanist')
      ?? this.allies.find((a) => a.alive && a.classId === 'arcanist')
      ?? null;
  }

  /** If a rescue contract targets this realm, cage a villager in a far corner. */
  /** Stone-grey warden busts on plinths along the Lodge lawn — one trophy per
   *  cleared realm, so your victories are on show every time you come home. */
  private spawnLodgeTrophies(): void {
    const BOSS_SHEETS = [
      'monster-boss-sheet',
      'monster-molten_colossus-sheet',
      'monster-rime_cantor-sheet',
      'monster-rot_sovereign-sheet',
      'monster-brass_magnus-sheet',
      'monster-arena_champion-sheet',
      'monster-mire_leviathan-sheet',
      'monster-tempest_herald-sheet',
      'monster-umbral_devourer-sheet',
      'monster-hollow_king-sheet',
    ];
    const cleared = Math.min(this.unlockedRealms() - 1, BOSS_SHEETS.length);
    for (let i = 0; i < cleared; i++) {
      const c = this.tileCenter(82 + i, 24);
      this.add.image(c.x, c.y + 4, 'pillar').setDepth(c.y).setScale(0.55);
      this.add.image(c.x, c.y - 10, BOSS_SHEETS[i]).setDepth(c.y + 1).setScale(0.24).setTint(0xb8b0a2);
    }
    if (cleared > 0) {
      const c = this.tileCenter(82, 26);
      this.add
        .text(c.x, c.y, 'Trophies of the fallen wardens', { fontFamily: 'MedievalSharp, "Trebuchet MS", cursive', fontSize: '10px', color: '#cfc4a8', stroke: '#000', strokeThickness: 3 })
        .setDepth(c.y + 40);
    }
  }

  private spawnRescueCage(): void {
    this.rescueCage = null;
    if (this.level.town) return;
    const q = questLog.pendingRescue(this.level.id);
    if (!q) return;
    // probe for a far walkable tile — the farthest of many random tries
    const sx = this.startTile.x;
    const sy = this.startTile.y;
    let best: { x: number; y: number; d: number } | null = null;
    for (let i = 0; i < 240; i++) {
      const x = Phaser.Math.Between(3, this.level.width - 4);
      const y = Phaser.Math.Between(3, this.level.height - 4);
      if (!this.isWalkable(x, y)) continue;
      const d = Math.hypot(x - sx, y - sy);
      if (!best || d > best.d) best = { x, y, d };
    }
    if (!best) return;
    const c = this.tileCenter(best.x, best.y);
    const villager = this.add
      .sprite(c.x, c.y, `townsfolk-${Phaser.Math.Between(0, 6)}`)
      .setDepth(c.y)
      .setScale(NPC_SPRITE_SCALE * settings.spriteScale())
      .setTint(0xb0b0c8);
    const bars = this.add.graphics().setDepth(c.y + 8);
    bars.lineStyle(2, 0x565c70, 1);
    bars.strokeRect(c.x - 11, c.y - 20, 22, 30);
    bars.lineStyle(2, 0x3a3f52, 1);
    for (let i = -7; i <= 7; i += 4) bars.lineBetween(c.x + i, c.y - 20, c.x + i, c.y + 10);
    const tag = this.add
      .text(c.x, c.y - 32, 'Caged Villager', { fontFamily: 'MedievalSharp, "Trebuchet MS", cursive', fontSize: '10px', color: '#8affa0', stroke: '#000', strokeThickness: 3 })
      .setOrigin(0.5)
      .setDepth(c.y + 40);
    this.rescueCage = { x: c.x, y: c.y, parts: [villager, bars, tag], questId: q.id };
  }

  /** Give the Arcanist their always-on Lantern Wisp familiar. */
  private spawnFamiliar(): void {
    const owner = this.familiarOwner();
    if (!owner) return;
    this.wisp = new LanternWisp(this, owner.x + 18, owner.y - 22, this.lightingOn, DEPTH.BARK - 5);
    this.wispNextBark = this.time.now + 8000;
    this.wispNextScout = this.time.now + 3000;
  }

  /** Familiar behaviour: hover at the mage's shoulder, dart out to reveal a
   *  nearby unfound altar now and then, light the dark, and murmur lore. */
  private updateFamiliar(time: number): void {
    const w = this.wisp;
    if (!w) return;
    const owner = this.familiarOwner();
    if (!owner) { w.destroy(); this.wisp = undefined; return; }

    // scout: every so often, if an unrevealed altar is within range, dart to it
    if (!this.level.town && time >= this.wispNextScout && time >= this.wispScoutUntil) {
      let best: Generator | null = null;
      let bd = 300;
      for (const g of this.generators) {
        if (!g.alive || this.foundGens.has(g)) continue;
        const d = Phaser.Math.Distance.Between(owner.x, owner.y, g.x, g.y);
        if (d < bd) { bd = d; best = g; }
      }
      if (best) {
        w.seek(best.x, best.y);
        this.wispScoutUntil = time + 2600; // give it time to fly out and reveal
        this.wispNextScout = time + 9000;
        if (time >= this.wispNextBark) {
          this.wispNextBark = time + 15000;
          this.showBark(DungeonScene.WISP_LINES[0], 2600, 'system', '#9fd0ff');
        }
      } else {
        this.wispNextScout = time + 2500;
      }
    }
    // hover home once a scout dart has expired
    if (time >= this.wispScoutUntil) {
      w.seek(owner.x + (owner.facing === 'left' ? 18 : -18), owner.y - 24);
    }
    w.update(time, this.game.loop.delta);

    // reveal altars the wisp floats near (same sight rule as the party)
    for (const g of this.generators) {
      if (g.alive && !this.foundGens.has(g) && Phaser.Math.Distance.Between(w.x, w.y, g.x, g.y) <= 120) {
        this.foundGens.add(g);
      }
    }
    // idle lore murmurs
    if (time >= this.wispNextBark && Math.random() < 0.004) {
      this.wispNextBark = time + 22000;
      const line = DungeonScene.WISP_LINES[Phaser.Math.Between(1, DungeonScene.WISP_LINES.length - 1)];
      this.showBark(line, 2600, 'system', '#9fd0ff');
    }
  }

  /** A realm warden crosses half health: announce the turn and fire its
   *  entry burst (adds, second wind, relocation) per BOSS_PHASE2. */
  private bossPhase2(m: Monster): void {
    const p2 = BOSS_PHASE2[m.enemyId];
    if (!p2) return;
    this.showBark(p2.bark, 4200, 'combat', '#ff8a6a');
    this.cameras.main.shake(420, 0.012);
    audio.sfx('boss_roar');
    // crimson flare so the turn reads even mid-melee
    const flare = this.add.image(m.x, m.y - 8, 'fx-glow-warm').setScale(4).setAlpha(0.85).setBlendMode(Phaser.BlendModes.ADD).setDepth(m.y + 24).setTint(0xff4a2a);
    this.tweens.add({ targets: flare, alpha: 0, scale: 6, duration: 700, onComplete: () => flare.destroy() });
    if (p2.healFrac) {
      m.health = Math.min(m.maxHealth, m.health + Math.round(m.maxHealth * p2.healFrac));
      this.floatPickup(m.x, m.y - 26, 'second wind!', '#ff8a6a');
    }
    if (p2.entryAdds && m.def.summons) {
      for (let i = 0; i < p2.entryAdds; i++) {
        const a = (i / p2.entryAdds) * Math.PI * 2;
        this.makeMonster(m.x + Math.cos(a) * 34, m.y + Math.sin(a) * 34, m.def.summons);
      }
    }
    if (p2.relocate) {
      // vanish... and resurface beside a hero
      const target = this.players.find((p) => p?.alive) ?? this.players[0];
      if (target) {
        this.spawnBlink(m.x, m.y);
        const ang = Math.random() * Math.PI * 2;
        let nx = target.x + Math.cos(ang) * 60;
        let ny = target.y + Math.sin(ang) * 60;
        if (!this.isWalkable(Math.floor(nx / TILE_SIZE), Math.floor(ny / TILE_SIZE))) { nx = target.x; ny = target.y - 40; }
        m.setPosition(nx, ny);
        const body = m.body as Phaser.Physics.Arcade.Body | null;
        if (body) body.reset(nx, ny);
        this.spawnBlink(nx, ny);
      }
    }
    this.grokNarrate(this.barkContext(`the wounded ${m.def.name} enters its terrible second phase`), { force: true });
  }

  /** Blink a companion to the party leader with a small puff of magic. */
  private teleportCompanion(comp: Companion, leader: Hero): void {
    let tx = leader.x + Phaser.Math.Between(-18, 18);
    let ty = leader.y + Phaser.Math.Between(8, 24);
    if (!this.isWalkable(Math.floor(tx / TILE_SIZE), Math.floor(ty / TILE_SIZE))) {
      tx = leader.x;
      ty = leader.y;
    }
    this.spawnBlink(comp.x, comp.y);
    comp.setPosition(tx, ty);
    const body = comp.body as Phaser.Physics.Arcade.Body | null;
    if (body) body.reset(tx, ty);
    comp.setMoveInput(0, 0);
    this.spawnBlink(tx, ty);
    audio.sfx('portal');
  }

  private spawnBlink(x: number, y: number): void {
    const fx = this.add
      .image(x, y - 6, 'fx-glow-magic')
      .setDepth(y + 12)
      .setScale(1.2)
      .setAlpha(0.85)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: fx, alpha: 0, scale: 2.2, duration: 320, ease: 'Quad.easeOut', onComplete: () => fx.destroy() });
  }

  /** A subtle, camera-fixed ambient particle layer themed to the level. */
  private spawnAmbience(theme: ThemeId): void {
    const a = ATMOSPHERE[theme] ?? ATMOSPHERE.crypt;
    let y: { min: number; max: number };
    let speedY: { min: number; max: number };
    let speedX: { min: number; max: number };
    if (a.mode === 'rise') {
      y = { min: GAME_HEIGHT - 8, max: GAME_HEIGHT + 6 };
      speedY = { min: -34, max: -12 };
      speedX = { min: -8, max: 8 };
    } else if (a.mode === 'fall') {
      y = { min: -8, max: 2 };
      speedY = { min: 14, max: 40 };
      speedX = { min: -10, max: 10 };
    } else {
      y = { min: 0, max: GAME_HEIGHT };
      speedY = { min: -10, max: 10 };
      speedX = { min: -14, max: 14 };
    }
    const p = this.add.particles(0, 0, 'fx-glow-white', {
      x: { min: 0, max: PLAY_AREA_WIDTH },
      y,
      lifespan: a.mode === 'drift' ? 5200 : 4200,
      speedX,
      speedY,
      scale: { start: 0.5, end: 0 },
      alpha: { start: 0.45, end: 0 },
      frequency: a.frequency,
      tint: a.particleTint,
      blendMode: 'ADD',
    });
    p.setScrollFactor(0).setDepth(DEPTH.VIGNETTE - 2);
  }

  private spawnDodgeFx(h: Hero): void {
    const fx = this.add.image(h.x, h.y, 'fx-glow-white').setDepth(h.y - 1).setScale(1.4).setAlpha(0.5).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: fx, alpha: 0, scaleX: 2.4, duration: 240, onComplete: () => fx.destroy() });
  }

  /** Unique-legendary dodge riders: the Comet's fire trail, the Nightveil's shadow. */
  private dodgePowers(h: Hero, time: number): void {
    if (h.hasUniquePower('comet')) {
      // three burning patches bloom along the roll's path
      const sx = h.x;
      const sy = h.y;
      for (let i = 0; i < 3; i++) {
        this.time.delayedCall(60 + i * 90, () => {
          if (!h.active) return;
          const px = Phaser.Math.Linear(sx, h.x, (i + 1) / 3);
          const py = Phaser.Math.Linear(sy, h.y, (i + 1) / 3);
          const flame = this.add.sprite(px, py, 'fx-fire').setDepth(py + 4).setScale(1.6).setTint(0xff8a2a);
          flame.play('fx-fire');
          flame.once('animationcomplete', () => flame.destroy());
          for (const m of this.monsters) {
            if (m.active && m.alive && Phaser.Math.Distance.Between(px, py, m.x, m.y) < 26) {
              m.applyStatus('burn', 1800, this.time.now);
            }
          }
        });
      }
    }
    if (h.hasUniquePower('nightveil')) {
      // wrapped in shadow: a longer breath of untouchability
      h.grantIframes(time, 1300);
      h.setAlpha(0.35);
      const veil = this.add.image(h.x, h.y - 6, 'fx-glow-magic').setScale(1.4).setAlpha(0.5).setBlendMode(Phaser.BlendModes.ADD).setDepth(h.y + 8).setTint(0x6a4a9a);
      this.tweens.add({ targets: veil, alpha: 0, scale: 2.2, duration: 500, onComplete: () => veil.destroy() });
    }
  }

  /** Necromancer ability: raise a skeletal servant (alternating warrior/caster, max 3). */
  /** Levels smaller than the play-area viewport (building interiors) are pinned
   *  to the centre instead of the top-left corner. */
  private centerSmallLevel(): void {
    if (this.levelPxW <= PLAY_AREA_WIDTH && this.levelPxH <= GAME_HEIGHT) {
      const cam = this.cameras.main;
      cam.stopFollow();
      cam.setScroll((this.levelPxW - PLAY_AREA_WIDTH) / 2, (this.levelPxH - GAME_HEIGHT) / 2);
    }
  }

  /** Re-pin the play-area camera + screen overlays when the window (and thus the
   *  middle play-area width) changes. Height is fixed so only X spans move. */
  private onViewportResize(): void {
    const cam = this.cameras?.main;
    if (!cam) return;
    cam.setViewport(PLAY_AREA_X, 0, PLAY_AREA_WIDTH, GAME_HEIGHT);
    this.centerSmallLevel();
    this.vignette?.setPosition(PLAY_AREA_WIDTH / 2, GAME_HEIGHT / 2).setDisplaySize(PLAY_AREA_WIDTH, GAME_HEIGHT);
    this.edgeGrade?.setPosition(PLAY_AREA_WIDTH / 2, GAME_HEIGHT / 2).setDisplaySize(PLAY_AREA_WIDTH, GAME_HEIGHT);
    this.barkText?.setPosition(PLAY_AREA_WIDTH / 2, GAME_HEIGHT - 40);
    if (this.mmImage) {
      const px = PLAY_AREA_WIDTH - this.mmCW - 12;
      this.mmImage.setPosition(px, this.mmY);
      this.mmX = px;
      this.mmBorder?.clear();
      this.mmBorder?.lineStyle(1, 0xcfa64e, 0.8);
      this.mmBorder?.strokeRect(px - 1, this.mmY - 1, this.mmCW + 2, this.mmCH + 2);
    }
  }

  /** When should an AI ally trigger its class special? Necromancers always raise
   *  the dead while under their cap; the rest react to nearby foes / hurt allies. */
  private companionShouldUseAbility(comp: Companion, monsters: Monster[], party = buildTacticalContext(this.allies, this.leader(), monsters, !!this.level.town, null, 'party').situation): boolean {
    const within = (r: number) => monsters.filter((m) => Phaser.Math.Distance.Between(comp.x, comp.y, m.x, m.y) <= r);
    switch (comp.classId) {
      case 'necromancer': {
        if (this.level.town) return false; // no raising the dead in Hearthwatch
        const free = settings.get('gameplay').infiniteMana;
        const cap = comp.isPlayer ? comp.maxSummons() : Math.max(1, Math.floor(comp.maxSummons() / 2));
        const manaNeed = comp.isPlayer ? 20 : 28;
        return this.ownedSummons(comp) < cap && (free || comp.mana >= manaNeed);
      }
      case 'warden': {
        const allyNeed = this.allies.some((a) =>
          a.active && (a.alive ? a.healthRatio() < 0.65 : Phaser.Math.Distance.Between(comp.x, comp.y, a.x, a.y) < 170)
        );
        return wardenWantsAbility(party, allyNeed);
      }
      case 'vanguard':
        return vanguardWantsRoar(party, within(120).length);
      case 'arcanist':
        return arcanistWantsMeteor(party, within(300).length);
      case 'bard':
        return bardWantsEncore(party, within(90).length);
      case 'druid':
        return false; // shapeshifting is handled by the form-upkeep pass
      case 'thief': {
        // Shadow Flurry only reaches ~78px (60px arc struck 18px ahead), so
        // don't burn the cooldown unless a foe is actually inside that arc.
        const n = within(70);
        if (n.length === 0) return false;
        let best = n[0];
        let bd = Infinity;
        for (const m of n) {
          const d = Phaser.Math.Distance.Between(comp.x, comp.y, m.x, m.y);
          if (d < bd) { bd = d; best = m; }
        }
        const dx = best.x - comp.x;
        const dy = best.y - comp.y;
        const l = Math.hypot(dx, dy) || 1;
        comp.attackDir = { x: dx / l, y: dy / l };
        comp.faceTo(dx, dy);
        return true;
      }
      default:
        return false;
    }
  }

  /** Live servants raised by this specific caster — caps are per-summoner, so a
   *  hired caster's pets never count against the player's cap (or vice versa). */
  private ownedSummons(owner: Hero): number {
    return this.summons.filter((s) => s.active && s.alive && s.summoner === owner).length;
  }

  private totalSummons(): number {
    return this.summons.filter((s) => s.active && s.alive).length;
  }

  private atSummonCap(): boolean {
    return this.totalSummons() >= PARTY_SUMMON_CAP;
  }

  /** Arcanist familiar cap: 1, growing to 3 with level, + summon affixes. */
  private arcaneCap(mage: Hero): number {
    return Math.min(3, 1 + Math.floor(mage.level / 4)) + (mage.stats.summonBonus ?? 0);
  }

  /** A hired Arcanist keeps familiars up: under their own cap, mana to spare, not in town. */
  private companionWantsFamiliar(comp: Companion): boolean {
    if (this.level.town) return false;
    const free = settings.get('gameplay').infiniteMana;
    const cap = comp.isPlayer ? this.arcaneCap(comp) : Math.max(1, Math.floor(this.arcaneCap(comp) / 2));
    const manaNeed = comp.isPlayer ? ARCANE_COST : ARCANE_COST + 7;
    return this.ownedSummons(comp) < cap && (free || comp.mana >= manaNeed);
  }

  private summonSkeleton(
    necro: Hero,
    quiet = false,
    type?: SkeletonType,
    opts: { force?: boolean; lifespan?: number; free?: boolean } = {}
  ): void {
    const time = this.time.now;
    this.summons = this.summons.filter((s) => s.active && s.alive);
    const cap = necro.maxSummons();
    if (!opts.force && this.atSummonCap()) {
      if (!quiet) this.showBark(`Too many servants already serve the party (max ${PARTY_SUMMON_CAP}).`, 2400, 'system');
      return;
    }
    if (!opts.force && this.ownedSummons(necro) >= cap) {
      if (!quiet) this.showBark(`Your servants already crowd the dark (max ${cap}).`, 2400, 'system');
      return;
    }
    const cost = 20;
    const free = settings.get('gameplay').infiniteMana || opts.free;
    if (!free && necro.mana < cost) {
      if (!quiet) this.showBark('Not enough mana to raise the dead.', 2400, 'system');
      return;
    }
    if (!free) necro.mana = Math.max(0, necro.mana - cost);
    const t = type ?? SKELETON_ORDER[this.summonIdx++ % SKELETON_ORDER.length];
    const info = SKELETON_INFO[t];
    const sk = new Companion(this, necro.x + Phaser.Math.Between(-16, 16), necro.y + Phaser.Math.Between(-8, 18), info.cls);
    sk.makeSkeleton(info.sheet, info.walk, info.attack);
    sk.skeletonRole = t;
    sk.summoner = necro;
    sk.displayName = info.name.replace(/\b\w/g, (c) => c.toUpperCase());
    if (t === 'tank') {
      sk.stats.maxHealth = Math.round(sk.stats.maxHealth * 1.9);
      sk.stats.armor += 5;
      sk.stats.speed *= 0.92;
      sk.health = sk.stats.maxHealth;
    } else if (t === 'thief') {
      sk.isThief = true;
      sk.stats.speed *= 1.3;
      sk.stats.critChance += 0.2;
    } else if (t === 'archer') {
      sk.stats.speed *= 1.1;
    }
    // Servants scale with the necromancer's power (HP + damage), like the thief
    // pass scaled rogue skills — a high-level necro raises far deadlier undead.
    const lvlMult = 1 + necro.level * 0.08;
    sk.stats.maxHealth = Math.round(sk.stats.maxHealth * lvlMult);
    sk.stats.damage = Math.round(sk.stats.damage * lvlMult);
    // Legion Command sigil: servants march faster, endure longer, hit harder
    const nsig = this.heroSig(necro);
    if (nsig.has('nec_sig_command')) {
      sk.stats.damage = Math.round(sk.stats.damage * 1.25);
      sk.stats.maxHealth = Math.round(sk.stats.maxHealth * 1.2);
      sk.stats.speed = Math.round(sk.stats.speed * 1.15);
    }
    // Bone Armor sigil: each raising wraps the necromancer in a bone shield
    if (nsig.has('nec_sig_bonearmor')) necro.grantShield(Math.round(necro.stats.maxHealth * 0.12), 8000, time);
    sk.health = sk.stats.maxHealth;
    // Servants linger longer the mightier the necromancer grows.
    // Servants are permanent: they fight until slain, and are released when
    // the party leaves the level (portal, teleport, or exit).
    sk.lifeStart = time;
    sk.expireAt = opts.lifespan ? time + opts.lifespan : 0;
    this.companions.push(sk);
    this.allies.push(sk);
    this.summons.push(sk);
    this.allyGroup.add(sk);
    this.shadows.add(sk, 3);
    const fx = this.add.sprite(sk.x, sk.y, 'fx-magic').setDepth(sk.y + 16).setScale(2).setTint(0x9bff9b);
    fx.play('fx-magic');
    fx.once('animationcomplete', () => fx.destroy());
    audio.sfx('magic');
    if (!quiet) this.showBark(`${necro.def.name} raises a ${info.name}!`, 2600, 'event');
  }

  /** Class ability input for P1. Thief toggles Sneak. The Necromancer and the
   *  Arcanist both HOLD for a summon radial (necro raises undead; arcanist
   *  conjures a familiar) — a quick TAP raises the last-picked servant for the
   *  necromancer, or casts Meteor for the arcanist. Everyone else taps their
   *  ability outright. */
  private handleAbilityInput(p1: Hero, time: number): void {
    const down = this.input2.justDown('p1', 'ability') || this.input2.padJustDown('p1', 'ability');
    const held = this.input2.isDown('p1', 'ability') || this.input2.padAbilityDown('p1');
    const up = this.input2.justUp('p1', 'ability') || this.input2.padJustUp('p1', 'ability');
    if (p1.classId === 'thief') {
      if (down) this.toggleSneak(p1);
      return;
    }
    if (p1.classId === 'druid') {
      // shapeshifting is fluid — a short breath between shifts, no long cooldown
      if (down && p1.shapeshift(time)) this.shiftFx(p1);
      return;
    }
    const radialClass = p1.classId === 'necromancer' || p1.classId === 'arcanist' || p1.classId === 'bard';
    if (!radialClass) {
      if (down && p1.canAbility(time)) {
        this.useAbility(p1, time);
        p1.markAbilityUsed(time);
      }
      return;
    }
    const mode: 'necro' | 'arcane' | 'song' = p1.classId === 'arcanist' ? 'arcane' : p1.classId === 'bard' ? 'song' : 'necro';
    if (down) this.abilityDownAt = time;
    if (held && this.abilityDownAt && !this.radialOpen && time - this.abilityDownAt > 200) this.openSummonRadial(mode);
    if (this.radialOpen) {
      this.updateSummonRadial();
      p1.setMoveInput(0, 0); // freeze movement while aiming the radial
    }
    if (up) {
      if (this.radialOpen) {
        this.closeSummonRadial();
        if (mode === 'arcane') this.summonArcane(p1, this.radialPick as ArcaneType);
        else if (mode === 'song') this.bardSing(p1, this.radialPick as SongId);
        else { this.selectedSkeleton = this.radialPick as SummonChoice; this.trySummon(p1, time); }
      } else if (this.abilityDownAt) {
        // quick tap: necro raises the last servant; arcanist nukes with Meteor;
        // the bard strikes an Encore power chord
        if (mode === 'arcane' || mode === 'song') {
          if (p1.canAbility(time)) { this.useAbility(p1, time); p1.markAbilityUsed(time); }
        } else {
          this.trySummon(p1, time);
        }
      }
      this.abilityDownAt = 0;
    }
  }

  /** Player 2's class ability (tap only — the P1 hold-radial stays P1's). */
  private handleAbilityInputP2(p2: Hero, time: number): void {
    const down = this.input2.justDown('p2', 'ability') || this.input2.padJustDown('p2', 'ability');
    if (!down) return;
    if (p2.classId === 'thief') { this.toggleSneak(p2); return; }
    if (p2.classId === 'druid') { if (p2.shapeshift(time)) this.shiftFx(p2); return; }
    if (p2.classId === 'necromancer') { this.trySummon(p2, time); return; }
    if (p2.classId === 'bard') {
      // tap cycles to the next song (P2 has no hold-radial)
      const next = SONG_ORDER[(SONG_ORDER.indexOf((p2.song ?? 'dirge') as SongId) + 1) % SONG_ORDER.length];
      this.bardSing(p2, next);
      return;
    }
    if (p2.canAbility(time)) {
      this.useAbility(p2, time);
      p2.markAbilityUsed(time);
    }
  }

  /** Poll the new secondary / tertiary / ultimate keys for a player hero. */
  private handleActiveInput(h: Hero, time: number): void {
    if (!h.isPlayer || !h.alive) return;
    const p: 'p1' | 'p2' = h.playerNum === 2 ? 'p2' : 'p1';
    const slots: ActiveSlot[] = ['secondary', 'tertiary', 'ultimate'];
    for (const slot of slots) {
      // justDown resolves keyboard binds plus the gamepad mapping (secondary=L2)
      if (this.input2.justDown(p, slot) && h.canActive(slot, time)) {
        if (this.useActive(h, slot, time)) h.markActive(slot, time);
      }
    }
  }

  private trySummon(necro: Hero, _time: number): void {
    // Summoning is MANA-gated, not cooldown-gated: with enough mana you can
    // raise several servants back-to-back (20 mana per skeleton, 30 per beast).
    if (this.selectedSkeleton === 'beast') this.summonMonster(necro);
    else this.summonSkeleton(necro, false, this.selectedSkeleton);
  }

  /** High-level necromancy: bind a random bestiary monster as a (temporary) ally. */
  private summonMonster(necro: Hero): void {
    const time = this.time.now;
    this.summons = this.summons.filter((s) => s.active && s.alive);
    if (this.atSummonCap()) {
      this.showBark(`Too many servants already serve the party (max ${PARTY_SUMMON_CAP}).`, 2400, 'system');
      return;
    }
    if (this.ownedSummons(necro) >= necro.maxSummons()) {
      this.showBark(`Your servants already crowd the dark (max ${necro.maxSummons()}).`, 2400, 'system');
      return;
    }
    const free = settings.get('gameplay').infiniteMana;
    const cost = 30;
    if (!free && necro.mana < cost) {
      this.showBark('Not enough mana to bind a beast.', 2400, 'system');
      return;
    }
    if (!free) necro.mana = Math.max(0, necro.mana - cost);
    const pool = ENEMY_IDS.filter((id) => !ENEMIES[id].isBoss);
    const id = pool[Math.floor(Math.random() * pool.length)];
    const def = ENEMIES[id];
    const sk = new Companion(this, necro.x + Phaser.Math.Between(-16, 16), necro.y + Phaser.Math.Between(-8, 18), 'vanguard');
    sk.makeSkeleton(`monster-${id}-sheet`, `${id}-walk`, `${id}-attack`);
    sk.summoner = necro;
    sk.displayName = def.name;
    const lvlMult = 1 + necro.level * 0.08;
    const depth = Math.max(0, Content.levelOrder.indexOf(this.level.id));
    const realmMult = depth >= 0 ? computeRealmMonsterScale(depth, this.partyLevel(), this.partySize(), false).hpMult : 1;
    const bindMult = lvlMult * Math.min(realmMult, 2.4);
    sk.stats.maxHealth = Math.round(def.health * bindMult);
    sk.health = sk.stats.maxHealth;
    sk.stats.damage = Math.round(def.damage * bindMult);
    sk.stats.speed = def.speed;
    sk.lifeStart = time;
    sk.expireAt = 0; // bound beasts also serve until slain or the level is left
    this.companions.push(sk);
    this.allies.push(sk);
    this.summons.push(sk);
    this.allyGroup.add(sk);
    this.shadows.add(sk, 3);
    const fx = this.add.sprite(sk.x, sk.y, 'fx-magic').setDepth(sk.y + 16).setScale(2.4).setTint(0xb6ffd0);
    fx.play('fx-magic');
    fx.once('animationcomplete', () => fx.destroy());
    audio.sfx('magic');
    this.showBark(`${necro.def.name} binds a ${def.name} to their will!`, 2600, 'event');
  }

  /** Arcanist familiar: conjure an Ember Sprite / Void Imp / Arcane Homunculus /
   *  Starved Rootling. Mana-gated and permanent (fights until slain or the party
   *  leaves the level), mirroring the necromancer's servants. */
  private summonArcane(mage: Hero, type: ArcaneType, quiet = false): void {
    const time = this.time.now;
    this.summons = this.summons.filter((s) => s.active && s.alive);
    const cap = this.arcaneCap(mage);
    if (this.atSummonCap()) {
      if (!quiet) this.showBark(`Too many servants already serve the party (max ${PARTY_SUMMON_CAP}).`, 2400, 'system');
      return;
    }
    if (this.ownedSummons(mage) >= cap) {
      if (!quiet) this.showBark(`Your familiars already crowd the air (max ${cap}).`, 2400, 'system');
      return;
    }
    const free = settings.get('gameplay').infiniteMana;
    if (!free && mage.mana < ARCANE_COST) {
      if (!quiet) this.showBark('Not enough mana to conjure a familiar.', 2400, 'system');
      return;
    }
    if (!free) mage.mana = Math.max(0, mage.mana - ARCANE_COST);
    const info = ARCANE_INFO[type];
    const sk = new Companion(this, mage.x + Phaser.Math.Between(-16, 16), mage.y + Phaser.Math.Between(-8, 18), info.cls);
    sk.makeSkeleton(info.sheet, info.walk, info.attack, info.tint);
    sk.arcaneType = type;
    sk.summoner = mage;
    sk.displayName = info.name.replace(/\b\w/g, (c) => c.toUpperCase());
    sk.setTint(info.tint);
    const s = sk.stats;
    if (type === 'ember') {
      s.maxHealth = Math.round(s.maxHealth * 0.7); s.speed = Math.round(s.speed * 1.15); s.fire = 6;
    } else if (type === 'void') {
      s.maxHealth = Math.round(s.maxHealth * 0.65); s.speed = Math.round(s.speed * 1.35); s.critChance = Math.min(0.75, s.critChance + 0.35); s.damage = Math.round(s.damage * 0.9);
    } else if (type === 'homunculus') {
      s.maxHealth = Math.round(s.maxHealth * 1.9); s.armor += 3; s.speed = Math.round(s.speed * 0.95);
    } else {
      s.maxHealth = Math.round(s.maxHealth * 1.3); s.damage = Math.round(s.damage * 1.1);
    }
    const lvlMult = 1 + mage.level * 0.08;
    s.maxHealth = Math.round(s.maxHealth * lvlMult);
    s.damage = Math.round(s.damage * lvlMult);
    sk.health = s.maxHealth;
    sk.lifeStart = time;
    sk.expireAt = 0;
    this.companions.push(sk);
    this.allies.push(sk);
    this.summons.push(sk);
    this.allyGroup.add(sk);
    this.shadows.add(sk, 3);
    const fx = this.add.sprite(sk.x, sk.y, 'fx-magic').setDepth(sk.y + 16).setScale(2).setTint(info.tint);
    fx.play('fx-magic');
    fx.once('animationcomplete', () => fx.destroy());
    this.flashLight(sk.x, sk.y, info.tint, 120, 300, 1.0);
    audio.sfx('magic');
    const art = /^[aeiou]/i.test(info.name) ? 'an' : 'a';
    if (!quiet) this.showBark(`${mage.def.name} conjures ${art} ${info.name}!`, 2600, 'event', '#bfe0ff');
  }

  private openSummonRadial(mode: 'necro' | 'arcane' | 'song' = 'necro'): void {
    if (this.radialOpen) return;
    this.radialOpen = true;
    this.radialMode = mode;
    const R = 92; // outer radius
    const RING = 40; // inner hub radius
    const ringCol = mode === 'arcane' ? 0x6fb0ff : mode === 'song' ? 0xe0b04a : 0x9b7be0;

    const cont = this.add.container(PLAY_AREA_WIDTH / 2, GAME_HEIGHT / 2).setScrollFactor(0).setDepth(DEPTH.OVERLAY + 6);
    const scrim = this.add.graphics();
    scrim.fillStyle(0x05060a, 0.32);
    scrim.fillCircle(0, 0, R + 26);
    cont.add(scrim);

    const ids: string[] = mode === 'arcane' ? [...ARCANE_ORDER] : mode === 'song' ? [...SONG_ORDER] : ['tank', 'archer', 'mage', 'thief'];
    const dirDeg = [-90, 0, 90, 180]; // top, right, bottom, left
    const labelFor = (id: string): string =>
      mode === 'arcane' ? ARCANE_INFO[id as ArcaneType].name.toUpperCase()
      : mode === 'song' ? SONG_INFO[id as SongId].name.toUpperCase()
      : id.toUpperCase();
    const iconFor = (id: string): { key: string; frame: number; tint: number } =>
      mode === 'arcane'
        ? { key: ARCANE_INFO[id as ArcaneType].sheet, frame: 0, tint: ARCANE_INFO[id as ArcaneType].tint }
        : mode === 'song'
          ? { key: SONG_INFO[id as SongId].icon, frame: 0, tint: SONG_INFO[id as SongId].tint }
          : { key: SKELETON_INFO[id as SkeletonType].sheet, frame: 0, tint: 0xdfe8ff };

    this.radialNodes = [];
    for (let i = 0; i < 4; i++) {
      const id = ids[i];
      const midRad = (dirDeg[i] * Math.PI) / 180;
      const a0 = midRad - Math.PI / 4;
      const a1 = midRad + Math.PI / 4;
      const g = this.add.graphics();
      cont.add(g);
      const ix = Math.cos(midRad) * (RING + (R - RING) * 0.52);
      const iy = Math.sin(midRad) * (RING + (R - RING) * 0.52);
      const ic = iconFor(id);
      let icon: Phaser.GameObjects.Image | undefined;
      if (this.textures.exists(ic.key)) {
        icon = this.add.image(ix, iy - 6, ic.key, ic.frame).setScale(1.05).setTint(ic.tint);
        cont.add(icon);
      }
      const txt = this.add
        .text(ix, iy + 15, labelFor(id), { fontFamily: 'MedievalSharp, "Trebuchet MS", cursive', fontSize: '9.5px', color: '#e6ddf5', stroke: '#000', strokeThickness: 3 })
        .setOrigin(0.5);
      cont.add(txt);
      this.radialNodes.push({ t: id, dx: ix, dy: iy, a0, a1, g, icon, txt });
    }

    const necroLead = this.players.find((p) => p.classId === 'necromancer' && p.alive) ?? this.players[0];
    const beastOk = mode === 'necro' && (necroLead?.level ?? 1) >= BEAST_LEVEL;
    this.radialCenterId = beastOk ? 'beast' : null;
    const hub = this.add.graphics();
    cont.add(hub);
    const hubLabel = this.add
      .text(0, 0, beastOk ? 'BEAST' : mode === 'arcane' ? 'CONJURE' : mode === 'song' ? 'SING' : 'RAISE', { fontFamily: 'MedievalSharp, "Trebuchet MS", cursive', fontSize: beastOk ? '10px' : '9px', color: beastOk ? '#b6ffd0' : mode === 'song' ? '#ffe9a8' : '#cbb8ee', stroke: '#000', strokeThickness: 3 })
      .setOrigin(0.5);
    cont.add(hubLabel);
    this.radialNodes.push({ t: '__hub', dx: 0, dy: 0, a0: 0, a1: 0, g: hub, txt: hubLabel });

    const ring = this.add.graphics();
    ring.lineStyle(2, ringCol, 0.9);
    ring.strokeCircle(0, 0, R);
    ring.lineStyle(1, ringCol, 0.4);
    ring.strokeCircle(0, 0, RING);
    cont.add(ring);

    this.radial = cont;
    this.radialPick = mode === 'arcane' ? 'ember' : mode === 'song' ? (this.players[0]?.song ?? 'war') : (this.selectedSkeleton === 'beast' ? 'tank' : this.selectedSkeleton);
    this.updateSummonRadial();
  }

  private updateSummonRadial(): void {
    if (!this.radial) return;
    const R = 92;
    const RING = 40;
    const selCol = this.radialMode === 'arcane' ? 0x2c4a86 : this.radialMode === 'song' ? 0x6e5220 : 0x4a2e6e;
    const selEdge = this.radialMode === 'arcane' ? 0xbfe0ff : this.radialMode === 'song' ? 0xffe9a8 : 0xe8d0ff;

    let ang: number | null = null;
    let center = false;
    const st = this.input2.move('p1');
    if (st.x || st.y) ang = Math.atan2(st.y, st.x);
    else {
      const ptr = this.input.activePointer;
      const pdx = ptr.x - PLAY_AREA_X - PLAY_AREA_WIDTH / 2;
      const pdy = ptr.y - GAME_HEIGHT / 2;
      const mag = Math.hypot(pdx, pdy);
      if (mag < RING && this.radialCenterId) center = true;
      else if (mag > 18) ang = Math.atan2(pdy, pdx);
    }
    if (center) this.radialPick = this.radialCenterId!;
    else if (ang !== null) {
      const deg = ((ang * 180) / Math.PI + 360) % 360;
      const ids = this.radialMode === 'arcane' ? ARCANE_ORDER : this.radialMode === 'song' ? (SONG_ORDER as string[]) : (['tank', 'archer', 'mage', 'thief'] as string[]);
      const idx = deg >= 315 || deg < 45 ? 1 : deg < 135 ? 2 : deg < 225 ? 3 : 0;
      this.radialPick = ids[idx] as string;
    }

    for (const n of this.radialNodes) {
      if (n.t === '__hub') {
        const sel = this.radialCenterId !== null && this.radialPick === this.radialCenterId;
        n.g.clear();
        n.g.fillStyle(sel ? selCol : 0x141020, 0.95);
        n.g.fillCircle(0, 0, RING - 3);
        n.g.lineStyle(2, sel ? selEdge : 0x6e521f, 1);
        n.g.strokeCircle(0, 0, RING - 3);
        n.txt.setScale(sel ? 1.1 : 1).setColor(sel ? '#ffffff' : this.radialCenterId ? '#b6ffd0' : '#8a7fb0');
        continue;
      }
      const sel = n.t === this.radialPick;
      n.g.clear();
      n.g.fillStyle(sel ? selCol : 0x171227, sel ? 0.96 : 0.78);
      n.g.slice(0, 0, R - 2, n.a0 + 0.05, n.a1 - 0.05, false);
      n.g.arc(0, 0, RING + 1, n.a1 - 0.05, n.a0 + 0.05, true);
      n.g.fillPath();
      n.g.lineStyle(sel ? 2.5 : 1, sel ? selEdge : 0x574a2a, sel ? 1 : 0.7);
      n.g.beginPath();
      n.g.arc(0, 0, R - 2, n.a0 + 0.05, n.a1 - 0.05, false);
      n.g.strokePath();
      n.icon?.setScale(sel ? 1.3 : 1.0).setAlpha(sel ? 1 : 0.72);
      n.txt.setColor(sel ? '#ffffff' : '#cbb8ee').setScale(sel ? 1.08 : 1);
    }
  }

  private closeSummonRadial(): void {
    this.radial?.destroy();
    this.radial = undefined;
    this.radialNodes = [];
    this.radialCenterId = null;
    this.radialOpen = false;
  }

  /** A summon's duration elapsed: crumble it to dust. */
  private crumbleSummon(sk: Companion): void {
    const fx = this.add.sprite(sk.x, sk.y, 'fx-magic').setDepth(sk.y + 16).setScale(1.8).setTint(0x9b8bd0);
    fx.play('fx-magic');
    fx.once('animationcomplete', () => fx.destroy());
    audio.sfx('magic');
    sk.alive = false;
    sk.destroy();
    this.companions = this.companions.filter((c) => c !== sk);
    this.allies = this.allies.filter((a) => a !== sk);
    this.summons = this.summons.filter((s) => s !== sk);
  }

  /** Bring a downed ally/player back into the fight (Warden resurrect). */
  private reviveAlly(a: Hero, hp: number): void {
    a.alive = true;
    a.health = Math.max(1, hp);
    a.setActive(true).setVisible(true);
    const body = a.body as Phaser.Physics.Arcade.Body | null;
    if (body) body.enable = true;
    const fx = this.add.sprite(a.x, a.y, 'fx-magic').setDepth(a.y + 16).setScale(2.2).setTint(0x9bff9b);
    fx.play('fx-magic');
    fx.once('animationcomplete', () => fx.destroy());
    this.add.image(a.x, a.y, 'fx-glow-green').setScale(3).setAlpha(0.7).setBlendMode(Phaser.BlendModes.ADD).setDepth(a.y - 1);
    audio.sfx('shrine');
    this.syncHudData();
  }

  /** Warden passive 'Regen' — a gentle heal-over-time aura on nearby allies and
   *  necro pets; its reach and potency grow with the Warden's level. */
  private updateWardenRegen(delta: number): void {
    const dt = delta / 1000;
    const wardens = this.allies.filter((a) => a.alive && a.classId === 'warden');
    if (!wardens.length) return;
    for (const w of wardens) {
      const radius = 110 + w.level * 4;
      const perSec = 1.5 + w.level * 0.5;
      for (const a of this.allies) {
        if (!a.alive || a === w || a.healthRatio() >= 1) continue;
        if (Phaser.Math.Distance.Between(w.x, w.y, a.x, a.y) <= radius) a.heal(perSec * dt);
      }
    }
  }

  /** True if nothing solid blocks the straight line between two world points. */
  private hasLineOfSight(x1: number, y1: number, x2: number, y2: number): boolean {
    const steps = Math.ceil(Phaser.Math.Distance.Between(x1, y1, x2, y2) / 8);
    for (let i = 1; i < steps; i++) {
      const f = i / steps;
      const tx = Math.floor((x1 + (x2 - x1) * f) / TILE_SIZE);
      const ty = Math.floor((y1 + (y2 - y1) * f) / TILE_SIZE);
      if (!this.isWalkable(tx, ty)) return false;
    }
    return true;
  }

  /** Thief skeleton: blink behind the nearest foe and backstab for heavy damage. */
  private thiefStrike(thief: Companion, monsters: Monster[], time: number): void {
    if (time < thief.nextBlink) return;
    let target: Monster | null = null;
    let bd = 260;
    for (const m of monsters) {
      const d = Phaser.Math.Distance.Between(thief.x, thief.y, m.x, m.y);
      // only blink to foes in the SAME room (clear line of sight, no walls between)
      if (d < bd && this.hasLineOfSight(thief.x, thief.y, m.x, m.y)) {
        bd = d;
        target = m;
      }
    }
    if (!target || bd < 24) return; // already in reach — normal melee handles it
    const ux = (target.x - thief.x) / (bd || 1);
    const uy = (target.y - thief.y) / (bd || 1);
    let nx = target.x + ux * 16;
    let ny = target.y + uy * 16;
    if (!this.isWalkable(Math.floor(nx / TILE_SIZE), Math.floor(ny / TILE_SIZE))) {
      nx = target.x - ux * 12;
      ny = target.y - uy * 12;
    }
    this.spawnBlink(thief.x, thief.y);
    thief.setPosition(nx, ny);
    const body = thief.body as Phaser.Physics.Arcade.Body | null;
    if (body) body.reset(nx, ny);
    this.spawnBlink(nx, ny);
    thief.faceTo(target.x - nx, target.y - ny);
    const back = Math.round(thief.attackDamage().dmg * 2.6);
    const died = target.takeDamage(back, time);
    this.floatDamage(target.x, target.y, back, true);
    const sl = this.add.sprite(target.x, target.y, 'fx-slash').setDepth(target.y + 6).setScale(1.6).setTint(0x8affa0);
    sl.play('fx-slash');
    sl.once('animationcomplete', () => sl.destroy());
    audio.sfx('melee');
    if (died) this.onMonsterKilled(thief, target);
    thief.nextBlink = time + 2400;
  }

  private abilityName(c: HeroClassId): string {
    const names: Record<HeroClassId, string> = { vanguard: 'Seismic Slam', thief: 'Shadow Flurry', arcanist: 'Meteor', warden: 'Sanctuary', necromancer: 'Raise Dead', bard: 'Encore', druid: 'Wild Shape' };
    return names[c];
  }

  /** Bard: strike up (or change) a song — a persistent party aura. */
  private bardSing(bard: Hero, song: SongId): void {
    if (bard.song === song) return;
    // Echoes sigil: the outgoing song lingers faintly for a few seconds
    if (bard.song) {
      bard.prevSong = bard.song;
      bard.prevSongUntil = this.time.now + 5000;
    }
    bard.song = song;
    const info = SONG_INFO[song];
    const fx = this.add.sprite(bard.x, bard.y - 8, 'fx-magic').setDepth(bard.y + 16).setScale(1.6).setTint(info.tint);
    fx.play('fx-magic');
    fx.once('animationcomplete', () => fx.destroy());
    // a flourish of notes
    for (let i = 0; i < 3; i++) {
      const note = this.add
        .text(bard.x + Phaser.Math.Between(-12, 12), bard.y - 14, i % 2 ? '♪' : '♫', { fontSize: '12px', color: '#ffe9a8', stroke: '#000', strokeThickness: 2 })
        .setOrigin(0.5)
        .setDepth(bard.y + 20);
      this.tweens.add({ targets: note, y: note.y - 26 - i * 6, alpha: 0, duration: 900 + i * 180, ease: 'Quad.easeOut', onComplete: () => note.destroy() });
    }
    audio.sfx('shrine');
    this.showBark(`${bard.def.name} strikes up ${info.name} — ${info.line}.`, 2600, 'event', '#ffe9a8');
  }

  /** Necromancer Deathlord morph when the full Pale King set is equipped/removed. */
  private deathlordFx(d: Hero, active: boolean): void {
    const fx = this.add.sprite(d.x, d.y, 'fx-magic').setDepth(d.y + 16).setScale(2.2).setTint(0x8a48e8);
    fx.play('fx-magic');
    fx.once('animationcomplete', () => fx.destroy());
    for (let i = 0; i < 6; i++) {
      const mote = this.add
        .image(d.x + Phaser.Math.Between(-14, 14), d.y - 8, 'fx-glow-magic')
        .setScale(0.55)
        .setAlpha(0.85)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(d.y + 18);
      this.tweens.add({
        targets: mote,
        y: mote.y - 22 - i * 3,
        x: mote.x + Phaser.Math.Between(-10, 10),
        alpha: 0,
        duration: 650 + i * 80,
        onComplete: () => mote.destroy(),
      });
    }
    audio.sfx('magic');
    this.showBark(
      active ? `${d.def.name} ascends as the Grave Warden!` : `${d.def.name} sheds the warden's shroud.`,
      2400,
      'event',
      '#b58aff'
    );
  }

  /** Druid shapeshift flourish (the Hero handles the actual form change). */
  private shiftFx(d: Hero): void {
    const fx = this.add.sprite(d.x, d.y, 'fx-magic').setDepth(d.y + 16).setScale(2).setTint(0x8fe06a);
    fx.play('fx-magic');
    fx.once('animationcomplete', () => fx.destroy());
    for (let i = 0; i < 5; i++) {
      const leaf = this.add.image(d.x + Phaser.Math.Between(-10, 10), d.y - 6, 'fx-glow-green').setScale(0.5).setAlpha(0.8).setBlendMode(Phaser.BlendModes.ADD).setDepth(d.y + 18);
      this.tweens.add({ targets: leaf, y: leaf.y - 18 - i * 4, x: leaf.x + Phaser.Math.Between(-8, 8), alpha: 0, duration: 600 + i * 90, onComplete: () => leaf.destroy() });
    }
    audio.sfx('magic');
    this.showBark(d.bearForm ? `${d.def.name} shifts into a great bear!` : `${d.def.name} returns to human form.`, 2200, 'event', '#b6ff8a');
    // Apex Predator sigil: shifting INTO bear crashes down a shockwave
    if (d.bearForm && this.heroSig(d).has('dru_sig_apex')) {
      const time = this.time.now;
      this.spawnRing(d.x, d.y, 120, 0x8fce5a);
      this.cameras.main.shake(160, 0.006);
      const hit = this.aoeHit(d, d.x, d.y, 120, Math.round(d.attackDamage().dmg * 1.3), time, 'stun', 200, 900);
      for (const m of hit) m.applyStatus('bleed', 2600, time, Math.max(4, Math.round(d.attackDamage().dmg * 0.12)));
    }
  }

  /** Per-class active ability (key F), gated by Hero cooldown. */
  private useAbility(h: Hero, time: number, announce = true): void {
    if (h.classId === 'necromancer') {
      this.summonSkeleton(h, !announce);
      return;
    }
    if (h.classId === 'druid') {
      if (h.shapeshift(time)) this.shiftFx(h);
      return;
    }
    const cx = h.x;
    const cy = h.y;
    // sigils the hero has chosen (reshapes the signature below)
    const sig = this.heroSig(h);
    if (h.classId === 'bard') {
      // Encore — a ringing power chord that staggers everything around the skald
      let radius = 100 + h.skillSet.rank('brd_reach') * 12;
      let dmgMult = 1.7;
      let stun = 0;
      if (sig.has('brd_sig_crescendo')) { dmgMult += 0.7; stun = 900; }
      if (sig.has('brd_sig_resonance')) radius += 44;
      this.spawnRing(cx, cy, radius, 0xffd98a);
      for (let i = 0; i < 4; i++) {
        const note = this.add
          .text(cx + Phaser.Math.Between(-radius / 2, radius / 2), cy - 10, i % 2 ? '♪' : '♫', { fontSize: '14px', color: '#ffe9a8', stroke: '#000', strokeThickness: 2 })
          .setOrigin(0.5)
          .setDepth(cy + 22);
        this.tweens.add({ targets: note, y: note.y - 30, alpha: 0, duration: 800 + i * 120, onComplete: () => note.destroy() });
      }
      const chord = this.aoeHit(h, cx, cy, radius, Math.round(h.attackDamage().dmg * dmgMult), time, stun > 0 ? 'stun' : 'shock', 180, stun > 0 ? stun : 1500);
      if (sig.has('brd_sig_dissonance')) {
        const bleed = Math.max(4, Math.round(h.attackDamage().dmg * 0.12));
        for (const m of chord) {
          m.applyStatus('fear', 1600, time);
          m.applyStatus('bleed', 3200, time, bleed);
        }
      }
      // Finale: spend the ringing song for a burst of its own element
      if (sig.has('brd_sig_finale') && h.song) {
        const s = h.song;
        if (s === 'war') this.aoeHit(h, cx, cy, radius * 1.15, Math.round(h.attackDamage().dmg * 1.5), time, 'shock', 140, 1600);
        else if (s === 'dirge') this.aoeHit(h, cx, cy, radius * 1.15, Math.round(h.attackDamage().dmg * 1.2), time, 'vuln', 120, 2000, 1.3);
        else if (s === 'hymn') this.eachAllyInRange(h, radius, (a) => a.heal(Math.round(a.stats.maxHealth * 0.2)));
        else this.eachAllyInRange(h, radius, (a) => a.grantBuff(3500, time, { speed: 30 }));
        h.song = null;
      }
      if (sig.has('brd_sig_resonance')) this.songPulseAt = time; // an immediate song pulse
      audio.sfx('shrine');
      this.spawnBurst(cx, cy, 0xffd98a);
      if (announce) this.showBark(`${h.def.name} unleashes ${this.abilityName(h.classId)}!`);
      return;
    }
    if (h.classId === 'thief') {
      // Shadow Flurry — a blur of dagger strikes in an arc ahead, each a backstab-grade hit
      const fx = this.add.sprite(cx + h.attackDir.x * 16, cy + h.attackDir.y * 16, 'fx-slash').setDepth(cy + 8).setScale(2.0).setRotation(Math.atan2(h.attackDir.y, h.attackDir.x)).setTint(0xcfe0ff);
      fx.play('fx-slash');
      fx.once('animationcomplete', () => fx.destroy());
      this.aoeHit(h, cx + h.attackDir.x * 18, cy + h.attackDir.y * 18, 60, Math.round(h.attackDamage().dmg * 2.2), time, 'shock', 60);
      audio.sfx('swing');
    } else if (h.classId === 'warden') {
      // Sanctuary: burst heal/mana to the party (scales with Warden level) and
      // RESURRECT one/all fallen allies within reach — the Warden's grace.
      const radiance = sig.has('war_sig_radiance');
      const healFrac = Math.min(0.75, 0.3 + h.level * 0.015 + (radiance ? 0.2 : 0));
      const reviveAll = sig.has('war_sig_martyr');
      const radius = sig.has('war_sig_dawn') ? 220 : 130;
      let revived = false;
      for (const a of this.allies) {
        if (a.alive) {
          a.heal(Math.round(a.stats.maxHealth * healFrac));
          if (sig.has('war_sig_grace')) a.restoreMana(Math.round(a.stats.maxMana * 0.35));
          else a.restoreMana(Math.round(a.stats.maxMana * 0.2));
          if (sig.has('war_sig_aegis') || sig.has('war_sig_bastion')) {
            const shield = Math.round(a.stats.maxHealth * (sig.has('war_sig_bastion') ? 0.22 : 0.14));
            a.grantShield(shield, 6000, time);
          }
          const fx = this.add.image(a.x, a.y - 6, 'fx-glow-green').setDepth(a.y + 8).setScale(1.3).setBlendMode(Phaser.BlendModes.ADD);
          this.tweens.add({ targets: fx, alpha: 0, scale: 2.2, duration: 520, onComplete: () => fx.destroy() });
        } else if (a.active && (reviveAll || !revived) && Phaser.Math.Distance.Between(cx, cy, a.x, a.y) < radius + 40) {
          this.reviveAlly(a, Math.round(a.stats.maxHealth * Math.min(0.75, 0.4 + h.level * 0.01)));
          revived = true;
        }
      }
      if (radiance) this.spawnGroundZone({ x: cx, y: cy, radius, owner: h, duration: 5000, tickEvery: 1000, healAllies: Math.round(6 + h.level * 0.4), texture: 'fx-glow-green', tint: 0xbfffcf, alpha: 0.32 });
      if (sig.has('war_sig_sanctified')) this.spawnGroundZone({ x: cx, y: cy, radius, owner: h, duration: 6000, tickEvery: 700, dmg: Math.round(h.magicDamage() * 0.35), status: 'shock', healAllies: 4, texture: 'fx-glow-warm', tint: 0xffe6a0, alpha: 0.3 });
      if (revived && announce) this.showBark(`${h.def.name} calls a fallen comrade back from the brink!`, 2800, 'event');
      const smiteMult = sig.has('war_sig_wrath') ? 2.0 : 1.2;
      const smiteStatus: MonsterStatus = sig.has('war_sig_condemn') ? 'stun' : 'shock';
      const struck = this.aoeHit(h, cx, cy, radius, Math.round(h.attackDamage().dmg * smiteMult), time, smiteStatus, 140, sig.has('war_sig_condemn') ? 1400 : 1500);
      if (sig.has('war_sig_wrath') || sig.has('war_sig_condemn')) for (const m of struck) m.applyStatus('vuln', 3000, time, 1.25);
      audio.sfx('shrine');
    } else if (h.classId === 'arcanist') {
      // Meteor — a fiery blast called down on the nearest cluster (or straight ahead).
      let tx = cx + h.attackDir.x * 150;
      let ty = cy + h.attackDir.y * 150;
      const near = this.nearestFoe(cx, cy, 320);
      if (near) { tx = near.x; ty = near.y; }
      const starfall = sig.has('arc_sig_starfall');
      let radius = starfall ? 64 : 96;
      let dmgMult = starfall ? 3.0 : 2.1;
      if (sig.has('arc_sig_conflagration')) { radius = Math.round(radius * 1.3); dmgMult += 0.45; }
      const burnDmg = Math.round(h.magicDamage() * (sig.has('arc_sig_incinerate') ? 0.28 : 0.18));
      const burnDur = sig.has('arc_sig_incinerate') ? 8000 : 5500;
      const drop = (dx: number, dy: number, rad: number, mult: number) => {
        const meteor = this.add.sprite(dx, dy, 'fx-fire').setDepth(dy + 24).setScale((rad * 2) / 16).setTint(0xff7a2a);
        meteor.play('fx-fire');
        meteor.once('animationcomplete', () => meteor.destroy());
        this.add.image(dx, dy, 'fx-glow-warm').setScale(rad / 30).setAlpha(0.85).setBlendMode(Phaser.BlendModes.ADD).setDepth(dy + 10);
        if (sig.has('arc_sig_singularity')) this.aoeHit(h, dx, dy, rad * 1.4, 1, time, 'chill', -200, 200);
        const hit = this.aoeHit(h, dx, dy, rad, Math.round(h.magicDamage() * mult), time, 'burn', 70, burnDur, burnDmg);
        if (sig.has('arc_sig_frostmeteor')) for (const m of hit) { m.applyStatus('chill', 2200, time); m.applyStatus('root', 900, time); }
      };
      drop(tx, ty, radius, dmgMult);
      if (sig.has('arc_sig_twinstar')) {
        const near2 = this.nearestFoe(tx, ty, 220, new Set(near ? [near] : []));
        const ax = near2 ? near2.x : tx + Phaser.Math.Between(-70, 70);
        const ay = near2 ? near2.y : ty + Phaser.Math.Between(-70, 70);
        this.time.delayedCall(120, () => { if (h.active) drop(ax, ay, radius * 0.85, dmgMult * 0.8); });
      }
      if (sig.has('arc_sig_crater') || sig.has('arc_sig_firestorm')) {
        this.spawnGroundZone({ x: tx, y: ty, radius, owner: h, duration: sig.has('arc_sig_firestorm') ? 5000 : 4000, tickEvery: 600, dmg: Math.round(h.magicDamage() * 0.4), status: 'burn', statusDur: 1600, statusMag: burnDmg, slow: sig.has('arc_sig_crater'), texture: 'fx-glow-warm', tint: 0xff7a2a, alpha: 0.38 });
      }
      if (announce) this.cameras.main.shake(220, 0.008);
      audio.sfx('magic');
    } else {
      // Vanguard — Seismic Slam: a quaking shockwave that stuns, flings/pulls,
      // and steels the Earthshaker (deepened by Rage and the chosen sigil).
      const empowered = h.spendRage();
      let radius = 116;
      let dmgMult = 1.9;
      let stunDur = 1100;
      if (empowered) { radius += 28; dmgMult += 0.5; }
      if (sig.has('van_sig_tremor')) { radius = Math.round(radius * 1.4); dmgMult += 0.4; }
      if (sig.has('van_sig_concussion')) stunDur += 1300;
      if (sig.has('van_sig_upheaval')) stunDur += 700;
      const pull = sig.has('van_sig_irongrip');
      const dmg = Math.round(h.attackDamage().dmg * dmgMult);
      this.spawnRing(cx, cy, radius, 0x9fd0ff);
      const hitFoes = this.aoeHit(h, cx, cy, radius, dmg, time, 'stun', pull ? -260 : 320, stunDur);
      for (const m of hitFoes) {
        m.applyStatus('shock', 1400, time);
        if (pull) m.applyStatus('vuln', stunDur, time, 1.25);
      }
      if (sig.has('van_sig_aftershock')) {
        this.spawnGroundZone({ x: cx, y: cy, radius: radius * 0.85, owner: h, duration: 7000, tickEvery: 900, dmg: Math.round(dmg * 0.45), status: 'chill', statusDur: 1400, slow: true, texture: 'fx-glow-warm', tint: 0xffb060, alpha: 0.32 });
      }
      if (sig.has('van_sig_fault')) {
        const far = this.farthestFoe(cx, cy, radius * 3);
        if (far) { this.spawnBeam(cx, cy, far.x, far.y, 0xffd090); this.aoeHit(h, far.x, far.y, 48, Math.round(dmg * 0.9), time, 'stun', 60, 900); }
      }
      // Steelskin: an absorb shield (+heal), broadened by defensive sigils
      let shield = Math.round(h.stats.maxHealth * 0.16) + h.stats.armor;
      if (sig.has('van_sig_adamant')) shield *= 2;
      if (sig.has('van_sig_quakeheart')) { h.heal(hitFoes.length * 6); shield += hitFoes.length * 4; }
      h.grantShield(shield, 6000, time);
      h.heal(Math.round(h.stats.maxHealth * 0.1));
      if (sig.has('van_sig_bulwark')) this.eachAllyInRange(h, 150, (a) => a.grantShield(Math.round(shield * 0.5), 6000, time), false);
      if (sig.has('van_sig_upheaval')) {
        this.time.delayedCall(600, () => {
          if (!h.active) return;
          const now = this.time.now;
          this.spawnRing(cx, cy, radius * 0.9, 0xbfe0ff);
          this.aoeHit(h, cx, cy, radius * 0.9, Math.round(dmg * 0.7), now, 'stun', 200, 800);
        });
      }
      if (announce) this.cameras.main.shake(240, 0.009);
      audio.sfx('hit');
    }
    this.spawnBurst(cx, cy, 0xffd0a0);
    if (announce) this.showBark(`${h.def.name} unleashes ${this.abilityName(h.classId)}!`);
  }

  private facingVec(h: Hero): { x: number; y: number } {
    switch (h.facing) {
      case 'up': return { x: 0, y: -1 };
      case 'down': return { x: 0, y: 1 };
      case 'left': return { x: -1, y: 0 };
      default: return { x: 1, y: 0 };
    }
  }

  /** Farthest walkable point along a direction, up to `dist` (dash clamp). */
  private clampDash(x: number, y: number, dx: number, dy: number, dist: number): { x: number; y: number } {
    const steps = Math.ceil(dist / 8);
    let lx = x;
    let ly = y;
    for (let i = 1; i <= steps; i++) {
      const nx = x + dx * (i * 8);
      const ny = y + dy * (i * 8);
      if (!WALKABLE_TILES.has(this.tileAt(nx, ny))) break;
      lx = nx;
      ly = ny;
    }
    return { x: lx, y: ly };
  }

  // ---- Secondary / Tertiary / Ultimate active abilities -------------------
  /** Run the level-unlocked active for a slot. Returns false to abort (no
   *  cooldown / mana is spent) when the ability has no valid target. */
  private useActive(h: Hero, slot: ActiveSlot, time: number, announce = true): boolean {
    const def = activeFor(h.classId, slot);
    const cx = h.x;
    const cy = h.y;
    switch (def.id) {
      // ---- Vanguard ----
      case 'van_charge': {
        const d = this.facingVec(h);
        const dest = this.clampDash(cx, cy, d.x, d.y, 150);
        h.grantIframes(time, 320);
        this.spawnBeam(cx, cy, dest.x, dest.y, 0xbfe0ff);
        this.aoeHit(h, cx, cy, 48, Math.round(h.attackDamage().dmg * 0.8), time, 'stun', 200, 700);
        this.tweens.add({
          targets: h, x: dest.x, y: dest.y, duration: 220, ease: 'Quad.easeOut',
          onComplete: () => {
            const now = this.time.now;
            this.spawnRing(dest.x, dest.y, 82, 0x9fd0ff);
            this.aoeHit(h, dest.x, dest.y, 82, Math.round(h.attackDamage().dmg * 1.1), now, 'stun', 260, 1000);
            this.cameras.main.shake(160, 0.006);
          },
        });
        audio.sfx('swing');
        break;
      }
      case 'van_roar': {
        this.spawnRing(cx, cy, 180, 0xffcf5a);
        for (const m of this.monsters) if (m.active && m.alive && Phaser.Math.Distance.Between(cx, cy, m.x, m.y) < 200) m.taunt(h, 5000, time);
        this.eachAllyInRange(h, 230, (a) => a.grantBuff(6000, time, { dr: 0.2, speed: 20 }));
        audio.sfx('boss_roar');
        break;
      }
      case 'van_cataclysm': {
        const radius = 260;
        this.spawnRing(cx, cy, radius, 0x9fd0ff);
        this.spawnRing(cx, cy, radius * 0.6, 0xbfe0ff);
        this.cameras.main.shake(500, 0.02);
        const hit = this.aoeHit(h, cx, cy, radius, Math.round(h.attackDamage().dmg * 3.4), time, 'stun', 260, 3200);
        for (const m of hit) m.applyStatus('vuln', 3200, time, 1.3);
        this.spawnGroundZone({ x: cx, y: cy, radius: radius * 0.8, owner: h, duration: 6000, tickEvery: 800, dmg: Math.round(h.attackDamage().dmg * 0.7), status: 'chill', slow: true, texture: 'fx-glow-warm', tint: 0xffb060, alpha: 0.4 });
        this.eachAllyInRange(h, radius, (a) => a.grantShield(Math.round(a.stats.maxHealth * 0.25), 8000, time));
        break;
      }
      // ---- Thief ----
      case 'str_shadowstep': {
        const foe = this.nearestFoe(cx, cy, 360);
        if (!foe) return false;
        const ang = Math.atan2(foe.y - cy, foe.x - cx);
        h.setPosition(foe.x - Math.cos(ang) * 20, foe.y - Math.sin(ang) * 20);
        h.grantIframes(time, 260);
        this.spawnBurst(h.x, h.y, 0x8f7bd0, 1.8);
        const dmg = Math.round(h.attackDamage().dmg * 3.0);
        if (foe.takeDamage(dmg, time)) this.onMonsterKilled(h, foe);
        else foe.applyStatus('bleed', 3000, time, Math.max(4, Math.round(dmg * 0.1)));
        this.floatDamage(foe.x, foe.y, dmg, true);
        audio.sfx('swing');
        break;
      }
      case 'str_smoke': {
        const rad = 120;
        this.spawnGroundZone({ x: cx, y: cy, radius: rad, owner: h, duration: 5000, tickEvery: 700, status: 'chill', statusDur: 900, slow: true, texture: 'fx-glow-white', tint: 0x66707e, alpha: 0.5 });
        this.eachAllyInRange(h, rad, (a) => a.grantBuff(5000, time, { dr: 0.25 }));
        audio.sfx('swing');
        break;
      }
      case 'str_phantom': {
        const mark: Monster | null = this.boss && this.boss.alive ? this.boss : this.nearestFoe(cx, cy, 520);
        if (!mark) return false;
        h.grantIframes(time, 900);
        const strikes = 5;
        for (let i = 0; i < strikes; i++) {
          this.time.delayedCall(i * 120, () => {
            if (!h.active || !mark.active || !mark.alive) return;
            const now = this.time.now;
            const ang = (i / strikes) * Math.PI * 2;
            h.setPosition(mark.x - Math.cos(ang) * 22, mark.y - Math.sin(ang) * 22);
            this.spawnBurst(h.x, h.y, 0x8f7bd0, 1.5);
            const dmg = Math.round(h.attackDamage().dmg * 2.2);
            if (mark.takeDamage(dmg, now)) this.onMonsterKilled(h, mark);
            this.floatDamage(mark.x, mark.y, dmg, true);
            audio.sfx('swing');
          });
        }
        this.time.delayedCall(strikes * 120 + 40, () => {
          if (!mark.active || !mark.alive) return;
          const now = this.time.now;
          mark.applyStatus('bleed', 4000, now, Math.max(6, Math.round(h.attackDamage().dmg * 0.2)));
          mark.applyStatus('poison', 4000, now, Math.max(5, Math.round(h.attackDamage().dmg * 0.15)));
        });
        break;
      }
      // ---- Arcanist ----
      case 'arc_frostnova': {
        const rad = 130;
        this.spawnRing(cx, cy, rad, 0x9fd0ff);
        const hit = this.aoeHit(h, cx, cy, rad, Math.round(h.magicDamage() * 1.2), time, 'chill', 40, 2600);
        for (const m of hit) m.applyStatus('root', 1100, time);
        this.spawnGroundZone({ x: cx, y: cy, radius: rad, owner: h, duration: 4000, tickEvery: 600, status: 'chill', statusDur: 900, slow: true, texture: 'fx-glow-white', tint: 0x9fd0ff, alpha: 0.4 });
        audio.sfx('magic');
        break;
      }
      case 'arc_blink': {
        const d = this.facingVec(h);
        const dest = this.clampDash(cx, cy, d.x, d.y, 170);
        this.spawnBurst(cx, cy, 0xc06bff);
        h.setPosition(dest.x, dest.y);
        h.grantIframes(time, 300);
        this.spawnBurst(dest.x, dest.y, 0xc06bff);
        audio.sfx('magic');
        break;
      }
      case 'arc_armageddon': {
        const near = this.nearestFoe(cx, cy, 520);
        const tx = near ? near.x : cx + this.facingVec(h).x * 160;
        const ty = near ? near.y : cy + this.facingVec(h).y * 160;
        this.cameras.main.shake(600, 0.012);
        for (let i = 0; i < 6; i++) {
          const ox = tx + Phaser.Math.Between(-140, 140);
          const oy = ty + Phaser.Math.Between(-140, 140);
          this.time.delayedCall(i * 130, () => {
            if (!h.active) return;
            const now = this.time.now;
            const meteor = this.add.sprite(ox, oy, 'fx-fire').setDepth(oy + 24).setScale(120 / 16).setTint(0xff7a2a);
            meteor.play('fx-fire');
            meteor.once('animationcomplete', () => meteor.destroy());
            this.aoeHit(h, ox, oy, 90, Math.round(h.magicDamage() * 1.7), now, 'burn', 60, 6000, Math.round(h.magicDamage() * 0.2));
          });
        }
        this.spawnGroundZone({ x: tx, y: ty, radius: 150, owner: h, duration: 5000, tickEvery: 600, dmg: Math.round(h.magicDamage() * 0.5), status: 'burn', statusMag: Math.round(h.magicDamage() * 0.18), texture: 'fx-glow-warm', tint: 0xff7a2a, alpha: 0.4 });
        audio.sfx('magic');
        break;
      }
      // ---- Warden ----
      case 'war_smite': {
        const foe = this.nearestFoe(cx, cy, 420);
        if (!foe) return false;
        this.spawnBeam(cx, cy - 4, foe.x, foe.y, 0xffe6a0);
        const dmg = Math.round(h.magicDamage() * 2.4);
        if (foe.takeDamage(dmg, time)) this.onMonsterKilled(h, foe);
        else {
          foe.applyStatus('shock', 2000, time);
          if (Math.random() < 0.4) foe.applyStatus('fear', 1200, time);
        }
        this.floatDamage(foe.x, foe.y, dmg, true);
        let low: Hero | null = null;
        for (const a of this.allies) if (a.alive && (!low || a.healthRatio() < low.healthRatio())) low = a;
        if (low) low.heal(Math.round(low.stats.maxHealth * 0.2));
        audio.sfx('shrine');
        break;
      }
      case 'war_consecration': {
        const rad = 120;
        this.spawnRing(cx, cy, rad, 0xffe6a0);
        this.spawnGroundZone({ x: cx, y: cy, radius: rad, owner: h, duration: 7000, tickEvery: 600, dmg: Math.round(h.magicDamage() * 0.5), status: 'shock', statusDur: 900, healAllies: Math.round(5 + h.level * 0.4), texture: 'fx-glow-warm', tint: 0xffe6a0, alpha: 0.32 });
        audio.sfx('shrine');
        break;
      }
      case 'war_apocalypse': {
        const rad = 320;
        this.spawnRing(cx, cy, rad * 0.5, 0xffe6a0);
        this.cameras.main.flash(300, 255, 240, 180);
        for (const a of this.allies) {
          if (a.alive) {
            a.heal(Math.round(a.stats.maxHealth * 0.6));
            a.restoreMana(Math.round(a.stats.maxMana * 0.4));
            a.grantBuff(8000, time, { dmgMult: 1.2, dr: 0.15 });
          } else if (a.active && Phaser.Math.Distance.Between(cx, cy, a.x, a.y) < rad) {
            this.reviveAlly(a, Math.round(a.stats.maxHealth * 0.5));
          }
        }
        const hit = this.aoeHit(h, cx, cy, rad, Math.round(h.magicDamage() * 2.6), time, 'stun', 120, 2600);
        for (const m of hit) m.applyStatus('vuln', 4000, time, 1.3);
        audio.sfx('shrine');
        break;
      }
      // ---- Necromancer ----
      case 'nec_corpseburst': {
        const near = this.nearestFoe(cx, cy, 420);
        const tx = near ? near.x : cx + this.facingVec(h).x * 130;
        const ty = near ? near.y : cy + this.facingVec(h).y * 130;
        const corpses = this.consumeCorpsesNear(tx, ty, 170, 6);
        const points = corpses.length ? corpses : [{ x: tx, y: ty }];
        for (const c of points) {
          this.spawnBurst(c.x, c.y, 0x9b5bff, 2.0);
          this.aoeHit(h, c.x, c.y, 74, Math.round(h.magicDamage() * 1.4), time, 'burn', 60, 3000, Math.round(h.magicDamage() * 0.15));
        }
        audio.sfx('magic');
        break;
      }
      case 'nec_bonespear': {
        const d = this.facingVec(h);
        const spr = this.add.sprite(cx + d.x * 14, cy + d.y * 14, 'fx-bolt').setDepth(cy + 8).setRotation(Math.atan2(d.y, d.x)).setTint(0xeaeaea).setScale(1.4);
        this.projectiles.push({ spr, vx: d.x * 430, vy: d.y * 430, dmg: Math.round(h.magicDamage() * 2.2), crit: false, bornAt: time, ttl: 900, owner: h, pierce: 6, hit: new Set() });
        audio.sfx('magic');
        break;
      }
      case 'nec_army': {
        const roles: SkeletonType[] = ['tank', 'archer', 'mage', 'thief'];
        for (let i = 0; i < 5; i++) {
          this.time.delayedCall(i * 90, () => {
            if (h.active && h.alive) this.summonSkeleton(h, true, roles[i % roles.length], { force: true, free: true, lifespan: 14000 });
          });
        }
        for (const s of this.summons) if (s.alive && s.summoner === h) s.grantBuff(14000, time, { dmgMult: 1.5, speed: 40 });
        this.spawnBurst(cx, cy, 0x9b5bff, 3.0);
        this.cameras.main.shake(300, 0.008);
        audio.sfx('magic');
        break;
      }
      // ---- Bard ----
      case 'brd_dance': {
        const rad = 90;
        this.spawnRing(cx, cy, rad, 0xff8a9a);
        const fx = this.add.sprite(cx, cy, 'fx-slash').setDepth(cy + 8).setScale(2.4).setTint(0xffd0e0);
        fx.play('fx-slash');
        fx.once('animationcomplete', () => fx.destroy());
        let mult = 1.6;
        let status: MonsterStatus = 'shock';
        if (h.song === 'war') mult += 0.5;
        if (h.song === 'dirge') status = 'vuln';
        const hit = this.aoeHit(h, cx, cy, rad, Math.round(h.attackDamage().dmg * mult), time, status, 120, 1400, status === 'vuln' ? 1.25 : 0);
        if (h.song === 'hymn') this.eachAllyInRange(h, rad + 40, (a) => a.heal(Math.round(a.stats.maxHealth * 0.08)));
        void hit;
        audio.sfx('swing');
        break;
      }
      case 'brd_rally': {
        this.spawnRing(cx, cy, 220, 0xffe9a8);
        this.eachAllyInRange(h, 260, (a) => {
          a.grantBuff(8000, time, { dmgMult: 1.25, dr: 0.15, crit: 0.1 });
          a.heal(Math.round(a.stats.maxHealth * 0.15));
        });
        audio.sfx('shrine');
        break;
      }
      case 'brd_symphony': {
        this.spawnRing(cx, cy, 240, 0xffe9a8);
        this.eachAllyInRange(h, 280, (a) => a.grantBuff(10000, time, { dmgMult: 1.3, dr: 0.15, crit: 0.12, speed: 30 }));
        // all four song motifs at once — a lingering healing + slowing field
        this.spawnGroundZone({ x: cx, y: cy, radius: 200, owner: h, duration: 10000, tickEvery: 900, status: 'chill', statusDur: 700, healAllies: 5, texture: 'fx-glow-warm', tint: 0xffe9a8, alpha: 0.26 });
        this.cameras.main.flash(220, 255, 233, 168);
        audio.sfx('shrine');
        break;
      }
      // ---- Druid ----
      case 'dru_maul': {
        if (h.bearForm) {
          const d = this.facingVec(h);
          const tx = cx + d.x * 30;
          const ty = cy + d.y * 30;
          const fx = this.add.sprite(tx, ty, 'fx-slash').setDepth(cy + 8).setScale(2.6).setRotation(Math.atan2(d.y, d.x)).setTint(0x8fce5a);
          fx.play('fx-slash');
          fx.once('animationcomplete', () => fx.destroy());
          const hit = this.aoeHit(h, tx, ty, 74, Math.round(h.attackDamage().dmg * 1.8), time, 'shock', 200, 1400);
          for (const m of hit) m.applyStatus('bleed', 3200, time, Math.max(5, Math.round(h.attackDamage().dmg * 0.14)));
          audio.sfx('melee');
        } else {
          const foe = this.nearestFoe(cx, cy, 260);
          if (!foe) return false;
          foe.applyStatus('root', 2200, time);
          foe.applyStatus('chill', 2600, time);
          this.spawnBurst(foe.x, foe.y, 0x8fce5a, 1.4);
          const dmg = Math.round(h.magicDamage() * 1.2);
          if (foe.takeDamage(dmg, time)) this.onMonsterKilled(h, foe);
          this.floatDamage(foe.x, foe.y, dmg, false);
          audio.sfx('magic');
        }
        break;
      }
      case 'dru_moonfire': {
        const near = this.nearestFoe(cx, cy, 380);
        const tx = near ? near.x : cx + this.facingVec(h).x * 140;
        const ty = near ? near.y : cy + this.facingVec(h).y * 140;
        this.spawnBurst(tx, ty, 0xbfe0ff, 2.2);
        const hit = this.aoeHit(h, tx, ty, 80, Math.round(h.magicDamage() * 1.7), time, 'burn', 60, 4000, Math.round(h.magicDamage() * 0.16));
        for (const m of hit) m.applyStatus('chill', 2000, time);
        audio.sfx('magic');
        break;
      }
      case 'dru_avatar': {
        if (!h.bearForm) {
          h.shapeshift(time);
          this.shiftFx(h);
        }
        h.grantBuff(12000, time, { dmgMult: 1.4, dr: 0.2 });
        h.grantShield(Math.round(h.stats.maxHealth * 0.3), 12000, time);
        const radius = 200;
        this.spawnRing(cx, cy, radius, 0x8fce5a);
        this.cameras.main.shake(360, 0.012);
        const hit = this.aoeHit(h, cx, cy, radius, Math.round(h.attackDamage().dmg * 2.6), time, 'stun', 240, 2000);
        for (const m of hit) m.applyStatus('bleed', 3500, time, Math.max(6, Math.round(h.attackDamage().dmg * 0.16)));
        this.spawnGroundZone({ x: cx, y: cy, radius: radius * 0.8, owner: h, duration: 6000, tickEvery: 800, dmg: Math.round(h.attackDamage().dmg * 0.5), slow: true, status: 'chill', texture: 'fx-glow-green', tint: 0x8fce5a, alpha: 0.3 });
        break;
      }
      default:
        return false;
    }
    if (announce) this.showBark(`${h.def.name}: ${def.name}!`, 2000, 'event');
    return true;
  }

  /** Shared radial damage for abilities: hurts monsters + generators in range.
   *  Returns the still-living foes struck so callers can layer extra effects. */
  private aoeHit(
    h: Hero,
    x: number,
    y: number,
    radius: number,
    dmg: number,
    time: number,
    status: MonsterStatus,
    knockback: number,
    statusDur = 1700,
    statusMag = 0
  ): Monster[] {
    const hitList: Monster[] = [];
    for (const m of this.monsters) {
      if (!m.active || !m.alive) continue;
      const dx = m.x - x;
      const dy = m.y - y;
      const l = Math.hypot(dx, dy) || 1;
      if (l <= radius) {
        const died = m.takeDamage(dmg, time);
        this.floatDamage(m.x, m.y, dmg, true);
        if (died) this.onMonsterKilled(h, m);
        else {
          // positive knockback shoves outward; negative pulls the foe inward
          if (knockback !== 0) m.knock((dx / l) * knockback, (dy / l) * knockback, time);
          m.applyStatus(status, statusDur, time, statusMag);
          hitList.push(m);
        }
      }
    }
    for (const g of this.generators) {
      if (!g.alive) continue;
      if (Phaser.Math.Distance.Between(x, y, g.x, g.y) <= radius) g.takeDamage(dmg, time);
    }
    return hitList;
  }

  // ---- Class Ability Expansion: ground zones + corpses --------------------

  /** Drop a persistent zone that ticks damage/heal/status until it expires. */
  private spawnGroundZone(opts: {
    x: number; y: number; radius: number; owner: Hero; duration: number;
    tickEvery?: number; dmg?: number; status?: MonsterStatus; statusDur?: number; statusMag?: number;
    slow?: boolean; healAllies?: number; texture?: string; tint?: number; alpha?: number;
  }): void {
    const time = this.time.now;
    const alpha = opts.alpha ?? 0.5;
    const gfx = this.add
      .image(opts.x, opts.y, opts.texture ?? 'fx-glow-warm')
      .setDepth(opts.y - 4)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(alpha)
      .setScale((opts.radius * 2) / 32);
    if (opts.tint !== undefined) gfx.setTint(opts.tint);
    this.tweens.add({ targets: gfx, alpha: alpha * 0.55, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.groundZones.push({
      x: opts.x,
      y: opts.y,
      radius: opts.radius,
      owner: opts.owner,
      expireAt: time + opts.duration,
      nextTickAt: time + (opts.tickEvery ?? 500),
      tickEvery: opts.tickEvery ?? 500,
      dmg: opts.dmg ?? 0,
      status: opts.status,
      statusDur: opts.statusDur ?? 1200,
      statusMag: opts.statusMag ?? 0,
      slow: !!opts.slow,
      healAllies: opts.healAllies ?? 0,
      gfx,
    });
  }

  private updateGroundZones(time: number): void {
    for (let i = this.groundZones.length - 1; i >= 0; i--) {
      const z = this.groundZones[i];
      if (time >= z.expireAt) {
        this.tweens.killTweensOf(z.gfx);
        z.gfx.destroy();
        this.groundZones.splice(i, 1);
        continue;
      }
      if (time < z.nextTickAt) continue;
      z.nextTickAt = time + z.tickEvery;
      if (z.dmg > 0 || z.status || z.slow) {
        for (const m of this.monsters) {
          if (!m.active || !m.alive) continue;
          if (Phaser.Math.Distance.Between(z.x, z.y, m.x, m.y) > z.radius) continue;
          if (z.dmg > 0) {
            const died = m.takeDamage(z.dmg, time);
            this.floatDamage(m.x, m.y, z.dmg, false);
            if (died) {
              this.onMonsterKilled(z.owner, m);
              continue;
            }
          }
          if (z.status) m.applyStatus(z.status, z.statusDur, time, z.statusMag);
          if (z.slow) m.applyStatus('chill', z.tickEvery + 200, time);
        }
      }
      if (z.healAllies > 0) {
        for (const a of this.allies) {
          if (!a.alive || a.health >= a.stats.maxHealth) continue;
          if (Phaser.Math.Distance.Between(z.x, z.y, a.x, a.y) > z.radius) continue;
          a.heal(z.healAllies);
        }
      }
    }
  }

  private addCorpse(x: number, y: number): void {
    this.corpses.push({ x, y, bornAt: this.time.now });
    if (this.corpses.length > 48) this.corpses.shift();
  }

  private updateCorpses(time: number): void {
    for (let i = this.corpses.length - 1; i >= 0; i--) {
      if (time - this.corpses[i].bornAt > 14000) this.corpses.splice(i, 1);
    }
  }

  /** Pull up to `max` corpses near a point, removing them (they are consumed). */
  private consumeCorpsesNear(x: number, y: number, radius: number, max: number): Corpse[] {
    const out: Corpse[] = [];
    for (let i = this.corpses.length - 1; i >= 0 && out.length < max; i--) {
      const c = this.corpses[i];
      if (Phaser.Math.Distance.Between(x, y, c.x, c.y) <= radius) {
        out.push(c);
        this.corpses.splice(i, 1);
      }
    }
    return out;
  }

  /** The sigils a hero currently has active (level-gated choices). */
  private heroSig(h: Hero): Set<string> {
    return h.abilities.activeSigilSet(h.level);
  }

  private nearestFoe(x: number, y: number, maxDist: number, exclude?: Set<Monster>): Monster | null {
    let best: Monster | null = null;
    let bd = maxDist;
    for (const m of this.monsters) {
      if (!m.active || !m.alive || exclude?.has(m)) continue;
      const d = Phaser.Math.Distance.Between(x, y, m.x, m.y);
      if (d < bd) {
        bd = d;
        best = m;
      }
    }
    return best;
  }

  private farthestFoe(x: number, y: number, maxDist: number): Monster | null {
    let best: Monster | null = null;
    let bd = 0;
    for (const m of this.monsters) {
      if (!m.active || !m.alive) continue;
      const d = Phaser.Math.Distance.Between(x, y, m.x, m.y);
      if (d <= maxDist && d > bd) {
        bd = d;
        best = m;
      }
    }
    return best;
  }

  /** A quick fading energy line between two points (faultline, bone spear). */
  private spawnBeam(x1: number, y1: number, x2: number, y2: number, color: number): void {
    const g = this.add.graphics().setDepth(Math.max(y1, y2) + 12);
    g.lineStyle(4, color, 0.9).lineBetween(x1, y1, x2, y2);
    g.lineStyle(1.5, 0xffffff, 0.85).lineBetween(x1, y1, x2, y2);
    this.tweens.add({ targets: g, alpha: 0, duration: 260, onComplete: () => g.destroy() });
  }

  /** A one-shot expanding glow burst (ability flourish). */
  private spawnBurst(x: number, y: number, color: number, scale = 2.4): void {
    const flash = this.add.image(x, y, 'fx-glow-warm').setScale(scale).setAlpha(0.72).setBlendMode(Phaser.BlendModes.ADD).setDepth(y + 10).setTint(color);
    this.tweens.add({ targets: flash, alpha: 0, scale: scale * 1.5, duration: 420, onComplete: () => flash.destroy() });
  }

  /** An animated ring pulse centered on a point (slam / nova telegraph). */
  private spawnRing(x: number, y: number, radius: number, tint: number): void {
    const ring = this.add.sprite(x, y, 'fx-magic').setDepth(y + 20).setScale((radius * 2) / 32).setTint(tint);
    ring.play('fx-magic');
    ring.once('animationcomplete', () => ring.destroy());
  }

  /** Run a callback for each living ally within radius of a hero (self optional). */
  private eachAllyInRange(center: Hero, radius: number, fn: (a: Hero) => void, includeSelf = true): void {
    for (const a of this.allies) {
      if (!a.alive) continue;
      if (a === center) {
        if (includeSelf) fn(a);
        continue;
      }
      if (Phaser.Math.Distance.Between(center.x, center.y, a.x, a.y) <= radius) fn(a);
    }
  }

  /** Spell-chain: arc reduced damage to nearby foes (item affix / arcanist skill). */
  private chainBolt(owner: Hero, from: Monster, dmg: number, time: number, chains: number, hit: Set<Monster> = new Set()): void {
    if (chains <= 0) return;
    hit.add(from);
    let best: Monster | null = null;
    let bd = 96;
    for (const m of this.monsters) {
      if (!m.active || !m.alive || hit.has(m)) continue;
      const d = Phaser.Math.Distance.Between(from.x, from.y, m.x, m.y);
      if (d < bd) {
        bd = d;
        best = m;
      }
    }
    if (!best) return;
    const cd = Math.max(1, Math.round(dmg * 0.6));
    const died = best.takeDamage(cd, time);
    this.floatDamage(best.x, best.y, cd, false);
    const line = this.add.line(0, 0, from.x, from.y, best.x, best.y, 0x9bd0ff, 0.9).setOrigin(0, 0).setLineWidth(2).setDepth(best.y + 14).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: line, alpha: 0, duration: 200, onComplete: () => line.destroy() });
    if (died) this.onMonsterKilled(owner, best);
    else this.chainBolt(owner, best, cd, time, chains - 1, hit);
  }

  // ---- minimap ----
  private buildMinimap(): void {
    const W = this.level.width;
    const H = this.level.height;
    const t = this.level.tiles;
    const cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    const c2 = cv.getContext('2d')!;
    c2.fillStyle = 'rgba(10,12,20,0.6)';
    c2.fillRect(0, 0, W, H);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const tile = t[y][x];
        if (tile === Tile.VOID) continue;
        c2.fillStyle =
          tile === Tile.WALL ? '#39406a' : tile === Tile.EXIT ? '#ffd24a' : tile === Tile.LOCKED_DOOR ? '#c06bff' : '#7a86b0';
        c2.fillRect(x, y, 1, 1);
      }
    }
    const key = 'minimap-bg';
    if (this.textures.exists(key)) this.textures.remove(key);
    this.textures.addCanvas(key, cv);
    const cw = 120;
    const ch = Math.round((cw * H) / W);
    const px = PLAY_AREA_WIDTH - cw - 12;
    const py = 12;
    this.mmImage = this.add.image(px, py, key).setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH.OVERLAY - 6).setDisplaySize(cw, ch).setAlpha(0.82);
    const b = this.add.graphics().setScrollFactor(0).setDepth(DEPTH.OVERLAY - 5);
    b.lineStyle(1, 0xcfa64e, 0.8);
    b.strokeRect(px - 1, py - 1, cw + 2, ch + 2);
    this.mmBorder = b;
    this.mmX = px;
    this.mmY = py;
    this.mmCW = cw;
    this.mmCH = ch;
    this.mmDots = this.add.graphics().setScrollFactor(0).setDepth(DEPTH.OVERLAY - 4);
  }

  private updateMinimap(): void {
    const g = this.mmDots;
    if (!g) return;
    const show = settings.get('showMinimap');
    this.mmImage?.setVisible(show);
    this.mmBorder?.setVisible(show);
    g.setVisible(show);
    if (!show) {
      g.clear();
      return;
    }
    g.clear();
    const mapX = (wx: number): number => this.mmX + (wx / (this.level.width * TILE_SIZE)) * this.mmCW;
    const mapY = (wy: number): number => this.mmY + (wy / (this.level.height * TILE_SIZE)) * this.mmCH;
    // Generators stay hidden until a hero explores near them, so each level is a
    // hunt — only a few show at a time instead of the whole map being given away.
    const REVEAL = 116; // px (~7 tiles) sight radius
    for (const gn of this.generators) {
      if (!gn.alive) continue;
      if (!this.foundGens.has(gn)) {
        for (const p of this.players) {
          if (p.alive && Phaser.Math.Distance.Between(p.x, p.y, gn.x, gn.y) <= REVEAL) {
            this.foundGens.add(gn);
            break;
          }
        }
      }
      if (!this.foundGens.has(gn)) continue;
      g.fillStyle(0xc06bff, 1);
      g.fillRect(mapX(gn.x) - 1, mapY(gn.y) - 1, 2, 2);
    }
    if (this.boss && this.bossAlive) {
      g.fillStyle(0xe0392e, 1);
      g.fillCircle(mapX(this.boss.x), mapY(this.boss.y), 2.5);
    }
    for (const a of this.allies) {
      if (!a.alive) continue;
      g.fillStyle(a.isPlayer ? 0x5fe06a : 0x4fa3ff, 1);
      g.fillCircle(mapX(a.x), mapY(a.y), a.isPlayer ? 2.2 : 1.6);
    }
  }

  private updateMonsters(time: number, delta: number): void {
    // Allies in plain sight are visible to every foe. A sneaking ally is hidden
    // EXCEPT to a monster that has personally spotted them (per-enemy detection).
    const visible = this.allies.filter((a) => a.alive && !a.sneaking);
    const live: Monster[] = [];
    for (const m of this.monsters) {
      if (m.active && m.alive) {
        let tgts = visible;
        if (m.spottedAlly && m.spottedAlly.alive && m.spottedAlly.sneaking && time <= m.spottedUntil) {
          tgts = visible.includes(m.spottedAlly) ? visible : visible.concat(m.spottedAlly);
        } else if (m.spottedAlly && (!m.spottedAlly.sneaking || time > m.spottedUntil)) {
          m.spottedAlly = null; // lost track of the sneaker
        }
        m.tick(time, delta, tgts);
        live.push(m);
      }
    }
    // Compact: dead monsters otherwise pile up in this array forever (altars
    // keep spawning), so long sessions end up scanning thousands of destroyed
    // sprites here + in resolveCombat/updateSneak every frame. Death tweens
    // finish on their own; combat only ever targets live entries.
    if (live.length !== this.monsters.length) this.monsters = live;
    this.separateMonsters(live);
  }

  private separateMonsters(live: Monster[]): void {
    if (live.length < 2) return;
    const scale = settings.spriteScale();
    for (let i = 0; i < live.length; i++) {
      const a = live[i];
      if (a.isBoss) continue;
      const body = a.body as Phaser.Physics.Arcade.Body | null;
      if (!body || !body.enable) continue;
      const radius = (14 + (a.def.scale ?? 1) * 10) * scale;
      let px = 0;
      let py = 0;
      let n = 0;
      for (let j = 0; j < live.length; j++) {
        if (i === j) continue;
        const b = live[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 > 0.0001 && d2 < radius * radius) {
          const d = Math.sqrt(d2);
          const w = (radius - d) / radius;
          px += (dx / d) * w;
          py += (dy / d) * w;
          n++;
        }
      }
      if (n === 0) continue;
      const push = a.def.speed * 0.85;
      body.velocity.x += px * push;
      body.velocity.y += py * push;
      const sp = Math.hypot(body.velocity.x, body.velocity.y);
      const maxSp = a.def.speed * 1.6 || 1;
      if (sp > maxSp) {
        body.velocity.x *= maxSp / sp;
        body.velocity.y *= maxSp / sp;
      }
    }
  }

  private updateGenerators(time: number): void {
    for (const g of this.generators) if (g.alive) g.tick(time);
  }

  private toggleSneak(h: Hero): void {
    h.sneaking = !h.sneaking;
    if (h.sneaking) {
      h.spottedUntil = 0;
      audio.sfx('ui_move');
      this.showBark('You melt into the shadows...', 2000, 'system');
      const puff = this.add.sprite(h.x, h.y, 'fx-magic').setDepth(h.y + 8).setScale(1.7).setTint(0x4a3a66);
      puff.play('fx-magic');
      puff.once('animationcomplete', () => puff.destroy());
    } else {
      audio.sfx('ui_select');
      this.showBark('You step from the shadows.', 1800, 'system');
    }
  }

  /** Sneak: shadow visual, level-scaled enemy detection, and slow skill growth. */
  private updateSneak(time: number): void {
    if (!this.sneakGfx) this.sneakGfx = this.add.graphics().setDepth(DEPTH.OVERLAY - 20);
    const g = this.sneakGfx;
    g.clear();
    const liveMon = this.monsters.filter((m) => m.active && m.alive);
    for (const a of this.players) {
      if (!a.alive || !a.sneaking) continue;
      const pulse = 0.5 + 0.5 * Math.sin(time / 220);
      g.fillStyle(0x140e26, 0.4 + 0.18 * pulse);
      g.fillEllipse(a.x, a.y + 4, 28 + 5 * pulse, 15 + 2 * pulse);
      g.fillStyle(0x6a4f9a, 0.16 * pulse);
      g.fillEllipse(a.x, a.y - 2, 20, 26);
      if (Math.random() < 0.01 && a.gainSneak(1)) this.showBark(`Your Sneak sharpens — Lv ${a.sneakLevel}.`, 1800, 'system');
      // Each nearby foe rolls INDEPENDENTLY to notice the thief; being seen by
      // one does not cancel sneak or alert the others. Higher Sneak = harder to spot.
      for (const m of liveMon) {
        if (time <= m.spottedUntil) continue; // this foe already sees the thief
        const dd = Phaser.Math.Distance.Between(a.x, a.y, m.x, m.y);
        if (dd < 72) {
          const ch = 0.03 * (1 - Math.min(0.85, a.sneakLevel * 0.06)) * (1 - dd / 72);
          if (Math.random() < ch) {
            m.spottedUntil = time + 3000;
            m.spottedAlly = a;
            this.floatPickup(m.x, m.y - 18, '!', '#ff6a4a');
            audio.sfx('hurt');
          }
        }
      }
    }
  }

  /** A thief backstab lands when the foe is moving away (its back is turned). */
  private isBackstab(ally: Hero, m: Monster): boolean {
    if (ally.sneaking) return true; // striking from stealth is always a backstab
    const body = m.body as Phaser.Physics.Arcade.Body | null;
    const tx = ally.x - m.x;
    const ty = ally.y - m.y;
    if (body && Math.hypot(body.velocity.x, body.velocity.y) > 8) {
      return body.velocity.x * tx + body.velocity.y * ty < 0;
    }
    return Math.random() < 0.3; // stationary foe: a fair chance to slip behind
  }

  /** Thief steal: from stealth, lift coin/goods from the nearest foe or
   *  townsfolk. Success scales with Sneak + Pickpocket; a botched lift simply
   *  fails (and tips off the mark). Success pauses the game and shows the haul. */
  private attemptPickpocket(idx: number): void {
    const p = this.players[idx];
    if (!p || !p.alive) return;
    if (p.classId !== 'thief') {
      this.showBark('Only the Thief has the fingers for pickpocketing.', 2000, 'system');
      return;
    }
    if (!p.sneaking) {
      this.showBark('Slip into the shadows first (F) before trying a pocket.', 2200, 'system');
      return;
    }
    const reach = 42;
    let bestD = reach;
    let mon: Monster | null = null;
    let npc: (typeof this.townNpcs)[number] | null = null;
    for (const m of this.monsters) {
      if (!m.active || !m.alive || m.pickpocketed) continue;
      const d = Phaser.Math.Distance.Between(p.x, p.y, m.x, m.y);
      if (d < bestD) { bestD = d; mon = m; npc = null; }
    }
    for (const n of this.townNpcs) {
      if (n.pickpocketed) continue;
      const d = Phaser.Math.Distance.Between(p.x, p.y, n.sprite.x, n.sprite.y);
      if (d < bestD) { bestD = d; npc = n; mon = null; }
    }
    if (!mon && !npc) {
      this.showBark('No pockets within reach.', 1600, 'system');
      return;
    }
    const vx = mon ? mon.x : npc!.sprite.x;
    const vy = mon ? mon.y : npc!.sprite.y;
    const victim = mon ? mon.def.name : npc!.label;
    const chance = Phaser.Math.Clamp(0.3 + p.sneakLevel * 0.03 + p.pickpocketLevel * 0.06, 0.05, 0.95);
    if (Math.random() > chance) {
      audio.sfx('ui_move');
      this.floatPickup(vx, vy - 18, 'caught!', '#ff6a4a');
      this.showBark('Your fingers come up empty.', 1600, 'combat');
      if (mon) { mon.spottedUntil = this.time.now + 3000; mon.spottedAlly = p; } // the mark notices
      return;
    }
    if (mon) mon.pickpocketed = true;
    else if (npc) npc.pickpocketed = true;
    const loot = this.rollPickpocketLoot(p, victim);
    p.inventory.gold += loot.gold;
    for (const it of loot.items) p.inventory.add(it);
    if (p.gainPickpocket(1)) this.showBark(`Your Pickpocket sharpens — Lv ${p.pickpocketLevel}.`, 2200, 'system');
    audio.sfx('coin');
    this.floatPickup(vx, vy - 18, 'lifted!', '#8affa0');
    this.closeAllOverlays();
    this.pickpocketUI.open(loot);
    this.syncHudData();
  }

  /** Roll a pickpocket reward; gear odds + quality scale with Pickpocket level,
   *  topping out at Godforged for a master thief. */
  private rollPickpocketLoot(p: Hero, victim: string): PickpocketLoot {
    const lvl = p.pickpocketLevel;
    const gold = Phaser.Math.Between(5, 14) + lvl * Phaser.Math.Between(3, 8);
    const items: ItemDefinition[] = [];
    const roll = Math.random();
    const gearChance = Math.min(0.52, 0.14 + lvl * 0.05);
    if (roll < gearChance) {
      const grades: Grade[] = ['cracked', 'honed', 'runed', 'ascendant', 'godforged'];
      const cap = Math.min(grades.length - 2, Math.floor(lvl / 3)); // caps at Ascendant
      const grade = grades[Phaser.Math.Between(0, cap)];
      const theme = this.level.theme ?? 'crypt';
      const bases = THEME_BASES[theme] ?? THEME_BASES.crypt;
      const base = bases[Phaser.Math.Between(0, bases.length - 1)];
      items.push(mintItem(base, grade));
    } else if (roll < gearChance + 0.28) {
      const potion = Content.item(Math.random() < 0.5 ? 'health_potion' : 'mana_potion');
      if (potion) items.push(potion);
    } else if (roll < gearChance + 0.4) {
      const scrolls = ['town_portal_scroll', 'scroll_mending', 'scroll_renewal'];
      const s = Content.item(scrolls[Phaser.Math.Between(0, scrolls.length - 1)]);
      if (s) items.push(s);
    }
    return { gold, items, victim };
  }

  private resolveCombat(time: number): void {
    for (const ally of this.allies) {
      if (!ally.alive) continue;
      if (ally.attacking && !ally.meleeResolved && ally.weaponStyle() === 'melee') {
        ally.meleeResolved = true;
        const reach = ally.reach();
        const { dmg, crit } = ally.attackDamage();
        const dir = ally.attackDir;
        // A weapon-swing arc in the strike direction so melee reads dynamically
        // (the hero sheets hold a single attack frame; this adds the motion).
        // Player-only so a necromancer's summons + companions don't flood the screen.
        if (ally.isPlayer) {
          const sl = this.add.sprite(ally.x + dir.x * 14, ally.y + dir.y * 14, 'fx-slash')
            .setDepth(ally.y + 9)
            .setScale(1.7)
            .setRotation(Math.atan2(dir.y, dir.x))
            .setTint(crit ? 0xffd24a : 0xeaf2ff)
            .setAlpha(0.9);
          sl.play('fx-slash');
          sl.once('animationcomplete', () => sl.destroy());
        }
        const tsig = ally.classId === 'thief' ? this.heroSig(ally) : null;
        for (const m of this.monsters) {
          if (!m.active || !m.alive) continue;
          if (this.inArc(ally.x, ally.y, m.x, m.y, dir, reach + 8)) {
            // Backstab now respects a cooldown that shrinks as Sneak grows; a
            // strike on cooldown still hits, just without the 2.4x bonus.
            const back = ally.classId === 'thief' && time >= ally.backstabReadyAt && this.isBackstab(ally, m);
            // Shadowmaster (thief 5-piece): backstabs strike for 3.2x instead of 2.4x
            let backMult = ally.hasSetPower() ? 3.2 : 2.4;
            if (back && tsig?.has('str_sig_nightstalker')) backMult += 0.7; // Night Stalker
            let d = back ? Math.round(dmg * backMult) : dmg;
            // Assassinate: a backstab finishes foes already near death
            if (back && tsig?.has('str_sig_assassinate') && m.healthRatio() < 0.25) d = m.health + 999;
            const died = m.takeDamage(d, time);
            this.floatDamage(m.x, m.y, d, crit || back);
            if (back) {
              this.floatPickup(m.x, m.y - 18, 'BACKSTAB!', '#8affa0');
              // Night Stalker refunds part of the recharge
              ally.backstabReadyAt = time + Math.round(ally.backstabCooldown() * (tsig?.has('str_sig_nightstalker') ? 0.6 : 1));
              if (!died) {
                if (tsig?.has('str_sig_venomblade')) m.applyStatus('poison', 6000, time, Math.max(4, Math.round(dmg * 0.12)));
                if (tsig?.has('str_sig_exposure')) m.applyStatus('vuln', 4000, time, 1.25);
                if (tsig?.has('str_sig_deathmark')) m.applyStatus('bleed', 5000, time, Math.max(4, Math.round(dmg * 0.14)));
                if (tsig?.has('str_sig_massacre')) {
                  for (const o of this.monsters) {
                    if (o === m || !o.active || !o.alive) continue;
                    if (Phaser.Math.Distance.Between(m.x, m.y, o.x, o.y) > 60) continue;
                    const sd = Math.round(dmg * 1.2);
                    if (o.takeDamage(sd, time)) this.onMonsterKilled(ally, o);
                    else this.floatDamage(o.x, o.y, sd, false);
                  }
                }
              }
              if (tsig?.has('str_sig_shadowdance')) ally.grantBuff(2500, time, { speed: 40 });
              if (tsig?.has('str_sig_ghost')) ally.grantIframes(time, 260);
            }
            // striking from stealth reveals you only to the foe you struck
            if (ally.classId === 'thief' && ally.sneaking && !died) {
              m.spottedUntil = time + 2500;
              m.spottedAlly = ally;
            }
            if (died) {
              // Umbral Return: slaying with a backstab drops you back into shadow
              if (back && tsig?.has('str_sig_umbral')) { ally.sneaking = true; ally.spottedUntil = 0; }
              this.onMonsterKilled(ally, m);
            } else this.applyHitEffects(ally, m, dir.x, dir.y, crit, time);
            if (ally.isPlayer) this.meleeImpact(ally, m, crit || back);
          }
        }
        for (const g of this.generators) {
          if (!g.alive) continue;
          if (this.inArc(ally.x, ally.y, g.x, g.y, dir, reach + 8)) g.takeDamage(dmg, time);
        }
        // co-op guest: report melee hits on the host's enemies for the host to apply
        if (this.coopGuest) {
          for (const [netId, ce] of this.coopEnemies) {
            if (this.inArc(ally.x, ally.y, ce.spr.x, ce.spr.y, dir, reach + 8)) {
              net.sendCoopHit(netId, dmg);
              this.floatDamage(ce.spr.x, ce.spr.y, dmg, crit);
            }
          }
        }
      }
      if (ally.consumeCast()) this.castMagic(ally, time);
      const shot = ally.consumeShot();
      if (shot) this.fireProjectile(ally, shot, time);
    }
  }

  private inArc(ax: number, ay: number, tx: number, ty: number, dir: { x: number; y: number }, range: number): boolean {
    const ddx = tx - ax;
    const ddy = ty - ay;
    if (ddx * ddx + ddy * ddy > range * range) return false;
    return ddx * dir.x + ddy * dir.y >= -6;
  }

  private castMagic(ally: Hero, time: number): void {
    // Archmage (arcanist 5-piece): the blast reaches 45% farther and always ignites.
    const archmage = ally.classId === 'arcanist' && ally.hasSetPower();
    const radius = archmage ? 78 : 54;
    const dmg = ally.magicDamage();
    const fx = this.add.sprite(ally.x, ally.y, 'fx-magic').setDepth(ally.y + 20).setScale((radius * 2) / 32);
    fx.play('fx-magic');
    fx.once('animationcomplete', () => fx.destroy());
    this.flashLight(ally.x, ally.y, archmage ? 0xc79bff : 0x9a6bff, radius + 70, 320, 1.2);
    for (const m of this.monsters) {
      if (!m.active || !m.alive) continue;
      if (Phaser.Math.Distance.Between(ally.x, ally.y, m.x, m.y) <= radius) {
        const died = m.takeDamage(dmg, time);
        this.floatDamage(m.x, m.y, dmg, false);
        if (died) this.onMonsterKilled(ally, m);
        else {
          const dx = m.x - ally.x;
          const dy = m.y - ally.y;
          const l = Math.hypot(dx, dy) || 1;
          m.knock((dx / l) * 90, (dy / l) * 90, time);
          m.applyStatus('chill', 1800, time); // magic blasts chill
          if (ally.stats.fire > 0 || archmage) m.applyStatus('burn', 1400, time);
        }
      }
    }
    for (const g of this.generators) {
      if (!g.alive) continue;
      if (Phaser.Math.Distance.Between(ally.x, ally.y, g.x, g.y) <= radius) g.takeDamage(dmg, time);
    }
  }

  /** Knockback + on-hit status from a melee/projectile strike. */
  private applyHitEffects(attacker: Hero, m: Monster, dirX: number, dirY: number, crit: boolean, time: number): void {
    // Tidebreaker Maul: blows land like a breaking wave — huge knock + chill
    const tide = attacker.hasUniquePower('tidebreaker');
    m.knock(dirX * (tide ? 380 : 150), dirY * (tide ? 380 : 150), time);
    if (tide) m.applyStatus('chill', 1800, time);
    if (attacker.stats.fire > 0 || attacker.hasUniquePower('sunfall')) m.applyStatus('burn', 1600, time);
    if (crit) m.applyStatus('shock', 1200, time);
    // Stormcaller Staff: criticals call lightning that arcs between foes
    if (crit && attacker.hasUniquePower('stormcaller')) {
      this.chainBolt(attacker, m, Math.round(attacker.attackDamage().dmg * 0.8), time, 2);
    }
    // Starved Rootling familiar: its lashing vines chill (slow) whatever it strikes.
    if ((attacker as Companion).arcaneType === 'rootling') m.applyStatus('chill', 1600, time);

    // ---- Class Ability Expansion: on-hit sigils ----
    const sig = this.heroSig(attacker);
    if (attacker.classId === 'druid' && !attacker.bearForm) {
      if (sig.has('dru_sig_mooncaller')) m.applyStatus('chill', 1800, time); // Mooncaller
      if (sig.has('dru_sig_lunar')) m.applyStatus('root', 900, time); // Lunar Tide
      if (sig.has('dru_sig_eclipse')) { this.spawnBeam(m.x, m.y - 64, m.x, m.y, 0xbfe0ff); m.applyStatus('shock', 1600, time); } // Eclipse moonbeam
    }
    if (attacker.classId === 'thief' && crit && sig.has('str_sig_deathmark')) {
      m.applyStatus('bleed', 4000, time, Math.max(4, Math.round(attacker.attackDamage().dmg * 0.12)));
    }
    // Necromancer servant soulfire / pestilence (read the summoner's chosen sigils)
    const summoner = (attacker as Companion).summoner;
    if (summoner && summoner.classId === 'necromancer') {
      const nsig = this.heroSig(summoner);
      if (nsig.has('nec_sig_soulflame')) { m.applyStatus('burn', 1500, time); m.applyStatus('chill', 1100, time); }
      if (nsig.has('nec_sig_pestilence')) m.applyStatus('poison', 4000, time, 5);
      if (nsig.has('nec_sig_unholy') && summoner.alive) summoner.heal(2); // servants drink the light
    }
  }

  /** Bark + golden flare when the Undying Bulwark refuses a killing blow. */
  private undyingProc(h: Hero): void {
    audio.sfx('levelup');
    this.showBark(`${h.def.name}'s Bulwark holds — death itself is refused!`, 3400, 'event', '#ffd24a');
    this.flashLight(h.x, h.y, 0xffd24a, 200, 750, 1.6);
    const fx = this.add.image(h.x, h.y - 6, 'fx-glow-warm').setBlendMode(Phaser.BlendModes.ADD).setScale(0.8).setDepth(h.y + 12).setTint(0xffd24a);
    this.tweens.add({ targets: fx, scale: 2.8, alpha: 0, duration: 640, onComplete: () => fx.destroy() });
  }

  /** Weighty melee feedback for the player: screen shake, crit zoom-punch, burst. */
  private meleeImpact(attacker: Hero, m: Monster, crit: boolean): void {
    const cam = this.cameras.main;
    cam.shake(crit ? 130 : 70, crit ? 0.006 : 0.0028);
    if (crit) {
      this.tweens.killTweensOf(cam);
      this.tweens.add({
        targets: cam, zoom: OPTIMAL_ZOOM * 1.06, duration: 70, yoyo: true, ease: 'Quad.easeOut',
        onComplete: () => cam.setZoom(OPTIMAL_ZOOM),
      });
    }
    const col = attacker.classId === 'vanguard' ? 0xeaf0ff : attacker.classId === 'warden' ? 0xffcf5a : 0xffffff;
    const burst = this.add.image(m.x, m.y, 'fx-glow-white').setTint(col).setBlendMode(Phaser.BlendModes.ADD).setScale(0.6).setDepth(m.y + 12);
    this.tweens.add({ targets: burst, scale: 1.9, alpha: 0, duration: 190, onComplete: () => burst.destroy() });
  }

  private fireProjectile(owner: Hero, dir: { x: number; y: number }, time: number): void {
    const skRole = owner instanceof Companion ? owner.skeletonRole : undefined;
    const arrow = owner.classId === 'thief' || skRole === 'archer';
    const tex = arrow ? 'fx-arrow' : 'fx-bolt';
    const speed = arrow ? 320 : 260;
    const spr = this.add
      .sprite(owner.x + dir.x * 12, owner.y + dir.y * 12, tex)
      .setDepth(owner.y + 6)
      .setScale(arrow ? 1 : 1.4);
    if (arrow) spr.setRotation(Math.atan2(dir.y, dir.x));
    if (skRole === 'mage') spr.setTint(0xb070ff);
    else if (owner.classId === 'necromancer') spr.setTint(0x70e8a0);
    else if (owner.classId === 'druid') spr.setTint(0x9aff6a);
    // weapon flourish: bow twang flash / arcane cast burst at the hands
    const boltTint = skRole === 'mage' ? 0xc080ff : owner.classId === 'necromancer' ? 0x70e8a0 : 0xb98cff;
    const flash = this.add
      .image(owner.x + dir.x * 10, owner.y + dir.y * 10 - 4, arrow ? 'fx-glow-white' : 'fx-glow-magic')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(arrow ? 0.5 : 0.75)
      .setDepth(owner.y + 7)
      .setTint(arrow ? 0xffffff : boltTint);
    this.tweens.add({ targets: flash, alpha: 0, scale: arrow ? 0.95 : 1.5, duration: 170, onComplete: () => flash.destroy() });
    const { dmg, crit } = owner.attackDamage();
    // Whisperwind Bow: shots pass through what they strike and keep flying
    const pierce = owner.hasUniquePower('whisperwind') ? 3 : 0;
    this.projectiles.push({ spr, vx: dir.x * speed, vy: dir.y * speed, dmg, crit, bornAt: time, ttl: arrow ? 850 : 600, owner, pierce, hit: pierce > 0 ? new Set() : undefined });
  }

  private updateProjectiles(time: number, delta: number): void {
    const dt = delta / 1000;
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.spr.x += p.vx * dt;
      p.spr.y += p.vy * dt;
      p.spr.setDepth(p.spr.y + 6);
      let dead = time - p.bornAt > p.ttl;
      if (!dead) {
        const tile = this.tileAt(p.spr.x, p.spr.y);
        if (tile === Tile.WALL || tile === Tile.VOID) dead = true;
      }
      if (!dead) {
        for (const m of this.monsters) {
          if (!m.active || !m.alive) continue;
          if (p.hit?.has(m)) continue; // a piercing shot never re-hits the same foe
          if (Phaser.Math.Distance.Between(p.spr.x, p.spr.y, m.x, m.y) <= 14) {
            const died = m.takeDamage(p.dmg, time);
            this.floatDamage(m.x, m.y, p.dmg, p.crit);
            if (died) this.onMonsterKilled(p.owner, m);
            else {
              const l = Math.hypot(p.vx, p.vy) || 1;
              this.applyHitEffects(p.owner, m, p.vx / l, p.vy / l, p.crit, time);
              const chains = p.owner.stats.spellChain ?? 0;
              if (chains > 0) this.chainBolt(p.owner, m, p.dmg, time, chains);
            }
            if ((p.pierce ?? 0) > 0) {
              p.pierce!--;
              p.hit?.add(m);
            } else {
              dead = true;
            }
            break;
          }
        }
      }
      if (!dead && this.coopGuest) {
        // co-op guest: ranged hits on the host's enemies route to the host
        for (const [netId, ce] of this.coopEnemies) {
          if (Phaser.Math.Distance.Between(p.spr.x, p.spr.y, ce.spr.x, ce.spr.y) <= 14) {
            net.sendCoopHit(netId, p.dmg);
            this.floatDamage(ce.spr.x, ce.spr.y, p.dmg, p.crit);
            dead = true;
            break;
          }
        }
      }
      if (!dead) {
        // arrows/bolts can also break the spawning altars
        for (const g of this.generators) {
          if (!g.alive) continue;
          if (Phaser.Math.Distance.Between(p.spr.x, p.spr.y, g.x, g.y) <= 16) {
            g.takeDamage(p.dmg, time);
            this.floatDamage(g.x, g.y, p.dmg, p.crit);
            dead = true;
            break;
          }
        }
      }
      if (dead) {
        p.spr.destroy();
        this.projectiles.splice(i, 1);
      }
    }
  }

  /** Scatter roaming wild monsters across a combat level, independent of altars.
   *  Count scales with level size and the 'Wild monsters' cheat (0 disables). */
  private spawnAmbientMonsters(): void {
    if (this.level.town || this.level.interior) return;
    const mult = settings.get('gameplay').wildMonsters ?? 1;
    if (mult <= 0) return;
    // draw from the enemy types this realm's altars use; else a sensible default
    const pool: EnemyId[] = [];
    for (const sp of this.level.spawns) if (sp.kind === 'generator' && sp.enemyId) pool.push(sp.enemyId);
    const types = pool.length ? Array.from(new Set(pool)) : (['grunt'] as EnemyId[]);
    const W = this.level.width;
    const H = this.level.height;
    const count = Math.min(60, Math.round((6 + (W * H) / 700) * mult));
    const sx = this.startTile?.x ?? Math.floor(W / 2);
    const sy = this.startTile?.y ?? Math.floor(H / 2);
    let placed = 0;
    let tries = 0;
    while (placed < count && tries < count * 14) {
      tries++;
      const tx = Phaser.Math.Between(2, W - 3);
      const ty = Phaser.Math.Between(2, H - 3);
      if (!this.isWalkable(tx, ty)) continue;
      if (Math.abs(tx - sx) < 6 && Math.abs(ty - sy) < 6) continue; // don't spawn on the party
      const c = this.tileCenter(tx, ty);
      this.makeMonster(c.x, c.y, types[Phaser.Math.Between(0, types.length - 1)]);
      placed++;
    }
  }

  /** Gold, drop-rate and grade-roll bonuses for the current map and party. */
  private lootScale(): LootScale {
    const size = this.partySize();
    if (this.level.arena) {
      return computeArenaLootScale(this.level.arenaLevel ?? this.partyLevel(), size);
    }
    const depth = Content.levelOrder.indexOf(this.level.id);
    if (depth >= 0) return computeRealmLootScale(depth, this.partyLevel(), size);
    return computeArenaLootScale(this.partyLevel(), size);
  }

  /** Average level of player-controlled heroes (falls back to start-level cheat). */
  private partyLevel(): number {
    const heroes = (this.allies.length ? this.allies : this.players).filter((a) => a.isPlayer);
    if (heroes.length) {
      return Math.round(heroes.reduce((sum, h) => sum + h.level, 0) / heroes.length);
    }
    const sl = settings.get('gameplay').startLevel;
    return sl > 1 ? sl : 1;
  }

  /** Heroes marching together (players + hired allies; summons don't count). */
  private partySize(): number {
    const roster = (this.allies.length ? this.allies : this.players).filter((a) => !(a as Companion).isSummon);
    return Math.max(1, roster.length);
  }

  /** Apply realm-depth and party-level scaling to one foe. */
  private applyMonsterScaling(m: Monster): void {
    if (m.scaleApplied || this.level.town || this.level.interior) return;
    if (this.level.arena) {
      const lvl = this.level.arenaLevel ?? this.partyLevel();
      const scale = computeArenaMonsterScale(lvl, this.partySize());
      m.maxHealth = Math.round(m.maxHealth * scale.hpMult);
      m.health = m.maxHealth;
      m.dmgMult *= scale.dmgMult;
      m.armorBonus = scale.armorBonus;
      m.scaleApplied = true;
      return;
    }
    const depth = Content.levelOrder.indexOf(this.level.id);
    if (depth < 0) return;
    const scale = computeRealmMonsterScale(depth, this.partyLevel(), this.partySize(), m.isBoss);
    m.maxHealth = Math.round(m.maxHealth * scale.hpMult);
    m.health = m.maxHealth;
    m.dmgMult *= scale.dmgMult;
    m.armorBonus = scale.armorBonus;
    m.scaleApplied = true;
  }

  /** Scale every foe and altar once the party exists (boss spawns earlier). */
  private applyRealmDifficulty(): void {
    if (this.level.town || this.level.interior) return;
    for (const m of this.monsters) this.applyMonsterScaling(m);
    const depth = Content.levelOrder.indexOf(this.level.id);
    if (depth < 0 || this.level.arena) return;
    const scale = computeRealmMonsterScale(depth, this.partyLevel(), this.partySize(), false);
    for (const g of this.generators) {
      g.maxHealth = Math.round(g.maxHealth * scale.hpMult);
      g.health = g.maxHealth;
    }
  }

  /** Create a monster with all combat callbacks wired (ranged/summon/nova). */
  private makeMonster(x: number, y: number, enemyId: EnemyId): Monster {
    const m = new Monster(this, x, y, enemyId);
    m.netId = this.nextNetId++;
    m.onRanged = (mm, ux, uy) => this.spawnEnemyShot(mm, ux, uy);
    m.onSummon = (mm) => this.summonAdds(mm);
    m.onNova = (mm, radius) => this.enemyNova(mm, radius);
    m.onPhase2 = (mm) => this.bossPhase2(mm);
    if (this.players.length > 0 || this.level.arena) this.applyMonsterScaling(m);
    this.monsters.push(m);
    this.monsterGroup.add(m);
    this.shadows.add(m, 4);
    return m;
  }

  /** Promote a monster to a champion: tougher, harder-hitting, gold sheen, guaranteed loot. */
  private eliteify(m: Monster): void {
    m.isElite = true;
    m.dmgMult = 1.4;
    m.maxHealth = Math.round(m.maxHealth * 2.3);
    m.health = m.maxHealth;
    m.setScale(m.scaleX * 1.35);
    const fx = this.add
      .image(m.x, m.y, 'fx-glow-warm')
      .setTint(0xffd24a)
      .setScale(2)
      .setAlpha(0.7)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(m.y - 1);
    this.tweens.add({ targets: fx, alpha: 0, scale: 3.2, duration: 520, onComplete: () => fx.destroy() });
  }

  private spawnEnemyShot(m: Monster, ux: number, uy: number): void {
    const speed = m.def.projectileSpeed ?? 200;
    const spr = this.add
      .sprite(m.x + ux * 14, m.y + uy * 12, 'fx-bolt')
      .setDepth(m.y + 6)
      .setScale(1.5)
      .setTint(0xff7a3a);
    this.enemyProjectiles.push({ spr, vx: ux * speed, vy: uy * speed, dmg: Math.round(m.def.damage * m.dmgMult), bornAt: this.time.now, ttl: 2400 });
  }

  private summonAdds(m: Monster): void {
    const id = m.def.summons;
    if (!id) return;
    const n = 2 + (Math.random() < 0.5 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      this.makeMonster(m.x + Math.cos(a) * 30, m.y + Math.sin(a) * 30, id);
    }
    const fx = this.add.sprite(m.x, m.y, 'fx-magic').setDepth(m.y + 20).setScale(2).setTint(0xb58aff);
    fx.play('fx-magic');
    fx.once('animationcomplete', () => fx.destroy());
    audio.sfx('portal');
    this.showBark(`${m.def.name} summons reinforcements!`);
  }

  private enemyNova(m: Monster, radius: number): void {
    const time = this.time.now;
    const dmg = Math.round(m.def.damage * 0.8 * m.dmgMult);
    for (const a of this.allies) {
      if (!a.alive) continue;
      if (Phaser.Math.Distance.Between(m.x, m.y, a.x, a.y) <= radius) {
        const dealt = a.takeDamage(dmg, time);
        this.floatDamage(a.x, a.y, dealt, false);
      }
    }
    const ring = this.add.sprite(m.x, m.y, 'fx-magic').setDepth(m.y + 20).setScale((radius * 2) / 32).setTint(0xff5a2a);
    ring.play('fx-magic');
    ring.once('animationcomplete', () => ring.destroy());
    audio.sfx('boss_roar');
  }

  private updateEnemyProjectiles(time: number, delta: number): void {
    const dt = delta / 1000;
    for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
      const p = this.enemyProjectiles[i];
      p.spr.x += p.vx * dt;
      p.spr.y += p.vy * dt;
      p.spr.setDepth(p.spr.y + 6);
      let dead = time - p.bornAt > p.ttl;
      if (!dead) {
        const tile = this.tileAt(p.spr.x, p.spr.y);
        if (tile === Tile.WALL || tile === Tile.VOID) dead = true;
      }
      if (!dead) {
        for (const a of this.allies) {
          if (!a.alive) continue;
          if (Phaser.Math.Distance.Between(p.spr.x, p.spr.y, a.x, a.y) <= 12) {
            const dealt = a.takeDamage(p.dmg, time);
            this.floatDamage(a.x, a.y, dealt, false);
            dead = true;
            break;
          }
        }
      }
      if (dead) {
        p.spr.destroy();
        this.enemyProjectiles.splice(i, 1);
      }
    }
  }

  private onMonsterKilled(killer: Hero, m: Monster, remoteKiller = false): void {
    // leave remains behind for the Necromancer's Corpse Explosion / Army of the Dead
    if (!m.isBoss) this.addCorpse(m.x, m.y);
    // ---- Class Ability Expansion: on-kill sigils (owner = summoner for pets) ----
    const now = this.time.now;
    const owner = (killer as Companion).summoner ?? killer;
    if (!remoteKiller && owner.alive) {
      if (owner.classId === 'arcanist' && m.isBurning(now) && this.heroSig(owner).has('arc_sig_meltdown')) {
        this.spawnBurst(m.x, m.y, 0xff7a2a, 2.0);
        this.aoeHit(owner, m.x, m.y, 70, Math.round(owner.magicDamage() * 0.9), now, 'burn', 40, 3000, Math.round(owner.magicDamage() * 0.15));
      }
      if (owner.classId === 'necromancer' && this.heroSig(owner).has('nec_sig_soulharvest')) {
        owner.heal(Math.round(owner.stats.maxHealth * 0.04));
        owner.restoreMana(6);
      }
    }
    const cheats = settings.get('gameplay');
    const mult = cheats.xpMultiplier;
    // Heartroot Plate: every kill mends the slayer (local killer only — guests aren't simulated here)
    if (!remoteKiller && killer.alive && killer.hasUniquePower('heartroot')) killer.heal(Math.max(2, Math.round(killer.stats.maxHealth * 0.04)));
    const goldMul = !remoteKiller && killer.hasUniquePower('midas') ? 1.4 : 1; // Midas Grips
    const ls = this.lootScale();
    const coop = MULTIPLAYER_ENABLED && net.connected && net.partySize > 1 && !this.level.town && net.isHost;
    if (coop) {
      // Shared, party-bonused XP + gold — everyone earns MORE than playing solo.
      const bonus = 1 + 0.2 * (net.partySize - 1);
      const xp = Math.round(m.def.xp * mult * bonus);
      const gold = cheats.goldMult > 0 ? Math.max(1, Math.round((2 + m.def.xp * 0.4) * cheats.goldMult * bonus * goldMul * ls.goldMult)) : 0;
      this.coopApplyReward(xp, gold);   // host's own party
      net.sendCoopReward(xp, gold);     // guests apply the same
      if (!remoteKiller) killer.addScore(m.def.xp);
    } else {
      killer.gainXP(Math.round(m.def.xp * mult));
      killer.addScore(m.def.xp);
      const roster = this.allies.filter((a) => !(a as Companion).isSummon);
      const others = roster.filter((a) => a !== killer && a.alive);
      const shareMult = GROUP_XP_SHARE * Math.max(0.35, 1 - Math.max(0, others.length - 1) * GROUP_XP_SHARE_DECAY);
      const share = Math.round(m.def.xp * shareMult * mult);
      if (share > 0) {
        for (const a of others) a.gainXP(share);
      }
      // gold coin drop (solo path; co-op gold is shared directly above)
      if (cheats.goldMult > 0) {
        const dropChance = m.isBoss ? 1 : Math.min(0.72, 0.45 * ls.dropMult);
        if (Math.random() < dropChance) {
          const total = Math.max(1, Math.round((2 + m.def.xp * (m.isBoss ? 0.5 : 0.4)) * cheats.goldMult * goldMul * ls.goldMult));
          const alive = this.players.filter((p) => p.alive);
          const each = Math.max(1, Math.floor(total / Math.max(1, alive.length)));
          alive.forEach((p, i) => this.spawnCoin(m.x + (i - (alive.length - 1) / 2) * 6, m.y + (m.isBoss ? 6 : 0), each));
        }
      }
    }
    // Item + scroll drops roll host-side / solo (cross-client item instancing is a follow-up).
    const rollLuck = (remoteKiller ? this.bestLuck() : (killer.stats.luck ?? 0)) + ls.luckBonus;
    if (m.isElite) {
      if (Math.random() < eliteDropChance(rollLuck) * cheats.lootMult * ls.dropMult) this.dropLoot(m.x, m.y, 'runed');
    } else if (!m.isBoss && Math.random() < monsterDropChance(rollLuck) * cheats.lootMult * ls.dropMult) {
      this.dropLoot(m.x, m.y, this.lootGradeFloor(m));
    }
    if (!m.isBoss && Math.random() < 0.022 * cheats.lootMult * ls.dropMult) {
      const sid = ['town_portal_scroll', 'scroll_mending', 'scroll_renewal'][Math.floor(Math.random() * 3)];
      const sc = Content.item(sid);
      if (sc) this.spawnLootPickup(m.x, m.y, sc);
    }
    if (m.isBoss) this.dropBossLoot(m);
    // notice-board contracts: bounty tallies + relics uncovered on realm kills
    for (const q of questLog.onKill(m.enemyId, this.level.id)) {
      if (q.done) {
        this.showBark(`Contract complete: ${q.title} — return to the notice board for your payout.`, 5200, 'event', '#8affa0');
        this.floatPickup(m.x, m.y - 26, 'contract complete!', '#8affa0');
      } else if (q.kind === 'gather') {
        this.floatPickup(m.x, m.y - 26, `relic secured  ${q.progress}/${q.need}`, '#8ad0ff');
      } else {
        this.floatPickup(m.x, m.y - 26, `bounty  ${q.progress}/${q.need}`, '#ff9a6a');
      }
    }
  }

  /** Every realm warden yields class-specific loot: a guaranteed Godforged class
   *  SET piece (weighted toward the party's classes) plus a strong themed drop —
   *  and the deeper/harder the realm, the better the odds of a BONUS set piece. */
  private dropBossLoot(m: Monster): void {
    const cheats = settings.get('gameplay');
    if (cheats.lootMult <= 0) return;
    const partyClasses = this.players.filter(Boolean).map((p) => p.classId);
    this.dropLoot(m.x - 16, m.y + 4, 'ascendant');
    this.spawnLootPickup(m.x + 16, m.y + 4, rollSetDrop(partyClasses));
    const depth = Math.max(0, Content.levelOrder.indexOf(this.level.id)); // 0..9
    const ls = this.lootScale();
    const diffBonus = cheats.difficulty === 'hard' ? 0.18 : cheats.difficulty === 'moderate' ? 0.09 : 0;
    const bonusChance = Math.min(0.92, (0.15 + depth * 0.07 + diffBonus) * ls.dropMult);
    if (Math.random() < bonusChance) this.spawnLootPickup(m.x, m.y - 14, rollSetDrop(partyClasses));
  }

  /** Apply a shared co-op reward to the local human player(s), with a popup. */
  private coopApplyReward(xp: number, gold: number): void {
    for (const a of this.players) if (a?.alive) a.gainXP(xp);
    const receivers = this.players.filter((p) => p?.alive);
    if (receivers.length === 0) return;
    if (gold > 0) {
      const each = Math.floor(gold / receivers.length);
      const rem = gold - each * receivers.length;
      receivers.forEach((p, i) => {
        p.inventory.gold += each + (i === 0 ? rem : 0);
      });
    }
    const anchor = receivers[0];
    this.floatPickup(anchor.x, anchor.y - 22, gold > 0 ? `+${xp} XP  +${gold}g split` : `+${xp} XP`, '#9affc0');
  }

  /** Drop a collectable coin pickup worth `amount` gold. */
  /** True when this client is the co-op enemy host on a combat map. */
  private coopHosting(): boolean {
    return MULTIPLAYER_ENABLED && net.connected && net.partySize > 1 && !this.level.town && net.isHost;
  }

  private spawnCoin(x: number, y: number, amount: number, fromNet = false): void {
    const spr = this.add.sprite(x, y, 'coin-sheet').play('coin').setDepth(y);
    this.floatBob(spr);
    this.pickups.push({ sprite: spr, kind: 'coin', value: amount });
    if (!fromNet && this.coopHosting()) net.sendCoopLoot({ x, y, coin: amount });
  }

  /** Highest luck among the living party — loot rolls use the party's best. */
  private bestLuck(): number {
    let best = 0;
    for (const a of this.allies) if (a.alive) best = Math.max(best, a.stats.luck ?? 0);
    return best;
  }

  /** Minimum gear grade for a foe kill, rising with realm depth. */
  private lootGradeFloor(m: Monster): Grade | undefined {
    const depth = Content.levelOrder.indexOf(this.level.id);
    if (depth >= 8) return 'runed';
    if (depth >= 5) return 'honed';
    if (m.def.xp >= 28) return 'honed';
    return undefined;
  }

  /** Mint a themed, graded item and drop it into the world as a pickup.
   *  A slice of successful drops upgrades into a class armor-set piece,
   *  weighted toward the classes actually in the party. */
  private dropLoot(x: number, y: number, floor?: Grade): void {
    const luck = this.bestLuck() + this.lootScale().luckBonus;
    // uniques are the rarest, most exciting roll — check them first
    if (Math.random() < uniqueDropChance(luck)) {
      this.spawnLootPickup(x, y, rollUniqueDrop());
      return;
    }
    if (Math.random() < setDropChance(luck)) {
      const partyClasses = this.players.filter(Boolean).map((p) => p.classId);
      this.spawnLootPickup(x, y, rollSetDrop(partyClasses));
      return;
    }
    const theme = this.level.theme ?? 'crypt';
    const item = rollDrop(theme, luck, floor ? { floor } : {});
    this.spawnLootPickup(x, y, item);
  }

  // ==== party loot rolls =====================================================
  /** Fine enough that a party rolls for it instead of everyone getting a copy. */
  private rollWorthy(item: ItemDefinition): boolean {
    return !!item.setId || !!item.unique || item.grade === 'ascendant' || item.grade === 'godforged';
  }

  /** Host-side: put a fine drop up for party rolls. True = pickup suppressed. */
  private maybeStartLootRoll(x: number, y: number, item: ItemDefinition): boolean {
    if (!MULTIPLAYER_ENABLED || !net.connected || net.partySize <= 1 || !net.isHost) return false;
    if (this.level.town || !this.rollWorthy(item)) return false;
    if (this.lootRolls.some((r) => r.item.id === item.id)) return false; // all-pass fallback re-drop
    const rollId = `${net.id}_${this.lootRollSeq++}`;
    const expect = new Set<string>([net.id]);
    for (const p of net.peers) if (!p.npc) expect.add(p.id);
    this.lootRolls.push({ rollId, item, origin: { x, y }, results: new Map(), resolved: false, hostExpect: expect });
    net.sendLootRoll(rollId, item);
    this.announceLootRoll(item);
    // the host referees: whoever hasn't answered in 30s passes by default
    this.time.delayedCall(30000, () => this.resolveLootRoll(rollId, true));
    return true;
  }

  /** Guest-side: the host put a drop up for rolls. */
  private onLootRollStarted(rollId: string, itemRaw: unknown): void {
    const item = itemRaw as ItemDefinition;
    if (!item || !item.id || this.lootRolls.some((r) => r.rollId === rollId)) return;
    Content.registerItem(item);
    this.lootRolls.push({ rollId, item, origin: { x: 0, y: 0 }, results: new Map(), resolved: false });
    this.announceLootRoll(item);
    // guests expire abandoned rolls locally (host gone, level changed...)
    this.time.delayedCall(45000, () => {
      const r = this.lootRolls.find((rr) => rr.rollId === rollId);
      if (r && !r.resolved) {
        r.resolved = true;
        this.updateLootRollBanner();
      }
    });
  }

  private announceLootRoll(item: ItemDefinition): void {
    audio.sfx('ui_select');
    this.showBark(`The party rolls for ${item.name}! Press L to throw your die.`, 5200, 'loot', '#ffd24a');
    this.updateLootRollBanner();
  }

  /** Throw my d20 for a roll (returns the value for the dice window). */
  private lootRollThrow(rollId: string): number {
    const r = this.lootRolls.find((rr) => rr.rollId === rollId);
    if (!r || r.resolved || r.myValue !== undefined) return r?.myValue ?? 0;
    const value = Phaser.Math.Between(1, 20);
    this.lootRollAnswer(r, value);
    return value;
  }

  private lootRollPass(rollId: string): void {
    const r = this.lootRolls.find((rr) => rr.rollId === rollId);
    if (!r || r.resolved || r.myValue !== undefined) return;
    this.lootRollAnswer(r, 0);
  }

  private lootRollAnswer(r: (typeof this.lootRolls)[number], value: number): void {
    r.myValue = value;
    const myName = this.players[0]?.def?.name ?? 'Adventurer';
    r.results.set(net.id || 'me', { name: myName, value });
    net.sendLootRollResult(r.rollId, value);
    this.updateLootRollBanner();
    this.lootRollUI.refresh(this.lootRollView(r));
    if (net.isHost) this.resolveLootRoll(r.rollId, false);
  }

  /** A party member's die landed (relayed level-wide). */
  private onLootRollResult(rollId: string, value: number, fromId: string, fromName: string): void {
    const r = this.lootRolls.find((rr) => rr.rollId === rollId);
    if (!r || r.resolved) return;
    r.results.set(fromId, { name: fromName, value });
    this.lootRollUI.refresh(this.lootRollView(r));
    if (net.isHost) this.resolveLootRoll(rollId, false);
  }

  /** Host: decide the roll once every answer is in (or the timer forces it). */
  private resolveLootRoll(rollId: string, force: boolean): void {
    const r = this.lootRolls.find((rr) => rr.rollId === rollId);
    if (!r || r.resolved || !r.hostExpect) return;
    if (!force) {
      for (const id of r.hostExpect) if (!r.results.has(id)) return; // still waiting
    }
    const entries = [...r.results.entries()].filter(([, e]) => e.value > 0);
    if (entries.length === 0) {
      // every die stayed in the cup — the prize falls to the floor for anyone
      r.resolved = true;
      this.updateLootRollBanner();
      this.showBark(`No one rolls for ${r.item.name} — it falls to the floor.`, 4200, 'loot');
      this.spawnLootPickup(r.origin.x, r.origin.y, r.item);
      net.sendLootRollWinner(r.rollId, '', '', 0, r.item);
      return;
    }
    const top = Math.max(...entries.map(([, e]) => e.value));
    const tied = entries.filter(([, e]) => e.value === top);
    const [winnerId, winner] = tied[Math.floor(Math.random() * tied.length)];
    net.sendLootRollWinner(r.rollId, winnerId, winner.name, top, r.item);
    this.applyLootRollWinner(r.rollId, winnerId, winner.name, top, r.item);
  }

  /** Everyone: the host announced the outcome. */
  private applyLootRollWinner(rollId: string, winnerId: string, winnerName: string, value: number, itemRaw: unknown): void {
    const item = (itemRaw as ItemDefinition) ?? this.lootRolls.find((rr) => rr.rollId === rollId)?.item;
    const r = this.lootRolls.find((rr) => rr.rollId === rollId);
    if (r) {
      if (r.resolved && winnerId === '') return; // host's own all-pass echo
      r.resolved = true;
      r.winnerName = winnerName;
      r.winnerValue = value;
      this.lootRollUI.refresh(this.lootRollView(r));
    }
    this.updateLootRollBanner();
    if (!item || !winnerId) {
      if (winnerId === '' && !net.isHost && item) {
        // all passed: the host dropped it to the floor and shares the instance
        this.showBark(`No one rolls for ${item.name} — it lies where it fell.`, 4200, 'loot');
      }
      return;
    }
    if (winnerId === net.id) {
      Content.registerItem(item);
      const p = this.players[0];
      if (p) {
        p.inventory.add(item);
        p.refreshStats();
        this.floatPickup(p.x, p.y - 22, `${item.name} — yours!`, '#8affa0');
      }
      audio.sfx('levelup');
      this.showBark(`Your ${value} takes it — ${item.name} is YOURS!`, 5200, 'loot', '#8affa0');
      this.syncHudData();
    } else {
      this.showBark(`${winnerName} wins ${item.name} with a ${value}.`, 4600, 'loot');
    }
  }

  private lootRollView(r: (typeof this.lootRolls)[number]): LootRollView {
    const results: RollEntry[] = [...r.results.values()].sort((a, b) => b.value - a.value);
    return { rollId: r.rollId, item: r.item, myValue: r.myValue, results, winnerName: r.winnerName, winnerValue: r.winnerValue };
  }

  /** Open the dice window for the oldest roll still awaiting my answer. */
  private openPendingLootRoll(): void {
    if (this.input2.capturing || this.gameOverUI.isOpen()) return;
    const r = this.lootRolls.find((rr) => !rr.resolved && rr.myValue === undefined);
    if (!r) return;
    this.closeAllOverlays();
    this.lootRollUI.open(this.lootRollView(r), {
      onRoll: (id) => this.lootRollThrow(id),
      onPass: (id) => this.lootRollPass(id),
      onClosed: () => this.updateLootRollBanner(),
    });
  }

  /** A clickable "press L to roll" banner while a roll awaits my answer. */
  private updateLootRollBanner(): void {
    const pending = this.lootRolls.find((rr) => !rr.resolved && rr.myValue === undefined);
    if (!pending) {
      this.lootRollBanner?.destroy();
      this.lootRollBanner = null;
      return;
    }
    if (this.lootRollBanner) this.lootRollBanner.destroy();
    const cont = this.add.container(PLAY_AREA_WIDTH / 2, 58).setDepth(DEPTH.OVERLAY + 4).setScrollFactor(0);
    const w = 340;
    const g = this.add.graphics().setScrollFactor(0);
    g.fillStyle(0x0d1322, 0.94);
    g.fillRoundedRect(-w / 2, -16, w, 32, 8);
    g.lineStyle(2, 0xffd24a, 0.95);
    g.strokeRoundedRect(-w / 2, -16, w, 32, 8);
    cont.add(g);
    const txt = this.add
      .text(0, 0, `⚄ Roll for ${pending.item.name} — press L`, { fontFamily: 'MedievalSharp, "Trebuchet MS", cursive', fontSize: '12px', color: '#ffe9a8', fontStyle: 'bold' })
      .setOrigin(0.5)
      .setScrollFactor(0);
    cont.add(txt);
    const z = this.add.zone(0, 0, w, 32).setScrollFactor(0).setInteractive({ useHandCursor: true });
    z.on('pointerdown', () => this.openPendingLootRoll());
    cont.add(z);
    this.tweens.add({ targets: cont, y: 62, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.lootRollBanner = cont;
  }

  private spawnLootPickup(x: number, y: number, item: ItemDefinition, fromNet = false): void {
    // in a party, fine drops go up for rolls instead of raining copies
    if (!fromNet && this.maybeStartLootRoll(x, y, item)) return;
    // class set pieces present in BRIGHT GREEN, uniques in BURNT ORANGE
    // everywhere (drop beam, float text, log line) so they read instantly.
    const color = item.unique ? UNIQUE_COLOR : item.setId ? SET_COLOR : item.grade ? GRADES[item.grade].color : '#ffe9a8';
    const tint = Phaser.Display.Color.HexStringToColor(color).color;
    // 0..4 rarity tier drives how loud the marker is (set pieces = top tier)
    const tier = item.setId ? 4 : item.grade ? GRADE_ORDER.indexOf(item.grade) : 1;
    const spr = this.add.image(x, y, item.icon).setDepth(y);
    const glow = this.add
      .image(x, y, 'fx-glow-warm')
      .setScale(2.1)
      .setAlpha(0.5)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(y - 1)
      .setTint(tint);
    this.tweens.add({ targets: glow, alpha: { from: 0.5, to: 0.3 }, scale: { from: 2.1, to: 1.7 }, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    // ground ring — a flattened pulse under the item so drops read as a marked
    // spot on the floor even when the beam is behind scenery.
    const ring = this.add
      .image(x, y + 4, 'fx-glow-white')
      .setTint(tint)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(y - 3)
      .setAlpha(0.45)
      .setScale(1.7, 0.55);
    this.tweens.add({ targets: ring, alpha: { from: 0.45, to: 0.7 }, scaleX: { from: 1.7, to: 2.1 }, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    // rarity beam — a tall coloured light shaft with a white-hot core, so good
    // drops read instantly from across the room. Height grows with rarity.
    const beamH = 3.4 + tier * 0.6;
    const beam = this.add
      .image(x, y - 24, 'fx-glow-white')
      .setTint(tint)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(y - 2)
      .setAlpha(0.55)
      .setScale(1.1, beamH);
    this.tweens.add({ targets: beam, alpha: { from: 0.55, to: 0.85 }, scaleX: { from: 1.1, to: 1.35 }, duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const core = this.add
      .image(x, y - 24, 'fx-glow-white')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(y - 2)
      .setAlpha(0.5)
      .setScale(0.45, beamH * 0.9);
    this.tweens.add({ targets: core, alpha: { from: 0.5, to: 0.75 }, duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const halo = this.add
      .image(x, y - 30, 'fx-glow-white')
      .setTint(tint)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(y - 2)
      .setAlpha(0.3)
      .setScale(1.5);
    this.tweens.add({ targets: halo, alpha: { from: 0.3, to: 0.14 }, scale: { from: 1.3, to: 1.9 }, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    // rising rarity-coloured sparkles — denser the better the drop
    const sparks = this.add.particles(x, y - 2, 'fx-glow-white', {
      x: { min: -7, max: 7 },
      speedY: { min: -34, max: -16 },
      speedX: { min: -4, max: 4 },
      lifespan: 1000,
      frequency: 340 - tier * 55,
      quantity: 1,
      scale: { start: 0.32, end: 0 },
      alpha: { start: 0.9, end: 0 },
      tint,
      blendMode: 'ADD',
    });
    sparks.setDepth(y + 1);
    spr.once('destroy', () => {
      glow.destroy();
      ring.destroy();
      beam.destroy();
      core.destroy();
      halo.destroy();
      sparks.destroy();
    });
    // strong drops cast real light in enhanced mode (removed on pickup)
    if (this.lightingOn && (item.setId || item.grade === 'godforged' || item.grade === 'ascendant')) {
      const lp = this.lights.addLight(x, y, 110 + tier * 15, tint, 0.9);
      spr.once('destroy', () => this.lights.removeLight(lp));
    }
    // little pop so a fresh drop reads as "new"
    spr.setScale(0);
    this.tweens.add({ targets: spr, scale: 1, duration: 240, ease: 'Back.easeOut', onComplete: () => this.floatBob(spr) });
    this.pickups.push({ sprite: spr, kind: 'item', value: 0, itemId: item.id });
    this.floatPickup(x, y - 8, item.name, color);
    if (!fromNet && this.coopHosting()) net.sendCoopLoot({ x, y, item });
  }

  /** Guest: spawn a host-shared loot drop locally (its own instance). */
  private coopApplyLoot(loot: CoopLoot): void {
    if (typeof loot.coin === 'number') {
      this.spawnCoin(loot.x, loot.y, loot.coin, true);
    } else if (loot.item) {
      const item = loot.item as ItemDefinition;
      Content.registerItem(item); // resolve it by id when picked up
      this.spawnLootPickup(loot.x, loot.y, item, true);
    }
  }

  /** Resolve a dashboard grant token into a real item (static id, gear roll, set, unique…). */
  private resolveAdminItem(itemId: string, hero: Hero): ItemDefinition | undefined {
    if (itemId === 'gear' || itemId.startsWith('gear:')) {
      const floor = (itemId.split(':')[1] as Grade | undefined) ?? 'honed';
      const grade = GRADE_ORDER.includes(floor as Grade) ? (floor as Grade) : 'honed';
      return rollDrop(this.level.theme ?? 'crypt', hero.stats.luck ?? 0, { floor: grade });
    }
    if (itemId.startsWith('unique:')) {
      const uid = itemId.slice(7);
      const def = UNIQUES.find((u) => u.id === uid);
      return def ? mintUnique(def) : undefined;
    }
    if (itemId.startsWith('set:')) {
      const [, classId, slot] = itemId.split(':');
      if (classId in ARMOR_SETS && SET_PIECE_SLOTS.includes(slot as SetPieceSlot)) {
        return mintSetPiece(classId as HeroClassId, slot as SetPieceSlot);
      }
      return undefined;
    }
    if (itemId.startsWith('theme:')) {
      const [, baseId, gradeRaw] = itemId.split(':');
      const base = ALL_THEME_BASES.find((b) => b.id === baseId);
      const grade = GRADE_ORDER.includes(gradeRaw as Grade) ? (gradeRaw as Grade) : 'honed';
      return base ? mintItem(base, grade) : undefined;
    }
    return Content.item(itemId);
  }

  /** Admin starter bundle for new players testing on a hosted server. */
  private grantStarterKit(hero: Hero): void {
    hero.inventory.gold += 400;
    this.floatPickup(hero.x, hero.y - 22, '+400g', '#ffae42');
    const ids = [
      'health_potion', 'health_potion', 'mana_potion', 'mana_potion',
      'iron_sword', 'leather_jerkin', 'town_portal_scroll',
    ];
    for (const id of ids) {
      const def = Content.item(id);
      if (def) hero.inventory.add({ ...def });
    }
    hero.inventory.addKey(3);
    hero.refreshStats();
    this.floatPickup(hero.x, hero.y - 34, 'Starter Kit!', '#5fe06a');
  }

  /** Apply an admin grant (gold / item id / "gear") from the dashboard. */
  private applyAdminGrant(gold: number, itemId?: string): void {
    const p = this.leader() ?? this.players.find((h) => h.alive) ?? this.players[0];
    if (!p) return;
    if (itemId === 'kit:starter') {
      this.grantStarterKit(p);
      this.showBark('A starter kit arrives from the Server Admin.', 2800, 'event', '#5fe06a');
      this.syncHudData();
      return;
    }
    if (gold > 0) {
      p.inventory.gold += gold;
      this.floatPickup(p.x, p.y - 22, `+${gold}g`, '#ffae42');
    }
    if (itemId) {
      const item = this.resolveAdminItem(itemId, p);
      if (item) {
        if (item.id === 'dungeon_key') {
          p.inventory.addKey(1);
        } else {
          p.inventory.add(item);
        }
        this.floatPickup(p.x, p.y - 22, item.name, '#ffae42');
      }
    }
    this.showBark('A gift arrives from the Server Admin.', 2600, 'event', '#ffae42');
    this.syncHudData();
  }

  private onBossDeath(): void {
    this.bossAlive = false;
    const bossName = this.boss?.def.name ?? 'The warden';
    this.showBark(`${bossName} falls! The exit awakens.`, 3400, 'combat');
    this.dmSetPiece(aiService.generateVictory(this.level.name, this.players[0]?.classId));
    audio.sfx('victory');
    this.cameras.main.shake(360, 0.012);
    // The realm's warden always yields a guaranteed, high-grade themed reward.
    if (this.boss) this.dropLoot(this.boss.x, this.boss.y, 'runed');
  }

  private floatDamage(x: number, y: number, amount: number, crit: boolean): void {
    // Arcade-style hit number: pops in with an overshoot, colour-tiers by size,
    // crits land BIG, tilted and gold with a warm glow + a punchy "!".
    const big = !crit && amount >= 30;
    let color = '#ffffff';
    if (crit) color = '#ffe23a';
    else if (amount >= 30) color = '#ff7a1e';
    else if (amount >= 15) color = '#ffd24a';
    const size = crit ? 30 : big ? 23 : 16;
    const jitterX = Phaser.Math.Between(-6, 6);
    const t = this.add
      .text(x + jitterX, y - 12, crit ? `${amount}!` : `${amount}`, {
        fontFamily: 'Cinzel, Georgia, serif',
        fontSize: `${size}px`,
        color,
        fontStyle: 'bold',
        stroke: '#1a0a00',
        strokeThickness: crit ? 6 : 4,
      })
      .setOrigin(0.5)
      .setDepth(y + 50)
      .setScale(0.4);
    t.setShadow(0, 3, crit ? '#7a2200' : '#000000', crit ? 6 : 4, true, true);
    if (crit) t.setAngle(Phaser.Math.Between(-9, 9));
    // pop -> overshoot -> settle -> rise + fade
    this.tweens.add({ targets: t, scale: crit ? 1.4 : 1.18, duration: 130, ease: 'Back.easeOut' });
    this.tweens.add({ targets: t, scale: 1, delay: 130, duration: 110, ease: 'Quad.easeOut' });
    this.tweens.add({
      targets: t,
      y: y - (crit ? 48 : 34),
      alpha: 0,
      delay: crit ? 380 : 240,
      duration: crit ? 640 : 480,
      ease: 'Quad.easeIn',
      onComplete: () => t.destroy(),
    });
  }

  private floatPickup(x: number, y: number, text: string, color: string): void {
    const t = this.add
      .text(x, y - 12, text, {
        fontFamily: 'Cinzel, Georgia, serif',
        fontSize: '13px',
        color,
        fontStyle: 'bold',
        align: 'center',
        stroke: '#000',
        strokeThickness: 4,
      })
      .setOrigin(0.5, 1)
      .setDepth(y + 40)
      .setScale(0.5);
    t.setShadow(0, 2, '#000000', 3, true, true);
    this.tweens.add({ targets: t, scale: 1.12, duration: 150, ease: 'Back.easeOut' });
    this.tweens.add({ targets: t, scale: 1, delay: 150, duration: 100, ease: 'Quad.easeOut' });
    this.tweens.add({ targets: t, y: y - 46, alpha: 0, delay: 280, duration: 1000, ease: 'Quad.easeOut', onComplete: () => t.destroy() });
  }

  private tileAt(x: number, y: number): number {
    const tx = Math.floor(x / TILE_SIZE);
    const ty = Math.floor(y / TILE_SIZE);
    if (ty < 0 || ty >= this.level.height || tx < 0 || tx >= this.level.width) return Tile.VOID;
    return this.level.tiles[ty][tx];
  }

  /** Tiles under the ally's feet — samples the physics body's bottom row so
   *  hazards register when the sprite anchor sits above the molten tile. */
  private footingTiles(ally: Hero): number[] {
    const body = ally.body as Phaser.Physics.Arcade.Body | null;
    if (!body) {
      const footY = ally.y + ally.displayHeight * (1 - ally.originY);
      return [this.tileAt(ally.x, footY)];
    }
    const footY = body.bottom - 0.5;
    const leftTx = Math.floor(body.left / TILE_SIZE);
    const rightTx = Math.floor(body.right / TILE_SIZE);
    const tiles: number[] = [];
    for (let tx = leftTx; tx <= rightTx; tx++) tiles.push(this.tileAt(tx * TILE_SIZE + TILE_SIZE / 2, footY));
    return tiles;
  }

  private handleHazards(time: number): void {
    for (const ally of this.allies) {
      if (!ally.alive) continue;
      const tiles = this.footingTiles(ally);
      const tile = tiles[0];

      // --- footing (speed + slip) — any foot tile on a hazard counts ---
      ally.slip = 0;
      if (tiles.some((t) => t === Tile.WATER)) ally.speedMult = WATER_SPEED_MULT;
      else if (tiles.some((t) => t === Tile.POISON)) ally.speedMult = POISON_SPEED_MULT;
      else if (tiles.some((t) => t === Tile.ICE)) {
        ally.speedMult = ICE_SPEED_MULT;
        ally.slip = ICE_SLIP;
      } else ally.speedMult = 1;

      // --- damage-over-time hazards & traps ---
      const dmgTile = tiles.find((t) => t === Tile.LAVA || t === Tile.POISON || t === Tile.SPIKES);
      if (dmgTile !== undefined) {
        const cadence = dmgTile === Tile.SPIKES ? SPIKE_TICK_MS : 500;
        const next = this.lavaTick.get(ally) ?? 0;
        if (time >= next) {
          this.lavaTick.set(ally, time + cadence);
          const raw =
            dmgTile === Tile.SPIKES ? SPIKE_DAMAGE : (dmgTile === Tile.POISON ? POISON_DPS : LAVA_DPS) * 0.5;
          const dealt = ally.takeEnvironmentalDamage(raw);
          if (dealt > 0) this.floatDamage(ally.x, ally.y, dealt, false);
        }
      } else {
        this.lavaTick.delete(ally);
      }
    }
  }

  private handlePickups(): void {
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      const collector = this.players.find((pl) => pl.alive && Phaser.Math.Distance.Between(pl.x, pl.y, p.sprite.x, p.sprite.y) < 16);
      if (!collector) continue;
      if (p.kind === 'coin') {
        collector.inventory.addGold(p.value);
        collector.addScore(p.value);
        audio.sfx('coin');
        this.floatPickup(p.sprite.x, p.sprite.y, `+${p.value} gold`, '#ffd24a');
      } else if (p.kind === 'food') {
        collector.heal(p.value);
        audio.sfx('coin');
        this.floatPickup(p.sprite.x, p.sprite.y, `Crypt Ration  +${p.value} HP`, '#7dffa0');
      } else if (p.kind === 'potion' && p.itemId) {
        const item = Content.item(p.itemId);
        if (item) collector.inventory.add(item);
        audio.sfx('coin');
        this.floatPickup(p.sprite.x, p.sprite.y, item ? describeItem(item) : 'Potion', '#ff9ad0');
      } else if (p.kind === 'item' && p.itemId) {
        const item = Content.item(p.itemId);
        if (item) {
          collector.inventory.add(item);
          collector.refreshStats();
          if (item.setId) {
            // class set piece: bright green line + live set progress
            const set = Object.values(ARMOR_SETS).find((s) => s.id === item.setId);
            const owned = collector.setPieces;
            const forMe = set?.classId === collector.classId;
            this.showBark(`SET PIECE — ${item.name}${set && forMe ? `  (${set.name} ${owned}/5)` : set ? `  (${set.name})` : ''}`, 4200, 'loot', SET_COLOR);
            this.floatPickup(p.sprite.x, p.sprite.y, item.name, SET_COLOR);
            if (forMe && owned >= 5 && set) {
              audio.sfx('levelup');
              this.showBark(`${set.name} COMPLETE — ${set.powerName} awakens: ${set.powerDesc}`, 6000, 'event', SET_COLOR);
              this.flashLight(collector.x, collector.y, 0x39ff6a, 210, 900, 1.5);
              const fx = this.add.sprite(collector.x, collector.y, 'fx-levelup').setDepth(collector.y + 10).setTint(0x8affa0);
              fx.play('fx-levelup');
              fx.once('animationcomplete', () => fx.destroy());
            }
          } else {
            const col = item.grade ? GRADES[item.grade].color : '#ffe9a8';
            this.showBark(`Picked up ${describeItem(item)}`, 3400, 'loot');
            this.floatPickup(p.sprite.x, p.sprite.y, item.name, col);
          }
        }
        audio.sfx('chest');
      } else if (p.kind === 'key') {
        collector.inventory.addKey(p.value);
        audio.sfx('key');
        this.showBark('A rusted key - a door waits somewhere.');
        this.floatPickup(p.sprite.x, p.sprite.y, 'Rusted Key', '#ffe07a');
      }
      if (p.id !== undefined) this.collectedIds.add(p.id);
      const spr = p.sprite;
      this.tweens.add({ targets: spr, y: spr.y - 12, alpha: 0, duration: 240, onComplete: () => spr.destroy() });
      this.pickups.splice(i, 1);
    }
  }

  private handleAutoInteractions(): void {
    for (const d of this.lockedDoors) {
      if (d.open) continue;
      const c = this.tileCenter(d.x, d.y);
      const opener = this.players.find((p) => p.alive && p.inventory.keyCount() > 0 && Phaser.Math.Distance.Between(p.x, p.y, c.x, c.y) < 26);
      if (opener && opener.inventory.useKey()) {
        this.openDoorCluster(d);
        audio.sfx('door');
        this.showBark('The locked door grinds open.');
      }
    }
  }

  /** Open a locked door and every locked door orthogonally connected to it, so a
   *  single key opens a full multi-tile gate (corridors are now 3 wide). */
  private openDoorCluster(start: LockedDoor): void {
    const stack: LockedDoor[] = [start];
    const seen = new Set<LockedDoor>([start]);
    while (stack.length) {
      const d = stack.pop()!;
      if (!d.open) {
        d.open = true;
        const body = d.rect.body as Phaser.Physics.Arcade.StaticBody | null;
        if (body) body.enable = false;
        this.level.tiles[d.y][d.x] = Tile.FLOOR;
        this.tweens.add({ targets: d.sprite, alpha: 0, duration: 250, onComplete: () => d.sprite.destroy() });
      }
      for (const o of this.lockedDoors) {
        if (seen.has(o) || o.open) continue;
        if (Math.abs(o.x - d.x) + Math.abs(o.y - d.y) === 1) {
          seen.add(o);
          stack.push(o);
        }
      }
    }
  }

  // ------------------------------------------------------------- town-square hub
  private unlockedRealms(): number {
    return (this.registry.get('unlockedRealms') as number) ?? 1;
  }

  private spawnTownLife(): void {
    if (!this.level.town || this.level.interior) return;
    const W = this.level.width;
    const H = this.level.height;
    const randPoint = (): { x: number; y: number } => {
      for (let i = 0; i < 12; i++) {
        const tx = Phaser.Math.Between(8, W - 9);
        const ty = Phaser.Math.Between(8, H - 9);
        if (this.isWalkable(tx, ty)) return this.tileCenter(tx, ty);
      }
      return this.tileCenter(Math.floor(W / 2), Math.floor(H / 2));
    };
    const wander = (s: Phaser.GameObjects.Sprite, speed: number, fly: boolean): void => {
      const step = (): void => {
        if (!s.active) return;
        const dest = randPoint();
        const dist = Phaser.Math.Distance.Between(s.x, s.y, dest.x, dest.y) || 1;
        s.setFlipX(dest.x < s.x);
        this.tweens.add({
          targets: s,
          x: dest.x,
          y: dest.y,
          duration: Math.max(700, (dist / speed) * 1000),
          ease: 'Sine.easeInOut',
          onUpdate: () => {
            if (!fly) s.setDepth(s.y);
          },
          onComplete: () => {
            if (s.active) this.time.delayedCall(fly ? 200 + Math.random() * 600 : 500 + Math.random() * 1600, step);
          },
        });
      };
      step();
    };
    for (let i = 0; i < 6; i++) {
      const p = randPoint();
      const b = this.add.sprite(p.x, p.y, 'town-butterfly').setDepth(5000).setScale(0.4 + Math.random() * 0.2);
      this.tweens.add({ targets: b, scaleX: { from: b.scaleX, to: b.scaleX * 0.4 }, duration: 150 + Math.random() * 120, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      wander(b, 26 + Math.random() * 18, true);
      this.townLife.push(b);
    }
    for (let i = 0; i < 4; i++) {
      const p = randPoint();
      const bird = this.add.sprite(p.x, p.y, 'town-bird').setDepth(5001).setScale(0.45 + Math.random() * 0.15);
      this.tweens.add({ targets: bird, y: bird.y - 3, duration: 220 + Math.random() * 160, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      wander(bird, 60 + Math.random() * 30, true);
      this.townLife.push(bird);
    }
    const dp = randPoint();
    const dog = this.add.sprite(dp.x, dp.y, 'town-dog').setDepth(dp.y).setScale(1.1);
    wander(dog, 34, false);
    this.townLife.push(dog);
  }

  /** Wandering wildlife for the surface overworld (peaceful; no monster AI). */
  private spawnOverworldLife(): void {
    if (!this.level.overworld) return;
    const W = this.level.width;
    const H = this.level.height;
    const randPoint = (): { x: number; y: number } => {
      for (let i = 0; i < 16; i++) {
        const tx = Phaser.Math.Between(4, W - 5);
        const ty = Phaser.Math.Between(4, H - 5);
        if (this.isWalkable(tx, ty)) return this.tileCenter(tx, ty);
      }
      return this.tileCenter(Math.floor(W / 2), Math.floor(H / 2));
    };
    const wander = (s: Phaser.GameObjects.Sprite, speed: number, fly: boolean): void => {
      const step = (): void => {
        if (!s.active) return;
        const dest = randPoint();
        const dist = Phaser.Math.Distance.Between(s.x, s.y, dest.x, dest.y) || 1;
        s.setFlipX(dest.x < s.x);
        this.tweens.add({
          targets: s,
          x: dest.x,
          y: dest.y,
          duration: Math.max(900, (dist / speed) * 1000),
          ease: 'Sine.easeInOut',
          onUpdate: () => { if (!fly) s.setDepth(s.y); },
          onComplete: () => {
            if (s.active) this.time.delayedCall(fly ? 300 + Math.random() * 900 : 800 + Math.random() * 2400, step);
          },
        });
      };
      step();
    };
    const herd: [string, number, number, number, boolean][] = [
      ['critter-deer', 5, 1.2, 42, false],
      ['critter-rabbit', 8, 1.0, 34, false],
      ['critter-fox', 3, 1.0, 46, false],
      ['critter-frog', 6, 0.9, 22, false],
      ['critter-boar', 3, 1.2, 30, false],
      ['critter-crow', 6, 0.9, 64, true],
    ];
    for (const [k, count, scale, speed, fly] of herd) {
      for (let i = 0; i < count; i++) {
        const p = randPoint();
        const s = this.add.sprite(p.x, p.y, k).setScale(scale).setDepth(fly ? 5002 : p.y);
        if (fly) this.tweens.add({ targets: s, y: s.y - 3, duration: 240 + Math.random() * 180, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        wander(s, speed + Math.random() * 16, fly);
        this.townLife.push(s);
      }
    }
  }

  /** Link to the standalone game server (single + multiplayer both connect). */
  private connectToServer(): void {
    if (!MULTIPLAYER_ENABLED) return;
    const p0 = this.players[0];
    net.onAnnounce = (text) => { if (text) this.showBark(`Server Admin: ${text}`, 5200, 'event', '#ffae42'); };
    net.onGrant = (gold, itemId) => this.applyAdminGrant(gold, itemId);
    net.onConnect = (cfg) =>
      this.showBark(cfg.motd ? `Connected to server — ${cfg.motd}` : 'Connected to the game server.', 3200, 'system');
    net.onCoopState = (enemies) => this.coopApplyState(enemies);
    net.onCoopHit = (netId, dmg, from) => this.coopApplyHit(netId, dmg, from);
    net.onCoopReward = (xp, gold) => this.coopApplyReward(xp, gold);
    net.onCoopLoot = (loot) => this.coopApplyLoot(loot);
    // ---- player-to-player trading ----
    net.onTradeRequest = (fromId, fromName) => {
      if (this.tradeUI.isOpen()) {
        net.sendTradeCancel(fromId); // already mid-trade — wave them off
        return;
      }
      const me = this.players.find((p) => p?.alive) ?? this.players[0];
      if (!me) return;
      this.closeAllOverlays();
      this.showBark(`${fromName} opens a trade with you.`, 3200, 'event', '#8ad0ff');
      this.tradeUI.open(me, fromId, fromName, {
        onComplete: () => { this.showBark('The trade is struck — fair dealing!', 3200, 'loot', '#8affa0'); this.syncHudData(); },
        onClosed: () => this.syncHudData(),
      });
    };
    net.onTradeUpdate = (fromId, items, gold) => this.tradeUI.remoteUpdate(fromId, items as ItemDefinition[], gold);
    net.onTradeAccept = (fromId) => this.tradeUI.remoteAccept(fromId);
    net.onTradeCancel = (fromId) => {
      if (this.tradeUI.isOpen() && this.tradeUI.currentPartner() === fromId) {
        this.showBark('The trade is called off.', 2600, 'system');
        this.tradeUI.remoteCancel(fromId);
      }
    };
    // ---- party loot rolls ----
    net.onLootRoll = (rollId, item) => this.onLootRollStarted(rollId, item);
    net.onLootRollResult = (rollId, value, fromId, fromName) => this.onLootRollResult(rollId, value, fromId, fromName);
    net.onLootRollWinner = (rollId, winnerId, winnerName, value, item) => this.applyLootRollWinner(rollId, winnerId, winnerName, value, item);
    net.connect(getServerUrl(), {
      name: p0?.def?.name ?? 'Adventurer',
      classId: p0?.classId ?? 'vanguard',
      level: p0?.level ?? 1,
      x: p0?.x ?? 0,
      y: p0?.y ?? 0,
      hp: p0 ? Math.round(p0.health) : 0,
      levelId: this.level.id,
    });
  }

  /** Push the local hero's state to the server and mirror other players. */
  private syncNet(): void {
    if (!MULTIPLAYER_ENABLED) return;
    const p0 = this.players[0];
    if (p0?.alive) {
      net.update({ x: p0.x, y: p0.y, classId: p0.classId, level: p0.level, hp: Math.round(p0.health), levelId: this.level.id });
    }
    this.syncNetPeers();
  }

  /** Render/refresh figures for the other players AND server AI NPCs on this map. */
  private syncNetPeers(): void {
    const seen = new Set<string>();
    for (const peer of net.peers) {
      seen.add(peer.id);
      let g = this.netGhosts.get(peer.id);
      if (!g) {
        const spr = this.add.sprite(0, 0, `hero-${peer.classId}-sheet`).setAlpha(peer.npc ? 0.78 : 0.55).setScale(HERO_SPRITE_SCALE * settings.spriteScale());
        if (this.lightingOn) spr.setLighting(true);
        if (peer.npc) spr.setTint(0x9affc0); // AI NPCs read green; real players stay natural
        try { spr.play(`${peer.classId}-idle-down`); } catch { /* texture may be absent */ }
        const tag = this.add
          .text(0, -22, peer.npc ? `${peer.name} ~` : peer.name, {
            fontFamily: 'MedievalSharp, "Trebuchet MS", cursive', fontSize: '10px',
            color: peer.npc ? '#9affc0' : '#bfe6ff', stroke: '#000', strokeThickness: 3,
          })
          .setOrigin(0.5);
        g = this.add.container(peer.x, peer.y, [spr, tag]);
        g.setData('npc', !!peer.npc);
        g.setData('name', peer.name);
        this.netGhosts.set(peer.id, g);
        if (this.netSettled && !peer.npc) this.showBark(`${peer.name} joined the world.`, 2200, 'event');
      }
      g.setPosition(peer.x, peer.y).setDepth(peer.y);
    }
    for (const [id, g] of this.netGhosts) {
      if (!seen.has(id)) {
        if (this.netSettled && !g.getData('npc')) this.showBark(`${g.getData('name')} left the world.`, 2200, 'event');
        g.destroy();
        this.netGhosts.delete(id);
      }
    }
    this.netSettled = true;
  }

  /** Tier 2 co-op role management + host enemy broadcast. Strictly gated: solo
   *  play and the host both behave exactly as before; only a guest is altered. */
  private updateCoop(time: number): void {
    if (!MULTIPLAYER_ENABLED || this.level.town) {
      if (this.coopGuest) { this.coopGuest = false; this.clearCoopEnemies(); }
      return;
    }
    const coop = net.connected && net.partySize > 1;
    const guest = coop && !net.isHost;
    if (guest && !this.coopGuest) {
      // become a guest: the host now owns the enemies + altars
      this.coopGuest = true;
      for (const m of this.monsters) m.destroy();
      this.monsters = [];
      for (const g of this.generators) g.destroy();
      this.generators = [];
      this.showBark('Joined the party — enemies are synced from the host.', 2600, 'system');
    } else if (!guest && this.coopGuest) {
      this.coopGuest = false;
      this.clearCoopEnemies();
    }
    if (coop && net.isHost && time - this.coopLastSent > 100) {
      this.coopLastSent = time;
      net.sendCoopState(
        this.monsters
          .filter((m) => m.active && m.alive)
          .map((m) => ({ netId: m.netId, enemyId: m.enemyId, x: Math.round(m.x), y: Math.round(m.y), hp: Math.round(m.health), maxHp: m.maxHealth, alive: m.alive }))
      );
    }
  }

  private clearCoopEnemies(): void {
    for (const ce of this.coopEnemies.values()) { ce.spr.destroy(); ce.bar.destroy(); }
    this.coopEnemies.clear();
  }

  /** Guest: render the host's authoritative enemy snapshot (with HP bars). */
  private coopApplyState(enemies: CoopEnemy[]): void {
    if (!this.coopGuest) return;
    const seen = new Set<number>();
    for (const e of enemies) {
      if (!e.alive) continue;
      seen.add(e.netId);
      let ce = this.coopEnemies.get(e.netId);
      if (!ce) {
        const scale = (ENEMIES[e.enemyId as EnemyId]?.scale ?? 1) * 0.56 * settings.spriteScale();
        const spr = this.add.sprite(e.x, e.y, `monster-${e.enemyId}-sheet`).setScale(scale);
        if (this.lightingOn) spr.setLighting(true);
        try { spr.play(`${e.enemyId}-walk`); } catch { /* no walk anim for this sheet */ }
        ce = { spr, bar: this.add.graphics() };
        this.coopEnemies.set(e.netId, ce);
      }
      ce.spr.setPosition(e.x, e.y).setDepth(e.y);
      const w = 22;
      const frac = Math.max(0, Math.min(1, e.hp / Math.max(1, e.maxHp)));
      ce.bar.clear();
      ce.bar.fillStyle(0x000000, 0.6); ce.bar.fillRect(e.x - w / 2, e.y - 24, w, 3);
      ce.bar.fillStyle(0xff5a4a, 1); ce.bar.fillRect(e.x - w / 2, e.y - 24, w * frac, 3);
      ce.bar.setDepth(e.y + 1);
    }
    for (const [netId, ce] of this.coopEnemies) {
      if (!seen.has(netId)) { ce.spr.destroy(); ce.bar.destroy(); this.coopEnemies.delete(netId); }
    }
  }

  /** Host: apply a guest's reported hit to the authoritative enemy. */
  private coopApplyHit(netId: number, dmg: number, from?: string): void {
    if (!net.isHost) return;
    const m = this.monsters.find((mm) => mm.netId === netId && mm.alive);
    if (!m) return;
    const died = m.takeDamage(dmg, this.time.now);
    this.floatDamage(m.x, m.y, dmg, false);
    if (died) {
      const remote = !!from && from !== net.id;
      this.onMonsterKilled(this.players[0], m, remote);
    }
  }

  private updateTown(time: number, delta: number): void {
    const dt = delta / 1000;
    for (const n of this.townNpcs) {
      if (time >= n.nextTurn) {
        n.nextTurn = time + 1100 + Math.random() * 2600;
        if (Math.random() < 0.4) {
          n.vx = 0;
          n.vy = 0;
        } else {
          const a = Math.random() * Math.PI * 2;
          const sp = 12 + Math.random() * 12;
          n.vx = Math.cos(a) * sp;
          n.vy = Math.sin(a) * sp;
        }
      }
      if (n.vx === 0 && n.vy === 0) continue;
      const nx = n.sprite.x + n.vx * dt;
      const ny = n.sprite.y + n.vy * dt;
      const farFromHome = Phaser.Math.Distance.Between(nx, ny, n.homeX, n.homeY) > 60;
      if (farFromHome || !this.isWalkable(Math.floor(nx / TILE_SIZE), Math.floor(ny / TILE_SIZE))) {
        n.vx *= -1;
        n.vy *= -1;
        continue;
      }
      n.sprite.x = nx;
      n.sprite.y = ny;
      n.sprite.setDepth(ny);
      if (Math.abs(n.vx) > 1) n.sprite.setFlipX(n.vx < 0);
    }
  }

  private townInteract(player: Hero): boolean {
    // The Wanderer at the river bridge is handled first: she stands on the bank
    // beside open water, so without this the fishing prompt would hijack the
    // interact before we ever reach her heirloom gate.
    for (const n of this.townNpcs) {
      if (n.npcId !== NOMAD_GATE.npcId) continue;
      if (Phaser.Math.Distance.Between(player.x, player.y, n.sprite.x, n.sprite.y) < 34) {
        this.talkToNpc(player, n);
        return true;
      }
    }
    // the lodge stash chest: shared storage for every hero, every save
    for (const d of this.level.decor ?? []) {
      if (d.key !== 'chest') continue;
      const cc = this.tileCenter(d.x, d.y);
      if (Phaser.Math.Distance.Between(player.x, player.y, cc.x, cc.y) < 34) {
        this.closeAllOverlays();
        this.stashUI.open(player, () => this.syncHudData());
        return true;
      }
    }
    // the notice board: contracts, payouts, reputation
    for (const d of this.level.decor ?? []) {
      if (d.key !== 'quest-board') continue;
      const c = this.tileCenter(d.x, d.y);
      if (Phaser.Math.Distance.Between(player.x, player.y, c.x, c.y) < 40) {
        this.closeAllOverlays();
        audio.sfx('ui_select');
        this.questBoardUI.open(player, this.unlockedRealms(), {
          onAccepted: (q) => {
            this.showBark(`Contract accepted: ${q.title}. ${q.desc}`, 5200, 'event', '#8ad0ff');
            // let the Dungeon Master embroider the notice
            void aiService.generateBark(`a Hearthwatch notice-board contract: ${q.desc}`).then(({ text, live }) => {
              if (text && live) this.showBark(text, 6200, 'grok');
            }).catch(() => undefined);
          },
          onTurnedIn: (q) => {
            this.showBark(`Contract fulfilled — ${q.gold}g, ${q.xp} XP, +${q.rep} reputation. The town nods its thanks.`, 5200, 'loot', '#8affa0');
            this.syncHudData();
          },
        });
        return true;
      }
    }
    let bestP: (typeof this.portals)[number] | null = null;
    let bd = 34;
    for (const p of this.portals) {
      const d = Phaser.Math.Distance.Between(player.x, player.y, p.sprite.x, p.sprite.y);
      if (d < bd) {
        bd = d;
        bestP = p;
      }
    }
    if (bestP) {
      this.usePortal(bestP);
      return true;
    }
    let bestM: (typeof this.merchants)[number] | null = null;
    let bm = 38;
    for (const m of this.merchants) {
      const d = Phaser.Math.Distance.Between(player.x, player.y, m.sprite.x, m.sprite.y);
      if (d < bm) {
        bm = d;
        bestM = m;
      }
    }
    if (bestM) {
      this.useMerchant(bestM, player);
      return true;
    }
    if (this.returnPortal) {
      const rc = this.tileCenter(this.returnPortal.x, this.returnPortal.y);
      if (Phaser.Math.Distance.Between(player.x, player.y, rc.x, rc.y) < 32) {
        this.useReturnPortal();
        return true;
      }
    }
    let bestD: (typeof this.doors)[number] | null = null;
    let bdd = 42;
    for (const dr of this.doors) {
      const cc = this.tileCenter(dr.x, dr.y);
      const d = Phaser.Math.Distance.Between(player.x, player.y, cc.x, cc.y);
      if (d < bdd) {
        bdd = d;
        bestD = dr;
      }
    }
    if (bestD) {
      this.enterInterior(bestD);
      return true;
    }
    return false;
  }

  private usePortal(p: { realmId: string; label: string }): void {
    const idx = Content.levelOrder.indexOf(p.realmId);
    if (idx < 0 || idx >= this.unlockedRealms()) {
      audio.sfx('ui_move');
      this.showBark(`The gate to ${p.label} is sealed — clear the realm before it to break the seal.`, 5200);
      return;
    }
    this.enterRealm(p.realmId, p.label);
  }

  private enterRealm(realmId: string, label: string): void {
    if (this.won) return;
    this.won = true; // lock input during the transition
    audio.sfx('portal');
    this.showBark(`Descending into ${label}...`, 3000);
    this.registry.set('carryParty', this.carryList());
    this.registry.set('levelId', realmId);
    this.registry.set('twoPlayer', this.twoPlayer);
    this.registry.set('fromTown', true);
    this.registry.set('hireSpent', true); // hired allies lapse once you return to town
    this.registry.remove('cameByPortal');
    this.registry.remove('portalReturn');
    this.registry.remove('loadSave');
    this.cameras.main.fadeOut(700, 0, 0, 0);
    this.time.delayedCall(900, () => {
      this.scene.stop('HudScene');
      this.scene.start('DungeonScene');
    });
  }

  /** Use a scroll from the inventory. Town Portal teleports home (and back);
   *  mending/renewal restore the party. */
  useScroll(item: ItemDefinition): void {
    const player = this.players.find((p) => p.alive) ?? this.players[0];
    if (!player) return;
    if (item.scroll === 'town_portal') {
      if (this.level.town || this.level.interior) {
        this.showBark('A Town Portal only opens from within the depths.', 3000, 'system');
        return;
      }
      player.inventory.consume(item);
      this.castTownPortal(player);
      return;
    }
    player.inventory.consume(item);
    if (item.scroll === 'mending') {
      for (const a of this.allies) if (a.alive) a.heal(a.stats.maxHealth);
      this.showBark('A Scroll of Mending knits the party whole.', 2600, 'loot');
    } else if (item.scroll === 'renewal') {
      for (const a of this.allies) if (a.alive) a.restoreMana(a.stats.maxMana);
      this.showBark('A Scroll of Renewal floods the party with mana.', 2600, 'loot');
    }
    audio.sfx('potion');
  }

  /** Tear a portal home: remember this spot, then load town with a return gate. */
  private castTownPortal(player: Hero): void {
    if (this.won) return;
    this.won = true;
    audio.sfx('portal');
    this.showBark('You tear a portal home to Hearthwatch...', 2600, 'event');
    this.registry.set('portalReturn', {
      levelId: this.level.id,
      tile: { x: Math.round(player.x / TILE_SIZE), y: Math.round(player.y / TILE_SIZE) },
      fromTown: this.registry.get('fromTown') ?? false,
      unlockedRealms: this.unlockedRealms(),
    });
    this.registry.set('cameByPortal', true);
    this.registry.set('carryParty', this.carryList());
    this.registry.set('levelId', 'town');
    this.registry.set('twoPlayer', this.twoPlayer);
    this.registry.set('fromTown', false);
    this.registry.remove('loadSave');
    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.time.delayedCall(750, () => {
      this.scene.stop('HudScene');
      this.scene.start('DungeonScene');
    });
  }

  /** A shimmering gate in town back down to where the portal was cast. */
  private spawnReturnPortal(): void {
    const x = 50;
    const y = 49;
    const c = this.tileCenter(x, y);
    const spr = this.add.sprite(c.x, c.y, 'portal-sheet').setDepth(c.y).setScale(1.6).setTint(0x7fd0ff);
    spr.play('portal');
    this.add.image(c.x, c.y, 'fx-glow-white').setScale(2.4).setAlpha(0.5).setBlendMode(Phaser.BlendModes.ADD).setDepth(c.y - 1).setTint(0x7fd0ff);
    this.add
      .text(c.x, c.y - 24, 'Return to the depths', { fontFamily: 'MedievalSharp, "Trebuchet MS", cursive', fontSize: '10px', color: '#bfe6ff', align: 'center', stroke: '#000', strokeThickness: 3 })
      .setOrigin(0.5)
      .setDepth(c.y + 40);
    this.returnPortal = { x, y };
  }

  /** Step back through the town portal to the remembered dungeon spot. */
  private useReturnPortal(): void {
    const ret = this.registry.get('portalReturn') as { levelId: string; tile: { x: number; y: number }; fromTown: boolean; unlockedRealms: number } | undefined;
    if (!ret || this.won) return;
    this.won = true;
    audio.sfx('portal');
    this.showBark('You step back through the portal into the depths...', 2600, 'event');
    this.registry.set('carryParty', this.carryList());
    this.registry.set('levelId', ret.levelId);
    this.registry.set('fromTown', ret.fromTown);
    this.registry.set('unlockedRealms', ret.unlockedRealms);
    this.registry.set('dungeonReturnTile', ret.tile);
    this.registry.remove('cameByPortal');
    this.registry.remove('portalReturn');
    this.registry.remove('loadSave');
    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.time.delayedCall(750, () => {
      this.scene.stop('HudScene');
      this.scene.start('DungeonScene');
    });
  }

  /** Step into a building interior (or back out to town). Peaceful, like town. */
  private enterInterior(door: { x: number; y: number; interiorId: string; label: string; dir?: 'north' | 'south' | 'east' | 'west'; comingSoon?: boolean }): void {
    if (this.won) return;
    // Stubbed frontier settlements aren't built yet — sighted, but not enterable.
    if (door.comingSoon) {
      audio.sfx('ui_move');
      this.showBark(`${door.label.replace(/\s*\(coming soon\)\s*$/i, '')} isn’t open to travelers yet — its gates are barred. Another time, perhaps.`, 4200, 'system');
      return;
    }
    this.won = true;
    audio.sfx('portal');
    const target = Content.getLevel(door.interiorId);
    const leaving = door.interiorId === 'town';
    const toOverworld = door.interiorId === 'overworld';
    const enteringCave = door.interiorId.startsWith('cave_');
    const leavingCave = toOverworld && !!this.level.cave;
    // A "field town" (e.g. Sunspire) is a peaceful hub reached straight off the
    // overworld that is NOT Hearthwatch. Hearthwatch sits at the central keep and
    // maps its four gates to fixed OVERWORLD_ENTRIES; a field town instead
    // remembers the exact overworld tile it was entered from (like a cave mouth),
    // so leaving it drops the party right back where they went in.
    const enteringFieldTown = !!target.town && !target.overworld && !target.interior && door.interiorId !== 'town';
    const leavingFieldTown = toOverworld && !!this.level.town && !this.level.overworld && !this.level.interior && this.level.id !== 'town';
    if (enteringCave || enteringFieldTown) {
      // remember this overworld mouth/gate so the sublocation's exit returns here
      this.registry.set('overworldReturn', { x: door.x, y: door.y });
    }
    // NB: entering a field town never sets townReturn (it spawns at its own
    // playerStart and never consumes townReturn), so Hearthwatch's remembered
    // gate-return is left intact for when the party heads back there.
    if (toOverworld) {
      // remember which town edge so we emerge there in the overworld and return
      // to this same gate when we come back inside.
      this.registry.set('overworldEntry', door.dir ?? 'south');
      if (this.level.id === 'town') {
        const W = this.level.width, H = this.level.height;
        const back =
          door.dir === 'north' ? { x: door.x, y: 3 } :
          door.dir === 'south' ? { x: door.x, y: H - 4 } :
          door.dir === 'west' ? { x: 3, y: door.y } :
          { x: W - 4, y: door.y };
        this.registry.set('townReturn', back);
      }
      // a fresh trip out to the overworld clears any stale cave/field-town return
      if (!(leavingCave || leavingFieldTown)) this.registry.remove('overworldReturn');
    } else if (!leaving && !enteringCave && !enteringFieldTown) {
      // remember the street tile in front of the door so we step back out there
      this.registry.set('townReturn', { x: door.x, y: door.y + 1 });
    }
    this.showBark(
      leavingCave ? 'You climb back toward the surface light.' :
      toOverworld ? `You set out along the ${door.label}.` :
      leaving ? 'You step back through the gate.' :
      `You enter ${door.label}.`,
      2600,
    );
    this.registry.set('carryParty', this.carryList());
    this.registry.set('levelId', door.interiorId);
    this.registry.set('twoPlayer', this.twoPlayer);
    this.registry.set('fromTown', false);
    this.registry.remove('loadSave');
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.time.delayedCall(650, () => {
      this.scene.stop('HudScene');
      this.scene.start('DungeonScene');
    });
  }

  private useMerchant(m: { shop: ShopKind; label: string }, player: Hero): void {
    if (m.shop === 'home') {
      for (const a of this.allies) {
        a.heal(a.stats.maxHealth);
        a.restoreMana(a.stats.maxMana);
      }
      audio.sfx('shrine');
      this.showBark('You rest at your lodge. The whole party is restored to full.', 5000);
      this.floatPickup(player.x, player.y - 8, 'Rested', '#9fe0ff');
      return;
    }
    if (m.shop === 'guild') {
      this.guildUI.open(player, this.players.map((p) => p.classId));
      return;
    }
    this.shopUI.open(m.shop, player, m.label);
  }

  private townLine(role: string): string {
    const lines = [
      `Well met. ${role.replace(/^(a|an|the) /, '')} like me hears all sorts in this square.`,
      'Mind the gates — what climbs up from the Undermaw never climbs up kind.',
      'Spend your gold while you draw breath. The dead carry no coin.',
      'They say each realm you clear loosens the seal on the next.',
      'Rest at your lodge before you descend. You will need it.',
    ];
    return lines[Math.floor(Math.random() * lines.length)];
  }

  private interact(player: Hero): void {
    if (this.level.town && this.townInteract(player)) return;
    // hail a fellow adventurer to trade (works anywhere you share a map)
    if (net.connected && !this.tradeUI.isOpen()) {
      let ghost: { id: string; name: string; d: number } | null = null;
      for (const [id, g] of this.netGhosts) {
        if (g.getData('npc')) continue;
        const d = Phaser.Math.Distance.Between(player.x, player.y, g.x, g.y);
        if (d < 44 && (!ghost || d < ghost.d)) ghost = { id, name: String(g.getData('name') ?? 'Adventurer'), d };
      }
      if (ghost) {
        const partner = ghost;
        net.sendTradeRequest(partner.id);
        this.closeAllOverlays();
        this.showBark(`You offer to trade with ${partner.name}...`, 2600, 'event', '#8ad0ff');
        this.tradeUI.open(player, partner.id, partner.name, {
          onComplete: () => { this.showBark('The trade is struck — fair dealing!', 3200, 'loot', '#8affa0'); this.syncHudData(); },
          onClosed: () => this.syncHudData(),
        });
        return;
      }
    }
    // a caged villager: break the lock, complete the rescue contract
    if (this.rescueCage && Phaser.Math.Distance.Between(player.x, player.y, this.rescueCage.x, this.rescueCage.y) < 34) {
      const cage = this.rescueCage;
      this.rescueCage = null;
      questLog.completeRescue(cage.questId);
      audio.sfx('portal');
      this.spawnBlink(cage.x, cage.y);
      for (const p of cage.parts) p.destroy();
      this.showBark('The lock breaks — the villager bolts for the surface, shouting thanks! Claim your payout at the notice board.', 5600, 'event', '#8affa0');
      this.floatPickup(cage.x, cage.y - 20, 'rescued!', '#8affa0');
      return;
    }
    for (const ch of this.chests) {
      if (ch.opened) continue;
      const c = this.tileCenter(ch.x, ch.y);
      if (Phaser.Math.Distance.Between(player.x, player.y, c.x, c.y) < 26) {
        if (ch.locked) {
          if (player.classId === 'thief') {
            ch.locked = false;
            if (player.gainLockpick(1)) this.showBark(`Lockpicking improved — Lv ${player.lockpickLevel}.`, 2200, 'system');
            this.showBark('You slip a pick into the lock... *click*.', 2200, 'event');
            audio.sfx('key');
          } else if (player.inventory.useKey()) {
            ch.locked = false;
            this.showBark('You turn an iron key in the lock.', 2200, 'event');
            audio.sfx('key');
          } else {
            this.showBark('The chest is locked — you need a key (or a thief to pick it).', 2800, 'system');
            audio.sfx('ui_move');
            return;
          }
        }
        ch.opened = true;
        ch.sprite.setTexture('chest-open').clearTint();
        const questItem = ch.questItemId ? Content.item(ch.questItemId) : undefined;
        if (questItem) {
          // A hand-authored story item (e.g. the Wanderer's lost heirloom): the
          // exact item, not a random drop, and a flag so the world remembers.
          player.inventory.add(questItem);
          questLog.setFlag(`found_${questItem.id}`);
          this.showBark(`You lift a ${questItem.name} from the chest — no mere loot, but something long grieved for.`, 5200, 'loot', '#ffd76a');
          this.floatPickup(player.x, player.y, questItem.name, '#ffd76a');
          audio.sfx('chest');
          return;
        }
        // Chests reward themed, graded gear — floor and luck rise with realm depth / party level.
        const ls = this.lootScale();
        const depth = Content.levelOrder.indexOf(this.level.id);
        const chestFloor: Grade = depth >= 8 ? 'runed' : 'honed';
        const item = rollDrop(this.level.theme ?? 'crypt', this.bestLuck() + ls.luckBonus, { floor: chestFloor });
        player.inventory.add(item);
        player.refreshStats();
        this.showBark(`Found: ${describeItem(item)}`, 3400, 'loot');
        this.floatPickup(player.x, player.y, item.name, item.grade ? GRADES[item.grade].color : '#ffe9a8');
        void aiService.generateItemFlavor(item.name);
        audio.sfx('chest');
        return;
      }
    }
    for (const sh of this.shrines) {
      if (sh.used) continue;
      const c = this.tileCenter(sh.x, sh.y);
      if (Phaser.Math.Distance.Between(player.x, player.y, c.x, c.y) < 28) {
        sh.used = true;
        sh.sprite.setTexture('shrine-lit');
        for (const a of this.allies) {
          a.heal(Math.round(a.stats.maxHealth * 0.3));
          a.restoreMana(Math.round(a.stats.maxMana * 0.3));
        }
        audio.sfx('shrine');
        this.showBark('The shrine restores your party.');
        return;
      }
    }
    // a quiet bank: cast a line if we're standing beside open water
    if (this.tryFish(player)) return;
    // nothing to use — examine the surroundings instead
    this.examine(player);
  }

  /** Cast a line when standing beside calm water in town or out in the Wilds. */
  private tryFish(player: Hero): boolean {
    if (!this.level.town && !this.level.overworld) return false;
    if (this.fishingUI.isOpen()) return true;
    const tx = Math.floor(player.x / TILE_SIZE);
    const ty = Math.floor(player.y / TILE_SIZE);
    let water = false;
    for (let dy = -1; dy <= 1 && !water; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (this.level.tiles[ty + dy]?.[tx + dx] === Tile.WATER) {
          water = true;
          break;
        }
      }
    }
    if (!water) return false;
    this.closeAllOverlays();
    this.fishingUI.open(player.stats.luck ?? 0, (fish) => {
      if (!fish) {
        this.showBark('The river keeps its secrets... this time.', 2600, 'system');
        return;
      }
      player.inventory.add(fish);
      audio.sfx('coin');
      this.floatPickup(player.x, player.y - 20, fish.name, '#8ad0ff');
      this.showBark(fish.id === 'stormscale' ? 'A STORMSCALE! The fish of legend thrashes in your hands!' : `You land a ${fish.name}.`, 3200, 'loot');
      this.syncHudData();
    });
    return true;
  }

  /** Interact with a town NPC: resolve any cross-town errand they give or
   *  receive, otherwise open the standard rep-tiered hail. */
  private talkToNpc(player: Hero, who: (typeof this.townNpcs)[number]): void {
    // The Wanderer's river gate: hand over her lost heirloom to open the bridge.
    if (who.npcId === NOMAD_GATE.npcId) {
      if (questLog.getFlag(NOMAD_GATE.flag)) {
        this.hailNpc(player, who, { line: NOMAD_GATE.openedLine });
        return;
      }
      const holder = this.allies.find((a) => a.inventory.bag.some((it) => it.id === NOMAD_GATE.itemId));
      if (holder) {
        this.hailNpc(player, who, {
          line: NOMAD_GATE.giveLine,
          action: {
            label: NOMAD_GATE.giveLabel,
            fn: () => {
              const item = holder.inventory.bag.find((it) => it.id === NOMAD_GATE.itemId);
              if (item) holder.inventory.removeItem(item);
              player.inventory.gold += NOMAD_GATE.gold;
              player.gainXP(NOMAD_GATE.xp);
              questLog.reputation += NOMAD_GATE.rep;
              this.openWorldGate();
              this.floatPickup(player.x, player.y - 18, `+${NOMAD_GATE.gold}g`, '#ffe08a');
              this.showBark(
                `The Wanderer cradles the locket and steps aside — the ward fades and the bridge is yours. +${NOMAD_GATE.gold}g, +${NOMAD_GATE.xp} XP, +${NOMAD_GATE.rep} reputation.`,
                5600, 'loot', '#8affa0',
              );
              this.syncHudData();
            },
          },
        });
        return;
      }
      this.hailNpc(player, who, { line: questLog.getFlag(`found_${NOMAD_GATE.itemId}`) ? NOMAD_GATE.waitingHint : NOMAD_GATE.hintLine });
      return;
    }
    const errand = SUNSPIRE_ERRAND;
    // The target: reaching Amira in Sunspire while the errand is out delivers it.
    if (who.npcId === errand.targetId && this.level.id === errand.targetLevelId) {
      const paid = questLog.deliverErrand(errand.targetId, this.level.id);
      if (paid) {
        player.inventory.gold += paid.gold;
        player.gainXP(paid.xp);
        audio.sfx('coin');
        this.floatPickup(player.x, player.y - 18, `+${paid.gold}g`, '#ffe08a');
        this.showBark(`Errand complete — ${paid.title}: +${paid.gold}g, +${paid.xp} XP, +${paid.rep} reputation.`, 5200, 'loot', '#8affa0');
        this.syncHudData();
        this.hailNpc(player, who, { line: errand.deliverLine });
        return;
      }
    }
    // The giver: Tomas offers the errand, then thanks you on your return.
    if (who.npcId === errand.giverId) {
      const st = questLog.errandStatus(errand.id);
      if (st === 'none') {
        this.hailNpc(player, who, {
          line: errand.offerLine,
          action: {
            label: 'ACCEPT',
            fn: () => {
              questLog.acceptErrand(errand);
              audio.sfx('ui_select');
              this.showBark(`Errand accepted — ${errand.title}. ${errand.acceptLine}`, 5600, 'event', '#8ad0ff');
              this.syncHudData();
            },
          },
        });
        return;
      }
      if (st === 'active') {
        this.hailNpc(player, who, { line: errand.waitingLine });
        return;
      }
      if (st === 'done') {
        if (questLog.closeErrand(errand.id)) {
          player.inventory.gold += errand.giverBonus;
          audio.sfx('coin');
          this.floatPickup(player.x, player.y - 18, `+${errand.giverBonus}g`, '#ffe08a');
          this.showBark(`${errand.giverName} presses coin into your hands with his thanks. +${errand.giverBonus}g.`, 4200, 'loot', '#8affa0');
          this.syncHudData();
        }
        this.hailNpc(player, who, { line: errand.doneLine });
        return;
      }
      // 'closed' → falls through to a normal chat
    }
    this.hailNpc(player, who);
  }

  /** The standard town hail: rep-tiered greeting, live AI chat, rumours — plus an
   *  optional scripted line / action button for quest givers and targets. */
  private hailNpc(
    player: Hero,
    who: (typeof this.townNpcs)[number],
    quest?: { line: string; action?: { label: string; fn: () => void } },
  ): void {
    audio.sfx('ui_move');
    this.closeAllOverlays();
    this.dialogueUI.open(player, who.label, who.role, {
      quest,
      onChat: () => {
        this.dialogueUI.say(this.townLine(who.role));
        if (!this.dm.shouldNpcAiChat(this.time.now)) return;
        this.dm.recordNpcChat(this.time.now);
        this.setGrokStatus('thinking');
        void aiService
          .generateBark(`${who.role} named ${who.label} shares a rumor with a ${questLog.repTitle()} adventurer in ${this.level.name}`)
          .then(({ text, live }) => {
            this.setGrokStatus('connected');
            if (text && live) this.dialogueUI.say(text);
          })
          .catch(() => this.setGrokStatus('connected'));
      },
    });
  }

  /** Look at the nearest feature/NPC/tile — hand-crafted lore first; Grok only on rare first discoveries. */
  private examine(player: Hero): void {
    if (this.level.town) {
      let nearN: (typeof this.townNpcs)[number] | null = null;
      let nd = 30;
      for (const n of this.townNpcs) {
        const d = Phaser.Math.Distance.Between(player.x, player.y, n.sprite.x, n.sprite.y);
        if (d < nd) {
          nd = d;
          nearN = n;
        }
      }
      if (nearN) {
        this.talkToNpc(player, nearN);
        return;
      }
    }
    let best: { key: string; d: number } | null = null;
    for (const d of this.level.decor ?? []) {
      const c = this.tileCenter(d.x, d.y);
      const dist = Phaser.Math.Distance.Between(player.x, player.y, c.x, c.y);
      if (dist < 28 && (!best || dist < best.d)) best = { key: d.key, d: dist };
    }
    let npcNear = false;
    for (const s of this.level.spawns) {
      if (s.kind !== 'npc') continue;
      const c = this.tileCenter(s.x, s.y);
      if (Phaser.Math.Distance.Between(player.x, player.y, c.x, c.y) < 30) npcNear = true;
    }

    const tile = this.tileAt(player.x, player.y);
    const examineKey = DungeonMaster.examineKey({
      npc: npcNear,
      decor: best?.key,
      tile: best ? undefined : tile,
    });

    if (this.dm.wasExamined(examineKey)) {
      this.showBark(DungeonMaster.repeatExamineLine(examineKey), 2400, 'system');
      audio.sfx('ui_move');
      return;
    }
    this.dm.markExamined(examineKey);

    let flavor: string;
    let subject: string;
    if (npcNear) {
      flavor = NPC_FLAVOR;
      subject = 'the old gate-warden';
    } else if (best) {
      flavor = DECOR_FLAVOR[best.key] ?? 'You study it a while, but glean little.';
      subject = best.key.replace(/-/g, ' ');
    } else {
      flavor = TILE_FLAVOR[tile] ?? FLOOR_FLAVOR;
      subject = tile === Tile.EXIT ? 'the exit portal' : 'the ground';
    }
    this.showBark(flavor, 7200);
    audio.sfx('ui_move');

    if (!settings.get('aiBarksEnabled') || !this.dm.shouldAiExamine(examineKey, this.time.now)) return;
    this.dm.recordAiExamine(this.time.now);
    this.setGrokStatus('thinking');
    void aiService
      .generateExamine(subject, this.level.name, flavor)
      .then(({ text, live }) => {
        this.setGrokStatus('connected');
        if (text) this.pushDmLine(text, live, 'bark');
      })
      .catch(() => this.setGrokStatus('connected'));
  }

  private joinPlayer2(): void {
    if (this.twoPlayer || this.players.length >= 2 || !this.barkText) return;
    const comp = this.companions.pop();
    const cls = comp ? comp.classId : 'thief';
    const x = comp ? comp.x : this.players[0].x + 14;
    const y = comp ? comp.y : this.players[0].y;
    if (comp) {
      this.allyGroup.remove(comp, false, false);
      comp.destroy();
    }
    this.twoPlayer = true;
    const h2 = new Hero(this, x, y, cls, true, 2);
    h2.onDeathlordShift = (hero, active) => this.deathlordFx(hero, active);
    this.players.push(h2);
    this.allyGroup.add(h2);
    this.shadows.add(h2, 3);
    this.allies = [...this.players, ...this.companions];
    this.showBark('Player 2 joins the fray!');
    audio.sfx('levelup');
  }

  private updateAuras(time: number): void {
    for (const a of this.allies) {
      a.auraDamageReduction = 0;
      a.auraCritBonus = 0;
      a.auraDamageMult = 1;
      a.auraSpeedBonus = 0;
    }
    // ---- bard songs: persistent party auras that ring until the song changes.
    // Anthem ranks strengthen them, Carrying Voice widens them, and the
    // Maestro set power makes them realm-wide and half again as strong.
    const songPulse = time >= this.songPulseAt;
    for (const bard of this.allies) {
      if (!bard.alive || bard.classId !== 'bard') continue;
      const bsig = this.heroSig(bard);
      const maestro = bard.hasSetPower();
      const radius = maestro ? Number.MAX_SAFE_INTEGER : 150 + bard.skillSet.rank('brd_reach') * 25 + (bsig.has('brd_sig_echoes') ? 50 : 0);
      const inSong = (t: { x: number; y: number }) =>
        maestro || Phaser.Math.Distance.Between(bard.x, bard.y, t.x, t.y) <= radius;
      let power = (1 + bard.skillSet.rank('brd_anthem') * 0.12) * (maestro ? 1.5 : 1);
      if (bsig.has('brd_sig_anthemic')) power *= 1.5; // a commanding presence
      if (bsig.has('brd_sig_harmony')) {
        const listeners = this.allies.filter((a) => a.alive && inSong(a)).length;
        power *= 1 + 0.08 * Math.min(4, listeners);
      }
      const applySong = (song: Hero['song'], pw: number): void => {
        if (song === 'war') {
          for (const a of this.allies) if (a.alive && inSong(a)) a.auraDamageMult = Math.max(a.auraDamageMult, 1 + 0.15 * pw);
        } else if (song === 'march') {
          for (const a of this.allies) if (a.alive && inSong(a)) a.auraSpeedBonus = Math.max(a.auraSpeedBonus, Math.round(28 * pw));
        } else if (songPulse && song === 'hymn') {
          for (const a of this.allies) if (a.alive && inSong(a)) a.heal(Math.round(4 * pw));
        } else if (songPulse && song === 'dirge') {
          for (const m of this.monsters) if (m.active && m.alive && inSong(m)) m.applyStatus('chill', 1300, time);
        }
      };
      if (bard.song) applySong(bard.song, power);
      // Echoes: the previous song still rings, faintly
      if (bsig.has('brd_sig_echoes') && bard.prevSong && time < bard.prevSongUntil && bard.prevSong !== bard.song) applySong(bard.prevSong, power * 0.5);
      if (!bard.song) continue;
      // Ballad: the song also shelters listeners with a shield + regen
      if (bsig.has('brd_sig_ballad') && songPulse) {
        for (const a of this.allies) if (a.alive && inSong(a)) { a.heal(Math.round(3 * power)); a.grantShield(Math.round(a.stats.maxHealth * 0.06), 1600, time); }
      }
      // Discord: the melody frays enemy nerves in the aura
      if (bsig.has('brd_sig_discord') && songPulse) {
        for (const m of this.monsters) if (m.active && m.alive && inSong(m)) { m.applyStatus('vuln', 1400, time, 1.2); m.applyStatus('chill', 1000, time); }
      }
    }
    // Necromancer Curse Weaver: the legion radiates a weakening curse
    if (songPulse) {
      for (const necro of this.allies) {
        if (!necro.alive || necro.classId !== 'necromancer' || !this.heroSig(necro).has('nec_sig_curse')) continue;
        for (const s of this.summons) {
          if (!s.alive || s.summoner !== necro) continue;
          for (const m of this.monsters) if (m.active && m.alive && Phaser.Math.Distance.Between(s.x, s.y, m.x, m.y) < 90) m.applyStatus('vuln', 1500, time, 1.2);
        }
      }
      // Druid Thornhide: foes crowding the druid are torn by thorns
      for (const dru of this.allies) {
        if (!dru.alive || dru.classId !== 'druid' || !this.heroSig(dru).has('dru_sig_thornhide')) continue;
        const td = 4 + Math.round(dru.level * 0.4);
        for (const m of this.monsters) {
          if (!m.active || !m.alive || Phaser.Math.Distance.Between(dru.x, dru.y, m.x, m.y) > 46) continue;
          if (m.takeDamage(td, time)) this.onMonsterKilled(dru, m);
          else this.floatDamage(m.x, m.y, td, false);
        }
      }
    }
    if (songPulse) this.songPulseAt = time + 1000;
    const r2 = AURA_RADIUS * AURA_RADIUS;
    for (const src of this.allies) {
      if (!src.alive) continue;
      for (const tgt of this.allies) {
        if (!tgt.alive) continue;
        const dx = src.x - tgt.x;
        const dy = src.y - tgt.y;
        if (dx * dx + dy * dy > r2) continue;
        if (src.classId === 'vanguard') tgt.auraDamageReduction = Math.max(tgt.auraDamageReduction, 0.15);
        else if (src.classId === 'thief') tgt.auraCritBonus = Math.max(tgt.auraCritBonus, 0.08);
        else if (src.classId === 'arcanist') tgt.auraDamageMult = Math.max(tgt.auraDamageMult, 1.18);
      }
    }
    // Deathlord (necromancer 5-piece) / Crown of the Hollow King (unique):
    // risen servants and conjured familiars strike 25% harder.
    if (this.summons.length && this.allies.some((a) => a.alive && ((a.classId === 'necromancer' && a.hasSetPower()) || a.hasUniquePower('hollowcrown')))) {
      for (const s of this.summons) if (s.alive) s.auraDamageMult = Math.max(s.auraDamageMult, 1.25);
    }
    if (time >= this.auraHealAt) {
      // Pulse at HALF the base interval: normal wardens act every other pulse,
      // Lifewarden (5-piece) wardens act every pulse and mend 60% more.
      this.auraHealAt = time + WARDEN_HEAL_INTERVAL / 2;
      this.auraPulseN++;
      for (const src of this.allies) {
        if (!src.alive || src.classId !== 'warden') continue;
        const lifewarden = src.hasSetPower();
        if (!lifewarden && this.auraPulseN % 2 !== 0) continue;
        const heal = Math.round((4 + src.level + Math.round(src.stats.regen * 2)) * (lifewarden ? 1.6 : 1));
        for (const tgt of this.allies) {
          if (!tgt.alive || tgt.health >= tgt.stats.maxHealth) continue;
          const dx = src.x - tgt.x;
          const dy = src.y - tgt.y;
          if (dx * dx + dy * dy > r2) continue;
          tgt.heal(heal);
          const fx = this.add.image(tgt.x, tgt.y - 6, 'fx-glow-green').setDepth(tgt.y + 8).setScale(0.6);
          this.tweens.add({ targets: fx, alpha: 0, y: tgt.y - 16, duration: 500, onComplete: () => fx.destroy() });
        }
      }
    }
    // ---- timed combat buffs (Battle Roar, Rally, Symphony, Cataclysm) ----
    for (const a of this.allies) {
      if (time < a.buffUntil) {
        a.auraDamageMult = Math.max(a.auraDamageMult, a.buffDamageMult);
        a.auraDamageReduction = Math.max(a.auraDamageReduction, a.buffDR);
        a.auraCritBonus = Math.max(a.auraCritBonus, a.buffCrit);
        a.auraSpeedBonus = Math.max(a.auraSpeedBonus, a.buffSpeed);
      }
    }
    // ---- level-20 mastery auras ----
    this.updateMasteryAuras(time);
  }

  /** Permanent level-20 mastery passives that read/write the transient aura
   *  fields (so they must be re-applied every frame, after the zeroing pass). */
  private updateMasteryAuras(time: number): void {
    const r2 = AURA_RADIUS * AURA_RADIUS;
    for (const src of this.allies) {
      if (!src.alive || !src.masteryOn()) continue;
      if (src.classId === 'vanguard') {
        // Unbreakable — a steadfast aura of damage reduction for the party
        for (const t of this.allies) {
          if (!t.alive) continue;
          const dx = src.x - t.x;
          const dy = src.y - t.y;
          if (dx * dx + dy * dy <= r2) t.auraDamageReduction = Math.max(t.auraDamageReduction, 0.1);
        }
      } else if (src.classId === 'thief') {
        // Master of Shadows — lethal from the dark
        if (src.sneaking) src.auraCritBonus = Math.max(src.auraCritBonus, 0.2);
      } else if (src.classId === 'bard') {
        // Maestro — grows with the size of the audience
        let listeners = 0;
        for (const t of this.allies) {
          if (!t.alive || t === src) continue;
          const dx = src.x - t.x;
          const dy = src.y - t.y;
          if (dx * dx + dy * dy <= r2) listeners++;
        }
        src.auraDamageMult = Math.max(src.auraDamageMult, 1 + Math.min(0.3, 0.08 * listeners));
      } else if (src.classId === 'necromancer') {
        // Lich Lord — your host fights with your fury
        for (const s of this.summons) if (s.alive && s.summoner === src) s.auraDamageMult = Math.max(s.auraDamageMult, 1.3);
      }
    }
    // Living Saint / Archdruid gentle regen auras (share a 1s cadence)
    if (time >= this.masteryHealAt) {
      this.masteryHealAt = time + 1000;
      for (const src of this.allies) {
        if (!src.alive || !src.masteryOn()) continue;
        if (src.classId !== 'warden' && src.classId !== 'druid') continue;
        const heal = src.classId === 'warden' ? 3 : 2;
        for (const t of this.allies) {
          if (!t.alive || t.health >= t.stats.maxHealth) continue;
          const dx = src.x - t.x;
          const dy = src.y - t.y;
          if (dx * dx + dy * dy <= r2) t.heal(heal);
        }
      }
    }
  }

  private updateBossMusic(): void {
    if (this.bossMusicOn || !this.boss || !this.bossAlive) return;
    const near = this.players.some((p) => p.alive && Phaser.Math.Distance.Between(p.x, p.y, this.boss!.x, this.boss!.y) < 280);
    if (near) {
      this.bossMusicOn = true;
      audio.playMusic('boss');
      this.dmSetPiece(aiService.generateBossIntro(this.level.name));
    }
  }

  /** Generators that must fall before the exit opens, scaled by difficulty. */
  private requiredGenerators(): number {
    const need = DIFFICULTY[settings.get('gameplay').difficulty].requiredGenerators;
    if (need < 0) return Math.max(GENERATORS_TO_DESTROY, Math.ceil(this.generatorsTotal * 0.85));
    return Math.min(need, this.generatorsTotal);
  }

  private checkExit(): void {
    if (this.won) return;
    if (this.generatorsDestroyed < this.requiredGenerators() || this.bossAlive) return;
    const onExit = this.players.some((p) => p.alive && this.tileAt(p.x, p.y) === Tile.EXIT);
    if (onExit) this.win();
  }

  private win(): void {
    this.won = true;
    audio.sfx('portal');
    const fromTown = (this.registry.get('fromTown') as boolean) ?? false;
    const idx = Content.levelOrder.indexOf(this.level.id);
    const isLast = idx === Content.levelOrder.length - 1;
    if (fromTown && !isLast) {
      // unlock the next gate back in town, then walk the party home.
      this.registry.set('unlockedRealms', Math.max(this.unlockedRealms(), idx + 2));
      this.returnToTown();
      return;
    }
    if (!fromTown) {
      const nextId = Content.nextLevel(this.level.id);
      if (nextId) {
        this.advanceToLevel(nextId);
        return;
      }
    }
    audio.stopMusic();
    audio.sfx('victory');
    this.add.rectangle(PLAY_AREA_WIDTH / 2, GAME_HEIGHT / 2, PLAY_AREA_WIDTH, GAME_HEIGHT, 0x05060a, 0.7).setScrollFactor(0).setDepth(DEPTH.OVERLAY);
    this.add
      .text(PLAY_AREA_WIDTH / 2, GAME_HEIGHT / 2 - 10, 'VICTORY!', { fontFamily: 'MedievalSharp, "Trebuchet MS", cursive', fontSize: '52px', color: '#ffe9a8', fontStyle: 'bold', stroke: '#000', strokeThickness: 6 })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.OVERLAY + 1);
    const vsub = this.add
      .text(PLAY_AREA_WIDTH / 2, GAME_HEIGHT / 2 + 40, 'You have conquered the depths. Returning to menu...', { fontFamily: 'MedievalSharp, "Trebuchet MS", cursive', fontSize: '14px', color: '#dfe6ff', align: 'center', wordWrap: { width: PLAY_AREA_WIDTH - 80 } })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.OVERLAY + 1);
    if (settings.get('aiBarksEnabled')) {
      void aiService.generateVictory(this.level.name, this.players[0]?.classId).then(({ text }) => {
        if (text) vsub.setText(text);
      });
    }
    this.time.delayedCall(3600, () => this.quitToMenu());
  }

  private advanceToLevel(nextId: string): void {
    const next = Content.getLevel(nextId);
    this.add.rectangle(PLAY_AREA_WIDTH / 2, GAME_HEIGHT / 2, PLAY_AREA_WIDTH, GAME_HEIGHT, 0x05060a, 0.7).setScrollFactor(0).setDepth(DEPTH.OVERLAY);
    this.add
      .text(PLAY_AREA_WIDTH / 2, GAME_HEIGHT / 2 - 10, 'LEVEL CLEARED', { fontFamily: 'MedievalSharp, "Trebuchet MS", cursive', fontSize: '44px', color: '#ffe9a8', fontStyle: 'bold', stroke: '#000', strokeThickness: 6 })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.OVERLAY + 1);
    this.add
      .text(PLAY_AREA_WIDTH / 2, GAME_HEIGHT / 2 + 36, `Descending into ${next.name}...`, { fontFamily: 'MedievalSharp, "Trebuchet MS", cursive', fontSize: '15px', color: '#dfe6ff' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.OVERLAY + 1);
    this.registry.set('carryParty', this.carryList());
    this.registry.set('levelId', nextId);
    this.registry.set('twoPlayer', this.twoPlayer);
    this.registry.remove('loadSave');
    audio.sfx('victory');
    this.cameras.main.fadeOut(800, 0, 0, 0);
    this.time.delayedCall(1100, () => {
      this.scene.stop('HudScene');
      this.scene.start('DungeonScene');
    });
  }

  private returnToTown(): void {
    this.add.rectangle(PLAY_AREA_WIDTH / 2, GAME_HEIGHT / 2, PLAY_AREA_WIDTH, GAME_HEIGHT, 0x05060a, 0.7).setScrollFactor(0).setDepth(DEPTH.OVERLAY);
    this.add
      .text(PLAY_AREA_WIDTH / 2, GAME_HEIGHT / 2 - 10, 'REALM CLEARED', { fontFamily: 'Cinzel, Georgia, serif', fontSize: '44px', color: '#ffe9a8', fontStyle: 'bold', stroke: '#000', strokeThickness: 6 })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.OVERLAY + 1);
    this.add
      .text(PLAY_AREA_WIDTH / 2, GAME_HEIGHT / 2 + 36, 'A new gate opens. Returning to Hearthwatch...', { fontFamily: 'MedievalSharp, "Trebuchet MS", cursive', fontSize: '15px', color: '#dfe6ff' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.OVERLAY + 1);
    this.registry.set('carryParty', this.carryList());
    this.registry.set('levelId', 'town');
    this.registry.set('twoPlayer', this.twoPlayer);
    this.registry.set('fromTown', false);
    this.registry.remove('loadSave');
    audio.sfx('victory');
    this.cameras.main.fadeOut(900, 0, 0, 0);
    this.time.delayedCall(1200, () => {
      this.scene.stop('HudScene');
      this.scene.start('DungeonScene');
    });
  }

  private checkGameOver(): void {
    if (this.gameOverUI.isOpen() || this.won) return;
    if (!this.players.some((p) => p.alive)) {
      audio.sfx('game_over');
      const score = this.players.reduce((s, p) => s + p.score, 0);
      this.gameOverUI.open({ score, time: this.formatTime() }, () => this.continueAfterDeath(), () => this.quitToMenu());
      if (settings.get('aiBarksEnabled')) {
        void aiService.generateDeath(this.level.name).then(({ text }) => {
          if (text) this.gameOverUI.setNarration(text);
        });
      }
    }
  }

  private continueAfterDeath(): void {
    const c = this.tileCenter(this.startTile.x, this.startTile.y);
    this.players.forEach((p, i) => {
      p.revive(0.5);
      p.setPosition(c.x + i * 14, c.y);
    });
    this.companions.forEach((comp, i) => {
      if (!comp.alive) comp.revive(0.4);
      comp.setPosition(c.x + Phaser.Math.Between(-16, 16), c.y + 16 + i * 6);
    });
    this.gameOverUI.close();
    this.showBark('You rise again. The crypt is not done with you.');
  }

  private confirmQuit(): void {
    if (this.quitConfirm) return;
    audio.sfx('ui_select');
    const m = framedPanel(this, 320, 196, 'RETURN TO TITLE?');
    this.quitConfirm = m;
    m.add(
      this.add
        .text(m.cx, m.cy - 52, 'Leaving ends this run. Save your\nprogress before returning to the title?', {
          fontFamily: 'MedievalSharp, "Trebuchet MS", cursive',
          fontSize: '13px',
          color: C.ink,
          align: 'center',
          lineSpacing: 3,
        })
        .setOrigin(0.5)
    );
    m.add(makeButton(this, m.cx, m.cy - 8, 230, 30, 'SAVE & QUIT', () => this.saveThenQuit(), { fill: C.ivy, size: 13 }));
    m.add(
      makeButton(this, m.cx, m.cy + 28, 230, 28, 'QUIT WITHOUT SAVING', () => {
        this.closeQuitConfirm();
        this.quitToMenu();
      }, { fill: C.hpLow, size: 12 })
    );
    m.add(makeButton(this, m.cx, m.cy + 62, 230, 26, 'CANCEL', () => this.closeQuitConfirm(), { size: 12 }));
    this.refreshPauseState();
  }

  private closeQuitConfirm(): void {
    if (!this.quitConfirm) return;
    this.quitConfirm.destroy();
    this.quitConfirm = null;
    audio.sfx('ui_move');
    this.refreshPauseState();
  }

  private saveThenQuit(): void {
    this.closeQuitConfirm();
    if (this.won || this.gameOverUI.isOpen()) {
      this.quitToMenu();
      return;
    }
    audio.sfx('ui_select');
    this.captureThumb((thumb) => {
      this.pendingThumb = thumb;
      this.closeAllOverlays();
      this.saveLoadUI.open({
        mode: 'full',
        handleEsc: true,
        getSaveData: () => {
          const d = this.buildSave();
          d.thumbnail = this.pendingThumb;
          return d;
        },
        onLoad: (save) => this.loadFromSave(save),
        onSaved: () => this.quitToMenu(),
      });
    });
  }

  private quitToMenu(): void {
    audio.stopMusic();
    this.time.timeScale = 1;
    // Leave the world properly: otherwise the keepalive ping keeps this hero
    // standing in the shared world as a ghost while we sit in the menu.
    net.disconnect();
    this.scene.stop('HudScene');
    this.scene.start('MenuScene');
  }

  private updateLighting(time: number): void {
    for (const L of this.torchLights) {
      const ph = (L.getData('ph') as number) || 0;
      const f = 0.22 + Math.sin(time * 0.009 + ph) * 0.06 + (Math.random() - 0.5) * 0.035;
      L.setAlpha(Phaser.Math.Clamp(f, 0.1, 0.32));
    }
    if (this.partyLight) {
      this.partyLight.setPosition(this.cameraTarget.x, this.cameraTarget.y);
      this.partyLight.setAlpha(0.28 + Math.sin(time * 0.006) * 0.05);
    }
    if (this.lightingOn) {
      // flicker the real torch lights + carry the party light with the camera target
      for (let i = 0; i < this.torchLightSrcs.length; i++) {
        const s = this.torchLightSrcs[i];
        s.intensity = Phaser.Math.Clamp(0.95 + Math.sin(time * 0.009 + i * 1.7) * 0.14 + (Math.random() - 0.5) * 0.05, 0.7, 1.2);
      }
      this.partyLightSrc?.setPosition(this.cameraTarget.x, this.cameraTarget.y);
    }
  }

  /** Brief point light for impacts/casts/procs (enhanced mode only). */
  private flashLight(x: number, y: number, color: number, radius = 130, dur = 280, intensity = 1.1): void {
    if (!this.lightingOn) return;
    const l = this.lights.addLight(x, y, radius, color, intensity);
    this.tweens.addCounter({
      from: intensity,
      to: 0,
      duration: dur,
      onUpdate: (tw) => { l.intensity = tw.getValue() ?? 0; },
      onComplete: () => this.lights.removeLight(l),
    });
  }

  private updateCamera(): void {
    const live = this.players.filter((p) => p.alive);
    const group = live.length ? live : this.allies.filter((a) => a.alive);
    if (group.length === 0) return;
    let sx = 0;
    let sy = 0;
    for (const a of group) {
      sx += a.x;
      sy += a.y;
    }
    this.cameraTarget.setPosition(sx / group.length, sy / group.length);
  }

  private showBark(text: string, holdMs = 3400, kind: LogEntry['kind'] = 'event', color = '#ffe9a8'): void {
    if (!text) return;
    // set-piece green (and any explicit non-default colour) carries into the log line
    this.pushLog(text, kind, color !== '#ffe9a8' ? { color } : {});
    if (!this.barkText) return;
    this.barkText.setText(text).setAlpha(1).setColor(color);
    this.tweens.killTweensOf(this.barkText);
    this.tweens.add({ targets: this.barkText, alpha: 0, delay: Math.min(holdMs, 2600), duration: 700 });
  }

  private pushLog(
    text: string,
    kind: LogEntry['kind'] = 'event',
    opts: { color?: string; source?: LogEntry['source']; depth?: LogEntry['depth'] } = {},
  ): void {
    if (!text) return;
    const entry: LogEntry = { text, kind, ...opts };
    this.logEntries.push(entry);
    if (this.logEntries.length > DungeonScene.LOG_CAP) {
      this.logEntries.splice(0, this.logEntries.length - DungeonScene.LOG_CAP);
    }
    this.syncLogData();
  }

  private syncLogData(): void {
    const data: LogRegistryData = {
      entries: this.logEntries.slice(-DungeonScene.LOG_CAP),
      grokStatus: this.grokStatus,
      grokProvider: this.grokProvider,
    };
    this.registry.set(LOG_REGISTRY_KEY, data);
  }

  private setGrokStatus(s: 'offline' | 'connected' | 'thinking'): void {
    if (this.grokStatus === s) return;
    this.grokStatus = s;
    this.syncLogData();
  }

  private grokNarrate(ctx: BarkContext | string, opts: { force?: boolean } = {}): void {
    if (!settings.get('aiBarksEnabled')) return;
    if (!this.dm.canBark(this.time.now, opts.force)) return;
    this.dm.recordBark(this.time.now);
    this.setGrokStatus('thinking');
    void aiService
      .generateBark(ctx)
      .then(({ text, live }) => {
        this.setGrokStatus('connected');
        if (text) this.pushDmLine(text, live, 'bark');
      })
      .catch(() => this.setGrokStatus('connected'));
  }

  /** Forced, un-throttled sink for longer set-piece narration (intro/boss/victory/death/examine). */
  private dmSetPiece(p: Promise<{ text: string; live: boolean }>): void {
    if (!settings.get('aiBarksEnabled')) return;
    this.setGrokStatus('thinking');
    void p
      .then(({ text, live }) => {
        this.setGrokStatus('connected');
        if (text) this.pushDmLine(text, live, 'aside');
      })
      .catch(() => this.setGrokStatus('connected'));
  }

  private pushDmLine(text: string, live: boolean, depth: LogEntry['depth']): void {
    if (live) {
      this.pushLog(text, 'grok', { source: 'live', depth });
      return;
    }
    this.pushLog(text, 'event', { source: 'local', depth });
  }

  /** Build a Dungeon Master context snapshot from current run state. */
  private barkContext(event: string, extra: Partial<BarkContext> = {}): BarkContext {
    const p = this.players[0];
    return {
      event,
      realm: this.level.name,
      heroClass: p?.classId,
      altarsLeft: Math.max(0, this.requiredGenerators() - this.generatorsDestroyed),
      ...extra,
    };
  }

  /** Fire a one-shot ominous bark when a hero drops into the danger zone. */
  private checkLowHealth(hero: Hero): void {
    const frac = hero.health / Math.max(1, hero.stats.maxHealth);
    if (frac > 0 && frac < 0.25 && !this.lowHealthWarned) {
      this.lowHealthWarned = true;
      this.grokNarrate(this.barkContext('the hero is gravely wounded and near death', { healthPercent: Math.round(frac * 100) }));
    } else if (frac > 0.45) {
      this.lowHealthWarned = false;
    }
  }

  private formatTime(): string {
    const secs = Math.floor((this.time.now - this.startTime) / 1000);
    return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  }

  private syncHudData(): void {
    const isSummon = (a: Hero): boolean => !!(a as Companion).isSummon;
    const toSlot = (a: Hero): HudHeroSlot => ({
      classId: a.classId,
      name: (a as Companion).displayName ?? a.def.name,
      isPlayer: a.isPlayer,
      playerNum: a.playerNum,
      summon: isSummon(a),
      health: a.health,
      maxHealth: a.stats.maxHealth,
      mana: a.mana,
      maxMana: a.stats.maxMana,
      level: a.level,
      xp: a.xp,
      xpToNext: Math.max(1, Math.floor(40 * Math.pow(a.level, 1.45))),
      gold: a.inventory.gold,
      keys: a.inventory.keyCount(),
      alive: a.alive,
      score: a.score,
      skillPoints: a.skillSet.points,
      attrPoints: a.attributes.points,
    });
    const controllers = this.allies
      .filter((a) => !isSummon(a))
      .sort((a, b) => {
        if (a.isPlayer !== b.isPlayer) return a.isPlayer ? -1 : 1;
        return a.isPlayer ? a.playerNum - b.playerNum : 0;
      });
    const groups: HudPartyGroup[] = controllers.map((member) => ({
      member: toSlot(member),
      pets: this.allies
        .filter((a) => isSummon(a) && (a as Companion).summoner === member)
        .map(toSlot),
    }));
    const data: HudRegistryData = {
      groups,
      generatorsLeft: Math.max(0, this.requiredGenerators() - this.generatorsDestroyed),
      generatorsTotal: this.requiredGenerators(),
      bossAlive: this.bossAlive,
      quest: this.quest,
      questBeat: this.questBeat || undefined,
      levelName: this.level.name,
      twoPlayer: this.twoPlayer,
      elapsedMs: this.time.now - this.startTime,
      controls: this.input2?.hasPad() ? formatHudControlsPad(this.twoPlayer) : formatHudControls(settings.bindings, this.twoPlayer),
    };
    this.registry.set(HUD_REGISTRY_KEY, data);
  }

  /** Open the save/load window (F2). Captures a fresh screenshot first. */
  private toggleSaveLoad(): void {
    if (this.saveLoadUI.isOpen()) {
      this.saveLoadUI.close();
      return;
    }
    if (this.won || this.gameOverUI.isOpen()) return;
    audio.sfx('ui_select');
    this.captureThumb((thumb) => {
      this.pendingThumb = thumb;
      this.closeAllOverlays();
      this.saveLoadUI.open({
        mode: 'full',
        handleEsc: false,
        getSaveData: () => {
          const d = this.buildSave();
          d.thumbnail = this.pendingThumb;
          return d;
        },
        onLoad: (save) => this.loadFromSave(save),
      });
    });
  }

  /** Grab a small JPEG preview of the current play area. */
  private captureThumb(cb: (data?: string) => void): void {
    try {
      this.game.renderer.snapshotArea(PLAY_AREA_X, 0, PLAY_AREA_WIDTH, GAME_HEIGHT, (img) => {
        try {
          const el = img as HTMLImageElement;
          const finish = (): void => {
            try {
              const W = 492;
              const H = 280;
              const cv = document.createElement('canvas');
              cv.width = W;
              cv.height = H;
              const c = cv.getContext('2d');
              if (!c) return cb(undefined);
              c.imageSmoothingEnabled = true;
              c.imageSmoothingQuality = 'high';
              const sw = el.naturalWidth || PLAY_AREA_WIDTH;
              const srcH = el.naturalHeight || GAME_HEIGHT;
              const sh = Math.min(srcH, Math.round((sw * H) / W));
              const sy = Math.max(0, Math.round((srcH - sh) / 2));
              c.drawImage(el, 0, sy, sw, sh, 0, 0, W, H);
              cb(cv.toDataURL('image/jpeg', 0.85));
            } catch {
              cb(undefined);
            }
          };
          if (el && (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth) finish();
          else if (el) (el as HTMLImageElement).onload = finish;
          else cb(undefined);
        } catch {
          cb(undefined);
        }
      });
    } catch {
      cb(undefined);
    }
  }

  /** Restart the run from a chosen save (used by the in-game load window). */
  private loadFromSave(save: SaveData): void {
    this.registry.set('twoPlayer', save.twoPlayer);
    const ps = save.allies.filter((a) => a.isPlayer).sort((a, b) => a.playerNum - b.playerNum);
    this.registry.set('p1Class', ps[0]?.classId ?? 'vanguard');
    if (ps[1]) this.registry.set('p2Class', ps[1].classId);
    this.registry.set('levelId', save.levelId);
    this.registry.set('unlockedRealms', save.unlockedRealms ?? 1);
    this.registry.set('fromTown', save.levelId !== 'town');
    this.registry.remove('carryParty');
    this.registry.set('hiredAllies', hiredAlliesFromSave(save));
    this.registry.set('loadSave', save);
    audio.stopMusic();
    this.time.timeScale = 1;
    this.scene.stop('HudScene');
    this.scene.start('DungeonScene');
  }

  /** Seed registry hiredAllies before companions spawn (save / carry restore). */
  private restoreHiredAllies(save?: SaveData, carry?: SaveAlly[]): void {
    if (save) {
      const hired = hiredAlliesFromSave(save);
      if (hired.length) this.registry.set('hiredAllies', hired);
      return;
    }
    if (carry) {
      const hired = carry.filter((a) => !a.isPlayer).map((a) => a.classId);
      if (hired.length) this.registry.set('hiredAllies', hired);
    }
  }

  /** Party members that travel between levels/saves. Summoned servants are
   *  bound to the level they were raised in — leaving releases them. */
  private carryList(): SaveAlly[] {
    return this.allies.filter((a) => !(a as Companion).isSummon).map((a) => this.allyToSave(a));
  }

  private allyToSave(a: Hero): SaveAlly {
    return {
      classId: a.classId,
      isPlayer: a.isPlayer,
      playerNum: a.playerNum,
      level: a.level,
      xp: a.xp,
      score: a.score,
      health: a.health,
      mana: a.mana,
      alive: a.alive,
      x: a.x,
      y: a.y,
      skillRanks: { ...a.skillSet.ranks },
      skillPoints: a.skillSet.points,
      attrRanks: { ...a.attributes.ranks },
      attrPoints: a.attributes.points,
      gold: a.inventory.gold,
      keys: a.inventory.keys,
      materials: { ...a.inventory.materials },
      song: a.song,
      bearForm: a.bearForm,
      sigils: a.abilities.serialize(),
      equipped: Object.fromEntries(
        (Object.entries(a.inventory.equipped) as [string, ItemDefinition | undefined][])
          .filter(([, it]) => !!it)
          .map(([slot, it]) => [slot, (it as ItemDefinition).id])
      ),
      bag: a.inventory.bag.map((it) => it.id),
    };
  }

  /** Restore party progression + inventory to matching allies (no world state). */
  private applyPartyCarry(saved: SaveAlly[]): void {
    for (const a of this.allies) {
      const sv = saved.find((m) => m.classId === a.classId && m.isPlayer === a.isPlayer);
      if (!sv) continue;
      a.level = sv.level;
      a.xp = sv.xp;
      a.score = sv.score;
      a.skillSet.ranks = { ...sv.skillRanks };
      a.skillSet.points = sv.skillPoints;
      a.attributes.ranks = { ...sv.attrRanks };
      a.attributes.points = sv.attrPoints;
      a.inventory.gold = sv.gold;
      a.inventory.keys = sv.keys;
      if (sv.materials) a.inventory.materials = { ...sv.materials };
      a.inventory.bag = sv.bag.map((id) => Content.item(id)).filter(Boolean) as ItemDefinition[];
      a.inventory.equipped = {};
      for (const [slot, id] of Object.entries(sv.equipped)) {
        const it = Content.item(id);
        if (it) a.inventory.equipped[migrateEquipKey(slot)] = it;
      }
      // a bard's song keeps ringing and a druid stays shifted across levels
      a.song = (sv.song as Hero['song']) ?? null;
      a.abilities.restore(sv.sigils);
      if (a.classId === 'druid') a.applyForm(!!sv.bearForm);
      a.recompute();
      if (!sv.alive) a.die();
      else {
        a.health = Math.min(sv.health, a.stats.maxHealth);
        a.mana = Math.min(sv.mana, a.stats.maxMana);
      }
    }
  }

  private buildSave(): SaveData {
    return {
      version: 2,
      savedAt: Date.now(),
      levelId: this.level.id,
      unlockedRealms: this.unlockedRealms(),
      levelName: this.level.name,
      chapter: this.level.chapter,
      twoPlayer: this.twoPlayer,
      elapsedMs: this.time.now - this.startTime,
      quest: this.quest,
      generatorsDestroyed: this.generatorsDestroyed,
      generators: this.generators.map((g) => ({ alive: g.alive, health: g.health })),
      bossAlive: this.bossAlive,
      bossHealth: this.boss ? this.boss.health : 0,
      chestsOpened: this.chests.map((c) => c.opened),
      shrinesUsed: this.shrines.map((s) => s.used),
      doorsOpen: this.lockedDoors.map((d) => d.open),
      collectedPickups: [...this.collectedIds],
      allies: this.carryList(),
      hiredAllies: this.companions.filter((c) => !(c as Companion).isSummon).map((c) => c.classId),
      mintedItems: Content.mintedList(),
      questLog: questLog.serialize(),
    };
  }

  private applySave(data: SaveData): void {
    this.quest = data.quest || this.quest;
    this.startTime = this.time.now - (data.elapsedMs || 0);
    if (data.unlockedRealms != null) {
      this.registry.set('unlockedRealms', data.unlockedRealms);
    }
    // Re-register any minted (dropped) gear so equipped/bag ids resolve.
    Content.registerItems((data.mintedItems ?? []).map((m) => ({ ...m, slot: migrateItemSlot(m.slot, m.icon) })));
    questLog.restore(data.questLog);

    for (const a of this.allies) {
      const sv = data.allies.find((m) => m.classId === a.classId && m.isPlayer === a.isPlayer);
      if (!sv) continue;
      a.level = sv.level;
      a.xp = sv.xp;
      a.score = sv.score;
      a.skillSet.ranks = { ...sv.skillRanks };
      a.skillSet.points = sv.skillPoints;
      a.attributes.ranks = { ...sv.attrRanks };
      a.attributes.points = sv.attrPoints;
      a.inventory.gold = sv.gold;
      a.inventory.keys = sv.keys;
      if (sv.materials) a.inventory.materials = { ...sv.materials };
      a.inventory.bag = sv.bag.map((id) => Content.item(id)).filter(Boolean) as ItemDefinition[];
      a.inventory.equipped = {};
      for (const [slot, id] of Object.entries(sv.equipped)) {
        const it = Content.item(id);
        if (it) a.inventory.equipped[migrateEquipKey(slot)] = it;
      }
      a.song = (sv.song as Hero['song']) ?? null;
      a.abilities.restore(sv.sigils);
      if (a.classId === 'druid') a.applyForm(!!sv.bearForm);
      a.recompute();
      a.setPosition(sv.x, sv.y);
      if (!sv.alive) a.die();
      else {
        a.health = sv.health;
        a.mana = sv.mana;
      }
    }

    data.generators.forEach((gs, i) => {
      const g = this.generators[i];
      if (!g) return;
      if (!gs.alive && g.alive) {
        g.alive = false;
        const body = g.body as Phaser.Physics.Arcade.Body | null;
        if (body) body.enable = false;
        g.destroy();
      } else if (g.alive) {
        g.health = gs.health;
      }
    });
    this.generatorsDestroyed = data.generatorsDestroyed;

    if (this.boss) {
      if (!data.bossAlive) {
        this.bossAlive = false;
        this.boss.destroy();
        this.boss = null;
      } else {
        this.boss.health = data.bossHealth || this.boss.health;
      }
    }

    data.chestsOpened.forEach((op, i) => {
      const c = this.chests[i];
      if (c && op && !c.opened) {
        c.opened = true;
        c.sprite.setTexture('chest-open');
      }
    });
    data.shrinesUsed.forEach((u, i) => {
      const sh = this.shrines[i];
      if (sh && u && !sh.used) {
        sh.used = true;
        sh.sprite.setTexture('shrine-lit');
      }
    });
    data.doorsOpen.forEach((op, i) => {
      const dr = this.lockedDoors[i];
      if (dr && op && !dr.open) {
        dr.open = true;
        const body = dr.rect.body as Phaser.Physics.Arcade.StaticBody | null;
        if (body) body.enable = false;
        this.level.tiles[dr.y][dr.x] = Tile.FLOOR;
        dr.sprite.destroy();
      }
    });

    this.collectedIds = new Set(data.collectedPickups);
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      if (p.id !== undefined && this.collectedIds.has(p.id)) {
        p.sprite.destroy();
        this.pickups.splice(i, 1);
      }
    }
    this.showBark('Game restored - press F2 to save.');
  }

  private onShutdown(): void {
    this.closeAllOverlays();
    // Detach net callbacks: they capture this scene, and a server message
    // arriving after shutdown would otherwise touch destroyed game objects.
    net.clearCallbacks();
    this.wisp?.destroy();
    this.wisp = undefined;
    this.time.timeScale = 1;
    this.shadows.removeAll();
    this.inventoryUI?.close();
    this.skillsUI?.close();
    this.settingsUI?.close();
    this.gameOverUI?.close();
    this.sheetUI?.close();
    this.manualUI?.close();
    this.scene.stop('LeftPanelScene');
    this.scene.stop('HudScene');
  }
}
