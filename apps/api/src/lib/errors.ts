import type { ErrorCode } from '@campusride/shared';

/**
 * Application-level error class.
 * Throw this from services/controllers; the global error handler converts it to RFC 7807 problem+json.
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
