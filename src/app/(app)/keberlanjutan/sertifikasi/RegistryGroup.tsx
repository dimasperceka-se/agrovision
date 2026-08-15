"use client";

import { useActionState, useState } from "react";
import {
  ChevronDown, ChevronRight, Loader2, Pencil, Save, Star, CircleCheck,
} from "lucide-react";
import { setComplianceStatusAction, type ComplianceState } from "@/lib/actions/compliance";
import type { ComplianceItem } from "@/lib/repo/sustainability";
import { ResponsiveTable } from "@/components/ui/ResponsiveTable";
import { cn } from "@/lib/utils";

export const STATUS_META: Record<string, { label: string; cls: string }> = {
  belum_mulai:   { label: "Belum mulai",   cls: "bg-slate-100 text-slate-500" },
  dalam_proses:  { label: "Dalam proses",  cls: "bg-sky-50 text-sky-700" },
  terbit:        { label: "Terbit",        cls: "bg-emerald-50 text-emerald-700" },
  akan_berakhir: { label: "Akan berakhir", cls: "bg-amber-50 text-amber-700" },
  tidak_berlaku: { label: "Tidak berlaku", cls: "bg-red-50 text-red-700" },
  tidak_relevan: { label: "Tidak relevan", cls: "bg-slate-50 text-slate-400" },
};
const STATUS_ORDER = [
  "belum_mulai", "dalam_proses", "terbit", "akan_berakhir", "tidak_berlaku", "tidak_relevan",
];

const initial: ComplianceState = { ok: false, message: "" };

export function RegistryGroup({
  group, canEdit, defaultOpen,
}: {
  group: { code: string; label: string; items: ComplianceItem[]; total: number; issued: number };
  canEdit: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  const prereqPending = group.items.some((i) => i.isPrerequisite && i.status === "belum_mulai");

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50"
      >
        {open ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
        <span className="flex h-6 w-6 items-center justify-center rounded bg-slate-800 text-xs font-bold text-white">
          {group.code}
        </span>
        <span className="flex-1 text-sm font-semibold text-slate-800">{group.label}</span>
        {prereqPending && (
          <span className="rounded bg-red-50 px-1.5 py-0.5 text-xs font-medium text-red-700">
            prasyarat belum lengkap
          </span>
        )}
        <span className="text-xs text-slate-500 tabular-nums">{group.issued}/{group.total} terbit</span>
      </button>

      {open && (
        <ResponsiveTable className="border-t border-slate-100">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Item</th>
                <th className="px-3 py-2 font-medium">Penerbit</th>
                <th className="px-3 py-2 text-center font-medium">K/D</th>
                <th className="px-3 py-2 font-medium">Masa berlaku</th>
                <th className="px-3 py-2 font-medium">Status</th>
                {canEdit && <th className="px-3 py-2" />}
              </tr>
            </thead>
            <tbody>
              {group.items.map((item) => (
                <Row key={item.code} item={item} canEdit={canEdit} />
              ))}
            </tbody>
          </table>
        </ResponsiveTable>
      )}
    </section>
  );
}

function Row({ item, canEdit }: { item: ComplianceItem; canEdit: boolean }) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(setComplianceStatusAction, initial);
  const meta = STATUS_META[item.status] ?? STATUS_META.belum_mulai;

  return (
    <>
      <tr className={cn("border-b border-slate-50 last:border-0", item.isPrerequisite && "bg-amber-50/20")}>
        <td data-label="Item" className="px-4 py-2 align-top">
          <div className="flex items-start gap-1.5">
            <span className="font-mono text-xs text-slate-400">{item.code}</span>
            {item.isPrerequisite && <Star className="mt-0.5 h-3 w-3 shrink-0 fill-amber-400 text-amber-400" />}
          </div>
          <div className="text-slate-700">{item.name}</div>
        </td>
        <td data-label="Penerbit" data-empty={!item.issuer} className="px-3 py-2 align-top text-xs text-slate-500">{item.issuer ?? "—"}</td>
        <td data-label="K/D" data-empty={!item.appliesCoconut && !item.appliesDurian} className="px-3 py-2 align-top text-center">
          <div className="flex justify-center gap-1">
            {item.appliesCoconut && <span className="rounded bg-emerald-50 px-1 text-xs font-medium text-emerald-700">K</span>}
            {item.appliesDurian && <span className="rounded bg-orange-50 px-1 text-xs font-medium text-orange-700">D</span>}
          </div>
        </td>
        <td data-label="Masa berlaku" data-empty={!item.validityNote} className="px-3 py-2 align-top text-xs text-slate-500">{item.validityNote ?? "—"}</td>
        <td data-label="Status" className="px-3 py-2 align-top">
          <span className={cn("rounded px-1.5 py-0.5 text-xs font-medium", meta.cls)}>{meta.label}</span>
          {item.referenceNo && <div className="mt-0.5 font-mono text-[11px] text-slate-400">{item.referenceNo}</div>}
          {item.expiresOn && <div className="mt-0.5 text-[11px] text-slate-400">exp. {item.expiresOn}</div>}
        </td>
        {canEdit && (
          <td data-action className="px-3 py-2 align-top text-right">
            <button
              type="button"
              onClick={() => setEditing((v) => !v)}
              className="inline-flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
            >
              <Pencil className="h-3 w-3" /> Ubah
            </button>
          </td>
        )}
      </tr>
      {editing && canEdit && (
        <tr className="border-b border-slate-100 bg-slate-50/60">
          <td colSpan={6} className="px-4 py-3">
            <form action={action} className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="itemCode" value={item.code} />
              <label className="flex flex-col gap-1 text-xs text-slate-500">
                Status
                <select
                  name="status"
                  defaultValue={item.status}
                  className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700"
                >
                  {STATUS_ORDER.map((s) => (
                    <option key={s} value={s}>{STATUS_META[s].label}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs text-slate-500">
                No. referensi
                <input
                  name="referenceNo"
                  defaultValue={item.referenceNo ?? ""}
                  placeholder="mis. NIB / no. sertifikat"
                  className="w-48 rounded-md border border-slate-200 px-2 py-1.5 text-sm text-slate-700"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-slate-500">
                Terbit
                <input type="date" name="obtainedOn" defaultValue={item.obtainedOn ?? ""}
                  className="rounded-md border border-slate-200 px-2 py-1.5 text-sm text-slate-700" />
              </label>
              <label className="flex flex-col gap-1 text-xs text-slate-500">
                Berakhir
                <input type="date" name="expiresOn" defaultValue={item.expiresOn ?? ""}
                  className="rounded-md border border-slate-200 px-2 py-1.5 text-sm text-slate-700" />
              </label>
              <label className="flex flex-1 flex-col gap-1 text-xs text-slate-500">
                Catatan
                <input name="note" defaultValue={item.note ?? ""}
                  className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm text-slate-700" />
              </label>
              <button
                type="submit"
                disabled={pending}
                className="flex items-center gap-1.5 rounded-md bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
              >
                {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : state.ok ? <CircleCheck className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
                Simpan
              </button>
              {state.message && (
                <span className={cn("text-xs", state.ok ? "text-emerald-700" : "text-red-600")}>{state.message}</span>
              )}
            </form>
          </td>
        </tr>
      )}
    </>
  );
}
