import type { HeroClassId, ItemDefinition } from '../core/types';

// ----------------------------------------------------------------------------
// SaveSystem — multi-slot saves in localStorage. Each slot stores a full run
// plus a small JPEG thumbnail so the load window can preview it.
// ----------------------------------------------------------------------------

const SLOT_PREFIX = 'strongbow_save_';
const LEGACY_KEY = 'strongbow_save';
const SAVE_VERSION = 2;
export const SAVE_SLOT_COUNT = 6;

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
  /** How many realms the party has unlocked (town-hub gate progression). */
  unlockedRealms?: number;
  levelName?: string;
  chapter?: string;
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
  /** Minted (dropped/graded) item definitions, persisted so ids resolve on load. */
  mintedItems?: ItemDefinition[];
  /** Small JPEG data-URL preview of the moment the save was made. */
  thumbnail?: string;
}

function slotKey(slot: number): string {
  return `${SLOT_PREFIX}${slot}`;
}

/** Move a pre-2.0 single save into slot 0 the first time we look at the slots. */
function migrateLegacy(): void {
  try {
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (!legacy) return;
    if (!localStorage.getItem(slotKey(0))) localStorage.setItem(slotKey(0), legacy);
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    /* ignore */
  }
}

export function saveToSlot(slot: number, data: SaveData): boolean {
  try {
    localStorage.setItem(slotKey(slot), JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function loadSlot(slot: number): SaveData | null {
  try {
    const raw = localStorage.getItem(slotKey(slot));
    if (!raw) return null;
    const data = JSON.parse(raw) as SaveData;
    if (!data) return null;
    return data;
  } catch {
    return null;
  }
}

export function deleteSlot(slot: number): void {
  try {
    localStorage.removeItem(slotKey(slot));
  } catch {
    /* ignore */
  }
}

/** Every slot's data (or null if empty), index 0..SAVE_SLOT_COUNT-1. */
export function listSlots(): (SaveData | null)[] {
  migrateLegacy();
  const out: (SaveData | null)[] = [];
  for (let i = 0; i < SAVE_SLOT_COUNT; i++) out.push(loadSlot(i));
  return out;
}

export function hasAnySave(): boolean {
  return listSlots().some((s) => s !== null);
}

// ---- legacy-compatible helpers (slot 0) ------------------------------------
export function hasSave(): boolean {
  return hasAnySave();
}
export function loadGame(): SaveData | null {
  migrateLegacy();
  for (let i = 0; i < SAVE_SLOT_COUNT; i++) {
    const s = loadSlot(i);
    if (s) return s;
  }
  return null;
}

export const CURRENT_SAVE_VERSION = SAVE_VERSION;
