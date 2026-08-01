-- 0009_carbon.sql
-- Emission factor berversi, perhitungan emisi, sequestration, carbon run, MRV.
-- Modul paling menuntut ketelitian: §3.1 dan §3.2 diterapkan di sini.
-- Lihat docs/01-desain-skema-database.md §9

CREATE TYPE app.carbon_status AS ENUM ('net_sink','neutral','net_emitter','data_incomplete');
CREATE TYPE app.ef_scope      AS ENUM ('scope1','scope2','scope3');
CREATE TYPE app.run_status    AS ENUM ('draft','calculated','menunggu_approval','approved','superseded');

-- §3.1 APPEND-ONLY. Revisi = baris baru dengan version+1, BUKAN UPDATE.
CREATE TABLE app.emission_factors (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code             text NOT NULL,                 -- 'EF-FERT-NPK-24'
  version          integer NOT NULL,
  activity_type_id uuid REFERENCES app.activity_types(id),
  name             text NOT NULL,
  value            numeric(14,6) NOT NULL,        -- 1.33
  unit_numerator   text NOT NULL DEFAULT 'kgCO2e',
  unit_denominator text NOT NULL,                 -- kg|liter|km
  scope            app.ef_scope NOT NULL DEFAULT 'scope1',
  -- provenance: wajib untuk kredibilitas MRV (§12 no.2)
  source_standard  text NOT NULL,                 -- 'IPCC 2019 Refinement' dsb
  source_citation  text,
  uncertainty_pct  numeric(6,2),
  valid_from       date NOT NULL,
  valid_to         date,                          -- NULL = masih berlaku
  approved_by      uuid REFERENCES app.users(id),
  approved_at      timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (code, version)
);
-- Hanya satu versi aktif per kode pada satu waktu.
CREATE UNIQUE INDEX ef_active_uniq ON app.emission_factors (code) WHERE valid_to IS NULL;

CREATE TABLE app.activity_emissions (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id        uuid NOT NULL REFERENCES app.activities(id),
  -- FK ke VERSI faktor, bukan ke kode. Inilah yang membuat run reproducible.
  emission_factor_id uuid REFERENCES app.emission_factors(id),
  quantity           numeric(14,3) NOT NULL,     -- disnapshot saat hitung
  factor_value       numeric(14,6),              -- disnapshot; tahan perubahan
  emission_tco2e     numeric(14,4),
  status             text NOT NULL,              -- lengkap|missing_factor|perlu_review
  calculated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (activity_id)
);
-- KPI 'Missing Factor: 61'
CREATE INDEX act_emis_missing_idx ON app.activity_emissions (status) WHERE status <> 'lengkap';

CREATE TABLE app.sequestration_models (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_id             uuid REFERENCES app.crops(id),
  land_use            app.land_use,
  version             integer NOT NULL,
  method              text NOT NULL,             -- allometrik | tier-1 default
  formula_ref         text,
  tco2e_per_tree_year numeric(14,6),
  tco2e_per_ha_year   numeric(14,6),
  source_standard     text NOT NULL,
  valid_from          date NOT NULL,
  valid_to            date,
  UNIQUE (crop_id, land_use, version)
);

-- §3.2 Immutable setelah approved. Koreksi = run baru yang menunjuk supersedes_run_id.
CREATE TABLE app.carbon_runs (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            uuid NOT NULL REFERENCES app.companies(id),
  code                  text NOT NULL,              -- 'CR-2026-06'
  period_start          date NOT NULL,
  period_end            date NOT NULL,
  boundary_note         text,                       -- 'Estate Sejahtera, Estate Lestari'
  gross_emission_tco2e  numeric(14,4),
  sequestration_tco2e   numeric(14,4),
  net_balance_tco2e     numeric(14,4),
  carbon_intensity      numeric(14,6),              -- kgCO2e/kg produk
  data_completeness_pct numeric(5,2),
  status                app.run_status NOT NULL DEFAULT 'draft',
  supersedes_run_id     uuid REFERENCES app.carbon_runs(id),
  executed_at           timestamptz,
  executed_by           uuid REFERENCES app.users(id),
  approved_at           timestamptz,
  approved_by           uuid REFERENCES app.users(id),
  UNIQUE (company_id, code),
  CONSTRAINT carbon_run_period CHECK (period_end >= period_start)
);

CREATE TABLE app.carbon_run_blocks (
  run_id              uuid NOT NULL REFERENCES app.carbon_runs(id) ON DELETE CASCADE,
  block_id            uuid NOT NULL REFERENCES app.blocks(id),
  -- snapshot: luas bisa berubah setelah revisi batas (§6.1)
  area_ha_snapshot    numeric(12,4) NOT NULL,
  boundary_version    integer NOT NULL,
  emission_tco2e      numeric(14,4),
  sequestration_tco2e numeric(14,4),
  net_tco2e           numeric(14,4),
  status              app.carbon_status NOT NULL,
  PRIMARY KEY (run_id, block_id)
);

CREATE TABLE app.mrv_packages (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id        uuid NOT NULL REFERENCES app.carbon_runs(id),
  status        text NOT NULL,
  reviewer_id   uuid REFERENCES app.users(id),
  export_path   text,                      -- gs://.../mrv/CR-2026-06.zip
  export_sha256 text,
  generated_at  timestamptz
);

CREATE TABLE app.mrv_package_sections (
  package_id   uuid NOT NULL REFERENCES app.mrv_packages(id) ON DELETE CASCADE,
  section_name text NOT NULL,               -- Polygon|Activity Data|...
  item_count   integer NOT NULL,
  status       text NOT NULL,               -- lengkap|sebagian|belum
  PRIMARY KEY (package_id, section_name)
);
