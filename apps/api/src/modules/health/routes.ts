import type { Router } from 'express';
import { Router as createRouter } from 'express';
import { pingDatabase } from '../../db/pool.js';
import { env } from '../../config/env.js';

const router: Router = createRouter();

/**
 * GET /healthz — Liveness probe.
 * Always returns 200 if the process is running.
 * No DB check — used by load balancers to detect crashed processes.
 */
router.get('/healthz', (_req, res) => {
  res.status(200).json({ status: 'ok', name: env.APP_NAME });
});

/**
 * GET /readyz — Readiness probe.
 * Returns 200 only when the app is ready to serve traffic (DB connected).
 * Used by Render/orchestrators to hold traffic during startup or migration.
 */
router.get('/readyz', async (req, res) => {
  const dbResult = await pingDatabase();

  const checks = {
    database: {
      status: dbResult.ok ? 'ok' : 'error',
      durationMs: dbResult.durationMs,
    },
  } as const;

  const allOk = Object.values(checks).every((c) => c.status === 'ok');

  res.status(allOk ? 200 : 503).json({
    status: allOk ? 'ok' : 'error',
    version: process.env['npm_package_version'] ?? '0.0.1',
    checks,
    requestId: req.requestId,
  });
});

export { router as healthRouter };
