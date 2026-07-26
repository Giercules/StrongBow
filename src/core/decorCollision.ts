// ----------------------------------------------------------------------------
// Decor collision — which hand-placed props block movement.
//
// Walls / void / deep water already get physics bodies from the tilemap.
// Building facades (house-*, adobe-*, shop signs) sit on WALL tiles, so they
// don't need a second body. Floor paint (roads, grass, rugs) is walkable.
// Everything else free-standing is solid by default so new props stay honest.
// ----------------------------------------------------------------------------

/** Soft floor cover / pavement — walkable and never gets a physics body. */
export const PASSABLE_DECOR = new Set<string>([
  // pavement & bridges
  'road',
  'desert-road',
  'bridge-plank',
  'chain',
  // soft ground cover
  'grass-tuft',
  'wildflowers',
  'flower-bed',
  'crop-row',
  'blood-stain',
  'wood-floor',
  'forge-floor',
  'forge-embers',
  'guild-floor',
  'guild-ring',
  'apothecary-floor',
  'lodge-floor',
  'rug',
  'market-mat',
  'sand-dune',
  // water-surface paint (deep water itself is solid via tile)
  'lilypad',
  'duck',
  'reeds',
  'cattail',
  'papyrus',
  // dungeon floor glyphs / cracks
  'sanctum-glyph',
  'void-rift',
  'lava-crack',
  'rune-circle',
]);

/** Facade / roof pieces stamped on WALL tiles — already blocked by the wall body. */
export function isBuildingFacade(key: string): boolean {
  if (
    key.startsWith('house-') ||
    key.startsWith('adobe-') ||
    key.startsWith('shop-sign-') ||
    key.startsWith('temple-')
  ) {
    return true;
  }
  // Wall cladding sits on WALL tiles (already solid). Floors are passable.
  if (
    key === 'forge-wall' || key === 'apothecary-wall' || key === 'tavern-wall' ||
    key === 'guild-wall' || key === 'lodge-wall'
  ) return true;
  return key === 'chimney' || key === 'rampart' || key === 'adobe-dome' || key === 'adobe-roof' || key === 'adobe-eave';
}

/** True when this decor key should stop the player / AI on its tile. */
export function decorBlocks(key: string): boolean {
  if (PASSABLE_DECOR.has(key)) return false;
  if (isBuildingFacade(key)) return false;
  return true;
}
