// ----------------------------------------------------------------------------
// Loot bonus scaling — mirrors realm / party progression so deeper, harder
// fights pay out more gold, drop more often, and roll higher-grade gear.
// ----------------------------------------------------------------------------

export interface LootScale {
  /** Multiplier on gold pickup values. */
  goldMult: number;
  /** Multiplier on gear / scroll drop probabilities. */
  dropMult: number;
  /** Added to the party's best luck when rolling item grades. */
  luckBonus: number;
}

const MAX_REALM_DEPTH = 9;
const MAX_PARTY_LEVEL = 20;

function expectedLevelForDepth(depth: number): number {
  const d = Math.max(0, Math.min(MAX_REALM_DEPTH, depth));
  return 1 + (d / MAX_REALM_DEPTH) * (MAX_PARTY_LEVEL - 1);
}

/** Campaign realm loot — depth is the main driver; party level nudges rewards. */
export function computeRealmLootScale(depth: number, partyLevel: number): LootScale {
  const d = Math.max(0, Math.min(MAX_REALM_DEPTH, depth));
  const lvl = Math.max(1, Math.min(MAX_PARTY_LEVEL, partyLevel));

  // depth 0 → 1.0×, depth 9 → ~2.5× gold / ~1.7× drops
  const realmGold = 1 + d * 0.17;
  const realmDrop = 1 + d * 0.08;
  const realmLuck = d * 3;

  const expected = expectedLevelForDepth(d);
  const delta = lvl - expected;
  const partyAdj = 1 + Math.max(-0.12, Math.min(0.12, delta * 0.02));

  return {
    goldMult: realmGold * partyAdj,
    dropMult: realmDrop * partyAdj,
    luckBonus: realmLuck + (lvl - 1) * 1.2,
  };
}

/** Overworld encounters and non-realm maps — scale from party level only. */
export function computeArenaLootScale(partyLevel: number): LootScale {
  const lvl = Math.max(1, Math.min(MAX_PARTY_LEVEL, partyLevel));
  return {
    goldMult: 1 + (lvl - 1) * 0.06,
    dropMult: 1 + (lvl - 1) * 0.03,
    luckBonus: (lvl - 1) * 1.5,
  };
}