import type { HeroClassId } from '../core/types';

export interface HeroDossier {
  id: HeroClassId;
  title: string;
  origin: string;
  tactics: string;
  quote: string;
}

export const HERO_LORE: Record<HeroClassId, HeroDossier> = {
  vanguard: {
    id: 'vanguard',
    title: 'The Vanguard',
    origin:
      'Last shield of a fallen border-keep, the Vanguard marched into the crypt when the dead began to climb. Plate dented, faith intact — they hold the line so others may strike.',
    tactics:
      'Wade into the thickest crowd and let blows ring off your armor. Spend Vitality to become an unkillable anchor; Cleave to clear packs around generators.',
    quote: '"Behind me. All of you."',
  },
  strider: {
    id: 'strider',
    title: 'The Strider',
    origin:
      'A poacher turned grave-runner, the Strider knows every collapsed passage and hidden cache. Fast feet, faster blade, and an eye that never misses a glint of gold.',
    tactics:
      'Dart in, strike, and slip away before the swarm closes. Stack Eagle Eye and Might for brutal critical hits; outrun lava rather than tank it.',
    quote: '"Catch me if you can."',
  },
  arcanist: {
    id: 'arcanist',
    title: 'The Arcanist',
    origin:
      'Exiled for reading the wrong books, the Arcanist came to the crypt seeking the words that raised it — and the power to unsay them. Frail of body, vast of will.',
    tactics:
      'Keep allies between you and the horde, then delete clusters with magic. Pour points into Focus and Mana Font so the spells never stop coming.',
    quote: '"Knowledge is a blade, too."',
  },
  warden: {
    id: 'warden',
    title: 'The Warden',
    origin:
      'Sworn keeper of the old light, the Warden tends the shrines the dead would defile. Where they walk, wounds close and courage returns.',
    tactics:
      'Anchor the party, light every shrine, and let steady regeneration win long fights. Balanced Vitality and Focus keep both your health and blessings flowing.',
    quote: '"The light does not abandon us."',
  },
};
