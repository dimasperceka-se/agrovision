import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { requireContext } from "@/lib/session";
import { financeReportData } from "@/lib/reportData";
import { FinanceReport } from "@/lib/pdf/reports";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  let ctx;
  try { ctx = await requireContext(); } catch { return new Response("Unauthorized", { status: 401 }); }
  const { company, def, pnl, perBlock, budget, categories } = await financeReportData(ctx);
  if (!def) return new Response("Definisi laporan tidak ada", { status: 404 });

  const buf = await renderToBuffer(createElement(FinanceReport, {
    company,
    generatedAt: new Date(),
    def: { name: def.name, description: def.description, code: def.code, baseView: def.baseView },
    pnl: { totalSpendIdr: pnl.totalSpendIdr, totalBudgetIdr: pnl.totalBudgetIdr, transactionCount: pnl.transactionCount },
    perBlock,
    budget,
    categories,
  }) as unknown as Parameters<typeof renderToBuffer>[0]);

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="laporan-keuangan-${stamp}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
