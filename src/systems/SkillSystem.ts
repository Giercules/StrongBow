import type { HeroClassId, SkillDef } from '../core/types';
import { HEROES } from '../data/heroes';
import { SKILLS } from '../data/skills';

// Per-hero skill ranks and available points.
export class SkillSet {
  readonly classId: HeroClassId;
  ranks: Record<string, number> = {};
  points = 0;

  constructor(classId: HeroClassId) {
    this.classId = classId;
    for (const id of HEROES[classId].skillIds) this.ranks[id] = 0;
  }

  list(): SkillDef[] {
    return HEROES[this.classId].skillIds.map((id) => SKILLS[id]).filter(Boolean);
  }

  rank(id: string): number {
    return this.ranks[id] ?? 0;
  }

  maxRank(id: string): number {
    return SKILLS[id]?.maxRank ?? 0;
  }

  canUpgrade(id: string): boolean {
    return this.points > 0 && id in this.ranks && this.rank(id) < this.maxRank(id);
  }

  upgrade(id: string): boolean {
    if (!this.canUpgrade(id)) return false;
    this.ranks[id]++;
    this.points--;
    return true;
  }

  grantPoint(n = 1): void {
    this.points += n;
  }
}
