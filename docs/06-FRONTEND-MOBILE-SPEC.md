# 06 — Frontend (Web) & Mobile Spec

## 1. Shared principles
- One design language, tokens in `packages/shared/tokens.ts` (colour, spacing, radius, type scale). Mobile-first, thumb-reachable primary actions. Light + dark. WCAG AA contrast, min touch target 44 px, visible focus, screen-reader labels, no colour-only meaning.
- Data: TanStack Query (server state) with `packages/api-client`; minimal local state (Zustand). Forms: react-hook-form + shared Zod schemas. Every view has loading skeleton, empty, error+retry, and offline banner states.
- Trust UI: always show verification badges, rating, vehicle model/colour/last-4 plate before a passenger sends a request. Cost copy: "Contribution" / "Share of fuel & toll", never "fare/price/earn".
- i18n-ready: all strings via `t()` (react-i18next / i18n-js); English only in R1; Hindi R2.
- Safety copy and SOS strings live in one file `packages/shared/safety-copy.ts` (legal-reviewed, never inline).
- Analytics events (product usage) are anonymous, minimal, and consent-aware; no PII.

## 2. Screen inventory (R1)
**Onboarding/Auth**: Welcome → Email → OTP → Consent (18+, ToS, Privacy) → Profile basics → Phone verify → "Complete your trust profile" checklist (progress to T2/T3).
**Home**: two big actions "Find a ride" / "Offer a ride"; upcoming trips; quick hubs chips (ISBT, Airport, Railway, Campus); safety shortcut.
**Find a ride**: search form (From default = campus/current, To hub or place, date, time window, seats, filters sheet: vehicle type, women-only, female driver, journey type, sort) → results list (+ map toggle) → ride detail (driver card, route map, stops, seats, contribution + savings, rules, safety badges) → request sheet (pickup/drop selection, seats, message) → booking status screen.
**Offer a ride**: requires T3 else shows the exact missing steps → wizard: route (autocomplete + map pin) → time → vehicle & seats → contribution (live cap indicator + estimate) → audience/gender scope → review & publish. Round-trip toggle.
**My trips**: tabs Upcoming / Past / Requests. Driver view: manage requests (accept/reject with passenger card), start ride, complete, cancel. Passenger view: status, contact (when allowed), cancel (including "I feel uncomfortable"), settle contribution, review.
**Profile**: public profile, edit, vehicles, verification documents/status, trusted contacts, privacy, notification prefs, sessions, export/delete account, help/grievance.
**Safety Centre**: SOS (distinct red, hold-to-activate), trusted contacts, share my trip, women-only preferences explainer, report/block list, emergency numbers, safety tips.
**Notifications** list. **Settings/Legal** pages (ToS, Privacy, grievance officer).
**Admin (web only, /admin)**: Dashboard (KPIs + DVI), Verification queue (doc viewer with watermark, approve/reject with reason templates, checklist), Users, Reports, SOS console, Rides monitor, Places/Hubs, Config, Audit log, Dead-letter jobs.

## 3. Web specifics
React Router, route guards by tier/role with friendly "what you need next" screens (guards are UX only; server enforces). Code-split admin and analytics. Lighthouse targets: Perf ≥ 85, A11y ≥ 95, SEO ≥ 90 for public pages (landing, safety, how-it-works, ToS, privacy). Public landing page with clear explanation of verification & safety. PWA manifest (installable) optional.
Maps on web: Google Maps JS via official loader; lazy-loaded only on screens needing it; autocomplete with session tokens.

## 4. Mobile specifics
Expo SDK (latest stable), Expo Router, TypeScript. Libraries: `expo-secure-store`, `expo-notifications`, `expo-location` (foreground only in R1; request just-in-time with rationale), `expo-image-picker`/`expo-camera` (docs & selfie), `expo-sms`, `expo-linking` (tel:), `react-native-maps` (Google provider). EAS Build profiles: `development`, `preview` (APK for pilot sharing), `production`. Deep links `campusride://ride/:id`; universal links for web share. Handle: push permission denial, location denial, airplane mode (queue SOS locally then retry + keep SMS/tel fallback), token refresh races (single-flight refresh), app update prompt (min supported version from `/config/client`).
Monorepo caveat: configure Metro `watchFolders`/`resolver` for workspace packages (see playbook).

## 5. Design deliverables the agent must produce before building screens
A one-page design system (tokens, components list), low-fi wireframe descriptions per screen (in `docs/design/wireframes.md`), component inventory (Button, Input, Select, Sheet, Card, RideCard, DriverBadge, TrustBadge, StatusPill, Stepper, EmptyState, ErrorState, Toast, MapPreview), and a11y checklist.
