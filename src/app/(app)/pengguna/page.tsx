import { Users, ShieldAlert } from "lucide-react";
import { redirect } from "next/navigation";
import { requireContext } from "@/lib/session";
import { listUsers } from "@/lib/repo/master";
import { PageHeader } from "@/components/ui/PageHeader";
import { getLocale } from "@/lib/i18n-server";
import { getDict } from "@/lib/i18n";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";

export const metadata = { title: "Pengguna & Akses — AgroVision" };

const ROLE = { super_admin: "Super Admin", approver: "Approver", creator: "Petugas Lapangan", viewer: "Pembaca" };

export default async function Page() {
  let ctx;
  try { ctx = await requireContext(); } catch { redirect("/login"); }
  const t = getDict(await getLocale());

  if (!["super_admin", "approver"].includes(ctx.session.role)) {
    return (
      <div>
        <PageHeader title={t("nav.users")} />
        <div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-4">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <p className="text-sm text-amber-900">Peran <strong>{ctx.session.role}</strong> tidak berhak melihat daftar pengguna.</p>
        </div>
      </div>
    );
  }

  const users = await listUsers(ctx);
  return (
    <div>
      <PageHeader title={t("nav.users")} subtitle={t("sub.users")} />
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {users.length === 0 ? (
          <EmptyState icon={Users} title="Belum ada pengguna" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
                <tr><th className="px-4 py-2.5 font-medium">Nama</th><th className="px-4 py-2.5 font-medium">Email</th><th className="px-4 py-2.5 font-medium">Peran</th><th className="px-4 py-2.5 text-right font-medium">Akses estate</th><th className="px-4 py-2.5 font-medium">Status</th></tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-4 py-2.5 text-slate-700">{u.fullName}</td>
                    <td className="px-4 py-2.5 text-slate-500">{u.email}</td>
                    <td className="px-4 py-2.5"><span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">{ROLE[u.role as keyof typeof ROLE] ?? u.role}</span></td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">{u.estateCount === 0 ? "Semua" : u.estateCount}</td>
                    <td className="px-4 py-2.5"><span className={cn("rounded px-1.5 py-0.5 text-xs font-medium", u.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500")}>{u.isActive ? "Aktif" : "Nonaktif"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-slate-400">Peran creator dengan akses estate terbatas hanya melihat blok pada estate tersebut — ditegakkan Row Level Security di database. Undang pengguna & atur akses estate: fase berikutnya (fungsi grant_estate_access sudah siap di DB).</p>
    </div>
  );
}
