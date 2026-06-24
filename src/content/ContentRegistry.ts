import { HEROES, ALL_CLASSES } from '../data/heroes';
import { ENEMIES } from '../data/enemies';
import { ITEMS } from '../data/items';
import { SKILLS } from '../data/skills';
import { LEVEL1 } from '../data/level1';
import { LEVEL2 } from '../data/level2';
import { TOWN } from '../data/town';
import { INTERIOR_TANKARD, INTERIOR_GUILD } from '../data/interiors';
import {
  LEVEL_FROST,
  LEVEL_TOXIC,
  LEVEL_CLOCKWORK,
  LEVEL_ARENA,
  LEVEL_BOG,
  LEVEL_STORM,
  LEVEL_SHADOW,
  LEVEL_SANCTUM,
} from '../data/customLevels';
import type {
  HeroClassDef,
  HeroClassId,
  EnemyDef,
  EnemyId,
  ItemDefinition,
  SkillDef,
  LevelData,
} from '../core/types';

// Central read-only lookup for all game content.
class Registry {
  readonly classes: HeroClassId[] = ALL_CLASSES;
  readonly levels: Record<string, LevelData> = {
    town: TOWN,
    interior_tankard: INTERIOR_TANKARD,
    interior_guild: INTERIOR_GUILD,
    sunken_crypt: LEVEL1,
    molten_deep: LEVEL2,
    frozen_cathedral: LEVEL_FROST,
    toxic_undercroft: LEVEL_TOXIC,
    clockwork_vault: LEVEL_CLOCKWORK,
    blood_arena: LEVEL_ARENA,
    drowned_bog: LEVEL_BOG,
    storm_spire: LEVEL_STORM,
    shadow_warren: LEVEL_SHADOW,
    undermaw_sanctum: LEVEL_SANCTUM,
  };
  readonly levelOrder: string[] = [
    'sunken_crypt',
    'molten_deep',
    'frozen_cathedral',
    'toxic_undercroft',
    'clockwork_vault',
    'blood_arena',
    'drowned_bog',
    'storm_spire',
    'shadow_warren',
    'undermaw_sanctum',
  ];

  /** Levels forged at runtime by the AI level forge (not part of the campaign). */
  private dynamic: Record<string, LevelData> = {};

  /** Items minted at runtime by the loot system (graded drops). */
  private minted: Record<string, ItemDefinition> = {};

  /** Register a one-off forged level so getLevel() can find it by id. */
  registerDynamic(level: LevelData): void {
    this.dynamic[level.id] = level;
  }

  /** Register a minted (dropped) item so item() can resolve it by id. */
  registerItem(item: ItemDefinition): void {
    this.minted[item.id] = item;
  }

  /** Bulk-register minted items (used when restoring a save). */
  registerItems(items: ItemDefinition[] | undefined): void {
    for (const it of items ?? []) if (it?.id) this.minted[it.id] = it;
  }

  /** All minted items currently known (persisted with saves). */
  mintedList(): ItemDefinition[] {
    return Object.values(this.minted);
  }

  /** Levels shown in the Level Select screen, in campaign order. */
  campaignLevels(): LevelData[] {
    return this.levelOrder.map((id) => this.levels[id]).filter(Boolean);
  }

  hero(id: HeroClassId): HeroClassDef {
    return HEROES[id];
  }

  enemy(id: EnemyId): EnemyDef {
    return ENEMIES[id];
  }

  item(id: string): ItemDefinition | undefined {
    return ITEMS[id] ?? this.minted[id];
  }

  skill(id: string): SkillDef | undefined {
    return SKILLS[id];
  }

  skillsForClass(id: HeroClassId): SkillDef[] {
    return HEROES[id].skillIds.map((sid) => SKILLS[sid]).filter(Boolean);
  }

  getLevel(id: string): LevelData {
    return this.dynamic[id] ?? this.levels[id] ?? LEVEL1;
  }

  /** Next level id in sequence, or null if this is the final level. */
  nextLevel(id: string): string | null {
    const i = this.levelOrder.indexOf(id);
    if (i < 0 || i >= this.levelOrder.length - 1) return null;
    return this.levelOrder[i + 1];
  }

  getMonsterSheetId(enemyId: EnemyId): string {
    return ENEMIES[enemyId]?.sheet ?? 'monster-grunt-sheet';
  }
}

export const Content = new Registry();
