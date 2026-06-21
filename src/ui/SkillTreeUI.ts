import Phaser from 'phaser';
import { framedPanel, makeButton, addPinned } from './uiHelpers';
import type { Modal } from './uiHelpers';
import { C } from '../rendering/Palette';
import { audio } from '../systems/AudioSystem';
import type { Hero } from '../entities/Hero';

const PANEL_W = 470;
const PANEL_H = 492;

// "Growth" overlay - spend skill points (1-3) and attribute points (4-7).
export class SkillTreeUI {
  private scene: Phaser.Scene;
  private modal: Modal | null = null;
  private content: Phaser.GameObjects.Container | null = null;
  private hero: Hero | null = null;
  private keyHandler?: (e: KeyboardEvent) => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  isOpen(): boolean {
    return this.modal !== null;
  }

  open(hero: Hero): void {
    if (this.modal) this.close();
    this.hero = hero;
    this.modal = framedPanel(this.scene, PANEL_W, PANEL_H, `GROWTH - ${hero.def.name}`);
    this.content = this.scene.add.container(0, 0).setDepth(this.modal.container.depth + 1);
    this.modal.add(this.content);
    this.keyHandler = (e) => this.onKey(e);
    this.scene.input.keyboard?.on('keydown', this.keyHandler);
    this.rebuild();
  }

  close(): void {
    if (this.keyHandler) this.scene.input.keyboard?.off('keydown', this.keyHandler);
    this.keyHandler = undefined;
    this.content = null;
    this.modal?.destroy();
    this.modal = null;
    this.hero = null;
  }

  private onKey(e: KeyboardEvent): void {
    if (!this.hero) return;
    const skills = this.hero.skillSet.list();
    const attrs = this.hero.attributes.list();
    let acted = false;
    if (e.key >= '1' && e.key <= '3') {
      const sk = skills[Number(e.key) - 1];
      if (sk && this.hero.skillSet.upgrade(sk.id)) acted = true;
    } else if (e.key >= '4' && e.key <= '7') {
      const at = attrs[Number(e.key) - 4];
      if (at && this.hero.attributes.upgrade(at.id)) acted = true;
    }
    if (acted) {
      this.hero.refreshStats();
      audio.sfx('ui_select');
      this.rebuild();
    }
  }

  private label(x: number, y: number, str: string, color: string, size = 12, bold = false): Phaser.GameObjects.Text {
    const t = this.scene.add
      .text(x, y, str, { fontFamily: 'Trebuchet MS, sans-serif', fontSize: `${size}px`, color, fontStyle: bold ? 'bold' : 'normal' })
      .setOrigin(0, 0);
    addPinned(this.content!, t);
    return t;
  }

  private row(yy: number, key: string, name: string, desc: string, rank: number, max: number, canUp: boolean, onUp: () => void): void {
    const x0 = this.modal!.cx - PANEL_W / 2;
    const left = x0 + 22;
    const box = this.scene.add.graphics();
    box.fillStyle(0x000000, 0.35);
    box.fillRoundedRect(left, yy, PANEL_W - 44, 46, 5);
    box.lineStyle(1, 0x6e521f, 0.6);
    box.strokeRoundedRect(left, yy, PANEL_W - 44, 46, 5);
    addPinned(this.content!, box);

    this.label(left + 10, yy + 6, `[${key}]`, C.coinHi, 12, true);
    this.label(left + 40, yy + 6, name, C.hudBorder, 12, true);
    this.label(left + 40, yy + 24, desc, C.inkDim, 9.5);

    for (let p = 0; p < max; p++) {
      const pip = this.scene.add.graphics();
      pip.fillStyle(p < rank ? parseInt(C.xpFill.slice(1), 16) : 0x2a2f48, 1);
      pip.fillRoundedRect(left + PANEL_W - 200 + p * 12, yy + 8, 9, 7, 2);
      addPinned(this.content!, pip);
    }
    this.label(left + PANEL_W - 96, yy + 6, `${rank}/${max}`, C.ink, 10);
    this.content!.add(
      makeButton(this.scene, left + PANEL_W - 60, yy + 24, 28, 22, rank >= max ? 'MAX' : '+', onUp, { fill: canUp ? C.ivy : C.hudPanel2, size: 12 })
    );
  }

  private rebuild(): void {
    if (!this.content || !this.hero) return;
    const hero = this.hero;
    this.content.removeAll(true);
    const x0 = this.modal!.cx - PANEL_W / 2;
    const y0 = this.modal!.cy - PANEL_H / 2;
    const left = x0 + 22;

    this.label(left, y0 + 34, `SKILLS - ${hero.skillSet.points} pts`, hero.skillSet.points > 0 ? C.coinHi : C.inkDim, 12, true);
    const skills = hero.skillSet.list();
    skills.forEach((sk, i) => {
      const yy = y0 + 54 + i * 52;
      this.row(yy, `${i + 1}`, sk.name, sk.description, hero.skillSet.rank(sk.id), sk.maxRank, hero.skillSet.canUpgrade(sk.id), () => {
        if (hero.skillSet.upgrade(sk.id)) {
          hero.refreshStats();
          audio.sfx('ui_select');
          this.rebuild();
        }
      });
    });

    const attrsY = y0 + 54 + 3 * 52 + 8;
    this.label(left, attrsY, `ATTRIBUTES - ${hero.attributes.points} pts`, hero.attributes.points > 0 ? C.coinHi : C.inkDim, 12, true);
    const attrs = hero.attributes.list();
    attrs.forEach((at, i) => {
      const yy = attrsY + 20 + i * 52;
      this.row(yy, `${i + 4}`, at.name, at.description, hero.attributes.rank(at.id), at.maxRank, hero.attributes.canUpgrade(at.id), () => {
        if (hero.attributes.upgrade(at.id)) {
          hero.refreshStats();
          audio.sfx('ui_select');
          this.rebuild();
        }
      });
    });
  }
}
