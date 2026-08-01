-- 0016_costing_fix.sql
--
-- Menyiapkan modul costing untuk jalur MVP depth-first:
--   Expenditure -> DB -> Financial Report
--
-- Menambal cacat audit:
--   * budgets tidak punya block_id, padahal AT3 mensyaratkan actual-vs-budget
--     bergerak mengikuti pengeluaran PER BLOK (concept:56,80).
--   * erp_document_no + UNIQUE mengasumsikan integrasi ERP, padahal keputusan
--     #1 adalah STANDALONE. Constraint unique yang salah tidak bisa dicabut murah
--     setelah data masuk.
--   * cost_transactions belum punya created_by, unit_price, approval_status.

-- ===========================================================================
-- 1. PERIODE FISKAL -- memindahkan granularitas periode dari DDL ke data
-- Keputusan #6 = "per fase proyek". Bentuk ini juga menampung per tahun/per blok
-- tanpa migrasi ulang, sehingga jawaban yang berubah tidak merusak skema.
-- ===========================================================================

CREATE TYPE app.period_kind AS ENUM ('project_phase', 'fiscal_year', 'quarter', 'month');

CREATE TABLE app.fiscal_periods (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL REFERENCES app.companies(id),
  kind        app.period_kind NOT NULL DEFAULT 'project_phase',
  code        text NOT NULL,              -- 'PHASE-1-NURSERY'
  name        text NOT NULL,              -- 'Fase 1 - Pengadaan Bibit'
  starts_on   date NOT NULL,
  ends_on     date NOT NULL,
  is_closed   boolean NOT NULL DEFAULT false,
  sort_order  integer NOT NULL DEFAULT 0,
  UNIQUE (company_id, code),
  CONSTRAINT fp_range CHECK (ends_on >= starts_on)
);
CREATE INDEX fp_lookup_idx ON app.fiscal_periods (company_id, starts_on);

-- DECISION NEEDED: nama & rentang tanggal fase proyek dari klien untuk seeding.

-- ===========================================================================
-- 2. cost_transactions -- disiapkan untuk AT3 & AT4
-- ===========================================================================

-- Keputusan #1 standalone: kolom dibuat netral-vendor, UNIQUE dibuang.
ALTER TABLE app.cost_transactions DROP CONSTRAINT IF EXISTS cost_transactions_company_id_erp_document_no_key;
ALTER TABLE app.cost_transactions RENAME COLUMN erp_document_no TO external_document_no;
ALTER TABLE app.cost_transactions RENAME COLUMN erp_synced_at   TO external_synced_at;
CREATE INDEX ct_extdoc_idx ON app.cost_transactions (company_id, external_document_no)
  WHERE external_document_no IS NOT NULL;

ALTER TABLE app.cost_transactions
  ADD COLUMN cost_category_id  uuid REFERENCES app.master_items(id),
  ADD COLUMN uom_item_id       uuid REFERENCES app.master_items(id),
  ADD COLUMN supplier_id       uuid REFERENCES app.suppliers(id),
  ADD COLUMN fiscal_period_id  uuid REFERENCES app.fiscal_periods(id),
  ADD COLUMN unit_price_idr    numeric(18,2),
  -- Keputusan #7: labor masuk costing per blok. Tapi baris overhead tetap
  -- mungkin ada (block_id NULL), jadi dibuat eksplisit + punya aturan alokasi.
  ADD COLUMN is_overhead       boolean NOT NULL DEFAULT false,
  ADD COLUMN approval_status   app.record_status NOT NULL DEFAULT 'draft',
  ADD COLUMN rejection_reason  text,
  ADD COLUMN approval_id       uuid REFERENCES app.approval_requests(id),
  ADD COLUMN submitted_at      timestamptz,
  ADD COLUMN resubmitted_from_id uuid REFERENCES app.cost_transactions(id),
  ADD COLUMN created_by        uuid REFERENCES app.users(id),
  ADD COLUMN updated_at        timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN updated_by        uuid REFERENCES app.users(id),
  ADD COLUMN note              text;

-- amount_idr tetap kolom nyata (bukan generated) karena faktur bisa punya
-- pembulatan/diskon yang tidak sama dengan qty * unit_price. Tapi selisihnya
-- harus disengaja, bukan diam-diam:
ALTER TABLE app.cost_transactions ADD CONSTRAINT ct_amount_positive
  CHECK (amount_idr >= 0);

-- Overhead tidak boleh punya block_id, biaya per-blok wajib punya.
ALTER TABLE app.cost_transactions ADD CONSTRAINT ct_overhead_scope
  CHECK ((is_overhead AND block_id IS NULL) OR (NOT is_overhead AND block_id IS NOT NULL));

-- concept:187 -- penolakan wajib beralasan.
ALTER TABLE app.cost_transactions ADD CONSTRAINT ct_rejection_needs_reason
  CHECK (approval_status <> 'rejected'
         OR (rejection_reason IS NOT NULL AND length(btrim(rejection_reason)) > 0));

-- AT3: SUM per blok harus cepat. AT4: record rejected dikecualikan.
CREATE INDEX ct_block_approved_idx ON app.cost_transactions (block_id, transaction_date DESC)
  WHERE approval_status = 'approved';
CREATE INDEX ct_pending_idx ON app.cost_transactions (company_id, submitted_at)
  WHERE approval_status IN ('submitted', 'under_review');
-- Keyset pagination (concept:48-49).
CREATE INDEX ct_keyset_idx ON app.cost_transactions (company_id, transaction_date DESC, id DESC);

-- Jejak audit pada uang -- wajib.
CREATE TRIGGER cost_transactions_audit
  AFTER INSERT OR UPDATE OR DELETE ON app.cost_transactions
  FOR EACH ROW EXECUTE FUNCTION app.write_audit();

-- vendors dilebur ke suppliers (0015). Kolom lama disimpan sementara.
COMMENT ON TABLE app.vendors IS 'DEPRECATED -- pakai app.suppliers (is_vendor = true).';

-- ===========================================================================
-- 3. budgets -- DI-KEY ULANG
-- Bentuk lama: UNIQUE (company_id, estate_id, cost_center_id, period_month)
-- -> tidak bisa memenuhi AT3 karena tidak ada block_id.
-- Bentuk baru menampung ketiga jawaban keputusan #6 sekaligus.
-- ===========================================================================

CREATE TYPE app.budget_scope AS ENUM ('company', 'estate', 'block');

-- Tabel lama masih kosong (belum ada runner), jadi aman dibuat ulang.
DROP TABLE app.budgets;

CREATE TABLE app.budgets (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       uuid NOT NULL REFERENCES app.companies(id),
  fiscal_period_id uuid NOT NULL REFERENCES app.fiscal_periods(id),
  cost_category_id uuid NOT NULL REFERENCES app.master_items(id),
  scope_type       app.budget_scope NOT NULL,
  -- Sengaja tanpa FK: menunjuk companies/estates/blocks bergantung scope_type.
  -- Divalidasi trigger di bawah.
  scope_id         uuid,
  amount_idr       numeric(18,2) NOT NULL CHECK (amount_idr >= 0),
  note             text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  created_by       uuid REFERENCES app.users(id),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  updated_by       uuid REFERENCES app.users(id),
  UNIQUE (company_id, fiscal_period_id, cost_category_id, scope_type, scope_id)
);
CREATE INDEX budgets_scope_idx ON app.budgets (scope_type, scope_id);

-- scope_id polimorfik tetap harus valid -- jangan biarkan yatim.
CREATE OR REPLACE FUNCTION app.validate_budget_scope() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.scope_type = 'company' THEN
    IF NEW.scope_id IS NULL THEN NEW.scope_id := NEW.company_id; END IF;
    IF NOT EXISTS (SELECT 1 FROM app.companies WHERE id = NEW.scope_id) THEN
      RAISE EXCEPTION 'scope_id % bukan company yang valid', NEW.scope_id;
    END IF;
  ELSIF NEW.scope_type = 'estate' THEN
    IF NOT EXISTS (SELECT 1 FROM app.estates
                    WHERE id = NEW.scope_id AND company_id = NEW.company_id) THEN
      RAISE EXCEPTION 'scope_id % bukan estate milik company ini', NEW.scope_id;
    END IF;
  ELSIF NEW.scope_type = 'block' THEN
    IF NOT EXISTS (SELECT 1 FROM app.blocks
                    WHERE id = NEW.scope_id AND company_id = NEW.company_id) THEN
      RAISE EXCEPTION 'scope_id % bukan block milik company ini', NEW.scope_id;
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER budgets_validate_scope
  BEFORE INSERT OR UPDATE ON app.budgets
  FOR EACH ROW EXECUTE FUNCTION app.validate_budget_scope();

-- ===========================================================================
-- 4. ATURAN ALOKASI OVERHEAD
-- Keputusan #7 memilih labor per blok, tapi cost/ha butuh SATU definisi yang
-- dapat ditelusuri. Aturan alokasi dinyatakan sebagai data, bukan tersirat di kode.
-- ===========================================================================

CREATE TYPE app.allocation_basis AS ENUM ('area_ha', 'tree_count', 'equal', 'none');

CREATE TABLE app.overhead_allocation_rules (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       uuid NOT NULL REFERENCES app.companies(id),
  cost_category_id uuid REFERENCES app.master_items(id),  -- NULL = semua kategori
  basis            app.allocation_basis NOT NULL DEFAULT 'area_ha',
  is_active        boolean NOT NULL DEFAULT true,
  note             text,
  UNIQUE (company_id, cost_category_id)
);

COMMENT ON TABLE app.overhead_allocation_rules IS
  'Cara biaya overhead (block_id NULL) dibebankan ke blok saat menghitung cost/ha. '
  'Dinyatakan eksplisit supaya angka direktur keuangan dapat ditelusuri.';

-- TODO: alokasi labor lintas blok -- perlu konfirmasi cara pencatatan absensi lapangan.

-- ===========================================================================
-- 5. Hak akses & RLS
-- ===========================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON
  app.fiscal_periods, app.budgets, app.overhead_allocation_rules TO app_rw;
GRANT SELECT ON
  app.fiscal_periods, app.budgets, app.overhead_allocation_rules TO app_ro;

ALTER TABLE app.fiscal_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY fp_tenant ON app.fiscal_periods
  USING (app.company_in_scope(company_id)) WITH CHECK (app.company_in_scope(company_id));

ALTER TABLE app.budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY budgets_tenant ON app.budgets
  USING (app.company_in_scope(company_id)) WITH CHECK (app.company_in_scope(company_id));

ALTER TABLE app.overhead_allocation_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY oar_tenant ON app.overhead_allocation_rules
  USING (app.company_in_scope(company_id)) WITH CHECK (app.company_in_scope(company_id));
