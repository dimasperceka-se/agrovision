import { requireContext } from "@/lib/session";
import { operationalReportData } from "@/lib/reportData";
import { buildExcelHtml, excelResponse, type Section } from "@/lib/excel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  let ctx;
  try { ctx = await requireContext(); } catch { return new Response("Unauthorized", { status: 401 }); }
  const { company, stock, totals } = await operationalReportData(ctx);

  const sections: Section[] = [
    {
      title: "Ringkasan",
      columns: [{ label: "Metrik" }, { label: "Nilai", align: "right" }],
      rows: [
        ["Total bibit awal", stock.length === 0 ? null : totals.totalInitial],
        ["Bibit hidup", stock.length === 0 ? null : totals.totalAlive],
        ["Survival keseluruhan (%)", totals.overall],
      ],
    },
    {
      title: "Stok Bibit per Batch",
      columns: [
        { label: "Batch" }, { label: "Komoditas" },
        { label: "Hidup", align: "right" }, { label: "Awal", align: "right" }, { label: "Survival (%)", align: "right" },
      ],
      rows: stock.map((s) => [s.batchCode, s.cropName, s.qtyAlive, s.qtyInitial, s.survivalPct]),
    },
  ];

  const html = buildExcelHtml({ title: "Laporan Operasional", company, generatedAt: new Date() }, sections);
  return excelResponse(html, `laporan-operasional-${new Date().toISOString().slice(0, 10)}`);
}
