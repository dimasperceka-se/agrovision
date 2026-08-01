import { Sprout } from "lucide-react";
import { redirect } from "next/navigation";
import { requireContext } from "@/lib/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { getLocale } from "@/lib/i18n-server";
import { getDict } from "@/lib/i18n";
import { EmptyState } from "@/components/ui/EmptyState";
import { listSeedStock } from "@/lib/repo/operational";
import { formatNumber, formatPct, EMPTY } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata = { title: "Bibit & Nursery — AgroVision" };

export default async function Page() {
  let ctx;
  try { ctx = await requireContext(); } catch { redirect("/login"); }
  const t = getDict(await getLocale());
  const stock = await listSeedStock(ctx);

  return (
    <div>
      <PageHeader title={t("nav.nursery")} subtitle={t("sub.nursery")} />
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {stock.length === 0 ? (
          <EmptyState icon={Sprout} title="Belum ada batch bibit" description="Batch bibit dan inspeksinya muncul di sini setelah dicatat." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Batch</th>
                  <th className="px-4 py-2.5 font-medium">Komoditas</th>
                  <th className="px-4 py-2.5 text-right font-medium">Awal</th>
                  <th className="px-4 py-2.5 text-right font-medium">Hidup</th>
                  <th className="px-4 py-2.5 text-right font-medium">Mati</th>
                  <th className="px-4 py-2.5 text-right font-medium">Rusak</th>
                  <th className="px-4 py-2.5 text-right font-medium">Survival</th>
                </tr>
              </thead>
              <tbody>
                {stock.map((s) => (
                  <tr key={s.batchCode} className="border-b border-slate-50 last:border-0">
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{s.batchCode}</td>
                    <td className="px-4 py-2.5 text-slate-700">{s.cropName}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">{formatNumber(s.qtyInitial)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-emerald-700">{formatNumber(s.qtyAlive)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-500">{formatNumber(s.qtyDead)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-500">{formatNumber(s.qtyDamaged)}</td>
                    <td className={cn("px-4 py-2.5 text-right font-medium tabular-nums",
                      s.survivalPct === null ? "text-slate-300" : s.survivalPct >= 90 ? "text-emerald-700" : "text-amber-700")}>
                      {s.survivalPct === null ? EMPTY : formatPct(s.survivalPct)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-slate-400">Survival rate dihitung dari inspeksi terakhir yang disetujui dibagi jumlah awal batch. Batch tanpa inspeksi ditandai {EMPTY}.</p>
    </div>
  );
}
