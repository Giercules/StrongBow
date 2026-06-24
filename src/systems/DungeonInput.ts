import Phaser from 'phaser';
import { settings } from '../core/GameSettings';
import type { PlayerAction, GlobalAction } from '../core/KeyBindings';

export interface MoveInput {
  x: number;
  y: number;
}

// Reverse map: Phaser KeyCode number -> name (for rebind capture).
const CODE_TO_NAME: Record<number, string> = (() => {
  const m: Record<number, string> = {};
  const codes = Phaser.Input.Keyboard.KeyCodes as unknown as Record<string, number>;
  for (const [name, code] of Object.entries(codes)) if (!(code in m)) m[code] = name;
  return m;
})();

// Gamepad face/shoulder buttons mapped to the rebindable actions that have one.
type PadName = 'A' | 'B' | 'X' | 'Y' | 'L1' | 'R1';
const PAD_FOR_ACTION: Partial<Record<PlayerAction, PadName>> = {
  attack: 'A',
  use: 'B',
  magic: 'X',
  inventory: 'L1',
};

// Human-readable controller button per action, for the Settings display.
const PAD_LABEL: Record<PlayerAction, string> = {
  up: 'Stick ↑',
  down: 'Stick ↓',
  left: 'Stick ←',
  right: 'Stick →',
  attack: 'A',
  magic: 'X',
  use: 'B',
  inventory: 'LB',
  sheet: '—',
  growth: '—',
};
const STICK_DEADZONE = 0.35;

/** Resolves the current key bindings into live Phaser keys and queries them.
 *  Gamepad input is layered on top: pad 0 drives P1, pad 1 drives P2. */
export class DungeonInput {
  private scene: Phaser.Scene;
  private kb: Phaser.Input.Keyboard.KeyboardPlugin;
  private keys = new Map<string, Phaser.Input.Keyboard.Key>();
  private padPrev = new Map<string, boolean>();
  /** True while waiting to capture a key for rebinding (suppresses gameplay/menu input). */
  capturing = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.kb = scene.input.keyboard!;
    this.rebuild();
  }

  /** Ensure Key objects exist for every currently-bound key. */
  rebuild(): void {
    const b = settings.bindings;
    const names = new Set<string>();
    [b.p1, b.p2].forEach((set) => Object.values(set).forEach((n) => names.add(n)));
    Object.values(b.global).forEach((n) => names.add(n));
    for (const n of names) this.ensureKey(n);
  }

  private ensureKey(name: string): void {
    if (this.keys.has(name)) return;
    const code = (Phaser.Input.Keyboard.KeyCodes as unknown as Record<string, number>)[name];
    if (code == null) return;
    this.keys.set(name, this.kb.addKey(code, true));
  }

  private key(name: string): Phaser.Input.Keyboard.Key | undefined {
    this.ensureKey(name);
    return this.keys.get(name);
  }

  // ---- gamepad helpers ----------------------------------------------------
  private pad(player: 'p1' | 'p2'): Phaser.Input.Gamepad.Gamepad | undefined {
    const gp = this.scene.input.gamepad;
    if (!gp) return undefined;
    // Use the Nth *connected* pad, not a raw slot index (slots can be sparse:
    // a phantom at 0 with the real controller at 1, etc.).
    const pads = gp.gamepads.filter((g): g is Phaser.Input.Gamepad.Gamepad => !!g && g.connected);
    return pads[player === 'p1' ? 0 : 1];
  }

  private padBool(pad: Phaser.Input.Gamepad.Gamepad, name: PadName): boolean {
    switch (name) {
      case 'A': return pad.A;
      case 'B': return pad.B;
      case 'X': return pad.X;
      case 'Y': return pad.Y;
      case 'L1': return pad.L1 > 0;
      case 'R1': return pad.R1 > 0;
    }
  }

  /** Rising-edge detector for a named pad button (per player). */
  private padEdge(player: 'p1' | 'p2', name: PadName): boolean {
    const pad = this.pad(player);
    const now = !!pad && this.padBool(pad, name);
    const key = player + ':' + name;
    const was = this.padPrev.get(key) ?? false;
    this.padPrev.set(key, now);
    return now && !was;
  }

  /** Rising-edge detector for a raw pad button index (menu buttons). */
  private padIndexEdge(player: 'p1' | 'p2', idx: number): boolean {
    const pad = this.pad(player);
    const now = !!pad && !!pad.buttons[idx]?.pressed;
    const key = player + ':#' + idx;
    const was = this.padPrev.get(key) ?? false;
    this.padPrev.set(key, now);
    return now && !was;
  }
  /** True when a controller is connected (drives the Settings display). */
  hasPad(): boolean {
    return !!this.pad('p1');
  }

  /** Controller button label for an action, shown in Settings. */
  padLabel(action: PlayerAction): string {
    return PAD_LABEL[action] ?? '—';
  }

  // -------------------------------------------------------------------------

  isDown(player: 'p1' | 'p2', action: PlayerAction): boolean {
    if (this.capturing) return false;
    const k = this.key(settings.bindings[player][action]);
    if (k && k.isDown) return true;
    const pn = PAD_FOR_ACTION[action];
    const pad = this.pad(player);
    return !!(pn && pad && this.padBool(pad, pn));
  }

  justDown(player: 'p1' | 'p2', action: PlayerAction): boolean {
    if (this.capturing) return false;
    const k = this.key(settings.bindings[player][action]);
    if (k && Phaser.Input.Keyboard.JustDown(k)) return true;
    const pn = PAD_FOR_ACTION[action];
    return !!pn && this.padEdge(player, pn);
  }

  /** Edge-triggered non-rebindable combat actions (dodge / class ability). */
  padJustDown(player: 'p1' | 'p2', action: 'dodge' | 'ability'): boolean {
    if (this.capturing) return false;
    return this.padEdge(player, action === 'dodge' ? 'Y' : 'R1');
  }

  move(player: 'p1' | 'p2'): MoveInput {
    if (this.capturing) return { x: 0, y: 0 };
    let x = (this.isDown(player, 'right') ? 1 : 0) - (this.isDown(player, 'left') ? 1 : 0);
    let y = (this.isDown(player, 'down') ? 1 : 0) - (this.isDown(player, 'up') ? 1 : 0);
    const pad = this.pad(player);
    if (pad) {
      const sx = pad.leftStick.x;
      const sy = pad.leftStick.y;
      if (pad.right || sx > STICK_DEADZONE) x = 1;
      else if (pad.left || sx < -STICK_DEADZONE) x = -1;
      if (pad.down || sy > STICK_DEADZONE) y = 1;
      else if (pad.up || sy < -STICK_DEADZONE) y = -1;
    }
    return { x, y };
  }

  globalJustDown(action: GlobalAction): boolean {
    if (this.capturing) return false;
    const k = this.key(settings.bindings.global[action]);
    if (k && Phaser.Input.Keyboard.JustDown(k)) return true;
    // Pad 0: Start (9) opens settings, Select/Back (8) opens the manual.
    const idx = action === 'settings' ? 9 : action === 'manual' ? 8 : -1;
    return idx >= 0 && this.padIndexEdge('p1', idx);
  }

  /** Capture the next key press as a KeyCode name (for Settings rebinding). */
  captureNext(onCapture: (name: string) => void): () => void {
    this.capturing = true;
    const handler = (e: KeyboardEvent) => {
      const name = CODE_TO_NAME[e.keyCode];
      this.kb.off('keydown', handler);
      this.capturing = false;
      if (name && name !== 'ESC') {
        this.ensureKey(name);
        onCapture(name);
      }
    };
    this.kb.on('keydown', handler);
    return () => {
      this.kb.off('keydown', handler);
      this.capturing = false;
    };
  }
}
