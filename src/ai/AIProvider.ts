export interface AIRequest {
  prompt: string;
  context?: string; // category hint: 'quest' | 'bark' | 'companion' | 'item'
  maxTokens?: number;
}

export interface AIProvider {
  readonly id: string;
  available(): boolean;
  complete(req: AIRequest): Promise<string>;
}

export const SYSTEM_TONE =
  'You are a short, punchy, arcade-flavored dungeon narrator for the game StrongBow. ' +
  'Reply with a single vivid line, no quotes, under 16 words.';
