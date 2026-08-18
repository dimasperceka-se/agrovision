import Link from "next/link";
import { redirect } from "next/navigation";
import { Leaf, ArrowLeft, TriangleAlert } from "lucide-react";
import { getSession } from "@/lib/session";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Masuk — AgroVision" };

export default async function LoginPage() {
  // Sudah login: langsung ke dashboard.
  if (await getSession()) redirect("/dashboard");

  return (
    <div
      className="flex min-h-[100dvh] items-center justify-center px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-12"
      style={{
        backgroundImage:
          "radial-gradient(circle at 20% 20%, #dbeadd 0, transparent 40%), radial-gradient(circle at 80% 80%, #cfe3d2 0, transparent 45%), linear-gradient(135deg, #f7f6f2 0%, #eef6ef 100%)",
      }}
    >
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="mb-6 flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-emerald-700"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali
        </Link>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-emerald-900/5 sm:p-8">
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="rounded-xl bg-emerald-700 p-2.5">
              <Leaf className="h-6 w-6 text-white" />
            </div>
            <h1 className="mt-3 text-lg font-bold text-slate-800">Masuk ke AgroVision</h1>
            <p className="mt-1 text-sm text-slate-500">Platform Manajemen Agroforestry</p>
          </div>

          <LoginForm />

          {/* Peringatan ini WAJIB tetap ada sampai verifikasi ID token terpasang.
              Menghapusnya membuat pengguna menyangka autentikasinya sudah aman. */}
          <div className="mt-6 flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p className="text-xs leading-relaxed text-amber-800">
              <strong>Mode pengembangan.</strong> Login belum memverifikasi kredensial — cukup email
              terdaftar. Integrasi Identity Platform belum terpasang. Jangan gunakan untuk data
              sungguhan.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
