"use client";

import { focusBlock } from "@/components/map/focus";
import { formatHa } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Baris tabel blok yang bisa diklik untuk menyorot polygon-nya di peta.
 * Baris tanpa geometry tidak bisa diklik (tak ada yang bisa disorot).
 */
export function BlockRow({
  id, code, name, estateName, areaHa, plantingYear, hasGeometry,
}: {
  id: string;
  code: string;
  name: string | null;
  estateName: string;
  areaHa: number | null;
  plantingYear: number | null;
  hasGeometry: boolean;
}) {
  return (
    <tr
      onClick={hasGeometry ? () => focusBlock(id) : undefined}
      title={hasGeometry ? "Klik untuk menyorot di peta" : "Blok ini belum punya polygon"}
      className={cn(
        "border-b border-slate-50 last:border-0",
        hasGeometry ? "cursor-pointer hover:bg-emerald-50/50" : "",
      )}
    >
      <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{code}</td>
      <td className="px-4 py-2.5 text-slate-700">{name ?? "—"}</td>
      <td className="px-4 py-2.5 text-slate-500">{estateName}</td>
      <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">{formatHa(areaHa)}</td>
      <td className="px-4 py-2.5 text-right tabular-nums text-slate-500">{plantingYear ?? "—"}</td>
      <td className="px-4 py-2.5">
        {hasGeometry ? (
          <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-xs font-medium text-emerald-700">Ada</span>
        ) : (
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-500">Belum</span>
        )}
      </td>
    </tr>
  );
}
