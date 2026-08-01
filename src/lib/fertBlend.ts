/**
 * Terjemahkan TARGET HARA rekomendasi (g/pohon) → DOSIS PRODUK PUPUK (g/pohon).
 *
 * Rekomendasi menyebut kebutuhan hara murni (N, P₂O₅, K₂O, MgO, S). Di lapangan
 * yang dibeli adalah PRODUK (Urea, SP-36, KCl/KNO₃/ZK, Dolomit). Modul ini
 * membagi target hara dengan kadar hara tiap produk → berapa gram produk per
 * pohon. Contoh: K₂O 500 g dengan sumber KNO₃ (46% K₂O) → 500 / 0,46 ≈ 1.087 g
 * KNO₃ per pohon.
 *
 * CATATAN kejujuran: ini dekomposisi per-hara sederhana. Bila sumber K = KNO₃
 * (mengandung N) atau ZK (mengandung S), kontribusinya DIKURANGI dari kebutuhan
 * Urea / ZA agar tidak dobel. Tetap provisional sampai terkalibrasi (docs/09).
 */

// Kadar hara produk (fraksi berat).
const CONTENT = {
  UREA: { n: 0.46 },
  SP36: { p2o5: 0.36 },
  KCl: { k2o: 0.60 },
  KNO3: { k2o: 0.46, n: 0.13 },
  K2SO4: { k2o: 0.50, s: 0.18 },
  DOLOMIT: { mgo: 0.18 },
  ZA: { n: 0.21, s: 0.24 },
} as const;

export const K_SOURCE_LABEL: Record<string, string> = {
  KCl: "KCl", KNO3: "KNO₃", K2SO4: "ZK (K₂SO₄)",
};

export type BlendLine = {
  product: string;   // nama produk pupuk
  amountG: number;   // gram per pohon (per tahun)
  supplies: string;  // hara yang disuplai (untuk keterangan)
};

/**
 * Hitung dosis produk (g/pohon) dari target hara (g/pohon).
 * `dose*` = target hara murni; `kSource` = sumber K terpilih.
 */
export function computeBlend(input: {
  doseN: number | null; doseP2o5: number | null; doseK2o: number | null;
  doseMgo: number | null; doseS: number | null; kSource: string | null;
}): BlendLine[] {
  const { doseN, doseP2o5, doseK2o, doseMgo, doseS, kSource } = input;
  const out: BlendLine[] = [];
  let nFromK = 0, sFromK = 0;

  // Sumber K → produk K
  if (doseK2o && kSource && kSource in K_SOURCE_LABEL) {
    const c = CONTENT[kSource as keyof typeof CONTENT] as { k2o: number; n?: number; s?: number };
    const kProduct = doseK2o / c.k2o;
    if (kSource === "KNO3" && c.n) nFromK = kProduct * c.n;
    if (kSource === "K2SO4" && c.s) sFromK = kProduct * c.s;
    const extra = kSource === "KNO3" ? " · juga suplai N" : kSource === "K2SO4" ? " · juga suplai S" : "";
    out.push({ product: K_SOURCE_LABEL[kSource], amountG: kProduct, supplies: `K₂O${extra}` });
  }

  // N via Urea (dikurangi N dari KNO₃)
  if (doseN !== null) {
    const nNeeded = Math.max(0, doseN - nFromK);
    if (nNeeded > 0) out.push({ product: "Urea", amountG: nNeeded / CONTENT.UREA.n, supplies: "N" });
  }
  // P via SP-36
  if (doseP2o5) out.push({ product: "SP-36", amountG: doseP2o5 / CONTENT.SP36.p2o5, supplies: "P₂O₅" });
  // Mg via Dolomit
  if (doseMgo) out.push({ product: "Dolomit", amountG: doseMgo / CONTENT.DOLOMIT.mgo, supplies: "MgO" });
  // S via ZA bila belum tercukupi dari sumber K
  if (doseS !== null) {
    const sNeeded = Math.max(0, doseS - sFromK);
    if (sNeeded > 0 && kSource !== "K2SO4") out.push({ product: "ZA", amountG: sNeeded / CONTENT.ZA.s, supplies: "S · juga suplai N" });
  }
  return out;
}
