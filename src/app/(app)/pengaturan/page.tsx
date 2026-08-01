import { Settings } from "lucide-react";
import { PlaceholderPage } from "@/components/ui/PlaceholderPage";
import { getLocale } from "@/lib/i18n-server";
import { getDict } from "@/lib/i18n";

export default async function PengaturanPage() {
  const t = getDict(await getLocale());
  return (
    <PlaceholderPage
      title={t("nav.group.settings")}
      subtitle={t("sub.settings")}
      icon={Settings}
      note="Pengaturan umum platform: master data estate/blok, emission factor library, integrasi ERP/accounting, dan preferensi notifikasi."
    />
  );
}
