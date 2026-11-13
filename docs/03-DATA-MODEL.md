# 03 — Data Model (PostgreSQL 16 + PostGIS)

Conventions: UUID v7 PKs (`id uuid primary key`), `created_at/updated_at timestamptz not null default now()`, soft-delete `deleted_at` only where noted, enums as Postgres enums or CHECK-constrained text, `citext` for email. Extensions: `postgis`, `citext`, `pgcrypto`. Geography columns use SRID 4326 (`geography(Point,4326)`).

## 1. Tables (columns abbreviated: PK/FK/constraints that matter)
**users** — email citext unique not null, email_verified_at, phone_e164 unique null, phone_verified_at, full_name, photo_key, member_type enum(student,staff,community), role enum(member,admin,safety_admin,analyst) default member, status enum(active,suspended,deleted), gender enum(female,male,non_binary,undisclosed) default undisclosed (self-declared), gender_verified_at (admin only), college_verified_at, department, academic_year, adult_confirmed_at, privacy jsonb, locale default 'en', last_active_at, deleted_at.
**consents** — user_id, kind(tos,privacy,location,sos_contact_notice), version, granted_at, revoked_at, ip_hash.
**auth_otp_challenges** — email, code_hmac, expires_at, attempts, consumed_at, ip_hash. Index (email, created_at desc).
**auth_sessions** — user_id, family_id, refresh_hash unique, user_agent, ip_hash, expires_at, revoked_at, replaced_by.
**verification_requests** — user_id, kind(college_id,govt_id,selfie,driving_licence,vehicle_rc,insurance), vehicle_id null, doc_key, doc_last4 null, status(pending,approved,rejected,expired), reviewed_by, reviewed_at, reject_reason, expires_on, purge_after.
**vehicles** — owner_id, type enum(car,bike,scooter,auto,other), make_model, colour, registration_number (normalised upper, unique among non-deleted), passenger_capacity int check (1..6; bike/scooter =1), insurance_valid_until, status(pending,verified,rejected,suspended).
**places** — name, kind(hub,campus,custom), city, location geography(Point), address, google_place_id unique null, is_active. GIST index on location. Hubs seeded.
**rides** — driver_id, vehicle_id, origin_label, origin_location geography(Point), origin_place_id null, dest_label, dest_location geography(Point), dest_place_id null, route_polyline text null, route_geom geography(LineString) null, distance_m, duration_s, departs_at timestamptz, journey_type enum(local,outstation) (derived: distance>40 km or dest.kind=hub outside city → outstation; override allowed), seats_total, seats_available, contribution_paise int ≥0, cost_cap_paise, toll_paise default 0, audience_scope enum(campus_only,campus_and_community), gender_scope enum(any,women_only), driver_female_only bool? (derived from driver gender_verified — don't store), status enum(scheduled,in_progress,completed,cancelled), return_ride_id null, series_id null, notes, helmet_provided bool null, luggage text null, version int default 0, started_at, completed_at, cancelled_at, cancel_reason.
 CHECKs: `seats_available between 0 and seats_total`; `contribution_paise <= cost_cap_paise`; `departs_at > created_at`. Indexes: GIST(origin_location), GIST(dest_location), GIST(route_geom), btree(departs_at) WHERE status='scheduled', btree(driver_id, departs_at desc), btree(status, departs_at).
**ride_stops** — ride_id, seq, label, location, eta_offset_s. unique(ride_id, seq).
**bookings** — ride_id, passenger_id, seats int ≥1, pickup_label, pickup_location, drop_label, drop_location, status enum(requested,accepted,rejected,cancelled_by_passenger,cancelled_by_driver,expired,waitlisted,completed,no_show), contribution_paise (snapshot), decided_at, cancelled_at, cancel_reason, cancel_kind(normal,uncomfortable,emergency), settled_by_passenger_at, settled_by_driver_at, settle_method(cash,upi,other), request_expires_at, idempotency_key. 
 Unique partial: `(ride_id, passenger_id) WHERE status IN ('requested','accepted','waitlisted')`. Index (passenger_id, created_at desc), (ride_id, status).
**reviews** — booking_id, reviewer_id, reviewee_id, rating 1..5, tags text[], comment (≤500), status(visible,hidden,under_review). unique(booking_id, reviewer_id).
**blocks** — blocker_id, blocked_id, unique pair; blocked users never see each other's rides or can request.
**reports** — reporter_id, reported_user_id, ride_id null, booking_id null, category enum(harassment,unsafe_driving,no_show,fake_profile,vehicle_mismatch,other), details, status enum(open,triaged,action_taken,dismissed), assigned_to, resolution_note, severity enum(low,medium,high,critical). **report_events** (append-only timeline).
**trusted_contacts** — user_id, name, phone_e164, relationship, notify_email null, consent_confirmed_at. Max 5 per user.
**trip_shares** — ride_id, user_id, token_hash unique, expires_at, revoked_at, scope(basic,live). Public view URL shows ride route, ETA, vehicle reg last-4 + driver first name only.
**sos_events** — user_id, ride_id null, booking_id null, location geography null, accuracy_m, battery_pct null, status(triggered,acknowledged,resolved,false_alarm), acknowledged_by, notified jsonb (who/what channel/result), created_at. Immutable except status fields (trigger enforced).
**location_pings** (R1.1) — ride_id, user_id, location, recorded_at; partition by month; purge after 30 days.
**notifications** — user_id, kind, title, body, data jsonb, read_at, channel_status jsonb. **push_tokens** — user_id, token unique, platform, last_seen_at. **notification_prefs** — user_id, kind, channel flags.
**app_config** — key pk, value jsonb (cost rates, cap multiplier, emission factor, limits). **feature_flags**. **idempotency_keys** — key, user_id, route, request_hash, response jsonb, expires_at. **audit_log** — actor_id, action, entity, entity_id, before jsonb, after jsonb, ip_hash, request_id, at (append-only: REVOKE UPDATE/DELETE from app role).
**messages** (R1.1) — conversation_id, sender_id, body, created_at. 

## 2. State machines (enforce in service layer with a transition table + tests)
Ride: `scheduled → in_progress → completed`; `scheduled → cancelled`; `in_progress → cancelled` only by safety admin. 
Booking: `requested → accepted | rejected | cancelled_by_passenger | expired`; `accepted → cancelled_by_passenger | cancelled_by_driver | completed | no_show`; `waitlisted → requested | cancelled_by_passenger | expired`. Any other transition → 409 `INVALID_STATE_TRANSITION`.

## 3. Cost-share cap (`packages/shared/cost.ts`, pure + unit-tested)
`base = distance_km × rate_paise_per_km[vehicle_type] + toll_paise`; `cap_per_seat = ceil(base / (seats_total + 1) × cap_multiplier)`. Driver's `contribution_paise ≤ cap_per_seat`. Show "estimated savings" = (solo cost − contribution) per passenger. Never show total driver "earnings".

## 4. Privacy windows
Phone/contact exposure computed at response time: only between booking `accepted` and `departs_at + 24h`, and only if neither side blocked the other. Exact pickup address shown only to accepted counterpart; search results show area-level labels (rounded to ~300 m).

## 5. Analytics schema (db/sql/analytics_views.sql)
Schema `analytics` with views over rides/bookings/users exposing **no PII**: `v_rides_daily`, `v_destinations`, `v_vehicle_mix`, `v_peak_heatmap`, `v_booking_funnel`, `v_savings`. Role `analytics_ro` with SELECT only on this schema. Details in docs/09.

## 6. Seeds
`hubs.json` (placeholders, human supplies coordinates), `app_config` defaults (docs/12 D-07/D-12), demo users per tier/role (dev only, never in prod), synthetic ride generator (docs/09).

## 7. Migration rules
drizzle-kit generates SQL; PostGIS parts hand-written SQL migrations. CI job applies all migrations to an empty DB and to a DB at previous release to prove compatibility. Destructive change = 3 releases (expand/migrate/contract).

## 8. Addenda
- `users`, `rides`, `bookings` also carry `is_synthetic boolean not null default false` (analytics seed only; purge script deletes where true).
- `search_events` (aggregate-only demand log): dest_place_id, date_bucket, hour_bucket, results_count, created_at — no user_id. Feeds `v_demand_gap`.
