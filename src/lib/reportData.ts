/**
 * Pengumpulan data 3 laporan (Keuangan, Operasional, Keberlanjutan) di satu
 * tempat, dipakai bersama oleh route ekspor PDF dan Excel — agar isi kedua format
 * SELALU sama (satu sumber data, tak ada drift).
 */
import type { RlsContext } from "@/lib/db";
import { getReportDefinition, pnlSummary, companyName } from "@/lib/repo/reports";
import { blockCostSummary, budgetVsActual, spendByCategory } from "@/lib/repo/costing";
import { listSeedStock } from "@/lib/repo/operational";
import { carbonByBlock, latestCarbonRun, listCertificates } from "@/lib/repo/sustainability";

export async function financeReportData(ctx: RlsContext) {
  const [company, def, pnl, perBlock, budget, byCategory] = await Promise.all([
    companyName(ctx),
    getReportDefinition(ctx, "RPT-FINANCIAL"),
    pnlSummary(ctx),
    blockCostSummary(ctx, { limit: 100 }),
    budgetVsActual(ctx),
    spendByCategory(ctx),
  ]);
  // Gulung sub-komponen ke induknya (identik dengan halaman keuangan).
  type Sub = { name: string; total: number; count: number; share: number | null };
  const grouped = new Map<string, { name: string; total: number; count: number; share: number | null; subs: Sub[] }>();
  for (const r of byCategory) {
    const g = grouped.get(r.categoryId) ?? { name: r.categoryName, total: 0, count: 0, share: null, subs: [] };
    g.total = r.categoryTotalIdr; g.count = r.categoryCount; g.share = r.categorySharePct;
    if (r.subcategoryName) g.subs.push({ name: r.subcategoryName, total: r.totalIdr, count: r.transactionCount, share: r.sharePct });
    grouped.set(r.categoryId, g);
  }
  const categories = [...grouped.values()].sort((a, b) => b.total - a.total);
  return { company, def, pnl, perBlock, budget, categories };
}

export async function operationalReportData(ctx: RlsContext) {
  const [company, def, stock] = await Promise.all([
    companyName(ctx),
    getReportDefinition(ctx, "RPT-OPERATIONAL"),
    listSeedStock(ctx),
  ]);
  const totalAlive = stock.reduce((s, x) => s + (x.qtyAlive ?? 0), 0);
  const totalInitial = stock.reduce((s, x) => s + x.qtyInitial, 0);
  const overall = totalInitial === 0 ? null : Math.round((totalAlive * 1000) / totalInitial) / 10;
  return { company, def, stock, totals: { totalInitial, totalAlive, overall } };
}

export async function sustainabilityReportData(ctx: RlsContext) {
  const [company, def, run, blocks, certs] = await Promise.all([
    companyName(ctx),
    getReportDefinition(ctx, "RPT-SUSTAINABILITY"),
    latestCarbonRun(ctx),
    carbonByBlock(ctx),
    listCertificates(ctx),
  ]);
  const activeCerts = certs.filter((c) => c.state === "active" || c.state === "expiring").length;
  return { company, def, run, blocks, activeCerts, certCount: certs.length };
}
