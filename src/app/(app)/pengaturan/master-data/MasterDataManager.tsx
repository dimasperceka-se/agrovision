"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Loader2, Plus, CircleAlert, CircleCheck, Inbox } from "lucide-react";
import {
  createMasterItemAction,
  deactivateMasterItemAction,
  type ActionState,
} from "@/lib/actions/master";
import { cn } from "@/lib/utils";

type TypeTab = { code: string; name: string; itemCount: number; isHierarchical: boolean };
type Item = {
  id: string;
  code: string;
  name: string;
  parentName: string | null;
  sortOrder: number;
  isActive: boolean;
  isGlobal: boolean;
};

const initial: ActionState = { ok: false, message: "" };

export function MasterDataManager({
  types,
  activeCode,
  activeTypeName,
  isHierarchical,
  items,
}: {
  types: TypeTab[];
  activeCode: string;
  activeTypeName: string;
  isHierarchical: boolean;
  items: Item[];
}) {
  const [createState, createFormAction, creating] = useActionState(createMasterItemAction, initial);
  const [deactState, deactFormAction] = useActionState(deactivateMasterItemAction, initial);

  const notice = createState.message ? createState : deactState.message ? deactState : null;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[240px_1fr]">
      <nav aria-label="Tipe master data" className="space-y-1">
        {types.map((t) => (
          <Link
            key={t.code}
            href={`/pengaturan/master-data?tipe=${t.code}`}
            aria-current={t.code === activeCode ? "page" : undefined}
            className={cn(
              "flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors",
              t.code === activeCode
                ? "bg-emerald-50 font-medium text-emerald-800"
                : "text-slate-600 hover:bg-slate-50",
            )}
          >
            <span className="truncate">{t.name}</span>
            <span className="ml-2 shrink-0 rounded bg-slate-100 px-1.5 text-xs tabular-nums text-slate-500">
              {t.itemCount}
            </span>
          </Link>
        ))}
      </nav>

      <div className="space-y-4">
        {notice && (
          <p
            role="status"
            className={cn(
              "flex items-start gap-1.5 rounded-md border px-3 py-2 text-sm",
              notice.ok
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-700",
            )}
          >
            {notice.ok ? (
              <CircleCheck className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            {notice.message}
          </p>
        )}

        <form
          action={createFormAction}
          className="rounded-xl border border-slate-200 bg-white p-4"
          key={createState.ok ? `reset-${items.length}` : "form"}
        >
          <input type="hidden" name="masterTypeCode" value={activeCode} />
          <p className="mb-3 text-sm font-semibold text-slate-800">
            Tambah item &mdash; {activeTypeName}
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[160px_1fr_100px_auto]">
            <Field
              label="Kode"
              name="code"
              placeholder="KG"
              required
              error={createState.fieldErrors?.code}
              hint="Huruf kapital, angka, _ dan -"
            />
            <Field
              label="Nama"
              name="name"
              placeholder="Kilogram"
              required
              error={createState.fieldErrors?.name}
            />
            <Field
              label="Urutan"
              name="sortOrder"
              type="number"
              defaultValue="0"
              error={createState.fieldErrors?.sortOrder}
            />
            <div className="flex items-end">
              <button
                type="submit"
                disabled={creating}
                className="flex h-[42px] w-full items-center justify-center gap-1.5 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60 sm:w-auto"
              >
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Tambah
              </button>
            </div>
          </div>

          {isHierarchical && (
            <p className="mt-2 text-xs text-slate-400">
              Tipe ini berjenjang. Sub-kategori dibuat dengan memilih induk &mdash; belum tersedia di
              layar ini.
            </p>
          )}
        </form>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          {items.length === 0 ? (
            <div className="p-10 text-center">
              <Inbox className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 text-sm font-medium text-slate-700">Belum ada item</p>
              <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-slate-500">
                Tambahkan lewat formulir di atas. Item yang ditambahkan langsung tersedia di dropdown
                form terkait.
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Kode</th>
                  <th className="px-4 py-2.5 font-medium">Nama</th>
                  {isHierarchical && <th className="px-4 py-2.5 font-medium">Induk</th>}
                  <th className="px-4 py-2.5 text-right font-medium">Urutan</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{it.code}</td>
                    <td className="px-4 py-2.5 text-slate-700">
                      {it.name}
                      {it.isGlobal && (
                        <span className="ml-2 rounded bg-sky-50 px-1.5 py-0.5 text-xs font-medium text-sky-700">
                          global
                        </span>
                      )}
                    </td>
                    {isHierarchical && (
                      <td className="px-4 py-2.5 text-slate-500">{it.parentName ?? "—"}</td>
                    )}
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-500">
                      {it.sortOrder}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 text-xs font-medium",
                          it.isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-500",
                        )}
                      >
                        {it.isActive ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {it.isActive && (
                        <form action={deactFormAction} className="inline">
                          <input type="hidden" name="id" value={it.id} />
                          <button
                            type="submit"
                            className="text-xs font-medium text-slate-500 hover:text-red-600"
                          >
                            Nonaktifkan
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <p className="text-xs leading-relaxed text-slate-400">
          Item dinonaktifkan, bukan dihapus &mdash; transaksi lama yang merujuknya harus tetap bisa
          dibaca.
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  error,
  hint,
  ...rest
}: {
  label: string;
  name: string;
  error?: string;
  hint?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-xs font-medium text-slate-500">
        {label}
      </label>
      <input
        id={name}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${name}-error` : hint ? `${name}-hint` : undefined}
        className={cn(
          "w-full rounded-md border px-3 py-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/30",
          error ? "border-red-300" : "border-slate-200",
        )}
        {...rest}
      />
      {error ? (
        <p id={`${name}-error`} className="mt-1 text-xs text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${name}-hint`} className="mt-1 text-xs text-slate-400">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
