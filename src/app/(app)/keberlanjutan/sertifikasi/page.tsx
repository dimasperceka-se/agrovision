import { redirect } from "next/navigation";
import { BadgeCheck, TriangleAlert, Leaf, Building2, Users } from "lucide-react";
import { requireContext } from "@/lib/session";
import {
  organicRegistry,
  listCapa, listCertAssessments, listCertificates, listCertPrograms,
} from "@/lib/repo/sustainability";
import { PageHeader } from "@/components/ui/PageHeader";
import { InfoBox } from "@/components/ui/InfoBox";
import { getLocale } from "@/lib/i18n-server";
import { getDict } from "@/lib/i18n";
import { EmptyState } from "@/components/ui/EmptyState";
import { ResponsiveTable } from "@/components/ui/ResponsiveTable";
import { formatDate, formatPct, EMPTY } from "@/lib/format";
import { cn } from "@/lib/utils";
import { OrganicTracker } from "./OrganicTracker";

export const metadata = { title: "Sertifikasi Organik — AgroVision" };

const ASSESS_LABEL: Record<string, string> = {
  assigned: "Ditugaskan", in_progress: "Berjalan", submitted: "Diajukan",
  reviewed: "Direview", revision_required: "Perlu revisi",
};
const CERT_STATE: Record<string, { label: string; cls: string }> = {
  active: { label: "Aktif", cls: "bg-emerald-50 text-emerald-700" },
  expiring: { label: "Akan berakhir", cls: "bg-amber-50 text-amber-700" },
  expired: { label: "Kedaluwarsa", cls: "bg-red-50 text-red-700" },
  revoked: { label: "Dicabut", cls: "bg-slate-100 text-slate-500" },
};
const SEVERITY: Record<string, { label: string; cls: string }> = {
  minor: { label: "Minor", cls: "bg-slate-100 text-slate-600" },
  major: { label: "Major", cls: "bg-amber-50 text-amber-700" },
  critical: { label: "Kritis", cls: "bg-red-50 text-red-700" },
};

// docs/10 §1 — lima temuan yang menentukan sebelum masuk detail.
const FINDINGS = [
  { n: "1", t: "Masa konversi 36 bulan bisa retroaktif", b: "Bila riwayat lahan terdokumentasi & bebas input terlarang sebelum tanam, panen pertama bisa langsung organik — bukan menunggu 3 tahun. Item bernilai waktu tertinggi." },
  { n: "2", t: "Sertifikasi kelompok tidak untuk kebun korporat", b: "Estate inti = operator tunggal (inspeksi tahunan). Plasma/FPKM bisa group of operators, tapi batas Art. 36 EU: ≤2.000 anggota, ≤5 ha, ≤€25.000. Dua struktur paralel." },
  { n: "3", t: "KCl asal tambang dapat diizinkan organik", b: "Menyelesaikan kebutuhan Cl kelapa (KCl natural, OMRI/FiBL-listed). Durian generatif pakai langbeinit/SOP tambang. docs/10 §6." },
  { n: "4", t: "Kelapa organik mapan; durian nyaris tanpa preseden", b: "Pertimbangkan organik parsial — kelapa organik penuh, durian pilot 50–200 ha ≥5 tahun. Phytophthora tanpa fungisida setara + larangan ZPT induksi bunga." },
  { n: "5", t: "Sertifikat EU/NOP ≠ premi di pasar China", b: "Ekspor durian beku ke China butuh GB/T 19630 (CNCA); sertifikat asing tak otomatis diakui. Masukkan ke kelayakan sejak awal." },
];

export default async function SertifikasiPage() {
  let ctx;
  try {
    ctx = await requireContext();
  } catch {
    redirect("/login");
  }
  const t = getDict(await getLocale());
  const canEdit = ["creator", "approver", "super_admin"].includes(ctx.session.role);

  const [organic, programs, assessments, certificates, capa] = await Promise.all([
    organicRegistry(ctx),
    listCertPrograms(ctx),
    listCertAssessments(ctx),
    listCertificates(ctx),
    listCapa(ctx),
  ]);

  return (
    <div>
      <PageHeader
        title={t("nav.certification")}
        subtitle={t("sub.certification")}
        titleAdornment={
          <InfoBox title="Lingkup sertifikasi organik" label="Catatan lingkup sertifikasi organik">
            <p>
              Sertifikasi organik berdiri <strong>di atas</strong> legalitas dasar (NIB, KKPR, AMDAL,
              HGU, IUP-B/STD-B, FPKM) — bukan penggantinya.
            </p>
            <p>
              Tidak ada LSO (Lembaga Sertifikasi Organik) yang menerbitkan sertifikat untuk unit usaha
              yang legalitas lahannya belum jelas. Selesaikan perizinan dasar lebih dulu.
            </p>
            <p className="text-xs text-slate-500">Sumber: docs/10 §lingkup.</p>
          </InfoBox>
        }
      />

      {/* §1 Temuan utama */}
      <h2 className="mb-2 text-sm font-semibold text-slate-800">Temuan Utama</h2>
      <div className="mb-6 grid grid-cols-1 gap-3 lg:grid-cols-2">
        {FINDINGS.map((f) => (
          <div key={f.n} className="rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex items-baseline gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">{f.n}</span>
              <h3 className="text-sm font-semibold text-slate-800">{f.t}</h3>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">{f.b}</p>
          </div>
        ))}
      </div>

      {!canEdit && (
        <p className="mb-3 flex items-start gap-1.5 text-xs text-slate-500">
          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Anda hanya dapat melihat. Perubahan status oleh petugas / approver / super admin.
        </p>
      )}

      {/* Standar per pasar */}
      <section className="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
          <h2 className="text-sm font-semibold text-slate-800">Standar Organik per Pasar Tujuan</h2>
          <span className="text-xs text-slate-500 tabular-nums">{organic.certifiedCount}/{organic.standards.length} tersertifikasi</span>
        </div>
        <OrganicTracker items={organic.standards} variant="standard" canEdit={canEdit} />
        <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
          Standar ditentukan pasar tujuan; satu unit usaha bisa perlu beberapa sertifikat (multi-certification).
          Mulai SNI (domestik, biaya rendah), tambah EU/NOP mengikuti pembeli aktual. docs/10 §2, §11.
        </p>
      </section>

      {/* Bukti riwayat lahan K1–K7 */}
      <section className="mb-6 overflow-hidden rounded-xl border border-amber-200 bg-white">
        <div className="flex items-center justify-between border-b border-amber-100 bg-amber-50/50 px-4 py-2.5">
          <h2 className="text-sm font-semibold text-amber-900">Bukti Riwayat Lahan (K1–K7) — sebelum tanam</h2>
          <span className="text-xs text-amber-700 tabular-nums">{organic.evidenceDone}/{organic.evidenceTotal} lengkap</span>
        </div>
        <OrganicTracker items={organic.evidence} variant="evidence" canEdit={canEdit} />
        <p className="border-t border-amber-100 bg-amber-50/40 px-4 py-2 text-xs text-amber-800">
          <strong>Jendela tertutup permanen begitu lahan dibuka.</strong> Dokumentasi ini membuka pengakuan
          retroaktif masa konversi 36 bulan pada panen pertama — bernilai sangat besar pada 80.000 ha, dan
          sekaligus memenuhi baseline karbon & HCV. docs/10 §4.2.
        </p>
      </section>

      {/* Lingkup & struktur */}
      <h2 className="mb-2 text-sm font-semibold text-slate-800">Lingkup &amp; Struktur (rekomendasi docs/10 §11)</h2>
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <InfoCard icon={Building2} title="Estate inti → Operator tunggal" body="Sertifikasi individual, inspeksi tahunan menyeluruh dengan sampling blok. Satu temuan mayor bisa menggugurkan seluruh sertifikat — butuh sistem manajemen internal rapi." />
        <InfoCard icon={Users} title="Plasma / FPKM → Group of Operators" body="Batas EU Art. 36: ≤2.000 anggota, ≤5 ha & ≤€25.000/anggota. ±7.000 ha FPKM ≈ ~1.400 anggota → mungkin perlu beberapa kelompok berbadan hukum + ICS permanen." />
        <InfoCard icon={Leaf} title="Kelapa → organik penuh (fase 1)" body="Pasar mapan (VCO, gula kelapa, santan, coir), agronomi terkelola, sinergi RA/Fairtrade/SCC, kebutuhan Cl dipenuhi KCl asal tambang." />
        <InfoCard icon={TriangleAlert} title="Durian → pilot 50–200 ha (≥5 th)" body="Phytophthora tanpa fungisida organik setara; larangan ZPT (paklobutrazol) mengganggu induksi bunga; tanpa preseden skala; premi belum terbentuk. Ukur kehilangan hasil dulu." />
      </div>

      {/* Audit lapangan (RA) — pendukung */}
      <h2 className="mt-8 mb-3 text-sm font-semibold text-slate-800">
        Assessment &amp; audit lapangan <span className="font-normal text-slate-400">— inspeksi tahunan memakai mesin temuan → CAPA yang sama</span>
      </h2>

      <Section title="Program & Assessment">
        {programs.length === 0 && assessments.length === 0 ? (
          <EmptyState icon={BadgeCheck} title="Belum ada program/assessment" />
        ) : (
          <Table head={["Kode", "Blok", "Status", "Skor", "Temuan", "Kritis?"]}>
            {assessments.map((a) => (
              <tr key={a.code} className="border-b border-slate-50 last:border-0">
                <Td label="Kode" mono>{a.code}</Td>
                <Td label="Blok" mono>{a.blockCode}</Td>
                <Td label="Status"><Badge cls="bg-slate-100 text-slate-600">{ASSESS_LABEL[a.status] ?? a.status}</Badge></Td>
                <Td label="Skor" right>{formatPct(a.scorePct)}</Td>
                <Td label="Temuan" right>{a.findingCount}</Td>
                <Td label="Kritis?">{a.hasCriticalFailure ? <Badge cls="bg-red-50 text-red-700">Ya</Badge> : <span className="text-slate-400">—</span>}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Section>

      <Section title="CAPA (Tindakan Korektif)">
        {capa.length === 0 ? (
          <EmptyState icon={BadgeCheck} title="Tidak ada temuan yang perlu ditindaklanjuti" />
        ) : (
          <Table head={["Kode", "Blok", "Severity", "Temuan", "Jatuh tempo", "Status"]}>
            {capa.map((c) => {
              const sv = SEVERITY[c.severity] ?? SEVERITY.minor;
              return (
                <tr key={c.code} className="border-b border-slate-50 last:border-0">
                  <Td label="Kode" mono>{c.code}</Td>
                  <Td label="Blok" mono>{c.blockCode}</Td>
                  <Td label="Severity"><Badge cls={sv.cls}>{sv.label}</Badge></Td>
                  <Td label="Temuan">{c.description}</Td>
                  <Td label="Jatuh tempo" muted>{formatDate(c.dueDate)}</Td>
                  <Td label="Status"><Badge cls="bg-slate-100 text-slate-600">{c.status}</Badge></Td>
                </tr>
              );
            })}
          </Table>
        )}
      </Section>

      <Section title="Sertifikat Terbit">
        {certificates.length === 0 ? (
          <EmptyState icon={BadgeCheck} title="Belum ada sertifikat terbit" />
        ) : (
          <Table head={["Kode", "Blok", "Standar", "Berlaku", "Sisa hari", "Status"]}>
            {certificates.map((ct) => {
              const st = CERT_STATE[ct.state];
              return (
                <tr key={ct.code} className="border-b border-slate-50 last:border-0">
                  <Td label="Kode" mono>{ct.code}</Td>
                  <Td label="Blok" mono>{ct.blockCode}</Td>
                  <Td label="Standar">{ct.standardName}</Td>
                  <Td label="Berlaku" muted>{formatDate(ct.validFrom)} – {formatDate(ct.validUntil)}</Td>
                  <Td label="Sisa hari" right>{ct.daysLeft < 0 ? EMPTY : ct.daysLeft}</Td>
                  <Td label="Status"><Badge cls={st.cls}>{st.label}</Badge></Td>
                </tr>
              );
            })}
          </Table>
        )}
      </Section>
    </div>
  );
}

function InfoCard({ icon: Icon, title, body }: { icon: React.ComponentType<{ className?: string }>; title: string; body: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
        <Icon className="h-4 w-4 text-slate-500" /> {title}
      </h3>
      <p className="mt-1 text-xs leading-relaxed text-slate-600">{body}</p>
    </div>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
      <h3 className="border-b border-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-800">{title}</h3>
      {children}
    </section>
  );
}
function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <ResponsiveTable>
      <table className="w-full text-sm">
        <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs text-slate-500">
          <tr>{head.map((h, i) => <th key={h} className={cn("px-4 py-2.5 font-medium", i >= 3 && "text-right")}>{h}</th>)}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </ResponsiveTable>
  );
}
function Td({ children, label, mono, muted, right }: { children: React.ReactNode; label?: string; mono?: boolean; muted?: boolean; right?: boolean }) {
  return (
    <td data-label={label} className={cn("px-4 py-2.5", mono && "font-mono text-xs text-slate-600", muted && "text-slate-500", right && "text-right tabular-nums", !mono && !muted && "text-slate-700")}>
      {children}
    </td>
  );
}
function Badge({ children, cls }: { children: React.ReactNode; cls: string }) {
  return <span className={cn("rounded px-1.5 py-0.5 text-xs font-medium", cls)}>{children}</span>;
}
