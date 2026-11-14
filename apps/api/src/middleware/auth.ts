import type { Request, Response, NextFunction } from 'express';
import { eq } from 'drizzle-orm';
import type { UserRole, UserStatus, TrustTier } from '@campusride/shared';
import { env } from '../config/env.js';
import { AppError } from '../lib/errors.js';
import { db } from '../db/client.js';
import { users } from '../db/schema.js';
import { verifyAccessToken } from '../modules/auth/tokens.js';

export interface AuthUser {
  userId: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  tier: TrustTier;
  sessionId: string;
}

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// ── User Status Cache (≤30 seconds TTL per docs/05 §3) ───────────────────────

interface CachedStatus {
  status: UserStatus;
  checkedAt: number;
}

const statusCache = new Map<string, CachedStatus>();
const STATUS_CACHE_TTL_MS = 30_000;

export async function getCachedUserStatus(userId: string): Promise<UserStatus> {
  const now = Date.now();
  const cached = statusCache.get(userId);

  if (cached && now - cached.checkedAt < STATUS_CACHE_TTL_MS) {
    return cached.status;
  }

  const [user] = await db
    .select({ status: users.status })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const status: UserStatus = user ? user.status : 'deleted';
  statusCache.set(userId, { status, checkedAt: now });
  return status;
}

export function setUserStatusCache(userId: string, status: UserStatus): void {
  statusCache.set(userId, { status, checkedAt: Date.now() });
}

export function invalidateUserStatusCache(userId: string): void {
  statusCache.delete(userId);
}

export const userStatusService = {
  getCachedUserStatus,
  setUserStatusCache,
  invalidateUserStatusCache,
};

// ── Require Authentication Middleware ─────────────────────────────────────────

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('UNAUTHENTICATED', 401, 'Authentication token is required.');
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      throw new AppError('UNAUTHENTICATED', 401, 'Authentication token is empty.');
    }

    const payload = verifyAccessToken(token, env.JWT_SECRET);

    // Fast status check (enforces immediate suspension within ≤30s)
    const currentStatus = await userStatusService.getCachedUserStatus(payload.sub);
    if (currentStatus !== 'active') {
      throw new AppError('FORBIDDEN', 403, 'Account is suspended or deactivated.');
    }

    req.user = {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      status: currentStatus,
      tier: payload.tier,
      sessionId: payload.sessionId,
    };

    next();
  } catch (err) {
    next(err);
  }
}

// ── Optional Authentication Middleware ───────────────────────────────────────

export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      if (token) {
        try {
          const payload = verifyAccessToken(token, env.JWT_SECRET);
          const currentStatus = await userStatusService.getCachedUserStatus(payload.sub);
          if (currentStatus === 'active') {
            req.user = {
              userId: payload.sub,
              email: payload.email,
              role: payload.role,
              status: currentStatus,
              tier: payload.tier,
              sessionId: payload.sessionId,
            };
          }
        } catch {
          // Token invalid — ignore in optionalAuth
        }
      }
    }
    next();
  } catch (err) {
    next(err);
  }
}

// ── Role Authorization Middleware ────────────────────────────────────────────

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('UNAUTHENTICATED', 401, 'Authentication required.'));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('FORBIDDEN', 403, 'Insufficient permissions for this operation.'),
      );
    }

    next();
  };
}

// ── Trust Tier Authorization Middleware ──────────────────────────────────────

export function requireTier(minTier: TrustTier) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError('UNAUTHENTICATED', 401, 'Authentication required.'));
    }

    if (req.user.tier < minTier) {
      return next(
        new AppError(
          'TIER_REQUIRED',
          403,
          `Trust tier T${minTier} is required for this action.`,
        ),
      );
    }

    next();
  };
}
