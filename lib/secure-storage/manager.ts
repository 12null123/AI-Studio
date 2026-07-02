/**
 * Storage manager singleton
 * Provides unified interface for storing and retrieving sensitive and non-sensitive data
 */

import { StorageDriver, StorageKey, AIProvider, PROVIDER_TO_KEY } from './types';
import { EncryptedLocalStorageDriver } from './drivers/encrypted-local-storage';

class StorageManager {
  private driver: StorageDriver;
  private initialized = false;

  constructor() {
    this.driver = new EncryptedLocalStorageDriver();
  }

  /**
   * Initialize storage manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    this.initialized = true;
    console.log('[v0] StorageManager initialized');
  }

  /**
   * Get API credential for a provider
   */
  async getCredential(provider: AIProvider): Promise<string | null> {
    const key = PROVIDER_TO_KEY[provider];
    try {
      const value = await this.driver.getItem(key);
      return value;
    } catch (error) {
      console.error(`[v0] Failed to get credential for ${provider}:`, error);
      return null;
    }
  }

  /**
   * Set API credential for a provider
   */
  async setCredential(provider: AIProvider, credential: string): Promise<void> {
    const key = PROVIDER_TO_KEY[provider];
    try {
      await this.driver.setItem(key, credential);
    } catch (error) {
      console.error(`[v0] Failed to set credential for ${provider}:`, error);
      throw error;
    }
  }

  /**
   * Remove API credential for a provider
   */
  async removeCredential(provider: AIProvider): Promise<void> {
    const key = PROVIDER_TO_KEY[provider];
    try {
      await this.driver.removeItem(key);
    } catch (error) {
      console.error(`[v0] Failed to remove credential for ${provider}:`, error);
      throw error;
    }
  }

  /**
   * Get app state value
   */
  async getAppState(key: StorageKey): Promise<string | null> {
    try {
      const value = await this.driver.getItem(key);
      return value;
    } catch (error) {
      console.error(`[v0] Failed to get app state for ${key}:`, error);
      return null;
    }
  }

  /**
   * Set app state value
   */
  async setAppState(key: StorageKey, value: string): Promise<void> {
    try {
      await this.driver.setItem(key, value);
    } catch (error) {
      console.error(`[v0] Failed to set app state for ${key}:`, error);
      throw error;
    }
  }

  /**
   * Remove app state value
   */
  async removeAppState(key: StorageKey): Promise<void> {
    try {
      await this.driver.removeItem(key);
    } catch (error) {
      console.error(`[v0] Failed to remove app state for ${key}:`, error);
      throw error;
    }
  }

  /**
   * Clear all stored data
   */
  async clear(): Promise<void> {
    try {
      await this.driver.clear();
      console.log('[v0] All storage cleared');
    } catch (error) {
      console.error('[v0] Failed to clear storage:', error);
      throw error;
    }
  }

  /**
   * Check if encryption is available
   */
  isEncryptionEnabled(): boolean {
    return this.driver instanceof EncryptedLocalStorageDriver;
  }
}

/**
 * Global storage manager instance
 */
let instance: StorageManager | null = null;

export function getStorageManager(): StorageManager {
  if (!instance) {
    instance = new StorageManager();
  }
  return instance;
}

// Type exports for convenience
export type { StorageDriver };
export { StorageKey, AIProvider };
