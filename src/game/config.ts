import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../core/constants';
import { settings } from '../core/GameSettings';
import { BootScene } from '../scenes/BootScene';
import { MenuScene } from '../scenes/MenuScene';
import { CharacterSelectScene } from '../scenes/CharacterSelectScene';
import { ForgeScene } from '../scenes/ForgeScene';
import { LevelSelectScene } from '../scenes/LevelSelectScene';
import { DungeonScene } from '../scenes/DungeonScene';
import { HudScene } from '../scenes/HudScene';
import { LeftPanelScene } from '../scenes/LeftPanelScene';

export function createGameConfig(): Phaser.Types.Core.GameConfig {
  const enhanced = settings.get('enhancedGraphics');
  return {
  type: Phaser.AUTO,
  parent: 'app',
  input: { gamepad: true },
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#05060a',
  // Enhanced mode uses Phaser 4's smoothPixelArt: texels stay sharp but scaled/
  // rotated sprites get properly filtered edges instead of shimmering stairsteps.
  pixelArt: !enhanced,
  roundPixels: !enhanced,
  antialias: enhanced,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    powerPreference: 'high-performance',
    smoothPixelArt: enhanced,
    // real-time lighting budget: party + torches + transient magic pools
    maxLights: 24,
    selfShadow: enhanced,
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
