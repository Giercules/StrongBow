import Phaser from 'phaser';
import { framedPanel, makeButton } from './uiHelpers';
import type { Modal } from './uiHelpers';
import { C } from '../rendering/Palette';
import { questLog } from '../systems/QuestSystem';
import type { Hero } from '../entities/Hero';
import { audio } from '../systems/AudioSystem';

const PANEL_W = 440;
const PANEL_H = 240;

/** Rep-tiered greetings — the townsfolk remember what you've done for them. */
const GREETINGS: { at: number; lines: string[] }[] = [
  { at: 0, lines: ['New face. Mind the gates after dark.', 'Adventurer, is it? The board in the market pays coin.', 'Hmm. You have the look of someone the Undermaw hasn\'t met yet.'] },
  { at: 10, lines: ['I\'ve heard your name around the market.', 'You\'re the one taking contracts, aren\'t you? Good.', 'Word gets around when someone actually helps.'] },
  { at: 25, lines: ['Well met, friend of Hearthwatch!', 'Always a good day when you walk the square.', 'My cousin says you pulled her neighbor out of the dark. Bless you.'] },
  { at: 50, lines: ['The Shield of the Town graces my corner of the square!', 'Drinks at the Tankard say your name nightly, you know.', 'When the gates rattle, we sleep anyway — because of you.'] },
  { at: 100, lines: ['The Legend themselves! My grandchildren won\'t believe me.', 'Hearthwatch stands because you do.', 'They\'ll carve you a statue next to the old heroes, mark me.'] },
];

/** Rumors traded for a silver tongue — hints that actually help. */
const RUMORS = [
  'They say the wardens below change when wounded — save your strength for their second fury.',
  'A trader swears the deeper realms drop finer steel. Fortune favors the lucky, too.',
  'Brunda can melt down what you don\'t need. Scrap enough and she\'ll work wonders.',
  'The caves out in the Wilds hide iron keys and locked hoards. Bring a lockpick — or a Thief.',
  'Old Maren remembers gates ringed in bright green armor... pieces of one set, she says.',
  'Fish the Hearthrun at the banks — the river gives up more than weeds.',
  'The fortune-teller pays double for Undermaw relics some evenings. The board pays every time.',
  'Champions glow gold and hit like falling roofs — but they always carry something worth the bruise.',
];

export class DialogueUI {
  private scene: Phaser.Scene;
  private modal: Modal | null = null;
  private keyHandler?: (e: KeyboardEvent) => void;
  private onClosed?: () => void;
  private npcLabel = '';
  private npcRole = '';
  private hero!: Hero;
  private textLine!: Phaser.GameObjects.Text;
  private onChat?: () => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  isOpen(): boolean {
    return this.modal !== null;
  }

  /** Open a hail with a townsperson. `onChat` lets the scene stream a Grok line. */
  open(hero: Hero, npcLabel: string, npcRole: string, hooks: { onClosed?: () => void; onChat?: () => void } = {}): void {
    if (this.modal) return;
    this.hero = hero;
    this.npcLabel = npcLabel;
    this.npcRole = npcRole;
    this.onClosed = hooks.onClosed;
    this.onChat = hooks.onChat;
    this.keyHandler = (e) => {
      if (e.key === 'Escape') this.close();
    };
    this.scene.input.keyboard?.on('keydown', this.keyHandler);

    const m = framedPanel(this.scene, PANEL_W, PANEL_H, npcLabel.toUpperCase());
    this.modal = m;
    const x0 = m.cx - PANEL_W / 2;
    const y0 = m.cy - PANEL_H / 2;

    m.add(this.scene.add.text(x0 + 20, y0 + 32, `${npcRole} · you are ${questLog.repTitle()}`, { fontFamily: 'MedievalSharp, "Trebuchet MS", cursive', fontSize: '10.5px', color: C.inkDim }));

    let tier = GREETINGS[0];
    for (const t of GREETINGS) if (questLog.reputation >= t.at) tier = t;
    const greeting = tier.lines[Math.floor(Math.random() * tier.lines.length)];
    this.textLine = this.scene.add.text(x0 + 20, y0 + 56, `"${greeting}"`, {
      fontFamily: 'MedievalSharp, "Trebuchet MS", cursive', fontSize: '13px', color: '#ffe9a8', wordWrap: { width: PANEL_W - 40 }, lineSpacing: 4,
    });
    m.add(this.textLine);

    const canRumor = this.hero.charisma >= 3 || questLog.reputation >= 10;
    m.add(makeButton(this.scene, m.cx - 140, y0 + PANEL_H - 34, 120, 26, 'CHAT', () => {
      audio.sfx('ui_move');
      this.onChat?.();
    }));
    m.add(makeButton(this.scene, m.cx, y0 + PANEL_H - 34, 120, 26, canRumor ? 'ASK FOR RUMORS' : 'RUMORS (locked)', () => {
      if (!canRumor) {
        this.say('Rumors are for friends and silver tongues. (Charisma 3 or reputation 10 opens ears.)');
        return;
      }
      audio.sfx('ui_select');
      this.say(RUMORS[Math.floor(Math.random() * RUMORS.length)]);
    }, { text: canRumor ? undefined : C.inkDim }));
    m.add(makeButton(this.scene, m.cx + 140, y0 + PANEL_H - 34, 120, 26, 'FAREWELL', () => this.close()));
  }

  /** Replace the spoken line (used by rumors and streamed Grok chat). */
  say(line: string): void {
    if (this.textLine?.active) this.textLine.setText(`"${line}"`);
  }

  close(): void {
    if (this.keyHandler) this.scene.input.keyboard?.off('keydown', this.keyHandler);
    this.keyHandler = undefined;
    this.modal?.destroy();
    this.modal = null;
    this.onClosed?.();
    this.onClosed = undefined;
  }
}
