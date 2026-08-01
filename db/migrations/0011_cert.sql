-- 0011_cert.sql
-- Standar berversi, program, assessment, temuan, CAPA, keputusan, sertifikat.
-- Modul terdalam di prototype: 13 sub-halaman.
-- Lihat docs/01-desain-skema-database.md §10.1

CREATE TYPE app.assessment_status AS ENUM (
  'assigned','in_progress','submitted','reviewed','revision_required'
);
CREATE TYPE app.nc_severity  AS ENUM ('minor','major','critical');
CREATE TYPE app.capa_status   AS ENUM ('open','in_progress','submitted','closed','overdue');
-- 5 opsi dari decisionOptions di sertifikasi/decision/page.tsx
CREATE TYPE app.cert_decision AS ENUM (
  'certified','conditionally_certified','not_certified','pending_capa','suspended'
);

CREATE TABLE app.standards (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code            text NOT NULL UNIQUE,          -- 'STD-001'
  name            text NOT NULL,                 -- 'Rainforest Alliance 2020'
  issuer          text NOT NULL,
  validity_months integer                        -- masa berlaku sertifikat
);

-- §3.3 Assessment menunjuk VERSI standar, bukan standar-nya.
CREATE TABLE app.standard_versions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  standard_id  uuid NOT NULL REFERENCES app.standards(id),
  version      text NOT NULL,             -- 'v1.3'
  status       text NOT NULL,             -- draft|active|retired
  published_at date,
  UNIQUE (standard_id, version)
);

CREATE TABLE app.standard_criteria (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  standard_version_id uuid NOT NULL REFERENCES app.standard_versions(id),
  parent_id           uuid REFERENCES app.standard_criteria(id),   -- Prinsip > Kriteria
  code                text NOT NULL,      -- '1.1', '3.2'
  title               text NOT NULL,
  is_critical         boolean NOT NULL DEFAULT false,  -- gagal = tidak lulus otomatis
  max_score           integer NOT NULL DEFAULT 10,
  evidence_required   text[],
  sort_order          integer,
  UNIQUE (standard_version_id, code)
);

CREATE TABLE app.standard_crops (
  standard_id uuid NOT NULL REFERENCES app.standards(id),
  crop_id     uuid NOT NULL REFERENCES app.crops(id),
  PRIMARY KEY (standard_id, crop_id)
);

CREATE TABLE app.cert_programs (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          uuid NOT NULL REFERENCES app.companies(id),
  code                text NOT NULL,      -- 'PRG-2026-01'
  name                text NOT NULL,
  standard_version_id uuid NOT NULL REFERENCES app.standard_versions(id),
  period_start        date NOT NULL,
  period_end          date NOT NULL,
  status              text NOT NULL,      -- berjalan|selesai|dibatalkan
  UNIQUE (company_id, code)
);

CREATE TABLE app.cert_program_blocks (
  program_id    uuid NOT NULL REFERENCES app.cert_programs(id) ON DELETE CASCADE,
  block_id      uuid NOT NULL REFERENCES app.blocks(id),
  readiness_pct numeric(5,2),
  eligibility   text,                    -- eligible|missing_data
  missing_items text[],
  PRIMARY KEY (program_id, block_id)
);

CREATE TABLE app.cert_assessments (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code                 text NOT NULL UNIQUE,     -- 'ASG-CRT-001'
  program_id           uuid NOT NULL REFERENCES app.cert_programs(id),
  block_id             uuid NOT NULL REFERENCES app.blocks(id),
  auditor_id           uuid REFERENCES app.users(id),
  due_date             date,
  status               app.assessment_status NOT NULL DEFAULT 'assigned',
  score_pct            numeric(5,2),
  has_critical_failure boolean NOT NULL DEFAULT false,
  submitted_at         timestamptz,
  reviewed_by          uuid REFERENCES app.users(id),
  reviewed_at          timestamptz
);
CREATE INDEX cert_assess_program_idx ON app.cert_assessments (program_id, status);

CREATE TABLE app.cert_assessment_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES app.cert_assessments(id) ON DELETE CASCADE,
  criterion_id  uuid NOT NULL REFERENCES app.standard_criteria(id),
  status        text NOT NULL,            -- lengkap|sebagian|belum
  score         integer,
  auto_filled   boolean NOT NULL DEFAULT false,  -- diisi sistem dari data lain
  note          text,
  UNIQUE (assessment_id, criterion_id)
);

CREATE TABLE app.cert_findings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES app.cert_assessments(id),
  criterion_id  uuid REFERENCES app.standard_criteria(id),
  description   text NOT NULL,
  severity      app.nc_severity NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX cert_findings_severity_idx ON app.cert_findings (severity, created_at DESC);

CREATE TABLE app.capa (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text NOT NULL UNIQUE,      -- 'CAPA-001'
  finding_id  uuid NOT NULL REFERENCES app.cert_findings(id),
  block_id    uuid NOT NULL REFERENCES app.blocks(id),
  pic_user_id uuid REFERENCES app.users(id),
  action_plan text,
  due_date    date NOT NULL,
  status      app.capa_status NOT NULL DEFAULT 'open',
  closed_at   timestamptz,
  closed_by   uuid REFERENCES app.users(id)
);
CREATE INDEX capa_open_idx ON app.capa (due_date) WHERE status <> 'closed';

CREATE TABLE app.cert_decisions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code          text NOT NULL UNIQUE,     -- 'DEC-001'
  assessment_id uuid NOT NULL REFERENCES app.cert_assessments(id),
  decision      app.cert_decision NOT NULL,
  rationale     text,
  approver_id   uuid REFERENCES app.users(id),
  decided_at    timestamptz
);

CREATE TABLE app.certificates (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code                text NOT NULL UNIQUE,     -- 'CERT-2026-0012'
  decision_id         uuid REFERENCES app.cert_decisions(id),
  standard_version_id uuid NOT NULL REFERENCES app.standard_versions(id),
  block_id            uuid NOT NULL REFERENCES app.blocks(id),
  valid_from          date NOT NULL,
  valid_until         date NOT NULL,
  revoked_at          timestamptz,
  document_path       text,
  CONSTRAINT cert_period CHECK (valid_until > valid_from)
);
-- 'Expiring Soon' & renewal monitoring dihitung dari valid_until, tidak disimpan.
CREATE INDEX cert_expiry_idx ON app.certificates (valid_until) WHERE revoked_at IS NULL;
