/**
 * DATA DEMO / SINTETIS untuk peta Traceability (transactional + emission).
 *
 * AgroVision belum punya entitas rantai-pasok hilir (pengepul/pengolahan/ekspor)
 * beserta koordinatnya. Sampai data riil tersedia, peta memakai dataset demo di
 * bawah — DITANDAI is_demo — agar bentuk & interaksi peta bisa dibangun & diuji.
 * Konteks: kelapa + durian, wilayah Bengkulu (Sumatra), hilir ke Pelabuhan Pulau
 * Baai. Angka bukan hasil pengukuran; jangan dipakai untuk klaim.
 *
 * Model mengikuti referensi supply-chain-emission: graf aktor (node) + transaksi
 * (edge). Emisi per-aktor mengikuti kerangka mirip CoolFarmTool (per sumber + GHG).
 */

export const TRACE_IS_DEMO = true;

export type ActorType = "producer" | "collector" | "processor" | "exporter";
export type Commodity = "Kelapa" | "Durian";

export type EmissionSource = { source: string; value: number }; // value bisa negatif (serapan)
export type GhgSplit = { category: "CO₂" | "N₂O" | "CH₄"; value: number };

export type Emission = {
  totalCo2eq: number; // kg CO₂e
  sources: EmissionSource[];
  ghg: GhgSplit[];
};

export type Actor = {
  id: string;
  displayId: string;
  name: string;
  type: ActorType;
  lat: number;
  lng: number;
  district: string;
  commodity?: Commodity;
  details: Record<string, string | number>;
  emission: Emission;
};

export type FlowTx = {
  id: string;
  from: string; // actor id
  to: string; // actor id
  commodity: Commodity;
  grossKg: number;
  date: string; // ISO
};

export const ACTOR_META: Record<ActorType, { label: string; color: string; radius: number; icon: string }> = {
  producer: { label: "Petani", color: "#2bbe72", radius: 6, icon: "🌴" },
  collector: { label: "Pengepul", color: "#e28d00", radius: 8, icon: "📦" },
  processor: { label: "Pengolahan", color: "#1f4788", radius: 9, icon: "🏭" },
  exporter: { label: "Ekspor / Pelabuhan", color: "#5c0e16", radius: 11, icon: "🚢" },
};

// Warna arus per pasangan tier (from→to). Dipilih terang & kontras tinggi agar
// jelas di atas citra satelit (hijau), dengan casing gelap di bawahnya.
export const FLOW_COLORS: Record<string, string> = {
  "producer-collector": "#38bdf8", // sky terang
  "collector-processor": "#fbbf24", // amber terang
  "processor-exporter": "#f472b6", // pink terang
};

// Ramp intensitas emisi (rendah→tinggi) — dipakai untuk warna node & legenda.
export const EMISSION_RAMP: [number, string][] = [
  [0, "#2bbe72"],
  [300, "#f5e653"],
  [800, "#f5a623"],
  [2000, "#d0021b"],
  [3400, "#8b0000"],
];

// Bobot sumber emisi per tipe aktor (menjumlah ~1.0; negatif = serapan karbon).
const SOURCE_SHAPE: Record<ActorType, { source: string; w: number }[]> = {
  producer: [
    { source: "Pupuk", w: 0.5 },
    { source: "Transportasi kebun", w: 0.28 },
    { source: "Perlindungan tanaman", w: 0.22 },
    { source: "Energi lapangan", w: 0.1 },
    { source: "Pengelolaan residu", w: -0.03 },
    { source: "Perubahan stok karbon", w: -0.07 }, // agroforestri = serapan
  ],
  collector: [
    { source: "Transportasi angkut", w: 0.62 },
    { source: "Energi gudang", w: 0.28 },
    { source: "Susut & penanganan", w: 0.1 },
  ],
  processor: [
    { source: "Energi pengolahan", w: 0.55 },
    { source: "Transportasi masuk", w: 0.25 },
    { source: "Air limbah", w: 0.12 },
    { source: "Kemasan", w: 0.08 },
  ],
  exporter: [
    { source: "Transportasi laut", w: 0.6 },
    { source: "Energi pelabuhan", w: 0.28 },
    { source: "Bongkar muat", w: 0.12 },
  ],
};

function mkEmission(total: number, type: ActorType): Emission {
  const sources = SOURCE_SHAPE[type].map((s) => ({ source: s.source, value: Math.round(s.w * total) }));
  const ghg: GhgSplit[] = [
    { category: "CO₂", value: Math.round(total * 0.72) },
    { category: "N₂O", value: Math.round(total * 0.2) },
    { category: "CH₄", value: Math.round(total * 0.08) },
  ];
  return { totalCo2eq: total, sources, ghg };
}

// ── Aktor (koordinat wilayah Bengkulu, Sumatra) ─────────────────────────────
export const ACTORS: Actor[] = [
  // Tier 0 — petani kelapa & durian
  mkProducer("P001", "F-KLP-001", "Kel. Tani Sungai Hitam", -3.62, 102.52, "Kelapa", { luas: "2,4 ha", volume: "1,8 ton" }, 180),
  mkProducer("P002", "F-DRN-002", "Kel. Tani Bukit Barisan", -3.68, 102.585, "Durian", { luas: "1,6 ha", volume: "0,9 ton" }, 120),
  mkProducer("P003", "F-KLP-003", "Kel. Tani Pondok Kelapa", -3.75, 102.48, "Kelapa", { luas: "3,1 ha", volume: "2,6 ton" }, 240),
  mkProducer("P004", "F-DRN-004", "Kel. Tani Taba Penanjung", -3.72, 102.625, "Durian", { luas: "2,0 ha", volume: "1,2 ton" }, 160),
  mkProducer("P005", "F-KLP-005", "Kel. Tani Pagar Dewa", -3.98, 102.55, "Kelapa", { luas: "2,8 ha", volume: "2,1 ton" }, 205),
  mkProducer("P006", "F-DRN-006", "Kel. Tani Air Sebakul", -4.05, 102.60, "Durian", { luas: "1,4 ha", volume: "0,8 ton" }, 95),
  mkProducer("P007", "F-KLP-007", "Kel. Tani Kembang Seri", -4.10, 102.48, "Kelapa", { luas: "3,5 ha", volume: "3,0 ton" }, 285),
  mkProducer("P008", "F-DRN-008", "Kel. Tani Sukaraja", -3.95, 102.44, "Durian", { luas: "2,2 ha", volume: "1,4 ton" }, 175),
  // Tier 1 — pengepul
  mkNode("C001", "COL-001", "UD Pengepul Nala", "collector", -3.70, 102.45, "Bengkulu Tengah", { perusahaan: "UD Nala Jaya", kapasitas: "8 ton/mgg", komoditas: "Kelapa, Durian" }, 720),
  mkNode("C002", "COL-002", "UD Pengepul Seluma", "collector", -4.02, 102.50, "Seluma", { perusahaan: "UD Seluma Tani", kapasitas: "6 ton/mgg", komoditas: "Kelapa, Durian" }, 640),
  // Tier 2 — pengolahan (kopra/VCO + packing durian)
  mkNode("M001", "PRC-001", "Pabrik Kopra & VCO Bengkulu", "processor", -3.82, 102.31, "Kota Bengkulu", { perusahaan: "PT Kelapa Sumatra", kapasitas: "20 ton/hari", produk: "Kopra, VCO, Durian beku" }, 2100),
  // Tier 3 — ekspor / pelabuhan
  mkNode("E001", "EXP-001", "Pelabuhan Pulau Baai", "exporter", -3.9167, 102.2833, "Kota Bengkulu", { perusahaan: "Terminal Ekspor Pulau Baai", tujuan: "Ekspor · domestik", kapasitas: "5.000 ton" }, 3300),
];

function mkProducer(
  id: string, displayId: string, name: string, lat: number, lng: number,
  commodity: Commodity, extra: Record<string, string | number>, total: number,
): Actor {
  return {
    id, displayId, name, type: "producer", lat, lng, district: "Bengkulu", commodity,
    details: { Komoditas: commodity, ...extra, Transaksi: 1 },
    emission: mkEmission(total, "producer"),
  };
}
function mkNode(
  id: string, displayId: string, name: string, type: ActorType, lat: number, lng: number,
  district: string, extra: Record<string, string | number>, total: number,
): Actor {
  return { id, displayId, name, type, lat, lng, district, details: extra, emission: mkEmission(total, type) };
}

// ── Transaksi (edge) ────────────────────────────────────────────────────────
export const FLOWS: FlowTx[] = [
  tx("TX01", "P001", "C001", "Kelapa", 1800, "2026-06-04"),
  tx("TX02", "P002", "C001", "Durian", 900, "2026-06-05"),
  tx("TX03", "P003", "C001", "Kelapa", 2600, "2026-06-07"),
  tx("TX04", "P004", "C001", "Durian", 1200, "2026-06-08"),
  tx("TX05", "P005", "C002", "Kelapa", 2100, "2026-06-06"),
  tx("TX06", "P006", "C002", "Durian", 800, "2026-06-09"),
  tx("TX07", "P007", "C002", "Kelapa", 3000, "2026-06-10"),
  tx("TX08", "P008", "C002", "Durian", 1400, "2026-06-11"),
  tx("TX09", "C001", "M001", "Kelapa", 6500, "2026-06-14"),
  tx("TX10", "C002", "M001", "Kelapa", 7300, "2026-06-15"),
  tx("TX11", "M001", "E001", "Kelapa", 12800, "2026-06-20"),
];
function tx(id: string, from: string, to: string, commodity: Commodity, grossKg: number, date: string): FlowTx {
  return { id, from, to, commodity, grossKg, date };
}

export function actorById(id: string): Actor | undefined {
  return ACTORS.find((a) => a.id === id);
}

/** Ringkasan agregat untuk panel statistik. */
export function traceStats() {
  const byType = (t: ActorType) => ACTORS.filter((a) => a.type === t).length;
  const totalCo2eq = ACTORS.reduce((s, a) => s + a.emission.totalCo2eq, 0);
  const totalKg = FLOWS.filter((f) => actorById(f.from)?.type === "producer").reduce((s, f) => s + f.grossKg, 0);
  return {
    producers: byType("producer"), collectors: byType("collector"),
    processors: byType("processor"), exporters: byType("exporter"),
    transactions: FLOWS.length, totalCo2eq, totalKg,
  };
}
