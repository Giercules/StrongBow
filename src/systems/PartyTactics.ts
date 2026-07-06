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