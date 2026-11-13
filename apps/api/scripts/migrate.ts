import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { env } from '../src/config/env.js';
import { logger } from '../src/lib/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.resolve(__dirname, '../../../db/migrations');

async function migrate() {
  logger.info({ url: env.DATABASE_URL.replace(/:[^:@]+@/, ':***@') }, 'Running database migrations');

  const client = new pg.Client({
    connectionString: env.DATABASE_URL,
  });

  await client.connect();

  try {
    // 1. Create migrations tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 2. Read migration files sorted alphabetically
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const res = await client.query(
        'SELECT 1 FROM schema_migrations WHERE version = $1',
        [file],
      );

      if (res.rowCount && res.rowCount > 0) {
        logger.info({ file }, 'Migration already applied, skipping');
        continue;
      }

      logger.info({ file }, 'Applying migration');
      const sqlContent = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');

      await client.query('BEGIN');
      try {
        await client.query(sqlContent);
        await client.query(
          'INSERT INTO schema_migrations (version) VALUES ($1)',
          [file],
        );
        await client.query('COMMIT');
        logger.info({ file }, 'Migration applied successfully');
      } catch (err) {
        await client.query('ROLLBACK');
        logger.error({ file, err }, 'Migration failed, transaction rolled back');
        throw err;
      }
    }

    logger.info('All database migrations completed successfully.');
  } finally {
    await client.end();
  }
}

migrate().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Migration error:', err);
  process.exit(1);
});
