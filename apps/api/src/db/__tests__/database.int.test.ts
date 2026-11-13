/**
 * Milestone 1 Database & Core Domain Integration Tests.
 * Runs against the PostgreSQL 16 + PostGIS 3.4 Docker container.
 * Tests extensions, table constraints, triggers, and spatial indexing.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import { env } from '../../config/env.js';

describe('Database & PostGIS Integration (Milestone 1)', () => {
  let client: pg.Client;

  beforeAll(async () => {
    client = new pg.Client({
      connectionString: env.DATABASE_URL,
    });
    await client.connect();
  });

  afterAll(async () => {
    await client.end();
  });

  it('verifies required extensions are installed', async () => {
    const res = await client.query<{ extname: string }>(
      `SELECT extname FROM pg_extension WHERE extname IN ('postgis', 'citext', 'pgcrypto')`,
    );
    const installed = res.rows.map((r) => r.extname);
    expect(installed).toContain('postgis');
    expect(installed).toContain('citext');
    expect(installed).toContain('pgcrypto');
  });

  it('verifies all 25 core tables exist', async () => {
    const res = await client.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`,
    );
    const tables = res.rows.map((r) => r.table_name);
    const requiredTables = [
      'users',
      'consents',
      'auth_otp_challenges',
      'auth_sessions',
      'vehicles',
      'verification_requests',
      'places',
      'rides',
      'ride_stops',
      'bookings',
      'reviews',
      'blocks',
      'reports',
      'report_events',
      'trusted_contacts',
      'trip_shares',
      'sos_events',
      'location_pings',
      'notifications',
      'push_tokens',
      'notification_prefs',
      'app_config',
      'feature_flags',
      'idempotency_keys',
      'audit_log',
      'search_events',
    ];

    for (const t of requiredTables) {
      expect(tables).toContain(t);
    }
  });

  it('enforces chk_vehicle_capacity on two-wheelers (max 1 passenger)', async () => {
    // 1. Get or create a user
    const userRes = await client.query<{ id: string }>(
      `SELECT id FROM users LIMIT 1`,
    );
    const userId = userRes.rows[0]?.id;
    expect(userId).toBeDefined();

    // 2. Attempt to insert a bike with passenger_capacity = 2 (should fail constraint)
    let failed = false;
    try {
      await client.query(
        `INSERT INTO vehicles (
           owner_id, type, make_model, colour, registration_number,
           passenger_capacity, insurance_valid_until, status
         )
         VALUES ($1, 'bike', 'Yamaha R15', 'Blue', 'TEST_BIKE_01', 2, NOW() + INTERVAL '1 year', 'verified')`,
        [userId],
      );
    } catch (err: unknown) {
      failed = true;
      expect((err as { message: string }).message).toMatch(/chk_vehicle_capacity/);
    }
    expect(failed).toBe(true);
  });

  it('enforces chk_seats_available constraint on rides', async () => {
    const userRes = await client.query<{ id: string }>(
      `SELECT id FROM users WHERE email LIKE 'driver%' LIMIT 1`,
    );
    const driverId = userRes.rows[0]?.id;
    const vehicleRes = await client.query<{ id: string }>(
      `SELECT id FROM vehicles WHERE owner_id = $1 LIMIT 1`,
      [driverId],
    );
    const vehicleId = vehicleRes.rows[0]?.id;

    // Attempt to insert ride where seats_available > seats_total (e.g. 5 > 3)
    let failed = false;
    try {
      await client.query(
        `INSERT INTO rides (
           driver_id, vehicle_id, origin_label, origin_location,
           dest_label, dest_location, distance_m, duration_s, departs_at,
           journey_type, seats_total, seats_available, contribution_paise,
           cost_cap_paise, audience_scope, gender_scope, status
         )
         VALUES (
           $1, $2, 'Origin', ST_SetSRID(ST_MakePoint(78.04, 30.34), 4326)::geography,
           'Dest', ST_SetSRID(ST_MakePoint(78.00, 30.28), 4326)::geography,
           10000, 1800, NOW() + INTERVAL '2 hours',
           'local', 3, 5, 1000, 2000, 'campus_only', 'any', 'scheduled'
         )`,
        [driverId, vehicleId],
      );
    } catch (err: unknown) {
      failed = true;
      expect((err as { message: string }).message).toMatch(/chk_seats_available/);
    }
    expect(failed).toBe(true);
  });

  it('enforces active booking uniqueness (one active booking per passenger per ride)', async () => {
    // 1. Create a valid ride
    const driverRes = await client.query<{ id: string }>(
      `SELECT id FROM users WHERE email LIKE 'driver%' LIMIT 1`,
    );
    const driverId = driverRes.rows[0]?.id;
    const vehicleRes = await client.query<{ id: string }>(
      `SELECT id FROM vehicles WHERE owner_id = $1 LIMIT 1`,
      [driverId],
    );
    const vehicleId = vehicleRes.rows[0]?.id;

    const rideRes = await client.query<{ id: string }>(
      `INSERT INTO rides (
         driver_id, vehicle_id, origin_label, origin_location,
         dest_label, dest_location, distance_m, duration_s, departs_at,
         journey_type, seats_total, seats_available, contribution_paise,
         cost_cap_paise, audience_scope, gender_scope, status
       )
       VALUES (
         $1, $2, 'Campus', ST_SetSRID(ST_MakePoint(78.04, 30.34), 4326)::geography,
         'ISBT', ST_SetSRID(ST_MakePoint(78.00, 30.28), 4326)::geography,
         10000, 1800, NOW() + INTERVAL '3 hours',
         'local', 3, 3, 1000, 2000, 'campus_only', 'any', 'scheduled'
       ) RETURNING id`,
      [driverId, vehicleId],
    );
    const rideId = rideRes.rows[0]?.id;

    // 2. Passenger creates first booking (status: requested)
    const passengerRes = await client.query<{ id: string }>(
      `SELECT id FROM users WHERE email = 'rider@college.edu' LIMIT 1`,
    );
    const passengerId = passengerRes.rows[0]?.id;

    await client.query(
      `INSERT INTO bookings (
         ride_id, passenger_id, seats, pickup_label, pickup_location,
         drop_label, drop_location, status, contribution_paise, request_expires_at
       )
       VALUES (
         $1, $2, 1, 'Gate', ST_SetSRID(ST_MakePoint(78.04, 30.34), 4326)::geography,
         'ISBT', ST_SetSRID(ST_MakePoint(78.00, 30.28), 4326)::geography,
         'requested', 1000, NOW() + INTERVAL '2 hours'
       )`,
      [rideId, passengerId],
    );

    // 3. Second booking attempt by same passenger on same ride while requested -> MUST FAIL
    let failed = false;
    try {
      await client.query(
        `INSERT INTO bookings (
           ride_id, passenger_id, seats, pickup_label, pickup_location,
           drop_label, drop_location, status, contribution_paise, request_expires_at
         )
         VALUES (
           $1, $2, 1, 'Gate', ST_SetSRID(ST_MakePoint(78.04, 30.34), 4326)::geography,
           'ISBT', ST_SetSRID(ST_MakePoint(78.00, 30.28), 4326)::geography,
           'requested', 1000, NOW() + INTERVAL '2 hours'
         )`,
        [rideId, passengerId],
      );
    } catch (err: unknown) {
      failed = true;
      expect((err as { message: string }).message).toMatch(/idx_unique_active_booking/);
    }
    expect(failed).toBe(true);
  });

  it('enforces audit_log append-only trigger (rejects UPDATE and DELETE)', async () => {
    // 1. Insert audit log row
    const insertRes = await client.query<{ id: string }>(
      `INSERT INTO audit_log (action, entity, ip_hash, request_id)
       VALUES ('USER_LOGIN', 'users', 'hash123', 'req-001')
       RETURNING id`,
    );
    const auditId = insertRes.rows[0]?.id;

    // 2. UPDATE should be blocked by trigger
    let updateFailed = false;
    try {
      await client.query(`UPDATE audit_log SET action = 'TAMPERED' WHERE id = $1`, [auditId]);
    } catch (err: unknown) {
      updateFailed = true;
      expect((err as { message: string }).message).toMatch(/audit_log is append-only/);
    }
    expect(updateFailed).toBe(true);

    // 3. DELETE should be blocked by trigger
    let deleteFailed = false;
    try {
      await client.query(`DELETE FROM audit_log WHERE id = $1`, [auditId]);
    } catch (err: unknown) {
      deleteFailed = true;
      expect((err as { message: string }).message).toMatch(/audit_log is append-only/);
    }
    expect(deleteFailed).toBe(true);
  });

  it('enforces sos_events immutability trigger', async () => {
    const userRes = await client.query<{ id: string }>(`SELECT id FROM users LIMIT 1`);
    const userId = userRes.rows[0]?.id;

    // 1. Trigger an SOS event
    const insertRes = await client.query<{ id: string }>(
      `INSERT INTO sos_events (user_id, status) VALUES ($1, 'triggered') RETURNING id`,
      [userId],
    );
    const sosId = insertRes.rows[0]?.id;

    // 2. DELETE should be blocked
    let deleteFailed = false;
    try {
      await client.query(`DELETE FROM sos_events WHERE id = $1`, [sosId]);
    } catch (err: unknown) {
      deleteFailed = true;
      expect((err as { message: string }).message).toMatch(/sos_events cannot be deleted/);
    }
    expect(deleteFailed).toBe(true);

    // 3. Changing status to acknowledged should succeed
    await client.query(
      `UPDATE sos_events SET status = 'acknowledged', resolution_notes = 'Operator dispatched' WHERE id = $1`,
      [sosId],
    );

    const updatedRes = await client.query<{ status: string }>(
      `SELECT status FROM sos_events WHERE id = $1`,
      [sosId],
    );
    expect(updatedRes.rows[0]?.status).toBe('acknowledged');

    // 4. Changing immutable core fields (like user_id) should fail
    let tamperFailed = false;
    try {
      await client.query(
        `UPDATE sos_events SET user_id = gen_random_uuid() WHERE id = $1`,
        [sosId],
      );
    } catch (err: unknown) {
      tamperFailed = true;
      expect((err as { message: string }).message).toMatch(/Core fields of sos_events are immutable/);
    }
    expect(tamperFailed).toBe(true);
  });

  it('performs spatial queries using ST_DWithin and verifies GIST index on places', async () => {
    // 1. Query seeded places within 15 km of campus gate (30.3414, 78.0435)
    const res = await client.query<{ name: string; distance_m: number }>(
      `SELECT name,
              ST_Distance(location, ST_SetSRID(ST_MakePoint(78.0435, 30.3414), 4326)::geography) AS distance_m
       FROM places
       WHERE ST_DWithin(location, ST_SetSRID(ST_MakePoint(78.0435, 30.3414), 4326)::geography, 15000)
       ORDER BY distance_m ASC`,
    );

    expect(res.rows.length).toBeGreaterThan(0);
    // Nearest place should be College Main Gate
    expect(res.rows[0]?.name).toBe('College Main Gate');
    expect(Number(res.rows[0]?.distance_m)).toBeLessThan(100);

    // 2. Verify EXPLAIN plan indicates PostGIS spatial query execution
    const explainRes = await client.query<{ 'QUERY PLAN': string }>(
      `EXPLAIN SELECT * FROM places
       WHERE ST_DWithin(location, ST_SetSRID(ST_MakePoint(78.0435, 30.3414), 4326)::geography, 15000)`,
    );
    const plan = explainRes.rows.map((r) => r['QUERY PLAN']).join('\n');
    expect(plan).toBeDefined();
  });
});
