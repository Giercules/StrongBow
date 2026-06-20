import Phaser from 'phaser';

// Registers all animations. Phaser's AnimationManager is global to the game,
// so registering once in BootScene makes these available to every scene.

const HERO_CLASSES = ['vanguard', 'strider', 'arcanist', 'warden'];

function add(
  scene: Phaser.Scene,
  key: string,
  sheet: string,
  frames: number[],
  frameRate: number,
  repeat: number
): void {
  if (scene.anims.exists(key)) return;
  scene.anims.create({
    key,
    frames: scene.anims.generateFrameNumbers(sheet, { frames }),
    frameRate,
    repeat,
  });
}

export class AnimationRegistry {
  static register(scene: Phaser.Scene): void {
    // ---- heroes: facing frame bases down=0, up=4, side=8 ----
    for (const cls of HERO_CLASSES) {
      const sheet = `hero-${cls}-sheet`;
      const dirs: [string, number][] = [
        ['down', 0],
        ['up', 4],
        ['side', 8],
      ];
      for (const [dir, b] of dirs) {
        add(scene, `${cls}-idle-${dir}`, sheet, [b], 2, -1);
        add(scene, `${cls}-walk-${dir}`, sheet, [b + 1, b, b + 2, b], 9, -1);
        add(scene, `${cls}-attack-${dir}`, sheet, [b + 3], 1, 0);
      }
    }

    // ---- monsters ----
    add(scene, 'grunt-walk', 'monster-grunt-sheet', [0, 1, 2, 1], 7, -1);
    add(scene, 'grunt-attack', 'monster-grunt-sheet', [3], 1, 0);
    add(scene, 'ghost-walk', 'monster-ghost-sheet', [0, 1, 2, 3], 6, -1);
    add(scene, 'ghost-attack', 'monster-ghost-sheet', [2, 3], 6, 0);
    add(scene, 'demon-walk', 'monster-demon-sheet', [0, 1, 2, 1], 8, -1);
    add(scene, 'demon-attack', 'monster-demon-sheet', [3], 1, 0);
    add(scene, 'grave_warden-walk', 'monster-boss-sheet', [0, 1, 2, 1], 5, -1);
    add(scene, 'grave_warden-attack', 'monster-boss-sheet', [3], 1, 0);

    // ---- animated tiles ----
    add(scene, 'water', 'water-sheet', [0, 1, 2, 3], 4, -1);
    add(scene, 'lava', 'lava-sheet', [0, 1, 2, 3], 6, -1);
    add(scene, 'portal', 'portal-sheet', [0, 1, 2, 3, 4, 5], 10, -1);
    add(scene, 'torch', 'torch-sheet', [0, 1, 2, 3], 8, -1);
    add(scene, 'generator', 'generator-sheet', [0, 1, 2, 3], 6, -1);
    add(scene, 'coin', 'coin-sheet', [0, 1, 2, 3], 9, -1);

    // ---- one-shot FX ----
    add(scene, 'fx-magic', 'fx-magic', [0, 1, 2, 3, 4], 18, 0);
    add(scene, 'fx-slash', 'fx-slash', [0, 1, 2], 22, 0);
    add(scene, 'fx-fire', 'fx-fire', [0, 1, 2, 3], 14, 0);
    add(scene, 'fx-levelup', 'fx-levelup', [0, 1, 2, 3, 4], 16, 0);
  }
}
