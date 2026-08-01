"use client";

import { useActionState, useState } from "react";
import { Loader2, Pencil, Check, X } from "lucide-react";
import { setPriceRateAction, type PriceState } from "@/lib/actions/pricing";
import { formatIdr } from "@/lib/format";
import { cn } from "@/lib/utils";

const initial: PriceState = { ok: false, message: "" };

export function PriceRateEditor({
  id, rateIdr, unit, canEdit,
}: {
  id: string; rateIdr: number; unit: string; canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(setPriceRateAction, initial);

  if (!canEdit || (state.ok && !editing)) {
    return <span className="tabular-nums text-slate-700">{formatIdr(rateIdr)}<span className="text-xs text-slate-400"> /{unit}</span></span>;
  }

  if (!editing) {
    return (
      <button type="button" onClick={() => setEditing(true)} className="group inline-flex items-center gap-1.5">
        <span className="tabular-nums text-slate-700">{formatIdr(rateIdr)}<span className="text-xs text-slate-400"> /{unit}</span></span>
        <Pencil className="h-3 w-3 text-slate-300 group-hover:text-slate-500" />
      </button>
    );
  }

  return (
    <form action={action} className="flex items-center gap-1.5">
      <input type="hidden" name="id" value={id} />
      <input
        name="rateIdr"
        type="number"
        min="0"
        step="any"
        defaultValue={rateIdr}
        className="w-32 rounded-md border border-slate-200 px-2 py-1 text-sm tabular-nums text-slate-700"
        autoFocus
      />
      <span className="text-xs text-slate-400">/{unit}</span>
      <button type="submit" disabled={pending} className="rounded bg-emerald-700 p-1 text-white hover:bg-emerald-800 disabled:opacity-60">
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
      </button>
      <button type="button" onClick={() => setEditing(false)} className="rounded border border-slate-200 p-1 text-slate-500 hover:bg-slate-50">
        <X className="h-3.5 w-3.5" />
      </button>
      {state.message && <span className={cn("text-xs", state.ok ? "text-emerald-700" : "text-red-600")}>{state.message}</span>}
    </form>
  );
}
