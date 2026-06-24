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

export { SYSTEM_TONE } from './persona';
