# Optional real-audio overrides

StrongBow ships with a fully self-contained **procedural** soundtrack — every
realm, town, overworld, cave, boss fight, and the title menu has its own **full
multi-section song** (90–150 seconds) with rock, ballad, folk, and epic
orchestral layers. No external files are required.

If you want to swap in recorded tracks (epic ballads, orchestral scores, metal
anthems, etc.), drop audio files here. The game detects them at runtime and
uses them instead of the procedural version for that slot.

## Per-realm dungeon tracks

| File name        | Plays during                    |
| ---------------- | ------------------------------- |
| `crypt.mp3`      | Sunken Crypt                    |
| `molten.mp3`     | Molten Deep                     |
| `frost.mp3`      | Frozen Cathedral                |
| `toxic.mp3`      | Toxic Undercroft                |
| `clockwork.mp3`  | Clockwork Vault                 |
| `arena.mp3`      | Blood Arena                     |
| `bog.mp3`        | Drowned Bog                     |
| `storm.mp3`      | Storm Spire                     |
| `shadow.mp3`     | Shadow Warren                   |
| `sanctum.mp3`    | Sanctum of the Undermaw         |

## Town, overworld & cave tracks

Each town, area, and cave now has its **own** song (they no longer share one
town theme):

| File name        | Plays during                          |
| ---------------- | ------------------------------------- |
| `town.mp3`       | Hearthwatch town square               |
| `sunspire.mp3`   | Sunspire (desert oasis-town)          |
| `wilds.mp3`      | The Wilds of Hearthwatch (overworld)  |
| `tavern.mp3`     | Town interiors (tavern/guild/forge/…) |
| `mine.mp3`       | The Collapsed Silver Mine (cave)      |
| `hollow.mp3`     | The Hollow Beneath (cave)             |

## Special tracks

| File name     | Plays during                                |
| ------------- | ------------------------------------------- |
| `banner.mp3`  | Title screen + character select (epic anthem) |
| `boss.mp3`    | Any boss fight                              |
| `menu.mp3`    | "Wandering Minstrel" ballad (selectable track) |
| `theme.mp3`   | Legacy fallback (crypt)                     |

`.ogg` is also accepted (e.g. `molten.ogg`). If a file is missing, the
procedural composition plays automatically — no code changes needed.

## Where to find epic, properly-licensed free music

- **incompetech.com** (Kevin MacLeod) — CC-BY, attribute the author.
- **OpenGameArt.org** — filter by CC0 / CC-BY.
- **freepd.com** — public domain (CC0).
- **Pixabay Music** — free for commercial use, no attribution required.

Look for "epic", "heroic", "dungeon", "dark fantasy", "medieval tavern", or
"battle" themes. Full songs (2–4 minutes) work great — they loop seamlessly.
Always check each track's license and provide attribution where required.