/**
 * Health endpoint tests — M0 acceptance check.
 * These are unit tests that mock the DB ping so no real DB is needed.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';

// Mock the DB pool so unit tests don't need a real Postgres connection
vi.mock('../../db/pool.js', () => ({
  pingDatabase: vi.fn().mockResolvedValue({ ok: true, durationMs: 5 }),
  pool: { on: vi.fn(), end: vi.fn() },
  closePool: vi.fn(),
}));

// Mock env to avoid dotenv
vi.mock('../../config/env.js', () => ({
  env: {
    NODE_ENV: 'test',
    APP_NAME: 'CampusRide',
    PORT: 3001,
    LOG_LEVEL: 'silent',
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    DATABASE_POOL_MAX: 5,
    JWT_SECRET: 'test-secret-32-characters-minimum-xx',
    JWT_ACCESS_EXPIRY_SECONDS: 900,
    JWT_REFRESH_EXPIRY_SECONDS: 2592000,
    OTP_HMAC_PEPPER: 'test-pepper-32-characters-minimum-xx',
    FIELD_ENC_KEY: 'a'.repeat(64),
    CORS_ORIGINS: 'http://localhost:5173',
    WORKER_INLINE: true,
    R2_BUCKET: 'campusride-private',
    STORAGE_ADAPTER: 'console',
    EMAIL_ADAPTER: 'console',
    EMAIL_FROM: 'noreply@test.example.com',
    SMS_ADAPTER: 'console',
    MAPS_ADAPTER: 'fake',
    PUSH_ADAPTER: 'console',
    EMISSION_KG_PER_KM_CAR: 0.17,
  },
}));

interface HealthBody {
  status: string;
  name?: string;
}

interface ReadyzBody {
  status: string;
  version: string;
  checks: {
    database: {
      status: string;
      durationMs?: number;
    };
  };
  requestId?: string;
}

interface ErrorBody {
  code: string;
  detail: string;
}

describe('GET /api/v1/healthz', () => {
  it('returns 200 with status ok', async () => {
    const app = createApp();
    const res = await request(app).get('/api/v1/healthz');
    expect(res.status).toBe(200);
    const body = res.body as HealthBody;
    expect(body.status).toBe('ok');
  });
});

describe('GET /api/v1/readyz', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 when DB is healthy', async () => {
    const { pingDatabase } = await import('../../db/pool.js');
    vi.mocked(pingDatabase).mockResolvedValue({ ok: true, durationMs: 3 });

    const app = createApp();
    const res = await request(app).get('/api/v1/readyz');
    expect(res.status).toBe(200);
    const body = res.body as ReadyzBody;
    expect(body.status).toBe('ok');
    expect(body.checks.database.status).toBe('ok');
  });

  it('returns 503 when DB is unreachable', async () => {
    const { pingDatabase } = await import('../../db/pool.js');
    vi.mocked(pingDatabase).mockResolvedValue({ ok: false, durationMs: 5000 });

    const app = createApp();
    const res = await request(app).get('/api/v1/readyz');
    expect(res.status).toBe(503);
    const body = res.body as ReadyzBody;
    expect(body.status).toBe('error');
    expect(body.checks.database.status).toBe('error');
  });

  it('includes requestId in response', async () => {
    const app = createApp();
    const res = await request(app).get('/api/v1/readyz');
    expect(res.headers['x-request-id']).toBeDefined();
  });
});

describe('Unknown routes', () => {
  it('returns 404 for unknown path', async () => {
    const app = createApp();
    const res = await request(app).get('/api/v1/unknown-route-xyz');
    expect(res.status).toBe(404);
    const body = res.body as ErrorBody;
    expect(body.code).toBe('NOT_FOUND');
  });
});
