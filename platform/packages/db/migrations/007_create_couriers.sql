-- ── couriers ─────────────────────────────────────────────────────────────────
CREATE TABLE couriers (
  id                UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  email             TEXT           NOT NULL,
  phone             TEXT           NOT NULL,
  name              TEXT           NOT NULL,
  status            courier_status NOT NULL DEFAULT 'inactive',
  vehicle_type      vehicle_type   NOT NULL DEFAULT 'bike',
  -- 1.00–5.00; NULL until first rated delivery completes
  rating            NUMERIC(3,2)   CHECK (rating BETWEEN 1 AND 5),
  stripe_account_id TEXT,          -- Stripe Connect account for payouts
  device_token      TEXT,          -- Latest FCM/APNs push token (rotated on login)
  created_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  CONSTRAINT couriers_email_unique UNIQUE (email)
);

CREATE INDEX idx_couriers_status       ON couriers (status);
CREATE INDEX idx_couriers_on_shift     ON couriers (status) WHERE status = 'on_shift';
