# 01 — Product Requirements Document

## 1. Vision & problem
Students and residents near the college travel to the same places (ISBT, airport, railway station, nearby cities, home towns) at similar times, each paying full cost or relying on unsafe/unreliable options. CampusRide lets verified people **share the cost of a private vehicle trip** safely. Success = more people travelling together, lower per-person cost, zero serious safety incidents.

## 2. Users & roles
| Persona | Member type | Needs |
|---|---|---|
| Student rider/driver | `student` (college-email or ID verified) | Cheap trips to hubs/home, safe with peers |
| Staff/faculty | `staff` (college-email verified) | Same |
| Neighbour/community member | `community` (ID-verified by admin) | Reach ISBT/airport; offer spare seats |
| Women users | any, gender verified | Women-only rides, female-driver preference, stronger safety tools |
| College admin | `admin` | Verify users/vehicles, handle reports, monitor |
| Safety officer | `safety_admin` | Handle SOS/escalations, suspensions |
| Analyst | `analyst` | Read-only aggregated dashboard |
A user can be both driver and passenger (modes, not separate accounts).

## 3. Scope change vs. source proposal (authoritative)
The proposal originally restricted use to students with college verification; this was struck out. **Access is now: campus members + community members**, with a **trust-tier system** (docs/05) replacing the single "college verified" gate. Campus-only visibility remains an option per ride.

## 4. Release plan
**R1 – MVP pilot (P0)**: email-OTP login; phone capture/verification; profile; trust tiers; ID & driver/vehicle verification with admin review; hubs + Places autocomplete; offer ride (one-way, round trip, stops); search/filter (hub, date window, pickup radius, seats, vehicle type, women-only); booking request/approve/reject/cancel; seat concurrency safety; cost-share estimator with cap; ride lifecycle (start/complete); reviews & ratings; block/report; trusted contacts; SOS v1 (notify safety admin + trusted contacts with location snapshot + one-tap call 112/1091); share-trip link; push+email+in-app notifications; admin panel; DVI dashboard v1; web + mobile; observability; deployment.
**R1.1 – Safety+ (P1)**: live location sharing, safe-arrival check, route-deviation alerts, waiting list, recurring rides, favourites/saved routes, in-app chat (1:1 and group for confirmed passengers), corridor route matching.
**R2 – Growth (P2)**: rewards/badges/leaderboards, travel groups & events, AI assistant (suggest rides), in-app payments/UPI deep-link settlement tracking, Hindi/Punjabi localisation, college SSO.

## 5. Functional requirements (R1)
IDs are referenced by tests (`// FR-RIDE-03`).
**Accounts (FR-ACC)**
- 01 Register/login with email + 6-digit OTP (10-min expiry, single use). 02 Confirm 18+ and accept ToS/Privacy (versioned consent). 03 Capture phone (E.164) and verify via provider (fallback in docs/12 D-04). 04 Profile: name, photo, member type, department/year (students), gender (self-declared, optional), emergency/trusted contacts. 05 Account deletion/export requests (DPDP). 06 Session list + revoke.
**Verification (FR-VER)**
- 01 Tier model T0–T3 (docs/05). 02 Upload college ID / govt ID / DL / RC / insurance via presigned URL. 03 Admin review queue with approve/reject + reason; every decision audited. 04 Re-verification when expiry passes. 05 Gender-verified flag set **only** by admin.
**Rides (FR-RIDE)**
- 01 Offer ride: origin, destination, departure time, vehicle, seats, contribution, pickup/drop points, optional stops, notes (luggage, helmet), audience scope, gender scope. 02 Contribution capped (docs/03 §cost). 03 Round trip creates linked return ride. 04 Edit before first booking; after bookings only safe fields; material changes re-request consent. 05 Cancel ride → all bookings cancelled + notified. 06 Only T3 drivers may publish; two-wheelers capacity 1 passenger. 07 Departure must be ≥ 30 min in future at creation and ≤ 60 days. 08 Start/complete ride (driver); auto-complete job 12h after ETA.
**Search (FR-SRCH)**
- 01 Search by destination (hub or place), date, time window, pickup area (radius), seats, vehicle type. 02 Sort by departure time / contribution / distance to pickup. 03 Visibility rules enforced server-side (audience/gender scope, blocks, own rides). 04 Cursor pagination, p95 < 300 ms at 50k rides.
**Booking (FR-BKG)**
- 01 Request with seats (1..n), pickup/drop point. 02 Driver accept/reject within 24h or until departure; auto-expire. 03 Atomic seat accounting, no overbooking under concurrency. 04 Cancel by either party with reason; late-cancel counted in reliability stats. 05 One active booking per passenger per ride. 06 Phone numbers revealed only per docs/05 privacy window. 07 Mark contribution settled (self-reported both sides).
**Reviews (FR-REV)** 1–5 stars + tags + comment after completion, mutual, 14-day window; reported reviews moderated.
**Safety (FR-SAF)** see docs/05: block, report, trusted contacts, SOS v1, share-trip link, women-only enforcement, cancel-if-uncomfortable (no penalty).
**Notifications (FR-NTF)** in-app list, Expo push, email for critical events; user preferences; quiet hours except safety.
**Admin (FR-ADM)** verification queue, user search/suspend/restore, reports & SOS queue, ride monitor, config (cost rates, hubs), audit log viewer, analytics.
**DVI (FR-DVI)** docs/09.

## 6. Non-functional requirements
Availability 99.5% (pilot) · API p95 < 400 ms (reads), < 800 ms (writes) · Mobile cold start < 3 s on mid-range Android · WCAG AA · 2,000 registered users/200 concurrent users headroom without redesign · RPO ≤ 24h (target ≤ 5 min via PITR) · RTO ≤ 4h · Data in India region where provider allows.

## 7. Success metrics (pilot, 8 weeks)
Activation (verified & first search) ≥ 60% · Booking success rate ≥ 70% of requests accepted · Seat fill ≥ 55% · Report rate < 2% of rides, 100% of reports triaged < 24h, SOS handled < 5 min during staffed hours · D30 retention ≥ 30% · Crash-free sessions ≥ 99%.

## 8. Out of scope R1
Payments, commercial fares/profit, live chat, live tracking, AI assistant, rewards, multi-college tenancy, iOS App Store release (Android first; iOS via Expo Go/TestFlight optional).

## 9. Legal/compliance posture (needs human/college review — see docs/12)
Platform facilitates **cost-sharing**, not taxi service. Drivers use private vehicles; contribution is capped near actual cost; no platform commission. DPDP Act 2023 duties apply (notice, consent, purpose limitation, deletion, breach reporting, grievance officer). Bike/scooter pillion rides require helmet; show warning.
