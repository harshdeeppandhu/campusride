import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../src/db/pool.js';
import { env } from '../src/config/env.js';
import { logger } from '../src/lib/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const seedsDir = path.resolve(__dirname, '../../../db/seeds');

interface HubSeed {
  name: string;
  kind: 'hub' | 'campus' | 'custom';
  city: string;
  lat: number;
  lng: number;
  address: string;
}

interface DemoUserSeed {
  email: string;
  fullName: string;
  memberType: 'student' | 'staff' | 'community';
  role: 'member' | 'admin' | 'safety_admin' | 'analyst';
  gender: 'female' | 'male' | 'non_binary' | 'undisclosed';
  phoneE164: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
  collegeVerified: boolean;
  genderVerified: boolean;
  adultConfirmed: boolean;
}

async function seed() {
  if (env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed database in production environment!');
  }

  logger.info('Starting database seeding...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Seed App Config
    const configPath = path.join(seedsDir, 'app_config.json');
    if (fs.existsSync(configPath)) {
      const configData = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as Record<string, unknown>;
      for (const [key, value] of Object.entries(configData)) {
        await client.query(
          `INSERT INTO app_config (key, value, updated_at)
           VALUES ($1, $2, NOW())
           ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
          [key, JSON.stringify(value)],
        );
      }
      logger.info('Seeded app_config successfully');
    }

    // 2. Seed Places / Hubs
    const hubsPath = path.join(seedsDir, 'hubs.json');
    if (fs.existsSync(hubsPath)) {
      const hubsData = JSON.parse(fs.readFileSync(hubsPath, 'utf-8')) as HubSeed[];
      for (const hub of hubsData) {
        await client.query(
          `INSERT INTO places (name, kind, city, location, address, is_active, created_at)
           VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326)::geography, $6, true, NOW())
           ON CONFLICT DO NOTHING`,
          [hub.name, hub.kind, hub.city, hub.lng, hub.lat, hub.address],
        );
      }
      logger.info(`Seeded ${hubsData.length} hubs into places table`);
    }

    // 3. Seed Demo Users
    const usersPath = path.join(seedsDir, 'demo_users.json');
    if (fs.existsSync(usersPath)) {
      const usersData = JSON.parse(fs.readFileSync(usersPath, 'utf-8')) as DemoUserSeed[];
      const now = new Date().toISOString();

      for (const u of usersData) {
        const userRes = await client.query<{ id: string }>(
          `INSERT INTO users (
             email, full_name, member_type, role, gender, phone_e164,
             email_verified_at, phone_verified_at, college_verified_at,
             gender_verified_at, adult_confirmed_at, status, created_at, updated_at
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'active', NOW(), NOW())
           ON CONFLICT (email) DO UPDATE SET
             full_name = $2, role = $4, gender = $5, phone_e164 = $6, updated_at = NOW()
           RETURNING id`,
          [
            u.email,
            u.fullName,
            u.memberType,
            u.role,
            u.gender,
            u.phoneE164,
            u.emailVerified ? now : null,
            u.phoneVerified ? now : null,
            u.collegeVerified ? now : null,
            u.genderVerified ? now : null,
            now,
          ],
        );

        const userId = userRes.rows[0]?.id;

        // If user is a driver (e.g. driver@college.edu or driver.male@college.edu), seed a vehicle
        if (userId && u.email.startsWith('driver')) {
          await client.query(
            `INSERT INTO vehicles (
               owner_id, type, make_model, colour, registration_number,
               passenger_capacity, insurance_valid_until, status, created_at, updated_at
             )
             VALUES ($1, 'car', 'Maruti Swift', 'White', $2, 4, NOW() + INTERVAL '1 year', 'verified', NOW(), NOW())
             ON CONFLICT (registration_number) WHERE deleted_at IS NULL DO NOTHING`,
            [userId, u.email === 'driver@college.edu' ? 'UK07AB1234' : 'UK07CD5678'],
          );
        }
      }
      logger.info(`Seeded ${usersData.length} demo users and vehicles`);
    }

    await client.query('COMMIT');
    logger.info('Database seeding completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ err }, 'Seeding failed, transaction rolled back');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Seeding error:', err);
  process.exit(1);
});
