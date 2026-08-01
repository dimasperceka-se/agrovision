-- 0002_core.sql
-- Tenant, organisasi, pengguna, lingkup akses.
-- Lihat docs/01-desain-skema-database.md §5.1-5.2

CREATE TABLE app.companies (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text NOT NULL UNIQUE,
  name        text NOT NULL,              -- 'PT Agro Lestari Nusantara'
  timezone    text NOT NULL DEFAULT 'Asia/Jakarta',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app.estates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL REFERENCES app.companies(id),
  code        text NOT NULL,
  name        text NOT NULL,              -- 'Estate Sejahtera'
  geom        geometry(MultiPolygon, 4326),
  -- Diuji pada PostGIS 3.4 / PG16: generated column diterima (§3.4)
  area_ha     numeric(12,4) GENERATED ALWAYS AS (ST_Area(geom::geography)/10000.0) STORED,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, code)
);
CREATE INDEX estates_geom_gix ON app.estates USING GIST (geom);

CREATE TABLE app.divisions (             -- 'Divisi Agroforestry 2'
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estate_id   uuid NOT NULL REFERENCES app.estates(id),
  code        text NOT NULL,
  name        text NOT NULL,
  UNIQUE (estate_id, code)
);

CREATE TYPE app.user_role AS ENUM (
  'admin', 'manager', 'approver', 'sustainability_manager',
  'auditor', 'supervisor', 'surveyor', 'viewer'
);

CREATE TABLE app.users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL REFERENCES app.companies(id),
  -- 'sub' dari Identity Platform. Password TIDAK disimpan di sini.
  external_id   text NOT NULL UNIQUE,
  email         citext NOT NULL,
  full_name     text NOT NULL,
  role          app.user_role NOT NULL DEFAULT 'viewer',
  phone         text,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, email)
);

-- Pembatasan per estate. Tidak ada baris = akses seluruh company.
CREATE TABLE app.user_estate_access (
  user_id    uuid NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
  estate_id  uuid NOT NULL REFERENCES app.estates(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, estate_id)
);
