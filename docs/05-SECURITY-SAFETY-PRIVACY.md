# 05 — Security, Safety & Privacy (highest-priority document)

## 1. Trust tiers (computed server-side, stored in `/me/trust` response)
| Tier | Requirements | Can do |
|---|---|---|
| T0 Visitor | email OTP verified, 18+ & ToS consent | browse area-level results, upload documents |
| T1 Contactable | T0 + phone verified (see D-04) | send booking requests to rides with audience open to them |
| T2 Verified rider | T1 + identity verified (college email domain match **or** admin-approved college ID **or** govt photo ID + selfie) | book all eligible rides, see exact pickup after acceptance |
| T3 Verified driver | T2 + approved driving licence + approved vehicle RC + insurance valid | post rides |
Badges: `campus_verified`, `id_verified`, `driver_verified`, `women_verified` (admin-set). Tier is recomputed on every verification decision/expiry job; never trusted from client.

## 2. Women-only & gender rules (D-02, L-12)
- `gender` is self-declared and has no privilege. `gender_verified_at` is set only by an admin after viewing ID (per college policy for non-binary/trans members, docs/12 Q3).
- `women_only` ride: creatable only by a driver with `gender_verified_at` female; searchable/bookable only by a verified female passenger. Non-eligible users must not see these rides at all (not even count) — enforce in SQL `WHERE`, not only in UI.
- `femaleDriverOnly` filter: any verified-female passenger may filter by female verified drivers. Option never forces anything.
- Eligibility check lives in one function `canViewRide(user, ride)` + `canBookRide(user, ride)` in `rides/policy.ts`, exhaustively unit-tested (truth table) and used by search, detail, booking, notifications and analytics.
- A woman can cancel any booking with `cancel_kind=uncomfortable`: no penalty, no reason shown to driver, optional private report prompt.

## 3. Authentication & session security
- OTP: 6 digits, CSPRNG, stored as HMAC-SHA256 with server pepper, constant-time compare, 10-min expiry, 5 attempts, single use. Generic responses (no user enumeration). 
- Access JWT 15 min (EdDSA/ES256 with key rotation `kid`), refresh 30 d rotating w/ reuse detection → revoke family and notify user. Logout revokes. Admin roles require re-OTP every 12 h and (R1.1) TOTP.
- Web: access token in memory only; refresh cookie httpOnly. CSRF: SameSite=Lax + `Origin` check + custom header on cookie-authenticated POSTs. Mobile: `expo-secure-store`.
- Suspended users: all tokens rejected immediately (check `users.status` via short-lived cache ≤30 s).

## 4. Application security checklist (OWASP ASVS L2-aligned)
helmet + strict CSP (web), CORS allowlist from env, HSTS, body size limit 100 KB (JSON), Zod on every route (strip unknown keys), parameterised SQL, output encoding (React default; never `dangerouslySetInnerHTML`), user text rendered as plain text, file uploads: type allowlist (jpeg/png/webp/pdf), ≤5 MB, random keys, EXIF stripped, private bucket, admin views via 60-s signed URL, SSRF protection (no user-supplied URLs fetched server-side), IDOR tests on every `:id` route, rate limiting + progressive lockouts, dependency audit in CI (`pnpm audit --prod`, Dependabot), `gitleaks`, SBOM optional, security headers test, no stack traces to clients, secrets from env/secret manager only, least-privilege DB roles (`app_rw` no DDL; `migrator`; `analytics_ro`), audit log append-only.
Threat model highlights to test: OTP brute force/enumeration · refresh token theft · IDOR on bookings/documents · women-only filter bypass via direct ID access · seat race overbooking · fake driver with stolen vehicle docs (mitigation: manual review, name-on-RC match, reg-number uniqueness) · stalking via live location/ride history (mitigation: area-level labels, privacy windows, blocks) · social engineering of admins (audit + 2-person for suspension reversal on safety cases) · scraping of rides (rate limit, tier gating) · malicious uploads · insider misuse (audit + access reviews) · SOS spam/abuse (rate limit, false-alarm flow, repeated abuse review).

## 5. Data protection & privacy (DPDP Act 2023 aligned — human/legal must review)
- Notice & consent at signup (versioned `consents`); separate explicit consent for location and for notifying trusted contacts; withdrawal possible in Settings.
- Data minimisation: no Aadhaar number, no DOB (only 18+ confirmation), no contacts upload, no continuous background location in R1.
- Retention: verification images purged 30 d after decision (D-08); location pings 30 d; SOS events 1 year; audit log 2 years; deleted accounts anonymised within 30 d (retain only aggregate/ledger-safe rows).
- Rights: export (`POST /me/export` → job → emailed link), correction, deletion, grievance contact page with named Grievance Officer (placeholder → human fills).
- Encryption: TLS 1.2+ everywhere; DB & storage encrypted at rest (provider); app-level encryption (AES-256-GCM, key from env `FIELD_ENC_KEY`) for `trusted_contacts.phone` and `doc_last4`.
- Logs: PII redacted; analytics PII-free; k-anonymity ≥5 on dashboard groups.
- Breach runbook (docs/07): detect → contain → assess → notify Board/affected users per law → post-mortem.
- Children: sign-up blocks under-18 confirmation; report path for suspected minors.

## 6. SOS & safety features specification
**Principles**: intentional activation (press-and-hold 2 s or slide-confirm), visually distinct, always available in-ride and from Safety Centre, works with degraded connectivity, never over-promises.
**SOS v1 behaviour**: On trigger → capture last-known location (if permitted) → POST /safety/sos with idempotency → server notifies (a) all on-duty safety admins (push+email, high priority) and (b) user's trusted contacts (push if they have app, email always if provided) with ride details + map link → client screen shows truthful status per channel + large buttons `Call 112`, `Call 1091 (women helpline)`, `Message my contacts` (device SMS composer prefilled using `expo-sms`, works offline-ish) + "I'm safe — cancel alert". Mandatory disclaimer: *"Alerts depend on your device permissions, network and our configured services. This does not replace calling emergency services."*
**Safety admin console**: SOS queue sorted by time, one-click ack, notes, resolution, escalation checklist; unacknowledged SOS > 3 min re-pages (job) and emails all safety admins.
**Share trip**: `POST /rides/:id/share` returns tokenised link (random 256-bit, hashed at rest, 24 h expiry/ride end) showing route, ETA, driver first name, vehicle type + last-4 plate. No passenger PII.
**R1.1**: live location (opt-in, pings every 15–30 s when ride in progress, stops at completion), safe-arrival prompt at ETA+10 min with escalating reminder → offer SOS, route-deviation alert (tolerance default 500 m for 3 consecutive pings; configurable), in-app chat with report-from-chat.
**Reports/blocks**: one-tap from ride, profile or chat; critical categories auto-escalate to safety admin; reported user is not told reporter identity; blocking is instant and mutual-invisible.
**Driver safeguards**: passengers see driver photo, name, rating, vehicle model/colour/last-4 plate, verification badges before confirming; mismatch reporting; drivers can set `women_only`, helmet notice for two-wheelers.
**Operational ownership**: SOS/report handling requires named human owners and on-call schedule (docs/12 Q2) **before** enabling R1 in production. Launch gate in docs/07.

## 7. Abuse & integrity controls
Cancellation reliability score (not public number; shown as "reliable" badge), repeated no-shows/late-cancels → warnings → temporary restrictions. Fake review defence: only completed bookings; rate caps. Suspension workflow with appeal note. Contribution cap prevents commercial use; reports of profit-making → admin review.
