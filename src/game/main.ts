import Phaser from 'phaser';
import { gameConfig } from './config';

// Single global game instance.
export const game = new Phaser.Game(gameConfig);

// Expose for debugging in the browser console.
(window as unknown as { game: Phaser.Game }).game = game;
