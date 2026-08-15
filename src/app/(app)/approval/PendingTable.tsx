"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import type { PendingItem } from "@/lib/repo/costing";
import { RecordStatusBadge } from "@/components/ui/RecordStatusBadge";
import { ResponsiveTable } from "@/components/ui/ResponsiveTable";
import { formatDate, formatIdr, formatNumber, EMPTY } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DecisionForm } from "./DecisionForm";

const COLSPAN_BASE = 7; // Modul, Tanggal, Blok, Detail, Nilai, Pengaju, Status

/**
 * Tabel Inbox Approval dengan baris yang bisa DIKLIK → menampilkan nilai tiap
 * parameter record (params dari view). Kolom Nilai = rupiah TER-REFLEKSI
 * (panen = pendapatan, aktivitas = biaya; observasi tetap "—").
 */
export function PendingTable({ rows, canDecide }: { rows: PendingItem[]; canDecide: boolean }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const colSpan = COLSPAN_BASE + (canDecide ? 1 : 0);

  return (
    <ResponsiveTable>
      <table className="w-full text-sm">
        <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
          <tr>
            <th className="px-4 py-2.5 font-medium">Modul</th>
            <th className="px-4 py-2.5 font-medium">Tanggal</th>
            <th className="px-4 py-2.5 font-medium">Blok</th>
            <th className="px-4 py-2.5 font-medium">Detail</th>
            <th className="px-4 py-2.5 text-right font-medium">Nilai</th>
            <th className="px-4 py-2.5 font-medium">Pengaju</th>
            <th className="px-4 py-2.5 font-medium">Status</th>
            {canDecide && <th className="px-4 py-2.5 font-medium">Keputusan</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const key = `${r.moduleKey}:${r.recordId}`;
            const open = openId === key;
            const isRevenue = r.moduleKey === "harvest_record";
            const paramEntries = Object.entries(r.params ?? {}).filter(([, v]) => v !== null && v !== "");
            return (
              <Rows key={key}>
                <tr
                  onClick={() => setOpenId(open ? null : key)}
                  className={cn("cursor-pointer border-b border-slate-50 align-top hover:bg-slate-50/70", open && "bg-emerald-50/40")}
                >
                  <td data-label="Modul" className="px-4 py-3">
                    <span className="inline-flex items-center gap-1">
                      {open ? <ChevronDown className="h-3.5 w-3.5 text-emerald-600" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">{r.moduleLabel}</span>
                    </span>
                  </td>
                  <td data-label="Tanggal" className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDate(r.eventDate)}</td>
                  <td data-label="Blok" data-empty={!r.blockCode} className="px-4 py-3 font-mono text-xs text-slate-600">
                    {r.blockCode ?? <span className="font-sans text-slate-400">—</span>}
                  </td>
                  <td data-label="Detail" data-empty={!r.detail} className="max-w-[240px] px-4 py-3 text-slate-700">{r.detail ?? EMPTY}</td>
                  <td data-label="Nilai" data-empty={r.amountIdr === null} className={cn("whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums", isRevenue ? "text-emerald-700" : "text-slate-800")}>
                    {r.amountIdr === null ? <span className="text-slate-300">{EMPTY}</span> : (
                      <span title={isRevenue ? "Pendapatan (refleksi)" : "Biaya (refleksi)"}>
                        {isRevenue ? "+" : ""}{formatIdr(r.amountIdr)}
                      </span>
                    )}
                  </td>
                  <td data-label="Pengaju" className="px-4 py-3 text-slate-500">{r.actorName ?? EMPTY}</td>
                  <td data-label="Status" className="px-4 py-3"><RecordStatusBadge status={r.approvalStatus} /></td>
                  {canDecide && (
                    <td data-action className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <DecisionForm moduleKey={r.moduleKey} id={r.recordId} />
                    </td>
                  )}
                </tr>

                {open && (
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <td colSpan={colSpan} className="px-4 py-3">
                      <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-slate-400">
                        Nilai tiap parameter — {r.moduleLabel}
                      </p>
                      {paramEntries.length === 0 ? (
                        <p className="text-xs text-slate-400">Tidak ada parameter tambahan.</p>
                      ) : (
                        <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs sm:grid-cols-3 lg:grid-cols-4">
                          {paramEntries.map(([k, v]) => (
                            <div key={k} className="flex items-baseline justify-between gap-2 border-b border-slate-100 pb-1">
                              <dt className="text-slate-500">{k}</dt>
                              <dd className="text-right font-medium tabular-nums text-slate-800">
                                {typeof v === "number" ? formatNumber(v) : String(v)}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      )}
                      {r.amountIdr !== null && (
                        <p className="mt-2 text-xs text-slate-500">
                          {isRevenue ? "Pendapatan" : "Biaya"} ter-refleksi:{" "}
                          <span className={cn("font-semibold", isRevenue ? "text-emerald-700" : "text-slate-800")}>{formatIdr(r.amountIdr)}</span>
                          <span className="text-slate-400"> — volume × tarif price list</span>
                        </p>
                      )}
                    </td>
                  </tr>
                )}
              </Rows>
            );
          })}
        </tbody>
      </table>
    </ResponsiveTable>
  );
}

function Rows({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
