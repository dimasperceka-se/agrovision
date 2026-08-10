import { notFound, redirect } from "next/navigation";
import { requireContext } from "@/lib/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { ReportDownload } from "@/components/ui/ReportDownload";
import { DashboardReportView } from "@/components/report/DashboardReportView";
import { ModuleReportView } from "@/components/report/ModuleReportView";
import { ReportScreenView } from "@/components/report/screen";
import { reportBySlug } from "@/lib/report/registry";
import { buildReportScreen } from "@/lib/report/screens";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const e = reportBySlug(slug);
  return { title: e ? `${e.title} — AgroVision` : "Laporan — AgroVision" };
}

export default async function ReportPage({ params }: { params: Promise<{ slug: string }> }) {
  let ctx;
  try { ctx = await requireContext(); } catch { redirect("/login"); }
  const { slug } = await params;
  const entry = reportBySlug(slug);
  if (!entry) notFound();

  if (entry.kind === "dashboard") {
    const report = await entry.load(ctx);
    return (
      <div>
        <PageHeader title={entry.title} subtitle={report.meta.subtitle} actions={<ReportDownload base={`/laporan/${slug}`} />} />
        <DashboardReportView report={report} />
      </div>
    );
  }

  // Layar laporan modul kaya (mockup 4–18) bila builder tersedia; jika tidak,
  // fallback ke tampilan tabel Master Laporan.
  const screen = await buildReportScreen(ctx, slug);
  if (screen) return <ReportScreenView screen={screen} base={`/laporan/${slug}`} />;

  const report = await entry.load(ctx);
  return (
    <div>
      <PageHeader title={entry.title} subtitle="Laporan modul — kolom hijau eksisting, biru rekomendasi." actions={<ReportDownload base={`/laporan/${slug}`} />} />
      <ModuleReportView report={report} />
    </div>
  );
}
