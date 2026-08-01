-- 0010_evidence.sql
-- §3.8 Evidence adalah entitas kelas satu, bukan kolom URL.
-- Satu foto geotag bisa jadi bukti tree inventory DAN kriteria sertifikasi sekaligus.
-- Lihat docs/01-desain-skema-database.md §10.4

CREATE TYPE app.evidence_type AS ENUM (
  'foto','dokumen','polygon','drone','traceability','tanda_tangan','audio'
);

CREATE TABLE app.evidence_files (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_uuid    uuid UNIQUE,
  company_id     uuid NOT NULL REFERENCES app.companies(id),
  evidence_type  app.evidence_type NOT NULL,
  file_name      text NOT NULL,
  storage_path   text NOT NULL,              -- gs://...
  mime_type      text,
  size_bytes     bigint,
  sha256         text NOT NULL,              -- integritas; wajib untuk audit
  geom           geometry(Point, 4326),      -- dari EXIF
  gps_accuracy_m numeric(6,2),
  taken_at       timestamptz,
  uploaded_by    uuid REFERENCES app.users(id),
  uploaded_at    timestamptz NOT NULL DEFAULT now(),
  verified_at    timestamptz,
  verified_by    uuid REFERENCES app.users(id)
);
CREATE INDEX evidence_geom_gix ON app.evidence_files USING GIST (geom);
CREATE INDEX evidence_type_idx ON app.evidence_files (company_id, evidence_type, uploaded_at DESC);

-- Polimorfik: satu evidence bisa melekat ke banyak objek lintas modul.
-- Sengaja tanpa FK ke entity_id; divalidasi di aplikasi.
CREATE TABLE app.evidence_links (
  evidence_id  uuid NOT NULL REFERENCES app.evidence_files(id) ON DELETE CASCADE,
  entity_type  text NOT NULL,   -- tree_survey_point|cert_assessment_item|activity|capa|...
  entity_id    uuid NOT NULL,
  link_note    text,
  auto_linked  boolean NOT NULL DEFAULT false,   -- 'Sistem (Auto-link)'
  PRIMARY KEY (evidence_id, entity_type, entity_id)
);
CREATE INDEX evidence_links_entity_idx ON app.evidence_links (entity_type, entity_id);
