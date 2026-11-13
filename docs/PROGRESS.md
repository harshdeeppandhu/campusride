# PROGRESS (agent-maintained)

## Current milestone: M1 — DONE

## Milestone status
| Milestone | Status | PR/commit | Evidence | Date |
|---|---|---|---|---|
| M0 Foundation & Tooling | DONE | `e1b368e` | `pnpm verify` green (lint, typecheck, 17/17 tests, build). GlassUI tokens & UI implemented. | 2026-11-13 |
| M1 Database & Core Domain | DONE | `423ec2c` | `pnpm verify` green (lint, typecheck, 30/30 unit tests, 8/8 DB integration tests). Migrations applied, seeds loaded, immutability triggers verified. | 2026-11-13 |
| M2 Auth, Sessions, RBAC | NOT STARTED | — | — | — |
| M3 Profiles & Verification | NOT STARTED | — | — | — |
| M4 Places, Rides, Search | NOT STARTED | — | — | — |
| M5 Bookings & Reviews | NOT STARTED | — | — | — |
| M6 Notifications & Jobs | NOT STARTED | — | — | — |
| M7 Web App (Traveller) | NOT STARTED | — | — | — |
| M8 Admin Panel | NOT STARTED | — | — | — |
| M9 Safety Centre | NOT STARTED | — | — | — |
| M10 Mobile App | NOT STARTED | — | — | — |
| M11 DVI Analytics | NOT STARTED | — | — | — |
| M12 Launch Readiness | NOT STARTED | — | — | — |

## Decisions made (beyond docs/12)
- **GlassUI Design System**: Incorporated modern glassmorphism aesthetic into `packages/shared/src/tokens.ts`, `apps/web/tailwind.config.js`, `apps/web/src/index.css`, and `apps/mobile/app/index.tsx`.
- **Drizzle PostGIS Custom Types**: Implemented `geographyPoint` and `geographyLineString` mapping between PostGIS SRID 4326 EWKT and typed TypeScript coordinates `{ lat, lng }`.
- **Migration Engine**: Built transactional SQL migration runner (`apps/api/scripts/migrate.ts`) tracking applied versions in `schema_migrations` table.
- **Append-Only Triggers**: Enforced at the database engine level via PL/pgSQL triggers: `audit_log` rejects updates/deletes; `sos_events` rejects deletion and modification of immutable core fields.

## Deviations from plan (and why)
- None.

## Doc conflicts
- None in M1.

## Blockers (attempt log)
- None.

## Known issues / tech debt (with ids)
- `TD-001`: Optional PWA manifest for web app deferred to R1.1.
- `TD-002`: Rate limiter is in-memory for single-instance R1; switch to distributed store before scaling past 1 instance (per docs/07).

## Dependency additions (name, version, reason)
- None in M1 (used existing `pg`, `drizzle-orm`, `vitest`).

## Next 3 actions
1. Receive human review and approval for Milestone 1.
2. Prepare M2 Implementation Plan & Task List (Auth, Sessions, RBAC, Consents, OTP email adapter, JWT rotation, session invalidation).
3. Execute M2 tasks on feature branch `feat/m2-auth`.
