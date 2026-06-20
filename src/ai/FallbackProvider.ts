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

function pick(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Always-available, fully offline narration.
export class FallbackProvider implements AIProvider {
  readonly id = 'fallback';
  available(): boolean {
    return true;
  }
  async complete(req: AIRequest): Promise<string> {
    const c = req.context ?? '';
    if (c.includes('quest')) return pick(QUESTS);
    if (c.includes('companion')) return pick(COMPANION);
    if (c.includes('item')) return pick(ITEM);
    return pick(BARKS);
  }
}
