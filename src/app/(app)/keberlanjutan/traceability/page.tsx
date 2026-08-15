import { redirect } from "next/navigation";
import { requireContext } from "@/lib/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { getLocale } from "@/lib/i18n-server";
import { getDict } from "@/lib/i18n";
import { formatNumber, formatDate } from "@/lib/format";
import { ResponsiveTable } from "@/components/ui/ResponsiveTable";
import { TraceabilityMap } from "@/components/map/TraceabilityMap";
import { ACTORS, FLOWS, ACTOR_META, actorById } from "@/lib/traceabilityDemo";

export const metadata = { title: "Traceability — AgroVision" };

/**
 * Halaman traceability: peta rantai pasok (mode Transaksional + Emisi) di atas,
 * lalu TABEL yang isinya SAMA dengan peta — bersumber dari data yang sama
 * (traceabilityDemo). Tabel = aktor + transaksi yang tergambar di peta.
 */
export default async function TraceabilityPage() {
  try {
    await requireContext();
  } catch {
    redirect("/login");
  }
  const t = getDict(await getLocale());

  return (
    <div>
      <PageHeader title={t("nav.traceability")} subtitle={t("sub.traceability.map")} />

      <section className="mb-6">
        <TraceabilityMap />
      </section>

      {/* Tabel aktor — sama dengan node di peta */}
      <section className="mb-5 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <h2 className="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-800">
          Aktor rantai pasok
          <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium uppercase text-amber-700">demo</span>
          <span className="ml-auto text-xs font-normal text-slate-400">{ACTORS.length} aktor · sama dengan peta</span>
        </h2>
        <ResponsiveTable>
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">ID</th>
                <th className="px-4 py-2.5 font-medium">Nama</th>
                <th className="px-4 py-2.5 font-medium">Tipe</th>
                <th className="px-4 py-2.5 font-medium">Komoditas</th>
                <th className="px-4 py-2.5 font-medium">Distrik</th>
                <th className="px-4 py-2.5 text-right font-medium">Emisi (kg CO₂e)</th>
              </tr>
            </thead>
            <tbody>
              {ACTORS.map((a) => (
                <tr key={a.id} className="border-b border-slate-50 last:border-0">
                  <td data-label="ID" className="px-4 py-2.5 font-mono text-xs text-slate-600">{a.displayId}</td>
                  <td data-label="Nama" className="px-4 py-2.5 text-slate-700">{a.name}</td>
                  <td data-label="Tipe" className="px-4 py-2.5">
                    <span className="inline-flex items-center gap-1.5 text-slate-600">
                      <span className="h-2.5 w-2.5 rounded-full ring-1 ring-black/20" style={{ backgroundColor: ACTOR_META[a.type].color }} />
                      {ACTOR_META[a.type].label}
                    </span>
                  </td>
                  <td data-label="Komoditas" data-empty={!a.commodity} className="px-4 py-2.5 text-slate-600">{a.commodity ?? "—"}</td>
                  <td data-label="Distrik" className="px-4 py-2.5 text-slate-500">{a.district}</td>
                  <td data-label="Emisi (kg CO₂e)" className="px-4 py-2.5 text-right tabular-nums text-slate-700">{formatNumber(a.emission.totalCo2eq)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ResponsiveTable>
      </section>

      {/* Tabel transaksi — sama dengan arus (garis) di peta */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <h2 className="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-800">
          Transaksi
          <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium uppercase text-amber-700">demo</span>
          <span className="ml-auto text-xs font-normal text-slate-400">{FLOWS.length} arus · sama dengan peta</span>
        </h2>
        <ResponsiveTable>
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">ID</th>
                <th className="px-4 py-2.5 font-medium">Tanggal</th>
                <th className="px-4 py-2.5 font-medium">Komoditas</th>
                <th className="px-4 py-2.5 font-medium">Dari</th>
                <th className="px-4 py-2.5 font-medium">Ke</th>
                <th className="px-4 py-2.5 text-right font-medium">Volume (kg)</th>
              </tr>
            </thead>
            <tbody>
              {FLOWS.map((f) => {
                const from = actorById(f.from);
                const to = actorById(f.to);
                return (
                  <tr key={f.id} className="border-b border-slate-50 last:border-0">
                    <td data-label="ID" className="px-4 py-2.5 font-mono text-xs text-slate-500">{f.id}</td>
                    <td data-label="Tanggal" className="px-4 py-2.5 text-slate-600">{formatDate(f.date)}</td>
                    <td data-label="Komoditas" className="px-4 py-2.5 text-slate-600">{f.commodity}</td>
                    <td data-label="Dari" className="px-4 py-2.5 text-slate-700">{from?.name}<span className="ml-1 font-mono text-[11px] text-slate-400">{from?.displayId}</span></td>
                    <td data-label="Ke" className="px-4 py-2.5 text-slate-700">{to?.name}<span className="ml-1 font-mono text-[11px] text-slate-400">{to?.displayId}</span></td>
                    <td data-label="Volume (kg)" className="px-4 py-2.5 text-right tabular-nums text-slate-700">{formatNumber(f.grossKg)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </ResponsiveTable>
      </section>
    </div>
  );
}
