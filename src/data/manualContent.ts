import { HERO_LORE } from './heroLore';
import { HEROES, ALL_CLASSES } from './heroes';
import { ENEMIES, ENEMY_IDS } from './enemies';
import { ALL_ITEMS } from './items';
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

export interface ManualPage {
  title: string;
  kind?: 'text' | 'gallery';
  body?: string[];
  entries?: ManualEntry[];
}

function heroPage(classId: (typeof ALL_CLASSES)[number]): ManualPage {
  const d = HERO_LORE[classId];
  const h = HEROES[classId];
  return {
    title: d.title,
    kind: 'text',
    body: [
      `${h.role.toUpperCase()}    HP ${h.base.maxHealth}   MP ${h.base.maxMana}   DMG ${h.base.damage}   SPD ${h.base.speed}`,
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
};

function bestiaryPage(): ManualPage {
  return {
    title: 'Bestiary',
    kind: 'gallery',
    entries: ENEMY_IDS.map((id) => {
      const e = ENEMIES[id];
      return {
        icon: e.sheet,
        frame: 0,
        scale: e.isBoss ? 1.1 : 2.0,
        title: e.name,
        tag: `HP ${e.health}    DMG ${e.damage}    XP ${e.xp}`,
        lines: [ENEMY_DESC[id]],
      };
    }),
  };
}

function armoryPages(): ManualPage[] {
  const entries: ManualEntry[] = ALL_ITEMS.map((it) => ({
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
      'The Sunken Crypt was sealed for a reason. Its seals are broken, and the dead pour out through eight foul generators beneath the gaze of the Grave Warden.',
      'You are among the few who answered the call. Descend, break the spawning altars, put the Warden back in the ground, and escape through the portal before the crypt closes again.',
    ],
  },
  {
    title: 'How to Play',
    kind: 'text',
    body: [
      'Move with WASD (Player 1) or the Arrow keys (Player 2).',
      'Hold attack to strike. Each hero fights differently: the Vanguard cleaves, the Warden bludgeons, the Strider looses arrows, and the Arcanist hurls bolts.',
      'Tap magic for an area blast (costs mana). Use / interact opens chests and lights shrines.',
      'WIN: destroy at least 3 generators, slay the Grave Warden, then stand on the exit portal.',
      'Lava burns but never traps you - keep moving and walk out.',
    ],
  },
  {
    title: 'The Party',
    kind: 'text',
    body: [
      'Solo play grants three AI companions; co-op grants two. They follow whoever moved last and join the fight.',
      'Every class aids the group: the Warden heals nearby allies, the Vanguard shields them from harm, the Strider sharpens their aim, and the Arcanist empowers their blows.',
      'Slain foes grant XP to the killer and a share to the whole party. Tune companion behaviour in Settings -> Allies.',
    ],
  },
  {
    title: 'Growth & Gear',
    kind: 'text',
    body: [
      'Each level grants a skill point and an attribute point. Open Growth (K) to raise class skills (1-3) and the attributes Might, Vitality, and Focus (4-6).',
      'Open Inventory (I) to equip backpack gear (1-9), unequip (U), or drink a potion (C). Bonuses apply at once.',
      'Open the Character Sheet (P) to review your full stats and equipped gear.',
      'Every key is rebindable in Settings -> Keys.',
    ],
  },
  ...ALL_CLASSES.map(heroPage),
  bestiaryPage(),
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
