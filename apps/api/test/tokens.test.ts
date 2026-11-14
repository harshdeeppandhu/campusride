import { describe, it, expect } from 'vitest';
import {
  generateOtp,
  hashOtp,
  verifyOtpHash,
  generateRefreshToken,
  hashToken,
  hashIp,
  signAccessToken,
  verifyAccessToken,
} from '../src/modules/auth/tokens.js';

describe('Auth Tokens & Cryptographic Utilities', () => {
  const testSecret = 'a-very-secure-32-character-secret-key!!';
  const testPepper = 'a-very-secure-32-character-pepper-key!!';

  describe('OTP Generation & Verification', () => {
    it('generates a 6-digit numeric string', () => {
      for (let i = 0; i < 20; i++) {
        const otp = generateOtp();
        expect(otp).toMatch(/^\d{6}$/);
        const num = parseInt(otp, 10);
        expect(num).toBeGreaterThanOrEqual(100_000);
        expect(num).toBeLessThanOrEqual(999_999);
      }
    });

    it('produces deterministic HMAC-SHA256 for the same OTP and pepper', () => {
      const otp = '123456';
      const hash1 = hashOtp(otp, testPepper);
      const hash2 = hashOtp(otp, testPepper);
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });

    it('verifies valid OTP with constant-time equality', () => {
      const otp = '654321';
      const hash = hashOtp(otp, testPepper);
      expect(verifyOtpHash(otp, hash, testPepper)).toBe(true);
    });

    it('rejects incorrect OTP', () => {
      const otp = '111111';
      const wrongOtp = '222222';
      const hash = hashOtp(otp, testPepper);
      expect(verifyOtpHash(wrongOtp, hash, testPepper)).toBe(false);
    });

    it('rejects OTP of different length without throwing', () => {
      const otp = '123456';
      const hash = hashOtp(otp, testPepper);
      expect(verifyOtpHash('123', hash, testPepper)).toBe(false);
      expect(verifyOtpHash('12345678', hash, testPepper)).toBe(false);
    });
  });

  describe('Refresh Token Utilities', () => {
    it('generates a 256-bit random hex string (64 chars)', () => {
      const token1 = generateRefreshToken();
      const token2 = generateRefreshToken();
      expect(token1).toHaveLength(64);
      expect(token2).toHaveLength(64);
      expect(token1).not.toBe(token2);
    });

    it('hashes refresh token with SHA-256', () => {
      const token = generateRefreshToken();
      const hash = hashToken(token);
      expect(hash).toHaveLength(64);
      expect(hash).toBe(hashToken(token));
    });
  });

  describe('Privacy-Preserving IP Hashing', () => {
    it('hashes IP with pepper to 32 chars without storing raw IP', () => {
      const ip = '192.168.1.100';
      const hashed = hashIp(ip, testPepper);
      expect(hashed).toHaveLength(32);
      expect(hashed).toBe(hashIp(ip, testPepper));
      expect(hashed).not.toContain(ip);
    });
  });

  describe('Access JWT Signing & Verification', () => {
    it('signs and verifies a valid HS256 access JWT', () => {
      const claims = {
        userId: '018f3a2c-1234-7000-8000-000000000001',
        email: 'student@campus.edu',
        role: 'member' as const,
        status: 'active' as const,
        tier: 2 as const,
        sessionId: '018f3a2c-1234-7000-8000-000000000002',
      };

      const token = signAccessToken(claims, testSecret, 900);
      expect(token.split('.')).toHaveLength(3);

      const payload = verifyAccessToken(token, testSecret);
      expect(payload.sub).toBe(claims.userId);
      expect(payload.email).toBe(claims.email);
      expect(payload.role).toBe(claims.role);
      expect(payload.status).toBe(claims.status);
      expect(payload.tier).toBe(claims.tier);
      expect(payload.sessionId).toBe(claims.sessionId);
      expect(payload.iss).toBe('campusride-api');
    });

    it('rejects tampered token signature', () => {
      const claims = {
        userId: 'user-1',
        email: 'user@example.com',
        role: 'member' as const,
        status: 'active' as const,
        tier: 0 as const,
        sessionId: 'session-1',
      };

      const token = signAccessToken(claims, testSecret, 900);
      const [header, payload] = token.split('.');
      const tamperedToken = `${header}.${payload}.invalidsignature1234567890`;

      expect(() => verifyAccessToken(tamperedToken, testSecret)).toThrowError(
        'Invalid token signature.',
      );
    });

    it('rejects expired token', () => {
      const claims = {
        userId: 'user-1',
        email: 'user@example.com',
        role: 'member' as const,
        status: 'active' as const,
        tier: 0 as const,
        sessionId: 'session-1',
      };

      // -10 seconds expiry
      const expiredToken = signAccessToken(claims, testSecret, -10);
      expect(() => verifyAccessToken(expiredToken, testSecret)).toThrowError('Token has expired.');
    });

    it('rejects malformed token', () => {
      expect(() => verifyAccessToken('not-a-jwt', testSecret)).toThrowError(
        'Invalid authentication token format.',
      );
    });
  });
});
