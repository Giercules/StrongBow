import Phaser from 'phaser';
import { createGameConfig } from './config';
import { applyViewportSize, GAME_WIDTH, GAME_HEIGHT } from '../core/constants';

// Match the canvas to the browser window before the game boots so every scene's
// create() lays out against the final size.
applyViewportSize(window.innerWidth, window.innerHeight);

// Single global game instance.
export const game = new Phaser.Game(createGameConfig());

// Expose for debugging in the browser console.
(window as unknown as { game: Phaser.Game }).game = game;

// Keep filling the window on resize (debounced to one update per frame). Scenes
// that care listen for the 'viewportresize' event on game.events.
let resizeRAF = 0;
window.addEventListener('resize', () => {
  cancelAnimationFrame(resizeRAF);
  resizeRAF = requestAnimationFrame(() => {
    applyViewportSize(window.innerWidth, window.innerHeight);
    game.scale.setGameSize(GAME_WIDTH, GAME_HEIGHT);
    game.events.emit('viewportresize');
  });
});
