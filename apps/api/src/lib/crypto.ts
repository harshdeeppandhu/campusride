import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { AppError } from './errors.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits recommended for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits

/**
 * Encrypts sensitive fields (e.g. doc_last4, contact phone) using AES-256-GCM.
 * Output format: `${ivHex}:${authTagHex}:${ciphertextHex}`
 */
export function encryptField(plaintext: string, hexKey: string = env.FIELD_ENC_KEY): string {
  const key = Buffer.from(hexKey, 'hex');
  if (key.length !== 32) {
    throw new AppError('INTERNAL', 500, 'Invalid encryption key length.');
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypts a previously encrypted field string.
 * Throws on tampering or invalid key.
 */
export function decryptField(encryptedString: string, hexKey: string = env.FIELD_ENC_KEY): string {
  const parts = encryptedString.split(':');
  if (parts.length !== 3) {
    throw new AppError('INTERNAL', 500, 'Invalid encrypted payload format.');
  }

  const [ivHex, authTagHex, ciphertextHex] = parts;
  if (!ivHex || !authTagHex || !ciphertextHex) {
    throw new AppError('INTERNAL', 500, 'Malformed encrypted parts.');
  }

  const key = Buffer.from(hexKey, 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');

  try {
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString('utf8');
  } catch {
    throw new AppError('INTERNAL', 500, 'Decryption authentication failed.');
  }
}
