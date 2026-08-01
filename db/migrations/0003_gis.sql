-- 0003_gis.sql
-- Blok, riwayat batas, plot, dan crop layer.
-- Lihat docs/01-desain-skema-database.md §6, §6.1, §6.2

CREATE TYPE app.boundary_source AS ENUM (
  'gps_survey', 'drone_ortho', 'shapefile_import', 'manual_digitize', 'legacy_document'
);
CREATE TYPE app.verification_status AS ENUM (
  'draft', 'submitted', 'verified', 'rejected'
);
CREATE TYPE app.land_use AS ENUM (
  'productive', 'conservation', 'buffer', 'infrastructure', 'nursery'
);

CREATE TABLE app.crops (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code                   text NOT NULL UNIQUE,   -- 'KELAPA', 'DURIAN'
  name                   text NOT NULL,
  scientific_name        text,
  variety                text,                   -- 'Kelapa Genjah'
  is_tree                boolean NOT NULL DEFAULT true,
  track_individual_trees boolean NOT NULL DEFAULT false   -- §3.9
);

CREATE TABLE app.blocks (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id           uuid NOT NULL REFERENCES app.companies(id),
  estate_id            uuid NOT NULL REFERENCES app.estates(id),
  division_id          uuid REFERENCES app.divisions(id),
  code                 text NOT NULL,                    -- 'AGF-A12'
  name                 text,
  geom                 geometry(MultiPolygon, 4326) NOT NULL,
  area_ha              numeric(12,4) GENERATED ALWAYS AS (ST_Area(geom::geography)/10000.0) STORED,
  planted_area_ha      numeric(12,4),                    -- turunan dari plots
  conservation_area_ha numeric(12,4),
  planting_year        integer,
  boundary_source      app.boundary_source NOT NULL,
  verification_status  app.verification_status NOT NULL DEFAULT 'draft',
  verified_at          timestamptz,
  verified_by          uuid REFERENCES app.users(id),
  current_version      integer NOT NULL DEFAULT 1,
  archived_at          timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  created_by           uuid REFERENCES app.users(id),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  updated_by           uuid REFERENCES app.users(id),
  UNIQUE (company_id, code),
  CONSTRAINT blocks_geom_valid CHECK (ST_IsValid(geom))
);
CREATE INDEX blocks_geom_gix ON app.blocks USING GIST (geom);
CREATE INDEX blocks_estate_idx ON app.blocks (estate_id) WHERE archived_at IS NULL;

-- §6.1 Riwayat batas: geometry lama TIDAK boleh ditimpa, karena perhitungan
-- karbon periode lalu memakai luas versi saat itu.
CREATE TABLE app.block_boundary_versions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id        uuid NOT NULL REFERENCES app.blocks(id),
  version         integer NOT NULL,
  geom            geometry(MultiPolygon, 4326) NOT NULL,
  area_ha         numeric(12,4) NOT NULL,
  boundary_source app.boundary_source NOT NULL,
  change_reason   text,
  effective_from  timestamptz NOT NULL,
  effective_to    timestamptz,                -- NULL = versi berlaku saat ini
  approval_id     uuid,                       -- FK ditambahkan di 0012 (melingkar)
  created_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid REFERENCES app.users(id),
  UNIQUE (block_id, version)
);
CREATE INDEX bbv_block_idx ON app.block_boundary_versions (block_id, version DESC);

CREATE TABLE app.plots (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id    uuid NOT NULL REFERENCES app.blocks(id),
  code        text NOT NULL,
  geom        geometry(MultiPolygon, 4326) NOT NULL,
  area_ha     numeric(12,4) GENERATED ALWAYS AS (ST_Area(geom::geography)/10000.0) STORED,
  land_use    app.land_use NOT NULL DEFAULT 'productive',
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (block_id, code),
  CONSTRAINT plots_geom_valid CHECK (ST_IsValid(geom))
);
CREATE INDEX plots_geom_gix ON app.plots USING GIST (geom);

-- Agroforestry = beberapa lapis tanaman di lahan yang sama, jadi many-to-many.
CREATE TABLE app.plot_crop_layers (
  plot_id      uuid NOT NULL REFERENCES app.plots(id) ON DELETE CASCADE,
  crop_id      uuid NOT NULL REFERENCES app.crops(id),
  layer_order  smallint NOT NULL DEFAULT 1,   -- 1 = tajuk utama
  spacing_m    numeric(6,2),
  trees_per_ha numeric(8,2),
  PRIMARY KEY (plot_id, crop_id)
);
