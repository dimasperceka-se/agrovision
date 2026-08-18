import { readFile } from "node:fs/promises";
import { requireContext } from "@/lib/session";
import { rlsQuery } from "@/lib/db";
import { getSignedReadUrl } from "@/lib/storage";

/**
 * Buka satu berkas bukti (bukti pembelian, dll).
 *
 * gs://  -> redirect ke signed URL sementara (bucket privat, tidak ada URL publik tetap).
 * file:// -> stream langsung dari disk (dev lokal saja).
 *
 * RLS pada app.evidence_files memastikan bukti tenant lain mengembalikan nol
 * baris (404), bukan error -- tidak ada kebocoran soal keberadaannya.
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
    return Response.json({ error: "ID bukti tidak valid" }, { status: 400 });
  }

  const rows = await rlsQuery<{ storage_path: string; mime_type: string | null; file_name: string }>(
    ctx,
    `SELECT storage_path, mime_type, file_name FROM app.evidence_files WHERE id = $1`,
    [id],
  );
  const evidence = rows[0];
  if (!evidence) return Response.json({ error: "Bukti tidak ditemukan" }, { status: 404 });

  if (evidence.storage_path.startsWith("gs://")) {
    const url = await getSignedReadUrl(evidence.storage_path);
    return Response.redirect(url, 302);
  }

  if (evidence.storage_path.startsWith("file://")) {
    const localPath = evidence.storage_path.slice("file://".length);
    try {
      const bytes = await readFile(localPath);
      return new Response(new Uint8Array(bytes), {
        headers: {
          "Content-Type": evidence.mime_type ?? "application/octet-stream",
          "Content-Disposition": `inline; filename="${evidence.file_name}"`,
          "Cache-Control": "no-store",
        },
      });
    } catch {
      return Response.json({ error: "Berkas tidak ditemukan di disk lokal" }, { status: 404 });
    }
  }

  return Response.json({ error: "Skema storage_path tidak dikenali" }, { status: 500 });
}
