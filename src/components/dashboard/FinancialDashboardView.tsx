"use client";

import Link from "next/link";
import {
  TrendingUp, ArrowDownRight, Wallet, ClipboardList, Info, BarChart3, LineChart as LineIcon, Sprout, TreePine, CalendarClock,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { DashboardFilterBar, KpiCard, Panel, EmptyPanel, InsightTable } from "@/components/dashboard/shared";
import type { FinDashboard, FinKpi } from "@/lib/report/finDashboard";
import { formatIdr, formatIdrShort } from "@/lib/format";

const num = (v: number, d = 0) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: d }).format(v);

const KPI_ICON = { revenue: TrendingUp, expense: ArrowDownRight, profit: Wallet, budget: ClipboardList } as const;
const GRADE_COLOR: Record<string, string> = { "Grade A": "#047857", "Grade B": "#34d399", "Grade C": "#fbbf24", "Grade —": "#94a3b8" };

export function FinancialDashboardView({ data, company }: { data: FinDashboard; company: string }) {
  const gradeKeys = Array.from(new Set(data.revenue.flatMap((r) => r.grades.map((g) => `Grade ${g.grade}`))));
  const revData = data.revenue.map((r) => {
    const o: Record<string, string | number> = { commodity: r.commodity };
    for (const g of r.grades) o[`Grade ${g.grade}`] = g.value;
    return o;
  });
  const faseData = data.budgetFases.map((f) => ({ fase: f.fase, Anggaran: f.anggaran, Realisasi: f.realisasi }));

  return (
    <div className="space-y-4">
      <DashboardFilterBar company={company} />
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard Finansial</h1>
          <p className="text-sm text-slate-500">Refleksi finansial: alokasi anggaran, realisasi/spending, revenue, laba/rugi, forecast.</p>
        </div>
        {data.dataIncomplete && (
          <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700">
            <Info className="h-3.5 w-3.5" /> Data biaya belum lengkap
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {data.kpis.map((k) => <KpiCard key={k.key} icon={KPI_ICON[k.key]} label={k.label} value={k.value} unit={k.unit} note={k.note} tone={k.tone} badge={k.badge} iconTone={iconTone(k)} />)}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Anggaran vs Realisasi per Fase">
          {!data.hasBudget ? (
            <EmptyPanel icon={BarChart3} title="Anggaran belum disusun" desc="Susun anggaran per fase untuk melihat perbandingan Anggaran vs Realisasi."
              action={<Link href="/costing/anggaran" className="mt-1 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100">Buat Anggaran</Link>} />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={faseData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <XAxis dataKey="fase" tick={{ fontSize: 10, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(v: number) => formatIdrShort(v)} width={64} />
                <Tooltip formatter={(v) => formatIdr(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Anggaran" fill="#cbd5e1" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Realisasi" fill="#059669" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>

        <Panel title="Revenue per Komoditas & Grade">
          {revData.length === 0 ? (
            <EmptyPanel icon={BarChart3} title="Belum ada revenue" desc="Revenue muncul dari panen yang disetujui × tarif komoditas & grade." />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart layout="vertical" data={revData} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(v: number) => formatIdrShort(v)} />
                  <YAxis type="category" dataKey="commodity" tick={{ fontSize: 11, fill: "#475569" }} width={60} />
                  <Tooltip formatter={(v) => formatIdr(Number(v))} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {gradeKeys.map((k) => <Bar key={k} dataKey={k} stackId="g" fill={GRADE_COLOR[k] ?? "#94a3b8"} radius={[0, 2, 2, 0]} />)}
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2 border-t border-slate-100 pt-2 text-xs">
                <div><span className="text-slate-400">Total Revenue</span><p className="font-semibold text-emerald-700">{data.totalRevenue === null ? "—" : formatIdr(data.totalRevenue)}</p></div>
                <div><span className="text-slate-400">Total Volume</span><p className="font-semibold text-slate-700">{data.totalVolume === null ? "—" : `${num(data.totalVolume, 2)} ton`}</p></div>
              </div>
            </>
          )}
        </Panel>

        <Panel title="Struktur Biaya">
          <EmptyPanel icon={Info} title="Data biaya belum tersedia" desc="Lengkapi data biaya untuk melihat komposisi struktur biaya (internal/outsource/kontrak)." />
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Panel title="Tren Arus Kas"><EmptyPanel icon={LineIcon} title="Belum tersedia" desc="Lengkapi pemasukan & pengeluaran untuk tren arus kas." /></Panel>
        <Panel title="Biaya per Hektare"><EmptyPanel icon={Sprout} title="Belum tersedia" desc="Butuh data biaya & luas untuk hitung biaya per hektar." /></Panel>
        <Panel title="Biaya per Pohon"><EmptyPanel icon={TreePine} title="Belum tersedia" desc="Butuh data biaya & jumlah pohon per blok." /></Panel>
        <Panel title="Proyeksi (12 Bulan)"><EmptyPanel icon={CalendarClock} title="Belum tersedia" desc="Susun anggaran & lengkapi data untuk proyeksi 12 bulan." /></Panel>
      </div>

      <Panel title="Insight & Rekomendasi (Prioritas)">
        <InsightTable rows={data.insights} />
      </Panel>
    </div>
  );
}

function iconTone(k: FinKpi): "emerald" | "red" | "amber" | "sky" {
  if (k.key === "expense") return "red";
  if (k.key === "budget") return "amber";
  return "emerald";
}
