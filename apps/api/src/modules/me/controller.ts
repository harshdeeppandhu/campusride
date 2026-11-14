import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  ConsentSubmissionSchema,
  UpdateProfileSchema,
  PhoneOtpRequestSchema,
  PhoneOtpVerifySchema,
} from '@campusride/shared';
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

  async requestPhoneOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        throw new AppError('UNAUTHENTICATED', 401, 'Authentication required.');
      }

      const parsed = PhoneOtpRequestSchema.parse(req.body);
      const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const requestId = req.requestId || 'unknown';

      const result = await meService.requestPhoneOtp(user.userId, parsed.phone, ip, requestId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async verifyPhoneOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        throw new AppError('UNAUTHENTICATED', 401, 'Authentication required.');
      }

      const parsed = PhoneOtpVerifySchema.parse(req.body);
      const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const requestId = req.requestId || 'unknown';

      const result = await meService.verifyPhoneOtp(
        user.userId,
        parsed.phone,
        parsed.code,
        ip,
        requestId,
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getPhotoUploadUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        throw new AppError('UNAUTHENTICATED', 401, 'Authentication required.');
      }

      const PhotoUploadSchema = z.object({
        contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
      });
      const parsed = PhotoUploadSchema.parse(req.body);
      const result = await meService.getPhotoUploadUrl(user.userId, parsed.contentType);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

export const meController = new MeController();
