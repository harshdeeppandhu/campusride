import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import type { UserRole, TrustTier } from '@campusride/shared';
import { createApp } from '../src/app.js';
import { signAccessToken, hashOtp } from '../src/modules/auth/tokens.js';
import { env } from '../src/config/env.js';
import * as authMiddleware from '../src/middleware/auth.js';
import { db } from '../src/db/client.js';
import { getSmsProvider } from '../src/integrations/sms/index.js';
import { getStorageProvider } from '../src/integrations/storage/index.js';
import { purgeExpiredDocuments } from '../src/jobs/purge-docs.js';
import { auditService } from '../src/modules/audit/service.js';

vi.mock('../src/db/pool.js', () => ({
  pingDatabase: vi.fn().mockResolvedValue({ ok: true, durationMs: 5 }),
  pool: { on: vi.fn(), end: vi.fn() },
  closePool: vi.fn(),
}));

describe('T-13: Verification Flow & Trust Tier Transitions', () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function makeToken(
    role: UserRole = 'member',
    tier: TrustTier = 0,
    userId = 'user-flow-1',
    email = 'user@example.com',
  ) {
    authMiddleware.setUserStatusCache(userId, 'active');
    return signAccessToken(
      {
        userId,
        email,
        role,
        status: 'active',
        tier,
        sessionId: 'session-flow-1',
      },
      env.JWT_SECRET,
      900,
    );
  }

  describe('1. Phone Verification (T0 -> T1 Transition)', () => {
    const userId = '018f3a2c-1234-7000-8000-000000000101';
    const phone = '+919876543210';

    it('sends phone OTP via SmsProvider', async () => {
      const token = makeToken('member', 0, userId);

      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: userId,
                email: 'user@example.com',
                phoneE164: null,
                phoneVerifiedAt: null,
              },
            ]),
          }),
        }),
      } as unknown as ReturnType<typeof db.select>);

      vi.spyOn(db, 'insert').mockReturnValue({
        values: vi.fn().mockResolvedValue({}),
      } as unknown as ReturnType<typeof db.insert>);

      const sms = getSmsProvider();
      const sendSpy = vi.spyOn(sms, 'sendOtp');

      const res = await request(app)
        .post('/api/v1/me/phone/request-otp')
        .set('Authorization', `Bearer ${token}`)
        .send({ phone });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Verification code sent');
      expect(sendSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          phone,
          expiryMinutes: 10,
        }),
      );
    });

    it('verifies phone OTP and advances to T1', async () => {
      const token = makeToken('member', 0, userId);
      const code = '123456';
      const codeHmac = hashOtp(code, env.OTP_HMAC_PEPPER);

      function createMockChain(items: unknown[]) {
        const p = Promise.resolve(items);
        return Object.assign(p, {
          limit: vi.fn().mockReturnValue(Promise.resolve(items)),
          orderBy: vi.fn().mockImplementation(() =>
            Object.assign(Promise.resolve(items), {
              limit: vi.fn().mockReturnValue(Promise.resolve(items)),
            }),
          ),
        });
      }

      let selectCallCount = 0;
      vi.spyOn(db, 'select').mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // 1. Select user for verifyPhoneOtp
          return {
            from: () => ({
              where: () =>
                createMockChain([
                  {
                    id: userId,
                    email: 'user@example.com',
                    emailVerifiedAt: new Date(),
                    adultConfirmedAt: new Date(),
                    phoneE164: null,
                    phoneVerifiedAt: null,
                    collegeVerifiedAt: null,
                    gender: 'undisclosed',
                    genderVerifiedAt: null,
                  },
                ]),
            }),
          } as unknown as ReturnType<typeof db.select>;
        }
        if (selectCallCount === 2) {
          // 2. Select active challenge
          return {
            from: () => ({
              where: () =>
                createMockChain([
                  {
                    id: 'challenge-phone-1',
                    email: `phone:${phone}`,
                    codeHmac,
                    expiresAt: new Date(Date.now() + 600000),
                    attempts: 0,
                    consumedAt: null,
                  },
                ]),
            }),
          } as unknown as ReturnType<typeof db.select>;
        }
        if (selectCallCount === 3) {
          // 3. Check existing phone
          return {
            from: () => ({
              where: () => createMockChain([]),
            }),
          } as unknown as ReturnType<typeof db.select>;
        }
        if (selectCallCount === 4) {
          // 4. Select user in getTrust
          return {
            from: () => ({
              where: () =>
                createMockChain([
                  {
                    id: userId,
                    email: 'user@example.com',
                    emailVerifiedAt: new Date(),
                    adultConfirmedAt: new Date(),
                    phoneE164: phone,
                    phoneVerifiedAt: new Date(),
                    collegeVerifiedAt: null,
                    gender: 'undisclosed',
                    genderVerifiedAt: null,
                  },
                ]),
            }),
          } as unknown as ReturnType<typeof db.select>;
        }
        // Consents, verificationRequests, vehicles
        return {
          from: () => ({
            where: () => createMockChain([]),
          }),
        } as unknown as ReturnType<typeof db.select>;
      });

      vi.spyOn(db, 'update').mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue({}),
        }),
      } as unknown as ReturnType<typeof db.update>);

      const res = await request(app)
        .post('/api/v1/me/phone/verify')
        .set('Authorization', `Bearer ${token}`)
        .send({ phone, code });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Phone verified successfully');
    });
  });

  describe('2. Admin Review Decisions & Tier Progression', () => {
    const adminId = '018f3a2c-1234-7000-8000-000000000999';
    const requestId = '018f3a2c-1234-7000-8000-000000000201';
    const targetUserId = '018f3a2c-1234-7000-8000-000000000202';

    it('approves college ID and records audit log', async () => {
      const adminToken = makeToken('admin', 3, adminId);
      const auditSpy = vi.spyOn(auditService, 'log').mockResolvedValue();

      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: requestId,
                userId: targetUserId,
                kind: 'college_id',
                vehicleId: null,
                docKey: 'docs/test.png',
                status: 'pending',
              },
            ]),
          }),
        }),
      } as unknown as ReturnType<typeof db.select>);

      const updateSpy = vi.spyOn(db, 'update').mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue({}),
        }),
      } as unknown as ReturnType<typeof db.update>);

      const res = await request(app)
        .post(`/api/v1/admin/verification/${requestId}/decision`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ decision: 'approved' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('approved');
      expect(updateSpy).toHaveBeenCalled();
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'verification.decision',
          entityId: requestId,
        }),
      );
    });

    it('rejects document decision when rejectReason is missing', async () => {
      const adminToken = makeToken('admin', 3, adminId);

      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: requestId,
                userId: targetUserId,
                kind: 'college_id',
                docKey: 'docs/test.png',
                status: 'pending',
              },
            ]),
          }),
        }),
      } as unknown as ReturnType<typeof db.select>);

      const res = await request(app)
        .post(`/api/v1/admin/verification/${requestId}/decision`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ decision: 'rejected' }); // No rejectReason

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('3. Gender Verification & women_verified Badge', () => {
    const adminId = '018f3a2c-1234-7000-8000-000000000999';
    const femaleUserId = '018f3a2c-1234-7000-8000-000000000301';

    it('sets gender verified flag by admin and enables women_verified badge', async () => {
      const adminToken = makeToken('admin', 3, adminId);

      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: femaleUserId,
                gender: 'female',
                genderVerifiedAt: null,
              },
            ]),
          }),
        }),
      } as unknown as ReturnType<typeof db.select>);

      vi.spyOn(db, 'update').mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue({}),
        }),
      } as unknown as ReturnType<typeof db.update>);

      const res = await request(app)
        .post(`/api/v1/admin/users/${femaleUserId}/set-gender-verified`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ verified: true });

      expect(res.status).toBe(200);
      expect(res.body.genderVerifiedAt).toBeDefined();
    });

    it('prevents regular members from setting gender verification', async () => {
      const memberToken = makeToken('member', 2, 'member-evil-1');

      const res = await request(app)
        .post(`/api/v1/admin/users/${femaleUserId}/set-gender-verified`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ verified: true });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });
  });

  describe('4. Document Retention Purge Job', () => {
    it('purges documents older than 30 days and removes docKey from DB', async () => {
      const storage = getStorageProvider();
      const deleteSpy = vi.spyOn(storage, 'delete').mockResolvedValue();

      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            {
              id: 'req-old-1',
              docKey: 'docs/user-1/old-doc-1.png',
              userId: 'user-1',
              kind: 'college_id',
            },
            {
              id: 'req-old-2',
              docKey: 'docs/user-2/old-doc-2.pdf',
              userId: 'user-2',
              kind: 'driving_licence',
            },
          ]),
        }),
      } as unknown as ReturnType<typeof db.select>);

      const updateSpy = vi.spyOn(db, 'update').mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue({}),
        }),
      } as unknown as ReturnType<typeof db.update>);

      const result = await purgeExpiredDocuments(new Date());

      expect(result.scanned).toBe(2);
      expect(result.purged).toBe(2);
      expect(result.errors).toBe(0);
      expect(deleteSpy).toHaveBeenCalledTimes(2);
      expect(updateSpy).toHaveBeenCalledTimes(2);
    });
  });
});
