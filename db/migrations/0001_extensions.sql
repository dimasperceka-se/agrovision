-- 0001_extensions.sql
-- Fondasi: extension, schema, dan role aplikasi.
-- Lihat docs/01-desain-skema-database.md §5

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS btree_gist;   -- constraint campuran skalar + geometry
CREATE EXTENSION IF NOT EXISTS pg_trgm;      -- pencarian teks
CREATE EXTENSION IF NOT EXISTS citext;       -- email case-insensitive

CREATE SCHEMA IF NOT EXISTS app;

-- Role aplikasi. Append-only ditegakkan dengan mencabut hak dari app_rw (§3.7).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_rw') THEN
    CREATE ROLE app_rw;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_ro') THEN
    CREATE ROLE app_ro;
  END IF;
END $$;

GRANT USAGE ON SCHEMA app TO app_rw, app_ro;
