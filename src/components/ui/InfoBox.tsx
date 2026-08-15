"use client";

import { useEffect, useRef, useState } from "react";
import { Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Ikon info yang membuka infobox mengambang saat diklik.
 *
 * Dipakai untuk catatan metodologis yang penting tapi tidak perlu memenuhi
 * layar — misalnya sumber kriteria & batasan interpretasi. Klik di luar atau
 * tombol tutup untuk menutup; Escape juga menutup.
 */
export function InfoBox({
  title,
  children,
  label = "Informasi",
}: {
  title: string;
  children: React.ReactNode;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={label}
        aria-expanded={open}
        className={cn(
          "flex h-6 w-6 items-center justify-center rounded-full transition-colors",
          open ? "bg-sky-100 text-sky-700" : "text-slate-500 hover:bg-slate-100 hover:text-sky-600",
        )}
      >
        <Info className="h-4 w-4" />
      </button>

      {open && (
        <div
          role="dialog"
          className="absolute left-0 top-8 z-30 w-[min(92vw,26rem)] rounded-xl border border-slate-200 bg-white p-4 text-left shadow-xl shadow-slate-900/10"
        >
          <div className="mb-2 flex items-start justify-between gap-3">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
              <Info className="h-4 w-4 text-sky-600" />
              {title}
            </h3>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Tutup"
              className="rounded p-0.5 text-slate-500 hover:bg-slate-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-2 text-sm leading-relaxed text-slate-600">{children}</div>
        </div>
      )}
    </div>
  );
}
