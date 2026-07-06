// ----------------------------------------------------------------------------
// Monster difficulty scaling — realm depth is the primary driver; party level
// nudges stats so under- or over-leveled groups meet proportionate resistance.
// Party headcount adds another layer: a full roster faces the toughest foes.
// ----------------------------------------------------------------------------

import { ALL_CLASSES } from '../data/heroes';

export interface MonsterScale {
  hpMult: number;
  dmgMult: number;
  armorBonus: number;
}

const MAX_REALM_DEPTH = 9; // ten campaign realms, 0-indexed
const MAX_PARTY_LEVEL = 20;
const MAX_PARTY_SIZE = ALL_CLASSES.length;

/** Expected average party level for a realm (1 at realm I, 20 at realm X). */
function expectedLevelForDepth(depth: number): number {
  const d = Math.max(0, Math.min(MAX_REALM_DEPTH, depth));
  return 1 + (d / MAX_REALM_DEPTH) * (MAX_PARTY_LEVEL - 1);
}

/** Toughness bump from party headcount: solo ≈ baseline, full roster strongest. */
function partySizeAdjustment(partySize: number): number {
  const size = Math.max(1, Math.min(MAX_PARTY_SIZE, partySize));
  if (MAX_PARTY_SIZE <= 1) return 1;
  return 1 + ((size - 1) / (MAX_PARTY_SIZE - 1)) * 0.42;
}

/**
 * Scale monsters in campaign realms. Realm I stays approachable for fresh heroes;
 * realm X and its warden expect a full party at level 20.
 */
export function computeRealmMonsterScale(depth: number, partyLevel: number, partySize: number, isBoss = false): MonsterScale {
  const d = Math.max(0, Math.min(MAX_REALM_DEPTH, depth));
  const lvl = Math.max(1, Math.min(MAX_PARTY_LEVEL, partyLevel));
  const size = Math.max(1, Math.min(MAX_PARTY_SIZE, partySize));

  // depth 0 → 1.0×, depth 9 → ~2.8× fodder / ~3.6× warden
  const realmHp = 1 + d * (isBoss ? 0.29 : 0.2);
  const realmDmg = 1 + d * (isBoss ? 0.32 : 0.18);

  const expected = expectedLevelForDepth(d);
  const delta = lvl - expected;
  const partyAdj = 1 + Math.max(-0.18, Math.min(0.18, delta * 0.025));
  const sizeAdj = partySizeAdjustment(size);

  return {
    hpMult: realmHp * partyAdj * sizeAdj,
    dmgMult: realmDmg * partyAdj * sizeAdj,
    armorBonus: Math.floor(d * 0.45 + (isBoss ? 2 : 0) + (size - 1) * 0.2),
  };
}

/** Overworld encounter arenas — no realm depth, only party level and headcount. */
export function computeArenaMonsterScale(partyLevel: number, partySize: number): MonsterScale {
  const lvl = Math.max(1, Math.min(MAX_PARTY_LEVEL, partyLevel));
  const size = Math.max(1, Math.min(MAX_PARTY_SIZE, partySize));
  const sizeAdj = partySizeAdjustment(size);
  const curve = 1 + (lvl - 1) * 0.07;
  return {
    hpMult: curve * sizeAdj,
    dmgMult: (1 + (lvl - 1) * 0.055) * sizeAdj,
    armorBonus: Math.floor((lvl - 1) / 4 + (size - 1) * 0.2),
  };
}