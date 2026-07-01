/**
 * Storage driver interface and types
 */

export interface StorageDriver {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
}

export enum StorageKey {
  // Credentials (sensitive)
  GOOGLE_API_KEY = 'osy_key_google',
  ANTHROPIC_API_KEY = 'osy_key_anthropic',
  OPENAI_API_KEY = 'osy_key_openai',

  // App state (non-sensitive)
  CONVERSATIONS = 'gemini_wrapper_chats',
  ACTIVE_CHAT_ID = 'gemini_active_chat_id',
  ACTIVE_PROVIDER = 'osy_active_provider',
  ACTIVE_MODEL_ID = 'osy_active_model_id',
}

export enum AIProvider {
  GOOGLE = 'google',
  ANTHROPIC = 'anthropic',
  OPENAI = 'openai',
}

export const PROVIDER_TO_KEY: Record<AIProvider, StorageKey> = {
  [AIProvider.GOOGLE]: StorageKey.GOOGLE_API_KEY,
  [AIProvider.ANTHROPIC]: StorageKey.ANTHROPIC_API_KEY,
  [AIProvider.OPENAI]: StorageKey.OPENAI_API_KEY,
};

/**
 * Sensitive keys that should be encrypted
 */
export const SENSITIVE_KEYS = new Set([
  StorageKey.GOOGLE_API_KEY,
  StorageKey.ANTHROPIC_API_KEY,
  StorageKey.OPENAI_API_KEY,
]);
