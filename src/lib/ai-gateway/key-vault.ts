import crypto from 'crypto';

// In production, these should be loaded from a real secrets manager (AWS KMS, HashiCorp Vault, etc.)
const MASTER_KEY = process.env.ENCRYPTION_MASTER_KEY || 'moataz-ai-dev-master-key-change-in-production-32b!';

function getMasterKey(): Buffer {
  // Derive a 32-byte key from the master key string
  return crypto.createHash('sha256').update(MASTER_KEY).digest();
}

const ALGORITHM = 'aes-256-gcm';

export function encryptApiKey(plaintext: string): string {
  const key = getMasterKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decryptApiKey(encrypted: string): string {
  const key = getMasterKey();
  const parts = encrypted.split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted key format');

  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encryptedData = parts[2];

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

export function maskApiKey(key: string): string {
  if (key.length <= 8) return '****';
  return key.substring(0, 4) + '****' + key.substring(key.length - 4);
}

export function generateApiKey(): { key: string; hash: string; prefix: string } {
  // Generate a random API key
  const random = crypto.randomBytes(24).toString('hex');
  const key = `mz_${random}`;

  // Hash for storage (never store plaintext)
  const hash = crypto.createHash('sha256').update(key).digest('hex');

  // Prefix for identification
  const prefix = key.substring(0, 12);

  return { key, hash, prefix };
}

export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

export function validateApiKeyFormat(key: string): boolean {
  return /^mz_[a-f0-9]{48}$/.test(key);
}
