/** Party-wide tactical assessment for hired allies and summons. */

export type SongId = 'war' | 'march' | 'hymn' | 'dirge';

export interface Vec {
  x: number;
  y: number;
}

export interface AllySnapshot extends Vec {
  alive: boolean;
  active?: boolean;
  healthRatio: () => number;
}

export interface FoeSnapshot extends Vec {
  active: boolean;
  alive?: boolean;
}

export interface PartySituation {
  aliveCount: number;
  avgHealth: number;
  minHealth: number;
  injuredCount: number;
  criticalCount: number;
  needsRez: boolean;
  threatNearLeader: number;
  closeThreats: number;
  partySpread: number;
  partyScattered: boolean;
  inCombat: boolean;
  inTown: boolean;
}

export interface TacticalContext {
  situation: PartySituation;
  /** Move toward this ally when supporting (hymn, warden, etc.). */
  supportTarget: Vec | null;
  /** Scales how eagerly a companion engages (0.5 = cautious, 1.2 = aggressive). */
  aggressionScale: number;
  /** Tighten follow/leash when the party needs to regroup. */
  regroup: boolean;
}

function dist(a: Vec, b: Vec): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function liveFoes(foes: FoeSnapshot[]): FoeSnapshot[] {
  return foes.filter((m) => m.active && m.alive !== false);
}

/** Snapshot the party's health, spacing, and nearby threats once per frame. */
export function assessPartySituation(
  allies: AllySnapshot[],
  leader: Vec | null,
  foes: FoeSnapshot[],
  inTown: boolean,
  scatterDist = 200
): PartySituation {
  const living = allies.filter((a) => a.alive && a.active !== false);
  const ratios = living.map((a) => a.healthRatio());
  const aliveCount = living.length;
  const avgHealth = ratios.length ? ratios.reduce((s, r) => s + r, 0) / ratios.length : 1;
  const minHealth = ratios.length ? Math.min(...ratios) : 1;
  const injuredCount = ratios.filter((r) => r < 0.55).length;
  const criticalCount = ratios.filter((r) => r < 0.35).length;
  const needsRez = allies.some((a) => a.active !== false && !a.alive);

  const live = liveFoes(foes);
  const threatNearLeader = leader
    ? live.filter((m) => dist(leader, m) < 220).length
    : 0;
  const closeThreats = leader
    ? live.filter((m) => dist(leader, m) < 110).length
    : live.filter((m) => dist({ x: 0, y: 0 }, m) < 110).length;

  let partySpread = 0;
  if (leader && living.length) {
    for (const a of living) partySpread = Math.max(partySpread, dist(leader, a));
  }
  const partyScattered = partySpread > scatterDist;
  const inCombat = threatNearLeader > 0;

  return {
    aliveCount,
    avgHealth,
    minHealth,
    injuredCount,
    criticalCount,
    needsRez,
    threatNearLeader,
    closeThreats,
    partySpread,
    partyScattered,
    inCombat,
    inTown,
  };
}

/** Pick the ally most in need of support (lowest HP ratio, alive only). */
export function pickSupportTarget(allies: AllySnapshot[]): AllySnapshot | null {
  let best: AllySnapshot | null = null;
  let worst = Infinity;
  for (const a of allies) {
    if (!a.alive || a.active === false) continue;
    const r = a.healthRatio();
    if (r < worst) {
      worst = r;
      best = a;
    }
  }
  return best && worst < 0.92 ? best : null;
}

/** Bard: weave between hymn, war, march, and dirge based on party needs. */
export function decideBardSong(s: PartySituation): SongId {
  const buckling =
    s.criticalCount > 0 ||
    s.minHealth < 0.42 ||
    (s.injuredCount >= 2 && s.avgHealth < 0.68);
  if (buckling) return 'hymn';

  if (s.inCombat) {
    if (s.minHealth < 0.58 || s.injuredCount >= 1) return 'hymn';
    if (s.closeThreats >= 3 || s.threatNearLeader >= 5) return 'dirge';
    if (s.closeThreats >= 1 || s.threatNearLeader >= 2) return 'war';
  }

  if (s.inTown) {
    if (s.minHealth < 0.75 || s.injuredCount > 0) return 'hymn';
    return 'march';
  }

  if (s.partyScattered && s.threatNearLeader === 0) return 'march';
  if (s.minHealth < 0.72 && s.injuredCount > 0) return 'hymn';
  if (s.threatNearLeader > 0) return s.closeThreats >= 2 ? 'dirge' : 'war';
  if (s.partyScattered) return 'march';
  return 'war';
}

/** Druid: bear to hold the line; human to mend and cast from safety. */
export function decideDruidBear(s: PartySituation, self: Vec, foes: FoeSnapshot[]): boolean {
  const live = liveFoes(foes);
  const nearSelf = live.filter((m) => dist(self, m) < 150);
  if (nearSelf.length === 0) return false;

  const meleePress = live.some((m) => dist(self, m) < 85);
  const partyHurt = s.minHealth < 0.5 || s.criticalCount > 0;

  if (meleePress) return true;
  if (partyHurt && !meleePress && nearSelf.every((m) => dist(self, m) > 110)) return false;
  return s.avgHealth > 0.45 || nearSelf.length >= 2;
}

/** Scale combat eagerness by class and situation. */
export function aggressionScale(s: PartySituation, classId: string): number {
  if (s.criticalCount > 0 || s.minHealth < 0.35) {
    if (classId === 'vanguard' || classId === 'druid') return 1.15;
    if (classId === 'thief' || classId === 'arcanist') return 0.75;
    return 0.85;
  }
  if (s.inCombat && s.avgHealth > 0.7) {
    if (classId === 'thief' || classId === 'arcanist' || classId === 'necromancer') return 1.1;
    if (classId === 'vanguard') return 1.2;
  }
  if (!s.inCombat && s.partyScattered) return 0.55;
  return 1;
}

/** Build per-frame tactical hints for companion movement. */
export function buildTacticalContext(
  allies: AllySnapshot[],
  leader: Vec | null,
  foes: FoeSnapshot[],
  inTown: boolean,
  activeSong: SongId | null,
  classId: string
): TacticalContext {
  const situation = assessPartySituation(allies, leader, foes, inTown);
  const support = pickSupportTarget(allies);
  const regroup =
    situation.partyScattered &&
    situation.threatNearLeader === 0 &&
    (activeSong === 'march' || classId === 'warden');
  let supportTarget: Vec | null = null;
  if (support) {
    if (classId === 'bard' && activeSong === 'hymn') supportTarget = support;
    else if (classId === 'warden' && support.healthRatio() < 0.8) supportTarget = support;
  }
  return {
    situation,
    supportTarget,
    aggressionScale: aggressionScale(situation, classId),
    regroup,
  };
}

/** Should a bard spend Encore on a nearby pack? */
export function bardWantsEncore(s: PartySituation, foesWithin90: number): boolean {
  if (foesWithin90 < 2) return false;
  if (s.minHealth < 0.35) return false;
  if (foesWithin90 >= 3) return true;
  return s.avgHealth > 0.55 && s.closeThreats >= 2;
}

/** Warden: step in when allies are hurt or someone needs resurrection. */
export function wardenWantsAbility(s: PartySituation, allyHurtNearby: boolean): boolean {
  if (s.needsRez) return allyHurtNearby;
  if (s.criticalCount > 0) return allyHurtNearby;
  if (s.minHealth < 0.55 || s.injuredCount >= 2) return allyHurtNearby;
  return allyHurtNearby && s.inCombat;
}

/** Vanguard Battle Roar: roar when pressed or protecting a buckling line. */
export function vanguardWantsRoar(s: PartySituation, foesWithin120: number): boolean {
  if (foesWithin120 >= 3) return true;
  if (foesWithin120 >= 2 && (s.minHealth < 0.6 || s.injuredCount >= 1)) return true;
  return false;
}

/** Arcanist Meteor: rain fire when packs cluster or the party is overwhelmed. */
export function arcanistWantsMeteor(s: PartySituation, foesWithin300: number): boolean {
  if (foesWithin300 >= 3) return true;
  if (foesWithin300 >= 2 && (s.threatNearLeader >= 3 || s.minHealth < 0.5)) return true;
  return false;
}

// ----------------------------------------------------------------------------
// Level-gated actives (secondary / tertiary / ultimate)
//
// These were wired to player input only, so a hired ally fought its whole career
// with the level-1 signature and nothing else — three quarters of every class
// kit sat unused. The rules below decide when spending one actually helps the
// PARTY rather than just making noise: gap-closers only when there is a gap,
// panic buttons only in a panic, and ultimates hoarded for a warden fight or a
// genuine emergency rather than burned on the first two grunts in a corridor.
// ----------------------------------------------------------------------------

export type ActiveSlotId = 'secondary' | 'tertiary' | 'ultimate';

/** What the battlefield looks like from one companion's own feet. */
export interface ActiveOpportunity {
  /** Live foes inside melee-ish range (~110px). */
  packNear: number;
  /** Live foes inside casting range (~240px). */
  packMid: number;
  /** Distance to the nearest live foe; Infinity when the field is clear. */
  nearestFoe: number;
  /** Distance to the nearest boss or champion; Infinity when there is none. */
  nearestElite: number;
  /** A realm warden is alive and in this fight. */
  bossFight: boolean;
  /** Usable corpses lying near the foes (Corpse Explosion needs bodies). */
  corpsesNear: number;
  /** Druid only: currently in bear form. */
  bearForm: boolean;
  selfHealth: number;
  selfMana: number;
}

/**
 * Pick the active a companion should spend right now, or null to hold.
 *
 * `ready` reports cooldown + unlock-level + mana for a slot, so this stays a
 * pure policy: it never asks whether an ability *can* fire, only whether it
 * *should*. Slots are tested best-first, so an ultimate wins over a secondary
 * in the same frame and the caller fires exactly one thing.
 */
export function chooseCompanionActive(
  classId: string,
  s: PartySituation,
  o: ActiveOpportunity,
  ready: (slot: ActiveSlotId) => boolean
): ActiveSlotId | null {
  // An ultimate is a once-a-fight card on a 40s cooldown. Spending it on a pair
  // of grunts means not having it for the warden, so it needs a real occasion.
  const bigMoment =
    o.bossFight ||
    o.packMid >= 5 ||
    s.criticalCount >= 2 ||
    (s.needsRez && s.inCombat) ||
    (s.minHealth < 0.3 && s.inCombat);

  switch (classId) {
    case 'vanguard':
      // Cataclysm wants bodies inside the ring, not just on the horizon.
      if (ready('ultimate') && bigMoment && o.packNear >= 2) return 'ultimate';
      // Battle Roar taunts: pull the pack off the casters before the line folds.
      if (ready('tertiary') && (o.packMid >= 3 || (s.minHealth < 0.6 && o.packNear >= 1))) return 'tertiary';
      // Ironclad Charge is a gap-closer — useless in melee, useless with no gap.
      if (ready('secondary') && o.nearestFoe > 90 && o.nearestFoe < 240) return 'secondary';
      return null;

    case 'warden':
      // Judgment is the party's panic button: mass heal, mass rez, mass stun.
      if (ready('ultimate') && (s.needsRez || s.criticalCount >= 2 || (s.minHealth < 0.32 && s.injuredCount >= 2))) return 'ultimate';
      // Consecration is a standing heal — worth the cast once the party digs in,
      // and a warden fight is the definition of digging in.
      if (ready('tertiary') && s.inCombat && (s.injuredCount >= 2 || s.avgHealth < 0.7 || (o.bossFight && s.injuredCount >= 1))) return 'tertiary';
      // Holy Smite: a cheap poke that also tops up whoever is worst off.
      if (ready('secondary') && o.nearestFoe < 420) return 'secondary';
      return null;

    case 'arcanist':
      if (ready('ultimate') && bigMoment && o.packMid >= 3) return 'ultimate';
      // Frost Nova is the mage's "get off me" — foes already inside her guard.
      if (ready('secondary') && o.packNear >= 2) return 'secondary';
      // Blink out only when something is in her face AND she is losing the trade.
      if (ready('tertiary') && o.nearestFoe < 70 && o.selfHealth < 0.6) return 'tertiary';
      return null;

    case 'necromancer':
      if (ready('ultimate') && bigMoment) return 'ultimate';
      // Corpse Explosion needs BOTH bodies to detonate and a pack standing in it.
      if (ready('secondary') && o.corpsesNear >= 2 && o.packMid >= 2) return 'secondary';
      // Bone Spear pierces a line — good at range, wasted point-blank.
      if (ready('tertiary') && o.nearestFoe > 40 && o.nearestFoe < 300) return 'tertiary';
      return null;

    case 'thief':
      // Phantom Assassination is a single-target execute: save it for the warden.
      if (ready('ultimate') && (o.bossFight || o.nearestElite < 320)) return 'ultimate';
      // Smoke Veil is a screen for the whole party, not a personal escape.
      if (ready('tertiary') && o.packMid >= 2 && (s.minHealth < 0.55 || s.criticalCount > 0)) return 'tertiary';
      // Shadow Step closes onto something the daggers can't reach yet — but only
      // in a fight the party is already having. Blinking 300px to a lone wanderer
      // teleports the thief out of formation and into an unexplored room.
      if (ready('secondary') && s.inCombat && o.nearestFoe > 80 && o.nearestFoe < 260) return 'secondary';
      return null;

    case 'bard':
      if (ready('ultimate') && bigMoment) return 'ultimate';
      // Rally buffs the party — spend it as a real fight opens, not on stragglers.
      if (ready('tertiary') && s.inCombat && (o.packMid >= 3 || s.threatNearLeader >= 3 || s.injuredCount >= 1)) return 'tertiary';
      if (ready('secondary') && o.packNear >= 2) return 'secondary';
      return null;

    case 'druid':
      if (ready('ultimate') && bigMoment && o.packMid >= 2) return 'ultimate';
      // Moonfire casts in either form and wants something clumped to land on.
      if (ready('tertiary') && o.nearestFoe < 360 && o.packMid >= 1) return 'tertiary';
      // Maul is a bear cleave (melee); Entangle roots a chaser at range.
      if (ready('secondary') && (o.bearForm ? o.nearestFoe < 70 : o.nearestFoe > 60 && o.nearestFoe < 240)) return 'secondary';
      return null;

    default:
      return null;
  }
}