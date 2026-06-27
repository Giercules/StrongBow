import type { GameSettingsData, CompanionAISettings, GameplaySettings } from './types';
import type { GameBindings, PlayerAction } from './KeyBindings';
import { defaultBindings, mergeBindings } from './KeyBindings';
import { AI_DEFAULT_PROVIDER } from '../ai/aiConfig';
import { SPRITE_SCALE_MIN, SPRITE_SCALE_MAX, SPRITE_SCALE_DEFAULT } from './constants';

const STORAGE_KEY = 'strongbow_settings';

const DEFAULT_COMPANION_AI: CompanionAISettings = {
  followDistance: 48,
  leashDistance: 130,
  aggression: 0.65,
  assistRange: 90,
  useMagic: true,
  aiBarks: true,
};

const DEFAULT_GAMEPLAY: GameplaySettings = {
  difficulty: 'moderate',
  monsterCount: 1,
  xpMultiplier: 1,
  playerDamageMult: 1,
  godMode: false,
  infiniteMana: false,
  startLevel: 1,
  lootMult: 1,
  goldMult: 1,
  wildMonsters: 1,
};

const DEFAULTS: GameSettingsData = {
  aiProvider: AI_DEFAULT_PROVIDER,
  aiQuestEnabled: true,
  aiBarksEnabled: true,
  muted: false,
  musicEnabled: true,
  musicVolume: 0.5,
  sfxVolume: 0.7,
  zoom: 1.0,
  spriteScale: SPRITE_SCALE_DEFAULT,
  showMinimap: true,
  musicTrack: 'auto',
  companionAI: { ...DEFAULT_COMPANION_AI },
  bindings: defaultBindings(),
  gameplay: { ...DEFAULT_GAMEPLAY },
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function freshDefaults(): GameSettingsData {
  return {
    ...DEFAULTS,
    companionAI: { ...DEFAULT_COMPANION_AI },
    bindings: defaultBindings(),
    gameplay: { ...DEFAULT_GAMEPLAY },
  };
}

class GameSettingsStore {
  private data: GameSettingsData;

  constructor() {
    this.data = this.load();
  }

  private load(): GameSettingsData {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return freshDefaults();
      const parsed = JSON.parse(raw) as Partial<GameSettingsData>;
      return {
        ...DEFAULTS,
        ...parsed,
        companionAI: { ...DEFAULT_COMPANION_AI, ...(parsed.companionAI ?? {}) },
        bindings: mergeBindings(parsed.bindings),
        gameplay: { ...DEFAULT_GAMEPLAY, ...(parsed.gameplay ?? {}) },
      };
    } catch {
      return freshDefaults();
    }
  }

  save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      /* storage unavailable */
    }
  }

  get all(): GameSettingsData {
    return this.data;
  }

  get<K extends keyof GameSettingsData>(key: K): GameSettingsData[K] {
    return this.data[key];
  }

  set<K extends keyof GameSettingsData>(key: K, value: GameSettingsData[K]): void {
    this.data[key] = value;
    this.save();
  }

  setCompanion<K extends keyof CompanionAISettings>(key: K, value: CompanionAISettings[K]): void {
    this.data.companionAI[key] = value;
    this.save();
  }

  setGameplay<K extends keyof GameplaySettings>(key: K, value: GameplaySettings[K]): void {
    this.data.gameplay[key] = value;
    this.save();
  }

  setMusicVolume(v: number): void {
    this.data.musicVolume = clamp(v, 0, 1);
    this.save();
  }

  setSfxVolume(v: number): void {
    this.data.sfxVolume = clamp(v, 0, 1);
    this.save();
  }

  setSpriteScale(v: number): void {
    this.data.spriteScale = clamp(v, SPRITE_SCALE_MIN, SPRITE_SCALE_MAX);
    this.save();
  }

  spriteScale(): number {
    return clamp(this.data.spriteScale ?? SPRITE_SCALE_DEFAULT, SPRITE_SCALE_MIN, SPRITE_SCALE_MAX);
  }

  get bindings(): GameBindings {
    return this.data.bindings;
  }

  setBinding(player: 'p1' | 'p2', action: PlayerAction, keyName: string): void {
    this.data.bindings[player][action] = keyName;
    this.save();
  }

  resetPlayerBindings(player: 'p1' | 'p2'): void {
    this.data.bindings[player] = defaultBindings()[player];
    this.save();
  }

  resetAllBindings(): void {
    this.data.bindings = defaultBindings();
    this.save();
  }

  reset(): void {
    this.data = freshDefaults();
    this.save();
  }
}

export const settings = new GameSettingsStore();
