import type { ItemDefinition, ThemeId } from '../core/types';

// ----------------------------------------------------------------------------
// Themed base equipment — one weapon / armor / trinket template per level theme.
// These are *bases*: the loot system mints a graded instance from them (scaling
// the mods and adding affixes). Each level therefore drops gear unique to it.
// `rarity` here is a placeholder; the minted item's rarity comes from its grade.
// ----------------------------------------------------------------------------

type Base = Omit<ItemDefinition, 'rarity' | 'theme'>;

function base(theme: ThemeId, b: Base): ItemDefinition {
  return { ...b, rarity: 'common', theme };
}

export const THEME_BASES: Record<ThemeId, ItemDefinition[]> = {
  crypt: [
    base('crypt', { id: 'base_crypt_w', name: 'Gravebound Cleaver', slot: 'weapon', icon: 'icon-sword', mods: { damage: 7, critChance: 0.02 }, flavor: 'Steel that drank from a hundred open graves.' }),
    base('crypt', { id: 'base_crypt_a', name: 'Mourner’s Mail', slot: 'armor', icon: 'icon-armor', mods: { armor: 3, maxHealth: 16 }, flavor: 'Funeral plate, cold and patient.' }),
    base('crypt', { id: 'base_crypt_t', name: 'Sexton’s Sigil', slot: 'trinket', icon: 'icon-amulet', mods: { regen: 0.3, luck: 3 }, flavor: 'It hums the names of the buried.' }),
  ],
  molten: [
    base('molten', { id: 'base_molten_w', name: 'Emberfang Brand', slot: 'weapon', icon: 'icon-sword', mods: { damage: 8, fire: 4 }, effects: ['burn'], flavor: 'Quenched in the world’s open wound.' }),
    base('molten', { id: 'base_molten_a', name: 'Cinderscale Hauberk', slot: 'armor', icon: 'icon-armor', mods: { armor: 4, maxHealth: 14, fire: 2 }, flavor: 'Scales shed by something that swims in fire.' }),
    base('molten', { id: 'base_molten_t', name: 'Coal-Heart Charm', slot: 'trinket', icon: 'icon-ring', mods: { fire: 4, damage: 2 }, flavor: 'Always warm. Always hungry.' }),
  ],
  frost: [
    base('frost', { id: 'base_frost_w', name: 'Rimepiercer Bow', slot: 'weapon', icon: 'icon-bow', mods: { damage: 6, critChance: 0.05 }, flavor: 'Strings that sing in the cold like a choir.' }),
    base('frost', { id: 'base_frost_a', name: 'Glacial Vestment', slot: 'armor', icon: 'icon-armor', mods: { armor: 3, maxMana: 18, speed: 4 }, flavor: 'Woven from the breath of the frozen choir.' }),
    base('frost', { id: 'base_frost_t', name: 'Frostward Loop', slot: 'trinket', icon: 'icon-ring', mods: { armor: 2, maxMana: 12, luck: 2 }, flavor: 'A ring of unmelting ice.' }),
  ],
  toxic: [
    base('toxic', { id: 'base_toxic_w', name: 'Venomtongue Dagger', slot: 'weapon', icon: 'icon-sword', mods: { damage: 7, critChance: 0.04 }, effects: ['lifesteal'], flavor: 'It weeps a green that never dries.' }),
    base('toxic', { id: 'base_toxic_a', name: 'Plaguehide Jerkin', slot: 'armor', icon: 'icon-armor', mods: { armor: 3, maxHealth: 20, regen: 0.2 }, flavor: 'Tanned in something better left unnamed.' }),
    base('toxic', { id: 'base_toxic_t', name: 'Rotcore Phial', slot: 'trinket', icon: 'icon-amulet', mods: { regen: 0.4, luck: 4 }, flavor: 'A pulse of corruption sealed in glass.' }),
  ],
  clockwork: [
    base('clockwork', { id: 'base_clock_w', name: 'Geartooth Maul', slot: 'weapon', icon: 'icon-mace', mods: { damage: 9, armor: 1 }, flavor: 'Every swing winds a hidden spring.' }),
    base('clockwork', { id: 'base_clock_a', name: 'Brass Carapace', slot: 'armor', icon: 'icon-armor', mods: { armor: 5, maxHealth: 12, speed: -4 }, effects: ['thorns'], flavor: 'Riveted plate that ticks as you breathe.' }),
    base('clockwork', { id: 'base_clock_t', name: 'Mainspring Cog', slot: 'trinket', icon: 'icon-ring', mods: { speed: 8, critChance: 0.02 }, flavor: 'Geared to make a body run faster.' }),
  ],
  arena: [
    base('arena', { id: 'base_arena_w', name: 'Champion’s Edge', slot: 'weapon', icon: 'icon-sword', mods: { damage: 9, critChance: 0.03 }, flavor: 'Won, never bought. Bloodied, never broken.' }),
    base('arena', { id: 'base_arena_a', name: 'Gladiator’s Aegis', slot: 'armor', icon: 'icon-armor', mods: { armor: 4, maxHealth: 22 }, effects: ['thorns'], flavor: 'Dented by a thousand cheering deaths.' }),
    base('arena', { id: 'base_arena_t', name: 'Crowd-Favor Token', slot: 'trinket', icon: 'icon-amulet', mods: { damage: 3, luck: 5 }, flavor: 'The mob’s love, pressed into bronze.' }),
  ],
  bog: [
    base('bog', { id: 'base_bog_w', name: 'Mirewood Harpoon', slot: 'weapon', icon: 'icon-bow', mods: { damage: 8, critChance: 0.03 }, effects: ['lifesteal'], flavor: 'Barbed for things that drag you under.' }),
    base('bog', { id: 'base_bog_a', name: 'Drowned Kelp Cloak', slot: 'armor', icon: 'icon-armor', mods: { armor: 3, maxHealth: 18, speed: 6 }, flavor: 'Still wet. Still moving, a little.' }),
    base('bog', { id: 'base_bog_t', name: 'Will-o’-Wisp Lantern', slot: 'trinket', icon: 'icon-ring', mods: { luck: 6, maxMana: 10 }, flavor: 'It leads you to gold, or to drowning.' }),
  ],
  storm: [
    base('storm', { id: 'base_storm_w', name: 'Thundercall Spire', slot: 'weapon', icon: 'icon-staff', mods: { damage: 7, maxMana: 16, fire: 3 }, flavor: 'It answers the sky, and the sky answers back.' }),
    base('storm', { id: 'base_storm_a', name: 'Stormweave Shroud', slot: 'armor', icon: 'icon-armor', mods: { armor: 3, speed: 10, maxMana: 14 }, flavor: 'Lightning curls through the threads.' }),
    base('storm', { id: 'base_storm_t', name: 'Tempest Eye', slot: 'trinket', icon: 'icon-amulet', mods: { critChance: 0.06, luck: 3 }, flavor: 'Calm at the center of every gale.' }),
  ],
  shadow: [
    base('shadow', { id: 'base_shadow_w', name: 'Umbral Fang', slot: 'weapon', icon: 'icon-sword', mods: { damage: 8, critChance: 0.06 }, effects: ['lifesteal'], flavor: 'It cuts the light out of a wound.' }),
    base('shadow', { id: 'base_shadow_a', name: 'Nightwoven Shroud', slot: 'armor', icon: 'icon-armor', mods: { armor: 3, speed: 12, critChance: 0.03 }, flavor: 'Stitched from the dark between torches.' }),
    base('shadow', { id: 'base_shadow_t', name: 'Eye of the Warren', slot: 'trinket', icon: 'icon-ring', mods: { luck: 7, critChance: 0.03 }, flavor: 'It sees what hides, and what it hides holds gold.' }),
  ],
  sanctum: [
    base('sanctum', { id: 'base_sanctum_w', name: 'Hollowbane Glaive', slot: 'weapon', icon: 'icon-sword', mods: { damage: 11, critChance: 0.04, fire: 3 }, effects: ['burn'], flavor: 'Forged to unmake the thing at the bottom.' }),
    base('sanctum', { id: 'base_sanctum_a', name: 'Sealkeeper’s Plate', slot: 'armor', icon: 'icon-armor', mods: { armor: 5, maxHealth: 28, regen: 0.3 }, flavor: 'Worn by the last to hold the final door.' }),
    base('sanctum', { id: 'base_sanctum_t', name: 'Undermaw Relic', slot: 'trinket', icon: 'icon-amulet', mods: { damage: 4, luck: 8, maxMana: 14 }, flavor: 'A shard of the hunger, turned against it.' }),
  ],
  // Town smith stock (the town itself never drops loot; these back the shops).
  town: [
    base('town', { id: 'base_town_w', name: 'Hearthwatch Arming Sword', slot: 'weapon', icon: 'icon-sword', mods: { damage: 6 }, flavor: 'Honest steel from the town forge.' }),
    base('town', { id: 'base_town_a', name: "Watchman's Brigandine", slot: 'armor', icon: 'icon-armor', mods: { armor: 3, maxHealth: 12 }, flavor: 'Sturdy kit for the road below.' }),
    base('town', { id: 'base_town_t', name: "Traveler's Token", slot: 'trinket', icon: 'icon-ring', mods: { luck: 3 }, flavor: 'For luck on the descent.' }),
  ],
};

/** Flat list of every themed base (used by the manual armory page). */
export const ALL_THEME_BASES: ItemDefinition[] = Object.values(THEME_BASES).flat();
