# AGENTS.md — Operating Rules for the AI Engineer (Antigravity)

You are building **CampusRide** (working name; configurable via `APP_NAME`): a ride-sharing web + mobile platform for a college community and nearby residents, mainly for local trips and intercity trips (ISBT, airport, railway station). Safety of passengers, especially women, is a first-class requirement.

## 0. Source of truth (read in this order, re-read the relevant one before each milestone)
1. `docs/00-INDEX.md` – map of all docs
2. `docs/01-PRD.md` – what & why
3. `docs/12-DECISIONS-AND-OPEN-QUESTIONS.md` – locked decisions + safe defaults
4. `docs/02-ARCHITECTURE.md`, `docs/03-DATA-MODEL.md`, `docs/04-API-CONTRACT.md`
5. `docs/05-SECURITY-SAFETY-PRIVACY.md` – **overrides convenience, always**
6. `docs/10-IMPLEMENTATION-PLAN.md` – milestone order, tasks, Definition of Done
7. `docs/11-TROUBLESHOOTING-PLAYBOOK.md` – read when stuck, BEFORE improvising
If two docs conflict: Security doc > Decisions doc > Data model > API contract > everything else. Log the conflict in `docs/PROGRESS.md` under "Doc conflicts".

## 1. Non-negotiable rules
- TypeScript strict everywhere. No `any` without a `// reason:` comment. No `@ts-ignore`.
- Never hardcode or commit secrets. Only `.env.example` (placeholders) is committed. If a secret is missing, **stop and ask the human** (see §5); never fake a real credential. Use provider "console/mock" adapters for local dev.
- Every external service (maps, SMS, email, push, storage) sits behind an interface in `apps/api/src/integrations/*` with a `console`/`fake` implementation. Tests never call the network.
- All input validated with Zod schemas from `packages/shared`. All SQL parameterised. No string-concatenated SQL.
- Authorisation is enforced server-side in a service layer (policy functions), not only in routes or UI. Every new endpoint needs an entry in the authz matrix test (`docs/08`).
- Money = integer paise. Time = `timestamptz` UTC in DB/API (ISO-8601), shown in `Asia/Kolkata`. IDs = UUID v7.
- Never expose PII (phone, exact home location, document images) except where `docs/05` explicitly allows.
- No payment processing in v1. Cost-sharing is a voluntary contribution; platform never takes a cut. Never write UI copy that calls it a "fare", "earning" or "profit".
- Safety copy must never promise guaranteed emergency response (`docs/05 §SOS`).
- Do not add dependencies lightly: prefer stdlib/existing deps; any new dependency needs a one-line justification in `docs/PROGRESS.md` and must be maintained, MIT/Apache/BSD licensed, and not published in the last 14 days.
- Do not change scope, safety rules, the data model's core entities or the stack without a human gate (§5).

## 2. Work loop (every task)
1. Read the milestone section in `docs/10`. Write/refresh a plan artifact listing tasks with acceptance checks.
2. Implement in small commits (Conventional Commits: `feat(api): ...`).
3. Write tests **with** the code (not after). 
4. Run `pnpm verify` (= lint + typecheck + unit + integration + build). It must be green.
5. Run the milestone's verification steps in `docs/10` (API: curl/httpie scripts; web: browser-agent walkthrough; mobile: typecheck + Expo web/emulator smoke).
6. Update `docs/PROGRESS.md` (done, decisions, deviations, known issues, next). Produce a walkthrough artifact with evidence (test output, screenshots).
7. Only then start the next milestone. Do not skip ahead, do not leave a milestone "mostly done".

## 3. Commands (must exist after M0; keep them working)
`pnpm i` · `pnpm dev` (api+web) · `pnpm dev:mobile` · `pnpm db:up` (docker postgres+postgis) · `pnpm db:migrate` · `pnpm db:seed` · `pnpm test` · `pnpm test:int` · `pnpm test:e2e` · `pnpm lint` · `pnpm typecheck` · `pnpm verify` · `pnpm openapi:gen`

## 4. Code conventions
- Layering in API: `routes → controller (parse/serialise) → service (business rules + policies) → repository (SQL)`. No business logic in controllers or repositories.
- Errors: throw `AppError(code, httpStatus, message, details?)`; respond RFC 7807 `application/problem+json` with `requestId`.
- Logging: `pino` JSON; always include `requestId`, `userId` (if any); redact `authorization`, `phone`, `email`, `otp`, `token`, document keys.
- Migrations: forward-only, backward-compatible (expand → migrate → contract). Never edit an applied migration.
- Files < 300 lines where practical; one concern per module; no circular imports.
- Comments explain *why*. Public service functions have a short doc comment.
- UI: accessible (labels, contrast AA, focus states), responsive 360px→desktop, loading/empty/error state for every data view.

## 5. Human gates — STOP and ask (post a clear question with options + your recommendation)
- Missing credential/API key/account, or anything that costs money.
- Destructive action on a non-local database, force-push, history rewrite.
- Change to scope, safety rules, women-only eligibility logic, verification policy, data retention, or tech stack.
- You have failed the same problem 3 times (see playbook §1, "3-strike rule").
- Legal/policy ambiguity (Motor Vehicles Act, DPDP Act, college policy).
Everything else: decide using the safe default in `docs/12`, record it in PROGRESS.md, continue.

## 6. Definition of Done (global)
Code merged to `main` via PR with green CI; tests added; docs/OpenAPI updated; no TODO without an issue id in PROGRESS.md; logs/metrics added for new flows; authz + validation + rate limit reviewed; accessibility checked for UI work; no secrets in diff (`gitleaks`).
