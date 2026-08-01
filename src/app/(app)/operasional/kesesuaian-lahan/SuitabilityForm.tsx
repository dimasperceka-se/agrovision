"use client";

import { useActionState } from "react";
import { Loader2, Calculator, CircleAlert, CircleCheck, Save } from "lucide-react";
import {
  computeSuitabilityAction, saveSuitabilityAction, type SuitState,
} from "@/lib/actions/suitability";
import type { Classification, PerChar } from "@/lib/repo/suitability";
import { cn } from "@/lib/utils";

type Field = { code: string; label: string; unit: string | null; isNumeric: boolean; options?: string[] };
type Block = { value: string; label: string };

const initial: SuitState = { ok: false, message: "" };

const CLASS_CLS: Record<string, string> = {
  S1: "bg-emerald-600 text-white",
  S2: "bg-lime-500 text-white",
  S3: "bg-amber-500 text-white",
  N: "bg-red-600 text-white",
};
const CELL_CLS: Record<string, string> = {
  S1: "text-emerald-700", S2: "text-lime-700", S3: "text-amber-700", N: "text-red-700",
};
const CLASS_NAME: Record<string, string> = {
  S1: "Sangat sesuai", S2: "Cukup sesuai", S3: "Sesuai marginal", N: "Tidak sesuai",
};

export function SuitabilityForm({ blocks, fields }: { blocks: Block[]; fields: Field[] }) {
  const [state, formAction, pending] = useActionState(computeSuitabilityAction, initial);

  return (
    <div className="space-y-5">
      <form action={formAction} className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select label="Blok" name="blockId" required options={blocks} error={state.fieldErrors?.blockId} />
          <Field label="Tanggal penilaian" name="assessedAt" type="date" required error={state.fieldErrors?.assessedAt} />
          <Select
            label="Komoditas"
            name="crop"
            required
            defaultValue="BOTH"
            options={[
              { value: "BOTH", label: "Durian & Kelapa" },
              { value: "DURIAN", label: "Durian" },
              { value: "COCONUT", label: "Kelapa" },
            ]}
          />
        </div>

        <p className="mt-4 mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Parameter lahan &mdash; isi yang tersedia, kosongkan yang belum diukur
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {fields.map((f) =>
            f.isNumeric ? (
              <Field
                key={f.code}
                label={`${f.label}${f.unit ? ` (${f.unit})` : ""}`}
                name={f.code}
                type="number"
                step="any"
              />
            ) : (
              <Select
                key={f.code}
                label={f.label}
                name={f.code}
                allowEmpty
                options={(f.options ?? []).map((o) => ({ value: o, label: o }))}
              />
            ),
          )}
        </div>

        <button
          type="submit"
          disabled={pending}
          className="mt-4 flex items-center gap-1.5 rounded-md bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
          Hitung kesesuaian
        </button>

        {state.message && !state.result && (
          <p className={cn("mt-3 flex items-start gap-1.5 text-sm", state.ok ? "text-emerald-700" : "text-red-700")}>
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            {state.message}
          </p>
        )}
      </form>

      {state.result && (
        <div className={cn("grid grid-cols-1 gap-4", state.result.show.length > 1 && "lg:grid-cols-2")}>
          {state.result.show.includes("DURIAN") && (
            <ResultCard
              crop="Durian"
              cropCode="DURIAN"
              result={state.result.durian}
              blockId={state.result.blockId}
              assessedAt={state.result.assessedAt}
              params={state.result.params}
            />
          )}
          {state.result.show.includes("COCONUT") && (
            <ResultCard
              crop="Kelapa"
              cropCode="COCONUT"
              result={state.result.coconut}
              blockId={state.result.blockId}
              assessedAt={state.result.assessedAt}
              params={state.result.params}
            />
          )}
        </div>
      )}
    </div>
  );
}

function ResultCard({
  crop, cropCode, result, blockId, assessedAt, params,
}: {
  crop: string;
  cropCode: "DURIAN" | "COCONUT";
  result: Classification;
  blockId: string;
  assessedAt: string;
  params: Record<string, string>;
}) {
  const [saveState, saveAction, saving] = useActionState(saveSuitabilityAction, initial);
  const assessed = result.perChar.filter((p) => p.cls !== null);

  if (!result.overall) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-800">{crop}</h3>
        <p className="mt-2 text-sm text-slate-500">
          Tidak ada parameter relevan untuk {crop.toLowerCase()} yang diisi.
        </p>
      </div>
    );
  }

  const payload = JSON.stringify({ result, params });

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-800">{crop}</h3>
        <div className="flex items-center gap-2">
          <span className={cn("rounded px-2 py-1 text-sm font-bold", CLASS_CLS[result.overall])}>
            {result.subclass}
          </span>
          <span className="text-xs text-slate-500">{CLASS_NAME[result.overall]}</span>
        </div>
      </div>

      <table className="w-full text-sm">
        <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
          <tr>
            <th className="px-4 py-2 font-medium">Karakteristik</th>
            <th className="px-4 py-2 font-medium">Nilai</th>
            <th className="px-4 py-2 text-right font-medium">Kelas</th>
          </tr>
        </thead>
        <tbody>
          {assessed.map((p: PerChar) => (
            <tr
              key={p.charCode}
              className={cn(
                "border-b border-slate-50 last:border-0",
                p.cls === result.overall && "bg-amber-50/40",
              )}
            >
              <td className="px-4 py-1.5 text-slate-700">
                {p.charLabel}
                <span className="ml-1.5 font-mono text-xs text-slate-400">{p.symbol}</span>
              </td>
              <td className="px-4 py-1.5 text-slate-600">
                {p.value}
                {p.unit ? ` ${p.unit}` : ""}
              </td>
              <td className={cn("px-4 py-1.5 text-right font-semibold tabular-nums", CELL_CLS[p.cls!])}>
                {p.cls}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="border-t border-slate-100 px-4 py-3">
        <p className="text-xs leading-relaxed text-slate-500">
          Kelas lahan = kelas <strong>terendah</strong> di antara seluruh karakteristik (hukum
          minimum Liebig). Pembatas: {result.limiting.join(", ")}. Baris bersorot kuning adalah
          faktor pembatasnya.
        </p>

        <form action={saveAction} className="mt-3 flex items-center gap-2">
          <input type="hidden" name="blockId" value={blockId} />
          <input type="hidden" name="assessedAt" value={assessedAt} />
          <input type="hidden" name="cropCode" value={cropCode} />
          <input type="hidden" name="payload" value={payload} />
          <button
            type="submit"
            disabled={saving || saveState.saved}
            className="flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-100 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : saveState.saved ? <CircleCheck className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
            {saveState.saved ? "Tersimpan" : `Simpan hasil ${crop}`}
          </button>
          {saveState.message && (
            <span className={cn("text-xs", saveState.ok ? "text-emerald-700" : "text-red-600")}>
              {saveState.message}
            </span>
          )}
        </form>
      </div>
    </div>
  );
}

function Field({
  label, name, error, ...rest
}: { label: string; name: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-xs font-medium text-slate-500">{label}</label>
      <input
        id={name}
        name={name}
        aria-invalid={error ? true : undefined}
        className={cn(
          "w-full rounded-md border px-3 py-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/30",
          error ? "border-red-300" : "border-slate-200",
        )}
        {...rest}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function Select({
  label, name, options, error, required, allowEmpty, defaultValue = "",
}: {
  label: string; name: string; options: { value: string; label: string }[];
  error?: string; required?: boolean; allowEmpty?: boolean; defaultValue?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-xs font-medium text-slate-500">{label}</label>
      <select
        id={name}
        name={name}
        required={required}
        defaultValue={defaultValue}
        aria-invalid={error ? true : undefined}
        className={cn(
          "w-full rounded-md border bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/30",
          error ? "border-red-300" : "border-slate-200",
        )}
      >
        <option value="" disabled={!allowEmpty}>{allowEmpty ? "— belum diukur —" : "Pilih..."}</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
