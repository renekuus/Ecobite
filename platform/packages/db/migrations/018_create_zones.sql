-- ── zones ────────────────────────────────────────────────────────────────────
-- Requires PostGIS. Only loaded here so non-geo migrations don't depend on it.
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE zones (
  id         UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT      NOT NULL,
  zone_type  zone_type NOT NULL,
  -- SRID 4326 = WGS-84 (standard GPS coordinates)
  polygon    GEOMETRY(POLYGON, 4326) NOT NULL,
  is_active  BOOLEAN   NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- GiST index enables efficient spatial queries: ST_Contains, ST_Intersects, etc.
CREATE INDEX idx_zones_polygon ON zones USING GIST (polygon);
CREATE INDEX idx_zones_active  ON zones (is_active, zone_type) WHERE is_active = TRUE;

-- Example usage (not executed):
-- SELECT z.* FROM zones z
-- WHERE z.is_active = TRUE
--   AND ST_Contains(z.polygon, ST_SetSRID(ST_MakePoint(lng, lat), 4326));
