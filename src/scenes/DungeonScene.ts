import Phaser from 'phaser';
import {
  TILE_SIZE,
  PLAY_AREA_WIDTH,
  GAME_HEIGHT,
  DEPTH,
  Tile,
  HUD_REGISTRY_KEY,
  GENERATORS_TO_DESTROY,
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
import { getThemeArt } from '../rendering/Palette';
import { settings } from '../core/GameSettings';
import { formatHudControls } from '../core/KeyBindings';
import type { HeroClassId, LevelData, HudRegistryData, HudHeroSlot, ItemDefinition, ItemSlot, EnemyId, Grade, ThemeId } from '../core/types';
import { Content } from '../content/ContentRegistry';
import { ALL_CLASSES } from '../data/heroes';
import { ITEMS } from '../data/items';
import { GRADES } from '../data/grades';
import { rollDrop, monsterDropChance, generatorDropChance } from '../systems/LootSystem';
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
import { aiService } from '../ai/AIService';
import { InventoryUI } from '../ui/InventoryUI';
import { SkillTreeUI } from '../ui/SkillTreeUI';
import { SettingsUI } from '../ui/SettingsUI';
import { GameOverUI } from '../ui/GameOverUI';
import { CharacterSheetUI } from '../ui/CharacterSheetUI';
import { GameManualUI } from '../ui/GameManualUI';

interface Chest { sprite: Phaser.GameObjects.Image; itemId: string; opened: boolean; x: number; y: number; }
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
};

export class DungeonScene extends Phaser.Scene {
  private level!: LevelData;
  private twoPlayer = false;

  private players: Hero[] = [];
  private companions: Companion[] = [];
  private allies: Hero[] = [];
  private monsters: Monster[] = [];
  private generators: Generator[] = [];
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
  private pendingThumb?: string;

  private escKey!: Phaser.Input.Keyboard.Key;
  private continueKey!: Phaser.Input.Keyboard.Key;
  private menuKey!: Phaser.Input.Keyboard.Key;
  private dodgeKey!: Phaser.Input.Keyboard.Key;
  private abilityKey!: Phaser.Input.Keyboard.Key;

  private mmDots?: Phaser.GameObjects.Graphics;
  private mmX = 0;
  private mmY = 0;
  private mmCW = 0;
  private mmCH = 0;

  private barkText!: Phaser.GameObjects.Text;

  private generatorsDestroyed = 0;
  private generatorsTotal = 0;
  private boss: Monster | null = null;
  private bossAlive = false;
  private bossMusicOn = false;
  private quest = '';
  private startTime = 0;
  private startTile = { x: 4, y: 4 };
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

  constructor() {
    super('DungeonScene');
  }

  create(): void {
    this.resetState();
    this.twoPlayer = this.registry.get('twoPlayer') ?? false;
    const save = this.registry.get('loadSave') as SaveData | undefined;
    const levelId = (save?.levelId as string) ?? (this.registry.get('levelId') as string) ?? 'sunken_crypt';
    this.level = Content.getLevel(levelId);

    const wPx = this.level.width * TILE_SIZE;
    const hPx = this.level.height * TILE_SIZE;

    this.cameras.main.setViewport(0, 0, PLAY_AREA_WIDTH, GAME_HEIGHT);
    this.cameras.main.setBounds(0, 0, wPx, hPx);
    this.cameras.main.setBackgroundColor(this.level.ambientColor ?? 0x05060a);
    this.physics.world.setBounds(0, 0, wPx, hPx);

    this.shadows = new ShadowSystem(this);
    this.allyGroup = this.physics.add.group();
    this.monsterGroup = this.physics.add.group();

    this.renderLevel();
    this.spawnWorldEntities();
    this.createHeroes();
    this.createCompanions();
    const carry = this.registry.get('carryParty') as SaveAlly[] | undefined;
    if (carry) {
      this.applyPartyCarry(carry);
      this.registry.remove('carryParty');
    }
    this.setupColliders();
    this.flow = new FlowField(this.level.width, this.level.height, (x, y) => this.isWalkable(x, y));

    this.cameraTarget = this.add.rectangle(this.players[0].x, this.players[0].y, 2, 2, 0, 0);
    this.cameras.main.startFollow(this.cameraTarget, true, 0.12, 0.12);
    this.cameras.main.setZoom(OPTIMAL_ZOOM);
    this.cameras.main.fadeIn(260, 0, 0, 0);

    this.add.image(PLAY_AREA_WIDTH / 2, GAME_HEIGHT / 2, 'fx-vignette').setScrollFactor(0).setDepth(DEPTH.VIGNETTE);

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
    this.add
      .image(PLAY_AREA_WIDTH / 2, GAME_HEIGHT / 2, 'fx-edge')
      .setScrollFactor(0)
      .setDepth(DEPTH.VIGNETTE + 1)
      .setTint(atmo.edgeTint)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.55);
    this.spawnAmbience(this.level.theme ?? 'crypt');

    this.input2 = new DungeonInput(this);
    this.inventoryUI = new InventoryUI(this);
    this.skillsUI = new SkillTreeUI(this);
    this.sheetUI = new CharacterSheetUI(this);
    this.manualUI = new GameManualUI(this);
    this.gameOverUI = new GameOverUI(this);
    this.saveLoadUI = new SaveLoadUI(this);
    this.settingsUI = new SettingsUI(this, { input: this.input2, onOpenManual: () => this.manualUI.open() });
    const kb = this.input.keyboard!;
    this.escKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.continueKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.C);
    this.menuKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.M);
    this.dodgeKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.abilityKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.F);
    kb.on('keydown-F2', () => this.toggleSaveLoad());
    this.buildMinimap();

    this.barkText = this.add
      .text(PLAY_AREA_WIDTH / 2, GAME_HEIGHT - 40, '', {
        fontFamily: 'Trebuchet MS, sans-serif',
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

    this.quest = `Clear ${this.level.name}: destroy the altars and slay its warden.`;
    if (!save) void aiService.generateQuest(this.level.name).then((q) => { if (q) this.quest = q; });
    // Lead with the chapter's own story beat, then let the AI narrator layer on top.
    const chapterTag = this.level.chapter ? `${this.level.chapter} — ` : '';
    if (this.level.story) this.showBark(`${chapterTag}${this.level.story}`);
    void aiService
      .generateBark(`the heroes enter ${this.level.name}`)
      .then((b) => { if (b) this.showBark(b); });

    this.scene.launch('HudScene');
    this.syncHudData();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.onShutdown());
  }

  private resetState(): void {
    this.players = [];
    this.companions = [];
    this.allies = [];
    this.monsters = [];
    this.generators = [];
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
    this.paused = false;
    this.won = false;
    this.activeIdx = 0;
    this.lavaTick = new Map();
    this.collectedIds = new Set();
    this.compFarSince = new Map();
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
    const isWall = (x: number, y: number) => y >= 0 && y < H && x >= 0 && x < W && t[y][x] === Tile.WALL;

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
          }
          continue;
        }
        if (extFloor) bgCtx.drawImage(extFloor, px, py, TILE_SIZE, TILE_SIZE);
        else art.drawFloor(bgCtx, px, py, x * 131 + y * 17 + 1000, ta.floor);
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
          // 3D wall FRONT FACE overhanging the floor below (height illusion)
          bgCtx.fillStyle = ta.face.main;
          bgCtx.fillRect(px, py, TILE_SIZE, 9);
          bgCtx.fillStyle = ta.face.top;
          bgCtx.fillRect(px, py, TILE_SIZE, 1);
          bgCtx.fillStyle = ta.face.upper;
          bgCtx.fillRect(px, py + 1, TILE_SIZE, 3);
          bgCtx.fillStyle = ta.face.lower;
          bgCtx.fillRect(px, py + 5, TILE_SIZE, 3);
          bgCtx.fillStyle = ta.face.line;
          bgCtx.fillRect(px, py + 4, TILE_SIZE, 1);
          for (let mx = px + 3; mx < px + TILE_SIZE; mx += 6) {
            bgCtx.fillStyle = ta.face.line;
            bgCtx.fillRect(mx, py + 1, 1, 3);
            bgCtx.fillRect(mx + 3, py + 5, 1, 3);
          }
          const grd = bgCtx.createLinearGradient(0, py + 9, 0, py + 15);
          grd.addColorStop(0, 'rgba(0,0,0,0.5)');
          grd.addColorStop(1, 'rgba(0,0,0,0)');
          bgCtx.fillStyle = grd;
          bgCtx.fillRect(px, py + 9, TILE_SIZE, 6);
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
        if (tile === Tile.WALL && y + 1 < H && t[y + 1][x] === Tile.FLOOR && (x * 5 + y) % 5 === 0) {
          this.add.sprite(c.x, c.y + 6, 'torch-sheet').play('torch').setDepth(c.y + 2).setTint(atmo.flameTint);
          const light = this.add
            .image(c.x, c.y + 16, 'fx-light')
            .setScale(1.2)
            .setAlpha(0.26)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setDepth(DEPTH.VIGNETTE - 1)
            .setTint(atmo.flameTint);
          light.setData('ph', Math.random() * 6.28);
          this.torchLights.push(light);
        }
        if (tile === Tile.FLOOR) {
          const hsh = (x * 17 + y * 31) % 53;
          if (hsh === 0) this.add.image(c.x, c.y, 'bones').setDepth(c.y - 4).setAlpha(0.9);
          else if (hsh === 7) this.add.image(c.x, c.y, 'rubble').setDepth(c.y - 4).setAlpha(0.9);
        }
      }
    }

    // ---- hand-placed set-piece decor ----
    const flatDecor = new Set(['blood-stain', 'lilypad', 'sanctum-glyph', 'void-rift', 'lava-crack', 'rune-circle']);
    const swayDecor = new Set(['banner', 'vines', 'frost-banner', 'cloth']);
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
    for (const d of this.level.decor ?? []) {
      const dc = this.tileCenter(d.x, d.y);
      if (flatDecor.has(d.key)) {
        this.add.image(dc.x, dc.y, d.key).setDepth(DEPTH.FLOOR + 1).setAlpha(0.85);
        if (d.key === 'void-rift') {
          this.add.image(dc.x, dc.y, 'fx-glow-magic').setScale(1.3).setAlpha(0.3).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.FLOOR + 2);
        } else if (d.key === 'sanctum-glyph' || d.key === 'rune-circle') {
          this.add.image(dc.x, dc.y, 'fx-glow-warm').setScale(1.2).setAlpha(0.32).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.FLOOR + 2);
        } else if (d.key === 'lava-crack') {
          this.add.image(dc.x, dc.y, 'fx-glow-warm').setScale(1.2).setAlpha(0.4).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.FLOOR + 2);
        }
      } else if (glowDecor[d.key]) {
        const s = this.add.image(dc.x, dc.y, d.key).setDepth(dc.y - 2);
        const glow = this.add.image(dc.x, dc.y, glowDecor[d.key]).setScale(1.2).setAlpha(0.28).setBlendMode(Phaser.BlendModes.ADD).setDepth(dc.y - 3);
        this.tweens.add({ targets: glow, alpha: { from: 0.16, to: 0.4 }, scale: { from: 1.1, to: 1.35 }, duration: 1100 + Math.random() * 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        this.floatBob(s);
      } else if (swayDecor.has(d.key)) {
        const s = this.add.image(dc.x, dc.y, d.key).setDepth(dc.y - 2);
        this.tweens.add({ targets: s, scaleX: { from: 1, to: 0.9 }, duration: 1400 + Math.random() * 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      } else {
        this.add.image(dc.x, dc.y, d.key).setDepth(dc.y - 2);
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
          const npc = this.add.sprite(c.x, c.y, 'npc-elder').setDepth(c.y);
          this.shadows.add(npc);
          break;
        }
        case 'generator':
          this.spawnGenerator(sp.x, sp.y, sp.enemyId ?? 'grunt', sp.interval ?? 4000, sp.maxAlive ?? 4, sp.hp ?? 30);
          break;
        case 'chest': {
          const spr = this.add.image(c.x, c.y, 'chest').setDepth(c.y);
          this.shadows.add(spr, 4);
          this.chests.push({ sprite: spr, itemId: sp.itemId ?? 'health_potion', opened: false, x: sp.x, y: sp.y });
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
    const mc = settings.get('gameplay').monsterCount;
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
      this.showBark('A spawning altar is destroyed!');
      // Altars reliably cough up themed gear (honed or better).
      if (Math.random() < generatorDropChance(this.bestLuck())) this.dropLoot(gen.x, gen.y, 'honed');
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
      const p2 = (this.registry.get('p2Class') as HeroClassId) ?? 'strider';
      const h2 = new Hero(this, c.x + 14, c.y, p2, true, 2);
      this.players.push(h2);
      this.allyGroup.add(h2);
      this.shadows.add(h2, 3);
    }
  }

  private createCompanions(): void {
    const used = new Set(this.players.map((p) => p.classId));
    const pool = ALL_CLASSES.filter((c) => !used.has(c));
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

    if (!this.paused && !this.won) {
      this.handlePlayerInput(time, delta);
      this.updateCompanions(time, delta);
      this.updateMonsters(time, delta);
      this.updateGenerators(time);
      this.resolveCombat(time);
      this.updateProjectiles(time, delta);
      this.updateEnemyProjectiles(time, delta);
      this.updateAuras(time);
      this.handleHazards(time);
      this.handlePickups();
      this.handleAutoInteractions();
      this.updateBossMusic();
      this.checkExit();
      this.checkGameOver();
    } else if (this.gameOverUI.isOpen()) {
      if (Phaser.Input.Keyboard.JustDown(this.continueKey)) this.continueAfterDeath();
      else if (Phaser.Input.Keyboard.JustDown(this.menuKey)) this.quitToMenu();
    }

    this.shadows.update();
    this.updateLighting(time);
    this.updateCamera();
    this.updateMinimap();
    this.syncHudData();
  }

  private anyOverlayOpen(): boolean {
    return (
      this.inventoryUI.isOpen() ||
      this.skillsUI.isOpen() ||
      this.settingsUI.isOpen() ||
      this.gameOverUI.isOpen() ||
      this.sheetUI.isOpen() ||
      this.manualUI.isOpen() ||
      this.saveLoadUI.isOpen()
    );
  }

  private closeAllOverlays(): void {
    if (this.inventoryUI.isOpen()) this.inventoryUI.close();
    if (this.skillsUI.isOpen()) this.skillsUI.close();
    if (this.settingsUI.isOpen()) this.settingsUI.close();
    if (this.sheetUI.isOpen()) this.sheetUI.close();
    if (this.manualUI.isOpen()) this.manualUI.close();
    if (this.saveLoadUI.isOpen()) this.saveLoadUI.close();
  }

  private pollMenus(): void {
    if (this.input2.capturing || this.gameOverUI.isOpen()) return;

    if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
      if (this.manualUI.isOpen()) this.manualUI.close();
      else if (this.anyOverlayOpen()) this.closeAllOverlays();
      else this.quitToMenu();
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
      if (mvx === 0 && mvy === 0 && ptr.isDown && ptr.x < PLAY_AREA_WIDTH) {
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
      if (this.input2.isDown('p1', 'attack')) p1.tryMelee(time);
      if (this.input2.justDown('p1', 'magic')) p1.tryMagic(time);
      if (this.input2.justDown('p1', 'use')) this.interact(p1);
      if (Phaser.Input.Keyboard.JustDown(this.dodgeKey) && p1.tryDodge(time)) this.spawnDodgeFx(p1);
      if (Phaser.Input.Keyboard.JustDown(this.abilityKey) && p1.canAbility(time)) {
        this.useAbility(p1, time);
        p1.markAbilityUsed(time);
      }
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
    const leader = this.leader();
    if (leader) {
      const ltx = Math.floor(leader.x / TILE_SIZE);
      const lty = Math.floor(leader.y / TILE_SIZE);
      if (this.flow.needsRecompute(ltx, lty) || time >= this.nextFlowAt) {
        this.flow.compute(ltx, lty);
        this.nextFlowAt = time + 400;
      }
    }
    for (const comp of this.companions) {
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
      const pathDir = leader && comp.alive ? this.flow.sample(comp.x, comp.y) : null;
      comp.aiTick(time, delta, leader, liveMonsters, pathDir);
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

  private abilityName(c: HeroClassId): string {
    const names: Record<HeroClassId, string> = { vanguard: 'Shield Slam', strider: 'Multishot', arcanist: 'Arcane Nova', warden: 'Sanctuary' };
    return names[c];
  }

  /** Per-class active ability (key F), gated by Hero cooldown. */
  private useAbility(h: Hero, time: number): void {
    const cx = h.x;
    const cy = h.y;
    if (h.classId === 'strider') {
      const base = Math.atan2(h.attackDir.y, h.attackDir.x);
      for (let i = -2; i <= 2; i++) this.fireProjectile(h, { x: Math.cos(base + i * 0.2), y: Math.sin(base + i * 0.2) }, time);
      audio.sfx('swing');
    } else if (h.classId === 'warden') {
      for (const a of this.allies) {
        if (!a.alive) continue;
        a.heal(Math.round(a.stats.maxHealth * 0.35));
        a.restoreMana(Math.round(a.stats.maxMana * 0.3));
        const fx = this.add.image(a.x, a.y - 6, 'fx-glow-green').setDepth(a.y + 8).setScale(1.3).setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({ targets: fx, alpha: 0, scale: 2.2, duration: 520, onComplete: () => fx.destroy() });
      }
      audio.sfx('shrine');
    } else {
      const radius = h.classId === 'arcanist' ? 110 : 92;
      const dmg = Math.round(h.classId === 'arcanist' ? h.magicDamage() * 1.6 : h.attackDamage().dmg * 1.8);
      const ring = this.add.sprite(cx, cy, 'fx-magic').setDepth(cy + 20).setScale((radius * 2) / 32);
      ring.play('fx-magic');
      ring.once('animationcomplete', () => ring.destroy());
      if (h.classId === 'vanguard') ring.setTint(0x9fd0ff);
      for (const m of this.monsters) {
        if (!m.active || !m.alive) continue;
        const dx = m.x - cx;
        const dy = m.y - cy;
        const l = Math.hypot(dx, dy) || 1;
        if (l <= radius) {
          const died = m.takeDamage(dmg, time);
          this.floatDamage(m.x, m.y, dmg, true);
          if (died) this.onMonsterKilled(h, m);
          else {
            m.knock((dx / l) * 220, (dy / l) * 220, time);
            m.applyStatus(h.classId === 'arcanist' ? 'chill' : 'shock', 1600, time);
          }
        }
      }
      for (const g of this.generators) {
        if (!g.alive) continue;
        if (Phaser.Math.Distance.Between(cx, cy, g.x, g.y) <= radius) g.takeDamage(dmg, time);
      }
      audio.sfx(h.classId === 'arcanist' ? 'magic' : 'hit');
    }
    const flash = this.add.image(cx, cy, 'fx-glow-warm').setScale(2.4).setAlpha(0.7).setBlendMode(Phaser.BlendModes.ADD).setDepth(cy + 10);
    this.tweens.add({ targets: flash, alpha: 0, scale: 3.4, duration: 420, onComplete: () => flash.destroy() });
    this.showBark(`${h.def.name} unleashes ${this.abilityName(h.classId)}!`);
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
    this.add.image(px, py, key).setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH.OVERLAY - 6).setDisplaySize(cw, ch).setAlpha(0.82);
    const b = this.add.graphics().setScrollFactor(0).setDepth(DEPTH.OVERLAY - 5);
    b.lineStyle(1, 0xcfa64e, 0.8);
    b.strokeRect(px - 1, py - 1, cw + 2, ch + 2);
    this.mmX = px;
    this.mmY = py;
    this.mmCW = cw;
    this.mmCH = ch;
    this.mmDots = this.add.graphics().setScrollFactor(0).setDepth(DEPTH.OVERLAY - 4);
  }

  private updateMinimap(): void {
    const g = this.mmDots;
    if (!g) return;
    g.clear();
    const mapX = (wx: number): number => this.mmX + (wx / (this.level.width * TILE_SIZE)) * this.mmCW;
    const mapY = (wy: number): number => this.mmY + (wy / (this.level.height * TILE_SIZE)) * this.mmCH;
    for (const gn of this.generators) {
      if (!gn.alive) continue;
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
    const targets = this.allies.filter((a) => a.alive);
    for (const m of this.monsters) if (m.active) m.tick(time, delta, targets);
  }

  private updateGenerators(time: number): void {
    for (const g of this.generators) if (g.alive) g.tick(time);
  }

  private resolveCombat(time: number): void {
    for (const ally of this.allies) {
      if (!ally.alive) continue;
      if (ally.attacking && !ally.meleeResolved && ally.weaponStyle() === 'melee') {
        ally.meleeResolved = true;
        const reach = ally.reach();
        const { dmg, crit } = ally.attackDamage();
        const dir = ally.attackDir;
        for (const m of this.monsters) {
          if (!m.active || !m.alive) continue;
          if (this.inArc(ally.x, ally.y, m.x, m.y, dir, reach + 8)) {
            const died = m.takeDamage(dmg, time);
            this.floatDamage(m.x, m.y, dmg, crit);
            if (died) this.onMonsterKilled(ally, m);
            else this.applyHitEffects(ally, m, dir.x, dir.y, crit, time);
          }
        }
        for (const g of this.generators) {
          if (!g.alive) continue;
          if (this.inArc(ally.x, ally.y, g.x, g.y, dir, reach + 8)) g.takeDamage(dmg, time);
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

  private fireProjectile(owner: Hero, dir: { x: number; y: number }, time: number): void {
    const arrow = owner.classId === 'strider';
    const tex = arrow ? 'fx-arrow' : 'fx-bolt';
    const speed = arrow ? 320 : 260;
    const spr = this.add
      .sprite(owner.x + dir.x * 12, owner.y + dir.y * 12, tex)
      .setDepth(owner.y + 6)
      .setScale(arrow ? 1 : 1.4);
    if (arrow) spr.setRotation(Math.atan2(dir.y, dir.x));
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
            }
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

  /** Create a monster with all combat callbacks wired (ranged/summon/nova). */
  private makeMonster(x: number, y: number, enemyId: EnemyId): Monster {
    const m = new Monster(this, x, y, enemyId);
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
    const mult = settings.get('gameplay').xpMultiplier;
    killer.gainXP(Math.round(m.def.xp * mult));
    killer.addScore(m.def.xp);
    const share = Math.round(m.def.xp * GROUP_XP_SHARE * mult);
    if (share > 0) {
      for (const a of this.allies) {
        if (a !== killer && a.alive) a.gainXP(share);
      }
    }
    // Champions always drop strong themed loot; regular foes roll by luck.
    if (m.isElite) {
      this.dropLoot(m.x, m.y, 'runed');
    } else if (!m.isBoss && Math.random() < monsterDropChance(killer.stats.luck ?? 0)) {
      const floor: Grade | undefined = m.def.xp >= 28 ? 'honed' : undefined;
      this.dropLoot(m.x, m.y, floor);
    }
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

  private spawnLootPickup(x: number, y: number, item: ItemDefinition): void {
    const color = item.grade ? GRADES[item.grade].color : '#ffe9a8';
    const tint = Phaser.Display.Color.HexStringToColor(color).color;
    const spr = this.add.image(x, y, item.icon).setDepth(y);
    const glow = this.add
      .image(x, y, 'fx-glow-warm')
      .setScale(1.5)
      .setAlpha(0.5)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(y - 1)
      .setTint(tint);
    this.tweens.add({ targets: glow, alpha: { from: 0.5, to: 0.28 }, scale: { from: 1.5, to: 1.2 }, duration: 700, yoyo: true, repeat: -1 });
    // little pop so a fresh drop reads as "new"
    spr.setScale(0);
    this.tweens.add({ targets: spr, scale: 1, duration: 240, ease: 'Back.easeOut', onComplete: () => this.floatBob(spr) });
    this.pickups.push({ sprite: spr, kind: 'item', value: 0, itemId: item.id });
    this.floatPickup(x, y - 8, item.name, color);
  }

  private onBossDeath(): void {
    this.bossAlive = false;
    const bossName = this.boss?.def.name ?? 'The warden';
    this.showBark(`${bossName} falls! The exit awakens.`);
    audio.sfx('victory');
    // The realm's warden always yields a guaranteed, high-grade themed reward.
    if (this.boss) this.dropLoot(this.boss.x, this.boss.y, 'runed');
  }

  private floatDamage(x: number, y: number, amount: number, crit: boolean): void {
    const t = this.add
      .text(x, y - 10, `${amount}`, {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: crit ? '16px' : '12px',
        color: crit ? '#ffd24a' : '#ffffff',
        fontStyle: 'bold',
        stroke: '#000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(y + 30);
    this.tweens.add({ targets: t, y: y - 28, alpha: 0, duration: 560, ease: 'Quad.easeOut', onComplete: () => t.destroy() });
  }

  private floatPickup(x: number, y: number, text: string, color: string): void {
    const t = this.add
      .text(x, y - 12, text, {
        fontFamily: 'Trebuchet MS, sans-serif',
        fontSize: '11px',
        color,
        fontStyle: 'bold',
        align: 'center',
        stroke: '#000',
        strokeThickness: 3,
      })
      .setOrigin(0.5, 1)
      .setDepth(y + 40);
    this.tweens.add({ targets: t, y: y - 40, alpha: 0, duration: 1100, ease: 'Quad.easeOut', onComplete: () => t.destroy() });
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
          this.showBark(`Picked up ${describeItem(item)}`);
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

  private interact(player: Hero): void {
    for (const ch of this.chests) {
      if (ch.opened) continue;
      const c = this.tileCenter(ch.x, ch.y);
      if (Phaser.Math.Distance.Between(player.x, player.y, c.x, c.y) < 26) {
        ch.opened = true;
        ch.sprite.setTexture('chest-open');
        // Chests reward themed, graded gear (Honed floor) tuned by the opener's luck.
        const item = rollDrop(this.level.theme ?? 'crypt', player.stats.luck ?? 0, { floor: 'honed' });
        player.inventory.add(item);
        player.refreshStats();
        this.showBark(`Found: ${describeItem(item)}`);
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
  }

  private joinPlayer2(): void {
    if (this.twoPlayer || this.players.length >= 2 || !this.barkText) return;
    const comp = this.companions.pop();
    const cls = comp ? comp.classId : 'strider';
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
        else if (src.classId === 'strider') tgt.auraCritBonus = Math.max(tgt.auraCritBonus, 0.08);
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
    }
  }

  private checkExit(): void {
    if (this.won) return;
    if (this.generatorsDestroyed < GENERATORS_TO_DESTROY || this.bossAlive) return;
    const onExit = this.players.some((p) => p.alive && this.tileAt(p.x, p.y) === Tile.EXIT);
    if (onExit) this.win();
  }

  private win(): void {
    this.won = true;
    audio.sfx('portal');
    const nextId = Content.nextLevel(this.level.id);
    if (nextId) {
      this.advanceToLevel(nextId);
      return;
    }
    audio.stopMusic();
    audio.sfx('victory');
    this.add.rectangle(PLAY_AREA_WIDTH / 2, GAME_HEIGHT / 2, PLAY_AREA_WIDTH, GAME_HEIGHT, 0x05060a, 0.7).setScrollFactor(0).setDepth(DEPTH.OVERLAY);
    this.add
      .text(PLAY_AREA_WIDTH / 2, GAME_HEIGHT / 2 - 10, 'VICTORY!', { fontFamily: 'Trebuchet MS, sans-serif', fontSize: '52px', color: '#ffe9a8', fontStyle: 'bold', stroke: '#000', strokeThickness: 6 })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.OVERLAY + 1);
    this.add
      .text(PLAY_AREA_WIDTH / 2, GAME_HEIGHT / 2 + 36, 'You have conquered the depths. Returning to menu...', { fontFamily: 'Trebuchet MS, sans-serif', fontSize: '14px', color: '#dfe6ff' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.OVERLAY + 1);
    this.time.delayedCall(3600, () => this.quitToMenu());
  }

  private advanceToLevel(nextId: string): void {
    const next = Content.getLevel(nextId);
    this.add.rectangle(PLAY_AREA_WIDTH / 2, GAME_HEIGHT / 2, PLAY_AREA_WIDTH, GAME_HEIGHT, 0x05060a, 0.7).setScrollFactor(0).setDepth(DEPTH.OVERLAY);
    this.add
      .text(PLAY_AREA_WIDTH / 2, GAME_HEIGHT / 2 - 10, 'LEVEL CLEARED', { fontFamily: 'Trebuchet MS, sans-serif', fontSize: '44px', color: '#ffe9a8', fontStyle: 'bold', stroke: '#000', strokeThickness: 6 })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.OVERLAY + 1);
    this.add
      .text(PLAY_AREA_WIDTH / 2, GAME_HEIGHT / 2 + 36, `Descending into ${next.name}...`, { fontFamily: 'Trebuchet MS, sans-serif', fontSize: '15px', color: '#dfe6ff' })
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

  private checkGameOver(): void {
    if (this.gameOverUI.isOpen() || this.won) return;
    if (!this.players.some((p) => p.alive)) {
      audio.sfx('game_over');
      const score = this.players.reduce((s, p) => s + p.score, 0);
      this.gameOverUI.open({ score, time: this.formatTime() }, () => this.continueAfterDeath(), () => this.quitToMenu());
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

  private showBark(text: string): void {
    if (!text || !this.barkText) return;
    this.barkText.setText(text).setAlpha(1);
    this.tweens.killTweensOf(this.barkText);
    this.tweens.add({ targets: this.barkText, alpha: 0, delay: 2600, duration: 700 });
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
      generatorsLeft: Math.max(0, this.generatorsTotal - this.generatorsDestroyed),
      generatorsTotal: this.generatorsTotal,
      bossAlive: this.bossAlive,
      quest: this.quest,
      levelName: this.level.name,
      twoPlayer: this.twoPlayer,
      elapsedMs: this.time.now - this.startTime,
      controls: formatHudControls(settings.bindings, this.twoPlayer),
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
      this.game.renderer.snapshotArea(0, 0, PLAY_AREA_WIDTH, GAME_HEIGHT, (img) => {
        try {
          const el = img as HTMLImageElement;
          const finish = (): void => {
            try {
              const cv = document.createElement('canvas');
              cv.width = 256;
              cv.height = 144;
              const c = cv.getContext('2d');
              if (!c) return cb(undefined);
              c.drawImage(el, 0, 0, 256, 144);
              cb(cv.toDataURL('image/jpeg', 0.5));
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
        if (it) a.inventory.equipped[slot as ItemSlot] = it;
      }
      a.recompute();
    }
  }

  private buildSave(): SaveData {
    return {
      version: 2,
      savedAt: Date.now(),
      levelId: this.level.id,
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
    Content.registerItems(data.mintedItems);

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
        if (it) a.inventory.equipped[slot as ItemSlot] = it;
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
  }
}
