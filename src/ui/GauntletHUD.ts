import Phaser from 'phaser';
import { C } from '../rendering/Palette';
import { CLASS_HUD_COLORS, HUD_PANEL_WIDTH } from '../core/constants';
import type { HudRegistryData, HudHeroSlot, HudPartyGroup } from '../core/types';

const W = HUD_PANEL_WIDTH;
const PAD = 10;
const INNER_W = W - PAD * 2;
const PARTY_TOP = 50;
// Leave room below generators for the controls box (keyboard list is tall).
const PARTY_MAX_H = 220;
const GEN_TOP = PARTY_TOP + PARTY_MAX_H + 8;
// Generator dots sit on their own row under the label so they never clip the frame.
const GEN_BOX = 7;
const GEN_GAP = 3;
const GEN_SECTION_H = 42;
const CTRL_TOP = GEN_TOP + GEN_SECTION_H;
const CTRL_TITLE_PAD = 17; // space for "CONTROLS" header before the first line
const CTRL_PAD_BOT = 8;
const CTRL_H_MIN = 100;
const QUEST_GAP = 5;
/** Hard floor for objective block (label + ~2 lines + beat). */
const QUEST_RESERVE = 78;
/** Inner bottom of the HUD panel content (above frame flourish). */
const PANEL_INNER_BOTTOM = 522;
const MAIN_H_BASE = 52;
const PET_H_BASE = 17;
const GROUP_GAP = 3;
const PET_INDENT = 10;

/** Display / body faces: titles keep the manuscript look; body stays sharp at small sizes. */
const FONT_TITLE = 'MedievalSharp, Georgia, serif';
const FONT_BODY = 'Georgia, "Trebuchet MS", serif';
const DPI = typeof window !== 'undefined' ? Math.min(2, Math.max(1, window.devicePixelRatio || 1)) : 2;

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
  /** Trailing "lag bar" state per bar id — see drawStatusBar. */
  private lag = new Map<string, { shown: number; at: number }>();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.buildChrome();
    this.buildText();
    this.dyn = scene.add.graphics().setDepth(5);
  }

  private buildChrome(): void {
    // Arcade cabinet side panel: deep navy, hot gold double-frame, neon corner pips.
    const g = this.scene.add.graphics().setDepth(0);
    g.fillStyle(hexNum(C.hudBg), 1);
    g.fillRect(0, 0, W, 540);
    // inner panel with slight vertical sheen
    g.fillStyle(hexNum(C.hudPanel), 1);
    g.fillRect(4, 4, W - 8, 532);
    g.fillStyle(0xffffff, 0.045);
    g.fillRect(4, 4, W - 8, 90);
    g.fillStyle(0xffffff, 0.02);
    g.fillRect(4, 90, W - 8, 40);
    // outer gold rail
    g.lineStyle(3, hexNum(C.hudBorder), 1);
    g.strokeRect(4, 4, W - 8, 532);
    // inner dark rail
    g.lineStyle(1, hexNum(C.hudBorderDk), 1);
    g.strokeRect(8, 8, W - 16, 524);
    // neon hairline
    g.lineStyle(1, hexNum(C.hudNeon), 0.45);
    g.strokeRect(6, 6, W - 12, 528);
    // corner brackets (arcade cabinet hardware)
    g.fillStyle(hexNum(C.hudBorder), 1);
    for (const [cx, cy, sx, sy] of [
      [5, 5, 1, 1],
      [W - 5, 5, -1, 1],
      [5, 535, 1, -1],
      [W - 5, 535, -1, -1],
    ] as [number, number, number, number][]) {
      g.fillRect(cx, cy, 18 * sx, 3 * sy);
      g.fillRect(cx, cy, 3 * sx, 18 * sy);
      g.fillStyle(hexNum(C.hudNeon), 1);
      g.fillRect(cx + (sx > 0 ? 0 : -5), cy + (sy > 0 ? 0 : -5), 5, 5);
      g.fillStyle(hexNum(C.ivyHi), 1);
      g.fillRect(cx + sx * 9, cy + sy * 9, 3, 3);
      g.fillStyle(hexNum(C.hudBorder), 1);
    }
    // title rule with gold caps + neon dots
    g.lineStyle(1, hexNum(C.hudBorderDk), 0.95);
    g.lineBetween(PAD + 10, 46, W - PAD - 10, 46);
    g.fillStyle(hexNum(C.hudBorder), 1);
    g.fillRect(PAD, 43, 8, 5);
    g.fillRect(W - PAD - 8, 43, 8, 5);
    g.fillStyle(hexNum(C.hudNeon), 0.85);
    g.fillRect(PAD + 2, 44, 4, 3);
    g.fillRect(W - PAD - 6, 44, 4, 3);
    // Controls box is drawn in update() so its height can grow with the binding list.
  }

  private mkText(
    x: number,
    y: number,
    size: number,
    color: string,
    opts: Partial<Phaser.Types.GameObjects.Text.TextStyle> & { title?: boolean } = {}
  ): Phaser.GameObjects.Text {
    const { title, ...style } = opts;
    // Integer px sizes + higher canvas resolution keep small HUD type crisp.
    const px = Math.max(9, Math.round(size));
    const t = this.scene.add
      .text(x, y, '', {
        fontFamily: title ? FONT_TITLE : FONT_BODY,
        fontSize: `${px}px`,
        color,
        ...style,
      })
      .setDepth(8)
      .setResolution(DPI);
    // Soft drop only on titles — body shadows read as fuzz at small sizes.
    if (title) t.setShadow(0, 1, '#000000', 2, false, true);
    return t;
  }

  private buildText(): void {
    this.titleText = this.mkText(W / 2, 12, 17, C.hudBorder, { title: true, fontStyle: 'bold' }).setOrigin(0.5, 0);
    this.titleText.setText('STRONGBOW');
    this.levelText = this.mkText(W / 2, 32, 10, '#a8b0c8').setOrigin(0.5, 0);
    this.timerText = this.mkText(W - PAD, 12, 11, '#e8ecf4').setOrigin(1, 0);

    this.genText = this.mkText(PAD, GEN_TOP, 11, '#e8ecf4', { fontStyle: 'bold' });
    this.bossText = this.mkText(PAD, GEN_TOP + 28, 10, C.hpLow, { fontStyle: 'bold' });

    this.ctrlTitle = this.mkText(PAD + 6, CTRL_TOP + 4, 10, C.hudBorder, { title: true, fontStyle: 'bold' });
    this.ctrlTitle.setText('CONTROLS');
    this.ctrlText = this.mkText(PAD + 6, CTRL_TOP + CTRL_TITLE_PAD, 10, '#c4cad8', { lineSpacing: 3 });

    this.questLabel = this.mkText(PAD, CTRL_TOP + CTRL_H_MIN + QUEST_GAP, 10, C.hudBorder, { title: true, fontStyle: 'bold' });
    this.questLabel.setText('OBJECTIVE');
    this.questText = this.mkText(PAD, CTRL_TOP + CTRL_H_MIN + QUEST_GAP + 12, 11, '#e0d0a8', {
      wordWrap: { width: INNER_W, useAdvancedWrap: true },
      lineSpacing: 2,
      fontStyle: 'italic',
    });
    this.questBeatText = this.mkText(PAD, CTRL_TOP + CTRL_H_MIN + QUEST_GAP + 12, 10, '#c9b0ff', {
      wordWrap: { width: INNER_W, useAdvancedWrap: true },
      lineSpacing: 2,
      fontStyle: 'italic',
    });
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

    const destroyedN = data.generatorsTotal - data.generatorsLeft;
    this.genText.setText(`GENERATORS  ${destroyedN}/${data.generatorsTotal}`);
    // Full-width grid under the label — compute columns so the last box stays inside the panel.
    const cell = GEN_BOX + GEN_GAP;
    const maxCols = Math.max(1, Math.floor((INNER_W + GEN_GAP) / cell));
    const total = Math.max(0, data.generatorsTotal);
    const cols = Math.min(maxCols, Math.max(1, total || 1));
    const genBoxY = GEN_TOP + 15;
    for (let k = 0; k < total; k++) {
      const col = k % cols;
      const row = Math.floor(k / cols);
      const px = PAD + col * cell;
      const py = genBoxY + row * cell;
      // Safety: never draw past the inner right edge
      if (px + GEN_BOX > W - PAD) continue;
      const destroyed = k < destroyedN;
      g.fillStyle(destroyed ? hexNum(C.hpFull) : 0x2a3048, destroyed ? 1 : 0.55);
      g.fillRect(px, py, GEN_BOX, GEN_BOX);
      if (destroyed) {
        g.fillStyle(0xffffff, 0.35);
        g.fillRect(px + 1, py + 1, GEN_BOX - 2, 2);
        g.lineStyle(1, 0xd0ffd8, 0.85);
        g.strokeRect(px, py, GEN_BOX, GEN_BOX);
      } else {
        g.lineStyle(1, hexNum(C.hudBorderDk), 0.5);
        g.strokeRect(px, py, GEN_BOX, GEN_BOX);
      }
    }
    const genRows = total > 0 ? Math.ceil(total / cols) : 1;
    this.bossText.setY(genBoxY + genRows * cell + 2);
    this.bossText.setText(data.bossAlive ? 'WARDEN ALIVE' : data.generatorsLeft <= 0 ? 'EXIT OPEN' : '');

    // Size the controls box to the binding list, always leaving room for OBJECTIVE.
    this.ctrlText.setFixedSize(0, 0);
    this.ctrlText.setText((data.controls || []).join('\n'));
    const ctrlTextH = Math.max(this.ctrlText.height || 0, 12);
    const ctrlHMax = Math.max(72, PANEL_INNER_BOTTOM - CTRL_TOP - QUEST_RESERVE);
    const ctrlH = Math.min(ctrlHMax, Math.max(CTRL_H_MIN, CTRL_TITLE_PAD + ctrlTextH + CTRL_PAD_BOT));
    // If the full list is taller than the box, crop the text area (still readable top lines).
    const ctrlTextMaxH = Math.max(24, ctrlH - CTRL_TITLE_PAD - CTRL_PAD_BOT);
    this.ctrlText.setFixedSize(INNER_W - 12, Math.min(ctrlTextH, ctrlTextMaxH));

    g.fillStyle(0x05060a, 0.72);
    g.fillRoundedRect(PAD, CTRL_TOP, W - PAD * 2, ctrlH, 4);
    g.lineStyle(1.5, hexNum(C.hudBorderDk), 0.85);
    g.strokeRoundedRect(PAD, CTRL_TOP, W - PAD * 2, ctrlH, 4);
    g.lineStyle(1, hexNum(C.hudNeon), 0.22);
    g.strokeRoundedRect(PAD + 1, CTRL_TOP + 1, W - PAD * 2 - 2, ctrlH - 2, 3);
    this.ctrlTitle.setY(CTRL_TOP + 4);
    this.ctrlText.setY(CTRL_TOP + CTRL_TITLE_PAD);

    // OBJECTIVE sits below controls and is hard-clamped to the panel floor.
    const questY = CTRL_TOP + ctrlH + QUEST_GAP;
    const questLabelH = 12;
    const questBodyY = questY + questLabelH;
    const questMaxH = Math.max(20, PANEL_INNER_BOTTOM - questBodyY);
    this.questLabel.setY(questY);
    this.questText.setY(questBodyY);
    // Measure natural wrap height, then crop if it would spill past the frame.
    this.questText.setFixedSize(0, 0);
    this.questText.setWordWrapWidth(INNER_W, true);
    this.questText.setText(data.quest || '');
    const naturalH = Math.max(this.questText.height || 12, 12);
    const bodyH = Math.min(naturalH, questMaxH);
    this.questText.setFixedSize(INNER_W, bodyH);

    if (data.questBeat) {
      const beatY = questBodyY + bodyH + 2;
      if (beatY + 12 <= PANEL_INNER_BOTTOM) {
        this.questBeatText.setFixedSize(0, 0);
        this.questBeatText.setWordWrapWidth(INNER_W, true);
        this.questBeatText.setText(`✻ ${data.questBeat}`).setVisible(true);
        this.questBeatText.setY(beatY);
        const beatMax = Math.max(12, PANEL_INNER_BOTTOM - beatY);
        const beatH = Math.min(this.questBeatText.height || 12, beatMax);
        this.questBeatText.setFixedSize(INNER_W, beatH);
      } else {
        this.questBeatText.setText('').setVisible(false);
      }
    } else {
      this.questBeatText.setText('').setVisible(false);
    }
  }

  private drawBubble(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, accent: number, alive: boolean): void {
    g.fillStyle(hexNum(C.hudPanel2), 1);
    g.fillRoundedRect(x, y, w, h - 2, 3);
    // top sheen
    g.fillStyle(0xffffff, alive ? 0.06 : 0.02);
    g.fillRoundedRect(x + 1, y + 1, w - 2, Math.max(4, Math.floor((h - 2) * 0.35)), 2);
    g.lineStyle(1, hexNum(C.hudBorderDk), 0.85);
    g.strokeRoundedRect(x, y, w, h - 2, 3);
    // class accent bar + soft neon edge
    g.fillStyle(accent, alive ? 1 : 0.28);
    g.fillRect(x, y, 3, h - 2);
    if (alive) {
      g.fillStyle(accent, 0.18);
      g.fillRect(x + 3, y, 2, h - 2);
    }
  }

  /** Arcade status bar: dark well, saturated fill, top highlight stripe. */
  /**
   * Arcade status bar with a "lag" ghost.
   *
   * The bar's real value snaps instantly, but a second pale bar trails behind it
   * and catches up over ~0.4s. That trailing sliver is the whole trick: it shows
   * you *how much* you just lost as a width rather than as a number, which the
   * eye can read mid-fight without looking away from the playfield. Fighting
   * games have used it forever and it costs one lerp.
   *
   * Pass a stable `id` (per hero, per bar) to enable it; omit for static bars.
   */
  private drawStatusBar(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
    ratio: number,
    fill: number,
    alpha = 1,
    id?: string
  ): void {
    const r = Phaser.Math.Clamp(ratio, 0, 1);

    // recessed track
    g.fillStyle(0x000000, 0.72);
    g.fillRect(x, y, w, h);
    g.fillStyle(0x000000, 0.35);
    g.fillRect(x, y, w, 1);

    // lag ghost — only ever drawn when the value DROPPED
    if (id) {
      const now = this.scene.time.now;
      const st = this.lag.get(id);
      if (!st) {
        this.lag.set(id, { shown: r, at: now });
      } else {
        if (r > st.shown) st.shown = r; // gains snap; only losses trail
        else if (st.shown > r) st.shown = Math.max(r, st.shown - (now - st.at) / 420);
        st.at = now;
        if (st.shown > r + 0.004 && h >= 3) {
          g.fillStyle(0xff8a8a, 0.75 * alpha);
          g.fillRect(x + w * r, y, w * (st.shown - r), h);
        }
      }
    }

    if (r > 0.01) {
      g.fillStyle(fill, alpha);
      g.fillRect(x, y, w * r, h);
      if (h >= 3) {
        // top gloss + bottom shade give the fill a tube-like roundness
        g.fillStyle(0xffffff, 0.34 * alpha);
        g.fillRect(x, y, w * r, 1);
        g.fillStyle(0x000000, 0.22 * alpha);
        g.fillRect(x, y + h - 1, w * r, 1);
        // hot pip at the leading edge so the bar has somewhere the eye lands
        if (r < 0.995) {
          g.fillStyle(0xffffff, 0.85 * alpha);
          g.fillRect(x + w * r - 1, y, 1, h);
        }
      }
    }
    g.lineStyle(1, hexNum(C.hudBorderDk), 0.75);
    g.strokeRect(x, y, w, h);
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

    const nameSize = Math.max(9, Math.round(11 * scale));
    const statSize = Math.max(8, Math.round(9 * scale));
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
    const hp = Phaser.Math.Clamp(slot.health / slot.maxHealth, 0, 1);
    const hpCol = hp > 0.5 ? hexNum(C.hpFull) : hp > 0.25 ? hexNum(C.hpMid) : hexNum(C.hpLow);
    const key = `${slot.playerNum}:${slot.name}`;
    this.drawStatusBar(g, barX, hpY, barW, barH, hp, hpCol, 1, `${key}:hp`);
    // Critical health: an outline that beats around the bar. Cheap, impossible
    // to miss peripherally, and it never covers the numbers.
    if (slot.alive && hp <= 0.25) {
      const beat = (Math.sin(this.scene.time.now * 0.011) + 1) / 2;
      g.lineStyle(1, hexNum(C.hpLow), 0.35 + beat * 0.6);
      g.strokeRect(barX - 2, hpY - 2, barW + 4, barH + 4);
    }

    const mpY = hpY + barH + 2;
    const mpH = Math.max(2, Math.round(3 * scale));
    const mp = slot.maxMana > 0 ? Phaser.Math.Clamp(slot.mana / slot.maxMana, 0, 1) : 0;
    this.drawStatusBar(g, barX, mpY, barW, mpH, mp, hexNum(C.manaFill), 1, `${key}:mp`);

    const xpY = mpY + mpH + 1;
    const xp = slot.xpToNext > 0 ? Phaser.Math.Clamp(slot.xp / slot.xpToNext, 0, 1) : 0;
    const xpH = Math.max(1, Math.round(2 * scale));
    this.drawStatusBar(g, barX, xpY, barW, xpH, xp, hexNum(C.xpFill), 0.95);

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

    const nameSize = Math.max(8, Math.round(9 * scale));
    row.name
      .setPosition(x + 20, y + Math.max(2, Math.round((h - nameSize) / 2) - 1))
      .setFontSize(nameSize)
      .setText(`PET - ${slot.name}`)
      .setColor(slot.alive ? '#c8b8f0' : '#6a7088');

    const barX = x + w - Math.round(54 * scale);
    const barW = Math.round(48 * scale);
    const barH = Math.max(3, Math.round(4 * scale));
    const barY = y + Math.round((h - barH) / 2);
    const hp = Phaser.Math.Clamp(slot.health / slot.maxHealth, 0, 1);
    this.drawStatusBar(g, barX, barY, barW, barH, hp, hp > 0.35 ? hexNum(C.hpFull) : hexNum(C.hpLow), 1, `pet:${slot.name}`);
  }
}