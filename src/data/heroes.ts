import type { HeroClassDef, HeroClassId } from '../core/types';

export const HEROES: Record<HeroClassId, HeroClassDef> = {
  vanguard: {
    id: 'vanguard',
    name: 'Vanguard',
    role: 'Tank',
    blurb: 'A wall of steel. Soaks blows and carves through the front line.',
    signature: 'Heavy armor — shrugs off damage.',
    base: { maxHealth: 120, maxMana: 40, damage: 14, speed: 130, armor: 4, critChance: 0.02, fire: 0, regen: 0, luck: 2 },
    skillIds: ['van_bulwark', 'van_cleave', 'van_rampart'],
  },
  thief: {
    id: 'thief',
    name: 'Thief',
    role: 'Rogue',
    blurb: 'A shadow with a blade. Strikes from the dark and is gone.',
    signature: 'Backstabs for huge damage; sneaks past foes; picks locks.',
    base: { maxHealth: 90, maxMana: 30, damage: 12, speed: 150, armor: 1, critChance: 0.10, fire: 0, regen: 0, luck: 7 },
    skillIds: ['str_eagle', 'str_swift', 'str_volley'],
  },
  arcanist: {
    id: 'arcanist',
    name: 'Arcanist',
    role: 'Mage',
    blurb: 'Frail but devastating. Bends fire and force to will.',
    signature: 'Deep mana pool and burning magic.',
    base: { maxHealth: 70, maxMana: 100, damage: 8, speed: 120, armor: 0, critChance: 0.03, fire: 6, regen: 0, luck: 4 },
    skillIds: ['arc_pyre', 'arc_font', 'arc_focus', 'arc_chain'],
  },
  warden: {
    id: 'warden',
    name: 'Warden',
    role: 'Support',
    blurb: 'Keeper of the light. Endures and sustains the party.',
    signature: 'Steady health regeneration.',
    base: { maxHealth: 100, maxMana: 80, damage: 10, speed: 125, armor: 2, critChance: 0.02, fire: 0, regen: 0.5, luck: 3 },
    skillIds: ['war_mend', 'war_aegis', 'war_grace'],
  },
  necromancer: {
    id: 'necromancer',
    name: 'Necromancer',
    role: 'Summoner',
    blurb: 'Master of the grave. Raises the dead to fight in their stead.',
    signature: 'Hold the ability to raise Tank, Archer, Mage or Thief skeletons — they fight, then crumble.',
    base: { maxHealth: 82, maxMana: 110, damage: 9, speed: 122, armor: 1, critChance: 0.03, fire: 0, regen: 0.3, luck: 4 },
    skillIds: ['nec_legion', 'nec_grimoire', 'nec_blight', 'nec_horde'],
  },
  bard: {
    id: 'bard',
    name: 'Bard',
    role: 'Skald',
    blurb: 'A blade with a ballad. Songs that steel the whole party.',
    signature: 'Hold the ability to choose a SONG — a persistent aura that empowers every nearby ally.',
    base: { maxHealth: 88, maxMana: 60, damage: 11, speed: 140, armor: 1, critChance: 0.05, fire: 0, regen: 0, luck: 5 },
    skillIds: ['brd_anthem', 'brd_reach', 'brd_tempo', 'brd_encore'],
  },
  druid: {
    id: 'druid',
    name: 'Druid',
    role: 'Shapeshifter',
    blurb: 'Keeper of the old wild. Casts as a sage, mauls as a bear.',
    signature: 'Tap the ability to SHAPESHIFT between nature caster and bear-form bruiser.',
    base: { maxHealth: 95, maxMana: 70, damage: 10, speed: 128, armor: 2, critChance: 0.03, fire: 0, regen: 0.3, luck: 3 },
    skillIds: ['dru_fangs', 'dru_hide', 'dru_growth', 'dru_moon'],
  },
};

export const ALL_CLASSES: HeroClassId[] = ['vanguard', 'thief', 'arcanist', 'warden', 'necromancer', 'bard', 'druid'];

export const HERO_WEAPON_ICON: Record<HeroClassId, string> = {
  vanguard: 'icon-sword',
  thief: 'icon-sword',
  arcanist: 'icon-staff',
  warden: 'icon-mace',
  necromancer: 'icon-staff',
  bard: 'icon-sword',
  druid: 'icon-staff',
};
