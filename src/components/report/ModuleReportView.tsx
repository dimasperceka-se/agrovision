import type { ModuleReport } from "@/lib/report/types";

/**
 * Tampilan laporan MODUL (halaman) sesuai Master Laporan: header block hijau +
 * tabel (kolom hijau eksisting / biru rekomendasi) + legenda + Visual pendamping
 * + Catatan. Server component.
 */
export function ModuleReportView({ report }: { report: ModuleReport }) {
  const { meta, columns, rows, visual } = report;
  const printed = fmt(meta.printedAt);

  return (
    <div className="space-y-4">
      {/* Header block */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="bg-emerald-700 px-4 py-3 text-white">
          <h2 className="text-base font-bold uppercase tracking-wide">{meta.title}</h2>
          <p className="text-xs text-emerald-50">{meta.subtitle}</p>
        </div>
        <dl className="grid grid-cols-1 gap-x-8 gap-y-1.5 px-4 py-3 text-xs sm:grid-cols-2">
          <Meta label="Entitas / Estate" value={meta.entity} />
          <Meta label="Status data" value={meta.dataStatus} />
          <Meta label="Periode" value={meta.period} />
          <Meta label="Tanggal cetak" value={printed} />
          <Meta label="Lingkup" value={meta.blockScope} />
          <Meta label="Disusun oleh" value="________________" />
          <Meta label="Komoditas" value={meta.commodity} />
          <Meta label="Diketahui" value="________________" />
        </dl>
        <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-400">Sumber: {meta.source}</p>
      </section>

      {/* Tabel modul */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                {columns.map((c, i) => (
                  <th
                    key={i}
                    className={
                      "px-3 py-2.5 text-xs font-semibold text-white " +
                      (c.align === "right" ? "text-right " : "text-left ") +
                      (c.kind === "new" ? "bg-blue-600" : "bg-emerald-700")
                    }
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-slate-400">
                    Belum ada data.
                  </td>
                </tr>
              ) : (
                rows.map((row, ri) => (
                  <tr key={ri} className="border-b border-slate-50 last:border-0">
                    {row.map((cell, ci) => (
                      <td
                        key={ci}
                        className={
                          "px-3 py-2 " +
                          (columns[ci].align === "right" ? "text-right tabular-nums " : "") +
                          (columns[ci].kind === "new" ? "bg-blue-50/40 text-slate-600" : "text-slate-700")
                        }
                      >
                        {cell === null || cell === "" ? "—" : String(cell)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="space-y-1 border-t border-slate-100 px-4 py-2 text-xs">
          <p className="text-slate-500">
            <span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-emerald-700 align-middle" /> Header hijau = kolom eksisting ·{" "}
            <span className="mx-1 inline-block h-2.5 w-2.5 rounded-sm bg-blue-600 align-middle" /> Header biru = rekomendasi tambahan (baru), digabung langsung.
          </p>
          {visual && <p className="text-blue-600">Visual pendamping: {visual}</p>}
          {meta.note && <p className="text-slate-400">Catatan: {meta.note}</p>}
        </div>
      </section>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="w-28 shrink-0 text-slate-400">{label}</dt>
      <dd className="font-medium text-slate-700">{value}</dd>
    </div>
  );
}

function fmt(d: Date): string {
  try {
    return new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}
