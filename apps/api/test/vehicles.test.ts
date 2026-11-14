import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import type { UserRole, TrustTier } from '@campusride/shared';
import { createApp } from '../src/app.js';
import { signAccessToken } from '../src/modules/auth/tokens.js';
import { env } from '../src/config/env.js';
import * as authMiddleware from '../src/middleware/auth.js';
import { db } from '../src/db/client.js';
import { normalizeRegistrationNumber } from '../src/modules/vehicles/service.js';

vi.mock('../src/db/pool.js', () => ({
  pingDatabase: vi.fn().mockResolvedValue({ ok: true, durationMs: 5 }),
  pool: { on: vi.fn(), end: vi.fn() },
  closePool: vi.fn(),
}));

describe('T-14: Vehicles Registration, Normalization & Capacity Suite', () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function makeToken(role: UserRole = 'member', tier: TrustTier = 2, userId = 'user-veh-1') {
    authMiddleware.setUserStatusCache(userId, 'active');
    return signAccessToken(
      {
        userId,
        email: `${userId}@example.com`,
        role,
        status: 'active',
        tier,
        sessionId: 'session-veh-1',
      },
      env.JWT_SECRET,
      900,
    );
  }

  describe('1. Registration Number Normalization Unit Tests', () => {
    it('normalizes registration strings by removing spaces, hyphens, and uppercasing', () => {
      expect(normalizeRegistrationNumber('dl-01-ab-1234')).toBe('DL01AB1234');
      expect(normalizeRegistrationNumber('dl 01 ab 1234')).toBe('DL01AB1234');
      expect(normalizeRegistrationNumber('UP 16 CD 9999')).toBe('UP16CD9999');
      expect(normalizeRegistrationNumber('ka-05.mj-7777')).toBe('KA05MJ7777');
    });
  });

  describe('2. Vehicle Creation & Active Uniqueness', () => {
    const userId = '018f3a2c-1234-7000-8000-000000000401';

    it('creates vehicle with normalized registration number', async () => {
      const token = makeToken('member', 2, userId);

      // No existing vehicle with reg
      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as unknown as ReturnType<typeof db.select>);

      vi.spyOn(db, 'insert').mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            {
              id: '018f3a2c-1234-7000-8000-000000000501',
              ownerId: userId,
              type: 'car',
              makeModel: 'Maruti Swift',
              colour: 'White',
              registrationNumber: 'DL01AB1234',
              passengerCapacity: 4,
              insuranceValidUntil: new Date('2028-12-31T00:00:00Z'),
              status: 'pending',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ]),
        }),
      } as unknown as ReturnType<typeof db.insert>);

      const res = await request(app)
        .post('/api/v1/vehicles')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'car',
          makeModel: 'Maruti Swift',
          colour: 'White',
          registrationNumber: 'dl-01 ab 1234',
          passengerCapacity: 4,
          insuranceValidUntil: '2028-12-31T00:00:00Z',
        });

      expect(res.status).toBe(201);
      expect(res.body.registrationNumber).toBe('DL01AB1234');
      expect(res.body.status).toBe('pending');
    });

    it('rejects vehicle creation if registration number is already in use by active vehicle', async () => {
      const token = makeToken('member', 2, userId);

      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 'existing-vehicle-id' }]),
          }),
        }),
      } as unknown as ReturnType<typeof db.select>);

      const res = await request(app)
        .post('/api/v1/vehicles')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'car',
          makeModel: 'Hyundai i20',
          colour: 'Red',
          registrationNumber: 'DL01AB1234',
          passengerCapacity: 4,
          insuranceValidUntil: '2028-12-31T00:00:00Z',
        });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('CONFLICT');
      expect(res.body.detail).toContain('already registered');
    });
  });

  describe('3. Passenger Capacity Rules', () => {
    const userId = '018f3a2c-1234-7000-8000-000000000402';

    it('rejects bike with passenger capacity > 1 with 400 VALIDATION_ERROR', async () => {
      const token = makeToken('member', 2, userId);

      const res = await request(app)
        .post('/api/v1/vehicles')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'bike',
          makeModel: 'Honda Activa',
          colour: 'Black',
          registrationNumber: 'DL05XY1234',
          passengerCapacity: 2, // Must be 1 for bike/scooter per D-09
          insuranceValidUntil: '2028-12-31T00:00:00Z',
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      expect(JSON.stringify(res.body)).toContain('at most 1 passenger');
    });

    it('accepts bike with passenger capacity of exactly 1', async () => {
      const token = makeToken('member', 2, userId);

      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as unknown as ReturnType<typeof db.select>);

      vi.spyOn(db, 'insert').mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            {
              id: '018f3a2c-1234-7000-8000-000000000502',
              ownerId: userId,
              type: 'bike',
              makeModel: 'Honda Activa',
              colour: 'Black',
              registrationNumber: 'DL05XY1234',
              passengerCapacity: 1,
              insuranceValidUntil: new Date('2028-12-31T00:00:00Z'),
              status: 'pending',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ]),
        }),
      } as unknown as ReturnType<typeof db.insert>);

      const res = await request(app)
        .post('/api/v1/vehicles')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'bike',
          makeModel: 'Honda Activa',
          colour: 'Black',
          registrationNumber: 'DL05XY1234',
          passengerCapacity: 1,
          insuranceValidUntil: '2028-12-31T00:00:00Z',
        });

      expect(res.status).toBe(201);
      expect(res.body.passengerCapacity).toBe(1);
    });

    it('rejects car with capacity > 6 with 400 VALIDATION_ERROR', async () => {
      const token = makeToken('member', 2, userId);

      const res = await request(app)
        .post('/api/v1/vehicles')
        .set('Authorization', `Bearer ${token}`)
        .send({
          type: 'car',
          makeModel: 'Tempo Traveller',
          colour: 'White',
          registrationNumber: 'DL07ZZ1234',
          passengerCapacity: 9, // Max 6
          insuranceValidUntil: '2028-12-31T00:00:00Z',
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('4. Vehicle Ownership & Safe Soft Deletion', () => {
    const ownerId = '018f3a2c-1234-7000-8000-000000000403';
    const vehicleId = '018f3a2c-1234-7000-8000-000000000503';

    it('prevents non-owner from accessing vehicle details', async () => {
      const otherUserToken = makeToken('member', 2, 'user-impostor');

      vi.spyOn(db, 'select').mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: vehicleId,
                ownerId,
                type: 'car',
                makeModel: 'Honda City',
                colour: 'Silver',
                registrationNumber: 'DL03AB5678',
                passengerCapacity: 4,
                insuranceValidUntil: new Date('2028-12-31T00:00:00Z'),
                status: 'verified',
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ]),
          }),
        }),
      } as unknown as ReturnType<typeof db.select>);

      const res = await request(app)
        .get(`/api/v1/vehicles/${vehicleId}`)
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });

    it('prevents deleting vehicle if it is linked to active or scheduled rides', async () => {
      const token = makeToken('member', 2, ownerId);

      let selectCallCount = 0;
      vi.spyOn(db, 'select').mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // Select vehicle
          return {
            from: () => ({
              where: () => ({
                limit: vi.fn().mockResolvedValue([
                  {
                    id: vehicleId,
                    ownerId,
                    type: 'car',
                    makeModel: 'Honda City',
                    colour: 'Silver',
                    registrationNumber: 'DL03AB5678',
                    passengerCapacity: 4,
                    insuranceValidUntil: new Date('2028-12-31T00:00:00Z'),
                    status: 'verified',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  },
                ]),
              }),
            }),
          } as unknown as ReturnType<typeof db.select>;
        }
        // Active ride check
        return {
          from: () => ({
            where: () => ({
              limit: vi.fn().mockResolvedValue([{ id: 'scheduled-ride-1' }]),
            }),
          }),
        } as unknown as ReturnType<typeof db.select>;
      });

      const res = await request(app)
        .delete(`/api/v1/vehicles/${vehicleId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('CONFLICT');
      expect(res.body.detail).toContain('active or scheduled rides');
    });

    it('allows soft deleting vehicle with no active rides', async () => {
      const token = makeToken('member', 2, ownerId);

      let selectCallCount = 0;
      vi.spyOn(db, 'select').mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // Select vehicle
          return {
            from: () => ({
              where: () => ({
                limit: vi.fn().mockResolvedValue([
                  {
                    id: vehicleId,
                    ownerId,
                    type: 'car',
                    makeModel: 'Honda City',
                    colour: 'Silver',
                    registrationNumber: 'DL03AB5678',
                    passengerCapacity: 4,
                    insuranceValidUntil: new Date('2028-12-31T00:00:00Z'),
                    status: 'verified',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  },
                ]),
              }),
            }),
          } as unknown as ReturnType<typeof db.select>;
        }
        // Active ride check - none found
        return {
          from: () => ({
            where: () => ({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        } as unknown as ReturnType<typeof db.select>;
      });

      const updateSpy = vi.spyOn(db, 'update').mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue({}),
        }),
      } as unknown as ReturnType<typeof db.update>);

      const res = await request(app)
        .delete(`/api/v1/vehicles/${vehicleId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('deleted successfully');
      expect(updateSpy).toHaveBeenCalled();
    });
  });
});
