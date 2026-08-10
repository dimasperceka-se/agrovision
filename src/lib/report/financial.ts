import type { RlsContext } from "@/lib/db";
import { pnlSummary, companyName } from "@/lib/repo/reports";
import { budgetVsActual, blockCostSummary } from "@/lib/repo/costing";
import { reflectedCosts } from "@/lib/repo/pricing";
import type { DashboardReport, Indicator, Insight } from "./types";

const nf = (v: number, d = 0) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: d }).format(v);
const EMPTY = "—";

/**
 * Dashboard Finansial (sheet "00 Finansial" pada Master Laporan) — dihitung dari
 * data nyata (pnl, anggaran, refleksi biaya & revenue). Indikator yang belum
 * punya data/fitur ditandai "—" dengan status "Usulan"/"Belum ada data".
 */
export async function financialDashboardData(ctx: RlsContext): Promise<DashboardReport> {
  const [company, pnl, budget, perBlock, reflection] = await Promise.all([
    companyName(ctx),
    pnlSummary(ctx),
    budgetVsActual(ctx),
    blockCostSummary(ctx, { limit: 1000 }),
    reflectedCosts(ctx),
  ]);

  const spend = pnl.totalSpendIdr;
  const budgetTotal = pnl.totalBudgetIdr;
  const totalArea = perBlock.reduce((s, b) => s + (b.areaHa ?? 0), 0);
  const sumBudget = budget.reduce((s, b) => s + b.budgetIdr, 0);
  const sumActual = budget.reduce((s, b) => s + b.actualIdr, 0);
  const serap = budget.length && sumBudget > 0 ? (sumActual / sumBudget) * 100 : null;
  const hasRevenue = reflection.revenueLines.length > 0;
  const revenue = hasRevenue ? reflection.totalRevenueIdr : null;
  const reflectedCost = reflection.totalCostIdr;
  const laba = reflection.balanceIdr;
  const costPerHa = spend !== null && totalArea > 0 ? spend / totalArea : null;
  // "semu": ada revenue tapi biaya ter-refleksi sangat kecil → laba mengembang.
  const labaSemu = hasRevenue && reflectedCost < (revenue ?? 0) * 0.05;

  const val = (v: number | null, d = 0) => (v === null ? EMPTY : nf(v, d));

  const indicators: Indicator[] = [
    { group: "Anggaran", indicator: "Anggaran dialokasikan", value: val(budgetTotal), unit: "Rp",
      status: budgetTotal === null ? "kritis" : "ok",
      followUp: budgetTotal === null ? "Susun anggaran per fase & kategori (belum ada)" : "—", detail: "14 Anggaran" },
    { indicator: "Budget vs realisasi (% serap)", value: serap === null ? EMPTY : nf(serap, 1), unit: "%",
      status: serap === null ? "belum" : serap > 100 ? "perhatian" : "ok",
      followUp: serap === null ? "Aktif setelah anggaran disusun" : serap > 100 ? "Tinjau pos yang melampaui anggaran" : "—", detail: "14 Anggaran" },

    { group: "Spending", indicator: "Pengeluaran disetujui", value: val(spend), unit: "Rp",
      status: spend === null ? "belum" : "ok",
      followUp: spend === null ? "Mulai refleksi dari aktivitas disetujui" : "—", detail: "13 Pengeluaran" },
    { indicator: "Cost per hektar", value: val(costPerHa), unit: "Rp/ha",
      status: costPerHa === null ? "usulan" : "ok",
      followUp: costPerHa === null ? "Aktifkan hitung otomatis untuk feasibility" : "—", detail: "13 Pengeluaran" },
    { indicator: "Cost per pohon", value: EMPTY, unit: "Rp/pohon", status: "usulan",
      followUp: "Butuh populasi pohon per blok — aktifkan hitung otomatis", detail: "13 Pengeluaran" },
    { indicator: "Struktur biaya internal/outsource/kontrak", value: EMPTY, unit: "%", status: "usulan",
      followUp: "Pisahkan sumber biaya (internal/outsource/kontrak)", detail: "Costing" },

    { group: "Revenue & P/L", indicator: "Revenue", value: val(revenue), unit: "Rp",
      status: hasRevenue ? "ok" : "belum",
      followUp: hasRevenue ? "Validasi tarif price list" : "Menunggu panen disetujui", detail: "08 Panen" },
    { indicator: "Laba / rugi", value: val(laba), unit: "Rp",
      status: laba === null ? "belum" : labaSemu || laba < 0 ? "perhatian" : "ok",
      followUp: laba === null ? "Butuh revenue & biaya"
        : labaSemu ? "Masih semu: biaya belum lengkap — akan turun setelah biaya masuk"
        : laba < 0 ? "Rugi pada periode ini — tinjau struktur biaya vs revenue" : "—", detail: "Kalkulasi" },
    { indicator: "Forecast laba/rugi", value: EMPTY, unit: "Rp", status: "usulan", followUp: "Bangun proyeksi skenario", detail: "Kalkulasi" },
    { indicator: "Proyeksi kelayakan (BEP/IRR)", value: EMPTY, unit: "—", status: "usulan", followUp: "Susun model kelayakan", detail: "Feasibility" },

    { group: "Pembayaran & Pengadaan", indicator: "Payment approval (maker-checker)", value: EMPTY, unit: "Rp", status: "usulan",
      followUp: "Terapkan approval 2 tahap (vendor & payroll)", detail: "Finance" },
    { indicator: "Komitmen vs realisasi (PO)", value: EMPTY, unit: "Rp", status: "usulan", followUp: "Integrasi modul procurement", detail: "Procurement" },
    { indicator: "Spend per vendor", value: EMPTY, unit: "Rp", status: "usulan", followUp: "Ranking pemasok", detail: "Procurement" },
  ];

  const insights: Insight[] = [];
  if (labaSemu) insights.push({ finding: `Laba/rugi Rp ${val(laba)} masih semu — biaya belum lengkap sehingga P/L belum realistis.`, recommendation: "Aktifkan pencatatan/refleksi biaya agar laba-rugi mencerminkan kondisi nyata.", priority: "Tinggi", pic: "Finance · 13" });
  if (budgetTotal === null) insights.push({ finding: "Anggaran belum disusun; budget vs realisasi tidak dapat berjalan.", recommendation: "Susun anggaran per fase (mulai pengadaan bibit) & kategori biaya.", priority: "Tinggi", pic: "Finance · 14" });
  if (costPerHa === null) insights.push({ finding: "Belum ada biaya satuan (cost/ha, cost/pohon).", recommendation: "Aktifkan kalkulasi biaya satuan untuk economic feasibility.", priority: "Tinggi", pic: "Finance" });
  insights.push({ finding: "Belum ada kontrol pembayaran (maker-checker).", recommendation: "Terapkan payment approval dua tahap untuk vendor & payroll.", priority: "Tinggi", pic: "Finance" });
  if (!hasRevenue) insights.push({ finding: "Belum ada panen disetujui sehingga revenue kosong.", recommendation: "Setujui panen di Inbox Approval; pastikan tarif price list per komoditas/grade terisi.", priority: "Sedang", pic: "Finance · 08" });

  return {
    meta: {
      title: "Laporan Finansial",
      subtitle: "Refleksi finansial: alokasi anggaran, realisasi/spending, revenue, laba/rugi, forecast.",
      entity: company,
      period: "Seluruh data disetujui s.d. tanggal cetak",
      blockScope: "Semua blok",
      commodity: "Kelapa & Durian",
      dataStatus: "Disetujui (approved)",
      printedAt: new Date(),
      source: "Anggaran & Pengeluaran (refleksi aktivitas disetujui), Panen, Price list.",
      note: 'Bersifat refleksi: biaya berasal dari aktivitas operasional yang disetujui, bukan input manual. Kosong ditulis "—", bukan 0.',
    },
    indicators,
    insights,
  };
}
