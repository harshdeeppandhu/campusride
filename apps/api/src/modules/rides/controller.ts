import type { Request, Response, NextFunction } from 'express';
import {
  RideEstimateRequestSchema,
  CreateRideRequestSchema,
  UpdateRideRequestSchema,
  CancelRideRequestSchema,
} from '@campusride/shared';
import { AppError } from '../../lib/errors.js';
import { ridesService } from './service.js';

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

export class RidesController {
  async estimateRide(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = RideEstimateRequestSchema.parse(req.body);
      const estimate = await ridesService.estimateRide(parsed);
      res.status(200).json(estimate);
    } catch (err) {
      next(err);
    }
  }

  async createRide(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        throw new AppError('UNAUTHENTICATED', 401, 'Authentication required.');
      }

      const parsed = CreateRideRequestSchema.parse(req.body);
      const ip = getClientIp(req);
      const reqId = getReqId(req);

      const ride = await ridesService.createRide(user.userId, parsed, ip, reqId);
      res.status(201).json(ride);
    } catch (err) {
      next(err);
    }
  }

  async getRide(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rideId = getParamId(req);
      if (!rideId) {
        throw new AppError('VALIDATION_ERROR', 400, 'Ride ID is required.');
      }

      const ride = await ridesService.getRideById(rideId);
      res.status(200).json(ride);
    } catch (err) {
      next(err);
    }
  }

  async updateRide(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        throw new AppError('UNAUTHENTICATED', 401, 'Authentication required.');
      }

      const rideId = getParamId(req);
      if (!rideId) {
        throw new AppError('VALIDATION_ERROR', 400, 'Ride ID is required.');
      }

      const parsed = UpdateRideRequestSchema.parse(req.body);
      const ip = getClientIp(req);
      const reqId = getReqId(req);

      const ride = await ridesService.updateRide(user.userId, rideId, parsed, ip, reqId);
      res.status(200).json(ride);
    } catch (err) {
      next(err);
    }
  }

  async cancelRide(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        throw new AppError('UNAUTHENTICATED', 401, 'Authentication required.');
      }

      const rideId = getParamId(req);
      if (!rideId) {
        throw new AppError('VALIDATION_ERROR', 400, 'Ride ID is required.');
      }

      const parsed = CancelRideRequestSchema.parse(req.body);
      const ip = getClientIp(req);
      const reqId = getReqId(req);

      const result = await ridesService.cancelRide(
        user.userId,
        rideId,
        parsed.cancelReason,
        ip,
        reqId,
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async startRide(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        throw new AppError('UNAUTHENTICATED', 401, 'Authentication required.');
      }

      const rideId = getParamId(req);
      if (!rideId) {
        throw new AppError('VALIDATION_ERROR', 400, 'Ride ID is required.');
      }

      const result = await ridesService.startRide(user.userId, rideId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async completeRide(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        throw new AppError('UNAUTHENTICATED', 401, 'Authentication required.');
      }

      const rideId = getParamId(req);
      if (!rideId) {
        throw new AppError('VALIDATION_ERROR', 400, 'Ride ID is required.');
      }

      const result = await ridesService.completeRide(user.userId, rideId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async listMyRides(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        throw new AppError('UNAUTHENTICATED', 401, 'Authentication required.');
      }

      const status = typeof req.query['status'] === 'string' ? req.query['status'] : undefined;
      const myRides = await ridesService.listMyRides(user.userId, status);
      res.status(200).json({ rides: myRides });
    } catch (err) {
      next(err);
    }
  }
}

export const ridesController = new RidesController();
