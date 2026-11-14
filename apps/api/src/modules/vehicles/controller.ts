import type { Request, Response, NextFunction } from 'express';
import {
  CreateVehicleSchema,
  UpdateVehicleSchema,
} from '@campusride/shared';
import { AppError } from '../../lib/errors.js';
import { vehiclesService } from './service.js';

function getParamId(req: Request): string {
  const raw = req.params['id'];
  if (Array.isArray(raw)) {
    return raw[0] || '';
  }
  return typeof raw === 'string' ? raw : '';
}

function getClientIp(req: Request): string {
  if (typeof req.ip === 'string') return req.ip;
  const remote = req.socket.remoteAddress;
  return typeof remote === 'string' ? remote : '127.0.0.1';
}

function getReqId(req: Request): string {
  return typeof req.requestId === 'string' ? req.requestId : 'unknown';
}

export class VehiclesController {
  async createVehicle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        throw new AppError('UNAUTHENTICATED', 401, 'Authentication required.');
      }

      const parsed = CreateVehicleSchema.parse(req.body);
      const ip = getClientIp(req);
      const reqId = getReqId(req);

      const result = await vehiclesService.createVehicle(
        user.userId,
        parsed,
        ip,
        reqId,
      );
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  async listVehicles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        throw new AppError('UNAUTHENTICATED', 401, 'Authentication required.');
      }

      const vehicles = await vehiclesService.listVehicles(user.userId);
      res.status(200).json({ vehicles });
    } catch (err) {
      next(err);
    }
  }

  async getVehicle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        throw new AppError('UNAUTHENTICATED', 401, 'Authentication required.');
      }

      const vehicleId = getParamId(req);
      if (!vehicleId) {
        throw new AppError('VALIDATION_ERROR', 400, 'Vehicle ID is required.');
      }

      const isAdmin = user.role === 'admin';
      const vehicle = await vehiclesService.getVehicle(user.userId, vehicleId, isAdmin);
      res.status(200).json(vehicle);
    } catch (err) {
      next(err);
    }
  }

  async updateVehicle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        throw new AppError('UNAUTHENTICATED', 401, 'Authentication required.');
      }

      const vehicleId = getParamId(req);
      if (!vehicleId) {
        throw new AppError('VALIDATION_ERROR', 400, 'Vehicle ID is required.');
      }

      const parsed = UpdateVehicleSchema.parse(req.body);
      const ip = getClientIp(req);
      const reqId = getReqId(req);

      const result = await vehiclesService.updateVehicle(
        user.userId,
        vehicleId,
        parsed,
        ip,
        reqId,
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async deleteVehicle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        throw new AppError('UNAUTHENTICATED', 401, 'Authentication required.');
      }

      const vehicleId = getParamId(req);
      if (!vehicleId) {
        throw new AppError('VALIDATION_ERROR', 400, 'Vehicle ID is required.');
      }

      const ip = getClientIp(req);
      const reqId = getReqId(req);

      const result = await vehiclesService.deleteVehicle(
        user.userId,
        vehicleId,
        ip,
        reqId,
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

export const vehiclesController = new VehiclesController();
