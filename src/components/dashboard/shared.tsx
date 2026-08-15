import type { LucideIcon } from "lucide-react";
import { Building2, CalendarDays, Tag, Leaf, ChevronDown, Bell } from "lucide-react";
import { ResponsiveTable } from "@/components/ui/ResponsiveTable";
import { cn } from "@/lib/utils";

/** Filter bar atas (presentational) sesuai mockup — dipakai semua dashboard. */
export function DashboardFilterBar({ company }: { company: string }) {
  const chip = (Icon: LucideIcon, label: string, value: string) => (
    <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm">
      <Icon className="h-4 w-4 text-slate-400" />
      <div className="leading-tight">
        <span className="block text-[10px] uppercase tracking-wide text-slate-400">{label}</span>
        <span className="font-medium text-slate-700">{value}</span>
      </div>
      <ChevronDown className="h-3.5 w-3.5 text-slate-300" />
    </div>
  );
  return (
    <div className="flex flex-wrap items-center gap-2">
      {chip(Building2, "Estate", company)}
      {chip(CalendarDays, "Periode", "Semua periode")}
      {chip(Tag, "Blok", "Semua blok")}
      {chip(Leaf, "Komoditas", "Kelapa & Durian")}
      <span className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-400" title="Notifikasi">
        <Bell className="h-4 w-4" />
      </span>
    </div>
  );
}

/** KPI card: ikon bulat + angka besar + catatan. */
export function KpiCard({ icon: Icon, label, value, unit, note, tone = "default", badge, iconTone = "emerald" }: {
  icon: LucideIcon; label: string; value: string; unit?: string; note?: string;
  tone?: "default" | "pos" | "neg"; badge?: { text: string; tone: "warn" | "ok" }; iconTone?: "emerald" | "red" | "amber" | "sky";
}) {
  const empty = value === "—";
  const iconCls = {
    emerald: "bg-emerald-50 text-emerald-600", red: "bg-red-50 text-red-500",
    amber: "bg-amber-50 text-amber-600", sky: "bg-sky-50 text-sky-600",
  }[iconTone];
  const valueCls = empty ? "text-slate-300" : tone === "neg" ? "text-red-700" : tone === "pos" ? "text-emerald-700" : "text-slate-800";
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <span className={cn("rounded-full p-2.5", iconCls)}><Icon className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-slate-500">{label}</p>
          <p className={cn("mt-0.5 text-2xl font-bold tabular-nums", valueCls)}>
            {value}{!empty && unit ? <span className="ml-1 text-sm font-semibold text-slate-400">{unit}</span> : null}
          </p>
        </div>
      </div>
      {(note || badge) && (
        <div className="mt-2 flex items-center gap-2">
          {badge && <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-medium", badge.tone === "warn" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700")}>{badge.text}</span>}
          {note && <p className="text-xs text-slate-400">{note}</p>}
        </div>
      )}
    </div>
  );
}

/** Panel bertajuk. */
export function Panel({ title, right, children, className }: { title: string; right?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("overflow-hidden rounded-xl border border-slate-200 bg-white", className)}>
      <div className="flex items-center justify-between px-4 py-2.5">
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
        {right}
      </div>
      <div className="px-4 pb-4">{children}</div>
    </section>
  );
}

/** Empty-state di dalam panel. */
export function EmptyPanel({ icon: Icon, title, desc, action }: { icon: LucideIcon; title: string; desc: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
      <span className="rounded-full bg-slate-100 p-3 text-slate-300"><Icon className="h-6 w-6" /></span>
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="max-w-xs text-xs leading-relaxed text-slate-400">{desc}</p>
      {action}
    </div>
  );
}

export type InsightRow = { area: string; temuan: string; rekomendasi: string; dampak: string; status: string };

/** Tabel Insight & Rekomendasi (Prioritas ber-badge angka). */
export function InsightTable({ rows }: { rows: InsightRow[] }) {
  const rankColor = ["#dc2626", "#f59e0b", "#eab308", "#059669", "#64748b"];
  return (
    <ResponsiveTable>
      <table className="w-full text-sm">
        <thead className="border-b border-slate-100 text-left text-xs text-slate-500">
          <tr>
            <th className="px-3 py-2 font-medium">Prioritas</th>
            <th className="px-3 py-2 font-medium">Area</th>
            <th className="px-3 py-2 font-medium">Temuan</th>
            <th className="px-3 py-2 font-medium">Rekomendasi</th>
            <th className="px-3 py-2 font-medium">Dampak</th>
            <th className="px-3 py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-slate-50 align-top last:border-0">
              <td data-label="Prioritas" className="px-3 py-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded text-xs font-bold text-white" style={{ backgroundColor: rankColor[Math.min(i, 4)] }}>{i + 1}</span>
              </td>
              <td data-label="Area" className="px-3 py-2 font-medium text-slate-700">{r.area}</td>
              <td data-label="Temuan" className="max-w-[260px] px-3 py-2 text-slate-600">{r.temuan}</td>
              <td data-label="Rekomendasi" className="max-w-[260px] px-3 py-2 text-slate-600">{r.rekomendasi}</td>
              <td data-label="Dampak" className="px-3 py-2 text-xs text-slate-500">↓ {r.dampak}</td>
              <td data-label="Status" className="px-3 py-2"><span className="whitespace-nowrap rounded bg-red-50 px-1.5 py-0.5 text-[11px] font-medium text-red-600">{r.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </ResponsiveTable>
  );
}
