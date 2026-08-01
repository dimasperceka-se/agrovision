"use client";

import { useActionState, useState } from "react";
import { Loader2, Pencil, Save, CircleCheck } from "lucide-react";
import { setOrganicStatusAction, type OrganicState } from "@/lib/actions/organic";
import type { OrganicItem } from "@/lib/repo/sustainability";
import { cn } from "@/lib/utils";

export const ORGANIC_STATUS: Record<string, { label: string; cls: string }> = {
  belum_mulai:    { label: "Belum mulai",   cls: "bg-slate-100 text-slate-500" },
  dalam_proses:   { label: "Dalam proses",  cls: "bg-sky-50 text-sky-700" },
  in_conversion:  { label: "Masa konversi", cls: "bg-amber-50 text-amber-700" },
  tersertifikasi: { label: "Tersertifikasi", cls: "bg-emerald-50 text-emerald-700" },
  tidak_relevan:  { label: "Tidak relevan", cls: "bg-slate-50 text-slate-400" },
};
const STATUS_ORDER = ["belum_mulai", "dalam_proses", "in_conversion", "tersertifikasi", "tidak_relevan"];
const initial: OrganicState = { ok: false, message: "" };

export function OrganicTracker({
  items, variant, canEdit,
}: {
  items: OrganicItem[];
  variant: "standard" | "evidence";
  canEdit: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
          <tr>
            <th className="px-4 py-2 font-medium">{variant === "standard" ? "Standar" : "Bukti"}</th>
            <th className="px-3 py-2 font-medium">{variant === "standard" ? "Pasar / penerbit" : "Catatan"}</th>
            <th className="px-3 py-2 font-medium">Status</th>
            {canEdit && <th className="px-3 py-2" />}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => <Row key={item.code} item={item} variant={variant} canEdit={canEdit} />)}
        </tbody>
      </table>
    </div>
  );
}

function Row({ item, variant, canEdit }: { item: OrganicItem; variant: "standard" | "evidence"; canEdit: boolean }) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(setOrganicStatusAction, initial);
  const meta = ORGANIC_STATUS[item.status] ?? ORGANIC_STATUS.belum_mulai;

  return (
    <>
      <tr className="border-b border-slate-50 last:border-0 align-top">
        <td className="px-4 py-2">
          <div className="flex items-start gap-1.5">
            <span className="font-mono text-xs text-slate-400">{item.code}</span>
          </div>
          <div className="text-slate-700">{item.name}</div>
          {variant === "standard" && item.detail && (
            <div className="mt-0.5 text-[11px] text-slate-400">{item.detail}</div>
          )}
        </td>
        <td className="px-3 py-2 text-xs text-slate-500">
          {variant === "standard" ? (
            <>
              {item.market && <div className="font-medium text-slate-600">{item.market}</div>}
              {item.issuer && <div>{item.issuer}</div>}
            </>
          ) : (
            item.detail ?? "—"
          )}
        </td>
        <td className="px-3 py-2">
          <span className={cn("rounded px-1.5 py-0.5 text-xs font-medium", meta.cls)}>{meta.label}</span>
          {item.referenceNo && <div className="mt-0.5 font-mono text-[11px] text-slate-400">{item.referenceNo}</div>}
          {item.expiresOn && <div className="mt-0.5 text-[11px] text-slate-400">exp. {item.expiresOn}</div>}
        </td>
        {canEdit && (
          <td className="px-3 py-2 text-right">
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
          <td colSpan={4} className="px-4 py-3">
            <form action={action} className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="itemCode" value={item.code} />
              <label className="flex flex-col gap-1 text-xs text-slate-500">
                Status
                <select name="status" defaultValue={item.status} className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700">
                  {STATUS_ORDER.map((s) => <option key={s} value={s}>{ORGANIC_STATUS[s].label}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs text-slate-500">
                No. referensi / sertifikat
                <input name="referenceNo" defaultValue={item.referenceNo ?? ""} className="w-48 rounded-md border border-slate-200 px-2 py-1.5 text-sm text-slate-700" />
              </label>
              <label className="flex flex-col gap-1 text-xs text-slate-500">
                Terbit
                <input type="date" name="obtainedOn" defaultValue={item.obtainedOn ?? ""} className="rounded-md border border-slate-200 px-2 py-1.5 text-sm text-slate-700" />
              </label>
              <label className="flex flex-col gap-1 text-xs text-slate-500">
                Berakhir
                <input type="date" name="expiresOn" defaultValue={item.expiresOn ?? ""} className="rounded-md border border-slate-200 px-2 py-1.5 text-sm text-slate-700" />
              </label>
              <label className="flex flex-1 flex-col gap-1 text-xs text-slate-500">
                Catatan
                <input name="note" defaultValue={item.note ?? ""} className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm text-slate-700" />
              </label>
              <button type="submit" disabled={pending} className="flex items-center gap-1.5 rounded-md bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">
                {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : state.ok ? <CircleCheck className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
                Simpan
              </button>
              {state.message && <span className={cn("text-xs", state.ok ? "text-emerald-700" : "text-red-600")}>{state.message}</span>}
            </form>
          </td>
        </tr>
      )}
    </>
  );
}
