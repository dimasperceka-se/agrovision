"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Map, Sprout, Shovel, Compass, FlaskConical, Scissors,
  ClipboardList, Cloud, BadgeCheck, GitBranch, Wallet, PiggyBank,
  FileBarChart2, CheckSquare, Database, Users, Leaf, ChevronDown,
  SprayCan, Wheat, Wrench, TreePine, Calculator, TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getDict, type Locale } from "@/lib/i18n";

/**
 * Navigasi mengikuti IA hasil meeting 30-07-2026 (docs/11): regrouping menjadi
 * Dashboard (×3), Pra-Tanam, Block & Map, Aktivitas Kebun, Agri-Input, Field
 * Survey, Keberlanjutan, Akuntansi, Report, Approval (+ Pengaturan).
 *
 * Sifat:
 *   - grup bisa dilipat (accordion) — status per-grup di state klien;
 *   - label & judul grup dari dictionary i18n (bilingual);
 *   - item bertanda ready:false = "coming soon" (tidak bisa diklik).
 */

type Item = { href: string; key: string; icon: typeof LayoutDashboard; ready?: boolean; roles?: string[] };
type Group = { key: string | null; items: Item[] };

const GROUPS: Group[] = [
  {
    key: "nav.group.dashboard",
    items: [
      { href: "/dashboard", key: "nav.dashboard.operational", icon: LayoutDashboard, ready: true },
      { href: "/dashboard/sustainability", key: "nav.dashboard.sustainability", icon: Leaf, ready: true },
      { href: "/dashboard/financial", key: "nav.dashboard.financial", icon: Wallet, ready: true },
    ],
  },
  {
    key: "nav.group.prefarming",
    items: [
      { href: "/operasional/kesesuaian-lahan", key: "nav.suitability", icon: Compass, ready: true },
      { href: "/operasional/persiapan-lahan", key: "nav.landprep", icon: Shovel, ready: true },
      { href: "/nursery", key: "nav.nursery", icon: Sprout, ready: true },
    ],
  },
  {
    key: "nav.group.activities",
    items: [
      { href: "/aktivitas/weeding", key: "nav.weeding", icon: Sprout, ready: true },
      { href: "/operasional/pemupukan", key: "nav.fertilizer", icon: FlaskConical, ready: true },
      { href: "/operasional/pruning", key: "nav.pruning", icon: Scissors, ready: true },
      { href: "/aktivitas/spraying", key: "nav.spraying", icon: SprayCan, ready: true },
      { href: "/aktivitas/panen", key: "nav.harvesting", icon: Wheat, ready: true },
    ],
  },
  {
    key: "nav.group.agriinput",
    items: [
      { href: "/agri-input/chemical", key: "nav.chemical", icon: FlaskConical, ready: true },
      { href: "/agri-input/equipment", key: "nav.equipment", icon: Wrench, ready: true },
    ],
  },
  {
    key: "nav.group.sustainability",
    items: [
      { href: "/keberlanjutan/karbon", key: "nav.carbon", icon: Cloud, ready: true },
      { href: "/keberlanjutan/sertifikasi", key: "nav.certification", icon: BadgeCheck, ready: true },
      { href: "/keberlanjutan/traceability", key: "nav.traceability", icon: GitBranch, ready: true },
      { href: "/keberlanjutan/deforestation", key: "nav.deforestation", icon: TreePine, ready: false },
    ],
  },
  {
    key: "nav.group.accounting",
    items: [
      { href: "/costing/refleksi", key: "nav.reflection", icon: Calculator, ready: true },
      { href: "/costing/pengeluaran", key: "nav.expenditure", icon: Wallet, ready: true },
      { href: "/costing/pendapatan", key: "nav.revenue", icon: TrendingUp, ready: true },
      { href: "/costing/anggaran", key: "nav.budget", icon: PiggyBank, ready: true },
    ],
  },
  {
    key: "nav.group.report",
    items: [
      { href: "/laporan/operasional", key: "nav.report.operational", icon: FileBarChart2, ready: true },
      { href: "/laporan/keuangan", key: "nav.report.financial", icon: FileBarChart2, ready: true },
      { href: "/laporan/keberlanjutan", key: "nav.report.sustainability", icon: FileBarChart2, ready: true },
      { href: "/laporan", key: "nav.report.all", icon: FileBarChart2, ready: true },
    ],
  },
  {
    key: "nav.group.settings",
    items: [
      { href: "/pengaturan/master-data", key: "nav.masterdata", icon: Database, ready: true },
      { href: "/pengguna", key: "nav.users", icon: Users, ready: true },
    ],
  },
  // Dipindah ke paling bawah (docs/11 refinement) agar nav lebih rapih.
  { key: null, items: [{ href: "/operasional/blok", key: "nav.blocks", icon: Map, ready: true }] },
  { key: null, items: [{ href: "/survei", key: "nav.survey", icon: ClipboardList, ready: true }] },
  { key: null, items: [{ href: "/approval", key: "nav.approval.inbox", icon: CheckSquare, ready: true }] },
];

export function Sidebar({ role, locale }: { role: string; locale: Locale }) {
  const pathname = usePathname();
  const d = getDict(locale);

  // Item aktif = href PALING SPESIFIK yang cocok, supaya /dashboard tidak ikut
  // aktif saat berada di /dashboard/sustainability.
  const activeHref = GROUPS.flatMap((g) => g.items.map((i) => i.href))
    .filter((h) => pathname === h || pathname.startsWith(`${h}/`))
    .sort((a, b) => b.length - a.length)[0];

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggle = (k: string) => setCollapsed((s) => ({ ...s, [k]: !s[k] }));

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center gap-2 px-5 py-4">
        <div className="rounded-lg bg-emerald-700 p-1.5">
          <Leaf className="h-5 w-5 text-white" />
        </div>
        <span className="text-base font-bold text-slate-800">AgroVision</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {GROUPS.map((group, gi) => {
          const items = group.items.filter((i) => !i.roles || i.roles.includes(role));
          if (items.length === 0) return null;
          // Grup dengan halaman aktif tak boleh disembunyikan; selain itu ikuti state.
          const hasActive = items.some((i) => i.href === activeHref);
          const isOpen = !group.key || hasActive || !collapsed[group.key];

          return (
            <div key={group.key ?? `standalone-${gi}`} className="mb-2">
              {group.key && (
                <button
                  type="button"
                  onClick={() => toggle(group.key!)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between rounded-md px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400 hover:text-slate-600"
                >
                  <span>{d(group.key)}</span>
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", !isOpen && "-rotate-90")} />
                </button>
              )}
              {isOpen && (
                <ul className="space-y-0.5">
                  {items.map((item) => {
                    const Icon = item.icon;
                    const active = item.href === activeHref;
                    const label = d(item.key);
                    if (!item.ready) {
                      return (
                        <li key={item.href}>
                          <span
                            aria-disabled="true"
                            title={d("chrome.stubHint")}
                            className="flex cursor-not-allowed items-center justify-between rounded-md px-3 py-2 text-sm text-slate-300"
                          >
                            <span className="flex items-center gap-2.5"><Icon className="h-4 w-4" />{label}</span>
                            <span className="rounded bg-slate-100 px-1.5 text-[10px] font-semibold uppercase text-slate-400">{d("chrome.stub")}</span>
                          </span>
                        </li>
                      );
                    }
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                            active ? "bg-emerald-50 text-emerald-700" : "text-slate-600 hover:bg-slate-50",
                          )}
                        >
                          <Icon className="h-4 w-4" />{label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-slate-100 px-4 py-3 text-[11px] leading-relaxed text-slate-400">
        {d("chrome.footer")}<br />{d("chrome.footerStub")}
      </div>
    </aside>
  );
}
