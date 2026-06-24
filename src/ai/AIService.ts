import type { AIProvider, AIRequest } from './AIProvider';
import { FallbackProvider } from './FallbackProvider';
import { OpenAIProvider } from './OpenAIProvider';
import { AnthropicProvider } from './AnthropicProvider';
import { XAIProvider } from './XAIProvider';
import { ProxyAIProvider } from './ProxyAIProvider';
import { AI_USE_PROXY } from './aiConfig';
import { settings } from '../core/GameSettings';

export interface BarkContext {
  event: string;
  realm?: string;
  heroClass?: string;
  altarsLeft?: number;
  healthPercent?: number;
}

class AIService {
  private fallback = new FallbackProvider();
  private primary: AIProvider;
  private cache = new Map<string, string>();

  constructor() {
    this.primary = this.choose();
  }

  refresh(): void {
    this.primary = this.choose();
  }

  async checkConnection(): Promise<{ connected: boolean; provider: string }> {
    const provider = settings.get('aiProvider');
    if (provider === 'fallback') return { connected: false, provider };
    if (AI_USE_PROXY) {
      try {
        const res = await fetch('/api/health');
        if (!res.ok) return { connected: false, provider };
        const data = await res.json();
        return { connected: !!data?.providers?.[provider], provider };
      } catch {
        return { connected: false, provider };
      }
    }
    return { connected: this.primary.available(), provider };
  }

  private choose(): AIProvider {
    const provider = settings.get('aiProvider');
    if (provider === 'fallback') return this.fallback;
    if (AI_USE_PROXY) return new ProxyAIProvider(provider);
    switch (provider) {
      case 'openai':
        return new OpenAIProvider();
      case 'anthropic':
        return new AnthropicProvider();
      case 'xai':
        return new XAIProvider();
      default:
        return this.fallback;
    }
  }

  private async run(req: AIRequest, cache: 'never' | 'offlineOnly'): Promise<{ text: string; live: boolean }> {
    const canLive = this.primary !== this.fallback;
    const key = `${req.context ?? ''}|${req.prompt}`;
    const useCache = cache === 'offlineOnly' && !canLive;
    if (useCache && this.cache.has(key)) return { text: this.cache.get(key)!, live: false };
    let out = '';
    if (canLive) {
      try {
        if (this.primary.available()) out = await this.primary.complete(req);
      } catch {
        out = '';
      }
    }
    if (out) return { text: out, live: true };
    const fb = await this.fallback.complete(req);
    if (useCache) this.cache.set(key, fb);
    return { text: fb, live: false };
  }

  async generateQuest(levelName: string): Promise<string> {
    const req: AIRequest = {
      context: 'quest',
      prompt: `Write the objective for a dungeon called "${levelName}" where the hero must destroy spawn generators and slay the Grave Warden to open the exit.`,
      maxTokens: 64,
    };
    if (!settings.get('aiQuestEnabled')) return this.fallback.complete(req);
    return (await this.run(req, 'offlineOnly')).text;
  }

  async generateBark(ctx: BarkContext | string): Promise<{ text: string; live: boolean }> {
    if (!settings.get('aiBarksEnabled')) return { text: '', live: false };
    const event = typeof ctx === 'string' ? ctx : ctx.event;
    const facts =
      typeof ctx === 'string'
        ? ''
        : [
            ctx.realm ? `Realm: ${ctx.realm}.` : '',
            ctx.heroClass ? `Hero class: ${ctx.heroClass}.` : '',
            ctx.altarsLeft != null ? `Altars remaining: ${ctx.altarsLeft}.` : '',
            ctx.healthPercent != null ? `Hero health: ${ctx.healthPercent}%.` : '',
          ]
            .filter(Boolean)
            .join(' ');
    const prompt = facts
      ? `Narrate this moment in one vivid line: ${event}. ${facts}`
      : `Narrate this moment in one vivid line: ${event}.`;
    return this.run({ context: 'bark', prompt, maxTokens: 40 }, 'never');
  }

  async generateCompanionBark(): Promise<string> {
    if (!settings.get('aiBarksEnabled') || !settings.get('companionAI').aiBarks) return '';
    return (await this.run({ context: 'companion', prompt: 'An ally shouts encouragement in battle.', maxTokens: 28 }, 'never')).text;
  }

  async generateItemFlavor(itemName: string): Promise<string> {
    return (await this.run({ context: 'item', prompt: `One line of flavor for an item called "${itemName}".`, maxTokens: 28 }, 'offlineOnly')).text;
  }

  async generateRealmIntro(realm: string, heroClass?: string): Promise<{ text: string; live: boolean }> {
    if (!settings.get('aiBarksEnabled')) return { text: '', live: false };
    return this.run(
      {
        context: 'intro',
        prompt: `The party enters ${realm}.${heroClass ? ` Led by a ${heroClass}.` : ''} In 2-3 atmospheric sentences, set the scene: the place, the Undermaw's influence here, and a hint of the danger waiting.`,
        maxTokens: 180,
        reasoningEffort: 'low',
      },
      'never'
    );
  }

  async generateBossIntro(realm: string): Promise<{ text: string; live: boolean }> {
    if (!settings.get('aiBarksEnabled')) return { text: '', live: false };
    return this.run(
      {
        context: 'boss',
        prompt: `The warden of ${realm} rises to face the heroes. Announce the boss battle in 1-2 dramatic, ominous lines.`,
        maxTokens: 90,
        reasoningEffort: 'low',
      },
      'never'
    );
  }

  async generateVictory(realm: string, heroClass?: string): Promise<{ text: string; live: boolean }> {
    if (!settings.get('aiBarksEnabled')) return { text: '', live: false };
    return this.run(
      {
        context: 'victory',
        prompt: `The warden of ${realm} is slain and the party stands victorious${heroClass ? `, led by a ${heroClass}` : ''}. Give 2-3 triumphant sentences of hard-won closure.`,
        maxTokens: 180,
        reasoningEffort: 'low',
      },
      'never'
    );
  }

  async generateDeath(realm: string): Promise<{ text: string; live: boolean }> {
    if (!settings.get('aiBarksEnabled')) return { text: '', live: false };
    return this.run(
      {
        context: 'death',
        prompt: `The entire party has fallen in ${realm}. Give 1-2 poetic, grim sentences marking their end.`,
        maxTokens: 160,
        reasoningEffort: 'low',
      },
      'never'
    );
  }

  async generateExamine(subject: string, realm: string): Promise<{ text: string; live: boolean }> {
    if (!settings.get('aiBarksEnabled')) return { text: '', live: false };
    return this.run(
      {
        context: 'examine',
        prompt: `A weary adventurer examines ${subject} deep in ${realm}. In 1-3 sentences, describe it with grim, evocative lore.`,
        maxTokens: 120,
        reasoningEffort: 'none',
      },
      'never'
    );
  }
}

export const aiService = new AIService();
