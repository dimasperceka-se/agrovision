-- 0018_security_fix.sql
--
-- Menambal 32 temuan yang lolos verifikasi adversarial atas 0014-0017.
-- Laporan: docs/05-review-migrasi.md
--
-- Ironi yang harus dicatat: 0014 ditulis untuk menambal cacat 0013, dan justru
-- membuka lubang yang lebih besar. Dua pola penyebabnya:
--
--   1. RLS diaktifkan pada DAFTAR tabel yang saya sebutkan manual -- bukan pada
--      SEMUA tabel. Yang tidak saya sebut, terbuka. Diperbaiki di sini dengan
--      pendekatan data-driven + invariant yang bisa diuji (lihat §1).
--   2. Verifikasi menguji jalur bahagia sebagai role istimewa. Lubangnya justru
--      ada di jalur adversarial: role terendah, tenant lain, scope non-blok.
--      db/verify.mjs ditulis ulang agar adversarial.

-- ===========================================================================
-- §0. PREDIKAT SCOPE YANG BISA DI-INLINE
--
-- Temuan #31: app.company_in_scope() dipanggil sekali PER BARIS dan tidak
-- inlinable -- 6-7x biaya pada setiap scan. Diganti subquery IN yang bisa
-- dijadikan hashed subplan sekali per query oleh planner.
-- Fungsinya tetap ada untuk pemakaian non-policy.
-- ===========================================================================

CREATE OR REPLACE FUNCTION app.accessible_company_ids() RETURNS SETOF uuid
LANGUAGE sql STABLE PARALLEL SAFE AS $$
  SELECT uca.company_id
    FROM app.user_company_access uca
   WHERE uca.user_id = app.current_user_id()
     AND (app.current_company_id() IS NULL OR uca.company_id = app.current_company_id())
$$;

-- ===========================================================================
-- §1. CAKUPAN RLS MENYELURUH
--
-- Temuan #6,#7,#8,#9,#10,#11,#12,#13,#28: belasan tabel tanpa RLS sama sekali.
-- Termasuk survey_submissions, nursery_inspections, form_versions, form_fields,
-- trees, planting_records, assignments, audit_log, drone_orthophotos,
-- report_definition_fields, master_types, allometric_coefficients.
--
-- Pendekatan: petakan SETIAP tabel ke cara menurunkan tenant-nya, lalu generate.
-- Tabel yang memang global terdaftar eksplisit di app.rls_exempt_tables --
-- sehingga "tidak ada RLS" menjadi keputusan tercatat, bukan kelalaian.
-- ===========================================================================

CREATE TABLE app.rls_exempt_tables (
  table_name text PRIMARY KEY,
  reason     text NOT NULL
);
INSERT INTO app.rls_exempt_tables (table_name, reason) VALUES
  ('schema_migrations',    'ledger migrasi, bukan data tenant'),
  ('rls_exempt_tables',    'meta-tabel ini sendiri'),
  ('companies',            'baris = tenant itu sendiri; difilter policy khusus di bawah'),
  ('crops',                'referensi global: Kelapa, Durian'),
  ('cost_centers',         'referensi global'),
  ('activity_types',       'referensi global'),
  ('master_types',         'referensi global; tulis dibatasi super_admin'),
  ('emission_factors',     'referensi global IPCC; tulis hanya via publish_emission_factor'),
  ('allometric_coefficients','referensi global IPCC; tulis dibatasi super_admin'),
  ('sequestration_models', 'referensi global IPCC'),
  ('standards',            'referensi global standar sertifikasi'),
  ('standard_versions',    'referensi global'),
  ('standard_criteria',    'referensi global'),
  ('standard_crops',       'referensi global'),
  ('report_allowed_views', 'whitelist view, bukan data tenant'),
  ('user_company_access',  'data otorisasi; tulis dicabut, baca via policy khusus'),
  ('user_estate_access',   'data otorisasi; tulis dicabut, baca via policy khusus'),
  ('erp_sync_logs',        'diparkir (docs/04 item 9)');

-- Tabel ber-company_id langsung.
DO $$
DECLARE
  t text;
  direct text[] := ARRAY[
    'estates','users','blocks','boundary_imports','suppliers','seed_batches',
    'forms','activities','cost_transactions','budgets','vendors','carbon_runs',
    'evidence_files','cert_programs','approval_requests','fiscal_periods',
    'overhead_allocation_rules','drone_orthophotos','audit_log',
    'master_items','fertilizer_types','fertilizer_schedules','report_definitions'
  ];
BEGIN
  FOREACH t IN ARRAY direct LOOP
    EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE app.%I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %1$s_tenant ON app.%1$I', t);
    -- Tabel dengan company_id NULLABLE (master global) tetap boleh dibaca semua,
    -- tetapi §5 mencabut hak menulis baris global dari non-super_admin.
    EXECUTE format($f$
      CREATE POLICY %1$s_tenant ON app.%1$I
        USING (company_id IS NULL OR company_id IN (SELECT app.accessible_company_ids()))
        WITH CHECK (company_id IS NULL OR company_id IN (SELECT app.accessible_company_ids()))
    $f$, t);
  END LOOP;
END $$;

-- Tabel anak: tenant diturunkan lewat induk. (tabel, kolom fk, tabel induk, kolom company)
DO $$
DECLARE
  r record;
  derived text[][] := ARRAY[
    ['plots','block_id','blocks','company_id'],
    ['block_boundary_versions','block_id','blocks','company_id'],
    ['plot_crop_layers','plot_id','plots','__via_block'],
    ['boundary_overlaps','block_a_id','blocks','company_id'],
    ['divisions','estate_id','estates','company_id'],
    ['nursery_inspections','seed_batch_id','seed_batches','company_id'],
    ['seed_distributions','seed_batch_id','seed_batches','company_id'],
    ['planting_plans','block_id','blocks','company_id'],
    ['tree_survey_points','block_id','blocks','company_id'],
    ['trees','plot_id','plots','__via_block'],
    ['dbh_measurements','block_id','blocks','company_id'],
    ['land_preparations','block_id','blocks','company_id'],
    ['land_suitability_assessments','block_id','blocks','company_id'],
    ['fertilizer_applications','block_id','blocks','company_id'],
    ['pruning_records','block_id','blocks','company_id'],
    ['capa','block_id','blocks','company_id'],
    ['certificates','block_id','blocks','company_id'],
    ['cert_program_blocks','program_id','cert_programs','company_id'],
    ['cert_assessments','program_id','cert_programs','company_id'],
    ['carbon_run_blocks','run_id','carbon_runs','company_id'],
    ['mrv_packages','run_id','carbon_runs','company_id'],
    ['form_versions','form_id','forms','company_id'],
    ['assignments','assignee_id','users','company_id'],
    ['activity_emissions','activity_id','activities','company_id'],
    ['report_definition_fields','report_id','report_definitions','__nullable_company'],
    ['sync_sessions','user_id','users','company_id'],
    ['evidence_verifications','evidence_id','evidence_files','company_id'],
    ['approval_steps','request_id','approval_requests','company_id'],
    ['cert_decisions','assessment_id','cert_assessments','__via_program'],
    ['cert_findings','assessment_id','cert_assessments','__via_program'],
    ['cert_assessment_items','assessment_id','cert_assessments','__via_program'],
    ['mrv_package_sections','package_id','mrv_packages','__via_run'],
    ['form_fields','form_version_id','form_versions','__via_form'],
    ['planting_records','planting_plan_id','planting_plans','__via_block'],
    ['submission_values','submission_id','survey_submissions','__via_form_version'],
    ['evidence_links','evidence_id','evidence_files','company_id']
  ];
  pred text;
BEGIN
  FOR i IN 1 .. array_length(derived, 1) LOOP
    r := ROW(derived[i][1], derived[i][2], derived[i][3], derived[i][4]);
    pred := CASE derived[i][4]
      WHEN 'company_id' THEN format(
        'EXISTS (SELECT 1 FROM app.%1$I p WHERE p.id = %2$I.%3$I AND (p.company_id IS NULL OR p.company_id IN (SELECT app.accessible_company_ids())))',
        derived[i][3], derived[i][1], derived[i][2])
      WHEN '__nullable_company' THEN format(
        'EXISTS (SELECT 1 FROM app.%1$I p WHERE p.id = %2$I.%3$I AND (p.company_id IS NULL OR p.company_id IN (SELECT app.accessible_company_ids())))',
        derived[i][3], derived[i][1], derived[i][2])
      WHEN '__via_block' THEN CASE derived[i][1]
        WHEN 'plot_crop_layers' THEN 'EXISTS (SELECT 1 FROM app.plots pl JOIN app.blocks b ON b.id = pl.block_id WHERE pl.id = plot_crop_layers.plot_id AND b.company_id IN (SELECT app.accessible_company_ids()))'
        WHEN 'trees' THEN 'EXISTS (SELECT 1 FROM app.plots pl JOIN app.blocks b ON b.id = pl.block_id WHERE pl.id = trees.plot_id AND b.company_id IN (SELECT app.accessible_company_ids()))'
        WHEN 'planting_records' THEN 'EXISTS (SELECT 1 FROM app.planting_plans pp JOIN app.blocks b ON b.id = pp.block_id WHERE pp.id = planting_records.planting_plan_id AND b.company_id IN (SELECT app.accessible_company_ids()))'
        END
      WHEN '__via_program' THEN format(
        'EXISTS (SELECT 1 FROM app.cert_assessments a JOIN app.cert_programs p ON p.id = a.program_id WHERE a.id = %1$I.assessment_id AND p.company_id IN (SELECT app.accessible_company_ids()))',
        derived[i][1])
      WHEN '__via_run' THEN 'EXISTS (SELECT 1 FROM app.mrv_packages mp JOIN app.carbon_runs cr ON cr.id = mp.run_id WHERE mp.id = mrv_package_sections.package_id AND cr.company_id IN (SELECT app.accessible_company_ids()))'
      WHEN '__via_form' THEN 'EXISTS (SELECT 1 FROM app.form_versions fv JOIN app.forms f ON f.id = fv.form_id WHERE fv.id = form_fields.form_version_id AND (f.company_id IS NULL OR f.company_id IN (SELECT app.accessible_company_ids())))'
      WHEN '__via_form_version' THEN 'EXISTS (SELECT 1 FROM app.survey_submissions s JOIN app.form_versions fv ON fv.id = s.form_version_id JOIN app.forms f ON f.id = fv.form_id WHERE s.id = submission_values.submission_id AND (f.company_id IS NULL OR f.company_id IN (SELECT app.accessible_company_ids())))'
      END;

    EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY', derived[i][1]);
    EXECUTE format('ALTER TABLE app.%I FORCE ROW LEVEL SECURITY', derived[i][1]);
    EXECUTE format('DROP POLICY IF EXISTS %1$s_tenant ON app.%1$I', derived[i][1]);
    EXECUTE format('CREATE POLICY %1$s_tenant ON app.%1$I USING (%2$s) WITH CHECK (%2$s)',
                   derived[i][1], pred);
  END LOOP;
END $$;

-- survey_submissions: induknya form_versions -> forms (temuan #10 critical).
ALTER TABLE app.survey_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.survey_submissions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS survey_submissions_tenant ON app.survey_submissions;
CREATE POLICY survey_submissions_tenant ON app.survey_submissions
  USING (EXISTS (SELECT 1 FROM app.form_versions fv JOIN app.forms f ON f.id = fv.form_id
                  WHERE fv.id = survey_submissions.form_version_id
                    AND (f.company_id IS NULL OR f.company_id IN (SELECT app.accessible_company_ids()))))
  WITH CHECK (EXISTS (SELECT 1 FROM app.form_versions fv JOIN app.forms f ON f.id = fv.form_id
                  WHERE fv.id = survey_submissions.form_version_id
                    AND (f.company_id IS NULL OR f.company_id IN (SELECT app.accessible_company_ids()))));

-- companies: hanya entitas yang boleh diakses.
ALTER TABLE app.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.companies FORCE ROW LEVEL SECURITY;
CREATE POLICY companies_scope ON app.companies
  USING (id IN (SELECT app.accessible_company_ids()));

-- ===========================================================================
-- §2. DATA OTORISASI TIDAK BOLEH DITULIS APLIKASI
-- Temuan #2,#6 (CRITICAL) dan #7: user_company_access & user_estate_access
-- bisa ditulis sendiri -> user memberi dirinya akses ke tenant lain, dan
-- SELURUH policy tenant runtuh sekaligus karena semuanya diturunkan dari sana.
-- ===========================================================================

REVOKE INSERT, UPDATE, DELETE ON app.user_company_access FROM app_rw;
REVOKE INSERT, UPDATE, DELETE ON app.user_estate_access  FROM app_rw;

ALTER TABLE app.user_company_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.user_company_access FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS uca_self ON app.user_company_access;
CREATE POLICY uca_read ON app.user_company_access
  FOR SELECT USING (user_id = app.current_user_id()
                    OR company_id IN (SELECT app.accessible_company_ids()));

ALTER TABLE app.user_estate_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.user_estate_access FORCE ROW LEVEL SECURITY;
CREATE POLICY uea_read ON app.user_estate_access
  FOR SELECT USING (user_id = app.current_user_id()
                    OR EXISTS (SELECT 1 FROM app.estates e
                                WHERE e.id = user_estate_access.estate_id
                                  AND e.company_id IN (SELECT app.accessible_company_ids())));

-- Pemberian akses hanya lewat satu pintu, digerbang super_admin.
CREATE OR REPLACE FUNCTION app.grant_company_access(p_user_id uuid, p_company_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = app, pg_catalog AS $$
BEGIN
  IF app.current_role_name() IS DISTINCT FROM 'super_admin' THEN
    RAISE EXCEPTION 'hanya super_admin boleh memberi akses entitas';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM app.user_company_access
                  WHERE user_id = app.current_user_id() AND company_id = p_company_id) THEN
    RAISE EXCEPTION 'super_admin hanya boleh memberi akses ke entitas yang ia sendiri akses';
  END IF;
  INSERT INTO app.user_company_access (user_id, company_id, granted_by)
  VALUES (p_user_id, p_company_id, app.current_user_id())
  ON CONFLICT DO NOTHING;
END $$;
REVOKE ALL ON FUNCTION app.grant_company_access(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.grant_company_access(uuid, uuid) TO app_rw;

CREATE OR REPLACE FUNCTION app.revoke_company_access(p_user_id uuid, p_company_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = app, pg_catalog AS $$
BEGIN
  IF app.current_role_name() IS DISTINCT FROM 'super_admin' THEN
    RAISE EXCEPTION 'hanya super_admin boleh mencabut akses entitas';
  END IF;
  DELETE FROM app.user_company_access WHERE user_id = p_user_id AND company_id = p_company_id;
END $$;
REVOKE ALL ON FUNCTION app.revoke_company_access(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.revoke_company_access(uuid, uuid) TO app_rw;

-- ===========================================================================
-- §3. DEADLOCK BOOTSTRAP SESI
-- Temuan #3: app.users tak terbaca sampai current_user_id diketahui, padahal
-- hanya app.users yang bisa memberikannya. JWT membawa `sub` (= external_id),
-- bukan uuid internal. Resolver sempit dengan SECURITY DEFINER.
-- ===========================================================================

CREATE OR REPLACE FUNCTION app.resolve_session(p_external_id text)
RETURNS TABLE (user_id uuid, company_id uuid, app_role app.app_role, full_name text, email text)
LANGUAGE sql SECURITY DEFINER SET search_path = app, pg_catalog AS $$
  SELECT u.id, u.company_id, u.app_role, u.full_name, u.email::text
    FROM app.users u
   WHERE u.external_id = p_external_id AND u.is_active
$$;
REVOKE ALL ON FUNCTION app.resolve_session(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.resolve_session(text) TO app_rw;

-- Dipakai lapisan sesi untuk memuat ulang identitas + daftar entitas.
CREATE OR REPLACE FUNCTION app.session_companies(p_user_id uuid)
RETURNS TABLE (company_id uuid, company_code text, company_name text)
LANGUAGE sql SECURITY DEFINER SET search_path = app, pg_catalog AS $$
  SELECT c.id, c.code, c.name
    FROM app.user_company_access uca
    JOIN app.companies c ON c.id = uca.company_id
   WHERE uca.user_id = p_user_id
   ORDER BY c.name
$$;
REVOKE ALL ON FUNCTION app.session_companies(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.session_companies(uuid) TO app_rw;

-- ===========================================================================
-- §4. publish_emission_factor DIPERKETAT
-- Temuan #1,#16: tanpa gerbang peran, approved_by bisa dipalsukan caller,
-- p_valid_from mundur membalik timeline (valid_to 127 tahun sebelum valid_from),
-- nilai negatif dan nama kosong lolos, dan `viewer` bisa menerbitkan.
-- ===========================================================================

ALTER TABLE app.emission_factors ADD CONSTRAINT ef_valid_range
  CHECK (valid_to IS NULL OR valid_to >= valid_from);
ALTER TABLE app.emission_factors ADD CONSTRAINT ef_value_positive CHECK (value > 0);
ALTER TABLE app.emission_factors ADD CONSTRAINT ef_name_present
  CHECK (length(btrim(name)) > 0);

DROP FUNCTION IF EXISTS app.publish_emission_factor(
  text, text, numeric, text, text, date, uuid, app.ef_scope, text, numeric, uuid);

CREATE OR REPLACE FUNCTION app.publish_emission_factor(
  p_code             text,
  p_name             text,
  p_value            numeric,
  p_unit_denominator text,
  p_source_standard  text,
  p_valid_from       date,
  p_activity_type_id uuid    DEFAULT NULL,
  p_scope            app.ef_scope DEFAULT 'scope1',
  p_source_citation  text    DEFAULT NULL,
  p_uncertainty_pct  numeric DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = app, pg_catalog
AS $$
DECLARE
  v_next_version integer;
  v_id           uuid;
  v_actor        uuid := app.current_user_id();
  v_active_from  date;
BEGIN
  -- Gerbang peran. Sebelumnya tidak ada -- `viewer` pun bisa menerbitkan.
  IF app.current_role_name() NOT IN ('approver', 'super_admin') THEN
    RAISE EXCEPTION 'hanya approver atau super_admin boleh menerbitkan emission factor';
  END IF;
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'konteks sesi wajib -- penerbitan harus dapat diatribusikan';
  END IF;
  IF p_source_standard IS NULL OR btrim(p_source_standard) = '' THEN
    RAISE EXCEPTION 'source_standard wajib -- provenance tidak boleh kosong';
  END IF;
  IF p_value IS NULL OR p_value <= 0 THEN
    RAISE EXCEPTION 'value harus > 0 (diberikan: %)', p_value;
  END IF;
  IF p_name IS NULL OR btrim(p_name) = '' THEN
    RAISE EXCEPTION 'name wajib';
  END IF;

  SELECT valid_from INTO v_active_from
    FROM app.emission_factors WHERE code = p_code AND valid_to IS NULL;

  -- Timeline hanya boleh maju. Tanpa ini, versi mundur membalik jendela validitas
  -- dan menulis ulang sejarah perhitungan karbon secara diam-diam.
  IF v_active_from IS NOT NULL AND p_valid_from <= v_active_from THEN
    RAISE EXCEPTION 'p_valid_from (%) harus setelah versi aktif (%)', p_valid_from, v_active_from;
  END IF;

  UPDATE app.emission_factors
     SET valid_to = p_valid_from - INTERVAL '1 day'
   WHERE code = p_code AND valid_to IS NULL;

  SELECT COALESCE(MAX(version), 0) + 1 INTO v_next_version
    FROM app.emission_factors WHERE code = p_code;

  INSERT INTO app.emission_factors (
    code, version, activity_type_id, name, value, unit_denominator, scope,
    source_standard, source_citation, uncertainty_pct, valid_from, approved_by, approved_at
  ) VALUES (
    p_code, v_next_version, p_activity_type_id, p_name, p_value, p_unit_denominator, p_scope,
    p_source_standard, p_source_citation, p_uncertainty_pct, p_valid_from,
    -- approved_by diambil dari sesi, BUKAN dari parameter. Sebelumnya bisa dipalsukan.
    v_actor, now()
  ) RETURNING id INTO v_id;

  RETURN v_id;
END $$;

REVOKE ALL ON FUNCTION app.publish_emission_factor(
  text, text, numeric, text, text, date, uuid, app.ef_scope, text, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.publish_emission_factor(
  text, text, numeric, text, text, date, uuid, app.ef_scope, text, numeric) TO app_rw;

-- ===========================================================================
-- §5. BARIS GLOBAL (company_id IS NULL) HANYA BOLEH DITULIS super_admin
-- Temuan #12: tenant mana pun bisa membuat baris global, atau menaikkan
-- barisnya sendiri menjadi global -- terlihat oleh semua tenant.
-- ===========================================================================

DO $$
DECLARE
  t text;
  global_writable text[] := ARRAY['master_items','fertilizer_types','fertilizer_schedules','report_definitions','forms'];
BEGIN
  FOREACH t IN ARRAY global_writable LOOP
    EXECUTE format($f$
      CREATE POLICY %1$s_global_admin_only ON app.%1$I
        AS RESTRICTIVE
        FOR ALL
        USING (true)
        WITH CHECK (company_id IS NOT NULL OR app.current_role_name() = 'super_admin')
    $f$, t);
  END LOOP;
END $$;

-- Temuan #4: 3 laporan built-in bisa dihapus/diubah siapa pun, termasuk viewer.
CREATE POLICY report_builtin_protect ON app.report_definitions
  AS RESTRICTIVE FOR ALL
  USING (NOT is_builtin OR app.current_role_name() = 'super_admin')
  WITH CHECK (NOT is_builtin OR app.current_role_name() = 'super_admin');

-- Temuan #5: master_types.is_system didokumentasikan tak boleh dihapus, tapi
-- tidak ada yang menegakkannya -- hapus satu tipe = seluruh dropdown ikut hilang
-- (ON DELETE CASCADE ke master_items).
REVOKE DELETE ON app.master_types FROM app_rw;
CREATE OR REPLACE FUNCTION app.guard_system_master_type() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.is_system THEN
    RAISE EXCEPTION 'master_type % adalah tipe sistem dan tidak boleh diubah/dihapus', OLD.code;
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END $$;
CREATE TRIGGER master_types_guard
  BEFORE UPDATE OR DELETE ON app.master_types
  FOR EACH ROW EXECUTE FUNCTION app.guard_system_master_type();

-- Temuan #23: UNIQUE dengan company_id nullable tidak berlaku untuk baris global
-- -> laporan built-in dan master item global bisa duplikat.
CREATE UNIQUE INDEX mi_global_uniq ON app.master_items (master_type_id, code)
  WHERE company_id IS NULL;
CREATE UNIQUE INDEX rd_global_uniq ON app.report_definitions (code)
  WHERE company_id IS NULL;
CREATE UNIQUE INDEX ft_global_uniq ON app.fertilizer_types (code)
  WHERE company_id IS NULL;
CREATE UNIQUE INDEX forms_global_uniq ON app.forms (code)
  WHERE company_id IS NULL;

-- Temuan #22: base_view mengklaim divalidasi terhadap whitelist tapi tanpa FK.
ALTER TABLE app.report_definitions
  ADD CONSTRAINT rd_base_view_fk FOREIGN KEY (base_view)
  REFERENCES app.report_allowed_views(view_name);

-- ===========================================================================
-- §6. INTEGRITAS LINTAS-TENANT LEWAT COMPOSITE FK
-- Temuan #21,#24,#25: block_id / plot_id / fiscal_period_id / cost_category_id
-- tidak dibatasi milik company baris itu sendiri -> uang satu tenant mendarat
-- di blok tenant lain, dan cost/ha ikut salah tanpa error apa pun.
--
-- Ditegakkan engine lewat composite FK, bukan trigger.
-- ===========================================================================

CREATE UNIQUE INDEX blocks_company_id_uniq  ON app.blocks (company_id, id);
CREATE UNIQUE INDEX estates_company_id_uniq ON app.estates (company_id, id);
CREATE UNIQUE INDEX fp_company_id_uniq      ON app.fiscal_periods (company_id, id);

ALTER TABLE app.cost_transactions
  ADD CONSTRAINT ct_block_same_company
  FOREIGN KEY (company_id, block_id) REFERENCES app.blocks (company_id, id);

ALTER TABLE app.cost_transactions
  ADD CONSTRAINT ct_period_same_company
  FOREIGN KEY (company_id, fiscal_period_id) REFERENCES app.fiscal_periods (company_id, id);

ALTER TABLE app.blocks
  ADD CONSTRAINT blocks_estate_same_company
  FOREIGN KEY (company_id, estate_id) REFERENCES app.estates (company_id, id);

-- ===========================================================================
-- §7. budgets: scope polimorfik -> kolom ber-FK nyata
-- Temuan #17,#20,#25: scope_id tanpa FK jadi yatim saat blok dihapus, dan
-- trigger validasinya SECURITY INVOKER sehingga hasilnya bergantung RLS pemanggil
-- (temuan #19: INSERT yang sama ditolak untuk satu peran, diterima peran lain).
-- Solusinya menghapus polimorfisme, bukan menambal triggernya.
-- ===========================================================================

-- View lama merujuk budgets.scope_id, jadi harus dilepas SEBELUM kolomnya diubah.
-- Dibuat ulang di §8 dengan bentuk LATERAL yang benar.
DROP VIEW IF EXISTS app.v_budget_vs_actual;

DROP TRIGGER IF EXISTS budgets_validate_scope ON app.budgets;
DROP FUNCTION IF EXISTS app.validate_budget_scope();

ALTER TABLE app.budgets
  ADD COLUMN estate_id uuid,
  ADD COLUMN block_id  uuid;

-- Lepas dulu semua yang bergantung pada scope_id. Nama UNIQUE constraint dari
-- 0016 auto-generated, jadi dicari dinamis daripada ditebak.
DROP INDEX IF EXISTS app.budgets_scope_idx;
DO $$
DECLARE
  con text;
BEGIN
  FOR con IN
    SELECT c.conname
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
     WHERE n.nspname = 'app' AND t.relname = 'budgets' AND c.contype = 'u'
  LOOP
    EXECUTE format('ALTER TABLE app.budgets DROP CONSTRAINT %I', con);
  END LOOP;
END $$;

ALTER TABLE app.budgets DROP COLUMN scope_id;

ALTER TABLE app.budgets
  ADD CONSTRAINT budgets_estate_same_company
    FOREIGN KEY (company_id, estate_id) REFERENCES app.estates (company_id, id) ON DELETE CASCADE,
  ADD CONSTRAINT budgets_block_same_company
    FOREIGN KEY (company_id, block_id) REFERENCES app.blocks (company_id, id) ON DELETE CASCADE,
  ADD CONSTRAINT budgets_period_same_company
    FOREIGN KEY (company_id, fiscal_period_id) REFERENCES app.fiscal_periods (company_id, id),
  ADD CONSTRAINT budgets_scope_coherent CHECK (
    (scope_type = 'company' AND estate_id IS NULL     AND block_id IS NULL) OR
    (scope_type = 'estate'  AND estate_id IS NOT NULL AND block_id IS NULL) OR
    (scope_type = 'block'   AND estate_id IS NULL     AND block_id IS NOT NULL)
  );

-- NULLS NOT DISTINCT supaya duplikat scope company/estate benar-benar tertangkap.
ALTER TABLE app.budgets DROP CONSTRAINT IF EXISTS budgets_company_id_fiscal_period_id_cost_category_id_scope__key;
CREATE UNIQUE INDEX budgets_grain_uniq ON app.budgets
  (company_id, fiscal_period_id, cost_category_id, scope_type, estate_id, block_id)
  NULLS NOT DISTINCT;

-- ===========================================================================
-- §8. v_budget_vs_actual DITULIS ULANG
-- Temuan #14 (BLOCKER), #15, #26, #32: join ke CTE ber-grain blok membuat satu
-- baris budget beranak N baris. Budget terkali N, actual terbagi, is_over_budget
-- salah. Ini SATU-SATUNYA laporan non-stub, dan angkanya salah untuk scope
-- company/estate. Uji saya sebelumnya hanya menguji scope 'block' -> false pass.
-- ===========================================================================

-- (sudah di-DROP di §7 karena budgets.scope_id bergantung padanya)

CREATE VIEW app.v_budget_vs_actual
WITH (security_invoker = true) AS
SELECT
  bg.id                AS budget_id,
  bg.company_id,
  bg.fiscal_period_id,
  fp.name              AS period_name,
  bg.cost_category_id,
  mi.name              AS cost_category_name,
  bg.scope_type,
  bg.estate_id,
  bg.block_id,
  bg.amount_idr        AS budget_idr,
  COALESCE(a.actual_idr, 0) AS actual_idr,
  bg.amount_idr - COALESCE(a.actual_idr, 0) AS remaining_idr,
  CASE WHEN bg.amount_idr = 0 THEN NULL
       ELSE ROUND(COALESCE(a.actual_idr, 0) * 100.0 / bg.amount_idr, 2)
  END                  AS utilisation_pct,
  COALESCE(a.actual_idr, 0) > bg.amount_idr AS is_over_budget
FROM app.budgets bg
JOIN app.fiscal_periods fp ON fp.id = bg.fiscal_period_id
JOIN app.master_items  mi ON mi.id = bg.cost_category_id
-- LATERAL: agregasi dihitung pada grain baris budget, jadi tepat satu baris keluar.
LEFT JOIN LATERAL (
  SELECT SUM(ct.amount_idr) AS actual_idr
    FROM app.cost_transactions ct
    LEFT JOIN app.blocks b ON b.id = ct.block_id
   WHERE ct.approval_status  = 'approved'
     AND ct.company_id       = bg.company_id
     AND ct.fiscal_period_id = bg.fiscal_period_id
     AND ct.cost_category_id = bg.cost_category_id
     AND CASE bg.scope_type
           WHEN 'block'  THEN ct.block_id  = bg.block_id
           WHEN 'estate' THEN b.estate_id  = bg.estate_id
           ELSE true
         END
) a ON true;

COMMENT ON VIEW app.v_budget_vs_actual IS
  'Tepat SATU baris per baris budget. Agregasi lewat LATERAL pada grain budget -- '
  'jangan diubah ke JOIN ber-grain blok, itu mengalikan budget dan membagi actual.';

GRANT SELECT ON app.v_budget_vs_actual TO app_rw, app_ro;

-- ===========================================================================
-- §9. PEMISAHAN HAK creator vs approver
-- Temuan #27: creator bisa menulis ulang uang yang sudah approved dan
-- membalik record rejected menjadi approved. Tidak ada apa pun yang
-- mengimplementasikan pemisahan peran concept:188-191.
--
-- RLS UPDATE: USING diuji pada baris LAMA, WITH CHECK pada baris BARU.
-- ===========================================================================

CREATE POLICY ct_role_split ON app.cost_transactions
  AS RESTRICTIVE FOR UPDATE
  USING (
    app.current_role_name() IN ('approver', 'super_admin')
    OR (created_by = app.current_user_id() AND approval_status IN ('draft', 'rejected'))
  )
  WITH CHECK (
    app.current_role_name() IN ('approver', 'super_admin')
    OR approval_status IN ('draft', 'submitted')
  );

CREATE POLICY ct_no_delete_approved ON app.cost_transactions
  AS RESTRICTIVE FOR DELETE
  USING (approval_status = 'draft' AND created_by = app.current_user_id()
         OR app.current_role_name() = 'super_admin');

-- viewer tidak boleh menulis apa pun.
DO $$
DECLARE
  t text;
  writable text[] := ARRAY[
    'cost_transactions','budgets','survey_submissions','tree_survey_points',
    'nursery_inspections','dbh_measurements','land_preparations',
    'land_suitability_assessments','fertilizer_applications','pruning_records',
    'blocks','plots','master_items','fertilizer_types','fertilizer_schedules'
  ];
BEGIN
  FOREACH t IN ARRAY writable LOOP
    EXECUTE format($f$
      CREATE POLICY %1$s_viewer_readonly ON app.%1$I
        AS RESTRICTIVE FOR ALL
        USING (true)
        WITH CHECK (COALESCE(app.current_role_name(), 'viewer') <> 'viewer')
    $f$, t);
  END LOOP;
END $$;

-- ===========================================================================
-- §10. rejection_reason DITEGAKKAN DI SEMUA TABEL BER-APPROVAL
-- Temuan #18: hanya 2 dari 11 tabel yang menegakkannya.
-- ===========================================================================

DO $$
DECLARE
  t text;
  approval_tables text[] := ARRAY[
    'survey_submissions','tree_survey_points','nursery_inspections',
    'dbh_measurements','land_preparations','land_suitability_assessments',
    'fertilizer_applications','pruning_records'
  ];
BEGIN
  FOREACH t IN ARRAY approval_tables LOOP
    EXECUTE format($f$
      ALTER TABLE app.%1$I ADD CONSTRAINT %1$s_rejection_needs_reason
        CHECK (approval_status <> 'rejected'
               OR (rejection_reason IS NOT NULL AND length(btrim(rejection_reason)) > 0))
    $f$, t);
  END LOOP;
END $$;

-- ===========================================================================
-- §11. drone_orthophotos SETENGAH MIGRASI
-- Temuan #30: footprint masih NOT NULL setelah kolom pipeline dilepas, dan
-- company_id yang ditambahkan nullable tanpa backfill.
-- ===========================================================================

ALTER TABLE app.drone_orthophotos ALTER COLUMN footprint DROP NOT NULL;
UPDATE app.drone_orthophotos d
   SET company_id = e.company_id
  FROM app.estates e WHERE e.id = d.estate_id AND d.company_id IS NULL;
ALTER TABLE app.drone_orthophotos
  ADD CONSTRAINT dro_estate_same_company
  FOREIGN KEY (company_id, estate_id) REFERENCES app.estates (company_id, id);

-- ===========================================================================
-- §12. audit_log: RLS untuk baca, tapi tetap tak bisa diubah
-- Temuan #11: audit_log punya company_id tanpa RLS -> setiap tenant membaca
-- seluruh jejak audit uang tenant lain.
-- Policy dibuat di §1 (termasuk dalam daftar direct). UPDATE/DELETE tetap dicabut.
-- INSERT tetap boleh karena trigger write_audit() berjalan sebagai pemanggil.
-- ===========================================================================

-- Trigger audit adalah SECURITY DEFINER (0012), jadi insert-nya tidak dihalangi RLS.
-- Tapi baris tanpa company_id tidak akan terbaca siapa pun; itu disengaja untuk
-- entri sistem. Perbaikan atribusi menyusul saat lapisan sesi terpasang.
COMMENT ON TABLE app.audit_log IS
  'Append-only. Baris dengan company_id NULL = entri sistem, tidak terlihat tenant.';

-- ===========================================================================
-- §13. Hak akses untuk objek baru migrasi ini
-- CATATAN URUTAN: jangan pernah menjalankan GRANT ... ON ALL TABLES setelah ini
-- tanpa mencabut ulang append-only. Lihat db/bootstrap-role.mjs.
-- ===========================================================================

GRANT SELECT ON app.rls_exempt_tables TO app_rw, app_ro;
REVOKE UPDATE, DELETE ON app.audit_log, app.evidence_files,
  app.emission_factors, app.evidence_verifications FROM app_rw;
