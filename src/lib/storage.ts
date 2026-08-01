import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

/**
 * Penyimpanan berkas bukti.
 *
 * Satu antarmuka, dua implementasi:
 *   - lokal (disk)  untuk development
 *   - Cloud Storage untuk produksi
 *
 * Aplikasi hanya memanggil `putEvidence()`. Menukar backend tidak menyentuh
 * kode form maupun repository -- hanya variabel lingkungan.
 */

export type StoredFile = {
  /** Path lengkap yang disimpan di app.evidence_files.storage_path */
  storagePath: string;
  sha256: string;
  sizeBytes: number;
  mimeType: string;
  fileName: string;
};

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
]);

const MAX_BYTES = 8 * 1024 * 1024;

export class StorageError extends Error {}

/**
 * Nama berkas dinormalkan, TIDAK dipakai apa adanya. Nama dari klien bisa
 * memuat "../" atau karakter yang menembus direktori.
 */
function safeName(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? "file";
  return base.replace(/[^A-Za-z0-9._-]/g, "_").slice(-120) || "file";
}

export async function putEvidence(
  file: File,
  opts: { companyId: string; kind: string },
): Promise<StoredFile> {
  if (file.size === 0) throw new StorageError("Berkas kosong.");
  if (file.size > MAX_BYTES) {
    throw new StorageError(`Berkas terlalu besar (maksimal ${MAX_BYTES / 1024 / 1024} MB).`);
  }
  if (!ALLOWED_MIME.has(file.type)) {
    throw new StorageError(
      `Tipe berkas "${file.type || "tidak dikenal"}" tidak didukung. Gunakan JPG, PNG, WebP, HEIC, atau PDF.`,
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());

  // sha256 dihitung dari isi -- dipakai app.evidence_files.sha256 untuk
  // membuktikan berkas tidak berubah sejak diunggah (kebutuhan audit).
  const sha256 = createHash("sha256").update(bytes).digest("hex");

  const name = safeName(file.name);
  // Konten yang identik menghasilkan path identik -> unggah ulang tidak menduplikasi.
  const key = `${opts.kind}/${opts.companyId}/${sha256.slice(0, 2)}/${sha256}-${name}`;

  const bucket = process.env.GCS_BUCKET_EVIDENCE;
  if (bucket) {
    // TODO: implementasi Cloud Storage. Sengaja belum ditulis daripada
    // ditulis tanpa bisa diuji -- kredensial GCP belum tersedia.
    // Bentuknya: @google-cloud/storage -> bucket(bucket).file(key).save(bytes)
    throw new StorageError(
      "GCS_BUCKET_EVIDENCE diset tapi klien Cloud Storage belum terpasang. " +
        "Kosongkan variabel itu untuk memakai penyimpanan lokal saat development.",
    );
  }

  const root = process.env.LOCAL_EVIDENCE_DIR ?? join(process.cwd(), ".evidence");
  const full = join(root, key);
  await mkdir(dirname(full), { recursive: true });
  await writeFile(full, bytes);

  return {
    storagePath: `file://${full}`,
    sha256,
    sizeBytes: bytes.byteLength,
    mimeType: file.type,
    fileName: name,
  };
}
