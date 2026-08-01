"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/session";
import { saveRecommendation, deleteRecommendation } from "@/lib/repo/fertilizer";
import { FERT_PARAMS, type Approach } from "@/lib/fertParams";
import { generateRecommendation, type GeneratedReco, type Crop } from "@/lib/fertGenerate";

export type RecoState = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
  saved?: boolean;
  /** Hasil generate (belum tersimpan) untuk ditinjau lalu disimpan/dibuang. */
  generated?: {
    blockId: string;
    cropCode: Crop;
    phase: string;
    approach: Approach;
    params: Record<string, string | number>;
    recommendedAt: string;
    reco: GeneratedReco;
  };
};

const genSchema = z.object({
  blockId: z.string().uuid("Blok wajib dipilih"),
  cropCode: z.enum(["DURIAN", "COCONUT"]),
  phase: z.enum(["vegetatif", "generatif", "pemulihan"]),
  approach: z.enum(["uji_tanah", "analisis_jaringan", "neraca_hara"]),
  recommendedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal wajib diisi"),
});

/** Langkah 1 — GENERATE dari parameter. Tidak menulis ke database. */
export async function generateRecommendationAction(_p: RecoState, fd: FormData): Promise<RecoState> {
  try {
    const ctx = await requireRole("creator", "approver", "super_admin");
    if (!ctx.companyId) return { ok: false, message: "Pilih satu entitas dulu di kanan atas." };

    const parsed = genSchema.safeParse({
      blockId: fd.get("blockId"),
      cropCode: fd.get("cropCode"),
      phase: fd.get("phase"),
      approach: fd.get("approach"),
      recommendedAt: fd.get("recommendedAt"),
    });
    if (!parsed.success) {
      const fe: Record<string, string> = {};
      for (const i of parsed.error.issues) fe[String(i.path[0])] = i.message;
      return { ok: false, message: "Lengkapi blok, komoditas, fase, dan tanggal.", fieldErrors: fe };
    }

    // Kumpulkan hanya parameter yang sah untuk pendekatan terpilih.
    const approach = parsed.data.approach as Approach;
    const fields = FERT_PARAMS[approach];
    const params: Record<string, string | number> = {};
    for (const f of fields) {
      const raw = fd.get(f.code);
      if (raw === null || String(raw).trim() === "") continue;
      params[f.code] = f.kind === "number" ? Number(raw) : String(raw).trim();
    }
    if (Object.keys(params).length === 0) {
      return { ok: false, message: `Isi minimal satu ${labelForApproach(approach)} untuk digenerate.` };
    }

    const reco = generateRecommendation(parsed.data.cropCode, parsed.data.phase, approach, params);

    return {
      ok: true,
      message: "Rekomendasi digenerate. Tinjau dasar perhitungannya, lalu simpan bila sesuai.",
      generated: {
        blockId: parsed.data.blockId,
        cropCode: parsed.data.cropCode,
        phase: parsed.data.phase,
        approach,
        params,
        recommendedAt: parsed.data.recommendedAt,
        reco,
      },
    };
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    if (m === "FORBIDDEN") return { ok: false, message: "Peran Anda tidak berhak." };
    if (m === "UNAUTHENTICATED") return { ok: false, message: "Sesi berakhir." };
    return { ok: false, message: m };
  }
}

const savePayload = z.object({
  blockId: z.string().uuid(),
  cropCode: z.enum(["DURIAN", "COCONUT"]),
  phase: z.enum(["vegetatif", "generatif", "pemulihan"]),
  approach: z.enum(["uji_tanah", "analisis_jaringan", "neraca_hara"]),
  recommendedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  params: z.record(z.string(), z.union([z.string(), z.number()])),
  reco: z.object({
    doseN: z.number().nullable(),
    doseP2o5: z.number().nullable(),
    doseK2o: z.number().nullable(),
    doseMgo: z.number().nullable(),
    doseS: z.number().nullable(),
    kSource: z.enum(["KCl", "K2SO4", "KNO3"]),
    splitCount: z.number().int(),
    basis: z.array(z.string()),
  }),
});

/** Langkah 2 — SIMPAN hasil generate (payload JSON dari hidden field). */
export async function saveRecommendationAction(_p: RecoState, fd: FormData): Promise<RecoState> {
  try {
    const ctx = await requireRole("creator", "approver", "super_admin");
    if (!ctx.companyId) return { ok: false, message: "Pilih satu entitas dulu." };

    let payload: unknown;
    try { payload = JSON.parse(String(fd.get("payload") ?? "")); }
    catch { return { ok: false, message: "Data tidak valid." }; }

    const parsed = savePayload.safeParse(payload);
    if (!parsed.success) return { ok: false, message: "Data rekomendasi tidak valid." };
    const d = parsed.data;
    const note = String(fd.get("note") ?? "").trim() || null;

    await saveRecommendation(ctx, {
      blockId: d.blockId,
      cropCode: d.cropCode,
      phase: d.phase,
      approach: d.approach,
      params: d.params,
      doseN: d.reco.doseN,
      doseP2o5: d.reco.doseP2o5,
      doseK2o: d.reco.doseK2o,
      doseMgo: d.reco.doseMgo,
      doseS: d.reco.doseS,
      kSource: d.reco.kSource,
      splitCount: d.reco.splitCount,
      isProvisional: true, // hasil generate selalu provisional (docs/09 §11)
      note,
      recommendedAt: d.recommendedAt,
    });

    revalidatePath("/operasional/pemupukan");
    return { ok: true, saved: true, message: "Rekomendasi tersimpan (provisional)." };
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    if (m === "FORBIDDEN") return { ok: false, message: "Peran Anda tidak berhak." };
    if (/row-level security/.test(m)) return { ok: false, message: "Anda tidak berhak menyimpan di entitas ini." };
    return { ok: false, message: m };
  }
}

export async function deleteRecommendationAction(_p: RecoState, fd: FormData): Promise<RecoState> {
  try {
    const ctx = await requireRole("creator", "approver", "super_admin");
    const id = z.string().uuid().safeParse(fd.get("id"));
    if (!id.success) return { ok: false, message: "Data tidak valid." };
    await deleteRecommendation(ctx, id.data);
    revalidatePath("/operasional/pemupukan");
    return { ok: true, message: "Rekomendasi dihapus." };
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    if (m === "FORBIDDEN") return { ok: false, message: "Peran Anda tidak berhak." };
    return { ok: false, message: m };
  }
}

function labelForApproach(a: Approach): string {
  return a === "uji_tanah" ? "parameter tanah"
    : a === "analisis_jaringan" ? "parameter jaringan"
    : "parameter tanaman/agronomi";
}
