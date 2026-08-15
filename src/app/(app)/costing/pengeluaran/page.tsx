import { redirect } from "next/navigation";
import { Wallet, Paperclip } from "lucide-react";
import { requireContext } from "@/lib/session";
import { blockCostSummary, listExpenditures, totalApprovedSpend } from "@/lib/repo/costing";
import { PageHeader } from "@/components/ui/PageHeader";
import { getLocale } from "@/lib/i18n-server";
import { getDict } from "@/lib/i18n";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { RecordStatusBadge } from "@/components/ui/RecordStatusBadge";
import { ResponsiveTable } from "@/components/ui/ResponsiveTable";
import { formatDate, formatIdr, formatIdrShort, formatHa, EMPTY } from "@/lib/format";
import { SubmitButton } from "./SubmitButton";
import { cn } from "@/lib/utils";

export const metadata = { title: "Pengeluaran — AgroVision" };

const STATUSES = [
  { value: "", label: "Semua status" },
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "Diajukan" },
  { value: "approved", label: "Disetujui" },
  { value: "rejected", label: "Ditolak" },
];

/**
 * Pengeluaran (biaya).
 *
 * Pencatatan biaya manual DIHAPUS — sesuai model refleksi (docs/11 §4): biaya
 * mengalir dari aktivitas yang disetujui (volume × tarif), bukan input manual.
 * Halaman ini menampilkan transaksi biaya tercatat + biaya per blok. Pendapatan
 * ada di menu terpisah (Revenue).
 */
export default async function PengeluaranPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; q?: string }>;
}) {
  let ctx;
  try {
    ctx = await requireContext();
  } catch {
    redirect("/login");
  }
  const t = getDict(await getLocale());

  const sp = await searchParams;
  const page = Number(sp.page ?? "1") || 1;

  const [data, perBlock, total] = await Promise.all([
    listExpenditures(ctx, { page, status: sp.status || undefined, search: sp.q }),
    blockCostSummary(ctx, { limit: 5 }),
    totalApprovedSpend(ctx),
  ]);

  const canWrite = ["creator", "approver", "super_admin"].includes(ctx.session.role);

  return (
    <div>
      <PageHeader title={t("nav.expenditure")} subtitle={t("sub.expenditure")} />

      {/* KPI dari data nyata. Bila belum ada data, tampil em dash — bukan 0. */}
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Kpi label="Total disetujui" value={formatIdrShort(total)} title={total === null ? undefined : formatIdr(total)} hint={total === null ? "Belum ada pengeluaran disetujui" : undefined} />
        <Kpi label="Jumlah transaksi" value={data.total === 0 ? EMPTY : String(data.total)} />
        <Kpi label="Blok dengan biaya" value={perBlock.length === 0 ? EMPTY : String(perBlock.length)} />
      </div>

      {/* ── Biaya per blok ── */}
      {perBlock.length > 0 && (
        <div className="mb-5 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <p className="border-b border-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-800">Biaya per blok</p>
          <ResponsiveTable>
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
                    <td data-label="Blok" className="px-4 py-2.5 font-mono text-xs text-slate-600">{b.blockCode}</td>
                    <td data-label="Luas" className="px-4 py-2.5 text-right tabular-nums text-slate-500">{formatHa(b.areaHa)}</td>
                    <td data-label="Transaksi" className="px-4 py-2.5 text-right tabular-nums text-slate-500">{b.transactionCount}</td>
                    <td data-label="Total biaya" className="px-4 py-2.5 text-right tabular-nums text-slate-700">{formatIdr(b.totalCostIdr)}</td>
                    <td data-label="Biaya / ha" className="px-4 py-2.5 text-right font-medium tabular-nums text-slate-800">
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
          </ResponsiveTable>
          <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-400">
            Hanya transaksi berstatus <strong>disetujui</strong> yang dihitung. Luas berasal dari PostGIS, bukan input manual.
          </p>
        </div>
      )}

      {/* ── Daftar transaksi biaya ── */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <form action="/costing/pengeluaran" className="flex flex-wrap gap-2 border-b border-slate-100 p-3">
          <input
            type="search"
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="Cari blok, kategori, atau supplier..."
            className="w-full max-w-xs rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
          <select
            name="status"
            defaultValue={sp.status ?? ""}
            className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/30"
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <button type="submit" className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
            Terapkan
          </button>
        </form>

        {data.rows.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title={sp.q || sp.status ? "Tidak ada transaksi yang cocok" : "Belum ada pengeluaran"}
            description={sp.q || sp.status ? "Coba ubah filter." : "Biaya mengalir dari aktivitas yang disetujui (refleksi), bukan input manual."}
          />
        ) : (
          <>
            <ResponsiveTable>
              <table className="w-full text-sm">
                <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Tanggal</th>
                    <th className="px-4 py-2.5 font-medium">Blok</th>
                    <th className="px-4 py-2.5 font-medium">Kategori</th>
                    <th className="px-4 py-2.5 font-medium">Supplier</th>
                    <th className="px-4 py-2.5 text-right font-medium">Nilai</th>
                    <th className="px-4 py-2.5 font-medium">Bukti</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r) => (
                    <tr key={r.id} className="border-b border-slate-50 align-top last:border-0">
                      <td data-label="Tanggal" className="whitespace-nowrap px-4 py-2.5 text-slate-600">{formatDate(r.transactionDate)}</td>
                      <td data-label="Blok" className="px-4 py-2.5 font-mono text-xs text-slate-600">
                        {r.isOverhead ? (
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-sans text-xs text-slate-500">overhead</span>
                        ) : (
                          r.blockCode ?? EMPTY
                        )}
                      </td>
                      <td data-label="Kategori" data-empty={!r.costCategoryName} className="px-4 py-2.5 text-slate-700">{r.costCategoryName ?? EMPTY}</td>
                      <td data-label="Supplier" data-empty={!r.supplierName} className="px-4 py-2.5 text-slate-500">{r.supplierName ?? EMPTY}</td>
                      <td data-label="Nilai" className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-slate-800">{formatIdr(r.amountIdr)}</td>
                      <td data-label="Bukti" className="px-4 py-2.5">
                        <span className="inline-flex items-center gap-1 text-xs text-slate-500" title={`${r.evidenceCount} lampiran`}>
                          <Paperclip className="h-3.5 w-3.5" />
                          {r.evidenceCount}
                        </span>
                      </td>
                      <td data-label="Status" className="px-4 py-2.5">
                        <RecordStatusBadge status={r.approvalStatus} />
                        {r.rejectionReason && (
                          <p className="mt-1 max-w-[220px] text-xs leading-relaxed text-red-600">{r.rejectionReason}</p>
                        )}
                      </td>
                      <td data-action className="px-4 py-2.5 text-right">
                        {canWrite && (r.approvalStatus === "draft" || r.approvalStatus === "rejected") && (
                          <SubmitButton id={r.id} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ResponsiveTable>
            <Pagination
              page={data.page}
              pageSize={data.pageSize}
              total={data.total}
              basePath="/costing/pengeluaran"
              params={{ q: sp.q, status: sp.status }}
            />
          </>
        )}
      </div>
    </div>
  );
}

function Kpi({ label, value, title, hint }: { label: string; value: string; title?: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={cn("mt-1 text-xl font-bold tabular-nums", value === EMPTY ? "text-slate-300" : "text-slate-800")} title={title}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
