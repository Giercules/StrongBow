import { ATTRIBUTES, ATTRIBUTE_IDS } from '../data/attributes';
import type { AttributeDef } from '../data/attributes';

// Per-hero attribute ranks and spendable attribute points.
export class AttributeSet {
  ranks: Record<string, number> = {};
  points = 0;

  constructor() {
    for (const id of ATTRIBUTE_IDS) this.ranks[id] = 0;
  }

  list(): AttributeDef[] {
    return ATTRIBUTE_IDS.map((id) => ATTRIBUTES[id]);
  }

  rank(id: string): number {
    return this.ranks[id] ?? 0;
  }

  maxRank(id: string): number {
    return ATTRIBUTES[id]?.maxRank ?? 0;
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
