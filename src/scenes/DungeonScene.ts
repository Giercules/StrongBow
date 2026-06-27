import Phaser from 'phaser';
import {
  TILE_SIZE,
  PLAY_AREA_WIDTH,
  PLAY_AREA_X,
  GAME_HEIGHT,
  DEPTH,
  Tile,
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
  COMPANION_TELEPORT_DISTANCE,
  COMPANION_TELEPORT_MS,
} from '../core/constants';
import * as art from '../rendering/spriteArt';
import * as overworldArt from '../rendering/overworldArt';
import { OVERWORLD_ENTRIES, type OverworldDir } from '../data/overworld';
import { getThemeArt, C } from '../rendering/Palette';
import { framedPanel, makeButton } from '../ui/uiHelpers';
import type { Modal } from '../ui/uiHelpers';
import { getTheme } from '../data/gen/themes';
import { settings } from '../core/GameSettings';
import { formatHudControls, formatHudControlsPad } from '../core/KeyBindings';
import type { HeroClassId, LevelData, HudRegistryData, HudHeroSlot, ItemDefinition, ItemSlot, EnemyId, Grade, ThemeId, LogEntry, LogRegistryData } from '../core/types';
import { migrateEquipKey, migrateItemSlot } from '../core/equipment';
import { Content } from '../content/ContentRegistry';
import { ALL_CLASSES } from '../data/heroes';
import { ITEMS } from '../data/items';
import { GRADES } from '../data/grades';
import { rollDrop, mintItem, monsterDropChance, generatorDropChance, eliteDropChance } from '../systems/LootSystem';
import { THEME_BASES } from '../data/themedItems';
import { describeItem } from '../data/pickupInfo';
import { Hero } from '../entities/Hero';
import { Companion } from '../entities/Companion';
import { Monster } from '../entities/Monster';
import { Generator } from '../entities/Generator';
import { ShadowSystem } from '../systems/ShadowSystem';
import { DungeonInput } from '../systems/DungeonInput';
import { FlowField } from '../systems/Pathfinding';
import type { SaveData, SaveAlly } from '../systems/SaveSystem';
import { SaveLoadUI } from '../ui/SaveLoadUI';
import { audio } from '../systems/AudioSystem';
import { aiService, type BarkContext } from '../ai/AIService';
import { InventoryUI } from '../ui/InventoryUI';
import { ShopUI } from '../ui/ShopUI';
import { GuildHireUI } from '../ui/GuildHireUI';
import { ENEMIES, ENEMY_IDS } from '../data/enemies';

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
import type { ShopKind } from '../core/types';
import { SkillTreeUI } from '../ui/SkillTreeUI';
import { SettingsUI } from '../ui/SettingsUI';
import { GameOverUI } from '../ui/GameOverUI';
import { CharacterSheetUI } from '../ui/CharacterSheetUI';
import { GameManualUI } from '../ui/GameManualUI';
import { PickpocketUI, type PickpocketLoot } from '../ui/PickpocketUI';
import { net, type CoopEnemy, type CoopLoot } from '../net/NetClient';
import { getServerUrl, MULTIPLAYER_ENABLED } from '../net/serverConfig';

interface Chest { sprite: Phaser.GameObjects.Image; itemId: string; opened: boolean; locked: boolean; x: number; y: number; }
interface Shrine { sprite: Phaser.GameObjects.Image; used: boolean; x: number; y: number; }
interface Pickup { sprite: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite; kind: 'coin' | 'food' | 'potion' | 'key' | 'item'; value: number; itemId?: string; id?: number; }
interface LockedDoor { rect: Phaser.GameObjects.Rectangle; sprite: Phaser.GameObjects.Image; x: number; y: number; open: boolean; }
interface Projectile { spr: Phaser.GameObjects.Sprite; vx: number; vy: number; dmg: number; crit: boolean; bornAt: number; ttl: number; owner: Hero; }
interface EnemyProjectile { spr: Phaser.GameObjects.Sprite; vx: number; vy: number; dmg: number; bornAt: number; ttl: number; }

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
  private summonTimerGfx?: Phaser.GameObjects.Graphics;
  private vignette?: Phaser.GameObjects.Image;
  private edgeGrade?: Phaser.GameObjects.Image;
  private selectedSkeleton: SummonChoice = 'tank';
  private radialOpen = false;
  private radialPick: SummonChoice = 'tank';
  private radial?: Phaser.GameObjects.Container;
  private radialNodes: { t: SummonChoice; dx: number; dy: number; g: Phaser.GameObjects.Graphics; txt: Phaser.GameObjects.Text }[] = [];
  private abilityDownAt = 0;
  private monsters: Monster[] = [];
  private generators: Generator[] = [];
  private foundGens = new Set<Generator>(); // generators revealed on the minimap once explored near
  private blockers: Phaser.GameObjects.Rectangle[] = [];
  private lockedDoors: LockedDoor[] = [];
  private chests: Chest[] = [];
  private shrines: Shrine[] = [];
  private pickups: Pickup[] = [];
  private projectiles: Projectile[] = [];
  private enemyProjectiles: EnemyProjectile[] = [];
  private torchLights: Phaser.GameObjects.Image[] = [];
  private partyLight!: Phaser.GameObjects.Image;

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
  private manualUI!: GameManualUI;
  private saveLoadUI!: SaveLoadUI;
  private pickpocketUI!: PickpocketUI;
  private pendingThumb?: string;
  private quitConfirm: Modal | null = null;

  private escKey!: Phaser.Input.Keyboard.Key;
  private continueKey!: Phaser.Input.Keyboard.Key;
  private menuKey!: Phaser.Input.Keyboard.Key;
  private dodgeKey!: Phaser.Input.Keyboard.Key;
  private abilityKey!: Phaser.Input.Keyboard.Key;
  private stealKey!: Phaser.Input.Keyboard.Key;

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
  private static readonly BARK_COOLDOWN = 8000; // min ms between throttled DM barks

  private generatorsDestroyed = 0;
  private generatorsTotal = 0;
  private boss: Monster | null = null;
  private bossAlive = false;
  private bossMusicOn = false;
  private quest = '';
  private startTime = 0;
  private lastBarkAt = 0;
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
    pickpocketed?: boolean;
  }[] = [];
  private portals: { sprite: Phaser.GameObjects.Sprite; realmId: string; label: string; x: number; y: number }[] = [];
  private doors: { x: number; y: number; interiorId: string; label: string; dir?: 'north' | 'south' | 'east' | 'west' }[] = [];
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

  constructor() {
    super('DungeonScene');
  }

  create(): void {
    this.resetState();
    this.twoPlayer = this.registry.get('twoPlayer') ?? false;
    const save = this.registry.get('loadSave') as SaveData | undefined;
    const levelId = (save?.levelId as string) ?? (this.registry.get('levelId') as string) ?? 'sunken_crypt';
    this.level = Content.getLevel(levelId);
    if (this.level.id === 'town' && this.registry.get('hireSpent')) {
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

    this.shadows = new ShadowSystem(this);
    this.allyGroup = this.physics.add.group();
    this.monsterGroup = this.physics.add.group();

    this.renderLevel();
    this.spawnWorldEntities();
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
    this.createHeroes();
    this.createCompanions();
    const carry = this.registry.get('carryParty') as SaveAlly[] | undefined;
    if (carry) {
      this.applyPartyCarry(carry);
      this.registry.remove('carryParty');
    }
    if (this.level.town && !carry && !save) {
      // fresh campaign: each hero starts with 100 gold + a health & mana potion
      for (const p of this.players) {
        p.inventory.gold = 100;
        const hp = Content.item('health_potion');
        const mp = Content.item('mana_potion');
        if (hp) p.inventory.add(hp);
        if (mp) p.inventory.add(mp);
      }
    }
    if (this.level.id === 'town' && this.registry.get('cameByPortal')) this.spawnReturnPortal();
    this.setupColliders();
    this.spawnAmbientMonsters();
    this.flow = new FlowField(this.level.width, this.level.height, (x, y) => this.isWalkable(x, y));

    this.cameraTarget = this.add.rectangle(this.players[0].x, this.players[0].y, 2, 2, 0, 0);
    this.cameras.main.startFollow(this.cameraTarget, true, 0.12, 0.12);
    this.cameras.main.setZoom(OPTIMAL_ZOOM);
    this.centerSmallLevel();
    this.cameras.main.fadeIn(260, 0, 0, 0);
    this.game.events.on('viewportresize', this.onViewportResize, this);
    this.events.once('shutdown', () => this.game.events.off('viewportresize', this.onViewportResize, this));

    this.vignette = this.add.image(PLAY_AREA_WIDTH / 2, GAME_HEIGHT / 2, 'fx-vignette').setScrollFactor(0).setDisplaySize(PLAY_AREA_WIDTH, GAME_HEIGHT).setDepth(DEPTH.VIGNETTE);

    // soft light that travels with the party so heroes are always lit; its tint
    // shifts with the level theme for instant mood.
    const atmo = ATMOSPHERE[this.level.theme ?? 'crypt'] ?? ATMOSPHERE.crypt;
    this.partyLight = this.add
      .image(this.cameraTarget.x, this.cameraTarget.y, 'fx-light')
      .setScale(2.6)
      .setAlpha(0.3)
      .setTint(atmo.lightTint)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(DEPTH.VIGNETTE - 1);
    // themed screen-edge colour grade, layered over the dark vignette
    this.edgeGrade = this.add
      .image(PLAY_AREA_WIDTH / 2, GAME_HEIGHT / 2, 'fx-edge')
      .setScrollFactor(0)
      .setDisplaySize(PLAY_AREA_WIDTH, GAME_HEIGHT)
      .setDepth(DEPTH.VIGNETTE + 1)
      .setTint(atmo.edgeTint)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.55);
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
    this.manualUI = new GameManualUI(this);
    this.gameOverUI = new GameOverUI(this);
    this.saveLoadUI = new SaveLoadUI(this);
    this.pickpocketUI = new PickpocketUI(this);
    this.settingsUI = new SettingsUI(this, { input: this.input2, onOpenManual: () => this.manualUI.open() });
    this.shopUI = new ShopUI(this);
    this.guildUI = new GuildHireUI(this);
    const kb = this.input.keyboard!;
    this.escKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.continueKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.C);
    this.menuKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.M);
    this.dodgeKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.abilityKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.F);
    this.stealKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.T);
    kb.on('keydown-F2', () => this.toggleSaveLoad());
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
    audio.setDungeonTheme(this.level.theme ?? 'crypt');
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
    if (this.level.town) {
      this.grokNarrate(this.level.overworld ? 'the party ventures out into the wild overworld surrounding Hearthwatch' : 'the party returns to the town of Hearthwatch to resupply between descents', { force: true });
    } else {
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
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.onShutdown());
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
    this.portals = [];
    this.merchants = [];
    this.doors = [];
    this.returnPortal = null;
  }

  private tileCenter(tx: number, ty: number): { x: number; y: number } {
    return { x: tx * TILE_SIZE + TILE_SIZE / 2, y: ty * TILE_SIZE + TILE_SIZE / 2 };
  }

  /** Tile is steppable for pathfinding (open doors count, walls/closed doors don't). */
  private isWalkable(tx: number, ty: number): boolean {
    if (ty < 0 || ty >= this.level.height || tx < 0 || tx >= this.level.width) return false;
    const t = this.level.tiles[ty][tx];
    return t !== Tile.WALL && t !== Tile.LOCKED_DOOR && t !== Tile.VOID;
  }

  private renderLevel(): void {
    const t = this.level.tiles;
    const W = this.level.width;
    const H = this.level.height;
    const ta = getThemeArt(this.level.theme);
    const atmo = ATMOSPHERE[this.level.theme ?? 'crypt'] ?? ATMOSPHERE.crypt;
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
    this.add.image(0, 0, bgKey).setOrigin(0, 0).setDepth(DEPTH.FLOOR);
    // Walls/floors are now fully themed via per-theme palettes (THEME_ART), so the
    // old flat multiply-tint is no longer applied — colours come from the bake.

    for (let y = 0; y < H; y++) {
      let runStart = -1;
      for (let x = 0; x <= W; x++) {
        const wall = x < W && t[y][x] === Tile.WALL;
        if (wall && runStart < 0) runStart = x;
        if (!wall && runStart >= 0) {
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
          if ((x * 5 + y) % 5 === 0) {
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
          }
          // pulsing arcane glow centered on the mid-face mural
          if ((x * 3 + y * 7) % 5 === 0 && y % 5 !== 0) {
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
    const flatDecor = new Set(['blood-stain', 'lilypad', 'sanctum-glyph', 'void-rift', 'lava-crack', 'rune-circle', 'road', 'grass-tuft', 'bridge-plank', 'chain', 'wood-floor', 'rug']);
    const swayDecor = new Set(['banner', 'vines', 'frost-banner', 'cloth', 'cattail', 'toxic-mushroom', 'town-tree', 'town-bush']);
    const glowDecor: Record<string, string> = {
      crystal: 'fx-glow-magic',
      cog: 'fx-glow-warm',
      'sky-crystal': 'fx-glow-magic',
      'storm-rod': 'fx-glow-magic',
      brazier: 'fx-glow-warm',
      idol: 'fx-glow-warm',
      'storm-orb': 'fx-glow-magic',
      'gauge': 'fx-glow-warm',
    };
    const US = 0.75; // upright decor scale (HD decor is 2x res; halved to keep size)
    const FS = 0.65; // flat (floor) decor scale (HD decor is 2x res)
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
        const glow = this.add.image(dc.x, dc.y, glowDecor[d.key]).setScale(1.7).setAlpha(0.3).setBlendMode(Phaser.BlendModes.ADD).setDepth(dc.y - 3);
        this.tweens.add({ targets: glow, alpha: { from: 0.18, to: 0.42 }, scale: { from: 1.4, to: 2 }, duration: 1100 + Math.random() * 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        this.floatBob(s);
      } else if (d.key === 'fountain') {
        // cement foundation + stone pool rim, framing the animated pool water
        this.add.image(dc.x, dc.y, 'fountain-base').setDepth(DEPTH.FLOOR + 2);
        // lively water: expanding ripple rings spreading across the pool
        for (let i = 0; i < 3; i++) {
          const ring = this.add
            .image(dc.x, dc.y + 4, 'fx-ripple')
            .setScale(0.35).setAlpha(0).setDepth(DEPTH.FLOOR + 3)
            .setBlendMode(Phaser.BlendModes.ADD).setTint(0xbfe9ff);
          this.tweens.add({ targets: ring, scale: { from: 0.35, to: 1.5 }, alpha: { from: 0.55, to: 0 }, duration: 2600, delay: i * 860, repeat: -1, ease: 'Sine.easeOut' });
        }
        // drifting sparkle glints on the surface
        for (let i = 0; i < 5; i++) {
          const gx = dc.x + (Math.random() * 2 - 1) * 64;
          const gy = dc.y + 6 + (Math.random() * 2 - 1) * 34;
          const gl = this.add
            .image(gx, gy, 'fx-glow-white')
            .setScale(0.45).setAlpha(0).setDepth(DEPTH.FLOOR + 3)
            .setBlendMode(Phaser.BlendModes.ADD).setTint(0xcdeeff);
          this.tweens.add({ targets: gl, alpha: { from: 0, to: 0.75 }, duration: 700 + Math.random() * 600, delay: Math.random() * 1800, yoyo: true, repeat: -1, repeatDelay: 700 + Math.random() * 1500, ease: 'Sine.easeInOut' });
        }
        // the ornate fountain standing in the middle of the pool
        this.add.image(dc.x, dc.y, 'fountain').setDepth(dc.y);
        // jetting spray from the top spout
        const spray = this.add.image(dc.x, dc.y - 30, 'fx-glow-white').setScale(1.7).setAlpha(0.25).setBlendMode(Phaser.BlendModes.ADD).setDepth(dc.y + 1).setTint(0x9fd0ff);
        this.tweens.add({ targets: spray, alpha: { from: 0.16, to: 0.42 }, scaleY: { from: 1.3, to: 2 }, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      } else if (swayDecor.has(d.key)) {
        const s = this.add.image(dc.x, dc.y, d.key).setDepth(dc.y - 2).setScale(US);
        this.tweens.add({ targets: s, scaleX: { from: US, to: US * 0.9 }, duration: 1400 + Math.random() * 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
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

  private spawnWorldEntities(): void {
    for (const sp of this.level.spawns) {
      const c = this.tileCenter(sp.x, sp.y);
      switch (sp.kind) {
        case 'playerStart':
          this.startTile = { x: sp.x, y: sp.y };
          break;
        case 'npc': {
          if (this.level.town) {
            const spr = this.add
              .sprite(c.x, c.y, `townsfolk-${townsfolkVariant(sp.npcRole ?? '')}`)
              .setScale(0.62 * settings.spriteScale())
              .setDepth(c.y);
            this.shadows.add(spr);
            this.townNpcs.push({ sprite: spr, homeX: c.x, homeY: c.y, vx: 0, vy: 0, nextTurn: 0, label: sp.label ?? 'Townsfolk', role: sp.npcRole ?? 'a townsperson' });
          } else {
            const npc = this.add.sprite(c.x, c.y, 'npc-elder').setDepth(c.y);
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
          const spr = this.add.sprite(c.x, c.y, 'npc-elder').setDepth(c.y).setTint(tintByShop[shop]);
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
          this.doors.push({ x: sp.x, y: sp.y, interiorId: sp.interiorId ?? 'town', label: sp.label ?? 'Door', dir: sp.dir });
          break;
        }
        case 'generator':
          this.spawnGenerator(sp.x, sp.y, sp.enemyId ?? 'grunt', sp.interval ?? 4000, sp.maxAlive ?? 4, sp.hp ?? 30);
          break;
        case 'chest': {
          const spr = this.add.image(c.x, c.y, 'chest').setDepth(c.y);
          this.shadows.add(spr, 4);
          spr.setTint(0xbcd0e8); // locked chests read cooler/steely until opened
          this.chests.push({ sprite: spr, itemId: sp.itemId ?? 'health_potion', opened: false, locked: true, x: sp.x, y: sp.y });
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
      if (Math.random() < 0.09) this.eliteify(m);
      return m;
    };
    gen.onDestroyed = () => {
      this.generatorsDestroyed++;
      this.showBark('A spawning altar is destroyed!', 3400, 'combat');
      this.grokNarrate(this.barkContext('the heroes shatter a spawning altar'), { force: true });
      void aiService
        .generateAltarProgress(this.level.name, Math.max(0, this.requiredGenerators() - this.generatorsDestroyed))
        .then(({ text }) => {
          if (text) this.questBeat = text;
        });
      // Altars reliably cough up themed gear (honed or better).
      if (Math.random() < generatorDropChance(this.bestLuck()) * settings.get('gameplay').lootMult) this.dropLoot(gen.x, gen.y, 'honed');
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
    this.players.push(h1);
    this.allyGroup.add(h1);
    this.shadows.add(h1, 3);
    if (this.twoPlayer) {
      const p2 = (this.registry.get('p2Class') as HeroClassId) ?? 'thief';
      const h2 = new Hero(this, c.x + 14, c.y, p2, true, 2);
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
      this.companions.push(comp);
      this.allyGroup.add(comp);
      this.shadows.add(comp, 3);
    });
    this.allies = [...this.players, ...this.companions];
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
        this.updateTown(time, delta);
        this.handlePickups();
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
        this.updateAuras(time);
        this.handleHazards(time);
        this.handlePickups();
        this.handleAutoInteractions();
        this.updateBossMusic();
        this.checkExit();
        this.checkGameOver();
      }
    } else if (this.gameOverUI.isOpen()) {
      if (Phaser.Input.Keyboard.JustDown(this.continueKey)) this.continueAfterDeath();
      else if (Phaser.Input.Keyboard.JustDown(this.menuKey)) this.quitToMenu();
    }

    this.shadows.update();
    this.updateLighting(time);
    this.updateCamera();
    this.updateMinimap();
    this.syncHudData();
    this.syncNet();
  }

  private anyOverlayOpen(): boolean {
    return (
      this.inventoryUI.isOpen() ||
      this.skillsUI.isOpen() ||
      this.settingsUI.isOpen() ||
      this.gameOverUI.isOpen() ||
      this.sheetUI.isOpen() ||
      this.manualUI.isOpen() ||
      this.pickpocketUI.isOpen() ||
      this.saveLoadUI.isOpen() ||
      this.shopUI.isOpen() ||
      this.guildUI.isOpen() ||
      this.quitConfirm !== null
    );
  }

  private closeAllOverlays(): void {
    if (this.inventoryUI.isOpen()) this.inventoryUI.close();
    if (this.skillsUI.isOpen()) this.skillsUI.close();
    if (this.settingsUI.isOpen()) this.settingsUI.close();
    if (this.sheetUI.isOpen()) this.sheetUI.close();
    if (this.manualUI.isOpen()) this.manualUI.close();
    if (this.pickpocketUI.isOpen()) this.pickpocketUI.close();
    if (this.saveLoadUI.isOpen()) this.saveLoadUI.close();
    if (this.shopUI.isOpen()) this.shopUI.close();
    if (this.guildUI.isOpen()) this.guildUI.close();
  }

  private pollMenus(): void {
    if (this.input2.capturing || this.gameOverUI.isOpen()) return;

    if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
      if (this.quitConfirm) this.closeQuitConfirm();
      else if (this.manualUI.isOpen()) this.manualUI.close();
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
      if (Phaser.Input.Keyboard.JustDown(this.stealKey) || this.input2.padJustDown('p1', 'steal')) this.attemptPickpocket(0);
      if (this.players[1] && this.input2.padJustDown('p2', 'steal')) this.attemptPickpocket(1);
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
      if ((Phaser.Input.Keyboard.JustDown(this.dodgeKey) || this.input2.padJustDown('p1', 'dodge')) && p1.tryDodge(time)) this.spawnDodgeFx(p1);
      this.handleAbilityInput(p1, time);
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
    // ---- party AI: fire class special abilities when prudent (snapshot so a
    // necromancer summoning mid-pass doesn't disturb iteration) ----
    for (const comp of [...this.companions]) {
      if (!comp.alive || comp.isSummon || !comp.canAbility(time)) continue;
      if (this.companionShouldUseAbility(comp, liveMonsters)) {
        this.useAbility(comp, time, false);
        comp.markAbilityUsed(time);
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
      comp.aiTick(time, delta, leader, targets, pathDir, { x: sx * 0.6, y: sy * 0.6 });
    }
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
  private companionShouldUseAbility(comp: Companion, monsters: Monster[]): boolean {
    const within = (r: number) => monsters.filter((m) => Phaser.Math.Distance.Between(comp.x, comp.y, m.x, m.y) <= r);
    switch (comp.classId) {
      case 'necromancer': {
        const free = settings.get('gameplay').infiniteMana;
        const cap = comp.maxSummons();
        const live = this.summons.filter((sk) => sk.active && sk.alive).length;
        return live < cap && (free || comp.mana >= 20);
      }
      case 'warden':
        // Heal whenever any ally OR necro pet is hurt (no need for foes nearby),
        // and step in to resurrect a fallen comrade within reach.
        return this.allies.some((a) =>
          a.active && (a.alive ? a.healthRatio() < 0.65 : Phaser.Math.Distance.Between(comp.x, comp.y, a.x, a.y) < 170)
        );
      case 'vanguard':
        return within(120).length >= 2;
      case 'arcanist':
        return within(300).length >= 2;
      case 'thief': {
        const n = within(200);
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

  private summonSkeleton(necro: Hero, quiet = false, type?: SkeletonType): void {
    const time = this.time.now;
    this.summons = this.summons.filter((s) => s.active && s.alive);
    const cap = necro.maxSummons();
    if (this.summons.length >= cap) {
      if (!quiet) this.showBark(`Your servants already crowd the dark (max ${cap}).`, 2400, 'system');
      return;
    }
    const cost = 20;
    const free = settings.get('gameplay').infiniteMana;
    if (!free && necro.mana < cost) {
      if (!quiet) this.showBark('Not enough mana to raise the dead.', 2400, 'system');
      return;
    }
    if (!free) necro.mana = Math.max(0, necro.mana - cost);
    const t = type ?? SKELETON_ORDER[this.summonIdx++ % SKELETON_ORDER.length];
    const info = SKELETON_INFO[t];
    const sk = new Companion(this, necro.x + Phaser.Math.Between(-16, 16), necro.y + Phaser.Math.Between(-8, 18), info.cls);
    sk.makeSkeleton(info.sheet, info.walk, info.attack);
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
    sk.health = sk.stats.maxHealth;
    // Servants linger longer the mightier the necromancer grows.
    const dur = 9000 + necro.level * 1800;
    sk.lifeStart = time;
    sk.expireAt = time + dur;
    this.companions.push(sk);
    this.allies.push(sk);
    this.summons.push(sk);
    this.allyGroup.add(sk);
    this.shadows.add(sk, 3);
    const fx = this.add.sprite(sk.x, sk.y, 'fx-magic').setDepth(sk.y + 16).setScale(2).setTint(0x9bff9b);
    fx.play('fx-magic');
    fx.once('animationcomplete', () => fx.destroy());
    audio.sfx('magic');
    if (!quiet) this.showBark(`${necro.def.name} raises a ${info.name}! (${Math.round(dur / 1000)}s)`, 2600, 'event');
  }

  /** Necromancer ability input: tap raises the selected servant; hold opens a
   *  radial to pick Tank / Archer / Mage / Thief, released to raise it. */
  private handleAbilityInput(p1: Hero, time: number): void {
    const down = Phaser.Input.Keyboard.JustDown(this.abilityKey) || this.input2.padJustDown('p1', 'ability');
    const held = this.abilityKey.isDown || this.input2.padAbilityDown('p1');
    const up = Phaser.Input.Keyboard.JustUp(this.abilityKey) || this.input2.padJustUp('p1', 'ability');
    if (p1.classId === 'thief') {
      if (down) this.toggleSneak(p1);
      return;
    }
    if (p1.classId !== 'necromancer') {
      if (down && p1.canAbility(time)) {
        this.useAbility(p1, time);
        p1.markAbilityUsed(time);
      }
      return;
    }
    if (down) this.abilityDownAt = time;
    if (held && this.abilityDownAt && !this.radialOpen && time - this.abilityDownAt > 200) this.openSummonRadial();
    if (this.radialOpen) {
      this.updateSummonRadial();
      p1.setMoveInput(0, 0); // freeze movement while aiming the radial
    }
    if (up) {
      if (this.radialOpen) {
        this.selectedSkeleton = this.radialPick;
        this.closeSummonRadial();
        this.trySummon(p1, time);
      } else if (this.abilityDownAt) {
        this.trySummon(p1, time);
      }
      this.abilityDownAt = 0;
    }
  }

  private trySummon(necro: Hero, time: number): void {
    if (!necro.canAbility(time)) {
      this.showBark('Your magic must gather again before you raise more dead.', 1800, 'system');
      return;
    }
    if (this.selectedSkeleton === 'beast') this.summonMonster(necro);
    else this.summonSkeleton(necro, false, this.selectedSkeleton);
    necro.markAbilityUsed(time);
  }

  /** High-level necromancy: bind a random bestiary monster as a (temporary) ally. */
  private summonMonster(necro: Hero): void {
    const time = this.time.now;
    this.summons = this.summons.filter((s) => s.active && s.alive);
    if (this.summons.length >= necro.maxSummons()) {
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
    sk.stats.maxHealth = def.health;
    sk.health = def.health;
    sk.stats.damage = def.damage;
    sk.stats.speed = def.speed;
    sk.lifeStart = time;
    sk.expireAt = time + 9000 + necro.level * 1800;
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

  private openSummonRadial(): void {
    if (this.radialOpen) return;
    this.radialOpen = true;
    this.radialPick = this.selectedSkeleton;
    const cont = this.add.container(PLAY_AREA_WIDTH / 2, GAME_HEIGHT / 2).setScrollFactor(0).setDepth(DEPTH.OVERLAY + 6);
    const bg = this.add.graphics();
    bg.fillStyle(0x05060a, 0.5);
    bg.fillCircle(0, 0, 94);
    bg.lineStyle(2, 0x9b7be0, 0.85);
    bg.strokeCircle(0, 0, 94);
    cont.add(bg);
    this.radialNodes = [];
    const beastOk = (this.players[0]?.level ?? 1) >= BEAST_LEVEL;
    if (beastOk) {
      const cg = this.add.graphics();
      cont.add(cg);
      const ctxt = this.add.text(0, 0, 'BEAST', { fontFamily: 'MedievalSharp, "Trebuchet MS", cursive', fontSize: '10px', color: '#b6ffd0', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5);
      cont.add(ctxt);
      this.radialNodes.push({ t: 'beast', dx: 0, dy: 0, g: cg, txt: ctxt });
    } else {
      cont.add(this.add.text(0, 0, 'RAISE', { fontFamily: 'MedievalSharp, "Trebuchet MS", cursive', fontSize: '11px', color: '#b79bff' }).setOrigin(0.5));
    }
    const layout: [SkeletonType, number, number, string][] = [
      ['tank', 0, -60, 'TANK'],
      ['archer', 62, 0, 'ARCHER'],
      ['mage', 0, 60, 'MAGE'],
      ['thief', -62, 0, 'THIEF'],
    ];
    for (const [t, dx, dy, name] of layout) {
      const g = this.add.graphics();
      cont.add(g);
      const txt = this.add.text(dx, dy, name, { fontFamily: 'MedievalSharp, "Trebuchet MS", cursive', fontSize: '11px', color: '#cfc6e0', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5);
      cont.add(txt);
      this.radialNodes.push({ t, dx, dy, g, txt });
    }
    this.radial = cont;
    this.updateSummonRadial();
  }

  private updateSummonRadial(): void {
    if (!this.radial) return;
    const beastOk = (this.players[0]?.level ?? 1) >= BEAST_LEVEL;
    let ang: number | null = null;
    let center = false;
    const st = this.input2.move('p1');
    if (st.x || st.y) ang = Math.atan2(st.y, st.x);
    else {
      const ptr = this.input.activePointer;
      const pdx = ptr.x - PLAY_AREA_X - PLAY_AREA_WIDTH / 2;
      const pdy = ptr.y - GAME_HEIGHT / 2;
      const mag = Math.hypot(pdx, pdy);
      if (mag < 26 && beastOk) center = true;
      else if (mag > 20) ang = Math.atan2(pdy, pdx);
    }
    if (center) this.radialPick = 'beast';
    else if (ang !== null) {
      const deg = ((ang * 180) / Math.PI + 360) % 360;
      this.radialPick = deg >= 315 || deg < 45 ? 'archer' : deg < 135 ? 'mage' : deg < 225 ? 'thief' : 'tank';
    }
    for (const n of this.radialNodes) {
      const sel = n.t === this.radialPick;
      n.g.clear();
      n.g.fillStyle(sel ? 0x6e4a9a : 0x1a1530, sel ? 0.95 : 0.7);
      n.g.fillCircle(n.dx, n.dy, 24);
      n.g.lineStyle(2, sel ? 0xe8d0ff : 0x6e521f, 1);
      n.g.strokeCircle(n.dx, n.dy, 24);
      n.txt.setColor(sel ? '#fff4cf' : '#cfc6e0');
    }
  }

  private closeSummonRadial(): void {
    this.radial?.destroy();
    this.radial = undefined;
    this.radialNodes = [];
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
    const names: Record<HeroClassId, string> = { vanguard: 'Seismic Slam', thief: 'Shadow Flurry', arcanist: 'Meteor', warden: 'Sanctuary', necromancer: 'Raise Dead' };
    return names[c];
  }

  /** Per-class active ability (key F), gated by Hero cooldown. */
  private useAbility(h: Hero, time: number, announce = true): void {
    if (h.classId === 'necromancer') {
      this.summonSkeleton(h, !announce);
      return;
    }
    const cx = h.x;
    const cy = h.y;
    if (h.classId === 'thief') {
      // Shadow Flurry — a blur of dagger strikes in an arc ahead, each a backstab-grade hit
      const fx = this.add.sprite(cx + h.attackDir.x * 16, cy + h.attackDir.y * 16, 'fx-slash').setDepth(cy + 8).setScale(2.0).setRotation(Math.atan2(h.attackDir.y, h.attackDir.x)).setTint(0xcfe0ff);
      fx.play('fx-slash');
      fx.once('animationcomplete', () => fx.destroy());
      this.aoeHit(h, cx + h.attackDir.x * 18, cy + h.attackDir.y * 18, 60, Math.round(h.attackDamage().dmg * 2.2), time, 'shock', 60);
      audio.sfx('swing');
    } else if (h.classId === 'warden') {
      // Sanctuary: burst heal/mana to the party (scales with Warden level) and
      // RESURRECT one fallen ally within reach — the Warden's signature grace.
      const healFrac = Math.min(0.6, 0.3 + h.level * 0.015);
      let revived = false;
      for (const a of this.allies) {
        if (a.alive) {
          a.heal(Math.round(a.stats.maxHealth * healFrac));
          a.restoreMana(Math.round(a.stats.maxMana * 0.3));
          const fx = this.add.image(a.x, a.y - 6, 'fx-glow-green').setDepth(a.y + 8).setScale(1.3).setBlendMode(Phaser.BlendModes.ADD);
          this.tweens.add({ targets: fx, alpha: 0, scale: 2.2, duration: 520, onComplete: () => fx.destroy() });
        } else if (a.active && !revived && Phaser.Math.Distance.Between(cx, cy, a.x, a.y) < 170) {
          this.reviveAlly(a, Math.round(a.stats.maxHealth * Math.min(0.7, 0.4 + h.level * 0.01)));
          revived = true;
        }
      }
      if (revived && announce) this.showBark(`${h.def.name} calls a fallen comrade back from the brink!`, 2800, 'event');
      this.aoeHit(h, cx, cy, 120, Math.round(h.attackDamage().dmg * 1.2), time, 'shock', 140);
      audio.sfx('shrine');
    } else if (h.classId === 'arcanist') {
      // Meteor — a fiery blast called down on the nearest cluster (or straight ahead).
      let tx = cx + h.attackDir.x * 150;
      let ty = cy + h.attackDir.y * 150;
      let bestD = 320;
      for (const m of this.monsters) {
        if (!m.active || !m.alive) continue;
        const d = Phaser.Math.Distance.Between(cx, cy, m.x, m.y);
        if (d < bestD) {
          bestD = d;
          tx = m.x;
          ty = m.y;
        }
      }
      const radius = 96;
      const meteor = this.add.sprite(tx, ty, 'fx-fire').setDepth(ty + 24).setScale((radius * 2) / 16).setTint(0xff7a2a);
      meteor.play('fx-fire');
      meteor.once('animationcomplete', () => meteor.destroy());
      this.add.image(tx, ty, 'fx-glow-warm').setScale(3.2).setAlpha(0.85).setBlendMode(Phaser.BlendModes.ADD).setDepth(ty + 10);
      this.aoeHit(h, tx, ty, radius, Math.round(h.magicDamage() * 2.1), time, 'burn', 70);
      if (announce) this.cameras.main.shake(220, 0.008);
      audio.sfx('magic');
    } else {
      // Vanguard — Seismic Slam: a shockwave that flings foes back and stuns, and steels the Vanguard.
      const radius = 116;
      const ring = this.add.sprite(cx, cy, 'fx-magic').setDepth(cy + 20).setScale((radius * 2) / 32).setTint(0x9fd0ff);
      ring.play('fx-magic');
      ring.once('animationcomplete', () => ring.destroy());
      this.aoeHit(h, cx, cy, radius, Math.round(h.attackDamage().dmg * 1.9), time, 'shock', 320);
      if (announce) this.cameras.main.shake(240, 0.009);
      h.heal(Math.round(h.stats.maxHealth * 0.12));
      audio.sfx('hit');
    }
    const flash = this.add.image(cx, cy, 'fx-glow-warm').setScale(2.4).setAlpha(0.7).setBlendMode(Phaser.BlendModes.ADD).setDepth(cy + 10);
    this.tweens.add({ targets: flash, alpha: 0, scale: 3.4, duration: 420, onComplete: () => flash.destroy() });
    if (announce) this.showBark(`${h.def.name} unleashes ${this.abilityName(h.classId)}!`);
  }

  /** Shared radial damage for abilities: hurts monsters + generators in range. */
  private aoeHit(h: Hero, x: number, y: number, radius: number, dmg: number, time: number, status: 'burn' | 'chill' | 'shock', knockback: number): void {
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
          if (knockback > 0) m.knock((dx / l) * knockback, (dy / l) * knockback, time);
          m.applyStatus(status, 1700, time);
        }
      }
    }
    for (const g of this.generators) {
      if (!g.alive) continue;
      if (Phaser.Math.Distance.Between(x, y, g.x, g.y) <= radius) g.takeDamage(dmg, time);
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
    const gearChance = Math.min(0.7, 0.16 + lvl * 0.06);
    if (roll < gearChance) {
      const grades: Grade[] = ['cracked', 'honed', 'runed', 'ascendant', 'godforged'];
      const cap = Math.min(grades.length - 1, Math.floor(lvl / 2)); // Lv8+ can reach Godforged
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
        for (const m of this.monsters) {
          if (!m.active || !m.alive) continue;
          if (this.inArc(ally.x, ally.y, m.x, m.y, dir, reach + 8)) {
            // Backstab now respects a cooldown that shrinks as Sneak grows; a
            // strike on cooldown still hits, just without the 2.4x bonus.
            const back = ally.classId === 'thief' && time >= ally.backstabReadyAt && this.isBackstab(ally, m);
            const d = back ? Math.round(dmg * 2.4) : dmg;
            const died = m.takeDamage(d, time);
            this.floatDamage(m.x, m.y, d, crit || back);
            if (back) {
              this.floatPickup(m.x, m.y - 18, 'BACKSTAB!', '#8affa0');
              ally.backstabReadyAt = time + ally.backstabCooldown();
            }
            // striking from stealth reveals you only to the foe you struck
            if (ally.classId === 'thief' && ally.sneaking && !died) {
              m.spottedUntil = time + 2500;
              m.spottedAlly = ally;
            }
            if (died) this.onMonsterKilled(ally, m);
            else this.applyHitEffects(ally, m, dir.x, dir.y, crit, time);
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
    const radius = 54;
    const dmg = ally.magicDamage();
    const fx = this.add.sprite(ally.x, ally.y, 'fx-magic').setDepth(ally.y + 20).setScale((radius * 2) / 32);
    fx.play('fx-magic');
    fx.once('animationcomplete', () => fx.destroy());
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
          if (ally.stats.fire > 0) m.applyStatus('burn', 1400, time);
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
    m.knock(dirX * 150, dirY * 150, time);
    if (attacker.stats.fire > 0) m.applyStatus('burn', 1600, time);
    if (crit) m.applyStatus('shock', 1200, time);
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
    const arrow = owner.classId === 'thief';
    const tex = arrow ? 'fx-arrow' : 'fx-bolt';
    const speed = arrow ? 320 : 260;
    const spr = this.add
      .sprite(owner.x + dir.x * 12, owner.y + dir.y * 12, tex)
      .setDepth(owner.y + 6)
      .setScale(arrow ? 1 : 1.4);
    if (arrow) spr.setRotation(Math.atan2(dir.y, dir.x));
    // weapon flourish: bow twang flash / arcane cast burst at the hands
    const flash = this.add
      .image(owner.x + dir.x * 10, owner.y + dir.y * 10 - 4, arrow ? 'fx-glow-white' : 'fx-glow-magic')
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(arrow ? 0.5 : 0.75)
      .setDepth(owner.y + 7)
      .setTint(arrow ? 0xffffff : 0xb98cff);
    this.tweens.add({ targets: flash, alpha: 0, scale: arrow ? 0.95 : 1.5, duration: 170, onComplete: () => flash.destroy() });
    const { dmg, crit } = owner.attackDamage();
    this.projectiles.push({ spr, vx: dir.x * speed, vy: dir.y * speed, dmg, crit, bornAt: time, ttl: arrow ? 850 : 600, owner });
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
            dead = true;
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

  /** Create a monster with all combat callbacks wired (ranged/summon/nova). */
  private makeMonster(x: number, y: number, enemyId: EnemyId): Monster {
    const m = new Monster(this, x, y, enemyId);
    m.netId = this.nextNetId++;
    m.onRanged = (mm, ux, uy) => this.spawnEnemyShot(mm, ux, uy);
    m.onSummon = (mm) => this.summonAdds(mm);
    m.onNova = (mm, radius) => this.enemyNova(mm, radius);
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

  private onMonsterKilled(killer: Hero, m: Monster): void {
    const cheats = settings.get('gameplay');
    const mult = cheats.xpMultiplier;
    const coop = MULTIPLAYER_ENABLED && net.connected && net.partySize > 1 && !this.level.town && net.isHost;
    if (coop) {
      // Shared, party-bonused XP + gold — everyone earns MORE than playing solo.
      const bonus = 1 + 0.2 * (net.partySize - 1);
      const xp = Math.round(m.def.xp * mult * bonus);
      const gold = cheats.goldMult > 0 ? Math.max(1, Math.round((2 + m.def.xp * 0.4) * cheats.goldMult * bonus)) : 0;
      this.coopApplyReward(xp, gold);   // host's own party
      net.sendCoopReward(xp, gold);     // guests apply the same
      killer.addScore(m.def.xp);
    } else {
      killer.gainXP(Math.round(m.def.xp * mult));
      killer.addScore(m.def.xp);
      const share = Math.round(m.def.xp * GROUP_XP_SHARE * mult);
      if (share > 0) {
        for (const a of this.allies) {
          if (a !== killer && a.alive) a.gainXP(share);
        }
      }
      // gold coin drop (solo path; co-op gold is shared directly above)
      if (cheats.goldMult > 0 && !m.isBoss && Math.random() < 0.45) {
        this.spawnCoin(m.x, m.y, Math.max(1, Math.round((2 + m.def.xp * 0.4) * cheats.goldMult)));
      }
    }
    // Item + scroll drops roll host-side / solo (cross-client item instancing is a follow-up).
    if (m.isElite) {
      if (Math.random() < eliteDropChance(killer.stats.luck ?? 0) * cheats.lootMult) this.dropLoot(m.x, m.y, 'runed');
    } else if (!m.isBoss && Math.random() < monsterDropChance(killer.stats.luck ?? 0) * cheats.lootMult) {
      const floor: Grade | undefined = m.def.xp >= 28 ? 'honed' : undefined;
      this.dropLoot(m.x, m.y, floor);
    }
    if (!m.isBoss && Math.random() < 0.022 * cheats.lootMult) {
      const sid = ['town_portal_scroll', 'scroll_mending', 'scroll_renewal'][Math.floor(Math.random() * 3)];
      const sc = Content.item(sid);
      if (sc) this.spawnLootPickup(m.x, m.y, sc);
    }
  }

  /** Apply a shared co-op reward to the local human player(s), with a popup. */
  private coopApplyReward(xp: number, gold: number): void {
    for (const a of this.players) if (a?.alive) a.gainXP(xp);
    const p0 = this.players[0];
    if (p0) {
      if (gold > 0) p0.inventory.gold += gold;
      this.floatPickup(p0.x, p0.y - 22, gold > 0 ? `+${xp} XP  +${gold}g` : `+${xp} XP`, '#9affc0');
    }
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

  /** Mint a themed, graded item and drop it into the world as a pickup. */
  private dropLoot(x: number, y: number, floor?: Grade): void {
    const theme = this.level.theme ?? 'crypt';
    const item = rollDrop(theme, this.bestLuck(), floor ? { floor } : {});
    this.spawnLootPickup(x, y, item);
  }

  private spawnLootPickup(x: number, y: number, item: ItemDefinition, fromNet = false): void {
    const color = item.grade ? GRADES[item.grade].color : '#ffe9a8';
    const tint = Phaser.Display.Color.HexStringToColor(color).color;
    const spr = this.add.image(x, y, item.icon).setDepth(y);
    const glow = this.add
      .image(x, y, 'fx-glow-warm')
      .setScale(1.7)
      .setAlpha(0.3)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(y - 1)
      .setTint(tint);
    this.tweens.add({ targets: glow, alpha: { from: 0.3, to: 0.18 }, scale: { from: 1.7, to: 1.4 }, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    // rarity beam — a SOFT coloured light shaft (a stretched glow, no hard edges)
    // so good drops read pleasingly from across the room.
    const beam = this.add
      .image(x, y - 20, 'fx-glow-white')
      .setTint(tint)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(y - 2)
      .setAlpha(0.26)
      .setScale(0.8, 2.8);
    this.tweens.add({ targets: beam, alpha: { from: 0.26, to: 0.4 }, scaleX: { from: 0.8, to: 0.98 }, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const halo = this.add
      .image(x, y - 26, 'fx-glow-white')
      .setTint(tint)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(y - 2)
      .setAlpha(0.18)
      .setScale(1.2);
    this.tweens.add({ targets: halo, alpha: { from: 0.18, to: 0.07 }, scale: { from: 1.0, to: 1.5 }, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    spr.once('destroy', () => {
      glow.destroy();
      beam.destroy();
      halo.destroy();
    });
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

  /** Apply an admin grant (gold / item id / "gear") from the dashboard. */
  private applyAdminGrant(gold: number, itemId?: string): void {
    const p = this.players[0];
    if (!p) return;
    if (gold > 0) {
      p.inventory.gold += gold;
      this.floatPickup(p.x, p.y - 22, `+${gold}g`, '#ffae42');
    }
    if (itemId) {
      const item = itemId === 'gear'
        ? rollDrop(this.level.theme ?? 'crypt', p.stats.luck ?? 0, { floor: 'honed' })
        : Content.item(itemId);
      if (item) {
        p.inventory.add(item);
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

  private handleHazards(time: number): void {
    for (const ally of this.allies) {
      if (!ally.alive) continue;
      const tile = this.tileAt(ally.x, ally.y);

      // --- footing (speed + slip) ---
      ally.slip = 0;
      if (tile === Tile.WATER) ally.speedMult = WATER_SPEED_MULT;
      else if (tile === Tile.POISON) ally.speedMult = POISON_SPEED_MULT;
      else if (tile === Tile.ICE) {
        ally.speedMult = ICE_SPEED_MULT;
        ally.slip = ICE_SLIP;
      } else ally.speedMult = 1;

      // --- damage-over-time hazards & traps ---
      const isDamaging = tile === Tile.LAVA || tile === Tile.POISON || tile === Tile.SPIKES;
      if (isDamaging) {
        const cadence = tile === Tile.SPIKES ? SPIKE_TICK_MS : 500;
        const next = this.lavaTick.get(ally) ?? 0;
        if (time >= next) {
          this.lavaTick.set(ally, time + cadence);
          const raw =
            tile === Tile.SPIKES ? SPIKE_DAMAGE : (tile === Tile.POISON ? POISON_DPS : LAVA_DPS) * 0.5;
          const dealt = ally.takeEnvironmentalDamage(raw);
          this.floatDamage(ally.x, ally.y, dealt, false);
        }
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
          const col = item.grade ? GRADES[item.grade].color : '#ffe9a8';
          this.showBark(`Picked up ${describeItem(item)}`, 3400, 'loot');
          this.floatPickup(p.sprite.x, p.sprite.y, item.name, col);
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
      const opener = this.players.find((p) => p.alive && p.inventory.keys > 0 && Phaser.Math.Distance.Between(p.x, p.y, c.x, c.y) < 26);
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
    net.onCoopHit = (netId, dmg) => this.coopApplyHit(netId, dmg);
    net.onCoopReward = (xp, gold) => this.coopApplyReward(xp, gold);
    net.onCoopLoot = (loot) => this.coopApplyLoot(loot);
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
        const spr = this.add.sprite(0, 0, `hero-${peer.classId}-sheet`).setAlpha(peer.npc ? 0.78 : 0.55).setScale(settings.spriteScale());
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
  private coopApplyHit(netId: number, dmg: number): void {
    if (!net.isHost) return;
    const m = this.monsters.find((mm) => mm.netId === netId && mm.alive);
    if (!m) return;
    const died = m.takeDamage(dmg, this.time.now);
    this.floatDamage(m.x, m.y, dmg, false);
    if (died) this.onMonsterKilled(this.players[0], m);
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
    this.registry.set('carryParty', this.allies.map((a) => this.allyToSave(a)));
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
    this.registry.set('carryParty', this.players.map((a) => this.allyToSave(a)));
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
    this.registry.set('carryParty', this.players.map((a) => this.allyToSave(a)));
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
  private enterInterior(door: { x: number; y: number; interiorId: string; label: string; dir?: 'north' | 'south' | 'east' | 'west' }): void {
    if (this.won) return;
    this.won = true;
    audio.sfx('portal');
    const leaving = door.interiorId === 'town';
    const toOverworld = door.interiorId === 'overworld';
    const enteringCave = door.interiorId.startsWith('cave_');
    const leavingCave = toOverworld && !!this.level.cave;
    if (enteringCave) {
      // remember this overworld mouth so the cave's exit returns us right here
      this.registry.set('overworldReturn', { x: door.x, y: door.y });
    }
    if (toOverworld) {
      // remember which town edge so we emerge there in the overworld and return
      // to this same gate when we come back inside.
      this.registry.set('overworldEntry', door.dir ?? 'south');
      const W = this.level.width, H = this.level.height;
      const back =
        door.dir === 'north' ? { x: door.x, y: 3 } :
        door.dir === 'south' ? { x: door.x, y: H - 4 } :
        door.dir === 'west' ? { x: 3, y: door.y } :
        { x: W - 4, y: door.y };
      this.registry.set('townReturn', back);
      // a fresh trip out through a town gate clears any stale cave-mouth return
      if (!leavingCave) this.registry.remove('overworldReturn');
    } else if (!leaving && !enteringCave) {
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
    this.registry.set('carryParty', this.players.map((a) => this.allyToSave(a)));
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
          } else if (player.inventory.keys > 0) {
            player.inventory.keys -= 1;
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
        // Chests reward themed, graded gear (Honed floor) tuned by the opener's luck.
        const item = rollDrop(this.level.theme ?? 'crypt', player.stats.luck ?? 0, { floor: 'honed' });
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
    // nothing to use — examine the surroundings instead
    this.examine(player);
  }

  /** Look at the nearest feature/NPC/tile and report DnD-flavored lore (AI-augmented). */
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
        const who = nearN;
        this.showBark(`${who.label}: "${this.townLine(who.role)}"`, 7200);
        audio.sfx('ui_move');
        this.setGrokStatus('thinking');
        void aiService
          .generateBark(`${who.role} named ${who.label} chatting with an adventurer in the town of Hearthwatch above the Undermaw`)
          .then(({ text, live }) => {
            this.setGrokStatus('connected');
            if (text) this.showBark(`${who.label}: ${text}`, 7200, live ? 'grok' : 'event');
          })
          .catch(() => this.setGrokStatus('connected'));
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

    let flavor: string;
    let subject: string;
    if (npcNear) {
      flavor = NPC_FLAVOR;
      subject = 'the old gate-warden';
    } else if (best) {
      flavor = DECOR_FLAVOR[best.key] ?? 'You study it a while, but glean little.';
      subject = best.key.replace(/-/g, ' ');
    } else {
      const t = this.tileAt(player.x, player.y);
      flavor = TILE_FLAVOR[t] ?? FLOOR_FLAVOR;
      subject = 'the ground';
    }
    this.showBark(flavor, 7200);
    audio.sfx('ui_move');
    // AI-augmented examination, kept in the game's grim DnD voice (replaces if it returns)
    this.setGrokStatus('thinking');
    void aiService
      .generateExamine(subject, this.level.name)
      .then(({ text, live }) => {
        this.setGrokStatus('connected');
        if (text) this.showBark(text, 7200, live ? 'grok' : 'event');
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
    }
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
    if (time >= this.auraHealAt) {
      this.auraHealAt = time + WARDEN_HEAL_INTERVAL;
      for (const src of this.allies) {
        if (!src.alive || src.classId !== 'warden') continue;
        const heal = 4 + src.level + Math.round(src.stats.regen * 2);
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
    this.registry.set('carryParty', this.allies.map((a) => this.allyToSave(a)));
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
    this.registry.set('carryParty', this.allies.map((a) => this.allyToSave(a)));
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
    this.pushLog(text, kind);
    if (!this.barkText) return;
    this.barkText.setText(text).setAlpha(1).setColor(color);
    this.tweens.killTweensOf(this.barkText);
    this.tweens.add({ targets: this.barkText, alpha: 0, delay: Math.min(holdMs, 2600), duration: 700 });
  }

  private pushLog(text: string, kind: LogEntry['kind'] = 'event'): void {
    if (!text) return;
    this.logEntries.push({ text, kind });
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
    if (!opts.force && this.time.now - this.lastBarkAt < DungeonScene.BARK_COOLDOWN) return;
    this.lastBarkAt = this.time.now;
    this.setGrokStatus('thinking');
    void aiService
      .generateBark(ctx)
      .then(({ text, live }) => {
        this.setGrokStatus('connected');
        if (text) this.pushLog(text, live ? 'grok' : 'event');
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
        if (text) this.pushLog(text, live ? 'grok' : 'event');
      })
      .catch(() => this.setGrokStatus('connected'));
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
    const slots: (HudHeroSlot | null)[] = [null, null, null, null];
    this.allies.slice(0, 4).forEach((a, i) => {
      slots[i] = {
        classId: a.classId,
        name: a.def.name,
        isPlayer: a.isPlayer,
        playerNum: a.playerNum,
        health: a.health,
        maxHealth: a.stats.maxHealth,
        mana: a.mana,
        maxMana: a.stats.maxMana,
        level: a.level,
        xp: a.xp,
        xpToNext: Math.max(1, Math.floor(40 * Math.pow(a.level, 1.45))),
        gold: a.inventory.gold,
        keys: a.inventory.keys,
        alive: a.alive,
        score: a.score,
        skillPoints: a.skillSet.points,
        attrPoints: a.attributes.points,
      };
    });
    const data: HudRegistryData = {
      slots,
      generatorsLeft: Math.max(0, this.requiredGenerators() - this.generatorsDestroyed),
      generatorsTotal: this.requiredGenerators(),
      bossAlive: this.bossAlive,
      quest: this.questBeat ? `${this.quest}  —  ${this.questBeat}` : this.quest,
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
    this.registry.set('loadSave', save);
    audio.stopMusic();
    this.time.timeScale = 1;
    this.scene.stop('HudScene');
    this.scene.start('DungeonScene');
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
      const sv = saved.find((m) => m.classId === a.classId);
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
      a.inventory.bag = sv.bag.map((id) => Content.item(id)).filter(Boolean) as ItemDefinition[];
      a.inventory.equipped = {};
      for (const [slot, id] of Object.entries(sv.equipped)) {
        const it = Content.item(id);
        if (it) a.inventory.equipped[migrateEquipKey(slot)] = it;
      }
      a.recompute();
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
      allies: this.allies.map((a) => this.allyToSave(a)),
      mintedItems: Content.mintedList(),
    };
  }

  private applySave(data: SaveData): void {
    this.quest = data.quest || this.quest;
    this.startTime = this.time.now - (data.elapsedMs || 0);
    // Re-register any minted (dropped) gear so equipped/bag ids resolve.
    Content.registerItems((data.mintedItems ?? []).map((m) => ({ ...m, slot: migrateItemSlot(m.slot, m.icon) })));

    for (const a of this.allies) {
      const sv = data.allies.find((m) => m.classId === a.classId);
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
      a.inventory.bag = sv.bag.map((id) => Content.item(id)).filter(Boolean) as ItemDefinition[];
      a.inventory.equipped = {};
      for (const [slot, id] of Object.entries(sv.equipped)) {
        const it = Content.item(id);
        if (it) a.inventory.equipped[migrateEquipKey(slot)] = it;
      }
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
    this.time.timeScale = 1;
    this.shadows.removeAll();
    this.inventoryUI?.close();
    this.skillsUI?.close();
    this.settingsUI?.close();
    this.gameOverUI?.close();
    this.sheetUI?.close();
    this.manualUI?.close();
    this.scene.stop('LeftPanelScene');
  }
}
