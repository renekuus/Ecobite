# EcoBite Platform v2 — Architecture Reference

## Overview

This is the production codebase for EcoBite, a food delivery platform operating in Helsinki.
The `/simulation` folder (adjacent to this one) contains the original single-file HTML
prototype which remains frozen as a living spec and reference.

## Repository Layout

```
platform/
├── apps/
│   ├── admin/       Next.js — internal operations dashboard (replaces simulation)
│   ├── courier/     React Native (Expo) — courier mobile app (iOS + Android)
│   └── merchant/    React Native (Expo) — merchant backend app
│
├── packages/
│   ├── api/         Node.js + Fastify REST API — all business logic lives here
│   ├── db/          PostgreSQL schema, migrations (node-postgres / Drizzle ORM)
│   └── shared/      TypeScript types, enums, constants — imported by all packages
│
└── infra/           AWS CDK infrastructure definitions
```

## Key Decisions

### Business logic lives only in `packages/api`
Apps are thin clients. All order state transitions, SLA computation, trip batching,
commission calculation, and payment logic run server-side only.

### `packages/shared` is the source of truth for types
Every status enum, every entity interface, every SLA threshold constant is defined once
in `shared` and imported everywhere. No duplication across apps and API.

### Database stores S3 keys, not URLs
Product images, receipts, KYC documents — the database column holds `s3://bucket/key`.
Public URLs are generated on-demand via signed CloudFront or S3 presigned URLs.

### Courier location state lives in Redis, not PostgreSQL
Live lat/lng is updated every few seconds and has a short TTL. PostgreSQL gets a
periodic snapshot for analytics, not the firehose.

## Infrastructure (AWS)

| Service | Purpose |
|---|---|
| RDS PostgreSQL | Primary database |
| ElastiCache Redis | Live locations, sessions, rate limiting, distributed locks |
| S3 | Product images, documents, exports, KYC photos, DB backups |
| CloudFront | CDN for S3 assets (signed URLs) |
| SQS | Async job queues (payouts, notifications, trip assignment) |
| ALB | Load balancer for API (future multi-instance) |

## Data Flow: Order Lifecycle

```
Customer app → POST /api/v1/orders
  → API validates, creates order (status: PLACED)
  → SQS: notify merchant
  → Merchant confirms (status: CONFIRMED → PREPARING → READY)
  → Batching service assigns courier + creates trip
  → Courier picks up (PICKED_UP) → delivers (DELIVERED)
  → Payment captured, commission calculated, event logged
```

## Relation to Simulation

The simulation at `../simulation/dashboard/index.html` implements:
- The full order lifecycle state machine
- SLA thresholds and color logic (Green/Yellow/Red)
- Trip batching and cost model
- Mix evolution simulation (QSR → Darkstore shift)
- All commission/fee constants

These constants and thresholds are mirrored in `packages/shared/src/constants/`
so the real system uses the same business rules the simulation was designed around.
