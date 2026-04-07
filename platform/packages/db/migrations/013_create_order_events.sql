-- ── order_events ─────────────────────────────────────────────────────────────
-- Immutable audit log — rows are never updated or deleted.
CREATE TABLE order_events (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID         NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  actor_type  actor_type   NOT NULL,
  -- UUID of the acting customer/courier/merchant_user; NULL for system actions
  actor_id    TEXT,
  from_status order_status,              -- NULL for the initial PLACED event
  to_status   order_status NOT NULL,
  -- Flexible payload: cancellation_reason, delay_reason, override notes, etc.
  metadata    JSONB        NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_events_order   ON order_events (order_id, created_at DESC);
CREATE INDEX idx_order_events_created ON order_events (created_at DESC);
-- Support querying all events by a specific actor (e.g. courier audit)
CREATE INDEX idx_order_events_actor   ON order_events (actor_type, actor_id)
  WHERE actor_id IS NOT NULL;
