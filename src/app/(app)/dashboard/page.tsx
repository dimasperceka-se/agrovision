import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Wallet, CheckSquare, Map as MapIcon, TriangleAlert, Info, ArrowRight, Sprout,
} from "lucide-react";
import { requireContext } from "@/lib/session";
import {
  budgetVsActual, listExpenditures, listPendingApprovals, totalApprovedSpend,
} from "@/lib/repo/costing";
import { listBlocks } from "@/lib/repo/blocks";
import { PageHeader } from "@/components/ui/PageHeader";
import { getLocale } from "@/lib/i18n-server";
import { getDict } from "@/lib/i18n";
import { EmptyState } from "@/components/ui/EmptyState";
import { RecordStatusBadge } from "@/components/ui/RecordStatusBadge";
import { formatDate, formatIdr, formatIdrShort, EMPTY } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata = { title: "Dashboard — AgroVision" };

/**
 * Dashboard.
 *
 * Setiap angka dibaca dari database. Yang belum ada datanya dirender em dash,
 * BUKAN nol — nol berarti "sudah dihitung, hasilnya nol", em dash berarti "belum
 * ada yang bisa dihitung". Pada dashboard finansial perbedaan itu menentukan.
 *
 * Versi sebelumnya menampilkan 12 KPI dari src/data/dummy.ts, termasuk progress
 * tanam dan survival rate — dua metrik yang mustahil ada pada proyek yang belum
 * menanam apa pun.
 */
export default async function DashboardPage() {
  let ctx;
  try {
    ctx = await requireContext();
  } catch {
    redirect("/login");
  }

  const [spend, pending, blocks, budget, recent] = await Promise.all([
    totalApprovedSpend(ctx),
    listPendingApprovals(ctx, { pageSize: 5 }),
    listBlocks(ctx, { pageSize: 5 }),
    budgetVsActual(ctx),
    listExpenditures(ctx, { pageSize: 5 }),
  ]);

  const overBudget = budget.filter((b) => b.isOverBudget);
  const canDecide = ["approver", "super_admin"].includes(ctx.session.role);
  const t = getDict(await getLocale());

  return (
    <div>
      <PageHeader
        title={t("page.welcome").replace("{name}", ctx.session.fullName.split(" ")[0])}
        subtitle={t("sub.dashboard")}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          icon={Wallet}
          label="Pengeluaran disetujui"
          value={formatIdrShort(spend)}
          title={formatIdr(spend)}
          note={spend === null ? "Belum ada yang disetujui" : undefined}
          href="/costing/pengeluaran"
        />
        <Kpi
          icon={CheckSquare}
          label="Menunggu approval"
          value={pending.total === 0 ? EMPTY : String(pending.total)}
          note={
            pending.total === 0
              ? "Tidak ada antrean"
              : canDecide
                ? "Perlu keputusan Anda"
                : undefined
          }
          href="/approval"
          highlight={pending.total > 0 && canDecide}
        />
        <Kpi
          icon={MapIcon}
          label="Blok terdaftar"
          value={blocks.total === 0 ? EMPTY : String(blocks.total)}
          note={blocks.total === 0 ? "Belum ada blok" : undefined}
          href="/operasional/blok"
        />
        <Kpi
          icon={TriangleAlert}
          label="Anggaran terlampaui"
          value={budget.length === 0 ? EMPTY : String(overBudget.length)}
          note={budget.length === 0 ? "Anggaran belum disusun" : undefined}
          href="/costing/anggaran"
          highlight={overBudget.length > 0}
        />
      </div>

      {/* Konteks fase proyek — supaya dashboard yang memang terasa kosong tidak
          disalahartikan sebagai sistem yang rusak. */}
      <div className="mt-5 flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 p-4">
        <Sprout className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />
        <div className="text-sm leading-relaxed text-sky-900">
          <p className="font-semibold">Proyek pada fase pengadaan bibit.</p>
          <p className="mt-1">
            Belum ada penanaman, sehingga metrik produksi, survival rate, dan penyerapan karbon
            memang belum punya angka. Yang aktif sekarang: pencatatan blok, pengeluaran beserta
            buktinya, anggaran, dan approval.
          </p>
        </div>
      </div>

      {overBudget.length > 0 && (
        <div className="mt-4 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          <p className="text-sm leading-relaxed text-red-900">
            <strong>{overBudget.length} anggaran terlampaui:</strong>{" "}
            {overBudget.map((b) => `${b.costCategoryName} (${b.periodName})`).join(", ")}.{" "}
            <Link href="/laporan/keuangan" className="font-medium underline">
              Lihat laporan
            </Link>
          </p>
        </div>
      )}

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
            <h2 className="text-sm font-semibold text-slate-800">Pengeluaran terbaru</h2>
            <Link
              href="/costing/pengeluaran"
              className="flex items-center gap-1 text-xs font-medium text-emerald-700 hover:underline"
            >
              Semua <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {recent.rows.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="Belum ada pengeluaran"
              description="Catat pengeluaran pertama beserta bukti pembelian."
            />
          ) : (
            <ul className="divide-y divide-slate-50">
              {recent.rows.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-slate-700">
                      {r.costCategoryName ?? EMPTY}
                      {r.blockCode && (
                        <span className="ml-1.5 font-mono text-xs text-slate-400">
                          {r.blockCode}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-400">{formatDate(r.transactionDate)}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-medium tabular-nums text-slate-800">
                      {formatIdr(r.amountIdr)}
                    </p>
                    <RecordStatusBadge status={r.approvalStatus} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
            <h2 className="text-sm font-semibold text-slate-800">Menunggu keputusan</h2>
            <Link
              href="/approval"
              className="flex items-center gap-1 text-xs font-medium text-emerald-700 hover:underline"
            >
              Inbox <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {pending.rows.length === 0 ? (
            <EmptyState
              icon={CheckSquare}
              title="Tidak ada antrean"
              description="Item muncul di sini setelah diajukan dari modul asal."
            />
          ) : (
            <ul className="divide-y divide-slate-50">
              {pending.rows.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-slate-700">
                      {r.costCategoryName ?? r.module}
                      {r.blockCode && (
                        <span className="ml-1.5 font-mono text-xs text-slate-400">
                          {r.blockCode}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-400">
                      {r.createdByName ?? EMPTY} &middot; {formatDate(r.transactionDate)}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-medium tabular-nums text-slate-800">
                    {formatIdr(r.amountIdr)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <p className="mt-4 flex items-start gap-1.5 text-xs leading-relaxed text-slate-400">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Tanda &ldquo;{EMPTY}&rdquo; berarti belum ada data, bukan nol. Perbedaannya disengaja: nol
        adalah hasil hitungan, em dash berarti belum ada yang bisa dihitung.
      </p>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  title,
  note,
  href,
  highlight,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  title?: string;
  note?: string;
  href: string;
  highlight?: boolean;
}) {
  const empty = value === EMPTY;
  return (
    <Link
      href={href}
      className={cn(
        "rounded-xl border bg-white p-4 transition-shadow hover:shadow-sm",
        highlight ? "border-amber-300" : "border-slate-200",
      )}
    >
      <div className="flex items-center gap-1.5">
        <Icon className={cn("h-4 w-4", highlight ? "text-amber-600" : "text-emerald-600")} />
        <p className="text-xs text-slate-500">{label}</p>
      </div>
      <p
        className={cn(
          "mt-1.5 text-xl font-bold tabular-nums",
          empty ? "text-slate-300" : "text-slate-800",
        )}
        title={title}
      >
        {value}
      </p>
      {note && <p className="mt-1 text-xs leading-relaxed text-slate-400">{note}</p>}
    </Link>
  );
}
