import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { authService } from '../src/modules/auth/service.js';
import { signAccessToken } from '../src/modules/auth/tokens.js';
import { env } from '../src/config/env.js';
import { AppError } from '../src/lib/errors.js';
import * as authMiddleware from '../src/middleware/auth.js';

vi.mock('../src/db/pool.js', () => ({
  pingDatabase: vi.fn().mockResolvedValue({ ok: true, durationMs: 5 }),
  pool: { on: vi.fn(), end: vi.fn() },
  closePool: vi.fn(),
}));

describe('T-13: Session Lifecycle Suite (Rotation, Theft Detection, Logout, Suspensions)', () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Refresh Token Rotation', () => {
    it('successfully rotates refresh token and returns new access JWT and rt cookie', async () => {
      vi.spyOn(authService, 'refreshSession').mockResolvedValueOnce({
        accessToken: 'new-rotated-access-token',
        expiresIn: 900,
        tokenType: 'Bearer',
        refreshToken: 'new-rotated-refresh-token',
      });

      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'valid-old-refresh-token' });

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBe('new-rotated-access-token');
      expect(res.body.refreshToken).toBe('new-rotated-refresh-token');

      // Check httpOnly cookie is set
      const cookies = res.headers['set-cookie'] as string[] | undefined;
      expect(cookies).toBeDefined();
      expect(cookies?.[0]).toContain('rt=new-rotated-refresh-token');
      expect(cookies?.[0]).toContain('HttpOnly');
    });

    it('accepts refresh token from httpOnly cookie', async () => {
      vi.spyOn(authService, 'refreshSession').mockResolvedValueOnce({
        accessToken: 'cookie-refreshed-token',
        expiresIn: 900,
        tokenType: 'Bearer',
        refreshToken: 'new-refresh-token',
      });

      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', ['rt=cookie-token-123']);

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBe('cookie-refreshed-token');
    });
  });

  describe('2. Token Theft / Reuse Detection', () => {
    it('revokes entire session family and returns 401 when a revoked token is reused', async () => {
      vi.spyOn(authService, 'refreshSession').mockRejectedValueOnce(
        new AppError(
          'UNAUTHENTICATED',
          401,
          'Invalid session. Token reuse detected. Please sign in again.',
        ),
      );

      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'stolen-already-used-refresh-token' });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHENTICATED');
      expect(res.body.detail).toContain('Token reuse detected');
    });
  });

  describe('3. Logout', () => {
    it('revokes current session and clears rt cookie', async () => {
      vi.spyOn(authService, 'logout').mockResolvedValueOnce();

      const validToken = signAccessToken(
        {
          userId: 'user-logout-1',
          email: 'logout@example.com',
          role: 'member',
          status: 'active',
          tier: 1,
          sessionId: 'session-logout-1',
        },
        env.JWT_SECRET,
        900,
      );

      authMiddleware.setUserStatusCache('user-logout-1', 'active');

      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Logged out successfully');

      // Check cookie cleared
      const cookies = res.headers['set-cookie'] as string[] | undefined;
      expect(cookies).toBeDefined();
      expect(cookies?.[0]).toMatch(/rt=;/);
    });
  });

  describe('4. Suspended User Rejection', () => {
    it('immediately rejects token from suspended user with 403 FORBIDDEN', async () => {
      const validToken = signAccessToken(
        {
          userId: 'suspended-user-id',
          email: 'badactor@example.com',
          role: 'member',
          status: 'active', // token claim says active, but DB status is suspended
          tier: 1,
          sessionId: 'session-bad-1',
        },
        env.JWT_SECRET,
        900,
      );

      // Status cache reports suspended
      authMiddleware.setUserStatusCache('suspended-user-id', 'suspended');

      const res = await request(app)
        .get('/api/v1/me')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
      expect(res.body.detail).toContain('Account is suspended or deactivated');
    });
  });
});
