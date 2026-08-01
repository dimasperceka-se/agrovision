-- 0015_master.sql
--
-- Master data yang dapat dikelola super_admin dari UI (concept:32-35, 208-209).
--
-- concept:34 eksplisit: "memindahkan array hardcoded ke constants.ts TIDAK
-- dihitung dinamis". Karena itu opsi dropdown disimpan sebagai BARIS, dan
-- perubahannya langsung tampil di semua dropdown terkait tanpa redeploy.
--
-- Pola: master_types (kategori) + master_items (isi). Satu tabel generik dipilih
-- daripada 12 tabel terpisah supaya CRUD-nya satu screen, satu policy, satu
-- komponen -- bukan 12 salinan. Tabel dengan atribut khusus (supplier, fertilizer,
-- allometric) tetap punya tabel sendiri karena kolomnya tidak seragam.

-- ===========================================================================
-- 1. MASTER GENERIK
-- ===========================================================================

CREATE TABLE app.master_types (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code          text NOT NULL UNIQUE,   -- 'unit_of_measure', 'cost_category', ...
  name          text NOT NULL,          -- label Indonesia untuk UI
  description   text,
  is_hierarchical boolean NOT NULL DEFAULT false,
  is_system     boolean NOT NULL DEFAULT false,  -- true = tidak boleh dihapus super_admin
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.master_items (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  master_type_id uuid NOT NULL REFERENCES app.master_types(id) ON DELETE CASCADE,
  company_id     uuid REFERENCES app.companies(id),  -- NULL = berlaku semua entitas
  parent_id      uuid REFERENCES app.master_items(id),
  code           text NOT NULL,
  name           text NOT NULL,
  attributes     jsonb NOT NULL DEFAULT '{}'::jsonb,  -- atribut ringan spesifik tipe
  sort_order     integer NOT NULL DEFAULT 0,
  is_active      boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  created_by     uuid REFERENCES app.users(id),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  updated_by     uuid REFERENCES app.users(id),
  UNIQUE (master_type_id, company_id, code)
);
CREATE INDEX mi_type_active_idx ON app.master_items (master_type_id, sort_order)
  WHERE is_active;
CREATE INDEX mi_parent_idx ON app.master_items (parent_id);

COMMENT ON TABLE app.master_items IS
  'Isi seluruh dropdown. Ditambah/diubah super_admin dari UI, tanpa redeploy (concept:35).';

-- 12 tipe master wajib dari concept:209. Diseed STRUKTURNYA saja.
-- Isinya (master_items) sengaja KOSONG -- lihat catatan di akhir file.
INSERT INTO app.master_types (code, name, is_hierarchical, is_system) VALUES
  ('unit_of_measure',          'Satuan',                        false, true),
  ('cost_category',            'Kategori Biaya',                true,  true),
  ('plantation_activity_type', 'Jenis Aktivitas Perkebunan',    false, true),
  ('growth_phase',             'Fase Pertumbuhan',              false, true),
  ('seedling_variety',         'Varietas Bibit',                false, true),
  ('pesticide_herbicide_type', 'Jenis Pestisida/Herbisida',     false, true),
  ('soil_type',                'Jenis Tanah',                   false, true),
  ('drainage_class',           'Kelas Drainase',                false, true),
  ('land_clearing_status',     'Status Land Clearing',          false, true),
  ('rejection_reason_preset',  'Alasan Penolakan (preset)',     false, false);

-- ===========================================================================
-- 2. MASTER BERATRIBUT KHUSUS
-- ===========================================================================

-- concept:209 fertilizer_type. Atributnya tidak seragam dengan master lain
-- (kandungan N-P-K, tunggal vs majemuk), jadi tabel sendiri.
CREATE TYPE app.fertilizer_kind AS ENUM ('single', 'compound', 'organic');

CREATE TABLE app.fertilizer_types (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid REFERENCES app.companies(id),
  code         text NOT NULL,
  name         text NOT NULL,              -- 'Urea', 'KCl', 'ZA', 'NPK 15-15-15'
  kind         app.fertilizer_kind NOT NULL,
  n_pct        numeric(5,2),
  p2o5_pct     numeric(5,2),
  k2o_pct      numeric(5,2),
  uom_item_id  uuid REFERENCES app.master_items(id),
  -- Emission factor TIDAK disimpan di sini: rujukannya ke emission_factors yang
  -- berversi + berprovenance. Menyimpan angka di sini akan jadi sumber kedua.
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, code)
);

-- concept:122-124 -- tabel referensi + jadwal, BUKAN rules engine.
CREATE TABLE app.fertilizer_schedules (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id         uuid REFERENCES app.companies(id),
  crop_id            uuid NOT NULL REFERENCES app.crops(id),
  growth_phase       app.growth_phase NOT NULL,
  tree_age_month_min integer NOT NULL,
  tree_age_month_max integer,
  fertilizer_type_id uuid NOT NULL REFERENCES app.fertilizer_types(id),
  dose_per_tree      numeric(12,3) NOT NULL,
  uom_item_id        uuid REFERENCES app.master_items(id),
  interval_month     integer NOT NULL,
  note               text,
  is_active          boolean NOT NULL DEFAULT true,
  CONSTRAINT fs_age_range CHECK (tree_age_month_max IS NULL
                                 OR tree_age_month_max >= tree_age_month_min)
);
CREATE INDEX fs_lookup_idx ON app.fertilizer_schedules
  (crop_id, growth_phase, tree_age_month_min) WHERE is_active;

COMMENT ON TABLE app.fertilizer_schedules IS
  'Rekomendasi terjadwal berdasarkan umur tanaman. Dikelola admin, bukan dihitung sistem.';
-- TODO: phase 2 -- rules engine yang didorong hasil uji tanah (concept:124)

-- concept:209 allometric_coefficient. Sisi sequestration.
CREATE TABLE app.allometric_coefficients (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_id         uuid REFERENCES app.crops(id),
  version         integer NOT NULL,
  equation_form   text NOT NULL,     -- mis. 'AGB = a * DBH^b'
  coef_a          numeric(16,8),
  coef_b          numeric(16,8),
  coef_c          numeric(16,8),
  wood_density    numeric(10,4),
  root_shoot_ratio numeric(10,4),
  carbon_fraction numeric(6,4),
  -- Provenance wajib, sama seperti emission_factors.
  source_standard text NOT NULL,
  source_citation text,
  uncertainty_pct numeric(6,2),
  requires_validation boolean NOT NULL DEFAULT true,
  valid_from      date NOT NULL,
  valid_to        date,
  UNIQUE (crop_id, version)
);

COMMENT ON COLUMN app.allometric_coefficients.requires_validation IS
  'true = koefisien belum divalidasi ahli. UI WAJIB menandai angka turunannya (concept:142).';

-- ===========================================================================
-- 3. supplier: naikkan dari 0005 agar jadi master penuh; lebur dengan vendors
-- ===========================================================================

ALTER TABLE app.suppliers
  ADD COLUMN npwp        text,
  ADD COLUMN address     text,
  ADD COLUMN contact_name text,
  ADD COLUMN phone       text,
  ADD COLUMN is_vendor   boolean NOT NULL DEFAULT false;  -- juga vendor biaya

COMMENT ON TABLE app.suppliers IS
  'Master supplier/vendor tunggal. app.vendors DEPRECATED -- lihat 0016.';

-- ===========================================================================
-- 4. SEEDLING VARIETY -- hilangkan free text di seed_batches
-- ===========================================================================

ALTER TABLE app.seed_batches
  ADD COLUMN variety_item_id uuid REFERENCES app.master_items(id);
COMMENT ON COLUMN app.seed_batches.variety IS
  'DEPRECATED free text -- pakai variety_item_id (concept:200 minimalkan free text).';

-- ===========================================================================
-- 5. Hak akses
-- ===========================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON
  app.master_types, app.master_items, app.fertilizer_types,
  app.fertilizer_schedules, app.allometric_coefficients TO app_rw;
GRANT SELECT ON
  app.master_types, app.master_items, app.fertilizer_types,
  app.fertilizer_schedules, app.allometric_coefficients TO app_ro;

ALTER TABLE app.master_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY mi_tenant ON app.master_items
  USING (company_id IS NULL OR app.company_in_scope(company_id))
  WITH CHECK (company_id IS NULL OR app.company_in_scope(company_id));

ALTER TABLE app.fertilizer_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY ft_tenant ON app.fertilizer_types
  USING (company_id IS NULL OR app.company_in_scope(company_id))
  WITH CHECK (company_id IS NULL OR app.company_in_scope(company_id));

ALTER TABLE app.fertilizer_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY fs_tenant ON app.fertilizer_schedules
  USING (company_id IS NULL OR app.company_in_scope(company_id))
  WITH CHECK (company_id IS NULL OR app.company_in_scope(company_id));

-- ===========================================================================
-- CATATAN PENTING SOAL SEED
--
-- master_types diseed karena itu STRUKTUR (12 tipe wajib dari concept:209).
-- master_items TIDAK diseed. Alasannya:
--
--   docs/01-desain-skema-database.md:1234 semula merencanakan seed dari
--   src/data/*.ts. Rencana itu DIBATALKAN (lihat docs/02 "Sumber kebenaran
--   domain"). Menyeed satuan/kategori dari data dummy akan mencuci angka
--   fabrikasi ke Postgres, membuat aplikasi tampak dinamis sambil membuat
--   acceptance test 6 mustahil lulus.
--
-- Isi master data diinput super_admin lewat UI -- dan justru itu buktinya
-- acceptance test 1 lulus.
--
-- DECISION NEEDED: koefisien allometric_coefficients dan nilai emission_factors
-- harus diekstrak dari dokumen IPCC lalu divalidasi ahli MRV. Struktur sudah
-- siap; nilainya sengaja kosong. Jangan isi dengan angka tebakan.
-- ===========================================================================
