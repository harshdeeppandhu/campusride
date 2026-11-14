import type { Request, Response, NextFunction } from 'express';
import {
  UploadUrlRequestSchema,
  CreateVerificationRequestSchema,
} from '@campusride/shared';
import { AppError } from '../../lib/errors.js';
import { verificationService } from './service.js';

export class VerificationController {
  async getUploadUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        throw new AppError('UNAUTHENTICATED', 401, 'Authentication required.');
      }

      const parsed = UploadUrlRequestSchema.parse(req.body);
      const result = await verificationService.getUploadUrl(user.userId, parsed);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async createRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        throw new AppError('UNAUTHENTICATED', 401, 'Authentication required.');
      }

      const parsed = CreateVerificationRequestSchema.parse(req.body);
      const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const requestId = req.requestId || 'unknown';

      const result = await verificationService.createRequest(
        user.userId,
        parsed,
        ip,
        requestId,
      );
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getMyRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        throw new AppError('UNAUTHENTICATED', 401, 'Authentication required.');
      }

      const requests = await verificationService.getMyRequests(user.userId);
      res.status(200).json({ requests });
    } catch (err) {
      next(err);
    }
  }
}

export const verificationController = new VerificationController();
