import { rlsQuery, type RlsContext } from "@/lib/db";
import { latestCarbonRun, listCertPrograms } from "@/lib/repo/sustainability";
import type { IndStatus } from "./types";

export type SustKpi = { key: "carbon" | "complete" | "cert" | "trace"; label: string; value: string; unit?: string; note?: string; tone?: "default" | "pos" | "neg" };
export type CertReady = { name: string; pct: number };

export type SustDashboard = {
  kpis: SustKpi[];
  carbon: { gross: number | null; sequestration: number | null; net: number | null };
  hasCarbon: boolean;
  mapStatus: IndStatus;
  certReady: CertReady[];
  certifiedCount: number;
  landHistoryDone: number;
  landHistoryTotal: number;
  organic: { organic: number; synthetic: number; total: number } | null;
  insights: { title: string; text: string; tone: "emerald" | "sky" | "amber"; action: string }[];
};

const STANDARDS = [
  "ISPO 2020", "RSPO P&C 2018", "RSPO SCCS 2020", "ISCC EU", "ISCC PLUS",
  "Rainforest Alliance 2020", "SA 8000:2014", "OHSAS 18001 / ISO 45001", "ISO 14001:2015",
];
const EMPTY = "—";
const nf = (v: number, d = 0) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: d }).format(v);

export async function sustainabilityDashboardView(ctx: RlsContext): Promise<SustDashboard> {
  const [run, programs, org] = await Promise.all([
    latestCarbonRun(ctx),
    listCertPrograms(ctx),
    rlsQuery<{ organic: string | null; total: string | null }>(ctx, `
      SELECT COALESCE(SUM(fa.total_quantity) FILTER (WHERE ft.kind='organic'),0)::text AS organic,
             COALESCE(SUM(fa.total_quantity),0)::text AS total
        FROM app.fertilizer_applications fa JOIN app.fertilizer_types ft ON ft.id=fa.fertilizer_type_id
       WHERE fa.approval_status='approved'`),
  ]);

  const net = run?.netBalanceTco2e ?? null;
  const gross = run?.grossEmissionTco2e ?? null;
  const seq = run?.sequestrationTco2e ?? null;
  const completeness = run?.dataCompletenessPct ?? null;
  const hasCarbon = run !== null;

  const readinessByName = new Map(programs.map((p) => [p.standardName, p.avgReadiness]));
  const certReady: CertReady[] = STANDARDS.map((s) => ({ name: s, pct: Math.round(readinessByName.get(s) ?? 0) }));
  const certifiedCount = programs.filter((p) => (p.avgReadiness ?? 0) >= 100).length;

  const orgTon = org[0] ? Number(org[0].organic) : 0;
  const totTon = org[0] ? Number(org[0].total) : 0;
  const organic = totTon > 0 ? { organic: orgTon, synthetic: totTon - orgTon, total: totTon } : null;

  const mapStatus: IndStatus = net === null ? "belum" : net >= 0 ? "ok" : "perhatian";
  const tco2e = (v: number | null) => (v === null ? EMPTY : nf(v, 2));

  const kpis: SustKpi[] = [
    { key: "carbon", label: "Neraca Karbon", value: tco2e(net), unit: net === null ? undefined : "tCO₂e", note: net === null ? "belum ada run" : net >= 0 ? "Net Sink" : "Net Emitter", tone: net === null ? "default" : net >= 0 ? "pos" : "neg" },
    { key: "complete", label: "Kelengkapan Karbon", value: completeness === null ? EMPTY : nf(completeness, 0), unit: completeness === null ? undefined : "%", note: "Data lengkap" },
    { key: "cert", label: "Sertifikasi", value: `${certifiedCount}/${STANDARDS.length}`, note: "Standar siap" },
    { key: "trace", label: "Traceability", value: "Aktif", note: "Semua rantai terpetakan", tone: "pos" },
  ];

  const insights: { title: string; text: string; tone: "emerald" | "sky" | "amber"; action: string }[] = [
    { title: "Perbarui Faktor Emisi Lokal", text: "Gunakan faktor emisi lokal untuk pupuk, bahan bakar, dan limbah agar neraca karbon lebih akurat.", tone: "emerald", action: "Tinjau Sekarang" },
    { title: "Lengkapi Data DBH", text: "Data Diameter at Breast Height (DBH) di 7 blok belum lengkap — tingkatkan akurasi serapan karbon.", tone: "sky", action: "Lengkapi Data" },
    { title: "Lengkapi Bukti Riwayat Lahan", text: "Kumpulkan & unggah dokumen bukti riwayat lahan untuk memenuhi persyaratan K1–K7.", tone: "amber", action: "Lihat Checklist" },
    { title: "Roadmap Input Organik", text: "Tingkatkan penggunaan input organik bertahap menuju target ≥ 30% pada akhir periode.", tone: "emerald", action: "Lihat Rekomendasi" },
  ];

  return {
    kpis, carbon: { gross, sequestration: seq, net }, hasCarbon, mapStatus,
    certReady, certifiedCount, landHistoryDone: 0, landHistoryTotal: 7,
    organic, insights,
  };
}
