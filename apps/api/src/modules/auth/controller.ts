import type { Request, Response, NextFunction } from 'express';
import { OtpRequestSchema, OtpVerifySchema, RefreshTokenRequestSchema } from '@campusride/shared';
import { env } from '../../config/env.js';
import { AppError } from '../../lib/errors.js';
import { authService } from './service.js';

function getCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  const match = header.match(new RegExp(`(^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[2] || '') : undefined;
}

export class AuthController {
  /**
   * POST /auth/otp/request
   */
  async requestOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = OtpRequestSchema.parse(req.body);
      const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const requestId = req.requestId || 'unknown';

      const result = await authService.requestOtp(parsed.email, ip, requestId);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /auth/otp/verify
   */
  async verifyOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = OtpVerifySchema.parse(req.body);
      const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'unknown';
      const requestId = req.requestId || 'unknown';

      const result = await authService.verifyOtp(
        parsed.email,
        parsed.code,
        userAgent,
        ip,
        requestId,
      );

      // Set rotating refresh token cookie for web clients
      if (result.tokens.refreshToken) {
        res.cookie('rt', result.tokens.refreshToken, {
          httpOnly: true,
          secure: env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/api/v1/auth',
          maxAge: env.JWT_REFRESH_EXPIRY_SECONDS * 1000,
        });
      }

      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /auth/refresh
   */
  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = RefreshTokenRequestSchema.safeParse(req.body);
      const bodyToken = body.success ? body.data.refreshToken : undefined;
      const cookieToken = getCookie(req, 'rt');
      const refreshToken = bodyToken || cookieToken;

      if (!refreshToken) {
        throw new AppError('UNAUTHENTICATED', 401, 'Refresh token is required.');
      }

      const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'unknown';
      const requestId = req.requestId || 'unknown';

      const tokens = await authService.refreshSession(refreshToken, userAgent, ip, requestId);

      if (tokens.refreshToken) {
        res.cookie('rt', tokens.refreshToken, {
          httpOnly: true,
          secure: env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/api/v1/auth',
          maxAge: env.JWT_REFRESH_EXPIRY_SECONDS * 1000,
        });
      }

      res.status(200).json(tokens);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /auth/logout
   */
  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const requestId = req.requestId || 'unknown';

      if (user?.sessionId) {
        await authService.logout(user.sessionId, user.userId, ip, requestId);
      }

      res.clearCookie('rt', {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/api/v1/auth',
      });

      res.status(200).json({ message: 'Logged out successfully.' });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /auth/sessions
   */
  async getSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        throw new AppError('UNAUTHENTICATED', 401, 'Authentication required.');
      }

      const sessions = await authService.listSessions(user.userId, user.sessionId);
      res.status(200).json({ sessions });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /auth/sessions/:id
   */
  async revokeSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        throw new AppError('UNAUTHENTICATED', 401, 'Authentication required.');
      }

      const rawId = req.params['id'];
      const sessionId = Array.isArray(rawId) ? rawId[0] : rawId;
      if (!sessionId) {
        throw new AppError('VALIDATION_ERROR', 400, 'Session ID is required.');
      }

      const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
      const requestId = req.requestId || 'unknown';

      await authService.revokeSession(user.userId, sessionId, ip, requestId);
      res.status(200).json({ message: 'Session revoked successfully.' });
    } catch (err) {
      next(err);
    }
  }
}

export const authController = new AuthController();
