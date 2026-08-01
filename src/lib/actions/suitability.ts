"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/session";
import { classifyBoth, saveSuitability, type Classification } from "@/lib/repo/suitability";

export type SuitState = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
  result?: {
    durian: Classification;
    coconut: Classification;
    params: Record<string, string>;
    blockId: string;
    assessedAt: string;
    show: ("DURIAN" | "COCONUT")[];
  };
  saved?: boolean;
};

const num = (v: FormDataEntryValue | null): number | "" => {
  if (v === null || String(v).trim() === "") return "";
  const n = Number(v);
  return Number.isFinite(n) ? n : "";
};
const str = (v: FormDataEntryValue | null): string => (v === null ? "" : String(v).trim());

const baseSchema = z.object({
  blockId: z.string().uuid("Blok wajib dipilih"),
  assessedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal wajib diisi"),
});

/**
 * Hitung kesesuaian. Tidak menyimpan — hanya menampilkan hasil, supaya pengguna
 * bisa mencoba beberapa skenario. Penyimpanan dilakukan aksi terpisah dengan
 * hasil yang sama, agar yang tersimpan persis yang dilihat.
 */
export async function computeSuitabilityAction(_p: SuitState, fd: FormData): Promise<SuitState> {
  try {
    const ctx = await requireRole("creator", "approver", "super_admin");
    if (!ctx.companyId) return { ok: false, message: "Pilih satu entitas dulu di kanan atas." };

    const cropSel = String(fd.get("crop") ?? "BOTH");
    const show: ("DURIAN" | "COCONUT")[] =
      cropSel === "DURIAN" ? ["DURIAN"] : cropSel === "COCONUT" ? ["COCONUT"] : ["DURIAN", "COCONUT"];

    const base = baseSchema.safeParse({ blockId: fd.get("blockId"), assessedAt: fd.get("assessedAt") });
    if (!base.success) {
      const fe: Record<string, string> = {};
      for (const i of base.error.issues) fe[String(i.path[0])] = i.message;
      return { ok: false, message: "Pilih blok dan tanggal.", fieldErrors: fe };
    }

    // Kumpulkan seluruh parameter terukur. Field kosong = tidak dinilai.
    const params: Record<string, number | string> = {};
    const raw: Record<string, string> = {};
    for (const key of [
      "temperatur", "curah_hujan", "bahan_kasar", "kedalaman_tanah", "ktk", "ph",
      "c_organik", "kejenuhan_basa", "salinitas", "lereng", "batuan_permukaan", "singkapan_batuan",
    ]) {
      const v = num(fd.get(key));
      if (v !== "") { params[key] = v; raw[key] = String(v); }
    }
    for (const key of ["drainase", "tekstur"]) {
      const v = str(fd.get(key));
      if (v) { params[key] = v; raw[key] = v; }
    }

    const { durian, coconut } = await classifyBoth(ctx, params);

    if (durian.assessedCount === 0 && coconut.assessedCount === 0) {
      return { ok: false, message: "Isi minimal satu parameter untuk dinilai." };
    }

    return {
      ok: true,
      message: "Hasil kesesuaian dihitung. Periksa, lalu simpan bila sesuai.",
      result: {
        durian, coconut, params: raw, show,
        blockId: base.data.blockId, assessedAt: base.data.assessedAt,
      },
    };
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    if (m === "FORBIDDEN") return { ok: false, message: "Peran Anda tidak berhak." };
    if (m === "UNAUTHENTICATED") return { ok: false, message: "Sesi berakhir." };
    return { ok: false, message: m };
  }
}

const saveSchema = z.object({
  blockId: z.string().uuid(),
  assessedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  cropCode: z.enum(["DURIAN", "COCONUT"]),
  payload: z.string(), // JSON hasil + params, diserialisasi dari hidden field
});

export async function saveSuitabilityAction(_p: SuitState, fd: FormData): Promise<SuitState> {
  try {
    const ctx = await requireRole("creator", "approver", "super_admin");
    if (!ctx.companyId) return { ok: false, message: "Pilih satu entitas dulu." };

    const parsed = saveSchema.safeParse({
      blockId: fd.get("blockId"), assessedAt: fd.get("assessedAt"),
      cropCode: fd.get("cropCode"), payload: fd.get("payload"),
    });
    if (!parsed.success) return { ok: false, message: "Data tidak valid." };

    const payload = JSON.parse(parsed.data.payload) as {
      result: Classification;
      params: Record<string, unknown>;
    };

    await saveSuitability(ctx, {
      blockId: parsed.data.blockId,
      assessedAt: parsed.data.assessedAt,
      cropCode: parsed.data.cropCode,
      result: payload.result,
      params: payload.params,
    });

    revalidatePath("/operasional/kesesuaian-lahan");
    revalidatePath("/approval");
    return { ok: true, saved: true, message: `Hasil ${parsed.data.cropCode} tersimpan sebagai draft.` };
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    if (/lsa_one_per_block/.test(m)) return { ok: false, message: "Blok ini sudah punya penilaian kesesuaian. Satu blok satu penilaian." };
    if (m === "FORBIDDEN") return { ok: false, message: "Peran Anda tidak berhak." };
    return { ok: false, message: m };
  }
}
