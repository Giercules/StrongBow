# StrongBow

A browser-based, top-down arcade dungeon crawler with a mystical **Dungeons &
Dragons** feel — **100% procedural pixel art**, an **epic procedural NES-style
soundtrack**, and a ten-realm campaign. Built with Phaser 4 + TypeScript + Vite.
All original art and audio.

![Sprite atlas](docs/sprite-atlas.png)

## Quick start

```bash
npm install
npm run dev        # game on http://localhost:5173 + AI proxy on :3847
```

Open the URL, click **1 Player** or **2 Players**, pick a hero, and descend.
Click once on the page to enable audio (browser autoplay policy). For the
DnD-flavored fonts (Cinzel + MedievalSharp) to show, allow the page to reach
Google Fonts on first load; it falls back gracefully offline.

### Commands
```bash
npm run dev          # game + AI proxy together
npm run dev:client   # game only (Vite)
npm run dev:server   # AI proxy only
npm run dev:kill     # free ports 3847 / 5173-5175
npm run build        # type-check (tsc) + production build to dist/
npm run preview      # serve the production build
```

## Controls

Fully playable with **mouse only**, or keyboard, or both.

**Mouse:** hold **Left** to walk toward the cursor · **Right** to attack toward
the cursor · **double Right-click** to cast magic.

**Keyboard (Player 1, all rebindable in Settings → Controls):**

| Action | Player 1 | Player 2 |
|---|---|---|
| Move | W A S D | Arrow keys |
| Attack (hold) | Z | / |
| Magic | Q | Enter |
| Dodge roll | Space | — |
| Class ability | F | — |
| Use / examine | E | Right Shift |
| Character sheet | P | ; |
| Inventory | I / Tab | M |
| Growth | K | \ |

Global: **O** settings · **H** manual · **F2** save/load window · **2** add
Player 2 · **Esc** close menu / quit. Inventory pages with **←/→** and tidies
with **S**. Camera zoom is fixed for a consistent arcade frame.

## The Descent into the Undermaw

An ancient hunger — the **Undermaw** — wakes beneath the world; its seals leak
the dead through spawning altars across **ten descending realms**. Clear a
realm's altars, slay its warden, and step on the exit portal to **descend with
your whole party's levels, skills, attributes, gold, and gear intact**.

| # | Realm | Warden |
|---|---|---|
| I | The Sunken Crypt | The Grave Warden |
| II | The Molten Deep | The Molten Colossus |
| III | The Frozen Cathedral | The Rime Cantor |
| IV | The Toxic Undercroft | The Rot Sovereign |
| V | The Clockwork Vault | Brass Magnus |
| VI | The Blood Arena | The Undying Champion |
| VII | The Drowned Bog | The Mire Leviathan |
| VIII | The Storm Spire | The Tempest Herald |
| IX | The Shadow Warren | The Umbral Devourer |
| X | Sanctum of the Undermaw | The Hollow King |

Each realm has its own walls, floors, decor, hazards, enemy roster, boss,
themed loot, music, lighting, ambient particles, and screen-edge color grade.

**To clear a realm:** destroy at least **3 spawning altars**, slay the
**warden**, then reach the **exit portal**. Your whole party — including ranged
allies — can target and break the altars. Hazards (fire, ice, sludge, spikes)
hurt but never trap you.

## Heroes

Four iconic archetypes, each with a distinct silhouette, weapon, group aura, and
active ability (**F**):

- **Vanguard** — a Conan-style barbarian; bare-chested brawler with a great
  broadsword. Tanks blows, **Shield Slam** knockback nova, shields nearby allies.
- **Strider** — a Drizzt-style drow ranger; grey-skinned, white-haired, cloaked,
  with a bow. High crit/speed, **Multishot** arrow fan, sharpens allies' aim.
- **Arcanist** — a Merlin-style wizard; blue robe, tall hat, long beard, gem
  staff. Deep mana + fire magic, **Arcane Nova** AOE, empowers allies' blows.
- **Warden** — a hooded holy cleric; cream-and-gold robe, mace, sacred light.
  Steady regen, **Sanctuary** party heal.

Solo play grants 3 AI companions, co-op grants 2. They follow the active player,
path around corners, **spread out naturally** instead of stacking, fight, target
altars, and **blink to you** if they fall too far behind.

## Combat & feel

- **Dodge roll (Space)** with brief invulnerability; **knockback** on hits;
  weighty melee feedback — screen shake, impact bursts, and a **crit zoom-punch**.
- **On-hit elements:** fire weapons **Burn** (damage over time), magic **Chills**
  (slows), critical hits **Shock** (extra damage taken).
- **Champion enemies** — gold-glowing elites with ~2.3× HP and harder hits that
  always drop strong themed gear.
- **Bosses** cycle telegraphed patterns — radial volleys, summons, flame novas —
  that scale with their health. Watch for the wind-up flash.

## Loot, grades & Fortune

- Foes, altars, chests, and bosses drop **gear themed to the realm**, in five
  grades: **Cracked · Honed · Runed · Ascendant · Godforged** — each stronger,
  with more bonus affixes.
- The **Fortune** attribute (Luck) raises drop rate and tilts rolls toward the
  higher grades.
- **Growth (K):** raise class skills and the attributes Might / Vitality / Focus
  / Fortune. **Inventory (I):** equip (1-9), unequip (U), drink (C), page (←/→),
  sort (S). **Character sheet (P):** full stats and gear.

## Examine anything

Press **Use (E)** next to decor, hazards, the gate-warden NPC, or any tile to
**examine** it and receive grim, DnD-flavored lore — augmented by AI narration
when a provider is connected.

## Multi-slot saves with screenshots

Press **F2** for the **Save/Load window**: six slots, each previewed with a
**screenshot** plus details (realm, party, playtime, date). Save, overwrite,
load, or delete. The title screen's **Load Game** opens the same browser.

## Minimap & HUD

A live **minimap** (top-right) shows the party, remaining altars, the boss, and
the exit. The right panel tracks each hero's HP/MP/XP, gold, and a controls box.

## Epic audio

The soundtrack and SFX are synthesized live via the Web Audio API — long,
multi-phrase **NES-style heroic ballads** with a two-voice harmony, plus
distinct per-realm themes and an intense boss theme. Drop `theme.mp3` /
`boss.mp3` / `menu.mp3` into `public/audio/` to override with real tracks.

## Procedural art (and optional overrides)

All art is generated in code. To swap any piece for a PNG, add an entry to
`public/assets/manifest.json` (e.g. `hero-vanguard-sheet`, `ext-wall`); the list
ships empty so the built-in procedural art is used everywhere.

## In-game manual

Press **H** for a Nintendo-style manual: the Undermaw legend, the chapter list,
how to play, growth & gear, hero dossiers, and an illustrated bestiary + armory.

## Optional: AI narration

Quests, barks, and examine-lore can be generated by an LLM (OpenAI / Anthropic /
xAI). Without keys, built-in text is used, so everything works offline. Copy
`.env.example` to `.env`, set a provider + server-side key, then `npm run dev`.
The title screen shows a green indicator when the proxy + provider are reachable.

> Security note: keep real API keys in `.env` (git-ignored), not in
> `.env.example`, which is committed.

## Project structure

See `PROJECT_OVERVIEW.md` for the full architecture. Key folders: `src/core`
(constants, types, settings, key bindings), `src/rendering` (procedural art +
per-theme palettes), `src/systems` (audio, stats, skills, attributes, loot,
input, companion AI, pathfinding, save), `src/entities`, `src/scenes`, `src/ui`,
`src/data` (levels, themes, enemies, items, grades), `src/ai`, `server/`.
