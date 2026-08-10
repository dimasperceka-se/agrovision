/**
 * Model laporan dashboard mengikuti "Master Laporan" (docs/AgroVision_Master_Laporan.xlsx).
 * Satu bentuk dipakai 3 dashboard (Operasional/Finansial/Sustainability): header
 * block + tabel indikator (Nilai·Satuan·Status·Tindak lanjut·Detail) + Insight &
 * Rekomendasi. Prinsip data: kosong = "—" (bukan 0).
 */

export type IndStatus = "ok" | "perhatian" | "kritis" | "belum" | "usulan";

export const STATUS_LABEL: Record<IndStatus, string> = {
  ok: "OK",
  perhatian: "Perhatian",
  kritis: "Kritis",
  belum: "Belum ada data",
  usulan: "Usulan",
};

// Warna badge status (dipakai UI web & PDF).
export const STATUS_COLOR: Record<IndStatus, { fg: string; bg: string; border: string }> = {
  ok: { fg: "#047857", bg: "#ecfdf5", border: "#a7f3d0" },
  perhatian: { fg: "#b45309", bg: "#fffbeb", border: "#fde68a" },
  kritis: { fg: "#b91c1c", bg: "#fef2f2", border: "#fecaca" },
  belum: { fg: "#64748b", bg: "#f8fafc", border: "#e2e8f0" },
  usulan: { fg: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe" },
};

export type Indicator = {
  /** kolom "Tahap / Kelompok" — kosong = lanjutan grup di atasnya */
  group?: string;
  indicator: string;
  /** nilai terformat (angka/teks), atau "—" bila belum ada data */
  value: string;
  unit: string;
  status: IndStatus;
  followUp: string;
  detail: string;
};

export type Insight = {
  finding: string;
  recommendation: string;
  priority: "Tinggi" | "Sedang" | "Rendah";
  pic: string;
};

export type ReportMeta = {
  title: string;
  subtitle: string;
  entity: string;
  period: string;
  blockScope: string;
  commodity: string;
  dataStatus: string;
  printedAt: Date;
  source: string;
  note?: string;
};

export type DashboardReport = {
  meta: ReportMeta;
  indicators: Indicator[];
  insights: Insight[];
};

// ── Laporan MODUL (sheet 01–15 Master Laporan) ──────────────────────────────
// Kolom hijau = eksisting; kolom biru (kind:"new") = rekomendasi tambahan.
export type ModuleColumn = { label: string; kind?: "new"; align?: "left" | "right" };

export type ModuleReport = {
  meta: ReportMeta;
  columns: ModuleColumn[];
  rows: (string | number | null)[][];
  /** baris "Visual pendamping: …" */
  visual?: string;
};

/** Label status record → istilah laporan. */
export function statusLabelId(s: string): string {
  const m: Record<string, string> = {
    draft: "Draft", submitted: "Diajukan", under_review: "Diajukan",
    approved: "Disetujui", rejected: "Ditolak",
  };
  return m[s] ?? s;
}
