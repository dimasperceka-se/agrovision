-- 0017_reports.sql
--
-- Tiga hal yang audit temukan HILANG SAMA SEKALI dari 0001-0013:
--   1. Definisi laporan sebagai baris DB -- kata "report" muncul 0x di 13 file.
--      concept:70 mewajibkan 3 laporan built-in sebagai 3 BARIS DEFINISI,
--      bukan 3 halaman hardcoded.
--   2. DBH / diameter batang -- 0 hit di db/ dan src/. Ini seluruh dasar sisi
--      sequestration (concept:139) dan salah satu dari dua rantai acceptance.
--   3. Modul operasional fase bibit: Land Preparation (A2), Land Suitability (A3),
--      Pruning (A6). concept:116 minta A2 dan A3 DIPISAH karena siklus datanya beda.

-- ===========================================================================
-- 1. DEFINISI LAPORAN -- query-driven, bukan halaman hardcoded
-- ===========================================================================

CREATE TYPE app.report_kind AS ENUM ('operational', 'sustainability', 'financial', 'custom');
CREATE TYPE app.agg_function AS ENUM ('sum', 'count', 'avg', 'min', 'max', 'none');
CREATE TYPE app.band_kind AS ENUM ('kpi', 'chart', 'table');

CREATE TABLE app.report_definitions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid REFERENCES app.companies(id),   -- NULL = built-in untuk semua
  code         text NOT NULL,
  name         text NOT NULL,                        -- label Indonesia
  kind         app.report_kind NOT NULL,
  description  text,
  -- Sumber data dibatasi ke whitelist view, TIDAK SQL bebas. Report builder fase 2
  -- tidak boleh bisa mengirim SQL sembarang.
  base_view    text NOT NULL,
  default_filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_builtin   boolean NOT NULL DEFAULT false,
  is_stub      boolean NOT NULL DEFAULT false,       -- true = ditandai STUB di UI
  created_at   timestamptz NOT NULL DEFAULT now(),
  created_by   uuid REFERENCES app.users(id),
  UNIQUE (company_id, code)
);

COMMENT ON COLUMN app.report_definitions.base_view IS
  'Nama view di whitelist app.report_allowed_views. Bukan SQL bebas -- mencegah injeksi.';
COMMENT ON COLUMN app.report_definitions.is_stub IS
  'true = laporan terdaftar tapi belum berisi data nyata. UI WAJIB menandainya (concept:250).';

CREATE TABLE app.report_allowed_views (
  view_name  text PRIMARY KEY,
  note       text
);

CREATE TABLE app.report_definition_fields (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id    uuid NOT NULL REFERENCES app.report_definitions(id) ON DELETE CASCADE,
  band         app.band_kind NOT NULL,
  source_column text NOT NULL,
  label        text NOT NULL,
  agg          app.agg_function NOT NULL DEFAULT 'none',
  group_by     boolean NOT NULL DEFAULT false,
  format       text,                    -- 'idr' | 'ha' | 'tco2e' | 'pct' | 'int'
  sort_order   integer NOT NULL DEFAULT 0,
  UNIQUE (report_id, band, source_column)
);

-- TODO: phase 2 -- custom report builder UI di atas dua tabel ini.

-- ===========================================================================
-- 2. VIEW AGREGASI -- di sinilah "setiap angka dihitung" (concept:37-41)
-- security_invoker = view menghormati RLS pemanggil, bukan pemiliknya.
-- Tanpa ini, view menjadi lubang yang membocorkan data lintas tenant.
-- ===========================================================================

-- Biaya per blok. HANYA record approved (AT4: rejected dikecualikan).
CREATE VIEW app.v_block_cost_summary
WITH (security_invoker = true) AS
SELECT
  b.id                              AS block_id,
  b.company_id,
  b.estate_id,
  b.code                            AS block_code,
  b.area_ha,
  COUNT(ct.id)                      AS transaction_count,
  COALESCE(SUM(ct.amount_idr), 0)   AS total_cost_idr,
  CASE WHEN b.area_ha IS NULL OR b.area_ha = 0 THEN NULL
       ELSE COALESCE(SUM(ct.amount_idr), 0) / b.area_ha
  END                               AS cost_per_ha_idr
FROM app.blocks b
LEFT JOIN app.cost_transactions ct
       ON ct.block_id = b.id
      AND ct.approval_status = 'approved'
WHERE b.archived_at IS NULL
GROUP BY b.id, b.company_id, b.estate_id, b.code, b.area_ha;

COMMENT ON VIEW app.v_block_cost_summary IS
  'cost_per_ha NULL bila luas belum ada -- JANGAN diganti 0. Empty state jujur (concept:40).';

-- Actual vs budget per periode x kategori x scope.
CREATE VIEW app.v_budget_vs_actual
WITH (security_invoker = true) AS
WITH actual AS (
  SELECT ct.company_id, ct.fiscal_period_id, ct.cost_category_id, ct.block_id,
         SUM(ct.amount_idr) AS actual_idr
    FROM app.cost_transactions ct
   WHERE ct.approval_status = 'approved'
   GROUP BY 1,2,3,4
)
SELECT
  bg.id                AS budget_id,
  bg.company_id,
  bg.fiscal_period_id,
  fp.name              AS period_name,
  bg.cost_category_id,
  mi.name              AS cost_category_name,
  bg.scope_type,
  bg.scope_id,
  bg.amount_idr        AS budget_idr,
  COALESCE(a.actual_idr, 0) AS actual_idr,
  bg.amount_idr - COALESCE(a.actual_idr, 0) AS remaining_idr,
  CASE WHEN bg.amount_idr = 0 THEN NULL
       ELSE ROUND(COALESCE(a.actual_idr, 0) * 100.0 / bg.amount_idr, 2)
  END                  AS utilisation_pct,
  COALESCE(a.actual_idr, 0) > bg.amount_idr AS is_over_budget
FROM app.budgets bg
JOIN app.fiscal_periods fp ON fp.id = bg.fiscal_period_id
JOIN app.master_items  mi ON mi.id = bg.cost_category_id
LEFT JOIN actual a
       ON a.company_id       = bg.company_id
      AND a.fiscal_period_id = bg.fiscal_period_id
      AND a.cost_category_id = bg.cost_category_id
      AND (bg.scope_type <> 'block' OR a.block_id = bg.scope_id);

-- Ringkasan stok bibit -- metrik pengganti untuk fase pengadaan bibit.
CREATE VIEW app.v_seedling_stock
WITH (security_invoker = true) AS
SELECT
  sb.id            AS seed_batch_id,
  sb.company_id,
  sb.code          AS batch_code,
  sb.crop_id,
  sb.qty_initial,
  li.qty_alive,
  li.qty_dead,
  li.qty_damaged,
  li.inspected_at  AS last_inspected_at
FROM app.seed_batches sb
LEFT JOIN LATERAL (
  SELECT ni.qty_alive, ni.qty_dead, ni.qty_damaged, ni.inspected_at
    FROM app.nursery_inspections ni
   WHERE ni.seed_batch_id = sb.id
     AND ni.approval_status = 'approved'
   ORDER BY ni.inspected_at DESC
   LIMIT 1
) li ON true
WHERE sb.archived_at IS NULL;

INSERT INTO app.report_allowed_views (view_name, note) VALUES
  ('v_block_cost_summary', 'Biaya & cost per ha per blok'),
  ('v_budget_vs_actual',   'Actual vs budget per periode/kategori/scope'),
  ('v_seedling_stock',     'Stok bibit hidup/mati/rusak per batch');

-- Tiga laporan built-in sebagai TIGA BARIS (concept:70).
-- Financial hidup; dua lainnya terdaftar tapi ditandai stub sampai datanya ada.
INSERT INTO app.report_definitions (code, name, kind, base_view, is_builtin, is_stub, description) VALUES
  ('RPT-FINANCIAL', 'Laporan Keuangan', 'financial', 'v_budget_vs_actual', true, false,
   'Expenditure vs budget, cost per hektar, P&L, proyeksi break-even.'),
  ('RPT-OPERATIONAL', 'Laporan Operasional', 'operational', 'v_seedling_stock', true, true,
   'Stok bibit sehat, progress land preparation, realisasi pemupukan.'),
  ('RPT-SUSTAINABILITY', 'Laporan Keberlanjutan', 'sustainability', 'v_block_cost_summary', true, true,
   'Net carbon per blok. STUB: sequestration masih nol dan koefisien IPCC belum divalidasi.');

-- ===========================================================================
-- 3. DBH -- dasar sisi sequestration (concept:139)
-- Sekarang bernilai nol karena semua masih bibit. Formnya dibangun supaya relevan
-- sejak fase juvenil, bukan ditambahkan belakangan.
-- ===========================================================================

CREATE TABLE app.dbh_measurements (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_uuid     uuid UNIQUE,                 -- idempotensi sync
  block_id        uuid NOT NULL REFERENCES app.blocks(id),
  plot_id         uuid REFERENCES app.plots(id),
  crop_id         uuid NOT NULL REFERENCES app.crops(id),
  tree_id         uuid REFERENCES app.trees(id),   -- bila dilacak individual
  survey_point_id uuid REFERENCES app.tree_survey_points(id),
  measured_at     timestamptz NOT NULL,
  dbh_cm          numeric(8,2) NOT NULL CHECK (dbh_cm > 0),
  height_m        numeric(8,2) CHECK (height_m > 0),
  measurement_height_cm numeric(6,2) DEFAULT 130,  -- standar 1,3 m
  geom            geometry(Point, 4326),
  gps_accuracy_m  numeric(6,2),
  measured_by     uuid REFERENCES app.users(id),
  approval_status app.record_status NOT NULL DEFAULT 'draft',
  rejection_reason text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX dbh_block_idx ON app.dbh_measurements (block_id, measured_at DESC);
CREATE INDEX dbh_geom_gix  ON app.dbh_measurements USING GIST (geom);

COMMENT ON TABLE app.dbh_measurements IS
  'Pengukuran diameter batang. Biomassa dihitung dari sini + allometric_coefficients. '
  'Selama koefisien belum divalidasi ahli, hasil turunannya WAJIB ditandai di UI.';

-- ===========================================================================
-- 4. MODUL OPERASIONAL FASE BIBIT
-- concept:116 -- A2 dan A3 SENGAJA dipisah karena siklus datanya berbeda:
-- suitability = sekali per blok; preparation = berulang sampai siap tanam.
-- ===========================================================================

CREATE TYPE app.prep_status AS ENUM ('not_started', 'in_progress', 'ready_to_plant');

CREATE TABLE app.land_preparations (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_uuid         uuid UNIQUE,
  block_id            uuid NOT NULL REFERENCES app.blocks(id),
  checked_at          timestamptz NOT NULL,
  soil_ph             numeric(4,2) CHECK (soil_ph BETWEEN 0 AND 14),
  planting_hole_count integer CHECK (planting_hole_count >= 0),
  hole_length_cm      numeric(8,2),
  hole_width_cm       numeric(8,2),
  hole_depth_cm       numeric(8,2),
  effective_area_ha   numeric(12,4),
  planting_layout_item_id uuid REFERENCES app.master_items(id),
  land_clearing_status_item_id uuid REFERENCES app.master_items(id),
  status              app.prep_status NOT NULL DEFAULT 'not_started',
  officer_id          uuid REFERENCES app.users(id),
  approval_status     app.record_status NOT NULL DEFAULT 'draft',
  rejection_reason    text,
  note                text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  created_by          uuid REFERENCES app.users(id)
);
CREATE INDEX lp_block_idx ON app.land_preparations (block_id, checked_at DESC);

-- A3: SEKALI per blok (concept:116). Ditegakkan constraint, bukan konvensi.
CREATE TABLE app.land_suitability_assessments (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_uuid        uuid UNIQUE,
  block_id           uuid NOT NULL REFERENCES app.blocks(id),
  assessed_at        timestamptz NOT NULL,
  soil_type_item_id  uuid REFERENCES app.master_items(id),
  drainage_item_id   uuid REFERENCES app.master_items(id),
  slope_pct          numeric(6,2),
  elevation_m        numeric(8,2),
  rainfall_mm_year   numeric(9,2),
  score_durian       numeric(5,2) CHECK (score_durian BETWEEN 0 AND 100),
  score_coconut      numeric(5,2) CHECK (score_coconut BETWEEN 0 AND 100),
  assessor_id        uuid REFERENCES app.users(id),
  approval_status    app.record_status NOT NULL DEFAULT 'draft',
  rejection_reason   text,
  note               text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  created_by         uuid REFERENCES app.users(id)
);
-- Satu assessment aktif per blok; revisi lewat approval, bukan baris ganda.
CREATE UNIQUE INDEX lsa_one_per_block ON app.land_suitability_assessments (block_id)
  WHERE approval_status <> 'rejected';

CREATE TABLE app.fertilizer_applications (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_uuid        uuid UNIQUE,
  block_id           uuid NOT NULL REFERENCES app.blocks(id),
  plot_id            uuid REFERENCES app.plots(id),
  fertilizer_type_id uuid NOT NULL REFERENCES app.fertilizer_types(id),
  growth_phase       app.growth_phase NOT NULL,
  applied_on         date NOT NULL,
  dose_per_tree      numeric(12,3),
  total_quantity     numeric(14,3) NOT NULL,
  uom_item_id        uuid REFERENCES app.master_items(id),
  tree_count         integer,
  schedule_id        uuid REFERENCES app.fertilizer_schedules(id),  -- rekomendasi acuan
  officer_id         uuid REFERENCES app.users(id),
  approval_status    app.record_status NOT NULL DEFAULT 'draft',
  rejection_reason   text,
  note               text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  created_by         uuid REFERENCES app.users(id)
);
CREATE INDEX fa_block_idx ON app.fertilizer_applications (block_id, applied_on DESC);

CREATE TABLE app.pruning_records (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_uuid      uuid UNIQUE,
  block_id         uuid NOT NULL REFERENCES app.blocks(id),
  crop_id          uuid REFERENCES app.crops(id),
  pruned_on        date NOT NULL,
  tree_count       integer CHECK (tree_count >= 0),
  officer_id       uuid REFERENCES app.users(id),
  approval_status  app.record_status NOT NULL DEFAULT 'draft',
  rejection_reason text,
  note             text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  created_by       uuid REFERENCES app.users(id)
);
CREATE INDEX pr_block_idx ON app.pruning_records (block_id, pruned_on DESC);

-- ===========================================================================
-- 5. Hak akses & RLS
-- ===========================================================================

DO $$
DECLARE
  t text;
  block_scoped text[] := ARRAY[
    'dbh_measurements','land_preparations','land_suitability_assessments',
    'fertilizer_applications','pruning_records'
  ];
BEGIN
  FOREACH t IN ARRAY block_scoped LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON app.%I TO app_rw', t);
    EXECUTE format('GRANT SELECT ON app.%I TO app_ro', t);
    EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format($f$
      CREATE POLICY %1$s_tenant ON app.%1$I
        USING (EXISTS (SELECT 1 FROM app.blocks b
                        WHERE b.id = %1$I.block_id AND app.company_in_scope(b.company_id)))
        WITH CHECK (EXISTS (SELECT 1 FROM app.blocks b
                        WHERE b.id = %1$I.block_id AND app.company_in_scope(b.company_id)))
    $f$, t);
  END LOOP;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON
  app.report_definitions, app.report_definition_fields TO app_rw;
GRANT SELECT ON
  app.report_definitions, app.report_definition_fields, app.report_allowed_views TO app_rw, app_ro;

GRANT SELECT ON app.v_block_cost_summary, app.v_budget_vs_actual, app.v_seedling_stock
  TO app_rw, app_ro;

ALTER TABLE app.report_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY rd_tenant ON app.report_definitions
  USING (company_id IS NULL OR app.company_in_scope(company_id))
  WITH CHECK (company_id IS NULL OR app.company_in_scope(company_id));
