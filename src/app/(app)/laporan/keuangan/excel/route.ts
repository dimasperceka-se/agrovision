import { requireContext } from "@/lib/session";
import { financeReportData } from "@/lib/reportData";
import { buildExcelHtml, excelResponse, type Section, type Cell } from "@/lib/excel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  let ctx;
  try { ctx = await requireContext(); } catch { return new Response("Unauthorized", { status: 401 }); }
  const { company, def, pnl, perBlock, budget, categories } = await financeReportData(ctx);
  if (!def) return new Response("Definisi laporan tidak ada", { status: 404 });

  const catRows: Cell[][] = [];
  for (const c of categories) {
    catRows.push([c.name, "", c.count, c.total, c.share]);
    for (const s of [...c.subs].sort((a, b) => b.total - a.total)) catRows.push(["", s.name, s.count, s.total, s.share]);
  }
  const grandTotal = categories.reduce((s, c) => s + c.total, 0);
  const grandCount = categories.reduce((s, c) => s + c.count, 0);
  catRows.push(["TOTAL", "", grandCount, grandTotal, null]);

  const sections: Section[] = [
    {
      title: "Ringkasan",
      columns: [{ label: "Metrik" }, { label: "Nilai", align: "right" }],
      rows: [
        ["Total pengeluaran disetujui (Rp)", pnl.totalSpendIdr],
        ["Jumlah transaksi", pnl.transactionCount],
        ["Total anggaran (Rp)", pnl.totalBudgetIdr],
        ["Pendapatan (Rp)", null],
        ["Break-even", null],
      ],
      note: "Pendapatan & break-even kosong: belum ada panen (kejujuran data — bukan 0).",
    },
    {
      title: "Realisasi vs Anggaran",
      columns: [
        { label: "Periode" }, { label: "Kategori" }, { label: "Lingkup" },
        { label: "Anggaran (Rp)", align: "right" }, { label: "Realisasi (Rp)", align: "right" },
        { label: "Sisa (Rp)", align: "right" }, { label: "Serapan (%)", align: "right" },
      ],
      rows: budget.map((b) => [b.periodName, b.costCategoryName, b.scopeType, b.budgetIdr, b.actualIdr, b.remainingIdr, b.utilisationPct]),
    },
    {
      title: "Rincian per Komponen Biaya",
      columns: [
        { label: "Komponen" }, { label: "Sub-komponen" }, { label: "Transaksi", align: "right" },
        { label: "Nilai (Rp)", align: "right" }, { label: "Porsi (%)", align: "right" },
      ],
      rows: catRows,
    },
    {
      title: "Biaya per Blok",
      columns: [
        { label: "Blok" }, { label: "Luas (ha)", align: "right" }, { label: "Transaksi", align: "right" },
        { label: "Total biaya (Rp)", align: "right" }, { label: "Biaya / ha (Rp)", align: "right" },
      ],
      rows: perBlock.map((b) => [b.blockCode, b.areaHa, b.transactionCount, b.totalCostIdr, b.costPerHaIdr]),
      note: "Hanya transaksi disetujui yang dihitung. Luas dari PostGIS.",
    },
  ];

  const html = buildExcelHtml({ title: "Laporan Keuangan", company, generatedAt: new Date() }, sections);
  return excelResponse(html, `laporan-keuangan-${new Date().toISOString().slice(0, 10)}`);
}
