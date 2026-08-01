import { rlsQuery, type RlsContext } from "@/lib/db";

/**
 * Price list + refleksi biaya (docs/11 §4). Biaya ter-refleksi dihitung dari
 * VOLUME operasional nyata × TARIF katalog. Tidak ada input biaya manual.
 */

export type PriceRow = {
  id: string;
  code: string;
  kind: "cost" | "revenue";
  category: string;
  driver: string | null;
  unit: string;
  rateIdr: number;
  isActive: boolean;
  note: string | null;
};

export async function getPriceList(ctx: RlsContext): Promise<PriceRow[]> {
  const rows = await rlsQuery<{
    id: string; code: string; kind: "cost" | "revenue"; category: string;
    driver: string | null; unit: string; rate_idr: string; is_active: boolean; note: string | null;
  }>(
    ctx,
    `SELECT id, code, kind, category, driver, unit, rate_idr, is_active, note
       FROM app.price_list ORDER BY kind, category`,
  );
  return rows.map((r) => ({
    id: r.id, code: r.code, kind: r.kind, category: r.category, driver: r.driver,
    unit: r.unit, rateIdr: Number(r.rate_idr), isActive: r.is_active, note: r.note,
  }));
}

// Metrik volume operasional per driver. Semua di-scope RLS lewat join ke blocks
// (aman walau tabel sumber punya kebijakan berbeda).
const DRIVER_SQL: Record<string, string> = {
  block_area_ha: `SELECT COALESCE(SUM(area_ha), 0)::float8 AS v FROM app.blocks WHERE archived_at IS NULL`,
  landprep_area_ha: `SELECT COALESCE(SUM(lp.effective_area_ha), 0)::float8 AS v
                       FROM app.land_preparations lp JOIN app.blocks b ON b.id = lp.block_id
                      WHERE lp.approval_status = 'approved'`,
  seedling_qty: `SELECT COALESCE(SUM(sd.qty), 0)::float8 AS v
                   FROM app.seed_distributions sd JOIN app.blocks b ON b.id = sd.block_id
                  WHERE b.archived_at IS NULL`,
  fertilizer_qty: `SELECT COALESCE(SUM(fa.total_quantity), 0)::float8 AS v
                     FROM app.fertilizer_applications fa JOIN app.blocks b ON b.id = fa.block_id
                    WHERE fa.approval_status = 'approved'`,
};

const DRIVER_LABEL: Record<string, string> = {
  block_area_ha: "Total luas blok",
  landprep_area_ha: "Luas persiapan lahan (disetujui)",
  seedling_qty: "Bibit terdistribusi",
  fertilizer_qty: "Pupuk diaplikasikan (disetujui)",
};

export type ReflectedLine = {
  code: string;
  category: string;
  driverLabel: string;
  volume: number;
  unit: string;
  rateIdr: number;
  amountIdr: number;
};

export type RevenueLine = {
  cropCode: string;
  category: string;
  tonnage: number;
  rateIdr: number;
  amountIdr: number;
};

export type Reflection = {
  lines: ReflectedLine[];
  totalCostIdr: number;
  /** Baris biaya tarif-manual (mis. upah) yang butuh input volume terpisah. */
  manualCost: PriceRow[];
  revenueRates: PriceRow[];
  revenueLines: RevenueLine[];
  totalRevenueIdr: number;
  /** null bila belum ada panen disetujui — jangan tampilkan 0 sebagai fakta. */
  balanceIdr: number | null;
};

// Komoditas panen → kode tarif revenue di price_list.
const REVENUE_CODE: Record<string, string> = { DURIAN: "REV-DUR-A", COCONUT: "REV-COCO" };

/** Hitung biaya + revenue ter-refleksi = Σ (volume operasional × tarif). */
export async function reflectedCosts(ctx: RlsContext): Promise<Reflection> {
  const prices = await getPriceList(ctx);
  const lines: ReflectedLine[] = [];

  for (const p of prices) {
    if (p.kind !== "cost" || !p.isActive || !p.driver) continue;
    const sql = DRIVER_SQL[p.driver];
    if (!sql) continue;
    const res = await rlsQuery<{ v: number }>(ctx, sql);
    const volume = res[0]?.v ?? 0;
    lines.push({
      code: p.code, category: p.category, driverLabel: DRIVER_LABEL[p.driver] ?? p.driver,
      volume, unit: p.unit, rateIdr: p.rateIdr, amountIdr: Math.round(volume * p.rateIdr),
    });
  }
  const totalCostIdr = lines.reduce((a, l) => a + l.amountIdr, 0);

  // Revenue dari panen DISETUJUI × tarif per komoditas.
  const harvest = await rlsQuery<{ crop_code: string; ton: number }>(
    ctx,
    `SELECT h.crop_code, COALESCE(SUM(h.quantity_ton), 0)::float8 AS ton
       FROM app.harvest_records h JOIN app.blocks b ON b.id = h.block_id
      WHERE h.approval_status = 'approved'
      GROUP BY h.crop_code`,
  );
  const rateByCode = new Map(prices.filter((p) => p.kind === "revenue").map((p) => [p.code, p]));
  const revenueLines: RevenueLine[] = [];
  for (const h of harvest) {
    if (h.ton <= 0) continue;
    const price = rateByCode.get(REVENUE_CODE[h.crop_code]);
    if (!price) continue;
    revenueLines.push({
      cropCode: h.crop_code, category: price.category, tonnage: h.ton,
      rateIdr: price.rateIdr, amountIdr: Math.round(h.ton * price.rateIdr),
    });
  }
  const totalRevenueIdr = revenueLines.reduce((a, l) => a + l.amountIdr, 0);
  const hasRevenue = revenueLines.length > 0;

  return {
    lines,
    totalCostIdr,
    manualCost: prices.filter((p) => p.kind === "cost" && p.isActive && !p.driver),
    revenueRates: prices.filter((p) => p.kind === "revenue" && p.isActive),
    revenueLines,
    totalRevenueIdr,
    balanceIdr: hasRevenue ? totalRevenueIdr - totalCostIdr : null,
  };
}

/** Ubah tarif satu item price list (approver/super admin, ditegakkan RLS + action). */
export async function setPriceRate(ctx: RlsContext, id: string, rateIdr: number): Promise<void> {
  await rlsQuery(
    ctx,
    `UPDATE app.price_list SET rate_idr = $2, updated_at = now(), updated_by = $3 WHERE id = $1`,
    [id, rateIdr, ctx.userId],
  );
}
