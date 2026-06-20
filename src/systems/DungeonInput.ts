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

/** Resolves the current key bindings into live Phaser keys and queries them. */
export class DungeonInput {
  private kb: Phaser.Input.Keyboard.KeyboardPlugin;
  private keys = new Map<string, Phaser.Input.Keyboard.Key>();
  /** True while waiting to capture a key for rebinding (suppresses gameplay/menu input). */
  capturing = false;

  constructor(scene: Phaser.Scene) {
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

  isDown(player: 'p1' | 'p2', action: PlayerAction): boolean {
    if (this.capturing) return false;
    const k = this.key(settings.bindings[player][action]);
    return !!k && k.isDown;
  }

  justDown(player: 'p1' | 'p2', action: PlayerAction): boolean {
    if (this.capturing) return false;
    const k = this.key(settings.bindings[player][action]);
    return !!k && Phaser.Input.Keyboard.JustDown(k);
  }

  move(player: 'p1' | 'p2'): MoveInput {
    return {
      x: (this.isDown(player, 'right') ? 1 : 0) - (this.isDown(player, 'left') ? 1 : 0),
      y: (this.isDown(player, 'down') ? 1 : 0) - (this.isDown(player, 'up') ? 1 : 0),
    };
  }

  globalJustDown(action: GlobalAction): boolean {
    if (this.capturing) return false;
    const k = this.key(settings.bindings.global[action]);
    return !!k && Phaser.Input.Keyboard.JustDown(k);
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
