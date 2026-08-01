-- 0019_privilege_ledger.sql
--
-- Menambal bug yang ditemukan uji adversarial pada db/bootstrap-role.mjs:
--
--   `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA app TO app_rw`
--   MENGEMBALIKAN hak yang sudah dicabut. bootstrap hanya mencabut ulang 4 tabel
--   append-only, sehingga user_company_access dan user_estate_access kembali
--   bisa ditulis aplikasi -- persis lubang CRITICAL yang 0018 tutup.
--
-- Penyebab akarnya: daftar pencabutan hidup di DUA tempat (migrasi dan skrip
-- bootstrap), dan yang satu tidak tahu isi yang lain. Diperbaiki dengan
-- menjadikan pencabutan sebagai DATA -- satu sumber kebenaran yang dibaca
-- bootstrap dan diperiksa uji.
--
-- Catatan: 0018 tidak diedit karena sudah diterapkan dan ter-checksum di
-- app.schema_migrations. Runner menolak perubahan migrasi yang sudah jalan;
-- perbaikan selalu jadi berkas baru.

CREATE TABLE app.privilege_revocations (
  table_name text NOT NULL,
  privileges text NOT NULL,     -- mis. 'UPDATE, DELETE'
  reason     text NOT NULL,
  PRIMARY KEY (table_name, privileges)
);

COMMENT ON TABLE app.privilege_revocations IS
  'Sumber kebenaran tunggal untuk hak yang HARUS dicabut dari app_rw. '
  'Dibaca db/bootstrap-role.mjs setelah GRANT blanket, dan diperiksa '
  'db/verify-adversarial.mjs. Tabel append-only baru WAJIB didaftarkan di sini.';

INSERT INTO app.privilege_revocations (table_name, privileges, reason) VALUES
  -- Append-only: bukti dan provenance tidak boleh diubah diam-diam.
  ('audit_log',              'UPDATE, DELETE', 'jejak audit append-only (0012 §3.7)'),
  ('evidence_files',         'UPDATE, DELETE', 'integritas bukti; verifikasi lewat evidence_verifications'),
  ('emission_factors',       'UPDATE, DELETE', 'provenance MRV; terbit hanya via publish_emission_factor'),
  ('evidence_verifications', 'UPDATE, DELETE', 'hasil verifikasi append-only'),
  -- Data otorisasi: kalau aplikasi bisa menulisnya, seluruh model tenant runtuh.
  ('user_company_access',    'INSERT, UPDATE, DELETE', 'otorisasi tenant; hanya via grant_company_access()'),
  ('user_estate_access',     'INSERT, UPDATE, DELETE', 'otorisasi estate; hanya via fungsi bergerbang'),
  -- Referensi sistem: menghapus satu tipe menghapus seluruh dropdown (CASCADE).
  ('master_types',           'DELETE',         'tipe master sistem tidak boleh dihapus aplikasi');

GRANT SELECT ON app.privilege_revocations TO app_rw, app_ro;

-- Terapkan sekarang, dari ledger itu sendiri -- sehingga migrasi ini juga
-- memperbaiki state database yang sudah rusak akibat bootstrap sebelumnya.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT table_name, privileges FROM app.privilege_revocations LOOP
    EXECUTE format('REVOKE %s ON app.%I FROM app_rw', r.privileges, r.table_name);
  END LOOP;
END $$;

-- Fungsi pemeriksa: mengembalikan pelanggaran yang masih ada. Dipakai uji
-- dan bisa dijalankan kapan saja sebagai health check produksi.
CREATE OR REPLACE FUNCTION app.check_privilege_revocations()
RETURNS TABLE (table_name text, privilege text)
LANGUAGE sql STABLE AS $$
  SELECT pr.table_name, p.priv
    FROM app.privilege_revocations pr
    CROSS JOIN LATERAL unnest(string_to_array(replace(pr.privileges, ' ', ''), ',')) AS p(priv)
   WHERE has_table_privilege('app_rw', 'app.' || quote_ident(pr.table_name), p.priv)
$$;

GRANT EXECUTE ON FUNCTION app.check_privilege_revocations() TO app_rw, app_ro;

-- Seed `crops` -- referensi global, dibutuhkan hampir semua modul operasional.
-- Ini STRUKTUR domain (komoditas proyek), bukan angka fabrikasi: dokumen konsep
-- baris 12 menyebut Durian dan Kelapa secara eksplisit.
INSERT INTO app.crops (code, name, scientific_name, is_tree, track_individual_trees) VALUES
  ('DURIAN',  'Durian', 'Durio zibethinus', true, false),
  ('COCONUT', 'Kelapa', 'Cocos nucifera',   true, false)
ON CONFLICT (code) DO NOTHING;

-- DECISION NEEDED: apakah durian dilacak per pohon? Bila ya,
-- UPDATE app.crops SET track_individual_trees = true WHERE code = 'DURIAN';
-- Konsekuensinya pendataan lapangan per pohon -- lihat docs/03 §12 no.1.
