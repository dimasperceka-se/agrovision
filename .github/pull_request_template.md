## Apa yang diubah
<!-- Ringkas, 1-3 kalimat. Tautkan tiket ClickUp bila ada. -->

Tiket: <!-- URL ClickUp -->

## Kenapa

## Cara menguji
<!-- Langkah konkret supaya reviewer bisa memverifikasi sendiri -->
1.
2.

## Checklist wajib
- [ ] `npm run lint` — 0 error
- [ ] `npm run build` — sukses
- [ ] Sudah dicoba di layar mobile (375px) bila menyentuh UI
- [ ] Tidak mengubah logika RLS/role/approval tanpa dibahas lebih dulu
- [ ] Tidak ada kredensial/rahasia yang ikut ter-commit
- [ ] Migrasi DB (bila ada) idempoten & sudah diuji `npm run db:migrate`

## Dampak
- [ ] Perlu migrasi DB
- [ ] Perlu perubahan env/secret
- [ ] Mengubah perilaku yang terlihat pengguna
