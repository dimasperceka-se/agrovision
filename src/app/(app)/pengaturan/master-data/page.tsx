import { redirect } from "next/navigation";
import { Database, ShieldAlert } from "lucide-react";
import { requireContext } from "@/lib/session";
import { listMasterItems, listMasterTypes } from "@/lib/repo/master";
import { PageHeader } from "@/components/ui/PageHeader";
import { getLocale } from "@/lib/i18n-server";
import { getDict } from "@/lib/i18n";
import { ResponsiveTable } from "@/components/ui/ResponsiveTable";
import { MasterDataManager } from "./MasterDataManager";

export const metadata = { title: "Master Data — AgroVision" };

/**
 * CRUD master data untuk super_admin.
 *
 * Inilah sisi tulis dari acceptance test 1: super_admin menambah item di sini,
 * lalu item itu muncul di dropdown setiap form terkait tanpa perubahan kode
 * dan tanpa redeploy.
 */
export default async function MasterDataPage({
  searchParams,
}: {
  searchParams: Promise<{ tipe?: string }>;
}) {
  let ctx;
  try {
    ctx = await requireContext();
  } catch {
    redirect("/login");
  }
  const t = getDict(await getLocale());

  const types = await listMasterTypes(ctx);

  if (ctx.session.role !== "super_admin") {
    return (
      <div>
        <PageHeader title={t("nav.masterdata")} subtitle={t("sub.masterdata")} />
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-5">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div className="text-sm text-amber-900">
            <p className="font-semibold">Hanya super admin.</p>
            <p className="mt-1 leading-relaxed">
              Peran Anda saat ini <strong>{ctx.session.role}</strong>. Master data menentukan isi
              dropdown di seluruh aplikasi, jadi pengubahannya dibatasi. Anda tetap bisa melihat
              daftar tipe di bawah.
            </p>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <ResponsiveTable>
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Tipe</th>
                  <th className="px-4 py-2.5 font-medium">Kode</th>
                  <th className="px-4 py-2.5 text-right font-medium">Item aktif</th>
                </tr>
              </thead>
              <tbody>
                {types.map((t) => (
                  <tr key={t.id} className="border-b border-slate-50 last:border-0">
                    <td data-label="Tipe" className="px-4 py-2.5 text-slate-700">{t.name}</td>
                    <td data-label="Kode" className="px-4 py-2.5 font-mono text-xs text-slate-500">{t.code}</td>
                    <td data-label="Item aktif" className="px-4 py-2.5 text-right tabular-nums text-slate-700">
                      {t.itemCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ResponsiveTable>
        </div>
      </div>
    );
  }

  const params = await searchParams;
  const activeCode = params.tipe && types.some((t) => t.code === params.tipe)
    ? params.tipe
    : types[0]?.code;

  const items = activeCode ? await listMasterItems(ctx, activeCode) : [];
  const activeType = types.find((t) => t.code === activeCode);

  return (
    <div>
      <PageHeader
        title={t("nav.masterdata")}
        subtitle={t("sub.masterdata")}
      />

      {types.length === 0 ? (
        <EmptyState />
      ) : (
        <MasterDataManager
          types={types.map((t) => ({
            code: t.code,
            name: t.name,
            itemCount: t.itemCount,
            isHierarchical: t.isHierarchical,
          }))}
          activeCode={activeCode!}
          activeTypeName={activeType?.name ?? ""}
          isHierarchical={activeType?.isHierarchical ?? false}
          items={items.map((i) => ({
            id: i.id,
            code: i.code,
            name: i.name,
            parentName: i.parentName,
            sortOrder: i.sortOrder,
            isActive: i.isActive,
            isGlobal: i.companyId === null,
          }))}
        />
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
      <Database className="mx-auto h-8 w-8 text-slate-300" />
      <p className="mt-3 text-sm font-medium text-slate-700">Belum ada tipe master data</p>
      <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-slate-500">
        Tipe master seharusnya dibuat migrasi <code className="font-mono text-xs">0015_master</code>.
        Jalankan <code className="font-mono text-xs">npm run db:migrate</code>.
      </p>
    </div>
  );
}
