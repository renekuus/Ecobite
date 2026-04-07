-- ─────────────────────────────────────────────────────────────────────────────
-- BOOTSTRAP: extensions, shared enum types, updated_at trigger
-- Placed in 001 so all subsequent migrations can reference these types.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- trigram indexes for name/email search

-- Reusable trigger function: keeps updated_at current on every UPDATE
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── Shared enum types (used across multiple tables) ──────────────────────────
-- Matches TypeScript enums in packages/shared/src/enums/ exactly.
-- To add a value: ALTER TYPE <type> ADD VALUE 'new_val'; (non-breaking in PG)

CREATE TYPE merchant_group AS ENUM ('qsr', 'restaurant', 'darkstore', 'other');
CREATE TYPE vehicle_type   AS ENUM ('bike', 'cargo_bike', 'scooter', 'walk');
CREATE TYPE order_status   AS ENUM (
  'placed', 'confirmed', 'preparing', 'ready',
  'assigned', 'picked_up', 'delivering', 'delivered',
  'cancelled', 'failed'
);
CREATE TYPE trip_status    AS ENUM ('pending', 'active', 'completed', 'cancelled');
CREATE TYPE courier_status AS ENUM ('active', 'on_shift', 'inactive', 'suspended');
CREATE TYPE stop_type      AS ENUM ('pickup', 'dropoff');
CREATE TYPE actor_type     AS ENUM ('customer', 'courier', 'merchant', 'system');
CREATE TYPE payment_status AS ENUM ('pending', 'succeeded', 'failed', 'refunded');
CREATE TYPE payout_status  AS ENUM ('pending', 'processing', 'paid', 'failed');
CREATE TYPE payout_recipient_type       AS ENUM ('courier', 'merchant');
CREATE TYPE notification_channel        AS ENUM ('push', 'sms', 'email');
CREATE TYPE notification_recipient_type AS ENUM ('customer', 'courier', 'merchant_user');
CREATE TYPE zone_type      AS ENUM ('delivery_zone', 'pricing_zone', 'surge_zone');

-- ── customers ────────────────────────────────────────────────────────────────
CREATE TABLE customers (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email              TEXT        NOT NULL,
  phone              TEXT        NOT NULL,
  name               TEXT        NOT NULL,
  status             TEXT        NOT NULL DEFAULT 'active'
                                 CHECK (status IN ('active', 'suspended', 'deleted')),
  stripe_customer_id TEXT,
  locale             TEXT        NOT NULL DEFAULT 'fi-FI',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT customers_email_unique         UNIQUE (email),
  CONSTRAINT customers_stripe_id_unique     UNIQUE (stripe_customer_id)
);

CREATE INDEX idx_customers_email   ON customers (email);
CREATE INDEX idx_customers_status  ON customers (status);
CREATE INDEX idx_customers_created ON customers (created_at DESC);
-- Trigram index for name search (ops dashboard customer lookup)
CREATE INDEX idx_customers_name_trgm ON customers USING GIN (name gin_trgm_ops);

CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
