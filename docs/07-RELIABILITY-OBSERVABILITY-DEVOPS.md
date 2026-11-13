# 07 — Reliability, Observability & DevOps

## 1. Git & CI/CD
- Trunk-based, short-lived branches `feat/*`, PRs into `main`, squash merge, Conventional Commits, branch protection (CI green, 1 review/self-review checklist for solo).
- GitHub Actions `ci.yml` (on PR/push): install (pnpm cache) → lint → typecheck → unit tests → integration tests (service container `postgis/postgis:16-3.4`) → migration test (empty DB + upgrade from previous tag) → build api/web → mobile typecheck + `expo-doctor` → `pnpm audit --prod` → gitleaks → upload coverage. `e2e.yml`: Playwright against ephemeral stack on `main` + nightly.
- CD: merge to `main` → build Docker image → deploy staging automatically → smoke tests (`/readyz`, login-less checks) → manual approval → production. Web via Vercel git integration. Mobile: EAS build on tag `mobile-v*`; OTA updates only for JS-safe changes.
- Rollback: Render redeploy previous image (≤5 min); DB migrations are backward-compatible so code rollback is safe. Document in runbook.

## 2. Zero-downtime deployment
Render rolling deploy with `/readyz` health check and graceful shutdown (SIGTERM: stop accepting, drain in-flight ≤25 s, close pool, stop pg-boss). Expand→migrate→contract. Run migrations as a pre-deploy step with advisory lock. Feature flags for risky features.

## 3. Backup & DR
Neon PITR enabled (retention per plan) + weekly logical `pg_dump` to R2 (encrypted, 30-day lifecycle) via scheduled GitHub Action. **Restore drill** before launch and quarterly: restore to scratch DB, run smoke tests, record time in `docs/runbooks/restore-drill.md`. Objects bucket versioning on. Secrets documented in a password manager (human).

## 4. Observability
- Logs: pino JSON to stdout → Render log streams (+ Better Stack/Logtail free tier optional). Fields: `ts, level, msg, requestId, userId, route, status, durationMs`. 
- Errors: Sentry (api, web, mobile) with release tags + source maps; scrub PII.
- Metrics (`prom-client`, `/metrics` protected): http latency histogram, request count by route/status, DB pool usage, job queue depth/failures/age, OTP sent/failed, booking funnel counters, SOS triggered/ack latency, upstream call latency/errors per provider.
- Uptime: external pinger on `/readyz` (UptimeRobot/Better Stack) every 1 min.
- Tracing optional (OpenTelemetry) – R2.
- **Alerts (actionable only)**: API 5xx rate >2% for 5 min · p95 latency >1.5 s for 10 min · `/readyz` failing 2 min · job queue oldest age >10 min · dead-letter >0 · **SOS unacknowledged >3 min (page)** · email/SMS provider failure >20% · DB connections >80% · disk/storage quota >80% · backup job failed.
- Dashboards: API health, jobs, safety ops, product funnel.

## 4b. SLOs
Availability 99.5% monthly; booking-create success (non-4xx) 99.5%; SOS notify success within 30 s 99%. Error budget review monthly.

## 5. Runbooks (create in `docs/runbooks/`, each: symptoms, diagnosis, fix, escalation)
`api-down.md`, `db-slow.md`, `queue-stuck.md`, `email-provider-down.md`, `maps-quota-exceeded.md`, `sos-not-delivering.md`, `suspected-breach.md`, `restore-drill.md`, `rotate-secrets.md`, `release-and-rollback.md`.

## 6. Pre-launch (production) gate checklist — all must be ✅
Security checklist (docs/05 §4) · authz matrix tests green · load test passed (docs/08) · backup+restore drill done · alerts firing test done (synthetic) · safety admin + on-call named & trained · SOS end-to-end test with real devices · privacy policy/ToS/grievance officer published · consent flows verified · Maps/SMS budgets capped · rate limit store ready for multi-instance · Sentry live · runbooks written · pilot cohort & rollback plan agreed · app store/APK distribution plan · college written approval.

## 7. Cost guardrails
Budget alarms on Google Cloud (cap + quota limits per API), SMS daily cap, email daily cap, R2/Neon free-tier monitoring; admin config for kill switches (`maps_enabled`, `sms_enabled`).
