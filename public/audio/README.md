# Optional real-audio overrides

StrongBow ships with a fully self-contained **procedural** soundtrack and sound
effects (synthesized live in the browser via the Web Audio API), so it sounds
great with **zero external files**.

If you want to swap in real music tracks, drop audio files here with these exact
names and the game will automatically load and use them instead of the
procedural music:

| File name           | Plays during            |
| ------------------- | ----------------------- |
| `theme.mp3`         | Main / dungeon theme    |
| `boss.mp3`          | Grave Warden boss fight |
| `menu.mp3`          | Title menu (optional)   |

`.ogg` is also accepted (e.g. `theme.ogg`). Files are detected at runtime — if a
file is missing, the procedural track is used for that slot. No code changes
needed.

## Where to find epic, properly-licensed free music

- **incompetech.com** (Kevin MacLeod) — CC-BY, attribute the author.
- **OpenGameArt.org** — filter by CC0 / CC-BY.
- **freepd.com** — public domain (CC0).
- **Pixabay Music** — free for commercial use, no attribution required.

Look for "epic", "heroic", "dungeon", "dark fantasy", or "battle" themes.
Keep loops seamless for best results. Always check each track's license and
provide attribution where required.
