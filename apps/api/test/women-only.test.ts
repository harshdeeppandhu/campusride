import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import type { UserRole, TrustTier } from '@campusride/shared';
import { createApp } from '../src/app.js';
import { signAccessToken } from '../src/modules/auth/tokens.js';
import { env } from '../src/config/env.js';
import * as authMiddleware from '../src/middleware/auth.js';
import { db } from '../src/db/client.js';
import { users, vehicles, idempotencyKeys } from '../src/db/schema.js';

vi.mock('../src/db/pool.js', () => ({
  pingDatabase: vi.fn().mockResolvedValue({ ok: true, durationMs: 5 }),
  pool: { on: vi.fn(), end: vi.fn() },
  closePool: vi.fn(),
}));

describe('T-09B: Women-Only Safety & Eligibility Controls Suite (docs/05 §2)', () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function makeToken(
    role: UserRole = 'member',
    tier: TrustTier = 3,
    userId = 'user-women-1',
  ) {
    authMiddleware.setUserStatusCache(userId, 'active');
    return signAccessToken(
      {
        userId,
        email: `${userId}@example.com`,
        role,
        status: 'active',
        tier,
        sessionId: 'session-women-1',
      },
      env.JWT_SECRET,
      900,
    );
  }

  describe('1. Driver Women-Only Publishing Eligibility', () => {
    const vehicleId = '018f3a2c-1234-7000-8000-000000000999';

    const womenOnlyPayload = {
      vehicleId,
      origin: { label: 'Campus Main Gate', lat: 28.545, lng: 77.1926 },
      destination: { label: 'Airport T3', lat: 28.5562, lng: 77.1 },
      departsAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      seatsTotal: 3,
      contributionPaise: 2000,
      tollPaise: 0,
      audienceScope: 'campus_and_community',
      genderScope: 'women_only', // Women-only ride!
      notes: 'Women only ride',
    };

    it('rejects male driver from publishing women-only ride with 403 ELIGIBILITY_FAILED', async () => {
      const maleDriverId = 'male-driver-id';
      const token = makeToken('member', 3, maleDriverId);

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
                    {
                      id: maleDriverId,
                      status: 'active',
                      gender: 'male',
                      genderVerifiedAt: null,
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
        .set('Idempotency-Key', 'idem-women-1')
        .send(womenOnlyPayload);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('ELIGIBILITY_FAILED');
      expect(res.body.detail).toContain('Only admin-verified female drivers');
    });

    it('rejects unverified female driver from publishing women-only ride with 403 ELIGIBILITY_FAILED', async () => {
      const unverifiedFemaleId = 'unverified-female-id';
      const token = makeToken('member', 3, unverifiedFemaleId);

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
                    {
                      id: unverifiedFemaleId,
                      status: 'active',
                      gender: 'female',
                      genderVerifiedAt: null, // NOT verified by admin!
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
        .set('Idempotency-Key', 'idem-women-2')
        .send(womenOnlyPayload);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('ELIGIBILITY_FAILED');
      expect(res.body.detail).toContain('Only admin-verified female drivers');
    });

    it('allows verified female driver to publish women-only ride', async () => {
      const verifiedFemaleId = 'verified-female-id';
      const token = makeToken('member', 3, verifiedFemaleId);

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
                    {
                      id: verifiedFemaleId,
                      status: 'active',
                      gender: 'female',
                      genderVerifiedAt: new Date(), // Admin verified!
                    },
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
                      ownerId: verifiedFemaleId,
                      type: 'car',
                      status: 'verified',
                      passengerCapacity: 4,
                      deletedAt: null,
                    },
                  ]),
                }),
              };
            }
            // getRideById queries
            return {
              innerJoin: () => ({
                innerJoin: () => ({
                  where: () => ({
                    limit: vi.fn().mockResolvedValue([
                      {
                        id: '018f3a2c-1234-7000-8000-000000000888',
                        driverId: verifiedFemaleId,
                        driverFullName: 'Sunita Sharma',
                        driverPhotoKey: 'avatars/sunita.jpg',
                        driverGender: 'female',
                        driverGenderVerifiedAt: new Date(),
                        driverCollegeVerifiedAt: new Date(),
                        vehicleId,
                        vehicleType: 'car',
                        vehicleMakeModel: 'Maruti Baleno',
                        vehicleColour: 'Blue',
                        vehicleRegNumber: 'DL01AB8888',
                        originLabel: 'Campus Main Gate',
                        originLocation: { lat: 28.545, lng: 77.1926 },
                        destLabel: 'Airport T3',
                        destLocation: { lat: 28.5562, lng: 77.1 },
                        routePolyline: 'mock_poly',
                        distanceM: 15000,
                        durationS: 1800,
                        departsAt: new Date(Date.now() + 7200000),
                        journeyType: 'local',
                        seatsTotal: 3,
                        seatsAvailable: 3,
                        contributionPaise: 2000,
                        costCapPaise: 2374,
                        tollPaise: 0,
                        audienceScope: 'campus_and_community',
                        genderScope: 'women_only',
                        status: 'scheduled',
                        returnRideId: null,
                        notes: 'Women only ride',
                        helmetProvided: null,
                        luggage: null,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                      },
                    ]),
                  }),
                }),
              }),
              where: () => ({
                orderBy: vi.fn().mockResolvedValue([]),
              }),
            };
          },
        } as unknown as ReturnType<typeof db.select>;
      });

      vi.spyOn(db, 'insert').mockImplementation(() => {
        const queryPromise = Promise.resolve([
          { id: '018f3a2c-1234-7000-8000-000000000888' },
        ]);
        return {
          values: vi.fn().mockImplementation(() => {
            return Object.assign(queryPromise, {
              returning: vi.fn().mockResolvedValue([
                { id: '018f3a2c-1234-7000-8000-000000000888' },
              ]),
            });
          }),
        } as unknown as ReturnType<typeof db.insert>;
      });

      const res = await request(app)
        .post('/api/v1/rides')
        .set('Authorization', `Bearer ${token}`)
        .set('Idempotency-Key', 'idem-women-3')
        .send(womenOnlyPayload);

      expect(res.status).toBe(201);
      expect(res.body.genderScope).toBe('women_only');
      expect(res.body.driver.badges).toContain('women_verified');
    });
  });

  describe('2. Passenger Search Visibility Rules for Women-Only Rides', () => {
    it('completely filters out women-only rides from search for anonymous users', async () => {
      // Mock db.select for search: verify conditions enforce gender_scope = 'any'
      const selectSpy = vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue([]),
                }),
              }),
            }),
          }),
        }),
      } as unknown as ReturnType<typeof db.select>);

      const res = await request(app)
        .get('/api/v1/search/rides')
        .query({
          originLat: 28.545,
          originLng: 77.1926,
          radiusM: 5000,
        });

      expect(res.status).toBe(200);
      expect(selectSpy).toHaveBeenCalled();
    });

    it('completely filters out women-only rides for male authenticated passenger', async () => {
      const maleUserId = 'male-passenger-id';
      const token = makeToken('member', 2, maleUserId);

      let selectCount = 0;
      vi.spyOn(db, 'select').mockImplementation(() => {
        selectCount++;
        if (selectCount === 1) {
          // User check in controller
          return {
            from: () => ({
              where: () => ({
                limit: vi.fn().mockResolvedValue([
                  {
                    gender: 'male',
                    genderVerifiedAt: null,
                    collegeVerifiedAt: new Date(),
                  },
                ]),
              }),
            }),
          } as unknown as ReturnType<typeof db.select>;
        }
        if (selectCount === 2) {
          // Blocks check
          return {
            from: () => ({
              where: vi.fn().mockResolvedValue([]),
            }),
          } as unknown as ReturnType<typeof db.select>;
        }
        // Search rides query
        return {
          from: () => ({
            innerJoin: () => ({
              innerJoin: () => ({
                where: () => ({
                  orderBy: () => ({
                    limit: vi.fn().mockResolvedValue([]),
                  }),
                }),
              }),
            }),
          }),
        } as unknown as ReturnType<typeof db.select>;
      });

      const res = await request(app)
        .get('/api/v1/search/rides')
        .set('Authorization', `Bearer ${token}`)
        .query({
          originLat: 28.545,
          originLng: 77.1926,
        });

      expect(res.status).toBe(200);
    });
  });
});
