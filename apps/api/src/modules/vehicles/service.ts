import { eq, and, isNull, desc, sql } from 'drizzle-orm';
import type {
  CreateVehicle,
  UpdateVehicle,
  VehicleResponse,
} from '@campusride/shared';
import { db } from '../../db/client.js';
import { vehicles, rides } from '../../db/schema.js';
import { AppError } from '../../lib/errors.js';
import { auditService } from '../audit/service.js';
import { hashIp } from '../auth/tokens.js';
import { env } from '../../config/env.js';

export function normalizeRegistrationNumber(raw: string): string {
  return raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

export class VehiclesService {
  async createVehicle(
    userId: string,
    input: CreateVehicle,
    ipAddress = '127.0.0.1',
    requestId = 'unknown',
  ): Promise<VehicleResponse> {
    const normalizedReg = normalizeRegistrationNumber(input.registrationNumber);

    if (normalizedReg.length < 4 || normalizedReg.length > 20) {
      throw new AppError(
        'VALIDATION_ERROR',
        400,
        'Registration number must contain between 4 and 20 alphanumeric characters.',
      );
    }

    if ((input.type === 'bike' || input.type === 'scooter') && input.passengerCapacity !== 1) {
      throw new AppError(
        'VALIDATION_ERROR',
        400,
        'Two-wheelers (bike and scooter) may only carry at most 1 passenger.',
      );
    }

    if (input.passengerCapacity < 1 || input.passengerCapacity > 6) {
      throw new AppError(
        'VALIDATION_ERROR',
        400,
        'Passenger capacity must be between 1 and 6.',
      );
    }

    // Check uniqueness among non-deleted vehicles
    const [existing] = await db
      .select({ id: vehicles.id })
      .from(vehicles)
      .where(
        and(
          eq(vehicles.registrationNumber, normalizedReg),
          isNull(vehicles.deletedAt),
        ),
      )
      .limit(1);

    if (existing) {
      throw new AppError(
        'CONFLICT',
        409,
        `A vehicle with registration number '${normalizedReg}' is already registered.`,
      );
    }

    const insuranceDate = new Date(input.insuranceValidUntil);

    const [created] = await db
      .insert(vehicles)
      .values({
        ownerId: userId,
        type: input.type,
        makeModel: input.makeModel.trim(),
        colour: input.colour.trim(),
        registrationNumber: normalizedReg,
        passengerCapacity: input.passengerCapacity,
        insuranceValidUntil: insuranceDate,
        status: 'pending',
      })
      .returning();

    if (!created) {
      throw new AppError('INTERNAL', 500, 'Failed to create vehicle.');
    }

    const ipHashed = hashIp(ipAddress, env.FIELD_ENC_KEY);
    await auditService.log({
      actorId: userId,
      action: 'vehicle.created',
      entity: 'vehicles',
      entityId: created.id,
      after: {
        type: created.type,
        makeModel: created.makeModel,
        registrationNumber: created.registrationNumber,
      },
      ipHash: ipHashed,
      requestId,
    });

    return {
      id: created.id,
      ownerId: created.ownerId,
      type: created.type,
      makeModel: created.makeModel,
      colour: created.colour,
      registrationNumber: created.registrationNumber,
      passengerCapacity: created.passengerCapacity,
      insuranceValidUntil: created.insuranceValidUntil.toISOString(),
      status: created.status,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };
  }

  async listVehicles(userId: string): Promise<VehicleResponse[]> {
    const rows = await db
      .select()
      .from(vehicles)
      .where(and(eq(vehicles.ownerId, userId), isNull(vehicles.deletedAt)))
      .orderBy(desc(vehicles.createdAt));

    return rows.map((v) => ({
      id: v.id,
      ownerId: v.ownerId,
      type: v.type,
      makeModel: v.makeModel,
      colour: v.colour,
      registrationNumber: v.registrationNumber,
      passengerCapacity: v.passengerCapacity,
      insuranceValidUntil: v.insuranceValidUntil.toISOString(),
      status: v.status,
      createdAt: v.createdAt.toISOString(),
      updatedAt: v.updatedAt.toISOString(),
    }));
  }

  async getVehicle(
    userId: string,
    vehicleId: string,
    isAdmin = false,
  ): Promise<VehicleResponse> {
    const [v] = await db
      .select()
      .from(vehicles)
      .where(and(eq(vehicles.id, vehicleId), isNull(vehicles.deletedAt)))
      .limit(1);

    if (!v) {
      throw new AppError('NOT_FOUND', 404, 'Vehicle not found.');
    }

    if (!isAdmin && v.ownerId !== userId) {
      throw new AppError('FORBIDDEN', 403, 'You do not have access to this vehicle.');
    }

    return {
      id: v.id,
      ownerId: v.ownerId,
      type: v.type,
      makeModel: v.makeModel,
      colour: v.colour,
      registrationNumber: v.registrationNumber,
      passengerCapacity: v.passengerCapacity,
      insuranceValidUntil: v.insuranceValidUntil.toISOString(),
      status: v.status,
      createdAt: v.createdAt.toISOString(),
      updatedAt: v.updatedAt.toISOString(),
    };
  }

  async updateVehicle(
    userId: string,
    vehicleId: string,
    input: UpdateVehicle,
    ipAddress = '127.0.0.1',
    requestId = 'unknown',
  ): Promise<VehicleResponse> {
    const [existing] = await db
      .select()
      .from(vehicles)
      .where(and(eq(vehicles.id, vehicleId), isNull(vehicles.deletedAt)))
      .limit(1);

    if (!existing) {
      throw new AppError('NOT_FOUND', 404, 'Vehicle not found.');
    }

    if (existing.ownerId !== userId) {
      throw new AppError('FORBIDDEN', 403, 'You do not own this vehicle.');
    }

    if (input.passengerCapacity !== undefined) {
      if ((existing.type === 'bike' || existing.type === 'scooter') && input.passengerCapacity !== 1) {
        throw new AppError(
          'VALIDATION_ERROR',
          400,
          'Two-wheelers (bike and scooter) may only carry at most 1 passenger.',
        );
      }
      if (input.passengerCapacity < 1 || input.passengerCapacity > 6) {
        throw new AppError(
          'VALIDATION_ERROR',
          400,
          'Passenger capacity must be between 1 and 6.',
        );
      }
    }

    const now = new Date();
    const updateData: Partial<typeof vehicles.$inferInsert> = {
      updatedAt: now,
    };

    if (input.makeModel !== undefined) {
      updateData.makeModel = input.makeModel.trim();
    }
    if (input.colour !== undefined) {
      updateData.colour = input.colour.trim();
    }
    if (input.passengerCapacity !== undefined) {
      updateData.passengerCapacity = input.passengerCapacity;
    }
    if (input.insuranceValidUntil !== undefined) {
      updateData.insuranceValidUntil = new Date(input.insuranceValidUntil);
    }

    const [updated] = await db
      .update(vehicles)
      .set(updateData)
      .where(eq(vehicles.id, vehicleId))
      .returning();

    if (!updated) {
      throw new AppError('INTERNAL', 500, 'Failed to update vehicle.');
    }

    const ipHashed = hashIp(ipAddress, env.FIELD_ENC_KEY);
    await auditService.log({
      actorId: userId,
      action: 'vehicle.updated',
      entity: 'vehicles',
      entityId: vehicleId,
      before: {
        makeModel: existing.makeModel,
        colour: existing.colour,
        passengerCapacity: existing.passengerCapacity,
      },
      after: updateData,
      ipHash: ipHashed,
      requestId,
    });

    return {
      id: updated.id,
      ownerId: updated.ownerId,
      type: updated.type,
      makeModel: updated.makeModel,
      colour: updated.colour,
      registrationNumber: updated.registrationNumber,
      passengerCapacity: updated.passengerCapacity,
      insuranceValidUntil: updated.insuranceValidUntil.toISOString(),
      status: updated.status,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async deleteVehicle(
    userId: string,
    vehicleId: string,
    ipAddress = '127.0.0.1',
    requestId = 'unknown',
  ): Promise<{ message: string }> {
    const [existing] = await db
      .select()
      .from(vehicles)
      .where(and(eq(vehicles.id, vehicleId), isNull(vehicles.deletedAt)))
      .limit(1);

    if (!existing) {
      throw new AppError('NOT_FOUND', 404, 'Vehicle not found.');
    }

    if (existing.ownerId !== userId) {
      throw new AppError('FORBIDDEN', 403, 'You do not own this vehicle.');
    }

    // Check if vehicle is used in scheduled or in_progress rides
    const [activeRide] = await db
      .select({ id: rides.id })
      .from(rides)
      .where(
        and(
          eq(rides.vehicleId, vehicleId),
          sql`${rides.status} IN ('scheduled', 'in_progress')`,
        ),
      )
      .limit(1);

    if (activeRide) {
      throw new AppError(
        'CONFLICT',
        409,
        'Cannot delete a vehicle that has active or scheduled rides.',
      );
    }

    const now = new Date();
    await db
      .update(vehicles)
      .set({ deletedAt: now, updatedAt: now })
      .where(eq(vehicles.id, vehicleId));

    const ipHashed = hashIp(ipAddress, env.FIELD_ENC_KEY);
    await auditService.log({
      actorId: userId,
      action: 'vehicle.deleted',
      entity: 'vehicles',
      entityId: vehicleId,
      ipHash: ipHashed,
      requestId,
    });

    return { message: 'Vehicle deleted successfully.' };
  }
}

export const vehiclesService = new VehiclesService();
