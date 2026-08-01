# AUDIT REFINEMENT AGROVISION — DELIVERABLE FINAL

Basis: `docs/00-refinement-concept.md` (260 baris), `docs/01-desain-skema-database.md` (1.270 baris), `db/migrations/0001–0013` (13 file, 1.089 baris, 59 `CREATE TABLE`, 22 ENUM, 5 function), `src/` (52 `page.tsx`, 31 komponen, 3 modul data statis 485 baris).

---

## 1. Ringkasan eksekutif

- **Profil proyek di dokumen refinement bertentangan langsung dengan prototype.** Refinement: fase pengadaan bibit, **belum ada satu pun tanaman, tidak ada panen** (`docs/00-refinement-concept.md:14`). Prototype: perkebunan produktif — panen, survival rate 91,2%, proyeksi produksi 2026–2030, margin 39,8%, payback 3,4 tahun (`src/data/dummy.ts:15-18,128-162`). Konsekuensi: ini **bukan pekerjaan refactor angka**, tetapi penghapusan modul. 4 modul utuh (`/agroforestry/planting`, `/agroforestry/tree-inventory`, `/agroforestry/economic-value`, `/mobile/panen`) kehilangan seluruh premisnya, bukan hanya datanya.
- **Cerita karbon prototype adalah kebalikan dari kenyataan.** Prototype mengklaim Net Sink −14,8 tCO2e di 7 permukaan termasuk landing page publik (`src/app/page.tsx:216-219`). Kenyataan: sequestration ≈ 0 (semua masih bibit) dan land clearing adalah sumber emisi terbesar (`concept:138-139`) → proyek adalah **net emitter**. Ini eksposur reputasi/greenwashing, bukan bug data. Prototype bahkan tidak punya satu pun line item emisi land clearing.
- **Pekerjaan database sudah ada dan substansial, tetapi dirancang dari data fiksi.** `docs/01-desain-skema-database.md:5` menyatakan sumber kebenaran domain adalah `src/data/dummy.ts`, dan `:1234` merencanakan `0014_seed` diisi langsung dari `src/data/*.ts`. Jika dijalankan, angka fabrikasi masuk ke Postgres dan lolos uji "apakah dinamis?" sambil melanggar `concept:38-40` secara langsung. **Rekomendasi: catatan `:1234` dibatalkan.**
- **Multi-tenancy wajib (`concept:15,192`) secara struktural tidak mungkin pada skema sekarang.** `users.company_id uuid NOT NULL` (`db/migrations/0002_core.sql:41`) mengikat satu user ke satu entitas; seluruh RLS berbentuk `company_id = app.current_company_id()` (`0013_rls.sql:44`); tidak ada `user_company_access`. `docs/01:1200` justru menilai multi-company "risiko rendah / mungkin tidak dipakai" — penilaian itu sekarang salah.
- **Nol backend di aplikasi.** Tidak ada `route.ts`, tidak ada `"use server"`, tidak ada `middleware.ts`, tidak ada driver DB di `package.json`, tidak ada migration runner, tidak ada `0014_seed`. 1.089 baris SQL adalah **kode mati** — tak satu pun baris pernah dieksekusi oleh aplikasi.
- **≈235 titik hardcoded terverifikasi** (57 dataset statis, 690 token numerik di modul data, 83 handler toast-only, 25 array opsi FilterBar, 12 `defaultValue` pada form, 27 `value="…"` literal pada kartu KPI). Yang FATAL: setiap angka rupiah dan setiap angka karbon di dashboard eksekutif dan halaman costing.
- **Tiga fondasi wajib belum ada di lapisan mana pun**: (a) definisi laporan sebagai baris DB — kata "report" muncul 0× di seluruh migrations; (b) DBH / diameter batang — 0 hit di `src/` maupun `db/`, padahal itu seluruh dasar sisi sequestration (`concept:139`) dan salah satu dari dua rantai acceptance; (c) 6 dari 12 master data wajib (`fertilizer_type`, `pesticide_herbicide_type`, `unit_of_measure`, `cost_category`, `seedling_variety`, `allometric_coefficient`). **Acceptance test 1 tidak punya ujung mana pun yang terbangun** — kata "fertilizer"/"pupuk" hanya muncul sebagai string tampilan di `dummy.ts`.
- **Empat dari tujuh keputusan terbuka STEP 4 sudah dijawab secara diam-diam di DDL** (integrasi ERP, stack DB, struktur budget, biaya labor), padahal `concept:223` melarangnya. Tidak ada satu pun penanda `// DECISION NEEDED:` di repo.

---

## 2. Tabel pemetaan fitur

52 route, tanpa pemotongan. Grup: A OPERATIONAL, B SUSTAINABILITY, C COSTING, D REPORT, E APPROVAL, X CROSS-CUTTING, ∅ tanpa rumah.

| Fitur/Route | Grup baru | Screen | Disposisi | Status | Catatan |
|---|---|---|---|---|---|
| `/` | X | Public shell → login | refactor | static | Hero stats fabrikasi `src/app/page.tsx:40-45` ("25.734,62 ha", "Survival Rate Kelapa 91,2%", "Net Sink"); StatCard karbon `:216-219` (42,6 / 57,4 / −14,8 tCO2e); copy "agroforestry produktif" `:131`. Seluruh angka + copy harus ditulis ulang. |
| `/login` | X | Auth + resolusi tenant | refactor | partial | `setTimeout(900)` lalu `router.push("/dashboard")` tanpa verifikasi (`login/page.tsx:20-23`); email ter-seed `:12`; satu company hardcoded `:45`; `setLoading(false)` tak pernah dipanggil `:18`. Tidak ada session, tidak ada role, tidak ada entity picker. |
| `/dashboard` | D | D3 dashboard view (roll-up 3 report definition) | refactor | static | 100% fabrikasi: 12 KPI `dummy.ts:11-24`, 2 chart `:26-42`, tabel aktivitas `:44-50`, panel alert `:52-56`. KPI progress-tanam & survival tidak dapat dibangun di fase nyata → ganti dengan stok bibit, progress land prep, expenditure + empty state jujur. Melanggar AT6 secara langsung. |
| `/pemetaan` | A | A8 Spatial / Block Management | refactor | partial | Semua tombol toolbar hanya `toast` (`:24-38`); "peta" = gradient CSS + div persentase (`components/ui/MapPanel.tsx:27-72`); detail blok satu objek beku (`dummy.ts:78-88`). Menyerap `/gis` dan `/agroforestry/plot-layer`. |
| `/nursery` | A | A1 Seedling / Nursery Monitoring | belum dibangun | static | `PlaceholderPage`. Ironi: modul operasional terpenting di fase nyata, paling tidak dibangun di web. Satu-satunya UI nursery yang jalan ada di `/mobile/nursery` (tak tersambung ke sidebar web). |
| `/traceability` | B | B3 Traceability — skema identitas saja | belum dibangun | static | `PlaceholderPage`. Scope harus **dipotong**, bukan diperluas: `concept:148-150` melarang UI rantai, QR/RFID, chain-of-custody. Catatan stub + 3 sub-item sidebar (`Sidebar.tsx:50-52`) menjanjikan tepat yang dilarang. |
| `/survei` | X | Form engine schema-driven | belum dibangun | static | `PlaceholderPage`. Ini rumah renderer form dari skema DB (`concept:62-66`). Hari ini semua form adalah JSX statis. 3 sub-item sidebar (`Sidebar.tsx:60-62`) semuanya jatuh ke stub tunggal ini. |
| `/gis` | A | A8 (sama dengan `/pemetaan`) | merge | static | Masalah kejujuran terburuk: panel berkata "Klik blok pada peta…" (`:46`) lalu merender 5 nilai hardcoded (`:48-52`) termasuk "Biaya per Ha Rp 1,45 jt". FilterBar uncontrolled, tidak memfilter apa pun (`FilterBar.tsx:13-17`). |
| `/agroforestry` | D + B | Pecah: D2 Operational Report + ringkasan net carbon B1 | merge | static | Kepadatan hardcode tertinggi: 12 KPI literal **inline di page** `:12-25` ("Estimasi Produksi Kelapa 1.842 ton/th", "Net Carbon Balance −14,8"), dataset chart nilai ekonomis inline di JSX `:60-67`. Grup top-level "Agroforestry" hilang di struktur 5 grup. |
| `/agroforestry/plot-layer` | A | A8 crop layer + A1 alokasi bibit→blok | merge | static | Salinan ketiga peta palsu. Detail dari objek beku `dummy.ts:90-101` (`tertanamKelapa: 12848`, `survivalRate: "91,2%"`) — keduanya mustahil hari ini. Tombol hanya toast `:47-55`. |
| `/agroforestry/planting` | A | A7 (struktur data saja, UI dimatikan — `concept:129`) | refactor | static | Premis mati total: "28.450 / 41.800 Kelapa Tertanam", "Penyulaman 1.245" `:11-18`; `targetVsAktual` inline `:20-26`; donut inline `:28-31`. Juga arketipe masalah paginasi: array 5 baris tanpa server-side paging vs target ~3.300 blok. |
| `/agroforestry/tree-inventory` | B | B1 form pengukuran DBH (+ A7 survei kondisi) | refactor | static | KPI `dummy.ts:111-118` ("Produktif 14.870"), baris `:120-127`; kolom Evidence literal "2 foto" untuk **setiap** baris `:41-45`. Angka pun tidak konsisten internal: 28.450+6.120 ≠ 31.560+1.245. |
| `/agroforestry/activity-emission` | B + C | B1 sisi emisi; sisi biaya → C2 | refactor | static | Menggabungkan dua modul target. Faktor emisi **dipanggang ke dalam baris** (`dummy.ts:172-178`: "1,33 kgCO2e/kg", "2,68 kgCO2e/liter") bukan master `emission_factor`. "Run Calculation" hanya toast `:29-31`. Aktivitas yang diukur (Transport Panen, Pengeringan Kelapa) tidak akan terjadi bertahun-tahun. |
| `/agroforestry/economic-value` | C | C3 (model saja, UI disembunyikan) + C5 break-even | refactor | static | Seluruh halaman dibangun di atas revenue yang tidak bisa ada: `dummy.ts:128-163`, termasuk proyeksi produksi 2026–2030 dan dropdown skenario harga. `concept:171` meminta break-even, bukan margin/payback fiktif. Proyeksi yield = agronomi yang diinvent → dilarang `concept:254`. |
| `/agroforestry/net-carbon-balance` | B | B1 net carbon per blok + agregat | refactor | partial | `runCalculation()` = `setTimeout(1500)` yang men-toast jawaban yang sudah ditulis sebelumnya `:20-27`; Result Preview merender literal yang sama tanpa syarat `:68-74`. Aparatus versi metodologi / EF library / uncertainty / carbon intensity per kg produk tidak punya rumah dan menyiratkan koefisien yang dilarang diinvent. |
| `/agroforestry/carbon-map` | B | Layer net carbon di atas peta A8 | merge | static | Blok & summary `dummy.ts:186-208` (45 blok vs target ~3.300); daftar layer inline `:7-14`. "Recommended Actions" (`carbonMapSummary.rekomendasi`) adalah nasihat agronomi yang diinvent tanpa dasar. |
| `/agroforestry/mrv-evidence` | ∅ | — | drop | static | Deliverable yang **tidak pernah diminta** dokumen refinement ("MRV" muncul 0× di `docs/00`). 8 hitungan section adalah literal (`dummy.ts:221-228`) — paket completeness yang isinya literal tidak dapat diaudit per definisi. Plumbing lampiran layak dipakai ulang untuk bukti pembelian C2. |
| `/sertifikasi` | B | B2 framework saja | drop | static | `certification.ts:3-51`. `concept:146`: sertifikasi relevan ~3 tahun lagi, bangun framework bukan konten. Dashboard readiness per estate jauh melampaui itu, dan mengagregasi level "estate" yang tidak ada di hierarki target. |
| `/sertifikasi/standards` | B | B2 — sisakan sebagai master row super_admin | merge | static | `certification.ts:29-36`; semua tombol toast. Yang layak bertahan hanya tabel master `certification_standard`. |
| `/sertifikasi/template-builder` | X | Editor definisi form schema (phase 2 di atas skema DB) | refactor | static | **Aset paling reusable di seluruh modul Sertifikasi**: vokabuler 14 tipe field `:11` (Teks, Angka, Tanggal, Pilihan Tunggal/Ganda, Yes/No, Skala, Tabel, Foto, Dokumen, Tanda Tangan, GPS, Polygon, QR Scan) + flag mandatory/evidence/conditional = tepat metadata `form_schema` yang diminta `concept:63`. Jadikan editor generik, bukan milik sertifikasi. Toggle sekarang `<span>` non-interaktif `:88-96`. |
| `/sertifikasi/program` | ∅ | — | drop | static | Manajemen siklus program (scope, periode, tim asesmen) bukan bagian framework B2. `certification.ts:45-51`. |
| `/sertifikasi/eligible-plots` | ∅ | — | drop | static | Skoring kelayakan/readiness per plot tidak ada di target; bergantung pada "Tahun Tanam" yang belum eksis. `certification.ts:52-59`. |
| `/sertifikasi/assignment` | ∅ | — | drop | static | Dispatch auditor + due date bukan bagian A–E; satu-satunya lapisan workflow di target adalah state machine E. `certification.ts:60-67`. |
| `/sertifikasi/field-assessment` | B | B2 leg "submit" dari submit→review→pass/fail | merge | static | Paling dekat ke pengiriman checklist. Klaim "auto-fill" **palsu**: 4 tile adalah literal ("184,5 ha (auto-fill)", "Tahun Tanam 2018 (auto-fill)") `:32-35`. Pertahankan satu screen framework, di-drive form schema DB, disambung ke state machine E. |
| `/sertifikasi/evidence-center` | X | Attachment/evidence store generik | merge | static | Sebagai sub-modul sertifikasi tidak punya rumah, tetapi `concept:160` (foto bukti pembelian), `:133` (file drone), `:205` (lampiran setiap form) semuanya butuh lapisan ini. Generalisasi. `certification.ts:77-84`. |
| `/sertifikasi/internal-review` | E | E1/E4 — state `under_review` + inbox terpusat | merge | static | UI approval **paralel kedua** yang bersaing dengan `/approval`; `concept:185` menuntut SATU state machine. Aksi hanya toast `:43-51` → tidak ada transisi. `certification.ts:85-90`. |
| `/sertifikasi/capa` | ∅ | — | drop | static | Subsistem corrective-action tidak ada di target; alur penolakan target hanya `rejected + reason + resubmit` (`concept:187`). KPI hardcoded inline `:13-18`; baris `certification.ts:91-97`. |
| `/sertifikasi/decision` | B | B2 leg "pass / fail with reason" | merge | static | Kecilkan 5 opsi keputusan menjadi pass/fail+alasan, salurkan lewat state machine E. Tombol hanya toast `:32`; riwayat `certification.ts:98-104`. |
| `/sertifikasi/registry` | ∅ | — | drop | static | Penerbitan sertifikat + validity window + rollup ke estate jauh melampaui "framework only"; catatan `:37-40` menjanjikan pewarisan sertifikasi ke batch produk lewat Traceability — rantai yang justru ditunda `concept:148-150`. |
| `/sertifikasi/renewal` | ∅ | — | drop | static | Monitoring expiry + reminder + reassessment untuk sertifikat yang belum akan ada. `certification.ts:113-118`; aksi hanya toast `:65,70`; ambang reminder mengubah `useState` saja `:28-32`. |
| `/sertifikasi/reports` | D | D2 (jika kelak perlu) sebagai report definition row | merge | static | Duplikat pola `/laporan` untuk domain sertifikasi: 6 kartu dari `certification.ts:119-129`, tombol Generate hanya toast `:42`. Laporan harus jadi **baris definisi**, bukan halaman kedua. |
| `/costing` | C | C2 Expenditure + C4 Budget vs Actual | refactor | static | **Halaman finansial paling penting untuk demo, dan seluruh angkanya fiktif**: 6 KPI `dummy.ts:233-238`, chart budget-vs-actual `:240-247`, transaksi `:250-256`. Tidak ada form entry — hanya tabel baca. "Sinkronisasi ERP" (`:29-31`) mendahului keputusan blocker #1. Activity Code Mapping + Reconciliation Log = orphan. |
| `/laporan` | D | D1/D2/D3 (report definition + export) | refactor | static | 8 kartu laporan `dummy.ts:281-290`; Generate hanya toast `:44`; FilterBar opsi hardcoded inline `:20-21`. Harus menjadi 3 baris `report_definitions` (Operational/Sustainability/Financial) + export PDF dokumen (`concept:182`). 5 dari 8 kartu (Agroforestry Progress, Tree Inventory, Economic Value, MRV, Traceability) tidak punya rumah. |
| `/approval` | E | E1 inbox terpusat + E4 status di modul asal | refactor | static | Queue dari `dummy.ts:259-268`; filter tipe = `useState` di atas array penuh `:11-12`. `ApprovalCard.tsx` punya 3 state lokal vs 5 state wajib, merender **teks diff palsu** `:43-49`, dan textarea komentar ditangkap lalu **dibuang** `:73-79` → reject tanpa alasan tersimpan. 8 tipe approval mencakup entitas orphan (Carbon Calculation Run, MRV Package, Emission Factor). |
| `/pengguna` | E | E2 roles + E3 akses per entitas | belum dibangun | static | `PlaceholderPage`. Catatan `:10` menyebut role prototype (Admin/Surveyor/Approver/Viewer), bukan `creator`/`approver`/`super_admin` (`concept:189-191`), dan akses "per estate/blok" bukan per company entity. |
| `/pengaturan` | X | Master data module di bawah `super_admin` | belum dibangun | static | `PlaceholderPage`. **Ini jalur wajib acceptance test 1** (`concept:78`) dan tempat 12 master data (`concept:209`). Tanpa screen ini AT1 tidak dapat didemonstrasikan. |
| `/mobile-preview` | ∅ | — | drop | static | Demo prop desktop yang menduplikasi `/mobile/form`; hanya dapat dijangkau dari `Sidebar.tsx:239`. Berisi `faseOptions` termasuk "Produktif" dengan default **"Produktif"** `:10,16` — akan menulis fase yang salah. `defaultValue={25}` `:68`, catatan ter-seed `:118`, GPS palsu `:44-46`. |
| `/mobile` | A/X | Mobile home (hanya pengumpulan data) | refactor | static | `mobileUser`/`mobileAssignments`/`draftOfflineItems` dari `data/mobile.ts` (`:7`); `draftCount` = `.length` `:20`; `todayCount` = filter array in-memory `:21`; quick action "Scan QR → /mobile/panen" `:14` harus hilang; tombol Sync hanya toast `:71`; status izin GPS literal "Aktif" `:50`. |
| `/mobile/login` | X | Auth PWA | refactor | partial | `setTimeout(800)` → push `/mobile` `:16`; input email `defaultValue` `:34`; input PIN tidak terikat state dan tidak pernah dibaca `:41`; tombol biometrik hanya toast sukses tanpa navigasi `:53`; klaim token offline `:61` (offline = phase 2). |
| `/mobile/assignment` | ∅ (flag) | — | refactor / keputusan | static | `mobileAssignments` dirender penuh tanpa paginasi `:9`. Konsep "assignment/penugasan" **tidak punya rumah** di struktur A–E → butuh keputusan Anda. |
| `/mobile/assignment/detail` | ∅ (flag) | — | refactor / keputusan | static | Bukan dynamic route (harus `[id]`) `:7`; `formFields` array string `:34` (harus `form_fields` DB); `dataExisting` `:43` **mengklaim data tersedia yang sebenarnya tidak ada**; tombol "Mulai" hanya toast `:60`. |
| `/mobile/form` | X | Renderer `<SchemaForm schemaId>` | refactor | static | 5 section JSX tulis-tangan `:17` — dilarang eksplisit `concept:63`. Judul "Tree Inventory Blok AGF-C02 · Titik 13" `:15`; `<option>Kelapa/Durian` `:20`; `defaultValue={25}` `:25`; catatan ter-seed `:45`; Simpan/Submit hanya toast `:53,59` dengan klaim "validasi mandatory berhasil" yang tidak ada. |
| `/mobile/nursery` | A | A1 Seedling inventory + survei kondisi | refactor | static | **Prioritas (b) demo.** `nurseryMobileBatches[0]` sebagai sumber kebenaran `:11`; `defaultValue` hidup/mati/rusak 1180/32/8 `:27,30,33` — form survei **tidak boleh** ter-prefill angka fabrikasi; dropdown blok 3 literal `:44` (target ~3.300); belum ada supplier/variety/tanggal terima/tagging (`concept:109-111`). |
| `/mobile/agroforestry` | ∅ | — | drop | static | Memodelkan pohon tertanam yang tidak ada: "Jumlah Tertanam" `defaultValue={25}` `:26`, `recentEntries` `:32`; tombol Kelapa/Durian inert tanpa state `:21`. |
| `/mobile/panen` | ∅ | — | drop / hard-disable | static | **Artefak paling menyesatkan di prototype**: entry data panen (batch 1.240 kg, "Tim Panen 2"), scan QR, gambar area panen, submit yang mengklaim "handover ke collection point dicatat" `:20,51`. `concept:129` = struktur data saja, UI dimatikan; `concept:150` = tanpa QR. Hapus screen + `panenMobileBatches` + assignment ASG-004 + quick action. |
| `/mobile/polygon` | A | A8 polygon capture (lapangan) | refactor | partial | Walk-boundary hanya toast `:37` (harus `watchPosition`); `GPSAccuracyBadge accuracy={4.2}` `:47`; simpan/submit hanya toast `:56,62` — tidak ada GeoJSON yang persist. Menopang AT2. |
| `/mobile/peta` | A | A8 map view (read-only lapangan) | refactor | static | Layer 5 string literal `:8`, visibilitas dikunci ke label tampilan `:11`; search box tanpa `value`/`onChange` `:18`; `MapMiniPreview` = gambar gradient CSS `:21`. |
| `/mobile/foto` | X | Attachment capture generik | refactor | static | Tombol hanya toast dan **mengklaim** metadata GPS tersimpan `:14`; Lat/Long literal `-1.234567, 103.456789` `:22` (Sumatra, bukan Kalimantan); akurasi/kompas/timestamp literal `:23-25`. DB sudah siap: `0010_evidence.sql:20` punya `geom geometry(Point,4326) -- dari EXIF`. |
| `/mobile/sertifikasi` | B | B2 checklist submit (prioritas rendah) | merge | static | Checklist dari `mobile.ts:52-58`; klaim "Auto-filled dari data existing" `:20` tidak benar; blok "AGF-A12 (auto-fill)" literal `:13`; submit hanya toast `:38`. |
| `/mobile/draft` | ∅ | — | drop (phase 2) | static | Draft offline lokal; `concept:214` menetapkan fase ini online-only. `mobile.ts:29-35`. |
| `/mobile/sync` | ∅ | — | drop (phase 2) | static | Queue sinkronisasi, "Last sync 21 Jun 2026" `:17`, "128 MB / 500 MB" `:20`, retry hanya toast. `concept:214`. |
| `/mobile/profil` | X | Session + logout | refactor | static | `mobileUser` statis `:6`; logout = `router.push("/mobile/login")` tanpa menghapus session (tidak ada session); dua tautan menuju screen phase-2 (`/mobile/draft`, `/mobile/sync`). |

**Rekap disposisi:** keep 0 · refactor 21 · merge 9 · drop 17 · belum dibangun 5. Tidak ada satu pun route yang berstatus `dynamic`; 47 route `static`, 5 `partial` (partial = ada state klien, tetap tanpa persistensi).

---

## 3. Fitur tanpa rumah baru (perlu keputusan Anda)

`concept:96` melarang menghapus fitur terbangun secara diam-diam. Berikut daftar lengkap orphan. **Semua item di bawah menunggu keputusan Anda — kami tidak menghapus apa pun sebelum Anda memutuskan.**

**A. Orphan besar (modul/deliverable utuh)**

1. **MRV Evidence Package** (`/agroforestry/mrv-evidence`, `dummy.ts:209-230`, tabel `mrv_packages` + `mrv_package_sections` di `0009_carbon.sql`). Paket bukti audit pihak ketiga + share link read-only. Kata "MRV" muncul **0×** di `docs/00`. Opsi: **park** (simpan skema + ide, sembunyikan UI) / drop / keep-as-is jika Anda memang butuh untuk investor. Rekomendasi: park; plumbing lampirannya dipakai ulang untuk bukti pembelian C2.
2. **Modul Sertifikasi di luar framework** — 8 dari 14 sub-screen: `program`, `eligible-plots`, `assignment`, `capa`, `registry`, `renewal`, `standards` (manajemen penuh), `decision` (5 opsi). `concept:146` hanya meminta framework (form builder checklist + workflow submit→review→pass/fail), relevan ~3 tahun lagi. Opsi: **park semuanya** / drop / keep 1–2. Rekomendasi: park; sisakan `standards` sebagai master row dan `field-assessment` + `decision` sebagai 1 screen framework.
3. **Konsep Assignment / Penugasan Survei** (`/mobile/assignment`, `/mobile/assignment/detail`, `AssignmentCard.tsx`, tabel `assignments` di `0006_survey.sql:55`, sub-item sidebar "Penugasan Survei"). Supervisor menugaskan survei ke petugas dengan due date. **Tidak ada di STEP 2.** Ini fitur yang berguna secara operasional dan skemanya sudah ada. Opsi: **keep as-is sebagai lapisan tipis di A** / park / drop. Rekomendasi: keep, karena field officer butuh tahu "apa tugas saya hari ini".
4. **Modul Offline / Sync** (`/mobile/sync`, `/mobile/draft`, `SyncQueueList`, `SyncStatusBadge`, `DraftList`, `OfflineBadge`, `sync_sessions` table, `client_uuid` di beberapa tabel). `concept:214` = online-only fase ini. Opsi: **park** (pertahankan `client_uuid` + desain queue, hapus UI). Rekomendasi: park; ini keputusan yang sudah dokumen buat, hanya UI-nya yang harus turun.
5. **Level hierarki Estate / Divisi** (`estates`, `divisions`, `blocks.estate_id NOT NULL`, `user_estate_access`, `budgets.estate_id`, `drone_orthophotos.estate_id`, RLS `0013_rls.sql:54-61`, dimensi filter di hampir semua FilterBar). Hierarki target adalah `company_entity → block` (`concept:130-134`), dengan "block group" disebut sekali (`:192`). Opsi: **keep sebagai block group** / drop (migrasi besar: menyentuh 13 file migrasi). Rekomendasi: keep dan namai ulang sebagai `block_group` — pada 3.300 blok Anda **butuh** level pengelompokan.
6. **Spatial Analytics terpisah** (`/gis`). Target hanya punya satu screen peta (A8). Opsi: **merge ke A8** / keep sebagai tab analitik. Rekomendasi: merge.
7. **Aparatus versioning perhitungan karbon** (`net-carbon-balance`: methodology version, EF library version, uncertainty %, data completeness %, carbon intensity per kg produk, toggle soil carbon; tabel `carbon_runs`, `sequestration_models`, kolom `carbon_intensity` `0009_carbon.sql:76`). `concept:140` hanya meminta net carbon per blok + agregat. Opsi: **keep tabel, sembunyikan UI** / park. Rekomendasi: keep `carbon_runs` + `carbon_run_blocks`, buang UI konsol dan hapus carbon intensity dari semua tampilan (denominator = 0 produk).
8. **Pipeline pemrosesan drone** (`drone_orthophotos` dengan `cog_path`, `gsd_cm`, `tile_url` — `0004_gis_ops.sql:68-79`). `concept:133` eksplisit: "attachments + map layer, **jangan** bangun processing pipeline". Opsi: **park** / sederhanakan menjadi lampiran. Rekomendasi: sederhanakan; ambil file dari `evidence_files`, tambahkan `company_id` + `block_id`.

**B. Orphan kecil (fitur/panel, tetap perlu keputusan)**

9. **Activity Code Mapping + Reconciliation Log + ERP Sync** (`/costing`, `dummy.ts:270-279`, `erp_sync_logs`). Bergantung penuh pada keputusan blocker #1 (Koltiva). Opsi: park sampai keputusan turun. Rekomendasi: park.
10. **Panel Alert dashboard** (`dummy.ts:52-56`). Prosa peringatan hardcoded. Opsi: drop / bangun ulang sebagai alert rule-based dari state nyata (survei lewat jatuh tempo, `emission_factor` hilang, blok over-budget). Rekomendasi: drop sekarang, bangun ulang setelah ada data.
11. **"Recommended Actions" peta karbon** (`carbonMapSummary.rekomendasi`, `dummy.ts:202-206`). Nasihat agronomi yang diinvent. Rekomendasi: **drop** — `concept:254` melarang menginvent agronomi.
12. **5 dari 8 kartu laporan** (Agroforestry Progress, Tree Inventory, Economic Value, MRV Evidence, Traceability — `dummy.ts:281-290`). Target hanya 3 laporan built-in. Opsi: drop, atau kelak jadikan report definition row via D1 (phase 2). Rekomendasi: drop dari UI; D1 phase 2 membuatnya bisa dibuat sendiri oleh user.
13. **`/mobile-preview` dan `MobileFrame`** — bezel telepon 390×720 sebagai prop demo desktop. Rekomendasi: drop keduanya (duplikat `MobileLayout.tsx:12-17` byte-per-byte).
14. **3 sub-item sidebar Traceability** (`Sidebar.tsx:50-52`) dan sub-item "Form Builder"/"Hasil Survei" — menjanjikan yang dilarang / belum ada. Rekomendasi: drop dari nav.
15. **Nilai `approval_type` untuk entitas orphan** (`0012_workflow.sql:6-9`: `carbon_calculation_run`, `mrv_package`, `emission_factor`). Rekomendasi: buang saat enum ditulis ulang.

---

## 4. Sensus titik hardcoded

**Total ≈235 titik hardcoded** + **690 token numerik fabrikasi** di dalam 3 modul data. Metode hitung: 57 dataset export statis + 16 koleksi const inline di halaman + 25 array `options:` FilterBar + 11 `<option>` literal + 12 `defaultValue` form + 27 prop `value="…"` literal + 83 handler toast-only + 4 `setTimeout` palsu. Token numerik: `dummy.ts` 396, `certification.ts` 220, `mobile.ts` 74.

Tanda **[FATAL]** = angka fabrikasi pada dashboard finansial/eksekutif atau klaim karbon — kegagalan yang disebut eksplisit fatal oleh `concept:40`.

### Kind 1 — Modul data statis (akar masalah)
- `src/data/dummy.ts:1` — komentar "No backend involved". 290 baris, 32 export. **HAPUS SELURUH MODUL. [FATAL]**
- `src/data/certification.ts` — 130 baris, 16 export. Hapus (mengikuti disposisi modul Sertifikasi).
- `src/data/mobile.ts` — 65 baris, 9 export. Hapus.
- 39 file di `src/` mengimpor `@/data/*`. Semua harus jadi query.

### Kind 2 — Angka fabrikasi di dashboard finansial & eksekutif [SEMUA FATAL]
- `dummy.ts:12-14` — "25.734,62 ha" / "7.725 ha" / "18.010 ha" (+ trend "+1,2%" yang juga fiktif). Target sampai 100.000 ha. → `SUM(ST_Area(geom))`.
- `dummy.ts:15-16` — "Progress Tanam Kelapa 68%" / "Durian 42%". **Hapus metriknya**, bukan angkanya.
- `dummy.ts:17-18` — "Survival Rate 91,2% / 86,4%". Hapus; ganti hitungan bibit sehat.
- `dummy.ts:19` — "Biaya Budidaya Bulan Ini Rp 1,28 M". → `SUM(expenditure.total) WHERE approved`.
- `dummy.ts:20-23` — Gross Emission 42,6 / Sequestration 57,4 / Net −14,8 / Status "Net Sink". Realitas: net emitter.
- `dummy.ts:128-137` — `economicKpis`: Estimasi Produksi 1.842 & 684 ton/th, Pendapatan Rp 18,6 M, Biaya Rp 11,2 M, Biaya/Ha Rp 1,45 jt, Biaya/Pohon Rp 28.400, Biaya/Kg Rp 4.560, **Margin 39,8%**, **Payback 3,4 tahun**. Margin & payback = angka paling menyesatkan di prototype (kedua operand fiksi).
- `dummy.ts:233-238` — `costingKpis`: Total Biaya Rp 1,28 M, Anggaran Rp 1,35 M, Variance −5,2%, Biaya/Ha Rp 1,45 jt, Biaya/Pohon Rp 28.400, Biaya/Kg Rp 4.560. **Ini headline direktur keuangan, dan semuanya diinvent.** Variance konsisten dengan dua baris di atasnya secara manual → tidak akan bergerak saat expenditure masuk → **AT3 gagal by construction**.
- `dummy.ts:111-118` — tree inventory: 28.450 / 6.120 / 31.560 hidup / 1.245 mati / 1.245 perlu penyulaman / **14.870 Produktif**. Tidak konsisten internal (28.450+6.120 ≠ 31.560+1.245) dan "Perlu Penyulaman" adalah copy-paste dari "Mati".
- `dummy.ts:165-169` — 486 aktivitas / 462 termapping costing / 401 termapping EF / 61 missing (486−401 = 85, bukan 61) / Gross Emission 42,6.
- `dummy.ts:195-201` — 45 blok, 22 Net Sink, top emitter/sink dengan angka dipanggang ke string tampilan; `AGF-E01` bahkan tidak ada di array `blocks` (`:7`).
- `dummy.ts:209-228` — paket MRV: net balance, carbon intensity "−0,18 kgCO2e/kg produk", data completeness 87%, 8 hitungan section (Polygon 45, Activity 486, Cost 462, EF 401, Tree 128, Foto 312, Drone 18, Approval 64).
- `src/app/(app)/agroforestry/page.tsx:12-25` — 12 KPI literal **inline di halaman**, tidak melalui `dummy.ts`.
- `src/app/(app)/agroforestry/planting/page.tsx:11-18` — 6 KPI inline.
- `src/app/(app)/sertifikasi/capa/page.tsx:13-18` — 4 KPI inline.
- `src/app/(app)/gis/page.tsx:48-52` — 5 nilai literal di panel yang tertulis "klik blok untuk melihat detail".
- `src/app/page.tsx:40-45` dan `:216-219` — klaim publik: 25.734,62 ha, survival 91,2%, Net Sink, 42,6/57,4/−14,8 tCO2e. **Halaman publik → risiko reputasi.**

### Kind 3 — Dataset chart statis (semua melanggar `concept:41`)
- `dummy.ts:26-33` `plantingProgressChart` (6×2 = 12 literal) **[FATAL — timeline tanam yang tak pernah terjadi]**
- `dummy.ts:35-42` `emissionVsSequestrationChart` (12 literal, sequestration di atas emisi setiap bulan) **[FATAL]**
- `dummy.ts:140-147` `costVsRevenueChart` — dan baris `:145` punya key duplikat mati `biaya2: 2.4, biaya: 2.4`, **bukti dataset ditulis tangan** **[FATAL]**
- `dummy.ts:148-155` `productionProjectionChart` 2026–2030 (10 literal) **[FATAL — proyeksi 5 tahun untuk lahan yang belum ditanam]**
- `dummy.ts:240-247` `budgetVsActualChart` (6×2) **[FATAL — chart finansial]**
- `dummy.ts:156-163` `economicTable` per blok (produksi/pendapatan/biaya/margin) **[FATAL]**
- `src/app/(app)/agroforestry/economic-value/page.tsx:44-71` — dataset ekonomi inline di JSX
- `src/app/(app)/agroforestry/planting/page.tsx:20-31` — `targetVsAktual` + `statusDonut` inline
- `src/data/certification.ts:16-28` — donut + chart per estate

### Kind 4 — Koordinat peta palsu (bukan geografi)
- `dummy.ts:58-63` `blockStatusMap` — `{x: 22, y: 28}` = **persentase CSS**, dikonsumsi 4 screen **[FATAL]**
- `dummy.ts:186-192` `carbonMapBlocks` — `{x,y,w,h}` persentase = persegi CSS **[FATAL]**
- `src/components/ui/MapPanel.tsx:21-83` — gradient + SVG grid + div `left:{x}%`; readout koordinat tetap `3°12'45.6" S 114°45'30.2" E`; tombol zoom mati
- `src/components/mobile/MapMiniPreview.tsx:5-12` — basemap gradient + `"GPS: -1.234567, 103.456789"`
- `src/components/mobile/PolygonDrawingCanvas.tsx:16` — **`const areaHa = (points.length * 1.8).toFixed(2)`** → hektar dihitung dari **jumlah tap**, lalu ditampilkan sebagai "Luas est. … ha" `:47`. **[FATAL — pengukuran yang difabrikasi dari interaksi UI]**
- `src/app/mobile/foto/page.tsx:22` — Lat/Long literal di Sumatra, bukan area proyek Kalimantan

### Kind 5 — Master data di dalam kode (melanggar `concept:32-35`)
- `dummy.ts:3` — `company = "PT Agro Lestari Nusantara"` **[FATAL — satu company membuat multi-tenancy wajib mustahil]**
- `src/components/layout/Topbar.tsx:11` — company yang sama, di dalam tombol switcher tanpa handler
- `src/app/login/page.tsx:45`, `src/app/(app)/mobile-preview/page.tsx:35` — company yang sama lagi
- `dummy.ts:5` — 3 estate literal
- `dummy.ts:7` — **5 blok literal** vs target ~3.300 **[FATAL]**
- `dummy.ts:9` — `CarbonStatus` sebagai union tipe (harus diturunkan dari perhitungan)
- `dummy.ts:66-75` — 9 map layer
- 25 array `options:` FilterBar tersebar di 8 halaman, contoh: `laporan/page.tsx:20-21`, `sertifikasi/reports/page.tsx:20-21`, `economic-value/page.tsx:20-22` (bahkan memfabrikasi opsi harga "4.500 / 4.800 / 5.000")
- 11 `<option>` literal, contoh `mobile/form/page.tsx:20`, `mobile/nursery/page.tsx:44` (3 kode blok), `mobile/panen/page.tsx:29`
- `src/app/(app)/mobile-preview/page.tsx:9-10` — `kondisiOptions`, `faseOptions` (termasuk "Produktif")
- `src/app/(app)/approval/page.tsx:8` — 8 tipe approval
- `src/app/(app)/sertifikasi/template-builder/page.tsx:11` — 14 tipe field (satu-satunya array yang **layak** dipromosikan ke master)

### Kind 6 — Koefisien emisi yang diinvent (dilarang `concept:141`) [FATAL]
- `dummy.ts:172-178` — `"1,33 kgCO2e/kg"`, `"2,68 kgCO2e/liter"`, `"0,12 kgCO2e/km"` + hasil `1,66 / 0,86 / 0,14 / 2,02 tCO2e`, dirender sebagai otoritatif.
- **Kebocoran ke skema:** `db/migrations/0009_carbon.sql:17` mereproduksi `1.33` sebagai contoh kanonik di DDL. Angka fiksi sudah merambat dari mock ke desain database.

### Kind 7 — Form ter-seed dengan angka fabrikasi (12 `defaultValue`)
- `src/app/mobile/nursery/page.tsx:27,30,33` — hidup 1180 / mati 32 / rusak 8. **[FATAL — form survei tidak boleh ter-prefill]**
- `src/app/mobile/form/page.tsx:25,45` — jumlah 25, catatan "Tanaman dalam kondisi baik…"
- `src/app/mobile/agroforestry/page.tsx:26` — "Jumlah Tertanam" 25 **[FATAL — tidak ada yang ditanam]**
- `src/app/mobile/panen/page.tsx:34,37` — berat "1.240 kg" sebagai **string** (tak bisa divalidasi/dijumlah), tim free text
- `src/app/(app)/mobile-preview/page.tsx:68,118`
- `src/app/mobile/login/page.tsx:34`, `src/app/login/page.tsx:12` — kredensial ter-seed

### Kind 8 — Logika tersimulasi (83 handler + 4 `setTimeout`)
- `src/app/login/page.tsx:20-23` — login berhasil tanpa verifikasi apa pun **[FATAL]**
- `src/app/mobile/login/page.tsx:16,53` — sama; tombol biometrik men-toast sukses tanpa navigasi **[FATAL]**
- `src/app/(app)/agroforestry/net-carbon-balance/page.tsx:20-27` — `setTimeout(1500)` men-toast jawaban yang sudah ditulis **[FATAL]**
- `src/app/mobile/form/page.tsx:59` — men-toast "validasi mandatory field berhasil" padahal tidak ada validasi **[FATAL]**
- `src/app/mobile/foto/page.tsx:14` — men-toast "metadata GPS tersimpan otomatis"; tidak ada yang tersimpan **[FATAL]**
- `src/app/mobile/panen/page.tsx:51` — "handover ke collection point dicatat"; tidak ada yang dicatat **[FATAL]**
- `src/app/mobile/polygon/page.tsx:37,56,62` — walk-boundary/simpan/submit hanya toast **[FATAL]**
- `src/components/ui/ApprovalCard.tsx:43-49,73-79` — teks diff palsu; komentar reject **dibuang** → melanggar `concept:52,187` **[FATAL]**
- `src/app/(app)/agroforestry/activity-emission/page.tsx:29-31` — "Run Calculation" toast
- `src/components/mobile/EvidenceCapture.tsx:6,16` — `photos = 2` palsu; klaim penyimpanan lat/long
- `src/components/ui/LayerControl.tsx:7-9` — state toggle tidak pernah diangkat/dikonsumsi
- `src/components/ui/FilterBar.tsx:13` — `<select>` tanpa `value`/`onChange`/`name`: filter **tidak melakukan apa pun**
- `src/app/mobile/peta/page.tsx:18` — search box tanpa handler
- `src/components/mobile/GPSAccuracyBadge.tsx:3` — `accuracy = 4.2` default
- `src/app/mobile/page.tsx:20-21,50,71` — `draftCount`/`todayCount` dari `.length`/`.filter` in-memory; izin GPS literal "Aktif"; sync = toast

### Kind 9 — Kontrak komponen yang membuat requirement tak terpenuhi
- `src/components/ui/DataTable.tsx:7-11` — **satu-satunya komponen tabel (19 call site)**, prop hanya `{columns, rows, keyField}`. Tanpa paginasi/sort/search/total/loading/empty state; `rows.map` `:25` merender semuanya. **Gagal `concept:49` langsung pada 3.300 blok.** `accessor: (row)=>ReactNode` tidak bisa disort server-side → butuh `sortKey` yang menamai kolom DB.
- `src/components/ui/MetricCard.tsx:26` — `value: string` → setiap angka **diformat oleh caller**; itu persis tempat hardcode hidup. Butuh `value: number|null` + formatter + cabang "Belum ada data".
- `src/components/ui/StatusBadge.tsx:3-62` — 60 entri dikunci ke **string tampilan Indonesia**; tidak punya `draft` dan tidak punya `under_review` → **tidak dapat mengekspresikan state machine wajib** (`concept:187`).
- `src/components/ui/charts.tsx:8` — data sudah berupa prop (bagus), tetapi tanpa empty state: recharts dengan `data=[]` menggambar aksis kosong yang **terbaca sebagai nol**, bukan "tidak ada data" — pada dashboard finansial ini melanggar `concept:40`.
- `src/components/ui/PlaceholderPage.tsx` — tidak punya badge "STUB", padahal `concept:250` mewajibkan stub diberi label jelas.
- `src/components/layout/Sidebar.tsx:15-162` — 148 dari 265 baris meng-encode IA 13-grup yang lama (dihapus); `useState` initializer `:166-168` hanya menghitung grup terbuka saat mount pertama → navigasi klien tidak mengembangkan grup yang benar; `:261` menulis "v0.1 · Prototype".
- `src/components/mobile/MobileLayout.tsx:12-18` — bezel 390×720 + status bar palsu "09:41 / 4G 100%" + `h-[720px]`. Bukan shell PWA (`concept:213`).

### Kind 10 — Hardcode di lapisan dokumen/skema [FATAL]
- `docs/01-desain-skema-database.md:5` — menyatakan **`src/data/dummy.ts` sebagai sumber kebenaran domain**.
- `docs/01-desain-skema-database.md:1234` — merencanakan `0014_seed` diisi dari `src/data/*.ts` "supaya UI sekarang bisa langsung diuji". **Ini akan mencuci angka fiksi ke dalam Postgres dan membuat AT6 mustahil lulus.** Catatan ini harus dibatalkan.
- `docs/01:11` — scope "34 halaman"; realitas 52 halaman → 15 screen mobile + `/login` + `/` di luar scope desain skema.
- Komentar migrasi mengutip file UI prototype sebagai otoritas: `0006_survey.sql` ("dari `fieldTypes` di sertifikasi/template-builder"), `0008_costing.sql` ("KPI 'Termapping ke Costing: 462 dari 486'"), `0009_carbon.sql` ("KPI 'Missing Factor: 61'"), `0011_cert.sql`, `0012_workflow.sql`.

---

## 5. Konflik asumsi domain

| Area | Prototype mengasumsikan | Kenyataan proyek | Dampak | Tindakan |
|---|---|---|---|---|
| **BLOCKER — Panen aktif** | Screen `/mobile/panen` dengan batch nyata (1.240 kg kelapa, "Tim Panen 2"), scan QR batch, gambar area panen, submit yang mengklaim handover tercatat; assignment ASG-004; quick action "Scan QR" | Belum ditanam, tidak ada panen (`concept:14`); rekam panen = struktur data saja, UI dimatikan (`:129`); tanpa UI rantai/QR (`:150`) | Artefak paling menyesatkan: demo petugas lapangan memperlihatkan entry panen untuk kebun tanpa pohon | Hapus screen + `panenMobileBatches` + ASG-004 + quick action + semua afordans QR. Sisakan skema `harvest_batches` + `revenue` dengan `// TODO: phase 2` — **skema itu belum ada**, hanya outline di `docs/01:1157` |
| **BLOCKER — Proyeksi produksi 2026-2030** | Kelapa 1.842 t (2026) → 3.260 t (2030); durian 684 → 1.910 t; produksi per blok sampai satuan ton (`dummy.ts:148-162`) | Nol pohon tertanam; kelapa butuh ~4-6 th, durian ~7-10 th sampai berbuah → produksi 2026 mustahil secara fisik | Forecast 5 tahun bermuatan pendapatan disajikan sebagai fakta; jika manajemen melihatnya di demo, ekspektasi ter-anchor pada sesuatu yang tak dapat ditepati | Hapus `productionProjectionChart`, `economicTable`, dan seluruh halaman Nilai Ekonomis. Jika forecast diinginkan kelak: model skenario berlabel jelas dengan kurva yield yang **diisi admin**, + `// DECISION NEEDED:` untuk sumber agronomi. Jangan chart di dashboard operasional |
| **BLOCKER — Revenue, margin, payback** | Pendapatan Rp 18,6 M, Margin 39,8%, Payback 3,4 tahun, Biaya/Kg Rp 4.560; chart biaya-vs-pendapatan per blok; filter skenario harga | Nol pendapatan; permintaan direktur keuangan adalah P&L dan break-even dari expenditure nyata (`concept:17,171`) | Kedua operand fiksi. Ini persis mode kegagalan yang `concept:40` sebut fatal. Tidak dapat diselamatkan dengan refactor — definisi metriknya salah untuk proyek pra-pendapatan | Hapus `economicKpis` + `costVsRevenueChart`. Ganti dengan metrik pra-pendapatan: capex kumulatif, cost/ha, cost/blok, cost/bibit, actual vs budget, indikator break-even yang merender "Belum dapat dihitung — belum ada pendapatan". Model Revenue/AR tetap dibuat, UI disembunyikan |
| **BLOCKER — Narasi karbon terbalik** | Sequestration 57,4 > emisi 42,6 → Net −14,8 "Net Sink", stabil dan tren membaik. Diulang di 7 tempat termasuk landing page publik | Sequestration ≈ 0 (semua bibit); land clearing = sumber emisi terbesar fase ini (`concept:138-139`) → **net emitter**. Prototype bahkan tidak punya line item land clearing | Cerita lingkungan adalah kebalikan kenyataan. Tujuan bisnis (b) adalah reputasi korporat → klaim Net Sink tanpa dasar adalah eksposur greenwashing, bukan sekadar bug | Hapus semua literal sink/net balance. Bangun ulang: emisi = land clearing + felling + transport + BBM + pupuk (clearing pertama & dominan); sequestration = dari DBH, render 0 + "belum ada tegakan". Tampilkan net emisi positif. Tandai setiap angka butuh validasi agronomi + `// DECISION NEEDED:` untuk sumber EF & alometrik |
| **BLOCKER — Inventaris sumber emisi** | Aktivitas emisi: Pemupukan NPK, Solar Traktor, Pestisida, **Transport Panen (1.180 km)**, **Pengeringan Kelapa (4.500 kg)**; cost center Maintenance/Mekanisasi/Plantation/Logistik/**Processing** | Emisi fase ini: land preparation (clearing/felling), transport, BBM, pupuk (`concept:138`). Tidak ada panen untuk diangkut, tidak ada kelapa untuk dikeringkan | Model emisi mengukur aktivitas yang bertahun-tahun lagi terjadi, sambil **menghilangkan sumber nyata terbesar** | Seed ulang `activity_types` + `emission_factors` untuk fase land prep; nonaktifkan Processing & harvest transport. Tambah tipe aktivitas land clearing bersatuan per-ha + `// DECISION NEEDED:` untuk faktor biomassa. **Jangan invent koefisien** |
| **BLOCKER — Sequestration tanpa input DBH** | `sequestration_models` menyimpan `tco2e_per_tree_year` flat (`0009_carbon.sql:50-63`); dropdown "Default Growth Factor \| Allometric Model" sebagai pilihan matang; `tree_survey_points` menyimpan `tree_count`/`condition`/`growth_phase` — **tanpa kolom diameter/tinggi** | Sequestration dihitung dari **DBH per fase pertumbuhan** (`concept:139`); memasukkan pengukuran DBH harus langsung menggerakkan Sustainability Report (`:57`) | Rantai wajib "DBH → sequestration berubah" **tidak dapat diimplementasikan**: 0 hit untuk "dbh"/"diameter" di seluruh `src/` dan `db/`. Ini salah satu dari dua rantai acceptance | Tambah `dbh_measurements` (tree/point, `dbh_cm`, `height_m`, `measured_at`, `growth_phase_id`) + master `allometric_coefficients` (`source_standard NOT NULL`). Tambah form DBH ke set mobile. Sambungkan sequestration ke baris DBH; render 0 + empty state selama belum ada |
| **BLOCKER — Survival rate sebagai KPI** | 91,2% / 86,4% di 6 permukaan: KPI eksekutif, overview agroforestry, halaman planting, detail plot, kolom tabel per blok, landing page publik | Survival rate adalah metrik pasca-tanam; tanpa tanaman ia tak terdefinisi. Padanan fase nursery = hitungan bibit sehat (`concept:39,110`) | 6 permukaan menampilkan performa agronomi fabrikasi | Hapus semua KPI & kolom survival rate. Ganti "Bibit sehat / rusak / mati" dari `nursery_inspections` terbaru per batch. Kembalikan survival rate hanya sebagai metrik pasca-tanam, dijaga empty state |
| **BLOCKER — Progress tanam & pohon tertanam** | Progress 68%/42%, chart 6 bulan naik, 28.450 dari 41.800 kelapa, 6.120 dari 14.500 durian, 12.848 dari 18.400 di AGF-A12, 1.245 perlu penyulaman | Nol pohon tertanam. Pelaporan operasional fase ini: bibit sehat, pohon tertanam (= nol secara sah), **progress land preparation** (`concept:180`) | Satu modul utuh melaporkan aktivitas yang belum dimulai; penggantinya (Land Preparation Check) **belum ada sama sekali** | Kecilkan modul planting menjadi plan-only (target pohon per blok per musim; `planting_records` kosong). Tampilkan "0 pohon tertanam" secara jujur. Bangun Land Preparation Check sebagai modul yang benar-benar membawa progress sekarang, dan jadikan sumber KPI progress |
| **BLOCKER — Inventaris pohon produktif & fase 'produktif'** | 28.450+6.120 pohon berdiri, 14.870 "Produktif"; baris survei berfase Produktif/Vegetatif; enum `('bibit','vegetatif','produktif')` (`0007_agro.sql:6`); form mobile **default ke "Produktif"** (`mobile-preview/page.tsx:16`) | Semua masih bibit di nursery; tidak ada tegakan, tidak ada fase produktif. `growth_phase` wajib jadi master data (`concept:209`) | Agregat dan nilai per-baris keduanya salah. Enum hardcoded **memblokir** requirement master data: menambah fase butuh migrasi → uji "tanpa redeploy" (`concept:35`) gagal. Default "Produktif" akan menulis fase salah secara senyap | Kosongkan tree inventory (0 baris + empty state). Ubah `app.growth_phase` dari ENUM menjadi tabel master `growth_phases` + FK, seed bibit/juvenil/vegetatif/generatif. Default selector ke bibit. Arahkan modul ke survei kondisi bibit untuk fase ini |
| **BLOCKER — Skala (blok & luas)** | 5 blok literal (`dummy.ts:7`), total 45 blok (`:195`), 25.734,62 ha, 3 estate; setiap tabel merender array penuh; MRV melaporkan 45 polygon | Sampai 100.000 ha, ~3.300 blok (`concept:13`); "tabel tanpa paginasi server tidak akan bertahan" (`:49`) | ~73× lebih banyak blok, ~4× luas. Setiap dropdown blok, setiap tabel array penuh, setiap chart per-blok (satu bar per blok), dan peta status blok menjadi tidak terpakai. Chart dengan blok di aksis-x bukan hanya lambat — **tidak terbaca** | Paginasi + filter/sort/search server-side pada **setiap** list sebelum UI blok dibangun ulang. Dropdown blok → async searchable select. Chart per-blok didesain ulang jadi top-N/agregat. Load test dengan 3.300 blok ter-seed sebagai gate acceptance |
| **BLOCKER — Rendering peta & indeks spasial** | Tidak ada peta. `MapPanel` = div gradient + SVG grid dekoratif; "blok" = persegi berwarna pada koordinat persentase; readout koordinat tetap; tombol zoom mati; **0 library peta di `package.json`**; toggle layer dekoratif | Polygon blok dirender dari kolom GeoJSON di DB; blok baru langsung muncul; klik blok menarik data operasional & biaya blok itu (`concept:44-46`); map view = prioritas demo 6d | Bagian paling meyakinkan secara visual punya **nol** kapabilitas nyata — dan harus melayani ~3.300 polygon. Ini build dari nol (pemilihan library, vector tile / simplifikasi geometri, `ST_SimplifyPreserveTopology`, query bbox-viewport, click→detail fetch), bukan refactor. Indeks GIST di migrations adalah satu-satunya bagian yang bisa dipakai | Perlakukan peta sebagai pekerjaan baru. Pilih client (MapLibre/Leaflet) + strategi serving 3.300 polygon (bbox + simplifikasi per zoom, **bukan** "kirim semua GeoJSON"). Pertahankan indeks GIST. Ganti `MapPanel` seluruhnya; hapus readout koordinat palsu dan toggle layer sampai layer nyata |
| **BLOCKER — Tenancy: 1 vs 5-10 entitas** | Satu company hardcoded di 4 tempat; hierarki company→estate→divisi→blok; `users.company_id` FK tunggal NOT NULL (`0002_core.sql:41`); `UNIQUE (company_id, email)` (`:50`); RLS dari satu setting scalar (`0013_rls.sql:44`) | Lahan tersebar di 5-10 entitas; multi-tenant wajib; satu user dapat mengakses **beberapa** entitas / block group (`concept:15,192`); `company_entity` = master wajib (`:209`) | Blocker struktural: supervisor yang membawahi 3 entitas tidak dapat direpresentasikan; pelaporan konsolidasi lintas entitas untuk direktur keuangan mustahil di bawah policy sekarang. `UNIQUE(company_id,email)` membuat orang yang sama jadi 2 baris user. Perbaikan menyentuh 15 tabel tenant + 4 policy tabel anak. `docs/01:1200` menilai ini "risiko rendah" — **penilaian itu salah** | Tambah `user_company_access(user_id, company_id, role)`; `users.company_id` jadi home/default (atau dibuang); email unik global. Tulis ulang RLS dari `=` menjadi `IN`/`EXISTS` atas daftar entitas yang dapat diakses, set konteks berupa list. Fungsikan switcher entitas di Topbar + mode konsolidasi "semua entitas saya". **Jawab `concept:228` sebelum seeding** |
| **BLOCKER — State machine approval** | 2 UI approval paralel (`/approval` + `/sertifikasi/internal-review`); `ApprovalCard` 3 state lokal; komentar reject dibuang; **6 enum status bersaing di DB**: `approval_status` menunggu/disetujui/ditolak/dibatalkan (`0012:10`), `cost_status` (`0008:6`), `verification_status` (`0003:8`), `assignment_status` (`0006:11`), `run_status` (`0009:8`), `assessment_status` (`0011:6`) | Satu state machine untuk semua form: `draft → submitted → under_review → approved\|rejected`, alasan wajib, dapat resubmit (`concept:187`); status = **kolom database** yang menggerakkan hak akses dan tampilan di modul asal (`:52`) | `under_review` muncul **0×** di seluruh migrations. Tidak ada tabel entitas yang punya kolom `approval_status` — approval hidup hanya di tabel samping polimorfik (`0012:17-18`), bertentangan dengan `concept:52,205`. `approval_steps.comment` **nullable** → alasan penolakan tidak dipaksakan di level DB. Tidak ada kolom resubmit/supersedes | Satu enum kanonik `approval_status`; tambahkan kolomnya ke **setiap** tabel form; `rejection_reason NOT NULL` saat status = rejected (CHECK); tambah `resubmitted_from_id`; satukan `/approval` + `/sertifikasi/internal-review` menjadi E1 |
| **BLOCKER — Master data & enum sebagai kode** | 12 master wajib: 6 tidak ada tabelnya sama sekali (`fertilizer_type`, `pesticide_herbicide_type`, `unit_of_measure`, `cost_category`, `seedling_variety`, `allometric_coefficient`); `unit` free text di 3 tempat (`0008:29,41,60`); `variety` free text (`0003:20`, `0005:22`); `growth_phase`/`tree_condition`/`land_use`/`field_type`/`cert_decision` = Postgres ENUM | Semua dropdown dari tabel master; super admin dapat menambah/edit dari UI dan langsung muncul di semua dropdown **tanpa redeploy** (`concept:32-35,209`) | **ENUM adalah padanan DB dari `constants.ts` yang dilarang `concept:34`** — menambah nilai butuh migrasi. AT1 tidak punya ujung mana pun: "fertilizer"/"pupuk"/"Urea"/"KCl" hanya ada sebagai string tampilan di `dummy.ts:45,173`; tidak ada tabel, form, maupun dropdown pupuk | Konversi ENUM domain menjadi tabel master + FK. Bangun modul Master Data di bawah `super_admin` (`/pengaturan`) sebagai screen pertama, karena AT1 bergantung padanya |
| Costing tidak dapat menopang C2/C4/C5 | `cost_transactions` (`0008:51-67`): tanpa `created_by`, tanpa `unit_price`, tanpa `cost_category`/sub-kategori, tanpa link lampiran, `unit` free text, status enum Indonesia tanpa `under_review`, `UNIQUE (company_id, erp_document_no)` (`:66`). `budgets` (`:73-81`) di-key `(company, estate, cost_center, period_month)` — **tanpa `block_id`** | Entry wajib: kategori/sub-kategori/blok/qty/unit/harga satuan/total/tanggal + **lampiran bukti pembelian wajib** (`concept:159-160`); `created_by` wajib (`:205`); expenditure blok X dibandingkan **budget blok X** (`:56`) | Tabel terpenting untuk demo, dan kehilangan hampir semua yang diwajibkan form. `budgets` tanpa `block_id` membuat **AT3 tidak dapat dibangun**. `UNIQUE erp_document_no` sudah mendahului keputusan blocker #1 | ALTER `cost_transactions` (~9 kolom); re-key `budgets` dengan `block_id` + `cost_category_id`; buang constraint ERP sampai keputusan Koltiva turun; tambah trigger audit pada `cost_transactions` (sekarang tidak ada) |
| Model Revenue/AR & Harvest tidak ada | Audit sebelumnya menyarankan "pertahankan skema `harvest_batch`" | `grep revenue\|sales\|receivable\|harvest` di `db/migrations/` → **0 hit** | `concept:164` mewajibkan model revenue **lengkap** dengan UI disembunyikan; `concept:129` mewajibkan struktur harvest. **Skema itu tidak ada untuk dipertahankan** — hanya outline di `docs/01:1157` | Bangun `harvest_batches`, `revenues`, `receivables` sebagai tabel baru, UI disembunyikan, `// TODO: phase 2` |
| Carbon intensity per kg produk | "−0,18 kgCO2e/kg produk" di result panel & paket MRV; kolom `carbon_runs.carbon_intensity` (`0009:76`) | Tidak ada produk → denominator nol/tak terdefinisi. Output = net carbon per blok & agregat (`concept:140`) | Metrik bagi-dengan-nol ditampilkan sebagai angka negatif (favorable). Laporan apa pun yang memakainya salah | Hapus dari seluruh UI. Kolom tetap ada, NULL, dengan komentar bahwa ia bermakna setelah produksi pertama. Laporkan net tCO2e per blok dan per ha |
| Duplikasi master supplier | `suppliers` (`0005:6-14`) dan `vendors` (`0008:14-22`) — dua master untuk pihak yang sama | Satu master `supplier` (`concept:209`) | Nursery yang juga menagih pupuk butuh 2 kode di 2 tabel; dropdown supplier form Expenditure akan berbeda dari form bibit | Merge jadi satu business-partner master (`type[]`, npwp, kontak, `is_active`); arahkan `seed_batches.supplier_id` & `cost_transactions.vendor_id` ke sana |
| `blocks.geom NOT NULL` | Blok tidak dapat didefinisikan sebelum didigitasi (`0003:32`) | Apakah lahan sudah disurvei & diblok di lapangan **masih keputusan terbuka** (`concept:227`); 3.300 blok harus dibuat | Mendahului keputusan #3; menghalangi pendaftaran blok sebelum batas tersedia | `geom` jadi nullable; peta merender hanya blok yang sudah didigitasi |
| Role & auth | `app.user_role` = 8 jabatan prototype (`0002:34-37`); tidak ada `creator`/`super_admin`; auth via Identity Platform sudah diasumsikan (`0002:42`, `0013:6`) | 3 role: `creator`, `approver` (superset creator), `super_admin` (`concept:189-191`) | Enum tertutup tidak dapat mengekspresikan "approver adalah superset creator"; stack auth sudah dipilih tanpa keputusan Anda (`concept:226`) | Ganti nilai role, atau tabel `roles` + role per-entitas di `user_company_access`. Angkat pemilihan stack ke keputusan eksplisit |
| Drone processing pipeline | `drone_orthophotos` dengan `cog_path`, `gsd_cm`, `tile_url`; `estate_id NOT NULL`, **tanpa `company_id`**, tidak ada di daftar RLS (`0013:34-37`) | "Attachments + map layer; **jangan** bangun processing pipeline" (`concept:133`) | Membangun tepat yang dilarang, **dan** tidak dapat di-scope per tenant → kebocoran data lintas entitas di bawah multi-tenancy wajib | Sederhanakan jadi lampiran; tambah `company_id` + `block_id` nullable; aktifkan RLS; ambil file dari `evidence_files` |
| Mobile scope | 15 screen mobile termasuk dashboard mini, sync, draft, panen, sertifikasi | Mobile **hanya** untuk pengumpulan data — bukan dashboard, bukan approval (`concept:212`); target PWA (`:213`) | Screen mobile melampaui scope, dan tidak ada `manifest.json`/service worker → belum PWA sama sekali | Kecilkan mobile ke: login, home tugas, form (schema-driven), polygon capture, foto, peta read-only. Tambah manifest + shell PWA nyata |

---

## 6. Status kerja database yang sudah ada

Jujur: **pekerjaan skema itu nyata, berkualitas, dan salah sasaran.** Ia direverse-engineer dari prototype statis, bukan dari `docs/00`.

**Angka:**
- 13 file migrasi, 1.089 baris, **59 `CREATE TABLE`**, 22 ENUM, 5 function, indeks GIST PostGIS, RLS, trigger audit.
- `docs/01-desain-skema-database.md`: 1.270 baris.
- **Tidak dapat dijalankan**: tidak ada `db:migrate` di `package.json`, tidak ada klien `pg`/ORM, tidak ada `.env.example`, tidak ada compose file, tidak ada ledger `schema_migrations`, `README.md` masih boilerplate `create-next-app`. `0014_seed` terdaftar di `docs/01:1227` tetapi **tidak ada di disk**.
- Bukti bahwa sasarannya prototype: `docs/01:5` menyebut `src/data/dummy.ts` sebagai sumber kebenaran; `docs/01:11` menulis scope "34 halaman"; grep `100.000|3.300|multi-tenan|refinement` di `docs/01` → hanya 1 hit tak relevan ("IPCC 2019 Refinement").

**BERTAHAN (17 tabel, tanpa perubahan DDL atau perubahan sepele)** — lihat daftar lengkap di §8. Yang paling berharga:
- Keluarga form schema-driven `forms` / `form_versions` / `form_fields` / `survey_submissions` / `submission_values` (`0006_survey.sql`). Submission menunjuk ke **versi** form (`:25`) sehingga data lama tetap terbaca. Ini kecocokan tulus dengan `concept:62-66` dan **jauh lebih maju dari UI mana pun di prototype**.
- `blocks` dengan `geom geometry(MultiPolygon,4326)`, `area_ha GENERATED ALWAYS AS (ST_Area(geom::geography)/10000.0) STORED`, indeks GIST, CHECK `ST_IsValid` (`0003_gis.sql:25-50`). `area_ha` terhitung inilah yang membuat cost-per-hectare tidak dapat dicurangi → langsung melayani AT6.
- `emission_factors` versioned + append-only + `source_standard NOT NULL` + `source_citation` + `uncertainty_pct` (`0009_carbon.sql:11-33`) — **lebih baik dari yang diminta** `concept:141`.
- `evidence_files` + `evidence_links`: polimorfik, `sha256 NOT NULL`, `geom` Point dari EXIF (`0010_evidence.sql`). Melayani bukti pembelian C2 dan lampiran setiap form.
- `audit_log` append-only + trigger generik (`0012_workflow.sql:44-57,65-84`).
- Nursery hampir tepat: `seed_batches`, `nursery_inspections`, `seed_distributions → block_id` (`0005_nursery.sql`), termasuk keputusan benar untuk tidak mendenormalisasi hitungan.
- `boundary_imports` + `boundary_overlaps` + `app.detect_block_overlaps()` (`0004_gis_ops.sql:9-66`) — keputusan produk yang benar (laporkan overlap, jangan hard-reject) dan wajib pada 3.300 blok.

**HARUS DIREVISI (24 tabel).** Ringkas (detail di §8): `companies`, `users`, `user_estate_access`, `blocks`, `crops`, `drone_orthophotos`, `suppliers`+`vendors` (merge), `seed_batches`, `nursery_inspections`, `seed_distributions`, `forms`, `form_fields`, `survey_submissions`, `planting_plans`, `tree_survey_points`, `cost_centers`, `activity_types`, `activities`, `cost_transactions`, `budgets`, `approval_requests`, `approval_steps`, `sequestration_models`, `carbon_runs`. Tema revisinya empat: (1) multi-tenancy, (2) `approval_status` sebagai kolom pada entitas, (3) master data menggantikan free text/ENUM, (4) indeks untuk paginasi keyset.

**HILANG SAMA SEKALI (0 baris ada di 13 file):**
- **Definisi laporan** — kata "report" muncul 0× di seluruh migrations. `concept:70` mewajibkan 3 laporan built-in sebagai **3 baris definisi**.
- **DBH / diameter** — 0 hit di `db/` dan `src/`. Seluruh dasar sisi sequestration (`concept:139`).
- **`allometric_coefficients`** — master wajib (`concept:209`).
- **Revenue / AR / harvest** — 0 hit (`concept:129,162-164`).
- **6 dari 12 master wajib**: `fertilizer_type`, `pesticide_herbicide_type`, `unit_of_measure`, `cost_category`, `seedling_variety` (masih free text), `allometric_coefficient`.
- **`fertilizer_schedule`** — dinamai literal oleh `concept:123`. Tidak ada tabel schedule apa pun.
- **A2 Land Preparation, A3 Land Suitability, A6 Pruning** — tidak ada tabel. `concept:116` eksplisit meminta A3 dipisah dari A2 "karena siklus data berbeda" → instruksi itu belum terjawab.
- **`user_company_access`** — multi-tenancy wajib.
- **P&L / break-even / unit cost** (cost per km, per liter — `concept:169-172`).
- **Ledger migrasi + runner + seeder.** AT5 tidak reproducible tanpa ini.

**OVER-BUILD (yang justru ditunda `docs/00`):** `mrv_packages` + `mrv_package_sections` (MRV muncul 0× di `docs/00`); 12 tabel sertifikasi + enum `cert_decision` 5-nilai untuk modul yang `concept:146` sebut ~3 tahun lagi dan "framework, bukan konten".

**Empat defect terkonfirmasi (bukan opini) — semuanya harus ditambal:**
1. **`emission_factors` tidak akan pernah bisa di-supersede.** `0013_rls.sql:18` me-`REVOKE UPDATE`, sementara `0009_carbon.sql:33` `CREATE UNIQUE INDEX ef_active_uniq ON app.emission_factors (code) WHERE valid_to IS NULL` hanya mengizinkan satu baris terbuka per kode. Menerbitkan versi 2 mewajibkan `UPDATE valid_to` pada versi 1 — yang sudah dicabut. Skema versioning append-only **tidak dapat dieksekusi**.
2. **`evidence_files` tidak akan pernah bisa diverifikasi.** `0013_rls.sql:17` me-`REVOKE UPDATE`, sementara `0010_evidence.sql:25-26` mendefinisikan `verified_at`/`verified_by` yang hanya dapat diset lewat `UPDATE`.
3. **RLS surveyor adalah no-op.** `blocks_estate_scope` (`0013_rls.sql:54-61`) dibuat **PERMISSIVE** (tanpa `AS RESTRICTIVE`) berdampingan dengan `blocks_tenant` permissive dari loop (`:42-46`). PostgreSQL meng-OR policy permissive → surveyor melihat **seluruh** blok di company. Pembatasan yang dimaksud tidak berlaku secara senyap.
4. **4 tabel anak tanpa policy sama sekali** — `submission_values`, `cert_assessment_items`, `capa`, `approval_steps`; diakui sendiri di `0013_rls.sql:75-77`. `FORCE ROW LEVEL SECURITY` hanya diterapkan pada 15 tabel loop, tidak pada policy tabel anak. Di bawah multi-tenancy wajib, tabel-tabel itu terbaca lintas tenant.

**Empat keputusan STEP 4 sudah dijawab diam-diam di DDL** (`concept:223` melarangnya; tidak ada satu penanda `// DECISION NEEDED:` di repo): integrasi ERP (`0008:63-66,83-93`), stack DB/auth (`docs/01:4`, `0002:42`, `0013:6`), struktur budget per-bulan/per-estate (`0008:78-80`), biaya labor per-blok (`0008:37` `activities.block_id NOT NULL`). Ditambah keputusan #3 yang dijawab oleh `blocks.geom NOT NULL` (`0003:32`).

**Verdict:** jangan buang skema ini dan jangan pakai apa adanya. Jalankan **13 file sebagai satu set** (0012 & 0013 mereferensi tabel di 0004/0005/0007/0009/0011 — `0012:90,94,98`, `0013:34-37,82,89,96`; memecah subset lebih mahal daripada membiarkan tabel kosong), lalu tumpuk migrasi `0014+` untuk revisi. **Batalkan rencana seed dari `src/data/*.ts` (`docs/01:1234`).**

---

## 7. Struktur navigasi target

```
/ (public landing)                                        [refactor]  seluruh angka & copy ditulis ulang
/login  (auth + pemilihan company_entity)                 [refactor]

A. OPERASIONAL
├── A1 Seedling / Nursery Monitoring
│   ├── Inventaris bibit (jenis, varietas, qty, kondisi,
│   │   supplier, tanggal terima)                         [baru]      web belum ada; ada di /mobile/nursery [refactor]
│   ├── Survei kondisi bibit berkala                      [refactor]  dari /mobile/nursery
│   └── Tagging bibit → alokasi ke blok                   [baru]      relasi dibangun sekarang (concept:111)
├── A2 Land Preparation Check                             [baru]      pH, lubang tanam, luas efektif, layout,
│                                                                      status clearing; INI pembawa progress nyata
├── A3 Land Suitability Assessment (sekali per blok)      [baru]      dipisah dari A2 (concept:116)
├── A4 Fertilizer / Farm Input Monitoring                 [baru]      target acceptance test 1
├── A5 Farm Input Recommendation                          [stub]      master fertilizer_schedule + tampilkan
│                                                                      rekomendasi terjadwal; TODO phase 2 rules engine
├── A6 Pruning Monitoring                                 [stub]
├── A7 Plantation Survey / AOC                            [refactor]  dari /agroforestry/planting + tree-inventory;
│   └── Harvest recording                                 [stub]      struktur data saja, UI dimatikan (concept:129)
└── A8 Spatial / Block Management                         [refactor]  MERGE /pemetaan + /gis + /agroforestry/plot-layer
    ├── Master blok (kode, luas, company_entity, GeoJSON) [refactor]
    ├── Polygon capture & upload (shapefile/GeoJSON)      [refactor]  dari /mobile/polygon + boundary_imports
    ├── Map view (polygon dari DB, klik → data live)      [baru]      peta sekarang = gradient CSS; build dari nol
    └── Slot lampiran drone + map layer                   [stub]      lampiran, BUKAN pipeline (concept:133)

B. SUSTAINABILITY
├── B1 Carbon Sequestration
│   ├── Aktivitas emisi (land clearing DOMINAN, felling,
│   │   transport, BBM, pupuk)                            [refactor]  dari /agroforestry/activity-emission
│   ├── Form pengukuran DBH per fase pertumbuhan          [baru]      tidak ada di UI maupun DB
│   ├── Net carbon per blok + agregat                     [refactor]  dari /net-carbon-balance (buang konsol versi)
│   └── Layer net carbon di peta A8                       [refactor]  dari /carbon-map (bukan halaman peta ke-4)
├── B2 Organic Certification (framework saja)
│   ├── Form builder checklist (di atas form schema)      [refactor]  dari /sertifikasi/template-builder
│   └── Workflow submit → review → pass/fail + alasan     [merge]     dari field-assessment + decision + internal-review,
│                                                                      disalurkan lewat state machine E
└── B3 Traceability — skema identitas & relasi saja       [stub]      seedling batch → block → (kelak) harvest batch;
                                                                      TANPA UI rantai/QR (concept:150)

C. COSTING
├── C1 Keputusan arsitektur: Koltiva API vs standalone    [BLOKIR]    harus dijawab sebelum coding (concept:155)
├── C2 Expenditure Form                                   [refactor]  dari /costing; entry: kategori/sub-kategori/blok/
│                                                                      qty/unit/harga satuan/total/tanggal +
│                                                                      LAMPIRAN BUKTI PEMBELIAN WAJIB
├── C3 Revenue / AR Form                                  [stub]      model lengkap, UI disembunyikan (concept:164)
├── C4 Budget Setting + actual vs budget + over-budget    [baru]      per kategori & periode; budget PER BLOK utk AT3
└── C5 Derived Calculations                               [baru]      cost/ha, cost/blok, cost/pohon, P&L,
                                                                      indikator BREAK-EVEN, cost per km & per liter

D. REPORT  (view layer, bukan datastore sendiri)
├── D1 Custom Report Builder                              [stub]      TODO phase 2; fondasi query-driven wajib sekarang
├── D2 Tiga laporan built-in = TIGA BARIS report_definitions
│   ├── Operational Report                                [baru]      realisasi pupuk, bibit sehat, pohon tertanam (=0),
│   │                                                                  progress land prep
│   ├── Sustainability Report                             [baru]      net carbon per blok, status sertifikasi,
│   │                                                                  ringkasan traceability
│   └── Financial Report                                  [refactor]  expenditure vs budget, P&L, cost/ha, break-even
│                                                                      — jalur AT3 & AT6
└── D3 Output: dashboard view + export PDF dokumen        [refactor]  dari /dashboard + /laporan; PDF bergaya laporan
                                                                      formal, bukan screenshot dashboard (concept:182)

E. APPROVAL  (lapisan lintas modul)
├── E1 Inbox approval terpusat                            [refactor]  dari /approval; MERGE /sertifikasi/internal-review
├── E2 Role: creator / approver / super_admin             [baru]      /pengguna masih stub
├── E3 Akses per company_entity / block group             [baru]      user_company_access; multi-tenancy
└── E4 Indikator status di modul asal                     [baru]      kolom approval_status di setiap tabel form

X. CROSS-CUTTING
├── Master Data (super_admin) — 12 master                 [baru]      /pengaturan masih stub; JALUR WAJIB AT1
├── Form schema engine (renderer dari baris DB)           [baru]      /survei masih stub
├── Attachment / evidence store                           [merge]     dari /sertifikasi/evidence-center + /mobile/foto
└── Mobile (PWA, HANYA pengumpulan data)
    ├── login                                             [refactor]
    ├── home tugas                                        [refactor]
    ├── form (schema-driven)                              [refactor]  dari /mobile/form
    ├── polygon capture                                   [refactor]
    ├── foto/lampiran                                     [refactor]
    └── peta read-only                                    [refactor]
        (DROP: /mobile/panen, /mobile/agroforestry, /mobile/sync,
         /mobile/draft, /mobile-preview)
```

Ringkasan penanda: **[ada]** murni tanpa perubahan: 0 · **[refactor]** 24 · **[baru]** 19 · **[stub]** 8.

---

## 8. Delta skema database

### 8.1 KEEP (17) — tanpa perubahan DDL, atau perubahan sepele
`estates` (dinamai ulang perannya jadi block group) · `divisions` · `block_boundary_versions` · `plots` (menyimpan semantik `land_use`/luas efektif) · `plot_crop_layers` (`spacing_m`/`trees_per_ha` = denominator cost per tree) · `boundary_imports` · `boundary_overlaps` + `app.detect_block_overlaps()` · `form_versions` · `submission_values` · `assignments` (**flag ke klien**, bukan hapus) · `emission_factors` (perbaiki defect REVOKE UPDATE) · `carbon_runs` (`carbon_intensity` dibiarkan NULL) · `carbon_run_blocks` · `audit_log` + `app.write_audit()` · `evidence_links` · `standards` · `standard_versions`

### 8.2 REVISE (24) — dengan perubahannya

| Tabel | Perubahan |
|---|---|
| `companies` | Jadi master `company_entity`: tambah `is_active`, `archived_at`, `legal_name`, `npwp`, `created_by`/`updated_at`/`updated_by`, dan `parent_group_id` (atau tabel `company_groups`) agar 5-10 entitas = satu proyek. Seed 5-10 baris. |
| `users` | `company_id` jadi home/default atau dibuang; otorisasi pindah ke `user_company_access`; nilai role → `creator`/`approver`/`super_admin` (atau tabel `roles` + role per entitas); `email` unik **global** (buang `UNIQUE(company_id,email)`). |
| `user_estate_access` | Generalisasi jadi `(user_id, scope_type, scope_id)` atau `user_block_group_access`. Semua jalur baca operasional harus menghormati scope, bukan hanya `blocks`. |
| `blocks` | `geom` jadi **nullable**; `verification_status` → `approval_status` kanonik; `planting_year`/`planted_area_ha` di-drop atau di-null-kan; tambah `block_group_id`, `target_tree_count`, rencana crop mix; indeks `(company_id, code)` + `(company_id, created_at, id)` untuk keyset pagination + GIN `pg_trgm` pada `code`/`name` untuk search. |
| `crops` | Drop `crops.variety` → tabel anak `seedling_varieties`; tambah `component_type ('forestry'\|'agri')` untuk memisahkan durian (kehutanan) dan kelapa (agri) sesuai `concept:12`, plus `is_active`, `default_spacing_m`, `default_trees_per_ha`. |
| `drone_orthophotos` | Tambah `company_id` + `block_id` nullable, aktifkan RLS, ambil file dari `evidence_files` (satu mekanisme lampiran, bukan dua). Turunkan dari pipeline menjadi lampiran + layer. |
| `suppliers` | Merge dengan `vendors` menjadi satu business-partner master: `type[]` (seedling\|fertilizer\|agrochemical\|contractor\|transport\|buyer), npwp, kontak, `is_active`, `company_id` nullable untuk partner bersama. |
| `vendors` | **Drop** setelah merge (sisakan view `vendors` bila ada query lama). |
| `seed_batches` | Tambah `variety_id`, `uom_id`, `unit_price`+`total` atau `cost_transaction_id` (tanpa ini cost per tree tak punya sumber biaya), `qty_healthy/diseased/dead` saat terima, `approval_status`+`submitted_at`/`reviewed_by`/`reviewed_at`/`rejection_reason`, `created_by`/`updated_at`, `nursery_site_id`, CHECK `SUM(seed_distributions.qty) <= qty_initial`. |
| `nursery_inspections` | Vokabuler jadi healthy/diseased/dead (`concept:110`); tambah `approval_status` + kolom audit, opsional `height_cm`/`leaf_count`, `nursery_site_id`; pertahankan `client_uuid` untuk queue offline phase 2. |
| `seed_distributions` | `distributed_on` jadi nullable + `allocated_on NOT NULL`; tambah `allocation_status (allocated\|delivered\|planted)`, `tag_code`/`tag_range_from/to`, `approval_status`, `created_by`, `company_id` (atau policy RLS turunan lewat `block_id`). |
| `forms` | `module text` → lookup 5 grup A-E; tambah `target_entity` + `form_bindings`, `requires_attachment`/`min_attachments`, `requires_block`, `is_active`; `company_id` nullable untuk form sistem. |
| `form_fields` | Tambah `options_source_table`/`_value_column`/`_label_column`/`_filter` (+ whitelist server-side; **jangan** interpolasi nama tabel dari baris DB) plus `form_field_options` untuk list statis; perluas `field_type` dengan `reference\|currency\|block_ref\|geo_point` dan tulis nilainya dalam bahasa Inggris; tambah `uom_id`, `default_value`, `help_text`, `is_readonly`, `target_column`, `min`/`max`/`step` sebagai kolom nyata, bukan `jsonb` opak. |
| `survey_submissions` | Tambah `company_id`, `approval_status`, `submitted_at` **nullable** (agar state `draft` mungkin), `reviewed_by`/`reviewed_at`/`rejection_reason`, `created_by`; aktifkan RLS; indeks `(company_id, form_version_id, submitted_at DESC, id)`. |
| `planting_plans` | Repurpose jadi `block_crop_targets` (denominator cost per tree): `season_year` nullable, tambah `approval_status` + `created_by`, nilai status bahasa Inggris. Tanpa UI realisasi tanam di fase 1. |
| `tree_survey_points` | Jadi titik observasi bibit/juvenil; tambah `approval_status` + `created_by`; `growth_phase` → `growth_phase_id` FK; diameter/tinggi **pindah** ke tabel `dbh_measurements` baru. |
| `cost_centers` | Jadi `cost_categories` dengan `parent_id` (kategori → sub-kategori), `is_active`, `sort_order`, `default_uom_id`, `is_capex` — atau pertahankan sebagai dimensi akuntansi sekunder dan tambahkan `cost_categories` di sampingnya. `cost_transactions` & `budgets` wajib mengunci ke `cost_category_id`. |
| `activity_types` | Rename `plantation_activity_types`; `default_unit` → `default_uom_id`; `company_id` nullable (default global + baris per entitas); tambah `activity_group`, applicable crops, `requires_block`, `sort_order`, `is_active`. Seed ulang untuk fase land preparation. |
| `activities` | Tetap sebagai spine bersama costing↔karbon; tambah `approval_status`, `uom_id`, nilai status bahasa Inggris. Setiap tabel bertipe (land prep, fertilizer, pruning, AOC) memegang `activity_id` 1:1 agar satu jalur costing & satu jalur emisi melayani semuanya. |
| `cost_transactions` | Tambah `cost_category_id` + `sub_category_id`, `uom_id`, `unit_price`, `total` (generated atau CHECK `= quantity*unit_price`), **`created_by`**/`updated_by`/`updated_at`, `approval_status` kanonik + `submitted_at`/`reviewed_by`/`reviewed_at`/`rejection_reason`, aturan lampiran wajib. Indeks `(company_id, block_id, transaction_date)` dan `(company_id, transaction_date DESC, id)`. **Hapus `UNIQUE (company_id, erp_document_no)`** sampai keputusan Koltiva turun. Pasang trigger audit. |
| `budgets` | Re-key `(company_id, cost_category_id, period_id, scope_type, scope_id)` dengan `scope_type ∈ company\|block_group\|block`; tambah `budget_version`, `approval_status`, `created_by`, `currency`. **`block_id` wajib ada** — tanpa itu AT3 tidak dapat dibangun. |
| `approval_requests` | Enum `approval_type` ditulis ulang (tambah `expenditure`, `block`, `fertilizer_application`; buang `mrv_package`/`carbon_calculation_run`/`emission_factor`); `approval_status` jadi enum kanonik dengan `under_review`; tambah `resubmitted_from_id`. |
| `approval_steps` | `comment` wajib saat aksi = reject (CHECK), agar alasan penolakan dipaksakan di level DB (`concept:187`). |
| `sequestration_models` | Ganti default flat `tco2e_per_tree_year` dengan referensi ke `allometric_coefficients` + `dbh_measurements`. Faktor flat tidak dapat memenuhi `concept:139`. |

### 8.3 ADD (baru) — dengan tujuan dan requirement yang mewajibkannya

**Tenancy & role**
| Tabel | Tujuan | Diwajibkan oleh |
|---|---|---|
| `user_company_access(user_id, company_id, role)` | Satu user mengakses beberapa entitas; mode konsolidasi | `concept:192` (blocker) |
| `company_groups` (opsional) | 5-10 entitas sebagai satu proyek | `concept:15,228` |

**Master data (`concept:209`) — 6 yang benar-benar hilang + 3 konversi ENUM**
| Tabel | Tujuan | Diwajibkan oleh |
|---|---|---|
| `fertilizer_types` | Dropdown form pemupukan; **objek langsung acceptance test 1** | `concept:78,209` |
| `pesticide_herbicide_types` | Weed control A7 | `concept:128,209` |
| `unit_of_measures` | Mengganti `unit text` di 3 tempat; satuan eksplisit wajib | `concept:202,209` |
| `cost_categories` (+`parent_id`) | 8 kategori biaya + sub-kategori | `concept:158-159,209` |
| `seedling_varieties` | Mengganti `variety text` di 2 tempat | `concept:201,209` |
| `allometric_coefficients` (`source_standard NOT NULL`) | Basis perhitungan sequestration, admin-editable | `concept:141,209` |
| `growth_phases` (dari ENUM) | Fase dapat ditambah super_admin tanpa migrasi | `concept:35,209` |
| `tree_conditions`, `land_uses` (dari ENUM) | Alasan yang sama | `concept:34-35` |
| *(alternatif)* `master_types` + `master_items` generik | Satu pasang tabel + satu screen CRUD menggantikan 12 tabel + 12 screen; `company_id` nullable = global, `parent_item_id` = kategori→sub-kategori | `concept:35` — inilah yang membuat AT1 jadi perubahan **konfigurasi**, bukan kode |

**Form definition (`concept:62-66`)**
| Objek | Tujuan |
|---|---|
| `form_bindings(form_id, target_table, field_id → target_column)` | Memungkinkan satu renderer menulis ke tabel bertipe (`cost_transactions`) **maupun** ke `submission_values` |
| Kolom `options_source_*` pada `form_fields` | Deklarasi "opsi berasal dari master X" — tidak dapat diekspresikan oleh `options jsonb` sekarang |

**Report definition (`concept:68-71`) — 0 baris ada hari ini**
| Objek | Tujuan |
|---|---|
| `report_definitions(code, name, module, source_view, definition jsonb, is_active, is_stub)` | 3 laporan built-in sebagai **3 baris**, bukan 3 halaman hardcoded |
| `report_definition_fields` | Field, filter, agregasi per definisi |
| `report_runs` | Riwayat generate + artefak PDF (`concept:182`) |
| View `v_block_cost_summary` | `block_id, code, area_ha, approved_cost_idr, cost_per_ha` — sumber AT3 |
| View `v_budget_vs_actual` | `company_id, block_id, cost_category_id, period_id, budget, actual, variance, variance_pct` |
| `fiscal_periods` | Grain periode jadi data, bukan DDL (`period_month` sekarang mengunci keputusan #6) |

**Operasional A2/A3/A4/A5/A6/A7 — tidak ada satu pun tabelnya**
| Tabel | Tujuan | Diwajibkan oleh |
|---|---|---|
| `land_preparation_checks` | pH tanah, jumlah & dimensi lubang tanam, luas efektif, layout, status clearing; status not_started/in_progress/ready_to_plant. **Pembawa metrik progress nyata fase ini** | `concept:112-114,180` |
| `land_suitability_assessments` | Sekali per blok: jenis tanah, drainase, lereng, elevasi, curah hujan, skor kesesuaian durian vs kelapa. **Sengaja dipisah dari land prep** | `concept:115-117` |
| `fertilizer_applications` | Jenis pupuk, dosis, tanggal, blok, petugas; membedakan fase vegetatif (Urea/KCl/ZA) vs generatif (NPK) | `concept:118-120` |
| `fertilizer_schedule` | Master crop × fase × umur pohon × jenis pupuk × dosis/pohon × interval. Dinamai **literal** oleh dokumen | `concept:123` |
| `pruning_records` | Aktivitas pruning per blok per petugas | `concept:125-126` |
| `aoc_surveys` | Survei pemeliharaan umum, weed control, herbisida/kompos | `concept:127-128` |
| `nursery_sites` | Lokasi nursery untuk `seed_batches`/`nursery_inspections` | `concept:109` |

**Sustainability**
| Tabel | Tujuan | Diwajibkan oleh |
|---|---|---|
| `dbh_measurements(point_id/tree_id, dbh_cm, height_m, measured_at, growth_phase_id, approval_status, created_by)` | **Satu-satunya input sisi sequestration**; tanpa ini rantai AT "DBH → Sustainability Report berubah" mustahil | `concept:57,139` |
| `land_clearing_emissions` (atau tipe aktivitas per-ha di `activities`) | Sumber emisi terbesar fase ini, sekarang tidak ada line item-nya | `concept:138` |

**Costing / finansial**
| Tabel | Tujuan | Diwajibkan oleh |
|---|---|---|
| `revenues` + `receivables` | Penjualan kelapa/durian: volume, harga, pembeli, tanggal. **Model lengkap, UI disembunyikan** | `concept:162-164` |
| `harvest_batches` | Struktur data panen (UI dimatikan) + mata rantai ketiga skema identitas traceability | `concept:129,149` |
| `unit_cost_metrics` atau view turunan | Cost per km, cost per liter untuk estimasi transport antar blok | `concept:172` |

**Infrastruktur**
| Objek | Tujuan |
|---|---|
| `schema_migrations` (ledger) + runner + `0014_seed` **bersih** | AT5 tidak reproducible tanpa ini; seed **tidak boleh** berasal dari `src/data/*.ts` |
| Kolom `approval_status` + `rejection_reason` + `resubmitted_from_id` pada **setiap** tabel form | `concept:52,205` — status harus kolom di entitas, bukan hanya tabel samping |
| `map_layers` (opsional) | Layer baru tanpa redeploy |

---

## 9. Jalur MVP depth-first

Sasaran (`concept:260`): **satu alur hidup end-to-end Expenditure → DB → Financial Report** lebih berharga daripada cakupan layar. Semua screen lain jadi stub berlabel.

**Temuan penting yang mengubah urutan STEP 5 item 6:** acceptance test memaksa item **(d) map view** dan **(e) financial dashboard** masuk ke slice minimum, dan memaksa **dua screen yang tidak ada di daftar prioritas** — Master Data CRUD (AT1) dan Approval Inbox (AT4) — jadi wajib. Yang keluar dari slice minimum hanyalah **(b) Seedling Monitoring** dan **(c) Land Preparation**; keduanya jadi stub berlabel (`concept:250`).

Temuan kedua: **AT1 hampir gratis jika renderer dibangun benar.** AT1 menamai form pemupukan secara literal. Karena rendering schema-driven, satu baris `form_versions` tambahan + renderer yang sama + `survey_submissions`/`submission_values` yang sudah ada memenuhi AT1 **tanpa kode baru**. *Pertanyaan untuk Anda: jika AT1 boleh dibuktikan pada dropdown `cost_category` di form Expenditure, langkah 11 hilang dan slice menyusut jadi 7 screen.*

**Fork arsitektur yang harus dinyatakan eksplisit:** form Expenditure di-**render** dari skema (`form_fields`) tetapi **menulis ke tabel bertipe** (`cost_transactions`), bukan ke `submission_values`. Alasan: AT3 butuh `SUM(total) GROUP BY block_id / blocks.area_ha` + join budget; di atas EAV (satu baris per jawaban) itu menjadi multi-pivot yang tidak bertahan pada 3.300 blok. Form pemupukan — yang hanya perlu **ada** untuk AT1 — lewat tabel submission generik. Satu renderer, dua sink. Dokumentasikan aturannya agar form berikutnya tidak menebak.

### Langkah berurutan

| # | Langkah | Menutup |
|---|---|---|
| **0** | **Jawab keputusan #1 (Koltiva) dan #2 (stack DB).** Keduanya memblokir; #2 memblokir *segalanya*. Sebelum ini turun, jangan tulis satu baris kode persistensi. | prasyarat AT1-AT6 |
| **1** | Runner migrasi + ledger `schema_migrations` + `.env.example` + script `db:migrate` + `db:seed`. Jalankan **13 file sebagai satu set** (0012/0013 mereferensi tabel di 0004/0005/0007/0009/0011). | **AT5** |
| **2** | Migrasi `0014_core_fix`: `user_company_access`; role `creator`/`approver`/`super_admin`; enum `approval_status` kanonik (`draft→submitted→under_review→approved\|rejected`); tulis ulang RLS dari `=` ke `IN` atas entitas yang dapat diakses; tambal 4 defect §6 (REVOKE UPDATE `emission_factors` & `evidence_files`, `blocks_estate_scope` jadi RESTRICTIVE, policy 4 tabel anak). | **AT4**, **AT5** |
| **3** | Migrasi `0015_master`: `master_types` + `master_items` (atau 6 tabel master yang hilang), termasuk `cost_categories` berjenjang, `unit_of_measures`, `fertilizer_types`. Seed **kosong secara isi, benar secara struktur** — jangan seed dari `src/data/*.ts`. | **AT1** |
| **4** | Migrasi `0016_costing_fix`: ALTER `cost_transactions` (9 kolom termasuk `created_by`, `unit_price`, `total` generated, `cost_category_id`, `uom_id`, `approval_status`, `rejection_reason`); re-key `budgets` dengan **`block_id`** + `cost_category_id`; hapus `UNIQUE erp_document_no`; indeks keyset; trigger audit pada `cost_transactions`. | **AT3**, **AT4** |
| **5** | Migrasi `0017_reports`: `report_definitions` + `report_definition_fields`; view `v_block_cost_summary`, `v_budget_vs_actual` (`security_invoker`); 3 baris definisi — Financial (live), Operational & Sustainability (ada tetapi ditandai `is_stub`). | **AT3**, **AT6** |
| **6** | Auth + session + resolusi tenant nyata di `/login`; switcher entitas di Topbar difungsikan; setiap query di-scope ke entitas terpilih + mode "semua entitas saya". | **AT4**, **AT5** |
| **7** | **S1 `/pengaturan/master-data`** — CRUD generik dari `master_types`, hanya `super_admin`. | **AT1** (sisi tulis) |
| **8** | Refactor `DataTable` jadi berpaginasi server (`{page,pageSize,total,sort}` dari `searchParams`, `sortKey` per kolom, empty state jujur) + `MetricCard` (`value: number\|null`) + `StatusBadge` (dikunci ke enum, punya `draft` & `under_review`) + `FilterBar` (write-through ke `searchParams`) + badge STUB pada `PlaceholderPage`. **Lakukan sebelum screen list mana pun dibangun** — 19 call site. | **AT6**, `concept:49` |
| **9** | **S2 `/operasional/blok`** — list blok berpaginasi keyset + create dengan GeoJSON; **S3 `/operasional/blok/peta`** — peta nyata (MapLibre/Leaflet) merender polygon dari `blocks.geom` via bbox + simplifikasi per zoom; klik blok → fetch data biaya live. Seed 3.300 blok dan jadikan load test sebagai gate. | **AT2** |
| **10** | **S4 `/costing/pengeluaran`** + `/baru` — renderer form schema-driven pertama, menulis ke `cost_transactions`; dropdown kategori/sub-kategori/unit/supplier/**blok** semuanya dari master (searchable async untuk blok); **upload bukti pembelian wajib** ke `evidence_files` + `evidence_links`; badge status per baris dari kolom `approval_status`. | **AT1** (sisi baca), **AT3**, **AT4** |
| **11** | **S5 `/costing/anggaran`** — budget per blok × kategori × periode (grain periode dari `fiscal_periods`, menunggu keputusan #6). | **AT3** |
| **12** | **S6 `/approval`** — inbox terpusat; approve / reject **dengan alasan tersimpan**; transisi mengubah kolom `approval_status` di record asal; record `rejected` dikecualikan dari perhitungan laporan; creator dapat resubmit (`resubmitted_from_id`). | **AT4** |
| **13** | **S7 `/laporan/keuangan`** — Financial Report dirakit dari baris `report_definitions` (chart band + table band). **Gabungkan (d) dashboard finansial dan Financial Report jadi satu halaman**: dua halaman berarti dua tempat angka bisa di-hardcode, menggandakan permukaan AT6. | **AT3**, **AT6** |
| **14** | **S8 `/operasional/pemupukan`** — form pemupukan yang dirender dari baris `form_versions` kedua, dropdown `fertilizer_type` dari master. Nol kode baru jika langkah 10 benar. | **AT1** literal |
| **15** | **Tear-out**: hapus `src/data/dummy.ts`, `certification.ts`, `mobile.ts`; hapus `MapPanel`, `MapMiniPreview`, `PolygonDrawingCanvas`, `MobileFrame`, `ApprovalCard`, `SyncQueueList`, `SyncStatusBadge`, `DraftList`; `grep` komponen dashboard & report untuk literal numerik → **harus nol**; setiap surface tanpa data merender empty state jujur (termasuk chart: `data=[]` di recharts terbaca sebagai **nol**, bukan "tidak ada data" — tambahkan cabang empty state). | **AT6** |
| **16** | Tulis ulang `Sidebar` ke 5 grup (buang 148 dari 265 baris; perbaiki bug `useState` initializer `:166-168`); semua screen lain → `PlaceholderPage` dengan badge **STUB**. | `concept:250` |

**Set minimum: 8 screen, 17 tabel + 2 view + 1 ledger** (11 tabel dipakai ulang — 4 di antaranya di-ALTER, 4 tabel baru, 2 view baru). Semua route lain — 13 sub-halaman `sertifikasi/*`, 8 sub-halaman `agroforestry/*`, `nursery`, `traceability`, `survei`, `gis`, `pemetaan`, `dashboard`, `pengguna`, dan 14 route `mobile/*` — jadi stub berlabel.

---

## 10. Keputusan yang memblokir

### Tujuh keputusan STEP 4 (`docs/00-refinement-concept.md:225-231`)

**1. Costing: integrasi API Koltiva ERP atau standalone?** (`:225` — blocker eksplisit, tanya sebelum mulai)
Memblokir karena menentukan model data, autentikasi, dan sinkronisasi seluruh grup C — yaitu jalur MVP. **Sudah dijawab diam-diam di DDL sebagai "integrasi"**: `cost_transactions.erp_document_no` + `erp_synced_at` + `UNIQUE (company_id, erp_document_no)` (`0008_costing.sql:63-66`), partial index `:70-71`, dan tabel `erp_sync_logs` `:83-93`; `docs/01:1193-1202` hanya menanyakan ERP mana. Tombol "Sinkronisasi ERP" di `/costing:29-31` memperkuat asumsi itu di UI.
*Rekomendasi:* **standalone dulu, dengan `external_document_no` netral-vendor** (bukan `erp_document_no`) dan tanpa unique constraint. Integrasi bisa ditambahkan; unique constraint yang salah pada data yang sudah masuk tidak bisa dicabut murah. Buang `erp_sync_logs` sampai keputusan turun.

**2. Stack backend dan database** (`:226` — "memblokir setiap requirement dinamis di atas")
Memblokir semuanya: tanpa ini tidak ada langkah 1 di §9. **Sudah dijawab diam-diam**: `docs/01:4` (PostgreSQL 16 + PostGIS di Cloud SQL, `asia-southeast2`), `0002_core.sql:42` + `0013_rls.sql:6` (Google Identity Platform), `docs/01:1162` (Cloud Run worker), path `gs://` (`0004:74`, `0010:16`). Tidak pernah didaftarkan sebagai terbuka; tidak ada opsi maupun trade-off yang disajikan.
*Rekomendasi:* **konfirmasi pilihan yang sudah tersirat itu** (Postgres+PostGIS memang benar — `area_ha` generated dan indeks GIST bergantung padanya), tetapi sajikan trade-off Cloud SQL vs Supabase/Neon (kecepatan setup vs kesiapan produksi) dan minta keputusan tertulis. Identity Platform adalah keputusan terpisah yang belum pernah Anda buat.

**3. Apakah lahan sudah disurvei & dibagi jadi blok di lapangan, atau blocking dilakukan di dalam sistem?** (`:227`)
Memblokir karena menentukan apakah blok dapat dibuat sebelum batasnya ada. **Sudah dijawab diam-diam**: `blocks.geom NOT NULL` (`0003_gis.sql:32`) mengunci "batas harus ada dulu" — tidak mungkin mendaftarkan 3.300 blok secara bertahap.
*Rekomendasi:* **`geom` jadi nullable** apa pun jawabannya. Itu menampung kedua skenario; peta merender hanya blok yang sudah didigitasi. `boundary_imports` + `detect_block_overlaps()` sudah siap untuk jalur "blocking di dalam sistem".

**4. Berapa entitas korporat untuk 100.000 ha?** (`:228`)
Memblokir seeding dan desain RLS: jumlah entitas menentukan apakah user perlu akses banyak-entitas dan bagaimana konsolidasi laporan disusun.
*Rekomendasi:* bangun `user_company_access` **sekarang** apa pun jawabannya, karena `concept:192` sudah mewajibkan satu user mengakses beberapa entitas. Angka pastinya hanya memengaruhi seeding, tetapi jawablah sebelum data masuk — mengubah tenancy setelah data ada adalah proyek migrasi.

**5. Sumber referensi faktor emisi dan persamaan alometrik** (`:229`)
Memblokir seluruh B1. Tanpa sumber, tidak ada angka karbon yang dapat dipertanggungjawabkan. Prototype **sudah** memfabrikasi 4 faktor (`dummy.ts:172-178`) dan salah satunya (`1.33`) sudah merambat ke DDL sebagai contoh kanonik (`0009_carbon.sql:17`).
*Rekomendasi:* jangan tunggu jawaban untuk membangun strukturnya — `emission_factors` sudah punya `source_standard NOT NULL` dan itu benar. **Kosongkan tabelnya**, biarkan B1 merender empty state, dan pasang `// DECISION NEEDED:` di titik seed. Kami tidak akan mengisi koefisien apa pun (`concept:141,254`).

**6. Struktur budget: per tahun, per fase proyek, atau per blok?** (`:230`)
Memblokir AT3 secara langsung. **Sudah dijawab diam-diam sebagai per-bulan/per-estate/per-cost-center**: `UNIQUE (company_id, estate_id, cost_center_id, period_month)` (`0008_costing.sql:78-80`) — dan struktur itu **tidak dapat memenuhi AT3**, yang mensyaratkan actual-vs-budget bergerak pada expenditure **per blok** (`concept:56,80`).
*Rekomendasi:* `budgets` di-key ulang jadi `(company_id, cost_category_id, period_id, scope_type, scope_id)` dengan `scope_type ∈ company|block_group|block`. Bentuk ini menampung ketiga jawaban Anda tanpa migrasi ulang, dan `fiscal_periods` memindahkan grain periode dari DDL ke data.

**7. Biaya labor: di dalam costing per blok, atau overhead terpisah?** (`:231`)
Memblokir definisi cost per hectare dan cost per tree — yaitu angka yang dinanti direktur keuangan. **Sudah dijawab diam-diam secara tidak konsisten**: `activities.block_id NOT NULL` (`0008:37`) memaksa per-blok, sementara `cost_transactions.block_id` nullable (`:56`) mengizinkan overhead. Dua tabel, dua jawaban.
*Rekomendasi:* dukung **keduanya secara eksplisit** — `cost_transactions.block_id` nullable + flag `is_overhead` + aturan alokasi (pro-rata luas) untuk baris overhead, sehingga cost/ha punya satu definisi yang dapat ditelusuri. Tetapi nyatakan aturan alokasinya secara tertulis; jangan biarkan tersirat.

### Blocker tambahan yang muncul dari audit

**8. Rencana seed `0014_seed` dari `src/data/*.ts` harus dibatalkan secara tertulis** (`docs/01:1234`, dan `docs/01:5` yang menyatakan `dummy.ts` sebagai sumber kebenaran domain). Ini blocker karena jika dijalankan, ia mencuci angka fabrikasi ke Postgres, membuat AT6 mustahil lulus, sementara aplikasi *tampak* dinamis. *Rekomendasi:* **batalkan `docs/01:5` dan `:1234`**, ganti sumber kebenaran domain menjadi `docs/00-refinement-concept.md`, dan tulis `0014_seed` hanya berisi master data struktural kosong + 1-2 form schema.

**9. Persetujuan Anda untuk menghapus 17 route dan mem-park 8 modul** (§3). Blocker prosedural: `concept:96` melarang penghapusan senyap. Tidak ada pekerjaan destruktif dimulai sebelum Anda memutuskan per item di §3.

**10. Konfirmasi bahwa panen, produksi, revenue, margin, payback, dan Net Sink dihapus dari semua UI** — termasuk landing page publik (`src/app/page.tsx:40-45,216-219`). Blocker karena ini menyangkut klaim publik dan reputasi, bukan kode. *Rekomendasi:* hapus sekarang, sebelum demo. Landing page adalah satu-satunya halaman yang bisa dilihat pihak luar.

**11. Definisi metrik pengganti untuk fase pengadaan bibit.** `concept:39` menyebut metrik yang wajib dihitung, tetapi 3 di antaranya bergantung domain: (a) bagaimana "land preparation progress" dihitung — persen blok `ready_to_plant`, atau bobot per luas? (b) denominator "cost per tree" sebelum ada pohon — target pohon dari `block_crop_targets`, atau jumlah bibit di nursery? (c) apa yang ditampilkan indikator break-even ketika revenue = 0. *Rekomendasi:* (a) bobot per luas, (b) target pohon (dan labeli jelas "per target pohon"), (c) "Belum dapat dihitung — belum ada pendapatan". Tetapi ketiganya butuh konfirmasi Anda karena keluar di laporan direktur keuangan.

**12. Ruang lingkup mobile.** `concept:212` menyatakan mobile hanya untuk pengumpulan data, tetapi prototype punya 15 screen mobile termasuk dashboard mini dan approval-adjacent. Perlu konfirmasi bahwa 5 screen di-drop (`/mobile/panen`, `/mobile/agroforestry`, `/mobile/sync`, `/mobile/draft`, `/mobile-preview`) dan bahwa PWA nyata (manifest + service worker + full viewport, mengganti bezel `MobileLayout.tsx:12-18`) masuk scope fase ini.