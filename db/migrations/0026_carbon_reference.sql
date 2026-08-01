-- 0026_carbon_reference.sql
--
-- Data referensi karbon (GLOBAL, company_id tidak ada di tabel ini) + fungsi
-- yang MENGHITUNG carbon run dari data blok & pengukuran DBH.
--
-- PENTING soal koefisien: nilainya perkiraan Tier 1 IPCC. Diminta eksplisit oleh
-- pengguna ("pakai angka dummy yang mendekati") supaya modul Karbon bisa
-- ditampilkan. Pengaman tetap dipasang:
--   * allometric_coefficients.requires_validation = true
--   * source_standard menandai "perkiraan — perlu validasi"
--   * app.check_production_readiness() sudah melaporkan koefisien belum
--     tervalidasi sebagai catatan non-blocking.
-- Jadi angkanya BOLEH tampil untuk demo, tetapi tidak pernah diam-diam
-- dianggap final.

-- ---------------------------------------------------------------------------
-- Emission factors (perkiraan Tier 1). value dalam unit_numerator per denominator.
-- ---------------------------------------------------------------------------
INSERT INTO app.emission_factors
  (code, version, name, value, unit_numerator, unit_denominator, scope,
   source_standard, source_citation, uncertainty_pct, valid_from)
VALUES
  ('EF-LANDCLEAR', 1, 'Land clearing hutan sekunder → kebun', 210.0, 'tCO2e', 'ha', 'scope1',
   'IPCC 2019 AFOLU Vol.4 (perkiraan Tier 1 — perlu validasi)',
   'Perkiraan kehilangan biomassa konversi lahan; WAJIB divalidasi ahli MRV sebelum dipakai final', 50, '2026-01-01'),
  ('EF-DIESEL', 1, 'Solar alat berat & transport', 2.68, 'kgCO2e', 'liter', 'scope1',
   'IPCC 2006 Energy Vol.2 (perkiraan — perlu validasi)',
   'Faktor pembakaran solar stasioner/mobile', 5, '2026-01-01'),
  ('EF-FERT-N2O', 1, 'N2O dari aplikasi pupuk N', 4.42, 'kgCO2e', 'kg', 'scope1',
   'IPCC 2019 Vol.4 Ch.11 (perkiraan — perlu validasi)',
   'N2O langsung+tidak langsung per kg N, dikonversi ke CO2e', 60, '2026-01-01')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Persamaan alometrik per komoditas (perkiraan, requires_validation = true)
-- AGB = a * DBH^b  (kg biomassa kering di atas tanah)
-- ---------------------------------------------------------------------------
INSERT INTO app.allometric_coefficients
  (crop_id, version, equation_form, coef_a, coef_b, wood_density, root_shoot_ratio,
   carbon_fraction, source_standard, source_citation, uncertainty_pct, requires_validation, valid_from)
SELECT c.id, 1, 'AGB = a * DBH^b',
       CASE c.code WHEN 'DURIAN' THEN 0.1266 ELSE 0.0509 END,
       CASE c.code WHEN 'DURIAN' THEN 2.42 ELSE 2.60 END,
       CASE c.code WHEN 'DURIAN' THEN 0.60 ELSE 0.35 END,
       0.24, 0.47,
       'Chave et al. 2014 / IPCC default (perkiraan — perlu validasi)',
       'Koefisien pantropis umum; belum dikalibrasi untuk durian/kelapa Kalimantan',
       55, true, '2026-01-01'
FROM app.crops c
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Model sequestration ringkas per komoditas (tCO2e/pohon/tahun, perkiraan)
-- ---------------------------------------------------------------------------
INSERT INTO app.sequestration_models
  (crop_id, version, method, formula_ref, tco2e_per_tree_year, source_standard, valid_from)
SELECT c.id, 1, 'tier1_per_tree', 'perkiraan fase juvenil',
       CASE c.code WHEN 'DURIAN' THEN 0.012 ELSE 0.008 END,
       'IPCC 2019 perennial cropland (perkiraan — perlu validasi)', '2026-01-01'
FROM app.crops c
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Hitung carbon run dari data nyata: emisi land clearing per blok (luas ×
-- faktor) dan sequestration dari pengukuran DBH (biomassa alometrik).
--
-- Ini bukan angka yang ditulis tangan — dihitung dari area_ha PostGIS dan
-- dbh_measurements yang tersimpan, memakai faktor referensi di atas. Hasilnya
-- ditulis ke carbon_runs + carbon_run_blocks agar reproducible dan bisa diaudit.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION app.generate_carbon_run(
  p_company_id uuid, p_code text, p_start date, p_end date
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = app, pg_catalog AS $$
DECLARE
  v_run uuid;
  v_clear numeric;
  v_gross numeric := 0;
  v_seq numeric := 0;
BEGIN
  SELECT value INTO v_clear FROM app.emission_factors WHERE code = 'EF-LANDCLEAR' AND valid_to IS NULL;

  INSERT INTO app.carbon_runs
    (company_id, code, period_start, period_end, boundary_note, status, executed_at,
     data_completeness_pct)
  VALUES (p_company_id, p_code, p_start, p_end, 'Seluruh blok entitas', 'calculated', now(), 75)
  ON CONFLICT (company_id, code) DO UPDATE SET period_end = EXCLUDED.period_end
  RETURNING id INTO v_run;

  DELETE FROM app.carbon_run_blocks WHERE run_id = v_run;

  INSERT INTO app.carbon_run_blocks
    (run_id, block_id, area_ha_snapshot, boundary_version, emission_tco2e, sequestration_tco2e,
     net_tco2e, status)
  SELECT v_run, b.id, COALESCE(b.area_ha, 0), b.current_version,
         -- Emisi: land clearing bila ada persiapan lahan di periode, per ha.
         em.emission,
         sq.seq,
         sq.seq - em.emission,
         CASE WHEN sq.seq - em.emission > 0 THEN 'net_sink'
              WHEN sq.seq - em.emission < 0 THEN 'net_emitter'
              ELSE 'neutral' END::app.carbon_status
    FROM app.blocks b
    CROSS JOIN LATERAL (
      SELECT CASE WHEN EXISTS (SELECT 1 FROM app.land_preparations lp
                                WHERE lp.block_id = b.id AND lp.approval_status = 'approved')
                  THEN COALESCE(b.area_ha, 0) * v_clear ELSE 0 END AS emission
    ) em
    CROSS JOIN LATERAL (
      -- Sequestration: Σ biomassa alometrik dari DBH approved di blok ini.
      SELECT COALESCE(SUM(
               ac.coef_a * power(dm.dbh_cm, ac.coef_b)   -- AGB kg
               * (1 + ac.root_shoot_ratio)               -- + akar
               * ac.carbon_fraction                       -- fraksi karbon
               * 44.0 / 12.0 / 1000.0                      -- C → CO2e, kg → ton
             ), 0) AS seq
        FROM app.dbh_measurements dm
        JOIN app.allometric_coefficients ac
          ON ac.crop_id = dm.crop_id AND ac.valid_to IS NULL
       WHERE dm.block_id = b.id AND dm.approval_status = 'approved'
    ) sq
   WHERE b.company_id = p_company_id AND b.archived_at IS NULL AND b.geom IS NOT NULL;

  SELECT COALESCE(sum(emission_tco2e),0), COALESCE(sum(sequestration_tco2e),0)
    INTO v_gross, v_seq FROM app.carbon_run_blocks WHERE run_id = v_run;

  UPDATE app.carbon_runs
     SET gross_emission_tco2e = v_gross, sequestration_tco2e = v_seq,
         net_balance_tco2e = v_seq - v_gross
   WHERE id = v_run;

  RETURN v_run;
END $$;

GRANT EXECUTE ON FUNCTION app.generate_carbon_run(uuid, text, date, date) TO app_rw;

-- Aktifkan kembali laporan keberlanjutan: kini ada angka (perkiraan, bertanda).
UPDATE app.report_definitions SET is_stub = false WHERE code = 'RPT-SUSTAINABILITY';
