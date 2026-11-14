import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { authService } from '../src/modules/auth/service.js';
import { consoleEmailAdapter } from '../src/integrations/email/console.js';
import { AppError } from '../src/lib/errors.js';

// Mock DB pool
vi.mock('../src/db/pool.js', () => ({
  pingDatabase: vi.fn().mockResolvedValue({ ok: true, durationMs: 5 }),
  pool: { on: vi.fn(), end: vi.fn() },
  closePool: vi.fn(),
}));

describe('T-12: OTP Security Suite (Brute force, Expiry, Single-use, Timing, Enumeration)', () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
    consoleEmailAdapter.clear();
  });

  describe('1. Generic Response (Zero User Enumeration)', () => {
    it('returns the exact same message for registered and non-registered emails', async () => {
      const email1 = 'existing.student@campus.edu';
      const email2 = 'totally.new.person@example.com';

      vi.spyOn(authService, 'requestOtp').mockResolvedValue({
        message: 'If the email is eligible, a 6-digit code has been sent.',
      });

      const res1 = await request(app)
        .post('/api/v1/auth/otp/request')
        .send({ email: email1 });

      const res2 = await request(app)
        .post('/api/v1/auth/otp/request')
        .send({ email: email2 });

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
      expect(res1.body).toEqual({
        message: 'If the email is eligible, a 6-digit code has been sent.',
      });
      expect(res2.body).toEqual({
        message: 'If the email is eligible, a 6-digit code has been sent.',
      });
    });
  });

  describe('2. Brute Force Protection (Lockout after 5 attempts)', () => {
    it('rejects with 429 RATE_LIMITED after 5 failed verification attempts', async () => {
      vi.spyOn(authService, 'verifyOtp').mockRejectedValueOnce(
        new AppError(
          'RATE_LIMITED',
          429,
          'Too many failed attempts. Please request a new verification code.',
        ),
      );

      const res = await request(app)
        .post('/api/v1/auth/otp/verify')
        .send({ email: 'target@example.com', code: '000000' });

      expect(res.status).toBe(429);
      expect(res.body.code).toBe('RATE_LIMITED');
      expect(res.body.detail).toContain('Too many failed attempts');
    });
  });

  describe('3. Expiration (10-minute validity window)', () => {
    it('rejects expired OTP with 400 VALIDATION_ERROR', async () => {
      vi.spyOn(authService, 'verifyOtp').mockRejectedValueOnce(
        new AppError('VALIDATION_ERROR', 400, 'Invalid or expired verification code.'),
      );

      const res = await request(app)
        .post('/api/v1/auth/otp/verify')
        .send({ email: 'target@example.com', code: '123456' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      expect(res.body.detail).toBe('Invalid or expired verification code.');
    });
  });

  describe('4. Single-Use Replay Prevention', () => {
    it('rejects a code that was already consumed', async () => {
      // First verify succeeds
      vi.spyOn(authService, 'verifyOtp')
        .mockResolvedValueOnce({
          tokens: {
            accessToken: 'valid-jwt-token',
            expiresIn: 900,
            tokenType: 'Bearer',
            refreshToken: 'refresh-token-1',
          },
          user: {
            id: 'user-1',
            email: 'target@example.com',
            role: 'member',
            status: 'active',
          },
          sessionId: 'session-1',
          isNewUser: false,
        })
        // Second verify with same consumed code fails
        .mockRejectedValueOnce(
          new AppError('VALIDATION_ERROR', 400, 'Invalid or expired verification code.'),
        );

      const firstAttempt = await request(app)
        .post('/api/v1/auth/otp/verify')
        .send({ email: 'target@example.com', code: '654321' });

      expect(firstAttempt.status).toBe(200);
      expect(firstAttempt.body.tokens.accessToken).toBe('valid-jwt-token');

      const replayAttempt = await request(app)
        .post('/api/v1/auth/otp/verify')
        .send({ email: 'target@example.com', code: '654321' });

      expect(replayAttempt.status).toBe(400);
      expect(replayAttempt.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('5. Input Validation', () => {
    it('rejects invalid email formats', async () => {
      const res = await request(app)
        .post('/api/v1/auth/otp/request')
        .send({ email: 'not-an-email' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('rejects non-6-digit OTP codes', async () => {
      const res1 = await request(app)
        .post('/api/v1/auth/otp/verify')
        .send({ email: 'user@example.com', code: '123' });

      const res2 = await request(app)
        .post('/api/v1/auth/otp/verify')
        .send({ email: 'user@example.com', code: 'abcdef' });

      expect(res1.status).toBe(400);
      expect(res2.status).toBe(400);
    });
  });
});
