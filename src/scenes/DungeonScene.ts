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
  OPTIMAL_ZOOM,
  AURA_RADIUS,
  WARDEN_HEAL_INTERVAL,
  GROUP_XP_SHARE,
} from '../core/constants';
import * as art from '../rendering/spriteArt';
import { settings } from '../core/GameSettings';
import { formatHudControls } from '../core/KeyBindings';
import type { HeroClassId, LevelData, HudRegistryData, HudHeroSlot, ItemDefinition, ItemSlot } from '../core/types';
import { Content } from '../content/ContentRegistry';
import { ALL_CLASSES } from '../data/heroes';
import { ITEMS } from '../data/items';
import { describeItem } from '../data/pickupInfo';
import { Hero } from '../entities/Hero';
import { Companion } from '../entities/Companion';
import { Monster } from '../entities/Monster';
import { Generator } from '../entities/Generator';
import { ShadowSystem } from '../systems/ShadowSystem';
import { DungeonInput } from '../systems/DungeonInput';
import { saveGame } from '../systems/SaveSystem';
import type { SaveData, SaveAlly } from '../systems/SaveSystem';
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

  private escKey!: Phaser.Input.Keyboard.Key;
  private continueKey!: Phaser.Input.Keyboard.Key;
  private menuKey!: Phaser.Input.Keyboard.Key;

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

  constructor() {
    super('DungeonScene');
  }

  create(): void {
    this.resetState();
    this.twoPlayer = this.registry.get('twoPlayer') ?? false;
    const save = this.registry.get('loadSave') as SaveData | undefined;
    this.level = Content.getLevel('sunken_crypt');

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
    this.setupColliders();

    this.cameraTarget = this.add.rectangle(this.players[0].x, this.players[0].y, 2, 2, 0, 0);
    this.cameras.main.startFollow(this.cameraTarget, true, 0.12, 0.12);
    this.cameras.main.setZoom(OPTIMAL_ZOOM);
    this.cameras.main.fadeIn(260, 0, 0, 0);

    this.add.image(PLAY_AREA_WIDTH / 2, GAME_HEIGHT / 2, 'fx-vignette').setScrollFactor(0).setDepth(DEPTH.VIGNETTE);

    // soft warm light that travels with the party so heroes are always lit
    this.partyLight = this.add
      .image(this.cameraTarget.x, this.cameraTarget.y, 'fx-light')
      .setScale(2.6)
      .setAlpha(0.3)
      .setTint(0xfff0d0)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(DEPTH.VIGNETTE - 1);

    this.input2 = new DungeonInput(this);
    this.inventoryUI = new InventoryUI(this);
    this.skillsUI = new SkillTreeUI(this);
    this.sheetUI = new CharacterSheetUI(this);
    this.manualUI = new GameManualUI(this);
    this.gameOverUI = new GameOverUI(this);
    this.settingsUI = new SettingsUI(this, { input: this.input2, onOpenManual: () => this.manualUI.open() });
    const kb = this.input.keyboard!;
    this.escKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.continueKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.C);
    this.menuKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.M);
    kb.on('keydown-F2', () => this.quickSave());

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
    audio.playMusic('dungeon');
    this.startTime = this.time.now;

    this.quest = 'Destroy the generators and slay the Grave Warden.';
    if (!save) void aiService.generateQuest(this.level.name).then((q) => { if (q) this.quest = q; });
    void aiService.generateBark('the heroes enter the sunken crypt').then((b) => this.showBark(b));

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
  }

  private tileCenter(tx: number, ty: number): { x: number; y: number } {
    return { x: tx * TILE_SIZE + TILE_SIZE / 2, y: ty * TILE_SIZE + TILE_SIZE / 2 };
  }

  private renderLevel(): void {
    const t = this.level.tiles;
    const W = this.level.width;
    const H = this.level.height;
    const isWall = (x: number, y: number) => y >= 0 && y < H && x >= 0 && x < W && t[y][x] === Tile.WALL;

    // Pre-render the whole floor/wall layer onto ONE canvas texture and show it as
    // a single image. (Phaser 4 RenderTexture.draw did not stamp here -> dark map.)
    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = W * TILE_SIZE;
    bgCanvas.height = H * TILE_SIZE;
    const bgCtx = bgCanvas.getContext('2d')!;
    bgCtx.imageSmoothingEnabled = false;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const tile = t[y][x];
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;
        if (tile === Tile.VOID) continue;
        if (tile === Tile.WALL) {
          art.drawWall(bgCtx, px, py, !isWall(x, y - 1), x * 7 + y * 13);
          continue;
        }
        art.drawFloor(bgCtx, px, py, x * 131 + y * 17 + 1000);
        if (tile === Tile.DOOR) art.drawDoor(bgCtx, px, py, false);
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
          bgCtx.fillStyle = '#16234a';
          bgCtx.fillRect(px, py, TILE_SIZE, 9);
          bgCtx.fillStyle = '#7d96d8';
          bgCtx.fillRect(px, py, TILE_SIZE, 1);
          bgCtx.fillStyle = '#2c4080';
          bgCtx.fillRect(px, py + 1, TILE_SIZE, 3);
          bgCtx.fillStyle = '#1b2a55';
          bgCtx.fillRect(px, py + 5, TILE_SIZE, 3);
          bgCtx.fillStyle = '#070b1c';
          bgCtx.fillRect(px, py + 4, TILE_SIZE, 1);
          for (let mx = px + 3; mx < px + TILE_SIZE; mx += 6) {
            bgCtx.fillStyle = '#070b1c';
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
        } else if (tile === Tile.EXIT) {
          this.add.sprite(c.x, c.y, 'portal-sheet').play('portal').setScale(1.2).setDepth(DEPTH.FLOOR + 3);
          this.add.image(c.x, c.y, 'fx-glow-magic').setScale(3).setAlpha(0.5).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.FLOOR + 2);
        } else if (tile === Tile.LOCKED_DOOR) {
          const spr = this.add.image(c.x, c.y, 'locked-door').setDepth(c.y);
          const rect = this.addBlocker(c.x, c.y, TILE_SIZE, TILE_SIZE);
          this.lockedDoors.push({ rect, sprite: spr, x, y, open: false });
        }
        if (tile === Tile.WALL && y + 1 < H && t[y + 1][x] === Tile.FLOOR && (x * 5 + y) % 5 === 0) {
          this.add.sprite(c.x, c.y + 6, 'torch-sheet').play('torch').setDepth(c.y + 2);
          const light = this.add
            .image(c.x, c.y + 16, 'fx-light')
            .setScale(1.7)
            .setAlpha(0.5)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setDepth(DEPTH.VIGNETTE - 1);
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
          const boss = new Monster(this, c.x, c.y, sp.enemyId ?? 'grave_warden');
          this.boss = boss;
          this.bossAlive = true;
          boss.onDeath = () => this.onBossDeath();
          this.monsters.push(boss);
          this.monsterGroup.add(boss);
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
      const m = new Monster(this, g.x + Phaser.Math.Between(-8, 8), g.y + Phaser.Math.Between(-4, 10), g.enemyId);
      this.monsters.push(m);
      this.monsterGroup.add(m);
      this.shadows.add(m, 4);
      return m;
    };
    gen.onDestroyed = () => {
      this.generatorsDestroyed++;
      this.showBark('A generator is destroyed!');
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
    this.syncHudData();
  }

  private anyOverlayOpen(): boolean {
    return (
      this.inventoryUI.isOpen() ||
      this.skillsUI.isOpen() ||
      this.settingsUI.isOpen() ||
      this.gameOverUI.isOpen() ||
      this.sheetUI.isOpen() ||
      this.manualUI.isOpen()
    );
  }

  private closeAllOverlays(): void {
    if (this.inventoryUI.isOpen()) this.inventoryUI.close();
    if (this.skillsUI.isOpen()) this.skillsUI.close();
    if (this.settingsUI.isOpen()) this.settingsUI.close();
    if (this.sheetUI.isOpen()) this.sheetUI.close();
    if (this.manualUI.isOpen()) this.manualUI.close();
  }

  private pollMenus(): void {
    if (this.input2.capturing || this.gameOverUI.isOpen()) return;

    if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
      if (this.manualUI.isOpen()) this.manualUI.close();
      else if (this.anyOverlayOpen()) this.closeAllOverlays();
      else this.quitToMenu();
      return;
    }

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
      p1.setMoveInput(m.x, m.y);
      if (m.x || m.y) this.activeIdx = 0;
      if (this.input2.isDown('p1', 'attack')) p1.tryMelee(time);
      if (this.input2.justDown('p1', 'magic')) p1.tryMagic(time);
      if (this.input2.justDown('p1', 'use')) this.interact(p1);
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
    for (const comp of this.companions) comp.aiTick(time, delta, leader, liveMonsters);
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
      }
    }
    for (const g of this.generators) {
      if (!g.alive) continue;
      if (Phaser.Math.Distance.Between(ally.x, ally.y, g.x, g.y) <= radius) g.takeDamage(dmg, time);
    }
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
  }

  private onBossDeath(): void {
    this.bossAlive = false;
    this.showBark('The Grave Warden falls! The exit awakens.');
    audio.sfx('victory');
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
      ally.speedMult = tile === Tile.WATER ? WATER_SPEED_MULT : 1;
      if (tile === Tile.LAVA) {
        const next = this.lavaTick.get(ally) ?? 0;
        if (time >= next) {
          this.lavaTick.set(ally, time + 500);
          const dealt = ally.takeEnvironmentalDamage(LAVA_DPS * 0.5);
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
      } else if (p.kind === 'food') {
        collector.heal(p.value);
        audio.sfx('coin');
      } else if (p.kind === 'potion' && p.itemId) {
        const item = ITEMS[p.itemId];
        if (item) collector.inventory.add(item);
        audio.sfx('coin');
      } else if (p.kind === 'item' && p.itemId) {
        const item = ITEMS[p.itemId];
        if (item) {
          collector.inventory.add(item);
          collector.refreshStats();
          this.showBark(`Picked up ${describeItem(item)}`);
        }
        audio.sfx('chest');
      } else if (p.kind === 'key') {
        collector.inventory.addKey(p.value);
        audio.sfx('key');
        this.showBark('A rusted key - a door waits somewhere.');
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
        d.open = true;
        const body = d.rect.body as Phaser.Physics.Arcade.StaticBody | null;
        if (body) body.enable = false;
        this.level.tiles[d.y][d.x] = Tile.FLOOR;
        this.tweens.add({ targets: d.sprite, alpha: 0, duration: 250, onComplete: () => d.sprite.destroy() });
        audio.sfx('door');
        this.showBark('The locked door grinds open.');
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
        const item = ITEMS[ch.itemId];
        if (item) {
          player.inventory.add(item);
          player.refreshStats();
          this.showBark(`Found: ${describeItem(item)}`);
          void aiService.generateItemFlavor(item.name);
        }
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
    audio.stopMusic();
    audio.sfx('victory');
    this.add.rectangle(PLAY_AREA_WIDTH / 2, GAME_HEIGHT / 2, PLAY_AREA_WIDTH, GAME_HEIGHT, 0x05060a, 0.7).setScrollFactor(0).setDepth(DEPTH.OVERLAY);
    this.add
      .text(PLAY_AREA_WIDTH / 2, GAME_HEIGHT / 2 - 10, 'VICTORY!', { fontFamily: 'Trebuchet MS, sans-serif', fontSize: '52px', color: '#ffe9a8', fontStyle: 'bold', stroke: '#000', strokeThickness: 6 })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.OVERLAY + 1);
    this.add
      .text(PLAY_AREA_WIDTH / 2, GAME_HEIGHT / 2 + 36, 'You escaped the Sunken Crypt. Returning to menu...', { fontFamily: 'Trebuchet MS, sans-serif', fontSize: '14px', color: '#dfe6ff' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.OVERLAY + 1);
    this.time.delayedCall(3600, () => this.quitToMenu());
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
      const f = 0.46 + Math.sin(time * 0.009 + ph) * 0.12 + (Math.random() - 0.5) * 0.06;
      L.setAlpha(Phaser.Math.Clamp(f, 0.22, 0.66));
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

  private quickSave(): void {
    if (this.won || this.gameOverUI.isOpen()) return;
    const ok = saveGame(this.buildSave());
    this.showBark(ok ? 'Progress saved.' : 'Save failed (storage blocked).');
    audio.sfx('ui_select');
  }

  private buildSave(): SaveData {
    const toSave = (a: Hero): SaveAlly => ({
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
    });
    return {
      version: 1,
      savedAt: Date.now(),
      levelId: this.level.id,
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
      allies: this.allies.map(toSave),
    };
  }

  private applySave(data: SaveData): void {
    this.quest = data.quest || this.quest;
    this.startTime = this.time.now - (data.elapsedMs || 0);

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
      a.inventory.bag = sv.bag.map((id) => ITEMS[id]).filter(Boolean);
      a.inventory.equipped = {};
      for (const [slot, id] of Object.entries(sv.equipped)) {
        const it = ITEMS[id];
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
