"use client";

import { useActionState } from "react";
import { Loader2, Plus, CircleAlert, CircleCheck, ChevronDown } from "lucide-react";
import { createBlockAction, type ActionState } from "@/lib/actions/costing";
import { cn } from "@/lib/utils";

const initial: ActionState = { ok: false, message: "" };

const SOURCES = [
  { value: "gps_survey", label: "Survei GPS" },
  { value: "manual_digitize", label: "Digitasi manual" },
  { value: "shapefile_import", label: "Impor shapefile/GeoJSON" },
  { value: "drone_ortho", label: "Orthophoto drone" },
  { value: "legacy_document", label: "Dokumen lama" },
];

export function BlockCreateForm({ estates }: { estates: { value: string; label: string }[] }) {
  const [state, formAction, pending] = useActionState(createBlockAction, initial);

  // <details> native, bukan toggle useState -- lihat catatan di ExpenditureForm.
  return (
    <details className="group rounded-xl border border-slate-200 bg-white" open={state.message !== ""}>
      <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-left [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Plus className="h-4 w-4 text-emerald-600" />
          Tambah blok
        </span>
        <ChevronDown className="h-4 w-4 text-slate-500 transition-transform group-open:rotate-180" />
      </summary>

      {state.message && (
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
      )}

      <form action={formAction} className="border-t border-slate-100 p-4" key={state.ok ? "reset" : "form"}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Select label="Estate" name="estateId" required options={estates} error={state.fieldErrors?.estateId} />
            <Field label="Kode blok" name="code" placeholder="AGF-A12" required error={state.fieldErrors?.code} />
            <Field label="Nama (opsional)" name="name" placeholder="Blok Sejahtera 12" />
            <Field
              label="Tahun tanam (opsional)"
              name="plantingYear"
              type="number"
              placeholder="2026"
              error={state.fieldErrors?.plantingYear}
            />
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[220px_1fr]">
            <Select
              label="Sumber batas"
              name="boundarySource"
              required
              options={SOURCES}
              error={state.fieldErrors?.boundarySource}
            />
            <div>
              <label htmlFor="geojson" className="mb-1.5 block text-xs font-medium text-slate-500">
                GeoJSON polygon (opsional)
              </label>
              <textarea
                id="geojson"
                name="geojson"
                rows={3}
                placeholder='{"type":"Polygon","coordinates":[[[114,-2],[114.01,-2],[114.01,-2.01],[114,-2.01],[114,-2]]]}'
                aria-invalid={state.fieldErrors?.geojson ? true : undefined}
                className={cn(
                  "w-full rounded-md border px-3 py-2 font-mono text-xs text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/30",
                  state.fieldErrors?.geojson ? "border-red-300" : "border-slate-200",
                )}
              />
              {state.fieldErrors?.geojson ? (
                <p className="mt-1 text-xs text-red-600">{state.fieldErrors.geojson}</p>
              ) : (
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  Boleh dikosongkan — blok bisa didaftarkan lebih dulu, batasnya didigitasi
                  kemudian. Tanpa polygon, luas dan cost per hektar belum bisa dihitung.
                </p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={pending}
            className="mt-4 flex items-center justify-center gap-1.5 rounded-md bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Simpan blok
          </button>
        </form>
    </details>
  );
}

function Field({
  label,
  name,
  error,
  ...rest
}: { label: string; name: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-xs font-medium text-slate-500">
        {label}
      </label>
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
  label,
  name,
  options,
  error,
  required,
}: {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  error?: string;
  required?: boolean;
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
        defaultValue=""
        aria-invalid={error ? true : undefined}
        className={cn(
          "w-full rounded-md border bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/30",
          error ? "border-red-300" : "border-slate-200",
        )}
      >
        <option value="" disabled>
          Pilih...
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
