// Shared music-theory helpers for procedural composition.

export const A4 = 440;
export const mtof = (m: number): number => A4 * Math.pow(2, (m - 69) / 12);

// ---- chord shapes (mid-octave triads) ---------------------------------------
export const C = [60, 64, 67];
export const G = [55, 59, 62];
export const Am = [57, 60, 64];
export const F = [53, 57, 60];
export const Dm = [50, 53, 57];
export const E = [52, 56, 59];
export const Em = [52, 55, 59];
export const Bb = [58, 62, 65];
export const D = [50, 54, 57];
export const Gm = [55, 58, 62];
export const Cm = [60, 63, 67];
export const Ab = [56, 60, 63];
export const Eb = [51, 55, 58];
export const Bm = [59, 62, 66];
export const Fs = [54, 57, 61];
export const A = [57, 61, 64]; // A MAJOR (the V of D) — needed by the title anthem

// ---- bass roots (low octave) ------------------------------------------------
export const bC = 36, bG = 31, bA = 33, bF = 29, bD = 38, bE = 40, bBb = 34;
export const bEm = 40, bGm = 31, bCm = 36, bAb = 44, bEb = 39, bBm = 35, bFs = 42;

/** Repeat an array to fill `count` slots (one per bar). */
export function cycle<T>(arr: T[], count: number): T[] {
  return Array.from({ length: count }, (_, i) => arr[i % arr.length]);
}

/** Build a 16th-note lead array from a per-bar callback. */
export function expandMelody(bars: number, fn: (bar: number, step: number) => number): number[] {
  const lead: number[] = [];
  for (let b = 0; b < bars; b++) {
    for (let s = 0; s < 16; s++) lead.push(fn(b, s));
  }
  return lead;
}

/** Classic heroic fanfare motif — rising then resolving. */
export function fanfareMotif(root: number, bar: number, step: number, energy = 1): number {
  const phrase = bar % 4;
  if (phrase === 0) {
    if (step === 0) return root;
    if (step === 4) return root + 4;
    if (step === 8) return root + 7;
    if (step === 12) return root + 4;
  }
  if (phrase === 1) {
    if (step === 0) return root + 2;
    if (step === 6) return root + 4;
    if (step === 10) return root + 2;
  }
  if (phrase === 2 && energy > 0.6) {
    if (step === 0) return root + 7;
    if (step === 4) return root + 9;
    if (step === 8) return root + 11;
    if (step === 12) return root + 7;
  }
  if (phrase === 3) {
    if (step === 0) return root + 4;
    if (step === 8) return root;
  }
  return 0;
}

/** Driving rock riff — eighth-note power-chord roots. */
export function rockRiff(root: number, bar: number, step: number): number {
  const hits = [0, 2, 4, 6, 8, 10, 12, 14];
  if (!hits.includes(step)) return 0;
  const flip = bar % 2 === 1 ? 7 : 0;
  return root + flip;
}

/** Sparse ethereal phrase — long sustained notes. */
export function etherealPhrase(root: number, bar: number, step: number): number {
  if (step === 0) return root + (bar % 3) * 2;
  if (step === 8 && bar % 2 === 1) return root + 7;
  return 0;
}

/** Ominous creeping line — chromatic lower register. */
export function dreadLine(root: number, bar: number, step: number): number {
  if (step === 0) return root;
  if (step === 4) return root - 1;
  if (step === 8) return root + 2;
  if (step === 12) return root;
  return 0;
}

/** Folk tavern jig — bouncy dotted rhythm. */
export function tavernJig(root: number, bar: number, step: number): number {
  const pat = [0, 3, 6, 8, 10, 12];
  if (!pat.includes(step)) return 0;
  const bounce = [0, 2, 4, 2, 0, -1][pat.indexOf(step)];
  return root + bounce + (bar % 2 === 0 ? 0 : 2);
}

/** Metal solo run — fast sixteenth fills every 4 bars. */
export function shredRun(root: number, bar: number, step: number): number {
  if (bar % 4 !== 3) return rockRiff(root + 12, bar, step);
  const run = [0, 2, 3, 5, 7, 5, 3, 2, 0, -2, 0, 2, 3, 5, 7, 12];
  return root + 12 + run[step];
}

/** Snake-charmer desert line — Phrygian ornamentation (b2/b6 colour) for an
 *  exotic-but-consonant caravan melody over an Andalusian descent. */
export function desertLine(root: number, bar: number, step: number): number {
  const phrase = bar % 4;
  if (phrase === 0) {
    if (step === 0) return root;
    if (step === 3) return root + 1;  // Phrygian b2 flourish
    if (step === 6) return root;
    if (step === 8) return root + 3;
    if (step === 12) return root + 2;
  }
  if (phrase === 1) {
    if (step === 0) return root + 3;
    if (step === 4) return root + 5;
    if (step === 7) return root + 3;
    if (step === 10) return root + 1;
    if (step === 12) return root;
  }
  if (phrase === 2) {
    if (step === 0) return root + 7;
    if (step === 4) return root + 8;  // b6 bend
    if (step === 8) return root + 7;
    if (step === 11) return root + 5;
    if (step === 14) return root + 3;
  }
  if (phrase === 3) {
    if (step === 0) return root + 2;
    if (step === 6) return root + 1;
    if (step === 12) return root;
  }
  return 0;
}

/** Flowing major-pentatonic travelling line — bright, forward-moving overworld
 *  melody that climbs to the leading tone for a heroic, open-road lift. */
export function wanderMotif(root: number, bar: number, step: number, energy = 1): number {
  const phrase = bar % 4;
  if (phrase === 0) {
    if (step === 0) return root;
    if (step === 4) return root + 4;
    if (step === 8) return root + 7;
    if (step === 12) return root + 9;
  }
  if (phrase === 1) {
    if (step === 0) return root + 7;
    if (step === 4) return root + 4;
    if (step === 8) return root + 2;
    if (step === 12) return root;
  }
  if (phrase === 2 && energy > 0.5) {
    if (step === 0) return root + 9;
    if (step === 4) return root + 11; // major-7 leading tone
    if (step === 8) return root + 12;
    if (step === 12) return root + 9;
  }
  if (phrase === 3) {
    if (step === 0) return root + 7;
    if (step === 6) return root + 4;
    if (step === 12) return root;
  }
  return 0;
}

// ---- "Banner of the Undermaw" title-anthem hook -----------------------------
// The whole title anthem is built from ONE 8-note heroic arch, transposed and
// answered. T = MIDI transpose from the D-major home statement. Notes land on
// even half-beats (0,2,4,6,8,10,12,14) so the motif marches over the pad/arp.

/** STATEMENT — A4 D5 F#5 B5 (rise up the D triad, leaping past the octave to a
 *  bright 9th peak — the fingerprint, not a bare arpeggio) then G5 F#5 E5 D5
 *  (a pure-scale fall home). */
export function bannerCall(T: number, bar: number, step: number): number {
  const seq = [69, 74, 78, 83, 79, 78, 76, 74];
  const idx = [0, 2, 4, 6, 8, 10, 12, 14].indexOf(step);
  return idx === -1 ? 0 : seq[idx] + T;
}

/** ANSWER — A5 F#5 E5 D5 E5 C#5 D5 D5: a stepwise sigh to the tonic, then a firm
 *  E–C#(leading-tone)–D cadence that lands decisively on a held D. */
export function bannerAnswer(T: number, bar: number, step: number): number {
  const seq = [81, 78, 76, 74, 76, 73, 74, 74];
  const idx = [0, 2, 4, 6, 8, 10, 12, 14].indexOf(step);
  return idx === -1 ? 0 : seq[idx] + T;
}

/** CLIMAX variant reaching the D6 ceiling — D5 F#5 A5 D6 B5 A5 G5 F#5. */
export function bannerClimax(T: number, bar: number, step: number): number {
  const seq = [74, 78, 81, 86, 83, 81, 79, 78];
  const idx = [0, 2, 4, 6, 8, 10, 12, 14].indexOf(step);
  return idx === -1 ? 0 : seq[idx] + T;
}

/** CALL-AND-RESPONSE builder — the 4-bar heroic sentence the anthem loops:
 *  state, echo a PERFECT FOURTH below (a diatonic parallel-organum lift — stays
 *  fully in D major; a third-below would smear chromatics against the pads),
 *  restate, then answer. */
export function bannerPhrase(T: number, bar: number, step: number): number {
  const p = bar % 4;
  if (p === 0) return bannerCall(T, bar, step);
  if (p === 1) return bannerCall(T - 5, bar, step); // echo down a perfect 4th (diatonic)
  if (p === 2) return bannerCall(T, bar, step);
  return bannerAnswer(T, bar, step);
}