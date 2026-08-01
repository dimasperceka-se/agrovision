/**
 * Skema parameter pemupukan (docs/09). Metadata referensi — bukan data tenant —
 * jadi didefinisikan sebagai konstanta yang bisa dipakai klien maupun server.
 *
 * Pemetaan pendekatan → set parameter (persis permintaan UX):
 *   uji_tanah         → Parameter Tanah            (docs/09 §2)
 *   analisis_jaringan → Parameter Jaringan (daun)  (docs/09 §3)
 *   neraca_hara       → Parameter Tanaman & Agronomi (docs/09 §4)
 */

export type Approach = "uji_tanah" | "analisis_jaringan" | "neraca_hara";
export type Phase = "vegetatif" | "generatif" | "pemulihan";

export type FertField = {
  code: string;
  label: string;
  unit?: string;
  kind: "number" | "text" | "select";
  options?: string[];
  hint?: string;
};

export const APPROACHES: { value: Approach; label: string; paramTitle: string; role: string }[] = [
  { value: "uji_tanah", label: "Uji Tanah", paramTitle: "Parameter Tanah", role: "Penetapan amelioran (kapur, dolomit, bahan organik)" },
  { value: "analisis_jaringan", label: "Analisis Jaringan", paramTitle: "Parameter Jaringan (Daun)", role: "Diagnosis hara pembatas (utama untuk tanaman tahunan)" },
  { value: "neraca_hara", label: "Neraca Hara", paramTitle: "Parameter Tanaman & Agronomi", role: "Penetapan dosis (hara terangkut + imobilisasi − suplai)" },
];

export const PHASES: { value: Phase; label: string; hint: string }[] = [
  { value: "vegetatif", label: "Vegetatif / TBM", hint: "Pertumbuhan tajuk; KCl ekonomis bila tanah tidak salin" },
  { value: "generatif", label: "Generatif (pembungaan & pembuahan)", hint: "Mutu buah jadi prioritas; K2SO4 atau KNO3" },
  { value: "pemulihan", label: "Pemulihan pasca-panen", hint: "KNO3 memasok K + N untuk pemulihan tajuk" },
];

export const K_SOURCES = ["KCl", "K2SO4", "KNO3"] as const;

const TEKSTUR = ["Pasir", "Lempung berpasir", "Lempung", "Lempung berliat", "Liat berdebu", "Liat"];
const DRAINASE = ["Baik", "Agak terhambat", "Terhambat", "Sangat terhambat", "Berlebih"];
const OPT_STATUS = ["Tidak ada", "Ringan", "Sedang", "Berat"];

// §2.1 — parameter tanah wajib (T1–T16).
const SOIL: FertField[] = [
  { code: "ph_h2o", label: "pH H₂O", kind: "number", hint: "Kebutuhan kapur; ketersediaan P" },
  { code: "ph_kcl", label: "pH KCl", kind: "number", hint: "Kemasaman cadangan" },
  { code: "c_organik", label: "C-organik", unit: "%", kind: "number" },
  { code: "n_total", label: "N-total", unit: "%", kind: "number" },
  { code: "p_tersedia", label: "P-tersedia (Bray-1 / Olsen)", unit: "ppm", kind: "number" },
  { code: "k_dd", label: "K dapat ditukar", unit: "cmol(+)/kg", kind: "number" },
  { code: "ca_dd", label: "Ca dapat ditukar", unit: "cmol(+)/kg", kind: "number" },
  { code: "mg_dd", label: "Mg dapat ditukar", unit: "cmol(+)/kg", kind: "number" },
  { code: "na_dd", label: "Na dapat ditukar", unit: "cmol(+)/kg", kind: "number" },
  { code: "ktk", label: "KTK", unit: "cmol(+)/kg", kind: "number" },
  { code: "kb", label: "Kejenuhan basa (KB)", unit: "%", kind: "number" },
  { code: "al_dd", label: "Al dapat ditukar", unit: "cmol(+)/kg", kind: "number", hint: "Kritis — Al tinggi meracuni akar (terutama durian)" },
  { code: "tekstur", label: "Tekstur", kind: "select", options: TEKSTUR },
  { code: "dhl_ec", label: "DHL / EC", unit: "dS/m", kind: "number", hint: "Risiko salinitas (kelapa pesisir)" },
  { code: "kedalaman_efektif", label: "Kedalaman efektif", unit: "cm", kind: "number" },
  { code: "drainase", label: "Drainase", kind: "select", options: DRAINASE },
  // §2.2 sangat disarankan — Cl & bobot isi wajib untuk konversi/logistik.
  { code: "cl_tanah", label: "Cl tanah", unit: "ppm", kind: "number", hint: "Wajib kedua komoditas (docs/09 §6)" },
  { code: "bobot_isi", label: "Bobot isi (bulk density)", unit: "g/cm³", kind: "number", hint: "Konversi ppm → kg/ha" },
];

// §3.2 — konsentrasi hara daun.
const TISSUE: FertField[] = [
  { code: "organ", label: "Organ indikator", kind: "text", hint: "Kelapa: pelepah ke-14; durian: daun matang tunas non-berbuah" },
  { code: "fase_sampling", label: "Fase saat sampling", kind: "text", hint: "Durian: hindari pembungaan/pengisian buah" },
  { code: "daun_n", label: "N daun", unit: "%", kind: "number" },
  { code: "daun_p", label: "P daun", unit: "%", kind: "number" },
  { code: "daun_k", label: "K daun", unit: "%", kind: "number" },
  { code: "daun_ca", label: "Ca daun", unit: "%", kind: "number" },
  { code: "daun_mg", label: "Mg daun", unit: "%", kind: "number" },
  { code: "daun_s", label: "S daun", unit: "%", kind: "number" },
  { code: "daun_cl", label: "Cl daun", unit: "%", kind: "number", hint: "Kelapa: kecukupan (kritis <0,25%); durian: akumulasi" },
  { code: "daun_b", label: "B daun", unit: "ppm", kind: "number" },
  { code: "daun_cu", label: "Cu daun", unit: "ppm", kind: "number" },
  { code: "daun_zn", label: "Zn daun", unit: "ppm", kind: "number" },
  { code: "daun_mn", label: "Mn daun", unit: "ppm", kind: "number" },
  { code: "daun_fe", label: "Fe daun", unit: "ppm", kind: "number" },
];

// §4 — parameter tanaman & agronomi (P1–P11).
const PLANT: FertField[] = [
  { code: "umur_tanaman", label: "Umur tanaman / tahun tanam", unit: "tahun", kind: "number" },
  { code: "fase_pertumbuhan", label: "Fase pertumbuhan", kind: "select", options: ["TBM", "TM awal", "TM puncak", "TM tua"] },
  { code: "varietas", label: "Varietas / kultivar", kind: "text", hint: "mis. Kelapa Dalam / Hibrida; Musang King / Montong" },
  { code: "populasi_ha", label: "Populasi per ha", unit: "pohon/ha", kind: "number", hint: "Konversi g/pohon ↔ kg/ha" },
  { code: "hasil_aktual", label: "Hasil aktual", unit: "ton/ha/th", kind: "number", hint: "Basis hara terangkut" },
  { code: "target_hasil", label: "Target hasil", unit: "ton/ha/th", kind: "number", hint: "Basis kebutuhan" },
  { code: "pelepah_aktif", label: "Jumlah pelepah / daun aktif", unit: "buah", kind: "number" },
  { code: "lingkar_batang", label: "Lingkar batang / diameter tajuk", unit: "cm/m", kind: "number" },
  { code: "gejala_defisiensi", label: "Gejala defisiensi visual", kind: "text", hint: "Verifikasi silang hasil lab" },
  { code: "status_opt", label: "Status OPT (busuk akar, Phytophthora, dsb.)", kind: "select", options: OPT_STATUS },
  { code: "populasi_hidup_pct", label: "Populasi hidup vs standar", unit: "%", kind: "number" },
];

export const FERT_PARAMS: Record<Approach, FertField[]> = {
  uji_tanah: SOIL,
  analisis_jaringan: TISSUE,
  neraca_hara: PLANT,
};

/** Kumpulan seluruh code param yang sah (untuk validasi server). */
export const ALL_PARAM_CODES = new Set(
  Object.values(FERT_PARAMS).flatMap((fs) => fs.map((f) => f.code)),
);

export const approachLabel = (a: string) => APPROACHES.find((x) => x.value === a)?.label ?? a;
export const phaseLabel = (p: string) => PHASES.find((x) => x.value === p)?.label ?? p;
