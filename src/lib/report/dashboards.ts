import { rlsQuery, type RlsContext } from "@/lib/db";
import { companyName } from "@/lib/repo/reports";
import { latestCarbonRun, carbonByBlock, listCertificates } from "@/lib/repo/sustainability";
import { listSeedStock } from "@/lib/repo/operational";
import type { DashboardReport, Indicator, Insight, ReportMeta } from "./types";

const nf = (v: number, d = 0) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: d }).format(v);
const EMPTY = "—";

async function baseMeta(ctx: RlsContext, title: string, subtitle: string, source: string, note: string): Promise<ReportMeta> {
  return {
    title, subtitle, entity: await companyName(ctx),
    period: "Seluruh data disetujui s.d. tanggal cetak", blockScope: "Semua blok",
    commodity: "Kelapa & Durian", dataStatus: "Disetujui (approved)", printedAt: new Date(), source, note,
  };
}

// ── Dashboard Operasional (sheet "00 Operasional") ──────────────────────────
export async function operationalDashboardData(ctx: RlsContext): Promise<DashboardReport> {
  const [agg] = await rlsQuery<{
    blocks: string; area: string | null;
    harvest_ton: string | null; grade_a: string | null; harvest_total: string | null;
    weeding: string; pruning_trees: string | null; fert: string; spray: string;
    suit: string; landprep: string;
  }>(ctx, `
    SELECT (SELECT count(*) FROM app.blocks WHERE archived_at IS NULL) AS blocks,
           (SELECT COALESCE(SUM(area_ha),0) FROM app.blocks WHERE archived_at IS NULL) AS area,
           (SELECT COALESCE(SUM(quantity_ton),0) FROM app.harvest_records WHERE approval_status='approved') AS harvest_ton,
           (SELECT COALESCE(SUM(quantity_ton) FILTER (WHERE grade='A'),0) FROM app.harvest_records WHERE approval_status='approved') AS grade_a,
           (SELECT COALESCE(SUM(quantity_ton),0) FROM app.harvest_records WHERE approval_status='approved') AS harvest_total,
           (SELECT count(*) FROM app.weeding_records WHERE approval_status='approved') AS weeding,
           (SELECT COALESCE(SUM(tree_count),0) FROM app.pruning_records WHERE approval_status='approved') AS pruning_trees,
           (SELECT count(*) FROM app.fertilizer_applications WHERE approval_status='approved') AS fert,
           (SELECT count(*) FROM app.spraying_records WHERE approval_status='approved') AS spray,
           (SELECT count(*) FROM app.land_suitability_assessments WHERE approval_status='approved') AS suit,
           (SELECT count(*) FROM app.land_preparations WHERE approval_status='approved') AS landprep
  `);
  const stock = await listSeedStock(ctx);
  const alive = stock.reduce((s, x) => s + (x.qtyAlive ?? 0), 0);
  const init = stock.reduce((s, x) => s + x.qtyInitial, 0);
  const survival = init === 0 ? null : (alive * 100) / init;
  const nBlocks = Number(agg.blocks);
  const area = agg.area === null ? null : Number(agg.area);
  const harvest = Number(agg.harvest_ton);
  const gradeAPct = Number(agg.harvest_total) > 0 ? (Number(agg.grade_a) * 100) / Number(agg.harvest_total) : null;
  const yieldHa = area && area > 0 && harvest > 0 ? harvest / area : null;

  const cnt = (n: number) => (n === 0 ? EMPTY : nf(n));
  const st = (n: number) => (n === 0 ? "belum" : "ok") as Indicator["status"];

  const indicators: Indicator[] = [
    { group: "Kebun & Blok", indicator: "Blok terdaftar", value: nBlocks === 0 ? EMPTY : nf(nBlocks), unit: "blok", status: nBlocks === 0 ? "belum" : "ok", followUp: nBlocks === 0 ? "Tambahkan blok & polygon" : "—", detail: "12 Blok & Peta" },
    { indicator: "Luas kebun total", value: area === null ? EMPTY : nf(area, 2), unit: "ha", status: area ? "ok" : "belum", followUp: area ? "—" : "Digitasi polygon blok", detail: "12 Blok & Peta" },
    { indicator: "Populasi pohon", value: EMPTY, unit: "pohon", status: "belum", followUp: "Input populasi per blok", detail: "12 Blok & Peta" },

    { group: "1 · Kesesuaian Lahan", indicator: "Blok dinilai kesesuaian", value: cnt(Number(agg.suit)), unit: "blok", status: st(Number(agg.suit)), followUp: Number(agg.suit) === 0 ? "Lakukan penilaian kesesuaian" : "Jadwalkan penilaian ulang berkala", detail: "01 Kesesuaian Lahan" },
    { group: "2 · Persiapan Lahan", indicator: "Blok persiapan (disetujui)", value: cnt(Number(agg.landprep)), unit: "blok", status: st(Number(agg.landprep)), followUp: Number(agg.landprep) === 0 ? "Catat kesiapan tanam" : "Selesaikan sisa lubang tanam", detail: "02 Persiapan Lahan" },
    { group: "3 · Bibit & Nursery", indicator: "Survival bibit keseluruhan", value: survival === null ? EMPTY : nf(survival, 1), unit: "%", status: survival === null ? "belum" : survival >= 85 ? "ok" : "perhatian", followUp: survival === null ? "Catat inspeksi bibit" : survival >= 85 ? "Pertahankan; pantau batch berisiko" : "Tinjau batch survival rendah", detail: "03 Bibit & Nursery" },

    { group: "4 · Budidaya", indicator: "Penyiangan tercatat (disetujui)", value: cnt(Number(agg.weeding)), unit: "kegiatan", status: st(Number(agg.weeding)), followUp: Number(agg.weeding) === 0 ? "Jadwalkan & catat penyiangan" : "—", detail: "04 Penyiangan" },
    { indicator: "Pemupukan (disetujui)", value: cnt(Number(agg.fert)), unit: "aplikasi", status: st(Number(agg.fert)), followUp: Number(agg.fert) === 0 ? "Catat realisasi pemupukan" : "Bandingkan realisasi vs rekomendasi", detail: "05 Pemupukan" },
    { indicator: "Pruning (pohon, disetujui)", value: Number(agg.pruning_trees) === 0 ? EMPTY : nf(Number(agg.pruning_trees)), unit: "pohon", status: st(Number(agg.pruning_trees)), followUp: "—", detail: "06 Pruning" },
    { indicator: "Penyemprotan (disetujui)", value: cnt(Number(agg.spray)), unit: "kegiatan", status: st(Number(agg.spray)), followUp: Number(agg.spray) === 0 ? "—" : "Pantau OPT & interval aman panen", detail: "07 Penyemprotan" },

    { group: "5 · Panen", indicator: "Panen disetujui", value: harvest === 0 ? EMPTY : nf(harvest, 2), unit: "ton", status: harvest === 0 ? "belum" : "ok", followUp: harvest === 0 ? "Menunggu panen disetujui" : "—", detail: "08 Panen" },
    { indicator: "Grade A", value: gradeAPct === null ? EMPTY : nf(gradeAPct, 0), unit: "%", status: gradeAPct === null ? "belum" : "ok", followUp: gradeAPct === null ? "—" : "Jaga mutu untuk harga optimal", detail: "08 Panen" },
    { indicator: "Yield per ha", value: yieldHa === null ? EMPTY : nf(yieldHa, 1), unit: "t/ha", status: yieldHa === null ? "usulan" : "ok", followUp: yieldHa === null ? "Aktifkan hitung otomatis per komoditas" : "—", detail: "08 Panen" },

    { group: "6 · Pascapanen", indicator: "Pengolahan pascapanen", value: EMPTY, unit: "—", status: "usulan", followUp: "Modul pascapanen belum ada — siapkan di roadmap", detail: "(baru)" },
    { group: "7 · Mitra", indicator: "Mitra petani (contract farming)", value: EMPTY, unit: "mitra", status: "usulan", followUp: "Daftarkan mitra & pisahkan INT/EXT", detail: "(contract farming)" },
  ];

  const insights: Insight[] = [];
  if (Number(agg.weeding) === 0) insights.push({ finding: "Penyiangan belum tercatat pada periode ini.", recommendation: "Pastikan seluruh aktivitas lapangan tercatat agar rangkuman akurat.", priority: "Sedang", pic: "Kepala kebun · 04" });
  if (survival !== null && survival < 85) insights.push({ finding: "Survival bibit di bawah 85%.", recommendation: "Tinjau batch berisiko & perbaiki penanganan nursery.", priority: "Tinggi", pic: "Nursery · 03" });
  insights.push({ finding: "Modul pengolahan pascapanen belum tersedia.", recommendation: "Prioritaskan pengembangan modul pascapanen di roadmap.", priority: "Tinggi", pic: "IT · roadmap" });
  insights.push({ finding: "Mitra petani belum tercatat.", recommendation: "Aktifkan pencatatan contract farming (User ID INT/EXT) dengan cost terpisah.", priority: "Sedang", pic: "Ops · User" });

  return {
    meta: await baseMeta(ctx, "Laporan Operasional",
      "Rangkuman rantai budidaya: kesesuaian → persiapan → bibit → budidaya → panen. Tanpa angka finansial.",
      "seluruh modul operasional.",
      'Operasional fokus pada kegiatan & hasil, bukan biaya. Kosong ditulis "—", bukan 0.'),
    indicators, insights,
  };
}

// ── Dashboard Sustainability (sheet "00 Sustainability") ────────────────────
export async function sustainabilityDashboardData(ctx: RlsContext): Promise<DashboardReport> {
  const [run, blocks, certs] = await Promise.all([latestCarbonRun(ctx), carbonByBlock(ctx), listCertificates(ctx)]);
  const net = run?.netBalanceTco2e ?? null;
  const gross = run?.grossEmissionTco2e ?? null;
  const completeness = run?.dataCompletenessPct ?? null;
  const activeCerts = certs.filter((c) => c.state === "active" || c.state === "expiring").length;

  const tco2e = (v: number | null) => (v === null ? EMPTY : nf(v, 2));

  const indicators: Indicator[] = [
    { group: "Karbon", indicator: "Neraca bersih", value: tco2e(net), unit: "tCO₂e", status: net === null ? "belum" : net >= 0 ? "ok" : "perhatian", followUp: net === null ? "Jalankan perhitungan karbon" : net >= 0 ? "Pertahankan net sink" : "Net emitter (fase land clearing)", detail: "11 Carbon Accounting" },
    { indicator: "Emisi bruto", value: tco2e(gross), unit: "tCO₂e", status: gross === null ? "belum" : "ok", followUp: "—", detail: "11 Carbon Accounting" },
    { indicator: "Kelengkapan data karbon", value: completeness === null ? EMPTY : nf(completeness, 0), unit: "%", status: completeness === null ? "belum" : completeness >= 90 ? "ok" : "perhatian", followUp: completeness === null ? "—" : completeness >= 90 ? "—" : "Lengkapi DBH & luas per blok", detail: "11 Carbon Accounting" },
    { indicator: "Validasi faktor emisi", value: "Tier 1 (perkiraan)", unit: "-", status: "perhatian", followUp: "Validasi faktor lokal (EF-LANDCLEAR dll)", detail: "11 Carbon Accounting" },

    { group: "Sertifikasi & Kepatuhan", indicator: "Sertifikat aktif", value: certs.length === 0 ? EMPTY : nf(activeCerts), unit: "sertifikat", status: certs.length === 0 ? "kritis" : "ok", followUp: certs.length === 0 ? "Mulai proses sertifikasi bertahap" : "—", detail: "Registri" },
    { indicator: "Bukti riwayat lahan K1–K7", value: EMPTY, unit: "lengkap", status: "kritis", followUp: "Lengkapi bukti sebelum jendela retroaktif tutup", detail: "Traceability" },

    { group: "Ketertelusuran & Hutan", indicator: "Traceability", value: "Blok→CP→Gudang→Pabrik", unit: "-", status: "ok", followUp: "Aktifkan status per lot panen", detail: "Traceability" },
    { indicator: "Deforestation monitoring", value: EMPTY, unit: "ha", status: "belum", followUp: "Aktifkan pemantauan tutupan hutan (soon)", detail: "(soon)" },

    { group: "Input & Biodiversitas", indicator: "Rasio input organik vs sintetik", value: EMPTY, unit: "%", status: "perhatian", followUp: "Naikkan porsi organik bertahap", detail: "Agri-Input" },
    { indicator: "Indeks agroforestri / biodiversitas", value: EMPTY, unit: "spesies", status: "belum", followUp: "Catat spesies naungan & kanopi", detail: "Blok" },
  ];

  void blocks;
  const insights: Insight[] = [
    ...(net !== null && net >= 0 ? [{ finding: `Proyek net sink (${nf(net, 0)} tCO₂e) namun faktor emisi masih Tier 1 (perkiraan).`, recommendation: "Validasi faktor emisi lokal agar klaim karbon kredibel & siap audit.", priority: "Tinggi" as const, pic: "Sustainability · 11" }] : []),
    { finding: "Sertifikasi & bukti riwayat lahan K1–K7 belum lengkap; jendela retroaktif akan tertutup.", recommendation: "Prioritaskan pengumpulan bukti riwayat lahan sekarang sebelum lahan dibuka.", priority: "Tinggi", pic: "Compliance" },
    { finding: "Input organik masih rendah.", recommendation: "Susun roadmap substitusi input organik untuk sertifikasi organik.", priority: "Sedang", pic: "Agri-Input" },
    ...(completeness !== null && completeness < 90 ? [{ finding: `Kelengkapan data karbon ${nf(completeness, 0)}%.`, recommendation: "Lengkapi pengukuran DBH & luas per blok untuk akurasi neraca.", priority: "Sedang" as const, pic: "Field · 11" }] : []),
  ];

  return {
    meta: await baseMeta(ctx, "Laporan Sustainability",
      "Capaian dampak lingkungan: karbon, sertifikasi/kepatuhan, ketertelusuran, biodiversitas.",
      "Carbon Accounting (IPCC Tier 1), registri sertifikasi, traceability, data agroforestri.",
      "Angka karbon memakai koefisien IPCC Tier 1 yang masih perlu validasi faktor lokal."),
    indicators, insights,
  };
}
