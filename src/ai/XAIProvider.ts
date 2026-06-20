import type { AIProvider, AIRequest } from './AIProvider';
import { SYSTEM_TONE } from './AIProvider';

// Direct xAI (Grok) call — OpenAI-compatible API. DEV ONLY; prefer the proxy.
export class XAIProvider implements AIProvider {
  readonly id = 'xai';
  private key = import.meta.env.VITE_XAI_API_KEY ?? '';

  available(): boolean {
    return !!this.key;
  }

  async complete(req: AIRequest): Promise<string> {
    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.key}`,
      },
      body: JSON.stringify({
        model: 'grok-2-latest',
        max_tokens: req.maxTokens ?? 40,
        temperature: 0.9,
        messages: [
          { role: 'system', content: SYSTEM_TONE },
          { role: 'user', content: req.prompt },
        ],
      }),
    });
    if (!res.ok) throw new Error(`xAI ${res.status}`);
    const data = await res.json();
    return (data.choices?.[0]?.message?.content ?? '').trim();
  }
}
