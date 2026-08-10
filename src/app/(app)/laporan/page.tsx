import Link from "next/link";
import { redirect } from "next/navigation";
import { FileBarChart2, LayoutDashboard, ChevronRight } from "lucide-react";
import { requireContext } from "@/lib/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { REPORTS } from "@/lib/report/registry";

export const metadata = { title: "Laporan — AgroVision" };

/** Indeks Master Laporan: 3 dashboard + 15 laporan modul. */
export default async function LaporanIndex() {
  try {
    await requireContext();
  } catch {
    redirect("/login");
  }
  const groups = ["Dashboard", "Modul"] as const;

  return (
    <div>
      <PageHeader
        title="Laporan"
        subtitle="Master Laporan — 3 dashboard + 15 laporan modul. Klik untuk membuka; tiap laporan bisa diunduh PDF / Excel."
      />
      {groups.map((g) => {
        const items = REPORTS.filter((r) => r.group === g);
        const Icon = g === "Dashboard" ? LayoutDashboard : FileBarChart2;
        return (
          <section key={g} className="mb-6">
            <h2 className="mb-2 text-sm font-semibold text-slate-700">{g === "Dashboard" ? "Dashboard" : "Laporan Modul"}</h2>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((r) => (
                <Link
                  key={r.slug}
                  href={`/laporan/${r.slug}`}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 hover:border-emerald-300 hover:bg-emerald-50/40"
                >
                  <span className={"rounded-lg p-1.5 " + (g === "Dashboard" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600")}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="flex-1 text-sm font-medium text-slate-700">{r.title}</span>
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
