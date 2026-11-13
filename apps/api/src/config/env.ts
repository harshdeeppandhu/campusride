import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from cwd, workspace root, or apps/api
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Environment configuration — validated at boot with Zod.
 * Any missing required variable causes the process to exit immediately.
 * Never trust process.env directly after this module is loaded.
 */
const envSchema = z.object({
  // ── App ──────────────────────────────────────────────────────────────────
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_NAME: z.string().default('CampusRide'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  API_BASE_URL: z.string().url().default('http://localhost:3001'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

  // ── Database ─────────────────────────────────────────────────────────────
  DATABASE_URL: z.string().min(1),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),

  // ── Auth ─────────────────────────────────────────────────────────────────
  JWT_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRY_SECONDS: z.coerce.number().int().default(900), // 15 min
  JWT_REFRESH_EXPIRY_SECONDS: z.coerce.number().int().default(2592000), // 30 days
  OTP_HMAC_PEPPER: z.string().min(32),

  // ── Encryption ───────────────────────────────────────────────────────────
  FIELD_ENC_KEY: z.string().length(64), // 32 bytes hex

  // ── CORS ─────────────────────────────────────────────────────────────────
  CORS_ORIGINS: z.string().default('http://localhost:5173'),

  // ── Worker ───────────────────────────────────────────────────────────────
  WORKER_INLINE: z
    .string()
    .transform((v) => v === 'true')
    .default('true'),

  // ── Storage (Cloudflare R2) ───────────────────────────────────────────────
  R2_ENDPOINT: z.string().url().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().default('campusride-private'),
  STORAGE_ADAPTER: z.enum(['r2', 'local', 'console']).default('console'),

  // ── Email ────────────────────────────────────────────────────────────────
  EMAIL_ADAPTER: z.enum(['resend', 'brevo', 'console']).default('console'),
  EMAIL_FROM: z.string().email().default('noreply@campusride.example.com'),
  RESEND_API_KEY: z.string().optional(),

  // ── SMS ──────────────────────────────────────────────────────────────────
  SMS_ADAPTER: z.enum(['firebase', 'msg91', 'console']).default('console'),
  MSG91_AUTH_KEY: z.string().optional(),

  // ── Maps ─────────────────────────────────────────────────────────────────
  MAPS_ADAPTER: z.enum(['google', 'fake']).default('fake'),
  GOOGLE_MAPS_SERVER_KEY: z.string().optional(),

  // ── Push ─────────────────────────────────────────────────────────────────
  PUSH_ADAPTER: z.enum(['expo', 'console']).default('console'),
  EXPO_ACCESS_TOKEN: z.string().optional(),

  // ── Metrics / Internal ───────────────────────────────────────────────────
  METRICS_TOKEN: z.string().optional(),

  // ── Feature flags (bootstrap) ────────────────────────────────────────────
  // Real flags stored in DB; these are hard defaults for bootstrap
  EMISSION_KG_PER_KM_CAR: z.coerce.number().default(0.17),
});

function loadEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid environment configuration:');
    console.error(result.error.flatten().fieldErrors);
    process.exit(1);
  }
  return result.data;
}

// Singleton — evaluated once at import time
export const env = loadEnv();
export type Env = typeof env;
