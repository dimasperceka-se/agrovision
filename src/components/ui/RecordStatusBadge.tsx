import { cn } from "@/lib/utils";

/**
 * Badge status untuk state machine approval (migrasi 0014):
 *   draft -> submitted -> under_review -> approved | rejected
 *
 * Dikunci ke nilai enum app.record_status. Status yang tidak dikenal
 * ditampilkan mentah, bukan disembunyikan -- supaya ketidaksesuaian enum
 * terlihat, bukan tertelan.
 */

const STYLE: Record<string, { label: string; cls: string }> = {
  draft: { label: "Draft", cls: "bg-slate-100 text-slate-600" },
  submitted: { label: "Diajukan", cls: "bg-sky-50 text-sky-700" },
  under_review: { label: "Direview", cls: "bg-amber-50 text-amber-700" },
  approved: { label: "Disetujui", cls: "bg-emerald-50 text-emerald-700" },
  rejected: { label: "Ditolak", cls: "bg-red-50 text-red-700" },
  cancelled: { label: "Dibatalkan", cls: "bg-slate-100 text-slate-400" },
};

export function RecordStatusBadge({ status }: { status: string }) {
  const s = STYLE[status];
  return (
    <span
      className={cn(
        "inline-block whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-medium",
        s?.cls ?? "bg-fuchsia-50 text-fuchsia-700",
      )}
      title={s ? undefined : `Status tidak dikenal: ${status}`}
    >
      {s?.label ?? status}
    </span>
  );
}
