import type { Request, Response, NextFunction } from 'express';
import { ConsentSubmissionSchema, UpdateProfileSchema } from '@campusride/shared';
import { AppError } from '../../lib/errors.js';
import { meService } from './service.js';

export class MeController {
  async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        throw new AppError('UNAUTHENTICATED', 401, 'Authentication required.');
      }

      const profile = await meService.getProfile(user.userId);
      res.status(200).json(profile);
    } catch (err) {
      next(err);
    }
  }

  async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        throw new AppError('UNAUTHENTICATED', 401, 'Authentication required.');
      }

      const parsed = UpdateProfileSchema.parse(req.body);
      const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const requestId = req.requestId || 'unknown';

      const updated = await meService.updateProfile(user.userId, parsed, ip, requestId);
      res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  }

  async recordConsents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        throw new AppError('UNAUTHENTICATED', 401, 'Authentication required.');
      }

      const parsed = ConsentSubmissionSchema.parse(req.body);
      const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const requestId = req.requestId || 'unknown';

      const result = await meService.recordConsents(user.userId, parsed, ip, requestId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getTrust(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        throw new AppError('UNAUTHENTICATED', 401, 'Authentication required.');
      }

      const trust = await meService.getTrust(user.userId);
      res.status(200).json(trust);
    } catch (err) {
      next(err);
    }
  }
}

export const meController = new MeController();
