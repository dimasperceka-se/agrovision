-- 0008_costing.sql
-- Cost center, vendor, aktivitas budidaya, transaksi biaya, anggaran, sync ERP.
-- app.activities adalah titik temu tiga modul: costing, carbon, sertifikasi (§7.2).
-- Lihat docs/01-desain-skema-database.md §7.2, §8

CREATE TYPE app.cost_status AS ENUM ('draft','menunggu','disetujui','ditolak');

CREATE TABLE app.cost_centers (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code      text NOT NULL UNIQUE,
  name      text NOT NULL     -- Maintenance|Mekanisasi|Plantation|Logistik|Processing
);

CREATE TABLE app.vendors (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid NOT NULL REFERENCES app.companies(id),
  code         text NOT NULL,
  name         text NOT NULL,     -- 'PT Agro Makmur Sejahtera'
  npwp         text,
  is_active    boolean NOT NULL DEFAULT true,
  UNIQUE (company_id, code)
);

CREATE TABLE app.activity_types (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  internal_code  text NOT NULL UNIQUE,        -- 'FERT-001'
  name           text NOT NULL,               -- 'Pemupukan NPK'
  cost_center_id uuid REFERENCES app.cost_centers(id),
  default_unit   text NOT NULL,               -- kg|liter|km|ha|HOK
  is_active      boolean NOT NULL DEFAULT true
);

CREATE TABLE app.activities (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       uuid NOT NULL REFERENCES app.companies(id),
  activity_type_id uuid NOT NULL REFERENCES app.activity_types(id),
  block_id         uuid NOT NULL REFERENCES app.blocks(id),
  plot_id          uuid REFERENCES app.plots(id),
  performed_on     date NOT NULL,
  quantity         numeric(14,3) NOT NULL,
  unit             text NOT NULL,
  pic_user_id      uuid REFERENCES app.users(id),
  status           text NOT NULL DEFAULT 'selesai',   -- selesai|berjalan|menunggu_qc
  note             text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  created_by       uuid REFERENCES app.users(id)
);
CREATE INDEX activities_block_date_idx ON app.activities (block_id, performed_on DESC);
CREATE INDEX activities_type_idx ON app.activities (activity_type_id, performed_on DESC);

CREATE TABLE app.cost_transactions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       uuid NOT NULL REFERENCES app.companies(id),
  activity_id      uuid REFERENCES app.activities(id),      -- NULL = belum terpetakan
  cost_center_id   uuid NOT NULL REFERENCES app.cost_centers(id),
  block_id         uuid REFERENCES app.blocks(id),
  vendor_id        uuid REFERENCES app.vendors(id),
  transaction_date date NOT NULL,
  quantity         numeric(14,3),
  unit             text,
  amount_idr       numeric(18,2) NOT NULL,
  status           app.cost_status NOT NULL DEFAULT 'draft',
  erp_document_no  text,                                    -- kunci rekonsiliasi ERP
  erp_synced_at    timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, erp_document_no)
);
CREATE INDEX cost_tx_date_idx ON app.cost_transactions (transaction_date DESC);
-- KPI 'Termapping ke Costing: 462 dari 486'
CREATE INDEX cost_tx_unmapped_idx ON app.cost_transactions (company_id)
  WHERE activity_id IS NULL;

CREATE TABLE app.budgets (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     uuid NOT NULL REFERENCES app.companies(id),
  estate_id      uuid REFERENCES app.estates(id),
  cost_center_id uuid REFERENCES app.cost_centers(id),
  period_month   date NOT NULL,                 -- selalu tanggal 1
  amount_idr     numeric(18,2) NOT NULL,
  UNIQUE (company_id, estate_id, cost_center_id, period_month)
);

CREATE TABLE app.erp_sync_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source        text NOT NULL,                -- 'ERP Sync' | 'Import Excel'
  started_at    timestamptz NOT NULL,
  finished_at   timestamptz,
  rows_total    integer,
  rows_ok       integer,
  rows_failed   integer,
  status        text NOT NULL,                -- sukses|sebagian|gagal
  detail        jsonb
);
