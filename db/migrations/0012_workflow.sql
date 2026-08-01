-- 0012_workflow.sql
-- Approval berjenjang, audit log append-only, plus FK melingkar yang ditunda.
-- Lihat docs/01-desain-skema-database.md §10.5

-- 8 tipe dari `types` di approval/page.tsx (satu lebih banyak dari dummy.ts)
CREATE TYPE app.approval_type AS ENUM (
  'polygon','survey','planting_progress','tree_inventory',
  'cost_allocation','emission_factor','carbon_calculation_run','mrv_package'
);
CREATE TYPE app.approval_status AS ENUM ('menunggu','disetujui','ditolak','dibatalkan');

CREATE TABLE app.approval_requests (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code           text NOT NULL UNIQUE,      -- 'APV-001'
  company_id     uuid NOT NULL REFERENCES app.companies(id),
  approval_type  app.approval_type NOT NULL,
  entity_type    text NOT NULL,
  entity_id      uuid NOT NULL,
  title          text NOT NULL,
  payload_before jsonb,                     -- snapshot untuk diff
  payload_after  jsonb,
  requested_by   uuid NOT NULL REFERENCES app.users(id),
  requested_at   timestamptz NOT NULL DEFAULT now(),
  status         app.approval_status NOT NULL DEFAULT 'menunggu',
  closed_at      timestamptz
);
CREATE INDEX approval_pending_idx ON app.approval_requests (company_id, approval_type)
  WHERE status = 'menunggu';
CREATE INDEX approval_entity_idx ON app.approval_requests (entity_type, entity_id);

CREATE TABLE app.approval_steps (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id    uuid NOT NULL REFERENCES app.approval_requests(id) ON DELETE CASCADE,
  step_order    integer NOT NULL,
  approver_id   uuid REFERENCES app.users(id),
  required_role app.user_role,
  action        text,                        -- approve|reject|request_revision
  comment       text,
  acted_at      timestamptz,
  UNIQUE (request_id, step_order)
);

-- §3.7 APPEND-ONLY. Hak UPDATE/DELETE dicabut dari app_rw di 0013.
CREATE TABLE app.audit_log (
  id          bigserial PRIMARY KEY,
  company_id  uuid,
  actor_id    uuid,
  action      text NOT NULL,          -- insert|update|delete|approve|export|login
  entity_type text NOT NULL,
  entity_id   uuid,
  diff        jsonb,
  ip_address  inet,
  user_agent  text,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_entity_idx ON app.audit_log (entity_type, entity_id, occurred_at DESC);
CREATE INDEX audit_actor_idx  ON app.audit_log (actor_id, occurred_at DESC);

-- FK melingkar yang ditunda dari 0003.
ALTER TABLE app.block_boundary_versions
  ADD CONSTRAINT bbv_approval_fk
  FOREIGN KEY (approval_id) REFERENCES app.approval_requests(id);

-- Trigger audit generik. Dipasang pada tabel sensitif.
CREATE OR REPLACE FUNCTION app.write_audit() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_actor uuid := NULLIF(current_setting('app.current_user_id', true), '')::uuid;
  v_company uuid := NULLIF(current_setting('app.current_company_id', true), '')::uuid;
BEGIN
  INSERT INTO app.audit_log (company_id, actor_id, action, entity_type, entity_id, diff)
  VALUES (
    v_company,
    v_actor,
    lower(TG_OP),
    TG_TABLE_NAME,
    CASE WHEN TG_OP = 'DELETE' THEN (to_jsonb(OLD)->>'id')::uuid
         ELSE (to_jsonb(NEW)->>'id')::uuid END,
    CASE WHEN TG_OP = 'INSERT' THEN jsonb_build_object('after', to_jsonb(NEW))
         WHEN TG_OP = 'DELETE' THEN jsonb_build_object('before', to_jsonb(OLD))
         ELSE jsonb_build_object('before', to_jsonb(OLD), 'after', to_jsonb(NEW)) END
  );
  RETURN COALESCE(NEW, OLD);
END $$;

CREATE TRIGGER blocks_audit
  AFTER INSERT OR UPDATE OR DELETE ON app.blocks
  FOR EACH ROW EXECUTE FUNCTION app.write_audit();

CREATE TRIGGER emission_factors_audit
  AFTER INSERT OR UPDATE OR DELETE ON app.emission_factors
  FOR EACH ROW EXECUTE FUNCTION app.write_audit();

CREATE TRIGGER carbon_runs_audit
  AFTER INSERT OR UPDATE OR DELETE ON app.carbon_runs
  FOR EACH ROW EXECUTE FUNCTION app.write_audit();

CREATE TRIGGER cert_decisions_audit
  AFTER INSERT OR UPDATE OR DELETE ON app.cert_decisions
  FOR EACH ROW EXECUTE FUNCTION app.write_audit();
