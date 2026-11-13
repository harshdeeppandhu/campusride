# 11 — Troubleshooting Playbook (when stuck)

## 1. Universal protocol
1. **Reproduce** with the smallest command; capture exact error + versions.
2. **Read the error fully**; search the codebase before the web; check `git diff` for what changed.
3. **Two hypotheses → cheapest discriminating experiment.** One change at a time; revert failed experiments.
4. **3-strike rule**: after 3 distinct failed approaches, STOP; write the attempt log in PROGRESS.md "Blockers"; ask the human with summary, evidence, 2–3 options, recommendation.
5. Never "fix" by deleting tests, loosening types/validation/authz, disabling lint, or mocking away the problem. Never `--force`/`--legacy-peer-deps` without noting why.
6. If docs conflict or are ambiguous: apply docs/12 default, log it, continue — unless it touches safety/security (then ask).

## 2. Known pitfalls & fixes
| Symptom | Likely cause | Fix |
|---|---|---|
| `type "geography" does not exist` | PostGIS extension missing/not in search_path | `CREATE EXTENSION postgis;` in first migration; use postgis image; check schema |
| Drizzle can't express geography | No native support | Custom column type via `customType` + raw SQL (`ST_SetSRID(ST_MakePoint(lng,lat),4326)::geography`); NOTE lng before lat |
| Distances look wrong | lat/lng swapped or geometry vs geography | Always geography(4326), ST_DWithin in metres |
| Migration drift | edited applied migration | Create new migration; never edit; reset local DB only |
| Seat count goes negative / double-book | missing `FOR UPDATE` / check outside tx | Lock ride row inside tx; DB CHECK; rerun concurrency test |
| Tests pass locally, fail CI | time zone/clock/order/ports | Use UTC, fake timers, random ports, isolate DB per worker (schema or template DB) |
| Expo can't resolve workspace package | Metro monorepo config | Set `watchFolders` to repo root, `resolver.nodeModulesPaths`, disable hierarchical lookup if needed; ensure packages are built or use TS source via `transpilePackages`-like Metro config; clear cache `expo start -c` |
| Duplicate React / "invalid hook call" | multiple react copies in monorepo | pnpm `overrides` to single version; `resolutions` in mobile; check `pnpm why react` |
| CORS/cookie not sent | wrong `SameSite`/domain/credentials | `credentials: 'include'`, exact origin allowlist, HTTPS in prod, different-site web/api → use same parent domain (e.g. app./api.) |
| Google Maps `REQUEST_DENIED`/billing | key restrictions, billing off, API not enabled | Verify enabled APIs (Places, Directions/Routes, Maps JS, Maps SDK Android), key restrictions per platform, quota caps; use fake provider meanwhile; ask human |
| Push not arriving | Expo token invalid/projectId missing/Android channel | Register on physical device, set `projectId`, create Android notification channel, check receipts job |
| OTP email missing | provider sandbox/domain unverified | Use console adapter locally; verify SPF/DKIM for domain (human) |
| pg-boss jobs not running | worker not started/schema missing | Start worker, check `pgboss` schema and `WORKER_INLINE` flag |
| Render cold starts/timeouts | free tier sleep | Document; keep-alive pinger only in pilot; upgrade plan (human gate) |
| Neon connection exhaustion | too many pool conns | Use pooled connection string for app, direct for migrations; pool max ≤ 10 |
| Rate limiter blocks tests | shared IP key | Disable via env in test or use unique keys |
| Uploads 403 | wrong content-type in presign vs PUT, CORS on bucket | Match headers exactly; configure bucket CORS |
| Lint/type errors flood after upgrade | dependency drift | Pin versions; upgrade one at a time |

## 3. Debug aids to build in M0/M2
`LOG_LEVEL` env, request-id propagation, `pnpm db:psql` helper, `/readyz` details (admin only), seed reset (`pnpm db:reset` local only, refuses non-local DB URLs), HAR/trace retention in Playwright on failure.

## 4. Escalation message template
**Goal** · **Where I am** · **What I tried (1,2,3 with results)** · **Evidence (logs/commands)** · **Options A/B/C with trade-offs** · **My recommendation** · **What I need from you**.

## 5. When requirements seem impossible/risky
Offer the smallest safe slice that meets the intent; record trade-off; never silently drop a safety requirement.
