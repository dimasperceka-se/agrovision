import { rlsQuery, type RlsContext } from "@/lib/db";
import { listSeedStock } from "@/lib/repo/operational";

/**
 * Data untuk Dashboard Operasional (mockup 1): KPI, Perjalanan Budidaya (5 tahap),
 * timeline aktivitas, insight. Semua dari data nyata; kosong = "—" (bukan 0).
 */
const nf = (v: number, d = 0) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: d }).format(v);
const EMPTY = "—";

export type StageStatus = "ok" | "perhatian" | "kritis" | "belum";
export type ActIcon = "weeding" | "fert" | "pruning" | "spray" | "harvest";
export type Kpi = { key: string; label: string; value: string; unit?: string; note?: string; icon: "seedprep" | "survival" | "harvest" | "data" };
export type JourneyStage = { name: string; icon: "map" | "prep" | "seed" | "grow" | "harvest"; status: StageStatus; metrics: { label: string; value: string }[]; alert?: { label: string; value: string } };
export type TimelineRow =
  | { activity: string; icon: ActIcon; startPct: number; widthPct: number; state: "selesai" | "berjalan" | "planned"; empty?: false }
  | { activity: string; icon: ActIcon; empty: true };
export type OpInsight = { title: string; text: string; priority: "Tinggi" | "Menengah" | "Rendah"; icon: "water" | "k" | "data" | "leaf" };

export type OpDashboardView = {
  kpis: Kpi[];
  journey: JourneyStage[];
  timelineLabel: string;
  timeline: TimelineRow[];
  insights: OpInsight[];
  blocks: { code: string; status: StageStatus }[];
};

const dayMs = 86400000;

export async function operationalDashboardView(ctx: RlsContext): Promise<OpDashboardView> {
  const [agg] = await rlsQuery<Record<string, string | null>>(ctx, `
    SELECT (SELECT count(*) FROM app.blocks WHERE archived_at IS NULL) AS blocks,
           (SELECT COALESCE(SUM(area_ha),0) FROM app.blocks WHERE archived_at IS NULL) AS area,
           (SELECT COALESCE(SUM(quantity_ton),0) FROM app.harvest_records WHERE approval_status='approved') AS harvest_ton,
           (SELECT COALESCE(SUM(quantity_ton) FILTER (WHERE grade='A'),0) FROM app.harvest_records WHERE approval_status='approved') AS grade_a,
           (SELECT count(*) FROM app.weeding_records WHERE approval_status='approved') AS weeding,
           (SELECT count(*) FROM app.fertilizer_applications WHERE approval_status='approved') AS fert,
           (SELECT COALESCE(SUM(tree_count),0) FROM app.pruning_records WHERE approval_status='approved') AS pruning,
           (SELECT count(*) FROM app.spraying_records WHERE approval_status='approved') AS spray,
           (SELECT count(*) FROM app.land_suitability_assessments WHERE approval_status='approved') AS suit,
           (SELECT string_agg(DISTINCT
              CASE WHEN score_durian >= 75 OR score_coconut >= 75 THEN 'S1'
                   WHEN score_durian >= 50 OR score_coconut >= 50 THEN 'S2'
                   WHEN score_durian >= 25 OR score_coconut >= 25 THEN 'S3' ELSE 'N' END, ',')
              FROM app.land_suitability_assessments WHERE approval_status='approved') AS suit_class,
           (SELECT count(*) FROM app.land_preparations WHERE approval_status='approved') AS landprep,
           (SELECT AVG(CASE WHEN status='ready_to_plant' THEN 100 WHEN status='in_progress' THEN 50 ELSE 0 END)
              FROM app.land_preparations WHERE approval_status='approved') AS prep_pct,
           (SELECT data_completeness_pct FROM app.carbon_runs ORDER BY period_end DESC LIMIT 1) AS carbon_complete
  `);
  const num = (k: string) => Number(agg[k] ?? 0);
  const stock = await listSeedStock(ctx);
  const alive = stock.reduce((s, x) => s + (x.qtyAlive ?? 0), 0);
  const init = stock.reduce((s, x) => s + x.qtyInitial, 0);
  const survival = init === 0 ? null : (alive * 100) / init;
  const harvest = num("harvest_ton");
  const gradeA = Number(agg.harvest_ton) > 0 ? (num("grade_a") * 100) / harvest : null;
  const prepPct = agg.prep_pct === null ? null : Number(agg.prep_pct);
  const dataComplete = agg.carbon_complete === null ? null : Number(agg.carbon_complete);
  const suitClass = (agg.suit_class ?? "").split(",").filter(Boolean);
  const worstClass = suitClass.includes("N") ? "N" : suitClass.includes("S3") ? "S3" : suitClass.includes("S2") ? "S2" : suitClass.includes("S1") ? "S1" : null;

  const kpis: Kpi[] = [
    { key: "prep", label: "Kesiapan Tanam", value: prepPct === null ? EMPTY : nf(prepPct, 0), unit: "%", note: prepPct === null ? "Belum ada data persiapan" : "dari persiapan lahan disetujui", icon: "seedprep" },
    { key: "survival", label: "Survival Bibit", value: survival === null ? EMPTY : nf(survival, 1), unit: "%", note: survival === null ? "Belum ada inspeksi bibit" : "rata-rata seluruh batch", icon: "survival" },
    { key: "harvest", label: "Panen", value: harvest === 0 ? EMPTY : nf(harvest, 1), unit: "ton", note: harvest === 0 ? "Belum ada panen disetujui" : "kumulatif disetujui", icon: "harvest" },
    { key: "data", label: "Kelengkapan Data", value: dataComplete === null ? EMPTY : nf(dataComplete, 0), unit: "%", note: dataComplete === null ? "Belum ada run karbon" : "basis perhitungan karbon", icon: "data" },
  ];

  const suitStatus: StageStatus = worstClass === null ? "belum" : worstClass === "S1" ? "ok" : worstClass === "S2" ? "perhatian" : "kritis";
  const prepStatus: StageStatus = prepPct === null ? "belum" : prepPct >= 90 ? "ok" : prepPct >= 50 ? "perhatian" : "kritis";
  const seedStatus: StageStatus = survival === null ? "belum" : survival >= 85 ? "ok" : "perhatian";
  const cultivated = num("weeding") + num("fert") + num("spray") + num("pruning");
  const cultivateStatus: StageStatus = cultivated === 0 ? "belum" : num("fert") === 0 ? "perhatian" : "ok";
  const harvestStatus: StageStatus = harvest === 0 ? "belum" : "ok";

  const journey: JourneyStage[] = [
    { name: "1. Kesesuaian Lahan", icon: "map", status: suitStatus, metrics: [{ label: "Kelas kesesuaian", value: worstClass ?? EMPTY }, { label: "Blok dinilai", value: num("suit") === 0 ? EMPTY : nf(num("suit")) }] },
    { name: "2. Persiapan", icon: "prep", status: prepStatus, metrics: [{ label: "Kesiapan", value: prepPct === null ? EMPTY : nf(prepPct, 0) + "%" }, { label: "Blok disetujui", value: num("landprep") === 0 ? EMPTY : nf(num("landprep")) }] },
    { name: "3. Bibit", icon: "seed", status: seedStatus, metrics: [{ label: "Survival", value: survival === null ? EMPTY : nf(survival, 1) + "%" }, { label: "Batch", value: stock.length === 0 ? EMPTY : nf(stock.length) }] },
    { name: "4. Budidaya", icon: "grow", status: cultivateStatus, metrics: [{ label: "Penyiangan", value: num("weeding") === 0 ? EMPTY : nf(num("weeding")) }, { label: "Pemupukan", value: num("fert") === 0 ? EMPTY : nf(num("fert")) }, { label: "Pruning", value: num("pruning") === 0 ? EMPTY : nf(num("pruning")) + " phn" }] },
    { name: "5. Panen", icon: "harvest", status: harvestStatus, metrics: [{ label: "Total panen", value: harvest === 0 ? EMPTY : nf(harvest, 1) + " ton" }, { label: "Grade A", value: gradeA === null ? EMPTY : nf(gradeA, 0) + "%" }] },
  ];

  // Timeline aktivitas — window = rentang tanggal aktual seluruh aktivitas.
  const acts = await rlsQuery<{ act: string; mn: string | null; mx: string | null; napp: string; n: string }>(ctx, `
    SELECT act, min(d)::text AS mn, max(d)::text AS mx,
           count(*) FILTER (WHERE st='approved') AS napp, count(*) AS n FROM (
      SELECT 'weeding' AS act, weeded_on AS d, approval_status::text AS st FROM app.weeding_records
      UNION ALL SELECT 'fert', applied_on, approval_status::text FROM app.fertilizer_applications
      UNION ALL SELECT 'pruning', pruned_on, approval_status::text FROM app.pruning_records
      UNION ALL SELECT 'spray', sprayed_on, approval_status::text FROM app.spraying_records
      UNION ALL SELECT 'harvest', harvested_on, approval_status::text FROM app.harvest_records
    ) x GROUP BY act`);
  const ICONS: Record<string, ActIcon> = { weeding: "weeding", fert: "fert", pruning: "pruning", spray: "spray", harvest: "harvest" };
  const LABELS: Record<string, string> = { weeding: "Penyiangan", fert: "Pemupukan", pruning: "Pruning", spray: "Penyemprotan", harvest: "Panen" };
  const order = ["weeding", "fert", "pruning", "spray", "harvest"];
  const byAct = new Map(acts.map((a) => [a.act, a]));
  const allDates = acts.flatMap((a) => [a.mn, a.mx]).filter(Boolean) as string[];
  let winStart = 0, winEnd = 1, label = "Belum ada aktivitas";
  if (allDates.length) {
    const times = allDates.map((d) => new Date(d).getTime());
    winStart = Math.min(...times); winEnd = Math.max(...times);
    if (winEnd === winStart) winEnd = winStart + dayMs * 30;
    const fmtMon = new Intl.DateTimeFormat("id-ID", { month: "short", year: "numeric" });
    label = `${new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short" }).format(winStart)} – ${new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short" }).format(winEnd)} ${fmtMon.format(winEnd).split(" ")[1]}`;
  }
  const span = winEnd - winStart || 1;
  const timeline: TimelineRow[] = order.map((k) => {
    const a = byAct.get(k);
    if (!a || !a.mn || !a.mx) return { activity: LABELS[k], icon: ICONS[k], empty: true };
    const s = new Date(a.mn).getTime(), e = new Date(a.mx).getTime();
    const startPct = ((s - winStart) / span) * 100;
    const widthPct = Math.max(3, ((e - s) / span) * 100);
    const state = Number(a.napp) === Number(a.n) ? "selesai" : Number(a.napp) > 0 ? "berjalan" : "planned";
    return { activity: LABELS[k], icon: ICONS[k], startPct, widthPct, state };
  });

  // Status per blok (untuk peta estate) — dari kelas kesesuaian terburuk.
  const bstat = await rlsQuery<{ code: string; rank: string | null }>(ctx, `
    SELECT b.code, min(CASE WHEN lsa.score_durian >= 75 OR lsa.score_coconut >= 75 THEN 4
                            WHEN lsa.score_durian >= 50 OR lsa.score_coconut >= 50 THEN 3
                            WHEN lsa.score_durian >= 25 OR lsa.score_coconut >= 25 THEN 2 ELSE 1 END)::text AS rank
    FROM app.blocks b
    LEFT JOIN app.land_suitability_assessments lsa ON lsa.block_id = b.id AND lsa.approval_status = 'approved'
    WHERE b.archived_at IS NULL GROUP BY b.code`);
  const blocks = bstat.map((r) => ({
    code: r.code,
    status: (r.rank === null ? "belum" : Number(r.rank) >= 4 ? "ok" : Number(r.rank) === 3 ? "perhatian" : "kritis") as StageStatus,
  }));

  const insights: OpInsight[] = [];
  if (worstClass && worstClass !== "S1") insights.push({ title: "Perbaiki drainase & hara", text: `Kelas kesesuaian ${worstClass}. Perbaiki sistem drainase & pemupukan berbasis uji tanah sebelum ekspansi.`, priority: "Tinggi", icon: "water" });
  if (num("fert") === 0 && cultivated > 0) insights.push({ title: "Catat realisasi pemupukan", text: "Aktivitas budidaya berjalan namun pemupukan belum tercatat. Lengkapi agar analitik akurat.", priority: "Tinggi", icon: "k" });
  if (survival !== null && survival < 85) insights.push({ title: "Pantau batch survival rendah", text: `Survival bibit ${nf(survival, 1)}% di bawah 85%. Tinjau batch berisiko.`, priority: "Menengah", icon: "leaf" });
  if (dataComplete !== null && dataComplete < 90) insights.push({ title: "Lengkapi data modul", text: `Kelengkapan data ${nf(dataComplete, 0)}%. Lengkapi DBH & luas per blok untuk akurasi analitik.`, priority: "Menengah", icon: "data" });
  if (insights.length === 0) insights.push({ title: "Data operasional sehat", text: "Belum ada isu prioritas terdeteksi dari data terkini.", priority: "Rendah", icon: "leaf" });

  return { kpis, journey, timelineLabel: label, timeline, insights, blocks };
}
