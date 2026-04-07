-- ── courier_shifts ───────────────────────────────────────────────────────────
CREATE TABLE courier_shifts (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  courier_id  UUID        NOT NULL REFERENCES couriers (id) ON DELETE CASCADE,
  started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at    TIMESTAMPTZ,
  status      TEXT        NOT NULL DEFAULT 'active'
              CHECK (status IN ('active', 'completed', 'abandoned')),
  CONSTRAINT courier_shifts_end_after_start CHECK (
    ended_at IS NULL OR ended_at > started_at
  )
);

-- Enforce at most one active shift per courier
CREATE UNIQUE INDEX idx_shifts_one_active
  ON courier_shifts (courier_id)
  WHERE status = 'active';

CREATE INDEX idx_shifts_courier ON courier_shifts (courier_id, status);
CREATE INDEX idx_shifts_started ON courier_shifts (started_at DESC);
