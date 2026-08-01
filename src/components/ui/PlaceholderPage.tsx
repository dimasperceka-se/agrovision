import Link from "next/link";
import { Database, type LucideIcon } from "lucide-react";
import { PageHeader } from "./PageHeader";

/**
 * Halaman yang belum dibangun.
 *
 * concept:250 mewajibkan stub DILABELI JELAS, bukan disamarkan sebagai fitur
 * jadi. Versi sebelumnya hanya menampilkan ikon hijau dan satu paragraf ramah —
 * pengguna tidak punya cara tahu bahwa layar itu memang belum ada isinya, dan
 * bisa menyimpulkan sistemnya rusak.
 *
 * Sekarang statusnya dinyatakan eksplisit, beserta keterangan bahwa struktur
 * datanya sudah ada — supaya jelas yang belum dibangun adalah tampilannya,
 * bukan fondasinya.
 */
export function PlaceholderPage({
  title,
  subtitle,
  icon: Icon,
  note,
  schemaReady = true,
}: {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  note: string;
  /** true = tabelnya sudah ada di database, tinggal UI-nya */
  schemaReady?: boolean;
}) {
  return (
    <div>
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={
          <span className="rounded bg-amber-100 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-amber-800">
            Belum dibangun
          </span>
        }
      />

      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white py-20 text-center">
        <div className="rounded-full bg-slate-100 p-3">
          <Icon className="h-7 w-7 text-slate-400" />
        </div>
        <p className="max-w-md px-6 text-sm leading-relaxed text-slate-500">{note}</p>

        {schemaReady && (
          <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
            <Database className="h-3.5 w-3.5" />
            Struktur datanya sudah ada di database — yang belum dibangun tampilannya.
          </p>
        )}

        <Link
          href="/dashboard"
          className="mt-3 rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
        >
          Kembali ke Dashboard
        </Link>
      </div>

      <p className="mt-3 text-center text-xs text-slate-400">
        Layar ini tidak menampilkan data contoh. Angka apa pun di AgroVision selalu berasal dari
        database.
      </p>
    </div>
  );
}
