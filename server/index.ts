import express from 'express';
import cors from 'cors';
import { SYSTEM_TONE } from '../src/ai/persona';

// StrongBow AI proxy - keeps provider API keys server-side.
// Runs fully without keys: requests fall back to canned narration.

try {
  (process as unknown as { loadEnvFile?: (p?: string) => void }).loadEnvFile?.('.env');
} catch {
  /* no .env present */
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '32kb' }));

const PORT = Number(process.env.PORT) || Number(process.env.AI_PROXY_PORT) || 3847;

// Guardrails — this endpoint spends real API credits, so clamp everything a
// caller controls and rate-limit per IP. Overruns degrade to canned narration.
const MAX_PROMPT_CHARS = 2000;
const MAX_TOKENS_CAP = 256;
const RATE_LIMIT_PER_MIN = Number(process.env.AI_RATE_LIMIT_PER_MIN) || 40;
const UPSTREAM_TIMEOUT_MS = 12000;
const PROVIDERS = new Set(['openai', 'anthropic', 'xai']);
const EFFORTS = new Set(['none', 'low', 'medium', 'high']);

const rateBuckets = new Map<string, { count: number; resetAt: number }>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const b = rateBuckets.get(ip);
  if (!b || now >= b.resetAt) {
    rateBuckets.set(ip, { count: 1, resetAt: now + 60000 });
    return false;
  }
  b.count++;
  return b.count > RATE_LIMIT_PER_MIN;
}
// sweep stale buckets so the map can't grow unboundedly
setInterval(() => {
  const now = Date.now();
  for (const [ip, b] of rateBuckets) if (now >= b.resetAt) rateBuckets.delete(ip);
}, 120000).unref();

const MODELS = {
  openai: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  anthropic: process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-20241022',
  xai: process.env.XAI_MODEL || 'grok-4.3',
};

const FALLBACK: Record<string, string[]> = {
  quest: [
    'Shatter the generators and end the Grave Warden. The crypt remembers.',
    'Three foul altars must fall before the way out will open.',
  ],
  bark: ['The air reeks of old graves.', 'Something stirs beyond the torchlight.', 'Steel yourself.'],
  companion: ['On your flank!', 'I have your back!', 'Strike them down!'],
  item: ['It hums with quiet power.', 'Worn, but it will serve.'],
};

function fallbackLine(context = 'bark'): string {
  const key = Object.keys(FALLBACK).find((k) => context.includes(k)) ?? 'bark';
  const arr = FALLBACK[key];
  return arr[Math.floor(Math.random() * arr.length)];
}

async function callOpenAIStyle(url: string, key: string, model: string, prompt: string, maxTokens: number, extra: Record<string, unknown> = {}): Promise<string> {
  const res = await fetch(url, {
    method: 'POST',
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature: 0.9,
      ...extra,
      messages: [
        { role: 'system', content: SYSTEM_TONE },
        { role: 'user', content: prompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(`${res.status}`);
  const data: any = await res.json();
  return (data.choices?.[0]?.message?.content ?? '').trim();
}

async function callAnthropic(key: string, model: string, prompt: string, maxTokens: number): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system: SYSTEM_TONE,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`${res.status}`);
  const data: any = await res.json();
  return (data.content?.[0]?.text ?? '').trim();
}

async function complete(provider: string, prompt: string, maxTokens: number, reasoningEffort: string): Promise<string> {
  const { OPENAI_API_KEY, ANTHROPIC_API_KEY, XAI_API_KEY } = process.env;
  if (provider === 'openai' && OPENAI_API_KEY)
    return callOpenAIStyle('https://api.openai.com/v1/chat/completions', OPENAI_API_KEY, MODELS.openai, prompt, maxTokens);
  if (provider === 'anthropic' && ANTHROPIC_API_KEY)
    return callAnthropic(ANTHROPIC_API_KEY, MODELS.anthropic, prompt, maxTokens);
  if (provider === 'xai' && XAI_API_KEY)
    return callOpenAIStyle('https://api.x.ai/v1/chat/completions', XAI_API_KEY, MODELS.xai, prompt, maxTokens, { reasoning_effort: reasoningEffort });
  throw new Error('no-key');
}

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    providers: {
      openai: !!process.env.OPENAI_API_KEY,
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      xai: !!process.env.XAI_API_KEY,
    },
  });
});

app.post('/api/ai/complete', async (req, res) => {
  const body = req.body ?? {};
  const context = typeof body.context === 'string' ? body.context.slice(0, 40) : 'bark';
  const prompt = typeof body.prompt === 'string' ? body.prompt.slice(0, MAX_PROMPT_CHARS) : '';
  const provider = PROVIDERS.has(body.provider) ? (body.provider as string) : 'fallback';
  const maxTokens = Math.max(1, Math.min(MAX_TOKENS_CAP, Number(body.maxTokens) || 40));
  const reasoningEffort = EFFORTS.has(body.reasoningEffort) ? (body.reasoningEffort as string) : 'none';
  if (rateLimited(req.ip ?? req.socket.remoteAddress ?? '?')) {
    res.json({ text: fallbackLine(context), live: false });
    return;
  }
  try {
    const text = await complete(provider, prompt, maxTokens, reasoningEffort);
    if (text) {
      res.json({ text, live: true });
      return;
    }
    res.json({ text: fallbackLine(context), live: false });
  } catch {
    res.json({ text: fallbackLine(context), live: false });
  }
});

app.listen(PORT, () => {
  console.log(`StrongBow AI proxy listening on http://localhost:${PORT}`);
});
