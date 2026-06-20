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
  // crypt is the safe default (used by the two shipped levels when no theme is
  // set) — kept deliberately minimal so those levels render exactly as before.
  crypt: {
    id: 'crypt',
    name: 'Crypt',
    ambientColor: 0x0a0c16,
    primaryHazard: 'both',
    traps: false,
    roomShapes: ['rect'],
    decorKeys: [],
    enemies: ['grunt', 'ghost', 'grunt', 'demon', 'bone_archer'],
    boss: 'grave_warden',
    setPieces: [],
    subtitle: 'The dead do not rest easy here.',
  },
  molten: {
    id: 'molten',
    name: 'Molten Deep',
    ambientColor: 0x180a08,
    themeTint: 0xffb38a,
    primaryHazard: 'lava',
    traps: false,
    roomShapes: ['rect', 'cavern'],
    decorKeys: ['rubble', 'bones'],
    enemies: ['imp', 'bone_archer', 'demon', 'brute'],
    boss: 'molten_colossus',
    setPieces: ['guardianHall'],
    subtitle: 'Fire wells up from the world’s wound.',
  },
  frost: {
    id: 'frost',
    name: 'Frozen Cathedral',
    ambientColor: 0x0a1626,
    themeTint: 0x9fc4ff,
    primaryHazard: 'ice',
    traps: false,
    roomShapes: ['rect', 'circle', 'hall'],
    decorKeys: ['crystal', 'pillar', 'crystal'],
    enemies: ['ghost', 'bone_archer', 'grunt', 'ghost', 'demon', 'bone_archer'],
    boss: 'grave_warden',
    setPieces: ['frozenAltar', 'crystalCluster', 'treasureVault'],
    subtitle: 'Frostbound nave of the shattered choir.',
  },
  toxic: {
    id: 'toxic',
    name: 'Toxic Undercroft',
    ambientColor: 0x0c1a10,
    themeTint: 0x9fe0a0,
    primaryHazard: 'poison',
    traps: false,
    roomShapes: ['cavern', 'hall', 'rect', 'cavern'],
    decorKeys: ['vines', 'bones', 'rubble'],
    enemies: ['imp', 'grunt', 'brute', 'imp', 'bone_archer', 'brute'],
    boss: 'grave_warden',
    setPieces: ['plaguePit', 'guardianHall', 'treasureVault'],
    subtitle: 'Plague-drowned vaults beneath the city.',
  },
  clockwork: {
    id: 'clockwork',
    name: 'Clockwork Vault',
    ambientColor: 0x12131c,
    themeTint: 0xc8d0e6,
    primaryHazard: 'spikes',
    traps: true,
    roomShapes: ['rect', 'cross', 'hall'],
    decorKeys: ['cog', 'pillar', 'banner'],
    enemies: ['demon', 'brute', 'bone_archer', 'demon', 'imp', 'brute'],
    boss: 'molten_colossus',
    setPieces: ['spikeGauntlet', 'treasureVault', 'guardianHall'],
    subtitle: 'The guarded treasury of gears and greed.',
  },
  arena: {
    id: 'arena',
    name: 'The Blood Arena',
    ambientColor: 0x180a0c,
    themeTint: 0xff9a8a,
    primaryHazard: 'lava',
    traps: true,
    roomShapes: ['circle', 'rect', 'circle'],
    decorKeys: ['blood-stain', 'skull-pike', 'banner'],
    enemies: ['brute', 'demon', 'grunt', 'imp', 'brute', 'demon'],
    boss: 'molten_colossus',
    setPieces: ['arenaRing', 'spikeGauntlet'],
    subtitle: 'Bleed for the roar of the crowd.',
  },
};

export function getTheme(id: ThemeId | undefined): ThemeDef {
  return THEMES[id ?? 'crypt'] ?? THEMES.crypt;
}
