# EcoBite Platform v2

Production codebase. Monorepo managed with pnpm workspaces + Turborepo.

## Layout

```
apps/
  admin/      Ops dashboard (Next.js)
  courier/    Courier mobile app (React Native / Expo)
  merchant/   Merchant backend app (React Native / Expo)

packages/
  api/        REST API — Fastify + Node.js + TypeScript
  db/         PostgreSQL schema, migrations, seeds
  shared/     Shared types, enums, constants

infra/        AWS CDK infrastructure definitions
```

## Quick start (once dependencies are installed)

```bash
# Install all workspace dependencies
pnpm install

# Run API + admin dashboard in development
pnpm dev

# Type-check everything
pnpm typecheck
```

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for full design decisions, data flow,
infrastructure overview, and the relationship to the simulation prototype.

## Simulation reference

The original single-file prototype lives at `../simulation/dashboard/index.html`.
It is frozen and must never be modified by platform development work.
It documents the full business logic, SLA model, and UI design that this platform implements.
