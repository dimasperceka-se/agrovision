"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/session";
import { setPriceRate } from "@/lib/repo/pricing";

export type PriceState = { ok: boolean; message: string };

const schema = z.object({
  id: z.string().uuid(),
  rateIdr: z.coerce.number().min(0).max(1e15),
});

export async function setPriceRateAction(_p: PriceState, fd: FormData): Promise<PriceState> {
  try {
    const ctx = await requireRole("approver", "super_admin");
    if (!ctx.companyId) return { ok: false, message: "Pilih satu entitas dulu." };

    const parsed = schema.safeParse({ id: fd.get("id"), rateIdr: fd.get("rateIdr") });
    if (!parsed.success) return { ok: false, message: "Tarif tidak valid." };

    await setPriceRate(ctx, parsed.data.id, parsed.data.rateIdr);
    revalidatePath("/costing/refleksi");
    revalidatePath("/dashboard/financial");
    return { ok: true, message: "Tarif diperbarui." };
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    if (m === "FORBIDDEN") return { ok: false, message: "Hanya approver/super admin yang bisa mengubah tarif." };
    if (/row-level security/.test(m)) return { ok: false, message: "Anda tidak berhak mengubah tarif ini." };
    return { ok: false, message: m };
  }
}
