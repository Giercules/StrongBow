import type { ItemDefinition, ThemeId, StatMods } from '../core/types';

// ----------------------------------------------------------------------------
// Themed base equipment. Each realm keeps its hand-crafted signature weapon,
// body armour and a jewel; the remaining slots (shield/head/legs/hands/feet +
// the complementary jewel) are generated so every realm can drop a full set.
// These are *bases*: the loot system mints a graded instance from them.
// ----------------------------------------------------------------------------

type Base = Omit<ItemDefinition, 'rarity' | 'theme'>;

function base(theme: ThemeId, b: Base): ItemDefinition {
  return { ...b, rarity: 'common', theme };
}

/** Generate the non-signature slots for a realm from a name prefix + accent. */
function kit(theme: ThemeId, stub: string, P: string, accent: StatMods, jewel: 'ring' | 'amulet'): ItemDefinition[] {
  const lp = P.toLowerCase();
  const j =
    jewel === 'ring'
      ? base(theme, { id: `base_${stub}_rg`, name: `${P} Band`, slot: 'ring', icon: 'icon-ring', mods: { critChance: 0.03, ...accent }, flavor: `A ${lp} ring, slipped on for the descent.` })
      : base(theme, { id: `base_${stub}_am`, name: `${P} Amulet`, slot: 'amulet', icon: 'icon-amulet', mods: { maxMana: 14, ...accent }, flavor: `A ${lp} charm that hums against the chest.` });
  return [
    base(theme, { id: `base_${stub}_sh`, name: `${P} Bulwark`, slot: 'shield', icon: 'icon-shield', mods: { armor: 4, maxHealth: 16 }, flavor: `A broad ${lp} shield, scarred and sure.` }),
    base(theme, { id: `base_${stub}_hd`, name: `${P} Helm`, slot: 'head', icon: 'icon-helm', mods: { armor: 2, maxHealth: 12 }, flavor: `${P} headgear, dented and proven.` }),
    base(theme, { id: `base_${stub}_lg`, name: `${P} Greaves`, slot: 'legs', icon: 'icon-legs', mods: { armor: 2, maxHealth: 10, speed: 2 }, flavor: `${P} leg-plates for the long march.` }),
    base(theme, { id: `base_${stub}_hn`, name: `${P} Gauntlets`, slot: 'hands', icon: 'icon-gloves', mods: { armor: 1, damage: 2 }, flavor: `${P} gloves with a sure grip.` }),
    base(theme, { id: `base_${stub}_ft`, name: `${P} Boots`, slot: 'feet', icon: 'icon-boots', mods: { armor: 1, speed: 10 }, flavor: `${P} boots, broken in on the road.` }),
    j,
  ];
}

export const THEME_BASES: Record<ThemeId, ItemDefinition[]> = {
  crypt: [
    base('crypt', { id: 'base_crypt_w', name: 'Gravebound Cleaver', slot: 'weapon', icon: 'icon-sword', mods: { damage: 7, critChance: 0.02 }, flavor: 'Steel that drank from a hundred open graves.' }),
    base('crypt', { id: 'base_crypt_a', name: 'Mourner’s Mail', slot: 'body', icon: 'icon-armor', mods: { armor: 3, maxHealth: 16 }, flavor: 'Funeral plate, cold and patient.' }),
    base('crypt', { id: 'base_crypt_t', name: 'Sexton’s Sigil', slot: 'amulet', icon: 'icon-amulet', mods: { regen: 0.3, luck: 3 }, flavor: 'It hums the names of the buried.' }),
    ...kit('crypt', 'crypt', 'Gravebound', { regen: 0.2 }, 'ring'),
  ],
  molten: [
    base('molten', { id: 'base_molten_w', name: 'Emberfang Brand', slot: 'weapon', icon: 'icon-sword', mods: { damage: 8, fire: 4 }, effects: ['burn'], flavor: 'Quenched in the world’s open wound.' }),
    base('molten', { id: 'base_molten_a', name: 'Cinderscale Hauberk', slot: 'body', icon: 'icon-armor', mods: { armor: 4, maxHealth: 14, fire: 2 }, flavor: 'Scales shed by something that swims in fire.' }),
    base('molten', { id: 'base_molten_t', name: 'Coal-Heart Charm', slot: 'ring', icon: 'icon-ring', mods: { fire: 4, damage: 2 }, flavor: 'Always warm. Always hungry.' }),
    ...kit('molten', 'molten', 'Cinder', { fire: 3 }, 'amulet'),
  ],
  frost: [
    base('frost', { id: 'base_frost_w', name: 'Rimepiercer Bow', slot: 'weapon', icon: 'icon-bow', mods: { damage: 6, critChance: 0.05 }, flavor: 'Strings that sing in the cold like a choir.' }),
    base('frost', { id: 'base_frost_a', name: 'Glacial Vestment', slot: 'body', icon: 'icon-armor', mods: { armor: 3, maxMana: 18, speed: 4 }, flavor: 'Woven from the breath of the frozen choir.' }),
    base('frost', { id: 'base_frost_t', name: 'Frostward Loop', slot: 'ring', icon: 'icon-ring', mods: { armor: 2, maxMana: 12, luck: 2 }, flavor: 'A ring of unmelting ice.' }),
    ...kit('frost', 'frost', 'Glacial', { maxMana: 12 }, 'amulet'),
  ],
  toxic: [
    base('toxic', { id: 'base_toxic_w', name: 'Venomtongue Dagger', slot: 'weapon', icon: 'icon-sword', mods: { damage: 7, critChance: 0.04 }, effects: ['lifesteal'], flavor: 'It weeps a green that never dries.' }),
    base('toxic', { id: 'base_toxic_a', name: 'Plaguehide Jerkin', slot: 'body', icon: 'icon-armor', mods: { armor: 3, maxHealth: 20, regen: 0.2 }, flavor: 'Tanned in something better left unnamed.' }),
    base('toxic', { id: 'base_toxic_t', name: 'Rotcore Phial', slot: 'amulet', icon: 'icon-amulet', mods: { regen: 0.4, luck: 4 }, flavor: 'A pulse of corruption sealed in glass.' }),
    ...kit('toxic', 'toxic', 'Plague', { regen: 0.3 }, 'ring'),
  ],
  clockwork: [
    base('clockwork', { id: 'base_clock_w', name: 'Geartooth Maul', slot: 'weapon', icon: 'icon-mace', mods: { damage: 9, armor: 1 }, flavor: 'Every swing winds a hidden spring.' }),
    base('clockwork', { id: 'base_clock_a', name: 'Brass Carapace', slot: 'body', icon: 'icon-armor', mods: { armor: 5, maxHealth: 12, speed: -4 }, effects: ['thorns'], flavor: 'Riveted plate that ticks as you breathe.' }),
    base('clockwork', { id: 'base_clock_t', name: 'Mainspring Cog', slot: 'ring', icon: 'icon-ring', mods: { speed: 8, critChance: 0.02 }, flavor: 'Geared to make a body run faster.' }),
    ...kit('clockwork', 'clock', 'Brass', { armor: 2 }, 'amulet'),
  ],
  arena: [
    base('arena', { id: 'base_arena_w', name: 'Champion’s Edge', slot: 'weapon', icon: 'icon-sword', mods: { damage: 9, critChance: 0.03 }, flavor: 'Won, never bought. Bloodied, never broken.' }),
    base('arena', { id: 'base_arena_a', name: 'Gladiator’s Aegis', slot: 'body', icon: 'icon-armor', mods: { armor: 4, maxHealth: 22 }, effects: ['thorns'], flavor: 'Dented by a thousand cheering deaths.' }),
    base('arena', { id: 'base_arena_t', name: 'Crowd-Favor Token', slot: 'amulet', icon: 'icon-amulet', mods: { damage: 3, luck: 5 }, flavor: 'The mob’s love, pressed into bronze.' }),
    ...kit('arena', 'arena', 'Champion', { damage: 2 }, 'ring'),
  ],
  bog: [
    base('bog', { id: 'base_bog_w', name: 'Mirewood Harpoon', slot: 'weapon', icon: 'icon-bow', mods: { damage: 8, critChance: 0.03 }, effects: ['lifesteal'], flavor: 'Barbed for things that drag you under.' }),
    base('bog', { id: 'base_bog_a', name: 'Drowned Kelp Cloak', slot: 'body', icon: 'icon-armor', mods: { armor: 3, maxHealth: 18, speed: 6 }, flavor: 'Still wet. Still moving, a little.' }),
    base('bog', { id: 'base_bog_t', name: 'Will-o’-Wisp Lantern', slot: 'ring', icon: 'icon-ring', mods: { luck: 6, maxMana: 10 }, flavor: 'It leads you to gold, or to drowning.' }),
    ...kit('bog', 'bog', 'Mire', { luck: 3 }, 'amulet'),
  ],
  storm: [
    base('storm', { id: 'base_storm_w', name: 'Thundercall Spire', slot: 'weapon', icon: 'icon-staff', mods: { damage: 7, maxMana: 16, fire: 3 }, flavor: 'It answers the sky, and the sky answers back.' }),
    base('storm', { id: 'base_storm_a', name: 'Stormweave Shroud', slot: 'body', icon: 'icon-armor', mods: { armor: 3, speed: 10, maxMana: 14 }, flavor: 'Lightning curls through the threads.' }),
    base('storm', { id: 'base_storm_t', name: 'Tempest Eye', slot: 'amulet', icon: 'icon-amulet', mods: { critChance: 0.06, luck: 3 }, flavor: 'Calm at the center of every gale.' }),
    ...kit('storm', 'storm', 'Storm', { maxMana: 10 }, 'ring'),
  ],
  shadow: [
    base('shadow', { id: 'base_shadow_w', name: 'Umbral Fang', slot: 'weapon', icon: 'icon-sword', mods: { damage: 8, critChance: 0.06 }, effects: ['lifesteal'], flavor: 'It cuts the light out of a wound.' }),
    base('shadow', { id: 'base_shadow_a', name: 'Nightwoven Shroud', slot: 'body', icon: 'icon-armor', mods: { armor: 3, speed: 12, critChance: 0.03 }, flavor: 'Stitched from the dark between torches.' }),
    base('shadow', { id: 'base_shadow_t', name: 'Eye of the Warren', slot: 'ring', icon: 'icon-ring', mods: { luck: 7, critChance: 0.03 }, flavor: 'It sees what hides, and what it hides holds gold.' }),
    ...kit('shadow', 'shadow', 'Umbral', { critChance: 0.03 }, 'amulet'),
  ],
  sanctum: [
    base('sanctum', { id: 'base_sanctum_w', name: 'Hollowbane Glaive', slot: 'weapon', icon: 'icon-sword', mods: { damage: 11, critChance: 0.04, fire: 3 }, effects: ['burn'], flavor: 'Forged to unmake the thing at the bottom.' }),
    base('sanctum', { id: 'base_sanctum_a', name: 'Sealkeeper’s Plate', slot: 'body', icon: 'icon-armor', mods: { armor: 5, maxHealth: 28, regen: 0.3 }, flavor: 'Worn by the last to hold the final door.' }),
    base('sanctum', { id: 'base_sanctum_t', name: 'Undermaw Relic', slot: 'amulet', icon: 'icon-amulet', mods: { damage: 4, luck: 8, maxMana: 14 }, flavor: 'A shard of the hunger, turned against it.' }),
    ...kit('sanctum', 'sanctum', 'Sealkeeper', { damage: 2 }, 'ring'),
  ],
  // Town smith stock (the town itself never drops loot; these back the shops).
  town: [
    base('town', { id: 'base_town_w', name: 'Hearthwatch Arming Sword', slot: 'weapon', icon: 'icon-sword', mods: { damage: 6 }, flavor: 'Honest steel from the town forge.' }),
    base('town', { id: 'base_town_a', name: "Watchman's Brigandine", slot: 'body', icon: 'icon-armor', mods: { armor: 3, maxHealth: 12 }, flavor: 'Sturdy kit for the road below.' }),
    base('town', { id: 'base_town_t', name: "Traveler's Token", slot: 'ring', icon: 'icon-ring', mods: { luck: 3 }, flavor: 'For luck on the descent.' }),
    ...kit('town', 'town', 'Hearthwatch', { luck: 2 }, 'amulet'),
  ],
};

/** Flat list of every themed base (used by the manual armory page). */
export const ALL_THEME_BASES: ItemDefinition[] = Object.values(THEME_BASES).flat();
