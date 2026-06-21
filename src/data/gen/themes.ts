import type { ThemeId, EnemyId } from '../../core/types';

// ----------------------------------------------------------------------------
// Theme bundles — the creative DNA of a level. A theme decides the mood
// (ambient + tint), the dominant hazard, which room shapes the generator may
// draw, the decor it sprinkles, the enemy roster, the boss, and the set-pieces
// it likes to stamp. New levels pick a theme; the AI forge maps a description
// onto one of these.
// ----------------------------------------------------------------------------

export type RoomShape = 'rect' | 'circle' | 'cross' | 'cavern' | 'hall';

export type HazardKind = 'none' | 'water' | 'lava' | 'both' | 'ice' | 'poison' | 'spikes';

export type SetPieceId =
  | 'treasureVault'
  | 'frozenAltar'
  | 'plaguePit'
  | 'spikeGauntlet'
  | 'arenaRing'
  | 'crystalCluster'
  | 'guardianHall';

export interface ThemeDef {
  id: ThemeId;
  name: string;
  /** Camera background / fog colour. */
  ambientColor: number;
  /** Multiply-tint applied to the baked floor/wall layer (undefined = none). */
  themeTint?: number;
  /** Dominant environmental hazard the generator pools/freezes/lines with. */
  primaryHazard: HazardKind;
  /** Sprinkle spike traps in corridors regardless of the primary hazard. */
  traps: boolean;
  /** Room shapes the generator may choose from for this theme. */
  roomShapes: RoomShape[];
  /** Cosmetic decor texture keys scattered through the level. */
  decorKeys: string[];
  /** Default enemy roster cycled through the generators. */
  enemies: EnemyId[];
  /** Default boss for the theme. */
  boss: EnemyId;
  /** Set-pieces this theme likes to stamp into feature rooms. */
  setPieces: SetPieceId[];
  /** One-line flavour shown on the quest banner. */
  subtitle: string;
}

export const THEMES: Record<ThemeId, ThemeDef> = {
  crypt: {
    id: 'crypt',
    name: 'Crypt',
    ambientColor: 0x0a0c16,
    primaryHazard: 'both',
    traps: false,
    roomShapes: ['rect', 'cross'],
    decorKeys: ['bones', 'rubble', 'gravestone', 'candle'],
    enemies: ['grunt', 'ghost', 'demon', 'bone_archer', 'grunt', 'ghost'],
    boss: 'grave_warden',
    setPieces: ['guardianHall', 'treasureVault'],
    subtitle: 'The dead do not rest easy here.',
  },
  molten: {
    id: 'molten',
    name: 'Molten Deep',
    ambientColor: 0x180a08,
    primaryHazard: 'lava',
    traps: false,
    roomShapes: ['rect', 'cavern'],
    decorKeys: ['rubble', 'bones', 'lava-crack', 'obsidian'],
    enemies: ['imp', 'demon', 'brute', 'bone_archer', 'imp', 'demon'],
    boss: 'molten_colossus',
    setPieces: ['guardianHall', 'treasureVault'],
    subtitle: 'Fire wells up from the world’s wound.',
  },
  frost: {
    id: 'frost',
    name: 'Frozen Cathedral',
    ambientColor: 0x0a1626,
    primaryHazard: 'ice',
    traps: false,
    roomShapes: ['rect', 'circle', 'hall'],
    decorKeys: ['crystal', 'sky-crystal', 'pillar', 'icicle', 'frost-banner'],
    enemies: ['frost_shade', 'rime_archer', 'frost_shade', 'ghost', 'rime_archer', 'frost_shade'],
    boss: 'rime_cantor',
    setPieces: ['frozenAltar', 'crystalCluster', 'treasureVault'],
    subtitle: 'Frostbound nave of the shattered choir.',
  },
  toxic: {
    id: 'toxic',
    name: 'Toxic Undercroft',
    ambientColor: 0x0c1a10,
    primaryHazard: 'poison',
    traps: false,
    roomShapes: ['cavern', 'hall', 'rect', 'cavern'],
    decorKeys: ['vines', 'bones', 'rubble', 'toxic-mushroom'],
    enemies: ['plague_ooze', 'spore_imp', 'plague_ooze', 'brute', 'spore_imp', 'mire_lurker'],
    boss: 'rot_sovereign',
    setPieces: ['plaguePit', 'guardianHall', 'treasureVault'],
    subtitle: 'Plague-drowned vaults beneath the city.',
  },
  clockwork: {
    id: 'clockwork',
    name: 'Clockwork Vault',
    ambientColor: 0x12131c,
    primaryHazard: 'spikes',
    traps: true,
    roomShapes: ['rect', 'cross', 'hall'],
    decorKeys: ['cog', 'pillar', 'banner', 'pipe', 'gauge'],
    enemies: ['gear_knight', 'brass_sentinel', 'gear_knight', 'demon', 'brass_sentinel', 'imp'],
    boss: 'brass_magnus',
    setPieces: ['spikeGauntlet', 'treasureVault', 'guardianHall'],
    subtitle: 'The guarded treasury of gears and greed.',
  },
  arena: {
    id: 'arena',
    name: 'The Blood Arena',
    ambientColor: 0x180a0c,
    primaryHazard: 'lava',
    traps: true,
    roomShapes: ['circle', 'rect', 'circle'],
    decorKeys: ['blood-stain', 'skull-pike', 'banner', 'brazier', 'weapon-rack'],
    enemies: ['gladiator', 'brute', 'gladiator', 'demon', 'imp', 'gladiator'],
    boss: 'arena_champion',
    setPieces: ['arenaRing', 'spikeGauntlet'],
    subtitle: 'Bleed for the roar of the crowd.',
  },
  bog: {
    id: 'bog',
    name: 'The Drowned Bog',
    ambientColor: 0x0c160e,
    primaryHazard: 'poison',
    traps: false,
    roomShapes: ['cavern', 'rect', 'cavern', 'hall'],
    decorKeys: ['bog-stump', 'lilypad', 'vines', 'dead-tree', 'cattail'],
    enemies: ['mire_lurker', 'plague_ooze', 'spore_imp', 'mire_lurker', 'bone_archer', 'plague_ooze'],
    boss: 'mire_leviathan',
    setPieces: ['plaguePit', 'guardianHall', 'treasureVault'],
    subtitle: 'The marsh remembers everyone it swallowed.',
  },
  storm: {
    id: 'storm',
    name: 'The Storm Spire',
    ambientColor: 0x0a0e1e,
    primaryHazard: 'spikes',
    traps: true,
    roomShapes: ['circle', 'cross', 'hall'],
    decorKeys: ['storm-rod', 'sky-crystal', 'pillar', 'storm-orb'],
    enemies: ['storm_wisp', 'sky_lancer', 'storm_wisp', 'sky_lancer', 'imp', 'storm_wisp'],
    boss: 'tempest_herald',
    setPieces: ['crystalCluster', 'guardianHall', 'spikeGauntlet'],
    subtitle: 'Climb into the eye of the endless gale.',
  },
  shadow: {
    id: 'shadow',
    name: 'The Shadow Warren',
    ambientColor: 0x0a0612,
    primaryHazard: 'spikes',
    traps: true,
    roomShapes: ['cavern', 'rect', 'circle'],
    decorKeys: ['void-rift', 'skull-pike', 'bone-pile', 'rune-circle'],
    enemies: ['shadow_stalker', 'void_imp', 'shadow_stalker', 'ghost', 'void_imp', 'shadow_stalker'],
    boss: 'umbral_devourer',
    setPieces: ['guardianHall', 'treasureVault', 'spikeGauntlet'],
    subtitle: 'Where the light goes to be eaten.',
  },
  sanctum: {
    id: 'sanctum',
    name: 'Sanctum of the Undermaw',
    ambientColor: 0x14110a,
    primaryHazard: 'both',
    traps: true,
    roomShapes: ['cross', 'rect', 'hall', 'circle'],
    decorKeys: ['sanctum-glyph', 'brazier', 'pillar', 'idol', 'altar'],
    enemies: ['hollow_knight', 'void_imp', 'shadow_stalker', 'gladiator', 'brass_sentinel', 'hollow_knight'],
    boss: 'hollow_king',
    setPieces: ['guardianHall', 'treasureVault', 'arenaRing', 'spikeGauntlet'],
    subtitle: 'The last door before the hunger itself.',
  },
};

export function getTheme(id: ThemeId | undefined): ThemeDef {
  return THEMES[id ?? 'crypt'] ?? THEMES.crypt;
}
