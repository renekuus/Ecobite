-- ── customer_addresses ───────────────────────────────────────────────────────
CREATE TABLE customer_addresses (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID          NOT NULL REFERENCES customers (id) ON DELETE CASCADE,
  label       TEXT          NOT NULL DEFAULT 'home',  -- 'home'|'work'|'other'|custom
  street      TEXT          NOT NULL,
  city        TEXT          NOT NULL,
  postal_code TEXT          NOT NULL,
  country     CHAR(2)       NOT NULL DEFAULT 'FI',
  lat         NUMERIC(10,7) NOT NULL,
  lng         NUMERIC(10,7) NOT NULL,
  is_default  BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_addresses_customer ON customer_addresses (customer_id);
-- Enforce one default address per customer at the DB level
CREATE UNIQUE INDEX idx_addresses_one_default
  ON customer_addresses (customer_id)
  WHERE is_default = TRUE;
