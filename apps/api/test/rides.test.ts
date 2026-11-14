import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import type { UserRole, TrustTier } from '@campusride/shared';
import { createApp } from '../src/app.js';
import { signAccessToken } from '../src/modules/auth/tokens.js';
import { env } from '../src/config/env.js';
import * as authMiddleware from '../src/middleware/auth.js';
import { db } from '../src/db/client.js';
import { users, vehicles, idempotencyKeys } from '../src/db/schema.js';
import { autoCompleteExpiredRides } from '../src/jobs/auto-complete-rides.js';

vi.mock('../src/db/pool.js', () => ({
  pingDatabase: vi.fn().mockResolvedValue({ ok: true, durationMs: 5 }),
  pool: { on: vi.fn(), end: vi.fn() },
  closePool: vi.fn(),
}));

describe('T-09A: Rides Estimation, Publishing, Caps & Lifecycle Suite', () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function makeToken(
    role: UserRole = 'member',
    tier: TrustTier = 3,
    userId = 'driver-rides-1',
  ) {
    authMiddleware.setUserStatusCache(userId, 'active');
    return signAccessToken(
      {
        userId,
        email: `${userId}@example.com`,
        role,
        status: 'active',
        tier,
        sessionId: 'session-rides-1',
      },
      env.JWT_SECRET,
      900,
    );
  }

  describe('1. Ride Estimation Endpoint (POST /api/v1/rides/estimate)', () => {
    it('estimates local trip distance, duration, journeyType and statutory cost cap', async () => {
      const res = await request(app)
        .post('/api/v1/rides/estimate')
        .send({
          origin: { label: 'Campus Main Gate', lat: 28.545, lng: 77.1926 },
          destination: { label: 'Connaught Place', lat: 28.6315, lng: 77.2167 },
          vehicleType: 'car',
          seatsTotal: 3,
          tollPaise: 0,
        });

      expect(res.status).toBe(200);
      expect(res.body.distanceM).toBeGreaterThan(0);
      expect(res.body.durationS).toBeGreaterThan(0);
      expect(res.body.journeyType).toBe('local');
      expect(res.body.costCapPaise).toBeGreaterThan(0);
      expect(res.body.soloCostPaise).toBeGreaterThan(0);
      expect(res.body.co2AvoidedKg).toBeGreaterThanOrEqual(0);
    });

    it('identifies trips > 40 km as outstation', async () => {
      const res = await request(app)
        .post('/api/v1/rides/estimate')
        .send({
          origin: { label: 'Delhi', lat: 28.545, lng: 77.1926 },
          destination: { label: 'Meerut', lat: 28.9845, lng: 77.7064 }, // ~70 km
          vehicleType: 'car',
          seatsTotal: 4,
          tollPaise: 15000,
        });

      expect(res.status).toBe(200);
      expect(res.body.journeyType).toBe('outstation');
      expect(res.body.distanceM).toBeGreaterThan(40000);
    });
  });

  describe('2. Ride Creation Security & Validation Rules', () => {
    const driverId = '018f3a2c-1234-7000-8000-000000000801';
    const vehicleId = '018f3a2c-1234-7000-8000-000000000901';

    const validRidePayload = {
      vehicleId,
      origin: { label: 'Campus Gate', lat: 28.545, lng: 77.1926 },
      destination: { label: 'Airport T3', lat: 28.5562, lng: 77.1 },
      departsAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours in future
      seatsTotal: 3,
      contributionPaise: 5000,
      tollPaise: 0,
      audienceScope: 'campus_and_community',
      genderScope: 'any',
      notes: 'Leaving from gate 1',
    };

    it('rejects unauthenticated requests with 401', async () => {
      const res = await request(app)
        .post('/api/v1/rides')
        .set('Idempotency-Key', 'idem-ride-1')
        .send(validRidePayload);

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHENTICATED');
    });

    it('rejects drivers below Trust Tier 3 with 403 TIER_REQUIRED', async () => {
      const t2Token = makeToken('member', 2, 'user-t2-driver');

      const res = await request(app)
        .post('/api/v1/rides')
        .set('Authorization', `Bearer ${t2Token}`)
        .set('Idempotency-Key', 'idem-ride-2')
        .send(validRidePayload);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('TIER_REQUIRED');
    });

    it('rejects missing Idempotency-Key header with 400', async () => {
      const token = makeToken('member', 3, driverId);

      const res = await request(app)
        .post('/api/v1/rides')
        .set('Authorization', `Bearer ${token}`)
        .send(validRidePayload); // No Idempotency-Key

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      expect(res.body.detail).toContain('Idempotency-Key');
    });

    it('rejects rides scheduled < 30 minutes in future with 400', async () => {
      const token = makeToken('member', 3, driverId);

      vi.spyOn(db, 'select').mockImplementation(() => {
        return {
          from: (table: unknown) => {
            if (table === idempotencyKeys) {
              return {
                where: () => ({
                  limit: vi.fn().mockResolvedValue([]),
                }),
              };
            }
            if (table === users) {
              return {
                where: () => ({
                  limit: vi.fn().mockResolvedValue([
                    { id: driverId, status: 'active', gender: 'male', genderVerifiedAt: null },
                  ]),
                }),
              };
            }
            if (table === vehicles) {
              return {
                where: () => ({
                  limit: vi.fn().mockResolvedValue([
                    {
                      id: vehicleId,
                      ownerId: driverId,
                      type: 'car',
                      status: 'verified',
                      passengerCapacity: 4,
                      deletedAt: null,
                    },
                  ]),
                }),
              };
            }
            return {
              where: () => ({
                limit: vi.fn().mockResolvedValue([]),
              }),
            };
          },
        } as unknown as ReturnType<typeof db.select>;
      });

      const res = await request(app)
        .post('/api/v1/rides')
        .set('Authorization', `Bearer ${token}`)
        .set('Idempotency-Key', 'idem-ride-3')
        .send({
          ...validRidePayload,
          departsAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // Only 10m in future!
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      expect(res.body.detail).toContain('at least 30 minutes');
    });

    it('rejects contribution exceeding statutory cost cap with 400', async () => {
      const token = makeToken('member', 3, driverId);

      vi.spyOn(db, 'select').mockImplementation(() => {
        return {
          from: (table: unknown) => {
            if (table === idempotencyKeys) {
              return {
                where: () => ({
                  limit: vi.fn().mockResolvedValue([]),
                }),
              };
            }
            if (table === users) {
              return {
                where: () => ({
                  limit: vi.fn().mockResolvedValue([
                    { id: driverId, status: 'active', gender: 'male', genderVerifiedAt: null },
                  ]),
                }),
              };
            }
            if (table === vehicles) {
              return {
                where: () => ({
                  limit: vi.fn().mockResolvedValue([
                    {
                      id: vehicleId,
                      ownerId: driverId,
                      type: 'car',
                      status: 'verified',
                      passengerCapacity: 4,
                      deletedAt: null,
                    },
                  ]),
                }),
              };
            }
            return {
              where: () => ({
                limit: vi.fn().mockResolvedValue([]),
              }),
            };
          },
        } as unknown as ReturnType<typeof db.select>;
      });

      const res = await request(app)
        .post('/api/v1/rides')
        .set('Authorization', `Bearer ${token}`)
        .set('Idempotency-Key', 'idem-ride-4')
        .send({
          ...validRidePayload,
          contributionPaise: 9999999, // Unreasonable contribution exceeding cap
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      expect(res.body.detail).toContain('exceeds the statutory cost-share cap');
    });
  });

  describe('3. Ride State Machine & Auto-Completion Job', () => {
    it('auto-completes rides that are 12 hours past ETA', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            { id: 'ride-expired-1', driverId: 'driver-1', status: 'in_progress' },
            { id: 'ride-expired-2', driverId: 'driver-2', status: 'scheduled' },
          ]),
        }),
      } as unknown as ReturnType<typeof db.select>);

      const updateSpy = vi.spyOn(db, 'update').mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue({}),
        }),
      } as unknown as ReturnType<typeof db.update>);

      const result = await autoCompleteExpiredRides(new Date());

      expect(result.scanned).toBe(2);
      expect(result.completed).toBe(2);
      expect(result.errors).toBe(0);
      expect(updateSpy).toHaveBeenCalledTimes(2);
    });
  });
});
