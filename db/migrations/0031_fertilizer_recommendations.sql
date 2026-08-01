-- 0031_fertilizer_recommendations.sql
--
-- Refine modul Pemupukan (docs/09): rekomendasi pemupukan per blok, disusun
-- menurut PENDEKATAN (uji tanah / analisis jaringan / neraca hara) dan FASE
-- (vegetatif / generatif / pemulihan). Parameter input disimpan sebagai JSONB
-- sesuai pendekatan; dosis diisi manual oleh agronom.
--
-- CATATAN DOKTRIN (docs/09 §5, §11): tidak ada dosis valid tanpa data lokal.
-- Sistem TIDAK mengarang angka — ia menampung parameter dan rekomendasi yang
-- diisi profesional, dan menandainya PROVISIONAL sampai terkalibrasi omission
-- plot (3–5 tahun). Kolom dosis boleh NULL.

CREATE TYPE app.fert_approach AS ENUM ('uji_tanah', 'analisis_jaringan', 'neraca_hara');
CREATE TYPE app.fert_phase AS ENUM ('vegetatif', 'generatif', 'pemulihan');

CREATE TABLE app.fertilizer_recommendations (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     uuid NOT NULL REFERENCES app.companies(id),
  block_id       uuid NOT NULL REFERENCES app.blocks(id),
  crop_code      text NOT NULL CHECK (crop_code IN ('DURIAN', 'COCONUT')),
  phase          app.fert_phase NOT NULL,
  approach       app.fert_approach NOT NULL,
  params         jsonb NOT NULL DEFAULT '{}',      -- parameter sesuai pendekatan
  -- Dosis hara (g/pohon/tahun). NULL = belum ditetapkan. Bukan angka default.
  dose_n_g       numeric(10,1),
  dose_p2o5_g    numeric(10,1),
  dose_k2o_g     numeric(10,1),
  dose_mgo_g     numeric(10,1),
  dose_s_g       numeric(10,1),
  k_source       text CHECK (k_source IN ('KCl', 'K2SO4', 'KNO3')),
  split_count    integer CHECK (split_count IS NULL OR split_count BETWEEN 1 AND 12),
  is_provisional boolean NOT NULL DEFAULT true,
  note           text,
  recommended_at date NOT NULL DEFAULT current_date,
  created_by     uuid REFERENCES app.users(id),
  updated_by     uuid REFERENCES app.users(id),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  -- Satu rekomendasi aktif per blok × komoditas × fase.
  UNIQUE (block_id, crop_code, phase)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON app.fertilizer_recommendations TO app_rw;
GRANT SELECT ON app.fertilizer_recommendations TO app_ro;

ALTER TABLE app.fertilizer_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.fertilizer_recommendations FORCE ROW LEVEL SECURITY;

CREATE POLICY fert_reco_tenant ON app.fertilizer_recommendations
  USING (app.company_in_scope(company_id))
  WITH CHECK (app.company_in_scope(company_id));

-- Pembaca (viewer) tidak boleh menulis; petugas lapangan ke atas boleh.
CREATE POLICY fert_reco_writer ON app.fertilizer_recommendations
  AS RESTRICTIVE FOR ALL
  USING (true)
  WITH CHECK (app.current_role_name() IN ('creator', 'approver', 'super_admin'));
