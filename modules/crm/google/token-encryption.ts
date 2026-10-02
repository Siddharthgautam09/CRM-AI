import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

import { env } from '../../../config/env';

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;

// 64 hex chars = 32 bytes, as AES-256 requires.
const KEY = Buffer.from(env.google.tokenEncryptionKey, 'hex');

/** Google access/refresh tokens are never stored in plaintext — this is the only place that encrypts/decrypts them. */
export function encryptToken(plaintext: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, KEY, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]).toString('base64');
}

export function decryptToken(encoded: string): string {
  const raw = Buffer.from(encoded, 'base64');
  const iv = raw.subarray(0, IV_BYTES);
  const authTag = raw.subarray(IV_BYTES, IV_BYTES + 16);
  const ciphertext = raw.subarray(IV_BYTES + 16);
  const decipher = createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}
