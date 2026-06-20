import Phaser from 'phaser';
import { TextureFactory } from '../rendering/TextureFactory';
import { AnimationRegistry } from '../rendering/AnimationRegistry';
import { ASSET_MANIFEST_KEY, ASSET_MANIFEST_PATH } from '../rendering/externalAssets';
import type { ExternalAsset } from '../rendering/externalAssets';

export class BootScene extends Phaser.Scene {
  private externalKeys = new Set<string>();
  private failedAssets = new Set<string>();

  constructor() {
    super('BootScene');
  }

  // Load public/assets/manifest.json, then queue every sprite it lists. Files
  // that load override the procedural art of the same key; anything missing or
  // broken is recorded so the procedural generator fills it back in.
  preload(): void {
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
      this.failedAssets.add(file.key);
    });
    this.load.json(ASSET_MANIFEST_KEY, ASSET_MANIFEST_PATH);
    this.load.on(`filecomplete-json-${ASSET_MANIFEST_KEY}`, () => {
      const data = this.cache.json.get(ASSET_MANIFEST_KEY) as { sprites?: ExternalAsset[] } | undefined;
      for (const a of data?.sprites ?? []) {
        if (!a?.key || !a?.path) continue;
        this.externalKeys.add(a.key);
        if (a.kind === 'spritesheet' && a.frameWidth && a.frameHeight) {
          this.load.spritesheet(a.key, a.path, { frameWidth: a.frameWidth, frameHeight: a.frameHeight });
        } else {
          this.load.image(a.key, a.path);
        }
      }
    });
  }

  create(): void {
    const provided = new Set<string>();
    for (const key of this.externalKeys) {
      if (!this.failedAssets.has(key) && this.textures.exists(key)) provided.add(key);
    }

    const count = TextureFactory.generateAll(this, provided);
    AnimationRegistry.register(this);
    // eslint-disable-next-line no-console
    console.log(`StrongBow: ${count} procedural texture sets · ${provided.size} external override(s) active`);
    this.scene.start('MenuScene');
  }
}
