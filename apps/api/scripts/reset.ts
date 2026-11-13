/**
 * Database reset script stub for M0.
 * In M1, this resets local dev database only (refuses in production).
 */
import { logger } from '../src/lib/logger.js';
import { env } from '../src/config/env.js';

async function main() {
  if (env.NODE_ENV === 'production') {
    throw new Error('Refusing to reset database in production!');
  }
  logger.info('Database reset stub (M0) — local reset implemented in M1.');
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
