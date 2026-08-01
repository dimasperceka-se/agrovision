-- 0006_survey.sql
-- Form builder berversi, penugasan lapangan, submission, sync.
-- Harus SEBELUM 0007_agro karena tree_survey_points menunjuk assignments.
-- Lihat docs/01-desain-skema-database.md §10.2, §10.3

-- 14 tipe field, diambil dari fieldTypes di sertifikasi/template-builder/page.tsx
CREATE TYPE app.field_type AS ENUM (
  'teks','angka','tanggal','pilihan_tunggal','pilihan_ganda','yes_no','skala',
  'tabel','foto','dokumen','tanda_tangan','gps','polygon','qr_scan'
);
CREATE TYPE app.assignment_status AS ENUM (
  'new','downloaded','in_progress','draft','submitted','synced','rejected'
);
CREATE TYPE app.priority AS ENUM ('rendah','sedang','tinggi');

CREATE TABLE app.forms (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES app.companies(id),
  code       text NOT NULL,
  name       text NOT NULL,
  module     text NOT NULL,     -- agroforestry|sertifikasi|survei|nursery|panen
  UNIQUE (company_id, code)
);

-- §3.3 Submission menunjuk VERSI. Tanpa ini, data lama tak terbaca saat form diubah.
CREATE TABLE app.form_versions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id      uuid NOT NULL REFERENCES app.forms(id),
  version      integer NOT NULL,
  status       text NOT NULL DEFAULT 'draft',   -- draft|published|retired
  published_at timestamptz,
  UNIQUE (form_id, version)
);

CREATE TABLE app.form_fields (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_version_id uuid NOT NULL REFERENCES app.form_versions(id) ON DELETE CASCADE,
  section_name    text,
  code            text NOT NULL,
  label           text NOT NULL,
  field_type      app.field_type NOT NULL,
  is_required     boolean NOT NULL DEFAULT false,
  options         jsonb,          -- pilihan, min/max, skala
  validation      jsonb,
  sort_order      integer NOT NULL,
  UNIQUE (form_version_id, code)
);

CREATE TABLE app.assignments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code            text NOT NULL UNIQUE,       -- 'ASG-001'
  module          text NOT NULL,
  title           text NOT NULL,
  block_id        uuid REFERENCES app.blocks(id),
  estate_id       uuid REFERENCES app.estates(id),
  form_version_id uuid REFERENCES app.form_versions(id),
  assignee_id     uuid NOT NULL REFERENCES app.users(id),
  due_at          timestamptz,
  priority        app.priority NOT NULL DEFAULT 'sedang',
  status          app.assignment_status NOT NULL DEFAULT 'new',
  target_note     text,                       -- '30 titik sampel'
  version         integer NOT NULL DEFAULT 1, -- optimistic lock utk sync dua arah
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX assignments_assignee_idx ON app.assignments (assignee_id, status);

CREATE TABLE app.survey_submissions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_uuid     uuid NOT NULL UNIQUE,        -- §3.6 idempotensi sync
  form_version_id uuid NOT NULL REFERENCES app.form_versions(id),
  assignment_id   uuid REFERENCES app.assignments(id),
  block_id        uuid REFERENCES app.blocks(id),
  geom            geometry(Point, 4326),
  submitted_by    uuid REFERENCES app.users(id),
  submitted_at    timestamptz NOT NULL,        -- waktu di device
  synced_at       timestamptz NOT NULL DEFAULT now(),
  device_id       text
);
CREATE INDEX submissions_geom_gix ON app.survey_submissions USING GIST (geom);
CREATE INDEX submissions_block_idx ON app.survey_submissions (block_id, submitted_at DESC);

-- Satu baris per jawaban, kolom bertipe. Bukan JSONB blob supaya bisa diquery.
CREATE TABLE app.submission_values (
  submission_id uuid NOT NULL REFERENCES app.survey_submissions(id) ON DELETE CASCADE,
  field_id      uuid NOT NULL REFERENCES app.form_fields(id),
  value_text    text,
  value_num     numeric(18,4),
  value_bool    boolean,
  value_date    date,
  value_geom    geometry(Geometry, 4326),
  value_json    jsonb,                          -- untuk tipe 'tabel'
  PRIMARY KEY (submission_id, field_id)
);

CREATE TABLE app.sync_sessions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES app.users(id),
  device_id     text NOT NULL,
  started_at    timestamptz NOT NULL DEFAULT now(),
  finished_at   timestamptz,
  items_total   integer,
  items_ok      integer,
  items_failed  integer,
  detail        jsonb
);
