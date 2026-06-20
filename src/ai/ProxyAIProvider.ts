import type { AIProvider, AIRequest } from './AIProvider';

// Routes requests through the local Express proxy, keeping API keys server-side.
export class ProxyAIProvider implements AIProvider {
  readonly id: string;
  private target: string;

  constructor(target: string) {
    this.id = `proxy:${target}`;
    this.target = target;
  }

  available(): boolean {
    return true; // assume the proxy is reachable; AIService falls back on error
  }

  async complete(req: AIRequest): Promise<string> {
    const res = await fetch('/api/ai/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: req.prompt,
        context: req.context,
        maxTokens: req.maxTokens ?? 40,
        provider: this.target,
      }),
    });
    if (!res.ok) throw new Error(`Proxy ${res.status}`);
    const data = await res.json();
    return (data.text ?? '').trim();
  }
}
