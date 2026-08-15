import type { Metadata } from "next";
import { Leaf, WifiOff } from "lucide-react";
import { getLocale } from "@/lib/i18n-server";
import { getDict } from "@/lib/i18n";
import { RetryButton } from "@/components/pwa/RetryButton";

export const metadata: Metadata = { title: "Offline — AgroVision" };

/** Fallback saat navigasi gagal karena offline (disajikan dari cache service worker). */
export default async function OfflinePage() {
  const locale = await getLocale();
  const d = getDict(locale);
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-slate-50 p-6 text-center">
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-white">
        <Leaf className="h-7 w-7" />
      </span>
      <div className="flex items-center gap-2 text-amber-600">
        <WifiOff className="h-5 w-5" />
        <span className="text-sm font-semibold">{d("pwa.offline.title", "Kamu sedang offline")}</span>
      </div>
      <p className="max-w-sm text-sm text-slate-500">
        {d("pwa.offline.desc", "Koneksi internet terputus. Halaman ini butuh koneksi untuk memuat data terbaru. Coba lagi setelah kembali online.")}
      </p>
      <RetryButton label={d("pwa.offline.retry", "Coba lagi")} />
    </main>
  );
}
