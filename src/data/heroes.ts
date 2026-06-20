import type { HeroClassDef, HeroClassId } from '../core/types';

export const HEROES: Record<HeroClassId, HeroClassDef> = {
  vanguard: {
    id: 'vanguard',
    name: 'Vanguard',
    role: 'Tank',
    blurb: 'A wall of steel. Soaks blows and carves through the front line.',
    signature: 'Heavy armor — shrugs off damage.',
    base: { maxHealth: 120, maxMana: 40, damage: 14, speed: 130, armor: 4, critChance: 0.02, fire: 0, regen: 0 },
    skillIds: ['van_bulwark', 'van_cleave', 'van_rampart'],
  },
  strider: {
    id: 'strider',
    name: 'Strider',
    role: 'Ranger',
    blurb: 'Fleet and deadly. Strikes fast and slips danger.',
    signature: 'High crit chance and speed.',
    base: { maxHealth: 90, maxMana: 50, damage: 11, speed: 160, armor: 1, critChance: 0.08, fire: 0, regen: 0 },
    skillIds: ['str_eagle', 'str_swift', 'str_volley'],
  },
  arcanist: {
    id: 'arcanist',
    name: 'Arcanist',
    role: 'Mage',
    blurb: 'Frail but devastating. Bends fire and force to will.',
    signature: 'Deep mana pool and burning magic.',
    base: { maxHealth: 70, maxMana: 100, damage: 8, speed: 120, armor: 0, critChance: 0.03, fire: 6, regen: 0 },
    skillIds: ['arc_pyre', 'arc_font', 'arc_focus'],
  },
  warden: {
    id: 'warden',
    name: 'Warden',
    role: 'Support',
    blurb: 'Keeper of the light. Endures and sustains the party.',
    signature: 'Steady health regeneration.',
    base: { maxHealth: 100, maxMana: 80, damage: 10, speed: 125, armor: 2, critChance: 0.02, fire: 0, regen: 0.5 },
    skillIds: ['war_mend', 'war_aegis', 'war_grace'],
  },
};

export const ALL_CLASSES: HeroClassId[] = ['vanguard', 'strider', 'arcanist', 'warden'];

export const HERO_WEAPON_ICON: Record<HeroClassId, string> = {
  vanguard: 'icon-sword',
  strider: 'icon-bow',
  arcanist: 'icon-staff',
  warden: 'icon-mace',
};
