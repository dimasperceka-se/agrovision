-- 0032_organic_certification.sql
--
-- Fokuskan modul Sertifikasi pada SERTIFIKASI ORGANIK (docs/10).
--
-- organic_items    = referensi GLOBAL: standar per pasar (kind='standard') dan
--                    bukti riwayat lahan K1–K7 (kind='evidence').
-- organic_tracking = status per entitas (tenant-scoped).
--
-- Catatan lingkup (docs/10): sertifikasi organik berdiri DI ATAS legalitas
-- dasar (NIB/KKPR/AMDAL/HGU/IUP-B/STD-B/FPKM) — tidak menggantikannya. Registri
-- perizinan A–H (migrasi 0030) tetap ada sebagai prasyarat.

CREATE TYPE app.organic_status AS ENUM (
  'belum_mulai', 'dalam_proses', 'in_conversion', 'tersertifikasi', 'tidak_relevan'
);

CREATE TABLE app.organic_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind            text NOT NULL CHECK (kind IN ('standard', 'evidence')),
  code            text NOT NULL UNIQUE,
  name            text NOT NULL,
  market          text,               -- pasar tujuan (standar) / null (bukti)
  detail          text,               -- regulasi (standar) / catatan (bukti)
  issuer          text,               -- lembaga penerbit (standar)
  applies_coconut boolean NOT NULL DEFAULT true,
  applies_durian  boolean NOT NULL DEFAULT true,
  is_prerequisite boolean NOT NULL DEFAULT false, -- bukti K wajib sebelum tanam
  sort_order      integer NOT NULL DEFAULT 0
);
GRANT SELECT ON app.organic_items TO app_rw, app_ro;

CREATE TABLE app.organic_tracking (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid NOT NULL REFERENCES app.companies(id),
  item_code    text NOT NULL REFERENCES app.organic_items(code),
  status       app.organic_status NOT NULL DEFAULT 'belum_mulai',
  reference_no text,
  note         text,
  obtained_on  date,
  expires_on   date,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  updated_by   uuid REFERENCES app.users(id),
  UNIQUE (company_id, item_code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON app.organic_tracking TO app_rw;
GRANT SELECT ON app.organic_tracking TO app_ro;

ALTER TABLE app.organic_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.organic_tracking FORCE ROW LEVEL SECURITY;
CREATE POLICY organic_tracking_tenant ON app.organic_tracking
  USING (app.company_in_scope(company_id))
  WITH CHECK (app.company_in_scope(company_id));
CREATE POLICY organic_tracking_writer ON app.organic_tracking
  AS RESTRICTIVE FOR ALL
  USING (true)
  WITH CHECK (app.current_role_name() IN ('creator', 'approver', 'super_admin'));

INSERT INTO app.rls_exempt_tables (table_name, reason)
VALUES ('organic_items', 'daftar standar organik & bukti riwayat lahan; referensi global docs/10')
ON CONFLICT (table_name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Standar organik per pasar tujuan (docs/10 §2).
-- ---------------------------------------------------------------------------
INSERT INTO app.organic_items
  (kind, code, name, market, detail, issuer, applies_coconut, applies_durian, is_prerequisite, sort_order)
VALUES
  ('standard','SNI','SNI 6729:2016 Sistem Pertanian Organik','Indonesia (domestik)','Permentan 64/2013; Perka BPOM 1/2017','LSO terakreditasi KAN — logo ORGANIK Indonesia',true,true,false,1),
  ('standard','EU','Regulation (EU) 2018/848','Uni Eropa','+2021/1165, 2021/279, 2021/1698 — rezim compliance penuh sejak 2025','Control Body diakui EU',true,true,false,2),
  ('standard','NOP','USDA NOP (7 CFR Part 205)','Amerika Serikat','7 CFR Part 205; §205.602(g) KCl','Accredited Certifying Agent (ACA)',true,true,false,3),
  ('standard','JAS','JAS Organic','Jepang','Japanese Agricultural Standard','Registered Certifying Body (RCB)',true,true,false,4),
  ('standard','GBT','GB/T 19630','China','Rezim organik China — sertifikat asing umumnya tidak diakui','LSO terakreditasi CNCA',true,true,false,5),
  ('standard','KR','Standar organik MAFRA/NAQS','Korea Selatan',null,'LSO terakreditasi Korea',true,true,false,6),
  ('standard','COR','COR / CAN-CGSB-32.310','Kanada','Canada Organic Regime','ACA COR',true,true,false,7),
  ('standard','CH','Bio Suisse','Swiss','Standar privat, lebih ketat dari EU','Bio Suisse licensee',true,true,false,8),
  ('standard','DE','Naturland / Demeter (biodinamik)','Jerman/premium','Standar privat','LS terakreditasi',true,true,false,9)
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Bukti riwayat lahan K1–K7 (docs/10 §4.2) — wajib SEBELUM tanam.
-- Jendela pengakuan retroaktif 36 bulan tertutup permanen begitu lahan dibuka.
-- ---------------------------------------------------------------------------
INSERT INTO app.organic_items
  (kind, code, name, detail, is_prerequisite, sort_order)
VALUES
  ('evidence','K1','Citra satelit time-series 10–15 tahun (Landsat/Sentinel)','Sekaligus baseline karbon & HCV — satu pekerjaan, tiga fungsi',true,11),
  ('evidence','K2','Peta tutupan lahan historis resmi','KLH / Kementerian Kehutanan',true,12),
  ('evidence','K3','Pernyataan riwayat input pemilik/penggarap sebelumnya','Diverifikasi, bukan sekadar surat pernyataan',true,13),
  ('evidence','K4','Survei lapangan kondisi awal + foto bergeotag','Sebelum land clearing',true,14),
  ('evidence','K5','Analisis residu pestisida tanah (baseline)','Membuktikan tidak ada residu bahan terlarang',true,15),
  ('evidence','K6','Dokumen alas hak & riwayat penguasaan','Juga syarat PS5/PS7 pemberi pinjaman',true,16),
  ('evidence','K7','Peta batas blok berkoordinat, disimpan permanen','Dasar penelusuran',true,17)
ON CONFLICT (code) DO NOTHING;
