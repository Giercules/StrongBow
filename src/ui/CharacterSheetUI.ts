import Phaser from 'phaser';
import { framedPanel, makeButton, addPinned } from './uiHelpers';
import type { Modal } from './uiHelpers';
import { C } from '../rendering/Palette';
import { describeItemStats } from '../data/pickupInfo';
import { ItemTooltip } from './ItemTooltip';
import type { Hero } from '../entities/Hero';

const PANEL_W = 480;
const PANEL_H = 420;

export class CharacterSheetUI {
  private scene: Phaser.Scene;
  private modal: Modal | null = null;
  private content: Phaser.GameObjects.Container | null = null;
  private hero: Hero | null = null;
  private tip!: ItemTooltip;

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
    this.tip = new ItemTooltip(this.scene);
    this.rebuild();
  }

  close(): void {
    this.tip?.destroy();
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
    this.tip?.hide();
    this.content.removeAll(true);
    const x0 = this.modal!.cx - PANEL_W / 2;
    const y0 = this.modal!.cy - PANEL_H / 2;
    const left = x0 + 28;
    const right = x0 + PANEL_W / 2 + 14;

    // portrait
    const portrait = this.scene.add.sprite(left + 44, y0 + 92, `hero-${h.classId}-sheet`).setScale(2.5);
    portrait.play(`${h.classId}-idle-down`);
    addPinned(this.content, portrait);
    addPinned(this.content, this.scene.add.image(left + 44, y0 + 132, 'fx-shadow').setScale(2).setAlpha(0.5));

    this.label(left, y0 + 150, `${h.def.name}`, C.hudBorder, 16, true);
    this.label(left, y0 + 170, `${h.def.role}  ·  Level ${h.level}`, C.inkDim, 11);
    // Signature can be long (thief, necromancer); wrap it inside the left
    // column so it can't bleed into the STATS column on the right.
    const leftColW = right - left - 12;
    const sig = this.label(left, y0 + 186, h.def.signature, C.ink, 10, false, leftColW);
    let ly = y0 + 186 + sig.height + 6;

    // XP bar — flows below the (possibly multi-line) signature
    const xpToNext = Math.max(1, Math.floor(40 * Math.pow(h.level, 1.45)));
    const g = this.scene.add.graphics();
    g.fillStyle(0x000000, 0.5);
    g.fillRect(left, ly, 150, 8);
    g.fillStyle(parseInt(C.xpFill.slice(1), 16), 1);
    g.fillRect(left, ly, 150 * Phaser.Math.Clamp(h.xp / xpToNext, 0, 1), 8);
    addPinned(this.content, g);
    this.label(left, ly + 11, `XP ${h.xp}/${xpToNext}`, C.inkDim, 9);
    ly += 11 + 16;

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
      ['Luck', `${s.luck}`],
    ];
    if (h.classId === 'necromancer') stats.push(['Max summons', `${h.maxSummons()}`]);
    stats.push(['Charisma', `${h.charisma}`]);
    if (h.classId === 'thief') {
      stats.push(['Sneak', `${h.sneakLevel}`]);
      stats.push(['Lockpick', `${h.lockpickLevel}`]);
      stats.push(['Pickpocket', `${h.pickpocketLevel}`]);
    }
    const STATS_TOP = y0 + 56;
    const STAT_ROW_H = 17;
    stats.forEach((st, i) => {
      const yy = STATS_TOP + i * STAT_ROW_H;
      this.label(right, yy, st[0], C.inkDim, 11);
      this.label(right + 110, yy, st[1], C.ink, 11, true);
    });

    // growth — placed below the stats list, whose length varies by class
    // (thief adds Sneak/Lockpick, necromancer adds Max summons), so anchor it
    // dynamically to avoid overlapping the last stat row.
    const growthY = STATS_TOP + stats.length * STAT_ROW_H + 14;
    this.label(right, growthY, 'GROWTH', C.hudBorder, 12, true);
    this.label(right, growthY + 18, `Skill points: ${h.skillSet.points}`, h.skillSet.points > 0 ? C.coinHi : C.inkDim, 10);
    this.label(right, growthY + 32, `Attribute points: ${h.attributes.points}`, h.attributes.points > 0 ? C.coinHi : C.inkDim, 10);
    const attrs = h.attributes.list().map((a) => `${a.name[0]}${h.attributes.rank(a.id)}`).join('  ');
    this.label(right, growthY + 46, `Attributes: ${attrs}`, C.ink, 10);

    // equipped gear — flows below the XP block; the left column's height
    // depends on how many lines the signature wrapped to.
    this.label(left, ly, 'EQUIPPED', C.hudBorder, 12, true);
    const eq = h.inventory.equippedList();
    const eqTop = ly + 18;
    if (eq.length === 0) this.label(left, eqTop, 'Nothing equipped yet.', C.inkDim, 10);
    eq.forEach((it, i) => {
      const yy = eqTop + i * 15;
      addPinned(this.content!, this.scene.add.image(left + 8, yy + 1, it.icon).setScale(0.85).setOrigin(0, 0));
      this.label(left + 26, yy, it.name, C.ink, 9.5, true);
      const cz = this.scene.add.zone(left, yy, PANEL_W / 2 - 30, 14).setOrigin(0, 0).setInteractive({ useHandCursor: true });
      cz.on('pointerover', () => this.tip.show(it, left + PANEL_W / 2 - 30, yy, 'right'));
      cz.on('pointerout', () => this.tip.hide());
      addPinned(this.content!, cz);
    });

    this.content.add(
      makeButton(this.scene, this.modal!.cx + PANEL_W / 2 - 50, y0 + PANEL_H - 20, 80, 26, 'CLOSE', () => this.close())
    );
  }
}
