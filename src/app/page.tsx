import Link from "next/link";
import {
  Leaf, Map, GitBranch, Trees, Wallet, Cloud, CheckCircle2, ArrowRight,
  Sprout, ClipboardCheck, Globe2, ShieldCheck,
} from "lucide-react";

const features = [
  {
    icon: Map,
    title: "Pemetaan & GIS",
    desc: "Digitasi batas lahan, polygon, satellite basemap, dan foto udara drone sebagai evidence layer.",
  },
  {
    icon: Trees,
    title: "Agroforestry Management",
    desc: "Kelola plot, crop layer, planting plan, tree inventory, dan survival rate kelapa & durian.",
  },
  {
    icon: Cloud,
    title: "Carbon Intelligence",
    desc: "Carbon emission, sequestration, dan net carbon balance sebagai fitur strategis di modul Agroforestry.",
  },
  {
    icon: GitBranch,
    title: "Traceability",
    desc: "Jejak produk dari bibit, kebun, panen, hingga produk akhir — backward & forward tracing.",
  },
  {
    icon: Wallet,
    title: "Costing & HPP",
    desc: "Integrasi biaya operasional dengan aktivitas budidaya, emission factor, dan finance/ERP.",
  },
  {
    icon: ClipboardCheck,
    title: "Survei Mobile Offline",
    desc: "Form builder, penugasan survei, GPS, foto geotag, dan sinkronisasi otomatis di lapangan.",
  },
];

// Blok `stats` DIHAPUS. Sebelumnya memuat "25.734,62 ha", "Survival Rate
// Kelapa 91,2%", dan "Net Carbon Balance: Net Sink" -- seluruhnya fabrikasi.
//
// Ini satu-satunya halaman yang terlihat pihak luar, dan proyeknya belum menanam
// apa pun: survival rate tidak ada karena belum ada tanaman, dan net carbon
// justru NEGATIF (land clearing dominan, sequestration nol). Menayangkannya
// bukan bug data, tapi risiko greenwashing. Lihat docs/04 poin 1.
//
// Angka baru hanya boleh muncul di sini bila dibaca dari database.

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-20 border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-emerald-700 p-1.5">
              <Leaf className="h-5 w-5 text-white" />
            </div>
            <span className="text-base font-bold text-slate-800">AgroVision</span>
          </div>
          <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex">
            <a href="#fitur" className="hover:text-emerald-700">Fitur</a>
            <a href="#carbon" className="hover:text-emerald-700">Carbon Intelligence</a>
            <a href="#stats" className="hover:text-emerald-700">Dampak</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Masuk
            </Link>
            <Link
              href="/login"
              className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
            >
              Request Demo
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden px-6 py-28">
        <img
          src="/images/kelapa.webp"
          alt="Kebun kelapa dari udara"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/80 via-emerald-950/70 to-emerald-950/85" />

        <div className="relative mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/40 bg-emerald-900/40 px-3 py-1 text-xs font-medium text-emerald-100">
            <Sprout className="h-3.5 w-3.5" /> Agroforestry, Traceability &amp; Carbon Intelligence Platform
          </span>
          <h1 className="mt-5 text-4xl font-bold leading-tight text-white md:text-5xl">
            Kelola Agroforestry, Traceability, dan Kinerja Karbon dalam Satu Platform
          </h1>
          <p className="mt-4 text-base leading-relaxed text-emerald-50/90 md:text-lg">
            AgroVision membantu perusahaan perkebunan memetakan lahan, memantau penanaman kelapa dan durian,
            mengelola biaya budidaya, serta menghitung emisi dan penyerapan karbon untuk kebutuhan MRV dan
            sustainability reporting.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/login"
              className="flex items-center gap-2 rounded-md bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-900/30 hover:bg-emerald-500"
            >
              Masuk ke Platform <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#fitur"
              className="rounded-md border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white hover:bg-white/20"
            >
              Lihat Fitur
            </a>
          </div>
        </div>

        {/* Grid statistik DIHAPUS — lihat catatan di atas berkas ini.
            Angka apa pun di halaman publik harus dibaca dari database, dan
            proyek ini belum punya data operasional untuk ditampilkan. */}
      </section>

      <section className="px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold text-slate-800 md:text-3xl">Komoditas Unggulan</h2>
            <p className="mt-3 text-sm text-slate-500 md:text-base">
              Fokus awal AgroVision pada agroforestry produktif kelapa dan durian.
            </p>
          </div>
          <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="group relative overflow-hidden rounded-2xl">
              <img
                src="/images/kelapa.webp"
                alt="Kebun kelapa"
                className="h-72 w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
              <div className="absolute bottom-4 left-4 text-white">
                <p className="text-xs uppercase tracking-wide text-emerald-200">Tanaman Agro Utama</p>
                <p className="text-lg font-semibold">Kelapa</p>
              </div>
            </div>
            <div className="group relative overflow-hidden rounded-2xl">
              <img
                src="/images/durian.jpg"
                alt="Buah durian"
                className="h-72 w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
              <div className="absolute bottom-4 left-4 text-white">
                <p className="text-xs uppercase tracking-wide text-emerald-200">Forestry Fruit Tree</p>
                <p className="text-lg font-semibold">Durian</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="fitur" className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold text-slate-800 md:text-3xl">Modul Utama Platform</h2>
            <p className="mt-3 text-sm text-slate-500 md:text-base">
              Dari pemetaan lahan hingga carbon readiness — terintegrasi dalam satu sistem yang sama.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
                  <div className="mb-3 inline-flex rounded-lg bg-emerald-50 p-2.5">
                    <Icon className="h-5 w-5 text-emerald-700" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-800">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="carbon" className="bg-emerald-900 px-6 py-20 text-white">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-800 px-3 py-1 text-xs font-medium text-emerald-200">
              <Cloud className="h-3.5 w-3.5" /> Carbon Intelligence
            </span>
            <h2 className="mt-4 text-2xl font-bold md:text-3xl">
              Carbon Accounting sebagai Bagian dari Pengelolaan Agroforestry
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-emerald-100 md:text-base">
              AgroVision menghitung gross emission dari aktivitas budidaya dan carbon sequestration dari kelapa,
              durian, serta area konservasi &mdash; menghasilkan status Net Emitter, Neutral, atau Net Sink lengkap
              dengan MRV evidence package untuk sustainability reporting internal.
            </p>
            <ul className="mt-5 space-y-2.5 text-sm text-emerald-100">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-300" /> Bukan carbon credit registry
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-300" /> Untuk kebutuhan MRV internal & carbon readiness
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-300" /> Terintegrasi dengan costing dan tree inventory
              </li>
            </ul>
          </div>
          {/* Empat StatCard berisi "42,6 tCO2e", "57,4 tCO2e", "-14,8 tCO2e",
              dan "Net Sink" DIHAPUS -- semuanya angka fabrikasi, dan arahnya
              justru terbalik dari kenyataan proyek. */}
          <div className="rounded-2xl border border-emerald-700 bg-emerald-800/40 p-6">
            <p className="text-sm font-semibold text-emerald-100">Status saat ini</p>
            <p className="mt-3 text-sm leading-relaxed text-emerald-100/90">
              Proyek berada pada fase pengadaan bibit. Belum ada penanaman, sehingga penyerapan
              karbon belum terukur dan emisi masih didominasi persiapan lahan.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-emerald-100/90">
              Angka karbon akan tampil di sini setelah pengukuran diameter batang dimulai dan
              koefisien IPCC divalidasi. Kami memilih tidak menampilkan angka yang belum punya
              dasar.
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-100 px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-slate-400 md:flex-row">
          <div className="flex items-center gap-2">
            <Leaf className="h-4 w-4 text-emerald-700" />
            <span>AgroVision &middot; Agroforestry, Traceability &amp; Carbon Intelligence Platform</span>
          </div>
          <p>&copy; 2026 AgroVision. Prototype build &mdash; bukan produk produksi.</p>
        </div>
      </footer>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Cloud; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-emerald-700 bg-emerald-800/60 p-4">
      <Icon className="h-5 w-5 text-emerald-300" />
      <p className="mt-3 text-lg font-bold">{value}</p>
      <p className="text-xs text-emerald-200">{label}</p>
    </div>
  );
}
