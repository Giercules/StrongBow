# StrongBow

A browser-based, top-down arcade dungeon crawler with a mystical **Dungeons &
Dragons** feel — **hand-detailed HD pixel art**, an **epic procedural NES-style
soundtrack**, a living **town-square hub**, and a **ten-realm campaign** where
every realm has its own layout, hazards, foes and boss. Built with Phaser 4 +
TypeScript + Vite. All original art and audio, generated in code at runtime.

![The heroes and the bestiary of the Undermaw](docs/sprite-atlas.png)

## The Story

> Ten times the world has sealed the **Undermaw** — the hungering dark beneath
> the roots of the mountains — and ten times the seals have held.
>
> No longer. The spawning altars are bleeding the dead back into the light, and
> one by one the lanterns of the realms are going out. In **Hearthwatch**, the
> last free town above the pit, four unlikely champions answer a call the rest
> of the world is too afraid to hear — a barbarian, a drow ranger, an aging
> wizard, and a warden of the failing light.
>
> Beneath them wait **ten realms** — crypt, fire, ice, rot, brass, blood, bog,
> storm, shadow — each ruled by a warden of the hunger, each darker than the
> one above. Shatter their altars. Break their masters. Descend at last to the
> **Sanctum of the Undermaw** and snuff out the hunger itself…
>
> **Ten realms. One hunger. Slay it ere it wakes.**

## Quick start

```bash
npm install
npm run dev        # game on http://localhost:5173 + AI proxy on :3847
```

Open the URL, click **1 Player** or **2 Players**, pick your hero(es), and you
arrive in **Hearthwatch** — the town square. Gear up, then step through a gate to
descend. Click once on the page to enable audio (browser autoplay policy). For
the DnD-flavored fonts (Cinzel + MedievalSharp) to show, allow the page to reach
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
| Use / examine / shop | E | Right Shift |
| Character sheet | P | ; |
| Inventory | I / Tab | M |
| Growth | K | \ |

Global: **O** settings · **H** manual · **F2** save/load window · **2** add
Player 2 · **Esc** close menu / quit. In town, stand next to a **gate** or
**shopkeeper** and press **Use** to descend or trade.

**Settings (O)** has tabs for **Audio** (mute, volumes, and a **music-track**
picker), **View** (**sprite size** 100–200% and a **show-map** toggle), **Allies**
(companion behaviour), **Keys** (rebind anything), **Cheats**, and the **Manual**.

## Hearthwatch — the town hub

Every run begins (and every cleared realm returns you to) **Hearthwatch**, the
last free town above the Undermaw: grassy lawns and cobbled roads ring a central
fountain, dotted with **distinct timbered houses** under coloured roofs, lit
braziers and festival banners. A **water moat** encircles the town, crossed by
four **timber bridges** — the grand south span hung with heavy **chains** —
leading to gatehouses at each cardinal point. **Butterflies and birds** drift
over the square and a **stray dog** trots between the stalls, while the
**townsfolk** — a flower-seller, a town crier, a hooded pilgrim, a watchman, a
lute-player, a fortune-teller and a down-on-his-luck merchant, each with their
own look — **wander on their own** and can be **hailed for AI-flavored chatter**.

- **Ten descent gates** ring the square — one per realm. A gate glows when it's
  **unlocked** and stays **sealed** until you clear the realm before it. Step on
  a gate and press **Use** to descend with your whole party intact.
- **Brunda's Forge** (blacksmith) — buy weapons & armor.
- **The Green Vial** (apothecary) — potions and trinkets.
- **The Gilded Tankard** (tavern) — food and drink.
- **Your Lodge** — rest to **fully restore** the party's HP and MP, free.

Gold, gear, levels and unlocked gates **persist** across town ⇄ realm trips and
through saves.

## The Descent into the Undermaw

An ancient hunger — the **Undermaw** — wakes beneath the world; its seals leak
the dead through spawning altars across **ten descending realms**. Clear a
realm's altars, slay its warden, and the **next gate opens back in Hearthwatch**.

| # | Realm | Warden | Layout |
|---|---|---|---|
| I | The Sunken Crypt | The Grave Warden | orthogonal catacomb grid |
| II | The Molten Deep | The Molten Colossus | great lava caverns |
| III | The Frozen Cathedral | The Rime Cantor | a nave with side chapels |
| IV | The Toxic Undercroft | The Rot Sovereign | a cramped warren of loops |
| V | The Clockwork Vault | Brass Magnus | concentric gear-rings + spokes |
| VI | The Blood Arena | The Undying Champion | chained circular pits |
| VII | The Drowned Bog | The Mire Leviathan | scattered organic caves |
| VIII | The Storm Spire | The Tempest Herald | a vertical climbing spire |
| IX | The Shadow Warren | The Umbral Devourer | a dark twisting warren |
| X | Sanctum of the Undermaw | The Hollow King | a radial temple hub |

Each realm has its **own macro-layout** (so no two read alike), plus its own
walls, floors, decor, hazards, enemy roster, boss, themed loot, music, lighting,
ambient particles, and screen-edge color grade.

**To clear a realm:** destroy at least **3 spawning altars**, slay the
**warden**, then reach the **exit portal** to return to town. Your whole party —
including ranged allies — can target and break the altars. Hazards (fire, ice,
sludge, spikes) hurt but never trap you.

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
path around corners, **spread out naturally** instead of stacking, fight, smash
altars they pass, and **blink to you** if they fall too far behind.

## Combat & feel

- **Dodge roll (Space)** with brief invulnerability; **knockback** on hits;
  weighty melee feedback — screen shake, impact bursts, and a **crit zoom-punch**.
- **Arcade hit numbers** — damage pops in with an overshoot, **color-tiers by
  size** (white → gold → orange), and crits land **big, tilted and glowing**
  with a punchy "!".
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
  sort (S) — the bag is unbounded and paginates. **Character sheet (P):** full
  stats and gear.

## Shops & economy

Spend the gold you earn in the realms back in Hearthwatch. Use a shopkeeper to
open their stall, browse stock with prices and stats, and **buy with gold**;
purchases drop straight into your bag (auto-equipping empty slots). The Lodge
restores the whole party for free between descents.

## Examine anything

Press **Use (E)** next to decor, hazards, townsfolk, gates, or any tile to
**examine** it and receive grim, DnD-flavored lore — augmented by AI narration
when a provider is connected. On-screen lore now **lingers** so there's time to
read it.

## Multi-slot saves with screenshots

Press **F2** for the **Save/Load window**: six slots, each previewed with a
**screenshot** plus details (realm, party, playtime, date). Saves remember your
**unlocked gates**, so your campaign progress survives. The title screen's **Load
Game** opens the same browser.

## Screen, adventure log & HUD

The play area sits between two carved panels. On the **left**, a parchment
**adventure log** scrolls the story of your run — narration, kills, loot, boss
beats — beneath a **Dungeon Master feed** that streams live **Grok** commentary
(with a connection light) when an AI provider is set. On the **right**, the party
HUD tracks each hero's HP / MP / XP, gold, score and a live controls box. A
toggleable **minimap** (top-right of the play area) shows the party, remaining
altars, the boss and the exit.

## Epic audio

The soundtrack and SFX are synthesized live via the Web Audio API — long,
multi-phrase **NES-style heroic ballads** with a two-voice harmony, distinct
per-realm themes, a calm town theme, and an intense boss theme. Drop `theme.mp3`
/ `boss.mp3` / `menu.mp3` into `public/audio/` to override with real tracks.

## Procedural art (and optional overrides)

All in-game art is generated in code at runtime — the heroes and the full
bestiary are now **HD pixel art**, drawn at 2× the old resolution with rim-light
shading, faces, and per-class gear and weapons. To swap any piece for a PNG, add
an entry to `public/assets/manifest.json` (e.g. `hero-vanguard-sheet`,
`ext-wall`); the list ships empty so the built-in procedural art is used
everywhere.

The README cover atlas above is rendered straight from the engine's own
procedural art, so it always reflects exactly what you see in-game.

## In-game manual

Press **H** for a Nintendo-style manual: the Undermaw legend, the chapter list,
how to play, growth & gear, hero dossiers, and an illustrated bestiary + armory.

## Optional: AI narration

Quests, barks, examine-lore, and townsfolk chatter can be generated by an LLM
(OpenAI / Anthropic / xAI). Without keys, built-in text is used, so everything
works offline. Copy `.env.example` to `.env`, set a provider + server-side key,
then `npm run dev`. The title screen shows a green indicator when the proxy +
provider are reachable.

> Security note: keep real API keys in `.env` (git-ignored), not in
> `.env.example`, which is committed.

## Project structure

See `PROJECT_OVERVIEW.md` for the full architecture. Key folders: `src/core`
(constants, types, settings, key bindings), `src/rendering` (procedural art +
per-theme palettes), `src/systems` (audio, stats, skills, attributes, loot,
input, companion AI, pathfinding, save), `src/entities`, `src/scenes`, `src/ui`,
`src/data` (levels, town, themes, layouts, enemies, items, grades), `src/ai`,
`server/`, `tools/` (art generators).
