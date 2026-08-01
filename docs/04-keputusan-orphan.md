# Keputusan atas Fitur Tanpa Rumah Baru (Orphan)

> Tanggal: **30 Juli 2026** — didelegasikan ke saya ("pilih yang paling baik")
> Sumber daftar: [03-audit-refinement.md](03-audit-refinement.md) §3
> [00-refinement-concept.md](00-refinement-concept.md):96 melarang penghapusan senyap. Dokumen ini adalah catatan tertulis atas setiap keputusan.

**Arti istilah:**

| Istilah | Arti |
|---|---|
| **keep** | Tetap aktif di fase ini |
| **park** | Skema/DDL disimpan, UI disembunyikan dari navigasi, tidak dihapus |
| **merge** | Dilebur ke screen lain |
| **drop** | Dihapus dari codebase |

---

## A. Orphan besar

| # | Fitur | Keputusan | Alasan |
|---|---|---|---|
| 1 | **MRV Evidence Package** (`/agroforestry/mrv-evidence`, `mrv_packages`) | **park** | "MRV" muncul 0× di dokumen konsep. Tapi plumbing lampirannya dipakai ulang untuk bukti pembelian di Costing, jadi skemanya berharga |
| 2 | **Sertifikasi di luar framework** (8 dari 14 sub-screen) | **park** | Konsisten dengan keputusan #9 Anda (opsi c). Yang disisakan aktif: `standards` sebagai master + satu screen framework (field-assessment + decision) |
| 3 | **Assignment / Penugasan Survei** | **keep** | Tidak ada di STEP 2, tapi petugas lapangan butuh tahu "apa tugas saya hari ini". Skemanya sudah ada dan murah dipertahankan |
| 4 | **Modul Offline / Sync** (UI) | **park** | Konsep menetapkan online-only fase ini. `client_uuid` dan desain queue **tetap** — supaya offline bisa ditambah tanpa refactor besar |
| 5 | **Hierarki Estate / Divisi** | **keep** — ⚠️ *tanpa rename* | Di 3.300 blok, level pengelompokan wajib ada. **Saya menyimpang dari audit di sini:** audit menyarankan rename ke `block_group`; saya pertahankan nama `estates`. Lihat catatan di bawah |
| 6 | **Spatial Analytics** (`/gis`) | **merge** ke A8 | Duplikasi peta ketiga. Target hanya punya satu screen peta |
| 7 | **Aparatus versioning karbon** | **keep tabel, buang UI konsol** | `carbon_runs` + `carbon_run_blocks` tetap (reproducibility MRV). **Carbon intensity dihapus dari semua tampilan** — denominatornya nol produk, jadi angkanya tak bermakna |
| 8 | **Pipeline pemrosesan drone** | **sederhanakan** | Konsep eksplisit: attachment + map layer, **jangan** bangun pipeline. `cog_path`/`gsd_cm`/`tile_url` dilepas; file diambil dari `evidence_files` |

## B. Orphan kecil

| # | Fitur | Keputusan | Alasan |
|---|---|---|---|
| 9 | **Activity Code Mapping + Reconciliation + ERP Sync** | **park** | Bergantung keputusan Koltiva, yang sudah dijawab standalone. Diaktifkan hanya bila integrasi jadi |
| 10 | **Panel Alert dashboard** | **drop** | Prosa peringatan hardcoded. Dibangun ulang nanti sebagai alert rule-based dari state nyata (survei lewat tenggat, faktor emisi hilang, blok over-budget) |
| 11 | **"Recommended Actions" peta karbon** | **drop** | Nasihat agronomi yang diinvent. Konsep:254 melarang menginvent agronomi |
| 12 | **5 dari 8 kartu laporan** | **drop dari UI** | Target hanya 3 laporan built-in. Report builder fase 2 memungkinkan user membuatnya sendiri |
| 13 | **`/mobile-preview` + `MobileFrame`** | **drop** | Duplikat `MobileLayout.tsx` byte-per-byte, hanya bezel telepon untuk demo desktop |
| 14 | **Sub-item sidebar palsu** | **drop dari nav** | 3 sub-item Traceability menjanjikan tepat yang dilarang konsep; "Form Builder"/"Hasil Survei" menunjuk stub tunggal |
| 15 | **Nilai `approval_type` orphan** (`carbon_calculation_run`, `mrv_package`, `emission_factor`) | **buang** saat enum ditulis ulang | Merujuk entitas yang diparkir |

---

## Catatan atas penyimpangan #5

Audit menyarankan `estates` di-rename menjadi `block_group` karena hierarki target di dokumen konsep adalah `company_entity → block`, dan "block group" hanya disebut sekali.

**Saya pertahankan nama `estates`,** dengan dua alasan:

1. **Biaya vs manfaat.** Rename menyentuh `user_estate_access`, `blocks.estate_id`, `budgets.estate_id`, `drone_orthophotos.estate_id`, seluruh policy RLS, dan dokumen desain — sementara manfaatnya murni kosmetik. Fungsinya identik.
2. **"Estate" adalah istilah domain yang hidup.** Staf perkebunan Indonesia memakai kata "estate" sehari-hari; "block group" adalah istilah buatan. Menukarnya menurunkan kejelasan bagi pengguna sebenarnya.

Yang saya ambil dari audit adalah **substansinya** — bahwa level pengelompokan wajib dipertahankan di skala 3.300 blok — bukan penamaannya.

Kalau Anda lebih suka `block_group`, rename-nya satu migrasi dan bisa dilakukan kapan saja.

---

## Keputusan atas poin 1 dan 3 (di luar daftar orphan)

**Poin 1 — klaim Net Sink di landing page publik: DIHAPUS.**

[src/app/page.tsx:40-45](../src/app/page.tsx#L40-L45) dan [:216-219](../src/app/page.tsx#L216-L219) memuat "Net Sink", "−14,8 tCO2e", "Survival Rate Kelapa 91,2%", "25.734,62 ha", "Area Agroforestry 7.725 ha".

Ini satu-satunya halaman yang terlihat pihak luar, dan proyeknya sebenarnya **net emitter** (sequestration ≈ 0, land clearing dominan). Membiarkannya adalah risiko greenwashing — bukan bug data. Dihapus sebelum demo, diganti deskripsi kapabilitas tanpa angka.

**Poin 3 — angka fabrikasi finansial: DIHAPUS, bukan disembunyikan.**

Yang dihapus: proyeksi produksi 2026–2030, estimasi pendapatan Rp 18,6 M, biaya Rp 11,2 M, margin 39,8%, payback 3,4 tahun, seluruh KPI karbon Net Sink.

Yang **disimpan** sebagai struktur (UI dimatikan, sesuai instruksi konsep): `harvest_batches`, Revenue/AR, enum fase `productive`, perhitungan survival rate.

Pembedaannya: struktur data tidak berbahaya, angka palsu berbahaya. Menyembunyikan angka palsu tidak menghilangkan risikonya — cukup satu `unhide` atau satu query lupa difilter, dan angka bohong tayang lagi di dashboard finansial. Konsep menyebut ini *fatal failure*.
