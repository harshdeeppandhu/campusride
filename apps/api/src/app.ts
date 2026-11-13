import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { errorHandler } from './middleware/errorHandler.js';
import { healthRouter } from './modules/health/routes.js';

/**
 * Creates and configures the Express application.
 * Separated from server.ts so tests can import without starting a listener.
 */
export function createApp(): express.Express {
  const app = express();

  // ── Security headers ─────────────────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false, // relaxed for API
    }),
  );

  // ── CORS ─────────────────────────────────────────────────────────────────
  const allowedOrigins = env.CORS_ORIGINS.split(',').map((o) => o.trim());
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, server-to-server)
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`CORS: origin ${origin} not allowed`));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'Idempotency-Key'],
      exposedHeaders: ['X-Request-Id'],
    }),
  );

  // ── Request ID ───────────────────────────────────────────────────────────
  app.use(requestIdMiddleware);

  // ── Structured logging ───────────────────────────────────────────────────
  app.use(
    pinoHttp({
      logger,
      customProps: (req) => ({
        requestId: (req as express.Request).requestId,
      }),
      redact: ['req.headers.authorization', 'req.headers.cookie'],
    }),
  );

  // ── Body parsing (100 KB JSON limit per AGENTS.md) ───────────────────────
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false, limit: '100kb' }));

  // ── API routes ───────────────────────────────────────────────────────────
  const apiRouter = express.Router();

  apiRouter.use('/', healthRouter);

  // Placeholder — modules will be mounted here in later milestones:
  // apiRouter.use('/auth', authRouter);
  // apiRouter.use('/me', meRouter);
  // etc.

  app.use('/api/v1', apiRouter);

  // ── 404 handler ──────────────────────────────────────────────────────────
  app.use((_req, res) => {
    res.status(404).json({
      type: 'https://campusride.example.com/errors/not-found',
      title: 'NOT_FOUND',
      status: 404,
      code: 'NOT_FOUND',
      detail: 'The requested resource was not found.',
      requestId: _req.requestId,
    });
  });

  // ── Global error handler (must be last) ──────────────────────────────────
  app.use(errorHandler);

  return app;
}
