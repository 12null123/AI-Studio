export type AIProvider = 'google' | 'anthropic' | 'openai';

export interface ModelConfig {
  id: string;
  name: string;
  provider: AIProvider;
  contextWindow: number;
}

export interface UnifiedMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export const SUPPORTED_MODELS: ModelConfig[] = [
  { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', provider: 'google', contextWindow: 1048576 },
  { id: 'claude-3-7-sonnet', name: 'Claude 3.7 Sonnet', provider: 'anthropic', contextWindow: 200000 },
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', contextWindow: 128000 }
];
