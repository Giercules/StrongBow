# StrongBow — Complete Project Overview

**Version:** 0.1.0  
**Purpose:** Train AI assistants, onboard developers, and provide full project context without reading the entire codebase.  
**Companion doc:** `DESIGN.md` contains pixel-perfect rebuild specs (graphics, coordinates, audio Hz values). This document explains *what the project is*, *how it is organized*, and *how to work on it safely*.

---

## 1. Executive Summary

**StrongBow** is a browser-based, free-to-play, top-down dungeon crawler inspired by **Gauntlet II** (1986 arcade). It runs client-side (Phaser 4 + TypeScript + Vite) with an optional Express AI proxy for dynamic quest/bark text.

| Attribute | Value |
|-----------|-------|
| Canvas size | 960×540 (740px play area + 220px HUD panel) |
| Tile size | 16px |
| Camera zoom | Fixed at **1.0** (`OPTIMAL_ZOOM`) — no player zoom slider |
| Players | 1–2 local co-op + up to 3 AI companions |
| Levels shipped | 1 (`sunken_crypt`, 88×64 tiles) |
| Art | 100% procedural — no external sprite sheets |
| Audio | Web Audio API — procedural SFX + Rygar-inspired dungeon theme |
| Persistence | `localStorage` key `strongbow_settings` (audio, AI, companion AI, **key bindings**) |

**Core loop:** Enter crypt → destroy ≥3 generators → kill Grave Warden boss → escape via exit portal.

---

## 2. Product Features (v0.1.0)

### Gameplay
- Real-time melee + magic combat with arcade physics
- Light RPG: XP, leveling, equipment with **live stat bonuses**, skill trees, attribute ranks, loot rarity colors
- 4 hero classes with distinct sprites and skills
- 8 monster generators, chests, shrines, keys, locked doors, lava/water hazards
- Boss fight (Grave Warden) gating the exit portal
- **Lava** deals environmental damage over time but does **not** stunlock — heroes can walk out

### Multiplayer & AI companions
- **Solo:** P1 + 3 AI companions (all classes except P1's pick)
- **Co-op:** P1 + P2 + 2 AI companions (all classes except both picks)
- P2 can join mid-game with key `2`
- Companions **follow the active player** (tracks last input), catch up when the leader moves away, and assist in combat
- Companion AI tunable in Settings → Companions tab (follow, leash, aggression, assist range, magic, barks)

### HUD panel (right 220px — `HudScene` + `GauntletHUD`)
- 4 character slots with **XP bars**, HP/MP, growth points, gold/score
- **Controls reference** (compact box, reflects current key bindings)
- Quest text + generators-remaining footer
- Ally slots labeled `ALLY` with blue tint

### Play-area overlays (camera-fixed, pause game when open)
| Overlay | Default key | Purpose |
|---------|-------------|---------|
| **Character sheet** | P | Portrait, full stats, growth summary, equipped gear |
| **Inventory** | I / Tab (P1) | Equip backpack (1–9), unequip (↑↓ + U), consume (C), live stats |
| **Growth** | K | Spend skill points (1–3) and attribute points (4–6) |
| **Settings** | O | Audio, AI, Companions, **Controls (rebind)**, Manual launcher |
| **Game manual** | H | Nintendo-style manual — story, controls, AI guide, hero dossiers |
| **Game over** | — | Continue / menu when all active players die |

**Menu behavior:** Opening any overlay pauses physics and sets `time.timeScale = 0`. Press the **same key again** (P / I / K / O) to toggle close. ESC closes all menus (or quits to title when no menu is open).

### Rebindable controls
- Settings → Controls tab: ↑↓ select action, ←→ switch P1/P2, Enter rebind, R reset player, Shift+R reset all
- Bindings saved in `localStorage` and shown live in the HUD controls box
- Input routed through `DungeonInput` + `KeyBindings.ts`

### AI content (optional)
- Title screen shows **AI connection status** (green when proxy + provider reachable)
- Dynamic quest text in HUD footer
- Narrator barks on dungeon entry and events
- Companion flavor barks when enabled
- Fallback to hardcoded strings when no API keys

### Official in-game manual
- `GameManualUI` + `src/data/manualContent.ts` + `src/data/heroLore.ts`
- Accessible from title screen (H) or Settings → Manual tab
- Character dossiers with full backstories for all 4 classes

---

## 3. Tech Stack

| Layer | Technology |
|-------|------------|
| Game engine | Phaser 4.2.0 |
| Language | TypeScript ~6.0 |
| Bundler | Vite 8 |
| AI proxy | Express 4 + cors (port 3001) |
| Dev runner | tsx (`--env-file=.env`), concurrently |

### Commands
```bash
npm install
npm run dev          # Vite (:5173) + AI proxy (:3001) together
npm run dev:client   # Game only
npm run dev:server   # AI proxy only
npm run dev:all      # Alias for npm run dev
npm run dev:kill     # Free ports 3001, 5173–5175 (Windows)
npm run build        # tsc && vite build
npm run preview      # Production preview
```

### Environment (`.env`)
| Variable | Purpose |
|----------|---------|
| `VITE_AI_USE_PROXY` | Route AI through Express (`true` recommended) |
| `VITE_AI_PROVIDER` | `openai`, `anthropic`, `xai`, `fallback` |
| `VITE_*_API_KEY` | Direct client keys (dev only — never ship) |
| `OPENAI_API_KEY` etc. | **Server-side** keys for proxy (no `VITE_` prefix) |
| `PORT` | Proxy port (default 3001) |

The proxy loads `.env` via `loadEnvFile()` in `server/index.ts`. Vite proxies `/api` → `http://localhost:3001`.

**xAI note:** Set `VITE_AI_PROVIDER=xai` and `XAI_API_KEY=xai-...` in `.env`. Provider label syncs from env through `src/ai/aiConfig.ts` (avoids circular imports with `GameSettings`).

---

## 4. Architecture

### Scene flow
```
BootScene
  → generates all textures + animations
  → MenuScene          (AI status, H → manual)
       → CharacterSelectScene
            → DungeonScene  +  HudScene (parallel)
```

### Dual-viewport layout (critical)
```
┌──────────────────────────────────────────────────────────────┐  960 × 540
│              PLAY AREA (740px)               │  HUD (220px)  │
│  Dungeon world (scrolling camera)            │  GauntletHUD   │
│  Overlays: sheet, inventory, growth,       │  4 hero slots  │
│    settings, manual, game over             │  XP bars       │
│  Bark text (bottom)                        │  controls box  │
│  Vignette                                  │  quest footer  │
└──────────────────────────────────────────────────────────────┘
```

| Scene | Camera viewport | Scroll | Zoom |
|-------|-----------------|--------|------|
| `DungeonScene` | `(0, 0, 740, 540)` | Follows party centroid | **1.0 fixed** |
| `HudScene` | `(740, 0, 220, 540)` | Fixed | 1.0 |

### Registry keys (cross-scene state)
| Key | Type | Set by | Read by |
|-----|------|--------|---------|
| `twoPlayer` | boolean | MenuScene | CharSelect, Dungeon, HUD |
| `p1Class` | HeroClassId | CharacterSelect | DungeonScene |
| `p2Class` | HeroClassId | CharacterSelect | DungeonScene |
| `hudData` | HudRegistryData | DungeonScene (every frame) | HudScene |

**HudRegistryData:**
```typescript
{
  slots: (Hero | null)[];  // length 4
  generatorsLeft: number;
  quest: string;
  levelName: string;
  twoPlayer: boolean;
  bindings: GameBindings;    // live control labels for HUD
}
```

### HUD sync pattern (do not break)
Phaser 4 `scene.launch('HudScene')` is **queued** — it does not run synchronously in `create()`. Never call HUD methods from `DungeonScene.create()`. Instead:

1. `DungeonScene.syncHudData()` writes `hudData` to registry each `update()`
2. `HudScene.update()` reads registry and calls `GauntletHUD.update()`

### Play-area UI overlays (do not break)
Overlays use `createPlayAreaOverlay()` from `src/ui/uiHelpers.ts`:
- Container at depth `PLAY_AREA_UI_DEPTH` (9600)
- `setScrollFactor(0)` on container; `syncOverlayToCamera()` each frame for inverse-zoom sizing
- Applies to: `SettingsUI`, `InventoryUI`, `SkillTreeUI`, `CharacterSheetUI`, `GameManualUI`, `GameOverUI`

---

## 5. Directory Structure

```
StrongBow/
├── PROJECT_OVERVIEW.md     ← this file (AI training / onboarding)
├── DESIGN.md               ← full rebuild spec (graphics, audio, level data)
├── README.md               ← user-facing quick start
├── index.html
├── package.json
├── vite.config.ts
├── .env.example
├── server/
│   └── index.ts            ← Express AI proxy (/api/ai/complete, /api/health)
└── src/
    ├── main.ts
    ├── style.css
    ├── game/
    │   ├── config.ts
    │   └── main.ts
    ├── core/
    │   ├── constants.ts    ← dimensions, TILE, CLASS_HUD_COLORS, OPTIMAL_ZOOM
    │   ├── types.ts
    │   ├── KeyBindings.ts  ← defaults, rebindable actions, HUD control formatter
    │   └── GameSettings.ts ← localStorage: audio, AI, companion AI, bindings
    ├── scenes/
    │   ├── BootScene.ts
    │   ├── MenuScene.ts    ← AI connection status, manual (H)
    │   ├── CharacterSelectScene.ts
    │   ├── DungeonScene.ts ← main gameplay orchestrator
    │   └── HudScene.ts
    ├── entities/
    │   ├── Hero.ts         ← combat, XP, magic, environmental damage
    │   ├── Companion.ts    ← AI-driven ally, fx-ally aura
    │   ├── Monster.ts
    │   └── Generator.ts
    ├── systems/
    │   ├── AudioSystem.ts
    │   ├── CompanionAI.ts  ← follow / catch-up / assist combat
    │   ├── DungeonInput.ts ← key bindings, hero input, menu polling
    │   ├── ShadowSystem.ts
    │   ├── StatsSystem.ts
    │   ├── SkillSystem.ts
    │   ├── AttributeSystem.ts
    │   └── InventorySystem.ts ← equip, unequip, backpack
    ├── rendering/
    │   ├── Palette.ts
    │   ├── TextureFactory.ts
    │   ├── AnimationRegistry.ts
    │   └── LevelLighting.ts
    ├── ui/
    │   ├── uiHelpers.ts
    │   ├── GauntletHUD.ts  ← right panel + embedded controls box
    │   ├── CharacterSheetUI.ts
    │   ├── InventoryUI.ts
    │   ├── SkillTreeUI.ts
    │   ├── SettingsUI.ts   ← 5 tabs incl. controls rebind + manual
    │   ├── GameManualUI.ts
    │   └── GameOverUI.ts
    ├── data/
    │   ├── heroes.ts
    │   ├── heroLore.ts     ← character dossier backstories
    │   ├── manualContent.ts
    │   ├── pickupInfo.ts   ← item/pickup descriptions + stat summaries
    │   ├── enemies.ts
    │   ├── items.ts        ← 12 items (incl. crypt_knife)
    │   ├── skills.ts
    │   ├── attributes.ts
    │   ├── affixes.ts      ← defined but not rolled in combat
    │   └── level1.ts
    ├── content/
    │   └── ContentRegistry.ts
    └── ai/
        ├── aiConfig.ts     ← env provider defaults (no GameSettings cycle)
        ├── AIService.ts
        ├── AIProvider.ts
        ├── OpenAIProvider.ts, AnthropicProvider.ts, XAIProvider.ts
        ├── ProxyAIProvider.ts
        └── FallbackProvider.ts
```

---

## 6. Game Systems Reference

### Tile types (`constants.ts`)
| Value | Name | Behavior |
|-------|------|----------|
| 0 | VOID | Not rendered |
| 1 | FLOOR | Walkable |
| 2 | WALL | Blocks movement |
| 3 | DOOR | Walkable |
| 4 | LOCKED_DOOR | Needs key |
| 5 | WATER | Walkable, speed ×0.7 |
| 6 | LAVA | Environmental damage over time (no hurt stunlock) |
| 7 | EXIT | Win portal (boss must be defeated) |

### Combat (implemented)
- **Melee:** bound attack key (default Z / RCtrl), cooldown `350 - attackSpeed*100` ms, range `20 + cleaveRank*4`
- **Magic:** bound magic key (default Q / Enter), 15 mana, 96×96 AOE, 300ms active window
- **Combat damage:** `max(1, raw - armor*0.5)`, 800ms iFrames, hurt stunlock
- **Environmental damage:** `takeEnvironmentalDamage()` — armor mitigates 15%, no stunlock
- **Monster AI:** chase within 300px, attack at 22px, 1000ms cooldown

### Stats formula (`StatsSystem`)
Equipment, skills, and attributes sum into a merged `StatBlock`. Level scaling:
```
levelsGained = max(0, level - 1)
maxHealth = base.maxHealth + gear/skills/attrs + levelsGained * HP_PER_LEVEL  (12)
maxMana   = base.maxMana   + gear/skills/attrs + levelsGained * MP_PER_LEVEL  (6)
damage    = base.damage    + gear/skills/attrs
speed     = base.speed     + gear moveSpeed bonuses
```
`Hero.refreshStats()` recomputes after equip, unequip, level-up, or growth spending.

### Equipment & inventory
- Pickups add items to **backpack**; equip from inventory (1–9)
- Equipping swaps previous item back to backpack and calls `refreshStats()`
- **Unequip:** ↑↓ select equipment slot, **U** returns item to backpack
- Items show stat bonuses in UI (e.g. `Crypt Knife (+7 damage, +0.03 crit chance)`)
- `describeItem()` / `describeItemStats()` in `pickupInfo.ts` power pickup barks and tooltips

### Win / loss
- **Win:** `generatorsDestroyed >= 3` AND boss dead → step on EXIT tile → MenuScene
- **Loss:** P1 dead (solo) OR P1+P2 dead (co-op joined) → GameOverUI
- **Continue:** revive players at 50% HP, companions at 40% HP at entry spawn
- Companion death alone does NOT trigger game over

### Companion AI defaults (`GameSettings`)
| Setting | Default | Range |
|---------|---------|-------|
| followDistance | 48px | 24–96 |
| leashDistance | 130px | 60–220 |
| aggression | 0.65 | 0.1–1.0 |
| assistRange | 90px | 40–160 |
| useMagic | true | bool |
| aiBarks | true | bool |

**Follow logic:** Tracks `leaderPlayerIndex` (last hero with input). Prioritizes catching up when leader moves away or exceeds leash. Only engages monsters when close enough to leader. P2 colliders added on `joinPlayer2()`, not while P2 body is disabled.

### Pause system (`refreshPauseState`)
When any overlay is open: `physics.pause()`, `time.timeScale = 0`.  
Menu toggle keys still polled while paused (except during key-rebind capture in Settings).

---

## 7. Input Bindings

**Authoritative source:** `src/core/KeyBindings.ts` + saved `gameSettings.bindings`.  
Defaults below; all rebindable in Settings → Controls.

### Player 1 (defaults)
| Key | Action |
|-----|--------|
| WASD | Move |
| Z (hold) | Attack |
| E | Use / interact |
| Q | Magic |
| P | Character sheet (toggle) |
| I / Tab | Inventory (toggle) |
| K | Growth / skill tree (toggle) |
| O | Settings (toggle) |
| H | Game manual |

### Player 2 (defaults)
| Key | Action |
|-----|--------|
| Arrows | Move |
| RCtrl (hold) | Attack |
| RShift | Use |
| Enter | Magic |
| ; | Character sheet |
| M | Inventory |
| \ | Growth |

### In inventory UI
| Key | Action |
|-----|--------|
| 1–9 | Equip backpack item (swaps with current slot) |
| ↑↓ | Select equipment slot |
| U | Unequip selected slot to backpack |
| C | Consume first consumable |
| I / Tab | Close inventory |

### In growth UI
| Key | Action |
|-----|--------|
| 1–3 | Upgrade class skill |
| 4–6 | Upgrade attribute |
| K | Close growth |

### Global (dungeon)
| Key | Action |
|-----|--------|
| 2 | Join P2 |
| ESC | Close manual/settings → close all UI → quit to menu |
| C / M | Continue / Menu (game over) |

> `constants.ts` `PLAYER_KEYS_P1.attack` still says `SPACE` — **stale**; real default is Z via `KeyBindings.ts`.

---

## 8. Hero Classes

| ID | Name | Role | HP | MP | DMG | SPD | Signature |
|----|------|------|----|----|-----|-----|-----------|
| vanguard | Vanguard | Tank | 120 | 40 | 14 | 130 | armor 4 |
| thief | Thief | Rogue | 90 | 30 | 12 | 150 | crit 10%, backstab/sneak/lockpick |
| arcanist | Arcanist | Mage | 70 | 100 | 8 | 120 | fire 6 |
| warden | Warden | Support | 100 | 80 | 10 | 125 | regen 0.5 |

Skills: 3 per class — see `src/data/skills.ts`. Attributes: 3 per hero — see `src/data/attributes.ts`. Full lore in `src/data/heroLore.ts`.

---

## 9. Items & Content

### Notable items (`src/data/items.ts` — 12 total)
| ID | Slot | Stat highlights |
|----|------|-----------------|
| crypt_knife | weapon | +7 damage, +3% crit (level 1 pickup) |
| rusty_blade | weapon | +4 damage |
| crypt_cleaver | weapon | +12 damage, cleave effect (vanguard) |
| shadow_fang | weapon | +9 damage, crit (thief dagger) |
| ember_staff | weapon | +8 damage, fire, +mana (arcanist) |
| grave_plate | chest | +12 armor, +25 HP, thorns |
| amulet_of_vitality | amulet | +20 HP, regen |
| food_ration / mana_vial | consumable | heal / restore mana |

### Enemies
| ID | Name | HP | Sprite sheet |
|----|------|-----|--------------|
| grunt | Crypt Grunt | 30 | monster-grunt-sheet |
| ghost | Wailing Shade | 20 | monster-ghost-sheet |
| demon | Pit Demon | 55 | monster-demon-sheet |
| grave_warden | Grave Warden | 400 | monster-boss-sheet |

**Adding content:** Define in `src/data/*.ts` → register in `ContentRegistry.ts` → reference by ID in level spawns.

---

## 10. Graphics Pipeline

All art is generated in `BootScene.create()`:
```
TextureFactory.generateAll(scene)
AnimationRegistry.register(scene)
scene.start('MenuScene')
```

- **39 texture keys** — tiles, heroes, monsters, objects, items, FX, decor
- **16×16 native** — fixed camera zoom 1.0
- **Y-sort depth:** `sprite.setDepth(sprite.y)` for world entities
- **Dynamic shadows:** `ShadowSystem` attaches `fx-shadow` ellipse
- **Level lighting:** `LevelLighting` per-tile tints
- **Palette:** `src/rendering/Palette.ts`

Full pixel recipes: `DESIGN.md` §26.

---

## 11. Audio

Singleton `audio` exported from `AudioSystem.ts`.

- **SFX:** 20 procedural sound IDs
- **Music:** Rygar-inspired 64-step A-minor loop; separate menu and dungeon themes
- **Settings:** mute, music on/off, volume — Settings → Audio tab
- Music starts in `DungeonScene.create()`, stops on scene shutdown

---

## 12. AI Integration

```
AIService (singleton, aiService)
  ├─ checkConnection() → title screen status (green/red)
  ├─ ProxyAIProvider × 3 (if VITE_AI_USE_PROXY)
  └─ Direct providers + FallbackProvider
```

| Method | When used |
|--------|-----------|
| `generateQuest` | Dungeon load → HUD quest footer |
| `generateBark` | Entry, events |
| `generateCompanionBark` | Companion combat (if enabled) |
| `generateItemFlavor` | Loot flavor (attempts always) |
| `checkConnection` | MenuScene title — proxy health + provider probe |

Proxy: `POST /api/ai/complete` · Health: `GET /api/health`

Tone: *"short, punchy, arcade-flavored Gauntlet narrator"*

---

## 13. DungeonScene Responsibilities

`DungeonScene.ts` is the central orchestrator. Key methods:

| Method | Role |
|--------|------|
| `renderLevel()` | Tile loop, wall physics, torch placement |
| `spawnWorldEntities()` | Generators, chests, shrines, NPC, portal |
| `spawnPickups()` | Floating pickup tweens |
| `createHeroes()` / `createCompanions()` | Party spawn + colliders |
| `syncHudData()` | Registry write (slots, quest, **bindings**) |
| `update()` | Input, companion AI, camera, combat, hazards |
| `wireDungeonInput()` | Menu toggles via `DungeonInput` events |
| `refreshPauseState()` | Pause physics + timeScale when overlay open |
| `getPartyLeader()` | Active player for companion follow |
| `resolveCombat()` | Hitbox overlap, magic AOE |
| `checkHazards()` | Lava environmental damage, water slow |
| `checkExit()` / `checkGameOver()` | Win/loss flow |

When modifying gameplay, start here and trace into entities/systems.

---

## 14. Known Gaps & Gotchas

### Unimplemented (data exists, code does not apply)
- Critical hit rolls in combat
- Item effects (`burn`, `cleave` splash) on hit
- Affix procedural loot rolling
- `lifesteal`, `thorns` reactive damage

### Stale / legacy
- `constants.ts` `PLAYER_KEYS_*` — attack key wrong (use `KeyBindings.ts`)

### Phaser pitfalls (learned in production)
1. **Never sync HUD via cross-scene method calls in `create()`** — use registry
2. **`scene.launch` is async** — HudScene may not exist on same frame
3. **Menu keys must poll while paused** — otherwise P/I/K/O cannot close overlays
4. **Settings rebind capture** — skip menu polling while `isWaitingForKey()`
5. **P2 colliders** — do not collider companions with disabled P2 body until joined
6. **Lava** — use `takeEnvironmentalDamage`, not `takeDamage`, to avoid stunlock trap

### Decorative only
- NPC Elder Mora at (8,8) — grey warden sprite, no dialogue

---

## 15. Visual Design Language

Inspired by **Gauntlet II** (not a ROM rip):
- Brown dithered floors, blue grid walls
- Green horned grunts, wavy ghost bottoms
- Black right HUD with ivy chrome, gold headers
- **Controls reference embedded in HUD** (compact box, no left overlay)
- Vignette overlay (depth 8500) on play area
- Character sheet with class-colored portrait frame

---

## 16. Settings Persistence

**localStorage key:** `strongbow_settings`

```typescript
{
  aiProvider: 'openai' | 'anthropic' | 'xai' | 'fallback';
  aiQuestEnabled: boolean;
  aiBarksEnabled: boolean;
  muted: boolean;
  musicEnabled: boolean;   // default true
  musicVolume: number;     // default 0.45
  companionAI: CompanionAISettings;
  bindings: GameBindings;  // full P1/P2 rebindable key map
}
```

Legacy `zoom` field in saved JSON is ignored on load (zoom removed from settings UI).

---

## 17. How to Extend the Project

### Add a new level
1. Create `src/data/levelN.ts` with `LevelData`
2. Register in `ContentRegistry.levels`
3. Start dungeon with `ContentRegistry.getLevel('your_id')`

### Add a hero class
1. Define in `heroes.ts`, `skills.ts`, `heroLore.ts`
2. Add `CLASS_HUD_COLORS` + texture/animation entries
3. Add to `ALL_CLASSES` in `DungeonScene` and `CharacterSelectScene`
4. Add manual page via `heroPage()` in `manualContent.ts`

### Add an item
1. Define in `items.ts` with `stats` block
2. Place in `level1.ts` pickups or chest loot tables
3. Pickup bark auto-describes via `pickupInfo.ts`

### Add UI overlay
1. Create in `src/ui/` using `createPlayAreaOverlay()`
2. Wire toggle in `DungeonScene.wireDungeonInput()` or `setupInput()`
3. Add to `refreshPauseState()` pause list
4. Depth: `PLAY_AREA_UI_DEPTH` (9600)

### Add / change a key binding
1. Add action to `PlayerAction` + `REBINDABLE_ACTIONS` in `KeyBindings.ts`
2. Add default in P1/P2 defaults
3. Handle in `DungeonInput` (gameplay or `pollMenuActions`)
4. Add label in `ACTION_LABELS` and Settings controls tab refresh

---

## 18. Development History (context for AI)

Chronological feature and fix arc:

1. **HUD invisible** — parallel `HudScene` + 220px right viewport
2. **Freeze after char select** — registry HUD sync; no sync in `create()`
3. **AI companions** — 3 solo / 2 co-op, `CompanionAI` + Settings tab
4. **Death screen** — `GameOverUI` continue/menu
5. **Settings off-screen** — play-area overlay helpers (`uiHelpers.ts`)
6. **Music** — Rygar-inspired 64-step heroic theme
7. **Zoom removed** — fixed `OPTIMAL_ZOOM = 1.0`
8. **Controls moved to HUD** — embedded in `GauntletHUD`; left `ControlsPanel` removed
9. **XP / leveling HUD** — XP bars and level display per slot
10. **Character sheet (P)** — portrait, stats, growth, gear summary
11. **Game manual (H)** — `GameManualUI`, lore dossiers, AI setup guide
12. **Rebindable controls** — `KeyBindings.ts`, Settings Controls tab, `DungeonInput`
13. **Menu pause** — physics + `timeScale` freeze; toggle-close on same key
14. **Lava trap fix** — environmental damage without hurt stunlock
15. **Title AI status** — green indicator when proxy + provider connected
16. **xAI / .env fixes** — `aiConfig.ts`, server `loadEnvFile`, `npm run dev` runs both processes
17. **Companion follow fix** — active-player leader, catch-up priority, P2 collider timing
18. **Inventory unequip** — ↑↓ + U; gear stat bonuses shown in UI
19. **HUD layout** — taller character slots, smaller controls box (overflow fix)
20. **crypt_knife** — example weapon pickup with +damage

---

## 19. Build Verification

Always run after changes:
```bash
npm run build
```

Manual smoke test:
- [ ] Menu loads with AI status line
- [ ] H opens manual on title screen
- [ ] Char select → dungeon loads
- [ ] HUD visible (4 slots, XP bars, controls box, quest, generators)
- [ ] P / I / K / O open and **close** overlays with same key
- [ ] O → Controls: rebind a key → HUD controls text updates
- [ ] Companions follow active player and fight
- [ ] Pick up crypt_knife → equip → damage stat increases → U unequips
- [ ] Lava damages but hero can walk out
- [ ] Music plays in dungeon
- [ ] Death → continue works
- [ ] Boss + 3 generators → exit portal wins

---

## 20. Document Map

| File | Use when |
|------|----------|
| `PROJECT_OVERVIEW.md` | Project structure, conventions, gotchas, extension patterns |
| `DESIGN.md` | Rebuilding graphics/audio/UI to exact pixel and Hz specs |
| `README.md` | End-user quick start (may lag behind — this doc is authoritative for devs) |
| `src/data/manualContent.ts` | In-game manual text |
| `src/core/KeyBindings.ts` | Default and rebindable control map |
| `src/scenes/DungeonScene.ts` | Gameplay behavior and orchestration |

---

## 21. Quick Reference — Key Constants

```typescript
TILE_SIZE = 16
PLAY_AREA_WIDTH = 740
HUD_PANEL_WIDTH = 220
GAME_WIDTH = 960
GAME_HEIGHT = 540
OPTIMAL_ZOOM = 1.0        // fixed, not adjustable
HP_PER_LEVEL = 12
MP_PER_LEVEL = 6
PLAY_AREA_UI_DEPTH = 9600
```

Registry: `HUD_REGISTRY_KEY = 'hudData'`

---

*End of StrongBow Project Overview v0.1.0 — suitable for AI training and developer onboarding.*