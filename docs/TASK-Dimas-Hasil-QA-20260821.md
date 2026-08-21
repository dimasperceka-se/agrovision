# Daftar Tindak Lanjut Dimas dari QA Sementara

Sumber: `QA-Manual-AgroVision-20260821.xlsx`, diperbarui 21 Agustus 2026.

## Ringkasan kondisi QA

- 42 dari 63 skenario memiliki status: 30 `PASS`, 5 `BLOCKED`, 2 `FAIL`, dan 5 `SKIP`.
- 21 skenario belum memiliki status dan belum dapat dianggap lulus.
- Beberapa skenario berstatus `PASS` masih memiliki catatan masalah. Item tersebut tetap dimasukkan ke daftar tindak lanjut.
- Sheet **Log Bug** belum mencerminkan hasil QA: hanya berisi `BUG-01` contoh lama tentang approval Panen, padahal B-03 pada skenario terbaru sudah `PASS`.

## P0 — Perbaikan alur utama

### D-01 · Perbaiki pengajuan ulang setelah ditolak

Referensi QA: **B-13 — FAIL**, prioritas High.

- [ ] Hilangkan infinite loading setelah approver menolak pengajuan.
- [ ] Kembalikan record yang ditolak menjadi draft yang dapat diedit creator.
- [ ] Pastikan record dapat diajukan ulang dan kembali muncul di Inbox Approval.
- [ ] Pastikan alasan penolakan tetap terlihat dan riwayat keputusan tidak hilang.

Selesai bila alur `ditolak → edit → ajukan ulang → diproses approver` berhasil tanpa refresh paksa atau loading tanpa akhir.

### D-02 · Sediakan alur Catat Pengeluaran dan upload bukti

Referensi QA: **B-01 — BLOCKED**, **E-05 — FAIL**, **B-18 — catatan**.

- [ ] Tentukan penempatan tombol/form **Catat Pengeluaran** untuk creator.
- [ ] Sediakan input volume, satuan, tarif/harga, serta bukti pembelian.
- [ ] Jadikan bukti wajib sebelum pengajuan, dengan validasi dan pesan yang jelas.
- [ ] Pastikan form dapat menjalankan draft, ajukan, dan approval end-to-end.
- [ ] Koordinasikan kontrak upload dan penyimpanan evidence dengan Ridwan.

Catatan: ketiadaan form membuat tiga skenario berbeda tidak dapat diuji secara valid, termasuk pengujian self-approval B-18.

### D-03 · Perbaiki pengajuan Kesesuaian Lahan yang tidak sesuai

Referensi QA: **B-08 — BLOCKED**, prioritas High.

- [ ] Pastikan hasil "tidak sesuai" tidak membuat record terjebak sebagai draft permanen.
- [ ] Sediakan tindakan edit dan ajukan ulang yang jelas.
- [ ] Selaraskan perilakunya dengan state machine draft/approval yang berlaku.

## P1 — Lengkapi fitur pencatatan

### D-04 · Tambahkan Catat Inspeksi Nursery

Referensi QA: **B-09 — BLOCKED**.

- [ ] Tambahkan tombol dan form Catat untuk creator pada `/nursery`.
- [ ] Dukung data hidup, mati, dan rusak serta validasi jumlahnya.
- [ ] Hubungkan ke alur approval dan pembaruan survival rate.

### D-05 · Tambahkan Catat DBH

Referensi QA: **B-11 — BLOCKED**.

- [ ] Tambahkan tombol dan form Catat DBH pada modul Akuntansi Karbon.
- [ ] Hubungkan pencatatan DBH ke alur approval.
- [ ] Pastikan data kosong tetap ditampilkan sebagai `—`, bukan `0`.

### D-06 · Tambahkan pengelolaan bukti Sertifikasi

Referensi QA: **D-04 — BLOCKED**.

- [ ] Tambahkan tindakan untuk membuat atau memperbarui bukti K1–K7.
- [ ] Pastikan status bukti tersimpan dan progres standar ikut diperbarui.
- [ ] Tentukan apakah bukti sertifikasi memakai komponen upload evidence yang sama.

## P1 — Validasi input dan perhitungan biaya

### D-07 · Lengkapi field wajib pada aktivitas berbiaya

Referensi QA: **B-05** dan **B-07**, keduanya tercatat `PASS` tetapi memiliki catatan masalah.

- [ ] Penyemprotan: pastikan material yang dibutuhkan tersedia pada pilihan, termasuk keputusan untuk data uji "Insektisida X".
- [ ] Penyemprotan: jadikan volume total wajib bila dipakai menghitung biaya.
- [ ] Persiapan Lahan: jadikan area efektif wajib bila dipakai menghitung biaya.
- [ ] Tampilkan validasi sebelum record dapat diajukan.
- [ ] Pastikan nilai refleksi di Inbox menggunakan rumus `volume × tarif/harga`, bukan kosong atau nol semu.

### D-08 · Audit konsistensi budget, realisasi, dan refleksi biaya

Referensi QA: **E-01** memiliki catatan "dengan catatan" dan **E-03** mempertanyakan sumber realisasi.

- [ ] Dokumentasikan sumber angka realisasi pada layar Anggaran.
- [ ] Cocokkan angka creator, approver, Refleksi, Anggaran, dan Dashboard Finansial untuk record yang sama.
- [ ] Verifikasi rumus volume, tarif, tonase, total biaya, persentase serapan, dan selisih secara manual.
- [ ] Pastikan hanya record berstatus disetujui yang masuk realisasi.
- [ ] Ubah tampilan nilai yang belum tersedia menjadi `—`, bukan `0`.
- [ ] Minta Harits memperjelas catatan E-01 dengan contoh record dan angka sebelum tiket dianggap selesai.

## P2 — Penyempurnaan UX dan akses

### D-09 · Lengkapi tampilan rekomendasi pemupukan untuk creator

Referensi QA: **C-05 dan C-06 — SKIP**, **C-07 — PASS dengan catatan**.

- [ ] Pastikan creator dapat melihat daftar rekomendasi per blok.
- [ ] Pastikan baris rekomendasi dapat dibuka untuk melihat parameter dan takaran produk.
- [ ] Samakan pilihan jenis pupuk pada rekomendasi dengan form Catat Pemupukan.
- [ ] Siapkan penjelasan singkat hasil kesesuaian/rekomendasi; catatan C-03 menyebut hasil masih perlu briefing.

### D-10 · Perbaiki interaksi Traceability

Referensi QA: **D-05 — PASS dengan catatan**.

- [ ] Buat garis alur dapat diklik atau dipilih.
- [ ] Tampilkan popup/detail perpindahan antaraktor dari garis yang dipilih.
- [ ] Pastikan data pada peta konsisten dengan tabel.

### D-11 · Putuskan kebutuhan menu ganti entitas

Referensi QA: **A-07 — SKIP** karena menu belum tersedia.

- [ ] Konfirmasi apakah Super Admin memang harus dapat mengganti entitas dari UI.
- [ ] Jika ya, buat tiket implementasi dan uji isolasi data antar-entitas.
- [ ] Jika tidak, revisi skenario QA agar tidak terus tercatat sebagai `SKIP`.

## P0 — Rapikan dan lanjutkan QA

### D-12 · Minta Harits membersihkan hasil QA sementara

- [ ] Ubah status skenario yang memiliki masalah dari `PASS` menjadi `FAIL` atau pecah catatannya menjadi bug terpisah: B-05, B-07, C-07, D-05, E-01, dan E-03.
- [ ] Isi **Ref Bug** untuk setiap `FAIL`/`BLOCKED` yang merupakan defect.
- [ ] Hapus baris contoh `BUG-01` atau perbarui sesuai kondisi terbaru.
- [ ] Lengkapi perangkat dan tanggal pada hasil pengujian.
- [ ] Bedakan antara fitur rusak, fitur belum tersedia, data uji tidak tersedia, dan kebutuhan yang belum diputuskan.

### D-13 · Tuntaskan 21 skenario yang belum diuji

Skenario tanpa status:

- **D-01:** katalog dan mutasi stok Chemical.
- **F-01–F-05:** dashboard, seluruh laporan, ekspor PDF/Excel, dan silang-cek angka.
- **G-01–G-10:** PWA, offline, mobile, responsivitas, loading, dan keterbacaan.
- **H-01–H-05:** validasi, batas upload 8 MB, klik ganda, navigasi browser, dan bahasa.

Dimas tidak perlu mengambil alih eksekusi QA, tetapi perlu memastikan Harits menyelesaikannya sebelum UAT dan mengubah setiap kegagalan menjadi tiket yang mempunyai assignee.

## Urutan pengerjaan yang disarankan

1. D-12: rapikan bukti QA agar baseline dapat dipercaya.
2. D-01 sampai D-03: buka blocker alur approval dan pengeluaran.
3. D-04 sampai D-08: lengkapi pencatatan serta benahi kalkulasi.
4. Jalankan ulang skenario B dan E yang terdampak.
5. D-09 sampai D-11: selesaikan kekurangan UX dan keputusan produk.
6. D-13: tuntaskan semua skenario yang masih kosong sebelum UAT.
