import Phaser from 'phaser';
import { framedPanel, makeButton, addPinned } from './uiHelpers';
import type { Modal } from './uiHelpers';
import { C } from '../rendering/Palette';
import { CLASS_HUD_COLORS, hexStr } from '../core/constants';
import { audio } from '../systems/AudioSystem';
import { ALL_CLASSES, HEROES } from '../data/heroes';
import type { Hero } from '../entities/Hero';
import type { HeroClassId } from '../core/types';
import { MenuNav } from './MenuNav';
import { questLog } from '../systems/QuestSystem';
import type { SaveAlly } from '../systems/SaveSystem';

const PANEL_W = 470;
const PANEL_H = 430;
const ROW_PITCH = 50;
const BOX_H = 44;
const BOX_PAD_X = 24;
const HIRE_BTN_W = 66;
const HIRE_BTN_INSET = 36;
const DESC_PAD_L = 12;
const DESC_BTN_GAP = 8;

// The Fighters Guild hiring desk. Allies no longer follow for free — here the
// player spends gold to hire sellswords for their NEXT descent. The contract
// lapses when they return to town, so each run must be re-hired.
export class GuildHireUI {
  private scene: Phaser.Scene;
  private modal: Modal | null = null;
  private content: Phaser.GameObjects.Container | null = null;
  private buyer: Hero | null = null;
  private playerClasses: HeroClassId[] = [];
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  isOpen(): boolean {
    return this.modal !== null;
  }

  private nav = new MenuNav();

  open(buyer: Hero, playerClasses: HeroClassId[]): void {
    if (this.modal) this.close();
    this.buyer = buyer;
    this.playerClasses = playerClasses;
    this.modal = framedPanel(this.scene, PANEL_W, PANEL_H, 'FIGHTERS GUILD');
    this.content = this.scene.add.container(0, 0).setDepth(this.modal.container.depth + 1);
    this.modal.add(this.content);
    // Esc handled centrally by the scene (closeAllOverlays → close)
    this.nav.attach(this.scene, () => this.close());
    this.rebuild();
  }

  close(): void {
    this.nav.detach();
    this.content = null;
    this.modal?.destroy();
    this.modal = null;
    this.buyer = null;
  }

  private veterans(): SaveAlly[] {
    return (this.scene.registry.get('companionVeterans') as SaveAlly[] | undefined) ?? [];
  }

  private isVeteran(cls: HeroClassId): boolean {
    return this.veterans().some((v) => v.classId === cls && !v.isPlayer);
  }

  private cost(cls?: HeroClassId): number {
    const base = 50 + 20 * (this.buyer?.level ?? 1);
    const repMul = 1 - questLog.repDiscount() * 0.5;
    let c = Math.round(base * repMul);
    if (cls && this.isVeteran(cls)) c = Math.round(c * 0.55);
    return c;
  }

  private hired(): HeroClassId[] {
    return (this.scene.registry.get('hiredAllies') as HeroClassId[] | undefined) ?? [];
  }

  private setHired(list: HeroClassId[]): void {
    this.scene.registry.set('hiredAllies', list);
  }

  private textStyle(size: number, bold: boolean): Phaser.Types.GameObjects.Text.TextStyle {
    return { fontFamily: 'MedievalSharp, "Trebuchet MS", cursive', fontSize: `${size}px`, fontStyle: bold ? 'bold' : 'normal' };
  }

  private truncateToWidth(str: string, maxW: number, size: number, bold = false): string {
    const probe = this.scene.add.text(-9999, -9999, str, this.textStyle(size, bold));
    if (probe.width <= maxW) {
      probe.destroy();
      return str;
    }
    let cut = str;
    while (cut.length > 1) {
      cut = cut.slice(0, -1);
      probe.setText(`${cut}…`);
      if (probe.width <= maxW) break;
    }
    probe.destroy();
    return `${cut}…`;
  }

  private text(x: number, y: number, str: string, color: string, size = 12, bold = false, originX = 0, maxW?: number): Phaser.GameObjects.Text {
    const display = maxW ? this.truncateToWidth(str, maxW, size, bold) : str;
    const t = this.scene.add
      .text(x, y, display, { ...this.textStyle(size, bold), color })
      .setOrigin(originX, 0);
    addPinned(this.content!, t);
    return t;
  }

  private rebuild(): void {
    if (!this.content || !this.buyer) return;
    this.content.removeAll(true);
    this.nav.begin();
    const buyer = this.buyer;
    const x0 = this.modal!.cx - PANEL_W / 2;
    const y0 = this.modal!.cy - PANEL_H / 2;
    const sampleCost = this.cost();

    this.text(this.modal!.cx, y0 + 38, `Party gold: ${buyer.inventory.gold}`, C.coinHi, 12, true, 0.5);
    this.text(this.modal!.cx, y0 + 56, `Sellswords march for one descent — from ${sampleCost}g each. Veterans re-enlist cheaper.`, C.inkDim, 9, false, 0.5);

    const hired = this.hired();
    const pool = ALL_CLASSES.filter((c) => !this.playerClasses.includes(c));
    const boxW = PANEL_W - BOX_PAD_X * 2;
    pool.forEach((cls, i) => {
      const def = HEROES[cls];
      const color = CLASS_HUD_COLORS[cls] ?? 0xffffff;
      const yy = y0 + 74 + i * ROW_PITCH;
      const isHired = hired.includes(cls);
      const veteran = this.isVeteran(cls);
      const left = x0 + BOX_PAD_X;
      const hireCost = this.cost(cls);

      const box = this.scene.add.graphics();
      box.fillStyle(0x000000, 0.32);
      box.fillRoundedRect(left, yy, boxW, BOX_H, 5);
      box.lineStyle(1.5, color, isHired ? 1 : 0.5);
      box.strokeRoundedRect(left, yy, boxW, BOX_H, 5);
      addPinned(this.content!, box);

      const descMaxW = boxW - DESC_PAD_L - HIRE_BTN_INSET - HIRE_BTN_W / 2 - DESC_BTN_GAP;
      const btnX = left + boxW - HIRE_BTN_INSET;

      this.text(left + DESC_PAD_L, yy + 6, def.name, hexStr(color), 12, true);
      const vet = this.veterans().find((v) => v.classId === cls);
      const vetTag = veteran && vet ? `  L${vet.level} veteran` : '';
      this.text(left + DESC_PAD_L, yy + 24, `${def.role} — ${def.signature}${vetTag}`, C.inkDim, 8.5, false, 0, descMaxW);

      if (isHired) {
        this.text(left + boxW - 14, yy + BOX_H / 2 - 6, 'HIRED', '#7fe0a0', 11, true, 1);
      } else {
        const afford = buyer.inventory.gold >= hireCost;
        this.content!.add(
          makeButton(this.scene, btnX, yy + BOX_H / 2, HIRE_BTN_W, 22, afford ? `HIRE ${hireCost}g` : 'NO GOLD', () => this.hire(cls), {
            fill: afford ? C.ivy : C.hudPanel2,
            size: 9,
          })
        );
      }
    });

    this.content!.add(makeButton(this.scene, this.modal!.cx, y0 + PANEL_H - 28, 160, 30, 'DONE  (Esc)', () => this.close(), { fill: C.hudBorderDk, size: 12 }));
    this.nav.end();
  }

  private hire(cls: HeroClassId): void {
    if (!this.buyer) return;
    const cost = this.cost(cls);
    if (this.buyer.inventory.gold < cost) {
      audio.sfx('ui_move');
      return;
    }
    this.buyer.inventory.gold -= cost;
    const list = this.hired();
    if (!list.includes(cls)) list.push(cls);
    this.setHired(list);
    audio.sfx('coin');
    this.rebuild();
  }
}