import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import type { UserRole, TrustTier } from '@campusride/shared';
import { createApp } from '../src/app.js';
import { signAccessToken } from '../src/modules/auth/tokens.js';
import { env } from '../src/config/env.js';
import * as authMiddleware from '../src/middleware/auth.js';
import { db } from '../src/db/client.js';
import { auditService } from '../src/modules/audit/service.js';

vi.mock('../src/db/pool.js', () => ({
  pingDatabase: vi.fn().mockResolvedValue({ ok: true, durationMs: 5 }),
  pool: { on: vi.fn(), end: vi.fn() },
  closePool: vi.fn(),
}));

describe('T-12: Document & Photo Upload Security Suite', () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function makeToken(role: UserRole = 'member', tier: TrustTier = 1, userId = 'user-upload-1') {
    authMiddleware.setUserStatusCache(userId, 'active');
    return signAccessToken(
      {
        userId,
        email: `${userId}@example.com`,
        role,
        status: 'active',
        tier,
        sessionId: 'session-upload-1',
      },
      env.JWT_SECRET,
      900,
    );
  }

  describe('1. MIME Type Allowlist Enforcement', () => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    const forbiddenTypes = ['image/gif', 'application/zip', 'text/html', 'application/x-sh', 'video/mp4'];

    for (const mime of allowedTypes) {
      it(`accepts allowed MIME type: ${mime}`, async () => {
        const token = makeToken('member', 1, 'user-mime-1');
        const res = await request(app)
          .post('/api/v1/verification/upload-url')
          .set('Authorization', `Bearer ${token}`)
          .send({
            kind: 'college_id',
            contentType: mime,
          });

        expect(res.status).toBe(200);
        expect(res.body.uploadUrl).toBeDefined();
        expect(res.body.key).toBeDefined();
        expect(res.body.expiresInSeconds).toBe(300);
      });
    }

    for (const mime of forbiddenTypes) {
      it(`rejects forbidden MIME type: ${mime} with 400 VALIDATION_ERROR`, async () => {
        const token = makeToken('member', 1, 'user-mime-2');
        const res = await request(app)
          .post('/api/v1/verification/upload-url')
          .set('Authorization', `Bearer ${token}`)
          .send({
            kind: 'college_id',
            contentType: mime,
          });

        expect(res.status).toBe(400);
        expect(res.body.code).toBe('VALIDATION_ERROR');
      });
    }
  });

  describe('2. Random Key Generation & Path Traversal Prevention', () => {
    it('generates unguessable random UUID keys scoped to userId', async () => {
      const userId = '018f3a2c-1234-7000-8000-000000000099';
      const token = makeToken('member', 1, userId);

      const res1 = await request(app)
        .post('/api/v1/verification/upload-url')
        .set('Authorization', `Bearer ${token}`)
        .send({ kind: 'driving_licence', contentType: 'image/jpeg' });

      const res2 = await request(app)
        .post('/api/v1/verification/upload-url')
        .set('Authorization', `Bearer ${token}`)
        .send({ kind: 'driving_licence', contentType: 'image/jpeg' });

      expect(res1.body.key).toMatch(new RegExp(`^docs/${userId}/[0-9a-f-]{36}\\.jpeg$`));
      expect(res2.body.key).toMatch(new RegExp(`^docs/${userId}/[0-9a-f-]{36}\\.jpeg$`));
      expect(res1.body.key).not.toBe(res2.body.key);
    });

    it('generates avatar keys scoped to userId for profile photo upload', async () => {
      const userId = '018f3a2c-1234-7000-8000-000000000088';
      const token = makeToken('member', 1, userId);

      const res = await request(app)
        .post('/api/v1/me/photo/upload-url')
        .set('Authorization', `Bearer ${token}`)
        .send({ contentType: 'image/png' });

      expect(res.status).toBe(200);
      expect(res.body.key).toMatch(new RegExp(`^avatars/${userId}/[0-9a-f-]{36}\\.png$`));
      expect(res.body.expiresInSeconds).toBe(300);
    });

    it('rejects PDF for profile photo upload with 400', async () => {
      const token = makeToken('member', 1, 'user-avatar-1');
      const res = await request(app)
        .post('/api/v1/me/photo/upload-url')
        .set('Authorization', `Bearer ${token}`)
        .send({ contentType: 'application/pdf' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('3. Admin Secure 60-Second Document Download & Auditing', () => {
    const fakeRequestId = '018f3a2c-1234-7000-8000-000000000055';

    it('returns a 60-second download URL for admins and records audit log', async () => {
      const adminToken = makeToken('admin', 3, 'admin-doc-1');
      const auditSpy = vi.spyOn(auditService, 'log').mockResolvedValue();

      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: fakeRequestId,
                userId: 'user-doc-target',
                kind: 'college_id',
                docKey: 'docs/user-doc-target/doc-uuid-12345.png',
                status: 'pending',
              },
            ]),
          }),
        }),
      } as unknown as ReturnType<typeof db.select>);

      const res = await request(app)
        .get(`/api/v1/admin/verification/${fakeRequestId}/doc-url`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.downloadUrl).toBeDefined();
      expect(res.body.expiresInSeconds).toBe(60);

      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'admin-doc-1',
          action: 'verification.doc_viewed',
          entity: 'verification_requests',
          entityId: fakeRequestId,
        }),
      );
    });

    it('rejects non-admin users with 403 FORBIDDEN', async () => {
      const memberToken = makeToken('member', 2, 'member-doc-1');

      const res = await request(app)
        .get(`/api/v1/admin/verification/${fakeRequestId}/doc-url`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });

    it('returns 404 if document has been purged', async () => {
      const adminToken = makeToken('admin', 3, 'admin-doc-2');

      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: fakeRequestId,
                userId: 'user-doc-target',
                kind: 'college_id',
                docKey: null, // Purged
                status: 'approved',
              },
            ]),
          }),
        }),
      } as unknown as ReturnType<typeof db.select>);

      const res = await request(app)
        .get(`/api/v1/admin/verification/${fakeRequestId}/doc-url`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('NOT_FOUND');
      expect(res.body.detail).toContain('purged');
    });
  });
});
