import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { requireContext } from "@/lib/session";
import { sustainabilityReportData } from "@/lib/reportData";
import { SustainabilityReport } from "@/lib/pdf/reports";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  let ctx;
  try { ctx = await requireContext(); } catch { return new Response("Unauthorized", { status: 401 }); }
  const { company, def, run, blocks, activeCerts, certCount } = await sustainabilityReportData(ctx);

  const buf = await renderToBuffer(createElement(SustainabilityReport, {
    company,
    generatedAt: new Date(),
    def: def ? { name: def.name, description: def.description, code: def.code } : null,
    run: run ? { netBalanceTco2e: run.netBalanceTco2e, grossEmissionTco2e: run.grossEmissionTco2e } : null,
    blocks,
    activeCerts,
    certCount,
  }) as unknown as Parameters<typeof renderToBuffer>[0]);

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="laporan-keberlanjutan-${stamp}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
