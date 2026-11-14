import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { idempotencyKeys } from '../db/schema.js';
import { AppError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';

export interface IdempotencyOptions {
  required?: boolean;
  ttlSeconds?: number;
}

/**
 * Middleware ensuring idempotent execution of state-mutating requests.
 * Uses SHA-256 hash of the request body to prevent replay with modified parameters.
 */
export function idempotency(options: IdempotencyOptions = {}) {
  const { required = false, ttlSeconds = 86400 } = options; // 24 hours default

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const key = req.headers['idempotency-key'];

    if (!key) {
      if (required) {
        return next(
          new AppError('VALIDATION_ERROR', 400, 'Idempotency-Key header is required for this operation.'),
        );
      }
      return next();
    }

    if (typeof key !== 'string' || key.length === 0 || key.length > 128) {
      return next(
        new AppError('VALIDATION_ERROR', 400, 'Invalid Idempotency-Key header format.'),
      );
    }

    const userId = req.user?.userId;
    if (!userId) {
      return next(
        new AppError('UNAUTHENTICATED', 401, 'Authentication is required for idempotent operations.'),
      );
    }

    const payloadString = JSON.stringify(req.body ?? {});
    const requestHash = crypto.createHash('sha256').update(payloadString).digest('hex');

    try {
      // Check for existing cached response
      const [existing] = await db
        .select()
        .from(idempotencyKeys)
        .where(eq(idempotencyKeys.key, key))
        .limit(1);

      if (existing) {
        if (existing.userId !== userId) {
          return next(
            new AppError('FORBIDDEN', 403, 'Idempotency key does not belong to the current user.'),
          );
        }

        if (existing.requestHash !== requestHash) {
          return next(
            new AppError(
              'IDEMPOTENCY_MISMATCH',
              409,
              'Idempotency key was previously used with a different request payload.',
            ),
          );
        }

        // Return cached response
        res.setHeader('X-Cache-Lookup', 'HIT');
        res.status(existing.statusCode).json(existing.response);
        return;
      }

      // Intercept res.json to capture response
      const originalJson = res.json.bind(res);

      res.json = (body: unknown): Response => {
        // Only cache successful 2xx responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

          db.insert(idempotencyKeys)
            .values({
              key,
              userId,
              route: req.originalUrl || req.url,
              requestHash,
              response: body,
              statusCode: res.statusCode,
              expiresAt,
            })
            .catch((err) => {
              logger.error({ err, key }, 'Failed to save idempotency response');
            });
        }

        return originalJson(body);
      };

      next();
    } catch (err) {
      next(err);
    }
  };
}
