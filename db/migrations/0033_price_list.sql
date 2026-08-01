-- 0033_price_list.sql
--
-- Konsep Accounting refleksi (docs/11 §4): "biaya = volume × tarif". Modul
-- Accounting TIDAK punya form input; biaya & revenue adalah refleksi otomatis
-- dari volume operasional dikalikan PRICE LIST yang dikonfigurasi di awal.
--
-- price_list = katalog tarif per entitas. Tiap baris biaya punya `driver` yang
-- menunjuk metrik volume operasional (mis. total luas blok) yang dikalikan tarif
-- untuk menghasilkan biaya ter-refleksi. Baris revenue memakai tarif per ton.
--
-- Catatan (docs/11 §10a): price list adalah single point of failure — perlu
-- pemilik & versioning. Untuk fase konsep, tarif dapat diubah approver/super
-- admin; versioning historis menyusul di technical meeting.

CREATE TABLE app.price_list (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid NOT NULL REFERENCES app.companies(id),
  code         text NOT NULL,
  kind         text NOT NULL CHECK (kind IN ('cost', 'revenue')),
  category     text NOT NULL,
  -- kode metrik volume operasional untuk refleksi biaya; NULL = tarif manual
  -- (mis. upah harian) atau baris revenue.
  driver       text CHECK (driver IN (
                 'block_area_ha', 'landprep_area_ha', 'seedling_qty', 'fertilizer_qty'
               )),
  unit         text NOT NULL,
  rate_idr     numeric(16,2) NOT NULL CHECK (rate_idr >= 0),
  note         text,
  is_active    boolean NOT NULL DEFAULT true,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  updated_by   uuid REFERENCES app.users(id),
  UNIQUE (company_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON app.price_list TO app_rw;
GRANT SELECT ON app.price_list TO app_ro;

ALTER TABLE app.price_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.price_list FORCE ROW LEVEL SECURITY;
CREATE POLICY price_list_tenant ON app.price_list
  USING (app.company_in_scope(company_id))
  WITH CHECK (app.company_in_scope(company_id));
-- Katalog harga = pengendali seluruh angka keuangan → hanya approver/super admin.
CREATE POLICY price_list_writer ON app.price_list
  AS RESTRICTIVE FOR ALL
  USING (true)
  WITH CHECK (app.current_role_name() IN ('approver', 'super_admin'));
