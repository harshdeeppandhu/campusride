import type { Request, Response, NextFunction } from 'express';
import { v7 as uuidv7 } from 'uuid';

/**
 * Attaches a unique requestId to every request.
 * Uses client-supplied X-Request-Id if present and valid (UUID format),
 * otherwise generates a new UUID v7.
 * Always echoes the final requestId back in X-Request-Id response header.
 */
export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const clientId = req.headers['x-request-id'];
  const isValidUuid =
    typeof clientId === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clientId);

  const requestId = isValidUuid ? clientId : uuidv7();
  // Attach to request object for downstream use
  (req as Request & { requestId: string }).requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
}

/** Type augmentation so req.requestId is available throughout the app */
declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}
