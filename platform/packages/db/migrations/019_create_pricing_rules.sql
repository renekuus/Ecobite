-- ── pricing_rules ────────────────────────────────────────────────────────────
-- Rules can be scoped to a zone and/or a merchant group.
-- NULL zone_id = platform-wide rule.  NULL merchant_group = applies to all groups.
CREATE TABLE pricing_rules (
  id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id          UUID           REFERENCES zones (id) ON DELETE CASCADE,
  merchant_group   merchant_group,
  delivery_fee_eur NUMERIC(8,2),        -- overrides default fee; NULL = no override
  surge_multiplier NUMERIC(5,3)   NOT NULL DEFAULT 1.000 CHECK (surge_multiplier > 0),
  valid_from       TIMESTAMPTZ,         -- NULL = always valid from past
  valid_to         TIMESTAMPTZ,         -- NULL = open-ended
  created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  CONSTRAINT pricing_rules_period_valid CHECK (
    valid_to IS NULL OR valid_from IS NULL OR valid_to > valid_from
  )
);

CREATE INDEX idx_pricing_rules_zone    ON pricing_rules (zone_id) WHERE zone_id IS NOT NULL;
-- Efficient lookup for currently-active rules
CREATE INDEX idx_pricing_rules_current ON pricing_rules (valid_from, valid_to)
  WHERE valid_to IS NULL OR valid_to > NOW();
