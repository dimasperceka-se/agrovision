# Contekan Demo AgroVision — Poin per Poin

> Cara pakai: tiap bagian punya **Intro** (kalimat pembuka yang diucapkan) lalu
> **Klik** (yang dibuka) + **Bilang** (isi) + **Sambungan** (jembatan ke bagian
> berikut). Benang merah: *semua nempel ke blok · 1 persetujuan gerakkan semua ·
> kosong = "—".*

---

## 0. Persiapan
> **Intro:** "Sebelum mulai, saya sudah login ke lingkungan demo PT Demo Agro Kalimantan."
- Login tanpa password (isi email): `admin@demo.invalid` (Super Admin), `creator@demo.invalid` (lapangan).
- Bahasa ID/EN di kanan atas. Komoditas: **kelapa + durian**. Infra: **GCP**.

## 1. Pembukaan
> **Intro:** "Izinkan saya mulai dari masalah yang ingin kita pecahkan, baru ke solusinya."
- Bilang: "Masalah kebun: data tercecer, biaya per blok tak jelas, klaim keberlanjutan sulit dibuktikan."
- Bilang: "AgroVision = **satu aliran data** dari lahan → persetujuan → laporan. Bukan kumpulan fitur."
- Bilang: "Prinsipnya: **tidak ada angka fabrikasi**; yang belum ada datanya ditulis '—', bukan 0."

## 2. Login & Peran
> **Intro:** "Pertama, soal siapa boleh melakukan apa — karena ini fondasi kepercayaan datanya."
- Klik: login sebagai **Rizky (Creator)**.
- Bilang: "Creator hanya **mencatat**, tidak menyetujui. Approver yang setujui."
- Bilang: "Antar-perusahaan terisolasi di level database (RLS) — bukan sekadar di tampilan."
- Sambungan: "Semua yang dicatat Rizky harus lewat **Inbox Approval** dulu."

## 3. Tiga Dashboard
> **Intro:** "Begitu masuk, kita disambut kokpit perusahaan — tiga sudut pandang dari satu kebun."
- Klik: **Dashboard** (Operasional, Keberlanjutan, Keuangan).
- Bilang: "Tiga sudut pandang, satu kebun: operasi, karbon, uang."
- Bilang: "Kartu **Pendapatan kosong ('—')** karena belum panen. Kami tolak tampilkan 0 — itu bohong."
- Sambungan: "Angka ini bukan input manual — hasil agregasi. Kita telusuri sumbernya."

## 4. Pra-Tanam
> **Intro:** "Cerita kebun selalu dimulai sebelum menanam — menilai lahan, menyiapkan, membibitkan."
- **Kesesuaian Lahan** → Klik: pilih komoditas + isi parameter (pH, hujan, lereng). Bilang: "Sistem nilai kelas S1–N (hukum minimum)."
- **Persiapan Lahan** → Bilang: "Land clearing dicatat → jadi titik data untuk **karbon** & **biaya**."
- **Pembibitan** → Bilang: "Bibit per batch (hidup/mati/rusak) → survival terukur. **Ingat ID batch** — muncul lagi di Traceability."
- Sambungan: "Bibit ditanam ke **blok**. Buka petanya."

## 5. Blocks & Map
> **Intro:** "Inilah jantung spasialnya — semua data akhirnya menempel di sini, di atas peta."
- Klik: **Blok & Peta** → terbuka di area drone (pilot).
- Klik panel kiri-bawah: **Titik pohon** (kelapa kuning / durian fuchsia), **Interpolasi → pH Tanah**.
- Bilang: "Dari titik sampel 5 m, **60 parameter** jadi peta panas mulus, terpotong bentuk blok."
- Bilang: "Luas blok dari **PostGIS**, bukan ketik manual → biaya per ha tak bisa dimanipulasi."
- Sambungan: "Semua aktivitas nempel ke blok. Blok = lem biaya + karbon + hasil."

## 6. Aktivitas Kebun
> **Intro:** "Sekarang denyut harian lapangan — dan pola yang sama berulang: catat, ajukan, setujui."
- **Penyiangan** → catat metode/luas/tenaga → **Ajukan**.
- **Pemupukan** (paling penting):
  - Bilang: "Sistem **menghasilkan rekomendasi** N-P-K + Sumber K per blok."
  - Klik baris rekomendasi → keluar **dosis produk** (mis. K₂O 500 → **KNO₃ ≈ 1.087 g/pohon**).
  - Bilang: "Dropdown jenis pupuk = persis sumber K yang direkomendasikan. Anjuran & realisasi satu bahasa."
- **Pruning / Penyemprotan** → Bilang: "Semprot ambil bahan dari **Agri-Input** → dosis & stok terhubung."
- **Panen** → Bilang: "Panen disetujui = **Pendapatan otomatis terisi** di Dashboard Keuangan."
- Sambungan: "Semua masih draft. Buktikan di **Approval**."

## 7. Agri-Input
> **Intro:** "Aktivitas tadi butuh bahan dan alat — semuanya berasal dari satu katalog."
- Klik: **Agri-Input** (Chemical + Equipment).
- Bilang: "Katalog bahan (stok + rekomendasi fase) & alat. Nutup celah 'pupuk hilang'."

## 8. Field Survey
> **Intro:** "Kadang kita perlu formulir baru dadakan — dan itu tidak perlu programmer."
- Klik: **Survey Lapangan**.
- Bilang: "Form disimpan sebagai **skema di database** → tambah pertanyaan tanpa deploy ulang."

## 9. Inbox Approval ⭐
> **Intro:** "Inilah simpul yang menyatukan semuanya — di sinilah 'terhubung' itu terbukti."
- Klik: login **Sari (Super Admin)** → **Inbox Approval**.
- Bilang: "Semua pending dari **semua modul** kumpul di sini."
- Bilang: "Kolom **Nilai** = rupiah hasil refleksi (volume × tarif; panen = pendapatan, hijau). Observasi tetap '—'."
- Klik satu baris → keluar **nilai tiap parameter** record itu.
- Klik **Setujui** → Bilang: "Satu klik gerakkan biaya + peta + laporan sekaligus."

## 10. Accounting
> **Intro:** "Karena persetujuan menggerakkan uang, mari lihat sisi keuangannya."
- Klik: **Refleksi / Pengeluaran / Anggaran**.
- Bilang: "Aktivitas disetujui → **direfleksikan** jadi biaya (volume × tarif). Panen → revenue."
- Bilang: "Anggaran terlampaui ditandai merah. Tak ada input pendapatan manual."

## 11. Sustainability
> **Intro:** "Selain uang, ada nilai yang makin dituntut pasar: bukti keberlanjutan."
- **Carbon** → Bilang: "Neraca karbon per blok. Jujur: koefisien IPCC **belum divalidasi** — ditulis terang."
- **Sertifikasi Organik** → Bilang: "Standar per pasar, masa konversi, bukti riwayat lahan."
- **Traceability (bintang)** ⭐ → Klik toggle **Transaksional ↔ Emisi**:
  - Transaksional: "Arus komoditas petani → pengepul → pabrik → ekspor (garis beranimasi)."
  - Emisi: "Peta sama, node diwarnai jejak karbon + heatmap. Agroforestri **menyerap** karbon (batang hijau negatif)."
  - Bilang: "Tabel di bawah = isi peta, satu sumber kebenaran."
- Sambungan: "Ingat ID batch bibit? Skema traceability siap sambung sampai buah durian."

## 12. Reports + Ekspor
> **Intro:** "Semua kerja tadi harus bisa keluar jadi dokumen yang dibawa ke rapat."
- Klik: **Report** → tombol **Unduh** (pilih **PDF** atau **Excel**).
- Bilang: "Laporan dari definisi tersimpan, berkop resmi, **RLS tetap berlaku**."
- Bilang: "Kejujuran ikut: pendapatan '—', peringatan IPCC tetap tercetak."

## 13. Master Data & Pengguna
> **Intro:** "Terakhir, fondasi diam-diam yang membuat semua ini tumbuh tanpa programmer."
- Klik: **Master Data**.
- Bilang: "Semua dropdown berasal dari sini. Tambah 1 jenis pupuk → **langsung muncul** di form."
- Bilang: "**Pengguna** atur peran & lingkup — kembali ke awal cerita."

## 14. Penutup
> **Intro:** "Mari saya tarik benang merahnya dalam satu tarikan napas."
- Bilang: "Dari nilai lahan → tanam → rawat → panen → 1 klik gerakkan biaya, karbon, revenue → laporan PDF/Excel → peta traceability."
- Bilang: "Tak ada angka diketik dua kali. Tak ada 0 palsu. Tak ada klaim tak bisa ditelusuri."
- Bilang: "**AgroVision bukan 10 fitur — satu aliran data dari tanah sampai laporan.**"

---

## 3 Kalimat Pamungkas (kalau waktu mepet)
1. "Semua nempel ke **blok**; luas dari PostGIS — tak bisa dimanipulasi."
2. "Satu **persetujuan** gerakkan biaya, karbon, dan pendapatan sekaligus."
3. "Yang belum ada datanya ditulis **'—', bukan 0** — kejujuran itu fiturnya."

## Peta Keterkaitan (1 slide)
```
Pra-Tanam → BLOK (PostGIS) → Aktivitas → APPROVAL → Accounting → Reports (PDF/Excel)
   (ID bibit)      ↓                         (1 klik)      ↑
             Peta & Interpolasi          Master Data → semua dropdown
                    ↓
             TRACEABILITY (transaksi + emisi) · CARBON
```
