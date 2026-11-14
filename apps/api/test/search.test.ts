import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import type { UserRole, TrustTier } from '@campusride/shared';
import { createApp } from '../src/app.js';
import { signAccessToken } from '../src/modules/auth/tokens.js';
import { env } from '../src/config/env.js';
import * as authMiddleware from '../src/middleware/auth.js';
import { db } from '../src/db/client.js';
import { users, blocks } from '../src/db/schema.js';

vi.mock('../src/db/pool.js', () => ({
  pingDatabase: vi.fn().mockResolvedValue({ ok: true, durationMs: 5 }),
  pool: { on: vi.fn(), end: vi.fn() },
  closePool: vi.fn(),
}));

describe('T-09C: Search Engine & Privacy Demand Logging Suite (docs/03, docs/05)', () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(db, 'insert').mockReturnValue({
      values: vi.fn().mockResolvedValue({}),
    } as unknown as ReturnType<typeof db.insert>);
  });

  function makeToken(
    role: UserRole = 'member',
    tier: TrustTier = 2,
    userId = 'passenger-search-1',
  ) {
    authMiddleware.setUserStatusCache(userId, 'active');
    return signAccessToken(
      {
        userId,
        email: `${userId}@example.com`,
        role,
        status: 'active',
        tier,
        sessionId: 'session-search-1',
      },
      env.JWT_SECRET,
      900,
    );
  }

  describe('1. Places & Hubs Endpoints', () => {
    it('returns seeded hubs for route planning', async () => {
      const hubsList = [
        {
          id: '018f3a2c-1234-7000-8000-000000000001',
          name: 'IGI Airport Terminal 3',
          kind: 'hub',
          city: 'New Delhi',
          address: 'Terminal 3, New Delhi, 110037',
          location: { lat: 28.5562, lng: 77.1 },
          googlePlaceId: null,
          isActive: true,
          createdAt: new Date(),
        },
        {
          id: '018f3a2c-1234-7000-8000-000000000002',
          name: 'ISBT Kashmere Gate',
          kind: 'hub',
          city: 'New Delhi',
          address: 'Kashmere Gate, New Delhi, 110006',
          location: { lat: 28.6675, lng: 77.2332 },
          googlePlaceId: null,
          isActive: true,
          createdAt: new Date(),
        },
      ];

      vi.spyOn(db, 'select').mockImplementationOnce(() => {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockImplementation(() => {
              const p = Promise.resolve(hubsList);
              return Object.assign(p, { limit: vi.fn().mockResolvedValue(hubsList) });
            }),
          }),
        } as unknown as ReturnType<typeof db.select>;
      });

      const res = await request(app).get('/api/v1/places/hubs');

      expect(res.status).toBe(200);
      expect(res.body.hubs).toHaveLength(2);
      expect(res.body.hubs[0].name).toBe('IGI Airport Terminal 3');
      expect(res.body.hubs[0].location.lat).toBe(28.5562);
      expect(res.body.hubs[0].location.lng).toBe(77.1);
    });

    it('provides place autocomplete predictions via MapsProvider', async () => {
      const res = await request(app)
        .get('/api/v1/places/autocomplete')
        .query({ q: 'airport' });

      expect(res.status).toBe(200);
      expect(res.body.predictions).toBeDefined();
      expect(res.body.predictions.length).toBeGreaterThan(0);
      expect(res.body.predictions[0].primaryText).toContain('Airport');
    });

    it('resolves place details with coordinates', async () => {
      const res = await request(app).get('/api/v1/places/igi-airport-t3/resolve');

      expect(res.status).toBe(200);
      expect(res.body.placeId).toBe('igi-airport-t3');
      expect(res.body.location.lat).toBeDefined();
      expect(res.body.location.lng).toBeDefined();
    });
  });

  describe('2. Search Proximity & Privacy Controls', () => {
    it('executes proximity search and records privacy-safe search event', async () => {
      const insertSpy = vi.spyOn(db, 'insert').mockReturnValue({
        values: vi.fn().mockResolvedValue({}),
      } as unknown as ReturnType<typeof db.insert>);

      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue([
                    {
                      id: '018f3a2c-1234-7000-8000-000000000111',
                      driverId: 'driver-xyz',
                      driverFullName: 'Rahul Verma',
                      driverPhotoKey: 'avatars/rahul.jpg',
                      driverCollegeVerifiedAt: new Date(),
                      driverGender: 'male',
                      driverGenderVerifiedAt: null,
                      originLabel: 'Campus Gate 1, New Delhi',
                      originLocation: { lat: 28.545, lng: 77.1926 },
                      destLabel: 'Airport T3, New Delhi',
                      destLocation: { lat: 28.5562, lng: 77.1 },
                      departsAt: new Date(Date.now() + 3600000),
                      seatsAvailable: 2,
                      contributionPaise: 4500,
                      journeyType: 'local',
                      genderScope: 'any',
                      vehicleType: 'car',
                      vehicleMakeModel: 'Swift Dzire',
                    },
                  ]),
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
          seats: 1,
        });

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].vehicle.makeModel).toBe('Swift Dzire');
      expect(res.body.items[0].driver.firstName).toBe('Rahul');
      expect(res.body.items[0].match).toBe('exact');

      // Verify privacy demand event logged with ZERO user ID
      expect(insertSpy).toHaveBeenCalledWith(
        expect.not.objectContaining({
          userId: expect.anything(),
        }),
      );
    });

    it('masks exact location coordinates and full name for unauthenticated users', async () => {
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue([
                    {
                      id: '018f3a2c-1234-7000-8000-000000000112',
                      driverId: 'driver-secret',
                      driverFullName: 'Priya Sharma',
                      driverPhotoKey: 'avatars/priya.jpg',
                      driverCollegeVerifiedAt: new Date(),
                      driverGender: 'female',
                      driverGenderVerifiedAt: new Date(),
                      originLabel: 'Campus Gate 1, New Delhi',
                      originLocation: { lat: 28.545, lng: 77.1926 },
                      destLabel: 'Airport T3, New Delhi',
                      destLocation: { lat: 28.5562, lng: 77.1 },
                      departsAt: new Date(Date.now() + 3600000),
                      seatsAvailable: 3,
                      contributionPaise: 4000,
                      journeyType: 'local',
                      genderScope: 'any',
                      vehicleType: 'car',
                      vehicleMakeModel: 'Hyundai i10',
                    },
                  ]),
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
        });

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      // Photo is masked for anonymous callers
      expect(res.body.items[0].driver.photoKey).toBeNull();
      // Exact coordinates masked for anonymous callers
      expect(res.body.items[0].origin.lat).toBeUndefined();
      expect(res.body.items[0].destination.lat).toBeUndefined();
    });

    it('reveals coordinates and photo for authenticated T2 callers', async () => {
      const token = makeToken('member', 2, 'user-t2-searcher');
      vi.spyOn(db, 'select').mockImplementation(() => {
        return {
          from: (table: unknown) => {
            if (table === users) {
              return {
                where: () => ({
                  limit: vi.fn().mockResolvedValue([
                    {
                      gender: 'female',
                      genderVerifiedAt: new Date(),
                      collegeVerifiedAt: new Date(),
                    },
                  ]),
                }),
              };
            }
            if (table === blocks) {
              return {
                where: () => Promise.resolve([]),
              };
            }
            return {
              innerJoin: () => ({
                innerJoin: () => ({
                  where: () => ({
                    orderBy: () => ({
                      limit: vi.fn().mockResolvedValue([
                        {
                          id: '018f3a2c-1234-7000-8000-000000000113',
                          driverId: 'driver-secret-2',
                          driverFullName: 'Priya Sharma',
                          driverPhotoKey: 'avatars/priya.jpg',
                          driverCollegeVerifiedAt: new Date(),
                          driverGender: 'female',
                          driverGenderVerifiedAt: new Date(),
                          originLabel: 'Campus Gate 1, New Delhi',
                          originLocation: { lat: 28.545, lng: 77.1926 },
                          destLabel: 'Airport T3, New Delhi',
                          destLocation: { lat: 28.5562, lng: 77.1 },
                          departsAt: new Date(Date.now() + 3600000),
                          seatsAvailable: 3,
                          contributionPaise: 4000,
                          journeyType: 'local',
                          genderScope: 'any',
                          vehicleType: 'car',
                          vehicleMakeModel: 'Hyundai i10',
                        },
                      ]),
                    }),
                  }),
                }),
              }),
            };
          },
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
      expect(res.body.items[0].driver.photoKey).toBe('avatars/priya.jpg');
      expect(res.body.items[0].origin.lat).toBe(28.545);
      expect(res.body.items[0].destination.lat).toBe(28.5562);
    });
  });
});
