"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { getDict, type Locale } from "@/lib/i18n";

/** Event beforeinstallprompt (Chromium) — tidak ada di Safari iOS. */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * Tombol "Pasang App" (A2HS). Chromium: pakai beforeinstallprompt. iOS Safari:
 * event itu tak menyala → tampilkan instruksi manual. Sembunyi bila sudah terpasang.
 */
export function InstallPrompt({ locale }: { locale: Locale }) {
  const d = getDict(locale);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [standalone, setStandalone] = useState(true); // asumsikan terpasang → sembunyi sampai terbukti belum
  const [showIOS, setShowIOS] = useState(false);

  useEffect(() => {
    const nav = navigator as Navigator & { standalone?: boolean };
    const detect = () => {
      setIsIOS(/iPad|iPhone|iPod/.test(nav.userAgent));
      setStandalone(window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true);
    };
    detect();
    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBIP);
    return () => window.removeEventListener("beforeinstallprompt", onBIP);
  }, []);

  if (standalone) return null;
  if (!deferred && !isIOS) return null; // browser tak mendukung / belum siap

  async function install() {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
    } else {
      setShowIOS(true);
    }
  }

  return (
    <>
      <button
        onClick={install}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
      >
        <Download className="h-3.5 w-3.5" /> {d("pwa.install.button", "Pasang App")}
      </button>

      {showIOS && (
        <div
          className="fixed inset-0 z-[110] flex items-end justify-center bg-black/40 p-4 sm:items-center"
          onClick={() => setShowIOS(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="agv-pop w-full max-w-sm rounded-xl bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-start justify-between">
              <h3 className="text-sm font-semibold text-slate-800">{d("pwa.install.iosTitle", "Pasang di iPhone / iPad")}</h3>
              <button onClick={() => setShowIOS(false)} aria-label={d("common.close", "Tutup")} className="rounded p-1 hover:bg-slate-100">
                <X className="h-4 w-4 text-slate-500" />
              </button>
            </div>
            <ol className="space-y-2 text-xs text-slate-600">
              <li className="flex items-center gap-2"><Share className="h-4 w-4 shrink-0 text-sky-600" /> {d("pwa.install.ios1", "Ketuk tombol Bagikan di Safari.")}</li>
              <li className="flex items-center gap-2"><span className="shrink-0 text-emerald-600">＋</span> {d("pwa.install.ios2", "Pilih “Tambahkan ke Layar Utama”.")}</li>
              <li>{d("pwa.install.ios3", "Ketuk “Tambah” — AgroVision akan muncul sebagai aplikasi.")}</li>
            </ol>
          </div>
        </div>
      )}
    </>
  );
}
