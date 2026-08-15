import { cn } from "@/lib/utils";

/**
 * Skeleton loading — kerangka abu-abu yang MENIRU bentuk konten asli, supaya
 * tata letak tidak melompat saat data tiba (menghindari layout shift).
 * Denyutnya otomatis mati bila pengguna mengaktifkan prefers-reduced-motion
 * (lihat globals.css).
 */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("agv-skeleton", className)} />;
}

/** Kerangka satu kartu KPI (mengikuti KpiCard: ikon, label, angka besar). */
export function SkeletonKpi() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <Skeleton className="h-10 w-10 rounded-lg" />
      <Skeleton className="mt-3 h-3 w-24" />
      <Skeleton className="mt-2 h-7 w-28" />
    </div>
  );
}

/**
 * Kerangka tabel: baris-baris di desktop, kartu di mobile — mengikuti bentuk
 * ResponsiveTable supaya peralihannya tidak menggeser apa pun.
 */
export function SkeletonTable({ rows = 6 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="hidden border-b border-slate-100 bg-slate-50 px-4 py-2.5 md:block">
        <Skeleton className="h-3 w-40" />
      </div>
      <div className="divide-y divide-slate-50">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <Skeleton className="h-3 w-20 shrink-0" />
            <Skeleton className="h-3 flex-1" />
            <Skeleton className="hidden h-3 w-24 md:block" />
            <Skeleton className="hidden h-5 w-16 rounded-full md:block" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Kerangka halaman standar: judul + baris KPI + tabel. */
export function SkeletonPage({ kpis = 4, rows = 6 }: { kpis?: number; rows?: number }) {
  return (
    <div className="space-y-4" role="status" aria-label="Memuat halaman">
      <div>
        <Skeleton className="h-6 w-56" />
        <Skeleton className="mt-2 h-3 w-72" />
      </div>
      {kpis > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: kpis }).map((_, i) => <SkeletonKpi key={i} />)}
        </div>
      )}
      <SkeletonTable rows={rows} />
      <span className="sr-only">Memuat…</span>
    </div>
  );
}
