import type { AIProvider, AIRequest } from './AIProvider';
import { SYSTEM_TONE } from './AIProvider';

// Direct Anthropic call (DEV ONLY — exposes the key in the browser; prefer the proxy).
export class AnthropicProvider implements AIProvider {
  readonly id = 'anthropic';
  private key = import.meta.env.VITE_ANTHROPIC_API_KEY ?? '';

  available(): boolean {
    return !!this.key;
  }

  async complete(req: AIRequest): Promise<string> {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-latest',
        max_tokens: req.maxTokens ?? 40,
        system: SYSTEM_TONE,
        messages: [{ role: 'user', content: req.prompt }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic ${res.status}`);
    const data = await res.json();
    return (data.content?.[0]?.text ?? '').trim();
  }
}
