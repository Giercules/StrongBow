import { buildDungeon } from './levelGen';
import { Content } from '../content/ContentRegistry';
import type { ThemeId, LevelData } from '../core/types';

// Turn a free-text description ("a huge frozen cathedral full of archers") into a
// playable level. The keyword synthesiser always works offline; DungeonScene then
// layers AI quest narration on top when a provider is connected.

interface Blueprint {
  theme: ThemeId;
  name: string;
  width: number;
  height: number;
  maxGenerators: number;
  seed: number;
}

const THEME_WORDS: [ThemeId, RegExp][] = [
  ['storm', /storm|thunder|lightning|spire|sky|gale|tempest|cloud|wind/],
  ['shadow', /shadow|dark|void|umbral|night|warren|abyss|black|gloom/],
  ['sanctum', /sanctum|undermaw|final|hollow|relic|altar|seal|holy|temple/],
  ['frost', /frost|ice|frozen|snow|glaci|cold|winter|cathedral|crystal|chill/],
  ['bog', /bog|marsh|swamp|mire|fen|muck|drowned|wetland|moor/],
  ['toxic', /toxic|poison|plague|sewer|sludge|venom|rot|undercroft|acid/],
  ['clockwork', /clock|gear|cog|vault|machine|mechan|brass|trap|factory|engine|tech/],
  ['arena', /arena|blood|colosseum|gladiat|wave|pit|battle|champion/],
  ['molten', /lava|molten|fire|volcano|magma|forge|inferno|ember|flame|hell/],
  ['crypt', /crypt|grave|tomb|undead|bone|skelet|catacomb|haunt|ghost/],
];

const THEME_NAMES: Record<ThemeId, string> = {
  frost: 'The Frostbound Hollow',
  toxic: 'The Festering Deep',
  clockwork: 'The Geared Labyrinth',
  arena: 'The Slaughter Pit',
  molten: 'The Emberforge',
  crypt: 'The Forgotten Crypt',
  bog: 'The Sunken Mire',
  storm: 'The Howling Spire',
  shadow: 'The Black Warren',
  sanctum: 'The Hollow Sanctum',
  town: 'Hearthwatch',
};

function hash(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function titleCase(s: string): string {
  return s
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function synthesize(desc: string): Blueprint {
  const d = (desc || '').toLowerCase();
  let theme: ThemeId = 'crypt';
  for (const [t, re] of THEME_WORDS) {
    if (re.test(d)) {
      theme = t;
      break;
    }
  }
  let scale = 1;
  if (/huge|massive|sprawl|vast|giant|endless|labyrinth|colossal/.test(d)) scale = 1.3;
  else if (/small|tiny|cramped|short|quick|little/.test(d)) scale = 0.78;

  let gens = 8;
  if (/deadly|swarm|brutal|nightmare|horde|hell|relentless|overrun/.test(d)) gens = 11;
  else if (/easy|calm|gentle|simple|peaceful|relaxed/.test(d)) gens = 5;

  const width = Math.max(132, Math.round(166 * scale));
  const height = Math.max(94, Math.round(116 * scale));
  const seed = hash(desc && desc.trim() ? desc : String(Date.now()));
  const clean = (desc || '').trim();
  const name = clean && clean.length <= 30 ? titleCase(clean) : THEME_NAMES[theme];
  return { theme, name, width, height, maxGenerators: gens, seed };
}

const FORGE_LOOT: Record<ThemeId, string[]> = {
  frost: ['shade_cloak', 'oak_staff', 'warding_ring'],
  toxic: ['hunters_bow', 'leather_jerkin', 'amulet_of_focus'],
  clockwork: ['iron_sword', 'crypt_plate', 'warding_ring'],
  arena: ['ember_blade', 'iron_sword', 'amulet_of_focus'],
  molten: ['ember_blade', 'crypt_plate', 'oak_staff'],
  crypt: ['crypt_knife', 'leather_jerkin', 'hunters_bow'],
  bog: ['hunters_bow', 'crypt_plate', 'amulet_of_focus'],
  storm: ['shade_cloak', 'oak_staff', 'amulet_of_focus'],
  shadow: ['shade_cloak', 'ember_blade', 'amulet_of_focus'],
  sanctum: ['crypt_plate', 'ember_blade', 'amulet_of_focus'],
  town: ['iron_sword', 'leather_jerkin', 'warding_ring'],
};

/** Build a one-off level from a description, register it, and return it. */
export function forgeLevel(desc: string): LevelData {
  const bp = synthesize(desc);
  const level = buildDungeon({
    id: 'forged_' + bp.seed.toString(16),
    name: bp.name,
    seed: bp.seed,
    width: bp.width,
    height: bp.height,
    cols: 7,
    rows: 6,
    theme: bp.theme,
    maxGenerators: bp.maxGenerators,
    chestItems: FORGE_LOOT[bp.theme],
  });
  Content.registerDynamic(level);
  return level;
}
