"use client";

import { useActionState } from "react";
import { Loader2, Plus, CircleAlert, CircleCheck, ChevronDown } from "lucide-react";
import {
  createBudgetAction,
  createFiscalPeriodAction,
  type ActionState,
} from "@/lib/actions/costing";
import { cn } from "@/lib/utils";

type Opt = { value: string; label: string };
const initial: ActionState = { ok: false, message: "" };

function Notice({ state }: { state: ActionState }) {
  if (!state.message) return null;
  return (
    <p
      role="status"
      className={cn(
        "mx-4 mb-3 flex items-start gap-1.5 rounded-md border px-3 py-2 text-sm",
        state.ok
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-red-200 bg-red-50 text-red-700",
      )}
    >
      {state.ok ? (
        <CircleCheck className="mt-0.5 h-4 w-4 shrink-0" />
      ) : (
        <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
      )}
      {state.message}
    </p>
  );
}

/** Periode fiskal = fase proyek (keputusan #6). Nama & rentangnya dari klien. */
export function PeriodForm({
  periods,
}: {
  periods: { id: string; code: string; name: string; startsOn: string; endsOn: string }[];
}) {
  const [state, formAction, pending] = useActionState(createFiscalPeriodAction, initial);

  return (
    <details className="group rounded-xl border border-slate-200 bg-white" open={periods.length === 0 || state.message !== ""}>
      <summary className="flex cursor-pointer items-center justify-between px-4 py-3 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Plus className="h-4 w-4 text-emerald-600" />
          Fase proyek
          <span className="rounded bg-slate-100 px-1.5 text-xs font-normal text-slate-500">
            {periods.length}
          </span>
        </span>
        <ChevronDown className="h-4 w-4 text-slate-500 transition-transform group-open:rotate-180" />
      </summary>

      <Notice state={state} />

      <form action={formAction} className="border-t border-slate-100 p-4" key={state.ok ? "reset" : "form"}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="Kode" name="code" placeholder="FASE-1" required error={state.fieldErrors?.code} />
          <Field
            label="Nama fase"
            name="name"
            placeholder="Fase 1 — Pengadaan Bibit"
            required
            error={state.fieldErrors?.name}
            className="lg:col-span-2"
          />
          <Field label="Mulai" name="startsOn" type="date" required error={state.fieldErrors?.startsOn} />
          <Field label="Selesai" name="endsOn" type="date" required error={state.fieldErrors?.endsOn} />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="mt-3 flex items-center gap-1.5 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Simpan fase
        </button>

        {periods.length > 0 && (
          <ul className="mt-4 space-y-1 border-t border-slate-100 pt-3 text-xs text-slate-500">
            {periods.map((p) => (
              <li key={p.id}>
                <span className="font-mono text-slate-500">{p.code}</span> &middot; {p.name} &middot;{" "}
                {p.startsOn} → {p.endsOn}
              </li>
            ))}
          </ul>
        )}

        <p className="mt-3 text-xs leading-relaxed text-slate-500">
          {/* DECISION NEEDED: nama & rentang fase proyek sebenarnya dari klien */}
          Nama dan rentang fase yang sebenarnya perlu dikonfirmasi klien — belum diseed karena itu
          keputusan bisnis, bukan struktur.
        </p>
      </form>
    </details>
  );
}

export function BudgetForm({
  periods,
  categories,
  estates,
  blocks,
}: {
  periods: Opt[];
  categories: Opt[];
  estates: Opt[];
  blocks: Opt[];
}) {
  const [state, formAction, pending] = useActionState(createBudgetAction, initial);

  return (
    <details className="group rounded-xl border border-slate-200 bg-white" open={state.message !== ""}>
      <summary className="flex cursor-pointer items-center justify-between px-4 py-3 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Plus className="h-4 w-4 text-emerald-600" />
          Susun anggaran
        </span>
        <ChevronDown className="h-4 w-4 text-slate-500 transition-transform group-open:rotate-180" />
      </summary>

      <Notice state={state} />

      <form action={formAction} className="border-t border-slate-100 p-4" key={state.ok ? "reset" : "form"}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Select label="Fase proyek" name="fiscalPeriodId" required options={periods} error={state.fieldErrors?.fiscalPeriodId} />
          <Select label="Kategori biaya" name="costCategoryId" required options={categories} error={state.fieldErrors?.costCategoryId} />
          <Select
            label="Lingkup"
            name="scopeType"
            required
            defaultValue="company"
            options={[
              { value: "company", label: "Seluruh entitas" },
              { value: "estate", label: "Per estate" },
              { value: "block", label: "Per blok" },
            ]}
            error={state.fieldErrors?.scopeType}
          />
        </div>

        {/* Kedua select selalu ada di HTML: tanpa JS pengguna tetap bisa memilih,
            dan kombinasi yang tidak konsisten ditolak server + CHECK constraint. */}
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Select
            label="Estate (bila lingkup estate)"
            name="estateId"
            options={estates}
            allowEmpty
            error={state.fieldErrors?.estateId}
          />
          <Select
            label="Blok (bila lingkup blok)"
            name="blockId"
            options={blocks}
            allowEmpty
            error={state.fieldErrors?.blockId}
          />
          <Field
            label="Nilai anggaran"
            name="amountIdr"
            type="number"
            min="1"
            step="1"
            required
            prefix="Rp"
            error={state.fieldErrors?.amountIdr}
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="mt-3 flex items-center gap-1.5 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Simpan anggaran
        </button>
      </form>
    </details>
  );
}

function Field({
  label,
  name,
  error,
  prefix,
  className,
  ...rest
}: {
  label: string;
  name: string;
  error?: string;
  prefix?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={className}>
      <label htmlFor={name} className="mb-1.5 block text-xs font-medium text-slate-500">
        {label}
      </label>
      <div
        className={cn(
          "flex items-center gap-1.5 rounded-md border px-3 py-2.5 focus-within:ring-2 focus-within:ring-emerald-500/30",
          error ? "border-red-300" : "border-slate-200",
        )}
      >
        {prefix && <span className="text-sm text-slate-500">{prefix}</span>}
        <input
          id={name}
          name={name}
          aria-invalid={error ? true : undefined}
          className="w-full bg-transparent text-sm text-slate-700 outline-none"
          {...rest}
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function Select({
  label,
  name,
  options,
  error,
  required,
  allowEmpty,
  defaultValue,
}: {
  label: string;
  name: string;
  options: Opt[];
  error?: string;
  required?: boolean;
  allowEmpty?: boolean;
  defaultValue?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-xs font-medium text-slate-500">
        {label}
      </label>
      <select
        id={name}
        name={name}
        required={required}
        defaultValue={defaultValue ?? ""}
        aria-invalid={error ? true : undefined}
        className={cn(
          "w-full rounded-md border bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/30",
          error ? "border-red-300" : "border-slate-200",
        )}
      >
        <option value="" disabled={!allowEmpty}>
          {allowEmpty ? "— tidak dipilih —" : "Pilih..."}
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
