import type { HeroClassId, ItemDefinition, StatBlock, StatMods } from '../core/types';
import { Content } from '../content/ContentRegistry';

// ----------------------------------------------------------------------------
// Class armor sets — five Godforged-tier pieces per class (head/body/legs/
// hands/feet). Wearing more pieces of your OWN class's set unlocks tiered
// bonuses: solid stats at 2, strong stats at 4, and a class-defining power at
// the full 5. Pieces drop rarely from the same rolls as normal gear, weighted
// toward classes actually in the party.
// ----------------------------------------------------------------------------

export const SET_PIECE_SLOTS = ['head', 'body', 'legs', 'hands', 'feet'] as const;
export type SetPieceSlot = (typeof SET_PIECE_SLOTS)[number];

/** The full-set (5-piece) class power. Consumed by Hero + DungeonScene. */
export type SetPowerId = 'undying' | 'shadowmaster' | 'archmage' | 'lifewarden' | 'deathlord';

export interface SetPieceDef {
  name: string;
  icon: string;
  mods: StatMods;
  flavor: string;
}

export interface ArmorSetDef {
  id: string;
  classId: HeroClassId;
  name: string;
  power: SetPowerId;
  powerName: string;
  powerDesc: string;
  tier2: StatMods;
  tier4: StatMods;
  tier5: StatMods;
  pieces: Record<SetPieceSlot, SetPieceDef>;
}

const ICONS: Record<SetPieceSlot, string> = {
  head: 'icon-helm',
  body: 'icon-armor',
  legs: 'icon-legs',
  hands: 'icon-gloves',
  feet: 'icon-boots',
};

export const ARMOR_SETS: Record<HeroClassId, ArmorSetDef> = {
  vanguard: {
    id: 'set_vanguard',
    classId: 'vanguard',
    name: 'Bulwark of the Unbroken',
    power: 'undying',
    powerName: 'Undying Bulwark',
    powerDesc: 'Once every 90s, a killing blow leaves you at 1 HP instead of dead.',
    tier2: { armor: 4, maxHealth: 30 },
    tier4: { damage: 6, regen: 0.6 },
    tier5: { armor: 6, maxHealth: 40 },
    pieces: {
      head: { name: 'Warhelm of the Unbroken', icon: ICONS.head, mods: { armor: 6, maxHealth: 30 }, flavor: 'Horned steel that has never once bowed.' },
      body: { name: 'Breastplate of the Unbroken', icon: ICONS.body, mods: { armor: 9, maxHealth: 44 }, flavor: 'Every dent hammered flat by the same stubborn hands.' },
      legs: { name: 'Greaves of the Unbroken', icon: ICONS.legs, mods: { armor: 6, maxHealth: 26, speed: 4 }, flavor: 'They have held every line they were told to hold.' },
      hands: { name: 'Crushers of the Unbroken', icon: ICONS.hands, mods: { armor: 4, damage: 8 }, flavor: 'Gauntlets that remember every shield-wall.' },
      feet: { name: 'Wartreads of the Unbroken', icon: ICONS.feet, mods: { armor: 4, speed: 14, maxHealth: 18 }, flavor: 'Ground gives way before these boots do.' },
    },
  },
  thief: {
    id: 'set_thief',
    classId: 'thief',
    name: 'Veil of the Silent Knife',
    power: 'shadowmaster',
    powerName: 'Shadowmaster',
    powerDesc: 'Backstabs recharge twice as fast and strike for 3.2x damage.',
    tier2: { critChance: 0.05, speed: 8 },
    tier4: { damage: 5, luck: 6 },
    tier5: { critChance: 0.08 },
    pieces: {
      head: { name: 'Hood of the Silent Knife', icon: ICONS.head, mods: { critChance: 0.05, armor: 3, luck: 4 }, flavor: 'The dark inside it is deeper than it should be.' },
      body: { name: 'Shadowweave Jerkin', icon: ICONS.body, mods: { armor: 5, speed: 10, critChance: 0.04 }, flavor: 'Cut from cloth that torchlight refuses.' },
      legs: { name: 'Silent Knife Breeks', icon: ICONS.legs, mods: { armor: 3, speed: 12, maxHealth: 16 }, flavor: 'No floorboard has ever tattled on them.' },
      hands: { name: 'Cutpurse Grips', icon: ICONS.hands, mods: { damage: 7, critChance: 0.05 }, flavor: 'Fingers quicker than the eye, and twice as light.' },
      feet: { name: 'Softstep Boots', icon: ICONS.feet, mods: { speed: 18, armor: 2, luck: 4 }, flavor: 'They land like a rumor: everywhere, unproven.' },
    },
  },
  arcanist: {
    id: 'set_arcanist',
    classId: 'arcanist',
    name: 'Raiment of the Riftweaver',
    power: 'archmage',
    powerName: 'Archmage',
    powerDesc: 'Magic blasts reach 45% farther, always ignite, and bolts chain to one extra foe.',
    tier2: { maxMana: 30, cdr: 0.08 },
    tier4: { damage: 6, spellChain: 1 },
    tier5: { fire: 6 },
    pieces: {
      head: { name: 'Circlet of the Riftweaver', icon: ICONS.head, mods: { maxMana: 26, critChance: 0.04, cdr: 0.05 }, flavor: 'A thin band holding back a very large idea.' },
      body: { name: 'Riftweaver Robes', icon: ICONS.body, mods: { armor: 4, maxMana: 34, damage: 4 }, flavor: 'The hems trail sparks from somewhere else.' },
      legs: { name: 'Leggings of Woven Aether', icon: ICONS.legs, mods: { armor: 3, maxMana: 22, speed: 8 }, flavor: 'Stitched with thread that was never spun.' },
      hands: { name: 'Handwraps of the Rift', icon: ICONS.hands, mods: { damage: 8, fire: 4 }, flavor: 'They remember every sigil ever traced.' },
      feet: { name: 'Slippers of the Second Step', icon: ICONS.feet, mods: { speed: 14, maxMana: 18, luck: 3 }, flavor: 'Each stride lands a half-world ahead.' },
    },
  },
  warden: {
    id: 'set_warden',
    classId: 'warden',
    name: 'Aegis of the Dawnkeeper',
    power: 'lifewarden',
    powerName: 'Lifewarden',
    powerDesc: 'Your healing aura pulses twice as often and mends 60% more.',
    tier2: { maxHealth: 24, regen: 0.5 },
    tier4: { armor: 4, damage: 4 },
    tier5: { regen: 0.5 },
    pieces: {
      head: { name: 'Dawnkeeper Crown', icon: ICONS.head, mods: { armor: 4, maxHealth: 22, regen: 0.3 }, flavor: 'It catches light that has not risen yet.' },
      body: { name: 'Cuirass of First Light', icon: ICONS.body, mods: { armor: 7, maxHealth: 34, regen: 0.3 }, flavor: 'Warm as a hearth in a cold vigil.' },
      legs: { name: 'Legguards of the Vigil', icon: ICONS.legs, mods: { armor: 5, maxHealth: 22, speed: 4 }, flavor: 'They have knelt at a thousand bedsides.' },
      hands: { name: 'Mendinggrip Gauntlets', icon: ICONS.hands, mods: { damage: 6, regen: 0.4 }, flavor: 'Hands that break and mend with equal grace.' },
      feet: { name: 'Treads of the Long Watch', icon: ICONS.feet, mods: { armor: 3, speed: 12, maxHealth: 16 }, flavor: 'Worn smooth walking the same protective circle.' },
    },
  },
  necromancer: {
    id: 'set_necromancer',
    classId: 'necromancer',
    name: 'Regalia of the Pale King',
    power: 'deathlord',
    powerName: 'Deathlord',
    powerDesc: 'Command 2 extra servants, and your risen dead strike 25% harder.',
    tier2: { maxMana: 24, regen: 0.4 },
    tier4: { damage: 5, cdr: 0.1 },
    tier5: { summonBonus: 2 },
    pieces: {
      head: { name: 'Pale King’s Crown', icon: ICONS.head, mods: { maxMana: 24, armor: 3, cdr: 0.05 }, flavor: 'Bone points worn by whatever ruled before names.' },
      body: { name: 'Shroud of the Pale Court', icon: ICONS.body, mods: { armor: 4, maxMana: 30, maxHealth: 18 }, flavor: 'Grave-linen that refuses to lie still.' },
      legs: { name: 'Legwraps of Quiet Earth', icon: ICONS.legs, mods: { armor: 3, maxMana: 18, speed: 8 }, flavor: 'Dust of a hundred barrows rides in the weave.' },
      hands: { name: 'Clawgrips of Dominion', icon: ICONS.hands, mods: { damage: 7, maxMana: 14 }, flavor: 'The dead answer when these fingers snap.' },
      feet: { name: 'Boneheel Boots', icon: ICONS.feet, mods: { speed: 12, armor: 2, regen: 0.3 }, flavor: 'Every step sounds like a knuckle cracking.' },
    },
  },
};

export const ALL_SET_IDS = new Set(Object.values(ARMOR_SETS).map((s) => s.id));

/** Bright-green presentation colour for set drops/lines (user-requested). */
export const SET_COLOR = '#39ff6a';

let setMintSeq = 0;

/** Mint (and register) a fresh instance of one set piece. */
export function mintSetPiece(classId: HeroClassId, slot: SetPieceSlot): ItemDefinition {
  const set = ARMOR_SETS[classId];
  const p = set.pieces[slot];
  const item: ItemDefinition = {
    id: `mint_set_${setMintSeq++}_${classId}_${slot}`,
    name: p.name,
    slot,
    rarity: 'legendary',
    icon: p.icon,
    mods: { ...p.mods, luck: (p.mods.luck ?? 0) + 3 }, // godforged-style fortune dividend
    flavor: p.flavor,
    grade: 'godforged',
    baseId: `set_${classId}_${slot}`,
    setId: set.id,
  };
  Content.registerItem(item);
  return item;
}

/** Chance that a successful gear drop is upgraded to a class set piece. */
export function setDropChance(luck: number): number {
  return Math.min(0.14, 0.07 + luck * 0.002);
}

/** Roll a random set piece: ~70% for a class present in the party, else any. */
export function rollSetDrop(partyClasses: HeroClassId[]): ItemDefinition {
  const classes = Object.keys(ARMOR_SETS) as HeroClassId[];
  let cls: HeroClassId;
  if (partyClasses.length && Math.random() < 0.7) {
    cls = partyClasses[Math.floor(Math.random() * partyClasses.length)];
  } else {
    cls = classes[Math.floor(Math.random() * classes.length)];
  }
  const slot = SET_PIECE_SLOTS[Math.floor(Math.random() * SET_PIECE_SLOTS.length)];
  return mintSetPiece(cls, slot);
}

/** How many pieces of the given set are in this equipped list. */
export function countSetPieces(equipped: ItemDefinition[], setId: string): number {
  return equipped.filter((i) => i.setId === setId).length;
}

function addMods(into: StatBlock, mods: StatMods): void {
  (Object.keys(mods) as (keyof StatBlock)[]).forEach((k) => {
    const v = mods[k];
    if (typeof v === 'number') into[k] = (into[k] ?? 0) + v;
  });
}

/** Merge tiered set bonuses into a computed stat block (cumulative 2/4/5),
 *  then re-apply the caps computeStats normally enforces. */
export function applySetBonuses(stats: StatBlock, classId: HeroClassId, count: number): void {
  const set = ARMOR_SETS[classId];
  if (count >= 2) addMods(stats, set.tier2);
  if (count >= 4) addMods(stats, set.tier4);
  if (count >= 5) addMods(stats, set.tier5);
  stats.critChance = Math.min(0.75, Math.max(0, stats.critChance));
  stats.cdr = Math.min(0.6, Math.max(0, stats.cdr ?? 0));
  stats.maxHealth = Math.round(stats.maxHealth);
  stats.maxMana = Math.round(stats.maxMana);
  stats.damage = Math.round(stats.damage);
}

/** Human-readable tier lines for tooltips / the character sheet. */
export function setTierLines(classId: HeroClassId): string[] {
  const set = ARMOR_SETS[classId];
  const fmt = (m: StatMods): string =>
    (Object.entries(m) as [string, number][])
      .map(([k, v]) => {
        if (k === 'critChance') return `+${Math.round(v * 100)}% crit`;
        if (k === 'cdr') return `+${Math.round(v * 100)}% cooldown`;
        if (k === 'maxHealth') return `+${v} health`;
        if (k === 'maxMana') return `+${v} mana`;
        if (k === 'summonBonus') return `+${v} servants`;
        if (k === 'spellChain') return `+${v} chain`;
        return `+${v} ${k}`;
      })
      .join(', ');
  return [
    `(2) ${fmt(set.tier2)}`,
    `(4) ${fmt(set.tier4)}`,
    `(5) ${set.powerName} — ${set.powerDesc}${Object.keys(set.tier5).length ? '  +' + fmt(set.tier5) : ''}`,
  ];
}
