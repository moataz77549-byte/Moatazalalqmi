/**
 * Moataz AI — Secure Key Vault
 * Uses Web Crypto API for compatibility with both Node.js and Edge Runtime.
 */

const MASTER_KEY_STR = process.env.ENCRYPTION_MASTER_KEY || 'moataz-ai-dev-master-key-change-in-production-32b!';

async function getMasterKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyData = enc.encode(MASTER_KEY_STR);
  const hash = await crypto.subtle.digest('SHA-256', keyData);
  return crypto.subtle.importKey(
    'raw',
    hash,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptApiKey(plaintext: string): Promise<string> {
  const key = await getMasterKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const encodedPlaintext = enc.encode(plaintext);

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encodedPlaintext
  );

  const encryptedArray = new Uint8Array(encrypted);
  const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');
  const encryptedHex = Array.from(encryptedArray).map(b => b.toString(16).padStart(2, '0')).join('');

  return `${ivHex}:${encryptedHex}`;
}

export async function decryptApiKey(encrypted: string): Promise<string> {
  const key = await getMasterKey();
  const [ivHex, encryptedHex] = encrypted.split(':');
  if (!ivHex || !encryptedHex) throw new Error('Invalid encrypted key format');

  const iv = new Uint8Array(ivHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
  const encryptedArray = new Uint8Array(encryptedHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encryptedArray
  );

  const dec = new TextDecoder();
  return dec.decode(decrypted);
}

export function maskApiKey(key: string): string {
  if (key.length <= 8) return '****';
  return key.substring(0, 4) + '****' + key.substring(key.length - 4);
}

export async function generateApiKey(): Promise<{ key: string; hash: string; prefix: string }> {
  const random = crypto.getRandomValues(new Uint8Array(24));
  const randomHex = Array.from(random).map(b => b.toString(16).padStart(2, '0')).join('');
  const key = `mz_${randomHex}`;

  const hash = await hashApiKey(key);
  const prefix = key.substring(0, 12);

  return { key, hash, prefix };
}

export async function hashApiKey(key: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(key);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function validateApiKeyFormat(key: string): boolean {
  return /^mz_[a-f0-9]{48}$/.test(key);
}
