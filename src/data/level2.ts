import { buildDungeon } from './levelGen';

// Chapter II — The Molten Deep. The crypt drains into a magma cavern.
export const LEVEL2 = buildDungeon({
  id: 'molten_deep',
  name: 'The Molten Deep',
  seed: 0x9c4d11,
  width: 184,
  height: 134,
  cols: 6,
  rows: 5,
  theme: 'molten',
  ambientColor: 0x180a08,
  generatorEnemies: ['imp', 'bone_archer', 'demon', 'imp', 'brute', 'bone_archer', 'demon', 'brute'],
  bossId: 'molten_colossus',
  hazard: 'lava',
  maxGenerators: 10,
  chapter: 'Chapter II',
  subtitle: 'Fire wells up from the world’s wound.',
  story:
    'Below the crypt the rock runs molten. The dead here are forged in fire — burn through them and break the Molten Colossus at the cavern’s heart.',
});
