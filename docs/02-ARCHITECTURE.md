# 02 — Architecture

## 1. Principles
Modular monolith first (one deployable API, clear module boundaries) — not microservices. Stateless API. Postgres is the system of record. Everything external behind an interface. Design for 10× pilot load, not 1000×. Secure and observable from day one.

## 2. Repo layout (pnpm workspace)
```
campusride/
├─ apps/
│  ├─ api/            Express API + workers (same codebase, 2 entrypoints: server.ts, worker.ts)
│  │  └─ src/{config,db,modules/*,integrations/*,middleware,jobs,lib,server.ts,worker.ts}
│  ├─ web/            React + Vite (traveller app + /admin routes)
│  └─ mobile/         Expo app (Expo Router)
├─ packages/
│  ├─ shared/         Zod schemas, enums, constants, cost calc, brand, error codes
│  ├─ api-client/     Typed fetch client generated from shared schemas (used by web+mobile)
│  └─ config/         tsconfig, eslint, prettier presets
├─ db/{migrations,seeds,sql/analytics_views.sql}
├─ infra/{docker-compose.yml,Dockerfile.api,render.yaml}
├─ scripts/           seed-synthetic.ts, backup.sh, restore-drill.md
├─ docs/  AGENTS.md  .agent/  .github/workflows/
```
API modules (`apps/api/src/modules/`): `auth, users, verification, vehicles, places, rides, search, bookings, reviews, safety (contacts, sos, shares, reports, blocks), notifications, admin, analytics, config, audit`. Each module: `routes.ts, controller.ts, service.ts, policy.ts, repo.ts, schemas.ts, *.test.ts`.

## 3. Runtime topology
```
 Web (Vercel) ─┐                      ┌─ Postgres+PostGIS (Neon)
 Mobile (Expo) ─┼─HTTPS─► API (Render, N instances, stateless) ─┤
 Admin (Web)  ─┘            │  └─ Worker (pg-boss) ────────────┘
                            ├─ R2 (docs, photos; presigned)  ├─ Maps provider
                            ├─ Email (Resend/Brevo)          ├─ Expo Push
                            └─ SMS/OTP provider              └─ Sentry / logs / metrics
```
Worker may run as a second Render service or in-process in R1 (flag `WORKER_INLINE=true`).

## 4. Key flows
**Login**: POST /auth/otp/request → store hashed OTP (HMAC, 10 min, 5 attempts) → email job → POST /auth/otp/verify → create/lookup user → issue access JWT (15 min) + refresh (30 d, rotating, family-tracked; reuse → revoke family).
**Verification**: client asks presigned PUT → uploads direct to R2 → POST /verification/requests → admin queue → decision → tier recompute → notification.
**Book a seat**: POST /rides/:id/bookings (Idempotency-Key) → service opens tx → `SELECT … FROM rides WHERE id=$1 FOR UPDATE` → policy checks (tier, visibility, blocks, not own ride, seats, ride future) → insert booking `requested` (seats NOT yet decremented) → notify driver. On accept: tx locks ride, verifies `seats_available >= seats`, decrements, sets `accepted`. Rejection/expiry/cancel of accepted booking restores seats. Waitlist (R1.1) promotes in FIFO.
**Search**: PostGIS `ST_DWithin` on origin/destination geography + time window + filters → ranked; R1.1 adds corridor match using `ST_LineLocatePoint` on `route_geom`.
**SOS**: POST /safety/sos → insert `sos_events` (immutable) → enqueue high-priority jobs (notify safety admins via push+email, trusted contacts via push/email + device-side SMS prompt) → return acknowledgement with what was/wasn't sent. Client also offers `tel:112`/`tel:1091`.

## 5. Scalability & performance
- Stateless API; sessions are JWT+DB refresh; no local disk/state. Horizontal scale via Render instances behind LB.
- Indexes per docs/03; EXPLAIN-verified for search. Keyset (cursor) pagination.
- Caching: HTTP `Cache-Control` for hubs/config (5 min) + ETag; in-process LRU for config; CDN for web assets. Redis introduced only if rate-limit sharing or caching metrics demand it (ADR trigger: p95 search > 400 ms or >2 API instances).
- Rate limits: in-memory store in R1 single instance; **swap to Postgres/Redis store before running >1 instance** (checklist in docs/07).
- Async: emails, push, document cleanup, expiry sweeps, auto-complete, analytics refresh, retention deletes → pg-boss with retries (exponential backoff, max 5) and dead-letter queue visible in admin.
- Maps cost control: debounce autocomplete (300 ms), session tokens, cache geocodes/routes in DB by hash, server-side route computation only at ride creation.

## 6. Reliability patterns
Timeouts on every outbound call (default 5 s); retries w/ jitter only for idempotent calls; circuit breaker (opossum or simple in-house) around maps/SMS/email; graceful degradation: no maps → manual address entry + straight-line distance; no push → in-app + email.
Idempotency-Key table for POST creating rides/bookings/SOS. Optimistic concurrency (`version` int) on rides for edits.

## 7. ADR template (store in docs/adr/NNNN-title.md when making a stack-level choice)
Context · Options · Decision · Consequences · Revisit trigger.

## 8. Environments
`local` (docker compose), `staging` (Render preview + Neon branch), `production`. Config only via env validated by Zod at boot (fail fast). `.env.example` lists every var with comments. Feature flags: simple `feature_flags` table read via config service (e.g., `chat_enabled`, `live_tracking_enabled`).
