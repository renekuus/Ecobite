-- ── payouts ──────────────────────────────────────────────────────────────────
-- Polymorphic: recipient_type determines whether recipient_id is a courier or merchant.
-- No FK on recipient_id because it spans two tables; enforce in application layer.
CREATE TABLE payouts (
  id                 UUID                  PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_type     payout_recipient_type NOT NULL,
  recipient_id       UUID                  NOT NULL,
  period_from        DATE                  NOT NULL,
  period_to          DATE                  NOT NULL,
  amount_eur         NUMERIC(10,2)         NOT NULL CHECK (amount_eur > 0),
  currency           CHAR(3)               NOT NULL DEFAULT 'EUR',
  stripe_transfer_id TEXT,                          -- NULL until Stripe transfer initiated
  status             payout_status         NOT NULL DEFAULT 'pending',
  created_at         TIMESTAMPTZ           NOT NULL DEFAULT NOW(),
  CONSTRAINT payouts_period_valid        CHECK (period_to >= period_from),
  CONSTRAINT payouts_stripe_id_unique    UNIQUE (stripe_transfer_id)
);

CREATE INDEX idx_payouts_recipient ON payouts (recipient_type, recipient_id);
CREATE INDEX idx_payouts_status    ON payouts (status) WHERE status != 'paid';
CREATE INDEX idx_payouts_created   ON payouts (created_at DESC);
