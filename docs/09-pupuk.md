# Parameter & Metode Penyusunan Rekomendasi Pemupukan — Kelapa dan Durian

**Konteks dokumen:** proyek agroforestri korporat, kelapa (*Cocos nucifera*) + durian (*Durio zibethinus*), skala besar (puluhan ribu ha), lahan APL.

> **Peringatan utama.** Tidak ada rekomendasi pemupukan kelapa maupun durian yang valid tanpa data lokasi sendiri. Angka dari literatur hanya berguna sebagai (a) kelas penilaian dan (b) titik awal. Dokumen ini adalah kerangka *cara menghasilkan* rekomendasi, bukan daftar dosis siap pakai.
>
> Tabel kadar kritis hara daun di Bagian 3 sengaja dibiarkan kosong. Saya tidak mengisinya dengan angka dari ingatan karena kesalahan pada nilai kritis akan merambat ke seluruh rekomendasi dosis. Isi dari sumber primer yang dirujuk di Bagian 9.

---

## 1. Memilih Pendekatan

| Pendekatan | Dasar penilaian | Kesesuaian untuk kelapa & durian | Peran |
|---|---|---|---|
| **Uji tanah** | Status hara tanah vs kelas kecukupan | Terbatas — perakaran dalam, sampel sulit representatif | Penetapan **amelioran**: kapur, dolomit, bahan organik |
| **Analisis daun / jaringan** | Konsentrasi hara organ indikator vs kadar kritis | **Utama** | Diagnosis **hara pembatas** |
| **Neraca hara** | Hara terangkut + imobilisasi − suplai | **Utama** | Penetapan **dosis** |
| **Uji respons lapangan** (omission plot, kurva respons) | Respons hasil terhadap dosis | **Wajib pada skala besar** | **Kalibrasi & validasi** |

**Dasar pemilihan analisis daun untuk tanaman tahunan:** tanaman berperakaran dalam sulit diperoleh sampel tanah yang representatif pada zona perakarannya, sehingga analisis daun lebih tepat; status hara daun merupakan gambaran status hara aktual yang tersedia bagi tanaman (Hernita dkk., 2012).

**Kombinasi yang direkomendasikan:**

```
Uji tanah        → amelioran (kapur, dolomit, bahan organik)
Analisis daun    → hara mana yang membatasi
Neraca hara      → berapa dosisnya
Omission plot    → kalibrasi ulang setiap 3–4 tahun
```

---

## 2. Parameter Tanah

### 2.1 Wajib

| # | Parameter | Satuan | Metode standar | Fungsi dalam rekomendasi | Status |
|---|---|---|---|---|---|
| T1 | pH H₂O | — | Elektrometrik 1:2,5 | Kebutuhan kapur; ketersediaan P | ☐ |
| T2 | pH KCl | — | Elektrometrik 1:2,5 | Deteksi kemasaman cadangan | ☐ |
| T3 | C-organik | % | Walkley & Black | Estimasi mineralisasi N; dosis bahan organik | ☐ |
| T4 | N-total | % | Kjeldahl | Suplai N tanah | ☐ |
| T5 | P-tersedia | ppm / mg kg⁻¹ | **Bray-1** (tanah masam) atau **Olsen** (pH >6,5) | Dosis P | ☐ |
| T6 | K dapat ditukar | cmol(+) kg⁻¹ | NH₄-asetat 1 N pH 7 | Dosis K | ☐ |
| T7 | Ca dapat ditukar | cmol(+) kg⁻¹ | NH₄-asetat 1 N pH 7 | Kebutuhan kapur; rasio kation | ☐ |
| T8 | Mg dapat ditukar | cmol(+) kg⁻¹ | NH₄-asetat 1 N pH 7 | Dosis dolomit/kieserit | ☐ |
| T9 | Na dapat ditukar | cmol(+) kg⁻¹ | NH₄-asetat 1 N pH 7 | Risiko sodisitas | ☐ |
| T10 | KTK | cmol(+) kg⁻¹ | NH₄-asetat 1 N pH 7 | Kapasitas retensi; risiko pencucian | ☐ |
| T11 | Kejenuhan basa (KB) | % | Hitungan (Σ basa ÷ KTK) | Status kesuburan dasar | ☐ |
| T12 | Al dapat ditukar & kejenuhan Al | cmol(+) kg⁻¹ / % | Ekstrak KCl 1 N | **Kritis** — Al tinggi meracuni akar, terutama durian | ☐ |
| T13 | Tekstur (fraksi pasir/debu/liat) | % | Pipet / hidrometer | Risiko pencucian K & N; frekuensi split | ☐ |
| T14 | DHL / EC | dS m⁻¹ | Konduktometri | Risiko salinitas — relevan kelapa pesisir | ☐ |
| T15 | Kedalaman efektif | cm | Profil / minipit | Zona penempatan pupuk | ☐ |
| T16 | Drainase | kelas | Pengamatan lapang | Risiko denitrifikasi & pencucian | ☐ |

### 2.2 Sangat disarankan

| # | Parameter | Metode | Catatan | Status |
|---|---|---|---|---|
| T17 | S tersedia | Ekstrak Ca-fosfat / turbidimetri | Penting bila memakai K₂SO₄ / ZA | ☐ |
| T18 | B tersedia | Air panas / azomethine-H | Defisiensi B umum pada palma & buah tropika | ☐ |
| T19 | Cu, Zn, Fe, Mn tersedia | DTPA atau HCl 0,05 N | Terutama pada tanah masam & gambut | ☐ |
| T20 | Mo | — | Bila ada gejala spesifik | ☐ |
| T21 | **Cl tanah** | Ekstraksi air / titrasi AgNO₃ | Lihat Bagian 6 — wajib untuk kedua komoditas | ☐ |
| T22 | Bobot isi (*bulk density*) | Ring sampel | **Konversi ppm → kg/ha** — sering diabaikan padahal wajib | ☐ |
| T23 | Retensi P | — | Tanah Andisol / kaya Fe-Al oksida | ☐ |

### 2.3 Protokol sampling tanah

- **Kedalaman:** 0–20 cm (lapisan aktivitas hara) **dan** 20–40 cm (zona perakaran aktif tanaman tahunan). Untuk kelapa dan durian dewasa, tambahkan 40–60 cm pada sebagian titik.
- **Posisi horizontal:** di dalam piringan, pada jarak ⅓–½ radius tajuk dari batang. **Jangan** ambil tepat di titik aplikasi pupuk terakhir.
- **Komposit:** 15–20 titik anakan per satuan pengelolaan homogen → 1 sampel komposit ±1 kg.
- **Waktu:** akhir musim hujan atau menjelang aplikasi pupuk pertama; **konsisten setiap tahun**.
- **Frekuensi:** 1× per 2–3 tahun untuk parameter lengkap; tahunan untuk pH, C-organik, K-dd.

### 2.4 Rujukan kelas penilaian

Angka hasil laboratorium tidak bermakna tanpa tabel kelas. Gunakan:

- **Balai Penelitian Tanah (2009). *Kriteria Penilaian Sifat Kimia Tanah*** — klasifikasi sangat rendah / rendah / sedang / tinggi / sangat tinggi untuk setiap parameter
- **Eviati & Sulaeman (2009). *Petunjuk Teknis Analisis Kimia Tanah, Tanaman, Air, dan Pupuk*** — metode laboratorium baku

Pastikan laboratorium yang dipakai **terakreditasi KAN (SNI ISO/IEC 17025)** dan menyebutkan metode ekstraksi pada sertifikat hasil. Hasil P-Bray dan P-Olsen tidak dapat dibandingkan langsung.

---

## 3. Parameter Jaringan (Analisis Daun)

Ini bagian yang paling sering dilakukan salah, karena hasilnya sangat sensitif terhadap **organ, posisi, umur daun, dan fase fenologi** saat sampling.

### 3.1 Protokol sampling daun

| Aspek | Kelapa | Durian |
|---|---|---|
| Organ indikator | **Pelepah ke-14** (standar internasional untuk kelapa dewasa) | Daun dewasa terakhir yang matang penuh pada tunas **non-berbuah** |
| Bagian yang diambil | Sepertiga tengah leaflet, **tanpa tulang daun tengah (midrib)** | Lamina utuh, **tanpa tangkai daun** |
| Jumlah pohon per unit | 20–30 pohon per Leaf Sampling Unit | 20–30 pohon per unit |
| Jumlah daun per pohon | 4–6 leaflet (2–3 dari sisi kiri, 2–3 dari sisi kanan) | 8–12 daun tersebar 4 arah mata angin |
| Ketinggian ambil | Sekeliling tajuk, ketinggian tengah | Tajuk bagian tengah-luar, terpapar cahaya |
| Fase fenologi | Distandarkan; hindari puncak kemarau | **Kritis** — hindari fase pembungaan & pengisian buah; ambil pada fase vegetatif stabil (biasanya pasca-panen setelah pemulihan tajuk) |
| Waktu hari | Pagi, sebelum 10.00 | Pagi, sebelum 10.00 |
| Penanganan | Bersihkan debu (kain lembap, bukan dicuci berlebihan), keringkan 60–70 °C sampai bobot konstan, giling <0,5 mm | Idem |
| Frekuensi | 1× per tahun, **waktu yang sama setiap tahun** | 1× per tahun, waktu yang sama |

**Bukti bahwa waktu sampling menentukan hasil:** penelitian pada jeruk pamelo menunjukkan konsentrasi N, P, dan K daun menurun seiring perubahan fase, baik pada daun ketiga-keempat maupun kelima-keenam (Thamrin dkk., 2013). Bila protokol tidak dibakukan, hasil antar-tahun tidak dapat dibandingkan dan seluruh sistem rekomendasi kehilangan maknanya.

### 3.2 Hara yang dianalisis

| Hara | Kelapa | Durian | Catatan |
|---|---|---|---|
| N | ✔ | ✔ | Kjeldahl |
| P | ✔ | ✔ | Pengabuan basah / kering, spektrofotometri |
| K | ✔ | ✔ | AAS / flame photometry |
| Ca | ✔ | ✔ | AAS |
| Mg | ✔ | ✔ | AAS |
| S | ✔ | ✔ | Turbidimetri |
| **Cl** | ✔ **wajib** | ✔ **wajib** | Kelapa: pemantauan kecukupan. Durian: pemantauan akumulasi. Lihat Bagian 6 |
| B | ✔ | ✔ | Azomethine-H |
| Cu, Zn, Mn, Fe | ✔ | ✔ | AAS |
| Na | ✔ | opsional | Relevan pada kelapa pesisir |

### 3.3 Tabel kadar kritis — untuk diisi dari sumber primer

**Kelapa (pelepah ke-14, % bahan kering kecuali dinyatakan lain)**

| Hara | Defisien | Rendah | Optimum | Tinggi | Sumber |
|---|---|---|---|---|---|
| N | | | | | Balitpalma / Magat (PCA) |
| P | | | | | Balitpalma / Magat (PCA) |
| K | | | | | Balitpalma / Magat (PCA) |
| Ca | | | | | Balitpalma / Magat (PCA) |
| Mg | | | | | Balitpalma / Magat (PCA) |
| S | | | | | Balitpalma / Magat (PCA) |
| **Cl** | **< 0,25** | | | | von Uexküll (1990) — lihat Bagian 6 |
| B (ppm) | | | | | Balitpalma |
| Cu, Zn, Mn, Fe (ppm) | | | | | Balitpalma |

**Durian (% bahan kering kecuali dinyatakan lain)**

| Hara | Defisien | Rendah | Optimum | Tinggi | Sumber |
|---|---|---|---|---|---|
| N | | | | | Poovarodom dkk., *Leaf Nutrient Concentration Standards for Durian* |
| P | | | | | idem |
| K | | | | | idem |
| Ca | | | | | idem |
| Mg | | | | | idem |
| S | | | | | idem (kisaran teramati ±0,19% pada perlakuan sulfat) |
| Cl | | | | | idem (kisaran teramati 0,02–0,12%) |
| B, Cu, Zn, Mn, Fe (ppm) | | | | | idem |

### 3.4 Diagnosis lanjutan

Perbandingan terhadap kadar kritis tunggal punya kelemahan: hasilnya terpengaruh efek pengenceran, umur daun, dan interaksi antar-hara. Gunakan sebagai pelengkap:

- **DRIS** (Diagnosis and Recommendation Integrated System, Beaufils 1973) — memakai **rasio antar-hara** (N/P, N/K, K/Mg, dst.), lebih tahan terhadap variasi umur daun; menghasilkan indeks dan **urutan prioritas** hara pembatas
- **Pendekatan multihara** — penerapannya di Indonesia pada duku menghasilkan dosis dengan biaya produksi terendah dibanding pendekatan hara tunggal (Hernita dkk., 2012)
- **Rasio kation tanah** — Ca:Mg:K yang seimbang lebih penting daripada nilai absolut masing-masing

---

## 4. Parameter Tanaman & Agronomi

| # | Parameter | Satuan | Kenapa dibutuhkan | Status |
|---|---|---|---|---|
| P1 | Umur tanaman / tahun tanam | tahun | Kurva kebutuhan hara berubah drastis. TBM: N & P relatif tinggi. TM: K dominan | ☐ |
| P2 | Fase (TBM / TM awal / TM puncak / TM tua) | kelas | Menentukan rasio N:P:K | ☐ |
| P3 | Varietas / kultivar | — | Kelapa Dalam vs Hibrida vs Genjah berbeda; durian Musang King vs Montong berbeda respons dan sensitivitas Cl | ☐ |
| P4 | Populasi per ha & jarak tanam | pohon/ha | **Konversi g/pohon ↔ kg/ha** | ☐ |
| P5 | **Hasil aktual** | ton/ha/th; butir/pohon/th | Basis perhitungan hara terangkut | ☐ |
| P6 | **Target hasil** | ton/ha/th | Basis perhitungan kebutuhan | ☐ |
| P7 | Jumlah pelepah / daun aktif | buah | Indikator vigor tajuk | ☐ |
| P8 | Lingkar batang / diameter tajuk | cm / m | Indikator pertumbuhan (terutama TBM) | ☐ |
| P9 | Gejala defisiensi visual + foto | deskripsi | **Verifikasi silang hasil lab** | ☐ |
| P10 | Status OPT (busuk akar, *Phytophthora*, kumbang, dsb.) | kelas | Akar rusak = serapan gagal meski dosis benar. Jangan naikkan dosis untuk mengatasi masalah patologi | ☐ |
| P11 | Populasi tanaman hidup vs standar | % | Dosis per ha harus dikoreksi terhadap tegakan aktual | ☐ |

---

## 5. Parameter Iklim, Lingkungan & Manajemen

| # | Parameter | Fungsi | Status |
|---|---|---|---|
| I1 | Curah hujan bulanan (seri ≥10 tahun) | **Jadwal split.** Hindari aplikasi saat hujan sangat tinggi (pencucian) maupun saat kering (pupuk tidak larut) | ☐ |
| I2 | Distribusi bulan basah / lembab / kering | Frekuensi aplikasi | ☐ |
| I3 | Temperatur rerata | Laju mineralisasi bahan organik | ☐ |
| I4 | Lereng (%) | Risiko erosi hara; metode penempatan (piringan, rorak, teras, tanam sejajar kontur) | ☐ |
| I5 | Riwayat pemupukan 3–5 tahun (jenis, dosis, waktu) | Residu P dan K dapat besar; mencegah pemupukan berlebih | ☐ |
| I6 | **Pengembalian residu** — sabut & tempurung kelapa, pelepah, serasah durian | **Sumber K yang sangat besar dan paling sering diabaikan.** Wajib dikuantifikasi, bukan diperkirakan | ☐ |
| I7 | Tanaman penutup tanah legum (LCC) | Fiksasi N — mengurangi dosis N | ☐ |
| I8 | Sumber & mutu air irigasi (bila ada) | Kandungan hara, Cl, dan Na dari air | ☐ |
| I9 | Mutu pupuk aktual (kadar hara, SNI, hasil uji) | **Dosis dihitung dari hara, bukan dari berat produk** | ☐ |
| I10 | Ketersediaan & harga pupuk per lokasi | Optimasi biaya sumber hara | ☐ |

---

## 6. Perbedaan Kritis Kelapa vs Durian: Sumber Kalium

Ini temuan paling operasional dari kombinasi dua komoditas ini, dan berdampak langsung pada pengadaan, penyimpanan, dan logistik aplikasi.

### 6.1 Kelapa membutuhkan klorida

Kelapa dengan kadar Cl rendah — **di bawah 0,25% Cl dalam bahan kering** — menunjukkan laju pertumbuhan menurun, jumlah daun dan buah berkurang, konsentrasi N rendah, gejala cekaman air berat, batang pecah dan berdarah, serta insidensi penyakit daun tinggi terutama hawar daun kelabu (*Pestalotiopsis palmarum*) dan *Bipolaris incurvata* (von Uexküll, 1990).

**Implikasi:** **KCl (MOP) justru lebih disukai untuk kelapa** — memasok K dan Cl sekaligus. Praktik pemberian garam (NaCl) di piringan kelapa juga umum di beberapa negara, karena kelapa bersifat semi-halofit.

### 6.2 Untuk durian, klaimnya lebih lemah daripada yang umum diyakini

Praktik pekebun di Thailand Timur memilih K₂SO₄ dibanding KCl meski KCl separuh lebih murah, dengan keyakinan bahwa sulfat memperbaiki mutu buah termasuk warna daging, dan bahwa akumulasi Cl merugikan pohon durian.

Namun percobaan terkontrol pada kebun durian dewasa di Chantaburi (Typic Paleudults, lempung liat berpasir, pH 5,0) menyimpulkan bahwa **KCl dapat menjadi pengganti efektif untuk K₂SO₄ pada tanah tersebut**, dan bahwa kadar S serta Cl yang lebih tinggi di daun **tidak berlanjut** menjadi kadar S dan Cl yang lebih tinggi di buah. Kadar Cl daun teramati berkisar 0,02% (tanpa aplikasi Cl) hingga 0,12% (Poovarodom dkk., 2006).

### 6.3 Panduan operasional: pemilihan sumber K berdasarkan fase

| Fase durian | Sumber K yang sesuai | Alasan |
|---|---|---|
| Vegetatif / TBM | KCl (MOP, ±60% K₂O) — bila tanah tidak salin dan kultivar tidak sangat sensitif Cl | Ekonomis, larut cepat |
| Menjelang & selama pembuahan | K₂SO₄ (SOP, ±50% K₂O) atau KNO₃ (13-0-46) | Mutu buah menjadi prioritas; KNO₃ memasok K dan N tanpa Cl |
| Pemulihan pasca-panen | KNO₃ | Memasok K dan N sekaligus untuk pemulihan tajuk |

### 6.4 Kesimpulan untuk pengadaan

- **Tetap dua lini produk K** dalam pengadaan dan penyimpanan — tetapi alasannya **bukan** "durian tidak tahan Cl", melainkan manajemen mutu buah pada fase generatif dan pemenuhan kebutuhan Cl kelapa.
- **Cl daun dan Cl tanah wajib masuk paket analisis pada kedua komoditas** — pada kelapa sebagai pemantauan kecukupan, pada durian sebagai pemantauan akumulasi.
- Bila blok kelapa dan durian berdekatan, **pisahkan alur logistik pupuk** untuk menghindari kesalahan aplikasi. Ini argumen tambahan untuk pemisahan spasial dua komoditas.
- Uji sendiri: masukkan perbandingan KCl vs K₂SO₄ vs KNO₃ pada durian sebagai salah satu perlakuan dalam petak percobaan Anda. Bukti dari Chantaburi bersifat spesifik-tanah dan tidak otomatis berlaku di lokasi Anda.

---

## 7. Formula Perhitungan

### 7.1 Pendekatan neraca hara

```
Dosis hara (kg/ha/th) =
    [ H_panen + H_imobilisasi + H_hilang
    − ( S_tanah + S_mineralisasi + S_residu + S_air ) ]
    ÷ E_serapan
```

| Simbol | Uraian | Sumber data |
|---|---|---|
| H_panen | Hara terangkut hasil panen | Kadar hara buah/kopra × hasil (P5/P6) |
| H_imobilisasi | Hara tersimpan dalam pertumbuhan biomassa permanen (batang, akar, tajuk) | Kurva pertumbuhan per umur; besar pada TBM, kecil pada TM stabil |
| H_hilang | Pencucian, volatilisasi, erosi, *run-off* | Fungsi tekstur (T13), curah hujan (I1), lereng (I4) |
| S_tanah | Suplai hara tanah tersedia | Uji tanah (T4–T9) × bobot isi (T22) × kedalaman |
| S_mineralisasi | N dari mineralisasi bahan organik | C-organik (T3), rasio C/N, temperatur (I3) |
| S_residu | Hara dari daur ulang residu | **Kuantifikasi I6** — sering menyumbang K sangat besar |
| S_air | Hara dari air irigasi/hujan | I8 |
| E_serapan | Efisiensi serapan pupuk | **Kalibrasi lokal** |

```
Dosis pupuk (kg produk/ha/th) = Dosis hara (kg/ha/th) ÷ (kadar hara pupuk % ÷ 100)
```

**Efisiensi serapan yang lazim dipakai sebagai titik awal:** N 40–60%, P 15–25%, K 50–70%.
Angka ini **harus dikalibrasi lokal** lewat omission plot, bukan diambil dari literatur. Pada 100.000 ha, selisih 10 poin persen efisiensi N bernilai miliaran rupiah per tahun.

**Faktor konversi yang sering keliru:**

| Konversi | Faktor |
|---|---|
| P → P₂O₅ | × 2,29 |
| P₂O₅ → P | × 0,436 |
| K → K₂O | × 1,205 |
| K₂O → K | × 0,830 |
| Ca → CaO | × 1,399 |
| Mg → MgO | × 1,658 |
| S → SO₄ | × 2,996 |
| ppm (mg/kg) → kg/ha | × (kedalaman cm × bobot isi g/cm³ × 0,1) |

### 7.2 Pendekatan berbasis status hara daun

Petakan kelas status hara daun → dosis, dari kurva respons percobaan sendiri.

**Contoh bentuk keluaran** (dari penelitian duku, Hernita dkk. 2012 — sebagai **pola**, bukan angka untuk kelapa/durian):

| Status hara N daun | Rekomendasi |
|---|---|
| Sangat rendah (< 1,81%) | 858 g N + 1.770 g P₂O₅ + 1.900 g K₂O / tanaman / tahun |
| Rendah (1,81 ≤ N < 2,82%) | 588 g N + 1.335 g P₂O₅ + 1.107 g K₂O / tanaman / tahun |
| Sedang (≥ 2,82%) | — |
| Pendekatan multihara (biaya produksi terendah) | 920 g N + 1.565 g P₂O₅ + 1.488 g K₂O / tanaman / tahun |

Replikasi pola ini untuk kelapa dan durian di lokasi Anda sendiri.

### 7.3 Kerangka 4R

Setiap rekomendasi harus menjawab empat pertanyaan, bukan hanya dosis:

| R | Pertanyaan | Untuk kasus ini |
|---|---|---|
| **Right source** | Jenis pupuk apa? | Di sinilah isu KCl vs K₂SO₄ vs KNO₃ masuk (Bagian 6) |
| **Right rate** | Berapa dosisnya? | Neraca hara (7.1) dikalibrasi analisis daun (7.2) |
| **Right time** | Kapan diaplikasikan? | Split menurut fenologi dan curah hujan (I1). Umumnya 2–4 split/tahun; N lebih banyak split, P lebih sedikit |
| **Right place** | Di mana ditempatkan? | Piringan pada ⅓–½ radius tajuk; rorak pada lereng; benamkan N untuk kurangi volatilisasi |

---

## 8. Desain Sistem untuk Skala Besar

Satu rekomendasi tunggal untuk puluhan ribu hektare tidak bermakna. Yang dibutuhkan adalah sistem.

| Elemen | Uraian | Status |
|---|---|---|
| **Satuan Pengelolaan Pemupukan (SPP)** | Blok homogen berdasarkan jenis tanah, lereng, tahun tanam, varietas. Umumnya 25–50 ha per blok | ☐ |
| **Leaf Sampling Unit (LSU)** | Unit sampling daun **tetap dan terpetakan (GPS)**, disampling ulang setiap tahun pada waktu yang sama, dengan pohon penanda permanen. Metodologi ini baku di industri kelapa sawit dan langsung dapat diadopsi | ☐ |
| **Blok referensi & omission plot** | Petak −N, −P, −K, −Mg, dan kontrol lengkap (NPK penuh). **Satu-satunya cara memvalidasi bahwa dosis Anda benar**, bukan sekadar konsisten | ☐ |
| **Petak kalibrasi sumber K** | Perbandingan KCl / K₂SO₄ / KNO₃ pada durian per fase | ☐ |
| **Peta status hara** | Interpolasi (IDW / kriging) hasil analisis untuk zonasi dosis diferensial | ☐ |
| **Basis data & audit trail** | Wajib untuk Global G.A.P., organik, dan pelaporan CSR/karbon. Simpan: hasil lab, dosis aktual, tanggal aplikasi, operator, cuaca | ☐ |
| **Kalibrasi alat aplikasi** | Dosis di kertas ≠ dosis di lapangan. Uji keluaran alat/tenaga kerja secara berkala | ☐ |
| **Verifikasi mutu pupuk masuk** | Uji kadar hara setiap lot pengiriman | ☐ |

**Catatan efisiensi:** kalibrasi lokal terhadap data produksi aktual — misalnya dengan *boundary line method* — terbukti meningkatkan ketajaman analisis dibanding memakai kriteria generik nasional. Pada skala puluhan ribu hektare, penghematan pupuk dari kalibrasi yang benar besarannya jauh melampaui biaya program analisisnya.

---

## 9. Lembar Kerja

### 9.1 Lembar neraca hara — per SPP per tahun

| Komponen | N | P₂O₅ | K₂O | MgO | S | Sumber data |
|---|---|---|---|---|---|---|
| **A. Hara terangkut panen** | | | | | | Kadar hara × hasil |
| **B. Hara imobilisasi biomassa** | | | | | | Kurva umur |
| **C. Kehilangan (pencucian/volatilisasi/erosi)** | | | | | | Tekstur, CH, lereng |
| **D = A + B + C — Total kebutuhan** | | | | | | |
| **E. Suplai tanah** | | | | | | Uji tanah × BD × kedalaman |
| **F. Mineralisasi bahan organik** | | | | | | C-organik, C/N |
| **G. Daur ulang residu** | | | | | | Sabut/pelepah/serasah |
| **H. Hara dari air** | | | | | | Analisis air |
| **I = E + F + G + H — Total suplai** | | | | | | |
| **J = D − I — Kekurangan** | | | | | | |
| **K. Efisiensi serapan (%)** | | | | | | Kalibrasi lokal |
| **L = J ÷ K — Dosis hara** | | | | | | |
| **M. Kadar hara pupuk (%)** | | | | | | Sertifikat mutu |
| **N = L ÷ M — Dosis pupuk (kg/ha/th)** | | | | | | |
| **O = N ÷ populasi — Dosis per pohon (kg)** | | | | | | |

### 9.2 Lembar rencana split aplikasi

| Split | Bulan | % dosis N | % dosis P | % dosis K | % dosis Mg | Jenis pupuk | Metode penempatan | Catatan cuaca |
|---|---|---|---|---|---|---|---|---|
| 1 | | | | | | | | |
| 2 | | | | | | | | |
| 3 | | | | | | | | |
| 4 | | | | | | | | |

### 9.3 Lembar rekam LSU

| Kode LSU | SPP | Koordinat | Tahun tanam | Varietas | Tanggal sampling | Fase saat sampling | Kode sampel lab | N | P | K | Ca | Mg | S | Cl | B | Cu | Zn | Mn | Fe |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| | | | | | | | | | | | | | | | | | | | |

### 9.4 Desain omission plot minimum per zona agroklimat

| Perlakuan | Deskripsi | Ulangan | Luas/petak |
|---|---|---|---|
| T1 | Kontrol lengkap (NPK+Mg penuh sesuai rekomendasi) | 3 | ≥ 20 pohon |
| T2 | −N (P, K, Mg penuh) | 3 | ≥ 20 pohon |
| T3 | −P (N, K, Mg penuh) | 3 | ≥ 20 pohon |
| T4 | −K (N, P, Mg penuh) | 3 | ≥ 20 pohon |
| T5 | −Mg (N, P, K penuh) | 3 | ≥ 20 pohon |
| T6 | Tanpa pupuk (mutlak) | 3 | ≥ 20 pohon |
| T7 | Sumber K alternatif (durian: KCl vs K₂SO₄ vs KNO₃) | 3 | ≥ 20 pohon |

Durasi minimum **3–4 tahun** sebelum hasilnya dapat dipakai; tanaman tahunan punya efek residual dan lag antar-tahun.

---

## 10. Referensi

### Metode analisis & kriteria penilaian (Indonesia)
- Eviati & Sulaeman. (2009). *Petunjuk Teknis Analisis Kimia Tanah, Tanaman, Air, dan Pupuk* (Edisi 2). Bogor: Balai Penelitian Tanah, Badan Litbang Pertanian. — **rujukan metode laboratorium utama**
- Balai Penelitian Tanah. (2009). *Kriteria Penilaian Sifat Kimia Tanah*. Bogor. — **tabel kelas sangat rendah–sangat tinggi**
- Balai Penelitian Tanah. *Perangkat Uji Tanah Sawah (PUTS), Perangkat Uji Tanah Kering (PUTK), Perangkat Uji Pupuk (PUP)* — uji cepat lapangan
- SNI ISO/IEC 17025 — akreditasi laboratorium pengujian

### Prinsip & sistem rekomendasi
- IPNI / African Plant Nutrition Institute. *4R Nutrient Stewardship Framework*
- Beaufils, E.R. (1973). *Diagnosis and Recommendation Integrated System (DRIS)*. Soil Science Bulletin No. 1. Pietermaritzburg: University of Natal
- Dobermann, A. & Fairhurst, T. (2000). *Rice: Nutrient Disorders & Nutrient Management*. Manila/Singapore: IRRI, PPI & PPIC. — kerangka SSNM dan metodologi omission plot; transferabel ke komoditas lain
- Walworth, J.L. & Sumner, M.E. (1987). The Diagnosis and Recommendation Integrated System (DRIS). *Advances in Soil Science*, 6, 149–188

### Kelapa
- **Balai Penelitian Tanaman Palma (Balitpalma), Manado** — pusat rujukan nasional untuk kelapa; petunjuk teknis budidaya dan pemupukan kelapa
- Von Uexküll, H.R. (1990). Chloride in the nutrition of coconut and oil palm. — **dasar kadar kritis Cl 0,25% bahan kering**
- Von Uexküll, H.R. & Fairhurst, T.H. *Fertilizing for High Yield and Quality: The Oil Palm*. IPI Bulletin. Bern: International Potash Institute. — metodologi analisis daun dan neraca hara palma
- Magat, S.S. — rangkaian publikasi Philippine Coconut Authority mengenai analisis daun (pelepah ke-14) dan rekomendasi pemupukan kelapa spesifik lokasi
- Ollagnier, M. & Ochs, R. — metode *leaf diagnosis* IRHO untuk tanaman palma
- Nelliat, E.V. (1973). Nitrogen phosphorus potassium nutrition of coconut palm: a review. *Journal of Plantation Crops*, 1(Suppl.), 70–80

### Durian
- Poovarodom, S. dkk. *Development of Leaf Nutrient Concentration Standards for Durian* — **standar kadar hara daun durian**
- Poovarodom, S. dkk. (2006). *Effects of Chloride and Sulfate in Various N and K Fertilizers on Soil Chemical Properties and Nutrient Concentrations in Durian Leaf and Fruit* — percobaan Chantaburi, Thailand; dasar diskusi KCl vs K₂SO₄
- Salakpetch, S. (2005). *Durian (Durio zibethinus L.) Flowering, Fruit Set and Pruning*. Hawaii Tropical Fruit Growers, 17. — pemupukan pada fase generatif; aplikasi KNO₃ pada awal pembungaan
- **Balai Penelitian Tanaman Buah Tropika (Balitbu Tropika), Solok** — rujukan nasional buah tropika
- Rohman, H.F., Haryono, D., & Ashari, S. (2013). Pemupukan NPK pada tanaman durian lokal umur 3 tahun. *Jurnal Produksi Tanaman*, 1(5), 422–426
- Sari, D.P., Ashari, S., & Haryono, D. (2012). Respon awal pertumbuhan vegetatif tanaman durian (*Durio zibethinus* Murr.) terhadap pemberian pupuk anorganik. *Jurnal Ilmu Pertanian*, 1(2), 1–11
- Wiryanta, B. (2008). *Sukses Bertanam Durian*. Jakarta: Agromedia Pustaka

### Contoh penerapan berbasis analisis daun di Indonesia
- Hernita, D. dkk. (2012). Penetapan rekomendasi pemupukan N, P, dan K tanaman duku berdasarkan analisis daun. *Jurnal Hortikultura*, 22(4), 376–384. DOI: 10.21082/jhort.v22n4.2012.p376-384
- Thamrin, M. dkk. (2013). Hubungan konsentrasi hara nitrogen, fosfor, dan kalium daun dengan produksi buah jeruk pamelo. *J. Hort.*, 23(3), 225–234

### Kesuburan tanah umum
- Hardjowigeno, S. (2003). *Klasifikasi Tanah dan Pedogenesis*. Jakarta: Akademika Pressindo
- Rosmarkam, A. & Yuwono, N.W. (2002). *Ilmu Kesuburan Tanah*. Yogyakarta: Kanisius
- Hanafiah, K.A. (2005). *Dasar-Dasar Ilmu Tanah*. Jakarta: Raja Grafindo Persada
- Soepardi, G. (1983). *Sifat dan Ciri Tanah*. Bogor: Jurusan Tanah, Fakultas Pertanian IPB

### Regulasi & kelembagaan
- Permentan tentang pendaftaran pupuk dan pengawasan mutu pupuk
- SNI pupuk: urea, SP-36, KCl, ZA, NPK, dolomit
- **Balai Pengkajian Teknologi Pertanian (BPTP)** provinsi setempat — rekomendasi pemupukan spesifik lokasi
- Peta status hara P dan K nasional — Balai Besar Litbang Sumberdaya Lahan Pertanian (BBSDLP)

---

## 11. Urutan Pelaksanaan

| Tahap | Kegiatan | Waktu |
|---|---|---|
| 1 | Delineasi SPP; overlay peta tanah, lereng, tahun tanam, varietas | Sebelum tanam / awal |
| 2 | Survei tanah dasar (baseline) seluruh SPP — parameter Bagian 2.1 + 2.2 | Sebelum tanam |
| 3 | Rekomendasi awal berbasis uji tanah + neraca hara literatur | Tahun 0–1 |
| 4 | Pemasangan LSU + omission plot per zona agroklimat | Tahun 1 |
| 5 | Analisis daun tahunan; bangun basis data | Tahun 2 dan seterusnya |
| 6 | Analisis respons omission plot; tetapkan kadar kritis lokal | Tahun 4–5 |
| 7 | Rekomendasi terkalibrasi lokal; zonasi dosis diferensial | Tahun 5 |
| 8 | Kalibrasi ulang | Setiap 3–4 tahun |

**Dua hal yang tidak dapat dipercepat:** kadar kritis hara daun lokal dan efisiensi serapan lokal keduanya membutuhkan 3–5 tahun data respons. Selama periode itu, rekomendasi Anda bersifat sementara dan harus dinyatakan demikian dalam dokumen internal — bukan disajikan sebagai angka final kepada manajemen atau auditor.
