import type { AIProvider, AIRequest } from './AIProvider';
import { FallbackProvider } from './FallbackProvider';
import { OpenAIProvider } from './OpenAIProvider';
import { AnthropicProvider } from './AnthropicProvider';
import { XAIProvider } from './XAIProvider';
import { ProxyAIProvider } from './ProxyAIProvider';
import { AI_USE_PROXY } from './aiConfig';
import { settings } from '../core/GameSettings';

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

  private async run(req: AIRequest, useCache: boolean): Promise<string> {
    const key = `${req.context ?? ''}|${req.prompt}`;
    if (useCache && this.cache.has(key)) return this.cache.get(key)!;
    let out = '';
    try {
      if (this.primary.available()) out = await this.primary.complete(req);
    } catch {
      out = '';
    }
    if (!out) out = await this.fallback.complete(req);
    if (useCache) this.cache.set(key, out);
    return out;
  }

  async generateQuest(levelName: string): Promise<string> {
    const req: AIRequest = {
      context: 'quest',
      prompt: `Write the objective for a dungeon called "${levelName}" where the hero must destroy spawn generators and slay the Grave Warden to open the exit.`,
      maxTokens: 48,
    };
    if (!settings.get('aiQuestEnabled')) return this.fallback.complete(req);
    return this.run(req, true);
  }

  async generateBark(event: string): Promise<string> {
    if (!settings.get('aiBarksEnabled')) return '';
    return this.run({ context: 'bark', prompt: `Narrate this moment in one line: ${event}.`, maxTokens: 32 }, false);
  }

  async generateCompanionBark(): Promise<string> {
    if (!settings.get('aiBarksEnabled') || !settings.get('companionAI').aiBarks) return '';
    return this.run({ context: 'companion', prompt: 'An ally shouts encouragement in battle.', maxTokens: 24 }, false);
  }

  async generateItemFlavor(itemName: string): Promise<string> {
    return this.run({ context: 'item', prompt: `One line of flavor for an item called "${itemName}".`, maxTokens: 28 }, true);
  }
}

export const aiService = new AIService();
