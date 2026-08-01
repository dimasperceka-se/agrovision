-- 0014_core_fix.sql
--
-- Menambal cacat yang ditemukan audit pada 0001-0013. Lihat:
--   docs/03-audit-refinement.md  (audit)
--   docs/02-keputusan-arsitektur.md "Cacat terkonfirmasi"
--
-- Empat cacat ditambal di sini:
--   1. emission_factors tidak bisa di-supersede (REVOKE UPDATE vs partial unique index)
--   2. evidence_files tidak bisa diverifikasi (kolom verified_* butuh UPDATE yang dicabut)
--   3. RLS surveyor inert (dua policy PERMISSIVE di-OR, bukan di-AND)
--   4. empat tabel anak tanpa policy
--
-- Plus: multi-tenancy nyata, state machine approval kanonik, nilai enum -> Inggris,
--       blocks.geom nullable.

-- ===========================================================================
-- 1. MULTI-TENANCY NYATA
-- concept:15,192 -- satu user boleh mengakses beberapa entitas korporat.
-- users.company_id tetap ada sebagai "home entity" (default form, bukan otorisasi).
-- ===========================================================================

CREATE TABLE app.user_company_access (
  user_id     uuid NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
  company_id  uuid NOT NULL REFERENCES app.companies(id) ON DELETE CASCADE,
  granted_at  timestamptz NOT NULL DEFAULT now(),
  granted_by  uuid REFERENCES app.users(id),
  PRIMARY KEY (user_id, company_id)
);
CREATE INDEX uca_company_idx ON app.user_company_access (company_id);

COMMENT ON TABLE app.user_company_access IS
  'Sumber otorisasi tenant. users.company_id hanya home entity, BUKAN untuk otorisasi.';

-- Setiap user existing mendapat akses ke home entity-nya.
INSERT INTO app.user_company_access (user_id, company_id)
SELECT id, company_id FROM app.users
ON CONFLICT DO NOTHING;

-- ===========================================================================
-- 2. PERAN -- disejajarkan dengan concept:188-191
-- creator (entri data) / approver (superset creator) / super_admin (master data)
-- + viewer untuk management & direktur keuangan yang hanya membaca laporan (concept:16)
-- ===========================================================================

CREATE TYPE app.app_role AS ENUM ('creator', 'approver', 'super_admin', 'viewer');

ALTER TABLE app.users ADD COLUMN app_role app.app_role;

UPDATE app.users SET app_role = CASE role
  WHEN 'admin'                 THEN 'super_admin'
  WHEN 'manager'               THEN 'viewer'
  WHEN 'approver'              THEN 'approver'
  WHEN 'sustainability_manager' THEN 'approver'
  WHEN 'auditor'               THEN 'approver'
  WHEN 'supervisor'            THEN 'approver'
  WHEN 'surveyor'              THEN 'creator'
  ELSE 'viewer'
END::app.app_role;

ALTER TABLE app.users ALTER COLUMN app_role SET NOT NULL;
ALTER TABLE app.users ALTER COLUMN app_role SET DEFAULT 'viewer';

-- Kolom lama disimpan sementara supaya tidak ada perubahan destruktif dalam satu langkah.
COMMENT ON COLUMN app.users.role IS 'DEPRECATED -- pakai app_role. Dihapus di migrasi berikutnya.';

-- ===========================================================================
-- 3. STATE MACHINE APPROVAL KANONIK
-- concept:187 -- draft -> submitted -> under_review -> approved | rejected
-- Enum lama (menunggu/disetujui/ditolak/dibatalkan) tidak punya submitted & under_review.
-- Nilai enum tidak bisa di-DROP di Postgres, jadi tipe dibuat ulang lalu ditukar.
-- ===========================================================================

CREATE TYPE app.record_status AS ENUM (
  'draft', 'submitted', 'under_review', 'approved', 'rejected', 'cancelled'
);

-- approval_requests.status -> tipe baru
ALTER TABLE app.approval_requests ADD COLUMN status_new app.record_status;
UPDATE app.approval_requests SET status_new = CASE status::text
  WHEN 'menunggu'   THEN 'under_review'
  WHEN 'disetujui'  THEN 'approved'
  WHEN 'ditolak'    THEN 'rejected'
  WHEN 'dibatalkan' THEN 'cancelled'
END::app.record_status;
ALTER TABLE app.approval_requests DROP COLUMN status;
ALTER TABLE app.approval_requests RENAME COLUMN status_new TO status;
ALTER TABLE app.approval_requests ALTER COLUMN status SET NOT NULL;
ALTER TABLE app.approval_requests ALTER COLUMN status SET DEFAULT 'submitted';

ALTER TABLE app.approval_requests
  ADD COLUMN rejection_reason    text,
  ADD COLUMN resubmitted_from_id uuid REFERENCES app.approval_requests(id);

-- concept:187 -- penolakan WAJIB membawa alasan.
ALTER TABLE app.approval_requests ADD CONSTRAINT approval_rejection_needs_reason
  CHECK (status <> 'rejected' OR (rejection_reason IS NOT NULL AND length(btrim(rejection_reason)) > 0));

CREATE INDEX approval_pending_idx2 ON app.approval_requests (company_id, approval_type)
  WHERE status IN ('submitted', 'under_review');

-- approval_type: buang nilai yang merujuk entitas yang diparkir
-- (carbon_calculation_run, mrv_package, emission_factor) -- docs/04 item 15.
CREATE TYPE app.approval_type_v2 AS ENUM (
  'expenditure', 'budget', 'polygon', 'survey', 'seedling_monitoring',
  'land_preparation', 'land_suitability', 'fertilizer_application',
  'pruning', 'aoc_survey', 'dbh_measurement', 'certification_assessment'
);
ALTER TABLE app.approval_requests ADD COLUMN approval_type_new app.approval_type_v2;
UPDATE app.approval_requests SET approval_type_new = CASE approval_type::text
  WHEN 'polygon'            THEN 'polygon'
  WHEN 'survey'             THEN 'survey'
  WHEN 'cost_allocation'    THEN 'expenditure'
  WHEN 'planting_progress'  THEN 'survey'
  WHEN 'tree_inventory'     THEN 'survey'
  ELSE 'survey'
END::app.approval_type_v2;
ALTER TABLE app.approval_requests DROP COLUMN approval_type;
ALTER TABLE app.approval_requests RENAME COLUMN approval_type_new TO approval_type;
ALTER TABLE app.approval_requests ALTER COLUMN approval_type SET NOT NULL;
DROP TYPE app.approval_type;
ALTER TYPE app.approval_type_v2 RENAME TO approval_type;

ALTER TABLE app.approval_steps
  ADD COLUMN required_app_role app.app_role,
  ADD COLUMN rejection_reason  text;

-- Kolom approval_status pada entitas asal (concept:52,205).
-- Inilah yang membuat status "menggerakkan hak akses dan tampilan di modul asal".
ALTER TABLE app.survey_submissions
  ADD COLUMN approval_status   app.record_status NOT NULL DEFAULT 'draft',
  ADD COLUMN rejection_reason  text,
  ADD COLUMN approval_id       uuid REFERENCES app.approval_requests(id);

ALTER TABLE app.tree_survey_points
  ADD COLUMN approval_status   app.record_status NOT NULL DEFAULT 'draft',
  ADD COLUMN rejection_reason  text,
  ADD COLUMN approval_id       uuid REFERENCES app.approval_requests(id);

ALTER TABLE app.nursery_inspections
  ADD COLUMN approval_status   app.record_status NOT NULL DEFAULT 'draft',
  ADD COLUMN rejection_reason  text,
  ADD COLUMN approval_id       uuid REFERENCES app.approval_requests(id),
  ADD COLUMN created_by        uuid REFERENCES app.users(id);

-- Record rejected harus mudah dikecualikan dari perhitungan laporan (AT4).
CREATE INDEX ss_approved_idx  ON app.survey_submissions (block_id) WHERE approval_status = 'approved';
CREATE INDEX tsp_approved_idx ON app.tree_survey_points (block_id) WHERE approval_status = 'approved';

-- ===========================================================================
-- 4. CACAT 1 -- emission_factors tidak bisa di-supersede
--
-- 0013_rls.sql:18 mencabut UPDATE dari app_rw, tetapi 0009_carbon.sql:33
-- (ef_active_uniq ON (code) WHERE valid_to IS NULL) mewajibkan versi lama
-- ditutup lewat UPDATE valid_to sebelum versi baru masuk. Mustahil bagi app_rw.
--
-- Solusi: SECURITY DEFINER function. Tabel tetap tidak bisa di-UPDATE langsung,
-- tetapi penerbitan versi baru berjalan atomik lewat satu pintu yang terkontrol.
-- ===========================================================================

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
  p_uncertainty_pct  numeric DEFAULT NULL,
  p_approved_by      uuid    DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, public
AS $$
DECLARE
  v_next_version integer;
  v_id           uuid;
BEGIN
  IF p_source_standard IS NULL OR btrim(p_source_standard) = '' THEN
    RAISE EXCEPTION 'source_standard wajib -- provenance tidak boleh kosong (concept:141)';
  END IF;

  -- Tutup versi aktif. valid_to = sehari sebelum versi baru berlaku,
  -- supaya tidak ada celah maupun tumpang tindih tanggal.
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
    p_source_standard, p_source_citation, p_uncertainty_pct, p_valid_from, p_approved_by,
    CASE WHEN p_approved_by IS NULL THEN NULL ELSE now() END
  ) RETURNING id INTO v_id;

  RETURN v_id;
END $$;

REVOKE ALL ON FUNCTION app.publish_emission_factor(
  text, text, numeric, text, text, date, uuid, app.ef_scope, text, numeric, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.publish_emission_factor(
  text, text, numeric, text, text, date, uuid, app.ef_scope, text, numeric, uuid) TO app_rw;

COMMENT ON FUNCTION app.publish_emission_factor IS
  'Satu-satunya jalan menerbitkan versi emission factor. Tabelnya append-only bagi app_rw.';

-- ===========================================================================
-- 5. CACAT 2 -- evidence_files tidak bisa diverifikasi
-- Kolom verified_at/verified_by butuh UPDATE, yang dicabut di 0013_rls.sql:17.
-- Verifikasi dipindah ke tabel append-only -- konsisten dengan prinsip §3.7.
-- ===========================================================================

CREATE TYPE app.verification_outcome AS ENUM ('verified', 'rejected', 'superseded');

CREATE TABLE app.evidence_verifications (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id  uuid NOT NULL REFERENCES app.evidence_files(id) ON DELETE CASCADE,
  outcome      app.verification_outcome NOT NULL,
  note         text,
  verified_by  uuid REFERENCES app.users(id),
  verified_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ev_rejected_needs_note
    CHECK (outcome <> 'rejected' OR (note IS NOT NULL AND length(btrim(note)) > 0))
);
CREATE INDEX ev_evidence_idx ON app.evidence_verifications (evidence_id, verified_at DESC);

-- Dua sumber kebenaran dihapus: status verifikasi hanya dari tabel di atas.
ALTER TABLE app.evidence_files DROP COLUMN verified_at;
ALTER TABLE app.evidence_files DROP COLUMN verified_by;

-- Lampiran perlu tahu miliknya blok mana (bukti pembelian per blok, layer drone).
ALTER TABLE app.evidence_files ADD COLUMN block_id uuid REFERENCES app.blocks(id);
CREATE INDEX evidence_block_idx ON app.evidence_files (block_id);

-- docs/04 item 8 -- pipeline drone disederhanakan jadi lampiran + map layer.
ALTER TABLE app.drone_orthophotos
  DROP COLUMN cog_path,
  DROP COLUMN gsd_cm,
  DROP COLUMN tile_url,
  ADD COLUMN company_id  uuid REFERENCES app.companies(id),
  ADD COLUMN evidence_id uuid REFERENCES app.evidence_files(id);

-- ===========================================================================
-- 6. blocks.geom NULLABLE
-- concept:227 dijawab "polygon bisa diimpor DAN digambar" -- artinya blok harus
-- bisa didaftarkan sebelum batasnya ada. 3.300 blok tidak mungkin sekali jadi.
-- ===========================================================================

ALTER TABLE app.blocks ALTER COLUMN geom DROP NOT NULL;
COMMENT ON COLUMN app.blocks.geom IS
  'NULL = blok terdaftar tapi belum didigitasi. Peta hanya merender yang NOT NULL.';

-- Indeks keyset pagination -- concept:49, ~3.300 blok.
CREATE INDEX blocks_keyset_idx ON app.blocks (company_id, code) WHERE archived_at IS NULL;
CREATE INDEX blocks_pending_geom_idx ON app.blocks (company_id) WHERE geom IS NULL;

-- ===========================================================================
-- 7. NILAI ENUM -> BAHASA INGGRIS
-- Keputusan #12. Label Indonesia disediakan di layer UI.
-- ALTER TYPE ... RENAME VALUE mempertahankan data yang sudah ada.
-- ===========================================================================

ALTER TYPE app.tree_condition RENAME VALUE 'baik'   TO 'good';
ALTER TYPE app.tree_condition RENAME VALUE 'sedang' TO 'fair';
ALTER TYPE app.tree_condition RENAME VALUE 'buruk'  TO 'poor';
ALTER TYPE app.tree_condition RENAME VALUE 'mati'   TO 'dead';

ALTER TYPE app.growth_phase RENAME VALUE 'bibit'      TO 'seedling';
ALTER TYPE app.growth_phase RENAME VALUE 'vegetatif'  TO 'vegetative';
ALTER TYPE app.growth_phase RENAME VALUE 'produktif'  TO 'productive';

ALTER TYPE app.plan_status RENAME VALUE 'tertunda'   TO 'delayed';
ALTER TYPE app.plan_status RENAME VALUE 'selesai'    TO 'completed';
ALTER TYPE app.plan_status RENAME VALUE 'dibatalkan' TO 'cancelled';

ALTER TYPE app.cost_status RENAME VALUE 'menunggu'  TO 'pending';
ALTER TYPE app.cost_status RENAME VALUE 'disetujui' TO 'approved';
ALTER TYPE app.cost_status RENAME VALUE 'ditolak'   TO 'rejected';

ALTER TYPE app.run_status RENAME VALUE 'menunggu_approval' TO 'pending_approval';

ALTER TYPE app.priority RENAME VALUE 'rendah' TO 'low';
ALTER TYPE app.priority RENAME VALUE 'sedang' TO 'medium';
ALTER TYPE app.priority RENAME VALUE 'tinggi' TO 'high';

ALTER TYPE app.evidence_type RENAME VALUE 'foto'         TO 'photo';
ALTER TYPE app.evidence_type RENAME VALUE 'dokumen'      TO 'document';
ALTER TYPE app.evidence_type RENAME VALUE 'tanda_tangan' TO 'signature';

ALTER TYPE app.field_type RENAME VALUE 'teks'            TO 'text';
ALTER TYPE app.field_type RENAME VALUE 'angka'           TO 'number';
ALTER TYPE app.field_type RENAME VALUE 'tanggal'         TO 'date';
ALTER TYPE app.field_type RENAME VALUE 'pilihan_tunggal' TO 'single_choice';
ALTER TYPE app.field_type RENAME VALUE 'pilihan_ganda'   TO 'multi_choice';
ALTER TYPE app.field_type RENAME VALUE 'skala'           TO 'scale';
ALTER TYPE app.field_type RENAME VALUE 'tabel'           TO 'table';
ALTER TYPE app.field_type RENAME VALUE 'foto'            TO 'photo';
ALTER TYPE app.field_type RENAME VALUE 'dokumen'         TO 'document';
ALTER TYPE app.field_type RENAME VALUE 'tanda_tangan'    TO 'signature';

-- field_type butuh referensi ke master table (concept:33,63) -- bukan hanya options jsonb.
ALTER TABLE app.form_fields ADD COLUMN master_type_code text;
COMMENT ON COLUMN app.form_fields.master_type_code IS
  'Bila terisi, opsi dropdown diambil dari app.master_items (lihat 0015_master).';

-- ===========================================================================
-- 8. CACAT 3 & 4 -- RLS DITULIS ULANG
--
-- Cacat 3: blocks_tenant dan blocks_estate_scope keduanya PERMISSIVE. Postgres
-- meng-OR policy permissive sejenis, dan blocks_tenant sudah TRUE untuk seluruh
-- blok dalam company -- sehingga pembatasan per-estate menjadi inert.
-- Perbaikan: policy pembatas harus AS RESTRICTIVE (di-AND).
--
-- Sekaligus: tenant scope pindah dari "= satu company" ke "IN company yang
-- boleh diakses user" supaya multi-tenancy benar-benar berfungsi.
-- ===========================================================================

CREATE OR REPLACE FUNCTION app.company_in_scope(p_company_id uuid) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
           SELECT 1 FROM app.user_company_access uca
            WHERE uca.user_id    = app.current_user_id()
              AND uca.company_id = p_company_id
         )
     -- current_company_id opsional: NULL = mode "semua entitas saya",
     -- terisi = user sedang memilih satu entitas di switcher.
     AND (app.current_company_id() IS NULL OR p_company_id = app.current_company_id())
$$;

DO $$
DECLARE
  t text;
  tenant_tables text[] := ARRAY[
    'estates','users','blocks','boundary_imports','suppliers','seed_batches',
    'forms','activities','cost_transactions','budgets','vendors',
    'carbon_runs','evidence_files','cert_programs','approval_requests'
  ];
BEGIN
  FOREACH t IN ARRAY tenant_tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS %1$s_tenant ON app.%1$I', t);
    EXECUTE format($f$
      CREATE POLICY %1$s_tenant ON app.%1$I
        USING (app.company_in_scope(company_id))
        WITH CHECK (app.company_in_scope(company_id))
    $f$, t);
  END LOOP;
END $$;

-- CACAT 3: policy pembatas creator -> RESTRICTIVE, sehingga di-AND bukan di-OR.
-- Memakai app.current_role_name() yang sudah ada dari 0013_rls.sql:31.
DROP POLICY IF EXISTS blocks_estate_scope ON app.blocks;
CREATE POLICY blocks_estate_scope ON app.blocks
  AS RESTRICTIVE
  FOR SELECT
  USING (
    COALESCE(app.current_role_name(), 'viewer') <> 'creator'
    OR estate_id IN (
      SELECT estate_id FROM app.user_estate_access
       WHERE user_id = app.current_user_id()
    )
  );

-- CACAT 4: empat tabel anak yang belum punya policy.
ALTER TABLE app.submission_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY sv_tenant ON app.submission_values
  USING (EXISTS (
    SELECT 1 FROM app.survey_submissions s
     WHERE s.id = submission_values.submission_id
       AND EXISTS (SELECT 1 FROM app.forms f
                    WHERE f.id = (SELECT form_id FROM app.form_versions
                                   WHERE id = s.form_version_id)
                      AND app.company_in_scope(f.company_id))
  ));

ALTER TABLE app.cert_assessment_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY cai_tenant ON app.cert_assessment_items
  USING (EXISTS (
    SELECT 1 FROM app.cert_assessments a
      JOIN app.cert_programs p ON p.id = a.program_id
     WHERE a.id = cert_assessment_items.assessment_id
       AND app.company_in_scope(p.company_id)
  ));

ALTER TABLE app.capa ENABLE ROW LEVEL SECURITY;
CREATE POLICY capa_tenant ON app.capa
  USING (EXISTS (
    SELECT 1 FROM app.blocks b
     WHERE b.id = capa.block_id AND app.company_in_scope(b.company_id)
  ));

ALTER TABLE app.approval_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY as_tenant ON app.approval_steps
  USING (EXISTS (
    SELECT 1 FROM app.approval_requests r
     WHERE r.id = approval_steps.request_id AND app.company_in_scope(r.company_id)
  ));

-- Tabel anak baru dari migrasi ini.
ALTER TABLE app.evidence_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY evv_tenant ON app.evidence_verifications
  USING (EXISTS (
    SELECT 1 FROM app.evidence_files e
     WHERE e.id = evidence_verifications.evidence_id AND app.company_in_scope(e.company_id)
  ));

ALTER TABLE app.user_company_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY uca_self ON app.user_company_access
  USING (user_id = app.current_user_id() OR app.company_in_scope(company_id));

-- Policy anak yang sudah ada dari 0013 memakai current_company_id() langsung.
-- Diselaraskan ke company_in_scope().
DROP POLICY IF EXISTS plots_tenant ON app.plots;
CREATE POLICY plots_tenant ON app.plots
  USING (EXISTS (SELECT 1 FROM app.blocks b
                  WHERE b.id = plots.block_id AND app.company_in_scope(b.company_id)));

DROP POLICY IF EXISTS tsp_tenant ON app.tree_survey_points;
CREATE POLICY tsp_tenant ON app.tree_survey_points
  USING (EXISTS (SELECT 1 FROM app.blocks b
                  WHERE b.id = tree_survey_points.block_id AND app.company_in_scope(b.company_id)));

DROP POLICY IF EXISTS cert_assess_tenant ON app.cert_assessments;
CREATE POLICY cert_assess_tenant ON app.cert_assessments
  USING (EXISTS (SELECT 1 FROM app.cert_programs p
                  WHERE p.id = cert_assessments.program_id AND app.company_in_scope(p.company_id)));

DROP POLICY IF EXISTS crb_tenant ON app.carbon_run_blocks;
CREATE POLICY crb_tenant ON app.carbon_run_blocks
  USING (EXISTS (SELECT 1 FROM app.carbon_runs r
                  WHERE r.id = carbon_run_blocks.run_id AND app.company_in_scope(r.company_id)));

-- Hak akses untuk objek baru.
GRANT SELECT, INSERT, UPDATE, DELETE ON app.user_company_access TO app_rw;
GRANT SELECT, INSERT ON app.evidence_verifications TO app_rw;
GRANT SELECT ON app.user_company_access, app.evidence_verifications TO app_ro;
REVOKE UPDATE, DELETE ON app.evidence_verifications FROM app_rw;
