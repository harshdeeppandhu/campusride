# 04 — API Contract

## 1. Conventions
- Base `/api/v1`. JSON. Auth: `Authorization: Bearer <access JWT>`; web refresh via httpOnly cookie `rt` (Secure, SameSite=Lax, Path=/api/v1/auth).
- Request/response schemas live in `packages/shared/src/schemas/*` (Zod) → OpenAPI generated at `/api/v1/openapi.json` + Swagger UI (non-prod or admin only). Contract tests compare live responses to schemas.
- Errors: `application/problem+json` `{type,title,status,code,detail,requestId,errors?[{path,message}]}`. Codes (stable strings): `VALIDATION_ERROR, UNAUTHENTICATED, FORBIDDEN, NOT_FOUND, CONFLICT, INVALID_STATE_TRANSITION, TIER_REQUIRED, RATE_LIMITED, SEATS_UNAVAILABLE, RIDE_NOT_BOOKABLE, BLOCKED, ELIGIBILITY_FAILED, IDEMPOTENCY_MISMATCH, UPSTREAM_UNAVAILABLE, INTERNAL`.
- Pagination: `?limit=20&cursor=…` → `{items, nextCursor}`. Max limit 50.
- `Idempotency-Key` header required on: create ride, create booking, SOS, report.
- Every response carries `X-Request-Id`. Client may send one.
- Versioning: additive changes only within v1; breaking → `/v2`. Deprecations announced via `Deprecation` header.
- Rate limits (R1 defaults): OTP request 5/h/email + 10/h/IP; OTP verify 5 attempts/challenge; auth refresh 30/h/IP; search 60/min/user; writes 30/min/user; SOS 10/min/user; global 300/min/IP.

## 2. Endpoint catalogue (R1 unless marked)
**Auth** `POST /auth/otp/request` · `POST /auth/otp/verify` · `POST /auth/refresh` · `POST /auth/logout` · `GET /auth/sessions` · `DELETE /auth/sessions/:id`
**Me** `GET /me` · `PATCH /me` · `POST /me/phone/request-otp` · `POST /me/phone/verify` · `POST /me/consents` · `POST /me/photo/upload-url` · `POST /me/export` · `DELETE /me` (deletion request) · `GET/PATCH /me/privacy` · `GET /me/trust` (tier + missing steps)
**Verification** `POST /verification/upload-url` · `POST /verification/requests` · `GET /verification/requests/mine`
**Vehicles** `GET/POST /vehicles` · `PATCH/DELETE /vehicles/:id`
**Places** `GET /places/hubs` · `GET /places/autocomplete?q&sessionToken` · `GET /places/:placeId/resolve`
**Rides** `POST /rides` · `GET /rides/:id` · `PATCH /rides/:id` · `POST /rides/:id/cancel` · `POST /rides/:id/start` · `POST /rides/:id/complete` · `GET /rides/mine?role=driver|passenger&status=` · `GET /rides/:id/cost-estimate` · `POST /rides/estimate` (pre-post estimate)
**Search** `GET /search/rides?destPlaceId|destLat,destLng&originLat,originLng&radiusM&date&timeFrom&timeTo&seats&vehicleType&womenOnly&femaleDriverOnly&journeyType&sort&cursor`
**Bookings** `POST /rides/:id/bookings` · `GET /bookings/mine` · `GET /bookings/:id` · `POST /bookings/:id/accept|reject|cancel` · `POST /bookings/:id/settle` · `GET /rides/:id/bookings` (driver)
**Reviews** `POST /bookings/:id/reviews` · `GET /users/:id/reviews` · `GET /users/:id/public-profile` (name, photo, tier badges, rating, ride count, member since)
**Safety** `GET/POST/PATCH/DELETE /safety/contacts` · `POST /safety/sos` · `POST /safety/sos/:id/cancel` (false alarm) · `POST /rides/:id/share` · `DELETE /shares/:id` · `GET /public/trips/:token` (no auth, rate-limited, minimal data) · `POST /safety/reports` · `POST /safety/blocks` · `DELETE /safety/blocks/:userId` · `GET /safety/blocks`
**Notifications** `GET /notifications` · `POST /notifications/:id/read` · `POST /notifications/read-all` · `POST /push-tokens` · `DELETE /push-tokens/:token` · `GET/PATCH /notification-prefs`
**Admin** (role-gated, all audited): `GET /admin/verification-queue` · `GET /admin/verification/:id/doc-url` (60-s signed GET) · `POST /admin/verification/:id/decision` · `GET /admin/users` · `GET /admin/users/:id` · `POST /admin/users/:id/suspend|restore|set-gender-verified` · `GET /admin/reports` · `PATCH /admin/reports/:id` · `GET /admin/sos` · `POST /admin/sos/:id/ack|resolve` · `GET /admin/rides` · `GET/PUT /admin/config` · `GET/POST/PATCH /admin/places` · `GET /admin/audit` · `GET /admin/jobs/dead-letter`
**Analytics** `GET /admin/analytics/{summary,rides-over-time,vehicle-mix,destinations,journey-split,heatmap,funnel,savings}?from&to&journeyType&vehicleType&destinationId` · `GET /admin/analytics/export.csv`
**Ops** `GET /healthz` (liveness) · `GET /readyz` (DB + migrations ok) · `GET /metrics` (internal token)
**R1.1** `POST /rides/:id/location` · `GET /rides/:id/live` · `/chat/*` · `/rides/:id/waitlist` · `/saved-routes` · `/ride-series`

## 3. Representative contracts
`POST /rides` body: `{vehicleId, origin:{label,lat,lng,placeId?}, destination:{…}, departsAt, seatsTotal, contributionPaise, tollPaise?, audienceScope, genderScope, stops?:[{label,lat,lng}], returnTrip?:{departsAt}, notes?, helmetProvided?}` → 201 ride with `costCapPaise`, `journeyType`. Fails: `TIER_REQUIRED` (not T3), `ELIGIBILITY_FAILED` (women_only but driver not verified female), `VALIDATION_ERROR`.
`POST /rides/:id/bookings` `{seats, pickup:{…}, drop:{…}, message?}` → 201 booking `requested`. Fails: `SEATS_UNAVAILABLE`, `BLOCKED`, `ELIGIBILITY_FAILED`, `RIDE_NOT_BOOKABLE`, `TIER_REQUIRED`.
`POST /safety/sos` `{rideId?, location?:{lat,lng,accuracyM}, note?}` → 202 `{sosId, delivered:{safetyAdmins:n, trustedContacts:n, failed:[…]}, advice:"Call 112 now if in danger"}` — response must truthfully list failures.
Search result item: `{rideId, driver:{id,firstName,photo,rating,ridesCount,badges}, origin:{areaLabel}, destination:{areaLabel}, departsAt, seatsAvailable, contributionPaise, vehicle:{type,makeModel}, journeyType, womenOnly, distanceToPickupM, match:"exact|nearby"}`.

## 4. Authorisation matrix (source for authz tests)
Anonymous: healthz, otp/request, otp/verify, public/trips/:token. T0 (logged in, unverified): read hubs, own profile, upload docs, browse search (area-level, no driver contact). T1: request bookings only if ride audience allows. T2: full passenger. T3: post rides. Admin routes: `admin`; SOS/reports sensitive: `safety_admin` (+admin read). Analytics: `analyst|admin`. Resource ownership: users may act only on own rides/bookings/contacts.
