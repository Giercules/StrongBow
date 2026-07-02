import Phaser from 'phaser';
import { PLAY_AREA_WIDTH, GAME_HEIGHT, PLAY_AREA_UI_DEPTH } from '../core/constants';
import { Content } from '../content/ContentRegistry';
import type { ItemDefinition } from '../core/types';
import { audio } from '../systems/AudioSystem';

// ----------------------------------------------------------------------------
// FishingUI — casting a line into the Hearthrun. Wait for the bite, then
// strike (SPACE / click) while the bobber crosses the catch zone. The closer
// to dead centre, the finer the fish. Luck widens the zone a whisker.
// ----------------------------------------------------------------------------

const TRACK_W = 260;
const PANEL_W = 320;
const PANEL_H = 118;

export class FishingUI {
  private scene: Phaser.Scene;
  private cont: Phaser.GameObjects.Container | null = null;
  private marker!: Phaser.GameObjects.Graphics;
  private phase: 'waiting' | 'striking' | 'done' = 'waiting';
  private markerX = 0;
  private dir = 1;
  private speed = 220; // px/s
  private zoneCenter = 0;
  private zoneHalf = 26;
  private biteAt = 0;
  private statusText!: Phaser.GameObjects.Text;
  private onDone?: (fish: ItemDefinition | null) => void;
  private keyHandler?: (e: KeyboardEvent) => void;
  private updateHandler?: (t: number, d: number) => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  isOpen(): boolean {
    return this.cont !== null;
  }

  open(luck: number, onDone: (fish: ItemDefinition | null) => void): void {
    if (this.cont) return;
    this.onDone = onDone;
    this.phase = 'waiting';
    this.zoneHalf = 24 + Math.min(10, Math.round(luck * 0.5));
    this.zoneCenter = Phaser.Math.Between(-TRACK_W / 2 + this.zoneHalf + 8, TRACK_W / 2 - this.zoneHalf - 8);
    this.markerX = -TRACK_W / 2;
    this.dir = 1;
    this.speed = Phaser.Math.Between(200, 260);
    this.biteAt = this.scene.time.now + Phaser.Math.Between(700, 2200);

    const cx = PLAY_AREA_WIDTH / 2;
    const cy = GAME_HEIGHT - 110;
    this.cont = this.scene.add.container(cx, cy).setDepth(PLAY_AREA_UI_DEPTH + 6).setScrollFactor(0);
    const g = this.scene.add.graphics().setScrollFactor(0);
    g.fillStyle(0x0d1322, 0.95);
    g.fillRoundedRect(-PANEL_W / 2, -PANEL_H / 2, PANEL_W, PANEL_H, 8);
    g.lineStyle(2, 0xcfa64e, 1);
    g.strokeRoundedRect(-PANEL_W / 2, -PANEL_H / 2, PANEL_W, PANEL_H, 8);
    this.cont.add(g);
    const title = this.scene.add
      .text(0, -PANEL_H / 2 + 12, 'FISHING THE HEARTHRUN', { fontFamily: 'MedievalSharp, "Trebuchet MS", cursive', fontSize: '13px', color: '#ffe9a8', fontStyle: 'bold' })
      .setOrigin(0.5)
      .setScrollFactor(0);
    this.cont.add(title);
    this.statusText = this.scene.add
      .text(0, -6, 'The line drifts... wait for the bite.', { fontFamily: 'MedievalSharp, "Trebuchet MS", cursive', fontSize: '11px', color: '#8a93bd' })
      .setOrigin(0.5)
      .setScrollFactor(0);
    this.cont.add(this.statusText);
    this.marker = this.scene.add.graphics().setScrollFactor(0);
    this.cont.add(this.marker);

    this.keyHandler = (e) => {
      if (e.key === 'Escape') this.finish(null, 'You reel the line back in.');
      else if (e.key === ' ' || e.key === 'Enter' || e.key === 'e' || e.key === 'E') this.strike();
    };
    this.scene.input.keyboard?.on('keydown', this.keyHandler);
    const zone = this.scene.add.zone(0, 0, PANEL_W, PANEL_H).setScrollFactor(0).setInteractive();
    zone.on('pointerdown', () => this.strike());
    this.cont.add(zone);

    this.updateHandler = (_t: number, delta: number) => this.tick(delta);
    this.scene.events.on('update', this.updateHandler);
    audio.sfx('ui_move');
  }

  private tick(delta: number): void {
    if (!this.cont) return;
    const now = this.scene.time.now;
    if (this.phase === 'waiting') {
      if (now >= this.biteAt) {
        this.phase = 'striking';
        this.statusText.setText('A BITE! Strike while the bobber rides the green!').setColor('#8affa0');
        audio.sfx('ui_select');
      }
      return;
    }
    if (this.phase !== 'striking') return;
    this.markerX += this.dir * this.speed * (delta / 1000);
    if (this.markerX > TRACK_W / 2) {
      this.markerX = TRACK_W / 2;
      this.dir = -1;
    } else if (this.markerX < -TRACK_W / 2) {
      this.markerX = -TRACK_W / 2;
      this.dir = 1;
    }
    const m = this.marker;
    m.clear();
    // track
    m.fillStyle(0x08223a, 1);
    m.fillRoundedRect(-TRACK_W / 2, 14, TRACK_W, 18, 4);
    // catch zone (green) with a golden bullseye at its heart
    m.fillStyle(0x2e7a3a, 1);
    m.fillRect(this.zoneCenter - this.zoneHalf, 14, this.zoneHalf * 2, 18);
    m.fillStyle(0xcfa64e, 1);
    m.fillRect(this.zoneCenter - 6, 14, 12, 18);
    // bobber
    m.fillStyle(0xffffff, 1);
    m.fillRect(this.markerX - 2, 10, 4, 26);
  }

  private strike(): void {
    if (this.phase !== 'striking') return;
    const d = Math.abs(this.markerX - this.zoneCenter);
    let id: string | null = null;
    const r = Math.random();
    if (d <= 6) id = r < 0.12 ? 'stormscale' : r < 0.62 ? 'glimmer_carp' : 'silver_trout';
    else if (d <= this.zoneHalf * 0.6) id = r < 0.08 ? 'glimmer_carp' : r < 0.62 ? 'silver_trout' : 'river_perch';
    else if (d <= this.zoneHalf) id = r < 0.18 ? 'old_boot' : 'river_perch';
    if (!id) {
      this.finish(null, 'It slips the hook and is gone.');
      return;
    }
    const fish = Content.item(id) ?? null;
    this.finish(fish, '');
  }

  private finish(fish: ItemDefinition | null, note: string): void {
    if (this.phase === 'done') return;
    this.phase = 'done';
    if (this.updateHandler) this.scene.events.off('update', this.updateHandler);
    this.updateHandler = undefined;
    if (this.keyHandler) this.scene.input.keyboard?.off('keydown', this.keyHandler);
    this.keyHandler = undefined;
    this.cont?.destroy();
    this.cont = null;
    if (note) audio.sfx('ui_move');
    this.onDone?.(fish);
    this.onDone = undefined;
  }

  close(): void {
    this.finish(null, '');
  }
}
