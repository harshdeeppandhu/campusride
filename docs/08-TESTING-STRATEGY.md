# 08 — Testing Strategy

## 1. Pyramid & tooling
Unit (Vitest) — pure logic: cost cap, policies (`canViewRide`/`canBookRide` truth tables), state machines, tier calc, OTP. Integration (Vitest + Supertest + real PostGIS in Docker) — every endpoint, real DB, fake integrations. Contract — responses validated against shared Zod/OpenAPI. E2E (Playwright) — critical journeys. Mobile — Jest (jest-expo) for logic/components + manual/Maestro smoke on Android emulator. Load (k6). Security (ZAP baseline against staging, custom IDOR suite).

## 2. Mandatory suites (names → files `apps/api/test/*`)
1. **authz-matrix.test.ts** — table of every route × role/tier × ownership; auto-fails if a route is missing from the matrix (enumerate Express router stack).
2. **booking-concurrency.test.ts** — 50 parallel accept/requests on 3 seats → exactly ≤3 seats consumed, no negative, no duplicates; also cancel/accept races; idempotency replays.
3. **women-only.test.ts** — exhaustive visibility/booking truth table incl. direct-ID access, search, notifications, analytics leakage.
4. **otp-security.test.ts** — brute force lock, expiry, reuse, enumeration-safe responses, rate limits.
5. **session.test.ts** — refresh rotation, reuse detection, suspended user rejected.
6. **state-machine.test.ts** — all illegal transitions → 409.
7. **privacy-window.test.ts** — phone/exact pickup exposure rules.
8. **search.test.ts** — geo radius, time window, filters, pagination stability, EXPLAIN uses GIST (assert plan on 50k seeded rides).
9. **sos.test.ts** — notification fan-out, partial failures reported honestly, rate limit, false-alarm, immutability trigger.
10. **uploads.test.ts** — type/size limits, signed URL expiry, admin-only access.
11. **jobs.test.ts** — expiry sweeps, auto-complete, retention purge, retries/dead-letter.
12. **migrations.test.ts** — empty→latest, previous→latest.

## 3. E2E journeys (Playwright, run by the browser agent too)
J1 signup→consent→profile→trust checklist. J2 admin approves driver docs. J3 driver posts ride to ISBT. J4 passenger searches, requests; driver accepts; seats update; contact revealed. J5 cancel flows (normal/uncomfortable). J6 complete + mutual review. J7 SOS trigger + admin ack. J8 report + block hides rides. J9 women-only visibility across two users. J10 analytics dashboard renders with seed data & filters.

## 4. Quality gates
Coverage ≥ 80% lines on `modules/*/service|policy` and `packages/shared`; ≥ 70% overall API. Zero high/critical `audit` findings. Lighthouse thresholds (docs/06). Load test (k6): 200 virtual users, search + detail + booking mix 10 min → p95 < 400 ms reads, error < 1%, no DB pool exhaustion. Flaky test = fix or quarantine with issue id within 48 h.

## 5. Test data
Factories (`test/factories.ts`) for users per tier/role/gender, vehicles, rides, bookings. Deterministic seeds with fixed RNG. Never use prod data.

## 6. Manual QA checklist (before each release) in `docs/qa/release-checklist.md`: real-device push, SOS on device offline/online, location permission denied path, low-end Android perf, slow 3G, screen reader pass, time-zone/DST sanity, two-phone live booking.
