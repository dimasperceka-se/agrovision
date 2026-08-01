#!/usr/bin/env node
// Membuat role login aplikasi (`app_user`) sebagai anggota app_rw.
//
// Dipisah dari migrasi karena role dan password bersifat per-lingkungan --
// tidak boleh ikut ke dalam file migrasi yang dibagikan.
//
// Dijalankan sekali per lingkungan, sebagai superuser:
//   MIGRATION_DATABASE_URL=... APP_DB_USER=app_user APP_DB_PASSWORD=... node db/bootstrap-role.mjs
//
// Di produksi, password diambil dari Secret Manager, bukan dari .env.

import pg from 'pg'

const url = process.env.MIGRATION_DATABASE_URL
const user = process.env.APP_DB_USER ?? 'app_user'
const pass = process.env.APP_DB_PASSWORD

if (!url) { console.error('MIGRATION_DATABASE_URL wajib (koneksi superuser).'); process.exit(1) }
if (!pass) { console.error('APP_DB_PASSWORD wajib.'); process.exit(1) }

const c = new pg.Client({ connectionString: url })
await c.connect()

try {
  // Identifier dan password tidak bisa jadi parameter bind di DDL. Di-quote
  // sisi server lewat quote_ident/quote_literal, dengan cast ::text eksplisit
  // karena format() bersifat variadic "any" dan tipenya tak bisa disimpulkan.
  const { rows: [q] } = await c.query(
    `SELECT quote_ident($1::text) AS ident, quote_literal($2::text) AS lit`,
    [user, pass],
  )

  const exists = await c.query('SELECT 1 FROM pg_roles WHERE rolname = $1', [user])
  if (exists.rowCount === 0) {
    await c.query(`CREATE ROLE ${q.ident} LOGIN PASSWORD ${q.lit}`)
    console.log(`role ${user} dibuat`)
  } else {
    await c.query(`ALTER ROLE ${q.ident} LOGIN PASSWORD ${q.lit}`)
    console.log(`role ${user} sudah ada, password diperbarui`)
  }

  await c.query(`GRANT app_rw TO ${q.ident}`)

  // Hak atas objek yang dibuat SETELAH grant blanket di 0013 -- termasuk objek
  // dari 0014-0017. Tanpa ini aplikasi kena "permission denied" pada tabel baru.
  await c.query(`GRANT USAGE ON SCHEMA app TO app_rw, app_ro`)
  await c.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA app TO app_rw`)
  await c.query(`GRANT SELECT ON ALL TABLES IN SCHEMA app TO app_ro`)
  await c.query(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA app TO app_rw`)

  // Pencabutan dipasang ULANG setelah GRANT blanket di atas, karena
  // GRANT ... ON ALL TABLES MENGEMBALIKAN hak yang sudah dicabut. Urutan penting.
  //
  // Daftarnya dibaca dari app.privilege_revocations, BUKAN dari array di sini.
  // Versi sebelumnya menuliskan daftar itu di dua tempat, dan yang di skrip ini
  // ketinggalan dua tabel otorisasi -- mengembalikan lubang CRITICAL yang sudah
  // ditutup 0018. Satu sumber kebenaran menghilangkan seluruh kelas bug itu.
  const { rows: revocations } = await c.query(
    `SELECT table_name, privileges FROM app.privilege_revocations ORDER BY table_name`,
  )
  if (revocations.length === 0) {
    console.error('app.privilege_revocations kosong — jalankan db:migrate lebih dulu.')
    process.exit(1)
  }
  for (const r of revocations) {
    const { rows: [q2] } = await c.query(`SELECT quote_ident($1::text) AS ident`, [r.table_name])
    await c.query(`REVOKE ${r.privileges} ON app.${q2.ident} FROM app_rw`)
  }
  console.log(`grant disegarkan; ${revocations.length} pencabutan dipasang ulang dari ledger`)

  // Verifikasi, jangan diasumsikan.
  const { rows: violations } = await c.query(`SELECT * FROM app.check_privilege_revocations()`)
  if (violations.length > 0) {
    console.error('PENCABUTAN GAGAL:', violations.map((v) => `${v.table_name}.${v.privilege}`).join(', '))
    process.exit(1)
  }
  console.log('pencabutan terverifikasi: tidak ada pelanggaran')

  // Default untuk objek yang dibuat migrasi berikutnya.
  await c.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA app GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_rw`)
  await c.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA app GRANT SELECT ON TABLES TO app_ro`)
  await c.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA app GRANT USAGE, SELECT ON SEQUENCES TO app_rw`)
  console.log('default privileges dipasang untuk migrasi berikutnya')
} finally {
  await c.end()
}
