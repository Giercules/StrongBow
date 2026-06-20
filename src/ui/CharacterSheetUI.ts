import Phaser from 'phaser';
import { framedPanel, makeButton, addPinned } from './uiHelpers';
import type { Modal } from './uiHelpers';
import { C } from '../rendering/Palette';
import { describeItemStats } from '../data/pickupInfo';
import type { Hero } from '../entities/Hero';

const PANEL_W = 480;
const PANEL_H = 420;

export class CharacterSheetUI {
  private scene: Phaser.Scene;
  private modal: Modal | null = null;
  private content: Phaser.GameObjects.Container | null = null;
  private hero: Hero | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  isOpen(): boolean {
    return this.modal !== null;
  }

  open(hero: Hero): void {
    if (this.modal) this.close();
    this.hero = hero;
    this.modal = framedPanel(this.scene, PANEL_W, PANEL_H, `CHARACTER · ${hero.def.name}`);
    this.content = this.scene.add.container(0, 0).setDepth(this.modal.container.depth + 1);
    this.modal.add(this.content);
    this.rebuild();
  }

  close(): void {
    this.content = null;
    this.modal?.destroy();
    this.modal = null;
    this.hero = null;
  }

  private label(x: number, y: number, str: string, color: string, size = 12, bold = false): Phaser.GameObjects.Text {
    const t = this.scene.add
      .text(x, y, str, { fontFamily: 'Trebuchet MS, sans-serif', fontSize: `${size}px`, color, fontStyle: bold ? 'bold' : 'normal' })
      .setOrigin(0, 0);
    addPinned(this.content!, t);
    return t;
  }

  private rebuild(): void {
    if (!this.content || !this.hero) return;
    const h = this.hero;
    this.content.removeAll(true);
    const x0 = this.modal!.cx - PANEL_W / 2;
    const y0 = this.modal!.cy - PANEL_H / 2;
    const left = x0 + 28;
    const right = x0 + PANEL_W / 2 + 14;

    // portrait
    const portrait = this.scene.add.sprite(left + 44, y0 + 92, `hero-${h.classId}-sheet`).setScale(5);
    portrait.play(`${h.classId}-idle-down`);
    addPinned(this.content, portrait);
    addPinned(this.content, this.scene.add.image(left + 44, y0 + 132, 'fx-shadow').setScale(2).setAlpha(0.5));

    this.label(left, y0 + 150, `${h.def.name}`, C.hudBorder, 16, true);
    this.label(left, y0 + 170, `${h.def.role}  ·  Level ${h.level}`, C.inkDim, 11);
    this.label(left, y0 + 186, h.def.signature, C.ink, 10);

    // XP bar
    const xpToNext = Math.max(1, Math.floor(40 * Math.pow(h.level, 1.45)));
    const g = this.scene.add.graphics();
    g.fillStyle(0x000000, 0.5);
    g.fillRect(left, y0 + 206, 150, 8);
    g.fillStyle(parseInt(C.xpFill.slice(1), 16), 1);
    g.fillRect(left, y0 + 206, 150 * Phaser.Math.Clamp(h.xp / xpToNext, 0, 1), 8);
    addPinned(this.content, g);
    this.label(left, y0 + 218, `XP ${h.xp}/${xpToNext}`, C.inkDim, 9);

    // stats
    const s = h.stats;
    this.label(right, y0 + 36, 'STATS', C.hudBorder, 12, true);
    const stats: [string, string][] = [
      ['Health', `${Math.ceil(h.health)} / ${s.maxHealth}`],
      ['Mana', `${Math.ceil(h.mana)} / ${s.maxMana}`],
      ['Damage', `${s.damage}`],
      ['Armor', `${s.armor}`],
      ['Speed', `${s.speed}`],
      ['Crit', `${Math.round(s.critChance * 100)}%`],
      ['Fire', `${s.fire}`],
      ['Regen', `${s.regen.toFixed(1)}/s`],
    ];
    stats.forEach((st, i) => {
      const yy = y0 + 56 + i * 17;
      this.label(right, yy, st[0], C.inkDim, 11);
      this.label(right + 110, yy, st[1], C.ink, 11, true);
    });

    // growth
    this.label(right, y0 + 204, 'GROWTH', C.hudBorder, 12, true);
    this.label(right, y0 + 222, `Skill points: ${h.skillSet.points}`, h.skillSet.points > 0 ? C.coinHi : C.inkDim, 10);
    this.label(right, y0 + 236, `Attribute points: ${h.attributes.points}`, h.attributes.points > 0 ? C.coinHi : C.inkDim, 10);
    const attrs = h.attributes.list().map((a) => `${a.name[0]}${h.attributes.rank(a.id)}`).join('  ');
    this.label(right, y0 + 250, `Attributes: ${attrs}`, C.ink, 10);

    // equipped gear
    this.label(left, y0 + 240, 'EQUIPPED', C.hudBorder, 12, true);
    const eq = h.inventory.equippedList();
    if (eq.length === 0) this.label(left, y0 + 258, 'Nothing equipped yet.', C.inkDim, 10);
    eq.forEach((it, i) => {
      const yy = y0 + 258 + i * 26;
      addPinned(this.content!, this.scene.add.image(left + 8, yy + 6, it.icon).setScale(1.3).setOrigin(0, 0));
      this.label(left + 26, yy, it.name, C.ink, 10.5, true);
      this.label(left + 26, yy + 12, describeItemStats(it), C.inkDim, 9);
    });

    this.content.add(
      makeButton(this.scene, this.modal!.cx + PANEL_W / 2 - 50, y0 + PANEL_H - 20, 80, 26, 'CLOSE', () => this.close())
    );
  }
}
