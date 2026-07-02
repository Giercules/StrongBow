import Phaser from 'phaser';
import { C } from '../rendering/Palette';
import { CLASS_HUD_COLORS, HUD_PANEL_WIDTH } from '../core/constants';
import type { HudRegistryData, HudHeroSlot } from '../core/types';

const W = HUD_PANEL_WIDTH;
const PAD = 10;
const SLOT_TOP = 50;
const SLOT_H = 70;
const CTRL_TOP = 50 + 70 * 4 + 40;

function hexNum(s: string): number {
  return parseInt(s.replace('#', ''), 16);
}

// Right-hand arcade panel: party slots, generators, controls box, quest footer.
export class GauntletHUD {
  private scene: Phaser.Scene;
  private dyn!: Phaser.GameObjects.Graphics;
  private titleText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private genText!: Phaser.GameObjects.Text;
  private bossText!: Phaser.GameObjects.Text;
  private questText!: Phaser.GameObjects.Text;
  private ctrlTitle!: Phaser.GameObjects.Text;
  private ctrlText!: Phaser.GameObjects.Text;
  private slotName: Phaser.GameObjects.Text[] = [];
  private slotStat: Phaser.GameObjects.Text[] = [];
  private slotIcon: Phaser.GameObjects.Image[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.buildChrome();
    this.buildText();
    this.dyn = scene.add.graphics().setDepth(5);
  }

  private buildChrome(): void {
    const g = this.scene.add.graphics().setDepth(0);
    g.fillStyle(hexNum(C.hudBg), 1);
    g.fillRect(0, 0, W, 540);
    g.fillStyle(hexNum(C.hudPanel), 1);
    g.fillRect(4, 4, W - 8, 532);
    g.lineStyle(2, hexNum(C.hudBorder), 1);
    g.strokeRect(5, 5, W - 10, 530);
    g.lineStyle(1, hexNum(C.hudBorderDk), 1);
    g.strokeRect(8, 8, W - 16, 524);
    g.fillStyle(hexNum(C.ivy), 1);
    for (const [cx, cy, sx, sy] of [
      [6, 6, 1, 1],
      [W - 6, 6, -1, 1],
      [6, 534, 1, -1],
      [W - 6, 534, -1, -1],
    ] as [number, number, number, number][]) {
      g.fillRect(cx, cy, 12 * sx, 3 * sy);
      g.fillRect(cx, cy, 3 * sx, 12 * sy);
    }
    g.lineStyle(1, hexNum(C.hudBorderDk), 1);
    g.lineBetween(PAD, 46, W - PAD, 46);
    for (let i = 0; i < 4; i++) {
      const y = SLOT_TOP + i * SLOT_H;
      g.fillStyle(hexNum(C.hudPanel2), 1);
      g.fillRoundedRect(PAD, y, W - PAD * 2, SLOT_H - 6, 4);
      g.lineStyle(1, hexNum(C.hudBorderDk), 0.7);
      g.strokeRoundedRect(PAD, y, W - PAD * 2, SLOT_H - 6, 4);
    }
    g.fillStyle(0x05060a, 0.6);
    g.fillRoundedRect(PAD, CTRL_TOP, W - PAD * 2, 110, 4);
    g.lineStyle(1, hexNum(C.hudBorderDk), 0.7);
    g.strokeRoundedRect(PAD, CTRL_TOP, W - PAD * 2, 110, 4);
  }

  private mkText(x: number, y: number, size: number, color: string, opts: Partial<Phaser.Types.GameObjects.Text.TextStyle> = {}): Phaser.GameObjects.Text {
    return this.scene.add.text(x, y, '', { fontFamily: 'MedievalSharp, "Trebuchet MS", cursive', fontSize: `${size}px`, color, ...opts }).setDepth(8);
  }

  private buildText(): void {
    this.titleText = this.mkText(W / 2, 12, 18, C.hudBorder, { fontStyle: 'bold' }).setOrigin(0.5, 0);
    this.titleText.setText('STRONGBOW').setShadow(0, 2, '#000', 4);
    this.levelText = this.mkText(W / 2, 32, 10, C.inkDim).setOrigin(0.5, 0);
    this.timerText = this.mkText(W - PAD, 12, 10, C.ink).setOrigin(1, 0);

    for (let i = 0; i < 4; i++) {
      const y = SLOT_TOP + i * SLOT_H;
      this.slotIcon.push(this.scene.add.image(PAD + 15, y + 16, 'icon-sword').setDepth(9).setScale(1.3));
      this.slotName.push(this.mkText(PAD + 28, y + 7, 11, C.ink, { fontStyle: 'bold' }));
      this.slotStat.push(this.mkText(PAD + 12, y + 50, 9, C.inkDim));
    }

    this.genText = this.mkText(PAD, 50 + 70 * 4 + 4, 12, C.ink, { fontStyle: 'bold' });
    this.bossText = this.mkText(PAD, 50 + 70 * 4 + 20, 11, C.hpLow, { fontStyle: 'bold' });

    this.ctrlTitle = this.mkText(PAD + 6, CTRL_TOP + 4, 9, C.hudBorder, { fontStyle: 'bold' });
    this.ctrlTitle.setText('CONTROLS');
    this.ctrlText = this.mkText(PAD + 6, CTRL_TOP + 17, 9.5, C.inkDim, { lineSpacing: 2 });

    this.questText = this.mkText(PAD, CTRL_TOP + 118, 9.5, '#cdb88a', { wordWrap: { width: W - PAD * 2 }, lineSpacing: 1, fontStyle: 'italic' });
  }

  update(data: HudRegistryData): void {
    const g = this.dyn;
    g.clear();
    this.levelText.setText((data.levelName || '').toUpperCase());
    const secs = Math.floor(data.elapsedMs / 1000);
    this.timerText.setText(`${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`);

    for (let i = 0; i < 4; i++) {
      const slot = data.slots[i];
      const y = SLOT_TOP + i * SLOT_H;
      if (!slot) {
        this.slotIcon[i].setVisible(false);
        this.slotName[i].setText('');
        this.slotStat[i].setText('');
        continue;
      }
      this.renderSlot(g, slot, y, i);
    }

    this.genText.setText(`GENERATORS ${data.generatorsTotal - data.generatorsLeft}/${data.generatorsTotal}`);
    for (let k = 0; k < data.generatorsTotal; k++) {
      const px = PAD + 124 + (k % 8) * 11;
      const py = 50 + 70 * 4 + 6;
      const destroyed = k < data.generatorsTotal - data.generatorsLeft;
      g.fillStyle(destroyed ? hexNum(C.hpFull) : hexNum(C.inkDim), destroyed ? 1 : 0.35);
      g.fillRect(px, py, 7, 7);
    }
    this.bossText.setText(data.bossAlive ? 'WARDEN ALIVE' : data.generatorsLeft <= 0 ? 'EXIT OPEN' : '');

    this.ctrlText.setText((data.controls || []).join('\n'));
    this.questText.setText(data.quest || '');
  }

  private renderSlot(g: Phaser.GameObjects.Graphics, slot: HudHeroSlot, y: number, i: number): void {
    const color = CLASS_HUD_COLORS[slot.classId] ?? 0xffffff;
    const x0 = PAD + 4;
    const wInner = W - PAD * 2 - 8;

    g.fillStyle(color, slot.alive ? 1 : 0.3);
    g.fillRect(PAD, y, 4, SLOT_H - 6);

    const icons: Record<string, string> = { vanguard: 'icon-sword', thief: 'icon-bow', arcanist: 'icon-staff', warden: 'icon-mace', necromancer: 'icon-staff', bard: 'icon-sword', druid: 'icon-staff' };
    this.slotIcon[i].setVisible(true).setAlpha(slot.alive ? 1 : 0.4).setTexture(slot.summon ? 'icon-amulet' : icons[slot.classId] ?? 'icon-sword');

    const tag = slot.playerNum > 0 ? `P${slot.playerNum}` : slot.summon ? 'PET' : 'ALLY';
    const growth = slot.skillPoints + slot.attrPoints;
    this.slotName[i]
      .setText(`${tag} - ${slot.name} L${slot.level}${growth > 0 ? `  +${growth}` : ''}`)
      .setColor(!slot.alive ? '#6a7088' : slot.playerNum > 0 ? '#dfe6ff' : '#7fb0ff');

    const barX = x0 + 8;
    const barW = wInner - 8;
    const hpY = y + 22;
    g.fillStyle(0x000000, 0.5);
    g.fillRect(barX, hpY, barW, 7);
    const hp = Phaser.Math.Clamp(slot.health / slot.maxHealth, 0, 1);
    g.fillStyle(hp > 0.5 ? hexNum(C.hpFull) : hp > 0.25 ? hexNum(C.hpMid) : hexNum(C.hpLow), 1);
    g.fillRect(barX, hpY, barW * hp, 7);
    g.lineStyle(1, hexNum(C.hudBorderDk), 0.8);
    g.strokeRect(barX, hpY, barW, 7);
    const mpY = y + 31;
    g.fillStyle(0x000000, 0.5);
    g.fillRect(barX, mpY, barW, 4);
    const mp = slot.maxMana > 0 ? Phaser.Math.Clamp(slot.mana / slot.maxMana, 0, 1) : 0;
    g.fillStyle(hexNum(C.manaFill), 1);
    g.fillRect(barX, mpY, barW * mp, 4);
    const xpY = y + 37;
    const xp = slot.xpToNext > 0 ? Phaser.Math.Clamp(slot.xp / slot.xpToNext, 0, 1) : 0;
    g.fillStyle(hexNum(C.xpFill), 0.9);
    g.fillRect(barX, xpY, barW * xp, 2);

    this.slotStat[i]
      .setText(`HP ${Math.max(0, Math.ceil(slot.health))}/${slot.maxHealth}  G:${slot.gold}  *${slot.score}  K:${slot.keys}`)
      .setColor(slot.alive ? '#8a93bd' : '#5a6080');
  }
}
