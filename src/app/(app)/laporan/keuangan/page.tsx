import { Fragment } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FileBarChart2, TriangleAlert, Info } from "lucide-react";
import { requireContext } from "@/lib/session";
import { getReportDefinition, pnlSummary } from "@/lib/repo/reports";
import { blockCostSummary, budgetVsActual, spendByCategory } from "@/lib/repo/costing";
import { PageHeader } from "@/components/ui/PageHeader";
import { getLocale } from "@/lib/i18n-server";
import { getDict } from "@/lib/i18n";
import { EmptyState } from "@/components/ui/EmptyState";
import { ReportDownload } from "@/components/ui/ReportDownload";
import { formatIdr, formatIdrShort, formatHa, formatPct, EMPTY } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata = { title: "Laporan Keuangan — AgroVision" };

/**
 * Laporan Keuangan — dirakit dari BARIS definisi `RPT-FINANCIAL`, bukan
 * halaman hardcoded (concept:70).
 *
 * Tidak ada satu pun angka di halaman ini yang ditulis di kode. Semuanya dibaca
 * dari view agregasi, dan yang belum ada datanya dirender sebagai em dash —
 * bukan 0. Angka fabrikasi di dashboard finansial disebut *fatal failure* oleh
 * dokumen konsep, dan halaman inilah tempat aturan itu paling mengikat.
 */
export default async function LaporanKeuanganPage() {
  let ctx;
  try {
    ctx = await requireContext();
  } catch {
    redirect("/login");
  }
  const t = getDict(await getLocale());

  const def = await getReportDefinition(ctx, "RPT-FINANCIAL");
  if (!def) {
    return (
      <div>
        <PageHeader title={t("page.report.financial")} />
        <div className="rounded-xl border border-dashed border-slate-300 bg-white">
          <EmptyState
            icon={FileBarChart2}
            title="Definisi laporan belum ada"
            description="Baris RPT-FINANCIAL seharusnya dibuat migrasi 0017_reports. Jalankan npm run db:migrate."
          />
        </div>
      </div>
    );
  }

  const [pnl, perBlock, budget, byCategory] = await Promise.all([
    pnlSummary(ctx),
    blockCostSummary(ctx, { limit: 100 }),
    budgetVsActual(ctx),
    spendByCategory(ctx),
  ]);

  // Gulung sub-komponen ke induknya untuk tampilan berjenjang.
  type Sub = { name: string; total: number; count: number; share: number | null };
  const grouped = new Map<string, { name: string; total: number; count: number;
                                    share: number | null; subs: Sub[] }>();
  for (const r of byCategory) {
    const g = grouped.get(r.categoryId) ??
      { name: r.categoryName, total: 0, count: 0, share: null, subs: [] };
    // Angka induk selalu dari kolom category_* (hasil window function di SQL),
    // bukan dijumlah di sini.
    g.total = r.categoryTotalIdr;
    g.count = r.categoryCount;
    g.share = r.categorySharePct;
    if (r.subcategoryName) {
      g.subs.push({ name: r.subcategoryName, total: r.totalIdr, count: r.transactionCount,
                    share: r.sharePct });
    }
    grouped.set(r.categoryId, g);
  }
  const categories = [...grouped.values()].sort((a, b) => b.total - a.total);
  const grandTotal = categories.reduce((s, c) => s + c.total, 0);
  const grandCount = categories.reduce((s, c) => s + c.count, 0);

  const overBudget = budget.filter((b) => b.isOverBudget);

  return (
    <div>
      <PageHeader
        title={def.name}
        subtitle={def.description ?? undefined}
        actions={
          <div className="flex items-center gap-2">
            <span className="hidden rounded bg-slate-100 px-2 py-1 text-xs text-slate-500 sm:inline">
              Definisi: <code className="font-mono">{def.code}</code> &middot; sumber{" "}
              <code className="font-mono">{def.baseView}</code>
            </span>
            <ReportDownload base="/laporan/keuangan" />
          </div>
        }
      />

      {/* --- Band KPI --- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Total pengeluaran disetujui"
          value={formatIdrShort(pnl.totalSpendIdr)}
          title={formatIdr(pnl.totalSpendIdr)}
          note={pnl.totalSpendIdr === null ? "Belum ada transaksi disetujui" : `${pnl.transactionCount} transaksi`}
        />
        <Kpi
          label="Total anggaran"
          value={formatIdrShort(pnl.totalBudgetIdr)}
          title={formatIdr(pnl.totalBudgetIdr)}
          note={pnl.totalBudgetIdr === null ? "Anggaran belum disusun" : undefined}
        />
        <Kpi
          label="Pendapatan"
          value={EMPTY}
          note="Belum ada panen — proyek masih fase pengadaan bibit"
        />
        <Kpi
          label="Break-even"
          value={EMPTY}
          note="Butuh sisi pendapatan; belum bisa dihitung"
        />
      </div>

      {/* Kejujuran soal dua KPI kosong di atas: alasannya dinyatakan, bukan disembunyikan. */}
      <div className="mt-4 flex items-start gap-2 rounded-md border border-sky-200 bg-sky-50 p-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
        <p className="text-sm leading-relaxed text-sky-900">
          <strong>Pendapatan dan break-even sengaja kosong.</strong> Keduanya butuh data panen,
          dan proyek ini belum menanam apa pun. Strukturnya sudah siap di database; angkanya akan
          muncul sendiri begitu ada penjualan pertama. Mengisi sekarang berarti menampilkan angka
          yang tidak punya dasar.
        </p>
      </div>

      {overBudget.length > 0 && (
        <div className="mt-4 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <p className="text-sm leading-relaxed text-red-900">
            <strong>{overBudget.length} anggaran terlampaui.</strong>{" "}
            {overBudget.map((b) => `${b.costCategoryName} (${b.periodName})`).join(", ")}
          </p>
        </div>
      )}

      {/* --- Band tabel: actual vs budget --- */}
      <section className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <h2 className="border-b border-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-800">
          Realisasi vs Anggaran
        </h2>
        {budget.length === 0 ? (
          <EmptyState
            icon={FileBarChart2}
            title="Anggaran belum disusun"
            description="Susun anggaran per fase proyek dan kategori biaya agar perbandingan ini bisa dihitung."
            action={
              <Link
                href="/costing/anggaran"
                className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                Buka Anggaran
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Periode</th>
                  <th className="px-4 py-2.5 font-medium">Kategori</th>
                  <th className="px-4 py-2.5 font-medium">Lingkup</th>
                  <th className="px-4 py-2.5 text-right font-medium">Anggaran</th>
                  <th className="px-4 py-2.5 text-right font-medium">Realisasi</th>
                  <th className="px-4 py-2.5 text-right font-medium">Sisa</th>
                  <th className="px-4 py-2.5 text-right font-medium">Serapan</th>
                </tr>
              </thead>
              <tbody>
                {budget.map((b) => (
                  <tr
                    key={b.budgetId}
                    className={cn("border-b border-slate-50 last:border-0", b.isOverBudget && "bg-red-50/40")}
                  >
                    <td className="px-4 py-2.5 text-slate-600">{b.periodName}</td>
                    <td className="px-4 py-2.5 text-slate-700">{b.costCategoryName}</td>
                    <td className="px-4 py-2.5">
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
                        {b.scopeType}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">
                      {formatIdr(b.budgetIdr)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-800">
                      {formatIdr(b.actualIdr)}
                    </td>
                    <td
                      className={cn(
                        "px-4 py-2.5 text-right tabular-nums",
                        b.remainingIdr < 0 ? "font-medium text-red-700" : "text-slate-600",
                      )}
                    >
                      {formatIdr(b.remainingIdr)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">
                      {formatPct(b.utilisationPct)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* --- Band tabel: rincian per komponen biaya (concept:158) --- */}
      <section className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <h2 className="border-b border-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-800">
          Rincian per Komponen Biaya
        </h2>
        {categories.length === 0 ? (
          <EmptyState
            icon={FileBarChart2}
            title="Belum ada pengeluaran disetujui"
            description="Rincian per komponen muncul setelah ada pengeluaran yang disetujui."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Komponen</th>
                  <th className="px-4 py-2.5 text-right font-medium">Transaksi</th>
                  <th className="px-4 py-2.5 text-right font-medium">Nilai</th>
                  <th className="px-4 py-2.5 text-right font-medium">Porsi</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  // Fragment perlu key-nya sendiri; <> tidak bisa menerima key.
                  <Fragment key={c.name}>
                    <tr className="border-b border-slate-50 bg-slate-50/60">
                      <td className="px-4 py-2.5 font-medium text-slate-800">{c.name}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">{c.count}</td>
                      <td className="px-4 py-2.5 text-right font-medium tabular-nums text-slate-800">
                        {formatIdr(c.total)}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">
                        {formatPct(c.share)}
                      </td>
                    </tr>
                    {c.subs
                      .sort((a, b) => b.total - a.total)
                      .map((s) => (
                        <tr key={`${c.name}-${s.name}`} className="border-b border-slate-50 last:border-0">
                          <td className="px-4 py-2 pl-9 text-slate-600">{s.name}</td>
                          <td className="px-4 py-2 text-right tabular-nums text-slate-500">{s.count}</td>
                          <td className="px-4 py-2 text-right tabular-nums text-slate-700">
                            {formatIdr(s.total)}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums text-slate-400">
                            {formatPct(s.share)}
                          </td>
                        </tr>
                      ))}
                  </Fragment>
                ))}
                <tr className="border-t-2 border-slate-200 bg-slate-50">
                  <td className="px-4 py-2.5 font-semibold text-slate-800">Total</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">{grandCount}</td>
                  <td className="px-4 py-2.5 text-right font-bold tabular-nums text-slate-900">
                    {formatIdr(grandTotal)}
                  </td>
                  {/* Porsi baris total selalu 100% menurut definisi, jadi tidak
                      ditampilkan — angka yang tidak membawa informasi hanyalah derau. */}
                  <td className="px-4 py-2.5 text-right text-slate-300">{EMPTY}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
        <p className="border-t border-slate-100 px-4 py-2 text-xs leading-relaxed text-slate-400">
          Delapan komponen biaya perkebunan beserta sub-komponennya. Transaksi dicatat pada
          sub-komponen; anggaran disusun pada level komponen induk.
        </p>
      </section>

      {/* --- Band tabel: biaya per blok --- */}
      <section className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <h2 className="border-b border-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-800">
          Biaya per Blok
        </h2>
        {perBlock.length === 0 ? (
          <EmptyState
            icon={FileBarChart2}
            title="Belum ada pengeluaran disetujui"
            description="Angka muncul di sini setelah approver menyetujui pengeluaran pertama."
            action={
              <Link
                href="/costing/pengeluaran"
                className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                Catat pengeluaran
              </Link>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Blok</th>
                    <th className="px-4 py-2.5 text-right font-medium">Luas</th>
                    <th className="px-4 py-2.5 text-right font-medium">Transaksi</th>
                    <th className="px-4 py-2.5 text-right font-medium">Total biaya</th>
                    <th className="px-4 py-2.5 text-right font-medium">Biaya / ha</th>
                  </tr>
                </thead>
                <tbody>
                  {perBlock.map((b) => (
                    <tr key={b.blockId} className="border-b border-slate-50 last:border-0">
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{b.blockCode}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-500">
                        {formatHa(b.areaHa)}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-500">
                        {b.transactionCount}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">
                        {formatIdr(b.totalCostIdr)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium tabular-nums text-slate-800">
                        {b.costPerHaIdr === null ? (
                          <span title="Luas belum ada — polygon blok belum didigitasi">{EMPTY}</span>
                        ) : (
                          formatIdr(b.costPerHaIdr)
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="border-t border-slate-100 px-4 py-2 text-xs leading-relaxed text-slate-400">
              Hanya transaksi <strong>disetujui</strong> yang dihitung — yang ditolak dan yang masih
              draft dikecualikan. Luas berasal dari PostGIS, bukan input manual, sehingga biaya per
              hektar tidak bisa dimanipulasi lewat pengisian luas.
            </p>
          </>
        )}
      </section>

      <p className="mt-4 text-xs leading-relaxed text-slate-400">
        {/* TODO: phase 2 — custom report builder UI di atas app.report_definitions */}
        Laporan ini dirakit dari baris definisi <code className="font-mono">{def.code}</code> di{" "}
        <code className="font-mono">app.report_definitions</code>. Ekspor PDF bergaya dokumen dan
        pembuat laporan mandiri menyusul pada fase berikutnya.
      </p>
    </div>
  );
}

function Kpi({
  label,
  value,
  title,
  note,
}: {
  label: string;
  value: string;
  title?: string;
  note?: string;
}) {
  const empty = value === EMPTY;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p
        className={cn("mt-1 text-xl font-bold tabular-nums", empty ? "text-slate-300" : "text-slate-800")}
        title={title}
      >
        {value}
      </p>
      {note && <p className="mt-1 text-xs leading-relaxed text-slate-400">{note}</p>}
    </div>
  );
}
