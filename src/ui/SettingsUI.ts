import Phaser from 'phaser';
import { framedPanel, makeButton, addPinned } from './uiHelpers';
import type { Modal } from './uiHelpers';
import { C } from '../rendering/Palette';
import { settings } from '../core/GameSettings';
import { audio, MUSIC_TRACKS, musicTrackLabel } from '../systems/AudioSystem';
import { aiService } from '../ai/AIService';
import { REBINDABLE_ACTIONS, ACTION_LABELS, keyLabel } from '../core/KeyBindings';
import { SPRITE_SCALE_MIN, SPRITE_SCALE_MAX } from '../core/constants';
import type { AIProviderId, Difficulty } from '../core/types';
import type { DungeonInput } from '../systems/DungeonInput';

const PROVIDERS: AIProviderId[] = ['fallback', 'openai', 'anthropic', 'xai'];
const PANEL_W = 480;
const PANEL_H = 470;
type Tab = 'audio' | 'view' | 'ai' | 'companions' | 'controls' | 'cheats' | 'manual';
const TABS: Tab[] = ['audio', 'view', 'ai', 'companions', 'controls', 'cheats', 'manual'];
const TAB_LABELS: Record<Tab, string> = {
  audio: 'AUDIO',
  view: 'VIEW',
  ai: 'AI',
  companions: 'ALLIES',
  controls: 'KEYS',
  cheats: 'CHEATS',
  manual: 'HELP',
};

interface FocusRow {
  y: number;
  activate?: () => void;
  left?: () => void;
  right?: () => void;
}

export interface SettingsDeps {
  input?: DungeonInput;
  onOpenManual?: () => void;
}

export class SettingsUI {
  private scene: Phaser.Scene;
  private deps: SettingsDeps;
  private modal: Modal | null = null;
  private content: Phaser.GameObjects.Container | null = null;
  private tab: Tab = 'audio';
  private rowY = 0;
  private cPlayer: 'p1' | 'p2' = 'p1';
  private cSel = 0;
  private capturing = false;
  private keyHandler?: (e: KeyboardEvent) => void;
  // Gamepad / focus navigation. focus 0 = the tab bar; 1..N = the tab's rows.
  private rows: FocusRow[] = [];
  private focus = 0;
  private padHandler?: (pad: Phaser.Input.Gamepad.Gamepad, button: Phaser.Input.Gamepad.Button, index: number) => void;
  // Left-stick navigation needs per-frame polling (stick motion fires no 'down'
  // events); these track the last quantised stick direction for edge detection.
  private stickHandler?: () => void;
  private stickPrevX = 0;
  private stickPrevY = 0;

  constructor(scene: Phaser.Scene, deps: SettingsDeps = {}) {
    this.scene = scene;
    this.deps = deps;
  }

  isOpen(): boolean {
    return this.modal !== null;
  }

  toggle(): void {
    if (this.modal) this.close();
    else this.open();
  }

  open(): void {
    if (this.modal) return;
    this.focus = 0;
    this.modal = framedPanel(this.scene, PANEL_W, PANEL_H, 'SETTINGS');
    this.content = this.scene.add.container(0, 0).setDepth(this.modal.container.depth + 1);
    this.modal.add(this.content);
    this.keyHandler = (e) => this.onKey(e);
    this.scene.input.keyboard?.on('keydown', this.keyHandler);
    const gp = this.scene.input.gamepad;
    if (gp) {
      this.padHandler = (_p, _b, index) => this.onPad(index);
      gp.on('down', this.padHandler);
    }
    this.stickPrevX = 0;
    this.stickPrevY = 0;
    this.stickHandler = () => this.pollStick();
    this.scene.events.on(Phaser.Scenes.Events.UPDATE, this.stickHandler);
    this.rebuild();
  }

  close(): void {
    if (this.keyHandler) this.scene.input.keyboard?.off('keydown', this.keyHandler);
    this.keyHandler = undefined;
    if (this.padHandler) this.scene.input.gamepad?.off('down', this.padHandler);
    this.padHandler = undefined;
    if (this.stickHandler) this.scene.events.off(Phaser.Scenes.Events.UPDATE, this.stickHandler);
    this.stickHandler = undefined;
    this.capturing = false;
    this.content = null;
    this.modal?.destroy();
    this.modal = null;
  }

  // ---- navigation (shared by keyboard + gamepad) --------------------------
  private rowCount(): number {
    return this.tab === 'controls' ? REBINDABLE_ACTIONS.length : this.rows.length;
  }

  private navY(d: number): void {
    this.focus = Phaser.Math.Clamp(this.focus + d, 0, this.rowCount());
    if (this.tab === 'controls') this.cSel = Math.max(0, this.focus - 1);
    audio.sfx('ui_move');
    this.rebuild();
  }

  private navX(d: number): void {
    if (this.focus === 0) {
      this.switchTab(d);
      return;
    }
    if (this.tab === 'controls') {
      this.cPlayer = this.cPlayer === 'p1' ? 'p2' : 'p1';
      audio.sfx('ui_move');
      this.rebuild();
      return;
    }
    const row = this.rows[this.focus - 1];
    if (!row) return;
    if (d < 0) row.left?.();
    else row.right?.();
    audio.sfx('ui_move');
    this.rebuild();
  }

  private activate(): void {
    if (this.focus === 0) return;
    if (this.tab === 'controls') {
      this.cSel = Math.max(0, this.focus - 1);
      this.beginCapture();
      return;
    }
    const row = this.rows[this.focus - 1];
    const fn = row?.activate ?? row?.right;
    if (fn) {
      fn();
      audio.sfx('ui_select');
      this.rebuild();
    }
  }

  private switchTab(d: number): void {
    const i = TABS.indexOf(this.tab);
    this.tab = TABS[(i + d + TABS.length) % TABS.length];
    this.focus = 0;
    this.cSel = 0;
    audio.sfx('ui_move');
    this.rebuild();
  }

  private onPad(index: number): void {
    if (this.capturing) return;
    switch (index) {
      case 12: this.navY(-1); break; // dpad up
      case 13: this.navY(1); break; // dpad down
      case 14: this.navX(-1); break; // dpad left
      case 15: this.navX(1); break; // dpad right
      case 0: this.activate(); break; // A
      case 1: this.close(); break; // B
    }
  }

  /** Per-frame left-stick navigation (edge-detected so one push = one step). */
  private pollStick(): void {
    if (this.capturing || !this.modal) return;
    const gp = this.scene.input.gamepad;
    const pad = gp?.gamepads.find((g): g is Phaser.Input.Gamepad.Gamepad => !!g && g.connected);
    if (!pad) return;
    const dz = 0.5;
    const sx = pad.leftStick?.x ?? 0;
    const sy = pad.leftStick?.y ?? 0;
    const zx = sx > dz ? 1 : sx < -dz ? -1 : 0;
    const zy = sy > dz ? 1 : sy < -dz ? -1 : 0;
    if (zy !== 0 && zy !== this.stickPrevY) this.navY(zy);
    else if (zx !== 0 && zx !== this.stickPrevX) this.navX(zx);
    this.stickPrevX = zx;
    this.stickPrevY = zy;
  }

  private onKey(e: KeyboardEvent): void {
    if (this.capturing) return;
    if (e.key === 'ArrowUp') this.navY(-1);
    else if (e.key === 'ArrowDown') this.navY(1);
    else if (e.key === 'ArrowLeft') this.navX(-1);
    else if (e.key === 'ArrowRight') this.navX(1);
    else if (e.key === 'Enter') this.activate();
    else if ((e.key === 'r' || e.key === 'R') && this.tab === 'controls') {
      if (e.shiftKey) settings.resetAllBindings();
      else settings.resetPlayerBindings(this.cPlayer);
      this.deps.input?.rebuild();
      audio.sfx('ui_select');
      this.rebuild();
    }
  }

  private beginCapture(): void {
    if (!this.deps.input) return;
    this.capturing = true;
    this.rebuild();
    this.deps.input.captureNext((name) => {
      settings.setBinding(this.cPlayer, REBINDABLE_ACTIONS[this.cSel], name);
      this.deps.input?.rebuild();
      this.capturing = false;
      audio.sfx('ui_select');
      this.rebuild();
    });
  }

  private focusRow(y: number, h: { activate?: () => void; left?: () => void; right?: () => void }): void {
    this.rows.push({ y, ...h });
  }

  private text(x: number, y: number, str: string, color: string, size = 12, origin = 0): Phaser.GameObjects.Text {
    const t = this.scene.add
      .text(x, y, str, { fontFamily: 'MedievalSharp, "Trebuchet MS", cursive', fontSize: `${size}px`, color })
      .setOrigin(origin, 0.5);
    addPinned(this.content!, t);
    return t;
  }

  private btn(x: number, y: number, w: number, label: string, fn: () => void, fill?: string): void {
    this.content!.add(
      makeButton(this.scene, x, y, w, 24, label, () => {
        fn();
        this.rebuild();
      }, { size: 12, fill })
    );
  }

  private stepper(right: number, y: number, value: string, dec: () => void, inc: () => void): void {
    this.btn(right - 96, y, 26, '-', dec);
    this.text(right - 45, y, value, C.hudBorder, 12.5, 0.5).setX(right - 45);
    this.btn(right, y, 26, '+', inc);
    this.focusRow(y, { left: dec, right: inc, activate: inc });
  }

  private rowLabel(label: string): number {
    const x0 = this.modal!.cx - PANEL_W / 2;
    const y = this.rowY;
    this.text(x0 + 24, y, label, C.ink, 12.5);
    this.rowY += 32;
    return y;
  }

  private rebuild(): void {
    if (!this.content) return;
    this.content.removeAll(true);
    this.rows = [];
    const x0 = this.modal!.cx - PANEL_W / 2;
    const y0 = this.modal!.cy - PANEL_H / 2;

    const tabW = (PANEL_W - 28) / TABS.length;
    TABS.forEach((t, i) => {
      this.btn(x0 + 14 + tabW / 2 + i * tabW, y0 + 40, tabW - 3, TAB_LABELS[t], () => {
        this.tab = t;
        this.focus = 0;
        this.cSel = 0;
      }, this.tab === t ? C.ivy : C.hudPanel2);
    });

    this.rowY = y0 + 74;
    if (this.tab === 'audio') this.tabAudio();
    else if (this.tab === 'view') this.tabView();
    else if (this.tab === 'ai') this.tabAI();
    else if (this.tab === 'companions') this.tabCompanions();
    else if (this.tab === 'controls') this.tabControls();
    else if (this.tab === 'cheats') this.tabCheats();
    else this.tabManual();

    this.drawFocus(x0, y0, tabW);

    this.text(this.modal!.cx, y0 + PANEL_H - 18, 'Arrows/D-Pad move - Enter/A adjust - Esc/B close', C.inkDim, 11, 0.5).setX(this.modal!.cx);
  }

  /** Outline the focused element (tab bar at focus 0, else the focused row). */
  private drawFocus(x0: number, y0: number, tabW: number): void {
    const g = this.scene.add.graphics();
    if (this.focus === 0) {
      const i = TABS.indexOf(this.tab);
      const tx = x0 + 14 + tabW / 2 + i * tabW;
      g.lineStyle(2, parseInt(C.coinHi.slice(1), 16), 1);
      g.strokeRoundedRect(tx - (tabW - 3) / 2, y0 + 40 - 13, tabW - 3, 26, 4);
    } else if (this.tab !== 'controls' && this.rows[this.focus - 1]) {
      const fy = this.rows[this.focus - 1].y;
      g.lineStyle(2, parseInt(C.hudBorder.slice(1), 16), 1);
      g.strokeRoundedRect(x0 + 16, fy - 14, PANEL_W - 32, 28, 4);
    }
    addPinned(this.content!, g);
  }

  private tabAudio(): void {
    const right = this.modal!.cx + PANEL_W / 2 - 24;
    let y = this.rowLabel('Mute all');
    const toggleMute = () => audio.setMuted(!settings.get('muted'));
    this.btn(right - 45, y, 80, settings.get('muted') ? 'MUTED' : 'ON', toggleMute, settings.get('muted') ? C.hpLow : C.ivy);
    this.focusRow(y, { activate: toggleMute, left: toggleMute, right: toggleMute });
    y = this.rowLabel('Music');
    const toggleMusic = () => audio.setMusicEnabled(!settings.get('musicEnabled'));
    this.btn(right - 45, y, 80, settings.get('musicEnabled') ? 'ON' : 'OFF', toggleMusic, settings.get('musicEnabled') ? C.ivy : C.hudPanel2);
    this.focusRow(y, { activate: toggleMusic, left: toggleMusic, right: toggleMusic });
    y = this.rowLabel('Music volume');
    this.stepper(right, y, Math.round(settings.get('musicVolume') * 100) + '%', () => audio.setMusicVolume(settings.get('musicVolume') - 0.1), () => audio.setMusicVolume(settings.get('musicVolume') + 0.1));
    y = this.rowLabel('SFX volume');
    this.stepper(right, y, Math.round(settings.get('sfxVolume') * 100) + '%', () => audio.setSfxVolume(settings.get('sfxVolume') - 0.1), () => audio.setSfxVolume(settings.get('sfxVolume') + 0.1));
    y = this.rowLabel('Music track');
    const cycleTrack = () => {
      const ids = MUSIC_TRACKS.map((t) => t.id);
      const i = ids.indexOf(settings.get('musicTrack'));
      audio.setMusicTrack(ids[(i + 1) % ids.length]);
    };
    this.btn(right - 84, y, 168, musicTrackLabel(settings.get('musicTrack')), cycleTrack, C.hudPanel2);
    this.focusRow(y, { activate: cycleTrack, left: cycleTrack, right: cycleTrack });
  }

  private tabView(): void {
    const right = this.modal!.cx + PANEL_W / 2 - 24;
    let y = this.rowLabel('Sprite size');
    const pct = Math.round(settings.spriteScale() * 100);
    this.stepper(
      right,
      y,
      pct + '%',
      () => settings.setSpriteScale(+(settings.spriteScale() - 0.1).toFixed(2)),
      () => settings.setSpriteScale(+(settings.spriteScale() + 0.1).toFixed(2))
    );
    y = this.rowLabel('Show map');
    const toggleMap = () => settings.set('showMinimap', !settings.get('showMinimap'));
    this.btn(right - 45, y, 80, settings.get('showMinimap') ? 'ON' : 'OFF', toggleMap, settings.get('showMinimap') ? C.ivy : C.hudPanel2);
    this.focusRow(y, { activate: toggleMap, left: toggleMap, right: toggleMap });
    this.rowLabel('');
    const x0 = this.modal!.cx - PANEL_W / 2 + 24;
    this.text(x0, this.rowY, `Sprite size ranges ${Math.round(SPRITE_SCALE_MIN * 100)}-${Math.round(SPRITE_SCALE_MAX * 100)}% (default 150%).`, C.inkDim, 10);
    this.rowY += 18;
    this.text(x0, this.rowY, 'Map can be toggled live; sprite size applies on next descent.', C.inkDim, 10);
  }

  private tabAI(): void {
    const right = this.modal!.cx + PANEL_W / 2 - 24;
    let y = this.rowLabel('AI narration');
    const toggleAI = () => {
      const v = !settings.get('aiBarksEnabled');
      settings.set('aiBarksEnabled', v);
      settings.set('aiQuestEnabled', v);
    };
    this.btn(right - 45, y, 80, settings.get('aiBarksEnabled') ? 'ON' : 'OFF', toggleAI, settings.get('aiBarksEnabled') ? C.ivy : C.hudPanel2);
    this.focusRow(y, { activate: toggleAI, left: toggleAI, right: toggleAI });
    y = this.rowLabel('AI provider');
    const cycleProvider = () => {
      const i = PROVIDERS.indexOf(settings.get('aiProvider'));
      settings.set('aiProvider', PROVIDERS[(i + 1) % PROVIDERS.length]);
      aiService.refresh();
    };
    this.btn(right - 60, y, 110, settings.get('aiProvider').toUpperCase(), cycleProvider);
    this.focusRow(y, { activate: cycleProvider, left: cycleProvider, right: cycleProvider });
    this.rowLabel('');
    this.text(this.modal!.cx - PANEL_W / 2 + 24, this.rowY, 'Keys live in .env; the proxy keeps them server-side.', C.inkDim, 10);
    this.rowY += 18;
    this.text(this.modal!.cx - PANEL_W / 2 + 24, this.rowY, 'Without keys, built-in narration is used.', C.inkDim, 10);
  }

  private tabCompanions(): void {
    const right = this.modal!.cx + PANEL_W / 2 - 24;
    const c = settings.get('companionAI');
    let y = this.rowLabel('Follow distance');
    this.stepper(right, y, String(c.followDistance), () => settings.setCompanion('followDistance', Math.max(24, c.followDistance - 8)), () => settings.setCompanion('followDistance', Math.min(96, c.followDistance + 8)));
    y = this.rowLabel('Leash distance');
    this.stepper(right, y, String(c.leashDistance), () => settings.setCompanion('leashDistance', Math.max(60, c.leashDistance - 10)), () => settings.setCompanion('leashDistance', Math.min(220, c.leashDistance + 10)));
    y = this.rowLabel('Aggression');
    this.stepper(right, y, Math.round(c.aggression * 100) + '%', () => settings.setCompanion('aggression', Math.max(0.1, +(c.aggression - 0.1).toFixed(2))), () => settings.setCompanion('aggression', Math.min(1, +(c.aggression + 0.1).toFixed(2))));
    y = this.rowLabel('Assist range');
    this.stepper(right, y, String(c.assistRange), () => settings.setCompanion('assistRange', Math.max(40, c.assistRange - 10)), () => settings.setCompanion('assistRange', Math.min(160, c.assistRange + 10)));
    y = this.rowLabel('Casts magic');
    const toggleMagic = () => settings.setCompanion('useMagic', !c.useMagic);
    this.btn(right - 45, y, 80, c.useMagic ? 'ON' : 'OFF', toggleMagic, c.useMagic ? C.ivy : C.hudPanel2);
    this.focusRow(y, { activate: toggleMagic, left: toggleMagic, right: toggleMagic });
  }

  private tabCheats(): void {
    const right = this.modal!.cx + PANEL_W / 2 - 24;
    const g = settings.get('gameplay');
    let y = this.rowLabel('Difficulty');
    const diffs: Difficulty[] = ['easy', 'moderate', 'hard'];
    const cycleDiff = () => {
      const i = diffs.indexOf(g.difficulty);
      settings.setGameplay('difficulty', diffs[(i + 1) % diffs.length]);
    };
    this.btn(right - 60, y, 110, g.difficulty.toUpperCase(), cycleDiff, C.ivy);
    this.focusRow(y, { activate: cycleDiff, left: cycleDiff, right: cycleDiff });
    y = this.rowLabel('Monster count');
    this.stepper(right, y, g.monsterCount.toFixed(2) + 'x', () => settings.setGameplay('monsterCount', Math.max(0.5, +(g.monsterCount - 0.25).toFixed(2))), () => settings.setGameplay('monsterCount', Math.min(4, +(g.monsterCount + 0.25).toFixed(2))));
    y = this.rowLabel('XP multiplier');
    this.stepper(right, y, g.xpMultiplier.toFixed(1) + 'x', () => settings.setGameplay('xpMultiplier', Math.max(1, +(g.xpMultiplier - 0.5).toFixed(1))), () => settings.setGameplay('xpMultiplier', Math.min(10, +(g.xpMultiplier + 0.5).toFixed(1))));
    y = this.rowLabel('Player damage');
    this.stepper(right, y, g.playerDamageMult.toFixed(1) + 'x', () => settings.setGameplay('playerDamageMult', Math.max(1, +(g.playerDamageMult - 0.5).toFixed(1))), () => settings.setGameplay('playerDamageMult', Math.min(10, +(g.playerDamageMult + 0.5).toFixed(1))));
    y = this.rowLabel('Start level');
    this.stepper(right, y, String(g.startLevel), () => settings.setGameplay('startLevel', Math.max(1, g.startLevel - 1)), () => settings.setGameplay('startLevel', Math.min(20, g.startLevel + 1)));
    y = this.rowLabel('Loot drop rate');
    this.stepper(right, y, g.lootMult.toFixed(1) + 'x', () => settings.setGameplay('lootMult', Math.max(0, +(g.lootMult - 0.5).toFixed(1))), () => settings.setGameplay('lootMult', Math.min(5, +(g.lootMult + 0.5).toFixed(1))));
    y = this.rowLabel('Gold drop rate');
    this.stepper(right, y, g.goldMult.toFixed(1) + 'x', () => settings.setGameplay('goldMult', Math.max(0, +(g.goldMult - 0.5).toFixed(1))), () => settings.setGameplay('goldMult', Math.min(5, +(g.goldMult + 0.5).toFixed(1))));
    y = this.rowLabel('Wild monsters');
    this.stepper(right, y, g.wildMonsters.toFixed(2) + 'x', () => settings.setGameplay('wildMonsters', Math.max(0, +(g.wildMonsters - 0.25).toFixed(2))), () => settings.setGameplay('wildMonsters', Math.min(4, +(g.wildMonsters + 0.25).toFixed(2))));
    y = this.rowLabel('God mode');
    const toggleGod = () => settings.setGameplay('godMode', !g.godMode);
    this.btn(right - 45, y, 80, g.godMode ? 'ON' : 'OFF', toggleGod, g.godMode ? C.ivy : C.hudPanel2);
    this.focusRow(y, { activate: toggleGod, left: toggleGod, right: toggleGod });
    y = this.rowLabel('Infinite mana');
    const toggleMana = () => settings.setGameplay('infiniteMana', !g.infiniteMana);
    this.btn(right - 45, y, 80, g.infiniteMana ? 'ON' : 'OFF', toggleMana, g.infiniteMana ? C.ivy : C.hudPanel2);
    this.focusRow(y, { activate: toggleMana, left: toggleMana, right: toggleMana });
    this.rowLabel('');
    this.text(this.modal!.cx - PANEL_W / 2 + 24, this.rowY, 'Monster count & start level apply on next dungeon entry.', C.inkDim, 10);
  }

  private tabControls(): void {
    const x0 = this.modal!.cx - PANEL_W / 2;
    const padOn = !!this.deps.input?.hasPad();
    this.text(x0 + 24, this.rowY, `Editing ${this.cPlayer.toUpperCase()}   ( L/R switch - Up/Dn select - Enter rebind - R reset )`, C.inkDim, 9.5);
    this.rowY += 20;
    // Always show BOTH columns so the player can see the keyboard key and the
    // gamepad button each action maps to, whether or not a pad is plugged in.
    this.text(x0 + PANEL_W - 122, this.rowY, 'KEY', C.inkDim, 9, 1).setX(x0 + PANEL_W - 122);
    this.text(x0 + PANEL_W - 40, this.rowY, padOn ? 'GAMEPAD •' : 'GAMEPAD', padOn ? '#7fd0ff' : C.inkDim, 9, 1).setX(x0 + PANEL_W - 40);
    this.rowY += 14;
    REBINDABLE_ACTIONS.forEach((action, i) => {
      const yy = this.rowY + i * 22;
      const selected = i === this.cSel && this.focus !== 0;
      const g = this.scene.add.graphics();
      g.fillStyle(selected ? 0x2a3358 : 0x000000, selected ? 0.9 : 0.3);
      g.fillRoundedRect(x0 + 20, yy, PANEL_W - 40, 20, 3);
      if (selected) {
        g.lineStyle(1.5, parseInt(C.hudBorder.slice(1), 16), 1);
        g.strokeRoundedRect(x0 + 20, yy, PANEL_W - 40, 20, 3);
      }
      addPinned(this.content!, g);
      this.text(x0 + 30, yy + 10, ACTION_LABELS[action], C.ink, 11);
      const key = settings.bindings[this.cPlayer][action];
      const show = selected && this.capturing ? 'press a key...' : keyLabel(key);
      this.text(x0 + PANEL_W - 122, yy + 10, show, selected && this.capturing ? C.coinHi : C.hudBorder, 11, 1).setX(x0 + PANEL_W - 122);
      const pl = this.deps.input?.padLabel(action) ?? '—';
      this.text(x0 + PANEL_W - 40, yy + 10, pl, pl === '—' ? C.inkDim : '#7fd0ff', 11, 1).setX(x0 + PANEL_W - 40);
    });
    const fy = this.rowY + REBINDABLE_ACTIONS.length * 22 + 8;
    this.text(x0 + 24, fy, 'Controller also: Y dodge - RB ability - RT steal - Start settings - Select help', padOn ? '#7fd0ff' : C.inkDim, 9.5);
  }

  private tabManual(): void {
    const cx = this.modal!.cx;
    this.text(cx, this.rowY + 10, 'Read the official StrongBow manual:', C.ink, 12, 0.5).setX(cx);
    const open = () => {
      this.close();
      this.deps.onOpenManual?.();
    };
    this.content!.add(makeButton(this.scene, cx, this.rowY + 50, 200, 40, 'OPEN MANUAL', open, { fill: C.ivy, size: 15 }));
    this.focusRow(this.rowY + 50, { activate: open });
  }
}
