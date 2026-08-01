-- 0036: Nilai TER-REFLEKSI + detail parameter di Inbox Approval; komoditas pemupukan.
--
-- Latar: "semua pengajuan bermuara di costing" — maka kolom Nilai di inbox harus
-- menampilkan rupiah hasil refleksi (volume × tarif price_list; panen = revenue
-- tonase × tarif). Modul murni observasi (Kesesuaian Lahan, Survei, DBH, Inspeksi
-- Bibit) TETAP NULL/"—" karena tidak menjadi biaya — konsisten dengan prinsip
-- kejujuran data (jangan mengarang angka).
--
-- Juga: params (jsonb) berisi nilai tiap parameter record, untuk ditampilkan saat
-- baris di inbox diklik.
--
-- PENTING: CREATE OR REPLACE VIEW menjatuhkan opsi security_invoker (regresi yang
-- diperbaiki di 0035) — jadi dipasang ULANG di akhir file ini.

-- 1) Komoditas pada aplikasi pupuk (form "Catat pemupukan").
ALTER TABLE app.fertilizer_applications
  ADD COLUMN IF NOT EXISTS crop_code text
    CHECK (crop_code IS NULL OR crop_code IN ('DURIAN', 'COCONUT'));

-- 2) View inbox: amount_idr ter-refleksi + params jsonb.
CREATE OR REPLACE VIEW app.v_pending_approvals AS
  SELECT 'cost_transaction'::text AS module_key, 'Pengeluaran'::text AS module_label,
    ct.id AS record_id, b.code AS block_code, cat.name AS detail,
    ct.amount_idr AS amount_idr,
    ct.transaction_date AS event_date, ct.submitted_at, u.full_name AS actor_name, ct.approval_status,
    jsonb_build_object('Kategori', cat.name, 'Nilai (Rp)', ct.amount_idr,
                       'Kuantitas', ct.quantity, 'Satuan', ct.unit) AS params
   FROM app.cost_transactions ct
     LEFT JOIN app.blocks b ON b.id = ct.block_id
     LEFT JOIN app.master_items cat ON cat.id = ct.cost_category_id
     LEFT JOIN app.users u ON u.id = ct.created_by
  WHERE ct.approval_status = ANY (ARRAY['submitted'::app.record_status, 'under_review'::app.record_status])
UNION ALL
  SELECT 'fertilizer_application', 'Pemupukan', fa.id, b.code,
    (((ft.name || ' — ') || fa.total_quantity) || ' ') || COALESCE(uom.name, ''),
    round(fa.total_quantity * (SELECT rate_idr FROM app.price_list WHERE code = 'FERT-KG' LIMIT 1)),
    fa.applied_on, NULL::timestamptz, u.full_name, fa.approval_status,
    jsonb_build_object('Jenis pupuk', ft.name, 'Komoditas', fa.crop_code, 'Fase', fa.growth_phase,
                       'Jumlah', fa.total_quantity, 'Satuan', COALESCE(uom.name, ''))
   FROM app.fertilizer_applications fa
     JOIN app.blocks b ON b.id = fa.block_id
     JOIN app.fertilizer_types ft ON ft.id = fa.fertilizer_type_id
     LEFT JOIN app.master_items uom ON uom.id = fa.uom_item_id
     LEFT JOIN app.users u ON u.id = fa.created_by
  WHERE fa.approval_status = ANY (ARRAY['submitted'::app.record_status, 'under_review'::app.record_status])
UNION ALL
  SELECT 'land_preparation', 'Persiapan Lahan', lp.id, b.code,
    ('Checklist — ' || COALESCE(lp.planting_hole_count::text, '?')) || ' lubang tanam',
    round(lp.effective_area_ha * (SELECT rate_idr FROM app.price_list WHERE code = 'PREP-HA' LIMIT 1)),
    lp.checked_at::date, NULL::timestamptz, u.full_name, lp.approval_status,
    jsonb_build_object('Lubang tanam', lp.planting_hole_count, 'Luas efektif (ha)', lp.effective_area_ha,
                       'pH tanah', lp.soil_ph, 'Status', lp.status)
   FROM app.land_preparations lp
     JOIN app.blocks b ON b.id = lp.block_id
     LEFT JOIN app.users u ON u.id = lp.created_by
  WHERE lp.approval_status = ANY (ARRAY['submitted'::app.record_status, 'under_review'::app.record_status])
UNION ALL
  SELECT 'land_suitability_assessment', 'Kesesuaian Lahan', lsa.id, b.code,
    (('Skor durian ' || COALESCE(lsa.score_durian::text, '—')) || ' / kelapa ') || COALESCE(lsa.score_coconut::text, '—'),
    NULL::numeric, lsa.assessed_at::date, NULL::timestamptz, u.full_name, lsa.approval_status,
    jsonb_build_object('Skor durian', lsa.score_durian, 'Skor kelapa', lsa.score_coconut,
                       'Lereng (%)', lsa.slope_pct, 'Curah hujan (mm/th)', lsa.rainfall_mm_year,
                       'Elevasi (m)', lsa.elevation_m)
   FROM app.land_suitability_assessments lsa
     JOIN app.blocks b ON b.id = lsa.block_id
     LEFT JOIN app.users u ON u.id = lsa.created_by
  WHERE lsa.approval_status = ANY (ARRAY['submitted'::app.record_status, 'under_review'::app.record_status])
UNION ALL
  SELECT 'pruning_record', 'Pruning', pr.id, b.code,
    COALESCE(pr.tree_count::text || ' pohon', 'Pruning'),
    round(pr.tree_count * (SELECT rate_idr FROM app.price_list WHERE code = 'PRUNE-TREE' LIMIT 1)),
    pr.pruned_on, NULL::timestamptz, u.full_name, pr.approval_status,
    jsonb_build_object('Jumlah pohon', pr.tree_count, 'Catatan', pr.note)
   FROM app.pruning_records pr
     JOIN app.blocks b ON b.id = pr.block_id
     LEFT JOIN app.users u ON u.id = pr.created_by
  WHERE pr.approval_status = ANY (ARRAY['submitted'::app.record_status, 'under_review'::app.record_status])
UNION ALL
  SELECT 'nursery_inspection', 'Inspeksi Bibit', ni.id, sb.code,
    (((('Hidup ' || ni.qty_alive) || ' · mati ') || ni.qty_dead) || ' · rusak ') || ni.qty_damaged,
    NULL::numeric, ni.inspected_at::date, NULL::timestamptz, u.full_name, ni.approval_status,
    jsonb_build_object('Hidup', ni.qty_alive, 'Mati', ni.qty_dead, 'Rusak', ni.qty_damaged)
   FROM app.nursery_inspections ni
     JOIN app.seed_batches sb ON sb.id = ni.seed_batch_id
     LEFT JOIN app.users u ON u.id = ni.inspector_id
  WHERE ni.approval_status = ANY (ARRAY['submitted'::app.record_status, 'under_review'::app.record_status])
UNION ALL
  SELECT 'dbh_measurement', 'Pengukuran DBH', dm.id, b.code,
    ('DBH ' || dm.dbh_cm) || ' cm',
    NULL::numeric, dm.measured_at::date, NULL::timestamptz, u.full_name, dm.approval_status,
    jsonb_build_object('DBH (cm)', dm.dbh_cm, 'Tinggi (m)', dm.height_m)
   FROM app.dbh_measurements dm
     JOIN app.blocks b ON b.id = dm.block_id
     LEFT JOIN app.users u ON u.id = dm.measured_by
  WHERE dm.approval_status = ANY (ARRAY['submitted'::app.record_status, 'under_review'::app.record_status])
UNION ALL
  SELECT 'survey_submission', 'Survei', ss.id, b.code,
    f.name, NULL::numeric, ss.submitted_at::date, ss.synced_at, u.full_name, ss.approval_status,
    jsonb_build_object('Form', f.name)
   FROM app.survey_submissions ss
     JOIN app.form_versions fv ON fv.id = ss.form_version_id
     JOIN app.forms f ON f.id = fv.form_id
     LEFT JOIN app.blocks b ON b.id = ss.block_id
     LEFT JOIN app.users u ON u.id = ss.submitted_by
  WHERE ss.approval_status = ANY (ARRAY['submitted'::app.record_status, 'under_review'::app.record_status])
UNION ALL
  SELECT 'weeding_record', 'Penyiangan', w.id, b.code,
    COALESCE(w.method, 'Penyiangan') || COALESCE(' · ' || w.area_ha::text || ' ha', ''),
    round(w.area_ha * (SELECT rate_idr FROM app.price_list WHERE code = 'WEED-HA' LIMIT 1)),
    w.weeded_on, NULL::timestamptz, u.full_name, w.approval_status,
    jsonb_build_object('Metode', w.method, 'Luas (ha)', w.area_ha, 'Jumlah tenaga', w.labor_count, 'Catatan', w.note)
   FROM app.weeding_records w
     JOIN app.blocks b ON b.id = w.block_id
     LEFT JOIN app.users u ON u.id = w.created_by
  WHERE w.approval_status = ANY (ARRAY['submitted'::app.record_status, 'under_review'::app.record_status])
UNION ALL
  SELECT 'spraying_record', 'Penyemprotan', s.id, b.code,
    COALESCE(ch.name, 'Semprot') || COALESCE(' · ' || s.target, ''),
    round(s.total_volume * (SELECT rate_idr FROM app.price_list WHERE code = 'SPRAY-L' LIMIT 1)),
    s.sprayed_on, NULL::timestamptz, u.full_name, s.approval_status,
    jsonb_build_object('Bahan', ch.name, 'Target', s.target, 'Dosis/ha', s.dose_per_ha,
                       'Volume total', s.total_volume, 'Satuan', s.unit)
   FROM app.spraying_records s
     JOIN app.blocks b ON b.id = s.block_id
     LEFT JOIN app.agri_input_chemicals ch ON ch.id = s.chemical_id
     LEFT JOIN app.users u ON u.id = s.created_by
  WHERE s.approval_status = ANY (ARRAY['submitted'::app.record_status, 'under_review'::app.record_status])
UNION ALL
  SELECT 'harvest_record', 'Panen', h.id, b.code,
    ((h.crop_code || ' · ') || h.quantity_ton::text || ' ton') || COALESCE(' · ' || h.grade, ''),
    round(h.quantity_ton * (SELECT rate_idr FROM app.price_list
       WHERE code = CASE h.crop_code WHEN 'DURIAN' THEN 'REV-DUR-A' ELSE 'REV-COCO' END LIMIT 1)),
    h.harvested_on, NULL::timestamptz, u.full_name, h.approval_status,
    jsonb_build_object('Komoditas', h.crop_code, 'Tonase (ton)', h.quantity_ton, 'Grade', h.grade)
   FROM app.harvest_records h
     JOIN app.blocks b ON b.id = h.block_id
     LEFT JOIN app.users u ON u.id = h.created_by
  WHERE h.approval_status = ANY (ARRAY['submitted'::app.record_status, 'under_review'::app.record_status]);

-- 3) Pasang ULANG security_invoker (WAJIB — CREATE OR REPLACE menjatuhkannya).
ALTER VIEW app.v_pending_approvals SET (security_invoker = true);
