-- ── merchant_users ───────────────────────────────────────────────────────────
CREATE TABLE merchant_users (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id   UUID        NOT NULL REFERENCES merchants (id) ON DELETE CASCADE,
  email         TEXT        NOT NULL,
  role          TEXT        NOT NULL DEFAULT 'staff'
                            CHECK (role IN ('owner', 'staff', 'view_only')),
  password_hash TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT merchant_users_email_unique UNIQUE (email)
);

CREATE INDEX idx_merchant_users_merchant ON merchant_users (merchant_id);
