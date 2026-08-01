"use client";

import { useActionState } from "react";
import { Check, X, Loader2, CircleAlert } from "lucide-react";
import { decideExpenditureAction, type ActionState } from "@/lib/actions/costing";
import { cn } from "@/lib/utils";

const initial: ActionState = { ok: false, message: "" };

/**
 * Setujui atau tolak.
 *
 * Alasan penolakan wajib (concept:187). Ditegakkan tiga lapis: atribut
 * `required` di HTML, skema zod di Server Action, dan CHECK constraint
 * `ct_rejection_needs_reason` di database. Lapis paling dalam yang menentukan —
 * dua lapis luar hanya membuat pesannya enak dibaca.
 */
export function DecisionForm({ moduleKey, id }: { moduleKey: string; id: string }) {
  const [state, formAction, pending] = useActionState(decideExpenditureAction, initial);

  if (state.ok) {
    return (
      <p className="flex items-center gap-1 text-xs font-medium text-emerald-700">
        <Check className="h-3.5 w-3.5" />
        {state.message}
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      {state.message && !state.ok && (
        <p className="flex items-start gap-1 text-xs leading-tight text-red-600">
          <CircleAlert className="mt-0.5 h-3 w-3 shrink-0" />
          {state.message}
        </p>
      )}

      <div className="flex items-center gap-1.5">
        <form action={formAction}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="decision" value="approved" />
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-100 disabled:opacity-60"
          >
            {pending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            Setujui
          </button>
        </form>

        {/* <details> native: input alasan ADA di HTML sejak render pertama,
            jadi penolakan tetap bisa dilakukan tanpa JavaScript. */}
        <details className="group">
          <summary className="inline-flex cursor-pointer items-center gap-1 whitespace-nowrap rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
            <X className="h-3.5 w-3.5" />
            Tolak
          </summary>
          <form action={formAction} className="mt-1.5 space-y-1.5">
            <input type="hidden" name="moduleKey" value={moduleKey} />
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="decision" value="rejected" />
            <label htmlFor={`reason-${id}`} className="sr-only">
              Alasan penolakan
            </label>
            <input
              id={`reason-${id}`}
              name="reason"
              required
              maxLength={500}
              placeholder="Alasan penolakan (wajib)"
              aria-invalid={state.fieldErrors?.reason ? true : undefined}
              className={cn(
                "w-full min-w-[180px] rounded-md border px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-red-500/30",
                state.fieldErrors?.reason ? "border-red-400" : "border-slate-200",
              )}
            />
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-60"
            >
              {pending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <X className="h-3.5 w-3.5" />
              )}
              Kirim penolakan
            </button>
          </form>
        </details>
      </div>
    </div>
  );
}
