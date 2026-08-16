# Pematangan Backend AgroVision

| | |
|---|---|
| **Assignee** | Ridwan Nulloh (`ridwannulloh`) |
| **Reviewer** | @dimasperceka-se |
| **Total estimasi** | ± 12 hari kerja |
| **Aturan** | Satu tiket = satu branch = satu PR, wajib approval sebelum merge |

Fokus: keandalan deploy, ketahanan data, kebersihan skema, dan kesiapan operasional.

> **Catatan:** ada beberapa tiket tambahan yang dibagikan terpisah oleh Dimas (tidak lewat repo). Tanyakan langsung ke beliau sebelum mulai Sprint 3.

---

## Aturan kerja

Branch `main` terkunci. Push langsung ditolak — semua perubahan lewat PR dan **harus disetujui @dimasperceka-se**.

```
branch baru → commit → push branch → buka PR
  → review @dimasperceka-se → merge ke main → auto-deploy Cloud Run
```

Penamaan branch: `feat/…`, `fix/…`, `chore/…`

**Checklist tiap PR** (sudah ada di template PR): `npm run lint` 0 error · `npm run build` sukses · migrasi DB idempoten & teruji · tidak ada kredensial ter-commit.

---

## Konteks sistem

- **Next.js 16** (App Router, RSC + Server Actions) + **PostgreSQL 16 + PostGIS**
- Produksi: **Cloud Run** + **Cloud SQL**, region `asia-southeast2`
- Aplikasi konek DB sebagai `app_user` — **bukan** superuser
- Migrasi: ledger ber-checksum di `db/migrations/`, dijalankan `npm run db:migrate` — terakhir `0037`
- **Prinsip data:** nilai kosong ditulis `—`, **tidak pernah** `0`

### Menjalankan lokal

```bash
cp .env.example .env.local     # isi dengan nilai dummy untuk pengembangan
docker compose up -d           # PostgreSQL 16 + PostGIS, port 55433
npm ci
npm run db:migrate             # skema + PostGIS
npm run db:bootstrap           # role aplikasi
npm run db:seed:demo           # data & akun demo
npm run dev
```

Akun demo (semuanya dummy, domain `.invalid` memang tidak bisa dipakai sungguhan):
`admin@demo.invalid` · `approver@demo.invalid` · `creator@demo.invalid` · `direktur@demo.invalid`

Nilai environment sungguhan (project ID, connection name, secret) **tidak ada di repo** — minta ke Dimas saat kamu butuh.

> ⚠️ **Gotcha yang sudah pernah menggigit:** `postgres` di Cloud SQL bukan superuser, jadi perilaku beberapa fitur PostgreSQL berbeda dari Docker lokal. Kalau membuat migrasi yang menyentuh privilege atau row-level security, **uji di Cloud SQL**, jangan hanya di lokal.

---

# SPRINT 1 · Jaring pengaman (± 2,5 hari)

## B-5 · Bug: tombol "Setujui" tidak mengirim `moduleKey`
`fix/approve-modulekey` · **30 menit** · 🔴 Urgent

**Masalah**
Di `src/app/(app)/approval/DecisionForm.tsx`, form approve hanya mengirim `id` + `decision`, sedangkan form tolak juga mengirim `moduleKey`. Akibatnya action jatuh ke nilai default `"cost_transaction"` (`src/lib/actions/costing.ts:207`).

**Dampak**
Menyetujui hanya berhasil untuk modul Pengeluaran. Sepuluh modul lain (pemupukan, panen, penyiangan, penyemprotan, pruning, persiapan lahan, kesesuaian lahan, nursery, survei, DBH) selalu gagal dengan pesan *"Tidak bisa diputuskan — statusnya bukan menunggu approval."*

**Kerjakan**
Tambahkan `<input type="hidden" name="moduleKey" value={moduleKey} />` pada form approve.

**Selesai bila**
- [ ] Menyetujui berhasil di pemupukan, panen, survei, penyiangan
- [ ] QA manual tidak lagi terblokir di skenario B-02 … B-11

---

## B-3 · CI: lint, typecheck, build, uji DB — jadikan syarat merge
`chore/ci-pipeline` · **1 hari** · 🔴 High

**Masalah**
Tidak ada `.github/workflows/`, dan branch protection belum punya *required status checks* — PR yang gagal build tetap bisa di-merge. Reviewer harus percaya begitu saja bahwa kodenya lolos.

Repo sudah punya skrip verifikasi yang **belum pernah jalan otomatis**: `db:test`, `db:test:adversarial`, `db:check`, `db:verify`.

**Kerjakan**
1. GitHub Actions pada PR: `npm ci` → `npm run lint` → `npx tsc --noEmit` → `npm run build`
2. Job kedua dengan service Postgres + PostGIS: `db:migrate` → `db:bootstrap` → `db:test` → `db:test:adversarial`
3. Minta Dimas menambahkan check ini sebagai **required status check**

**Selesai bila**
- [ ] PR dengan lint error **tidak bisa** di-merge (buktikan dengan PR uji)
- [ ] Status check muncul di setiap PR
- [ ] Waktu CI < 10 menit

---

## B-2 · Migrasi DB belum jalan saat deploy
`feat/deploy-migrations` · **1 hari** · 🔴 High

**Masalah**
`cloudbuild.yaml` hanya build → push → deploy. **Tidak ada langkah migrasi.** Kalau ada PR yang butuh migrasi baru, kode naik ke produksi sementara skema DB belum berubah → aplikasi error. Sekarang aman semata karena migrasi dijalankan manual dan belum ada yang lupa.

**Kerjakan**
- Tambahkan step migrasi di `cloudbuild.yaml` **sebelum** step deploy
- Pakai Cloud SQL connector + secret (minta Dimas menyiapkan secretnya)
- Migrasi gagal ⇒ **deploy dibatalkan** — jangan pernah deploy kode baru ke skema lama

**Selesai bila**
- [ ] Merge PR berisi migrasi baru → skema ikut ter-update otomatis
- [ ] Migrasi sengaja dirusak → deploy berhenti, revisi lama tetap melayani
- [ ] Migrasi idempoten (jalan dua kali tidak merusak)

---

# SPRINT 2 · Ketahanan data (± 2,5 hari)

## B-1 · Penyimpanan bukti belum persisten
`feat/gcs-evidence-storage` · **2 hari** · 🔴 Critical

**Masalah**
`src/lib/storage.ts:70-84` — bila `GCS_BUCKET_EVIDENCE` tidak diset, berkas jatuh ke `writeFile()` ke folder `.evidence` di dalam container. **Filesystem Cloud Run bersifat sementara dan per-instance**: berkas hilang saat instance restart, dan tidak terlihat oleh instance lain. Implementasi Cloud Storage-nya sendiri masih `TODO` (baris 72).

Padahal bukti pembelian **wajib** diunggah saat mengajukan pengeluaran — jadi ada risiko approver menerima ajuan yang buktinya sudah tidak bisa dibuka.

**Kerjakan**
1. Implementasikan Cloud Storage di `storage.ts` (bucket privat)
2. Minta Dimas membuat bucket + IAM untuk service account Cloud Run
3. Baca kembali lewat **signed URL** berumur pendek
4. Pertahankan perhitungan `sha256` (baris 62) untuk verifikasi integritas
5. Fallback penyimpanan lokal tetap dipertahankan untuk pengembangan
6. Cek apakah masih ada berkas lama yang bisa diselamatkan

**Selesai bila**
- [ ] Unggah bukti → tersimpan di Cloud Storage
- [ ] Restart instance → berkas tetap ada
- [ ] Batas 8 MB tetap berlaku

---

## B-13 · `evidence_links` INSERT dinonaktifkan
`fix/evidence-links` · **0,5 hari** · 🟠 High

`src/lib/repo/costing.ts:196-197` memuat komentar `// MUTATION-TEST: evidence link INSERT disabled on purpose.` Bukti tersimpan tapi **tidak tertaut ke transaksinya**. Cari tahu apakah ini sisa eksperimen, lalu aktifkan kembali. **Kerjakan bersama B-1.**

**Selesai bila:** bukti yang diunggah tertaut ke transaksinya dan bisa ditelusuri dari Inbox Approval.

---

# SPRINT 3 · Kelengkapan jejak & kebersihan skema (± 3 hari)

> Sebelum mulai sprint ini, tanyakan ke Dimas soal tiket tambahan yang dibagikan terpisah — beberapa di antaranya menyentuh berkas yang sama.

## B-8 · Jejak audit belum menyeluruh
`feat/audit-trail-approval` · **1 hari** · 🟠 High

**Masalah**
Trigger `write_audit()` baru terpasang di 5 tabel: `cost_transactions` (`0016:93-95`), `blocks`, `emission_factors`, `carbon_runs`, `cert_decisions` (`0012:86-100`). Modul approval lainnya **tidak tercatat di `audit_log`** — siapa yang menyetujui pemupukan atau panen tidak terekam.

**Kerjakan**
- Pasang trigger audit ke seluruh tabel ber-`approval_status`
- Pastikan perubahan status + aktor tercatat
- Tambah invariant: setiap tabel ber-`approval_status` **wajib** punya trigger audit

**Selesai bila**
- [ ] Setujui/tolak di modul mana pun → tercatat di `audit_log` dengan aktor & waktu

---

## B-9 · Kolom approval yatim di `tree_survey_points`
`fix/tree-survey-approval` · **0,5 hari** · 🟡 Medium

Tabel punya kolom `approval_status` (`0014:134-137`) tapi tidak terhubung ke alur approval mana pun: tidak ada di view `v_pending_approvals`, dan tidak ada routing di `decide_record()`. Record di tabel itu tidak akan pernah bisa diputuskan lewat UI.

**Putuskan bersama Dimas:** hubungkan ke alur approval, **atau** buang kolomnya. Jangan dibiarkan menggantung.

---

## B-10 · Kolom `users.role` warisan
`chore/drop-legacy-role` · **0,5 hari** · 🟡 Medium

Enum lama 8 nilai (`0002_core.sql:34-46`) masih ada di samping `app_role` yang kanonik; sudah ditandai DEPRECATED di `0014:64` tapi tak pernah di-`DROP`. **Dua sumber kebenaran** — tinggal menunggu satu query membaca kolom yang salah.

**Kerjakan:** pastikan nol pemakaian di `src/` dan `db/`, lalu drop kolom + enum lamanya.

---

## B-11 · Tabel approval berjenjang yang tidak terpakai
`chore/drop-dead-approval-tables` · **0,5 hari** · 🟡 Medium

`approval_requests` + `approval_steps` (`0012:12-41`, `0014:90-125`) lengkap dengan `required_app_role`, `step_order`, `resubmitted_from_id` — tapi **nol referensi di `src/`**. Skema mati yang menyesatkan pembaca berikutnya.

**Kerjakan:** drop, **atau** tulis ADR singkat kalau memang direncanakan dipakai.

---

## B-12 · Status yang tak pernah dipakai
`chore/prune-record-status` · **0,5 hari** · 🟡 Medium

Enum `app.record_status` punya 6 nilai, tapi `under_review` dan `cancelled` tidak pernah di-set kode mana pun — hanya muncul di klausa `IN (…)` dan label i18n. State machine efektifnya cuma 4 status.

**Kerjakan:** buang dari enum & label, **atau** implementasikan alurnya.

---

# SPRINT 4 · Kesiapan produksi (± 4,5 hari)

## B-15 · Connection pool untuk serverless
`feat/pool-tuning` · **1 hari** · 🟠 High

Cloud Run bisa scale ke banyak instance, dan **tiap instance membawa pool sendiri** → Cloud SQL bisa kehabisan koneksi saat ramai.

**Kerjakan:** setel `DATABASE_POOL_MAX` sesuai `max_connections` ÷ `max-instances`, tambahkan `connectionTimeoutMillis` & `idleTimeoutMillis`, lalu **uji beban** untuk membuktikan.

---

## B-16 · Logging terstruktur & error reporting
`feat/observability` · **1 hari** · 🟠 High

Belum ada log terstruktur, request ID, atau Error Reporting. Saat ada error di produksi, tidak ada yang tahu kecuali pengguna mengeluh.

**Kerjakan:** log JSON (Cloud Logging membacanya otomatis) · request ID yang menembus server action · Cloud Error Reporting.
⚠️ **Jangan sampai log memuat data pribadi (nama petani, email) atau isi konfigurasi sensitif.**

---

## B-17 · Backup & uji restore Cloud SQL
`chore/backup-restore-drill` · **0,5 hari** · 🟠 High

Backup otomatis belum dikonfigurasi eksplisit dan **belum pernah diuji restore**. Backup yang belum pernah diuji bukan backup.

**Kerjakan:** nyalakan backup harian + PITR · **lakukan restore sungguhan** ke instance sementara · catat waktu pemulihan (RTO) · tulis runbook singkat.

---

## B-18 · Lingkungan staging
`feat/staging-env` · **2 hari** · 🟡 Medium

Sekarang merge ke `main` langsung ke produksi. Tidak ada tempat mencoba migrasi sebelum kena data sungguhan.

**Kerjakan:** Cloud Run + Cloud SQL staging, trigger dari branch `staging`, data seed demo.

---

# Ringkasan

| Sprint | Tiket | Estimasi |
|---|---|---|
| 1 · Jaring pengaman | B-5, B-3, B-2 | ± 2,5 hari |
| 2 · Ketahanan data | B-1, B-13 | ± 2,5 hari |
| 3 · Jejak & skema | B-8, B-9, B-10, B-11, B-12 | ± 3 hari |
| 4 · Kesiapan produksi | B-15, B-16, B-17, B-18 | ± 4,5 hari |
| | **Total** | **± 12,5 hari kerja** |

**Urutan bukan sekadar saran.** Sprint 3 menyentuh migrasi dan skema — bagian paling rawan di sistem ini. Jangan dimulai sebelum **B-3 (CI)** selesai, supaya uji otomatis bisa menangkap kalau ada yang jebol.
