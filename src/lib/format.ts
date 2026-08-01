/**
 * Pemformatan angka untuk UI Indonesia.
 *
 * Aturan yang tidak boleh dilanggar: nilai `null` berarti "belum ada data" dan
 * ditampilkan sebagai em dash, BUKAN sebagai 0. Menampilkan 0 untuk data yang
 * belum ada adalah angka fabrikasi -- persis yang dilarang concept:40.
 */

const idr = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });
const dec2 = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const EMPTY = "—";

export function formatIdr(v: number | null | undefined): string {
  if (v === null || v === undefined) return EMPTY;
  return `Rp ${idr.format(v)}`;
}

/** Ringkas untuk KPI: Rp 1,3 M / Rp 450 jt. Nilai penuh tetap di tooltip. */
export function formatIdrShort(v: number | null | undefined): string {
  if (v === null || v === undefined) return EMPTY;
  const abs = Math.abs(v);
  if (abs >= 1e12) return `Rp ${dec2.format(v / 1e12)} T`;
  if (abs >= 1e9) return `Rp ${dec2.format(v / 1e9)} M`;
  if (abs >= 1e6) return `Rp ${idr.format(Math.round(v / 1e6))} jt`;
  return `Rp ${idr.format(v)}`;
}

export function formatHa(v: number | null | undefined): string {
  if (v === null || v === undefined) return EMPTY;
  return `${dec2.format(v)} ha`;
}

export function formatNumber(v: number | null | undefined): string {
  if (v === null || v === undefined) return EMPTY;
  return idr.format(v);
}

export function formatPct(v: number | null | undefined): string {
  if (v === null || v === undefined) return EMPTY;
  return `${dec2.format(v)}%`;
}

export function formatDate(v: string | Date | null | undefined): string {
  if (!v) return EMPTY;
  const d = typeof v === "string" ? new Date(v) : v;
  if (Number.isNaN(d.getTime())) return EMPTY;
  return d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}
