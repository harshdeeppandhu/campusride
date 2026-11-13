# CampusRide

> College-community ride-sharing platform connecting verified campus members and local residents to safely share travel costs.

---

## Architecture Overview

CampusRide is structured as a TypeScript monorepo using **pnpm workspaces**:

```
campusride/
├── apps/
│   ├── api/            # Express 5 REST API + pg-boss background worker
│   ├── web/            # React + Vite web application (traveller app & admin)
│   └── mobile/         # Expo (React Native) mobile application
├── packages/
│   ├── shared/         # Zod schemas, enums, cost calculation, brand tokens
│   ├── api-client/     # Typed fetch client consumed by web & mobile
│   └── config/         # Shared ESLint, Prettier, and TypeScript presets
├── db/                 # Database migrations, seeds, and analytics views
├── infra/              # Docker Compose (PostGIS 16), Dockerfile, Render spec
└── docs/               # System documentation, PRD, architecture, and runbooks
```

---

## Prerequisites

- **Node.js**: >= 22.0.0 LTS
- **pnpm**: >= 9.0.0 (`corepack enable pnpm`)
- **Docker & Docker Compose**: For local PostgreSQL + PostGIS

---

## Quick Start

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```

### 3. Start Database (PostgreSQL 16 + PostGIS)
```bash
pnpm db:up
```

### 4. Run Development Servers
```bash
# Starts API (port 3001) and Web app (port 5173) concurrently:
pnpm dev

# In a separate terminal, to start mobile:
pnpm dev:mobile
```

### 5. Verify Toolchain & Quality Bar
```bash
pnpm verify
```

---

## Core Commands

| Command | Description |
|---|---|
| `pnpm dev` | Starts API and Web development servers concurrently |
| `pnpm dev:mobile` | Starts Expo Metro bundler for mobile |
| `pnpm db:up` | Starts local PostGIS container |
| `pnpm db:down` | Stops local PostGIS container |
| `pnpm db:migrate` | Runs database migrations |
| `pnpm db:seed` | Seeds database with initial data |
| `pnpm test` | Runs unit tests across all packages |
| `pnpm test:int` | Runs database integration tests |
| `pnpm lint` | Runs ESLint |
| `pnpm typecheck` | Runs TypeScript type checking across all workspaces |
| `pnpm verify` | Runs lint + typecheck + test + build pipeline |

---

## Documentation

- [`AGENTS.md`](./AGENTS.md) — Operating rules and quality bar
- [`docs/01-PRD.md`](./docs/01-PRD.md) — Product requirements document
- [`docs/02-ARCHITECTURE.md`](./docs/02-ARCHITECTURE.md) — System architecture and topology
- [`docs/03-DATA-MODEL.md`](./docs/03-DATA-MODEL.md) — PostgreSQL schema & entity constraints
- [`docs/05-SECURITY-SAFETY-PRIVACY.md`](./docs/05-SECURITY-SAFETY-PRIVACY.md) — Trust tiers, women-only safety, SOS specification
- [`docs/10-IMPLEMENTATION-PLAN.md`](./docs/10-IMPLEMENTATION-PLAN.md) — Milestone roadmap (M0–M12)
- [`docs/PROGRESS.md`](./docs/PROGRESS.md) — Living milestone progress tracking
