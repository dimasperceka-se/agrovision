-- 0034_farm_activities_agri_input.sql
--
-- Membangun modul yang di docs/11 masih scaffold:
--   Farm Activities: Weeding, Spraying, Harvesting  (record ber-approval)
--   Agri-Input:      Chemical (stok + rekomendasi), Equipment (aset + biaya)
--
-- Aktivitas mengikuti pola operasional yang ada (block-scoped, approval_status,
-- rejection_reason) dan diintegrasikan ke inbox approval (v_pending_approvals +
-- app.decide_record). Katalog Agri-Input bersifat referensi per-entitas.
--
-- Harvest menjadi sumber REVENUE untuk refleksi Accounting (docs/11 §4):
-- tonase × tarif price_list.

-- ---------------------------------------------------------------------------
-- 1. Katalog Agri-Input (company-scoped)
-- ---------------------------------------------------------------------------
CREATE TABLE app.agri_input_chemicals (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL REFERENCES app.companies(id),
  code          text NOT NULL,
  name          text NOT NULL,
  category      text NOT NULL CHECK (category IN ('pupuk','pestisida','herbisida','fungisida','insektisida')),
  is_organic    boolean NOT NULL DEFAULT false,
  unit          text NOT NULL DEFAULT 'kg',
  stock_qty     numeric(14,2) NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
  reorder_level numeric(14,2),
  rec_phase     text CHECK (rec_phase IN ('vegetatif','generatif','pemulihan')),
  rec_note      text,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  created_by    uuid REFERENCES app.users(id),
  UNIQUE (company_id, code)
);

CREATE TABLE app.agri_input_equipment (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     uuid NOT NULL REFERENCES app.companies(id),
  code           text NOT NULL,
  name           text NOT NULL,
  category       text NOT NULL CHECK (category IN ('alat','kendaraan','drone','mesin')),
  purchase_price_idr numeric(16,2) CHECK (purchase_price_idr IS NULL OR purchase_price_idr >= 0),
  usage_freq     text,
  fuel_type      text CHECK (fuel_type IS NULL OR fuel_type IN ('solar','bensin','listrik','tidak_ada')),
  fuel_per_hour  numeric(12,2) CHECK (fuel_per_hour IS NULL OR fuel_per_hour >= 0),
  is_active      boolean NOT NULL DEFAULT true,
  note           text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  created_by     uuid REFERENCES app.users(id),
  UNIQUE (company_id, code)
);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['agri_input_chemicals','agri_input_equipment'] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON app.%I TO app_rw', t);
    EXECUTE format('GRANT SELECT ON app.%I TO app_ro', t);
    EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE app.%I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format($f$
      CREATE POLICY %1$s_tenant ON app.%1$I
        USING (app.company_in_scope(company_id))
        WITH CHECK (app.company_in_scope(company_id))
    $f$, t);
    EXECUTE format($f$
      CREATE POLICY %1$s_writer ON app.%1$I
        AS RESTRICTIVE FOR ALL
        USING (true)
        WITH CHECK (app.current_role_name() IN ('creator','approver','super_admin'))
    $f$, t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Aktivitas kebun (block-scoped, ber-approval)
-- ---------------------------------------------------------------------------
CREATE TABLE app.weeding_records (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id         uuid NOT NULL REFERENCES app.blocks(id),
  weeded_on        date NOT NULL,
  method           text NOT NULL CHECK (method IN ('manual','mekanis','mulsa','herbisida','penutup_tanah')),
  area_ha          numeric(10,2) CHECK (area_ha IS NULL OR area_ha >= 0),
  labor_count      integer CHECK (labor_count IS NULL OR labor_count >= 0),
  note             text,
  approval_status  app.record_status NOT NULL DEFAULT 'draft',
  rejection_reason text,
  created_by       uuid REFERENCES app.users(id),
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.spraying_records (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id         uuid NOT NULL REFERENCES app.blocks(id),
  sprayed_on       date NOT NULL,
  chemical_id      uuid REFERENCES app.agri_input_chemicals(id),
  target           text,
  dose_per_ha      numeric(12,2) CHECK (dose_per_ha IS NULL OR dose_per_ha >= 0),
  total_volume     numeric(12,2) CHECK (total_volume IS NULL OR total_volume >= 0),
  unit             text,
  note             text,
  approval_status  app.record_status NOT NULL DEFAULT 'draft',
  rejection_reason text,
  created_by       uuid REFERENCES app.users(id),
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.harvest_records (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id         uuid NOT NULL REFERENCES app.blocks(id),
  harvested_on     date NOT NULL,
  crop_code        text NOT NULL CHECK (crop_code IN ('DURIAN','COCONUT')),
  quantity_ton     numeric(12,3) NOT NULL CHECK (quantity_ton >= 0),
  grade            text,
  note             text,
  approval_status  app.record_status NOT NULL DEFAULT 'draft',
  rejection_reason text,
  created_by       uuid REFERENCES app.users(id),
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX weeding_block_idx  ON app.weeding_records (block_id, weeded_on DESC);
CREATE INDEX spraying_block_idx ON app.spraying_records (block_id, sprayed_on DESC);
CREATE INDEX harvest_block_idx  ON app.harvest_records (block_id, harvested_on DESC);

-- RLS block-scoped: tenant (via blocks) + viewer read-only + role split +
-- rejection_reason wajib. Mengikuti pola 0017/0018/0025.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('weeding_records'), ('spraying_records'), ('harvest_records')
  ) AS x(tbl)
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON app.%I TO app_rw', r.tbl);
    EXECUTE format('GRANT SELECT ON app.%I TO app_ro', r.tbl);
    EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY', r.tbl);
    EXECUTE format('ALTER TABLE app.%I FORCE ROW LEVEL SECURITY', r.tbl);
    EXECUTE format($f$
      CREATE POLICY %1$s_tenant ON app.%1$I
        USING (EXISTS (SELECT 1 FROM app.blocks b
                        WHERE b.id = %1$I.block_id AND app.company_in_scope(b.company_id)))
        WITH CHECK (EXISTS (SELECT 1 FROM app.blocks b
                        WHERE b.id = %1$I.block_id AND app.company_in_scope(b.company_id)))
    $f$, r.tbl);
    EXECUTE format($f$
      CREATE POLICY %1$s_viewer_readonly ON app.%1$I
        AS RESTRICTIVE FOR ALL
        USING (true)
        WITH CHECK (COALESCE(app.current_role_name(), 'viewer') <> 'viewer')
    $f$, r.tbl);
    EXECUTE format($f$
      CREATE POLICY %1$s_role_split ON app.%1$I
        AS RESTRICTIVE FOR UPDATE
        USING (app.current_role_name() IN ('approver','super_admin')
               OR (created_by = app.current_user_id()
                   AND approval_status IN ('draft','rejected')))
        WITH CHECK (app.current_role_name() IN ('approver','super_admin')
               OR approval_status IN ('draft','submitted'))
    $f$, r.tbl);
    EXECUTE format($f$
      ALTER TABLE app.%1$I ADD CONSTRAINT %1$s_rejection_needs_reason
        CHECK (approval_status <> 'rejected'
               OR (rejection_reason IS NOT NULL AND length(btrim(rejection_reason)) > 0))
    $f$, r.tbl);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Integrasi inbox approval: tambah 3 cabang ke v_pending_approvals
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW app.v_pending_approvals AS
  SELECT 'cost_transaction'::text AS module_key, 'Pengeluaran'::text AS module_label,
    ct.id AS record_id, b.code AS block_code, cat.name AS detail, ct.amount_idr,
    ct.transaction_date AS event_date, ct.submitted_at, u.full_name AS actor_name, ct.approval_status
   FROM app.cost_transactions ct
     LEFT JOIN app.blocks b ON b.id = ct.block_id
     LEFT JOIN app.master_items cat ON cat.id = ct.cost_category_id
     LEFT JOIN app.users u ON u.id = ct.created_by
  WHERE ct.approval_status = ANY (ARRAY['submitted'::app.record_status,'under_review'::app.record_status])
UNION ALL
  SELECT 'fertilizer_application', 'Pemupukan', fa.id, b.code,
    (((ft.name || ' — ') || fa.total_quantity) || ' ') || COALESCE(uom.name, ''), NULL::numeric,
    fa.applied_on, NULL::timestamptz, u.full_name, fa.approval_status
   FROM app.fertilizer_applications fa
     JOIN app.blocks b ON b.id = fa.block_id
     JOIN app.fertilizer_types ft ON ft.id = fa.fertilizer_type_id
     LEFT JOIN app.master_items uom ON uom.id = fa.uom_item_id
     LEFT JOIN app.users u ON u.id = fa.created_by
  WHERE fa.approval_status = ANY (ARRAY['submitted'::app.record_status,'under_review'::app.record_status])
UNION ALL
  SELECT 'land_preparation', 'Persiapan Lahan', lp.id, b.code,
    ('Checklist — ' || COALESCE(lp.planting_hole_count::text, '?')) || ' lubang tanam', NULL::numeric,
    lp.checked_at::date, NULL::timestamptz, u.full_name, lp.approval_status
   FROM app.land_preparations lp
     JOIN app.blocks b ON b.id = lp.block_id
     LEFT JOIN app.users u ON u.id = lp.created_by
  WHERE lp.approval_status = ANY (ARRAY['submitted'::app.record_status,'under_review'::app.record_status])
UNION ALL
  SELECT 'land_suitability_assessment', 'Kesesuaian Lahan', lsa.id, b.code,
    (('Skor durian ' || COALESCE(lsa.score_durian::text, '—')) || ' / kelapa ') || COALESCE(lsa.score_coconut::text, '—'),
    NULL::numeric, lsa.assessed_at::date, NULL::timestamptz, u.full_name, lsa.approval_status
   FROM app.land_suitability_assessments lsa
     JOIN app.blocks b ON b.id = lsa.block_id
     LEFT JOIN app.users u ON u.id = lsa.created_by
  WHERE lsa.approval_status = ANY (ARRAY['submitted'::app.record_status,'under_review'::app.record_status])
UNION ALL
  SELECT 'pruning_record', 'Pruning', pr.id, b.code,
    COALESCE(pr.tree_count::text || ' pohon', 'Pruning'), NULL::numeric,
    pr.pruned_on, NULL::timestamptz, u.full_name, pr.approval_status
   FROM app.pruning_records pr
     JOIN app.blocks b ON b.id = pr.block_id
     LEFT JOIN app.users u ON u.id = pr.created_by
  WHERE pr.approval_status = ANY (ARRAY['submitted'::app.record_status,'under_review'::app.record_status])
UNION ALL
  SELECT 'nursery_inspection', 'Inspeksi Bibit', ni.id, sb.code,
    (((('Hidup ' || ni.qty_alive) || ' · mati ') || ni.qty_dead) || ' · rusak ') || ni.qty_damaged,
    NULL::numeric, ni.inspected_at::date, NULL::timestamptz, u.full_name, ni.approval_status
   FROM app.nursery_inspections ni
     JOIN app.seed_batches sb ON sb.id = ni.seed_batch_id
     LEFT JOIN app.users u ON u.id = ni.inspector_id
  WHERE ni.approval_status = ANY (ARRAY['submitted'::app.record_status,'under_review'::app.record_status])
UNION ALL
  SELECT 'dbh_measurement', 'Pengukuran DBH', dm.id, b.code,
    ('DBH ' || dm.dbh_cm) || ' cm', NULL::numeric,
    dm.measured_at::date, NULL::timestamptz, u.full_name, dm.approval_status
   FROM app.dbh_measurements dm
     JOIN app.blocks b ON b.id = dm.block_id
     LEFT JOIN app.users u ON u.id = dm.measured_by
  WHERE dm.approval_status = ANY (ARRAY['submitted'::app.record_status,'under_review'::app.record_status])
UNION ALL
  SELECT 'survey_submission', 'Survei', ss.id, b.code,
    f.name, NULL::numeric, ss.submitted_at::date, ss.synced_at, u.full_name, ss.approval_status
   FROM app.survey_submissions ss
     JOIN app.form_versions fv ON fv.id = ss.form_version_id
     JOIN app.forms f ON f.id = fv.form_id
     LEFT JOIN app.blocks b ON b.id = ss.block_id
     LEFT JOIN app.users u ON u.id = ss.submitted_by
  WHERE ss.approval_status = ANY (ARRAY['submitted'::app.record_status,'under_review'::app.record_status])
UNION ALL
  SELECT 'weeding_record', 'Penyiangan', w.id, b.code,
    COALESCE(w.method, 'Penyiangan') || COALESCE(' · ' || w.area_ha::text || ' ha', ''), NULL::numeric,
    w.weeded_on, NULL::timestamptz, u.full_name, w.approval_status
   FROM app.weeding_records w
     JOIN app.blocks b ON b.id = w.block_id
     LEFT JOIN app.users u ON u.id = w.created_by
  WHERE w.approval_status = ANY (ARRAY['submitted'::app.record_status,'under_review'::app.record_status])
UNION ALL
  SELECT 'spraying_record', 'Penyemprotan', s.id, b.code,
    COALESCE(ch.name, 'Semprot') || COALESCE(' · ' || s.target, ''), NULL::numeric,
    s.sprayed_on, NULL::timestamptz, u.full_name, s.approval_status
   FROM app.spraying_records s
     JOIN app.blocks b ON b.id = s.block_id
     LEFT JOIN app.agri_input_chemicals ch ON ch.id = s.chemical_id
     LEFT JOIN app.users u ON u.id = s.created_by
  WHERE s.approval_status = ANY (ARRAY['submitted'::app.record_status,'under_review'::app.record_status])
UNION ALL
  SELECT 'harvest_record', 'Panen', h.id, b.code,
    ((h.crop_code || ' · ') || h.quantity_ton::text || ' ton') || COALESCE(' · ' || h.grade, ''), NULL::numeric,
    h.harvested_on, NULL::timestamptz, u.full_name, h.approval_status
   FROM app.harvest_records h
     JOIN app.blocks b ON b.id = h.block_id
     LEFT JOIN app.users u ON u.id = h.created_by
  WHERE h.approval_status = ANY (ARRAY['submitted'::app.record_status,'under_review'::app.record_status]);

-- ---------------------------------------------------------------------------
-- 4. decide_record: tambah routing 3 modul baru
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION app.decide_record(p_module text, p_id uuid, p_decision text, p_reason text DEFAULT NULL::text)
 RETURNS integer LANGUAGE plpgsql AS $function$
DECLARE n integer;
BEGIN
  IF p_decision NOT IN ('approved','rejected') THEN
    RAISE EXCEPTION 'keputusan harus approved atau rejected';
  END IF;
  IF p_decision = 'rejected' AND (p_reason IS NULL OR btrim(p_reason) = '') THEN
    RAISE EXCEPTION 'penolakan wajib menyertakan alasan';
  END IF;

  CASE p_module
    WHEN 'cost_transaction' THEN
      UPDATE app.cost_transactions SET approval_status = p_decision::app.record_status,
        rejection_reason = CASE WHEN p_decision='rejected' THEN p_reason END,
        updated_at = now(), updated_by = app.current_user_id()
       WHERE id = p_id AND approval_status IN ('submitted','under_review');
    WHEN 'fertilizer_application' THEN
      UPDATE app.fertilizer_applications SET approval_status = p_decision::app.record_status,
        rejection_reason = CASE WHEN p_decision='rejected' THEN p_reason END
       WHERE id = p_id AND approval_status IN ('submitted','under_review');
    WHEN 'land_preparation' THEN
      UPDATE app.land_preparations SET approval_status = p_decision::app.record_status,
        rejection_reason = CASE WHEN p_decision='rejected' THEN p_reason END
       WHERE id = p_id AND approval_status IN ('submitted','under_review');
    WHEN 'land_suitability_assessment' THEN
      UPDATE app.land_suitability_assessments SET approval_status = p_decision::app.record_status,
        rejection_reason = CASE WHEN p_decision='rejected' THEN p_reason END
       WHERE id = p_id AND approval_status IN ('submitted','under_review');
    WHEN 'pruning_record' THEN
      UPDATE app.pruning_records SET approval_status = p_decision::app.record_status,
        rejection_reason = CASE WHEN p_decision='rejected' THEN p_reason END
       WHERE id = p_id AND approval_status IN ('submitted','under_review');
    WHEN 'nursery_inspection' THEN
      UPDATE app.nursery_inspections SET approval_status = p_decision::app.record_status,
        rejection_reason = CASE WHEN p_decision='rejected' THEN p_reason END
       WHERE id = p_id AND approval_status IN ('submitted','under_review');
    WHEN 'dbh_measurement' THEN
      UPDATE app.dbh_measurements SET approval_status = p_decision::app.record_status,
        rejection_reason = CASE WHEN p_decision='rejected' THEN p_reason END
       WHERE id = p_id AND approval_status IN ('submitted','under_review');
    WHEN 'survey_submission' THEN
      UPDATE app.survey_submissions SET approval_status = p_decision::app.record_status,
        rejection_reason = CASE WHEN p_decision='rejected' THEN p_reason END
       WHERE id = p_id AND approval_status IN ('submitted','under_review');
    WHEN 'weeding_record' THEN
      UPDATE app.weeding_records SET approval_status = p_decision::app.record_status,
        rejection_reason = CASE WHEN p_decision='rejected' THEN p_reason END
       WHERE id = p_id AND approval_status IN ('submitted','under_review');
    WHEN 'spraying_record' THEN
      UPDATE app.spraying_records SET approval_status = p_decision::app.record_status,
        rejection_reason = CASE WHEN p_decision='rejected' THEN p_reason END
       WHERE id = p_id AND approval_status IN ('submitted','under_review');
    WHEN 'harvest_record' THEN
      UPDATE app.harvest_records SET approval_status = p_decision::app.record_status,
        rejection_reason = CASE WHEN p_decision='rejected' THEN p_reason END
       WHERE id = p_id AND approval_status IN ('submitted','under_review');
    ELSE
      RAISE EXCEPTION 'modul tidak dikenal: %', p_module;
  END CASE;

  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $function$;
