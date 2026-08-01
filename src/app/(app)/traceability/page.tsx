import { GitBranch } from "lucide-react";
import { PlaceholderPage } from "@/components/ui/PlaceholderPage";
import { getLocale } from "@/lib/i18n-server";
import { getDict } from "@/lib/i18n";

export default async function TraceabilityPage() {
  const t = getDict(await getLocale());
  return (
    <PlaceholderPage
      title={t("nav.traceability")}
      subtitle={t("sub.traceability.full")}
      icon={GitBranch}
      note="Traceability explorer untuk kelapa dan durian: backward & forward tracing dari nursery hingga produk akhir, lengkap dengan dokumen pendukung. Tampilan detail akan dikembangkan pada fase implementasi berikutnya."
    />
  );
}
