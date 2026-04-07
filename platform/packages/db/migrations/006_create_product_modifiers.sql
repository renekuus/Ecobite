-- ── product_modifiers ────────────────────────────────────────────────────────
CREATE TABLE product_modifiers (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID         NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  name            TEXT         NOT NULL,
  price_delta_eur NUMERIC(8,2) NOT NULL DEFAULT 0,  -- negative = discount
  is_required     BOOLEAN      NOT NULL DEFAULT FALSE,
  max_select      SMALLINT     NOT NULL DEFAULT 1 CHECK (max_select >= 1),
  sort_order      SMALLINT     NOT NULL DEFAULT 0
);

CREATE INDEX idx_product_modifiers_product ON product_modifiers (product_id, sort_order);
