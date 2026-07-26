import { settings } from '../core/GameSettings';
import {
  COMPOSITIONS,
  THEME_COMPOSITIONS,
  MUSIC_TRACK_LIST,
  compositionLabel,
} from './music/compositions';
import { playBass, playDrums, playLead, powerChord, stringPad, type VoiceCtx } from './music/instruments';
import { mtof } from './music/theory';
import type { Composition } from './music/types';
import { resolveSection, totalSteps } from './music/types';

// ----------------------------------------------------------------------------
// AudioSystem — procedural Web Audio engine with multi-section epic songs.
//   • Each realm / town / boss / menu has its own full composition (90–150 s)
//   • Layered rock, ballad, folk, metal, and epic orchestral voices
//   • Optional real-audio override: drop MP3/OGG in public/audio/ per track id
// ----------------------------------------------------------------------------

type SongSlot = 'dungeon' | 'boss' | 'menu';

export const MUSIC_TRACKS = MUSIC_TRACK_LIST;

export function musicTrackLabel(id: string): string {
  return compositionLabel(id);
}

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
  private composition: Composition = THEME_COMPOSITIONS.crypt;
  // Composition id for the current dungeon/area. Decoupled from the visual
  // ThemeId so distinct places that share a theme (every town is theme:'town')
  // can each carry their own song — see LevelData.music.
  private lastMusicId = 'crypt';
  private playingSlot: SongSlot | null = null;

  private realTracks = new Map<string, HTMLMediaElement>();
  private realSource = new Map<string, MediaElementAudioSourceNode>();
  private realReady = new Set<string>();
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
    this.reverb.buffer = this.makeImpulse(2.8, 2.6);
    this.reverbGain.gain.value = 0.55;

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
    else if (this.playingSlot) this.playMusic(this.playingSlot);
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

  private voiceCtx(): VoiceCtx {
    return {
      tone: this.tone.bind(this),
      noiseHit: this.noiseHit.bind(this),
      kick: this.kick.bind(this),
      musicBus: this.musicBus,
    };
  }

  // ---- music scheduler ----------------------------------------------------
  playMusic(slot: SongSlot): void {
    this.init();
    if (!this.ctx) return;
    if (this.playingSlot === slot && (this.timer !== null || this.activeReal)) return;
    this.stopMusic();
    this.playingSlot = slot;
    if (slot === 'dungeon') this.composition = this.resolveDungeonComposition();

    const trackId = this.trackIdForSlot(slot);
    if (!settings.get('musicEnabled')) return;

    if (this.realReady.has(trackId) && this.realTracks.has(trackId)) {
      const el = this.realTracks.get(trackId)!;
      this.activeReal = el;
      el.currentTime = 0;
      void el.play().catch(() => {
        this.activeReal = null;
        this.startProcedural(slot);
      });
      return;
    }
    this.startProcedural(slot);
  }

  private trackIdForSlot(slot: SongSlot): string {
    if (slot === 'boss') return 'boss';
    if (slot === 'menu') return 'banner'; // epic title anthem (carries into char-select)
    return this.composition.id;
  }

  private startProcedural(slot: SongSlot): void {
    if (slot === 'boss') this.composition = COMPOSITIONS.boss;
    else if (slot === 'menu') this.composition = COMPOSITIONS.banner;
    // dungeon slot keeps the theme-resolved composition
    this.step = 0;
    this.nextStepTime = this.ctx!.currentTime + 0.06;
    this.timer = window.setInterval(() => this.scheduler(), 25);
  }

  private resolveDungeonComposition(): Composition {
    const choice = settings.get('musicTrack');
    if (choice && choice !== 'auto' && COMPOSITIONS[choice]) return COMPOSITIONS[choice];
    return COMPOSITIONS[this.lastMusicId] ?? THEME_COMPOSITIONS.crypt;
  }

  /** Select the dungeon/area song by composition id (a ThemeId works too, since
   *  every realm theme has a matching composition). */
  setDungeonMusic(id: string): void {
    this.lastMusicId = id;
    this.applyDungeonComposition();
  }

  /** The player's explicit pick from Settings → Audio. */
  setMusicTrack(id: string): void {
    settings.set('musicTrack', id);
    this.applyDungeonComposition();
  }

  /**
   * Re-resolve the area song from the realm + the player's choice, and — if
   * that song is what's currently playing — swap to it straight away.
   *
   * The boss theme and the title anthem own the `composition` field while they
   * hold the slot, so they're left strictly alone: reassigning it under a
   * running scheduler would morph the boss fight into the area track mid-song.
   */
  private applyDungeonComposition(): void {
    if (this.playingSlot === 'boss' || this.playingSlot === 'menu') return;
    const next = this.resolveDungeonComposition();
    const changed = next.id !== this.composition.id;
    this.composition = next;
    if (changed && this.playingSlot === 'dungeon') this.restartAreaTrack();
  }

  /**
   * Restart the area song from whatever `composition` now names.
   *
   * A recorded track has to be swapped out by hand: an <audio> element happily
   * keeps playing the old song until it is told otherwise, whereas the
   * procedural scheduler only needs its step reset. Handling just the
   * procedural case is what made the Settings track picker appear dead — every
   * composition ships an MP3, so the recorded path is the one normal play
   * always takes, and the branch that would have swapped it never ran.
   */
  private restartAreaTrack(): void {
    this.stopMusic();
    if (!settings.get('musicEnabled')) return;
    const trackId = this.composition.id;
    if (this.realReady.has(trackId) && this.realTracks.has(trackId)) {
      const el = this.realTracks.get(trackId)!;
      this.activeReal = el;
      el.currentTime = 0;
      void el.play().catch(() => {
        this.activeReal = null;
        this.startProcedural('dungeon');
      });
      return;
    }
    this.startProcedural('dungeon');
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
  }

  private scheduler(): void {
    if (!this.ctx) return;
    const { bpm } = resolveSection(this.composition, this.step);
    const stepDur = 60 / bpm / 4;
    const steps = totalSteps(this.composition);

    while (this.nextStepTime < this.ctx.currentTime + 0.12) {
      this.playStep(this.step);
      const swing = this.step % 2 === 1 ? 0.06 * stepDur : 0;
      this.nextStepTime += stepDur + swing;
      this.step = (this.step + 1) % steps;
    }
  }

  private playStep(globalStep: number): void {
    const { section, localStep, bpm, style } = resolveSection(this.composition, globalStep);
    const t = this.nextStepTime;
    const bar = Math.floor(localStep / 16) % section.bars;
    const inBar = localStep % 16;
    const chord = section.chords[bar];
    const inten = section.intensity;
    const barDur = (60 / bpm) * 4;
    const v = this.voiceCtx();

    // --- harmony bed ---
    if (inBar === 0) {
      if (style === 'metal' || style === 'rock') {
        powerChord(v, section.bass[bar], t, barDur * 0.9, 0.06 + inten * 0.04);
      } else {
        stringPad(v, chord, t, barDur * 0.95, 0.04 + inten * 0.05);
      }
    }

    // --- bass ---
    playBass(v, section.bass[bar], inBar, style, t);

    // --- arpeggio ---
    if (localStep % 2 === 0 && style !== 'folk') {
      const tone = chord[(localStep / 2) % chord.length];
      v.tone(mtof(tone + 12), t, 0.1, 'triangle', 0.06 + inten * 0.04, this.musicBus, {
        attack: 0.004,
        release: 0.06,
        reverb: style === 'ethereal' ? 0.4 : 0.2,
      });
    }

    // --- lead melody ---
    const note = section.lead[localStep];
    if (note) playLead(v, note, t, style, inten);

    // --- drums ---
    playDrums(v, inBar, localStep, style, inten, t);
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

  // ---- real-track detection (per-realm audio files) -----------------------
  private detectRealTracks(): void {
    const base = (import.meta.env.BASE_URL || '/') as string;
    const ids = [
      ...Object.keys(COMPOSITIONS),
      'theme', // legacy fallback for dungeon
    ];
    const canMp3 = (() => {
      const a = document.createElement('audio');
      return !!a.canPlayType && a.canPlayType('audio/mpeg') !== '';
    })();
    const ext = canMp3 ? 'mp3' : 'ogg';

    for (const id of ids) {
      const el = document.createElement('audio');
      el.loop = true;
      el.preload = 'auto';
      el.crossOrigin = 'anonymous';
      el.src = `${base}audio/${id}.${ext}`;
      const markReady = () => this.markRealTrackReady(id, el);
      el.addEventListener('canplaythrough', markReady);
      el.addEventListener('loadeddata', markReady);
      el.addEventListener('error', () => {
        this.realReady.delete(id);
      });
      this.realTracks.set(id, el);
      try {
        el.load();
      } catch {
        /* ignore */
      }
    }
  }

  /** Wire a successfully loaded MP3/OGG into the music bus and, if we were
   *  already playing the procedural stand-in for this track, swap over live. */
  private markRealTrackReady(id: string, el: HTMLMediaElement): void {
    if (this.realReady.has(id)) return;
    if (el.readyState < 2) return; // HAVE_CURRENT_DATA
    this.realReady.add(id);
    if (!this.realSource.has(id) && this.ctx) {
      try {
        const node = this.ctx.createMediaElementSource(el);
        node.connect(this.musicBus);
        this.realSource.set(id, node);
      } catch {
        /* already connected in this session */
      }
    }
    // Hot-swap: if the procedural engine is playing this exact track, take over.
    if (this.playingSlot && this.timer !== null && !this.activeReal) {
      const want = this.trackIdForSlot(this.playingSlot);
      if (want === id) {
        if (this.timer !== null) {
          clearInterval(this.timer);
          this.timer = null;
        }
        this.activeReal = el;
        el.currentTime = 0;
        void el.play().catch(() => {
          this.activeReal = null;
          this.startProcedural(this.playingSlot!);
        });
      }
    }
  }
}

export const audio = new AudioSystem();