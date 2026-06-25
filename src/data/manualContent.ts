import { HERO_LORE } from './heroLore';
import { HEROES, ALL_CLASSES } from './heroes';
import { ENEMIES, ENEMY_IDS } from './enemies';
import { ALL_ITEMS } from './items';
import { ALL_THEME_BASES } from './themedItems';
import { describeItemStats } from './pickupInfo';
import type { EnemyId } from '../core/types';

export interface ManualEntry {
  icon: string; // texture key
  frame?: number; // frame index for sheet textures
  scale?: number;
  title: string;
  tag?: string; // small coloured stat line
  lines: string[];
}

export interface ManualPortrait {
  sheet: string; // texture key
  frame?: number;
  scale?: number;
  caption?: string;
}

export interface ManualPage {
  title: string;
  kind?: 'text' | 'gallery';
  body?: string[];
  entries?: ManualEntry[];
  /** Large framed illustration shown beside the body text (e.g. hero pages). */
  portrait?: ManualPortrait;
}

function heroPage(classId: (typeof ALL_CLASSES)[number]): ManualPage {
  const d = HERO_LORE[classId];
  const h = HEROES[classId];
  return {
    title: d.title,
    kind: 'text',
    portrait: { sheet: `hero-${classId}-sheet`, frame: 0, scale: 2.5, caption: `${h.name} · ${h.role}` },
    body: [
      `HP ${h.base.maxHealth}   MP ${h.base.maxMana}   DMG ${h.base.damage}   SPD ${h.base.speed}`,
      d.origin,
      `TACTICS - ${d.tactics}`,
      `Signature: ${h.signature}`,
      `"${d.quote.replace(/"/g, '')}"`,
    ],
  };
}

const ENEMY_DESC: Record<EnemyId, string> = {
  grunt: 'Shambling crypt dead that swarm in numbers. Weak alone, lethal in a mob.',
  ghost: 'A wailing shade that drifts from the walls. Fast, fragile, and chilling.',
  demon: 'A winged pit-fiend wreathed in embers. Hits hard - beware its claws.',
  grave_warden: 'The crowned lord of the crypt. Felling it unseals the exit portal.',
  bone_archer: 'A skeletal marksman that looses arrows from afar. Close the gap fast.',
  brute: 'A hulking armoured horror. It winds up, then charges - sidestep the rush.',
  imp: 'A darting cinder-imp. Tiny and frail, but they swarm in deadly numbers.',
  molten_colossus: 'The molten heart of the deep. Survive its volleys and flame novas.',
  // themed regulars
  frost_shade: 'A spirit of the frozen choir. Quick and brittle - shatter it fast.',
  rime_archer: 'A skeleton iced to its bow. Looses freezing shafts from cover.',
  plague_ooze: 'A creeping mass of corruption. Slow, tough, and foul to touch.',
  spore_imp: 'A toxic sprite that bursts in clouds. They come in choking swarms.',
  gear_knight: 'A wound-up automaton that charges in straight, brutal lines.',
  brass_sentinel: 'A turret-construct that rains brass bolts. Flank it from cover.',
  gladiator: 'A damned arena-fighter, still hungry for the roar of the crowd.',
  mire_lurker: 'A bog-fiend that erupts from the sludge. Watch the still water.',
  storm_wisp: 'A mote of living lightning. Fast, far-striking, and hard to pin.',
  sky_lancer: 'A wind-borne archer of the spire. Picks you off from on high.',
  shadow_stalker: 'A prowler of smoke and claw. It closes the gap before you see it.',
  void_imp: 'A shard of the hungry dark. Tiny, vicious, and endless.',
  hollow_knight: 'An empty suit driven by the Undermaw. Heavily armoured, relentless.',
  // themed bosses
  rime_cantor: 'Conductor of the frozen choir. Its hymns summon shades and shards.',
  rot_sovereign: 'The crowned plague-lord, weeping corruption and birthing ooze.',
  brass_magnus: 'A colossal automaton, the vault’s final lock made flesh of brass.',
  arena_champion: 'The undying victor of the pit. It has never lost. Not yet.',
  mire_leviathan: 'A drowned titan risen from the bog to swallow trespassers whole.',
  tempest_herald: 'The voice of the storm. It calls down lightning and living gales.',
  umbral_devourer: 'A maw of pure shadow that eats light, warmth, and the unwary.',
  hollow_king: 'The Undermaw’s chosen vessel. Slay it to seal the hunger forever.',
};

function bestiaryPages(): ManualPage[] {
  const entries: ManualEntry[] = ENEMY_IDS.map((id) => {
    const e = ENEMIES[id];
    return {
      icon: e.sheet,
      frame: 0,
      scale: e.isBoss ? 0.55 : 1.0,
      title: e.name,
      tag: `HP ${e.health}    DMG ${e.damage}    XP ${e.xp}`,
      lines: [ENEMY_DESC[id]],
    };
  });
  const pages: ManualPage[] = [];
  for (let i = 0; i < entries.length; i += 6) {
    pages.push({
      title: i === 0 ? 'Bestiary' : 'Bestiary (cont.)',
      kind: 'gallery',
      entries: entries.slice(i, i + 6),
    });
  }
  return pages;
}

function armoryPages(): ManualPage[] {
  const entries: ManualEntry[] = [...ALL_ITEMS, ...ALL_THEME_BASES].map((it) => ({
    icon: it.icon,
    scale: 2.2,
    title: it.name,
    tag: describeItemStats(it) || 'no bonuses',
    lines: [it.flavor ?? ''],
  }));
  const pages: ManualPage[] = [];
  for (let i = 0; i < entries.length; i += 6) {
    pages.push({
      title: i === 0 ? 'Armory' : 'Armory (cont.)',
      kind: 'gallery',
      entries: entries.slice(i, i + 6),
    });
  }
  return pages;
}

export const MANUAL_PAGES: ManualPage[] = [
  {
    title: 'The Legend',
    kind: 'text',
    body: [
      'Far beneath the world sleeps an ancient hunger — the UNDERMAW. For an age its seals held. Now they are breaking, and the dead pour up through foul spawning altars across ten descending realms.',
      'You are among the few who answered the call. Descend realm by realm: shatter the altars, slay the warden that rules each one, and seal the Undermaw at the very bottom before its hunger wakes the world entire.',
      'Each realm is its own world — crypt, fire, ice, rot, brass, blood, bog, storm, shadow, and the final sanctum — with its own foes, its own master, and its own treasures to be claimed.',
    ],
  },
  {
    title: 'The Descent',
    kind: 'text',
    body: [
      'I  ·  The Sunken Crypt — the Grave Warden',
      'II  ·  The Molten Deep — the Molten Colossus',
      'III  ·  The Frozen Cathedral — the Rime Cantor',
      'IV  ·  The Toxic Undercroft — the Rot Sovereign',
      'V  ·  The Clockwork Vault — Brass Magnus',
    ],
  },
  {
    title: 'The Descent (cont.)',
    kind: 'text',
    body: [
      'VI  ·  The Blood Arena — the Undying Champion',
      'VII  ·  The Drowned Bog — the Mire Leviathan',
      'VIII  ·  The Storm Spire — the Tempest Herald',
      'IX  ·  The Shadow Warren — the Umbral Devourer',
      'X  ·  Sanctum of the Undermaw — the Hollow King',
    ],
  },
  {
    title: 'Hearthwatch — the Town',
    kind: 'text',
    body: [
      'Every run begins — and every cleared realm returns you to — HEARTHWATCH, the last free town above the Undermaw. Lawns and cobbled roads ring a central fountain inside a moat crossed by four timber bridges, with a gatehouse at each point. Butterflies and birds flit overhead while the townsfolk wander, ready to be hailed for a tale.',
      'Its timber-framed buildings now have proper pitched roofs, glazed windows and doors — and you can step INSIDE. Walk to a building door and press Use to enter; use the inner door to step back out to the square.',
      'BRUNDA\'S FORGE (weapons & armor), THE GREEN VIAL (apothecary), THE GILDED TANKARD (tavern), and YOUR LODGE (rest to fully restore the party, free) keep their keepers within. The FIGHTERS GUILD is where you hire allies for your descent.',
      'Each keeper has a BUY / SELL toggle: sell bag loot for coin, or buy gear, potions, SCROLLS (incl. a Town Portal home and back) and IRON KEYS. CHARISMA rises as you trade — it lowers buy prices, raises sell payouts, and unlocks a once-per-visit HAGGLE for an extra discount.',
      'Ten descent gates ring the square, one per realm. A gate glows when unlocked and stays sealed until you clear the realm before it; step on a gate and press Use to descend. Gold, gear, levels and unlocked gates persist across every town and realm.',
    ],
  },
  {
    title: 'How to Play',
    kind: 'text',
    body: [
      'Move with WASD (P1) or the Arrow keys (P2), or hold the left mouse button to walk toward the cursor. Or plug in a GAMEPAD: left stick / D-Pad moves, A attacks, X magic, B use, Y dodge, RB ability.',
      'Hold attack to strike — each hero differs: Vanguard cleaves, Warden bludgeons, Thief looses arrows, Arcanist and Necromancer hurl bolts.',
      'Tap magic for an attack (costs mana). Use / interact opens chests (all LOCKED now — spend an Iron Key, or play the Thief to pick them free) and lights shrines.',
      'Press SPACE to dodge-roll (brief invulnerability), and F for your class ability: Vanguard Seismic Slam, Arcanist Meteor, Warden Sanctuary. The Thief toggles SNEAK (melt into shadow; a strike from stealth or at a turned-away foe is a guaranteed BACKSTAB for 2.4x). The Necromancer HOLDS the ability for a radial — aim with mouse or stick to pick a Tank, Archer, Mage or Thief skeleton (a quick tap raises the last-chosen).',
    ],
  },
  {
    title: 'How to Play (cont.)',
    kind: 'text',
    body: [
      'Hit foes with elements: fire weapons BURN, magic CHILLS (slows), and critical hits SHOCK (extra damage). Big hits knock enemies back.',
      'Beware gold-glowing CHAMPIONS — tougher and harder-hitting, but they always drop strong gear. Every enemy shows a small HP bar above its head, and dropped loot beams in its rarity colour.',
      'A minimap (top-right) shows the party and boss, but spawning altars stay hidden until a hero explores near them — each level is a hunt. The left-hand ADVENTURE LOG narrates your run (scroll it with the mouse wheel), with live Grok "Dungeon Master" commentary when AI is connected.',
      'Press O for Options — every tab is fully navigable by gamepad too: VIEW (sprite size, map), AUDIO (music track), ALLIES (companions), KEYS (rebind — shows both keyboard and gamepad mappings), CHEATS (incl. DIFFICULTY: easy/moderate/hard), HELP. Press F2 for save/load.',
      'WIN: shatter the spawning altars (DIFFICULTY sets how many — easy 2, moderate 3, hard all), slay the realm’s warden, then stand on the exit portal to descend. Cleared gates show a green check back in town.',
    ],
  },
  {
    title: 'The Party',
    kind: 'text',
    body: [
      'Allies no longer follow for free. In Hearthwatch, step into the FIGHTERS GUILD and hire sellswords for your next descent — pay gold per ally (the price rises as you level) and hire as many as you can afford.',
      'The contract lasts a single run: once you return to town it lapses, so re-hire before you descend again.',
      'Hired allies follow whoever moved last, path around corners, spread out instead of stacking, and use their own class abilities when it helps — the Warden heals the hurt, the Vanguard slams clusters, the Arcanist drops meteors, the Thief looses volleys, and a hired Necromancer keeps raising the dead.',
      'Slain foes grant XP to the killer and a share to the whole party. Tune companion behaviour in Settings -> Allies.',
    ],
  },
  {
    title: 'Growth & Gear',
    kind: 'text',
    body: [
      'Each level grants a skill point and an attribute point. Open Growth (K) to raise class skills and the attributes Might, Vitality, Focus, and Fortune. Some skills boost abilities directly — the Necromancer Horde (+1 servant) and the Arcanist Chain Magic (spells arc to more foes).',
      'FORTUNE raises your luck: more loot drops, and far better odds of the higher equipment grades.',
      'Foes, altars and chests drop gear themed to the realm, in five grades: Cracked, Honed, Runed, Ascendant, and Godforged — each with more affixes, including class-ability affixes: of the Legion (+1 summon), of Alacrity (-cooldown), of Arcing (spells chain). Hover any item for its full stats.',
      'Open Inventory (I) to equip backpack gear (1-9), unequip (U), or drink a potion (C). The backpack pages with Left/Right (9 per page) and tidies with S (sort). Open the Character Sheet (P) for full stats.',
    ],
  },
  ...ALL_CLASSES.map(heroPage),
  ...bestiaryPages(),
  ...armoryPages(),
  {
    title: 'AI Narration',
    kind: 'text',
    body: [
      'StrongBow can use an AI to write quests and narrator lines. Without keys it uses built-in text, so it always works offline.',
      'Copy .env.example to .env, set a provider and a server-side key, then run npm run dev. The title screen glows green when the AI is connected.',
    ],
  },
];
