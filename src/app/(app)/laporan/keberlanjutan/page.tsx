import { redirect } from "next/navigation";
import { Leaf, TriangleAlert } from "lucide-react";
import { requireContext } from "@/lib/session";
import { getReportDefinition } from "@/lib/repo/reports";
import { carbonByBlock, latestCarbonRun, listCertificates } from "@/lib/repo/sustainability";
import { PageHeader } from "@/components/ui/PageHeader";
import { getLocale } from "@/lib/i18n-server";
import { getDict } from "@/lib/i18n";
import { EmptyState } from "@/components/ui/EmptyState";
import { ReportDownload } from "@/components/ui/ReportDownload";
import { formatHa, EMPTY } from "@/lib/format";

export const metadata = { title: "Laporan Keberlanjutan — AgroVision" };

const tco2e = (v: number | null) =>
  v === null ? EMPTY : `${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(v)} tCO₂e`;

export default async function Page() {
  let ctx;
  try { ctx = await requireContext(); } catch { redirect("/login"); }
  const t = getDict(await getLocale());
  const [def, run, blocks, certs] = await Promise.all([
    getReportDefinition(ctx, "RPT-SUSTAINABILITY"),
    latestCarbonRun(ctx),
    carbonByBlock(ctx),
    listCertificates(ctx),
  ]);
  const activeCerts = certs.filter((c) => c.state === "active" || c.state === "expiring").length;

  return (
    <div>
      <PageHeader title={def?.name ?? t("page.report.sustainability")} subtitle={def?.description ?? undefined}
        actions={
          <div className="flex items-center gap-2">
            {def && <span className="hidden rounded bg-slate-100 px-2 py-1 text-xs text-slate-500 sm:inline">Definisi <code className="font-mono">{def.code}</code></span>}
            <ReportDownload base="/laporan/keberlanjutan" />
          </div>
        } />

      <div className="mb-5 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3">
        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <p className="text-sm leading-relaxed text-amber-900">
          Angka karbon memakai koefisien IPCC perkiraan yang <strong>belum divalidasi</strong>. Cukup
          untuk gambaran fase awal; belum untuk klaim keberlanjutan resmi.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Kpi label="Neraca karbon bersih" value={tco2e(run?.netBalanceTco2e ?? null)}
          note={run && (run.netBalanceTco2e ?? 0) < 0 ? "Net emitter (fase land clearing)" : undefined} />
        <Kpi label="Emisi bruto" value={tco2e(run?.grossEmissionTco2e ?? null)} />
        <Kpi label="Sertifikat aktif" value={certs.length === 0 ? EMPTY : String(activeCerts)} />
      </div>

      <section className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <h2 className="border-b border-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-800">Net Carbon per Blok</h2>
        {blocks.length === 0 ? (
          <EmptyState icon={Leaf} title="Belum ada perhitungan karbon" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
                <tr><th className="px-4 py-2.5 font-medium">Blok</th><th className="px-4 py-2.5 text-right font-medium">Luas</th><th className="px-4 py-2.5 text-right font-medium">Neraca</th></tr>
              </thead>
              <tbody>
                {blocks.map((b) => (
                  <tr key={b.blockCode} className="border-b border-slate-50 last:border-0">
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{b.blockCode}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-500">{formatHa(b.areaHa)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-medium text-slate-800">{tco2e(b.netTco2e)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Kpi({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={"mt-1 text-lg font-bold tabular-nums " + (value === EMPTY ? "text-slate-300" : "text-slate-800")}>{value}</p>
      {note && <p className="mt-1 text-xs text-slate-400">{note}</p>}
    </div>
  );
}
