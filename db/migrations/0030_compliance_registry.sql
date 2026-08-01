-- 0030_compliance_registry.sql
--
-- Refine modul Sertifikasi menjadi REGISTRI PERIZINAN & SERTIFIKASI menyeluruh
-- sesuai docs/08-sertifikasi: grup A–H, item beserta penerbit, berlaku untuk
-- kelapa/durian, masa berlaku, dan status pelacakan per entitas.
--
-- compliance_items  = referensi GLOBAL (daftar item dari dokumen).
-- compliance_tracking = status per entitas (tenant-scoped).
--
-- Alur audit Rainforest Alliance yang sudah ada (standards/cert_*) tetap
-- dipertahankan sebagai bagian dari item E (RA kelapa) — registri ini
-- melengkapinya, bukan menggantikannya.

CREATE TYPE app.compliance_status AS ENUM (
  'belum_mulai', 'dalam_proses', 'terbit', 'akan_berakhir', 'tidak_berlaku', 'tidak_relevan'
);

CREATE TABLE app.compliance_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_code      text NOT NULL,      -- 'A'..'H'
  group_label     text NOT NULL,
  code            text NOT NULL UNIQUE, -- 'A1','B9',...
  name            text NOT NULL,
  issuer          text,
  applies_coconut boolean NOT NULL DEFAULT false,
  applies_durian  boolean NOT NULL DEFAULT false,
  validity_note   text,
  is_prerequisite boolean NOT NULL DEFAULT false,
  note            text,
  sort_order      integer NOT NULL DEFAULT 0
);
GRANT SELECT ON app.compliance_items TO app_rw, app_ro;

CREATE TABLE app.compliance_tracking (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid NOT NULL REFERENCES app.companies(id),
  item_code    text NOT NULL REFERENCES app.compliance_items(code),
  status       app.compliance_status NOT NULL DEFAULT 'belum_mulai',
  note         text,
  reference_no text,
  obtained_on  date,
  expires_on   date,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  updated_by   uuid REFERENCES app.users(id),
  UNIQUE (company_id, item_code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON app.compliance_tracking TO app_rw;
GRANT SELECT ON app.compliance_tracking TO app_ro;

ALTER TABLE app.compliance_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.compliance_tracking FORCE ROW LEVEL SECURITY;
CREATE POLICY compliance_tracking_tenant ON app.compliance_tracking
  USING (app.company_in_scope(company_id))
  WITH CHECK (app.company_in_scope(company_id));
-- Hanya approver/super_admin yang boleh mengubah status kepatuhan.
CREATE POLICY compliance_tracking_writer ON app.compliance_tracking
  AS RESTRICTIVE FOR ALL
  USING (true)
  WITH CHECK (app.current_role_name() IN ('approver', 'super_admin'));

-- compliance_items adalah referensi global → daftarkan exempt.
INSERT INTO app.rls_exempt_tables (table_name, reason)
VALUES ('compliance_items', 'daftar item perizinan/sertifikasi; referensi global docs/08')
ON CONFLICT (table_name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Seed item A–H dari docs/08. K = kelapa, D = durian.
-- ---------------------------------------------------------------------------
INSERT INTO app.compliance_items
  (group_code, group_label, code, name, issuer, applies_coconut, applies_durian, validity_note, is_prerequisite, sort_order)
VALUES
  -- A. Perizinan & Legalitas Dasar (prasyarat)
  ('A','Perizinan & Legalitas Dasar','A1','NIB (OSS-RBA)','Lembaga OSS',true,true,null,true,1),
  ('A','Perizinan & Legalitas Dasar','A2','KKPR / kesesuaian RTRW','Pemda / ATR-BPN',true,true,null,true,2),
  ('A','Perizinan & Legalitas Dasar','A3','Persetujuan Lingkungan (AMDAL + RKL-RPL)','KLH / Pemda',true,true,null,true,3),
  ('A','Perizinan & Legalitas Dasar','A4','HGU / alas hak atas tanah','ATR-BPN',true,true,null,true,4),
  ('A','Perizinan & Legalitas Dasar','A5','IUP-B (budidaya ≥25 ha) / IUP','Gubernur / Menteri',true,false,null,true,5),
  ('A','Perizinan & Legalitas Dasar','A6','STD-B (<25 ha, pekebun mitra)','Bupati/Walikota — e-STDB',true,false,null,true,6),
  ('A','Perizinan & Legalitas Dasar','A7','Izin / Tanda Daftar Usaha Hortikultura','Ditjen Hortikultura / Pemda',false,true,null,true,7),
  ('A','Perizinan & Legalitas Dasar','A8','IUP-P (industri pengolahan)','Gubernur / Menteri',true,false,'bila ada pabrik',false,8),
  ('A','Perizinan & Legalitas Dasar','A9','Dokumen FPKM 20% + laporan','Ditjenbun / Pemda',true,false,'≤3 th sejak HGU',true,9),
  ('A','Perizinan & Legalitas Dasar','A10','Persetujuan masyarakat hukum adat','—',true,true,'bila ada ulayat',true,10),
  ('A','Perizinan & Legalitas Dasar','A11','Kesepakatan batas wilayah kerja','—',true,true,null,true,11),
  -- B. Mutu & Keamanan Pangan tingkat kebun
  ('B','Mutu & Keamanan Pangan','B1','Registrasi Kebun (NRK)','Dinas Pertanian Provinsi',false,true,'2 th, surveilen 1×/th',false,12),
  ('B','Mutu & Keamanan Pangan','B2','Sertifikat Prima 3','OKKPD Provinsi',false,true,null,false,13),
  ('B','Mutu & Keamanan Pangan','B3','Sertifikat Prima 2','OKKPD Provinsi',false,true,null,false,14),
  ('B','Mutu & Keamanan Pangan','B4','Sertifikat Prima 1','OKKPD Provinsi',false,true,null,false,15),
  ('B','Mutu & Keamanan Pangan','B5','indoGAP (GAP perkebunan)','Kementan / Ditjenbun',true,false,null,false,16),
  ('B','Mutu & Keamanan Pangan','B6','indoGAP (GAP hortikultura) + SOP + PHT','Kementan / Ditjen Hortikultura',false,true,null,false,17),
  ('B','Mutu & Keamanan Pangan','B7','Registrasi PSAT-PDUK / PSAT-PD','Bapanas / OKKPD',true,true,null,false,18),
  ('B','Mutu & Keamanan Pangan','B8','Registrasi Rumah Kemas','OKKPD Provinsi',true,true,null,false,19),
  ('B','Mutu & Keamanan Pangan','B9','Global G.A.P. IFA (+ GRASP)','LS terakreditasi',true,true,'1 tahun',false,20),
  ('B','Mutu & Keamanan Pangan','B10','ASEAN GAP','—',true,true,null,false,21),
  -- C. Ekspor
  ('C','Sertifikasi & Registrasi Ekspor','C1','Instalasi Karantina Tumbuhan (IKT)','Barantin',false,true,'durian beku ke China',false,22),
  ('C','Sertifikasi & Registrasi Ekspor','C2','Registrasi GACC / CIFER','GACC via Barantin',false,true,'wajib ekspor China',false,23),
  ('C','Sertifikasi & Registrasi Ekspor','C3','Phytosanitary Certificate','Barantin',true,true,'per pengiriman',false,24),
  ('C','Sertifikasi & Registrasi Ekspor','C4','Health Certificate (HC)','OKKPD / Bapanas',true,true,'PSAT',false,25),
  ('C','Sertifikasi & Registrasi Ekspor','C5','Sertifikat Halal','BPJPH',true,true,'produk olahan',false,26),
  ('C','Sertifikasi & Registrasi Ekspor','C6','Izin Edar BPOM (MD)','BPOM',true,true,'olahan kemasan',false,27),
  ('C','Sertifikasi & Registrasi Ekspor','C7','Sertifikat Organik pasar tujuan (NOP/EU/JAS)','LSO terakreditasi',true,true,'segmen organik',false,28),
  -- D. Pabrik / Hilirisasi
  ('D','Sertifikasi Tingkat Pabrik','D1','HACCP','LS terakreditasi',true,true,null,false,29),
  ('D','Sertifikasi Tingkat Pabrik','D2','ISO 22000 / FSSC 22000','LS terakreditasi',true,true,null,false,30),
  ('D','Sertifikasi Tingkat Pabrik','D3','BRCGS / IFS Food','LS terakreditasi',true,true,'ritel Eropa/UK',false,31),
  ('D','Sertifikasi Tingkat Pabrik','D4','ISO 9001','LS terakreditasi',true,true,null,false,32),
  ('D','Sertifikasi Tingkat Pabrik','D5','ISO 14001','LS terakreditasi',true,true,null,false,33),
  ('D','Sertifikasi Tingkat Pabrik','D6','ISO 45001 (K3)','LS terakreditasi',true,true,null,false,34),
  -- E. Keberlanjutan sukarela
  ('E','Keberlanjutan Sukarela','E1','Organik (SNI 6729 / EU 2018/848 / USDA NOP / JAS)','LSO terakreditasi',true,true,'unit audit = lahan',false,35),
  ('E','Keberlanjutan Sukarela','E2','Rainforest Alliance 2020 SAS','LS terakreditasi',true,false,'tidak tersedia utk durian',false,36),
  ('E','Keberlanjutan Sukarela','E3','Fairtrade / Fair for Life','LS terakreditasi',true,false,'koperasi/kelompok',false,37),
  ('E','Keberlanjutan Sukarela','E4','Sustainable Coconut Charter','Ecocert dll.',true,false,null,false,38),
  -- F. Legalitas kayu
  ('F','Legalitas Kayu','F1','SVLK / S-Legalitas','LVLK terakreditasi KAN',true,true,'akhir siklus',false,39),
  ('F','Legalitas Kayu','F3','FSC FM + CoC','LS terakreditasi FSC',true,true,null,false,40),
  -- G. Karbon
  ('G','Karbon & Jasa Lingkungan','G1','Pendaftaran SRN-PPI','KLH',true,true,'wajib mutlak',true,41),
  ('G','Karbon & Jasa Lingkungan','G2','SPE-GRK / SPEI','KLH',true,true,'skema domestik',false,42),
  ('G','Karbon & Jasa Lingkungan','G3','Verra VCS (+ CCB)','Verra',true,true,'ber-MRA dgn SPEI',false,43),
  ('G','Karbon & Jasa Lingkungan','G5','Plan Vivo','Plan Vivo',true,true,'agroforestri masyarakat',false,44),
  ('G','Karbon & Jasa Lingkungan','G7','Validator/verifikator (VVB) terakreditasi','KAN / UNFCCC',true,true,'wajib',false,45),
  -- H. Kerangka pemberi pinjaman
  ('H','Kerangka Pemberi Pinjaman','H1','IFC Performance Standards 1–8','—',true,true,'standar induk',false,46),
  ('H','Kerangka Pemberi Pinjaman','H3','ESIA (lebih dalam dari AMDAL)','—',true,true,'PS1',false,47),
  ('H','Kerangka Pemberi Pinjaman','H5','HCV assessment (assessor HCVRN)','assessor berlisensi',true,true,'PS6 — jendela tertutup setelah tanam',true,48),
  ('H','Kerangka Pemberi Pinjaman','H6','HCS Approach assessment','—',true,true,'PS6',true,49),
  ('H','Kerangka Pemberi Pinjaman','H7','FPIC masyarakat adat','—',true,true,'PS7 — syarat, bukan formalitas',true,50)
ON CONFLICT (code) DO NOTHING;
