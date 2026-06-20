import type { AIProviderId } from '../core/types';

// Centralized AI env config. Kept separate from GameSettings/AIService to avoid
// import cycles, and so the provider label can sync from env at startup.

export const AI_USE_PROXY: boolean = import.meta.env.VITE_AI_USE_PROXY === 'true';

const VALID: AIProviderId[] = ['openai', 'anthropic', 'xai', 'fallback'];

export const AI_DEFAULT_PROVIDER: AIProviderId = (() => {
  const p = import.meta.env.VITE_AI_PROVIDER as AIProviderId | undefined;
  return p && VALID.includes(p) ? p : 'fallback';
})();
