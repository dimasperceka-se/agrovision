import { Download, FileText, FileSpreadsheet, ChevronDown } from "lucide-react";

/**
 * Tombol unduh laporan dengan pilihan format (PDF / Excel). Memakai
 * <details>/<summary> → dropdown tanpa JavaScript klien. Tiap opsi hanya anchor
 * ke route handler (GET) yang men-stream file dengan RLS tetap berlaku.
 */
export function ReportDownload({ base }: { base: string }) {
  return (
    <details className="relative">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100 [&::-webkit-details-marker]:hidden">
        <Download className="h-4 w-4" /> Unduh <ChevronDown className="h-3.5 w-3.5" />
      </summary>
      <div className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
        <a href={`${base}/pdf`} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
          <FileText className="h-4 w-4 text-red-500" /> PDF
        </a>
        <a href={`${base}/excel`} className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
          <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Excel
        </a>
      </div>
    </details>
  );
}
