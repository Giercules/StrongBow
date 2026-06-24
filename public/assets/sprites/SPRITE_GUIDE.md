# StrongBow — Custom Sprite Guide (for AI image generation)

This is a paste-ready brief for generating replacement pixel art (e.g. with
sprite-ai.art) and dropping it into the game. Give an image AI the **"Universal
rules"** plus the **one row** for the sprite you want, then place the result per
**"How to install"**.

StrongBow renders 100% procedural art by default; any texture below can be
overridden with a PNG via `public/assets/manifest.json`. Nothing here requires a
rebuild — the manifest is read at runtime, and any missing/failed file silently
falls back to the built-in art.

---

## Universal rules (include in every prompt)

- **Pixel art**, hard edges, no anti-aliasing, **transparent background** (PNG with alpha).
- Author at the **native frame size** listed below. The game scales sprites to the
  world automatically, so don't "zoom" the art — fill the frame edge to edge.
- **Multi-frame sprites must be a single horizontal strip**, left→right, **no gaps,
  no padding, no margin**. Strip width = frame width × frame count; height = frame height.
- Keep a consistent **anchor**: characters stand centered, feet near the bottom of the frame.
- Limited palette, high contrast, readable at small size. Dark fantasy / arcade tone.
- One subject per frame; keep the silhouette inside the frame bounds.

---

## Frame sizes & layouts

### Characters

| Asset | Texture key | Frame | Frames | Strip (px) | Frame layout (order) |
|---|---|---|---|---|---|
| Hero (4 classes) | `hero-vanguard-sheet`, `hero-strider-sheet`, `hero-arcanist-sheet`, `hero-warden-sheet` | 40×48 | 12 | 480×48 | 3 facings × 4 poses. **0–3 = facing DOWN, 4–7 = UP, 8–11 = SIDE** (side faces right; it's auto-flipped for left). Within each block: **idle, walk-A, walk-B, attack**. |
| Regular monster | `monster-grunt-sheet`, `-ghost-`, `-demon-`, `-imp-`, `-brute-`, `-bone_archer-`, plus themed: `-frost_shade-`, `-rime_archer-`, `-plague_ooze-`, `-spore_imp-`, `-gear_knight-`, `-brass_sentinel-`, `-gladiator-`, `-mire_lurker-`, `-storm_wisp-`, `-sky_lancer-`, `-shadow_stalker-`, `-void_imp-`, `-hollow_knight-` | 44×44 | 4 | 176×44 | **0,1,2 = walk cycle, 3 = attack pose** (single-facing; faces right, auto-flipped). |
| Boss | `monster-boss-sheet` (Grave Warden), `monster-molten_colossus-sheet`, `-rime_cantor-`, `-rot_sovereign-`, `-brass_magnus-`, `-arena_champion-`, `-mire_leviathan-`, `-tempest_herald-`, `-umbral_devourer-`, `-hollow_king-` | 80×80 | 4 | 320×80 | **0,1,2 = walk, 3 = attack.** |
| NPC elder (town) | `npc-elder` | 40×48 | 1 | 40×48 | single standing frame. |
| Townsfolk | `townsfolk-0` … `townsfolk-6` | 28×36 | 1 | 28×36 | single standing frame (7 variants). |

> A monster sheet is keyed `monster-<id>-sheet`. To find the id for a creature, see
> `src/data/enemies.ts` / `src/rendering/AnimationRegistry.ts`. Overriding a sheet
> reuses that creature's existing AI + animation timing.

### Tiles (16×16, must tile seamlessly — no transparent edges for solid tiles)

| Texture key(s) | Frame | Frames | Notes |
|---|---|---|---|
| `floor-0`..`floor-3` | 16×16 | 1 each | four floor variants (randomized) |
| `wall`, `wall-top` | 16×16 | 1 | `ext-wall` special key retiles all walls at once |
| `door`, `locked-door`, `ice` | 16×16 | 1 | |
| `water-sheet`, `lava-sheet`, `poison-sheet`, `spikes-sheet` | 16×16 | 4 | animated, `[0,1,2,3]` |
| `portal-sheet` | 16×16 | 6 | animated `[0..5]` |

> Special: `ext-floor` and `ext-wall` retile the entire dungeon background.

### Objects / decor

| Texture key | Frame | Frames |
|---|---|---|
| `torch-sheet` | 16×16 | 4 |
| `generator-sheet` (the altars you destroy) | 24×24 | 4 |
| `coin-sheet` | 16×16 | 4 |
| `chest`, `chest-open`, `shrine`, `shrine-lit` | 16×16 | 1 |
| Dungeon decor: `pillar`, `bones`, `rubble`, `banner`, `crystal`, `cog`, `vines`, `blood-stain`, `skull-pike`, `bog-stump`, `lilypad`, `storm-rod`, `sky-crystal`, `void-rift`, `sanctum-glyph`, `brazier`, `gravestone`, `candle`, `lava-crack`, `obsidian`, `icicle`, `frost-banner`, `toxic-mushroom`, `pipe`, `gauge`, `weapon-rack`, `dead-tree`, `cattail`, `storm-orb`, `bone-pile`, `rune-circle`, `idol`, `altar` | 32×32 | 1 |
| Town decor: `grass-tuft`, `road`, `town-tree`, `town-bush`, `bridge-plank`, `chain`, `town-gate`, `house-roof-red/blue/green/teak`, `house-door` | 32×32 | 1 |
| `town-butterfly`, `town-bird`, `town-dog` | 16×16 | 1 |
| `fountain` | 64×80 | 1 |
| `fountain-base` | 200×164 | 1 |
| `fx-ripple` | 40×40 | 1 |

### Pickups & item icons (16×16, single frame)

`gem`, `food`, `potion-red`, `potion-blue`, `key`, and the inventory icons:
`icon-sword`, `icon-bow`, `icon-staff`, `icon-mace`, `icon-armor`, `icon-ring`,
`icon-amulet`, `icon-shield`, `icon-helm`, `icon-legs`, `icon-gloves`, `icon-boots`.

### FX (effects)

| Texture key | Frame | Frames |
|---|---|---|
| `fx-magic` | 32×32 | 5 |
| `fx-slash` | 16×24 | 3 |
| `fx-fire` | 16×16 | 4 |
| `fx-levelup` | 32×28 | 5 |
| `fx-shadow` 24×8, `fx-hit` 16×16, `fx-arrow` 14×6, `fx-bolt` 10×10, `fx-ally-aura` 28×28, `fx-glow-warm/magic/green/white` 16×16 | — | 1 |

---

## How to install a new sprite

1. Export your art as a PNG at the exact frame size (and as one horizontal strip for
   multi-frame sheets). Put it in `public/assets/sprites/` (e.g. `bird.png`).
2. Add an entry to `public/assets/manifest.json` under `"sprites"`:

```json
{
  "sprites": [
    { "key": "monster-imp-sheet", "path": "assets/sprites/bird.png",
      "kind": "spritesheet", "frameWidth": 44, "frameHeight": 44 }
  ]
}
```

- `kind`: `"spritesheet"` for any multi-frame strip (needs `frameWidth`/`frameHeight`);
  `"image"` for a single-frame texture (omit the frame sizes).
- `frameWidth`/`frameHeight` **must match your file's actual frame grid.** If you
  generate at a different size than the native one above, that's fine — just declare
  the real size; the game scales it to the world.
3. Reload the game. No rebuild needed.

---

## Example prompts

**Reskin a creature as a bird (drop-in, no code):**
> 44×44 per frame, 4 frames in one horizontal strip (176×44 total), transparent
> background, pixel art, no anti-aliasing. A small menacing crow-like bird facing
> right. Frames 0–2: wing-flap walk/hover cycle. Frame 3: lunging peck (attack pose).
> Dark feathers, glowing eyes, readable silhouette, fills the frame.

Save as `bird.png`, override `monster-imp-sheet` (or any `monster-*-sheet`).

**New hero look:**
> 40×48 per frame, 12 frames in one horizontal strip (480×48), transparent bg, pixel
> art. A hooded ranger. Frames 0–3 face the viewer (idle, step-left, step-right,
> attack); 4–7 same poses facing away; 8–11 same poses in profile facing right. Feet
> near the bottom of each frame, consistent position across frames.

Save and override `hero-strider-sheet` (`frameWidth: 40, frameHeight: 48`).

---

## Notes

- A brand-new creature (not a reskin) also needs game code: an entry in
  `src/data/enemies.ts`, animation registration in `src/rendering/AnimationRegistry.ts`,
  and spawn wiring. Reskinning an existing key is pure art + manifest.
- The legacy reference PNGs in this folder (e.g. `warrior.png` 240×24, `monster-imp.png`
  88×22) are older half-size samples — fine to use, but the native procedural sizes
  above (40×48 heroes, 44×44 monsters, 80×80 bosses) give the crispest results.
- Licensing for any third-party art: see `CREDITS.md`.
