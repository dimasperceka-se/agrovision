import { redirect } from "next/navigation";
import { getSession, getSessionCompanies } from "@/lib/session";
import { getLocale } from "@/lib/i18n-server";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

/**
 * Shell aplikasi. Server Component supaya sesi diambil di server dan menjadi
 * satu-satunya sumber identitas yang ditampilkan.
 *
 * Ini juga gerbang autentikasi untuk seluruh grup (app): tanpa sesi, langsung
 * dialihkan ke /login.
 */
export async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const companies = await getSessionCompanies(session.userId);
  const locale = await getLocale();

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar role={session.role} locale={locale} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar
          fullName={session.fullName}
          email={session.email}
          role={session.role}
          activeCompanyId={session.companyId}
          companies={companies}
          locale={locale}
        />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
