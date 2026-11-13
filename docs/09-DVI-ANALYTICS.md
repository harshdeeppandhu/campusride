# 09 — DVI Analytics Dashboard

## 1. Goal
Turn ride/booking activity into aggregated insights for admins/analysts and for the DVI (data visualisation & insights) submission, **without exposing individuals**.

## 2. Privacy rules (hard)
Aggregates only; minimum group size k=5 (smaller buckets collapse into "Other"/hidden); no names, emails, phones, exact coordinates; destinations at place/hub level; time bucketed to hour/day; analytics endpoints require `analyst|admin`; CSV export applies the same rules; analytics DB role `analytics_ro` sees only `analytics.*` views.

## 3. Metrics → views → charts
| Insight | View | Chart |
|---|---|---|
| Total rides, registered users, verified drivers, active users (30d) | `v_summary` | KPI cards with delta vs prior period |
| Rides over time | `v_rides_daily` | Line (week/month toggle) |
| Rides by vehicle type | `v_vehicle_mix` | Bar (+ donut) |
| Top destinations/hubs | `v_destinations` | Ranked horizontal bar |
| Local vs outstation | `v_journey_split` | Donut / stacked bar over time |
| Peak days × hours | `v_peak_heatmap` | Heatmap (day-of-week × hour) |
| Avg passengers per ride, seat fill rate | `v_occupancy` | KPI + trend |
| Booking funnel: requested→accepted→completed; cancellation & no-show rates | `v_booking_funnel` | Funnel + KPI trend |
| Time-to-accept (median) | `v_response_time` | KPI + histogram |
| Estimated cost saved & CO₂ avoided | `v_savings` | KPI + cumulative area chart (formula + factor footnote) |
| Supply vs demand by destination/time (unmatched searches) | `v_demand_gap` (needs `search_events` aggregate table) | Scatter / bar — highlights where more drivers needed |
| Safety ops: reports by category, SOS count, median ack time | `v_safety_ops` | Bars + KPI (admin only, no identities) |
| Women-only ride share (k-anon) | `v_gender_scope` | KPI |
Filters: date range, journey type, vehicle type, destination, member type (campus/community). Each chart has tooltip, accessible table fallback, export PNG/CSV, "last refreshed" stamp.

## 4. Implementation
Materialised views refreshed by a pg-boss job every 15 min (`REFRESH MATERIALIZED VIEW CONCURRENTLY`); API `/admin/analytics/*` reads them; React dashboard (Recharts) at `/admin/analytics`. Optional: Streamlit app in `analytics/streamlit/` and Power BI connection doc (`docs/dvi-powerbi.md`) using `analytics_ro` credentials (human provides). Savings formula: solo_cost = distance_km × rate[vehicle]; saved = Σ(passengers × (solo_cost − contribution)); CO₂ avoided = shared_km × factor × (passengers) − 0 (driver would travel anyway) — document assumption on dashboard.

## 5. Synthetic data (essential for demo & testing)
`scripts/seed-synthetic.ts` generates 90 days of realistic data: ~800 users, ~150 drivers, 4,000 rides weighted to weekends/evenings/exam breaks/semester start-end, hubs dominating destinations, 70% accept rate, 12% cancellations, mixed vehicles, a few reports. Seedable (`--seed 42`), refuses to run when `NODE_ENV=production`. Tag rows `is_synthetic=true` (column on users/rides) so they can be purged.

## 6. Acceptance
All metrics above render with seeded data; filters work; k-anonymity unit-tested; no PII in any response (automated JSON scan test); dashboard Lighthouse A11y ≥ 95; documented data dictionary in `docs/dvi-data-dictionary.md`.
