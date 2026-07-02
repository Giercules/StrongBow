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
> last free town above the pit, seven unlikely champions answer a call the rest
> of the world is too afraid to hear — a barbarian, a hooded thief, an aging
> wizard, a warden of the failing light, a necromancer who turns the dead
> against their master, a bard whose songs steel the living, and a druid who
> answers the hunger with tooth and claw.
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
npm run dev        # the GAME on :5173 + AI proxy on :3847
```

The **game server** is separate and runs on its own (that's intentional —
nothing about the game depends on it being up). Start it **one** way only:

```bash
npm run server     # game server + dashboard on :8080
# ── OR ──
server\start-server.bat      # same thing, double-clickable
# ── OR ──
server\start-launcher.bat    # a control panel on :8090 that starts the server FOR you
```

**Order doesn't matter** — the game auto-reconnects when the server appears, and
plays fine offline if it never does. Just don't start the game server twice
(e.g. the launcher *and* `npm run server`) or you'll get an `EADDRINUSE` on 8080.

Open the URL, click **PLAY**, pick your hero, and you arrive in **Hearthwatch** —
the town square. The client connects to the **game server** on entering the world
(single-player and multiplayer use the same path; see *Online & game server*).
Gear up, then step through a gate to descend. Click once on the page to enable
audio (browser autoplay policy). For the DnD-flavored fonts (Cinzel +
MedievalSharp) to show, allow the page to reach Google Fonts on first load; it
falls back gracefully offline.

### Commands
```bash
npm run dev          # game (Vite) + AI proxy — does NOT start the game server
npm run dev:client   # game only (Vite)
npm run dev:server   # AI proxy only
npm run server       # game server + dashboard only (independent process)
npm run server:watch # game server with auto-reload
npm run dev:kill     # free ports 3847 / 5173-5175 / 8080
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

Global: **O** settings · **H** manual · **F2** save/load window · **T**
pickpocket (Thief, from stealth) · **Esc** close menu / quit. In town, stand next
to a **gate** or **shopkeeper** and press **Use** to descend or trade.

**Gamepad:** left stick / D-Pad move · **A** attack · **X** magic · **B** use ·
**Y** dodge · **RB** ability (Thief: toggle sneak) · **RT** steal (Thief
pickpocket) · **LB** inventory · **Start** settings · **Select** manual. Menus —
**including the title, character-select, level-select and Settings screens** —
are fully navigable with the D-Pad **or left stick** + A/B, and the HUD controls
box switches to the controller layout when a pad is connected. The
**Necromancer** **holds** the ability button to open a summon radial (aim with
mouse or stick).

**Settings (O)** has tabs for **Audio** (mute, volumes, **music-track** picker),
**View** (**sprite size**, **show-map**), **AI** (provider), **Allies** (companion
behaviour), **Keys** (rebind anything; shows the gamepad mapping when connected),
**Cheats** (incl. **Difficulty: easy / moderate / hard**, plus **loot** and **gold drop-rate** dials), and the **Manual**.

## Online & game server

StrongBow ships with a **standalone game server** (in `server/`). Every client —
solo or grouped — connects to it; playing solo just means you have the world to
yourself, while friends who join appear beside you and (in a party) fight the same
enemies. The server runs independently of the game.

**Run it — the easy way is the launcher:** double-click **`server/start-launcher.bat`**
(or `npm run launcher`). It opens a single **control panel + dashboard** at
**http://localhost:8090** that can **Start / Stop / Restart** the server and shows
connected players, uptime, live **AI-NPC** count, a **broadcast / MOTD** box,
per-player **kick**, and a server **log tail** — and it brings the server up for
you. You can also run the bare server headless with `npm run server` /
`server/start-server.bat` (it listens on `:8080` for the game but has no UI of its
own — the UI is the launcher).

> **Why a launcher?** A web page can't spawn a process, and a not-yet-running
> server can't serve its own "Start" button — so a tiny always-on supervisor
> (the launcher) is what makes browser start/stop possible.

- **Ports:** game server `:8080` (`GAME_SERVER_PORT`), launcher + dashboard `:8090`
  (`LAUNCHER_PORT`); the game itself runs separately on `:5173`.
- **Point your client at the host:** type the address into the **Server Address**
  box on the **title screen** (saved locally), or set
  `VITE_GAME_SERVER_URL=ws://<ip>:<port>` in `.env`. Ship one client build and each
  friend just enters your IP. `VITE_MULTIPLAYER=0` forces offline; the client also
  **auto-reconnects** and plays fine if the server is down.
- **AI NPCs:** toggle them (with a count) from the dashboard; the server spawns
  wandering NPCs (green figures) near the busiest map's players.

**Co-op dungeons (Tier 2):** in a party — 2+ players on the same map — you fight
the **same enemies**. One player is the **enemy host**: their machine simulates
the monsters and spawning altars and streams them to the party; guests render
those enemies (with HP bars) and report their hits back — **both melee and ranged**
— for the host to apply. Dungeon layouts already match across clients (fixed
per-realm seeds), so everyone is in the identical map. Kills grant **shared XP and
gold to the whole party, with a bonus that scales with party size** (co-op out-earns
solo). **Solo play is completely unchanged** — the co-op path only activates with
2+ players connected on the same level.

> **Known follow-ups:** cross-client **item-drop** instancing (XP + gold are
> already shared; dropped gear/scrolls are still host-local for now) and host
> hand-off if the enemy host leaves mid-run. Presence/position, join/leave,
> chat/MOTD, server-driven **AI NPCs**, and dashboard control are all in. Local
> same-screen 2-player is retired in favour of this, and **Level Select is
> disabled** for now.

## Deploying the client (play from home, little/no install)

The game client is a **static web app** — `npm run build` emits a `dist/` folder
that runs from any static host, so friends just open a URL (no install):

- **GitHub Pages (automatic):** the included `.github/workflows/deploy.yml` builds
  and publishes `dist/` on every push to `main`. Enable it once under **Settings →
  Pages → Source: GitHub Actions**, then share the Pages URL.
- **itch.io:** zip the `dist/` folder, upload as an **HTML5 game**, and tick "play
  in browser". Easiest zero-install option for friends.
- **Netlify / any static host:** drag-drop `dist/` (or point it at the repo).

Each friend opens the page, clicks the **SERVER** button on the title screen,
enters your address, and presses **PLAY**.

> **One networking gotcha:** the static client connects to your **game server**,
> which must be reachable from their machines. On a LAN, `ws://your-LAN-ip:8080`
> works. Over the internet you must either **port-forward** 8080, or run a tunnel
> (e.g. `cloudflared` / `ngrok`) that gives a public URL. If you host the *client*
> on HTTPS (GitHub Pages/itch are HTTPS), browsers require a **secure** socket —
> use the tunnel's `wss://…` address in the SERVER box. For a quick LAN game,
> serving the client over plain HTTP (e.g. `npm run preview`) lets you use `ws://`.

## Hearthwatch — the town hub

Every run begins (and every cleared realm returns you to) **Hearthwatch**, the
last free town above the Undermaw — now **two districts divided by the river
Hearthrun** and crossed by **three plank bridges**, inside a water moat with
gatehouses at the cardinal points:

- **Upper Hearthwatch (the civic quarter)** — the five shops with **pitched-roof,
  walk-inside buildings**, a paved **fountain plaza** squared off with trimmed
  hedges, lamp posts and two weathered **hero statues**, orchards, and the **High
  Court**, where the gates to realms **I–V** stand on paved pads.
- **Lower Hearthwatch (the commons)** — a **market square** with striped stalls, a
  stone well, carts and hay; **cottages with fenced gardens**; a **farmstead**; a
  glowing **wayside shrine**; and the **Deep Court** with the gates to realms
  **VI–X**.

**Butterflies and birds** drift over the lawns while **ten townsfolk** wander both
districts — hail one (**Use**) for a proper **dialogue window** with rep-tiered
greetings, AI-flavored chat, and **rumors** for the silver-tongued.

- **Descent gates** glow when **unlocked** and stay **sealed** until you clear the
  realm before them. Step on a gate and press **Use** to descend.
- **Notice boards** (market + plaza) — take **contracts** for gold, XP and
  **reputation** (see *Contracts & reputation*).
- **Brunda's Forge** (blacksmith) — buy weapons & armor, and **craft**: salvage,
  reforge, ascend (see *Crafting*).
- **The Green Vial** (apothecary) — potions and trinkets.
- **The Gilded Tankard** (tavern, keeper inside) — food, drink and rumour.
- **The Fighters Guild** — **hire allies** for your next descent (see Heroes).
- **Your Lodge** — rest to **fully restore** the party, free; the **stash chest**
  beside it shares 24 slots across **every hero and every save**, and the lawn
  mounts a stone **trophy for each realm warden you fell**.
- **The Hearthrun** — stand at any calm bank and press **Use** to **fish** (see
  *Fishing*).

Gold, gear, levels and unlocked gates **persist** across town ⇄ realm trips and
through saves.

## Contracts & reputation

The **notice boards** post three contracts at a time — **bounties** (slay N of a
named foe), **relic hunts** (kills in a realm uncover Undermaw relics), and
**rescues** (a caged villager waits somewhere in the realm; find them and break
the lock). Contracts pay **gold + XP + reputation**; progress pops on screen and
finished contracts turn in at any board.

**Reputation** is Hearthwatch's opinion of the party — **Stranger → Known in the
Market → Friend of Hearthwatch → Shield of the Town → Legend of the Undermaw**.
It improves every shop's **buy and sell prices** (stacking with Charisma and
Haggle) and unlocks warmer townsfolk dialogue. **Rumors** (Charisma 3 or
reputation 10) are genuinely useful tips.

## Crafting at Brunda's

The blacksmith's new **CRAFT** tab works any gear you carry or wear:

- **SALVAGE** melts an item into materials — **scrap iron**, **arcane essence**,
  and (from Godforged/set/unique pieces) **godshards**.
- **REFORGE** rerolls a graded item's affixes for essence + gold.
- **ASCEND** raises an item **one whole grade** — Cracked to Honed all the way to
  **Godforged** — for escalating materials + gold.

Materials live with your gold and persist through saves and level transitions.

## Fishing the Hearthrun

Stand beside calm water in town or the Wilds and press **Use** to cast. Wait for
the **bite**, then strike while the bobber rides the **green zone** — dead centre
on the **gold** lands the finest catch. **River Perch**, **Silver Trout**, and the
arcane **Glimmer Carp** restore health/mana or sell for coin; the epic
**Stormscale** is the fish of fireside legend. Sometimes you get a boot.

## Player trading

On a shared server, walk up to another player and press **Use** to open a
**trade window**: both sides offer items and gold, any change clears both READY
marks, and when both accept the swap applies atomically on each client — minted
gear travels whole, so graded items arrive intact.

## The Wilds of Hearthwatch (overworld)

The four **outer gatehouses** don't just lead back inside — step through one to
emerge into **The Wilds of Hearthwatch**, a large **5-biome overworld** (forest,
foothill/mountain, plains, desert and bog) wrapped around the town. Roads thread
between **ruins, standing stones, an obelisk and a fortified keep**, a river winds
to a swamp, and **wandering critters** roam the surface — peaceful to explore.

Out in the Wilds are **enterable cave mouths**. Stand at one and press **Use** to
delve a **self-contained mini-dungeon**:

- **The Collapsed Silver Mine** — old cart rails and cold iron; grunts, bone
  archers and brutes in the dark.
- **The Hollow Beneath** — a tendril of the Undermaw reaching the surface; shadow
  stalkers, void imps and ghosts.

Each cave has its own foes (fixed dens **plus** roaming wild monsters), **scattered
iron keys**, and a locked **treasure hoard** that yields **themed, graded gear**
(Honed floor, scaling toward Godforged with Fortune — a **Thief picks the locks
free**). Caves never trap you in a forced descent: take the **cavern mouth** back
and you re-emerge at the exact spot in the Wilds where you entered.

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

**To clear a realm:** shatter its **spawning altars** — **Difficulty** sets how
many (easy 2, moderate 3, hard all) — slay the **warden**, then reach the **exit
portal** to return to town; cleared gates show a green ✓. Your whole party —
including ranged allies and summons — can target and break the altars. Hazards (fire, ice,
sludge, spikes) hurt but never trap you.

## Heroes

Seven iconic archetypes, each with a distinct silhouette, weapon, group aura, and
active ability (**F**):

- **Vanguard** — a Conan-style barbarian with a great broadsword. Tanks blows;
  **Seismic Slam** flings foes back, stuns them, and steels the Vanguard.
- **Thief** — a hooded DnD-style rogue with a dagger who strikes from the dark.
  **Sneak (F)** melts him into shadow (foes may still spot him — less so as his
  Sneak grows); a strike from stealth, or at any foe whose **back is turned**, is
  a guaranteed **backstab** (2.4×). He also **picks any lock for free**.
- **Arcanist** — a Merlin-style wizard with a gem staff. Deep mana + fire magic;
  **Meteor** drops a fiery blast on the nearest cluster and Burns it.
- **Warden** — a hooded holy cleric with a mace and sacred light. Steady regen;
  **Sanctuary** heals the party and smites nearby foes.
- **Necromancer** — a shrouded grave-binder in black-violet robes; ranged caster.
  **Hold** the ability to open a radial and raise one of four servants — **Tank**,
  **Archer**, **Mage**, or **Thief** (which blinks behind foes to backstab) — up to
  three at once. Summons **expire on a timer that lengthens as the necromancer levels**.
- **Bard** — a swashbuckling skald with a rapier, a feathered cap and a lute on
  his back. **Hold** the ability for the **song radial** — *War Chant* (+party
  damage), *Traveler's March* (+party speed), *Mending Hymn* (party regen) or
  *Dirge of Dread* (slows nearby foes) — one song rings until you change it. A
  quick **tap** strikes an **Encore**: a shocking power chord around the skald.
- **Druid** — an antler-hooded keeper of the old wild. In human form he casts
  moonlit **nature bolts** at range; **tap** the ability to **shapeshift into a
  great bear** — more health, heavier claws, a mauling sweep — and tap again to
  shift back. Shifting preserves your health fraction, so it's a stance, not a heal.

Allies are **hired per descent at the Fighters Guild** — there are no free
followers. Pay gold for each (the price rises with your level), hire as many as
you can afford, and **re-hire after every run**. Hired allies follow the active
player, path around corners, **spread out naturally** instead of stacking, smash
altars they pass, **use their own class abilities** when it helps, and **blink to
you** if they fall too far behind.

## Combat & feel

- **Dodge roll (Space)** with brief invulnerability; **knockback** on hits;
  weighty melee feedback — screen shake, impact bursts, and a **crit zoom-punch**.
- **Arcade hit numbers** — damage pops in with an overshoot, **color-tiers by
  size** (white → gold → orange), and crits land **big, tilted and glowing**
  with a punchy "!".
- **On-hit elements:** fire weapons **Burn** (damage over time), magic **Chills**
  (slows), critical hits **Shock** (extra damage taken).
- **Backstab** — the Thief hits for **2.4×** when he strikes a foe from behind or
  out of stealth, with a satisfying BACKSTAB! pop.
- **Champion enemies** — gold-glowing elites with ~2.3× HP and harder hits that
  always drop strong themed gear.
- **Bosses** cycle telegraphed patterns — radial volleys, summons, flame novas —
  that scale with their health. Watch for the wind-up flash.
- **Boss phase two** — at **half health every realm warden turns the fight**:
  faster, denser volleys (Brass Magnus goes into overdrive), burst-summoned
  broods (the Grave Warden calls the graves open), a **second wind** (the
  Undying Champion), or a vanish-and-resurface beside a hero (the Mire
  Leviathan, the Umbral Devourer) — each announced with its own roar.

## Loot, grades & Fortune

- Foes, altars, chests, and bosses drop **gear themed to the realm**, in five
  grades: **Cracked · Honed · Runed · Ascendant · Godforged** — each stronger,
  with more affixes, including **class-ability affixes**: *of the Legion* (+1
  summon), *of Alacrity* (−ability cooldown), *of Arcing* (spells chain). **Hover
  any item** to read its full stats.
- **Chests are locked.** Opening one costs an **Iron Key** (bought at the
  blacksmith), consumed per chest — unless you're the **Thief**, who picks any
  lock for free and sharpens his **Lockpicking** with each.
- The **Fortune** attribute (Luck) raises drop rate and tilts rolls toward the
  higher grades.
- **Unique legendaries** — twelve **named items** in **burnt orange**, rarer than
  set pieces, each build-warping: the **Sunfall Edge** sets every strike ablaze,
  the **Whisperwind Bow**'s shots pierce, the **Stormcaller Staff** answers crits
  with chain lightning, the **Crown of the Hollow King** commands two extra
  servants, **Midas Grips** spill 40% more gold, the **Boots of the Comet** leave
  a burning dodge-trail...
- **Growth (K):** raise class skills and the attributes Might / Vitality / Focus
  / Fortune; the panel also **names each class's signature ability**. **Inventory
  (I):** equip (1-9), unequip (U), drink (C), page (←/→),
  sort (S) — the bag is unbounded and paginates. **Character sheet (P):** full
  stats and gear.

## Shops & economy

New heroes start with **100 gold, a health and a mana potion**. Spend the coin you
earn back in Hearthwatch: each keeper's stall has a **BUY / SELL** toggle — buy
gear, potions, **scrolls** (including a **Town Portal** that whisks you home and
opens a return gate back to your exact spot in the depths) and **Iron Keys**, or
**sell** bag loot for gold.

**Charisma** rises every time you buy or sell. It steadily **lowers buy prices**
(up to −40%) and **raises sell payouts** (up to +50%), and unlocks a once-per-visit
**Haggle** — gamble for an extra discount (the keeper might scoff and trim it).
**Reputation** from notice-board contracts sweetens both directions further. The
Lodge still restores the whole party for free between descents.

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

The game **fills the whole browser window** — the two carved HUD panels pin to
the left and right **screen edges** and the play area stretches between them. On
the **left**, a parchment
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

All in-game art is generated in code at runtime as **HD pixel art**. Around
**sixty** pieces also ship as hand-made PNG overrides via
`public/assets/manifest.json` — HD floors and walls, doors, chests, gems/keys/
crystal, **animated hazards** (water, lava, poison, spikes, portal, torch), the
**animated coin & summoning-rift generator**, ~two dozen **32px dungeon props**,
all **12 item icons**, the health & mana potions, and the town butterfly/bird. To
swap any other texture, add a manifest entry (e.g. `monster-imp-sheet`,
`ext-wall`); see `public/assets/sprites/SPRITE_GUIDE.md` for frame sizes, sheet
layouts, and ready-to-use art prompts.

The cover atlas above is generated by running the engine's **own drawing code
headless** (`npm run atlas` → `tools/render_atlas.cjs`) and compositing the
shipped **HD PNG overrides**, so every sprite on it is exactly what you see
in-game — heroes, all ten wardens, the full bestiary, the necromancer's four
skeletal servants, the item icons, and the world/town tiles.

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
