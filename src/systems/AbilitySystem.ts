import type { HeroClassId } from '../core/types';
import {
  CLASS_KITS,
  SIGIL_UNLOCK,
  MASTERY_LEVEL,
  sigilsForTier,
  activeFor,
} from '../data/abilities';
import type { SigilTier, ActiveSlot, SigilDef, ActiveAbilityDef } from '../data/abilities';

const TIERS: SigilTier[] = [1, 2, 3];

/**
 * Per-hero ability progression: which sigil is equipped in each tier. Unlocks
 * are purely a function of the hero's LEVEL (see the schedule in abilities.ts),
 * so nothing about "what is available" is stored here — only the player's
 * choices. Choosing/swapping a sigil is free and always allowed once its tier
 * is unlocked. Mirrors the shape of SkillSet / AttributeSet for consistency.
 */
export class AbilitySet {
  readonly classId: HeroClassId;
  /** tier -> equipped sigil id ('' = none chosen yet). */
  sigils: Record<SigilTier, string> = { 1: '', 2: '', 3: '' };

  constructor(classId: HeroClassId) {
    this.classId = classId;
  }

  tierUnlocked(tier: SigilTier, level: number): boolean {
    return level >= SIGIL_UNLOCK[tier];
  }

  /** Fill any newly-unlocked tier that has no chosen sigil with its first
   *  option, so a leveling hero always benefits from a rune without a trip to
   *  the menu. Returns true if anything changed. Safe to call every recompute. */
  applyDefaults(level: number): boolean {
    let changed = false;
    for (const tier of TIERS) {
      if (this.tierUnlocked(tier, level) && !this.sigils[tier]) {
        const first = sigilsForTier(this.classId, tier)[0];
        if (first) {
          this.sigils[tier] = first.id;
          changed = true;
        }
      }
    }
    return changed;
  }

  /** The sigil equipped in a tier (only if that tier is level-unlocked). */
  effectiveSigil(tier: SigilTier, level: number): string {
    return this.tierUnlocked(tier, level) ? this.sigils[tier] || '' : '';
  }

  /** Fast membership test for combat: is this sigil id currently active? */
  activeSigilSet(level: number): Set<string> {
    const s = new Set<string>();
    for (const tier of TIERS) {
      const id = this.effectiveSigil(tier, level);
      if (id) s.add(id);
    }
    return s;
  }

  chosenSigilDefs(level: number): SigilDef[] {
    const out: SigilDef[] = [];
    for (const tier of TIERS) {
      const id = this.effectiveSigil(tier, level);
      const def = id ? sigilsForTier(this.classId, tier).find((x) => x.id === id) : undefined;
      if (def) out.push(def);
    }
    return out;
  }

  /** Equip a sigil (validated to belong to this class + tier). */
  setSigil(tier: SigilTier, id: string): boolean {
    if (!sigilsForTier(this.classId, tier).some((s) => s.id === id)) return false;
    this.sigils[tier] = id;
    return true;
  }

  activeUnlocked(slot: ActiveSlot, level: number): boolean {
    return level >= activeFor(this.classId, slot).unlockLevel;
  }

  unlockedActives(level: number): ActiveAbilityDef[] {
    const slots: ActiveSlot[] = ['secondary', 'tertiary', 'ultimate'];
    return slots.map((s) => activeFor(this.classId, s)).filter((a) => level >= a.unlockLevel);
  }

  masteryUnlocked(level: number): boolean {
    return level >= MASTERY_LEVEL;
  }

  masteryId(): string {
    return CLASS_KITS[this.classId].mastery.id;
  }

  /** Sparse map for save data: only tiers with an explicit choice. */
  serialize(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const tier of TIERS) if (this.sigils[tier]) out[String(tier)] = this.sigils[tier];
    return out;
  }

  restore(data?: Record<string, string>): void {
    this.sigils = { 1: '', 2: '', 3: '' };
    if (!data) return;
    for (const tier of TIERS) {
      const id = data[String(tier)];
      // only accept ids that still belong to this class+tier (defends stale saves)
      if (id && sigilsForTier(this.classId, tier).some((s) => s.id === id)) this.sigils[tier] = id;
    }
  }
}
