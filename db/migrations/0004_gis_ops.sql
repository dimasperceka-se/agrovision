-- 0004_gis_ops.sql
-- Import batas, deteksi overlap, orthophoto drone.
-- Lihat docs/01-desain-skema-database.md §6.3, §6.4

CREATE TYPE app.import_status AS ENUM (
  'uploaded','validating','needs_review','applied','failed'
);

CREATE TABLE app.boundary_imports (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     uuid NOT NULL REFERENCES app.companies(id),
  file_name      text NOT NULL,
  storage_path   text NOT NULL,               -- gs://.../imports/...
  format         text NOT NULL,               -- shapefile | geojson | kml
  source_srid    integer,
  feature_count  integer,
  status         app.import_status NOT NULL DEFAULT 'uploaded',
  error_detail   jsonb,
  uploaded_by    uuid REFERENCES app.users(id),
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- §3.5 Overlap DILAPORKAN untuk direview, bukan ditolak keras.
CREATE TABLE app.boundary_overlaps (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  block_a_id      uuid NOT NULL REFERENCES app.blocks(id),
  block_b_id      uuid NOT NULL REFERENCES app.blocks(id),
  overlap_geom    geometry(MultiPolygon, 4326),
  overlap_area_ha numeric(12,4) NOT NULL,
  detected_at     timestamptz NOT NULL DEFAULT now(),
  resolved_at     timestamptz,
  resolved_by     uuid REFERENCES app.users(id),
  resolution_note text,
  CONSTRAINT overlap_distinct CHECK (block_a_id <> block_b_id)
);
CREATE INDEX overlap_open_idx ON app.boundary_overlaps (detected_at DESC)
  WHERE resolved_at IS NULL;

-- Deteksi overlap dengan toleransi 100 m2 (di bawah itu = artefak presisi digitasi).
CREATE OR REPLACE FUNCTION app.detect_block_overlaps(p_block_id uuid)
RETURNS integer LANGUAGE plpgsql AS $$
DECLARE
  v_count integer := 0;
BEGIN
  INSERT INTO app.boundary_overlaps (block_a_id, block_b_id, overlap_geom, overlap_area_ha)
  SELECT a.id, b.id,
         ST_Multi(ST_CollectionExtract(ST_Intersection(a.geom, b.geom), 3)),
         ST_Area(ST_Intersection(a.geom, b.geom)::geography) / 10000.0
  FROM app.blocks a
  JOIN app.blocks b
    ON b.id <> a.id
   AND b.estate_id = a.estate_id
   AND b.archived_at IS NULL
   AND ST_Intersects(a.geom, b.geom)
  WHERE a.id = p_block_id
    AND a.archived_at IS NULL
    AND ST_Area(ST_Intersection(a.geom, b.geom)::geography) > 100
    AND NOT EXISTS (
      SELECT 1 FROM app.boundary_overlaps o
      WHERE o.resolved_at IS NULL
        AND ((o.block_a_id = a.id AND o.block_b_id = b.id)
          OR (o.block_a_id = b.id AND o.block_b_id = a.id))
    );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $$;

CREATE TABLE app.drone_orthophotos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estate_id     uuid NOT NULL REFERENCES app.estates(id),
  code          text NOT NULL,
  captured_at   date NOT NULL,
  footprint     geometry(MultiPolygon, 4326) NOT NULL,
  cog_path      text NOT NULL,                -- gs://.../ortho/xxx.tif
  gsd_cm        numeric(6,2),                 -- ground sample distance
  size_bytes    bigint,
  tile_url      text,                         -- endpoint tile-server
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ortho_footprint_gix ON app.drone_orthophotos USING GIST (footprint);
