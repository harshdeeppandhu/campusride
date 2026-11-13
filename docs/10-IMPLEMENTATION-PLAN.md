# 10 — Implementation Plan (milestones M0–M12)

Rules: sequential; each milestone ends with `pnpm verify` green, PROGRESS.md updated, walkthrough artifact, PR merged. Each task lists **Acceptance** (testable). If a gate item appears, stop and ask (AGENTS.md §5).

## M0 — Foundation & tooling
Tasks: init git + pnpm workspace + layout (docs/02); TS configs, ESLint, Prettier, Husky+lint-staged, commitlint; `apps/api` skeleton (Express 5, pino, helmet, CORS, request-id, error handler, Zod env config, `/healthz`,`/readyz`); `apps/web` Vite skeleton; `apps/mobile` Expo skeleton (Expo Router, TS) resolving `packages/shared`; `packages/shared`, `api-client`, `config`; `infra/docker-compose.yml` (postgis/postgis:16-3.4); GitHub Actions CI; `.env.example`; scripts in AGENTS.md §3; README quick start; gitleaks config; `docs/adr/0001-stack.md`.
Acceptance: fresh clone → `pnpm i && pnpm db:up && pnpm dev` works; `pnpm verify` green; CI green; web/mobile import a shared Zod schema and render a value; `/readyz` checks DB.

## M1 — Database & core domain
Tasks: Drizzle setup; migrations for all tables in docs/03 (extensions, enums, constraints, indexes, immutability triggers on `audit_log`/`sos_events`, DB roles); seeds (hubs placeholders, config, demo users); repository helpers + tx wrapper; state-machine tables; cost calc in shared; transition tests.
Acceptance: empty DB → migrate → seed OK; migration test green; constraints verified by tests (seat check, unique active booking, audit no-update); EXPLAIN on geo queries uses GIST.

## M2 — Auth, sessions, RBAC, consents
Tasks: OTP request/verify (email adapter console+Resend), HMAC OTP, rate limits, JWT/refresh rotation & reuse detection, session mgmt, `requireAuth/requireRole/requireTier` middleware, consents (18+, ToS, privacy), idempotency middleware, audit service, notification service skeleton.
Acceptance: otp-security + session tests green; authz matrix scaffolding auto-enumerates routes; swagger docs generated.

## M3 — Profiles, verification, vehicles, uploads, admin review API
Tasks: `/me*`; R2 storage adapter (+ local fake) with presigned PUT/GET; photo/doc upload rules; verification requests + admin queue/decision/audit; tier engine `computeTier()`; vehicles CRUD with reg-number normalisation/uniqueness; phone verification (SmsProvider interface + console fake; real provider behind gate D-04); gender-verified setter (admin only); retention purge job.
Acceptance: upload tests; tier truth-table; admin decision recalculates tier & notifies; docs images never reachable without admin signed URL.

## M4 — Places, rides, search
Tasks: MapsProvider (Google + fake) autocomplete/resolve/route with caching and breaker; hubs endpoint; `POST /rides/estimate`; ride create/edit/cancel/start/complete with policies (T3, women_only, time window, cap); round trip; stops; search with PostGIS + visibility policy + filters + sorting + cursor; `search_events` logging; job: auto-complete.
Acceptance: women-only + search + state-machine suites green; 50k-ride perf check p95 < 300 ms; hubs-to-hub search returns expected results on fixtures.

## M5 — Bookings, cancellations, reviews, settlement
Tasks: request/accept/reject/cancel with locking & seat accounting; expiry job; privacy-window serialisers; reliability counters; settle; mutual reviews + rating aggregates; block enforcement; public profile.
Acceptance: booking-concurrency, privacy-window, authz matrix (for all endpoints so far) green.

## M6 — Notifications & jobs
Tasks: pg-boss setup, worker entrypoint, in-app notifications, Expo push adapter (+fake), email templates (OTP, request, decision, cancellation, reminder 2h before, review prompt), prefs, dead-letter admin endpoint, reminders scheduling, graceful shutdown.
Acceptance: jobs tests; retry/backoff verified; no notification contains forbidden PII.

## M7 — Web app (traveller)
Tasks: design system + tokens; auth screens; onboarding/trust checklist; home; find ride flow; offer ride wizard; my trips; profile & vehicles & docs; notifications; settings & legal; public landing; error boundaries; a11y pass.
Acceptance: E2E J1,J3,J4,J5,J6 green; Lighthouse targets; keyboard + screen-reader smoke documented.

## M8 — Admin panel
Tasks: `/admin` shell with role guard; verification queue + secure doc viewer; users; reports; rides monitor; config editor; places; audit viewer; dead-letter view.
Acceptance: E2E J2, J8; every admin action appears in audit log; role tests (analyst cannot see docs).

## M9 — Safety Centre
Tasks: trusted contacts (encrypted phone), SOS endpoint + fan-out jobs + re-page job, safety admin console, share-trip link + public page, report/block UI+API completion, uncomfortable-cancel flow, safety copy file, SOS disclaimer UI, emergency numbers.
Acceptance: sos.test green; E2E J7, J9; manual device checklist executed and recorded; SOS UI copy reviewed by human gate.

## M10 — Mobile app
Tasks: auth (secure-store), same flows as web via api-client, push registration, location (just-in-time), image picker/camera for docs, SOS with `tel:`/SMS fallback, deep links, EAS profiles, min-version check, Android preview APK.
Acceptance: typecheck+lint; Android emulator smoke of J1,J3,J4,J7; APK produced (human runs EAS login if needed).

## M11 — DVI analytics
Tasks: analytics views + role; refresh job; endpoints; k-anonymity helper; synthetic seeder; React dashboard; CSV export; optional Streamlit/Power BI docs; data dictionary.
Acceptance: docs/09 §6.

## M12 — Hardening, performance, launch readiness
Tasks: security checklist pass (docs/05 §4) with evidence; ZAP baseline; IDOR suite; k6 load test + fixes; swap rate-limit store; observability wiring (Sentry, metrics, alerts config as code where possible); runbooks; backup + restore drill script; privacy/ToS placeholders; release checklist; final PROGRESS.md; launch-gate checklist from docs/07 with ✅/❌ and owners.
Acceptance: all gates documented; any ❌ lists owner = human with exact instructions.

## R1.1 / R2 backlog (do NOT start until R1 pilot decision)
Live location, safe-arrival, route-deviation, chat, waitlist, recurring rides, corridor matching, rewards, AI assistant, payments, Hindi.

## Estimation note
Rough effort for a competent agent+human review: M0–M2 ≈ 1 week, M3–M6 ≈ 2–3 weeks, M7–M8 ≈ 2 weeks, M9–M10 ≈ 2 weeks, M11–M12 ≈ 1–2 weeks.
