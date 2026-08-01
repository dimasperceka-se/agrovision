import { requireContext } from "@/lib/session";
import { rlsQuery } from "@/lib/db";

/**
 * Data operasional & biaya satu blok, untuk panel detail saat blok diklik di peta.
 *
 * concept:46 — "klik blok menarik data operasional dan biaya blok itu yang hidup".
 * Semua angka dibaca dari view agregasi, bukan dihitung ulang di sini.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  let ctx;
  try {
    ctx = await requireContext();
  } catch {
    return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return Response.json({ error: "ID blok tidak valid" }, { status: 400 });
  }

  try {
    // RLS memastikan blok tenant lain mengembalikan nol baris, bukan error --
    // jadi tidak ada kebocoran informasi soal keberadaan blok itu.
    const rows = await rlsQuery<{
      block_code: string; estate_name: string; area_ha: string | null;
      planting_year: number | null; verification_status: string;
      transaction_count: string; total_cost_idr: string; cost_per_ha_idr: string | null;
      pending_count: string;
    }>(
      ctx,
      `SELECT b.code AS block_code, e.name AS estate_name, b.area_ha, b.planting_year,
              b.verification_status,
              COALESCE(s.transaction_count, 0) AS transaction_count,
              COALESCE(s.total_cost_idr, 0)    AS total_cost_idr,
              s.cost_per_ha_idr,
              (SELECT count(*) FROM app.cost_transactions ct
                WHERE ct.block_id = b.id
                  AND ct.approval_status IN ('submitted','under_review')) AS pending_count
         FROM app.blocks b
         JOIN app.estates e ON e.id = b.estate_id
         LEFT JOIN app.v_block_cost_summary s ON s.block_id = b.id
        WHERE b.id = $1 AND b.archived_at IS NULL`,
      [id],
    );

    const r = rows[0];
    if (!r) return Response.json({ error: "Blok tidak ditemukan" }, { status: 404 });

    const txCount = Number(r.transaction_count);
    return Response.json(
      {
        blockCode: r.block_code,
        estateName: r.estate_name,
        areaHa: r.area_ha === null ? null : Number(r.area_ha),
        plantingYear: r.planting_year,
        verificationStatus: r.verification_status,
        transactionCount: txCount,
        // null, bukan 0, bila belum ada transaksi -- em dash di UI.
        totalCostIdr: txCount === 0 ? null : Number(r.total_cost_idr),
        costPerHaIdr: r.cost_per_ha_idr === null ? null : Number(r.cost_per_ha_idr),
        pendingCount: Number(r.pending_count),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error("blocks/[id]/summary gagal:", e);
    return Response.json({ error: "Gagal memuat data blok" }, { status: 500 });
  }
}
