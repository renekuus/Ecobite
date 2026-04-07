-- ── merchants ────────────────────────────────────────────────────────────────
CREATE TABLE merchants (
  id                           UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  name                         TEXT           NOT NULL,
  slug                         TEXT           NOT NULL,
  merchant_group               merchant_group NOT NULL,
  status                       TEXT           NOT NULL DEFAULT 'active'
                                              CHECK (status IN ('active', 'inactive', 'suspended')),
  lat                          NUMERIC(10,7)  NOT NULL,
  lng                          NUMERIC(10,7)  NOT NULL,
  address                      TEXT           NOT NULL,
  -- Financial settings (ops-overrideable per merchant)
  commission_rate              NUMERIC(5,4)   NOT NULL,          -- e.g. 0.1900 = 19%
  delivery_fee_under_eur       NUMERIC(8,2)   NOT NULL,          -- fee when subtotal < threshold
  delivery_fee_over_eur        NUMERIC(8,2)   NOT NULL DEFAULT 0,-- fee when subtotal >= threshold
  free_delivery_threshold_eur  NUMERIC(8,2)   NOT NULL,
  min_order_value_eur          NUMERIC(8,2)   NOT NULL DEFAULT 0,
  prep_time_estimate_min       SMALLINT       NOT NULL DEFAULT 15,
  s3_logo_key                  TEXT,
  -- JSONB: {mon:{open:'10:00',close:'22:00'}, tue:null, ...}  null day = closed
  operating_hours              JSONB          NOT NULL DEFAULT '{}',
  created_at                   TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at                   TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  CONSTRAINT merchants_slug_unique UNIQUE (slug)
);

CREATE INDEX idx_merchants_group   ON merchants (merchant_group);
CREATE INDEX idx_merchants_status  ON merchants (status);
-- Basic coordinate index; promote to PostGIS geography column in a later migration
-- once earthdistance or PostGIS proximity queries are required.
CREATE INDEX idx_merchants_lat_lng ON merchants (lat, lng);
-- Trigram search for merchant name (ops dashboard / customer app search)
CREATE INDEX idx_merchants_name_trgm ON merchants USING GIN (name gin_trgm_ops);

CREATE TRIGGER trg_merchants_updated_at
  BEFORE UPDATE ON merchants
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
