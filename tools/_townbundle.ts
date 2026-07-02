// Bundle entry for tools/render_town.cjs — town layout + all procedural art,
// with no Phaser/DOM dependencies so it renders headless in Node.
import { buildTown } from '../src/data/town';
import * as art from '../src/rendering/spriteArt';
import * as townArt from '../src/rendering/townArt';
import * as overworldArt from '../src/rendering/overworldArt';
import { C, THEME_ART } from '../src/rendering/Palette';
import { Tile } from '../src/core/constants';
export { buildTown, art, townArt, overworldArt, C, THEME_ART, Tile };
