import type { HeroClassId } from '../core/types';

// ----------------------------------------------------------------------------
// SaveSystem - serialises a full run to localStorage and restores it.
// ----------------------------------------------------------------------------

const SAVE_KEY = 'strongbow_save';
const SAVE_VERSION = 1;

export interface SaveAlly {
  classId: HeroClassId;
  isPlayer: boolean;
  playerNum: number;
  level: number;
  xp: number;
  score: number;
  health: number;
  mana: number;
  alive: boolean;
  x: number;
  y: number;
  skillRanks: Record<string, number>;
  skillPoints: number;
  attrRanks: Record<string, number>;
  attrPoints: number;
  gold: number;
  keys: number;
  equipped: Record<string, string>; // slot -> itemId
  bag: string[]; // itemIds
}

export interface SaveData {
  version: number;
  savedAt: number;
  levelId: string;
  twoPlayer: boolean;
  elapsedMs: number;
  quest: string;
  generatorsDestroyed: number;
  generators: { alive: boolean; health: number }[];
  bossAlive: boolean;
  bossHealth: number;
  chestsOpened: boolean[];
  shrinesUsed: boolean[];
  doorsOpen: boolean[];
  collectedPickups: number[];
  allies: SaveAlly[];
}

export function saveGame(data: SaveData): boolean {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function loadGame(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SaveData;
    if (!data || data.version !== SAVE_VERSION) return null;
    return data;
  } catch {
    return null;
  }
}

export function hasSave(): boolean {
  try {
    return !!localStorage.getItem(SAVE_KEY);
  } catch {
    return false;
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
}

export const CURRENT_SAVE_VERSION = SAVE_VERSION;
