import { requireContext } from "@/lib/session";
import { sustainabilityReportData } from "@/lib/reportData";
import { buildExcelHtml, excelResponse, type Section } from "@/lib/excel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  let ctx;
  try { ctx = await requireContext(); } catch { return new Response("Unauthorized", { status: 401 }); }
  const { company, run, blocks, activeCerts, certCount } = await sustainabilityReportData(ctx);

  const sections: Section[] = [
    {
      title: "Ringkasan",
      columns: [{ label: "Metrik" }, { label: "Nilai", align: "right" }],
      rows: [
        ["Neraca karbon bersih (tCO2e)", run?.netBalanceTco2e ?? null],
        ["Emisi bruto (tCO2e)", run?.grossEmissionTco2e ?? null],
        ["Sertifikat aktif", certCount === 0 ? null : activeCerts],
      ],
      note: "Koefisien IPCC perkiraan yang BELUM DIVALIDASI — untuk gambaran fase awal saja.",
    },
    {
      title: "Net Carbon per Blok",
      columns: [
        { label: "Blok" }, { label: "Luas (ha)", align: "right" }, { label: "Neraca (tCO2e)", align: "right" },
      ],
      rows: blocks.map((b) => [b.blockCode, b.areaHa, b.netTco2e]),
    },
  ];

  const html = buildExcelHtml({ title: "Laporan Keberlanjutan", company, generatedAt: new Date() }, sections);
  return excelResponse(html, `laporan-keberlanjutan-${new Date().toISOString().slice(0, 10)}`);
}
