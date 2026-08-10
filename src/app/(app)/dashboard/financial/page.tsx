import { redirect } from "next/navigation";
import { requireContext } from "@/lib/session";
import { companyName } from "@/lib/repo/reports";
import { financialDashboardView } from "@/lib/report/finDashboard";
import { FinancialDashboardView } from "@/components/dashboard/FinancialDashboardView";

export const metadata = { title: "Dashboard Finansial — AgroVision" };

/** Dashboard Finansial — mengikuti mockup 2 (docs/Dashboard & Reports/2.png). */
export default async function FinancialDashboardPage() {
  let ctx;
  try {
    ctx = await requireContext();
  } catch {
    redirect("/login");
  }
  const [data, company] = await Promise.all([financialDashboardView(ctx), companyName(ctx)]);
  return <FinancialDashboardView data={data} company={company} />;
}
