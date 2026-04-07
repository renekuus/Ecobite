-- ── trip_stops ───────────────────────────────────────────────────────────────
CREATE TABLE trip_stops (
  id                        UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id                   UUID         NOT NULL REFERENCES trips (id) ON DELETE CASCADE,
  order_id                  UUID         REFERENCES orders (id) ON DELETE SET NULL,
  merchant_id               UUID         REFERENCES merchants (id) ON DELETE SET NULL,
  stop_type                 stop_type    NOT NULL,
  sequence_number           SMALLINT     NOT NULL CHECK (sequence_number > 0),
  -- Address snapshot frozen at trip creation
  address_snapshot          JSONB        NOT NULL,  -- {street, city, lat, lng}
  distance_from_previous_km NUMERIC(8,2),           -- NULL for first stop
  arrived_at                TIMESTAMPTZ,
  completed_at              TIMESTAMPTZ,
  CONSTRAINT trip_stops_unique_sequence UNIQUE (trip_id, sequence_number),
  CONSTRAINT trip_stops_completed_after_arrived CHECK (
    completed_at IS NULL OR arrived_at IS NULL OR completed_at >= arrived_at
  )
);

-- Hot paths: fetch all stops for a trip in order; look up by order
CREATE INDEX idx_trip_stops_trip    ON trip_stops (trip_id, sequence_number);
CREATE INDEX idx_trip_stops_order   ON trip_stops (order_id) WHERE order_id IS NOT NULL;
CREATE INDEX idx_trip_stops_pending ON trip_stops (trip_id)
  WHERE completed_at IS NULL;
