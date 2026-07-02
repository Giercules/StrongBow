import Phaser from 'phaser';
import { framedPanel, makeButton, addPinned } from './uiHelpers';
import type { Modal } from './uiHelpers';
import { C } from '../rendering/Palette';
import { CLASS_HUD_COLORS, hexStr } from '../core/constants';
import { audio } from '../systems/AudioSystem';
import { ALL_CLASSES, HEROES } from '../data/heroes';
import type { Hero } from '../entities/Hero';
import type { HeroClassId } from '../core/types';

const PANEL_W = 470;
const PANEL_H = 430;

// The Fighters Guild hiring desk. Allies no longer follow for free — here the
// player spends gold to hire sellswords for their NEXT descent. The contract
// lapses when they return to town, so each run must be re-hired.
export class GuildHireUI {
  private scene: Phaser.Scene;
  private modal: Modal | null = null;
  private content: Phaser.GameObjects.Container | null = null;
  private buyer: Hero | null = null;
  private playerClasses: HeroClassId[] = [];
  private keyHandler?: (e: KeyboardEvent) => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  isOpen(): boolean {
    return this.modal !== null;
  }

  open(buyer: Hero, playerClasses: HeroClassId[]): void {
    if (this.modal) this.close();
    this.buyer = buyer;
    this.playerClasses = playerClasses;
    this.modal = framedPanel(this.scene, PANEL_W, PANEL_H, 'FIGHTERS GUILD');
    this.content = this.scene.add.container(0, 0).setDepth(this.modal.container.depth + 1);
    this.modal.add(this.content);
    this.keyHandler = (e) => {
      if (e.key === 'Escape') this.close();
    };
    this.scene.input.keyboard?.on('keydown', this.keyHandler);
    this.rebuild();
  }

  close(): void {
    if (this.keyHandler) this.scene.input.keyboard?.off('keydown', this.keyHandler);
    this.keyHandler = undefined;
    this.content = null;
    this.modal?.destroy();
    this.modal = null;
    this.buyer = null;
  }

  private cost(): number {
    return 80 + 30 * (this.buyer?.level ?? 1);
  }

  private hired(): HeroClassId[] {
    return (this.scene.registry.get('hiredAllies') as HeroClassId[] | undefined) ?? [];
  }

  private setHired(list: HeroClassId[]): void {
    this.scene.registry.set('hiredAllies', list);
  }

  private text(x: number, y: number, str: string, color: string, size = 12, bold = false, originX = 0): Phaser.GameObjects.Text {
    const t = this.scene.add
      .text(x, y, str, { fontFamily: 'MedievalSharp, "Trebuchet MS", cursive', fontSize: `${size}px`, color, fontStyle: bold ? 'bold' : 'normal' })
      .setOrigin(originX, 0);
    addPinned(this.content!, t);
    return t;
  }

  private rebuild(): void {
    if (!this.content || !this.buyer) return;
    this.content.removeAll(true);
    const buyer = this.buyer;
    const x0 = this.modal!.cx - PANEL_W / 2;
    const y0 = this.modal!.cy - PANEL_H / 2;
    const cost = this.cost();

    this.text(this.modal!.cx, y0 + 40, `Party gold: ${buyer.inventory.gold}`, C.coinHi, 13, true, 0.5);
    this.text(this.modal!.cx, y0 + 60, `Sellswords march with you for one descent — ${cost}g each. Re-hire after each run.`, C.inkDim, 9.5, false, 0.5);

    const hired = this.hired();
    const pool = ALL_CLASSES.filter((c) => !this.playerClasses.includes(c));
    pool.forEach((cls, i) => {
      const def = HEROES[cls];
      const color = CLASS_HUD_COLORS[cls] ?? 0xffffff;
      const yy = y0 + 84 + i * 60;
      const isHired = hired.includes(cls);
      const left = x0 + 22;

      const box = this.scene.add.graphics();
      box.fillStyle(0x000000, 0.32);
      box.fillRoundedRect(left, yy, PANEL_W - 44, 52, 6);
      box.lineStyle(1.5, color, isHired ? 1 : 0.5);
      box.strokeRoundedRect(left, yy, PANEL_W - 44, 52, 6);
      addPinned(this.content!, box);

      this.text(left + 14, yy + 8, def.name, hexStr(color), 14, true);
      this.text(left + 14, yy + 28, `${def.role} — ${def.signature}`, C.inkDim, 9.5);

      if (isHired) {
        this.text(left + PANEL_W - 110, yy + 19, 'HIRED', '#7fe0a0', 13, true);
      } else {
        const afford = buyer.inventory.gold >= cost;
        this.content!.add(
          makeButton(this.scene, left + PANEL_W - 70, yy + 26, 72, 24, afford ? `HIRE ${cost}g` : 'NO GOLD', () => this.hire(cls), {
            fill: afford ? C.ivy : C.hudPanel2,
            size: 10,
          })
        );
      }
    });

    this.content!.add(makeButton(this.scene, this.modal!.cx, y0 + PANEL_H - 28, 160, 30, 'DONE  (Esc)', () => this.close(), { fill: C.hudBorderDk, size: 12 }));
  }

  private hire(cls: HeroClassId): void {
    if (!this.buyer) return;
    const cost = this.cost();
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
