import { requireContext } from "@/lib/session";
import { blocksGeoJson } from "@/lib/repo/blocks";

/**
 * GeoJSON polygon blok untuk peta.
 *
 * Route Handler tidak di-cache secara default di Next.js 16 — dan itu memang
 * yang diinginkan di sini: hasilnya bergantung sesi (RLS), jadi caching akan
 * membocorkan data satu tenant ke tenant lain.
 *
 * Otorisasi TIDAK boleh diandalkan pada pemanggil: endpoint ini bisa diakses
 * langsung, jadi requireContext() dipanggil lebih dulu dan seluruh query
 * berjalan di bawah RLS milik pengguna itu.
 */
export async function GET(request: Request) {
  let ctx;
  try {
    ctx = await requireContext();
  } catch {
    return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  // Simplifikasi per zoom: pada zoom rendah, 3.300 polygon utuh terlalu berat
  // dikirim ke browser. Nilainya dibatasi supaya tidak bisa dipakai memaksa
  // komputasi mahal di server.
  const raw = Number(new URL(request.url).searchParams.get("simplify") ?? "0");
  const simplifyMeters = Number.isFinite(raw) ? Math.min(500, Math.max(0, raw)) : 0;

  try {
    const fc = await blocksGeoJson(ctx, { simplifyMeters });
    return Response.json(fc, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("blocks/geojson gagal:", e);
    return Response.json({ error: "Gagal memuat geometry blok" }, { status: 500 });
  }
}
