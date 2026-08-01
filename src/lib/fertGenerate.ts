/**
 * Generator rekomendasi pemupukan (docs/09). Rule-based & TRANSPARAN: setiap
 * angka disertai dasar perhitungan (`basis`) supaya bisa diaudit.
 *
 * Doktrin docs/09: tak ada dosis final tanpa kalibrasi lokal (omission plot,
 * 3–5 tahun). Karena itu keluaran generator ini SELALU provisional dan memakai
 * angka literatur hanya sebagai TITIK AWAL (docs/09 §5, §7, §11) — bukan angka
 * final untuk auditor. Aturan sumber K per fase mengikuti §6.3; faktor efisiensi
 * & konversi mengikuti §7.1.
 */

import type { Approach, Phase } from "@/lib/fertParams";

export type Crop = "DURIAN" | "COCONUT";

export type GeneratedReco = {
  doseN: number | null;
  doseP2o5: number | null;
  doseK2o: number | null;
  doseMgo: number | null;
  doseS: number | null;
  kSource: "KCl" | "K2SO4" | "KNO3";
  splitCount: number;
  basis: string[];
};

// Titik awal dosis (g/pohon/tahun) — ILUSTRATIF, wajib dikalibrasi lokal.
// Kelapa: pengambil K sangat besar. Durian: K naik tajam pada fase generatif.
const BASE: Record<Crop, Record<Phase, { n: number; p: number; k: number; mg: number; s: number | null }>> = {
  COCONUT: {
    vegetatif: { n: 320, p: 200, k: 520, mg: 150, s: null },
    generatif: { n: 500, p: 300, k: 1000, mg: 300, s: null },
    pemulihan: { n: 400, p: 250, k: 800, mg: 220, s: null },
  },
  DURIAN: {
    vegetatif: { n: 600, p: 300, k: 500, mg: 120, s: null },
    generatif: { n: 400, p: 350, k: 820, mg: 160, s: 60 },
    pemulihan: { n: 520, p: 260, k: 700, mg: 130, s: null },
  },
};

// Sumber K per komoditas & fase (docs/09 §6.3).
function pickKSource(crop: Crop, phase: Phase): "KCl" | "K2SO4" | "KNO3" {
  if (crop === "COCONUT") return "KCl"; // kelapa butuh Cl (von Uexküll 1990)
  if (phase === "generatif") return "K2SO4"; // mutu buah → sulfat
  if (phase === "pemulihan") return "KNO3"; // K + N pemulihan tajuk
  return "KCl"; // durian vegetatif: ekonomis bila tak salin
}

function splitByPhase(phase: Phase): number {
  return phase === "generatif" ? 4 : phase === "pemulihan" ? 2 : 3;
}

const round10 = (v: number) => Math.max(0, Math.round(v / 10) * 10);
const numOf = (p: Record<string, string | number>, k: string): number | null => {
  const v = p[k];
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * Hasilkan rekomendasi provisional dari parameter sesuai pendekatan.
 * @param params nilai parameter (kode dari FERT_PARAMS[approach]).
 */
export function generateRecommendation(
  crop: Crop,
  phase: Phase,
  approach: Approach,
  params: Record<string, string | number>,
): GeneratedReco {
  const base = BASE[crop][phase];
  let n = base.n, p = base.p, k = base.k, mg = base.mg;
  let s = base.s;
  const basis: string[] = [];
  const cropLabel = crop === "COCONUT" ? "kelapa" : "durian";
  const phaseLabelId = phase === "vegetatif" ? "vegetatif/TBM" : phase === "generatif" ? "generatif" : "pemulihan pasca-panen";

  basis.push(
    `Titik awal ${cropLabel} fase ${phaseLabelId}: N ${base.n}, P₂O₅ ${base.p}, K₂O ${base.k}, MgO ${base.mg} g/pohon/th (ilustratif — docs/09 §7, wajib kalibrasi lokal).`,
  );

  if (approach === "uji_tanah") {
    const kdd = numOf(params, "k_dd");
    const pav = numOf(params, "p_tersedia");
    const corg = numOf(params, "c_organik");
    const mgdd = numOf(params, "mg_dd");
    const ph = numOf(params, "ph_h2o");
    const al = numOf(params, "al_dd");
    if (kdd !== null) {
      if (kdd < 0.3) { k *= 1.3; basis.push(`K-dd ${kdd} cmol/kg tergolong rendah → dosis K₂O dinaikkan 30%.`); }
      else if (kdd > 0.6) { k *= 0.8; basis.push(`K-dd ${kdd} cmol/kg tergolong tinggi → dosis K₂O diturunkan 20%.`); }
    }
    if (pav !== null) {
      if (pav < 10) { p *= 1.3; basis.push(`P-tersedia ${pav} ppm rendah → dosis P₂O₅ dinaikkan 30%.`); }
      else if (pav > 20) { p *= 0.8; basis.push(`P-tersedia ${pav} ppm tinggi → dosis P₂O₅ diturunkan 20%.`); }
    }
    if (corg !== null && corg < 1.0) { n *= 1.2; basis.push(`C-organik ${corg}% rendah → mineralisasi N kecil → dosis N dinaikkan 20%.`); }
    if (mgdd !== null && mgdd < 0.8) { mg *= 1.2; basis.push(`Mg-dd ${mgdd} cmol/kg rendah → dosis MgO dinaikkan 20%.`); }
    if ((ph !== null && ph < 4.8) || (al !== null && al > 1.0)) {
      basis.push(`pH/Al kritis (pH ${ph ?? "?"}, Al ${al ?? "?"}) → tambahkan amelioran: dolomit/kapur sebelum pemupukan (docs/09 §2). Al tinggi meracuni akar durian.`);
    }
    basis.push("Pendekatan uji tanah utamanya untuk penetapan amelioran; dosis hara sebaiknya dikonfirmasi analisis daun.");
  }

  if (approach === "analisis_jaringan") {
    // Ambang kecukupan PROVISIONAL — tabel kadar kritis docs/09 §3.3 sengaja
    // dikosongkan; nilai ini titik awal & wajib diganti sumber primer lokal.
    const thr = crop === "COCONUT"
      ? { n: 1.8, p: 0.11, k: 0.8, mg: 0.2 }
      : { n: 1.8, p: 0.12, k: 1.0, mg: 0.25 };
    const adj = (leaf: number | null, cur: number, t: number, name: string) => {
      if (leaf === null) return cur;
      if (leaf < t) { basis.push(`${name} daun ${leaf}% < ambang ${t}% → dinaikkan 30%.`); return cur * 1.3; }
      basis.push(`${name} daun ${leaf}% ≥ ambang ${t}% → cukup, ditahan/diturunkan 15%.`);
      return cur * 0.85;
    };
    n = adj(numOf(params, "daun_n"), n, thr.n, "N");
    p = adj(numOf(params, "daun_p"), p, thr.p, "P");
    k = adj(numOf(params, "daun_k"), k, thr.k, "K");
    mg = adj(numOf(params, "daun_mg"), mg, thr.mg, "Mg");
    const cl = numOf(params, "daun_cl");
    if (crop === "COCONUT" && cl !== null && cl < 0.25) {
      basis.push(`Cl daun ${cl}% < 0,25% (kritis, von Uexküll 1990) → pastikan sumber K = KCl dan pertimbangkan garam (NaCl).`);
    }
    basis.push("Ambang kecukupan bersifat provisional (docs/09 §3.3 dikosongkan) — ganti dengan kadar kritis lokal.");
  }

  if (approach === "neraca_hara") {
    const target = numOf(params, "target_hasil");
    const aktual = numOf(params, "hasil_aktual");
    const ref = crop === "COCONUT" ? 2.5 : 10; // hasil acuan (ton/ha/th) — ilustratif
    if (target !== null && target > 0) {
      const scale = Math.min(1.6, Math.max(0.6, target / ref));
      n *= scale; p *= scale; k *= scale; mg *= scale; if (s !== null) s *= scale;
      basis.push(`Neraca hara: dosis diskalakan dari target hasil ${target} vs acuan ${ref} ton/ha/th → faktor ${scale.toFixed(2)} (docs/09 §7.1).`);
    }
    if (aktual !== null && target !== null && aktual < target) {
      basis.push(`Hasil aktual ${aktual} < target ${target} — periksa faktor pembatas (OPT/akar) sebelum menaikkan dosis (docs/09 §4 P10).`);
    }
    basis.push("Efisiensi serapan yang diasumsikan (N 50%, P 20%, K 60%) hanya titik awal §7.1 — kalibrasi lewat omission plot.");
  }

  const kSource = pickKSource(crop, phase);
  const splitCount = splitByPhase(phase);
  basis.push(`Sumber K = ${kSource} untuk ${cropLabel} fase ${phaseLabelId} (docs/09 §6.3).`);
  basis.push(`Aplikasi dibagi ${splitCount} split/tahun mengikuti fenologi & curah hujan (docs/09 §7.3).`);

  return {
    doseN: round10(n),
    doseP2o5: round10(p),
    doseK2o: round10(k),
    doseMgo: round10(mg),
    doseS: s === null ? null : round10(s),
    kSource,
    splitCount,
    basis,
  };
}
