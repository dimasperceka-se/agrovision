import { redirect } from "next/navigation";
import { Map as MapIcon, TriangleAlert } from "lucide-react";
import { requireContext } from "@/lib/session";
import { listBlocks, listEstateOptions } from "@/lib/repo/blocks";
import { PageHeader } from "@/components/ui/PageHeader";
import { getLocale } from "@/lib/i18n-server";
import { getDict } from "@/lib/i18n";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { ResponsiveTable } from "@/components/ui/ResponsiveTable";
import { formatHa } from "@/lib/format";
import { BlockCreateForm } from "./BlockCreateForm";
import { BlockMap } from "@/components/map/BlockMap";
import { BlockRow } from "./BlockRow";

export const metadata = { title: "Blok & Peta — AgroVision" };

/**
 * Data fondasi: setiap modul lain merujuk block_id dari sini (concept:134).
 *
 * Blok boleh ada tanpa polygon — geom nullable sejak migrasi 0018, karena
 * ~3.300 blok tidak mungkin didaftarkan sekaligus lengkap batasnya.
 */
export default async function BlokPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; estate?: string }>;
}) {
  let ctx;
  try {
    ctx = await requireContext();
  } catch {
    redirect("/login");
  }
  const t = getDict(await getLocale());

  const sp = await searchParams;
  const page = Number(sp.page ?? "1") || 1;

  const [data, estates] = await Promise.all([
    listBlocks(ctx, { page, search: sp.q, estateId: sp.estate }),
    listEstateOptions(ctx),
  ]);

  const canWrite = ["creator", "approver", "super_admin"].includes(ctx.session.role);
  const withoutGeom = data.rows.filter((b) => !b.hasGeometry).length;

  return (
    <div>
      <PageHeader
        title={t("nav.blocks")}
        subtitle={t("sub.blocks")}
      />

      {!ctx.companyId && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-sm text-amber-900">
            Anda sedang melihat <strong>semua entitas</strong>. Untuk menambah blok, pilih satu
            entitas di kanan atas.
          </p>
        </div>
      )}

      {canWrite && ctx.companyId && estates.length > 0 && <BlockCreateForm estates={estates} />}

      {/* Peta: polygon dibaca dari blocks.geom lewat /api/blocks/geojson.
          Klik blok menarik data biaya hidupnya (concept:46). */}
      <div className="mt-5">
        <BlockMap blockCount={data.total} />
      </div>

      <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <form action="/operasional/blok" className="flex gap-2 border-b border-slate-100 p-3">
          <input
            type="search"
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="Cari kode atau nama blok..."
            className="w-full max-w-xs rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
          {sp.estate && <input type="hidden" name="estate" value={sp.estate} />}
          <button
            type="submit"
            className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            Cari
          </button>
        </form>

        {data.rows.length === 0 ? (
          <EmptyState
            icon={MapIcon}
            title={sp.q ? "Tidak ada blok yang cocok" : "Belum ada blok"}
            description={
              sp.q
                ? "Coba kata kunci lain."
                : "Tambahkan blok lewat formulir di atas, atau impor batas dari shapefile/GeoJSON."
            }
          />
        ) : (
          <>
            <ResponsiveTable>
              <table className="w-full text-sm">
                <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Kode</th>
                    <th className="px-4 py-2.5 font-medium">Nama</th>
                    <th className="px-4 py-2.5 font-medium">Estate</th>
                    <th className="px-4 py-2.5 text-right font-medium">Luas</th>
                    <th className="px-4 py-2.5 text-right font-medium">Tahun tanam</th>
                    <th className="px-4 py-2.5 font-medium">Polygon</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((b) => (
                    <BlockRow
                      key={b.id}
                      id={b.id}
                      code={b.code}
                      name={b.name}
                      estateName={b.estateName}
                      areaHa={b.areaHa}
                      plantingYear={b.plantingYear}
                      hasGeometry={b.hasGeometry}
                    />
                  ))}
                </tbody>
              </table>
            </ResponsiveTable>
            <Pagination
              page={data.page}
              pageSize={data.pageSize}
              total={data.total}
              basePath="/operasional/blok"
              params={{ q: sp.q, estate: sp.estate }}
            />
          </>
        )}
      </div>

      {withoutGeom > 0 && (
        <p className="mt-3 text-xs leading-relaxed text-slate-400">
          {withoutGeom} blok di halaman ini belum punya polygon. Blok tetap bisa dipakai untuk
          pencatatan biaya, tetapi <strong>luas dan cost per hektar belum bisa dihitung</strong>{" "}
          sampai batasnya didigitasi.
        </p>
      )}

      <p className="mt-2 text-xs leading-relaxed text-slate-400">
        Klik baris blok untuk menyorotnya di peta. Basemap satelit Sentinel-2 (~10 m/px) dan OpenStreetMap — keduanya gratis dan berlisensi
        terbuka, tanpa API key. Cukup untuk memverifikasi batas blok; detail per pohon nanti
        memakai orthophoto drone.
      </p>
    </div>
  );
}
