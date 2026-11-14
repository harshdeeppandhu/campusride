# PROGRESS (agent-maintained)

## Current milestone: M2 — DONE

## Milestone status
| Milestone | Status | PR/commit | Evidence | Date |
|---|---|---|---|---|
| M0 Foundation & Tooling | DONE | `e1b368e` | `pnpm verify` green (lint, typecheck, 17/17 tests, build). GlassUI tokens & UI implemented. | 2026-11-13 |
| M1 Database & Core Domain | DONE | `423ec2c` | `pnpm verify` green (lint, typecheck, 30/30 unit tests, 8/8 DB integration tests). Migrations applied, seeds loaded, immutability triggers verified. | 2026-11-13 |
| M2 Auth, Sessions, RBAC | DONE | `feat/m2-auth` | `pnpm verify` green (lint 0 warnings, strict typecheck, 71 tests passed: 25 shared + 46 api unit/security tests, full build). OpenAPI 3.1 generated. | 2026-11-14 |
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
- **Zero-Dependency Crypto & Tokens**: Built CSPRNG 6-digit OTP, HMAC-SHA256 peppered hashing, timing-safe constant-time comparison, SHA-256 rotating refresh tokens, and HS256 access JWT signing/verifying directly using native `node:crypto` with zero external dependencies.
- **Session Family Revocation (Token Theft Detection)**: Tracked refresh sessions in `family_id` groupings. If an already-revoked refresh token is presented, the entire family is immediately revoked, protecting users from token replay attacks.
- **User Status Cache**: Enforced immediate rejection of suspended or deleted accounts within ≤30s TTL per `docs/05 §3`.
- **Idempotency Protection**: Built request-body SHA-256 hashed idempotency middleware with automatic 2xx response caching in `idempotency_keys` table.
- **OpenAPI 3.1 Generation**: Built generator script outputting complete schemas and endpoints to `docs/openapi.json` and dynamically served at `/api/v1/openapi.json`.
- **Email Interface**: Created `EmailProvider` interface with `ConsoleEmailAdapter` (in-memory OTP inspection for local dev/testing) and `ResendEmailAdapter`.

## Deviations from plan (and why)
- None.

## Doc conflicts
- None in M2.

## Blockers (attempt log)
- None.

## Known issues / tech debt (with ids)
- `TD-001`: Optional PWA manifest for web app deferred to R1.1.
- `TD-002`: Rate limiter is in-memory for single-instance R1; switch to distributed store before scaling past 1 instance (per docs/07).

## Dependency additions (name, version, reason)
- None in M2 (used native `node:crypto` and existing packages).

## Next 3 actions
1. Receive human review and approval for Milestone 2.
2. Merge `feat/m2-auth` into `main`.
3. Start Milestone 3: Profiles, Verification Queue & Document Uploads (`docs/10 §M3`).
