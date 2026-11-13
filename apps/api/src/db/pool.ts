import pg from 'pg';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';

const { Pool } = pg;

/** Shared PostgreSQL connection pool for the whole API process. */
export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: env.DATABASE_POOL_MAX,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('error', (err) => {
  logger.error({ err }, 'Unexpected DB pool error');
});

/**
 * Ping the database to verify connectivity.
 * Used by /readyz health check.
 */
export async function pingDatabase(): Promise<{ ok: boolean; durationMs: number }> {
  const start = Date.now();
  try {
    await pool.query('SELECT 1');
    return { ok: true, durationMs: Date.now() - start };
  } catch (err) {
    logger.error({ err }, 'DB ping failed');
    return { ok: false, durationMs: Date.now() - start };
  }
}

/** Graceful shutdown — drain the pool. */
export async function closePool(): Promise<void> {
  await pool.end();
}
