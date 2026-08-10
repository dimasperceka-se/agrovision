import type { RlsContext } from "@/lib/db";
import { listExpenditures, blockCostSummary } from "@/lib/repo/costing";
import { companyName } from "@/lib/repo/reports";
import { statusLabelId, type ModuleReport, type ModuleColumn } from "./types";

const nf = (v: number, d = 0) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: d }).format(v);

/**
 * Laporan Modul PENGELUARAN (sheet "13 Pengeluaran" Master Laporan).
 * Kolom hijau = eksisting; biru (kind:"new") = rekomendasi tambahan
 * (Per-ha cost, Internal/outsource) yang belum berdata → "—".
 */
export async function expenditureModuleReport(ctx: RlsContext): Promise<ModuleReport> {
  const [company, data, perBlock] = await Promise.all([
    companyName(ctx),
    listExpenditures(ctx, { page: 1, pageSize: 100 }),
    blockCostSummary(ctx, { limit: 1000 }),
  ]);
  const areaByBlock = new Map(perBlock.map((b) => [b.blockCode, b.areaHa]));

  const columns: ModuleColumn[] = [
    { label: "No", align: "right" },
    { label: "Tanggal" },
    { label: "Kode Blok" },
    { label: "Aktivitas sumber" },
    { label: "Kategori biaya" },
    { label: "Volume", align: "right" },
    { label: "Tarif (Rp)", align: "right" },
    { label: "Nilai (Rp)", align: "right" },
    { label: "Per-ha cost", align: "right", kind: "new" },
    { label: "Internal/outsource", kind: "new" },
    { label: "Status" },
    { label: "Ref approval" },
  ];

  const rows = data.rows.map((r, i) => {
    const tarif = r.quantity && r.quantity > 0 ? r.amountIdr / r.quantity : null;
    const area = r.blockCode ? areaByBlock.get(r.blockCode) ?? null : null;
    const perHa = area && area > 0 ? r.amountIdr / area : null;
    const vol = r.quantity === null ? "—" : `${nf(r.quantity, 2)}${r.unitName ? " " + r.unitName : ""}`;
    return [
      i + 1,
      r.transactionDate,
      r.isOverhead ? "overhead" : r.blockCode ?? "—",
      "—", // Aktivitas sumber — belum dipetakan dari refleksi
      r.costCategoryName ?? "—",
      vol,
      tarif === null ? "—" : nf(tarif),
      nf(r.amountIdr),
      perHa === null ? "—" : nf(perHa),
      "—", // Internal/outsource — kolom rekomendasi (belum ada data)
      statusLabelId(r.approvalStatus),
      "—",
    ];
  });

  return {
    meta: {
      title: "Laporan Pengeluaran (Expenditure)",
      subtitle: "Biaya per blok — refleksi aktivitas disetujui (volume × tarif).",
      entity: company,
      period: "Seluruh data s.d. tanggal cetak",
      blockScope: "Semua blok",
      commodity: "Kelapa & Durian",
      dataStatus: "Semua status (lihat kolom Status)",
      printedAt: new Date(),
      source: "modul Costing/Pengeluaran.",
      note: 'Hanya nilai Disetujui yang dihitung. Filter: Draft/Diajukan/Disetujui/Ditolak. Kosong ditulis "—", bukan 0.',
    },
    columns,
    rows,
    visual: "Funnel status · tren pengeluaran · breakdown per aktivitas.",
  };
}
