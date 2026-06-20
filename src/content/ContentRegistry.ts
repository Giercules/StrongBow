import { HEROES, ALL_CLASSES } from '../data/heroes';
import { ENEMIES } from '../data/enemies';
import { ITEMS } from '../data/items';
import { SKILLS } from '../data/skills';
import { LEVEL1 } from '../data/level1';
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
  readonly levels: Record<string, LevelData> = { sunken_crypt: LEVEL1 };

  hero(id: HeroClassId): HeroClassDef {
    return HEROES[id];
  }

  enemy(id: EnemyId): EnemyDef {
    return ENEMIES[id];
  }

  item(id: string): ItemDefinition | undefined {
    return ITEMS[id];
  }

  skill(id: string): SkillDef | undefined {
    return SKILLS[id];
  }

  skillsForClass(id: HeroClassId): SkillDef[] {
    return HEROES[id].skillIds.map((sid) => SKILLS[sid]).filter(Boolean);
  }

  getLevel(id: string): LevelData {
    return this.levels[id] ?? LEVEL1;
  }

  getMonsterSheetId(enemyId: EnemyId): string {
    return ENEMIES[enemyId]?.sheet ?? 'monster-grunt-sheet';
  }
}

export const Content = new Registry();
