export type AIProvider = 'google' | 'anthropic' | 'openai';

export interface ModelConfig {
  id: string;
  name: string;
  provider: AIProvider;
  contextWindow: number;
  capabilities?: string[];
  supportsThinking?: boolean;
  byokRequired?: boolean;
}

export interface ProviderConfig {
  name: string;
  color: string;
  lightColor: string;
  models: ModelConfig[];
  description: string;
}

export interface UnifiedMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export const SUPPORTED_MODELS: ModelConfig[] = [
  { 
    id: 'gemini-3.5-flash', 
    name: 'Gemini 3.5 Flash', 
    provider: 'google', 
    contextWindow: 1048576,
    capabilities: ['Fast', 'Vision'],
    supportsThinking: false,
    byokRequired: false
  },
  { 
    id: 'gemini-3.1-pro-preview', 
    name: 'Gemini 3.1 Pro', 
    provider: 'google', 
    contextWindow: 1000000,
    capabilities: ['Thinking', 'Deep Reasoning'],
    supportsThinking: true,
    byokRequired: false
  },
  { 
    id: 'claude-3-7-sonnet', 
    name: 'Claude 3.7 Sonnet', 
    provider: 'anthropic', 
    contextWindow: 200000,
    capabilities: ['Balanced'],
    supportsThinking: false,
    byokRequired: true
  },
  { 
    id: 'gpt-4o', 
    name: 'GPT-4o', 
    provider: 'openai', 
    contextWindow: 128000,
    capabilities: ['Multimodal'],
    supportsThinking: false,
    byokRequired: true
  }
];

export const PROVIDER_CONFIG: Record<AIProvider, ProviderConfig> = {
  google: {
    name: 'Google',
    color: 'indigo',
    lightColor: 'indigo-400',
    description: 'Fast and versatile',
    models: SUPPORTED_MODELS.filter(m => m.provider === 'google')
  },
  anthropic: {
    name: 'Anthropic',
    color: 'amber',
    lightColor: 'amber-400',
    description: 'Thoughtful reasoning',
    models: SUPPORTED_MODELS.filter(m => m.provider === 'anthropic')
  },
  openai: {
    name: 'OpenAI',
    color: 'emerald',
    lightColor: 'emerald-400',
    description: 'Powerful and multimodal',
    models: SUPPORTED_MODELS.filter(m => m.provider === 'openai')
  }
};
