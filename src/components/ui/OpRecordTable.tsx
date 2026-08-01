import { RecordStatusBadge } from "./RecordStatusBadge";
import { EmptyState } from "./EmptyState";
import { OpSubmitButton } from "./OpSubmitButton";
import { formatDate, EMPTY } from "@/lib/format";
import type { LucideIcon } from "lucide-react";
import type { OpRecord } from "@/lib/repo/operational";

/** Tabel record operasional generik + tombol Ajukan untuk draft/rejected. */
export function OpRecordTable({
  rows,
  moduleKey,
  emptyIcon,
  emptyTitle,
  canWrite,
}: {
  rows: OpRecord[];
  moduleKey: string;
  emptyIcon: LucideIcon;
  emptyTitle: string;
  canWrite: boolean;
}) {
  if (rows.length === 0) {
    return (
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <EmptyState icon={emptyIcon} title={emptyTitle} description="Catat lewat formulir di atas." />
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
            <tr>
              <th className="px-4 py-2.5 font-medium">Tanggal</th>
              <th className="px-4 py-2.5 font-medium">Blok</th>
              <th className="px-4 py-2.5 font-medium">Detail</th>
              <th className="px-4 py-2.5 font-medium">Petugas</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-slate-50 align-top last:border-0">
                <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">{formatDate(r.eventDate)}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{r.blockCode ?? EMPTY}</td>
                <td className="px-4 py-2.5 text-slate-700">{r.detail}</td>
                <td className="px-4 py-2.5 text-slate-500">{r.createdByName ?? EMPTY}</td>
                <td className="px-4 py-2.5">
                  <RecordStatusBadge status={r.approvalStatus} />
                  {r.rejectionReason && (
                    <p className="mt-1 max-w-[220px] text-xs leading-relaxed text-red-600">{r.rejectionReason}</p>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right">
                  {canWrite && (r.approvalStatus === "draft" || r.approvalStatus === "rejected") && (
                    <OpSubmitButton module={moduleKey} id={r.id} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
