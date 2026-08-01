import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { requireContext } from "@/lib/session";
import { operationalReportData } from "@/lib/reportData";
import { OperationalReport } from "@/lib/pdf/reports";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  let ctx;
  try { ctx = await requireContext(); } catch { return new Response("Unauthorized", { status: 401 }); }
  const { company, def, stock, totals } = await operationalReportData(ctx);

  const buf = await renderToBuffer(createElement(OperationalReport, {
    company,
    generatedAt: new Date(),
    def: def ? { name: def.name, description: def.description, code: def.code } : null,
    stock,
    totals,
  }) as unknown as Parameters<typeof renderToBuffer>[0]);

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="laporan-operasional-${stamp}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
