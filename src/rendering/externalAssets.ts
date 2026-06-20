// ----------------------------------------------------------------------------
// External art pipeline
//
// StrongBow renders 100% procedural art by default. To override any of it with
// real image files (your own art, or CC0 packs from Kenney / OpenGameArt), list
// them in  public/assets/manifest.json  and drop the PNGs in public/assets/.
//
// How it works:
//   • BootScene loads manifest.json, then every sprite it lists.
//   • Whatever loads overrides the procedural texture of the same key.
//   • Anything missing / failing falls back to procedural — always safe.
//   • manifest.json is fetched at runtime, so adding art needs no rebuild.
//
// Special keys:  'ext-floor' / 'ext-wall' retile the dungeon background.
// Other keys override any texture key the game uses (e.g. 'chest', 'gem',
// 'hero-vanguard-sheet', 'monster-grunt-sheet', ...).
// See CREDITS.md for licensing + a drop-in guide.
// ----------------------------------------------------------------------------

export type ExternalKind = 'image' | 'spritesheet';

export interface ExternalAsset {
  /** Texture key to override. */
  key: string;
  /** Path under public/ (served at site root), e.g. 'assets/sprites/floor.png'. */
  path: string;
  kind: ExternalKind;
  /** Spritesheets only: frame size in px. */
  frameWidth?: number;
  frameHeight?: number;
  license?: string;
  credit?: string;
}

export interface AssetManifest {
  sprites: ExternalAsset[];
}

export const ASSET_MANIFEST_KEY = 'asset-manifest';
export const ASSET_MANIFEST_PATH = 'assets/manifest.json';
