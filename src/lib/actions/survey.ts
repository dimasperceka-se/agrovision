"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/session";
import { getSurveyForm, submitSurvey } from "@/lib/repo/operational";

export type SurveyState = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
  submitted?: boolean;
};

export async function submitSurveyAction(_p: SurveyState, fd: FormData): Promise<SurveyState> {
  try {
    const ctx = await requireRole("creator", "approver", "super_admin");
    if (!ctx.companyId) return { ok: false, message: "Pilih satu entitas dulu di kanan atas." };

    const formId = z.string().uuid().safeParse(fd.get("formId"));
    if (!formId.success) return { ok: false, message: "Form tidak valid." };

    const form = await getSurveyForm(ctx, formId.data);
    if (!form) return { ok: false, message: "Form tidak ditemukan atau belum dipublikasikan." };

    const fieldErrors: Record<string, string> = {};
    const blockId = z.string().uuid().safeParse(fd.get("blockId"));
    if (!blockId.success) fieldErrors.blockId = "Blok wajib dipilih";

    const values = form.fields.map((f) => {
      const raw = String(fd.get(f.code) ?? "").trim();
      if (f.required && raw === "") fieldErrors[f.code] = "Wajib diisi";
      return { fieldId: f.id, fieldType: f.fieldType, value: raw };
    });

    if (Object.keys(fieldErrors).length > 0) {
      return { ok: false, message: "Lengkapi isian yang ditandai.", fieldErrors };
    }

    await submitSurvey(ctx, {
      formVersionId: form.formVersionId,
      blockId: blockId.success ? blockId.data : null,
      values,
    });

    revalidatePath("/survei");
    revalidatePath("/approval");
    return { ok: true, submitted: true, message: "Survei terkirim dan menunggu approval." };
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    if (m === "FORBIDDEN") return { ok: false, message: "Peran Anda tidak berhak." };
    if (m === "UNAUTHENTICATED") return { ok: false, message: "Sesi berakhir." };
    if (/row-level security/.test(m)) return { ok: false, message: "Blok di luar akses Anda." };
    return { ok: false, message: m };
  }
}
