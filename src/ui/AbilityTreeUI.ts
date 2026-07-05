import Phaser from 'phaser';
import { framedPanel, makeButton, addPinned } from './uiHelpers';
import type { Modal } from './uiHelpers';
import { MenuNav } from './MenuNav';
import { C } from '../rendering/Palette';
import { audio } from '../systems/AudioSystem';
import type { Hero } from '../entities/Hero';
import { CLASS_KITS, SIGIL_UNLOCK, sigilsForTier, activeFor } from '../data/abilities';
import type { SigilTier, ActiveSlot } from '../data/abilities';
import { settings } from '../core/GameSettings';
import { keyLabel } from '../core/KeyBindings';

// Must fit inside the fixed 540px-tall play area and the narrowest play-area
// width (~460px at minimum window size), so keep W ≤ 464 and H ≤ 512.
const PANEL_W = 462;
const PANEL_H = 510;
const TIERS: SigilTier[] = [1, 2, 3];

/**
 * "Echoes & Sigils" — the Class Ability Expansion growth screen. Reached from a
 * button on the character sheet. Shows the level-gated unlock ladder and lets
 * the hero freely choose (and swap) one sigil per unlocked tier.
 */
export class AbilityTreeUI {
  private scene: Phaser.Scene;
  private modal: Modal | null = null;
  private content: Phaser.GameObjects.Container | null = null;
  private hero: Hero | null = null;
  private nav = new MenuNav();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  isOpen(): boolean {
    return this.modal !== null;
  }

  open(hero: Hero): void {
    if (this.modal) this.close();
    this.hero = hero;
    this.modal = framedPanel(this.scene, PANEL_W, PANEL_H, `ECHOES & SIGILS · ${hero.def.name}`);
    this.content = this.scene.add.container(0, 0).setDepth(this.modal.container.depth + 1);
    this.modal.add(this.content);
    this.nav.attach(this.scene, () => this.close());
    this.rebuild();
  }

  close(): void {
    this.nav.detach();
    this.content = null;
    this.modal?.destroy();
    this.modal = null;
    this.hero = null;
  }

  private label(x: number, y: number, str: string, color: string, size = 12, bold = false, wrapW = 0): Phaser.GameObjects.Text {
    const style: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: 'MedievalSharp, "Trebuchet MS", cursive',
      fontSize: `${size}px`,
      color,
      fontStyle: bold ? 'bold' : 'normal',
    };
    if (wrapW > 0) style.wordWrap = { width: wrapW, useAdvancedWrap: true };
    const t = this.scene.add.text(x, y, str, style).setOrigin(0, 0);
    addPinned(this.content!, t);
    return t;
  }

  private rebuild(): void {
    if (!this.content || !this.hero) return;
    const h = this.hero;
    const kit = CLASS_KITS[h.classId];
    this.content.removeAll(true);
    this.nav.begin();
    const x0 = this.modal!.cx - PANEL_W / 2;
    const y0 = this.modal!.cy - PANEL_H / 2;
    const left = x0 + 22;
    const innerW = PANEL_W - 44;

    this.label(left, y0 + 28, `${h.def.role}  ·  Level ${h.level}`, C.inkDim, 11);
    this.label(x0 + PANEL_W - 22 - 178, y0 + 29, 'Choose a rune per unlocked tier — swap freely.', C.inkDim, 8.5, false, 178);

    // ---- SIGILS ----
    this.label(left, y0 + 46, 'SIGILS', C.coinHi, 12, true);
    let y = y0 + 64;
    for (const tier of TIERS) {
      const unlockLvl = SIGIL_UNLOCK[tier];
      const unlocked = h.level >= unlockLvl;
      const equipped = h.abilities.effectiveSigil(tier, h.level);
      const choices = sigilsForTier(h.classId, tier);
      this.label(left, y, `TIER ${'I'.repeat(tier)}`, unlocked ? C.hudBorder : C.inkDim, 11, true);
      this.label(left + 66, y + 1, unlocked ? 'unlocked' : `unlocks at Lv ${unlockLvl}`, unlocked ? C.ivy : C.inkDim, 9);

      const chipW = (innerW - 16) / 3;
      choices.forEach((s, i) => {
        const cx = left + i * (chipW + 8) + chipW / 2;
        const cy = y + 18;
        const isEq = unlocked && equipped === s.id;
        const fill = !unlocked ? C.hudPanel : isEq ? C.ivy : C.hudPanel2;
        const btn = makeButton(this.scene, cx, cy, chipW, 24, s.name, () => {
          if (!unlocked) return;
          if (h.abilities.setSigil(tier, s.id)) {
            h.refreshStats();
            audio.sfx('ui_select');
            this.rebuild();
          }
        }, { fill, size: 10, text: !unlocked ? C.inkDim : isEq ? '#12140a' : C.ink });
        this.content!.add(btn);
      });

      // description of the currently-equipped sigil for this tier
      const eqDef = equipped ? choices.find((c) => c.id === equipped) : undefined;
      const desc = !unlocked
        ? `Reach level ${unlockLvl} to inscribe a Tier ${'I'.repeat(tier)} rune.`
        : eqDef
          ? `◆ ${eqDef.name}: ${eqDef.description}`
          : 'Choose a rune above.';
      this.label(left, y + 33, desc, unlocked ? C.ink : C.inkDim, 9, false, innerW);
      y += 62;
    }

    // ---- ABILITIES ----
    this.label(left, y + 2, 'ABILITIES', C.coinHi, 12, true);
    y += 20;
    const b = settings.bindings[h.playerNum === 2 ? 'p2' : 'p1'];
    const rows: { name: string; desc: string; lvl: number; icon: string; key?: string }[] = [
      { name: kit.coreName, desc: kit.coreDescription, lvl: 1, icon: 'icon-staff', key: keyLabel(b.ability) },
      { name: kit.secondary.name, desc: kit.secondary.description, lvl: kit.secondary.unlockLevel, icon: kit.secondary.icon, key: keyLabel(b.secondary) },
      { name: kit.tertiary.name, desc: kit.tertiary.description, lvl: kit.tertiary.unlockLevel, icon: kit.tertiary.icon, key: keyLabel(b.tertiary) },
      { name: kit.ultimate.name, desc: kit.ultimate.description, lvl: kit.ultimate.unlockLevel, icon: kit.ultimate.icon, key: keyLabel(b.ultimate) },
      { name: kit.mastery.name, desc: kit.mastery.description, lvl: kit.mastery.unlockLevel, icon: kit.mastery.icon },
    ];
    for (const r of rows) {
      const unlocked = h.level >= r.lvl;
      const rowH = 27;
      const box = this.scene.add.graphics();
      box.fillStyle(0x000000, unlocked ? 0.32 : 0.18);
      box.fillRoundedRect(left, y, innerW, rowH, 4);
      box.lineStyle(1, unlocked ? 0x6e521f : 0x33384a, 0.6);
      box.strokeRoundedRect(left, y, innerW, rowH, 4);
      addPinned(this.content!, box);
      const icon = this.scene.add.image(left + 15, y + rowH / 2, r.icon).setScale(0.85);
      if (!unlocked) icon.setTint(0x6a7080).setAlpha(0.5);
      addPinned(this.content!, icon);
      this.label(left + 30, y + 3, r.name, unlocked ? C.hudBorder : C.inkDim, 10.5, true);
      this.label(left + 30, y + 16, r.desc, unlocked ? C.ink : C.inkDim, 8, false, innerW - 120);
      const tag = unlocked ? (r.key ? `[${r.key}]` : 'PASSIVE') : `Lv ${r.lvl}`;
      this.label(left + innerW - 50, y + 9, tag, unlocked ? (r.key ? C.coinHi : C.ivy) : C.inkDim, 10, true);
      y += rowH + 3;
    }

    this.label(left, y + 1, 'Secondary / Tertiary / Ultimate keys rebind in Settings → Controls.', C.inkDim, 8, false, innerW);

    this.content.add(
      makeButton(this.scene, this.modal!.cx + PANEL_W / 2 - 50, y0 + PANEL_H - 20, 80, 26, 'CLOSE', () => this.close())
    );
    this.nav.end();
  }
}
