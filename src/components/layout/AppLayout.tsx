import { redirect } from "next/navigation";
import { getSession, getSessionCompanies } from "@/lib/session";
import { getLocale } from "@/lib/i18n-server";
import { AppShell } from "./AppShell";

/**
 * Shell aplikasi. Server Component supaya sesi diambil di server dan menjadi
 * satu-satunya sumber identitas yang ditampilkan. Ini juga gerbang autentikasi
 * untuk seluruh grup (app): tanpa sesi, langsung dialihkan ke /login.
 *
 * Komposisi interaktif (drawer mobile, dropdown akun, bottom nav) berada di
 * AppShell (Client Component) yang menerima data sesi dari sini.
 */
export async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const companies = await getSessionCompanies(session.userId);
  const locale = await getLocale();

  return (
    <AppShell
      role={session.role}
      locale={locale}
      fullName={session.fullName}
      email={session.email}
      activeCompanyId={session.companyId}
      companies={companies}
    >
      {children}
    </AppShell>
  );
}
