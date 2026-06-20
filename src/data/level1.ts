import { buildDungeon } from './levelGen';

// The Sunken Crypt -- a vastly expanded 120x84 catacomb of 20 rooms.
export const LEVEL1 = buildDungeon({
  id: 'sunken_crypt',
  name: 'The Sunken Crypt',
  seed: 0x5713b0,
  width: 120,
  height: 84,
  cols: 5,
  rows: 4,
  ambientColor: 0x0a0c16,
  generatorEnemies: ['grunt', 'grunt', 'ghost', 'grunt', 'demon', 'ghost', 'bone_archer', 'demon'],
  bossId: 'grave_warden',
  hazard: 'both',
  chestItems: ['leather_jerkin', 'hunters_bow', 'ember_blade'],
  maxGenerators: 6,
  startWeapon: 'crypt_knife',
});
