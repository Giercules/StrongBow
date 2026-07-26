# StrongBow — Visual Style Bible

> "Lantern-lit stone, and everything that matters is on fire."

## The look

StrongBow is **hard-edged HD pixel art lit like a modern arcade cabinet**. The world is
painted in low-key, desaturated stone — cold blues, wet browns, bruised violets — and then a
small number of *hot, self-illuminated things* are dropped into it: torch flame, a hero's
weapon glint, a monster's eyes, a rune, a spell, a pickup. Nothing else glows. That contrast
does all the heavy lifting: the playfield reads instantly at combat speed because the only
saturated pixels on screen are the ones you need to act on, and it looks luxurious because
the dark parts are genuinely dark rather than muddy grey.

Forms are **chunky and gestural, not fussy**. A hero is a big readable silhouette — shoulder
mass, a cape or robe hem that breaks the outline, a weapon that extends past the body — with
detail concentrated in the head and the chest emblem where the eye lands. Every sprite gets a
1px near-black keyline so it stays a sticker against a busy floor, a warm upper-left rim
light, and a cool lower-right form shadow. That three-step treatment (keyline · rim · form
shadow) is what separates "high-end handcrafted" from "algorithmic": the underlying shapes can
be simple as long as the light on them is consistent and directional.

**Motion sells everything.** Static frames are only half the sprite; the rest is secondary
motion — a cape that lags the walk, a flame that licks, a boss's mantle that breathes on the
idle. And **every player action gets a physical payoff**: a hit produces an impact flash, a
directional spark spray, a shockwave ring, a knockback, a frame of hit-stop, and a floating
number with attitude. Big moments (crits, kills, level-ups, boss phase flips) escalate the
same vocabulary rather than inventing a new one — bigger ring, longer stop, more shards,
brighter flash — so the game teaches you its language once and then keeps rewarding it.

Each of the ten realms is a **complete mood swap, not a hue rotation**. A realm owns a colour
family, an ambient particle behaviour (embers rise, snow falls, spores hang, ash drifts), a
light temperature, a screen-edge grade, and a signature emissive accent that shows up in its
walls, hazards, decor and monsters alike. You should be able to identify the realm from a
1-inch thumbnail.

---

## Principles

1. **Readability outranks beauty.** If a VFX obscures a telegraph, it loses. Danger is
   red-orange and *never* used decoratively; friendly/heal is green-cyan; arcane is violet.
2. **Only light emits.** Flame, magic, eyes, runes, loot and hazards glow. Stone, cloth, flesh
   and wood never do. Additive blending is a budget, not a default.
3. **One light direction.** Key from the upper-left, warm. Fill is cool ambient. Contact
   shadows sit under everything that stands on the ground.
4. **Value before hue.** Every ramp separates on brightness first — squint and the silhouette
   still resolves. Colour is the second read.
5. **Deep blacks, hot whites.** Shadows go to near-black with a colour cast (never pure grey);
   highlights push to a near-white core so glows have a hot centre.
6. **Escalate, don't multiply.** Crit = the normal hit, louder. Boss phase 2 = the arena, more
   awake. Keep the vocabulary small and reuse it.
7. **Juice is timed, not stacked.** Hit-stop 30–90ms. Shake decays as trauma, never adds
   linearly, and is capped so a screenful of hits can't induce nausea.
8. **Everything animates a little.** Idle bob, flame flicker, glow pulse, mote drift. Nothing
   on screen is perfectly still — but nothing distracts either.
9. **Pixels stay pixels.** No anti-aliasing, no filtering, no sub-pixel sprite positions on
   world art. Glows and gradients live in FX/light layers *above* the pixel layer.
10. **Procedural, but authored.** Randomness only picks between hand-chosen options. If a
    routine can output something ugly, the routine is wrong.

## Realm identity table

| Realm | Colour family | Key light | Ambient | Signature accent |
|---|---|---|---|---|
| Crypt | cold indigo stone, warm torch | amber | slow dust drift | pale-blue witchfire runes |
| Molten | black basalt + orange bleed | fire orange | embers rising | white-hot lava veins |
| Frost | glacial blue-white | pale cyan | snow falling | frozen-teal ice glow |
| Toxic | sickly moss + acid | acid green | spores hanging | luminous bile |
| Clockwork | brass, oil-black, ivory | warm gold | gear dust falling | filament amber |
| Arena | sun-baked sandstone + blood | hot white-gold | grit drifting | banner crimson |
| Bog | drowned green-brown | murky green | fireflies + mist | swamp-gas green |
| Storm | steel blue-violet | electric white | rain streaks | lightning white-blue |
| Shadow | void purple-black | violet | ash motes | void magenta |
| Sanctum | bone-gold marble | radiant gold | light dust rising | holy white-gold |
| Town | sunlit green + warm wood | midday warm | pollen + birds | hearth orange |

## Colour semantics (never break these)

- `#ff3a3a → #ff8a1e` — **danger**: enemy telegraphs, hazards, damage taken, low HP.
- `#3dff6a → #7cf08a` — **life**: healing, regen, friendly auras, HP full.
- `#4ab8ff → #a9e3ff` — **mana / water / cold**.
- `#8a3cff → #c79bff` — **arcane**: spells, portals, void.
- `#ffd24a → #fff0b8` — **reward**: gold, loot, XP, level-up, UI chrome.

---

## Animation contracts

**Heroes** — 15 frames: 3 facings (down / up / side) × 5 poses
(*idle · walk-A · walk-B · wind-up · strike*). The attack is deliberately two
poses: damage lands the instant the button is pressed, so the wind-up gets one
beat (~45ms) and the strike is held for three. Any longer on the anticipation and
the swing reads as input lag rather than as weight.

**Monsters** — 4 frames: 0-2 walk cycle, 3 attack. Frame 3 is allowed to break
the silhouette (jaws open, wings spread, weapons extend) because it only ever
appears for a few hundred milliseconds.

**Wardens** — same 4-frame contract at 80×80, one bespoke drawer each. The rule
is the squint test: with the colour removed you should still be able to name the
warden. Ten bosses, ten outlines, no shared bodies.

## Weapon language

A swing is shaped by what is actually in the hand — arc length, arc thickness,
playback speed, a trailing echo arc, and dust kicked off the floor. A dagger is a
flick that is gone before you finish reading it; a maul is slow, thick, doubled
and throws grit. The weapon *kind* is derived from the item's name first
(the loot generator already writes "Maul", "Cleaver", "Glaive") and its icon
second, because only four weapon icons exist and they would otherwise flatten
every melee weapon in the game into one gesture.

## What persists

Only floor decals. Blood pools where something fleshy died, scorch where
something bloodless burned out, frost and void under the zones that made them,
and fractured stone under a boss slam. They are hard-capped — past the cap the
oldest fades rather than pops — so a long fight leaves a battlefield and never a
leak. Everything else in the FX layer is transient by construction.
