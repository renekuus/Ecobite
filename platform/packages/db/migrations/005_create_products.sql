-- ── products ─────────────────────────────────────────────────────────────────
CREATE TABLE products (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id    UUID          NOT NULL REFERENCES merchants (id) ON DELETE CASCADE,
  name           TEXT          NOT NULL,
  description    TEXT,
  category       TEXT          NOT NULL,
  price_eur      NUMERIC(8,2)  NOT NULL CHECK (price_eur >= 0),
  s3_image_key   TEXT,
  is_available   BOOLEAN       NOT NULL DEFAULT TRUE,
  is_archived    BOOLEAN       NOT NULL DEFAULT FALSE,
  -- JSONB: {vegetarian:true, vegan:false, gluten_free:true, dairy_free:false}
  dietary_flags  JSONB         NOT NULL DEFAULT '{}',
  sort_order     SMALLINT      NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Lookup active menu for a merchant (most common query path)
CREATE INDEX idx_products_merchant         ON products (merchant_id, sort_order);
CREATE INDEX idx_products_menu_active      ON products (merchant_id, sort_order)
  WHERE is_available = TRUE AND is_archived = FALSE;
CREATE INDEX idx_products_name_trgm        ON products USING GIN (name gin_trgm_ops);

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
