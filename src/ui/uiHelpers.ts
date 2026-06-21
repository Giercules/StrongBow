import Phaser from 'phaser';
import { PLAY_AREA_WIDTH, GAME_HEIGHT, PLAY_AREA_UI_DEPTH } from '../core/constants';
import { C } from '../rendering/Palette';

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

  const backdrop = scene.add.rectangle(cx, cy, PLAY_AREA_WIDTH, GAME_HEIGHT, 0x05060a, 0.6).setInteractive();
  addPinned(container, backdrop);

  const g = scene.add.graphics();
  const x0 = cx - w / 2;
  const y0 = cy - h / 2;
  g.fillStyle(hx(C.hudBg), 0.98);
  g.fillRoundedRect(x0, y0, w, h, 8);
  g.fillStyle(hx(C.hudPanel), 1);
  g.fillRoundedRect(x0 + 4, y0 + 4, w - 8, h - 8, 6);
  g.lineStyle(2, hx(C.hudBorder), 1);
  g.strokeRoundedRect(x0 + 4, y0 + 4, w - 8, h - 8, 6);
  g.lineStyle(1, hx(C.hudBorderDk), 1);
  g.strokeRoundedRect(x0 + 8, y0 + 8, w - 16, h - 16, 4);
  g.fillStyle(hx(C.hudBorderDk), 1);
  g.fillRoundedRect(x0 + 16, y0 - 2, w - 32, 28, 6);
  g.fillStyle(hx(C.hudBorder), 1);
  g.fillRoundedRect(x0 + 18, y0, w - 36, 24, 6);
  addPinned(container, g);

  const titleText = scene.add
    .text(cx, y0 + 12, title, { fontFamily: 'MedievalSharp, "Trebuchet MS", cursive', fontSize: '15px', color: '#1a1206', fontStyle: 'bold' })
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
    g.lineStyle(1.5, hx(hover ? C.hudBorder : C.hudBorderDk), 1);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, 5);
  };
  draw(false);
  cont.add(g);
  const t = scene.add
    .text(0, 0, label, { fontFamily: 'MedievalSharp, "Trebuchet MS", cursive', fontSize: `${opts.size ?? 13}px`, color: opts.text ?? C.ink, fontStyle: 'bold' })
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
  return cont;
}
