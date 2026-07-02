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
      'Every run begins — and every cleared realm returns you to — HEARTHWATCH, the last free town above the Undermaw. The river HEARTHRUN splits it in two: UPPER HEARTHWATCH, the civic quarter of shops, hero statues and the fountain plaza, and LOWER HEARTHWATCH, the commons of market stalls, cottages, farmstead and wayside shrine. Three timber bridges cross the river, and butterflies, birds and townsfolk fill both districts, ready to be hailed for a tale.',
      'Its timber-framed buildings have proper pitched roofs, glazed windows and doors — and you can step INSIDE. Walk to a building door and press Use to enter; use the inner door to step back out to the square.',
      'BRUNDA\'S FORGE (weapons & armor), THE GREEN VIAL (apothecary), THE GILDED TANKARD (tavern), and YOUR LODGE (rest to fully restore the party, free) keep their keepers within. The FIGHTERS GUILD is where you hire allies for your descent.',
    ],
  },
  {
    title: 'Hearthwatch (cont.)',
    kind: 'text',
    body: [
      'Each keeper has a BUY / SELL toggle: sell bag loot for coin, or buy gear, potions, SCROLLS (incl. a Town Portal home and back) and IRON KEYS. CHARISMA rises as you trade — it lowers buy prices, raises sell payouts, and unlocks a once-per-visit HAGGLE for an extra discount.',
      'Ten descent gates stand in two paved courts, one per realm: the HIGH COURT in Upper Hearthwatch holds realms I–V, and the DEEP COURT in Lower Hearthwatch holds realms VI–X. A gate glows when unlocked and stays sealed until you clear the realm before it; step on a gate and press Use to descend. Gold, gear, levels and unlocked gates persist across every town and realm.',
      'Beyond the square, the four outer GATEHOUSES open onto THE WILDS OF HEARTHWATCH — a broad overworld of forest, foothill, desert and bog, threaded with roads, ruins and wandering critters. Out in the Wilds you will find CAVE MOUTHS: stand at one and press Use to delve a self-contained mini-dungeon with its own foes, scattered IRON KEYS and locked hoards of themed, graded gear. Caves never force a descent — clear them at your leisure and step back out the cavern mouth to the very spot you entered.',
    ],
  },
  {
    title: 'How to Play',
    kind: 'text',
    body: [
      'Move with WASD (P1) or the Arrow keys (P2), or hold the left mouse button to walk toward the cursor. Or plug in a GAMEPAD: left stick / D-Pad moves, A attacks, X magic, B use, Y dodge, RB ability, RT steal (Thief pickpocket).',
      'Hold attack to strike — each hero differs: Vanguard cleaves, Warden bludgeons, Thief looses arrows, Arcanist and Necromancer hurl bolts.',
      'Tap magic for an attack (costs mana). Use / interact opens chests (all LOCKED now — spend an Iron Key, or play the Thief to pick them free) and lights shrines.',
      'Every action is REBINDABLE in Settings -> Keys (both players): move, attack, magic, use, DODGE, class ABILITY, and STEAL. Default dodge is Space and ability is F.',
      'Dodge-roll for brief invulnerability. Your class ABILITY: Vanguard Seismic Slam; Warden SANCTUARY — a burst heal that also RESURRECTS a fallen ally nearby, atop a passive REGEN aura that mends nearby allies and pets (both grow with Warden level).',
    ],
  },
  {
    title: 'How to Play (cont.)',
    kind: 'text',
    body: [
      'The Thief toggles SNEAK (melt into shadow — every foe rolls on its own to notice you; a strike from stealth or at a turned-away foe is a BACKSTAB for 2.4x, on a short cooldown that shrinks as Sneak grows). From stealth, press Steal to PICKPOCKET the nearest foe or townsfolk — Sneak and Pickpocket set both your odds and the haul (up to a Godforged item at mastery).',
      'The Necromancer and the Arcanist HOLD the ability for a summon RADIAL — aim with mouse or stick to choose, release to conjure. The Necromancer raises Tank / Archer / Mage / Thief skeletons (a quick tap re-raises the last pick; high levels can bind a BEAST from the wheel\'s centre). The Arcanist conjures arcane familiars — EMBER SPRITE (burning bolts), VOID IMP (fast, shocking), ARCANE HOMUNCULUS (durable caster) and STARVED ROOTLING (melee vines that chill) — while a quick tap still casts METEOR. Summoning costs MANA, not a cooldown, so with enough mana you can raise several at once; servants now fight on PERMANENTLY until slain or until you leave the level. The Arcanist also keeps an always-on LANTERN WISP familiar that lights the dark and scouts ahead to reveal altars.',
    ],
  },
  {
    title: 'How to Play (cont.)',
    kind: 'text',
    body: [
      'Hit foes with elements: fire weapons BURN, magic CHILLS (slows), and critical hits SHOCK (extra damage). Big hits knock enemies back.',
      'Beware gold-glowing CHAMPIONS — tougher and harder-hitting, but they always drop strong gear. Every enemy shows a small HP bar above its head, and dropped loot beams in its rarity colour.',
      'A minimap (top-right) shows the party and boss, but spawning altars stay hidden until a hero explores near them — each level is a hunt. The left-hand ADVENTURE LOG narrates your run (scroll it with the mouse wheel), with live Grok "Dungeon Master" commentary when AI is connected.',
      'Press O for Options — every tab is fully navigable by gamepad too: VIEW (sprite size, map), AUDIO (music track), ALLIES (companions), KEYS (rebind — shows both keyboard and gamepad mappings), CHEATS (incl. DIFFICULTY: easy/moderate/hard, and WILD MONSTERS density — roaming foes that wander each realm apart from the altars), HELP. Press F2 for save/load.',
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
      'CLASS ARMOR SETS: five Godforged pieces per class (helm, chest, legs, gloves, boots), each a rare drop shown in BRIGHT GREEN. Wearing more of your class\'s set unlocks tiered bonuses at 2 and 4 pieces, and a class-defining power at the full 5 — the Vanguard\'s Undying Bulwark, the Thief\'s Shadowmaster, the Arcanist\'s Archmage, the Warden\'s Lifewarden, and the Necromancer\'s Deathlord. Every realm WARDEN drops a class piece, and the deeper the realm the better the odds of a bonus one.',
      'Open Inventory (I) to equip backpack gear (1-9), unequip (U), or drink a potion (C) — potions and scrolls STACK. The backpack pages with Left/Right (9 per page) and tidies with S (sort). Open the Character Sheet (P) for full stats — hover any stat for what it does.',
    ],
  },
  ...ALL_CLASSES.map(heroPage),
  ...bestiaryPages(),
  ...armoryPages(),
  {
    title: 'Servers & Multiplayer',
    kind: 'text',
    body: [
      'StrongBow now runs against a STANDALONE GAME SERVER. Every client — solo or grouped — connects to it on entering the world, so single-player and multiplayer share one path. Play alone and you simply have the world to yourself; others who join appear beside you on the same map.',
      'Host the server with "npm run server" (or double-click server/start-server.bat). It runs independently and opens a control DASHBOARD at http://localhost:8080 — watch connected players, broadcast messages, kick, and toggle AI-NPC injection: enable it and the server fills the world with wandering NPCs (green figures) that roam near the action. Stop it from the dashboard\'s Stop button or server/stop-server.bat. For browser control, run server/start-launcher.bat once: a LAUNCHER at http://localhost:8090 gives Start / Stop / Restart buttons and a live log.',
      'Point the game at a host with the SERVER ADDRESS box on the title screen (ws://<ip>:<port>, saved on your machine) — or VITE_GAME_SERVER_URL in .env. Share that address so friends join the same world. In a party you fight the SAME enemies (one player hosts them) and kills grant SHARED XP and gold with a party-size bonus, so co-op out-earns solo. Set VITE_MULTIPLAYER=0 to play fully offline; the game also stays playable if the server is unreachable.',
      'Note: local same-screen 2-player has given way to server multiplayer, and Level Select is disabled for now while the new flow settles.',
    ],
  },
  {
    title: 'AI Narration',
    kind: 'text',
    body: [
      'StrongBow can use an AI to write quests and narrator lines. Without keys it uses built-in text, so it always works offline.',
      'Copy .env.example to .env, set a provider and a server-side key, then run npm run dev. The title screen glows green when the AI is connected.',
    ],
  },
];
