-- ── trips ────────────────────────────────────────────────────────────────────
CREATE TABLE trips (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  courier_id        UUID        NOT NULL REFERENCES couriers (id),
  status            trip_status NOT NULL DEFAULT 'pending',
  total_km          NUMERIC(8,2),          -- set on completion; NULL while active
  -- Flat rate per trip (from platform.courier_trip_cost_eur setting)
  courier_payout_eur NUMERIC(8,2) NOT NULL DEFAULT 20.00,
  started_at        TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT trips_completed_after_started CHECK (
    completed_at IS NULL OR started_at IS NULL OR completed_at >= started_at
  )
);

-- Add the FK from orders to trips (deferred until trips table exists)
ALTER TABLE orders
  ADD CONSTRAINT orders_trip_id_fk
  FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE SET NULL;

CREATE INDEX idx_trips_courier        ON trips (courier_id, status);
CREATE INDEX idx_trips_status         ON trips (status);
CREATE INDEX idx_trips_courier_active ON trips (courier_id)
  WHERE status IN ('pending', 'active');
CREATE INDEX idx_trips_created        ON trips (created_at DESC);
