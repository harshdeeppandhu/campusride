/**
 * Database seed script stub for M0.
 * Full seed implementation will be completed in M1.
 */
import { logger } from '../src/lib/logger.js';

async function main() {
  logger.info('Database seed stub (M0) — full seeds are added in M1.');
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
