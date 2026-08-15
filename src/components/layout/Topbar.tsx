"use client";

import { Building2, LogOut } from "lucide-react";
import { logoutAction, setLocaleAction, switchCompanyAction } from "@/lib/actions/auth";
import type { CompanyOption } from "@/lib/session";
import { getDict, LOCALES, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";

function initials(name: string): string {
  return name.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
}

/**
 * Semua yang ditampilkan berasal dari sesi nyata. Ditambah toggle bahasa
 * (id/en) di kanan atas — mengganti cookie locale dan me-refresh seluruh app.
 */
export function Topbar({
  fullName,
  email,
  role,
  activeCompanyId,
  companies,
  locale,
}: {
  fullName: string;
  email: string;
  role: string;
  activeCompanyId: string | null;
  companies: CompanyOption[];
  locale: Locale;
}) {
  const d = getDict(locale);
  const multi = companies.length > 1;

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div className="flex items-center gap-3">
        <Building2 className="h-4 w-4 shrink-0 text-emerald-600" />
        {multi ? (
          <form action={switchCompanyAction}>
            <label htmlFor="companyId" className="sr-only">Entitas</label>
            <select
              id="companyId"
              name="companyId"
              defaultValue={activeCompanyId ?? ""}
              onChange={(e) => e.currentTarget.form?.requestSubmit()}
              className="rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/30"
            >
              <option value="">{d("chrome.allEntities")} ({companies.length})</option>
              {companies.map((c) => (
                <option key={c.companyId} value={c.companyId}>{c.companyName}</option>
              ))}
            </select>
          </form>
        ) : (
          <span className="text-sm font-medium text-slate-700">
            {companies[0]?.companyName ?? d("chrome.noEntity")}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <InstallPrompt locale={locale} />
        {/* Toggle bahasa: satu tombol per locale, submit Server Action. */}
        <form action={setLocaleAction} className="flex overflow-hidden rounded-md border border-slate-200">
          {LOCALES.map((l) => (
            <button
              key={l}
              type="submit"
              name="locale"
              value={l}
              aria-pressed={locale === l}
              title={d("chrome.language")}
              className={cn(
                "px-2.5 py-1 text-xs font-semibold uppercase",
                locale === l ? "bg-emerald-700 text-white" : "text-slate-500 hover:bg-slate-50",
              )}
            >
              {l}
            </button>
          ))}
        </form>

        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-700 text-xs font-semibold text-white">
            {initials(fullName)}
          </div>
          <div className="hidden text-sm leading-tight md:block">
            <p className="font-medium text-slate-700">{fullName}</p>
            <p className="text-xs text-slate-400">{d(`role.${role}`)}</p>
          </div>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            title={`${d("chrome.logout")} (${email})`}
            className="flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">{d("chrome.logout")}</span>
          </button>
        </form>
      </div>
    </header>
  );
}
