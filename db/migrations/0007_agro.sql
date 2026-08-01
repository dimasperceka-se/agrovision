-- 0007_agro.sql
-- Rencana tanam, realisasi, tree inventory.
-- Lihat docs/01-desain-skema-database.md §7, §7.1

CREATE TYPE app.tree_condition AS ENUM ('baik','sedang','buruk','mati');   -- mobile-preview
CREATE TYPE app.growth_phase   AS ENUM ('bibit','vegetatif','produktif');  -- mobile-preview
CREATE TYPE app.plan_status    AS ENUM ('on_track','tertunda','selesai','dibatalkan');

CREATE TABLE app.planting_plans (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id       uuid NOT NULL REFERENCES app.blocks(id),
  plot_id        uuid REFERENCES app.plots(id),
  crop_id        uuid NOT NULL REFERENCES app.crops(id),
  season_year    integer NOT NULL,
  target_trees   integer NOT NULL,
  planned_start  date,
  planned_end    date,
  pic_user_id    uuid REFERENCES app.users(id),
  status         app.plan_status NOT NULL DEFAULT 'on_track',
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (block_id, crop_id, season_year)
);

-- Append-only: satu baris per kejadian tanam/sulam.
CREATE TABLE app.planting_records (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  planting_plan_id uuid NOT NULL REFERENCES app.planting_plans(id),
  planted_on       date NOT NULL,
  tree_count       integer NOT NULL CHECK (tree_count > 0),
  seed_batch_id    uuid REFERENCES app.seed_batches(id),   -- mata rantai traceability
  is_replanting    boolean NOT NULL DEFAULT false,         -- 'penyulaman'
  recorded_by      uuid REFERENCES app.users(id),
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX planting_rec_plan_idx ON app.planting_records (planting_plan_id, planted_on DESC);

-- §3.9 Sampling per titik (dipakai sekarang), bukan per pohon.
CREATE TABLE app.tree_survey_points (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_uuid     uuid NOT NULL UNIQUE,        -- dibuat device; idempotensi sync
  code            text,                        -- 'TI-2606-001'
  block_id        uuid NOT NULL REFERENCES app.blocks(id),
  plot_id         uuid REFERENCES app.plots(id),
  crop_id         uuid NOT NULL REFERENCES app.crops(id),
  point_number    integer,                     -- 'titik: 12'
  geom            geometry(Point, 4326),
  gps_accuracy_m  numeric(6,2),
  tree_count      integer NOT NULL,
  condition       app.tree_condition NOT NULL,
  growth_phase    app.growth_phase NOT NULL,
  surveyed_at     timestamptz NOT NULL,
  surveyor_id     uuid REFERENCES app.users(id),
  assignment_id   uuid REFERENCES app.assignments(id),
  synced_at       timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX tree_survey_geom_gix ON app.tree_survey_points USING GIST (geom);
CREATE INDEX tree_survey_block_idx ON app.tree_survey_points (block_id, surveyed_at DESC);

-- Opsional, hanya untuk crop dengan track_individual_trees = true. §3.9 dan §12 no.1
CREATE TABLE app.trees (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plot_id           uuid NOT NULL REFERENCES app.plots(id),
  crop_id           uuid NOT NULL REFERENCES app.crops(id),
  tag_code          text,                        -- nomor tag fisik / QR
  geom              geometry(Point, 4326),
  planted_on        date,
  seed_batch_id     uuid REFERENCES app.seed_batches(id),
  current_condition app.growth_phase,
  removed_at        date,
  UNIQUE (plot_id, tag_code)
);
CREATE INDEX trees_geom_gix ON app.trees USING GIST (geom);
