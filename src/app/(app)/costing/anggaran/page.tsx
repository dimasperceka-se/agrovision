import Link from "next/link";
import { redirect } from "next/navigation";
import { PiggyBank, TriangleAlert, ShieldAlert } from "lucide-react";
import { requireContext } from "@/lib/session";
import { budgetVsActual, listFiscalPeriods } from "@/lib/repo/costing";
import { listParentCategoryOptions } from "@/lib/repo/master";
import { listEstateOptions, searchBlockOptions } from "@/lib/repo/blocks";
import { PageHeader } from "@/components/ui/PageHeader";
import { getLocale } from "@/lib/i18n-server";
import { getDict } from "@/lib/i18n";
import { EmptyState } from "@/components/ui/EmptyState";
import { ResponsiveTable } from "@/components/ui/ResponsiveTable";
import { formatIdr, formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PeriodForm, BudgetForm } from "./Forms";

export const metadata = { title: "Anggaran — AgroVision" };

/**
 * Anggaran per fase proyek (keputusan #6, docs/02).
 *
 * Lingkupnya bisa company / estate / blok. Bentuk kuncinya
 * (periode x kategori x lingkup) menampung ketiga jawaban keputusan #6 tanpa
 * migrasi ulang — dan lingkup blok itulah yang membuat acceptance test 3 bisa
 * dibuktikan: realisasi per blok menggerakkan perbandingan anggarannya.
 */
export default async function AnggaranPage() {
  let ctx;
  try {
    ctx = await requireContext();
  } catch {
    redirect("/login");
  }
  const t = getDict(await getLocale());

  const canWrite = ["super_admin", "approver"].includes(ctx.session.role);

  const [periods, categories, estates, blocks, rows] = await Promise.all([
    listFiscalPeriods(ctx),
    listParentCategoryOptions(ctx),
    listEstateOptions(ctx),
    searchBlockOptions(ctx),
    budgetVsActual(ctx),
  ]);

  return (
    <div>
      <PageHeader
        title={t("nav.budget")}
        subtitle={t("sub.budget")}
      />

      {!canWrite && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-sm text-amber-900">
            Peran <strong>{ctx.session.role}</strong> hanya bisa melihat. Menyusun anggaran butuh
            peran approver atau super admin.
          </p>
        </div>
      )}

      {!ctx.companyId && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-sm text-amber-900">
            Anda melihat <strong>semua entitas</strong>. Pilih satu entitas untuk menyusun anggaran.
          </p>
        </div>
      )}

      {canWrite && ctx.companyId && (
        <div className="space-y-4">
          <PeriodForm periods={periods} />
          {periods.length > 0 && categories.length > 0 ? (
            <BudgetForm
              periods={periods.filter((p) => !p.isClosed).map((p) => ({ value: p.id, label: p.name }))}
              categories={categories}
              estates={estates}
              blocks={blocks}
            />
          ) : (
            <div className="flex items-start gap-2 rounded-md border border-sky-200 bg-sky-50 p-3">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
              <p className="text-sm leading-relaxed text-sky-900">
                Anggaran butuh minimal satu periode fiskal dan satu kategori biaya.
                {categories.length === 0 && (
                  <>
                    {" "}
                    Kategori biaya belum ada —{" "}
                    <Link href="/pengaturan/master-data?tipe=cost_category" className="font-medium underline">
                      buat di Master Data
                    </Link>
                    .
                  </>
                )}
              </p>
            </div>
          )}
        </div>
      )}

      <section className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <h2 className="border-b border-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-800">
          Realisasi vs Anggaran
        </h2>
        {rows.length === 0 ? (
          <EmptyState
            icon={PiggyBank}
            title="Belum ada anggaran"
            description="Susun anggaran di atas. Perbandingan realisasi dihitung otomatis dari pengeluaran yang sudah disetujui — tidak perlu diinput ulang."
          />
        ) : (
          <ResponsiveTable>
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
                  <th className="px-4 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((b) => (
                  <tr
                    key={b.budgetId}
                    className={cn("border-b border-slate-50 last:border-0", b.isOverBudget && "bg-red-50/40")}
                  >
                    <td data-label="Periode" className="px-4 py-2.5 text-slate-600">{b.periodName}</td>
                    <td data-label="Kategori" className="px-4 py-2.5 text-slate-700">{b.costCategoryName}</td>
                    <td data-label="Lingkup" className="px-4 py-2.5">
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
                        {b.scopeType}
                      </span>
                    </td>
                    <td data-label="Anggaran" className="px-4 py-2.5 text-right tabular-nums text-slate-600">
                      {formatIdr(b.budgetIdr)}
                    </td>
                    <td data-label="Realisasi" className="px-4 py-2.5 text-right tabular-nums text-slate-800">
                      {formatIdr(b.actualIdr)}
                    </td>
                    <td
                      data-label="Sisa"
                      className={cn(
                        "px-4 py-2.5 text-right tabular-nums",
                        b.remainingIdr < 0 ? "font-medium text-red-700" : "text-slate-600",
                      )}
                    >
                      {formatIdr(b.remainingIdr)}
                    </td>
                    <td data-label="Serapan" className="px-4 py-2.5 text-right tabular-nums text-slate-700">
                      {formatPct(b.utilisationPct)}
                    </td>
                    <td data-label="Status" className="px-4 py-2.5">
                      {b.isOverBudget ? (
                        <span className="rounded bg-red-50 px-1.5 py-0.5 text-xs font-medium text-red-700">
                          Terlampaui
                        </span>
                      ) : (
                        <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-xs font-medium text-emerald-700">
                          Dalam batas
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ResponsiveTable>
        )}
      </section>

      <p className="mt-3 text-xs leading-relaxed text-slate-500">
        Realisasi dihitung pada tingkat lingkup masing-masing anggaran — anggaran per blok hanya
        dibebani pengeluaran blok itu, anggaran estate hanya blok di dalamnya. Satu baris anggaran
        selalu menghasilkan tepat satu baris perbandingan.
      </p>
    </div>
  );
}
