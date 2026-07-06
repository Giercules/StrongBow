import { mtof } from './theory';
import type { MusicStyle } from './types';

/** Voice rendering callbacks injected by AudioSystem. */
export interface VoiceCtx {
  tone: (
    freq: number,
    t: number,
    dur: number,
    type: OscillatorType,
    peak: number,
    bus: AudioNode,
    opts?: { attack?: number; release?: number; detune?: number; reverb?: number; vibrato?: number }
  ) => void;
  noiseHit: (
    t: number,
    dur: number,
    peak: number,
    filter: { type: BiquadFilterType; freq: number; q?: number },
    bus: AudioNode
  ) => void;
  kick: (t: number, peak?: number) => void;
  musicBus: AudioNode;
}

/** Power chord — root + fifth, detuned saws for guitar body. */
export function powerChord(ctx: VoiceCtx, root: number, t: number, dur: number, peak: number): void {
  for (const interval of [0, 7]) {
    ctx.tone(mtof(root + interval), t, dur, 'sawtooth', peak * 0.7, ctx.musicBus, {
      attack: 0.008,
      release: 0.1,
      detune: interval === 0 ? -8 : 8,
    });
    ctx.tone(mtof(root + interval), t, dur, 'square', peak * 0.25, ctx.musicBus, {
      attack: 0.005,
      release: 0.08,
    });
  }
}

/** String pad — slow-attack detuned saws. */
export function stringPad(ctx: VoiceCtx, chord: number[], t: number, dur: number, peak: number): void {
  for (const m of chord) {
    ctx.tone(mtof(m - 12), t, dur, 'sawtooth', peak, ctx.musicBus, {
      attack: 0.3,
      release: 0.5,
      detune: -5,
      reverb: 0.6,
    });
    ctx.tone(mtof(m - 12), t, dur, 'sawtooth', peak * 0.8, ctx.musicBus, {
      attack: 0.3,
      release: 0.5,
      detune: 5,
      reverb: 0.6,
    });
  }
}

/** Folk pluck — short triangle bursts. */
export function folkPluck(ctx: VoiceCtx, note: number, t: number, peak: number): void {
  ctx.tone(mtof(note), t, 0.12, 'triangle', peak, ctx.musicBus, { attack: 0.002, release: 0.08, reverb: 0.15 });
  ctx.tone(mtof(note + 12), t, 0.08, 'sine', peak * 0.3, ctx.musicBus, { release: 0.05 });
}

/** Lead voice with style-appropriate timbre. */
export function playLead(ctx: VoiceCtx, note: number, t: number, style: MusicStyle, intensity: number): void {
  if (style === 'metal' || style === 'rock') {
    ctx.tone(mtof(note), t, 0.22, 'sawtooth', 0.14 + intensity * 0.06, ctx.musicBus, {
      attack: 0.004,
      release: 0.12,
      reverb: 0.2,
      vibrato: 3,
    });
    ctx.tone(mtof(note - 7), t, 0.18, 'square', 0.06, ctx.musicBus, { release: 0.1 });
  } else if (style === 'folk') {
    folkPluck(ctx, note, t, 0.14);
    ctx.tone(mtof(note - 7), t, 0.14, 'triangle', 0.06, ctx.musicBus, { release: 0.1 });
  } else if (style === 'ethereal' || style === 'ballad') {
    ctx.tone(mtof(note), t, 0.35, 'triangle', 0.1 + intensity * 0.04, ctx.musicBus, {
      attack: 0.02,
      release: 0.25,
      reverb: 0.5,
      vibrato: 4,
    });
    ctx.tone(mtof(note), t, 0.3, 'sine', 0.05, ctx.musicBus, { release: 0.2, reverb: 0.4 });
    ctx.tone(mtof(note - 7), t, 0.28, 'triangle', 0.04, ctx.musicBus, { attack: 0.02, release: 0.2, reverb: 0.35 });
  } else if (style === 'dark') {
    ctx.tone(mtof(note), t, 0.25, 'sawtooth', 0.1, ctx.musicBus, { attack: 0.02, release: 0.18, reverb: 0.35 });
    ctx.tone(mtof(note - 1), t, 0.2, 'triangle', 0.04, ctx.musicBus, { release: 0.15 });
  } else {
    // epic
    ctx.tone(mtof(note), t, 0.22, 'square', 0.12, ctx.musicBus, { attack: 0.008, release: 0.14, reverb: 0.35, vibrato: 2 });
    ctx.tone(mtof(note), t, 0.2, 'triangle', 0.07, ctx.musicBus, { release: 0.12 });
    ctx.tone(mtof(note + 12), t, 0.12, 'sine', 0.04, ctx.musicBus, { release: 0.08, reverb: 0.3 });
    ctx.tone(mtof(note - 7), t, 0.18, 'triangle', 0.05, ctx.musicBus, { attack: 0.01, release: 0.12 });
  }
}

/** Style-aware drum kit. */
export function playDrums(
  ctx: VoiceCtx,
  inBar: number,
  step: number,
  style: MusicStyle,
  intensity: number,
  t: number
): void {
  const beat = inBar % 4 === 0;
  if (beat) ctx.kick(t, 0.65 + intensity * 0.35);

  if (style === 'metal') {
    if (inBar % 2 === 0) ctx.kick(t + 0.06, 0.3 + intensity * 0.15);
    if (inBar === 4 || inBar === 12)
      ctx.noiseHit(t, 0.2, 0.3 + intensity * 0.25, { type: 'bandpass', freq: 2200, q: 0.8 }, ctx.musicBus);
    if (step % 2 === 0)
      ctx.noiseHit(t, 0.05, 0.08 + intensity * 0.06, { type: 'highpass', freq: 8000 }, ctx.musicBus);
  } else if (style === 'rock') {
    if (inBar === 4 || inBar === 12)
      ctx.noiseHit(t, 0.18, 0.28 + intensity * 0.2, { type: 'bandpass', freq: 2000, q: 0.7 }, ctx.musicBus);
    if (step % 2 === 0)
      ctx.noiseHit(t, 0.04, 0.06 + intensity * 0.05, { type: 'highpass', freq: 7500 }, ctx.musicBus);
  } else if (style === 'folk') {
    if (inBar === 8)
      ctx.noiseHit(t, 0.1, 0.15, { type: 'bandpass', freq: 1600, q: 0.6 }, ctx.musicBus);
    if (step % 4 === 0)
      ctx.noiseHit(t, 0.03, 0.04, { type: 'highpass', freq: 6000 }, ctx.musicBus);
  } else if (style === 'ethereal' || style === 'ballad') {
    if (inBar === 8)
      ctx.noiseHit(t, 0.12, 0.12 + intensity * 0.1, { type: 'bandpass', freq: 1400, q: 0.5 }, ctx.musicBus);
    if (step % 4 === 0 && intensity > 0.5)
      ctx.noiseHit(t, 0.03, 0.04, { type: 'highpass', freq: 6500 }, ctx.musicBus);
  } else if (style === 'dark') {
    if (inBar === 0)
      ctx.noiseHit(t, 0.15, 0.15 + intensity * 0.1, { type: 'lowpass', freq: 900 }, ctx.musicBus);
    if (step % 4 === 0)
      ctx.noiseHit(t, 0.03, 0.03, { type: 'highpass', freq: 5000 }, ctx.musicBus);
  } else {
    // epic — timpani-like low hits + crash
    if (inBar === 0 || inBar === 8)
      ctx.kick(t, 0.5 + intensity * 0.3);
    if (inBar === 4 || inBar === 12)
      ctx.noiseHit(t, 0.22, 0.3 + intensity * 0.2, { type: 'bandpass', freq: 1800, q: 0.6 }, ctx.musicBus);
    if (step % 2 === 0)
      ctx.noiseHit(t, 0.04, 0.05 + intensity * 0.04, { type: 'highpass', freq: 7000 }, ctx.musicBus);
  }
}

/** Style-aware bass line. */
export function playBass(
  ctx: VoiceCtx,
  root: number,
  inBar: number,
  style: MusicStyle,
  t: number
): void {
  const play = inBar % 4 === 0 || inBar === 6 || inBar === 14;
  if (!play) return;
  const note = inBar === 6 ? root + 7 : root + 12;

  if (style === 'metal' || style === 'rock') {
    powerChord(ctx, note - 12, t, 0.18, 0.2);
  } else if (style === 'folk') {
    ctx.tone(mtof(note), t, 0.14, 'triangle', 0.18, ctx.musicBus, { attack: 0.004, release: 0.06 });
  } else {
    ctx.tone(mtof(note), t, 0.18, 'sawtooth', 0.2, ctx.musicBus, { attack: 0.005, release: 0.08 });
    ctx.tone(mtof(note - 12), t, 0.2, 'square', 0.07, ctx.musicBus, { release: 0.06 });
  }
}