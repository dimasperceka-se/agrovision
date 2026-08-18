"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ClipboardList, FileBarChart2, CheckSquare, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { getDict, type Locale } from "@/lib/i18n";

/**
 * Bottom navigation MOBILE (md:hidden) untuk 4 tujuan tersering + tombol Menu
 * yang membuka drawer (navigasi lengkap). Bukan duplikasi membingungkan: bottom
 * nav = pintasan cepat, drawer = seluruh IA.
 */
const ITEMS = [
  { href: "/dashboard", key: "nav.bottom.dashboard", icon: LayoutDashboard },
  { href: "/survei", key: "nav.bottom.survey", icon: ClipboardList },
  { href: "/laporan", key: "nav.bottom.report", icon: FileBarChart2 },
  { href: "/approval", key: "nav.bottom.approval", icon: CheckSquare },
];

export function BottomNav({ locale, onMenu }: { locale: Locale; onMenu: () => void }) {
  const pathname = usePathname();
  const d = getDict(locale);
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav
      aria-label={d("chrome.bottomNav", "Navigasi cepat")}
      className="z-30 flex shrink-0 items-stretch border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {ITEMS.map(({ href, key, icon: Icon }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium",
              active ? "text-brand-600" : "text-slate-500",
            )}
          >
            <Icon className="h-5 w-5" />
            {d(key)}
          </Link>
        );
      })}
      <button
        type="button"
        onClick={onMenu}
        className="flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-slate-500"
      >
        <Menu className="h-5 w-5" />
        {d("nav.bottom.menu", "Menu")}
      </button>
    </nav>
  );
}
