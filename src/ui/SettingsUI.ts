import Phaser from 'phaser';
import { framedPanel, makeButton, addPinned } from './uiHelpers';
import type { Modal } from './uiHelpers';
import { C } from '../rendering/Palette';
import { settings } from '../core/GameSettings';
import { audio } from '../systems/AudioSystem';
import { aiService } from '../ai/AIService';
import { REBINDABLE_ACTIONS, ACTION_LABELS, keyLabel } from '../core/KeyBindings';
import type { AIProviderId } from '../core/types';
import type { DungeonInput } from '../systems/DungeonInput';

const PROVIDERS: AIProviderId[] = ['fallback', 'openai', 'anthropic', 'xai'];
const PANEL_W = 480;
const PANEL_H = 470;
type Tab = 'audio' | 'ai' | 'companions' | 'controls' | 'cheats' | 'manual';
const TABS: Tab[] = ['audio', 'ai', 'companions', 'controls', 'cheats', 'manual'];
const TAB_LABELS: Record<Tab, string> = {
  audio: 'AUDIO',
  ai: 'AI',
  companions: 'ALLIES',
  controls: 'KEYS',
  cheats: 'CHEATS',
  manual: 'HELP',
};

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
    this.modal = framedPanel(this.scene, PANEL_W, PANEL_H, 'SETTINGS');
    this.content = this.scene.add.container(0, 0).setDepth(this.modal.container.depth + 1);
    this.modal.add(this.content);
    this.keyHandler = (e) => this.onKey(e);
    this.scene.input.keyboard?.on('keydown', this.keyHandler);
    this.rebuild();
  }

  close(): void {
    if (this.keyHandler) this.scene.input.keyboard?.off('keydown', this.keyHandler);
    this.keyHandler = undefined;
    this.capturing = false;
    this.content = null;
    this.modal?.destroy();
    this.modal = null;
  }

  private onKey(e: KeyboardEvent): void {
    if (this.tab !== 'controls' || this.capturing) return;
    if (e.key === 'ArrowUp') {
      this.cSel = (this.cSel + REBINDABLE_ACTIONS.length - 1) % REBINDABLE_ACTIONS.length;
      this.rebuild();
    } else if (e.key === 'ArrowDown') {
      this.cSel = (this.cSel + 1) % REBINDABLE_ACTIONS.length;
      this.rebuild();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      this.cPlayer = this.cPlayer === 'p1' ? 'p2' : 'p1';
      this.rebuild();
    } else if (e.key === 'Enter') {
      this.beginCapture();
    } else if (e.key === 'r' || e.key === 'R') {
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

  private text(x: number, y: number, str: string, color: string, size = 12, origin = 0): Phaser.GameObjects.Text {
    const t = this.scene.add
      .text(x, y, str, { fontFamily: 'Trebuchet MS, sans-serif', fontSize: `${size}px`, color })
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
    const x0 = this.modal!.cx - PANEL_W / 2;
    const y0 = this.modal!.cy - PANEL_H / 2;

    const tabW = (PANEL_W - 28) / TABS.length;
    TABS.forEach((t, i) => {
      this.btn(x0 + 14 + tabW / 2 + i * tabW, y0 + 40, tabW - 3, TAB_LABELS[t], () => {
        this.tab = t;
      }, this.tab === t ? C.ivy : C.hudPanel2);
    });

    this.rowY = y0 + 74;
    if (this.tab === 'audio') this.tabAudio();
    else if (this.tab === 'ai') this.tabAI();
    else if (this.tab === 'companions') this.tabCompanions();
    else if (this.tab === 'controls') this.tabControls();
    else if (this.tab === 'cheats') this.tabCheats();
    else this.tabManual();

    this.text(this.modal!.cx, y0 + PANEL_H - 18, 'O or ESC to close', C.inkDim, 11, 0.5).setX(this.modal!.cx);
  }

  private tabAudio(): void {
    const right = this.modal!.cx + PANEL_W / 2 - 24;
    let y = this.rowLabel('Mute all');
    this.btn(right - 45, y, 80, settings.get('muted') ? 'MUTED' : 'ON', () => audio.setMuted(!settings.get('muted')), settings.get('muted') ? C.hpLow : C.ivy);
    y = this.rowLabel('Music');
    this.btn(right - 45, y, 80, settings.get('musicEnabled') ? 'ON' : 'OFF', () => audio.setMusicEnabled(!settings.get('musicEnabled')), settings.get('musicEnabled') ? C.ivy : C.hudPanel2);
    y = this.rowLabel('Music volume');
    this.stepper(right, y, Math.round(settings.get('musicVolume') * 100) + '%', () => audio.setMusicVolume(settings.get('musicVolume') - 0.1), () => audio.setMusicVolume(settings.get('musicVolume') + 0.1));
    y = this.rowLabel('SFX volume');
    this.stepper(right, y, Math.round(settings.get('sfxVolume') * 100) + '%', () => audio.setSfxVolume(settings.get('sfxVolume') - 0.1), () => audio.setSfxVolume(settings.get('sfxVolume') + 0.1));
  }

  private tabAI(): void {
    const right = this.modal!.cx + PANEL_W / 2 - 24;
    let y = this.rowLabel('AI narration');
    this.btn(right - 45, y, 80, settings.get('aiBarksEnabled') ? 'ON' : 'OFF', () => {
      const v = !settings.get('aiBarksEnabled');
      settings.set('aiBarksEnabled', v);
      settings.set('aiQuestEnabled', v);
    }, settings.get('aiBarksEnabled') ? C.ivy : C.hudPanel2);
    y = this.rowLabel('AI provider');
    this.btn(right - 60, y, 110, settings.get('aiProvider').toUpperCase(), () => {
      const i = PROVIDERS.indexOf(settings.get('aiProvider'));
      settings.set('aiProvider', PROVIDERS[(i + 1) % PROVIDERS.length]);
      aiService.refresh();
    });
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
    this.btn(right - 45, y, 80, c.useMagic ? 'ON' : 'OFF', () => settings.setCompanion('useMagic', !c.useMagic), c.useMagic ? C.ivy : C.hudPanel2);
  }

  private tabCheats(): void {
    const right = this.modal!.cx + PANEL_W / 2 - 24;
    const g = settings.get('gameplay');
    let y = this.rowLabel('Monster count');
    this.stepper(right, y, g.monsterCount.toFixed(2) + 'x', () => settings.setGameplay('monsterCount', Math.max(0.5, +(g.monsterCount - 0.25).toFixed(2))), () => settings.setGameplay('monsterCount', Math.min(4, +(g.monsterCount + 0.25).toFixed(2))));
    y = this.rowLabel('XP multiplier');
    this.stepper(right, y, g.xpMultiplier.toFixed(1) + 'x', () => settings.setGameplay('xpMultiplier', Math.max(1, +(g.xpMultiplier - 0.5).toFixed(1))), () => settings.setGameplay('xpMultiplier', Math.min(10, +(g.xpMultiplier + 0.5).toFixed(1))));
    y = this.rowLabel('Player damage');
    this.stepper(right, y, g.playerDamageMult.toFixed(1) + 'x', () => settings.setGameplay('playerDamageMult', Math.max(1, +(g.playerDamageMult - 0.5).toFixed(1))), () => settings.setGameplay('playerDamageMult', Math.min(10, +(g.playerDamageMult + 0.5).toFixed(1))));
    y = this.rowLabel('Start level');
    this.stepper(right, y, String(g.startLevel), () => settings.setGameplay('startLevel', Math.max(1, g.startLevel - 1)), () => settings.setGameplay('startLevel', Math.min(20, g.startLevel + 1)));
    y = this.rowLabel('God mode');
    this.btn(right - 45, y, 80, g.godMode ? 'ON' : 'OFF', () => settings.setGameplay('godMode', !g.godMode), g.godMode ? C.ivy : C.hudPanel2);
    y = this.rowLabel('Infinite mana');
    this.btn(right - 45, y, 80, g.infiniteMana ? 'ON' : 'OFF', () => settings.setGameplay('infiniteMana', !g.infiniteMana), g.infiniteMana ? C.ivy : C.hudPanel2);
    this.rowLabel('');
    this.text(this.modal!.cx - PANEL_W / 2 + 24, this.rowY, 'Monster count & start level apply on next dungeon entry.', C.inkDim, 10);
  }

  private tabControls(): void {
    const x0 = this.modal!.cx - PANEL_W / 2;
    this.text(x0 + 24, this.rowY, `Editing ${this.cPlayer.toUpperCase()}   ( L/R switch - Up/Dn select - Enter rebind - R reset - Shift+R all )`, C.inkDim, 9.5);
    this.rowY += 22;
    REBINDABLE_ACTIONS.forEach((action, i) => {
      const yy = this.rowY + i * 22;
      const selected = i === this.cSel;
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
      this.text(x0 + PANEL_W - 40, yy + 10, show, selected && this.capturing ? C.coinHi : C.hudBorder, 11, 1).setX(x0 + PANEL_W - 40);
    });
  }

  private tabManual(): void {
    const cx = this.modal!.cx;
    this.text(cx, this.rowY + 10, 'Read the official StrongBow manual:', C.ink, 12, 0.5).setX(cx);
    this.content!.add(
      makeButton(this.scene, cx, this.rowY + 50, 200, 40, 'OPEN MANUAL', () => {
        this.close();
        this.deps.onOpenManual?.();
      }, { fill: C.ivy, size: 15 })
    );
  }
}
