import { settings } from '../core/GameSettings';
import type { ThemeId } from '../core/types';

// ----------------------------------------------------------------------------
// AudioSystem — fully procedural, self-contained Web Audio engine.
//   • Layered, multi-voice music (heroic dungeon theme + intense boss theme)
//   • 20+ procedural SFX
//   • Optional real-audio override: if /audio/theme.mp3|ogg (etc.) exist they
//     are used instead of the synthesized music — no code changes needed.
// ----------------------------------------------------------------------------

type SongId = 'dungeon' | 'boss' | 'menu';

const A = 440;
const mtof = (m: number): number => A * Math.pow(2, (m - 69) / 12);

// ---- song definitions (MIDI note numbers) ----------------------------------
interface Song {
  bpm: number;
  steps: number; // total 16th steps in the loop
  chords: number[][]; // triad per bar
  bass: number[]; // bass root per bar
  lead: number[]; // melody, one entry per step (0 = rest)
  swing: number;
  intensity: number; // 0..1 drives drums / brightness
}

// ---- chord shapes (mid octave triads) -------------------------------------
const Am = [57, 60, 64];
const F = [53, 57, 60];
const C = [60, 64, 67];
const G = [55, 59, 62];
const Dm = [50, 53, 57];
const E = [52, 56, 59];
const Bb = [58, 62, 65];
// ---- bass roots (low octave) ----------------------------------------------
const bA = 33, bF = 29, bC = 36, bG = 31, bD = 38, bE = 40, bBb = 34;

// HEROIC — the main overworld march. A long 8-bar tune (Am F C G Am Dm E Am)
// with a rising fanfare that develops, in the spirit of a classic adventure
// overworld theme. This is the default dungeon song.
const HEROIC: Song = {
  bpm: 116,
  steps: 128,
  chords: [Am, F, C, G, Am, Dm, E, Am],
  bass: [bA, bF, bC, bG, bA, bD, bE, bA],
  lead: [
    69, 0, 0, 0, 72, 0, 0, 0, 76, 0, 74, 0, 72, 0, 71, 0,
    72, 0, 0, 0, 69, 0, 0, 0, 65, 0, 69, 0, 72, 0, 0, 0,
    76, 0, 0, 0, 72, 0, 0, 0, 67, 0, 72, 0, 76, 0, 79, 0,
    74, 0, 71, 0, 67, 0, 71, 0, 74, 0, 0, 0, 0, 0, 0, 0,
    69, 0, 72, 0, 76, 0, 72, 0, 81, 0, 0, 0, 79, 0, 76, 0,
    77, 0, 0, 0, 74, 0, 0, 0, 69, 0, 74, 0, 77, 0, 0, 0,
    76, 0, 75, 0, 76, 0, 80, 0, 83, 0, 80, 0, 76, 0, 71, 0,
    69, 0, 0, 0, 72, 0, 71, 0, 69, 0, 67, 0, 69, 0, 0, 0,
  ],
  swing: 0,
  intensity: 0.62,
};

// DRIVING — energetic, busy eighths for molten / arena / clockwork.
const DRIVING: Song = {
  bpm: 138,
  steps: 128,
  chords: [Am, Am, F, G, C, G, Dm, E],
  bass: [bA, bA, bF, bG, bC, bG, bD, bE],
  lead: [
    69, 0, 69, 0, 72, 0, 69, 0, 76, 0, 74, 0, 72, 71, 0, 0,
    69, 0, 69, 0, 72, 0, 76, 0, 72, 0, 69, 0, 67, 0, 0, 0,
    65, 0, 69, 0, 72, 0, 69, 0, 65, 0, 69, 0, 72, 0, 74, 0,
    74, 0, 71, 0, 74, 0, 79, 0, 78, 0, 74, 0, 71, 0, 0, 0,
    72, 0, 72, 0, 76, 0, 79, 0, 84, 0, 79, 0, 76, 0, 72, 0,
    74, 0, 71, 0, 67, 0, 71, 0, 74, 0, 79, 0, 76, 0, 0, 0,
    77, 0, 74, 0, 69, 0, 74, 0, 77, 0, 81, 0, 79, 0, 77, 0,
    76, 0, 80, 0, 83, 0, 80, 0, 76, 75, 76, 0, 71, 0, 0, 0,
  ],
  swing: 0,
  intensity: 0.85,
};

// ETHEREAL — sparse, airy, high register for frost / shadow.
const ETHEREAL: Song = {
  bpm: 98,
  steps: 128,
  chords: [Am, C, F, C, Dm, Am, E, Am],
  bass: [bA, bC, bF, bC, bD, bA, bE, bA],
  lead: [
    81, 0, 0, 0, 0, 0, 76, 0, 0, 0, 0, 0, 79, 0, 0, 0,
    84, 0, 0, 0, 0, 0, 79, 0, 0, 0, 76, 0, 0, 0, 0, 0,
    77, 0, 0, 0, 0, 0, 72, 0, 0, 0, 0, 0, 76, 0, 0, 0,
    79, 0, 0, 0, 0, 0, 0, 0, 76, 0, 74, 0, 0, 0, 0, 0,
    81, 0, 0, 0, 84, 0, 0, 0, 0, 0, 79, 0, 0, 0, 0, 0,
    77, 0, 0, 0, 0, 0, 81, 0, 0, 0, 0, 0, 79, 0, 0, 0,
    76, 0, 0, 0, 75, 0, 0, 0, 0, 0, 71, 0, 0, 0, 0, 0,
    72, 0, 0, 0, 0, 0, 0, 0, 69, 0, 0, 0, 0, 0, 0, 0,
  ],
  swing: 0.08,
  intensity: 0.4,
};

// OMINOUS — low, brooding, chromatic for toxic / bog.
const OMINOUS: Song = {
  bpm: 104,
  steps: 128,
  chords: [Am, Am, Dm, Dm, Bb, F, E, E],
  bass: [bA, bA, bD, bD, bBb, bF, bE, bE],
  lead: [
    57, 0, 0, 0, 60, 0, 0, 0, 59, 0, 57, 0, 0, 0, 0, 0,
    57, 0, 0, 0, 58, 0, 0, 0, 60, 0, 0, 0, 59, 0, 0, 0,
    62, 0, 0, 0, 65, 0, 0, 0, 62, 0, 60, 0, 62, 0, 0, 0,
    58, 0, 0, 0, 57, 0, 0, 0, 56, 0, 0, 0, 0, 0, 0, 0,
    57, 0, 60, 0, 64, 0, 60, 0, 0, 0, 59, 0, 57, 0, 0, 0,
    53, 0, 0, 0, 57, 0, 0, 0, 60, 0, 0, 0, 59, 0, 0, 0,
    56, 0, 0, 0, 59, 0, 0, 0, 63, 0, 59, 0, 56, 0, 0, 0,
    57, 0, 0, 0, 56, 0, 57, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  ],
  swing: 0,
  intensity: 0.55,
};

// FINALE — triumphant, major, grand for storm / sanctum.
const FINALE: Song = {
  bpm: 126,
  steps: 128,
  chords: [C, G, Am, F, C, G, F, G],
  bass: [bC, bG, bA, bF, bC, bG, bF, bG],
  lead: [
    72, 0, 0, 0, 76, 0, 79, 0, 84, 0, 0, 0, 79, 0, 0, 0,
    74, 0, 0, 0, 71, 0, 74, 0, 79, 0, 0, 0, 0, 0, 0, 0,
    69, 0, 0, 0, 72, 0, 76, 0, 81, 0, 0, 0, 76, 0, 0, 0,
    77, 0, 0, 0, 74, 0, 77, 0, 81, 0, 0, 0, 0, 0, 0, 0,
    84, 0, 0, 0, 83, 0, 84, 0, 79, 0, 76, 0, 72, 0, 0, 0,
    79, 0, 0, 0, 76, 0, 79, 0, 83, 0, 79, 0, 76, 0, 0, 0,
    77, 0, 79, 0, 81, 0, 83, 0, 84, 0, 86, 0, 84, 0, 0, 0,
    83, 0, 79, 0, 84, 0, 0, 0, 79, 0, 76, 0, 72, 0, 0, 0,
  ],
  swing: 0,
  intensity: 0.9,
};

// BOSS — darker, faster, an 8-bar gauntlet (Am Am Dm E Am F Dm E).
const BOSS: Song = {
  bpm: 150,
  steps: 128,
  chords: [Am, Am, Dm, E, Am, F, Dm, E],
  bass: [bA, bA, bD, bE, bA, bF, bD, bE],
  lead: [
    69, 69, 0, 72, 71, 0, 69, 68, 69, 0, 76, 0, 74, 0, 72, 0,
    69, 69, 0, 72, 71, 0, 69, 68, 69, 0, 67, 0, 64, 0, 0, 0,
    74, 74, 0, 77, 76, 0, 74, 72, 74, 0, 81, 0, 79, 0, 77, 0,
    76, 0, 75, 0, 76, 0, 80, 0, 83, 0, 80, 0, 76, 0, 71, 0,
    69, 69, 0, 72, 76, 0, 72, 0, 69, 0, 68, 0, 69, 0, 0, 0,
    65, 0, 69, 0, 72, 0, 69, 0, 77, 0, 72, 0, 69, 0, 0, 0,
    74, 0, 77, 0, 81, 0, 77, 0, 74, 0, 72, 0, 70, 0, 0, 0,
    76, 0, 80, 0, 83, 0, 80, 76, 75, 0, 76, 0, 71, 0, 0, 0,
  ],
  swing: 0,
  intensity: 0.95,
};

// MENU — calm, spacious title theme.
const MENU: Song = {
  bpm: 92,
  steps: 128,
  chords: [Am, F, C, G, Am, F, E, Am],
  bass: [bA, bF, bC, bG, bA, bF, bE, bA],
  lead: [
    57, 0, 0, 0, 60, 0, 0, 0, 64, 0, 0, 0, 67, 0, 0, 0,
    65, 0, 0, 0, 0, 0, 60, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    64, 0, 0, 0, 67, 0, 0, 0, 72, 0, 0, 0, 0, 0, 0, 0,
    71, 0, 0, 0, 0, 0, 67, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    69, 0, 0, 0, 72, 0, 0, 0, 76, 0, 0, 0, 0, 0, 0, 0,
    65, 0, 0, 0, 69, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    64, 0, 0, 0, 63, 0, 0, 0, 0, 0, 59, 0, 0, 0, 0, 0,
    57, 0, 0, 0, 0, 0, 60, 0, 64, 0, 0, 0, 0, 0, 0, 0,
  ],
  swing: 0.1,
  intensity: 0.25,
};

const SONGS: Record<SongId, Song> = { dungeon: HEROIC, boss: BOSS, menu: MENU };

// Each level theme picks a dungeon song so the music shifts with the mood.
const THEME_SONGS: Record<ThemeId, Song> = {
  crypt: HEROIC,
  molten: DRIVING,
  frost: ETHEREAL,
  toxic: OMINOUS,
  clockwork: DRIVING,
  arena: DRIVING,
  bog: OMINOUS,
  storm: FINALE,
  shadow: ETHEREAL,
  sanctum: FINALE,
};

class AudioSystem {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicBus!: GainNode;
  private sfxBus!: GainNode;
  private reverb!: ConvolverNode;
  private reverbGain!: GainNode;
  private noise!: AudioBuffer;

  private timer: number | null = null;
  private nextStepTime = 0;
  private step = 0;
  private song: Song = HEROIC;
  /** Which dungeon song the current level theme has selected. */
  private dungeonSong: Song = HEROIC;
  private playingId: SongId | null = null;
  private padNodes: AudioNode[] = [];

  private realTracks: Partial<Record<SongId, HTMLMediaElement>> = {};
  private realSource: Partial<Record<SongId, MediaElementAudioSourceNode>> = {};
  private realReady: Partial<Record<SongId, boolean>> = {};
  private activeReal: HTMLMediaElement | null = null;

  private initialized = false;

  // ---- lifecycle ----------------------------------------------------------
  init(): void {
    if (this.initialized) return;
    const Ctx =
      (window.AudioContext as typeof AudioContext) ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.musicBus = this.ctx.createGain();
    this.sfxBus = this.ctx.createGain();
    this.reverb = this.ctx.createConvolver();
    this.reverbGain = this.ctx.createGain();
    this.reverb.buffer = this.makeImpulse(2.2, 2.4);
    this.reverbGain.gain.value = 0.5;

    this.musicBus.connect(this.master);
    this.sfxBus.connect(this.master);
    this.reverb.connect(this.reverbGain);
    this.reverbGain.connect(this.master);
    this.master.connect(this.ctx.destination);

    this.noise = this.makeNoise();
    this.applySettings();
    this.detectRealTracks();
    this.initialized = true;
  }

  /** Must be called from a user gesture to satisfy autoplay policies. */
  unlock(): void {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume();
  }

  private applySettings(): void {
    if (!this.ctx) return;
    const muted = settings.get('muted');
    this.master.gain.value = muted ? 0 : 0.9;
    this.musicBus.gain.value = settings.get('musicEnabled') ? settings.get('musicVolume') : 0;
    this.sfxBus.gain.value = settings.get('sfxVolume');
  }

  setMuted(m: boolean): void {
    settings.set('muted', m);
    if (this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.05);
    this.applySettings();
  }

  setMusicEnabled(on: boolean): void {
    settings.set('musicEnabled', on);
    this.applySettings();
    if (!on) this.stopMusic();
    else if (this.playingId) this.playMusic(this.playingId);
  }

  setMusicVolume(v: number): void {
    settings.setMusicVolume(v);
    if (this.ctx && settings.get('musicEnabled'))
      this.musicBus.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
  }

  setSfxVolume(v: number): void {
    settings.setSfxVolume(v);
    if (this.ctx) this.sfxBus.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
  }

  // ---- impulse / noise ----------------------------------------------------
  private makeImpulse(seconds: number, decay: number): AudioBuffer {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++)
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  private makeNoise(): AudioBuffer {
    const ctx = this.ctx!;
    const len = ctx.sampleRate * 1;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  // ---- low-level voice ----------------------------------------------------
  private tone(
    freq: number,
    t: number,
    dur: number,
    type: OscillatorType,
    peak: number,
    bus: AudioNode,
    opts: { attack?: number; release?: number; detune?: number; reverb?: number; vibrato?: number } = {}
  ): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    if (opts.detune) osc.detune.value = opts.detune;
    const a = opts.attack ?? 0.005;
    const r = opts.release ?? 0.08;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + r);
    osc.connect(g);
    g.connect(bus);
    if (opts.reverb) {
      const rg = ctx.createGain();
      rg.gain.value = opts.reverb;
      g.connect(rg);
      rg.connect(this.reverb);
    }
    if (opts.vibrato) {
      const lfo = ctx.createOscillator();
      const lg = ctx.createGain();
      lfo.frequency.value = 5.5;
      lg.gain.value = opts.vibrato;
      lfo.connect(lg);
      lg.connect(osc.frequency);
      lfo.start(t);
      lfo.stop(t + dur + r);
    }
    osc.start(t);
    osc.stop(t + dur + r + 0.02);
  }

  private noiseHit(
    t: number,
    dur: number,
    peak: number,
    filter: { type: BiquadFilterType; freq: number; q?: number },
    bus: AudioNode
  ): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = filter.type;
    f.frequency.value = filter.freq;
    if (filter.q) f.Q.value = filter.q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(peak, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(bus);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  private kick(t: number, peak = 0.9): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    g.gain.setValueAtTime(peak, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    osc.connect(g);
    g.connect(this.musicBus);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  // ---- music scheduler ----------------------------------------------------
  playMusic(id: SongId): void {
    this.init();
    if (!this.ctx) return;
    if (this.playingId === id && (this.timer !== null || this.activeReal)) return;
    this.stopMusic();
    this.playingId = id;
    if (!settings.get('musicEnabled')) return;

    // Prefer a real track if present.
    if (this.realReady[id] && this.realTracks[id]) {
      const el = this.realTracks[id]!;
      this.activeReal = el;
      el.currentTime = 0;
      void el.play().catch(() => {
        this.activeReal = null;
        this.startProcedural(id);
      });
      return;
    }
    this.startProcedural(id);
  }

  private startProcedural(id: SongId): void {
    this.song = id === 'dungeon' ? this.dungeonSong : SONGS[id];
    this.step = 0;
    this.nextStepTime = this.ctx!.currentTime + 0.06;
    this.timer = window.setInterval(() => this.scheduler(), 25);
  }

  /** Pick the dungeon song that matches a level theme. Call before playMusic. */
  setDungeonTheme(theme: ThemeId): void {
    this.dungeonSong = THEME_SONGS[theme] ?? HEROIC;
    // If the dungeon song is already playing procedurally, swap it live.
    if (this.playingId === 'dungeon' && this.timer !== null) {
      this.song = this.dungeonSong;
      this.step = 0;
    }
  }

  stopMusic(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.activeReal) {
      this.activeReal.pause();
      this.activeReal = null;
    }
    this.padNodes = [];
  }

  private scheduler(): void {
    if (!this.ctx) return;
    const stepDur = 60 / this.song.bpm / 4;
    while (this.nextStepTime < this.ctx.currentTime + 0.12) {
      this.playStep(this.step, this.nextStepTime);
      const swing = this.step % 2 === 1 ? this.song.swing * stepDur : 0;
      this.nextStepTime += stepDur + swing;
      this.step = (this.step + 1) % this.song.steps;
    }
  }

  private playStep(step: number, t: number): void {
    const s = this.song;
    const bar = Math.floor(step / 16) % s.chords.length;
    const inBar = step % 16;
    const chord = s.chords[bar];
    const inten = s.intensity;

    // --- pad: sustain a chord at bar start ---
    if (inBar === 0) {
      const barDur = (60 / s.bpm) * 4;
      for (const m of chord) {
        this.tone(mtof(m - 12), t, barDur * 0.95, 'sawtooth', 0.05, this.musicBus, {
          attack: 0.15,
          release: 0.4,
          detune: -6,
          reverb: 0.5,
        });
        this.tone(mtof(m - 12), t, barDur * 0.95, 'sawtooth', 0.05, this.musicBus, {
          attack: 0.15,
          release: 0.4,
          detune: 6,
        });
      }
    }

    // --- bass ---
    const root = s.bass[bar];
    if (inBar % 4 === 0 || inBar === 6 || inBar === 14) {
      const note = inBar === 6 ? root + 7 : root + 12;
      this.tone(mtof(note), t, 0.16, 'sawtooth', 0.22, this.musicBus, {
        attack: 0.005,
        release: 0.06,
      });
      this.tone(mtof(note - 12), t, 0.18, 'square', 0.06, this.musicBus, { release: 0.05 });
    }

    // --- arpeggio (every 2 steps) ---
    if (step % 2 === 0) {
      const tone = chord[(step / 2) % chord.length];
      this.tone(mtof(tone + 12), t, 0.09, 'triangle', 0.07 + inten * 0.04, this.musicBus, {
        attack: 0.004,
        release: 0.05,
        reverb: 0.25,
      });
    }

    // --- lead ---
    const note = s.lead[step];
    if (note) {
      this.tone(mtof(note), t, 0.18, 'square', 0.12, this.musicBus, {
        attack: 0.008,
        release: 0.14,
        reverb: 0.3,
        vibrato: 2,
      });
      this.tone(mtof(note), t, 0.18, 'triangle', 0.06, this.musicBus, { release: 0.12 });
      this.tone(mtof(note + 12), t, 0.1, 'square', 0.03, this.musicBus, { release: 0.06 });
    }

    // --- drums ---
    const beat = inBar % 4 === 0;
    if (beat) this.kick(t, 0.7 + inten * 0.3);
    if (inBar === 4 || inBar === 12)
      this.noiseHit(t, 0.18, 0.25 + inten * 0.2, { type: 'bandpass', freq: 1900, q: 0.7 }, this.musicBus);
    if (step % 2 === 0)
      this.noiseHit(t, 0.04, 0.05 + inten * 0.05, { type: 'highpass', freq: 7000 }, this.musicBus);
    if (inten > 0.8 && inBar % 2 === 0)
      this.kick(t + 0.06, 0.25); // double-time pulse for boss
  }

  // ---- SFX ----------------------------------------------------------------
  sfx(id: string): void {
    this.init();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const bus = this.sfxBus;
    switch (id) {
      case 'ui_move':
        this.tone(660, t, 0.05, 'square', 0.18, bus, { release: 0.03 });
        break;
      case 'ui_select':
        this.tone(523, t, 0.06, 'square', 0.2, bus);
        this.tone(784, t + 0.06, 0.1, 'square', 0.2, bus);
        break;
      case 'coin':
        this.tone(988, t, 0.05, 'square', 0.18, bus);
        this.tone(1319, t + 0.05, 0.1, 'square', 0.16, bus, { reverb: 0.2 });
        break;
      case 'melee':
      case 'swing':
        this.noiseHit(t, 0.12, 0.25, { type: 'bandpass', freq: 1200, q: 1.2 }, bus);
        this.tone(220, t, 0.08, 'sawtooth', 0.12, bus, { release: 0.04 });
        break;
      case 'hit':
        this.noiseHit(t, 0.08, 0.3, { type: 'lowpass', freq: 2600 }, bus);
        this.tone(160, t, 0.07, 'square', 0.18, bus, { release: 0.03 });
        break;
      case 'hurt':
        this.tone(330, t, 0.16, 'sawtooth', 0.25, bus, { release: 0.08 });
        this.tone(247, t + 0.04, 0.18, 'sawtooth', 0.2, bus);
        break;
      case 'magic':
        for (let i = 0; i < 5; i++)
          this.tone(523 + i * 130, t + i * 0.03, 0.2, 'triangle', 0.12, bus, { reverb: 0.5 });
        this.noiseHit(t, 0.3, 0.1, { type: 'highpass', freq: 3000 }, bus);
        break;
      case 'monster_die':
        this.tone(300, t, 0.25, 'sawtooth', 0.22, bus, { release: 0.15 });
        this.tone(150, t + 0.05, 0.3, 'square', 0.18, bus);
        this.noiseHit(t, 0.25, 0.15, { type: 'lowpass', freq: 1400 }, bus);
        break;
      case 'boss_roar':
        this.tone(70, t, 0.9, 'sawtooth', 0.4, bus, { attack: 0.05, release: 0.4 });
        this.tone(105, t, 0.8, 'square', 0.2, bus, { attack: 0.05 });
        this.noiseHit(t, 0.9, 0.2, { type: 'lowpass', freq: 800 }, bus);
        break;
      case 'generator_destroy':
        this.noiseHit(t, 0.5, 0.3, { type: 'lowpass', freq: 1800 }, bus);
        this.tone(120, t, 0.4, 'sawtooth', 0.25, bus, { release: 0.2 });
        for (let i = 0; i < 4; i++)
          this.tone(800 - i * 120, t + i * 0.04, 0.15, 'square', 0.1, bus);
        break;
      case 'door':
        this.noiseHit(t, 0.3, 0.18, { type: 'lowpass', freq: 700 }, bus);
        this.tone(90, t, 0.25, 'square', 0.15, bus, { release: 0.1 });
        break;
      case 'key':
      case 'chest':
        this.tone(784, t, 0.08, 'square', 0.18, bus);
        this.tone(1047, t + 0.08, 0.12, 'square', 0.16, bus, { reverb: 0.3 });
        this.tone(1319, t + 0.16, 0.16, 'triangle', 0.14, bus, { reverb: 0.3 });
        break;
      case 'shrine':
      case 'potion':
        for (let i = 0; i < 4; i++)
          this.tone(523 + i * 165, t + i * 0.05, 0.25, 'triangle', 0.12, bus, { reverb: 0.5 });
        break;
      case 'levelup':
        [523, 659, 784, 1047, 1319].forEach((f, i) =>
          this.tone(f, t + i * 0.07, 0.3, 'square', 0.16, bus, { reverb: 0.4 })
        );
        break;
      case 'portal':
        for (let i = 0; i < 8; i++)
          this.tone(300 + i * 90, t + i * 0.04, 0.3, 'sine', 0.12, bus, { reverb: 0.6 });
        break;
      case 'lava':
      case 'low_health':
        this.tone(110, t, 0.2, 'sawtooth', 0.18, bus, { release: 0.1 });
        break;
      case 'game_over':
        [440, 392, 349, 262].forEach((f, i) =>
          this.tone(f, t + i * 0.22, 0.4, 'sawtooth', 0.22, bus, { reverb: 0.4 })
        );
        break;
      case 'victory':
        [523, 659, 784, 1047].forEach((f, i) =>
          this.tone(f, t + i * 0.14, 0.5, 'square', 0.2, bus, { reverb: 0.5 })
        );
        break;
      default:
        this.tone(440, t, 0.08, 'square', 0.12, bus);
    }
  }

  // ---- real-track detection ----------------------------------------------
  private detectRealTracks(): void {
    const base = (import.meta.env.BASE_URL || '/') as string;
    const map: Record<SongId, string> = {
      dungeon: 'theme',
      boss: 'boss',
      menu: 'menu',
    };
    const canMp3 = (() => {
      const a = document.createElement('audio');
      return !!a.canPlayType && a.canPlayType('audio/mpeg') !== '';
    })();
    for (const id of Object.keys(map) as SongId[]) {
      const name = map[id];
      const ext = canMp3 ? 'mp3' : 'ogg';
      const el = document.createElement('audio');
      el.loop = true;
      el.preload = 'auto';
      el.src = `${base}audio/${name}.${ext}`;
      el.addEventListener('canplaythrough', () => {
        this.realReady[id] = true;
        if (!this.realSource[id] && this.ctx) {
          try {
            const node = this.ctx.createMediaElementSource(el);
            node.connect(this.musicBus);
            this.realSource[id] = node;
          } catch {
            /* already connected */
          }
        }
      });
      el.addEventListener('error', () => {
        this.realReady[id] = false;
      });
      this.realTracks[id] = el;
    }
  }
}

export const audio = new AudioSystem();
