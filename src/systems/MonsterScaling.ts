// ----------------------------------------------------------------------------
// Monster difficulty scaling — realm depth is the primary driver; party level
// nudges stats so under- or over-leveled groups meet proportionate resistance.
// ----------------------------------------------------------------------------

export interface MonsterScale {
  hpMult: number;
  dmgMult: number;
  armorBonus: number;
}

const MAX_REALM_DEPTH = 9; // ten campaign realms, 0-indexed
const MAX_PARTY_LEVEL = 20;

/** Expected average party level for a realm (1 at realm I, 20 at realm X). */
function expectedLevelForDepth(depth: number): number {
  const d = Math.max(0, Math.min(MAX_REALM_DEPTH, depth));
  return 1 + (d / MAX_REALM_DEPTH) * (MAX_PARTY_LEVEL - 1);
}

/**
 * Scale monsters in campaign realms. Realm I stays approachable for fresh heroes;
 * realm X and its warden expect a full party at level 20.
 */
export function computeRealmMonsterScale(depth: number, partyLevel: number, isBoss = false): MonsterScale {
  const d = Math.max(0, Math.min(MAX_REALM_DEPTH, depth));
  const lvl = Math.max(1, Math.min(MAX_PARTY_LEVEL, partyLevel));

  // depth 0 → 1.0×, depth 9 → ~2.8× fodder / ~3.6× warden
  const realmHp = 1 + d * (isBoss ? 0.29 : 0.2);
  const realmDmg = 1 + d * (isBoss ? 0.32 : 0.18);

  const expected = expectedLevelForDepth(d);
  const delta = lvl - expected;
  const partyAdj = 1 + Math.max(-0.18, Math.min(0.18, delta * 0.025));

  return {
    hpMult: realmHp * partyAdj,
    dmgMult: realmDmg * partyAdj,
    armorBonus: Math.floor(d * 0.45 + (isBoss ? 2 : 0)),
  };
}

/** Overworld encounter arenas — no realm depth, only party level. */
export function computeArenaMonsterScale(partyLevel: number): MonsterScale {
  const lvl = Math.max(1, Math.min(MAX_PARTY_LEVEL, partyLevel));
  const curve = 1 + (lvl - 1) * 0.07;
  return {
    hpMult: curve,
    dmgMult: 1 + (lvl - 1) * 0.055,
    armorBonus: Math.floor((lvl - 1) / 4),
  };
}