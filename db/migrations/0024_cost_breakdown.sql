-- 0024_cost_breakdown.sql
--
-- Dua hal:
--   1. View rincian biaya per komponen (kategori & sub-kategori) -- concept:158
--      menyebut 8 komponen biaya perkebunan secara spesifik.
--   2. Deteksi data demo, supaya tidak pernah terbawa diam-diam ke produksi.

-- ===========================================================================
-- 1. Rincian biaya per komponen
--
-- cost_category bersifat berjenjang (master_types.is_hierarchical = true sejak
-- 0015). View ini menggulung sub-kategori ke induknya sekaligus menyimpan
-- rinciannya, sehingga satu query melayani "biaya per komponen" maupun
-- "biaya per sub-komponen".
-- ===========================================================================

CREATE VIEW app.v_spend_by_category
WITH (security_invoker = true) AS
SELECT
  ct.company_id,
  COALESCE(parent.id, cat.id)     AS category_id,
  COALESCE(parent.name, cat.name) AS category_name,
  CASE WHEN parent.id IS NULL THEN NULL ELSE cat.id END   AS subcategory_id,
  CASE WHEN parent.id IS NULL THEN NULL ELSE cat.name END AS subcategory_name,
  ct.fiscal_period_id,
  count(*)                        AS transaction_count,
  sum(ct.amount_idr)              AS total_idr,
  -- Overhead dipisah: ia tidak melekat blok, jadi cost/ha butuh alokasi.
  sum(CASE WHEN ct.is_overhead THEN ct.amount_idr ELSE 0 END) AS overhead_idr
FROM app.cost_transactions ct
JOIN app.master_items cat    ON cat.id = ct.cost_category_id
LEFT JOIN app.master_items parent ON parent.id = cat.parent_id
WHERE ct.approval_status = 'approved'
GROUP BY 1,2,3,4,5,6;

COMMENT ON VIEW app.v_spend_by_category IS
  'Biaya disetujui per komponen. subcategory_* NULL berarti barisnya kategori induk.';

INSERT INTO app.report_allowed_views (view_name, note)
VALUES ('v_spend_by_category', 'Rincian biaya per komponen & sub-komponen')
ON CONFLICT (view_name) DO NOTHING;

GRANT SELECT ON app.v_spend_by_category TO app_rw, app_ro;

-- ===========================================================================
-- 2. Deteksi data demo
--
-- Data demo sah untuk menilai tampilan, tetapi TIDAK BOLEH terbawa ke
-- lingkungan produksi tanpa disadari. Penandanya diletakkan di tingkat entitas
-- supaya satu query bisa memastikannya, dan check_production_readiness()
-- menaikkannya menjadi penghalang.
-- ===========================================================================

ALTER TABLE app.companies ADD COLUMN is_demo boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN app.companies.is_demo IS
  'true = entitas berisi data contoh untuk keperluan demo/pengembangan. '
  'Wajib nol di produksi -- lihat app.check_production_readiness().';

-- Entitas dev yang sudah ada ditandai.
UPDATE app.companies SET is_demo = true WHERE code IN ('DEV', 'DEMO');

CREATE OR REPLACE FUNCTION app.check_production_readiness()
RETURNS TABLE (item text, blocking boolean, detail text)
LANGUAGE sql STABLE AS $$
  SELECT 'login stub masih aktif'::text, true,
         'app.lookup_login_email masih ada; verifikasi ID token Identity Platform belum terpasang'::text
   WHERE EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                  WHERE n.nspname = 'app' AND p.proname = 'lookup_login_email')
  UNION ALL
  -- BARU: data demo tidak boleh ikut ke produksi.
  SELECT 'data demo masih ada', true,
         'entitas "' || name || '" (' || code || ') ditandai is_demo. Jalankan npm run db:purge:demo'
    FROM app.companies WHERE is_demo
  UNION ALL
  SELECT 'cakupan RLS bocor', true, table_name || ': ' || issue
    FROM app.check_rls_coverage()
  UNION ALL
  SELECT 'pencabutan hak bocor', true, table_name || '.' || privilege
    FROM app.check_privilege_revocations()
  UNION ALL
  SELECT 'koefisien alometrik belum divalidasi', false,
         COALESCE(crop_id::text, '(global)') || ' versi ' || version
    FROM app.allometric_coefficients WHERE requires_validation
  UNION ALL
  SELECT 'emission factor tanpa sitasi', false, code || ' v' || version
    FROM app.emission_factors WHERE source_citation IS NULL
  UNION ALL
  SELECT 'periode fiskal belum didefinisikan', false,
         'app.fiscal_periods kosong; keputusan #6 butuh nama & rentang fase dari klien'
   WHERE NOT EXISTS (SELECT 1 FROM app.fiscal_periods)
$$;
