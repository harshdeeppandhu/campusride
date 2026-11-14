import type { Request, Response, NextFunction } from 'express';
import {
  AdminVerificationDecisionSchema,
  AdminSetGenderVerifiedSchema,
  type VerificationKind,
  type VerificationStatus,
} from '@campusride/shared';
import { AppError } from '../../lib/errors.js';
import { adminService } from './service.js';

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

export class AdminController {
  async getVerificationQueue(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const kind = req.query['kind'] as VerificationKind | undefined;
      const status = req.query['status'] as VerificationStatus | undefined;

      const items = await adminService.getVerificationQueue({ kind, status });
      res.status(200).json({ items });
    } catch (err) {
      next(err);
    }
  }

  async getDocumentDownloadUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user?.userId;
      if (!adminId) {
        throw new AppError('UNAUTHENTICATED', 401, 'Authentication required.');
      }

      const requestId = getParamId(req);
      if (!requestId) {
        throw new AppError('VALIDATION_ERROR', 400, 'Verification request ID is required.');
      }

      const ip = getClientIp(req);
      const reqId = getReqId(req);

      const result = await adminService.getDocumentDownloadUrl(adminId, requestId, ip, reqId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async recordDecision(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user?.userId;
      if (!adminId) {
        throw new AppError('UNAUTHENTICATED', 401, 'Authentication required.');
      }

      const requestId = getParamId(req);
      if (!requestId) {
        throw new AppError('VALIDATION_ERROR', 400, 'Verification request ID is required.');
      }

      const parsed = AdminVerificationDecisionSchema.parse(req.body);
      const ip = getClientIp(req);
      const reqId = getReqId(req);

      const result = await adminService.recordDecision(adminId, requestId, parsed, ip, reqId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async setGenderVerified(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user?.userId;
      if (!adminId) {
        throw new AppError('UNAUTHENTICATED', 401, 'Authentication required.');
      }

      const targetUserId = getParamId(req);
      if (!targetUserId) {
        throw new AppError('VALIDATION_ERROR', 400, 'User ID is required.');
      }

      const parsed = AdminSetGenderVerifiedSchema.parse(req.body);
      const ip = getClientIp(req);
      const reqId = getReqId(req);

      const result = await adminService.setGenderVerified(
        adminId,
        targetUserId,
        parsed.verified,
        ip,
        reqId,
      );
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async suspendUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user?.userId;
      if (!adminId) {
        throw new AppError('UNAUTHENTICATED', 401, 'Authentication required.');
      }

      const targetUserId = getParamId(req);
      if (!targetUserId) {
        throw new AppError('VALIDATION_ERROR', 400, 'User ID is required.');
      }

      const body = req.body as Record<string, unknown> | undefined;
      const reason = typeof body?.['reason'] === 'string' ? body['reason'] : undefined;
      const ip = getClientIp(req);
      const reqId = getReqId(req);

      const result = await adminService.suspendUser(adminId, targetUserId, reason, ip, reqId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async restoreUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user?.userId;
      if (!adminId) {
        throw new AppError('UNAUTHENTICATED', 401, 'Authentication required.');
      }

      const targetUserId = getParamId(req);
      if (!targetUserId) {
        throw new AppError('VALIDATION_ERROR', 400, 'User ID is required.');
      }

      const ip = getClientIp(req);
      const reqId = getReqId(req);

      const result = await adminService.restoreUser(adminId, targetUserId, ip, reqId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

export const adminController = new AdminController();
