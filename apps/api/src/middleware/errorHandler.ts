import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import type { ErrorCode } from '@campusride/shared';
import { logger } from '../lib/logger.js';

/**
 * Application-level error class.
 * Throw this from services; the error handler converts it to RFC 7807 problem+json.
 */
export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    public readonly httpStatus: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Global error handler — must be registered LAST in Express middleware chain.
 * Returns application/problem+json per RFC 7807.
 * Never leaks stack traces to clients.
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const requestId = req.requestId ?? 'unknown';

  if (err instanceof AppError) {
    logger.warn({ requestId, code: err.code, status: err.httpStatus }, err.message);
    res.status(err.httpStatus).json({
      type: 'https://campusride.example.com/errors/' + err.code.toLowerCase().replace(/_/g, '-'),
      title: err.code,
      status: err.httpStatus,
      code: err.code,
      detail: err.message,
      requestId,
    });
    return;
  }

  if (err instanceof ZodError) {
    logger.warn({ requestId, issues: err.issues }, 'Validation error');
    res.status(400).json({
      type: 'https://campusride.example.com/errors/validation-error',
      title: 'VALIDATION_ERROR',
      status: 400,
      code: 'VALIDATION_ERROR',
      detail: 'Request validation failed.',
      requestId,
      errors: err.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
    return;
  }

  // Unknown errors — log fully server-side, never expose internals
  logger.error({ requestId, err }, 'Unhandled error');
  res.status(500).json({
    type: 'https://campusride.example.com/errors/internal',
    title: 'INTERNAL',
    status: 500,
    code: 'INTERNAL',
    detail: 'An unexpected error occurred.',
    requestId,
  });
}
