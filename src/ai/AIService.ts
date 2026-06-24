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

  async generateBark(event: string): Promise<{ text: string; live: boolean }> {
    if (!settings.get('aiBarksEnabled')) return { text: '', live: false };
    return this.run({ context: 'bark', prompt: `Narrate this moment in one vivid line: ${event}.`, maxTokens: 40 }, 'never');
  }

  async generateCompanionBark(): Promise<string> {
    if (!settings.get('aiBarksEnabled') || !settings.get('companionAI').aiBarks) return '';
    return (await this.run({ context: 'companion', prompt: 'An ally shouts encouragement in battle.', maxTokens: 28 }, 'never')).text;
  }

  async generateItemFlavor(itemName: string): Promise<string> {
    return (await this.run({ context: 'item', prompt: `One line of flavor for an item called "${itemName}".`, maxTokens: 28 }, 'offlineOnly')).text;
  }
}

export const aiService = new AIService();
