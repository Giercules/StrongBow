import { buildDungeon } from './levelGen';

// Chapter I — The Sunken Crypt. Where the descent begins.
export const LEVEL1 = buildDungeon({
  id: 'sunken_crypt',
  name: 'The Sunken Crypt',
  seed: 0x5713b0,
  width: 168,
  height: 118,
  cols: 7,
  rows: 6,
  theme: 'crypt',
  ambientColor: 0x0a0c16,
  generatorEnemies: ['grunt', 'grunt', 'ghost', 'grunt', 'demon', 'ghost', 'bone_archer', 'demon'],
  bossId: 'grave_warden',
  hazard: 'both',
  maxGenerators: 9,
  startWeapon: 'crypt_knife',
  chapter: 'Chapter I',
  subtitle: 'The dead do not rest easy here.',
  story:
    'The seals beneath the world have broken. Descend into the Sunken Crypt, shatter the spawning altars, and put the Grave Warden back in the ground.',
});
