/**
 * Secure encryption utilities using browser SubtleCrypto API
 * Provides AES-GCM encryption with PBKDF2 key derivation
 */

const ALGORITHM = 'AES-GCM';
const KEY_SIZE = 256; // bits
const ITERATION_COUNT = 100000;
const IV_SIZE = 12; // bytes (96 bits recommended for GCM)

/**
 * Derive a cryptographic key from browser entropy
 * Uses PBKDF2 with a random salt
 */
async function deriveKey(): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  
  // Get or create a persistent salt in localStorage (persists across sessions)
  let salt = localStorage.getItem('_osy_salt');
  if (!salt) {
    const saltBytes = crypto.getRandomValues(new Uint8Array(16));
    salt = Array.from(saltBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    localStorage.setItem('_osy_salt', salt);
  }

  const saltBytes = new Uint8Array(
    salt.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
  );

  // Use a combination of user-agent and persistent device id as password
  let deviceId = localStorage.getItem('_osy_device_id');
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem('_osy_device_id', deviceId);
  }
  const password = `${navigator.userAgent}:${deviceId}`;
  
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: ITERATION_COUNT,
      hash: 'SHA-256',
    },
    passwordKey,
    KEY_SIZE
  );

  return crypto.subtle.importKey(
    'raw',
    derivedBits,
    { name: ALGORITHM },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt data using AES-GCM
 * Returns base64-encoded string with IV prepended
 */
export async function encrypt(data: string): Promise<string> {
  try {
    const key = await deriveKey();
    const encoder = new TextEncoder();
    const plaintext = encoder.encode(data);
    
    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(IV_SIZE));
    
    // Encrypt
    const ciphertext = await crypto.subtle.encrypt(
      { name: ALGORITHM, iv },
      key,
      plaintext
    );

    // Combine IV + ciphertext and encode as base64
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.length);

    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('[v0] Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt data encrypted with encrypt()
 * Expects base64-encoded string with IV prepended
 */
export async function decrypt(encryptedData: string): Promise<string> {
  try {
    const key = await deriveKey();
    const decoder = new TextDecoder();
    
    // Decode from base64
    const combined = new Uint8Array(
      atob(encryptedData)
        .split('')
        .map(c => c.charCodeAt(0))
    );

    // Extract IV and ciphertext
    const iv = combined.slice(0, IV_SIZE);
    const ciphertext = combined.slice(IV_SIZE);

    // Decrypt
    const plaintext = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv },
      key,
      ciphertext
    );

    return decoder.decode(plaintext);
  } catch (error) {
    console.error('[v0] Decryption failed:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Check if SubtleCrypto is available
 */
export function isEncryptionAvailable(): boolean {
  return !!(
    typeof window !== 'undefined' &&
    window.crypto &&
    window.crypto.subtle &&
    typeof window.crypto.subtle.encrypt === 'function'
  );
}
