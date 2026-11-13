/**
 * Worker entrypoint — runs pg-boss background jobs.
 * Can run as a separate process or inline (WORKER_INLINE=true in server.ts).
 * M0: Stub only. Jobs registered in M6.
 */
import 'dotenv/config';
import { logger } from './lib/logger.js';

logger.info('Worker starting (stub — no jobs registered yet)');

// In M6 this will:
// 1. Create a PgBoss instance
// 2. Register job handlers
// 3. Start the scheduler
// 4. Handle SIGTERM gracefully

process.on('SIGTERM', () => {
  logger.info('Worker SIGTERM received');
  process.exit(0);
});
