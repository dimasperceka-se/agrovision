import { redirect } from "next/navigation";
import { requireContext } from "@/lib/session";
import { companyName } from "@/lib/repo/reports";
import { operationalDashboardView } from "@/lib/report/opDashboard";
import { OperationalDashboardView } from "@/components/dashboard/OperationalDashboardView";

export const metadata = { title: "Dashboard Operasional — AgroVision" };

/**
 * Dashboard Operasional — mengikuti desain mockup (docs/Dashboard & Reports/1.png):
 * KPI cards, Perjalanan Budidaya (5 tahap), peta blok, timeline aktivitas, insight.
 * Setiap angka dari DB; kosong dirender "—" (bukan 0).
 */
export default async function DashboardPage() {
  let ctx;
  try {
    ctx = await requireContext();
  } catch {
    redirect("/login");
  }
  const [data, company] = await Promise.all([
    operationalDashboardView(ctx),
    companyName(ctx),
  ]);

  return <OperationalDashboardView data={data} company={company} />;
}
