import { ResponsiveTable } from "@/components/ui/ResponsiveTable";
import { STATUS_LABEL, STATUS_COLOR, type DashboardReport, type IndStatus } from "@/lib/report/types";

/**
 * Tampilan laporan dashboard (halaman) sesuai Master Laporan: header block +
 * tabel indikator (Status berwarna + Tindak lanjut) + Insight & Rekomendasi.
 * Server component — tanpa interaktivitas.
 */
export function DashboardReportView({ report }: { report: DashboardReport }) {
  const { meta, indicators, insights } = report;
  const printed = fmt(meta.printedAt);

  return (
    <div className="space-y-5">
      {/* Header block */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 bg-emerald-700 px-4 py-3 text-white">
          <h2 className="text-base font-bold">{meta.title}</h2>
          <p className="text-xs text-emerald-50">{meta.subtitle}</p>
        </div>
        <dl className="grid grid-cols-1 gap-x-8 gap-y-1.5 px-4 py-3 text-xs sm:grid-cols-2">
          <Meta label="Entitas / Estate" value={meta.entity} />
          <Meta label="Status data" value={meta.dataStatus} />
          <Meta label="Periode laporan" value={meta.period} />
          <Meta label="Tanggal cetak" value={printed} />
          <Meta label="Lingkup blok" value={meta.blockScope} />
          <Meta label="Disusun oleh" value="________________" />
          <Meta label="Komoditas" value={meta.commodity} />
          <Meta label="Diketahui" value="________________" />
        </dl>
        <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">Sumber: {meta.source}</p>
      </section>

      {/* Tabel indikator */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <ResponsiveTable>
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th className="px-3 py-2.5 font-medium">No</th>
                <th className="px-3 py-2.5 font-medium">Tahap / Kelompok</th>
                <th className="px-3 py-2.5 font-medium">Indikator</th>
                <th className="px-3 py-2.5 text-right font-medium">Nilai</th>
                <th className="px-3 py-2.5 font-medium">Satuan</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="px-3 py-2.5 font-medium">Tindak lanjut</th>
                <th className="px-3 py-2.5 font-medium">Detail / modul</th>
              </tr>
            </thead>
            <tbody>
              {indicators.map((ind, i) => {
                const newGroup = !!ind.group;
                return (
                  <tr key={i} className={"border-b border-slate-50 last:border-0 align-top " + (newGroup ? "border-t border-slate-200" : "")}>
                    <td data-label="No" className="px-3 py-2 tabular-nums text-slate-500">{i + 1}</td>
                    <td data-label="Tahap / Kelompok" data-empty={!ind.group} className="px-3 py-2 font-medium text-slate-700">{ind.group ?? ""}</td>
                    <td data-label="Indikator" className="px-3 py-2 text-slate-700">{ind.indicator}</td>
                    <td data-label="Nilai" className="px-3 py-2 text-right font-semibold tabular-nums text-slate-800">{ind.value}</td>
                    <td data-label="Satuan" data-empty={!ind.unit} className="px-3 py-2 text-slate-500">{ind.unit}</td>
                    <td data-label="Status" className="px-3 py-2"><StatusBadge status={ind.status} /></td>
                    <td data-label="Tindak lanjut" className="max-w-[260px] px-3 py-2 text-xs text-slate-500">{ind.followUp}</td>
                    <td data-label="Detail / modul" className="whitespace-nowrap px-3 py-2 text-xs text-slate-500">{ind.detail}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </ResponsiveTable>
        {meta.note && <p className="border-t border-slate-100 px-4 py-2 text-xs leading-relaxed text-slate-500">Catatan: {meta.note}</p>}
      </section>

      {/* Insight & Rekomendasi */}
      {insights.length > 0 && (
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <h3 className="border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-800">
            Insight &amp; Rekomendasi Tindak Lanjut
          </h3>
          <ResponsiveTable>
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 text-left text-xs text-slate-500">
                <tr>
                  <th className="px-3 py-2.5 font-medium">No</th>
                  <th className="px-3 py-2.5 font-medium">Temuan (kesimpulan)</th>
                  <th className="px-3 py-2.5 font-medium">Rekomendasi tindak lanjut</th>
                  <th className="px-3 py-2.5 font-medium">Prioritas · PIC</th>
                </tr>
              </thead>
              <tbody>
                {insights.map((ins, i) => (
                  <tr key={i} className="border-b border-slate-50 last:border-0 align-top">
                    <td data-label="No" className="px-3 py-2 tabular-nums text-slate-500">{i + 1}</td>
                    <td data-label="Temuan (kesimpulan)" className="max-w-[340px] px-3 py-2 text-slate-700">{ins.finding}</td>
                    <td data-label="Rekomendasi tindak lanjut" className="max-w-[340px] px-3 py-2 text-slate-600">{ins.recommendation}</td>
                    <td data-label="Prioritas · PIC" className="whitespace-nowrap px-3 py-2 text-xs">
                      <span className={"font-medium " + (ins.priority === "Tinggi" ? "text-red-700" : ins.priority === "Sedang" ? "text-amber-700" : "text-slate-600")}>{ins.priority}</span>
                      <span className="text-slate-500"> · {ins.pic}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ResponsiveTable>
        </section>
      )}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="w-32 shrink-0 text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-700">{value}</dd>
    </div>
  );
}

export function StatusBadge({ status }: { status: IndStatus }) {
  const c = STATUS_COLOR[status];
  return (
    <span
      className="inline-block whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-medium"
      style={{ color: c.fg, backgroundColor: c.bg, border: `1px solid ${c.border}` }}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

function fmt(d: Date): string {
  try {
    return new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}
