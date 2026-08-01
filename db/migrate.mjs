#!/usr/bin/env node
// Migration runner dengan ledger app.schema_migrations.
//
// Tanpa ini, file SQL di db/migrations/ hanyalah kode mati -- tidak pernah
// dieksekusi aplikasi, dan acceptance test 5 (data bertahan setelah restart)
// tidak reproducible.
//
// Pemakaian:
//   node db/migrate.mjs            -- terapkan migrasi yang belum jalan
//   node db/migrate.mjs --status   -- tampilkan status tanpa mengubah apa pun
//   node db/migrate.mjs --verify   -- cek checksum file vs yang sudah diterapkan
//
// Koneksi diambil dari DATABASE_URL. Di Cloud Run gunakan unix socket
// Cloud SQL connector: postgres://user:pass@/db?host=/cloudsql/INSTANCE

import { readdir, readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const DIR = join(dirname(fileURLToPath(import.meta.url)), 'migrations')

const LEDGER = `
CREATE SCHEMA IF NOT EXISTS app;
CREATE TABLE IF NOT EXISTS app.schema_migrations (
  version     text PRIMARY KEY,
  checksum    text NOT NULL,
  applied_at  timestamptz NOT NULL DEFAULT now(),
  duration_ms integer
);`

const sha = (s) => createHash('sha256').update(s).digest('hex').slice(0, 16)

async function loadFiles() {
  const names = (await readdir(DIR)).filter((f) => f.endsWith('.sql')).sort()
  return Promise.all(
    names.map(async (name) => {
      const sql = await readFile(join(DIR, name), 'utf8')
      return { version: name.replace(/\.sql$/, ''), name, sql, checksum: sha(sql) }
    }),
  )
}

async function main() {
  const mode = process.argv[2] ?? '--apply'
  // Migrasi jalan sebagai OWNER (postgres), bukan sebagai app_rw. Dipisah dari
  // DATABASE_URL supaya aplikasi tidak pernah punya hak DDL.
  const url = process.env.MIGRATION_DATABASE_URL
  if (!url) {
    console.error('MIGRATION_DATABASE_URL belum diset (koneksi superuser). Lihat .env.example')
    process.exit(1)
  }

  const client = new pg.Client({ connectionString: url })
  await client.connect()

  try {
    await client.query(LEDGER)
    const files = await loadFiles()
    const { rows } = await client.query('SELECT version, checksum FROM app.schema_migrations')
    const applied = new Map(rows.map((r) => [r.version, r.checksum]))

    if (mode === '--status' || mode === '--verify') {
      let drift = 0
      for (const f of files) {
        const prev = applied.get(f.version)
        const state = !prev ? 'PENDING' : prev === f.checksum ? 'ok' : 'CHECKSUM BERUBAH'
        if (state === 'CHECKSUM BERUBAH') drift++
        console.log(`${state.padEnd(18)} ${f.version}`)
      }
      // Migrasi yang sudah diterapkan tapi filenya hilang -- tanda repo dan DB berbeda.
      for (const v of applied.keys()) {
        if (!files.some((f) => f.version === v)) {
          console.log(`${'FILE HILANG'.padEnd(18)} ${v}`)
          drift++
        }
      }
      if (mode === '--verify' && drift > 0) {
        console.error(`\n${drift} migrasi menyimpang. Migrasi yang sudah diterapkan tidak boleh diedit -- buat file baru.`)
        process.exit(1)
      }
      return
    }

    // Checksum drift harus menghentikan apply, bukan diabaikan diam-diam.
    for (const f of files) {
      const prev = applied.get(f.version)
      if (prev && prev !== f.checksum) {
        console.error(`${f.name} sudah diterapkan tapi isinya berubah (checksum ${prev} -> ${f.checksum}).`)
        console.error('Jangan edit migrasi yang sudah jalan. Buat file migrasi baru.')
        process.exit(1)
      }
    }

    const pending = files.filter((f) => !applied.has(f.version))
    if (pending.length === 0) {
      console.log('Tidak ada migrasi tertunda.')
      return
    }

    for (const f of pending) {
      const t0 = Date.now()
      // Satu transaksi per file: gagal di tengah = rollback utuh, ledger tidak tercatat.
      await client.query('BEGIN')
      try {
        await client.query(f.sql)
        await client.query(
          'INSERT INTO app.schema_migrations (version, checksum, duration_ms) VALUES ($1,$2,$3)',
          [f.version, f.checksum, Date.now() - t0],
        )
        await client.query('COMMIT')
        console.log(`diterapkan  ${f.version}  (${Date.now() - t0}ms)`)
      } catch (err) {
        await client.query('ROLLBACK')
        console.error(`GAGAL       ${f.version}\n${err.message}`)
        process.exit(1)
      }
    }
    console.log(`\n${pending.length} migrasi diterapkan.`)
  } finally {
    await client.end()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
