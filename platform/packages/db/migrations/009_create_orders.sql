-- ── orders ───────────────────────────────────────────────────────────────────
-- trip_id FK is added in 011 after trips table is created.
CREATE TABLE orders (
  id                        UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number              TEXT          NOT NULL,
  customer_id               UUID          NOT NULL REFERENCES customers (id),
  merchant_id               UUID          NOT NULL REFERENCES merchants (id),
  merchant_group            merchant_group NOT NULL,  -- denormalised for fast analytics
  courier_id                UUID          REFERENCES couriers (id) ON DELETE SET NULL,
  trip_id                   UUID,         -- FK to trips.id added in 011
  status                    order_status  NOT NULL DEFAULT 'placed',
  -- Address reference (may be null if address later deleted)
  delivery_address_id       UUID          REFERENCES customer_addresses (id) ON DELETE SET NULL,
  -- Snapshot frozen at order time — always authoritative for delivery
  delivery_address_snapshot JSONB         NOT NULL,  -- {street, city, postalCode, lat, lng}
  -- Financials (all in EUR)
  subtotal_eur              NUMERIC(10,2) NOT NULL CHECK (subtotal_eur >= 0),
  delivery_fee_eur          NUMERIC(8,2)  NOT NULL DEFAULT 0,
  service_fee_eur           NUMERIC(8,2)  NOT NULL DEFAULT 0,
  tip_eur                   NUMERIC(8,2)  NOT NULL DEFAULT 0,
  commission_eur            NUMERIC(10,2) NOT NULL DEFAULT 0,
  gross_profit_eur          NUMERIC(10,2) NOT NULL DEFAULT 0,
  -- SLA data: {promisedEtaMin, googleMapsEtaMin, stages:[{key,label,promisedMin,...}]}
  sla                       JSONB         NOT NULL DEFAULT '{}',
  urgency                   TEXT          NOT NULL DEFAULT 'green'
                                          CHECK (urgency IN ('green', 'yellow', 'red')),
  notes                     TEXT,
  cancellation_reason       TEXT,
  estimated_delivery_at     TIMESTAMPTZ,
  actual_delivered_at       TIMESTAMPTZ,
  created_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT orders_number_unique UNIQUE (order_number)
);

-- Hot query paths for ops dashboard, courier app, merchant app
CREATE INDEX idx_orders_status         ON orders (status);
CREATE INDEX idx_orders_status_created ON orders (status, created_at DESC);
CREATE INDEX idx_orders_created        ON orders (created_at DESC);
CREATE INDEX idx_orders_customer       ON orders (customer_id, created_at DESC);
CREATE INDEX idx_orders_merchant       ON orders (merchant_id, created_at DESC);
CREATE INDEX idx_orders_merchant_group ON orders (merchant_group, created_at DESC);
CREATE INDEX idx_orders_courier        ON orders (courier_id)      WHERE courier_id IS NOT NULL;
CREATE INDEX idx_orders_trip           ON orders (trip_id)         WHERE trip_id IS NOT NULL;
-- Active-order fast path (excludes terminal states)
CREATE INDEX idx_orders_active         ON orders (merchant_id, status, created_at DESC)
  WHERE status NOT IN ('delivered', 'cancelled', 'failed');

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
