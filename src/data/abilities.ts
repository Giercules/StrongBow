// ----------------------------------------------------------------------------
// StrongBow — Class Ability Expansion ("Echoes of the Undermaw")
//
// Level-gated growth for each class's signature kit. This file is PURE DATA:
// every sigil / active / mastery carries only metadata + an id. The mechanical
// effect keyed to that id lives in the combat layer:
//   - sigil modifiers .......... src/scenes/DungeonScene.ts  (sigilParams / useAbility)
//   - active-ability effects .... src/scenes/DungeonScene.ts  (ACTIVE_IMPL dispatch)
//   - mastery passives .......... Hero.recompute / DungeonScene.updateAuras
//
// Unlock cadence (per the design spec, spread so no two land on the same level):
//   L1  Core signature (F)            — always on, tuned by chosen sigils
//   L5  Tier 1 Sigil  (choose 1 of 3) — modifies the core ability
//   L8  Secondary active  (new key)
//   L10 Tier 2 Sigil  (choose 1 of 3)
//   L13 Tertiary active   (new key)
//   L16 Ultimate active   (new key)  — spectacular, long cooldown
//   L18 Tier 3 Sigil  (choose 1 of 3) — capstone rune
//   L20 Mastery passive              — permanent aura + visual ascension
// ----------------------------------------------------------------------------

import type { HeroClassId } from '../core/types';

export type SigilTier = 1 | 2 | 3;
export type ActiveSlot = 'secondary' | 'tertiary' | 'ultimate';
export type PlaystyleTag = 'offensive' | 'defensive' | 'utility' | 'hybrid';

/** Level at which each sigil tier's choice unlocks. */
export const SIGIL_UNLOCK: Record<SigilTier, number> = { 1: 5, 2: 10, 3: 18 };
/** Level at which the level-20 mastery passive comes online. */
export const MASTERY_LEVEL = 20;

export interface SigilDef {
  id: string;
  classId: HeroClassId;
  tier: SigilTier;
  name: string;
  description: string;
  icon: string;
  tag: PlaystyleTag;
}

export interface ActiveAbilityDef {
  id: string;
  classId: HeroClassId;
  slot: ActiveSlot;
  unlockLevel: number;
  name: string;
  description: string;
  icon: string;
  /** Base cooldown in ms (reduced by the hero's cdr stat). */
  cooldown: number;
  /** Mana spent on use (0 for purely physical abilities). */
  manaCost: number;
}

export interface MasteryDef {
  id: string;
  classId: HeroClassId;
  unlockLevel: number;
  name: string;
  description: string;
  icon: string;
}

export interface ClassKit {
  classId: HeroClassId;
  coreName: string;
  coreDescription: string;
  /** 9 sigils: 3 per tier. */
  sigils: SigilDef[];
  secondary: ActiveAbilityDef;
  tertiary: ActiveAbilityDef;
  ultimate: ActiveAbilityDef;
  mastery: MasteryDef;
}

// Small helpers to keep the big literal below readable.
const sig = (id: string, classId: HeroClassId, tier: SigilTier, name: string, description: string, tag: PlaystyleTag, icon: string): SigilDef =>
  ({ id, classId, tier, name, description, tag, icon });
const act = (id: string, classId: HeroClassId, slot: ActiveSlot, unlockLevel: number, name: string, description: string, cooldown: number, manaCost: number, icon: string): ActiveAbilityDef =>
  ({ id, classId, slot, unlockLevel, name, description, cooldown, manaCost, icon });
const mast = (id: string, classId: HeroClassId, name: string, description: string, icon: string): MasteryDef =>
  ({ id, classId, unlockLevel: MASTERY_LEVEL, name, description, icon });

export const CLASS_KITS: Record<HeroClassId, ClassKit> = {
  // ---- Vanguard — The Earthshaker ------------------------------------------
  vanguard: {
    classId: 'vanguard',
    coreName: 'Seismic Slam',
    coreDescription: 'Slam the ground: a shockwave that flings foes back, stuns, and steels you.',
    sigils: [
      sig('van_sig_aftershock', 'vanguard', 1, 'Aftershock', 'The slam leaves pulsing fissures that keep quaking and chill foes.', 'offensive', 'icon-staff'),
      sig('van_sig_irongrip', 'vanguard', 1, 'Iron Grip', 'Knockback becomes a hard PULL; slammed foes take +25% damage.', 'utility', 'icon-ring'),
      sig('van_sig_bulwark', 'vanguard', 1, 'Bulwark', 'The slam shields you and nearby allies and softens incoming blows.', 'defensive', 'icon-armor'),
      sig('van_sig_tremor', 'vanguard', 2, 'Tremor', 'A wider, heavier quake — +40% slam radius and damage.', 'offensive', 'icon-sword'),
      sig('van_sig_quakeheart', 'vanguard', 2, 'Quakeheart', 'Each foe struck mends you and stacks a shard of armor.', 'defensive', 'icon-amulet'),
      sig('van_sig_concussion', 'vanguard', 2, 'Concussion', 'The slam truly STUNS everything caught and leaves them shaken.', 'utility', 'icon-mace'),
      sig('van_sig_fault', 'vanguard', 3, 'Faultline', 'A fissure races to the farthest foe for a second devastating hit.', 'offensive', 'icon-staff'),
      sig('van_sig_adamant', 'vanguard', 3, 'Adamant', 'Steelskin doubled; a share of blocked damage is reflected back.', 'defensive', 'icon-armor'),
      sig('van_sig_upheaval', 'vanguard', 3, 'Upheaval', 'Foes are hurled up and stunned, then a delayed second quake lands.', 'hybrid', 'icon-mace'),
    ],
    secondary: act('van_charge', 'vanguard', 'secondary', 8, 'Ironclad Charge', 'Barrel forward, trampling and stunning foes, ending in a mini-slam.', 12000, 0, 'icon-boots'),
    tertiary: act('van_roar', 'vanguard', 'tertiary', 13, 'Battle Roar', 'A thunderous roar taunts nearby foes and hardens the whole party.', 16000, 0, 'icon-mace'),
    ultimate: act('van_cataclysm', 'vanguard', 'ultimate', 16, 'Cataclysm Slam', 'A screen-shaking quake: massive damage, long stun, and party Steelskin.', 42000, 0, 'icon-sword'),
    mastery: mast('van_mastery', 'vanguard', 'Unbreakable', 'A permanent Steelskin aura guards you and nearby allies; +5% damage reduction.', 'icon-armor'),
  },

  // ---- Thief — The Shadowblade ---------------------------------------------
  thief: {
    classId: 'thief',
    coreName: 'Shadowmeld',
    coreDescription: 'Melt into shadow — your next strike from stealth is a guaranteed backstab.',
    sigils: [
      sig('str_sig_nightstalker', 'thief', 1, 'Night Stalker', 'Backstabs bite far deeper and refund a sliver of your stealth.', 'offensive', 'icon-bow'),
      sig('str_sig_venomblade', 'thief', 1, 'Venomblade', 'Backstabs coat foes in stacking poison that spreads on a kill.', 'offensive', 'icon-staff'),
      sig('str_sig_ghost', 'thief', 1, 'Ghost', 'Stealth grants dodge; breaking it with a backstab briefly shields you.', 'defensive', 'icon-ring'),
      sig('str_sig_exposure', 'thief', 2, 'Exposure', 'Backstabs leave the target vulnerable — everyone hits them harder.', 'utility', 'icon-ring'),
      sig('str_sig_deathmark', 'thief', 2, 'Deathmark', 'Critical strikes open deep BLEEDS that drain foes over time.', 'offensive', 'icon-sword'),
      sig('str_sig_shadowdance', 'thief', 2, 'Shadow Dance', 'Backstabs surge your speed and quicken your next strikes.', 'utility', 'icon-boots'),
      sig('str_sig_massacre', 'thief', 3, 'Massacre', 'Backstabs spray lethal splash into every foe crowding the target.', 'offensive', 'icon-sword'),
      sig('str_sig_umbral', 'thief', 3, 'Umbral Return', 'Slaying a poisoned or bleeding foe drops you back into shadow.', 'defensive', 'icon-ring'),
      sig('str_sig_assassinate', 'thief', 3, 'Assassinate', 'Backstabs execute foes already below a quarter of their health.', 'hybrid', 'icon-bow'),
    ],
    secondary: act('str_shadowstep', 'thief', 'secondary', 8, 'Shadow Step', 'Blink to the nearest foe from the dark, arriving on a guaranteed backstab.', 9000, 0, 'icon-boots'),
    tertiary: act('str_smoke', 'thief', 'tertiary', 13, 'Smoke Veil', 'A blinding cloud that slows foes and cloaks allies who stand within.', 15000, 0, 'icon-scroll'),
    ultimate: act('str_phantom', 'thief', 'ultimate', 16, 'Phantom Assassination', 'Mark a foe, chain-blink through them, and unleash all your wounds at once.', 40000, 0, 'icon-bow'),
    mastery: mast('str_mastery', 'thief', 'Master of Shadows', 'Ever-wreathed in shadow: greatly increased crit while stealthed or flanking.', 'icon-ring'),
  },

  // ---- Arcanist — The Meteorcaller -----------------------------------------
  arcanist: {
    classId: 'arcanist',
    coreName: 'Meteor',
    coreDescription: 'Call a fiery meteor down on the nearest cluster, burning all it catches.',
    sigils: [
      sig('arc_sig_incinerate', 'arcanist', 1, 'Incineration', 'Burns rage longer and hotter, leaping to another foe nearby.', 'offensive', 'icon-staff'),
      sig('arc_sig_crater', 'arcanist', 1, 'Impact Crater', 'The meteor leaves a molten crater that scorches and chills foes.', 'utility', 'icon-staff'),
      sig('arc_sig_starfall', 'arcanist', 1, 'Starfall', 'A tighter, far heavier strike — melts single targets and bosses.', 'offensive', 'icon-amulet'),
      sig('arc_sig_conflagration', 'arcanist', 2, 'Conflagration', 'A greater meteor: +45% damage and blast radius.', 'offensive', 'icon-staff'),
      sig('arc_sig_frostmeteor', 'arcanist', 2, 'Frostfall', 'Ice rides the flame — the blast chills and briefly roots foes.', 'utility', 'icon-amulet'),
      sig('arc_sig_meltdown', 'arcanist', 2, 'Meltdown', 'Burning foes detonate when they die, spreading the fire.', 'offensive', 'icon-staff'),
      sig('arc_sig_twinstar', 'arcanist', 3, 'Twin Star', 'The meteor splits, calling a second strike beside the first.', 'offensive', 'icon-staff'),
      sig('arc_sig_singularity', 'arcanist', 3, 'Singularity', 'The meteor drags foes into its heart before it erupts.', 'utility', 'icon-amulet'),
      sig('arc_sig_firestorm', 'arcanist', 3, 'Firestorm', 'The impact births a lingering firestorm that rains embers.', 'hybrid', 'icon-staff'),
    ],
    secondary: act('arc_frostnova', 'arcanist', 'secondary', 8, 'Frost Nova', 'A ring of cold that freezes foes solid and leaves a slowing ice field.', 8000, 18, 'icon-amulet'),
    tertiary: act('arc_blink', 'arcanist', 'tertiary', 13, 'Blink', 'Wink across a short distance, untouchable for the blink of an eye.', 10000, 12, 'icon-boots'),
    ultimate: act('arc_armageddon', 'arcanist', 'ultimate', 16, 'Armageddon', 'A storm of meteors rains across a wide swath — annihilation and craters.', 40000, 45, 'icon-staff'),
    mastery: mast('arc_mastery', 'arcanist', 'Archmage of the Undermaw', 'Runes orbit your staff: +spell power, and ability hits empower your next spell.', 'icon-staff'),
  },

  // ---- Warden — The Lightbringer --------------------------------------------
  warden: {
    classId: 'warden',
    coreName: 'Sanctuary',
    coreDescription: 'A radiant zone that heals the party, smites foes, and can raise the fallen.',
    sigils: [
      sig('war_sig_radiance', 'warden', 1, 'Radiance', 'Sanctuary heals for far more and leaves a lingering mending light.', 'defensive', 'icon-amulet'),
      sig('war_sig_wrath', 'warden', 1, 'Wrath', 'The smite blazes harder and marks foes to take extra holy damage.', 'offensive', 'icon-mace'),
      sig('war_sig_aegis', 'warden', 1, 'Aegis', 'Allies within leave girded by a shield; you gain lasting protection.', 'defensive', 'icon-armor'),
      sig('war_sig_grace', 'warden', 2, 'Grace', 'Sanctuary also restores mana and washes away harmful effects.', 'utility', 'icon-ring'),
      sig('war_sig_condemn', 'warden', 2, 'Condemn', 'The light STUNS foes caught within and leaves them vulnerable.', 'offensive', 'icon-mace'),
      sig('war_sig_bastion', 'warden', 2, 'Bastion', 'Stronger shields that lash back a portion of damage absorbed.', 'defensive', 'icon-armor'),
      sig('war_sig_dawn', 'warden', 3, 'Dawnbreak', 'A vast radius and a searing holy nova at the moment it forms.', 'offensive', 'icon-mace'),
      sig('war_sig_sanctified', 'warden', 3, 'Sanctified Ground', 'Hallowed ground remains, harming foes and mending allies who hold it.', 'utility', 'icon-amulet'),
      sig('war_sig_martyr', 'warden', 3, 'Martyrdom', 'Sanctuary revives every fallen ally nearby, not just one.', 'hybrid', 'icon-amulet'),
    ],
    secondary: act('war_smite', 'warden', 'secondary', 8, 'Holy Smite', 'A bolt of light spears a foe and mends your most wounded ally.', 6000, 15, 'icon-mace'),
    tertiary: act('war_consecration', 'warden', 'tertiary', 13, 'Consecration', 'Hallow the ground: it burns the wicked and steadily heals the faithful.', 15000, 20, 'icon-amulet'),
    ultimate: act('war_apocalypse', 'warden', 'ultimate', 16, 'Judgment', 'A realm-wide heal and smite: the party surges, the wicked are stunned.', 40000, 40, 'icon-mace'),
    mastery: mast('war_mastery', 'warden', 'Living Saint', 'A gentle halo mends nearby allies always and smites undead and demons harder.', 'icon-amulet'),
  },

  // ---- Necromancer — The Gravebinder ---------------------------------------
  necromancer: {
    classId: 'necromancer',
    coreName: 'Raise Dead',
    coreDescription: 'Raise Tank, Archer, Mage or Thief servants to fight at your side.',
    sigils: [
      sig('nec_sig_unholy', 'necromancer', 1, 'Unholy', 'Your servants leech life and burst with dark energy when they fall.', 'offensive', 'icon-amulet'),
      sig('nec_sig_skeletal', 'necromancer', 1, 'Skeletal Horde', 'Command one more servant; each rises a touch swifter and cheaper.', 'utility', 'icon-amulet'),
      sig('nec_sig_soulflame', 'necromancer', 1, 'Soulflame', 'Servant strikes sear with soulfire, burning and chilling the living.', 'offensive', 'icon-staff'),
      sig('nec_sig_command', 'necromancer', 2, 'Legion Command', 'Servants march faster, endure longer, and strike appreciably harder.', 'utility', 'icon-amulet'),
      sig('nec_sig_curse', 'necromancer', 2, 'Curse Weaver', 'Your legion radiates a curse — nearby foes take far more damage.', 'offensive', 'icon-staff'),
      sig('nec_sig_bonearmor', 'necromancer', 2, 'Bone Armor', 'Each raising wraps you in a shield of whirling bone.', 'defensive', 'icon-armor'),
      sig('nec_sig_legion', 'necromancer', 3, 'Grand Legion', 'Command yet another servant; some rise as empowered elites.', 'utility', 'icon-amulet'),
      sig('nec_sig_pestilence', 'necromancer', 3, 'Pestilence', 'Servant hits spread a poison that leaps between the living.', 'offensive', 'icon-staff'),
      sig('nec_sig_soulharvest', 'necromancer', 3, 'Soul Harvest', 'Every kill your legion claims mends you and returns mana.', 'hybrid', 'icon-amulet'),
    ],
    secondary: act('nec_corpseburst', 'necromancer', 'secondary', 8, 'Corpse Explosion', 'Detonate the fallen in a burst of shadow flame that scours a whole pack.', 7000, 15, 'icon-staff'),
    tertiary: act('nec_bonespear', 'necromancer', 'tertiary', 13, 'Bone Spear', 'Hurl a jagged spear of bone that pierces clean through a line of foes.', 8000, 15, 'icon-staff'),
    ultimate: act('nec_army', 'necromancer', 'ultimate', 16, 'Army of the Dead', 'Tear a legion from the earth and set your whole host into a frenzy.', 45000, 45, 'icon-amulet'),
    mastery: mast('nec_mastery', 'necromancer', 'Lich Lord', 'Skulls orbit you; your servants inherit your power and heal you as they slay.', 'icon-amulet'),
  },

  // ---- Bard — The Skald of Storms ------------------------------------------
  bard: {
    classId: 'bard',
    coreName: 'Songs & Encore',
    coreDescription: 'Hold a song aura that empowers the party; tap for an Encore power chord.',
    sigils: [
      sig('brd_sig_echoes', 'bard', 1, 'Echoes', 'When you change songs the old refrain lingers, overlapping for a time.', 'utility', 'icon-scroll'),
      sig('brd_sig_discord', 'bard', 1, 'Discord', 'Your melody frays enemy nerves, leaving foes in the aura vulnerable.', 'offensive', 'icon-sword'),
      sig('brd_sig_harmony', 'bard', 1, 'Harmony', 'Every ally sharing your song makes all of its effects ring stronger.', 'defensive', 'icon-amulet'),
      sig('brd_sig_crescendo', 'bard', 2, 'Crescendo', 'The Encore chord hits far harder and stuns everything it staggers.', 'offensive', 'icon-sword'),
      sig('brd_sig_ballad', 'bard', 2, 'Ballad', 'Your song also wraps allies in a small shield and steady regen.', 'defensive', 'icon-amulet'),
      sig('brd_sig_resonance', 'bard', 2, 'Resonance', 'An Encore refreshes and widens your current song as it rings out.', 'utility', 'icon-scroll'),
      sig('brd_sig_finale', 'bard', 3, 'Finale', 'The Encore spends your song for a great burst of its own element.', 'offensive', 'icon-staff'),
      sig('brd_sig_anthemic', 'bard', 3, 'Anthemic', 'A commanding presence — all of your song auras swell by half again.', 'hybrid', 'icon-scroll'),
      sig('brd_sig_dissonance', 'bard', 3, 'Dissonance', 'The Encore terrifies foes and opens bleeding wounds across the pack.', 'offensive', 'icon-sword'),
    ],
    secondary: act('brd_dance', 'bard', 'secondary', 8, 'Dance of Blades', 'A whirling rapier flourish that strikes all around and rides your song.', 9000, 0, 'icon-sword'),
    tertiary: act('brd_rally', 'bard', 'tertiary', 13, 'Inspiring Rally', 'A rousing call: the whole party surges with damage, guard, and vigor.', 18000, 0, 'icon-scroll'),
    ultimate: act('brd_symphony', 'bard', 'ultimate', 16, 'Symphony of the Undermaw', 'Play every song at once and lift the party to towering heights.', 40000, 0, 'icon-scroll'),
    mastery: mast('brd_mastery', 'bard', 'Maestro', 'Floating notes trail you; your songs may crit-inspire and you grow with your audience.', 'icon-scroll'),
  },

  // ---- Druid — The Wildshaper ----------------------------------------------
  druid: {
    classId: 'druid',
    coreName: 'Wild Shape',
    coreDescription: 'Shift between a moonlit nature caster and a mauling Great Bear.',
    sigils: [
      sig('dru_sig_primalbear', 'druid', 1, 'Primal Bear', 'The bear grows mightier — more armor, more health, heavier claws.', 'offensive', 'icon-sword'),
      sig('dru_sig_mooncaller', 'druid', 1, 'Mooncaller', 'Your nature bolts strike harder and chill the foes they find.', 'offensive', 'icon-staff'),
      sig('dru_sig_feral', 'druid', 1, 'Feral Guardian', 'Both forms mend as they fight, and each shift steadies your footing.', 'defensive', 'icon-amulet'),
      sig('dru_sig_thornhide', 'druid', 2, 'Thornhide', 'Bristling thorns wound attackers in either shape.', 'defensive', 'icon-armor'),
      sig('dru_sig_lunar', 'druid', 2, 'Lunar Tide', 'Bolts root foes in moonlight; the bear’s roar drags their gaze to you.', 'utility', 'icon-staff'),
      sig('dru_sig_wildblood', 'druid', 2, 'Wild Blood', 'Shifting forms mends more of your wounds and lends a burst of speed.', 'hybrid', 'icon-boots'),
      sig('dru_sig_apex', 'druid', 3, 'Apex Predator', 'Shifting into bear crashes down a shockwave of earth and fang.', 'offensive', 'icon-sword'),
      sig('dru_sig_eclipse', 'druid', 3, 'Eclipse', 'Nature bolts pierce through foes and call a moonbeam from above.', 'offensive', 'icon-staff'),
      sig('dru_sig_balance', 'druid', 3, 'Balance', 'You keep a measure of both forms’ gifts no matter which you wear.', 'hybrid', 'icon-amulet'),
    ],
    secondary: act('dru_maul', 'druid', 'secondary', 8, 'Maul / Entangle', 'In bear, a bleeding cleave; in human form, roots that bind a foe fast.', 9000, 0, 'icon-sword'),
    tertiary: act('dru_moonfire', 'druid', 'tertiary', 13, 'Moonfire', 'A blast of moonlight in any form — searing damage that lingers and chills.', 10000, 12, 'icon-staff'),
    ultimate: act('dru_avatar', 'druid', 'ultimate', 16, 'Primal Avatar', 'Swell into a towering avatar of the wild and stomp the earth apart.', 40000, 20, 'icon-sword'),
    mastery: mast('dru_mastery', 'druid', 'Archdruid of the Undermaw', 'Both shapes grow stronger and a living aura mends and thorns your allies.', 'icon-amulet'),
  },
};

// ---- Lookups ---------------------------------------------------------------

export const ALL_SIGILS: SigilDef[] = Object.values(CLASS_KITS).flatMap((k) => k.sigils);
export const SIGILS_BY_ID: Record<string, SigilDef> = Object.fromEntries(ALL_SIGILS.map((s) => [s.id, s]));

export const ALL_ACTIVES: ActiveAbilityDef[] = Object.values(CLASS_KITS).flatMap((k) => [k.secondary, k.tertiary, k.ultimate]);
export const ACTIVES_BY_ID: Record<string, ActiveAbilityDef> = Object.fromEntries(ALL_ACTIVES.map((a) => [a.id, a]));

export const MASTERIES_BY_ID: Record<string, MasteryDef> = Object.fromEntries(
  Object.values(CLASS_KITS).map((k) => [k.mastery.id, k.mastery])
);

/** The three sigils offered for a class at a given tier. */
export function sigilsForTier(classId: HeroClassId, tier: SigilTier): SigilDef[] {
  return CLASS_KITS[classId].sigils.filter((s) => s.tier === tier);
}

/** The active ability a class binds to a given slot. */
export function activeFor(classId: HeroClassId, slot: ActiveSlot): ActiveAbilityDef {
  const k = CLASS_KITS[classId];
  return slot === 'secondary' ? k.secondary : slot === 'tertiary' ? k.tertiary : k.ultimate;
}

export interface UnlockRow {
  level: number;
  kind: 'core' | 'sigil' | 'secondary' | 'tertiary' | 'ultimate' | 'mastery';
  tier?: SigilTier;
  name: string;
  description: string;
}

/** The full level-ordered unlock schedule for a class (drives the growth screen). */
export function unlockSchedule(classId: HeroClassId): UnlockRow[] {
  const k = CLASS_KITS[classId];
  const rows: UnlockRow[] = [
    { level: 1, kind: 'core', name: k.coreName, description: k.coreDescription },
    { level: SIGIL_UNLOCK[1], kind: 'sigil', tier: 1, name: 'Tier I Sigil', description: 'Choose one rune to reshape your signature.' },
    { level: k.secondary.unlockLevel, kind: 'secondary', name: k.secondary.name, description: k.secondary.description },
    { level: SIGIL_UNLOCK[2], kind: 'sigil', tier: 2, name: 'Tier II Sigil', description: 'A second rune deepens your build.' },
    { level: k.tertiary.unlockLevel, kind: 'tertiary', name: k.tertiary.name, description: k.tertiary.description },
    { level: k.ultimate.unlockLevel, kind: 'ultimate', name: k.ultimate.name, description: k.ultimate.description },
    { level: SIGIL_UNLOCK[3], kind: 'sigil', tier: 3, name: 'Tier III Sigil', description: 'A capstone rune of true power.' },
    { level: k.mastery.unlockLevel, kind: 'mastery', name: k.mastery.name, description: k.mastery.description },
  ];
  return rows.sort((a, b) => a.level - b.level);
}
