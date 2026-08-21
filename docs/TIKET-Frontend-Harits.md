# Pematangan Frontend AgroVision — 8 Tiket

| | |
|---|---|
| **Assignee** | Harits Balfas (`haritshb`) |
| **Reviewer** | @ugadimas25 |
| **Total estimasi** | ± 4–5 minggu (termasuk F-1 yang paling besar) |
| **Aturan** | Satu tiket = satu branch = satu PR, wajib approval sebelum merge |
| **Prasyarat** | Selesaikan **TIKET-01 (QA manual)** lebih dulu untuk F-1 dan F-2 |

Semua temuan diverifikasi langsung ke kode. Tanda 🔍 = angka/kondisi diperiksa sendiri di repo.

---

## Aturan kerja

Branch `main` terkunci. Push langsung ditolak — semua perubahan lewat PR dan **harus disetujui @ugadimas25**.

```
branch baru → commit → push branch → buka PR
  → review @ugadimas25 → merge ke main → auto-deploy Cloud Run
```

Penamaan branch: `feat/…`, `fix/…`, `chore/…`, `test/…`

**Checklist tiap PR** (sudah ada di template): `npm run lint` 0 error · `npm run build` sukses · sudah dicoba di 375px bila menyentuh UI · tidak ada kredensial ter-commit.

---

## Konteks sistem

- **Next.js 16** App Router · React 19 · **Tailwind v4** · TypeScript
- Server Components + Server Actions; komponen interaktif ditandai `"use client"`
- Peta: **MapLibre GL v6** · Grafik: **Recharts** · PDF: `@react-pdf/renderer` (server-only)
- i18n ringan tanpa dependensi: cookie `agrovision_locale`, `getDict(locale)` → `d("kunci")`
- PWA sudah aktif: manifest, service worker, offline page, install prompt
- Mobile sudah dikerjakan: drawer, bottom nav, 36 tabel → kartu, form, peta

> ⚠️ **Baca `AGENTS.md` sebelum menulis kode.** Next.js versi ini punya perbedaan API dari versi yang umum diketahui. Panduan resmi versi terpasang ada di `node_modules/next/dist/docs/`.

---

# PRIORITAS 1 · Kerjakan hari ini juga

## F-3 · Kembalikan sinyal lint yang tenggelam 🔍
`chore/eslint-ignore-vendor` · **1 jam** · 🔴 High

**Masalah**
`npm run lint` melaporkan **1.087 warning**. Setelah ditelusuri, **1.055 di antaranya berasal dari file vendor**, bukan kode kalian:

| File | Warning |
|---|---|
| `public/maplibre-gl-shared.mjs` | 1.014 |
| `public/maplibre-gl-worker.mjs` | 41 |

Keduanya bundel pihak ketiga yang disalin ke `public/` agar Turbopack bisa menyajikan worker MapLibre. Isinya kode ter-minify — tidak ada gunanya di-lint.

**Dampak:** warning yang benar-benar milik kalian (± 30) tenggelam di antara seribu warning palsu, jadi tidak ada yang membacanya. Lint yang selalu "merah" sama saja dengan lint yang mati.

**Kerjakan**
1. Tambahkan `public/**` (atau minimal `public/maplibre-gl-*.mjs`) ke `ignores` di `eslint.config.mjs`
2. Jalankan lagi, pastikan tersisa hanya warning dari `src/`
3. Bereskan sisa warning aslinya — sebagian besar variabel/impor tak terpakai; ada juga 3 `<img>` yang dibahas di F-7
4. Jangan pakai `eslint-disable` untuk menutupi masalah nyata

**Selesai bila**
- [ ] `npm run lint` melaporkan **< 40 warning**, semuanya dari `src/`
- [ ] 0 error
- [ ] Tidak ada `eslint-disable` baru tanpa penjelasan di komentar

---

# PRIORITAS 2 · Setelah QA manual selesai

## F-2 · Error boundary — sekarang nol 🔍
`feat/error-boundaries` · **2 hari** · 🟠 High

**Masalah**
Pencarian di seluruh `src/app` menemukan **0 file** `error.tsx`, `not-found.tsx`, maupun `global-error.tsx`. Artinya kalau sebuah Server Component melempar error — DB timeout, query gagal, data tak terduga — pengguna melihat **halaman error mentah bawaan Next.js**, bukan pesan yang bisa dipahami petugas lapangan.

Kamu baru saja menjalankan QA dan melihat semua cara sistem ini gagal. Kamu orang yang paling tahu pesan apa yang berguna di situ.

**Kerjakan**
1. `src/app/global-error.tsx` — jaring pengaman terakhir
2. `src/app/(app)/error.tsx` — error di dalam aplikasi; tetap tampilkan shell (sidebar/topbar) supaya pengguna bisa pindah halaman
3. `error.tsx` khusus untuk segmen yang rawan: `laporan`, `operasional`, `costing`
4. `src/app/not-found.tsx` — 404 yang ramah
5. Tiap error page wajib punya: penjelasan singkat dalam bahasa manusia, tombol **Coba lagi** (`reset()`), tautan kembali ke Dashboard
6. Semua teks lewat dictionary i18n (id/en)
7. **Jangan tampilkan stack trace atau pesan teknis ke pengguna** — cukup catat ke log

**Panduan:** baca konvensi `error.tsx` di `node_modules/next/dist/docs/` — cara kerjanya berbeda dari versi Next sebelumnya.

**Selesai bila**
- [ ] Error sengaja dilempar di sebuah page → muncul halaman error yang ramah, bukan default Next
- [ ] Tombol **Coba lagi** benar-benar memulihkan tanpa reload penuh
- [ ] URL asal-asalan → 404 yang ramah
- [ ] Tidak ada detail teknis bocor ke layar
- [ ] Diuji juga di mobile 375px

---

## F-1 · Otomatisasi E2E dengan Playwright ⭐
`test/playwright-e2e` · **± 2 minggu** · 🟠 High · dikerjakan bertahap

**Kenapa ini paling bernilai**
63 skenario yang kamu tulis di QA manual sekarang hanya hidup di spreadsheet — harus dijalankan ulang dengan tangan setiap ada perubahan. Diubah jadi kode, skenario itu jalan otomatis di setiap PR, selamanya. Setelah menjalankan QA, kamu menguasai perilaku sistem ini lebih dalam daripada siapa pun; sayang kalau berhenti di situ.

> **Dependensi baru:** Playwright perlu persetujuan Dimas dulu (aturan repo). Ajukan di PR pertama dengan alasan singkat. Pasang sebagai `devDependency` — tidak ikut ke image produksi.

### Tahap 1 — Fondasi (2 hari)
`test/playwright-setup`
- Pasang `@playwright/test`, config untuk 3 viewport: 375 / 768 / 1440
- Helper login per role (langsung set cookie sesi, jangan lewat form tiap kali — lebih cepat & stabil)
- 1 smoke test: login → dashboard tampil
- Jalankan di CI (koordinasi dengan Ridwan yang mengerjakan B-3)

### Tahap 2 — Role & hak akses (2 hari)
`test/e2e-roles` — otomatiskan **A-01 … A-07**
Yang paling penting: **viewer dan creator diuji sampai ke server**, bukan sekadar "tombolnya tidak terlihat". Akses URL modul langsung dan pastikan ditolak.

### Tahap 3 — Alur approval (4 hari)
`test/e2e-approval` — otomatiskan **B-01 … B-18**
Inti sistem ini. Sertakan uji negatif: tolak tanpa alasan harus gagal, dan self-approval harus ditolak (setelah B-4 selesai).

### Tahap 4 — Akuntansi & laporan (3 hari)
`test/e2e-accounting` — **E-01 … E-05**, **F-01 … F-05**
Termasuk konsistensi angka: nilai di laporan harus sama persis dengan modul asalnya.

### Tahap 5 — Mobile & PWA (2 hari)
`test/e2e-mobile` — **G-01 … G-10**
Emulasi perangkat mobile, uji drawer, bottom nav, tabel→kartu, dan mode offline.

**Aturan penting untuk seluruh tahap**
- **Data uji harus mandiri** — tiap test membuat datanya sendiri dan membersihkannya; jangan bergantung pada data sisa test lain
- **Jangan pakai `waitForTimeout`** — pakai penantian berbasis kondisi (`expect(...).toBeVisible()`)
- Test yang kadang lulus kadang gagal (flaky) **lebih buruk daripada tidak ada test** — perbaiki atau hapus
- Selector pakai `getByRole` / `getByLabel`, bukan class CSS yang gampang berubah

**Selesai bila**
- [ ] Seluruh skenario Critical (16 buah) berjalan otomatis
- [ ] Suite jalan di CI pada setiap PR, waktu < 15 menit
- [ ] 0 test flaky selama 10 kali jalan berturut-turut
- [ ] README: cara menjalankan lokal, cara menambah test, cara membaca hasil gagal

---

# PRIORITAS 3 · Kualitas & kerapian

## F-4 · Selesaikan i18n — mode EN baru separuh jalan 🔍
`feat/i18n-coverage` · **3 hari** · 🟡 Medium

**Masalah**
Aplikasi punya tombol ganti bahasa ID/EN, tapi cakupannya belum penuh:

- **23 dari 30 halaman** memakai i18n
- Total hanya **43 pemanggilan `d("...")`** di seluruh aplikasi — artinya sebagian besar hanya menerjemahkan menu & chrome, isinya tetap Indonesia
- **7 halaman tidak memakai i18n sama sekali:**
  `laporan/page.tsx` · `dashboard/page.tsx` · `dashboard/financial/page.tsx` · `dashboard/sustainability/page.tsx` · `costing/refleksi/page.tsx` · `survei/[formId]/page.tsx`

Jadi pengguna menekan "EN", menu berganti, tapi isi halaman tetap Indonesia — janji yang belum ditepati.

**Kerjakan**
1. Inventarisasi teks hardcoded per halaman (mulai dari 7 halaman di atas)
2. Pindahkan ke `src/lib/i18n.ts` dengan kunci ber-namespace (`laporan.judul`, `dashboard.kpi.revenue`, dst.)
3. **Prioritaskan yang dilihat pengguna:** judul halaman, label kolom tabel, tombol, pesan error, empty state
4. Boleh dikerjakan bertahap — satu PR per kelompok halaman, jangan satu PR raksasa
5. Istilah agronomi & akuntansi: konsultasikan padanan Inggrisnya ke Dimas, jangan menerjemahkan sendiri

**Selesai bila**
- [ ] 30/30 halaman memakai i18n
- [ ] Ganti ke EN → tidak ada teks Indonesia tersisa di halaman utama
- [ ] Tidak ada kunci yang tampil mentah (mis. `nav.dashboard` muncul sebagai teks)
- [ ] Kunci yang hilang jatuh ke bahasa Indonesia, bukan ke string kosong

---

## F-6 · Konsistensi empty state & pesan error
`feat/consistent-states` · **2 hari** · 🟡 Medium

**Masalah**
Tiap modul menulis empty state sendiri-sendiri. Tiga kondisi yang **maknanya sangat berbeda** kadang terlihat sama:

1. **Belum ada data** — normal, pengguna tinggal menambah
2. **Gagal memuat** — ada yang rusak, perlu dicoba lagi
3. **Tidak punya hak akses** — datanya ada tapi bukan untuk role ini

Pengguna tidak bisa membedakan "belum ada data" dari "gagal memuat" — padahal tindak lanjutnya berbeda total.

**Kerjakan**
- Rapikan `EmptyState` yang sudah ada agar mencakup tiga varian di atas, masing-masing dengan ikon, pesan, dan aksi yang sesuai
- Terapkan konsisten ke seluruh modul
- Sejalan dengan prinsip data proyek ini: **kosong ditulis `—`, tidak pernah `0`**

**Selesai bila**
- [ ] Ketiga kondisi bisa dibedakan sekilas
- [ ] Semua modul memakai komponen yang sama
- [ ] Teks lewat i18n

---

## F-5 · Aksesibilitas lanjutan
`feat/a11y-round-2` · **3 hari** · 🟡 Medium

**Sudah dikerjakan di Phase 4:** kontras WCAG AA (`text-slate-400` → `text-slate-500`, 2,85:1 → 4,76:1), focus ring global, `prefers-reduced-motion`.

**Yang belum**
1. **Label form** — pastikan tiap input punya `<label htmlFor>` yang benar-benar terkait, bukan sekadar teks di dekatnya
2. **Hierarki heading** — satu `h1` per halaman, tidak melompat h1→h3
3. **`aria-live`** — umumkan perubahan hasil setelah submit atau filter tabel
4. **Navigasi keyboard penuh** — seluruh alur approval bisa diselesaikan tanpa mouse
5. **Uji screen reader** — VoiceOver (Mac/iOS) atau TalkBack (Android) pada alur inti
6. **Tabel** — `<caption>` atau `aria-label`, dan `scope` pada header

**Selesai bila**
- [ ] Alur approval bisa diselesaikan sepenuhnya lewat keyboard
- [ ] Screen reader membacakan label & status tabel dengan masuk akal
- [ ] Lighthouse Accessibility ≥ 95 di 3 halaman utama
- [ ] Tidak ada `aria-*` yang dipasang asal-asalan — salah aria lebih buruk daripada tanpa aria

---

## F-7 · Performa untuk sinyal lemah
`perf/images-and-bundle` · **2 hari** · 🟡 Medium

**Masalah** 🔍
- **3 tempat masih memakai `<img>` biasa**, bukan `next/image` — termasuk `public/images/durian.jpg` (**3,0 MB**) dan `kelapa.webp` (**1,4 MB**) di landing page
- MapLibre ikut dimuat walau halamannya tidak menampilkan peta

Pengguna sasaran aplikasi ini adalah **petugas lapangan di kebun** — sinyal 3G, kuota terbatas. Gambar 3 MB terasa sangat lambat di sana.

**Kerjakan**
1. Ganti `<img>` → `next/image` (otomatis resize + format modern + lazy load)
2. Kompres aset di `public/images/` — target < 300 KB per gambar
3. Muat MapLibre secara dinamis, hanya pada halaman yang butuh peta
4. Periksa ukuran bundle sebelum/sesudah dari keluaran `npm run build`

**Selesai bila**
- [ ] Tidak ada `<img>` tersisa (warning `@next/next/no-img-element` = 0)
- [ ] Tidak ada gambar > 300 KB di `public/images/`
- [ ] Ukuran First Load JS turun; catat angka sebelum/sesudah di PR
- [ ] Lighthouse Performance mobile membaik; catat angkanya

---

## F-8 · Uji unit untuk logika kritis 🔍
`test/unit-core-logic` · **3 hari** · 🟡 Medium
*(Boleh dialihkan ke Ridwan — butuh pemahaman logika agronomi)*

**Masalah**
Tidak ada satu pun `*.test.tsx`/`*.test.ts` di repo, dan **tidak ada skrip `test` di `package.json`**. Dua fungsi paling rawan salah sama sekali tidak punya uji:

- `src/lib/fertBlend.ts` → `computeBlend()` — konversi hara ke takaran produk pupuk
- `src/lib/repo/suitability.ts` → `classify()`, `classifyBoth()` — penentuan kelas kesesuaian S1–N

Keduanya rumus yang **sering berubah** dan **salah sedikit berdampak besar** ke rekomendasi lapangan. Pernah ada bug nyata: celah band kriteria DURIAN (lereng 15–16 jatuh ke kelas N), diperbaiki migrasi `0037`.

**Kerjakan**
1. Pasang Vitest (ringan, cocok dengan Vite/Next) — **ajukan dependensinya ke Dimas dulu**
2. Uji `computeBlend()`: tiap jenis pupuk, pembulatan, dan kasus "kandungan 0" (jangan bagi nol)
3. Uji `classify()`: tiap kelas S1/S2/S3/N, **hukum minimum**, dan **kasus batas tepat di ambang band**
4. **Wajib** sertakan kasus regresi celah band DURIAN dari migrasi `0037`
5. Tambahkan `npm test` ke pipeline CI

**Selesai bila**
- [ ] Coverage ≥ 85% untuk kedua fungsi
- [ ] Kasus batas & regresi 0037 tercakup
- [ ] `npm test` jalan di CI

---

# Ringkasan & urutan

| Urutan | Tiket | Estimasi | Kenapa urutannya begini |
|---|---|---|---|
| 1 | **F-3** Sinyal lint | 1 jam | Kerjakan hari ini — semua pekerjaan lain jadi lebih terbaca |
| 2 | *(TIKET-01 QA manual)* | 3–4 hari | Kuasai sistemnya dulu |
| 3 | **F-2** Error boundary | 2 hari | Kamu baru saja melihat semua cara sistem ini gagal |
| 4 | **F-1** Playwright E2E | 2 minggu | Ubah pengetahuan itu jadi jaring pengaman permanen |
| 5 | **F-4** i18n | 3 hari | Sistematis, cocok dengan ketelitian QA |
| 6 | **F-6** Empty state | 2 hari | |
| 7 | **F-5** Aksesibilitas | 3 hari | |
| 8 | **F-7** Performa | 2 hari | |
| — | **F-8** Uji unit | 3 hari | Boleh dialihkan ke Ridwan |

---

## Catatan

**Dependensi baru butuh persetujuan.** F-1 (Playwright) dan F-8 (Vitest) menambah paket. Ajukan di PR dengan alasan singkat sebelum memasangnya — aturan repo. Keduanya `devDependency`, tidak ikut ke image produksi.

**Koordinasi dengan Ridwan.** F-1 Tahap 1 bersinggungan dengan **B-3 (CI pipeline)** yang dia kerjakan. Sepakati dulu siapa yang membuat workflow GitHub Actions-nya supaya tidak bentrok.

**Jangan menyentuh RLS, role, approval, atau skema DB.** Semua tiket di sini murni frontend & pengujian. Perubahan di sisi itu ada di daftar Ridwan (B-4 … B-14).
