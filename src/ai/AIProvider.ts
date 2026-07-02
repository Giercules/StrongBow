export interface AIRequest {
  prompt: string;
  context?: string; // category hint: 'quest' | 'bark' | 'companion' | 'item' | set-piece
  maxTokens?: number;
  reasoningEffort?: 'none' | 'low' | 'medium';
}

export interface AIProvider {
  readonly id: string;
  available(): boolean;
  complete(req: AIRequest): Promise<string>;
}

/** Shared timeout for every AI call. Narration is fire-and-forget flavor — a
 *  hung request must never pin the DM status on "thinking" indefinitely. */
export const AI_FETCH_TIMEOUT_MS = 12000;

export { SYSTEM_TONE } from './persona';
