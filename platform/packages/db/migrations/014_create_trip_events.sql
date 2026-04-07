-- ── trip_events ──────────────────────────────────────────────────────────────
-- Immutable audit log for trip lifecycle transitions.
CREATE TABLE trip_events (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id     UUID        NOT NULL REFERENCES trips (id) ON DELETE CASCADE,
  courier_id  UUID        REFERENCES couriers (id) ON DELETE SET NULL,
  from_status trip_status,
  to_status   trip_status NOT NULL,
  metadata    JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trip_events_trip    ON trip_events (trip_id, created_at DESC);
CREATE INDEX idx_trip_events_courier ON trip_events (courier_id) WHERE courier_id IS NOT NULL;
