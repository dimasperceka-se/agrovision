import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, TriangleAlert } from "lucide-react";
import { requireContext } from "@/lib/session";
import { getSurveyForm } from "@/lib/repo/operational";
import { searchBlockOptions } from "@/lib/repo/blocks";
import { PageHeader } from "@/components/ui/PageHeader";
import { SurveyForm } from "./SurveyForm";

export const metadata = { title: "Isi Survei — AgroVision" };

export default async function Page({ params }: { params: Promise<{ formId: string }> }) {
  let ctx;
  try { ctx = await requireContext(); } catch { redirect("/login"); }
  const { formId } = await params;

  const [form, blocks] = await Promise.all([
    getSurveyForm(ctx, formId),
    searchBlockOptions(ctx),
  ]);
  if (!form) redirect("/survei");

  const canWrite = ["creator", "approver", "super_admin"].includes(ctx.session.role);

  return (
    <div>
      <Link href="/survei" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> Semua form
      </Link>
      <PageHeader title={form.name} subtitle={`${form.fields.length} pertanyaan · hasil masuk ke approval.`} />

      {!canWrite || !ctx.companyId ? (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-sm text-amber-900">
            {!ctx.companyId ? "Pilih satu entitas dulu di kanan atas." : "Peran Anda tidak berhak mengisi survei."}
          </p>
        </div>
      ) : blocks.length === 0 ? (
        <p className="text-sm text-slate-500">Belum ada blok. Tambahkan blok dulu di menu Blok &amp; Peta.</p>
      ) : (
        <SurveyForm form={form} blocks={blocks} />
      )}
    </div>
  );
}
