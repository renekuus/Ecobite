-- ── settings ─────────────────────────────────────────────────────────────────
-- Key-value platform config. Values are JSONB (numbers, strings, arrays, objects).
CREATE TABLE settings (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT        NOT NULL,
  value       JSONB       NOT NULL,
  description TEXT        NOT NULL DEFAULT '',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by  TEXT,       -- identifier of ops user or 'system'
  CONSTRAINT settings_key_unique UNIQUE (key)
);

CREATE INDEX idx_settings_key ON settings (key);

CREATE TRIGGER trg_settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Seed core platform constants (mirrors packages/shared/src/constants/)
-- These match the simulation values exactly; marked provisional where applicable.
INSERT INTO settings (key, value, description) VALUES
  ('platform.courier_trip_cost_eur',
   '20.00',
   'Flat courier payout per completed trip (EUR). Provisional — may become distance-based.'),
  ('platform.max_orders_per_trip',
   '4',
   'Maximum orders batched into a single trip.'),
  ('platform.avg_trip_size',
   '2.27',
   'Historical average orders per trip. Provisional — recalculate from real data.'),
  ('platform.batch_window_qsr_ms',
   '60000',
   'QSR batching hold window in ms. Provisional — real value ~15–20 min.'),
  ('platform.batch_window_other_ms',
   '90000',
   'Non-QSR batching hold window in ms. Provisional — real value ~20–30 min.'),
  ('platform.sla_yellow_threshold_min',
   '3',
   'Stage delay in minutes before SLA turns yellow.'),
  ('platform.sla_red_threshold_min',
   '10',
   'Stage delay in minutes before SLA turns red (breach).'),
  ('platform.default_locale',
   '"fi-FI"',
   'Default locale for formatting.'),
  ('platform.currency',
   '"EUR"',
   'Platform currency ISO 4217 code.');
