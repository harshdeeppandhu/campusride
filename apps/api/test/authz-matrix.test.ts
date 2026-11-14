import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express, { type Request, type Response } from 'express';
import type { UserRole, TrustTier } from '@campusride/shared';
import { createApp } from '../src/app.js';
import { signAccessToken } from '../src/modules/auth/tokens.js';
import { env } from '../src/config/env.js';
import * as authMiddleware from '../src/middleware/auth.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { idempotency } from '../src/middleware/idempotency.js';
import { db } from '../src/db/client.js';

vi.mock('../src/db/pool.js', () => ({
  pingDatabase: vi.fn().mockResolvedValue({ ok: true, durationMs: 5 }),
  pool: { on: vi.fn(), end: vi.fn() },
  closePool: vi.fn(),
}));

describe('T-14: Authorization Matrix & Access Control Suite', () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function makeToken(role: UserRole = 'member', tier: TrustTier = 0, userId = 'user-authz-1') {
    authMiddleware.setUserStatusCache(userId, 'active');
    return signAccessToken(
      {
        userId,
        email: `${userId}@example.com`,
        role,
        status: 'active',
        tier,
        sessionId: 'session-authz-1',
      },
      env.JWT_SECRET,
      900,
    );
  }

  describe('1. Anonymous vs Protected Routes', () => {
    it('allows anonymous access to /healthz and /readyz', async () => {
      const res1 = await request(app).get('/api/v1/healthz');
      const res2 = await request(app).get('/api/v1/readyz');
      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
    });

    it('rejects unauthenticated requests to /auth/sessions with 401', async () => {
      const res = await request(app).get('/api/v1/auth/sessions');
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHENTICATED');
    });

    it('rejects unauthenticated requests to /me with 401', async () => {
      const res = await request(app).get('/api/v1/me');
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHENTICATED');
    });

    it('rejects unauthenticated requests to /me/trust with 401', async () => {
      const res = await request(app).get('/api/v1/me/trust');
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHENTICATED');
    });

    it('rejects unauthenticated requests to /verification/upload-url with 401', async () => {
      const res = await request(app).post('/api/v1/verification/upload-url').send({});
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHENTICATED');
    });

    it('rejects unauthenticated requests to /vehicles with 401', async () => {
      const res = await request(app).get('/api/v1/vehicles');
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHENTICATED');
    });

    it('rejects unauthenticated requests to /admin/verification-queue with 401', async () => {
      const res = await request(app).get('/api/v1/admin/verification-queue');
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHENTICATED');
    });

    it('rejects non-admin member from /admin/verification-queue with 403 FORBIDDEN', async () => {
      const memberToken = makeToken('member', 1, 'user-authz-member');
      const res = await request(app)
        .get('/api/v1/admin/verification-queue')
        .set('Authorization', `Bearer ${memberToken}`);
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });

    it('allows anonymous access to /places/hubs', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      } as unknown as ReturnType<typeof db.select>);

      const res = await request(app).get('/api/v1/places/hubs');
      expect(res.status).toBe(200);
    });

    it('rejects unauthenticated requests to /rides/mine with 401', async () => {
      const res = await request(app).get('/api/v1/rides/mine');
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHENTICATED');
    });

    it('rejects T2 user from publishing ride on POST /rides with 403 TIER_REQUIRED', async () => {
      const t2Token = makeToken('member', 2, 'user-authz-t2');
      const res = await request(app)
        .post('/api/v1/rides')
        .set('Authorization', `Bearer ${t2Token}`)
        .set('Idempotency-Key', 'idem-matrix-1')
        .send({});
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('TIER_REQUIRED');
    });
  });

  describe('2. Role-Based Access Control (requireRole)', () => {
    const testApp = express();
    testApp.use(express.json());
    testApp.get(
      '/admin-only',
      authMiddleware.requireAuth,
      authMiddleware.requireRole('admin'),
      (_req: Request, res: Response) => {
        res.status(200).json({ ok: true });
      },
    );
    testApp.get(
      '/safety-only',
      authMiddleware.requireAuth,
      authMiddleware.requireRole('safety_admin', 'admin'),
      (_req: Request, res: Response) => {
        res.status(200).json({ ok: true });
      },
    );
    testApp.use(errorHandler);

    it('blocks member from admin-only route with 403 FORBIDDEN', async () => {
      const memberToken = makeToken('member', 0, 'user-role-1');

      const res = await request(testApp)
        .get('/admin-only')
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });

    it('allows admin on admin-only route', async () => {
      const adminToken = makeToken('admin', 2, 'user-role-2');

      const res = await request(testApp)
        .get('/admin-only')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });

    it('allows safety_admin on safety-only route', async () => {
      const safetyToken = makeToken('safety_admin', 2, 'user-role-3');

      const res = await request(testApp)
        .get('/safety-only')
        .set('Authorization', `Bearer ${safetyToken}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });
  });

  describe('3. Trust Tier Gating (requireTier)', () => {
    const testApp = express();
    testApp.use(express.json());
    testApp.get(
      '/t2-route',
      authMiddleware.requireAuth,
      authMiddleware.requireTier(2),
      (_req: Request, res: Response) => {
        res.status(200).json({ tier: 2 });
      },
    );
    testApp.get(
      '/t3-route',
      authMiddleware.requireAuth,
      authMiddleware.requireTier(3),
      (_req: Request, res: Response) => {
        res.status(200).json({ tier: 3 });
      },
    );
    testApp.use(errorHandler);

    it('blocks T0 user from T2 route with 403 TIER_REQUIRED', async () => {
      const t0Token = makeToken('member', 0, 'user-tier-1');

      const res = await request(testApp)
        .get('/t2-route')
        .set('Authorization', `Bearer ${t0Token}`);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('TIER_REQUIRED');
      expect(res.body.detail).toContain('Trust tier T2 is required');
    });

    it('blocks T2 user from T3 driver route with 403 TIER_REQUIRED', async () => {
      const t2Token = makeToken('member', 2, 'user-tier-2');

      const res = await request(testApp)
        .get('/t3-route')
        .set('Authorization', `Bearer ${t2Token}`);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('TIER_REQUIRED');
      expect(res.body.detail).toContain('Trust tier T3 is required');
    });

    it('allows T3 user on T2 and T3 routes', async () => {
      const t3Token = makeToken('member', 3, 'user-tier-3');

      const res1 = await request(testApp)
        .get('/t2-route')
        .set('Authorization', `Bearer ${t3Token}`);

      const res2 = await request(testApp)
        .get('/t3-route')
        .set('Authorization', `Bearer ${t3Token}`);

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
    });
  });

  describe('4. Idempotency Middleware Protection', () => {
    const testApp = express();
    testApp.use(express.json());
    testApp.post(
      '/mutate',
      authMiddleware.requireAuth,
      idempotency({ required: true }),
      (_req: Request, res: Response) => {
        res.status(201).json({ created: true, timestamp: Date.now() });
      },
    );
    testApp.use(errorHandler);

    it('rejects missing Idempotency-Key header when required', async () => {
      const token = makeToken('member', 1, 'user-idem-1');

      const res = await request(testApp)
        .post('/mutate')
        .set('Authorization', `Bearer ${token}`)
        .send({ amount: 100 });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      expect(res.body.detail).toContain('Idempotency-Key header is required');
    });

    it('detects payload mismatch when same idempotency key is reused with different body', async () => {
      const token = makeToken('member', 1, 'user-idem-2');

      // Mock DB lookup returning existing entry with different requestHash
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                key: 'key-123',
                userId: 'user-idem-2',
                requestHash: 'hash-of-original-payload',
                response: { created: true },
                statusCode: 201,
              },
            ]),
          }),
        }),
      } as unknown as ReturnType<typeof db.select>);

      const res = await request(testApp)
        .post('/mutate')
        .set('Authorization', `Bearer ${token}`)
        .set('Idempotency-Key', 'key-123')
        .send({ differentField: true });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('IDEMPOTENCY_MISMATCH');
    });
  });
});
