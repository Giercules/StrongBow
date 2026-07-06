// Composition types for the multi-section procedural soundtrack.

export type MusicStyle =
  | 'ballad'   // soaring melodies, strings, gentle drums
  | 'rock'     // power chords, driving drums, guitar leads
  | 'metal'    // aggressive, double-kick, shred solos
  | 'epic'     // orchestral layers, timpani, choir pads
  | 'folk'     // lute-like plucks, jaunty rhythm
  | 'dark'     // brooding bass, dissonance, sparse
  | 'ethereal'; // airy pads, slow tempo, reverb-heavy

export interface SongSection {
  id: string;
  bars: number;
  bpm?: number;
  intensity: number;
  chords: number[][];
  bass: number[];
  lead: number[];
  style?: MusicStyle;
}

export interface Composition {
  id: string;
  label: string;
  bpm: number;
  style: MusicStyle;
  sections: SongSection[];
}

export function totalSteps(c: Composition): number {
  return c.sections.reduce((n, s) => n + s.bars * 16, 0);
}

export function resolveSection(c: Composition, globalStep: number): {
  section: SongSection;
  localStep: number;
  bpm: number;
  style: MusicStyle;
} {
  let rem = globalStep;
  for (const section of c.sections) {
    const len = section.bars * 16;
    if (rem < len) {
      return {
        section,
        localStep: rem,
        bpm: section.bpm ?? c.bpm,
        style: section.style ?? c.style,
      };
    }
    rem -= len;
  }
  const last = c.sections[c.sections.length - 1];
  return {
    section: last,
    localStep: 0,
    bpm: last.bpm ?? c.bpm,
    style: last.style ?? c.style,
  };
}