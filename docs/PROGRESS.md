# PROGRESS (agent-maintained)

## Current milestone: M4 — DONE

## Milestone status
| Milestone | Status | PR/commit | Evidence | Date |
|---|---|---|---|---|
| M0 Foundation & Tooling | DONE | `e1b368e` | `pnpm verify` green (lint, typecheck, 17/17 tests, build). GlassUI tokens & UI implemented. | 2026-11-13 |
| M1 Database & Core Domain | DONE | `423ec2c` | `pnpm verify` green (lint, typecheck, 30/30 unit tests, 8/8 DB integration tests). Migrations applied, seeds loaded, immutability triggers verified. | 2026-11-13 |
| M2 Auth, Sessions, RBAC | DONE | `75c2986` | `pnpm verify` green (lint 0 warnings, strict typecheck, 71 tests passed: 25 shared + 46 api unit/security tests, full build). OpenAPI 3.1 generated. | 2026-11-14 |
| M3 Profiles & Verification | DONE | `f26ebe1` | `pnpm verify` green (lint 0 warnings, strict typecheck, 106 tests passed: 25 shared + 81 api tests, full build). Storage R2+Console adapter, SMS adapter, AES-256-GCM encryption, admin queue & 60s doc viewer, vehicles CRUD, retention purge job. | 2026-11-14 |
| M4 Places, Rides, Search | DONE | `feat/m4-rides` | `pnpm verify` green (lint 0 warnings, strict typecheck, 128 tests passed: 25 shared + 103 api tests, full build). Maps provider, route cost caps, women-only publishing & search safety filters, proximity search, demand telemetry. | 2026-11-14 |
| M5 Bookings & Reviews | NOT STARTED | — | — | — |
| M6 Notifications & Jobs | NOT STARTED | — | — | — |
| M7 Web App (Traveller) | NOT STARTED | — | — | — |
| M8 Admin Panel | NOT STARTED | — | — | — |
| M9 Safety Centre | NOT STARTED | — | — | — |
| M10 Mobile App | NOT STARTED | — | — | — |
| M11 DVI Analytics | NOT STARTED | — | — | — |
| M12 Launch Readiness | NOT STARTED | — | — | — |

## Decisions made (beyond docs/12)
- **Zero-Dependency Field Encryption**: Implemented AES-256-GCM field encryption (`apps/api/src/lib/crypto.ts`) using native `node:crypto` with random 96-bit IVs and 128-bit authentication tags, keyed from `FIELD_ENC_KEY`, for `doc_last4` and `trusted_contacts.phone`.
- **Database Schema Expansion (Migration 0002)**: Added `0002_expand_doc_last4.sql` expanding `verification_requests.doc_last4` to `VARCHAR(128)` to hold AES-256-GCM ciphertexts and dropping NOT NULL constraint on `doc_key` to allow retention purge (`doc_key = null`) after 30 days per D-08.
- **Console & R2 Storage Adapters**: Implemented `StorageProvider` with `ConsoleStorageAdapter` (in-memory tracking for test/local dev) and `R2StorageAdapter` for Cloudflare R2 bucket integration. Presigned uploads expire in 300s; admin document viewer presigned GET URLs strictly expire in 60s per docs/05 §4.
- **SmsProvider Interface & Console Adapter**: Added `SmsProvider` interface with `ConsoleSmsAdapter` (storing last OTP in memory for test inspections) and dynamic factory `getSmsProvider()`.
- **Vehicle Registration Normalization**: Enforced alphanumeric uppercase normalization (`/[^A-Za-z0-9]/g`) and unique active constraint (`idx_vehicles_reg_active`), plus passenger capacity restrictions (strictly 1 passenger for bikes/scooters; max 6 for cars).
- **Admin Verification & Gender Verification**:
  - `GET /api/v1/admin/verification/:id/doc-url`: produces short-lived 60-second presigned URL and audits view action to `audit_log`.
  - `POST /api/v1/admin/verification/:id/decision`: records admin decision; approving updates user/vehicle and recalculates trust tier; rejects require reasons.
  - `POST /api/v1/admin/users/:id/set-gender-verified`: restricted to `admin` role; unlocks `women_verified` badge only when self-declared gender is `female`.
- **Retention Purge Job**: Added `purgeExpiredDocuments` (`apps/api/src/jobs/purge-docs.ts`) to delete stored images and clear `doc_key` in database 30 days after review decision.

- **Maps Provider Architecture**: Implemented `MapsProvider` interface with `ConsoleMapsAdapter` (deterministic local test/dev routing with Haversine distance, realistic speeds, polyline generation and seeded North Indian hubs) and `GoogleMapsAdapter` (live Places/Routes API with circuit breaker and automated fallback).
- **Statutory Cost-Share Cap & Pricing**: Strictly enforces `computeCostCap` from `@campusride/shared` on `POST /rides`, preventing any ride creation exceeding the statutory paise cap per seat.
- **Idempotency Protection**: Enforced `idempotency({ required: true })` middleware with `Idempotency-Key` header on `POST /rides`.
- **Women-Only Safety & Eligibility Controls (docs/05 §2)**:
  - Driver eligibility: Only admin-verified female drivers (`gender === 'female' && genderVerifiedAt !== null`) can publish `genderScope: 'women_only'`, returning 403 `ELIGIBILITY_FAILED` otherwise.
  - Search filtering: Women-only rides are strictly filtered out unless the caller is an authenticated, admin-verified female driver/passenger.
- **Privacy Masking & Demand Telemetry (docs/05 §3, docs/03 §search_events)**:
  - T0 and anonymous callers receive area-level labels only, no exact pickup/drop coordinates, and no driver photo or full name.
  - Telemetry: Aggregated hourly search demand logged to `search_events` (`destPlaceId`, `dateBucket`, `hourBucket`, `resultsCount`) with **zero** `user_id` or personal identifying information.
- **Lifecycle Auto-Completion**: Scheduled background job (`autoCompleteExpiredRides`) auto-completes rides that are 12 hours past ETA (`departsAt + durationS + 12h <= now`).

## Deviations from plan (and why)
- None.

## Doc conflicts
- In `0000_init_schema.sql`, `doc_last4` was `VARCHAR(4)` and `doc_key` was `NOT NULL`. Resolved cleanly via forward-only migration `0002_expand_doc_last4.sql` to support AES-256-GCM ciphertexts and 30-day retention doc purge without editing applied migrations.

## Blockers (attempt log)
- None.

## Known issues / tech debt (with ids)
- `TD-001`: Optional PWA manifest for web app deferred to R1.1.
- `TD-002`: Rate limiter is in-memory for single-instance R1; switch to distributed store before scaling past 1 instance (per docs/07).

## Dependency additions (name, version, reason)
- None in M4 (utilized existing `@campusride/shared` schemas and standard dependencies).

## Next 3 actions
1. Start local development servers (`pnpm dev`) and provide user with runnable links (`http://localhost:5173` and `http://localhost:3001`) with testing instructions.
2. Receive human review and gate approval before starting Milestone 5 (Bookings & Reviews).
3. Start Milestone 5: Bookings & Reviews (`docs/10 §M5`).
