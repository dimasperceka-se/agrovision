import { redirect } from "next/navigation";
import { requireContext } from "@/lib/session";
import { companyName } from "@/lib/repo/reports";
import { sustainabilityDashboardView } from "@/lib/report/sustDashboard";
import { SustainabilityDashboardView } from "@/components/dashboard/SustainabilityDashboardView";

export const metadata = { title: "Dashboard Sustainability — AgroVision" };

/** Dashboard Sustainability — mengikuti mockup 3 (docs/Dashboard & Reports/3.png). */
export default async function SustainabilityDashboardPage() {
  let ctx;
  try {
    ctx = await requireContext();
  } catch {
    redirect("/login");
  }
  const [data, company] = await Promise.all([sustainabilityDashboardView(ctx), companyName(ctx)]);
  return <SustainabilityDashboardView data={data} company={company} />;
}
