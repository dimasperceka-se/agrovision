-- 0037: Tutup celah band kriteria kesesuaian DURIAN (lereng, batuan permukaan,
-- singkapan batuan).
--
-- Latar: band 0028 untuk DURIAN ditranskripsi dari interval diskrit tabel
-- BBSDLP ("8–15", "16–30") sehingga S2 berhenti di 15 dan S3 baru mulai di 16.
-- Nilai kontinu 15 < x < 16 tidak cocok band mana pun dan jatuh ke default N
-- ("di luar seluruh kriteria") — kelas terburuk diberikan justru untuk nilai
-- di ANTARA S2 dan S3. Kriteria COCONUT pada file yang sama sudah kontinu
-- (S2 8–16, S3 16–30), membuktikan ini artefak transkripsi, bukan kesengajaan.
--
-- Perbaikan: S3 mulai tepat di batas atas S2 (15). Nilai tepat 15 tetap S2
-- karena pencocokan berurutan S1→N memilih kelas lebih baik dulu — semantik
-- yang sama di classifier aplikasi (src/lib/repo/suitability.ts) dan seed.
--
-- Assessment yang SUDAH tersimpan tidak dihitung ulang otomatis (suit_class
-- adalah snapshot ber-jejak-audit). Data pilot: purge + import ulang
-- (npm run db:purge:pilot && npm run db:import:pilot).

UPDATE app.land_suit_criteria lsc
SET bands = x.bands::jsonb
FROM app.crops c,
     (VALUES
       ('lereng',
        '[{"cls":"S1","min":null,"max":8},{"cls":"S2","min":8,"max":15},{"cls":"S3","min":15,"max":30},{"cls":"N","min":30,"max":null}]'),
       ('batuan_permukaan',
        '[{"cls":"S1","min":null,"max":5},{"cls":"S2","min":5,"max":15},{"cls":"S3","min":15,"max":40},{"cls":"N","min":40,"max":null}]'),
       ('singkapan_batuan',
        '[{"cls":"S1","min":null,"max":5},{"cls":"S2","min":5,"max":15},{"cls":"S3","min":15,"max":40},{"cls":"N","min":40,"max":null}]')
     ) AS x(char_code, bands)
WHERE c.code = 'DURIAN'
  AND lsc.crop_id = c.id
  AND lsc.char_code = x.char_code;
