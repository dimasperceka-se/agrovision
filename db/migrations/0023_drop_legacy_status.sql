-- 0023_drop_legacy_status.sql
--
-- Menghapus kolom app.cost_transactions.status (tipe app.cost_status).
--
-- Ditemukan saat menguji alur approval: tabel punya DUA kolom status sekaligus.
--
--   * `status`          app.cost_status   -- dari 0008, nilai draft/pending/approved/rejected
--   * `approval_status` app.record_status -- dari 0016, state machine kanonik
--                                            draft/submitted/under_review/approved/rejected
--
-- Keduanya mengklaim hal yang sama. Yang dipakai aplikasi dan view agregasi
-- hanyalah `approval_status`; `status` tidak pernah dibaca kode mana pun
-- (diverifikasi dengan grep atas src/). Ia tertinggal karena 0016 menambahkan
-- state machine tanpa membuang pendahulunya.
--
-- Dua sumber kebenaran untuk satu fakta adalah cacat yang menunggu terjadi:
-- cukup satu query melihat kolom yang salah, dan laporan keuangan menampilkan
-- angka yang berbeda dari layar approval tanpa ada yang tahu mana yang benar.

ALTER TABLE app.cost_transactions DROP COLUMN status;

-- Enum-nya juga tidak lagi punya pemakai.
DROP TYPE IF EXISTS app.cost_status;

COMMENT ON COLUMN app.cost_transactions.approval_status IS
  'SATU-SATUNYA sumber status. State machine: draft -> submitted -> under_review '
  '-> approved | rejected. View agregasi hanya menghitung baris approved.';

-- Sekarang kolomnya tunggal, constraint kategori bisa divalidasi penuh.
-- (Dipasang NOT VALID di 0022 agar baris fixture lama tidak menghalangi.)
DELETE FROM app.cost_transactions WHERE cost_category_id IS NULL;
ALTER TABLE app.cost_transactions VALIDATE CONSTRAINT ct_category_required;
