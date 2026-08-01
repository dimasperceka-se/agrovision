import { Wrench } from "lucide-react";
import { redirect } from "next/navigation";
import { requireContext } from "@/lib/session";
import { PageHeader } from "@/components/ui/PageHeader";
import { getLocale } from "@/lib/i18n-server";
import { getDict } from "@/lib/i18n";
import { OpRecordForm } from "@/components/ui/OpRecordForm";
import { EmptyState } from "@/components/ui/EmptyState";
import { listEquipment } from "@/lib/repo/agriInput";
import { createEquipmentAction } from "@/lib/actions/agriInput";
import { formatIdr, formatNumber, EMPTY } from "@/lib/format";

export const metadata = { title: "Equipment — AgroVision" };

const CATEGORIES = [
  { value: "alat", label: "Alat" },
  { value: "kendaraan", label: "Kendaraan" },
  { value: "drone", label: "Drone" },
  { value: "mesin", label: "Mesin" },
];
const FUEL = [
  { value: "solar", label: "Solar" },
  { value: "bensin", label: "Bensin" },
  { value: "listrik", label: "Listrik" },
  { value: "tidak_ada", label: "Tidak ada" },
];
const FUEL_LABEL: Record<string, string> = { solar: "Solar", bensin: "Bensin", listrik: "Listrik", tidak_ada: "—" };

export default async function Page() {
  let ctx;
  try { ctx = await requireContext(); } catch { redirect("/login"); }
  const t = getDict(await getLocale());
  const items = await listEquipment(ctx);
  const canWrite = ["creator", "approver", "super_admin"].includes(ctx.session.role);

  return (
    <div>
      <PageHeader title={t("nav.equipment")} subtitle={t("sub.equipment")} />

      {canWrite && ctx.companyId && (
        <div className="mb-5">
          <OpRecordForm
            title="Tambah equipment"
            action={createEquipmentAction}
            fields={[
              { kind: "text", name: "code", label: "Kode", type: "text", required: true, placeholder: "mis. DRONE-01" },
              { kind: "text", name: "name", label: "Nama", type: "text", required: true },
              { kind: "select", name: "category", label: "Kategori", options: CATEGORIES, required: true },
              { kind: "text", name: "purchasePriceIdr", label: "Harga beli (Rp)", type: "number", step: "any", min: "0" },
              { kind: "text", name: "usageFreq", label: "Frekuensi pakai", type: "text", placeholder: "mis. 3×/minggu" },
              { kind: "select", name: "fuelType", label: "Jenis energi", options: FUEL, allowEmpty: true },
              { kind: "text", name: "fuelPerHour", label: "Konsumsi /jam (L atau kWh)", type: "number", step: "any", min: "0" },
              { kind: "textarea", name: "note", label: "Catatan (opsional)" },
            ]}
          />
        </div>
      )}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <h2 className="border-b border-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-800">
          Katalog aset <span className="font-normal text-slate-400">— harga & konsumsi jadi dasar biaya di Accounting</span>
        </h2>
        {items.length === 0 ? (
          <EmptyState icon={Wrench} title="Belum ada equipment" description="Tambahkan alat/kendaraan/drone beserta harga beli dan konsumsi energinya." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Kode</th>
                  <th className="px-4 py-2 font-medium">Nama</th>
                  <th className="px-4 py-2 font-medium">Kategori</th>
                  <th className="px-4 py-2 text-right font-medium">Harga beli</th>
                  <th className="px-4 py-2 font-medium">Frekuensi</th>
                  <th className="px-4 py-2 font-medium">Energi</th>
                  <th className="px-4 py-2 text-right font-medium">Konsumsi/jam</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-4 py-2 font-mono text-xs text-slate-500">{i.code}</td>
                    <td className="px-4 py-2 text-slate-700">{i.name}</td>
                    <td className="px-4 py-2 text-slate-600 capitalize">{i.category}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-slate-700">{i.purchasePriceIdr === null ? EMPTY : formatIdr(i.purchasePriceIdr)}</td>
                    <td className="px-4 py-2 text-slate-600">{i.usageFreq ?? EMPTY}</td>
                    <td className="px-4 py-2 text-slate-600">{i.fuelType ? (FUEL_LABEL[i.fuelType] ?? i.fuelType) : EMPTY}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-slate-600">{i.fuelPerHour === null ? EMPTY : formatNumber(i.fuelPerHour)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
