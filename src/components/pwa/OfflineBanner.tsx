"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { getDict, type Locale } from "@/lib/i18n";

/** Banner tipis saat koneksi terputus. Muncul di atas seluruh app. */
export function OfflineBanner({ locale }: { locale: Locale }) {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  if (!offline) return null;
  const d = getDict(locale);
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-2 bg-amber-500 px-3 py-1.5 text-center text-xs font-medium text-white"
      style={{ paddingTop: "max(0.375rem, env(safe-area-inset-top))" }}
    >
      <WifiOff className="h-3.5 w-3.5 shrink-0" />
      {d("pwa.offline.banner", "Kamu sedang offline — sebagian data mungkin belum terbarui.")}
    </div>
  );
}
