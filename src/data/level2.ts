import { buildDungeon } from './levelGen';

// The Molten Deep -- a sprawling 132x96 magma cavern. Tougher foes, lava
// everywhere, and the Molten Colossus waiting at the heart.
export const LEVEL2 = buildDungeon({
  id: 'molten_deep',
  name: 'The Molten Deep',
  seed: 0x9c4d11,
  width: 132,
  height: 96,
  cols: 5,
  rows: 4,
  ambientColor: 0x180a08,
  generatorEnemies: ['imp', 'bone_archer', 'demon', 'imp', 'brute', 'bone_archer', 'demon', 'brute'],
  bossId: 'molten_colossus',
  hazard: 'lava',
  chestItems: ['iron_sword', 'oak_staff', 'crypt_plate'],
  maxGenerators: 7,
});
