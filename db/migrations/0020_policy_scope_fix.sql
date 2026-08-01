-- 0020_policy_scope_fix.sql
--
-- Dua temuan dari uji adversarial atas 0018/0019.

-- ===========================================================================
-- 1. report_builtin_protect memblokir BACA, bukan hanya tulis
--
-- 0018 §5 membuatnya `AS RESTRICTIVE FOR ALL USING (NOT is_builtin OR super_admin)`.
-- RESTRICTIVE FOR ALL ikut berlaku pada SELECT, sehingga 3 laporan built-in
-- menjadi TIDAK TERLIHAT oleh creator/approver/viewer -- padahal justru itu
-- laporan yang harus mereka jalankan. Niatnya melindungi dari tulis, akibatnya
-- menyembunyikan produk utamanya.
--
-- Pelajaran umum: pada RESTRICTIVE, `USING` menyaring baris untuk SELECT dan
-- untuk baris LAMA pada UPDATE/DELETE. Bila yang ingin dibatasi hanya penulisan,
-- policy harus dipisah per perintah -- jangan FOR ALL.
-- ===========================================================================

DROP POLICY report_builtin_protect ON app.report_definitions;

CREATE POLICY report_builtin_no_update ON app.report_definitions
  AS RESTRICTIVE FOR UPDATE
  USING (NOT is_builtin OR app.current_role_name() = 'super_admin')
  WITH CHECK (NOT is_builtin OR app.current_role_name() = 'super_admin');

CREATE POLICY report_builtin_no_delete ON app.report_definitions
  AS RESTRICTIVE FOR DELETE
  USING (NOT is_builtin OR app.current_role_name() = 'super_admin');

CREATE POLICY report_builtin_no_insert ON app.report_definitions
  AS RESTRICTIVE FOR INSERT
  WITH CHECK (NOT is_builtin OR app.current_role_name() = 'super_admin');

-- SELECT sengaja tidak dibatasi: laporan built-in adalah referensi global
-- (company_id NULL) dan harus terbaca semua peran, termasuk viewer.

-- ===========================================================================
-- 2. privilege_revocations sendiri belum ber-RLS dan belum terdaftar exempt
--
-- Ditangkap oleh uji invariant "tidak ada tabel tanpa RLS di luar daftar exempt"
-- -- yaitu tepat kelas kelalaian yang menyebabkan 0014 bocor. Invariantnya bekerja.
-- ===========================================================================

INSERT INTO app.rls_exempt_tables (table_name, reason) VALUES
  ('privilege_revocations', 'ledger hak akses, bukan data tenant; read-only bagi aplikasi'),
  ('schema_migrations',     'ledger migrasi, bukan data tenant')
ON CONFLICT (table_name) DO NOTHING;

-- ===========================================================================
-- 3. Pengaman agar kelalaian yang sama tidak terulang
--
-- Fungsi ini mengembalikan tabel yang tidak ber-RLS dan tidak terdaftar exempt.
-- Dipakai uji, dan bisa dijalankan sebagai health check produksi. Menjadikan
-- "lupa mengaktifkan RLS" sebagai kegagalan yang terlihat, bukan lubang senyap.
-- ===========================================================================

CREATE OR REPLACE FUNCTION app.check_rls_coverage()
RETURNS TABLE (table_name text, issue text)
LANGUAGE sql STABLE AS $$
  -- Tabel tanpa RLS yang tidak dinyatakan exempt.
  SELECT c.relname::text, 'RLS tidak aktif dan tidak terdaftar exempt'
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'app' AND c.relkind = 'r' AND NOT c.relrowsecurity
     AND c.relname NOT IN (SELECT table_name FROM app.rls_exempt_tables)
  UNION ALL
  -- Tabel ber-RLS tapi tanpa policy: menolak segalanya secara senyap.
  SELECT c.relname::text, 'RLS aktif tapi tidak punya policy'
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'app' AND c.relkind = 'r' AND c.relrowsecurity
     AND NOT EXISTS (SELECT 1 FROM pg_policies p
                      WHERE p.schemaname = 'app' AND p.tablename = c.relname)
  UNION ALL
  -- View yang lupa security_invoker: membocorkan data lintas tenant.
  SELECT c.relname::text, 'view tanpa security_invoker'
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'app' AND c.relkind = 'v'
     AND COALESCE(array_to_string(c.reloptions, ','), '') NOT LIKE '%security_invoker=true%'
$$;

GRANT EXECUTE ON FUNCTION app.check_rls_coverage() TO app_rw, app_ro;

COMMENT ON FUNCTION app.check_rls_coverage IS
  'Health check: harus mengembalikan NOL baris. Setiap baris adalah lubang keamanan.';
