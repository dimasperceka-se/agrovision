import { requireContext } from "@/lib/session";
import { plotsGeoJson } from "@/lib/repo/blocks";

/** Plot polygon untuk layer di dalam blok. Tertutup RLS lewat requireContext. */
export async function GET() {
  let ctx;
  try {
    ctx = await requireContext();
  } catch {
    return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }
  try {
    const fc = await plotsGeoJson(ctx);
    return Response.json(fc, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("plots/geojson gagal:", e);
    return Response.json({ error: "Gagal memuat plot" }, { status: 500 });
  }
}
