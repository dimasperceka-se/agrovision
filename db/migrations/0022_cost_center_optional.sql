-- 0022_cost_center_optional.sql
--
-- cost_transactions.cost_center_id dibuat NULLABLE.
--
-- Alasannya bukan kenyamanan, tapi koreksi asumsi:
--
--   * 0008_costing.sql menjadikannya NOT NULL karena skema itu diturunkan dari
--     prototype, yang meniru pola ERP Koltiva. Keputusan #1 (docs/02) memilih
--     STANDALONE — jadi cost center tidak lagi wajib ada padanannya di ERP.
--
--   * docs/00-refinement-concept.md:158 menyebut yang wajib adalah "cost
--     categories" (pengadaan bibit, persiapan lahan, pupuk, alat, kendaraan,
--     servis, tenaga kerja, logistik) — itu cost_category_id, master data yang
--     dikelola super_admin. Cost center tidak pernah diminta.
--
--   * Konsekuensi praktisnya: NOT NULL pada kolom yang tidak punya UI dan tidak
--     diminta klien membuat form Pengeluaran mustahil dipakai.
--
-- cost_centers TETAP ADA: berguna bila nanti integrasi ERP diaktifkan, dan
-- activity_types masih merujuknya.

ALTER TABLE app.cost_transactions ALTER COLUMN cost_center_id DROP NOT NULL;

COMMENT ON COLUMN app.cost_transactions.cost_center_id IS
  'Opsional. Klasifikasi utama adalah cost_category_id (master data). '
  'Kolom ini disiapkan untuk pemetaan ke ERP bila integrasi diaktifkan.';

-- Klasifikasi utama justru yang harus dijamin ada.
ALTER TABLE app.cost_transactions
  ADD CONSTRAINT ct_category_required CHECK (cost_category_id IS NOT NULL) NOT VALID;

-- NOT VALID: baris lama (dari fixture uji) tidak diperiksa ulang, tetapi baris
-- baru wajib patuh. Divalidasi setelah data lama dibersihkan:
--   ALTER TABLE app.cost_transactions VALIDATE CONSTRAINT ct_category_required;
