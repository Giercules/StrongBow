import type { AIProvider, AIRequest } from './AIProvider';
import { AI_FETCH_TIMEOUT_MS, SYSTEM_TONE } from './AIProvider';

// Direct OpenAI call (DEV ONLY — exposes the key in the browser; prefer the proxy).
export class OpenAIProvider implements AIProvider {
  readonly id = 'openai';
  private key = import.meta.env.VITE_OPENAI_API_KEY ?? '';

  available(): boolean {
    return !!this.key;
  }

  async complete(req: AIRequest): Promise<string> {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: AbortSignal.timeout(AI_FETCH_TIMEOUT_MS),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.key}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: req.maxTokens ?? 40,
        temperature: 0.9,
        messages: [
          { role: 'system', content: SYSTEM_TONE },
          { role: 'user', content: req.prompt },
        ],
      }),
    });
    if (!res.ok) throw new Error(`OpenAI ${res.status}`);
    const data = await res.json();
    return (data.choices?.[0]?.message?.content ?? '').trim();
  }
}
