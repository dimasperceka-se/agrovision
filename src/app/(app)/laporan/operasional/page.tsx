import { FileBarChart2 } from "lucide-react";
import { redirect } from "next/navigation";
import { requireContext } from "@/lib/session";
import { getReportDefinition } from "@/lib/repo/reports";
import { listSeedStock } from "@/lib/repo/operational";
import { PageHeader } from "@/components/ui/PageHeader";
import { getLocale } from "@/lib/i18n-server";
import { getDict } from "@/lib/i18n";
import { EmptyState } from "@/components/ui/EmptyState";
import { ReportDownload } from "@/components/ui/ReportDownload";
import { formatNumber, formatPct, EMPTY } from "@/lib/format";

export const metadata = { title: "Laporan Operasional — AgroVision" };

/**
 * Laporan Operasional — dari baris definisi RPT-OPERATIONAL.
 *
 * Fase ini menampilkan stok bibit (satu-satunya data operasional yang sudah
 * ada). Progress tanam dan realisasi pemupukan bergabung begitu penanaman
 * dimulai; strukturnya sudah siap.
 */
export default async function Page() {
  let ctx;
  try {
    ctx = await requireContext();
  } catch {
    redirect("/login");
  }
  const t = getDict(await getLocale());

  const [def, stock] = await Promise.all([
    getReportDefinition(ctx, "RPT-OPERATIONAL"),
    listSeedStock(ctx),
  ]);

  const totalAlive = stock.reduce((s, x) => s + (x.qtyAlive ?? 0), 0);
  const totalInitial = stock.reduce((s, x) => s + x.qtyInitial, 0);
  const overall = totalInitial === 0 ? null : Math.round((totalAlive * 1000) / totalInitial) / 10;

  return (
    <div>
      <PageHeader
        title={def?.name ?? t("page.report.operational")}
        subtitle={def?.description ?? undefined}
        actions={
          <div className="flex items-center gap-2">
            {def && (
              <span className="hidden rounded bg-slate-100 px-2 py-1 text-xs text-slate-500 sm:inline">
                Definisi <code className="font-mono">{def.code}</code>
              </span>
            )}
            <ReportDownload base="/laporan/operasional" />
          </div>
        }
      />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Kpi label="Total bibit awal" value={stock.length === 0 ? EMPTY : formatNumber(totalInitial)} />
        <Kpi label="Bibit hidup" value={stock.length === 0 ? EMPTY : formatNumber(totalAlive)} />
        <Kpi label="Survival keseluruhan" value={overall === null ? EMPTY : formatPct(overall)} />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <h2 className="border-b border-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-800">
          Stok Bibit per Batch
        </h2>
        {stock.length === 0 ? (
          <EmptyState
            icon={FileBarChart2}
            title="Belum ada data bibit"
            description="Progress tanam dan aktivitas pemupukan menyusul begitu penanaman dimulai."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Batch</th>
                  <th className="px-4 py-2.5 font-medium">Komoditas</th>
                  <th className="px-4 py-2.5 text-right font-medium">Hidup / Awal</th>
                  <th className="px-4 py-2.5 text-right font-medium">Survival</th>
                </tr>
              </thead>
              <tbody>
                {stock.map((s) => (
                  <tr key={s.batchCode} className="border-b border-slate-50 last:border-0">
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{s.batchCode}</td>
                    <td className="px-4 py-2.5 text-slate-700">{s.cropName}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">
                      {formatNumber(s.qtyAlive)} / {formatNumber(s.qtyInitial)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-800">
                      {s.survivalPct === null ? EMPTY : formatPct(s.survivalPct)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="mt-3 text-xs leading-relaxed text-slate-400">
        Progress penanaman dan realisasi pemupukan akan bergabung ke laporan ini setelah penanaman
        dimulai. Struktur datanya sudah siap.
      </p>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={"mt-1 text-xl font-bold tabular-nums " + (value === EMPTY ? "text-slate-300" : "text-slate-800")}>
        {value}
      </p>
    </div>
  );
}
