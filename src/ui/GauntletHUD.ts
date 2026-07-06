import Phaser from 'phaser';
import { C } from '../rendering/Palette';
import { CLASS_HUD_COLORS, HUD_PANEL_WIDTH } from '../core/constants';
import type { HudRegistryData, HudHeroSlot, HudPartyGroup } from '../core/types';

const W = HUD_PANEL_WIDTH;
const PAD = 10;
const PARTY_TOP = 50;
const PARTY_MAX_H = 258;
const GEN_TOP = PARTY_TOP + PARTY_MAX_H + 10;
const GEN_BOX = 5;
const GEN_GAP = 8;
const CTRL_TOP = GEN_TOP + 34;
const CTRL_H = 96;
const MAIN_H_BASE = 52;
const PET_H_BASE = 17;
const GROUP_GAP = 3;
const PET_INDENT = 10;

const CLASS_ICONS: Record<string, string> = {
  vanguard: 'icon-sword',
  thief: 'icon-bow',
  arcanist: 'icon-staff',
  warden: 'icon-mace',
  necromancer: 'icon-staff',
  bard: 'icon-sword',
  druid: 'icon-staff',
};

function hexNum(s: string): number {
  return parseInt(s.replace('#', ''), 16);
}

interface MainRow {
  icon: Phaser.GameObjects.Image;
  name: Phaser.GameObjects.Text;
  stat: Phaser.GameObjects.Text;
}

interface PetRow {
  icon: Phaser.GameObjects.Image;
  name: Phaser.GameObjects.Text;
}

// Right-hand arcade panel: party + nested pets, generators, controls, quest footer.
export class GauntletHUD {
  private scene: Phaser.Scene;
  private dyn!: Phaser.GameObjects.Graphics;
  private titleText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private genText!: Phaser.GameObjects.Text;
  private bossText!: Phaser.GameObjects.Text;
  private questLabel!: Phaser.GameObjects.Text;
  private questText!: Phaser.GameObjects.Text;
  private questBeatText!: Phaser.GameObjects.Text;
  private ctrlTitle!: Phaser.GameObjects.Text;
  private ctrlText!: Phaser.GameObjects.Text;
  private mainRows: MainRow[] = [];
  private petRows: PetRow[] = [];

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
    g.fillStyle(0x05060a, 0.6);
    g.fillRoundedRect(PAD, CTRL_TOP, W - PAD * 2, CTRL_H, 4);
    g.lineStyle(1, hexNum(C.hudBorderDk), 0.7);
    g.strokeRoundedRect(PAD, CTRL_TOP, W - PAD * 2, CTRL_H, 4);
  }

  private mkText(x: number, y: number, size: number, color: string, opts: Partial<Phaser.Types.GameObjects.Text.TextStyle> = {}): Phaser.GameObjects.Text {
    return this.scene.add.text(x, y, '', { fontFamily: 'MedievalSharp, "Trebuchet MS", cursive', fontSize: `${size}px`, color, ...opts }).setDepth(8);
  }

  private buildText(): void {
    this.titleText = this.mkText(W / 2, 12, 18, C.hudBorder, { fontStyle: 'bold' }).setOrigin(0.5, 0);
    this.titleText.setText('STRONGBOW').setShadow(0, 2, '#000', 4);
    this.levelText = this.mkText(W / 2, 32, 10, C.inkDim).setOrigin(0.5, 0);
    this.timerText = this.mkText(W - PAD, 12, 10, C.ink).setOrigin(1, 0);

    this.genText = this.mkText(PAD, GEN_TOP, 11, C.ink, { fontStyle: 'bold' });
    this.bossText = this.mkText(PAD, GEN_TOP + 14, 10, C.hpLow, { fontStyle: 'bold' });

    this.ctrlTitle = this.mkText(PAD + 6, CTRL_TOP + 4, 9, C.hudBorder, { fontStyle: 'bold' });
    this.ctrlTitle.setText('CONTROLS');
    this.ctrlText = this.mkText(PAD + 6, CTRL_TOP + 17, 9.5, C.inkDim, { lineSpacing: 2 });

    this.questLabel = this.mkText(PAD, CTRL_TOP + CTRL_H + 4, 8.5, C.hudBorder, { fontStyle: 'bold' });
    this.questLabel.setText('OBJECTIVE');
    this.questText = this.mkText(PAD, CTRL_TOP + CTRL_H + 16, 9.5, '#cdb88a', { wordWrap: { width: W - PAD * 2 }, lineSpacing: 1, fontStyle: 'italic' });
    this.questBeatText = this.mkText(PAD, CTRL_TOP + CTRL_H + 16, 9, '#b79bff', { wordWrap: { width: W - PAD * 2 }, lineSpacing: 1, fontStyle: 'italic' });
  }

  private ensureMainRow(i: number): MainRow {
    while (this.mainRows.length <= i) {
      const icon = this.scene.add.image(0, 0, 'icon-sword').setDepth(9);
      const name = this.mkText(0, 0, 11, C.ink, { fontStyle: 'bold' });
      const stat = this.mkText(0, 0, 9, C.inkDim);
      this.mainRows.push({ icon, name, stat });
    }
    return this.mainRows[i];
  }

  private ensurePetRow(i: number): PetRow {
    while (this.petRows.length <= i) {
      const icon = this.scene.add.image(0, 0, 'icon-amulet').setDepth(9);
      const name = this.mkText(0, 0, 8, C.inkDim);
      this.petRows.push({ icon, name });
    }
    return this.petRows[i];
  }

  private layoutScale(groups: HudPartyGroup[]): number {
    let units = 0;
    for (const g of groups) {
      units += MAIN_H_BASE + g.pets.length * PET_H_BASE + GROUP_GAP;
    }
    if (units <= 0) return 1;
    return Phaser.Math.Clamp(PARTY_MAX_H / units, 0.52, 1);
  }

  update(data: HudRegistryData): void {
    const g = this.dyn;
    g.clear();
    this.levelText.setText((data.levelName || '').toUpperCase());
    const secs = Math.floor(data.elapsedMs / 1000);
    this.timerText.setText(`${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`);

    const groups = data.groups ?? [];
    const scale = this.layoutScale(groups);
    const mainH = Math.round(MAIN_H_BASE * scale);
    const petH = Math.round(PET_H_BASE * scale);
    const gap = Math.max(2, Math.round(GROUP_GAP * scale));
    const panelW = W - PAD * 2;

    let y = PARTY_TOP;
    let mainIdx = 0;
    let petIdx = 0;

    for (const group of groups) {
      const row = this.ensureMainRow(mainIdx++);
      this.renderMain(g, row, group.member, PAD, y, panelW, mainH, scale);
      y += mainH;

      for (const pet of group.pets) {
        const prow = this.ensurePetRow(petIdx++);
        this.renderPet(g, prow, pet, PAD + PET_INDENT, y, panelW - PET_INDENT, petH, scale);
        y += petH;
      }
      y += gap;
    }

    for (let i = mainIdx; i < this.mainRows.length; i++) {
      const row = this.mainRows[i];
      row.icon.setVisible(false);
      row.name.setText('');
      row.stat.setText('');
    }
    for (let i = petIdx; i < this.petRows.length; i++) {
      const row = this.petRows[i];
      row.icon.setVisible(false);
      row.name.setText('');
    }

    this.genText.setText(`GENERATORS ${data.generatorsTotal - data.generatorsLeft}/${data.generatorsTotal}`);
    const genBoxY = GEN_TOP + 11;
    const genBoxX0 = PAD + 108;
    for (let k = 0; k < data.generatorsTotal; k++) {
      const col = k % 8;
      const row = Math.floor(k / 8);
      const px = genBoxX0 + col * (GEN_BOX + GEN_GAP);
      const py = genBoxY + row * (GEN_BOX + GEN_GAP);
      const destroyed = k < data.generatorsTotal - data.generatorsLeft;
      g.fillStyle(destroyed ? hexNum(C.hpFull) : hexNum(C.inkDim), destroyed ? 1 : 0.35);
      g.fillRect(px, py, GEN_BOX, GEN_BOX);
    }
    this.bossText.setText(data.bossAlive ? 'WARDEN ALIVE' : data.generatorsLeft <= 0 ? 'EXIT OPEN' : '');

    this.ctrlText.setText((data.controls || []).join('\n'));
    this.questText.setText(data.quest || '');
    if (data.questBeat) {
      this.questBeatText.setText(`✻ ${data.questBeat}`).setVisible(true);
      const beatY = CTRL_TOP + CTRL_H + 16 + this.questText.height + 4;
      this.questBeatText.setY(beatY);
    } else {
      this.questBeatText.setText('').setVisible(false);
    }
  }

  private drawBubble(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, accent: number, alive: boolean): void {
    g.fillStyle(hexNum(C.hudPanel2), 1);
    g.fillRoundedRect(x, y, w, h - 2, 3);
    g.lineStyle(1, hexNum(C.hudBorderDk), 0.7);
    g.strokeRoundedRect(x, y, w, h - 2, 3);
    g.fillStyle(accent, alive ? 1 : 0.3);
    g.fillRect(x, y, 3, h - 2);
  }

  private renderMain(
    g: Phaser.GameObjects.Graphics,
    row: MainRow,
    slot: HudHeroSlot,
    x: number,
    y: number,
    w: number,
    h: number,
    scale: number
  ): void {
    const color = CLASS_HUD_COLORS[slot.classId] ?? 0xffffff;
    this.drawBubble(g, x, y, w, h, color, slot.alive);

    const iconKey = slot.summon ? 'icon-amulet' : CLASS_ICONS[slot.classId] ?? 'icon-sword';
    const iconScale = 1.15 * scale;
    row.icon
      .setVisible(true)
      .setPosition(x + 12, y + Math.round(h * 0.38))
      .setAlpha(slot.alive ? 1 : 0.4)
      .setTexture(iconKey)
      .setScale(iconScale);

    const nameSize = Math.max(8, Math.round(11 * scale));
    const statSize = Math.max(7, Math.round(9 * scale));
    const tag = slot.playerNum > 0 ? `P${slot.playerNum}` : 'ALLY';
    const growth = slot.skillPoints + slot.attrPoints;
    row.name
      .setPosition(x + 26, y + Math.max(3, Math.round(5 * scale)))
      .setFontSize(nameSize)
      .setText(`${tag} - ${slot.name} L${slot.level}${growth > 0 ? `  +${growth}` : ''}`)
      .setColor(!slot.alive ? '#6a7088' : slot.playerNum > 0 ? '#dfe6ff' : '#7fb0ff');

    const barX = x + 10;
    const barW = w - 14;
    const hpY = y + Math.round(h * 0.42);
    const barH = Math.max(4, Math.round(6 * scale));
    g.fillStyle(0x000000, 0.5);
    g.fillRect(barX, hpY, barW, barH);
    const hp = Phaser.Math.Clamp(slot.health / slot.maxHealth, 0, 1);
    g.fillStyle(hp > 0.5 ? hexNum(C.hpFull) : hp > 0.25 ? hexNum(C.hpMid) : hexNum(C.hpLow), 1);
    g.fillRect(barX, hpY, barW * hp, barH);
    g.lineStyle(1, hexNum(C.hudBorderDk), 0.8);
    g.strokeRect(barX, hpY, barW, barH);

    const mpY = hpY + barH + 2;
    const mpH = Math.max(2, Math.round(3 * scale));
    g.fillStyle(0x000000, 0.5);
    g.fillRect(barX, mpY, barW, mpH);
    const mp = slot.maxMana > 0 ? Phaser.Math.Clamp(slot.mana / slot.maxMana, 0, 1) : 0;
    g.fillStyle(hexNum(C.manaFill), 1);
    g.fillRect(barX, mpY, barW * mp, mpH);

    const xpY = mpY + mpH + 1;
    const xp = slot.xpToNext > 0 ? Phaser.Math.Clamp(slot.xp / slot.xpToNext, 0, 1) : 0;
    g.fillStyle(hexNum(C.xpFill), 0.9);
    g.fillRect(barX, xpY, barW * xp, Math.max(1, Math.round(2 * scale)));

    row.stat
      .setPosition(x + 10, y + h - Math.max(10, Math.round(12 * scale)))
      .setFontSize(statSize)
      .setText(`HP ${Math.max(0, Math.ceil(slot.health))}/${slot.maxHealth}  G:${slot.gold}  *${slot.score}`)
      .setColor(slot.alive ? '#8a93bd' : '#5a6080');
  }

  private renderPet(
    g: Phaser.GameObjects.Graphics,
    row: PetRow,
    slot: HudHeroSlot,
    x: number,
    y: number,
    w: number,
    h: number,
    scale: number
  ): void {
    const accent = 0x9a7fd4;
    this.drawBubble(g, x, y, w, h, accent, slot.alive);

    const iconScale = 0.75 * scale;
    row.icon
      .setVisible(true)
      .setPosition(x + 9, y + Math.round(h * 0.5))
      .setAlpha(slot.alive ? 0.95 : 0.35)
      .setTexture('icon-amulet')
      .setScale(iconScale);

    const nameSize = Math.max(7, Math.round(8 * scale));
    row.name
      .setPosition(x + 20, y + Math.max(2, Math.round((h - nameSize) / 2) - 1))
      .setFontSize(nameSize)
      .setText(`PET - ${slot.name}`)
      .setColor(slot.alive ? '#b8a8e8' : '#5a6080');

    const barX = x + w - Math.round(54 * scale);
    const barW = Math.round(48 * scale);
    const barH = Math.max(3, Math.round(4 * scale));
    const barY = y + Math.round((h - barH) / 2);
    g.fillStyle(0x000000, 0.45);
    g.fillRect(barX, barY, barW, barH);
    const hp = Phaser.Math.Clamp(slot.health / slot.maxHealth, 0, 1);
    g.fillStyle(hp > 0.35 ? hexNum(C.hpFull) : hexNum(C.hpLow), 1);
    g.fillRect(barX, barY, barW * hp, barH);
  }
}