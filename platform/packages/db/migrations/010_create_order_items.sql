-- ── order_items ──────────────────────────────────────────────────────────────
CREATE TABLE order_items (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id              UUID          NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  -- Nullable: product may be deleted after order was placed
  product_id            UUID          REFERENCES products (id) ON DELETE SET NULL,
  -- Snapshots frozen at order time — never read from live products table for display
  product_name_snapshot TEXT          NOT NULL,
  price_snapshot_eur    NUMERIC(8,2)  NOT NULL,
  quantity              SMALLINT      NOT NULL DEFAULT 1 CHECK (quantity > 0),
  -- [{name:'Extra sauce', priceDeltaEur:0.50}, ...]
  modifier_snapshot     JSONB         NOT NULL DEFAULT '[]',
  line_total_eur        NUMERIC(10,2) NOT NULL
);

CREATE INDEX idx_order_items_order   ON order_items (order_id);
CREATE INDEX idx_order_items_product ON order_items (product_id) WHERE product_id IS NOT NULL;
