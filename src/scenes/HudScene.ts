import Phaser from 'phaser';
import { PLAY_AREA_WIDTH, HUD_PANEL_WIDTH, GAME_HEIGHT, HUD_REGISTRY_KEY } from '../core/constants';
import { GauntletHUD } from '../ui/GauntletHUD';
import type { HudRegistryData } from '../core/types';

// Parallel scene rendering the right-hand HUD panel in its own viewport.
export class HudScene extends Phaser.Scene {
  private hud!: GauntletHUD;

  constructor() {
    super('HudScene');
  }

  create(): void {
    this.cameras.main.setViewport(PLAY_AREA_WIDTH, 0, HUD_PANEL_WIDTH, GAME_HEIGHT);
    this.cameras.main.setScroll(0, 0);
    this.hud = new GauntletHUD(this);
  }

  update(): void {
    const data = this.registry.get(HUD_REGISTRY_KEY) as HudRegistryData | undefined;
    if (data) this.hud.update(data);
  }
}
