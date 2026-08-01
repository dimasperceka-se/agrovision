"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/session";
import { setOrganicStatus } from "@/lib/repo/sustainability";

export type OrganicState = { ok: boolean; message: string };

const schema = z.object({
  itemCode: z.string().trim().min(1).max(10),
  status: z.enum(["belum_mulai", "dalam_proses", "in_conversion", "tersertifikasi", "tidak_relevan"]),
  referenceNo: z.string().trim().max(120).optional(),
  note: z.string().trim().max(500).optional(),
  obtainedOn: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal("")]).optional(),
  expiresOn: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal("")]).optional(),
});

export async function setOrganicStatusAction(_p: OrganicState, fd: FormData): Promise<OrganicState> {
  try {
    const ctx = await requireRole("creator", "approver", "super_admin");
    if (!ctx.companyId) return { ok: false, message: "Pilih satu entitas dulu di kanan atas." };

    const parsed = schema.safeParse({
      itemCode: fd.get("itemCode"),
      status: fd.get("status"),
      referenceNo: fd.get("referenceNo") ?? "",
      note: fd.get("note") ?? "",
      obtainedOn: fd.get("obtainedOn") ?? "",
      expiresOn: fd.get("expiresOn") ?? "",
    });
    if (!parsed.success) return { ok: false, message: "Data tidak valid." };

    await setOrganicStatus(ctx, {
      itemCode: parsed.data.itemCode,
      status: parsed.data.status,
      referenceNo: parsed.data.referenceNo || null,
      note: parsed.data.note || null,
      obtainedOn: parsed.data.obtainedOn || null,
      expiresOn: parsed.data.expiresOn || null,
    });
    revalidatePath("/keberlanjutan/sertifikasi");
    return { ok: true, message: "Status diperbarui." };
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    if (m === "FORBIDDEN") return { ok: false, message: "Peran Anda tidak berhak." };
    if (/row-level security/.test(m)) return { ok: false, message: "Anda tidak berhak mengubah status ini." };
    return { ok: false, message: m };
  }
}
