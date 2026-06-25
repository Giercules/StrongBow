import type { SkillDef } from '../core/types';

// 12 skills, 3 per class. Max-rank pattern roughly 5 / 5 / 3.
export const SKILLS: Record<string, SkillDef> = {
  // ---- Vanguard ----
  van_bulwark: {
    id: 'van_bulwark',
    classId: 'vanguard',
    name: 'Bulwark',
    description: '+2 armor per rank.',
    maxRank: 5,
    icon: 'icon-armor',
    perRank: { armor: 2 },
  },
  van_cleave: {
    id: 'van_cleave',
    classId: 'vanguard',
    name: 'Cleave',
    description: '+3 damage and wider swing per rank.',
    maxRank: 5,
    icon: 'icon-sword',
    perRank: { damage: 3 },
  },
  van_rampart: {
    id: 'van_rampart',
    classId: 'vanguard',
    name: 'Rampart',
    description: '+25 max health per rank.',
    maxRank: 3,
    icon: 'icon-armor',
    perRank: { maxHealth: 25 },
  },

  // ---- Thief ----
  str_eagle: {
    id: 'str_eagle',
    classId: 'thief',
    name: 'Eagle Eye',
    description: '+4% critical chance per rank.',
    maxRank: 5,
    icon: 'icon-ring',
    perRank: { critChance: 0.04 },
  },
  str_swift: {
    id: 'str_swift',
    classId: 'thief',
    name: 'Fleet Foot',
    description: '+12 move speed per rank.',
    maxRank: 5,
    icon: 'icon-bow',
    perRank: { speed: 12 },
  },
  str_volley: {
    id: 'str_volley',
    classId: 'thief',
    name: 'Cutthroat',
    description: '+3 damage per rank.',
    maxRank: 3,
    icon: 'icon-bow',
    perRank: { damage: 3 },
  },

  // ---- Arcanist ----
  arc_pyre: {
    id: 'arc_pyre',
    classId: 'arcanist',
    name: 'Pyre',
    description: '+4 fire damage per rank.',
    maxRank: 5,
    icon: 'icon-staff',
    perRank: { fire: 4 },
  },
  arc_font: {
    id: 'arc_font',
    classId: 'arcanist',
    name: 'Mana Font',
    description: '+25 max mana per rank.',
    maxRank: 5,
    icon: 'icon-amulet',
    perRank: { maxMana: 25 },
  },
  arc_focus: {
    id: 'arc_focus',
    classId: 'arcanist',
    name: 'Focus',
    description: '+3 spell damage per rank.',
    maxRank: 3,
    icon: 'icon-staff',
    perRank: { damage: 3 },
  },

  // ---- Warden ----
  war_mend: {
    id: 'war_mend',
    classId: 'warden',
    name: 'Mend',
    description: '+0.4 health regen per rank.',
    maxRank: 5,
    icon: 'icon-amulet',
    perRank: { regen: 0.4 },
  },
  war_aegis: {
    id: 'war_aegis',
    classId: 'warden',
    name: 'Aegis',
    description: '+2 armor per rank.',
    maxRank: 5,
    icon: 'icon-armor',
    perRank: { armor: 2 },
  },
  war_grace: {
    id: 'war_grace',
    classId: 'warden',
    name: 'Grace',
    description: '+20 max mana per rank.',
    maxRank: 3,
    icon: 'icon-ring',
    perRank: { maxMana: 20 },
  },

  // ---- Necromancer ----
  nec_legion: {
    id: 'nec_legion',
    classId: 'necromancer',
    name: 'Dark Legion',
    description: '+18 max health per rank.',
    maxRank: 5,
    icon: 'icon-amulet',
    perRank: { maxHealth: 18 },
  },
  nec_grimoire: {
    id: 'nec_grimoire',
    classId: 'necromancer',
    name: 'Grimoire',
    description: '+25 max mana per rank — raise more dead.',
    maxRank: 5,
    icon: 'icon-staff',
    perRank: { maxMana: 25 },
  },
  nec_blight: {
    id: 'nec_blight',
    classId: 'necromancer',
    name: 'Blight',
    description: '+3 spell damage per rank.',
    maxRank: 3,
    icon: 'icon-staff',
    perRank: { damage: 3 },
  },
  nec_horde: {
    id: 'nec_horde',
    classId: 'necromancer',
    name: 'Horde',
    description: '+1 maximum summoned servant per rank.',
    maxRank: 2,
    icon: 'icon-amulet',
    perRank: { summonBonus: 1 },
  },
  arc_chain: {
    id: 'arc_chain',
    classId: 'arcanist',
    name: 'Chain Magic',
    description: 'Spells arc to +1 nearby foe per rank.',
    maxRank: 2,
    icon: 'icon-staff',
    perRank: { spellChain: 1 },
  },
};

export const ALL_SKILLS = Object.values(SKILLS);
