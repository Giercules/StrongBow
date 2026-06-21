import type { StatMods } from '../core/types';

// Three shared hero attributes, raised with attribute points earned on level-up.
export interface AttributeDef {
  id: string;
  name: string;
  description: string;
  maxRank: number;
  icon: string;
  perRank: StatMods;
}

export const ATTRIBUTES: Record<string, AttributeDef> = {
  might: {
    id: 'might',
    name: 'Might',
    description: '+2 damage per rank.',
    maxRank: 10,
    icon: 'icon-sword',
    perRank: { damage: 2 },
  },
  vitality: {
    id: 'vitality',
    name: 'Vitality',
    description: '+10 max health, +1 armor per rank.',
    maxRank: 10,
    icon: 'icon-armor',
    perRank: { maxHealth: 10, armor: 1 },
  },
  focus: {
    id: 'focus',
    name: 'Focus',
    description: '+10 max mana, +1% crit per rank.',
    maxRank: 10,
    icon: 'icon-amulet',
    perRank: { maxMana: 10, critChance: 0.01 },
  },
  fortune: {
    id: 'fortune',
    name: 'Fortune',
    description: '+3 luck per rank — more drops & better grades.',
    maxRank: 10,
    icon: 'icon-ring',
    perRank: { luck: 3 },
  },
};

export const ATTRIBUTE_IDS: string[] = ['might', 'vitality', 'focus', 'fortune'];
