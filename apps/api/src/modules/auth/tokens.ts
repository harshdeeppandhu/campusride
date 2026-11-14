import crypto from 'node:crypto';
import type { UserRole, UserStatus, TrustTier } from '@campusride/shared';
import { AppError } from '../../lib/errors.js';

export interface AccessTokenPayload {
  sub: string; // user id
  email: string;
  role: UserRole;
  status: UserStatus;
  tier: TrustTier;
  sessionId: string;
  iat: number;
  exp: number;
  iss: string;
}

/**
 * Generates a cryptographically secure 6-digit numeric OTP.
 */
export function generateOtp(): string {
  // Generates integer between 100000 and 999999 inclusive
  return crypto.randomInt(100_000, 1_000_000).toString();
}

/**
 * Hashes an OTP with HMAC-SHA256 using the server pepper.
 * Raw OTP is NEVER saved in database or logged.
 */
export function hashOtp(code: string, pepper: string): string {
  return crypto.createHmac('sha256', pepper).update(code.trim()).digest('hex');
}

/**
 * Constant-time verification of OTP hash against stored HMAC.
 */
export function verifyOtpHash(code: string, expectedHmac: string, pepper: string): boolean {
  const computed = hashOtp(code, pepper);
  const bufComputed = Buffer.from(computed, 'utf8');
  const bufExpected = Buffer.from(expectedHmac, 'utf8');

  if (bufComputed.length !== bufExpected.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufComputed, bufExpected);
}

/**
 * Generates a cryptographically secure random refresh token string (256-bit).
 */
export function generateRefreshToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hashes a token string (e.g. refresh token or trip share token) with SHA-256 for safe storage.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}

/**
 * Hashes an IP address using SHA-256 with pepper for privacy-preserving auditing and rate limiting.
 */
export function hashIp(ip: string, pepper: string): string {
  return crypto.createHash('sha256').update(`${ip}:${pepper}`).digest('hex').substring(0, 32);
}

/**
 * Signs an HS256 Access JWT valid for the specified number of seconds.
 */
export function signAccessToken(
  claims: {
    userId: string;
    email: string;
    role: UserRole;
    status: UserStatus;
    tier: TrustTier;
    sessionId: string;
  },
  secret: string,
  expiresInSeconds: number,
): string {
  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const payload: AccessTokenPayload = {
    sub: claims.userId,
    email: claims.email,
    role: claims.role,
    status: claims.status,
    tier: claims.tier,
    sessionId: claims.sessionId,
    iat: now,
    exp: now + expiresInSeconds,
    iss: 'campusride-api',
  };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac('sha256', secret)
    .update(signatureInput)
    .digest('base64url');

  return `${signatureInput}.${signature}`;
}

/**
 * Verifies an HS256 Access JWT and returns its claims.
 * Throws AppError('UNAUTHENTICATED', 401) on failure.
 */
export function verifyAccessToken(token: string, secret: string): AccessTokenPayload {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new AppError('UNAUTHENTICATED', 401, 'Invalid authentication token format.');
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  if (!encodedHeader || !encodedPayload || !signature) {
    throw new AppError('UNAUTHENTICATED', 401, 'Invalid authentication token structure.');
  }

  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(signatureInput)
    .digest('base64url');

  const bufSig = Buffer.from(signature, 'utf8');
  const bufExpected = Buffer.from(expectedSignature, 'utf8');

  if (bufSig.length !== bufExpected.length || !crypto.timingSafeEqual(bufSig, bufExpected)) {
    throw new AppError('UNAUTHENTICATED', 401, 'Invalid token signature.');
  }

  let payload: AccessTokenPayload;
  try {
    const jsonStr = Buffer.from(encodedPayload, 'base64url').toString('utf8');
    payload = JSON.parse(jsonStr) as AccessTokenPayload;
  } catch {
    throw new AppError('UNAUTHENTICATED', 401, 'Corrupted token payload.');
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    throw new AppError('UNAUTHENTICATED', 401, 'Token has expired.');
  }

  if (payload.iss !== 'campusride-api') {
    throw new AppError('UNAUTHENTICATED', 401, 'Invalid token issuer.');
  }

  return payload;
}
