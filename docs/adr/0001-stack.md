# ADR 0001: Technology Stack Selection

## Context
CampusRide is a ride-sharing platform for a college community and nearby residents. It requires a backend API, web application for travellers and college administrators, an Android/iOS mobile application, and a data visualization analytics dashboard. The platform needs strict safety controls (especially for women), trust tier gating, privacy preservation, and low operational overhead for a pilot deployment.

## Options Considered
1. **Next.js Fullstack Monolith**: Single Next.js app for web + API routes.
   - *Pros*: Single framework.
   - *Cons*: Difficult to share types cleanly with Expo mobile without heavy monorepo setups; serverless cold starts on database connections; PostGIS spatial queries awkward in serverless runtime.
2. **Modular Express 5 Monolith + Vite React + Expo Router (Selected)**:
   - *Pros*: Long-lived Node process with stable Postgres connection pool; Express 5 has native async route handlers; PostGIS support via PostgreSQL 16; maximum code sharing via `packages/shared` and `packages/api-client`; Expo provides cross-platform mobile with easy local testing.
   - *Cons*: Requires managing multiple app targets (api, web, mobile).
3. **Microservices (Go / Python / Node)**:
   - *Pros*: Independent deployment.
   - *Cons*: Massive overhead, network latency, distributed transactions for seat booking concurrency, unsuitable for pilot scale.

## Decision
We select Option 2:
- **Language**: TypeScript strict mode across the entire repository.
- **Monorepo**: pnpm workspaces with shared packages (`@campusride/shared`, `@campusride/api-client`, `@campusride/config`).
- **Backend API**: Express 5 on Node 22 LTS, PostgreSQL 16 + PostGIS, Drizzle ORM (+ raw SQL for PostGIS geospatial functions), pg-boss for asynchronous background jobs.
- **Web App**: React 18 + Vite + TanStack Query + Tailwind CSS.
- **Mobile App**: Expo SDK (React Native) with Expo Router, `expo-secure-store`, and `expo-location`.
- **Integrations**: Behind abstract interfaces with console/fake adapters for local development and real providers (R2, Resend, MSG91/Firebase, Google Maps, Expo Push) when credentials are provided.

## Consequences
- **Positive**: Strict typing from database schema to mobile UI; zero payment overhead in R1 (cost-sharing model); single database container for both tabular data and geospatial spatial queries (`ST_DWithin`); deterministic tests without external network dependencies.
- **Negative**: Monorepo tooling requires careful dependency hoisting and Metro configuration for workspace package resolution in Expo.

## Revisit Trigger
- If search p95 latency exceeds 400ms under load, evaluate introducing Redis for caching or read replicas.
- If concurrent active users exceed 5,000, evaluate splitting background workers into a dedicated process service.
