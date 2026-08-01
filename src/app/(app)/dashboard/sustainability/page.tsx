import Link from "next/link";
import { redirect } from "next/navigation";
import { Leaf, Cloud, BadgeCheck, FileCheck2, Info } from "lucide-react";
import { requireContext } from "@/lib/session";
import { latestCarbonRun, carbonNeedsValidation, organicRegistry } from "@/lib/repo/sustainability";
import { PageHeader } from "@/components/ui/PageHeader";
import { getLocale } from "@/lib/i18n-server";
import { getDict } from "@/lib/i18n";
import { formatNumber, formatPct, EMPTY } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata = { title: "Dashboard Keberlanjutan — AgroVision" };

// net_balance = sequestration − emission → net < 0 berarti net emitter
// (konsisten dengan halaman Carbon Accounting).
function carbonState(net: number | null): { label: string; cls: string } | null {
  if (net === null) return null;
  if (net < 0) return { label: "Net emitter", cls: "text-red-700" };
  if (net > 0) return { label: "Net sink (menyerap)", cls: "text-emerald-700" };
  return { label: "Net zero", cls: "text-slate-700" };
}

export default async function Page() {
  let ctx;
  try { ctx = await requireContext(); } catch { redirect("/login"); }
  const t = getDict(await getLocale());

  const [run, needsVal, organic] = await Promise.all([
    latestCarbonRun(ctx),
    carbonNeedsValidation(ctx),
    organicRegistry(ctx),
  ]);

  const cState = carbonState(run?.netBalanceTco2e ?? null);
  const certPct = organic.standards.length > 0 ? (organic.certifiedCount / organic.standards.length) * 100 : null;
  const evidencePct = organic.evidenceTotal > 0 ? (organic.evidenceDone / organic.evidenceTotal) * 100 : null;

  return (
    <div>
      <PageHeader
        title={t("nav.dashboard.sustainability")}
        subtitle="Agregat Carbon Accounting, Certification, dan Traceability."
        titleAdornment={<span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">Sustainability</span>}
      />

      {needsVal && (
        <div className="mb-5 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-sm leading-relaxed text-amber-900">
            Angka karbon memakai koefisien <strong>IPCC Tier 1</strong> yang masih perlu validasi
            faktor lokal. Lihat metodologi di <Link href="/keberlanjutan/karbon" className="font-medium underline">Carbon Accounting</Link>.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-1.5"><Cloud className="h-4 w-4 text-emerald-600" /><p className="text-xs text-slate-500">Status karbon</p></div>
          <p className={cn("mt-1.5 text-lg font-bold", cState ? cState.cls : "text-slate-300")}>{cState ? cState.label : EMPTY}</p>
          <p className="mt-0.5 text-xs text-slate-400">{run ? run.code : "belum ada run"}</p>
        </div>
        <Kpi icon={Cloud} label="Penyerapan (sequestration)" value={run?.sequestrationTco2e != null ? `${formatNumber(run.sequestrationTco2e)} tCO₂e` : EMPTY} href="/keberlanjutan/karbon" />
        <Kpi icon={Cloud} label="Emisi (gross)" value={run?.grossEmissionTco2e != null ? `${formatNumber(run.grossEmissionTco2e)} tCO₂e` : EMPTY} href="/keberlanjutan/karbon" />
        <Kpi icon={Cloud} label="Neraca bersih" value={run?.netBalanceTco2e != null ? `${formatNumber(run.netBalanceTco2e)} tCO₂e` : EMPTY} href="/keberlanjutan/karbon"
          note={run?.dataCompletenessPct != null ? `kelengkapan data ${formatPct(run.dataCompletenessPct)}` : undefined} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-1.5"><BadgeCheck className="h-4 w-4 text-emerald-600" /><p className="text-xs text-slate-500">Sertifikasi</p></div>
          <p className="mt-1.5 text-xl font-bold tabular-nums text-slate-800">
            {organic.certifiedCount}<span className="text-sm font-normal text-slate-400"> / {organic.standards.length} standar tersertifikasi</span>
          </p>
          <ProgressBar pct={certPct} />
          <Link href="/keberlanjutan/sertifikasi" className="mt-2 inline-block text-xs text-emerald-700 hover:underline">Lihat registri sertifikasi →</Link>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-1.5"><FileCheck2 className="h-4 w-4 text-emerald-600" /><p className="text-xs text-slate-500">Bukti riwayat lahan (K1–K7)</p></div>
          <p className="mt-1.5 text-xl font-bold tabular-nums text-slate-800">
            {organic.evidenceDone}<span className="text-sm font-normal text-slate-400"> / {organic.evidenceTotal} lengkap</span>
          </p>
          <ProgressBar pct={evidencePct} />
          <p className="mt-2 text-xs text-slate-400">Jendela pengakuan retroaktif masa konversi tertutup begitu lahan dibuka.</p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-4">
        <div className="flex items-center gap-1.5"><Leaf className="h-4 w-4 text-slate-400" /><p className="text-sm font-medium text-slate-600">Traceability &amp; Deforestation</p></div>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          Alur panen Blok → Collecting Point → Warehouse → Pabrik tersedia di{" "}
          <Link href="/keberlanjutan/traceability" className="text-emerald-700 hover:underline">Traceability</Link>.
          Modul <strong>Deforestation</strong> (pemantauan tutupan hutan) menyusul — coming soon.
        </p>
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, href, note }: { icon: typeof Cloud; label: string; value: string; href: string; note?: string }) {
  const empty = value === EMPTY;
  return (
    <Link href={href} className="rounded-xl border border-slate-200 bg-white p-4 transition-shadow hover:shadow-sm">
      <div className="flex items-center gap-1.5"><Icon className="h-4 w-4 text-emerald-600" /><p className="text-xs text-slate-500">{label}</p></div>
      <p className={cn("mt-1.5 text-xl font-bold tabular-nums", empty ? "text-slate-300" : "text-slate-800")}>{value}</p>
      {note && <p className="mt-0.5 text-xs text-slate-400">{note}</p>}
    </Link>
  );
}

function ProgressBar({ pct }: { pct: number | null }) {
  return (
    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.max(0, Math.min(100, pct ?? 0))}%` }} />
    </div>
  );
}
