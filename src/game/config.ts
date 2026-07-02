import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../core/constants';
import { BootScene } from '../scenes/BootScene';
import { MenuScene } from '../scenes/MenuScene';
import { CharacterSelectScene } from '../scenes/CharacterSelectScene';
import { ForgeScene } from '../scenes/ForgeScene';
import { LevelSelectScene } from '../scenes/LevelSelectScene';
import { DungeonScene } from '../scenes/DungeonScene';
import { HudScene } from '../scenes/HudScene';
import { LeftPanelScene } from '../scenes/LeftPanelScene';

export function createGameConfig(): Phaser.Types.Core.GameConfig {
  return {
  type: Phaser.AUTO,
  parent: 'app',
  input: { gamepad: true },
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#05060a',
  // Crisp nearest-neighbour pipeline everywhere: linear filtering muddied and
  // darkened the scaled pixel art game-wide (menus included). Enhanced FX is
  // scene-scoped (lights + bloom + vignette in the dungeon) and never touches
  // the global texture pipeline.
  pixelArt: true,
  roundPixels: true,
  antialias: false,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    powerPreference: 'high-performance',
    // real-time lighting budget: party + torches + transient magic pools
    maxLights: 24,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [BootScene, MenuScene, CharacterSelectScene, ForgeScene, LevelSelectScene, DungeonScene, HudScene, LeftPanelScene],
  };
}
