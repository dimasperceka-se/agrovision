import { cn } from "@/lib/utils";

/**
 * Primitif tabel responsif.
 *
 * Desktop (>=768px): tabel HTML asli — tidak ada yang berubah.
 * Mobile (<768px): tiap <tr> berubah jadi KARTU label–nilai. Label diambil dari
 * atribut `data-label` pada tiap <td> (lihat .rt-cards di globals.css).
 *
 * Cara pakai: bungkus <table> yang sudah ada, lalu beri data-label di tiap <td>:
 *
 *   <ResponsiveTable>
 *     <table className="w-full text-sm"> ... </table>
 *   </ResponsiveTable>
 *
 *   <td data-label="Tanggal">...</td>
 *   <td data-action>...</td>          // kolom aksi: tanpa label, rata kanan
 *   <td data-label="Biaya" data-empty={v === null}>…</td>  // sembunyikan bila kosong
 *
 * Untuk tabel yang TIDAK cocok jadi kartu (matriks lebar, mis. rekomendasi pupuk),
 * pakai mode="scroll": tetap tabel dengan scroll horizontal + kolom pertama sticky.
 */
export function ResponsiveTable({
  children,
  mode = "cards",
  className,
}: {
  children: React.ReactNode;
  mode?: "cards" | "scroll";
  className?: string;
}) {
  if (mode === "scroll") {
    return (
      <div className={cn("overflow-x-auto [&_tbody_tr>*:first-child]:sticky [&_tbody_tr>*:first-child]:left-0 [&_tbody_tr>*:first-child]:z-10 [&_tbody_tr>*:first-child]:bg-white [&_thead_tr>*:first-child]:sticky [&_thead_tr>*:first-child]:left-0 [&_thead_tr>*:first-child]:z-20", className)}>
        {children}
      </div>
    );
  }
  return <div className={cn("rt-cards overflow-x-auto md:overflow-x-auto", className)}>{children}</div>;
}
