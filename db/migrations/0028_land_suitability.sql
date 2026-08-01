-- 0028_land_suitability.sql
--
-- Mesin kesesuaian lahan metode MATCHING + hukum minimum Liebig (BBSDLP).
-- Lihat docs/07-kesesuaian-lahan.
--
-- Kriteria kelas disimpan sebagai DATA (tabel land_suit_criteria), bukan
-- hardcoded — supaya bisa diedit dan sumbernya bisa diganti ke versi resmi.
-- Logika matching ada di src/lib/repo/suitability.ts.
--
-- PERINGATAN yang WAJIB tampil di UI (dari dokumen sumber):
--   * Angka dihimpun dari jurnal yang mengutip BBSDLP, bukan buku aslinya;
--     antar-jurnal ada inkonsistensi (terutama iklim durian).
--   * Kesesuaian FISIK ≠ kelayakan EKONOMI.
--   * Jangan campur metode; ini memakai satu set (BBSDLP/Djaenudin Versi A).
-- Peringatan ini bukan hiasan — ia bagian dari kebenaran hasilnya.

CREATE TABLE app.land_suit_criteria (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crop_id     uuid NOT NULL REFERENCES app.crops(id),
  char_code   text NOT NULL,        -- 'temperatur', 'curah_hujan', ...
  char_label  text NOT NULL,
  symbol      text NOT NULL,        -- kualitas lahan BBSDLP: tc, wa, oa, rc, nr, na, xc, eh, lp
  unit        text,
  is_numeric  boolean NOT NULL,
  sort_order  integer NOT NULL DEFAULT 0,
  -- bands: array {cls, min, max} (numeric) atau {cls, set:[...]} (kategorik).
  -- Satu kelas boleh punya beberapa band (mis. S2 punya dua rentang).
  bands       jsonb NOT NULL,
  source      text NOT NULL,
  UNIQUE (crop_id, char_code)
);
GRANT SELECT ON app.land_suit_criteria TO app_rw, app_ro;

-- Kriteria global (referensi). Diisi untuk COCONUT (§2) & DURIAN Versi A (§3A).
INSERT INTO app.land_suit_criteria (crop_id, char_code, char_label, symbol, unit, is_numeric, sort_order, bands, source)
SELECT c.id, x.char_code, x.char_label, x.symbol, x.unit, x.is_numeric, x.sort_order, x.bands::jsonb,
       'BBSDLP/Djaenudin — dihimpun dari jurnal, perlu validasi ke sumber primer'
FROM app.crops c
JOIN (VALUES
  -- ================= KELAPA (Cocos nucifera), §2 =================
  ('COCONUT','temperatur','Temperatur rerata','tc','°C',true,1,
   '[{"cls":"S1","min":25,"max":28},{"cls":"S2","min":23,"max":25},{"cls":"S2","min":28,"max":32},{"cls":"S3","min":20,"max":23},{"cls":"S3","min":32,"max":35},{"cls":"N","min":null,"max":20},{"cls":"N","min":35,"max":null}]'),
  ('COCONUT','curah_hujan','Curah hujan','wa','mm/th',true,2,
   '[{"cls":"S1","min":2000,"max":3000},{"cls":"S2","min":1300,"max":2000},{"cls":"S2","min":3000,"max":4000},{"cls":"S3","min":1000,"max":1300},{"cls":"S3","min":4000,"max":5000},{"cls":"N","min":null,"max":1000},{"cls":"N","min":5000,"max":null}]'),
  ('COCONUT','drainase','Drainase','oa',null,false,3,
   '[{"cls":"S1","set":["baik","sedang"]},{"cls":"S2","set":["agak terhambat"]},{"cls":"S3","set":["terhambat","agak cepat"]},{"cls":"N","set":["sangat terhambat","cepat"]}]'),
  ('COCONUT','tekstur','Tekstur','rc',null,false,4,
   '[{"cls":"S1","set":["halus","agak halus","sedang"]},{"cls":"S2","set":["agak kasar"]},{"cls":"S3","set":["sangat halus"]},{"cls":"N","set":["kasar"]}]'),
  ('COCONUT','bahan_kasar','Bahan kasar','rc','%',true,5,
   '[{"cls":"S1","min":null,"max":15},{"cls":"S2","min":15,"max":35},{"cls":"S3","min":35,"max":55},{"cls":"N","min":55,"max":null}]'),
  ('COCONUT','kedalaman_tanah','Kedalaman tanah','rc','cm',true,6,
   '[{"cls":"S1","min":100,"max":null},{"cls":"S2","min":75,"max":100},{"cls":"S3","min":50,"max":75},{"cls":"N","min":null,"max":50}]'),
  ('COCONUT','ktk','KTK liat','nr','cmol/kg',true,7,
   '[{"cls":"S1","min":25,"max":null},{"cls":"S2","min":17,"max":25},{"cls":"S3","min":5,"max":17},{"cls":"N","min":null,"max":5}]'),
  ('COCONUT','ph','pH H2O','nr',null,true,8,
   '[{"cls":"S1","min":5.2,"max":7.5},{"cls":"S2","min":4.8,"max":5.2},{"cls":"S2","min":7.5,"max":8.0},{"cls":"S3","min":8.0,"max":null}]'),
  ('COCONUT','c_organik','C-organik','nr','%',true,9,
   '[{"cls":"S1","min":0.8,"max":null},{"cls":"S2","min":null,"max":0.8}]'),
  ('COCONUT','lereng','Lereng','eh','%',true,10,
   '[{"cls":"S1","min":null,"max":8},{"cls":"S2","min":8,"max":16},{"cls":"S3","min":16,"max":30},{"cls":"N","min":30,"max":null}]'),
  ('COCONUT','batuan_permukaan','Batuan permukaan','lp','%',true,11,
   '[{"cls":"S1","min":null,"max":5},{"cls":"S2","min":5,"max":15},{"cls":"S3","min":15,"max":40},{"cls":"N","min":40,"max":null}]'),

  -- ================= DURIAN (Durio zibethinus), §3A =================
  ('DURIAN','temperatur','Temperatur rerata','tc','°C',true,1,
   '[{"cls":"S1","min":22,"max":28},{"cls":"S2","min":18,"max":22},{"cls":"S2","min":28,"max":34},{"cls":"S3","min":15,"max":18},{"cls":"S3","min":34,"max":40},{"cls":"N","min":null,"max":15},{"cls":"N","min":40,"max":null}]'),
  ('DURIAN','curah_hujan','Curah hujan','wa','mm/th',true,2,
   '[{"cls":"S1","min":1000,"max":2000},{"cls":"S2","min":500,"max":1000},{"cls":"S2","min":2000,"max":3000},{"cls":"S3","min":250,"max":500},{"cls":"S3","min":3000,"max":4000},{"cls":"N","min":null,"max":250},{"cls":"N","min":4000,"max":null}]'),
  ('DURIAN','drainase','Drainase','oa',null,false,3,
   '[{"cls":"S1","set":["baik","sedang"]},{"cls":"S2","set":["agak terhambat"]},{"cls":"S3","set":["terhambat","agak cepat"]},{"cls":"N","set":["cepat","sangat cepat"]}]'),
  ('DURIAN','tekstur','Tekstur lapisan atas','rc',null,false,4,
   '[{"cls":"S1","set":["halus","sedang"]},{"cls":"N","set":["kasar"]}]'),
  ('DURIAN','ktk','KTK','nr','cmol/kg',true,5,
   '[{"cls":"S1","min":16,"max":null},{"cls":"S2","min":null,"max":16}]'),
  ('DURIAN','ph','pH tanah','nr',null,true,6,
   '[{"cls":"S1","min":5.0,"max":6.0},{"cls":"S2","min":4.5,"max":5.0},{"cls":"S2","min":6.0,"max":7.5},{"cls":"S3","min":null,"max":4.5},{"cls":"S3","min":7.5,"max":null}]'),
  ('DURIAN','kejenuhan_basa','Kejenuhan basa','nr','%',true,7,
   '[{"cls":"S1","min":35,"max":null},{"cls":"S2","min":20,"max":35},{"cls":"S3","min":null,"max":20}]'),
  ('DURIAN','salinitas','Salinitas','xc','mmhos/cm',true,8,
   '[{"cls":"S1","min":null,"max":4},{"cls":"S2","min":4,"max":6},{"cls":"S3","min":6,"max":8},{"cls":"N","min":8,"max":null}]'),
  ('DURIAN','lereng','Lereng','eh','%',true,9,
   '[{"cls":"S1","min":null,"max":8},{"cls":"S2","min":8,"max":15},{"cls":"S3","min":16,"max":30},{"cls":"N","min":30,"max":null}]'),
  ('DURIAN','batuan_permukaan','Batuan permukaan','lp','%',true,10,
   '[{"cls":"S1","min":null,"max":5},{"cls":"S2","min":5,"max":15},{"cls":"S3","min":16,"max":40},{"cls":"N","min":40,"max":null}]'),
  ('DURIAN','singkapan_batuan','Singkapan batuan','lp','%',true,11,
   '[{"cls":"S1","min":null,"max":5},{"cls":"S2","min":5,"max":15},{"cls":"S3","min":16,"max":40},{"cls":"N","min":40,"max":null}]')
) AS x(crop_code, char_code, char_label, symbol, unit, is_numeric, sort_order, bands)
  ON x.crop_code = c.code;

-- ---------------------------------------------------------------------------
-- Simpan hasil klasifikasi pada assessment yang sudah ada.
-- Kolom lama score_durian/score_coconut ditinggalkan (bisa dipakai catatan),
-- diganti kelas + subkelas + parameter input (jejak audit).
-- ---------------------------------------------------------------------------
ALTER TABLE app.land_suitability_assessments
  ADD COLUMN crop_id      uuid REFERENCES app.crops(id),
  ADD COLUMN suit_class   text,          -- S1 | S2 | S3 | N
  ADD COLUMN subclass     text,          -- mis. S2wa,nr
  ADD COLUMN limiting     text[],        -- simbol pembatas pada kelas terendah
  ADD COLUMN params       jsonb,         -- nilai input yang dinilai
  ADD COLUMN method       text NOT NULL DEFAULT 'BBSDLP matching + hukum minimum';

COMMENT ON COLUMN app.land_suitability_assessments.suit_class IS
  'Hasil klasifikasi (hukum minimum). Kesesuaian FISIK, bukan kelayakan ekonomi.';
