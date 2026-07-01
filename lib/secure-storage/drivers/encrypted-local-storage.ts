/**
 * Encrypted localStorage storage driver
 * Encrypts sensitive data before storing in localStorage
 */

import { StorageDriver, SENSITIVE_KEYS } from '../types';
import { encrypt, decrypt, isEncryptionAvailable } from '../encryption';

const PREFIX = '_osy_encrypted_';

export class EncryptedLocalStorageDriver implements StorageDriver {
  private available: boolean;

  constructor() {
    this.available = isEncryptionAvailable() && typeof window !== 'undefined';
  }

  async getItem(key: string): Promise<string | null> {
    if (!this.available) {
      return null;
    }

    try {
      // For sensitive keys, try encrypted storage first, then fallback to plain localStorage
      if (SENSITIVE_KEYS.has(key as any)) {
        const encryptedKey = `${PREFIX}${key}`;
        const encrypted = localStorage.getItem(encryptedKey);
        
        if (encrypted) {
          try {
            return await decrypt(encrypted);
          } catch (error) {
            console.error(`[v0] Failed to decrypt ${key}, trying plain storage`, error);
            // Fall back to plain storage
            const plain = localStorage.getItem(key);
            if (plain) {
              console.log(`[v0] Migrating ${key} to encrypted storage`);
              // Auto-migrate to encrypted
              try {
                await this.setItem(key, plain);
              } catch (e) {
                console.error(`[v0] Failed to migrate ${key}`, e);
              }
              return plain;
            }
          }
        } else {
          // Try plain storage (fallback during migration)
          const plain = localStorage.getItem(key);
          if (plain) {
            // Auto-migrate to encrypted
            try {
              await this.setItem(key, plain);
            } catch (e) {
              console.error(`[v0] Failed to migrate ${key}`, e);
            }
            return plain;
          }
        }

        return null;
      } else {
        // Non-sensitive keys stored in plain localStorage
        return localStorage.getItem(key);
      }
    } catch (error) {
      console.error(`[v0] Failed to get item ${key}:`, error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    if (!this.available) {
      return;
    }

    try {
      if (SENSITIVE_KEYS.has(key as any)) {
        // Encrypt sensitive data
        const encrypted = await encrypt(value);
        const encryptedKey = `${PREFIX}${key}`;
        localStorage.setItem(encryptedKey, encrypted);
        // Remove old plain storage if it exists
        localStorage.removeItem(key);
      } else {
        // Store non-sensitive data in plain localStorage
        localStorage.setItem(key, value);
      }
    } catch (error) {
      console.error(`[v0] Failed to set item ${key}:`, error);
      throw error;
    }
  }

  async removeItem(key: string): Promise<void> {
    if (!this.available) {
      return;
    }

    try {
      if (SENSITIVE_KEYS.has(key as any)) {
        const encryptedKey = `${PREFIX}${key}`;
        localStorage.removeItem(encryptedKey);
      }
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`[v0] Failed to remove item ${key}:`, error);
      throw error;
    }
  }

  async clear(): Promise<void> {
    if (!this.available) {
      return;
    }

    try {
      // Remove all OSY-prefixed keys
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('osy_') || key.startsWith(PREFIX) || key.startsWith('gemini_'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.error('[v0] Failed to clear storage:', error);
      throw error;
    }
  }
}
