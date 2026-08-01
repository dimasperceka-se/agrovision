import Link from "next/link";
import { redirect } from "next/navigation";
import { Wallet, PiggyBank, TrendingUp, Scale, Info } from "lucide-react";
import { requireContext } from "@/lib/session";
import { budgetVsActual, totalApprovedSpend, spendByCategory } from "@/lib/repo/costing";
import { reflectedCosts } from "@/lib/repo/pricing";
import { PageHeader } from "@/components/ui/PageHeader";
import { getLocale } from "@/lib/i18n-server";
import { getDict } from "@/lib/i18n";
import { formatIdr, formatIdrShort, formatPct, EMPTY } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata = { title: "Dashboard Keuangan — AgroVision" };

export default async function Page() {
  let ctx;
  try { ctx = await requireContext(); } catch { redirect("/login"); }
  const t = getDict(await getLocale());

  const [budgets, spend, categories, reflection] = await Promise.all([
    budgetVsActual(ctx),
    totalApprovedSpend(ctx),
    spendByCategory(ctx),
    reflectedCosts(ctx),
  ]);

  const allocated = budgets.reduce((a, b) => a + b.budgetIdr, 0);
  const spending = spend ?? 0;
  const hasBudget = budgets.length > 0;
  const overBudget = budgets.filter((b) => b.isOverBudget);
  // Revenue nyata dari panen disetujui × price list (docs/11 §4). Null bila
  // belum ada panen disetujui — jangan mengarang angka.
  const hasRevenue = reflection.revenueLines.length > 0;
  const revenue = hasRevenue ? reflection.totalRevenueIdr : null;
  const balance = revenue === null ? null : revenue - spending;

  // Komponen biaya (induk) dari spendByCategory — dedup per kategori induk.
  const seen = new Set<string>();
  const components = categories
    .filter((c) => (seen.has(c.categoryId) ? false : (seen.add(c.categoryId), true)))
    .map((c) => ({ name: c.categoryName, total: c.categoryTotalIdr, share: c.categorySharePct }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);

  return (
    <div>
      <PageHeader
        title={t("nav.dashboard.financial")}
        subtitle="Refleksi otomatis dari operasional yang disetujui — bukan input manual."
        titleAdornment={<span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">Financial</span>}
      />

      <div className="mb-5 flex items-start gap-2 rounded-md border border-sky-200 bg-sky-50 p-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
        <p className="text-sm leading-relaxed text-sky-900">
          Modul keuangan bersifat <strong>refleksi</strong> (docs/11 §4): angka biaya berasal dari
          submission operasional yang disetujui, bukan form input tersendiri. Revenue &amp; laba/rugi
          masih kosong sampai modul <strong>Panen</strong> dan <em>price list</em> aktif — tidak
          ditampilkan sebagai angka karangan.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={PiggyBank} label="Anggaran dialokasikan" value={hasBudget ? formatIdr(allocated) : EMPTY} href="/costing/anggaran" />
        <Kpi icon={Wallet} label="Pengeluaran (disetujui)" value={spend === null ? EMPTY : formatIdr(spending)} href="/costing/pengeluaran"
          note={overBudget.length > 0 ? `${overBudget.length} anggaran terlampaui` : undefined} highlight={overBudget.length > 0} />
        <Kpi icon={TrendingUp} label="Revenue" value={revenue === null ? EMPTY : formatIdr(revenue)} href="/aktivitas/panen" note={hasRevenue ? "dari panen disetujui" : "menunggu panen disetujui"} />
        <Kpi icon={Scale} label="Laba / rugi" value={balance === null ? EMPTY : formatIdr(balance)} href="/costing/refleksi" note={balance === null ? "butuh revenue" : "revenue − pengeluaran"} />
      </div>

      <section className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <h2 className="border-b border-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-800">Komponen pengeluaran</h2>
        {components.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-slate-400">Belum ada pengeluaran disetujui.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
              <tr><th className="px-4 py-2 font-medium">Komponen</th><th className="px-4 py-2 text-right font-medium">Nilai</th><th className="px-4 py-2 text-right font-medium">Porsi</th></tr>
            </thead>
            <tbody>
              {components.map((c) => (
                <tr key={c.name} className="border-b border-slate-50 last:border-0">
                  <td className="px-4 py-2 text-slate-700">{c.name}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-slate-700">{formatIdrShort(c.total)}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-slate-500">{formatPct(c.share)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <h2 className="border-b border-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-800">Anggaran vs realisasi</h2>
        {budgets.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-slate-400">Belum ada anggaran disusun.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
              <tr><th className="px-4 py-2 font-medium">Kategori</th><th className="px-4 py-2 font-medium">Periode</th><th className="px-4 py-2 text-right font-medium">Anggaran</th><th className="px-4 py-2 text-right font-medium">Realisasi</th><th className="px-4 py-2 text-right font-medium">Serapan</th></tr>
            </thead>
            <tbody>
              {budgets.slice(0, 12).map((b) => (
                <tr key={b.budgetId} className={cn("border-b border-slate-50 last:border-0", b.isOverBudget && "bg-red-50/40")}>
                  <td className="px-4 py-2 text-slate-700">{b.costCategoryName}</td>
                  <td className="px-4 py-2 text-slate-500">{b.periodName}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-slate-700">{formatIdrShort(b.budgetIdr)}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-slate-700">{formatIdrShort(b.actualIdr)}</td>
                  <td className={cn("px-4 py-2 text-right tabular-nums", b.isOverBudget ? "font-semibold text-red-700" : "text-slate-500")}>{formatPct(b.utilisationPct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, href, note, highlight }: {
  icon: typeof Wallet; label: string; value: string; href: string; note?: string; highlight?: boolean;
}) {
  const empty = value === EMPTY;
  return (
    <Link href={href} className={cn("rounded-xl border bg-white p-4 transition-shadow hover:shadow-sm", highlight ? "border-amber-300" : "border-slate-200")}>
      <div className="flex items-center gap-1.5">
        <Icon className={cn("h-4 w-4", highlight ? "text-amber-600" : "text-emerald-600")} />
        <p className="text-xs text-slate-500">{label}</p>
      </div>
      <p className={cn("mt-1.5 text-xl font-bold tabular-nums", empty ? "text-slate-300" : "text-slate-800")}>{value}</p>
      {note && <p className={cn("mt-0.5 text-xs", highlight ? "text-amber-700" : "text-slate-400")}>{note}</p>}
    </Link>
  );
}
