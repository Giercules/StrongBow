import type { ThemeId } from '../../core/types';
import type { Composition, SongSection } from './types';
import {
  Am, F, C, G, Dm, E, Em, Bb, D, Gm, Cm, Ab, Eb, Bm, Fs, A,
  bA, bF, bC, bG, bD, bE, bBb, bEm, bGm, bCm, bAb, bEb, bBm, bFs,
  cycle, expandMelody, fanfareMotif, rockRiff, etherealPhrase, dreadLine, tavernJig, shredRun,
  desertLine, wanderMotif, bannerCall, bannerAnswer, bannerClimax, bannerPhrase,
} from './theory';

// ----------------------------------------------------------------------------
// Epic multi-section compositions — each realm gets a full song arc (intro →
// verse → chorus → bridge → solo → finale) that runs 90–150 seconds before
// looping. No more 5-second chip-tune snippets.
// ----------------------------------------------------------------------------

function section(
  id: string,
  bars: number,
  intensity: number,
  chords: number[][],
  bass: number[],
  leadFn: (bar: number, step: number) => number,
  opts: { bpm?: number; style?: SongSection['style'] } = {}
): SongSection {
  return {
    id,
    bars,
    intensity,
    chords: cycle(chords, bars),
    bass: cycle(bass, bars),
    lead: expandMelody(bars, leadFn),
    ...opts,
  };
}

// ---- CRYPT — "Ballad of the Sunken Dead" ------------------------------------
// Gothic heroic ballad. Minor key march that swells into a cathedral chorus.
const CRYPT: Composition = {
  id: 'crypt',
  label: 'Ballad of the Sunken Dead',
  bpm: 108,
  style: 'ballad',
  sections: [
    section('intro', 4, 0.3, [Am, Am, F, F], [bA, bA, bF, bF],
      (b, s) => s === 0 ? 57 + b : 0),
    section('verse', 8, 0.55, [Am, F, C, G, Am, Dm, E, Am], [bA, bF, bC, bG, bA, bD, bE, bA],
      (b, s) => fanfareMotif(69, b, s, 0.5)),
    section('chorus', 8, 0.75, [F, C, G, Am, F, C, Dm, E], [bF, bC, bG, bA, bF, bC, bD, bE],
      (b, s) => fanfareMotif(72, b, s, 1)),
    section('verse2', 8, 0.6, [Am, F, C, G, Dm, Am, E, Am], [bA, bF, bC, bG, bD, bA, bE, bA],
      (b, s) => fanfareMotif(67, b, s, 0.6)),
    section('bridge', 4, 0.45, [Dm, E, Am, Am], [bD, bE, bA, bA],
      (b, s) => etherealPhrase(65, b, s)),
    section('solo', 8, 0.85, [Am, F, C, G, Am, Dm, E, Am], [bA, bF, bC, bG, bA, bD, bE, bA],
      (b, s) => shredRun(57, b, s), { style: 'rock' }),
    section('finale', 8, 0.9, [F, C, G, Am, F, C, Dm, E], [bF, bC, bG, bA, bF, bC, bD, bE],
      (b, s) => fanfareMotif(76, b, s, 1), { style: 'epic' }),
    section('outro', 4, 0.35, [Am, F, C, Am], [bA, bF, bC, bA],
      (b, s) => s === 0 ? 69 - b : 0),
  ],
};

// ---- MOLTEN — "Forge of the Worldwound" -------------------------------------
// Molten heavy rock — volcanic power-chord riffs and a face-melting solo.
const MOLTEN: Composition = {
  id: 'molten',
  label: 'Forge of the Worldwound',
  bpm: 148,
  style: 'metal',
  sections: [
    section('intro', 4, 0.5, [Am, Am, G, G], [bA, bA, bG, bG],
      (b, s) => rockRiff(45, b, s)),
    section('verse', 8, 0.8, [Am, Am, F, G, C, G, Dm, E], [bA, bA, bF, bG, bC, bG, bD, bE],
      (b, s) => rockRiff(57, b, s)),
    section('chorus', 8, 0.95, [F, G, Am, Am, F, G, C, E], [bF, bG, bA, bA, bF, bG, bC, bE],
      (b, s) => rockRiff(60, b, s)),
    section('breakdown', 4, 0.6, [Dm, Dm, E, E], [bD, bD, bE, bE],
      (b, s) => s % 8 === 0 ? 48 : 0),
    section('verse2', 8, 0.85, [Am, F, G, Am, C, G, Dm, E], [bA, bF, bG, bA, bC, bG, bD, bE],
      (b, s) => rockRiff(55, b, s)),
    section('solo', 8, 1.0, [Am, G, F, E, Am, G, F, E], [bA, bG, bF, bE, bA, bG, bF, bE],
      (b, s) => shredRun(48, b, s)),
    section('chorus2', 8, 1.0, [F, G, Am, Am, F, G, C, E], [bF, bG, bA, bA, bF, bG, bC, bE],
      (b, s) => rockRiff(62, b, s)),
    section('outro', 4, 0.7, [Am, E, Am, Am], [bA, bE, bA, bA],
      (b, s) => rockRiff(50, b, s)),
  ],
};

// ---- FROST — "Hymn of the Shattered Choir" ----------------------------------
// Crystalline ethereal ballad — slow, reverbed, haunting high melodies.
const FROST: Composition = {
  id: 'frost',
  label: 'Hymn of the Shattered Choir',
  bpm: 84,
  style: 'ethereal',
  sections: [
    section('intro', 6, 0.2, [Am, C, F, C, Dm, Am], [bA, bC, bF, bC, bD, bA],
      (b, s) => etherealPhrase(76, b, s)),
    section('verse', 8, 0.4, [Am, C, F, C, Dm, Am, E, Am], [bA, bC, bF, bC, bD, bA, bE, bA],
      (b, s) => etherealPhrase(72, b, s)),
    section('chorus', 8, 0.6, [F, C, G, Am, F, C, Dm, E], [bF, bC, bG, bA, bF, bC, bD, bE],
      (b, s) => etherealPhrase(79, b, s)),
    section('verse2', 8, 0.45, [Am, F, C, G, Dm, Am, E, Am], [bA, bF, bC, bG, bD, bA, bE, bA],
      (b, s) => etherealPhrase(74, b, s)),
    section('bridge', 4, 0.35, [Dm, E, Am, C], [bD, bE, bA, bC],
      (b, s) => s === 0 ? 81 : s === 8 ? 79 : 0),
    section('ascent', 8, 0.7, [F, C, G, Am, F, C, G, Am], [bF, bC, bG, bA, bF, bC, bG, bA],
      (b, s) => fanfareMotif(76, b, s, 0.8), { style: 'ballad' }),
    section('finale', 8, 0.75, [Am, C, F, G, Am, C, Dm, E], [bA, bC, bF, bG, bA, bC, bD, bE],
      (b, s) => etherealPhrase(84, b, s)),
    section('outro', 4, 0.2, [Am, F, C, Am], [bA, bF, bC, bA],
      (b, s) => s === 0 ? 72 : 0),
  ],
};

// ---- TOXIC — "Plague Canticle" ----------------------------------------------
// Ominous dark march — creeping chromatic bass, dissonant undertones.
const TOXIC: Composition = {
  id: 'toxic',
  label: 'Plague Canticle',
  bpm: 100,
  style: 'dark',
  sections: [
    section('intro', 4, 0.35, [Am, Am, Dm, Dm], [bA, bA, bD, bD],
      (b, s) => dreadLine(55, b, s)),
    section('verse', 8, 0.5, [Am, Dm, Bb, F, Am, Dm, E, E], [bA, bD, bBb, bF, bA, bD, bE, bE],
      (b, s) => dreadLine(57, b, s)),
    section('chorus', 8, 0.65, [Bb, F, E, Am, Bb, F, Dm, E], [bBb, bF, bE, bA, bBb, bF, bD, bE],
      (b, s) => dreadLine(60, b, s)),
    section('verse2', 8, 0.55, [Am, Bb, Dm, F, Am, Dm, Bb, E], [bA, bBb, bD, bF, bA, bD, bBb, bE],
      (b, s) => dreadLine(56, b, s)),
    section('bridge', 4, 0.4, [Dm, Bb, E, Am], [bD, bBb, bE, bA],
      (b, s) => s === 0 ? 53 : s === 8 ? 55 : 0),
    section('climax', 8, 0.75, [Am, Dm, Bb, F, E, Am, Dm, E], [bA, bD, bBb, bF, bE, bA, bD, bE],
      (b, s) => dreadLine(62, b, s), { style: 'epic' }),
    section('outro', 4, 0.3, [Am, Dm, Am, Am], [bA, bD, bA, bA],
      (b, s) => s === 0 ? 48 : 0),
  ],
};

// ---- CLOCKWORK — "Gears of Greed" -------------------------------------------
// Mechanical precision rock — staccato riffs, ticking hi-hats, odd accents.
const CLOCKWORK: Composition = {
  id: 'clockwork',
  label: 'Gears of Greed',
  bpm: 132,
  style: 'rock',
  sections: [
    section('intro', 4, 0.4, [Dm, Dm, Bb, C], [bD, bD, bBb, bC],
      (b, s) => s % 4 === 0 ? 50 + (s / 4) : 0),
    section('verse', 8, 0.7, [Dm, Bb, C, Gm, Dm, Bb, C, F], [bD, bBb, bC, bGm, bD, bBb, bC, bF],
      (b, s) => rockRiff(53, b, s)),
    section('chorus', 8, 0.85, [Bb, C, Dm, Dm, Bb, C, Gm, F], [bBb, bC, bD, bD, bBb, bC, bGm, bF],
      (b, s) => rockRiff(57, b, s)),
    section('bridge', 4, 0.55, [Gm, C, Dm, Bb], [bGm, bC, bD, bBb],
      (b, s) => s === 0 || s === 6 ? 55 : 0),
    section('verse2', 8, 0.75, [Dm, Bb, C, Gm, Dm, F, C, Dm], [bD, bBb, bC, bGm, bD, bF, bC, bD],
      (b, s) => rockRiff(52, b, s)),
    section('solo', 8, 0.9, [Dm, Bb, C, Gm, Dm, Bb, C, F], [bD, bBb, bC, bGm, bD, bBb, bC, bF],
      (b, s) => shredRun(45, b, s), { style: 'metal' }),
    section('finale', 8, 0.95, [Bb, C, Dm, Gm, Bb, C, Dm, Dm], [bBb, bC, bD, bGm, bBb, bC, bD, bD],
      (b, s) => rockRiff(60, b, s)),
    section('outro', 4, 0.5, [Dm, C, Bb, Dm], [bD, bC, bBb, bD],
      (b, s) => s % 8 === 0 ? 50 : 0),
  ],
};

// ---- ARENA — "Roar of the Blood Pit" ----------------------------------------
// Gladiator rock anthem — triumphant aggression, crowd-chant energy.
const ARENA: Composition = {
  id: 'arena',
  label: 'Roar of the Blood Pit',
  bpm: 142,
  style: 'rock',
  sections: [
    section('intro', 4, 0.55, [E, E, Am, Am], [bE, bE, bA, bA],
      (b, s) => rockRiff(52, b, s)),
    section('verse', 8, 0.8, [Am, F, C, G, Am, Dm, E, E], [bA, bF, bC, bG, bA, bD, bE, bE],
      (b, s) => rockRiff(57, b, s)),
    section('chant', 8, 0.9, [Am, Am, F, F, C, C, G, G], [bA, bA, bF, bF, bC, bC, bG, bG],
      (b, s) => s % 4 === 0 ? 60 + (b % 2) * 2 : 0),
    section('verse2', 8, 0.85, [Am, G, F, E, Am, Dm, F, E], [bA, bG, bF, bE, bA, bD, bF, bE],
      (b, s) => rockRiff(55, b, s)),
    section('bridge', 4, 0.6, [Dm, E, Am, G], [bD, bE, bA, bG],
      (b, s) => fanfareMotif(65, b, s, 0.7)),
    section('solo', 8, 0.95, [Am, F, C, G, Am, Dm, E, Am], [bA, bF, bC, bG, bA, bD, bE, bA],
      (b, s) => shredRun(48, b, s), { style: 'metal' }),
    section('finale', 8, 1.0, [Am, F, C, G, E, Am, E, Am], [bA, bF, bC, bG, bE, bA, bE, bA],
      (b, s) => rockRiff(62, b, s)),
    section('outro', 4, 0.65, [Am, E, Am, Am], [bA, bE, bA, bA],
      (b, s) => s === 0 ? 57 : 0),
  ],
};

// ---- BOG — "Swamp Requiem" --------------------------------------------------
// Swampy blues-dread groove — slow, murky, unsettling.
const BOG: Composition = {
  id: 'bog',
  label: 'Swamp Requiem',
  bpm: 92,
  style: 'dark',
  sections: [
    section('intro', 6, 0.3, [Gm, Gm, Bb, Cm, Gm, F], [bGm, bGm, bBb, bCm, bGm, bF],
      (b, s) => dreadLine(50, b, s)),
    section('verse', 8, 0.45, [Gm, Bb, Cm, F, Gm, Dm, Eb, Gm], [bGm, bBb, bCm, bF, bGm, bD, bEb, bGm],
      (b, s) => dreadLine(53, b, s)),
    section('chorus', 8, 0.6, [Bb, Cm, F, Gm, Bb, Eb, Cm, Gm], [bBb, bCm, bF, bGm, bBb, bEb, bCm, bGm],
      (b, s) => dreadLine(55, b, s)),
    section('verse2', 8, 0.5, [Gm, Cm, Bb, F, Gm, Dm, Eb, Cm], [bGm, bCm, bBb, bF, bGm, bD, bEb, bCm],
      (b, s) => dreadLine(52, b, s)),
    section('bridge', 4, 0.35, [Cm, Eb, Gm, Bb], [bCm, bEb, bGm, bBb],
      (b, s) => etherealPhrase(58, b, s)),
    section('climax', 8, 0.7, [Gm, Bb, Cm, F, Gm, Eb, Cm, Gm], [bGm, bBb, bCm, bF, bGm, bEb, bCm, bGm],
      (b, s) => dreadLine(57, b, s), { style: 'ballad' }),
    section('outro', 4, 0.25, [Gm, Cm, Gm, Gm], [bGm, bCm, bGm, bGm],
      (b, s) => s === 0 ? 48 : 0),
  ],
};

// ---- STORM — "Tempest Ascendant" --------------------------------------------
// Epic orchestral rock crescendo — builds to thunderous climax.
const STORM: Composition = {
  id: 'storm',
  label: 'Tempest Ascendant',
  bpm: 128,
  style: 'epic',
  sections: [
    section('intro', 4, 0.4, [Am, C, G, Am], [bA, bC, bG, bA],
      (b, s) => etherealPhrase(67, b, s)),
    section('verse', 8, 0.65, [Am, F, C, G, Am, Dm, E, Am], [bA, bF, bC, bG, bA, bD, bE, bA],
      (b, s) => fanfareMotif(69, b, s, 0.7)),
    section('chorus', 8, 0.85, [F, C, G, Am, F, C, Dm, E], [bF, bC, bG, bA, bF, bC, bD, bE],
      (b, s) => fanfareMotif(74, b, s, 1)),
    section('verse2', 8, 0.7, [Am, G, F, E, C, G, Dm, Am], [bA, bG, bF, bE, bC, bG, bD, bA],
      (b, s) => fanfareMotif(72, b, s, 0.8)),
    section('bridge', 4, 0.55, [Dm, E, Am, C], [bD, bE, bA, bC],
      (b, s) => etherealPhrase(76, b, s)),
    section('solo', 8, 0.9, [Am, F, C, G, Am, Dm, E, Am], [bA, bF, bC, bG, bA, bD, bE, bA],
      (b, s) => shredRun(57, b, s), { style: 'rock' }),
    section('climax', 8, 1.0, [C, G, Am, F, C, G, Dm, E], [bC, bG, bA, bF, bC, bG, bD, bE],
      (b, s) => fanfareMotif(79, b, s, 1)),
    section('outro', 4, 0.45, [Am, C, G, Am], [bA, bC, bG, bA],
      (b, s) => s === 0 ? 72 : 0),
  ],
};

// ---- SHADOW — "Whispers in the Warren" --------------------------------------
// Dark whispery ballad — unsettling, minor, sparse then swelling.
const SHADOW: Composition = {
  id: 'shadow',
  label: 'Whispers in the Warren',
  bpm: 96,
  style: 'dark',
  sections: [
    section('intro', 6, 0.25, [Bm, Bm, G, Em, Bm, Fs], [bBm, bBm, bG, bEm, bBm, bFs],
      (b, s) => etherealPhrase(62, b, s)),
    section('verse', 8, 0.45, [Bm, G, Em, Fs, Bm, G, Em, Bm], [bBm, bG, bEm, bFs, bBm, bG, bEm, bBm],
      (b, s) => dreadLine(59, b, s)),
    section('chorus', 8, 0.65, [G, Em, Fs, Bm, G, Em, D, Bm], [bG, bEm, bFs, bBm, bG, bEm, bD, bBm],
      (b, s) => etherealPhrase(67, b, s)),
    section('verse2', 8, 0.5, [Bm, Em, G, Fs, Bm, D, Em, Bm], [bBm, bEm, bG, bFs, bBm, bD, bEm, bBm],
      (b, s) => dreadLine(57, b, s)),
    section('bridge', 4, 0.35, [Em, Fs, Bm, G], [bEm, bFs, bBm, bG],
      (b, s) => s === 0 ? 64 : 0),
    section('ascent', 8, 0.75, [G, Em, Fs, Bm, G, D, Em, Bm], [bG, bEm, bFs, bBm, bG, bD, bEm, bBm],
      (b, s) => fanfareMotif(64, b, s, 0.8), { style: 'ballad' }),
    section('outro', 4, 0.2, [Bm, Em, Bm, Bm], [bBm, bEm, bBm, bBm],
      (b, s) => s === 0 ? 59 : 0),
  ],
};

// ---- SANCTUM — "Hunger at the Last Door" ------------------------------------
// Grand cathedral epic — choir pads, timpani rolls, ultimate finale energy.
const SANCTUM: Composition = {
  id: 'sanctum',
  label: 'Hunger at the Last Door',
  bpm: 120,
  style: 'epic',
  sections: [
    section('intro', 4, 0.45, [Cm, Ab, Eb, Cm], [bCm, bAb, bEb, bCm],
      (b, s) => etherealPhrase(60, b, s)),
    section('verse', 8, 0.65, [Cm, Ab, Eb, Bb, Cm, Gm, Ab, Eb], [bCm, bAb, bEb, bBb, bCm, bGm, bAb, bEb],
      (b, s) => fanfareMotif(67, b, s, 0.7)),
    section('chorus', 8, 0.85, [Ab, Eb, Bb, Cm, Ab, Eb, Gm, Bb], [bAb, bEb, bBb, bCm, bAb, bEb, bGm, bBb],
      (b, s) => fanfareMotif(72, b, s, 1)),
    section('verse2', 8, 0.7, [Cm, Gm, Ab, Eb, Cm, Bb, Gm, Cm], [bCm, bGm, bAb, bEb, bCm, bBb, bGm, bCm],
      (b, s) => fanfareMotif(69, b, s, 0.8)),
    section('bridge', 4, 0.55, [Gm, Ab, Eb, Cm], [bGm, bAb, bEb, bCm],
      (b, s) => etherealPhrase(74, b, s)),
    section('solo', 8, 0.9, [Cm, Ab, Eb, Bb, Cm, Gm, Ab, Eb], [bCm, bAb, bEb, bBb, bCm, bGm, bAb, bEb],
      (b, s) => shredRun(55, b, s), { style: 'metal' }),
    section('finale', 8, 1.0, [Ab, Eb, Bb, Cm, Ab, Eb, Gm, Cm], [bAb, bEb, bBb, bCm, bAb, bEb, bGm, bCm],
      (b, s) => fanfareMotif(76, b, s, 1)),
    section('outro', 4, 0.4, [Cm, Ab, Eb, Cm], [bCm, bAb, bEb, bCm],
      (b, s) => s === 0 ? 60 : 0),
  ],
};

// ---- TOWN — "Merry Hearthwatch" ---------------------------------------------
// Bright folk-medieval tavern jig for the town square.
const TOWN: Composition = {
  id: 'town',
  label: 'Merry Hearthwatch',
  bpm: 128,
  style: 'folk',
  sections: [
    section('intro', 4, 0.35, [C, G, Am, F], [bC, bG, bA, bF],
      (b, s) => tavernJig(67, b, s)),
    section('verse', 8, 0.55, [C, G, Am, F, C, G, Dm, G], [bC, bG, bA, bF, bC, bG, bD, bG],
      (b, s) => tavernJig(69, b, s)),
    section('chorus', 8, 0.7, [F, C, G, Am, F, C, G, C], [bF, bC, bG, bA, bF, bC, bG, bC],
      (b, s) => tavernJig(72, b, s)),
    section('verse2', 8, 0.6, [Am, F, C, G, Am, Dm, G, C], [bA, bF, bC, bG, bA, bD, bG, bC],
      (b, s) => tavernJig(67, b, s)),
    section('bridge', 4, 0.45, [Dm, G, C, Am], [bD, bG, bC, bA],
      (b, s) => s === 0 ? 74 : s === 8 ? 72 : 0),
    section('dance', 8, 0.75, [C, G, Am, F, C, G, Dm, G], [bC, bG, bA, bF, bC, bG, bD, bG],
      (b, s) => tavernJig(76, b, s)),
    section('chorus2', 8, 0.8, [F, C, G, Am, F, C, G, C], [bF, bC, bG, bA, bF, bC, bG, bC],
      (b, s) => tavernJig(74, b, s)),
    section('outro', 4, 0.4, [C, G, C, C], [bC, bG, bC, bC],
      (b, s) => s === 0 ? 72 : 0),
  ],
};

// ---- BOSS — "Gauntlet of the Grave Warden" ----------------------------------
const BOSS: Composition = {
  id: 'boss',
  label: 'Gauntlet of the Grave Warden',
  bpm: 156,
  style: 'metal',
  sections: [
    section('intro', 4, 0.6, [Am, Am, Dm, E], [bA, bA, bD, bE],
      (b, s) => rockRiff(48, b, s)),
    section('assault', 8, 0.9, [Am, Am, Dm, E, Am, F, Dm, E], [bA, bA, bD, bE, bA, bF, bD, bE],
      (b, s) => rockRiff(57, b, s)),
    section('chorus', 8, 1.0, [F, E, Am, Am, F, E, Dm, E], [bF, bE, bA, bA, bF, bE, bD, bE],
      (b, s) => rockRiff(60, b, s)),
    section('breakdown', 4, 0.7, [Dm, Dm, E, E], [bD, bD, bE, bE],
      (b, s) => s % 4 === 0 ? 45 : 0),
    section('assault2', 8, 0.95, [Am, F, Dm, E, Am, G, F, E], [bA, bF, bD, bE, bA, bG, bF, bE],
      (b, s) => rockRiff(55, b, s)),
    section('solo', 8, 1.0, [Am, Dm, E, Am, F, Dm, E, Am], [bA, bD, bE, bA, bF, bD, bE, bA],
      (b, s) => shredRun(45, b, s)),
    section('finale', 8, 1.0, [Am, E, Am, Dm, E, Am, E, Am], [bA, bE, bA, bD, bE, bA, bE, bA],
      (b, s) => rockRiff(62, b, s)),
    section('outro', 4, 0.75, [Am, E, Am, Am], [bA, bE, bA, bA],
      (b, s) => rockRiff(50, b, s)),
  ],
};

// ---- MENU — "Wandering Minstrel" --------------------------------------------
const MENU: Composition = {
  id: 'menu',
  label: 'Wandering Minstrel',
  bpm: 88,
  style: 'ballad',
  sections: [
    section('intro', 6, 0.2, [Am, F, C, G, Am, F], [bA, bF, bC, bG, bA, bF],
      (b, s) => etherealPhrase(64, b, s)),
    section('verse', 8, 0.35, [Am, F, C, G, Am, Dm, E, Am], [bA, bF, bC, bG, bA, bD, bE, bA],
      (b, s) => fanfareMotif(65, b, s, 0.4)),
    section('chorus', 8, 0.5, [F, C, G, Am, F, C, Dm, E], [bF, bC, bG, bA, bF, bC, bD, bE],
      (b, s) => fanfareMotif(69, b, s, 0.6)),
    section('verse2', 8, 0.4, [Am, C, F, G, Dm, Am, E, Am], [bA, bC, bF, bG, bD, bA, bE, bA],
      (b, s) => etherealPhrase(67, b, s)),
    section('bridge', 4, 0.3, [Dm, E, Am, C], [bD, bE, bA, bC],
      (b, s) => s === 0 ? 72 : 0),
    section('reprise', 8, 0.55, [F, C, G, Am, F, C, Dm, E], [bF, bC, bG, bA, bF, bC, bD, bE],
      (b, s) => fanfareMotif(71, b, s, 0.7)),
    section('outro', 4, 0.2, [Am, F, C, Am], [bA, bF, bC, bA],
      (b, s) => s === 0 ? 64 : 0),
  ],
};

// ---- SUNSPIRE — "Caravans of Sunspire" (desert town) ------------------------
// Sun-baked bazaar folk. A minor with a Phrygian b2 colour and the Andalusian
// cadence (Am–G–F–E) — exotic and evocative, but built on consonant chords.
const SUNSPIRE: Composition = {
  id: 'sunspire',
  label: 'Caravans of Sunspire',
  bpm: 104,
  style: 'folk',
  sections: [
    section('intro', 4, 0.3, [Am, G, F, E], [bA, bG, bF, bE],
      (b, s) => desertLine(69, b, s)),
    section('bazaar', 8, 0.55, [Am, G, F, E, Am, G, F, E], [bA, bG, bF, bE, bA, bG, bF, bE],
      (b, s) => desertLine(69, b, s)),
    section('chorus', 8, 0.7, [Dm, Am, Bb, F, Dm, E, Am, E], [bD, bA, bBb, bF, bD, bE, bA, bE],
      (b, s) => fanfareMotif(69, b, s, 0.7), { style: 'ballad' }),
    section('dance', 8, 0.7, [Am, G, F, E, Dm, Am, E, Am], [bA, bG, bF, bE, bD, bA, bE, bA],
      (b, s) => desertLine(72, b, s)),
    section('bridge', 4, 0.45, [Dm, Bb, E, Am], [bD, bBb, bE, bA],
      (b, s) => etherealPhrase(69, b, s)),
    section('finale', 8, 0.85, [Am, F, C, G, Am, Bb, E, Am], [bA, bF, bC, bG, bA, bBb, bE, bA],
      (b, s) => fanfareMotif(74, b, s, 1), { style: 'epic' }),
    section('outro', 4, 0.3, [Am, G, F, E], [bA, bG, bF, bE],
      (b, s) => desertLine(69, b, s)),
  ],
};

// ---- WILDS — "Roads of the Open Wild" (overworld) ---------------------------
// Bright G-major travelling anthem — heroic, open-road exploration that swells
// into a soaring orchestral chorus. Popular, sunny key for the surface world.
const WILDS: Composition = {
  id: 'wilds',
  label: 'Roads of the Open Wild',
  bpm: 120,
  style: 'epic',
  sections: [
    section('intro', 4, 0.35, [G, D, Em, C], [bG, bD, bEm, bC],
      (b, s) => wanderMotif(67, b, s, 0.6)),
    section('verse', 8, 0.6, [G, D, Em, C, G, D, C, D], [bG, bD, bEm, bC, bG, bD, bC, bD],
      (b, s) => wanderMotif(67, b, s, 0.7), { style: 'ballad' }),
    section('chorus', 8, 0.85, [C, G, D, Em, C, G, Am, D], [bC, bG, bD, bEm, bC, bG, bA, bD],
      (b, s) => wanderMotif(74, b, s, 1)),
    section('verse2', 8, 0.65, [Em, C, G, D, Em, Am, C, D], [bEm, bC, bG, bD, bEm, bA, bC, bD],
      (b, s) => fanfareMotif(71, b, s, 0.7), { style: 'ballad' }),
    section('bridge', 4, 0.5, [Am, C, D, D], [bA, bC, bD, bD],
      (b, s) => etherealPhrase(74, b, s)),
    section('ride', 8, 0.9, [G, D, Em, C, G, Bm, C, D], [bG, bD, bEm, bC, bG, bBm, bC, bD],
      (b, s) => shredRun(55, b, s), { style: 'rock' }),
    section('summit', 8, 1.0, [C, G, D, Em, C, G, D, G], [bC, bG, bD, bEm, bC, bG, bD, bG],
      (b, s) => wanderMotif(79, b, s, 1)),
    section('outro', 4, 0.4, [G, C, G, G], [bG, bC, bG, bG],
      (b, s) => s === 0 ? 67 : 0),
  ],
};

// ---- TAVERN — "The Hearth & Tankard" (town interiors) -----------------------
// Warm, rounded G-major folk for the tavern, guild, forge and apothecary —
// cosier and slower than the bright town-square jig, so stepping indoors shifts.
const TAVERN: Composition = {
  id: 'tavern',
  label: 'The Hearth & Tankard',
  bpm: 112,
  style: 'folk',
  sections: [
    section('intro', 4, 0.3, [G, C, G, D], [bG, bC, bG, bD],
      (b, s) => tavernJig(67, b, s)),
    section('verse', 8, 0.5, [G, Em, C, D, G, Em, Am, D], [bG, bEm, bC, bD, bG, bEm, bA, bD],
      (b, s) => tavernJig(67, b, s)),
    section('chorus', 8, 0.65, [C, G, D, Em, C, G, D, G], [bC, bG, bD, bEm, bC, bG, bD, bG],
      (b, s) => tavernJig(71, b, s)),
    section('verse2', 8, 0.55, [G, C, Em, D, G, Am, C, D], [bG, bC, bEm, bD, bG, bA, bC, bD],
      (b, s) => tavernJig(67, b, s)),
    section('toast', 4, 0.45, [C, D, G, Em], [bC, bD, bG, bEm],
      (b, s) => s === 0 ? 74 : s === 8 ? 72 : 0),
    section('reel', 8, 0.7, [G, D, Em, C, G, D, Am, D], [bG, bD, bEm, bC, bG, bD, bA, bD],
      (b, s) => tavernJig(74, b, s)),
    section('outro', 4, 0.35, [G, C, G, G], [bG, bC, bG, bG],
      (b, s) => s === 0 ? 67 : 0),
  ],
};

// ---- MINE — "Deepdelve Dirge" (Collapsed Silver Mine cave) ------------------
// D-minor working-rock — the swing of picks in the dark, driving and grim.
const MINE: Composition = {
  id: 'mine',
  label: 'Deepdelve Dirge',
  bpm: 112,
  style: 'rock',
  sections: [
    section('intro', 4, 0.4, [Dm, Dm, Bb, C], [bD, bD, bBb, bC],
      (b, s) => dreadLine(50, b, s)),
    section('verse', 8, 0.65, [Dm, Bb, F, C, Dm, Gm, C, Dm], [bD, bBb, bF, bC, bD, bGm, bC, bD],
      (b, s) => rockRiff(50, b, s)),
    section('chorus', 8, 0.85, [Bb, F, C, Dm, Bb, F, Gm, C], [bBb, bF, bC, bD, bBb, bF, bGm, bC],
      (b, s) => rockRiff(53, b, s)),
    section('shaft', 4, 0.55, [Gm, C, Dm, Bb], [bGm, bC, bD, bBb],
      (b, s) => dreadLine(53, b, s)),
    section('verse2', 8, 0.7, [Dm, F, Bb, C, Dm, Gm, Bb, C], [bD, bF, bBb, bC, bD, bGm, bBb, bC],
      (b, s) => rockRiff(48, b, s)),
    section('solo', 8, 0.9, [Dm, Bb, C, Gm, Dm, Bb, C, Dm], [bD, bBb, bC, bGm, bD, bBb, bC, bD],
      (b, s) => shredRun(45, b, s), { style: 'metal' }),
    section('outro', 4, 0.45, [Dm, Bb, C, Dm], [bD, bBb, bC, bD],
      (b, s) => dreadLine(50, b, s)),
  ],
};

// ---- HOLLOW — "The Hollow Beneath" (Hollow cave) ----------------------------
// E-minor dark-ethereal — cold air, distant drips, a slow unnerving swell.
const HOLLOW: Composition = {
  id: 'hollow',
  label: 'The Hollow Beneath',
  bpm: 90,
  style: 'ethereal',
  sections: [
    section('intro', 6, 0.2, [Em, C, G, D, Am, Em], [bEm, bC, bG, bD, bA, bEm],
      (b, s) => etherealPhrase(64, b, s)),
    section('verse', 8, 0.4, [Em, C, G, D, Em, Am, Bm, Em], [bEm, bC, bG, bD, bEm, bA, bBm, bEm],
      (b, s) => dreadLine(59, b, s), { style: 'dark' }),
    section('chorus', 8, 0.6, [C, G, D, Em, C, G, Am, Bm], [bC, bG, bD, bEm, bC, bG, bA, bBm],
      (b, s) => etherealPhrase(67, b, s)),
    section('verse2', 8, 0.45, [Em, Am, C, D, Em, Bm, G, Em], [bEm, bA, bC, bD, bEm, bBm, bG, bEm],
      (b, s) => dreadLine(57, b, s), { style: 'dark' }),
    section('bridge', 4, 0.35, [Am, Bm, Em, C], [bA, bBm, bEm, bC],
      (b, s) => s === 0 ? 71 : 0),
    section('swell', 8, 0.7, [C, G, D, Em, C, G, Bm, Em], [bC, bG, bD, bEm, bC, bG, bBm, bEm],
      (b, s) => fanfareMotif(64, b, s, 0.7), { style: 'ballad' }),
    section('outro', 4, 0.2, [Em, C, Em, Em], [bEm, bC, bEm, bEm],
      (b, s) => s === 0 ? 59 : 0),
  ],
};

// ---- BANNER — "Banner of the Undermaw" (title / character-select) -----------
// The epic title anthem — the piece that greets the player and carries into
// character select. D major, 132 BPM, ~98s, loops seamlessly. Built from ONE
// bespoke 8-note heroic arch (A4-D5-F#5-B5 rising to a bright 9th peak, then
// G5-F#5-E5-D5 falling home): stated, echoed a perfect-fourth below, transposed
// up a fourth, and pushed to a D6 climax over I-IV-V (D-G-A) drama with a true
// V->vi deceptive cadence and borrowed bVII/iv (C, Gm) shadow-touches for
// Undermaw menace. The outro ends on V (A) so the loop snaps back to the tonic
// herald. (Product of a judge-panel design workflow; T-5 organum echo verified
// diatonic on integration.)
const BANNER: Composition = {
  id: 'banner',
  label: 'Banner of the Undermaw',
  bpm: 132,
  style: 'epic',
  sections: [
    // HERALD — bare hook over I–V, timpani-lit; dominant leaves the door open.
    section('herald', 4, 0.4, [D, D, A, A], [bD, bD, bA, bA],
      (b, s) => b % 2 === 0 ? bannerCall(0, b, s) : (s === 0 ? 74 : s === 8 ? 78 : 0)),
    // THEME — full hook with I–IV–V (D G A) drama; ends A(V)->Bm(vi), a true
    // deceptive cadence.
    section('theme', 8, 0.72, [D, G, A, D, Bm, G, A, Bm], [bD, bG, bA, bD, bBm, bG, bA, bBm],
      (b, s) => bannerPhrase(0, b, s)),
    // LIFT — IV-anchored brighter restatement; another V->vi deceptive turn.
    section('lift', 8, 0.84, [G, D, Em, A, G, D, A, Bm], [bG, bD, bEm, bA, bG, bD, bA, bBm],
      (b, s) => bannerPhrase(0, b, s)),
    // BRIDGE — relative-minor shadow with a borrowed bVII (C) and iv (Gm) for a
    // flash of Undermaw menace; F# secondary dominant pulls back. Hook yearns
    // a whole step down.
    section('bridge', 6, 0.55, [Bm, G, Em, C, Gm, Fs], [bBm, bG, bEm, bC, bGm, bFs],
      (b, s) => b % 2 === 0 ? bannerCall(-2, b, s) : bannerAnswer(-2, b, s)),
    // SURGE — dominant build, whole hook transposed up a fourth, F#->Bm sting.
    section('surge', 8, 0.9, [G, A, D, Bm, G, A, Fs, Bm], [bG, bA, bD, bBm, bG, bA, bFs, bBm],
      (b, s) => bannerPhrase(5, b, s)),
    // CLIMAX — hook at its ceiling (peaks on D6) over an I–IV–V–I triumph.
    section('climax', 8, 1.0, [D, G, A, D, G, A, Bm, A], [bD, bG, bA, bD, bG, bA, bBm, bA],
      (b, s) => (b % 4) < 2 ? bannerClimax(0, b, s) : bannerPhrase(0, b, s)),
    // CODA — grand final statement + answer; a fleeting iv (Gm) darkens the
    // triumph before resolving through IV to a held V.
    section('coda', 8, 0.95, [D, A, Bm, G, D, Gm, A, A], [bD, bA, bBm, bG, bD, bGm, bA, bA],
      (b, s) => b % 2 === 0 ? bannerClimax(0, b, s) : bannerAnswer(0, b, s)),
    // OUTRO — plagal-then-dominant cadence ending on V so the loop snaps to tonic.
    section('outro', 4, 0.6, [D, G, A, A], [bD, bG, bA, bA],
      (b, s) => s === 0 ? 74 : s === 8 ? 81 : 0),
  ],
};

// ---- registry ---------------------------------------------------------------
export const COMPOSITIONS: Record<string, Composition> = {
  crypt: CRYPT,
  molten: MOLTEN,
  frost: FROST,
  toxic: TOXIC,
  clockwork: CLOCKWORK,
  arena: ARENA,
  bog: BOG,
  storm: STORM,
  shadow: SHADOW,
  sanctum: SANCTUM,
  town: TOWN,
  sunspire: SUNSPIRE,
  wilds: WILDS,
  tavern: TAVERN,
  mine: MINE,
  hollow: HOLLOW,
  banner: BANNER,
  boss: BOSS,
  menu: MENU,
};

export const THEME_COMPOSITIONS: Record<ThemeId, Composition> = {
  crypt: CRYPT,
  molten: MOLTEN,
  frost: FROST,
  toxic: TOXIC,
  clockwork: CLOCKWORK,
  arena: ARENA,
  bog: BOG,
  storm: STORM,
  shadow: SHADOW,
  sanctum: SANCTUM,
  town: TOWN,
};

/** All playable compositions for the settings music-track picker. */
export const MUSIC_TRACK_LIST: { id: string; label: string }[] = [
  { id: 'auto', label: 'Auto (match realm)' },
  ...Object.values(COMPOSITIONS).map((c) => ({ id: c.id, label: c.label })),
];

export function compositionLabel(id: string): string {
  if (id === 'auto') return 'Auto (match realm)';
  return COMPOSITIONS[id]?.label ?? 'Auto (match realm)';
}