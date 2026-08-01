-- 0035_fix_pending_view_security_invoker.sql
--
-- Perbaikan regresi 0034: CREATE OR REPLACE VIEW v_pending_approvals (untuk
-- menambah cabang weeding/spraying/harvest) TANPA sengaja menghapus opsi
-- security_invoker yang dipasang di 0025. Tanpa opsi itu, view berjalan dengan
-- hak pemilik dan MEM-BYPASS RLS pemanggil — inbox approval jadi bocor lintas
-- tenant dan uji approval gagal.
--
-- security_invoker = true memaksa view menghormati RLS peran app_rw pemanggil.

ALTER VIEW app.v_pending_approvals SET (security_invoker = true);
