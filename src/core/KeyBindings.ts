// ----------------------------------------------------------------------------
// KeyBindings — authoritative control map. Keys are stored as Phaser KeyCode
// NAMES (e.g. 'W', 'UP', 'FORWARD_SLASH'); DungeonInput resolves them at runtime.
// All per-player actions are rebindable in Settings → Controls.
// ----------------------------------------------------------------------------

export type PlayerAction =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'attack'
  | 'magic'
  | 'use'
  | 'sheet'
  | 'inventory'
  | 'growth';

export type GlobalAction = 'settings' | 'manual' | 'joinP2';

export interface GameBindings {
  p1: Record<PlayerAction, string>;
  p2: Record<PlayerAction, string>;
  global: Record<GlobalAction, string>;
}

export const REBINDABLE_ACTIONS: PlayerAction[] = [
  'up',
  'down',
  'left',
  'right',
  'attack',
  'magic',
  'use',
  'sheet',
  'inventory',
  'growth',
];

export const ACTION_LABELS: Record<PlayerAction, string> = {
  up: 'Move Up',
  down: 'Move Down',
  left: 'Move Left',
  right: 'Move Right',
  attack: 'Attack',
  magic: 'Magic',
  use: 'Use / Interact',
  sheet: 'Character Sheet',
  inventory: 'Inventory',
  growth: 'Growth',
};

export function defaultBindings(): GameBindings {
  return {
    p1: {
      up: 'W',
      down: 'S',
      left: 'A',
      right: 'D',
      attack: 'Z',
      magic: 'Q',
      use: 'E',
      sheet: 'P',
      inventory: 'I',
      growth: 'K',
    },
    p2: {
      up: 'UP',
      down: 'DOWN',
      left: 'LEFT',
      right: 'RIGHT',
      attack: 'FORWARD_SLASH',
      magic: 'ENTER',
      use: 'SHIFT',
      sheet: 'SEMICOLON',
      inventory: 'M',
      growth: 'BACK_SLASH',
    },
    global: {
      settings: 'O',
      manual: 'H',
      joinP2: 'TWO',
    },
  };
}

const DISPLAY: Record<string, string> = {
  FORWARD_SLASH: '/',
  BACK_SLASH: '\\',
  SEMICOLON: ';',
  OPEN_BRACKET: '[',
  CLOSED_BRACKET: ']',
  UP: '↑',
  DOWN: '↓',
  LEFT: '←',
  RIGHT: '→',
  ENTER: 'Enter',
  SHIFT: 'Shift',
  CTRL: 'Ctrl',
  ALT: 'Alt',
  TAB: 'Tab',
  SPACE: 'Space',
  ESC: 'Esc',
  ZERO: '0',
  ONE: '1',
  TWO: '2',
  THREE: '3',
  PERIOD: '.',
  COMMA: ',',
};

export function keyLabel(name: string): string {
  return DISPLAY[name] ?? name;
}

/** Compact control lines for the HUD reference box, reflecting current bindings. */
export function formatHudControls(b: GameBindings, twoPlayer: boolean): string[] {
  const p1 = b.p1;
  const lines = [
    `P1  ${keyLabel(p1.up)}${keyLabel(p1.left)}${keyLabel(p1.down)}${keyLabel(p1.right)} move`,
    `${keyLabel(p1.attack)} atk  ${keyLabel(p1.magic)} mag  ${keyLabel(p1.use)} use`,
    `${keyLabel(p1.sheet)} sheet  ${keyLabel(p1.inventory)} bag  ${keyLabel(p1.growth)} grow`,
    `${keyLabel(b.global.settings)} set  ${keyLabel(b.global.manual)} help  ${keyLabel(b.global.joinP2)} join P2`,
    'F2 save  ·  restore on title screen',
  ];
  if (twoPlayer) {
    const p2 = b.p2;
    lines.push(`P2  arrows · ${keyLabel(p2.attack)} atk · ${keyLabel(p2.magic)} mag · ${keyLabel(p2.use)} use`);
  }
  return lines;
}

/** Merge stored (possibly partial) bindings over defaults. */
export function mergeBindings(saved?: Partial<GameBindings>): GameBindings {
  const d = defaultBindings();
  if (!saved) return d;
  return {
    p1: { ...d.p1, ...(saved.p1 ?? {}) },
    p2: { ...d.p2, ...(saved.p2 ?? {}) },
    global: { ...d.global, ...(saved.global ?? {}) },
  };
}
