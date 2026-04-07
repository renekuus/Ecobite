# @ecobit/db — Database

PostgreSQL (≥14) schema, migrations, and seeds for the EcoBite platform.

## Prerequisites

- PostgreSQL 14+ with the following extensions (loaded in migrations):
  - `pgcrypto` — `gen_random_uuid()`
  - `pg_trgm` — trigram indexes for name/email search
  - `postgis` — geographic zone polygons (loaded in 018)

## Migration order and MVP scope

Run migrations in numeric order. FKs across tables require this:
`orders` references `trips` via a deferred FK added in 011.

| # | Table | MVP? | Notes |
|---|-------|------|-------|
| 001 | customers | ✅ | Extensions + all shared enum types defined here |
| 002 | customer_addresses | ✅ | |
| 003 | merchants | ✅ | |
| 004 | merchant_users | ✅ | |
| 005 | products | ✅ | |
| 006 | product_modifiers | ✅ | |
| 007 | couriers | ✅ | |
| 008 | courier_shifts | ✅ | Partial index prevents two concurrent active shifts |
| 009 | orders | ✅ | Central entity; 9 indexes on hot query paths |
| 010 | order_items | ✅ | |
| 011 | trips | ✅ | Also adds deferred FK orders→trips |
| 012 | trip_stops | ✅ | |
| 013 | order_events | ✅ | Immutable audit log |
| 014 | trip_events | ✅ | Immutable audit log |
| 015 | payments | ✅ | |
| 016 | payouts | later | Weekly batch job; courier + merchant payouts |
| 017 | reviews | later | Post-MVP feature |
| 018 | zones | later | PostGIS — delivery / surge zones |
| 019 | pricing_rules | later | Dynamic fee and surge rules |
| 020 | settings | ✅ | Seeds core platform constants (SLA thresholds, trip cost, etc.) |
| 021 | notifications | ✅ | Push / SMS / email dispatch log |

## Key design decisions

**UUID primary keys everywhere** via `gen_random_uuid()` — no sequential integer leakage.

**JSONB used only for snapshots and flexible config:**
- `orders.delivery_address_snapshot` — frozen at order time; source of truth for delivery
- `orders.sla` — SLA stage data per order
- `order_items.modifier_snapshot` — product modifiers frozen at order time
- `trip_stops.address_snapshot` — frozen at trip creation
- `merchants.operating_hours` — weekly schedule (sparse, rarely queried)
- `settings.value` — platform config values
- `notifications.payload` — provider-specific payloads

**Enum types** defined once in 001; match TypeScript enums in `packages/shared` exactly.
To add a value: `ALTER TYPE <type> ADD VALUE 'new_val';` — non-breaking in PostgreSQL.

**Partial indexes** for common filtered queries:
- `idx_orders_active` — orders in non-terminal states (dashboard live view)
- `idx_shifts_one_active` — enforces at most one active shift per courier
- `idx_trips_courier_active` — fast active trip lookup per courier
- `idx_notifications_failed` — retry queue for failed notifications
- `idx_products_menu_active` — active non-archived products per merchant

**Deferred FK**: `orders.trip_id → trips.id` cannot be defined in 009 (trips doesn't exist yet). Added as an `ALTER TABLE` at the end of 011.

**Polymorphic payouts**: `payouts.recipient_id` references either `couriers.id` or `merchants.id` based on `recipient_type`. No DB-level FK — enforced in application layer.

## Seeds

```
seeds/
  dev/         Helsinki merchants, test customers, sample orders for local development
  test/        Minimal deterministic fixtures for automated tests
```

## Setup

```bash
# Run all migrations
DATABASE_URL=postgresql://user:pass@localhost:5432/ecobit_dev pnpm migrate

# MVP only (skip 016–019)
# Run migrations 001–015, 020–021 manually or set up a filtered migrate script

# Seed development data
DATABASE_URL=postgresql://... pnpm seed
```
