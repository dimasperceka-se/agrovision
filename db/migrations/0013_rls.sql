-- 0013_rls.sql
-- Row Level Security, GRANT, dan penegakan append-only.
-- Lihat docs/01-desain-skema-database.md §3.7, §14

-- Aplikasi men-set konteks ini di awal setiap transaksi, dari klaim JWT
-- Identity Platform:
--   SET LOCAL app.current_company_id = '...';
--   SET LOCAL app.current_user_id    = '...';
--   SET LOCAL app.current_role       = 'surveyor';

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA app TO app_rw;
GRANT SELECT ON ALL TABLES IN SCHEMA app TO app_ro;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA app TO app_rw;

-- §3.7 Append-only ditegakkan di level hak akses, bukan disiplin developer.
REVOKE UPDATE, DELETE ON app.audit_log       FROM app_rw;
REVOKE UPDATE, DELETE ON app.evidence_files  FROM app_rw;
REVOKE UPDATE, DELETE ON app.emission_factors FROM app_rw;

-- Helper: konteks request saat ini.
CREATE OR REPLACE FUNCTION app.current_company_id() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.current_company_id', true), '')::uuid
$$;

CREATE OR REPLACE FUNCTION app.current_user_id() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.current_user_id', true), '')::uuid
$$;

CREATE OR REPLACE FUNCTION app.current_role_name() RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.current_role', true), '')
$$;

-- ---------------------------------------------------------------------------
-- Tabel dengan company_id: isolasi tenant langsung.
-- ---------------------------------------------------------------------------
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
    EXECUTE format('ALTER TABLE app.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE app.%I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format($f$
      CREATE POLICY %1$s_tenant ON app.%1$I
        USING (company_id = app.current_company_id())
        WITH CHECK (company_id = app.current_company_id())
    $f$, t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Surveyor hanya melihat estate yang ditugaskan padanya.
-- Peran lain melihat seluruh company.
-- ---------------------------------------------------------------------------
CREATE POLICY blocks_estate_scope ON app.blocks
  FOR SELECT USING (
    COALESCE(app.current_role_name(), 'viewer') <> 'surveyor'
    OR estate_id IN (
      SELECT estate_id FROM app.user_estate_access
      WHERE user_id = app.current_user_id()
    )
  );

-- ---------------------------------------------------------------------------
-- Tabel anak tanpa company_id: tenant diturunkan lewat join ke induk.
-- ---------------------------------------------------------------------------
ALTER TABLE app.plots ENABLE ROW LEVEL SECURITY;
CREATE POLICY plots_tenant ON app.plots
  USING (EXISTS (
    SELECT 1 FROM app.blocks b
    WHERE b.id = plots.block_id AND b.company_id = app.current_company_id()
  ));

ALTER TABLE app.tree_survey_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY tsp_tenant ON app.tree_survey_points
  USING (EXISTS (
    SELECT 1 FROM app.blocks b
    WHERE b.id = tree_survey_points.block_id AND b.company_id = app.current_company_id()
  ));

ALTER TABLE app.cert_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY cert_assess_tenant ON app.cert_assessments
  USING (EXISTS (
    SELECT 1 FROM app.cert_programs p
    WHERE p.id = cert_assessments.program_id AND p.company_id = app.current_company_id()
  ));

ALTER TABLE app.carbon_run_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY crb_tenant ON app.carbon_run_blocks
  USING (EXISTS (
    SELECT 1 FROM app.carbon_runs r
    WHERE r.id = carbon_run_blocks.run_id AND r.company_id = app.current_company_id()
  ));

-- CATATAN: pola di atas masih perlu diterapkan ke sisa tabel anak
-- (submission_values, cert_assessment_items, capa, approval_steps, dst).
-- Sengaja belum dilengkapi supaya tiap policy ditulis sadar, bukan digenerate buta.
