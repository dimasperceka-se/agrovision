"use client";

import { useActionState, useState } from "react";
import { Loader2, Sparkles, CircleAlert, CircleCheck, Save, Info } from "lucide-react";
import {
  generateRecommendationAction, saveRecommendationAction, type RecoState,
} from "@/lib/actions/fertilizer-reco";
import { APPROACHES, PHASES, FERT_PARAMS, type Approach } from "@/lib/fertParams";
import { cn } from "@/lib/utils";

type Block = { value: string; label: string };
const initial: RecoState = { ok: false, message: "" };

export function RecommendationForm({ blocks, today }: { blocks: Block[]; today: string }) {
  const [state, action, pending] = useActionState(generateRecommendationAction, initial);
  const [approach, setApproach] = useState<Approach>("analisis_jaringan");

  const meta = APPROACHES.find((a) => a.value === approach)!;
  const fields = FERT_PARAMS[approach];

  return (
    <div className="space-y-4">
      <form action={action} className="rounded-xl border border-slate-200 bg-white p-4">
        {/* Baris utama: blok, komoditas, fase, tanggal */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select label="Blok" name="blockId" required options={blocks} error={state.fieldErrors?.blockId} />
          <Select
            label="Komoditas"
            name="cropCode"
            required
            options={[{ value: "DURIAN", label: "Durian" }, { value: "COCONUT", label: "Kelapa" }]}
            error={state.fieldErrors?.cropCode}
          />
          <Select
            label="Fase"
            name="phase"
            required
            options={PHASES.map((p) => ({ value: p.value, label: p.label }))}
            error={state.fieldErrors?.phase}
          />
          <Field label="Tanggal rekomendasi" name="recommendedAt" type="date" defaultValue={today} required error={state.fieldErrors?.recommendedAt} />
        </div>

        {/* Pendekatan — menentukan set parameter di bawah */}
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Pendekatan penilaian</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {APPROACHES.map((a) => (
              <label
                key={a.value}
                className={cn(
                  "cursor-pointer rounded-lg border p-3 text-sm transition",
                  approach === a.value ? "border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-500/30" : "border-slate-200 hover:bg-slate-50",
                )}
              >
                <input
                  type="radio"
                  name="approach"
                  value={a.value}
                  checked={approach === a.value}
                  onChange={() => setApproach(a.value)}
                  className="sr-only"
                />
                <span className="font-semibold text-slate-800">{a.label}</span>
                <span className="mt-0.5 block text-xs text-slate-500">{a.role}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Parameter kondisional sesuai pendekatan */}
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {meta.paramTitle} <span className="normal-case text-slate-400">— isi yang tersedia, dipakai untuk generate</span>
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {fields.map((f) =>
              f.kind === "select" ? (
                <Select key={f.code} label={f.label} name={f.code} allowEmpty options={(f.options ?? []).map((o) => ({ value: o, label: o }))} hint={f.hint} />
              ) : (
                <Field
                  key={f.code}
                  label={`${f.label}${f.unit ? ` (${f.unit})` : ""}`}
                  name={f.code}
                  type={f.kind === "number" ? "number" : "text"}
                  step={f.kind === "number" ? "any" : undefined}
                  hint={f.hint}
                />
              ),
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="mt-4 flex items-center gap-1.5 rounded-md bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Generate rekomendasi pemupukan
        </button>

        {state.message && !state.generated && (
          <p className={cn("mt-3 flex items-start gap-1.5 text-sm", state.ok ? "text-emerald-700" : "text-red-700")}>
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            {state.message}
          </p>
        )}
      </form>

      {state.generated && <GeneratedCard generated={state.generated} />}
    </div>
  );
}

function GeneratedCard({ generated }: { generated: NonNullable<RecoState["generated"]> }) {
  const [saveState, saveAction, saving] = useActionState(saveRecommendationAction, initial);
  const { reco } = generated;
  const payload = JSON.stringify(generated);

  const doses: [string, number | null][] = [
    ["N", reco.doseN], ["P₂O₅", reco.doseP2o5], ["K₂O", reco.doseK2o], ["MgO", reco.doseMgo], ["S", reco.doseS],
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-emerald-200 bg-white">
      <div className="flex items-center justify-between border-b border-emerald-100 bg-emerald-50/60 px-4 py-2.5">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-emerald-900">
          <Sparkles className="h-4 w-4" /> Rekomendasi tergenerate
        </h3>
        <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">Provisional</span>
      </div>

      <div className="p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Dosis (g/pohon/tahun)</p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {doses.map(([label, v]) => (
            <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-center">
              <div className="text-xs text-slate-500">{label}</div>
              <div className={cn("text-lg font-bold tabular-nums", v === null ? "text-slate-300" : "text-slate-800")}>
                {v === null ? "–" : v}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          <span className="text-slate-600">Sumber K: <strong className="text-slate-800">{reco.kSource}</strong></span>
          <span className="text-slate-600">Split: <strong className="text-slate-800">{reco.splitCount}×/tahun</strong></span>
        </div>

        <details className="mt-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3" open>
          <summary className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-slate-600">
            <Info className="h-3.5 w-3.5" /> Dasar perhitungan ({reco.basis.length})
          </summary>
          <ul className="mt-2 ml-4 list-disc space-y-1 text-xs leading-relaxed text-slate-600">
            {reco.basis.map((b, i) => <li key={i}>{b}</li>)}
          </ul>
        </details>

        <form action={saveAction} className="mt-4 flex flex-wrap items-end gap-2">
          <input type="hidden" name="payload" value={payload} />
          <label className="flex flex-1 flex-col gap-1 text-xs text-slate-500">
            Catatan (opsional)
            <input name="note" placeholder="mis. verifikasi silang gejala lapangan" className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm text-slate-700" />
          </label>
          <button
            type="submit"
            disabled={saving || saveState.saved}
            className="flex items-center gap-1.5 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saveState.saved ? <CircleCheck className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saveState.saved ? "Tersimpan" : "Simpan rekomendasi"}
          </button>
        </form>
        {saveState.message && (
          <p className={cn("mt-2 text-sm", saveState.ok ? "text-emerald-700" : "text-red-600")}>{saveState.message}</p>
        )}
        <p className="mt-2 text-xs leading-relaxed text-slate-400">
          Angka ini <strong>provisional</strong> (titik awal literatur) dan wajib dikalibrasi omission plot
          3–5 tahun sebelum jadi dosis final — docs/09 §11. Jangan sajikan sebagai angka final ke auditor.
        </p>
      </div>
    </div>
  );
}

function Field({
  label, name, error, hint, ...rest
}: { label: string; name: string; error?: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-xs font-medium text-slate-500">{label}</label>
      <input
        id={name}
        name={name}
        aria-invalid={error ? true : undefined}
        title={hint}
        className={cn(
          "w-full rounded-md border px-3 py-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/30",
          error ? "border-red-300" : "border-slate-200",
        )}
        {...rest}
      />
      {hint && !error && <p className="mt-1 text-[11px] leading-tight text-slate-400">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function Select({
  label, name, options, error, required, allowEmpty, hint,
}: {
  label: string; name: string; options: { value: string; label: string }[];
  error?: string; required?: boolean; allowEmpty?: boolean; hint?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-xs font-medium text-slate-500">{label}</label>
      <select
        id={name}
        name={name}
        required={required}
        defaultValue=""
        aria-invalid={error ? true : undefined}
        title={hint}
        className={cn(
          "w-full rounded-md border bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/30",
          error ? "border-red-300" : "border-slate-200",
        )}
      >
        <option value="" disabled={!allowEmpty}>{allowEmpty ? "— belum diisi —" : "Pilih..."}</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {hint && !error && <p className="mt-1 text-[11px] leading-tight text-slate-400">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
