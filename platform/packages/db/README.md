# @ecobit/db — Database

PostgreSQL schema, migrations, and seeds.

## Migration naming

```
migrations/
  001_create_customers.sql
  002_create_addresses.sql
  003_create_merchants.sql
  004_create_merchant_users.sql
  005_create_products.sql
  006_create_product_modifiers.sql
  007_create_couriers.sql
  008_create_courier_shifts.sql
  009_create_orders.sql
  010_create_order_items.sql
  011_create_trips.sql
  012_create_trip_stops.sql
  013_create_order_events.sql
  014_create_trip_events.sql
  015_create_payments.sql
  016_create_payouts.sql
  017_create_reviews.sql
  018_create_zones.sql
  019_create_pricing_rules.sql
  020_create_settings.sql
  021_create_notifications.sql
```

## Seeds

```
seeds/
  dev/         development data — Helsinki merchants, test customers, sample orders
  test/        minimal fixtures for automated tests
```

## Setup

```bash
# Run all migrations
DATABASE_URL=postgresql://... pnpm migrate

# Seed development data
DATABASE_URL=postgresql://... pnpm seed
```
