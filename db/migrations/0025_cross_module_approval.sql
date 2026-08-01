-- 0025_cross_module_approval.sql
--
-- Fondasi agar SEMUA layar berfungsi, bukan hanya costing:
--
--   1. Inbox approval lintas-modul: satu view UNION atas semua tabel ber-
--      approval_status (concept:194 -- "satu inbox terpusat lintas modul").
--   2. app.decide_record(): satu pintu keputusan untuk semua modul.
--   3. Pemisahan peran creator/approver DITEGAKKAN di tiap tabel record --
--      sebelumnya hanya cost_transactions yang punya policy ct_role_split,
--      artinya creator bisa menyetujui recordnya sendiri di modul lain.
--   4. Kelola akses estate lewat fungsi bergerbang -- 0018 mencabut tulis
--      langsung ke user_estate_access tapi lupa menyediakan pintunya.

-- ===========================================================================
-- 1. VIEW INBOX LINTAS-MODUL
-- security_invoker: RLS pembaca berlaku, tenant lain tak terlihat.
-- ===========================================================================

CREATE VIEW app.v_pending_approvals
WITH (security_invoker = true) AS
SELECT 'cost_transaction'::text AS module_key, 'Pengeluaran'::text AS module_label,
       ct.id AS record_id, b.code AS block_code, cat.name AS detail,
       ct.amount_idr, ct.transaction_date AS event_date, ct.submitted_at,
       u.full_name AS actor_name, ct.approval_status
  FROM app.cost_transactions ct
  LEFT JOIN app.blocks b ON b.id = ct.block_id
  LEFT JOIN app.master_items cat ON cat.id = ct.cost_category_id
  LEFT JOIN app.users u ON u.id = ct.created_by
 WHERE ct.approval_status IN ('submitted','under_review')
UNION ALL
SELECT 'fertilizer_application', 'Pemupukan', fa.id, b.code,
       ft.name || ' — ' || fa.total_quantity || ' ' || COALESCE(uom.name, ''),
       NULL, fa.applied_on, NULL, u.full_name, fa.approval_status
  FROM app.fertilizer_applications fa
  JOIN app.blocks b ON b.id = fa.block_id
  JOIN app.fertilizer_types ft ON ft.id = fa.fertilizer_type_id
  LEFT JOIN app.master_items uom ON uom.id = fa.uom_item_id
  LEFT JOIN app.users u ON u.id = fa.created_by
 WHERE fa.approval_status IN ('submitted','under_review')
UNION ALL
SELECT 'land_preparation', 'Persiapan Lahan', lp.id, b.code,
       'Checklist — ' || COALESCE(lp.planting_hole_count::text, '?') || ' lubang tanam',
       NULL, lp.checked_at::date, NULL, u.full_name, lp.approval_status
  FROM app.land_preparations lp
  JOIN app.blocks b ON b.id = lp.block_id
  LEFT JOIN app.users u ON u.id = lp.created_by
 WHERE lp.approval_status IN ('submitted','under_review')
UNION ALL
SELECT 'land_suitability_assessment', 'Kesesuaian Lahan', lsa.id, b.code,
       'Skor durian ' || COALESCE(lsa.score_durian::text, '—') ||
       ' / kelapa ' || COALESCE(lsa.score_coconut::text, '—'),
       NULL, lsa.assessed_at::date, NULL, u.full_name, lsa.approval_status
  FROM app.land_suitability_assessments lsa
  JOIN app.blocks b ON b.id = lsa.block_id
  LEFT JOIN app.users u ON u.id = lsa.created_by
 WHERE lsa.approval_status IN ('submitted','under_review')
UNION ALL
SELECT 'pruning_record', 'Pruning', pr.id, b.code,
       COALESCE(pr.tree_count::text || ' pohon', 'Pruning'),
       NULL, pr.pruned_on, NULL, u.full_name, pr.approval_status
  FROM app.pruning_records pr
  JOIN app.blocks b ON b.id = pr.block_id
  LEFT JOIN app.users u ON u.id = pr.created_by
 WHERE pr.approval_status IN ('submitted','under_review')
UNION ALL
SELECT 'nursery_inspection', 'Inspeksi Bibit', ni.id, sb.code,
       'Hidup ' || ni.qty_alive || ' · mati ' || ni.qty_dead || ' · rusak ' || ni.qty_damaged,
       NULL, ni.inspected_at::date, NULL, u.full_name, ni.approval_status
  FROM app.nursery_inspections ni
  JOIN app.seed_batches sb ON sb.id = ni.seed_batch_id
  LEFT JOIN app.users u ON u.id = ni.inspector_id
 WHERE ni.approval_status IN ('submitted','under_review')
UNION ALL
SELECT 'dbh_measurement', 'Pengukuran DBH', dm.id, b.code,
       'DBH ' || dm.dbh_cm || ' cm',
       NULL, dm.measured_at::date, NULL, u.full_name, dm.approval_status
  FROM app.dbh_measurements dm
  JOIN app.blocks b ON b.id = dm.block_id
  LEFT JOIN app.users u ON u.id = dm.measured_by
 WHERE dm.approval_status IN ('submitted','under_review')
UNION ALL
SELECT 'survey_submission', 'Survei', ss.id, b.code, f.name,
       NULL, ss.submitted_at::date, ss.synced_at,
       u.full_name, ss.approval_status
  FROM app.survey_submissions ss
  JOIN app.form_versions fv ON fv.id = ss.form_version_id
  JOIN app.forms f ON f.id = fv.form_id
  LEFT JOIN app.blocks b ON b.id = ss.block_id
  LEFT JOIN app.users u ON u.id = ss.submitted_by
 WHERE ss.approval_status IN ('submitted','under_review');

GRANT SELECT ON app.v_pending_approvals TO app_rw, app_ro;

-- ===========================================================================
-- 2. SATU PINTU KEPUTUSAN
-- SECURITY INVOKER (default): RLS + policy pemisahan peran di bawah tetap
-- menggerbang siapa yang boleh memutuskan. Fungsi ini hanya merapikan rute.
-- ===========================================================================

CREATE OR REPLACE FUNCTION app.decide_record(
  p_module text, p_id uuid, p_decision text, p_reason text DEFAULT NULL
) RETURNS integer LANGUAGE plpgsql AS $$
DECLARE n integer;
BEGIN
  IF p_decision NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'keputusan harus approved atau rejected';
  END IF;
  IF p_decision = 'rejected' AND (p_reason IS NULL OR btrim(p_reason) = '') THEN
    RAISE EXCEPTION 'penolakan wajib menyertakan alasan';
  END IF;

  CASE p_module
    WHEN 'cost_transaction' THEN
      UPDATE app.cost_transactions
         SET approval_status = p_decision::app.record_status,
             rejection_reason = CASE WHEN p_decision = 'rejected' THEN p_reason END,
             updated_at = now(), updated_by = app.current_user_id()
       WHERE id = p_id AND approval_status IN ('submitted','under_review');
    WHEN 'fertilizer_application' THEN
      UPDATE app.fertilizer_applications
         SET approval_status = p_decision::app.record_status,
             rejection_reason = CASE WHEN p_decision = 'rejected' THEN p_reason END
       WHERE id = p_id AND approval_status IN ('submitted','under_review');
    WHEN 'land_preparation' THEN
      UPDATE app.land_preparations
         SET approval_status = p_decision::app.record_status,
             rejection_reason = CASE WHEN p_decision = 'rejected' THEN p_reason END
       WHERE id = p_id AND approval_status IN ('submitted','under_review');
    WHEN 'land_suitability_assessment' THEN
      UPDATE app.land_suitability_assessments
         SET approval_status = p_decision::app.record_status,
             rejection_reason = CASE WHEN p_decision = 'rejected' THEN p_reason END
       WHERE id = p_id AND approval_status IN ('submitted','under_review');
    WHEN 'pruning_record' THEN
      UPDATE app.pruning_records
         SET approval_status = p_decision::app.record_status,
             rejection_reason = CASE WHEN p_decision = 'rejected' THEN p_reason END
       WHERE id = p_id AND approval_status IN ('submitted','under_review');
    WHEN 'nursery_inspection' THEN
      UPDATE app.nursery_inspections
         SET approval_status = p_decision::app.record_status,
             rejection_reason = CASE WHEN p_decision = 'rejected' THEN p_reason END
       WHERE id = p_id AND approval_status IN ('submitted','under_review');
    WHEN 'dbh_measurement' THEN
      UPDATE app.dbh_measurements
         SET approval_status = p_decision::app.record_status,
             rejection_reason = CASE WHEN p_decision = 'rejected' THEN p_reason END
       WHERE id = p_id AND approval_status IN ('submitted','under_review');
    WHEN 'survey_submission' THEN
      UPDATE app.survey_submissions
         SET approval_status = p_decision::app.record_status,
             rejection_reason = CASE WHEN p_decision = 'rejected' THEN p_reason END
       WHERE id = p_id AND approval_status IN ('submitted','under_review');
    ELSE
      RAISE EXCEPTION 'modul tidak dikenal: %', p_module;
  END CASE;

  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;

GRANT EXECUTE ON FUNCTION app.decide_record(text, uuid, text, text) TO app_rw;

-- ===========================================================================
-- 3. PEMISAHAN PERAN DI SEMUA TABEL RECORD
-- Sebelumnya hanya cost_transactions (0018 §9). Tanpa ini, creator bisa
-- menyetujui record modul lain miliknya sendiri.
-- ===========================================================================

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('fertilizer_applications',        'created_by'),
    ('land_preparations',              'created_by'),
    ('land_suitability_assessments',   'created_by'),
    ('pruning_records',                'created_by'),
    ('nursery_inspections',            'created_by'),
    ('dbh_measurements',               'measured_by'),
    ('survey_submissions',             'submitted_by')
  ) AS t(tbl, owner_col)
  LOOP
    EXECUTE format($f$
      CREATE POLICY %1$s_role_split ON app.%1$I
        AS RESTRICTIVE FOR UPDATE
        USING (app.current_role_name() IN ('approver','super_admin')
               OR (%2$I = app.current_user_id()
                   AND approval_status IN ('draft','rejected')))
        WITH CHECK (app.current_role_name() IN ('approver','super_admin')
               OR approval_status IN ('draft','submitted'))
    $f$, r.tbl, r.owner_col);
  END LOOP;
END $$;

-- ===========================================================================
-- 4. KELOLA AKSES ESTATE -- pintu yang lupa dibuat 0018
-- ===========================================================================

CREATE OR REPLACE FUNCTION app.grant_estate_access(p_user_id uuid, p_estate_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = app, pg_catalog AS $$
BEGIN
  IF app.current_role_name() IS DISTINCT FROM 'super_admin' THEN
    RAISE EXCEPTION 'hanya super_admin boleh mengatur akses estate';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM app.estates e
                  WHERE e.id = p_estate_id
                    AND e.company_id IN (SELECT app.accessible_company_ids())) THEN
    RAISE EXCEPTION 'estate itu bukan milik entitas yang Anda akses';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM app.user_company_access uca
                  JOIN app.estates e ON e.company_id = uca.company_id
                 WHERE uca.user_id = p_user_id AND e.id = p_estate_id) THEN
    RAISE EXCEPTION 'pengguna itu belum punya akses ke entitas pemilik estate';
  END IF;
  INSERT INTO app.user_estate_access (user_id, estate_id)
  VALUES (p_user_id, p_estate_id) ON CONFLICT DO NOTHING;
END $$;

CREATE OR REPLACE FUNCTION app.revoke_estate_access(p_user_id uuid, p_estate_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = app, pg_catalog AS $$
BEGIN
  IF app.current_role_name() IS DISTINCT FROM 'super_admin' THEN
    RAISE EXCEPTION 'hanya super_admin boleh mengatur akses estate';
  END IF;
  DELETE FROM app.user_estate_access WHERE user_id = p_user_id AND estate_id = p_estate_id;
END $$;

REVOKE ALL ON FUNCTION app.grant_estate_access(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION app.revoke_estate_access(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.grant_estate_access(uuid, uuid) TO app_rw;
GRANT EXECUTE ON FUNCTION app.revoke_estate_access(uuid, uuid) TO app_rw;

-- ===========================================================================
-- 5. Laporan Operasional kini punya layar + data (v_seedling_stock terisi).
-- Laporan Keberlanjutan TETAP stub: angka karbon menunggu koefisien IPCC.
-- ===========================================================================

UPDATE app.report_definitions SET is_stub = false WHERE code = 'RPT-OPERATIONAL';
