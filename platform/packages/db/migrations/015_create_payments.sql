-- ── payments ─────────────────────────────────────────────────────────────────
CREATE TABLE payments (
  id                       UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id                 UUID           NOT NULL REFERENCES orders (id),
  customer_id              UUID           NOT NULL REFERENCES customers (id),
  amount_eur               NUMERIC(10,2)  NOT NULL CHECK (amount_eur > 0),
  currency                 CHAR(3)        NOT NULL DEFAULT 'EUR',
  stripe_payment_intent_id TEXT           NOT NULL,
  status                   payment_status NOT NULL DEFAULT 'pending',
  created_at               TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  CONSTRAINT payments_order_unique         UNIQUE (order_id),
  CONSTRAINT payments_stripe_intent_unique UNIQUE (stripe_payment_intent_id)
);

CREATE INDEX idx_payments_customer ON payments (customer_id);
CREATE INDEX idx_payments_status   ON payments (status) WHERE status != 'succeeded';
