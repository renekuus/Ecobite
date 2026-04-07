-- ── reviews ──────────────────────────────────────────────────────────────────
CREATE TABLE reviews (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         UUID        NOT NULL REFERENCES orders (id),
  customer_id      UUID        NOT NULL REFERENCES customers (id),
  courier_id       UUID        REFERENCES couriers (id) ON DELETE SET NULL,
  merchant_id      UUID        REFERENCES merchants (id) ON DELETE SET NULL,
  courier_rating   SMALLINT    CHECK (courier_rating  BETWEEN 1 AND 5),
  merchant_rating  SMALLINT    CHECK (merchant_rating BETWEEN 1 AND 5),
  comment          TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- One review per order; at least one rating must be present
  CONSTRAINT reviews_order_unique  UNIQUE (order_id),
  CONSTRAINT reviews_has_rating    CHECK (
    courier_rating IS NOT NULL OR merchant_rating IS NOT NULL
  )
);

CREATE INDEX idx_reviews_courier  ON reviews (courier_id)  WHERE courier_id IS NOT NULL;
CREATE INDEX idx_reviews_merchant ON reviews (merchant_id) WHERE merchant_id IS NOT NULL;
CREATE INDEX idx_reviews_customer ON reviews (customer_id);
