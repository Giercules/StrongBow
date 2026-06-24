import type { AIProvider, AIRequest } from './AIProvider';

const QUESTS = [
  'Shatter the generators and end the Grave Warden. The crypt remembers.',
  'Three foul altars must fall before the way out will open.',
  'Smash the spawning stones, then face what crowns the dead.',
  'The exit is sealed by the Warden. Break the altars, then break him.',
];

const BARKS = [
  'The air reeks of old graves.',
  'Something stirs beyond the torchlight.',
  'Steel yourself — the crypt is hungry.',
  'Bones crunch underfoot.',
  'Gold glints in the dark.',
  'The walls weep cold water.',
  'A distant roar shakes the dust.',
  'Death waits patiently here.',
  'Shadows lean close, listening.',
  'The dark is not empty. It never is.',
  'Old stone, older hunger.',
  'Your torch gutters. Something exhaled.',
];

const PROGRESS = [
  'An altar cracks — the Undermaw shudders.',
  'One more seal broken. The way out remembers you.',
  'The stone screams as it dies. Good.',
  'A generator falls silent. The dark notices.',
];

const DANGER = [
  'Blood in the dust, and not all of it theirs.',
  'Your knees buckle. The crypt leans closer.',
  'Stay upright, hero. The dark is patient.',
  'A heartbeat from the end. Make it count.',
];

const BOSS = [
  'The Warden rises. The air goes to iron.',
  'Now the crypt shows its crown. Stand fast.',
  'Something vast turns its gaze upon you.',
];

const ARRIVE = [
  'A new dark opens its mouth to swallow you.',
  'Deeper now. The Undermaw breathes around you.',
  'Fresh stone, same hunger. Descend.',
];

const COMPANION = [
  'On your flank!',
  'I have your back!',
  'For the party!',
  'Strike them down!',
  'Stay close!',
  'Heal up, friend.',
];

const ITEM = [
  'It hums with quiet power.',
  'Worn, but it will serve.',
  'Forged for a grim purpose.',
  'The metal is cold to the touch.',
];

// Always-available, fully offline narration. Themed by event keywords,
// with no immediate repeats so offline play still feels curated.
export class FallbackProvider implements AIProvider {
  readonly id = 'fallback';
  private recent = new Map<string, number>();

  available(): boolean {
    return true;
  }

  async complete(req: AIRequest): Promise<string> {
    const c = req.context ?? '';
    if (c.includes('quest')) return this.pick('quest', QUESTS);
    if (c.includes('companion')) return this.pick('companion', COMPANION);
    if (c.includes('item')) return this.pick('item', ITEM);
    const [tag, pool] = this.barkPool(req.prompt ?? '');
    return this.pick(tag, pool);
  }

  // Route a bark to a themed pool by scanning the prompt for event keywords.
  private barkPool(prompt: string): [string, string[]] {
    const p = prompt.toLowerCase();
    if (/(warden|boss|crown)/.test(p)) return ['boss', BOSS];
    if (/(altar|generator|seal|spawn)/.test(p)) return ['progress', PROGRESS];
    if (/(fell|fall|down|wound|health|dying|blood|hurt)/.test(p)) return ['danger', DANGER];
    if (/(descend|enter|arrive|deeper|gate|return)/.test(p)) return ['arrive', ARRIVE];
    return ['bark', BARKS];
  }

  private pick(tag: string, arr: string[]): string {
    if (arr.length <= 1) return arr[0] ?? '';
    let i = Math.floor(Math.random() * arr.length);
    if (this.recent.get(tag) === i) i = (i + 1) % arr.length;
    this.recent.set(tag, i);
    return arr[i];
  }
}
