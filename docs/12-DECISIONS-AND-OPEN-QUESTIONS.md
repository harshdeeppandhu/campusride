# 12 — Decisions & Open Questions

## A. Locked decisions (do not revisit without a human gate)
| ID | Decision | Why |
|---|---|---|
| L-01 | TypeScript monorepo (pnpm workspaces), Node 22 LTS | One language, shared validation types |
| L-02 | API: Express 5 + Zod + Drizzle ORM (+ raw SQL for PostGIS) on PostgreSQL 16 + PostGIS | Boring/proven; matches proposal |
| L-03 | Web: React + Vite + TanStack Query + Tailwind; Mobile: Expo (React Native) + Expo Router | Matches proposal; max code sharing |
| L-04 | Background jobs: pg-boss (Postgres-backed). No Redis in R1 | Fewer moving parts |
| L-05 | Auth: email OTP → short JWT access + rotating refresh (DB-backed, reuse detection) | No passwords to leak |
| L-06 | Cost-sharing only, no payments in R1 | Avoids PA/PG compliance & commercial-vehicle law |
| L-07 | Maps behind `MapsProvider` interface; Google Maps Platform default | Best India coverage; swappable |
| L-08 | Object storage S3-compatible (Cloudflare R2) with private bucket + presigned URLs | Cheap, standard |
| L-09 | Hosting: API on Render (Docker), DB on Neon (PostGIS), web on Vercel, mobile via Expo EAS | Free/low-cost tiers, zero-downtime deploys |
| L-10 | DVI = aggregated API + React dashboard (Recharts) inside admin; also read-only `analytics` schema for Power BI/Streamlit | Single stack + satisfies course expectation |
| L-11 | 18+ only | Safety/consent law |
| L-12 | Gender-based eligibility is set only by admin after ID review | Prevent spoofing |

## B. Safe defaults (proceed with these; human may override)
| ID | Question | Default |
|---|---|---|
| D-01 | Final name | Keep `CampusRide`, via `APP_NAME` env + `packages/shared/brand.ts` |
| D-02 | Women-only rule | **Option 3 (both)**: ride `gender_scope=women_only` is offered only by verified-female drivers and visible/bookable only by verified-female passengers; female passengers can also filter "female drivers only" on any ride; nothing forces them |
| D-03 | Location sharing defaults | Off by default; user opts in per ride; SOS always allowed |
| D-04 | Phone verification provider | Interface `SmsProvider`; R1 default: Firebase Auth phone or MSG91 (needs DLT in India) chosen by human; fallback: campus-verified users may proceed with unverified phone, community users may not |
| D-05 | Community verification | Government photo ID (not Aadhaar number; masked docs only) + selfie match reviewed by admin; local-resident check optional |
| D-06 | Default ride audience | Student/staff drivers: `campus_only`; community drivers: `campus_and_community`; driver can widen or narrow at posting |
| D-07 | Cost rate config (admin-editable) | car 800 paise/km, bike 250, scooter 200, other 500; toll as entered with proof optional; cap multiplier 1.0 |
| D-08 | Document retention | Delete ID/DL/RC images 30 days after final decision; keep metadata + last-4 digits |
| D-09 | Seats model | `seats_total` = passenger seats (excl. driver); bike/scooter max 1 |
| D-10 | Time zone & currency | Asia/Kolkata display, INR |
| D-11 | Hubs seed | Config file `db/seeds/hubs.json` with placeholders: nearest ISBT, airport, railway station, college gate; human must supply real coordinates |
| D-12 | Emissions factor | Config `EMISSION_KG_PER_KM_CAR=0.17` (placeholder, cite source on dashboard footnote); saving = shared km × factor × (passengers) |
| D-13 | Platforms R1 | Web + Android; iOS build optional |
| D-14 | Pilot staffing of SOS | Safety admin on-call hours defined by college; outside hours SOS still notifies trusted contacts and shows 112/1091 |

## C. Open questions for the human (agent: do not block on these; use defaults)
1. College name, city, official domain(s) for college email verification.
2. Who is the college safety administrator + on-call hours + escalation phone?
3. Trans/non-binary eligibility policy for women-only rides (admin-reviewed per college policy).
4. Is the college comfortable with community (non-student) members? Written approval?
5. Legal review: Motor Vehicles Act position on cost-sharing, two-wheeler pillion rides, insurance coverage for passengers.
6. Privacy policy / ToS text (agent drafts placeholders; human/legal finalises).
7. Which SMS/OTP provider and budget cap for Google Maps.
8. Is Power BI mandatory for the DVI submission?
