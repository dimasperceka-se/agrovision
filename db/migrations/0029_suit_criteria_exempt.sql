-- 0029_suit_criteria_exempt.sql
--
-- land_suit_criteria adalah tabel REFERENSI GLOBAL (tanpa company_id), seperti
-- emission_factors dan crops. Ia harus terdaftar di rls_exempt_tables, kalau
-- tidak app.check_rls_coverage() menandainya sebagai lubang.
--
-- Invariant itu bekerja sebagaimana mestinya: tabel baru yang lupa didaftarkan
-- langsung ketahuan oleh health check dan uji adversarial. Ini yang menangkapnya.

INSERT INTO app.rls_exempt_tables (table_name, reason)
VALUES ('land_suit_criteria', 'kriteria kesesuaian lahan; referensi global BBSDLP, read-only bagi aplikasi')
ON CONFLICT (table_name) DO NOTHING;
