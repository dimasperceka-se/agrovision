import { rlsQuery, withRls, type RlsContext } from "@/lib/db";

/**
 * Laporan yang digerakkan definisi, bukan halaman hardcoded.
 *
 * concept:68-71 mewajibkan laporan dirakit dari definisi tersimpan (sumber data,
 * field, filter, agregasi) yang diterjemahkan jadi query saat runtime — dan tiga
 * laporan built-in harus berupa TIGA BARIS definisi, bukan tiga halaman.
 *
 * Keamanan: `base_view` TIDAK boleh SQL bebas. Ia ber-FK ke
 * app.report_allowed_views (migrasi 0018 §5), dan diperiksa ulang di sini
 * sebelum dipakai — dua lapis, karena report builder fase 2 akan membiarkan
 * pengguna memilih sumber data sendiri.
 */

export type ReportDefinition = {
  id: string;
  code: string;
  name: string;
  kind: string;
  description: string | null;
  baseView: string;
  isBuiltin: boolean;
  isStub: boolean;
  fields: ReportField[];
};

export type ReportField = {
  band: "kpi" | "chart" | "table";
  sourceColumn: string;
  label: string;
  agg: string;
  groupBy: boolean;
  format: string | null;
  sortOrder: number;
};

export async function getReportDefinition(
  ctx: RlsContext,
  code: string,
): Promise<ReportDefinition | null> {
  return withRls(ctx, async (client) => {
    const def = await client.query<{
      id: string; code: string; name: string; kind: string; description: string | null;
      base_view: string; is_builtin: boolean; is_stub: boolean;
    }>(
      `SELECT id, code, name, kind, description, base_view, is_builtin, is_stub
         FROM app.report_definitions WHERE code = $1 LIMIT 1`,
      [code],
    );
    if (def.rowCount === 0) return null;
    const d = def.rows[0];

    const fields = await client.query<{
      band: string; source_column: string; label: string; agg: string;
      group_by: boolean; format: string | null; sort_order: number;
    }>(
      `SELECT band, source_column, label, agg, group_by, format, sort_order
         FROM app.report_definition_fields WHERE report_id = $1 ORDER BY band, sort_order`,
      [d.id],
    );

    return {
      id: d.id,
      code: d.code,
      name: d.name,
      kind: d.kind,
      description: d.description,
      baseView: d.base_view,
      isBuiltin: d.is_builtin,
      isStub: d.is_stub,
      fields: fields.rows.map((f) => ({
        band: f.band as ReportField["band"],
        sourceColumn: f.source_column,
        label: f.label,
        agg: f.agg,
        groupBy: f.group_by,
        format: f.format,
        sortOrder: f.sort_order,
      })),
    };
  });
}

export async function listReportDefinitions(ctx: RlsContext): Promise<ReportDefinition[]> {
  const rows = await rlsQuery<{
    id: string; code: string; name: string; kind: string; description: string | null;
    base_view: string; is_builtin: boolean; is_stub: boolean;
  }>(
    ctx,
    `SELECT id, code, name, kind, description, base_view, is_builtin, is_stub
       FROM app.report_definitions ORDER BY is_builtin DESC, name`,
  );
  return rows.map((d) => ({
    id: d.id,
    code: d.code,
    name: d.name,
    kind: d.kind,
    description: d.description,
    baseView: d.base_view,
    isBuiltin: d.is_builtin,
    isStub: d.is_stub,
    fields: [],
  }));
}

export class ReportError extends Error {}

/**
 * Jalankan definisi laporan terhadap view sumbernya.
 *
 * Nama view diinterpolasi ke SQL — karena itu WAJIB diverifikasi terhadap
 * whitelist lebih dulu. Tanpa langkah ini, satu baris report_definitions yang
 * jahat menjadi SQL injection.
 */
export async function runReport(
  ctx: RlsContext,
  def: ReportDefinition,
): Promise<Record<string, unknown>[]> {
  return withRls(ctx, async (client) => {
    const allowed = await client.query(
      `SELECT 1 FROM app.report_allowed_views WHERE view_name = $1`,
      [def.baseView],
    );
    if (allowed.rowCount === 0) {
      throw new ReportError(
        `Sumber data "${def.baseView}" tidak ada di whitelist app.report_allowed_views.`,
      );
    }
    // Nama sudah dicocokkan persis ke whitelist; dikutip lewat format(%I) di server.
    const q = await client.query<{ sql: string }>(
      `SELECT format('SELECT * FROM app.%I', $1::text) AS sql`,
      [def.baseView],
    );
    const rows = await client.query(q.rows[0].sql);
    return rows.rows as Record<string, unknown>[];
  });
}

/**
 * Ringkasan P&L / break-even.
 *
 * SENGAJA belum dihitung. Break-even butuh sisi PENDAPATAN, dan proyek ini
 * belum punya panen sama sekali (concept:14). Menampilkan angka break-even
 * sekarang berarti memfabrikasi denominator — persis yang concept:40 sebut
 * *fatal failure*.
 *
 * Struktur datanya sudah ada (Revenue/AR diparkir, docs/04 poin 8). Fungsi ini
 * mengembalikan apa yang benar-benar diketahui, dan null untuk yang belum.
 */
export type PnlSummary = {
  totalSpendIdr: number | null;
  totalBudgetIdr: number | null;
  revenueIdr: number | null;
  breakEvenMonths: number | null;
  transactionCount: number;
};

export async function pnlSummary(ctx: RlsContext): Promise<PnlSummary> {
  const rows = await rlsQuery<{ spend: string | null; n: string; budget: string | null }>(
    ctx,
    `SELECT (SELECT sum(amount_idr) FROM app.cost_transactions
              WHERE approval_status = 'approved') AS spend,
            (SELECT count(*) FROM app.cost_transactions
              WHERE approval_status = 'approved') AS n,
            (SELECT sum(amount_idr) FROM app.budgets) AS budget`,
  );
  const r = rows[0];
  const n = Number(r?.n ?? 0);
  return {
    totalSpendIdr: n === 0 ? null : Number(r.spend ?? 0),
    totalBudgetIdr: r?.budget === null || r?.budget === undefined ? null : Number(r.budget),
    // Belum ada panen -> belum ada pendapatan. Bukan 0, tapi "belum diketahui".
    revenueIdr: null,
    breakEvenMonths: null,
    transactionCount: n,
  };
}

/** Nama perusahaan aktif — untuk kop laporan (mis. ekspor PDF). */
export async function companyName(ctx: RlsContext): Promise<string> {
  if (!ctx.companyId) return "—";
  const rows = await rlsQuery<{ name: string }>(
    ctx,
    `SELECT name FROM app.companies WHERE id = $1`,
    [ctx.companyId],
  );
  return rows[0]?.name ?? "—";
}
