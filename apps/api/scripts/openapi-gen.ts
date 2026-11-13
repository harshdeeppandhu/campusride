/**
 * OpenAPI schema generation script stub for M0.
 * In M2, this inspects Zod schemas and outputs openapi.json.
 */
import { logger } from '../src/lib/logger.js';

async function main() {
  logger.info('OpenAPI generation stub (M0) — generator implemented in M2.');
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
