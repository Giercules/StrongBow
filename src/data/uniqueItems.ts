import type { ItemDefinition, ItemSlot, StatMods } from '../core/types';
import { Content } from '../content/ContentRegistry';

// ----------------------------------------------------------------------------
// Unique legendaries — twelve NAMED items with build-warping powers, far rarer
// than set pieces. Each carries a `power` id that combat code checks via
// Hero.hasUniquePower(). They present in burnt-orange everywhere.
// ----------------------------------------------------------------------------

export interface UniqueDef {
  id: string;
  name: string;
  slot: ItemSlot;
  icon: string;
  /** Power id checked in combat code (empty string = pure-stat unique). */
  power: string;
  powerDesc: string;
  mods: StatMods;
  flavor: string;
}

export const UNIQUES: UniqueDef[] = [
  {
    id: 'uni_sunfall', name: 'Sunfall Edge', slot: 'weapon', icon: 'icon-sword', power: 'sunfall',
    powerDesc: 'Every strike sets its mark ablaze.',
    mods: { damage: 12, critChance: 0.05, fire: 4 },
    flavor: 'Forged in the last hour of a dying star.',
  },
  {
    id: 'uni_tidebreaker', name: 'Tidebreaker Maul', slot: 'weapon', icon: 'icon-mace', power: 'tidebreaker',
    powerDesc: 'Blows hurl foes away and chill them to the bone.',
    mods: { damage: 15, maxHealth: 20 },
    flavor: 'It remembers being a lighthouse door.',
  },
  {
    id: 'uni_stormcaller', name: 'Stormcaller Staff', slot: 'weapon', icon: 'icon-staff', power: 'stormcaller',
    powerDesc: 'Critical hits call lightning that arcs between foes.',
    mods: { damage: 10, critChance: 0.08, maxMana: 25 },
    flavor: 'The clouds answer to whoever dares hold it.',
  },
  {
    id: 'uni_whisperwind', name: 'Whisperwind Bow', slot: 'weapon', icon: 'icon-bow', power: 'whisperwind',
    powerDesc: 'Arrows pass through everything they kill and keep flying.',
    mods: { damage: 11, speed: 10, critChance: 0.05 },
    flavor: 'Strung with a breeze that never settled.',
  },
  {
    id: 'uni_embers', name: 'Aegis of Embers', slot: 'shield', icon: 'icon-shield', power: 'embers',
    powerDesc: 'Being struck can burst into a ring of flame.',
    mods: { armor: 9, maxHealth: 25, fire: 3 },
    flavor: 'The coals under its face have burned for a century.',
  },
  {
    id: 'uni_heartroot', name: 'Heartroot Plate', slot: 'body', icon: 'icon-armor', power: 'heartroot',
    powerDesc: 'Every kill mends your wounds.',
    mods: { armor: 8, maxHealth: 40, regen: 0.6 },
    flavor: 'A living tree grew around this cuirass, and was asked politely to stay.',
  },
  {
    id: 'uni_nightveil', name: 'Nightveil Cowl', slot: 'head', icon: 'icon-helm', power: 'nightveil',
    powerDesc: 'Dodging wraps you in shadow — untouchable for a heartbeat longer.',
    mods: { armor: 5, speed: 12, critChance: 0.04 },
    flavor: 'Cut from the one hour the moon refuses to light.',
  },
  {
    id: 'uni_hollowcrown', name: 'Crown of the Hollow King', slot: 'head', icon: 'icon-helm', power: 'hollowcrown',
    powerDesc: 'Command two more servants, and all your summons strike 25% harder.',
    mods: { summonBonus: 2, maxMana: 30, armor: 4 },
    flavor: 'Whoever wears it hears the Undermaw... asking for orders.',
  },
  {
    id: 'uni_midas', name: 'Midas Grips', slot: 'hands', icon: 'icon-gloves', power: 'midas',
    powerDesc: 'The dead spill 40% more gold at your feet.',
    mods: { damage: 6, luck: 10 },
    flavor: 'They itch whenever a purse walks past.',
  },
  {
    id: 'uni_comet', name: 'Boots of the Comet', slot: 'feet', icon: 'icon-boots', power: 'comet',
    powerDesc: 'Your dodge leaves a burning trail across the ground.',
    mods: { speed: 20, armor: 3 },
    flavor: 'Wherever they land is, briefly, the sky.',
  },
  {
    id: 'uni_secondsun', name: 'Ring of the Second Sun', slot: 'ring', icon: 'icon-ring', power: '',
    powerDesc: 'Your class ability recharges in a blink.',
    mods: { cdr: 0.25, fire: 4 },
    flavor: 'On clear days it casts two shadows.',
  },
  {
    id: 'uni_choir', name: 'Echo of the Choir', slot: 'amulet', icon: 'icon-amulet', power: '',
    powerDesc: 'Your spells arc onward to two more foes.',
    mods: { spellChain: 2, maxMana: 20, damage: 4 },
    flavor: 'Hold it to your ear: the hymn has no beginning.',
  },
];

/** Burnt-orange presentation colour for unique drops/lines. */
export const UNIQUE_COLOR = '#ff9a3a';

let uniqueMintSeq = 0;

/** Mint (and register) a fresh instance of one unique. */
export function mintUnique(def: UniqueDef): ItemDefinition {
  const item: ItemDefinition = {
    id: `mint_uni_${uniqueMintSeq++}_${def.id}`,
    name: def.name,
    slot: def.slot,
    rarity: 'legendary',
    icon: def.icon,
    mods: { ...def.mods },
    flavor: `${def.powerDesc} ${def.flavor}`,
    grade: 'godforged',
    baseId: def.id,
    unique: def.power || def.id,
  };
  Content.registerItem(item);
  return item;
}

/** Roll a random unique drop. */
export function rollUniqueDrop(): ItemDefinition {
  return mintUnique(UNIQUES[Math.floor(Math.random() * UNIQUES.length)]);
}

/** Uniques are the rarest tier: ~1.6% base, nudged by Fortune, capped at 5%. */
export function uniqueDropChance(luck: number): number {
  return Math.min(0.05, 0.016 + luck * 0.001);
}
