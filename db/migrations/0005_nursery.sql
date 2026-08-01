-- 0005_nursery.sql
-- Bibit & supplier. Harus SEBELUM 0007_agro karena planting_records dan trees
-- menunjuk seed_batches. Juga mata rantai pertama traceability.
-- Lihat docs/01-desain-skema-database.md §10.6

CREATE TABLE app.suppliers (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id           uuid NOT NULL REFERENCES app.companies(id),
  code                 text NOT NULL,
  name                 text NOT NULL,
  certification_status text,
  is_active            boolean NOT NULL DEFAULT true,
  UNIQUE (company_id, code)
);

CREATE TABLE app.seed_batches (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL REFERENCES app.companies(id),
  code          text NOT NULL,              -- 'NRS-0042'
  crop_id       uuid NOT NULL REFERENCES app.crops(id),
  supplier_id   uuid REFERENCES app.suppliers(id),
  variety       text,                       -- 'Kelapa Genjah'
  received_on   date NOT NULL,
  qty_initial   integer NOT NULL CHECK (qty_initial > 0),
  -- qty_alive/dead/damaged TIDAK disimpan di sini: diturunkan dari
  -- nursery_inspections terakhir, supaya tidak ada dua sumber kebenaran.
  archived_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, code)
);

CREATE TABLE app.nursery_inspections (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_uuid   uuid UNIQUE,                -- idempotensi sync (§3.6)
  seed_batch_id uuid NOT NULL REFERENCES app.seed_batches(id),
  inspected_at  timestamptz NOT NULL,
  qty_alive     integer NOT NULL,
  qty_dead      integer NOT NULL DEFAULT 0,
  qty_damaged   integer NOT NULL DEFAULT 0,
  inspector_id  uuid REFERENCES app.users(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX nursery_insp_batch_idx ON app.nursery_inspections (seed_batch_id, inspected_at DESC);

CREATE TABLE app.seed_distributions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seed_batch_id  uuid NOT NULL REFERENCES app.seed_batches(id),
  block_id       uuid NOT NULL REFERENCES app.blocks(id),
  qty            integer NOT NULL CHECK (qty > 0),
  distributed_on date NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX seed_dist_block_idx ON app.seed_distributions (block_id, distributed_on DESC);
