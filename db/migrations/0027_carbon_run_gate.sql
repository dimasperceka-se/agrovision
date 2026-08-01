-- 0027_carbon_run_gate.sql
--
-- Menambal lubang pada app.generate_carbon_run (0026): fungsi SECURITY DEFINER
-- itu menerima p_company_id tanpa memeriksa apakah pemanggil berhak atas
-- entitas itu. Karena SECURITY DEFINER melewati RLS, pemegang koneksi app_rw
-- bisa menghitung / menimpa carbon run milik tenant lain (integritas, bukan
-- kebocoran baca — tapi tetap lintas batas tenant).
--
-- Perbaikan: gerbang di awal fungsi + batasi ke peran yang berhak menjalankan
-- perhitungan karbon. Ini kelas bug yang sama dengan publish_emission_factor
-- di 0018 — SECURITY DEFINER selalu wajib memeriksa otorisasi sendiri.

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
  -- GERBANG: pemanggil harus berhak atas entitas ini DAN berperan cukup.
  IF NOT EXISTS (
    SELECT 1 FROM app.user_company_access uca
     WHERE uca.user_id = app.current_user_id() AND uca.company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'tidak berhak menjalankan carbon run untuk entitas ini';
  END IF;
  IF app.current_role_name() NOT IN ('approver', 'super_admin') THEN
    RAISE EXCEPTION 'hanya approver atau super_admin boleh menjalankan carbon run';
  END IF;

  SELECT value INTO v_clear FROM app.emission_factors WHERE code = 'EF-LANDCLEAR' AND valid_to IS NULL;

  INSERT INTO app.carbon_runs
    (company_id, code, period_start, period_end, boundary_note, status, executed_at,
     executed_by, data_completeness_pct)
  VALUES (p_company_id, p_code, p_start, p_end, 'Seluruh blok entitas', 'calculated', now(),
          app.current_user_id(), 75)
  ON CONFLICT (company_id, code) DO UPDATE SET period_end = EXCLUDED.period_end,
    executed_at = now(), executed_by = app.current_user_id()
  RETURNING id INTO v_run;

  DELETE FROM app.carbon_run_blocks WHERE run_id = v_run;

  INSERT INTO app.carbon_run_blocks
    (run_id, block_id, area_ha_snapshot, boundary_version, emission_tco2e, sequestration_tco2e,
     net_tco2e, status)
  SELECT v_run, b.id, COALESCE(b.area_ha, 0), b.current_version,
         em.emission, sq.seq, sq.seq - em.emission,
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
      SELECT COALESCE(SUM(
               ac.coef_a * power(dm.dbh_cm, ac.coef_b) * (1 + ac.root_shoot_ratio)
               * ac.carbon_fraction * 44.0 / 12.0 / 1000.0
             ), 0) AS seq
        FROM app.dbh_measurements dm
        JOIN app.allometric_coefficients ac ON ac.crop_id = dm.crop_id AND ac.valid_to IS NULL
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
