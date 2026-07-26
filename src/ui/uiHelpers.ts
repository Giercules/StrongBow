import Phaser from 'phaser';
import { PLAY_AREA_WIDTH, GAME_HEIGHT, PLAY_AREA_UI_DEPTH } from '../core/constants';
import { C } from '../rendering/Palette';
import { navCollector } from './MenuNav';

// Phaser container children do NOT inherit scrollFactor(0) from the parent, so
// every overlay child living in a scrolling scene must be pinned individually.

export function pinToCamera<T extends Phaser.GameObjects.GameObject>(obj: T): T {
  const anyObj = obj as unknown as { setScrollFactor?: (x: number, y?: number) => void };
  anyObj.setScrollFactor?.(0);
  return obj;
}

export function addPinned<T extends Phaser.GameObjects.GameObject>(container: Phaser.GameObjects.Container, child: T): T {
  pinToCamera(child);
  container.add(child);
  return child;
}

const hx = (s: string): number => parseInt(s.replace('#', ''), 16);

export const UI_SERIF = 'MedievalSharp, "Trebuchet MS", cursive';

/** Ellipsize `str` so it fits `maxW` pixels at the given font size. */
export function truncateToWidth(
  scene: Phaser.Scene,
  str: string,
  maxW: number,
  size: number,
  bold = false
): string {
  const style = { fontFamily: UI_SERIF, fontSize: `${size}px`, fontStyle: bold ? 'bold' : 'normal' };
  const probe = scene.add.text(-9999, -9999, str, style);
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

export interface Modal {
  container: Phaser.GameObjects.Container;
  cx: number;
  cy: number;
  add<T extends Phaser.GameObjects.GameObject>(child: T): T;
  destroy(): void;
}

export function framedPanel(scene: Phaser.Scene, w: number, h: number, title: string): Modal {
  const cx = PLAY_AREA_WIDTH / 2;
  const cy = GAME_HEIGHT / 2;
  const container = scene.add.container(0, 0).setDepth(PLAY_AREA_UI_DEPTH);

  const backdrop = scene.add.rectangle(cx, cy, PLAY_AREA_WIDTH, GAME_HEIGHT, 0x03050c, 0.72).setInteractive();
  addPinned(container, backdrop);

  const g = scene.add.graphics();
  const x0 = cx - w / 2;
  const y0 = cy - h / 2;
  // Arcade modal: deep plate, hot gold double-rail, neon hairline, title plaque.
  g.fillStyle(hx(C.hudBg), 0.98);
  g.fillRoundedRect(x0, y0, w, h, 8);
  g.fillStyle(hx(C.hudPanel), 1);
  g.fillRoundedRect(x0 + 4, y0 + 4, w - 8, h - 8, 6);
  // soft top sheen
  g.fillStyle(0xffffff, 0.05);
  g.fillRoundedRect(x0 + 6, y0 + 6, w - 12, Math.min(48, h * 0.18), 4);
  g.lineStyle(3, hx(C.hudBorder), 1);
  g.strokeRoundedRect(x0 + 3, y0 + 3, w - 6, h - 6, 7);
  g.lineStyle(1, hx(C.hudBorderDk), 1);
  g.strokeRoundedRect(x0 + 8, y0 + 8, w - 16, h - 16, 4);
  g.lineStyle(1, hx(C.hudNeon), 0.5);
  g.strokeRoundedRect(x0 + 5, y0 + 5, w - 10, h - 10, 6);
  // corner brackets + neon pips
  g.fillStyle(hx(C.hudBorder), 1);
  for (const [px, py, sx, sy] of [
    [x0 + 4, y0 + 4, 1, 1], [x0 + w - 4, y0 + 4, -1, 1],
    [x0 + 4, y0 + h - 4, 1, -1], [x0 + w - 4, y0 + h - 4, -1, -1],
  ] as [number, number, number, number][]) {
    g.fillRect(px, py, 14 * sx, 3 * sy);
    g.fillRect(px, py, 3 * sx, 14 * sy);
  }
  g.fillStyle(hx(C.hudNeon), 1);
  for (const [px, py] of [
    [x0 + 6, y0 + 6], [x0 + w - 10, y0 + 6], [x0 + 6, y0 + h - 10], [x0 + w - 10, y0 + h - 10],
  ] as [number, number][]) g.fillRect(px, py, 4, 4);
  // title plaque
  g.fillStyle(hx(C.hudBorderDk), 1);
  g.fillRoundedRect(x0 + 16, y0 - 2, w - 32, 28, 6);
  g.fillStyle(hx(C.hudBorder), 1);
  g.fillRoundedRect(x0 + 18, y0, w - 36, 24, 6);
  g.fillStyle(hx(C.hudNeon), 0.42);
  g.fillRoundedRect(x0 + 22, y0 + 2, w - 44, 8, 3);
  addPinned(container, g);

  const titleText = scene.add
    .text(cx, y0 + 12, title, { fontFamily: 'MedievalSharp, Georgia, serif', fontSize: '15px', color: '#1a1206', fontStyle: 'bold' })
    .setOrigin(0.5);
  addPinned(container, titleText);

  return {
    container,
    cx,
    cy,
    add<T extends Phaser.GameObjects.GameObject>(child: T): T {
      return addPinned(container, child);
    },
    destroy(): void {
      container.destroy();
    },
  };
}

export const createPlayAreaOverlay = framedPanel;

export function makeButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  onClick: () => void,
  opts: { fill?: string; text?: string; size?: number } = {}
): Phaser.GameObjects.Container {
  const cont = scene.add.container(x, y);
  const fill = opts.fill ?? C.hudPanel2;
  const g = scene.add.graphics();
  const draw = (hover: boolean) => {
    g.clear();
    g.fillStyle(hx(fill), 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 5);
    // top sheen for cabinet button depth
    g.fillStyle(0xffffff, hover ? 0.1 : 0.05);
    g.fillRoundedRect(-w / 2 + 2, -h / 2 + 2, w - 4, Math.max(4, h * 0.35), 3);
    // hot gold rim on hover, dark rail at rest
    g.lineStyle(hover ? 2.5 : 1.5, hx(hover ? C.hudBorder : C.hudBorderDk), 1);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, 5);
    if (hover) {
      g.lineStyle(1, hx(C.hudNeon), 0.65);
      g.strokeRoundedRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4, 4);
      g.fillStyle(hx(C.hudNeon), 1);
      g.fillRect(-w / 2 + 3, -h / 2 + 3, 3, 3);
      g.fillRect(w / 2 - 6, -h / 2 + 3, 3, 3);
    }
  };
  draw(false);
  cont.add(g);
  const t = scene.add
    .text(0, 0, label, { fontFamily: 'MedievalSharp, Georgia, serif', fontSize: `${opts.size ?? 13}px`, color: opts.text ?? C.ink, fontStyle: 'bold' })
    .setOrigin(0.5);
  cont.add(t);
  const zone = scene.add.zone(0, 0, w, h).setInteractive({ useHandCursor: true });
  zone.on('pointerover', () => draw(true));
  zone.on('pointerout', () => draw(false));
  zone.on('pointerdown', onClick);
  cont.add(zone);
  pinToCamera(cont);
  pinToCamera(g);
  pinToCamera(t);
  pinToCamera(zone);
  // keyboard/gamepad menu navigation: any button built during a MenuNav
  // collection pass becomes a focus target automatically
  navCollector()?.register(x, y, w, h, onClick);
  return cont;
}
