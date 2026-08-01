-- 0021_login_lookup.sql
--
-- Melengkapi resolusi login. 0018 §3 menambahkan app.resolve_session(external_id)
-- untuk memuat sesi dari subject Identity Platform, tetapi belum ada jalan
-- menemukan external_id itu pada saat login pertama.
--
-- Tanpa ini, src/lib/session.ts terkena deadlock bootstrap yang sama:
-- app.users tertutup RLS, dan konteks yang dibutuhkan justru belum ada.

-- citext dikualifikasi eksplisit (public.citext) alih-alih menambahkan `public`
-- ke search_path: fungsi SECURITY DEFINER sebaiknya search_path-nya sesempit
-- mungkin supaya tidak bisa dibajak lewat objek bernama sama di schema lain.
CREATE OR REPLACE FUNCTION app.lookup_login_email(p_email text)
RETURNS TABLE (external_id text, user_id uuid)
LANGUAGE sql SECURITY DEFINER SET search_path = app, pg_catalog AS $$
  SELECT u.external_id, u.id
    FROM app.users u
   WHERE u.email = p_email::public.citext AND u.is_active
$$;

REVOKE ALL ON FUNCTION app.lookup_login_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.lookup_login_email(text) TO app_rw;

COMMENT ON FUNCTION app.lookup_login_email IS
  'HANYA untuk login stub pra-Identity-Platform. Memetakan email -> external_id. '
  'HAPUS fungsi ini begitu login lewat verifikasi ID token terpasang: alur produksi '
  'memperoleh external_id dari klaim `sub` JWT, tidak perlu pencarian by email. '
  'Selama masih ada, pemegang koneksi app_rw bisa menguji keberadaan sebuah email.';

-- ===========================================================================
-- Pemeriksa kesiapan produksi.
--
-- Mengembalikan daftar hal yang HARUS beres sebelum deploy publik. Dibuat
-- sebagai fungsi supaya bisa dijalankan di pipeline, bukan sebagai catatan
-- di dokumen yang mudah terlewat.
-- ===========================================================================

CREATE OR REPLACE FUNCTION app.check_production_readiness()
RETURNS TABLE (item text, blocking boolean, detail text)
LANGUAGE sql STABLE AS $$
  -- Login stub masih terpasang.
  SELECT 'login stub masih aktif'::text, true,
         'app.lookup_login_email masih ada; verifikasi ID token Identity Platform belum terpasang'::text
   WHERE EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                  WHERE n.nspname = 'app' AND p.proname = 'lookup_login_email')
  UNION ALL
  -- Lubang RLS.
  SELECT 'cakupan RLS bocor', true, table_name || ': ' || issue
    FROM app.check_rls_coverage()
  UNION ALL
  -- Pencabutan hak yang tidak berlaku.
  SELECT 'pencabutan hak bocor', true, table_name || '.' || privilege
    FROM app.check_privilege_revocations()
  UNION ALL
  -- Koefisien karbon belum divalidasi ahli.
  SELECT 'koefisien alometrik belum divalidasi', false,
         COALESCE(crop_id::text, '(global)') || ' versi ' || version
    FROM app.allometric_coefficients WHERE requires_validation
  UNION ALL
  -- Emission factor tanpa provenance yang jelas.
  SELECT 'emission factor tanpa sitasi', false, code || ' v' || version
    FROM app.emission_factors WHERE source_citation IS NULL
  UNION ALL
  -- Periode fiskal belum didefinisikan -> budget tidak bisa dibandingkan.
  SELECT 'periode fiskal belum didefinisikan', false,
         'app.fiscal_periods kosong; keputusan #6 butuh nama & rentang fase dari klien'
   WHERE NOT EXISTS (SELECT 1 FROM app.fiscal_periods)
$$;

GRANT EXECUTE ON FUNCTION app.check_production_readiness() TO app_rw, app_ro;

COMMENT ON FUNCTION app.check_production_readiness IS
  'Baris dengan blocking = true harus nol sebelum deploy publik.';
