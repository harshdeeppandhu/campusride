import { z } from 'zod';
import { VehicleType, VehicleStatus } from '../enums.js';

export const VehicleTypeSchema = z.enum([
  VehicleType.CAR,
  VehicleType.BIKE,
  VehicleType.SCOOTER,
  VehicleType.AUTO,
  VehicleType.OTHER,
]);

export const CreateVehicleSchema = z
  .object({
    type: VehicleTypeSchema,
    makeModel: z.string().min(2).max(100).trim(),
    colour: z.string().min(2).max(50).trim(),
    registrationNumber: z.string().min(4).max(30).trim(),
    passengerCapacity: z.number().int().min(1).max(6),
    insuranceValidUntil: z.string().datetime(),
  })
  .refine(
    (data) => {
      if (data.type === 'bike' || data.type === 'scooter') {
        return data.passengerCapacity === 1;
      }
      return true;
    },
    {
      message: 'Bikes and scooters can carry at most 1 passenger',
      path: ['passengerCapacity'],
    },
  );
export type CreateVehicle = z.infer<typeof CreateVehicleSchema>;

export const UpdateVehicleSchema = z.object({
  makeModel: z.string().min(2).max(100).trim().optional(),
  colour: z.string().min(2).max(50).trim().optional(),
  passengerCapacity: z.number().int().min(1).max(6).optional(),
  insuranceValidUntil: z.string().datetime().optional(),
});
export type UpdateVehicle = z.infer<typeof UpdateVehicleSchema>;

export const VehicleResponseSchema = z.object({
  id: z.string().uuid(),
  ownerId: z.string().uuid(),
  type: VehicleTypeSchema,
  makeModel: z.string(),
  colour: z.string(),
  registrationNumber: z.string(),
  passengerCapacity: z.number().int(),
  insuranceValidUntil: z.string().datetime(),
  status: z.enum([
    VehicleStatus.PENDING,
    VehicleStatus.VERIFIED,
    VehicleStatus.REJECTED,
    VehicleStatus.SUSPENDED,
  ]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
});
export type VehicleResponse = z.infer<typeof VehicleResponseSchema>;
