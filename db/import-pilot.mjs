#!/usr/bin/env node
// Import data pilot Bengkulu ke database — blok drone + 567 titik pohon +
// record operasional agregat + survei adopsi GAP kakao (1.985 observasi).
//
// Sumber (semua ter-commit di repo):
//   docs/polygon-block-real.geojson       batas blok pilot (MultiPolygon)
//   docs/pilot-data-filled.geojson        567 titik, 73 properti
//   db/data/adoption-observations.json    hasil scripts/xlsx-adoption-to-json.py
//
// Jalankan (butuh koneksi superuser — RLS/append-only di-bypass role pemilik,
// pola yang sama dengan seed-demo.mjs):
//   node --env-file=.env.local db/import-pilot.mjs
//   node --env-file=.env.local db/import-pilot.mjs --purge   # hapus semuanya
//
// Idempoten: id deterministik (UUID turunan sha1) + ON CONFLICT DO NOTHING.
// Prasyarat: migrasi sudah jalan dan minimal satu user @agrovision.local ada
// (npm run db:seed:dev) — user itu yang diberi akses ke entitas pilot.
//
// Catatan kejujuran data: nilai parameter per titik berasal dari pengisian
// sintetis (scripts/gen-pilot-data.py) di atas grid drone yang nyata, maka
// company ditandai is_demo = true. Kalau klien menganggapnya data resmi:
//   UPDATE app.companies SET is_demo = false WHERE code = 'PILOT';

import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const url = process.env.MIGRATION_DATABASE_URL
if (!url) { console.error('MIGRATION_DATABASE_URL wajib (koneksi superuser).'); process.exit(1) }
const PURGE = process.argv.includes('--purge')

const CO = '00000000-0000-4000-8000-0000000000f1'
const ESTATE = '00000000-0000-4000-8000-0000000000f2'
const BLOCK = '00000000-0000-4000-8000-0000000000f3'
const PLOT = '00000000-0000-4000-8000-0000000000f4'

// UUID deterministik (v5-style dari sha1) agar re-run tidak menduplikasi.
const uuidFrom = (name) => {
  const h = createHash('sha1').update(`agrovision-pilot:${name}`).digest('hex')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`
}

// Kolom geometry menerima EWKT lewat placeholder biasa (geometry_in).
const ewktPoint = ([lon, lat]) => `SRID=4326;POINT(${lon} ${lat})`

const median = (xs) => {
  const s = xs.filter((v) => v !== null && v !== undefined).sort((a, b) => a - b)
  if (!s.length) return null
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
const mode = (xs) => {
  const cnt = new Map()
  for (const x of xs) if (x != null) cnt.set(x, (cnt.get(x) ?? 0) + 1)
  return [...cnt.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
}
const sum = (xs) => xs.reduce((a, b) => a + (b ?? 0), 0)
const round = (v, d = 3) => v == null ? null : Number(v.toFixed(d))

// INSERT multi-baris ber-batch dengan placeholder biasa.
async function batchInsert(c, table, cols, rows, conflict = 'ON CONFLICT DO NOTHING', chunk = 200) {
  let n = 0
  for (let i = 0; i < rows.length; i += chunk) {
    const part = rows.slice(i, i + chunk)
    const values = part.map((_, r) =>
      `(${cols.map((_, k) => `$${r * cols.length + k + 1}`).join(',')})`).join(',')
    const res = await c.query(
      `INSERT INTO ${table} (${cols.join(',')}) VALUES ${values} ${conflict}`,
      part.flat())
    n += res.rowCount
  }
  return n
}

// Klasifikasi kesesuaian lahan — port ringkas docs/07, identik dengan
// seed-demo.mjs supaya suit_class konsisten dengan halaman Kesesuaian Lahan.
const RANK = { S1: 0, S2: 1, S3: 2, N: 3 }
const CLS_ORDER = ['S1', 'S2', 'S3', 'N']
const matchClass = (bands, v) => {
  if (v === null || v === undefined || v === '') return null
  for (const cls of CLS_ORDER) for (const b of bands) {
    if (b.cls !== cls) continue
    if (b.set) { if (typeof v === 'string' && b.set.includes(v)) return cls }
    else {
      const n = Number(v)
      if (Number.isNaN(n)) continue
      if ((b.min === null || n >= b.min) && (b.max === null || n <= b.max)) return cls
    }
  }
  return 'N'
}
const classifyJs = (criteria, params) => {
  const per = criteria.map((k) => ({ sym: k.symbol, cls: matchClass(k.bands, params[k.charCode] ?? null) }))
  const ass = per.filter((p) => p.cls)
  if (!ass.length) return { overall: null, subclass: null, limiting: [] }
  const worst = ass.reduce((w, p) => RANK[p.cls] > RANK[w] ? p.cls : w, 'S1')
  const limiting = [...new Set(ass.filter((p) => p.cls === worst).map((p) => p.sym))].sort()
  return { overall: worst, subclass: worst === 'S1' ? 'S1' : `${worst}${limiting.join(',')}`, limiting }
}

const c = new pg.Client({ connectionString: url })
await c.connect()

async function purge() {
  await c.query('BEGIN')
  // Trigger write_audit pada blocks/carbon_runs menulis baris audit SAAT
  // delete; set konteks supaya baris itu ber-company_id dan ikut terhapus
  // oleh DELETE audit_log di bawah (yang sengaja ditaruh SETELAH blocks).
  await c.query(`SELECT set_config('app.current_company_id',$1,true)`, [CO])
  for (const q of [
    `DELETE FROM app.submission_values WHERE submission_id IN (
       SELECT s.id FROM app.survey_submissions s
       JOIN app.form_versions fv ON fv.id = s.form_version_id
       JOIN app.forms f ON f.id = fv.form_id WHERE f.company_id = $1)`,
    `DELETE FROM app.survey_submissions WHERE form_version_id IN (
       SELECT fv.id FROM app.form_versions fv JOIN app.forms f ON f.id = fv.form_id WHERE f.company_id = $1)`,
    `DELETE FROM app.form_fields WHERE form_version_id IN (
       SELECT fv.id FROM app.form_versions fv JOIN app.forms f ON f.id = fv.form_id WHERE f.company_id = $1)`,
    `DELETE FROM app.form_versions WHERE form_id IN (SELECT id FROM app.forms WHERE company_id = $1)`,
    `DELETE FROM app.forms WHERE company_id = $1`,
    `DELETE FROM app.carbon_run_blocks WHERE run_id IN (SELECT id FROM app.carbon_runs WHERE company_id = $1)`,
    `DELETE FROM app.carbon_runs WHERE company_id = $1`,
    `DELETE FROM app.dbh_measurements WHERE block_id IN (SELECT id FROM app.blocks WHERE company_id = $1)`,
    `DELETE FROM app.tree_survey_points WHERE block_id IN (SELECT id FROM app.blocks WHERE company_id = $1)`,
    `DELETE FROM app.land_suitability_assessments WHERE block_id IN (SELECT id FROM app.blocks WHERE company_id = $1)`,
    `DELETE FROM app.harvest_records WHERE block_id IN (SELECT id FROM app.blocks WHERE company_id = $1)`,
    `DELETE FROM app.spraying_records WHERE block_id IN (SELECT id FROM app.blocks WHERE company_id = $1)`,
    `DELETE FROM app.pruning_records WHERE block_id IN (SELECT id FROM app.blocks WHERE company_id = $1)`,
    `DELETE FROM app.seed_distributions WHERE seed_batch_id IN (SELECT id FROM app.seed_batches WHERE company_id = $1)`,
    `DELETE FROM app.nursery_inspections WHERE seed_batch_id IN (SELECT id FROM app.seed_batches WHERE company_id = $1)`,
    `DELETE FROM app.seed_batches WHERE company_id = $1`,
    `DELETE FROM app.plot_crop_layers WHERE plot_id IN (
       SELECT p.id FROM app.plots p JOIN app.blocks b ON b.id = p.block_id WHERE b.company_id = $1)`,
    `DELETE FROM app.plots WHERE block_id IN (SELECT id FROM app.blocks WHERE company_id = $1)`,
    `DELETE FROM app.block_boundary_versions WHERE block_id IN (SELECT id FROM app.blocks WHERE company_id = $1)`,
    `DELETE FROM app.blocks WHERE company_id = $1`,
    `DELETE FROM app.price_list WHERE company_id = $1`,
    `DELETE FROM app.user_company_access WHERE company_id = $1`,
    `DELETE FROM app.user_estate_access WHERE estate_id IN (SELECT id FROM app.estates WHERE company_id = $1)`,
    `DELETE FROM app.estates WHERE company_id = $1`,
    `DELETE FROM app.audit_log WHERE company_id = $1`,
    `DELETE FROM app.companies WHERE id = $1`,
  ]) await c.query(q, [CO])
  await c.query('COMMIT')
  console.log('Data pilot dihapus.')
}

async function main() {
  const blockGeo = JSON.parse(readFileSync(join(ROOT, 'docs', 'polygon-block-real.geojson'), 'utf8'))
  const points = JSON.parse(readFileSync(join(ROOT, 'docs', 'pilot-data-filled.geojson'), 'utf8')).features
  const adopt = JSON.parse(readFileSync(join(ROOT, 'db', 'data', 'adoption-observations.json'), 'utf8'))
  const blockGeomJson = JSON.stringify(blockGeo.features[0].geometry)
  const P = points.map((f) => f.properties)

  await c.query('BEGIN')
  // Konteks untuk trigger write_audit — tanpa ini baris audit import
  // ber-company_id NULL dan tidak bisa dibersihkan oleh --purge.
  await c.query(`SELECT set_config('app.current_company_id',$1,true)`, [CO])

  // ── Company + akses user ────────────────────────────────────────────────
  await c.query(
    `INSERT INTO app.companies (id, code, name, is_demo) VALUES ($1,'PILOT','Pilot Agroforestri Bengkulu', true)
     ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`, [CO])

  const users = (await c.query(
    `SELECT id, app_role FROM app.users WHERE email LIKE '%@agrovision.local' ORDER BY email`)).rows
  if (!users.length) {
    throw new Error('Tidak ada user @agrovision.local — jalankan `npm run db:seed:dev` dulu.')
  }
  for (const u of users) {
    await c.query(
      `INSERT INTO app.user_company_access (user_id, company_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
      [u.id, CO])
  }
  const admin = users.find((u) => u.app_role === 'super_admin')?.id ?? users[0].id

  // ── Estate + blok (geometri PostGIS dari polygon drone) ─────────────────
  await c.query(
    `INSERT INTO app.estates (id, company_id, code, name, geom)
     VALUES ($1,$2,'EST-PILOT','Estate Pilot Bengkulu',
             ST_Multi(ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON($3),4326))))
     ON CONFLICT (id) DO NOTHING`, [ESTATE, CO, blockGeomJson])

  // RLS membatasi role creator hanya pada estate di user_estate_access —
  // tanpa baris ini creator tidak melihat blok pilot sama sekali.
  for (const u of users.filter((x) => x.app_role === 'creator')) {
    await c.query(
      `INSERT INTO app.user_estate_access (user_id, estate_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
      [u.id, ESTATE])
  }

  const plantingYear = 2026 - Math.round(median(P.map((p) => p.tan_umur)))
  await c.query(
    `INSERT INTO app.blocks (id, company_id, estate_id, code, name, planting_year,
                             boundary_source, verification_status, verified_at, verified_by, geom, created_by)
     VALUES ($1,$2,$3,'PILOT-01','Blok Pilot (Ortho Drone)',$4,
             'drone_ortho','verified', now(), $5,
             ST_Multi(ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON($6),4326))), $5)
     ON CONFLICT (id) DO NOTHING`, [BLOCK, CO, ESTATE, plantingYear, admin, blockGeomJson])

  const { rows: [{ area_ha: areaHa }] } = await c.query(
    `SELECT area_ha FROM app.blocks WHERE id = $1`, [BLOCK])

  await c.query(
    `INSERT INTO app.block_boundary_versions (id, block_id, version, geom, area_ha, boundary_source, change_reason, effective_from, created_by)
     VALUES ($1,$2,1, ST_Multi(ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON($3),4326))), $4,
             'drone_ortho','Digitasi awal dari orthophoto drone', now(), $5)
     ON CONFLICT (block_id, version) DO NOTHING`,
    [uuidFrom('bbv:1'), BLOCK, blockGeomJson, areaHa, admin])

  // ── Plot tunggal + layer tanaman agroforestri ───────────────────────────
  await c.query(
    `INSERT INTO app.plots (id, block_id, code, geom, land_use)
     VALUES ($1,$2,'PILOT-01-P1', ST_Multi(ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON($3),4326))),'productive')
     ON CONFLICT (id) DO NOTHING`, [PLOT, BLOCK, blockGeomJson])

  const cropRows = (await c.query(`SELECT id, code FROM app.crops WHERE code IN ('DURIAN','COCONUT')`)).rows
  const CROP = Object.fromEntries(cropRows.map((r) => [r.code, r.id]))
  if (!CROP.DURIAN || !CROP.COCONUT) throw new Error('Referensi crops DURIAN/COCONUT tidak ada (migrasi 0019).')
  const cropOf = (jenis) => jenis === 'durian' ? CROP.DURIAN : CROP.COCONUT
  const cropCodeOf = (jenis) => jenis === 'durian' ? 'DURIAN' : 'COCONUT'

  const byJenis = {
    palm: points.filter((f) => f.properties.jenis === 'palm'),
    durian: points.filter((f) => f.properties.jenis === 'durian'),
  }
  for (const [i, [jenis, pts]] of Object.entries(byJenis).entries()) {
    // Kerapatan dari data sumber (tan_populasi_ha), BUKAN jumlah titik/luas —
    // titik adalah grid sampel 5 m untuk interpolasi, bukan satu-pohon-satu-titik.
    await c.query(
      `INSERT INTO app.plot_crop_layers (plot_id, crop_id, layer_order, trees_per_ha)
       VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
      [PLOT, cropOf(jenis), i + 1, round(median(pts.map((f) => f.properties.tan_populasi_ha)), 1)])
  }

  // ── 567 titik pohon + pengukuran DBH (approved → dihitung karbon) ──────
  const surveyedAt = '2026-07-30T08:00:00Z'
  const tspRows = points.map((f) => {
    const p = f.properties
    return [
      uuidFrom(`tsp:${p.id}`), uuidFrom(`tsp-client:${p.id}`), `PT-${p.id}`, BLOCK, PLOT,
      cropOf(p.jenis), p.id, ewktPoint(f.geometry.coordinates), 1,
      p.tan_populasi_hidup_pct >= 90 ? 'good' : 'fair',
      p.tan_umur >= 5 ? 'productive' : 'vegetative',
      surveyedAt, admin, 'approved',
    ]
  })
  const nTsp = await batchInsert(c, 'app.tree_survey_points',
    ['id', 'client_uuid', 'code', 'block_id', 'plot_id', 'crop_id', 'point_number',
     'geom', 'tree_count', 'condition', 'growth_phase', 'surveyed_at', 'surveyor_id', 'approval_status'],
    tspRows)

  const dbhRows = points.map((f) => {
    const p = f.properties
    return [
      uuidFrom(`dbh-client:${p.id}`), BLOCK, PLOT, cropOf(p.jenis), uuidFrom(`tsp:${p.id}`),
      surveyedAt, round(p.carbon_dbh_cm, 2), ewktPoint(f.geometry.coordinates), admin, 'approved',
    ]
  })
  const nDbh = await batchInsert(c, 'app.dbh_measurements',
    ['client_uuid', 'block_id', 'plot_id', 'crop_id', 'survey_point_id',
     'measured_at', 'dbh_cm', 'geom', 'measured_by', 'approval_status'],
    dbhRows)

  // ── Kesesuaian lahan: median parameter ls_* per blok, klasifikasi BBSDLP ─
  const LS_KEYS = ['temperatur', 'curah_hujan', 'bahan_kasar', 'kedalaman_tanah', 'ktk', 'ph',
                   'c_organik', 'kejenuhan_basa', 'salinitas', 'lereng', 'batuan_permukaan', 'singkapan_batuan']
  const params = {}
  for (const k of LS_KEYS) params[k] = round(median(P.map((p) => p[`ls_${k}`])), 2)
  params.drainase = mode(P.map((p) => p.ls_drainase))

  // Data lapangan menyimpan NAMA tekstur (USDA); band kriteria BBSDLP memakai
  // KELAS tekstur. Petakan, lalu turunkan ke kelas terdekat yang memang ada
  // di band crop terkait (band DURIAN di 0028 hanya halus/sedang/kasar).
  const TEXTURE_CLASS = { liat: 'halus', 'lempung berliat': 'agak halus', lempung: 'sedang',
                          'lempung berpasir': 'agak kasar', pasir: 'kasar' }
  const TEXTURE_COARSE = { 'sangat halus': 'halus', 'agak halus': 'halus', 'agak kasar': 'sedang' }
  const teksturLapangan = mode(P.map((p) => p.ls_tekstur))
  params.tekstur = TEXTURE_CLASS[teksturLapangan] ?? teksturLapangan
  params.tekstur_lapangan = teksturLapangan

  const durianCrit = (await c.query(
    `SELECT lsc.char_code AS "charCode", lsc.symbol, lsc.bands
       FROM app.land_suit_criteria lsc JOIN app.crops cr ON cr.id = lsc.crop_id
       WHERE cr.code = 'DURIAN' ORDER BY lsc.sort_order`)).rows
  const teksturVocab = new Set(
    durianCrit.filter((k) => k.charCode === 'tekstur')
      .flatMap((k) => k.bands.flatMap((b) => b.set ?? [])))
  if (!teksturVocab.has(params.tekstur) && TEXTURE_COARSE[params.tekstur]) {
    params.tekstur = TEXTURE_COARSE[params.tekstur]
  }
  const cl = classifyJs(durianCrit, params)
  await c.query(
    `INSERT INTO app.land_suitability_assessments
       (id, client_uuid, block_id, assessed_at, crop_id, suit_class, subclass, limiting, params,
        note, approval_status, created_by, assessor_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'approved',$11,$11)
     ON CONFLICT DO NOTHING`,
    [uuidFrom('lsa:1'), uuidFrom('lsa-client:1'), BLOCK, surveyedAt, CROP.DURIAN,
     cl.overall, cl.subclass, cl.limiting, JSON.stringify(params),
     'Median 567 titik grid pilot (interpolasi survei drone + lab)', admin])

  // ── Record operasional agregat blok (approved → masuk dashboard/laporan) ─
  await c.query(
    `INSERT INTO app.pruning_records (id, client_uuid, block_id, pruned_on, tree_count, officer_id, approval_status, note, created_by)
     VALUES ($1,$2,$3,'2026-06-15',$4,$5,'approved','Agregat pruning seluruh titik blok pilot',$5)
     ON CONFLICT DO NOTHING`,
    [uuidFrom('prune:1'), uuidFrom('prune-client:1'), BLOCK, Math.round(sum(P.map((p) => p.pruning_pohon))), admin])

  await c.query(
    `INSERT INTO app.spraying_records (id, block_id, sprayed_on, target, dose_per_ha, total_volume, unit, approval_status, note, created_by)
     VALUES ($1,$2,'2026-06-10','Perawatan rutin blok pilot',$3,$4,'liter','approved','Agregat penyemprotan blok pilot',$5)
     ON CONFLICT DO NOTHING`,
    [uuidFrom('spray:1'), BLOCK, round(median(P.map((p) => p.spray_dosis_ha)), 2),
     round(sum(P.map((p) => p.spray_volume_l)), 2), admin])

  let nHarvest = 0
  for (const jenis of ['palm', 'durian']) {
    for (const grade of ['A', 'B', 'C']) {
      const pts = P.filter((p) => p.jenis === jenis && p.harvest_grade === grade)
      if (!pts.length) continue
      const qty = round(sum(pts.map((p) => p.harvest_ton)), 3)
      if (!qty) continue
      const r = await c.query(
        `INSERT INTO app.harvest_records (id, block_id, harvested_on, crop_code, quantity_ton, grade, approval_status, note, created_by)
         VALUES ($1,$2,'2026-06-20',$3,$4,$5,'approved',$6,$7)
         ON CONFLICT DO NOTHING`,
        [uuidFrom(`harvest:${jenis}:${grade}`), BLOCK, cropCodeOf(jenis), qty, grade,
         `Agregat panen ${pts.length} titik grade ${grade}`, admin])
      nHarvest += r.rowCount
    }
  }

  // ── Rantai bibit: batch → inspeksi → distribusi ke blok ─────────────────
  for (const jenis of ['palm', 'durian']) {
    const pts = P.filter((p) => p.jenis === jenis)
    const code = jenis === 'palm' ? 'SB-PILOT-COCO' : 'SB-PILOT-DUR'
    const batchId = uuidFrom(`seedbatch:${jenis}`)
    await c.query(
      `INSERT INTO app.seed_batches (id, company_id, code, crop_id, received_on, qty_initial)
       VALUES ($1,$2,$3,$4,'2026-01-15',$5) ON CONFLICT DO NOTHING`,
      [batchId, CO, code, cropOf(jenis), Math.round(sum(pts.map((p) => p.seed_awal)))])
    await c.query(
      `INSERT INTO app.nursery_inspections (id, client_uuid, seed_batch_id, inspected_at, qty_alive, qty_dead, qty_damaged, inspector_id, approval_status, created_by)
       VALUES ($1,$2,$3,'2026-03-01T09:00:00Z',$4,$5,$6,$7,'approved',$7)
       ON CONFLICT DO NOTHING`,
      [uuidFrom(`nursery:${jenis}`), uuidFrom(`nursery-client:${jenis}`), batchId,
       Math.round(sum(pts.map((p) => p.seed_hidup))), Math.round(sum(pts.map((p) => p.seed_mati))),
       Math.round(sum(pts.map((p) => p.seed_rusak))), admin])
    await c.query(
      `INSERT INTO app.seed_distributions (id, seed_batch_id, block_id, qty, distributed_on)
       VALUES ($1,$2,$3,$4,'2026-04-01') ON CONFLICT DO NOTHING`,
      [uuidFrom(`seeddist:${jenis}`), batchId, BLOCK, Math.round(sum(pts.map((p) => p.seed_hidup)))])
  }

  // ── Price list: dibutuhkan halaman Refleksi/Pendapatan (volume × tarif).
  // Tarif ILUSTRATIF yang sama dengan seed-demo (docs/11 §4) — sesuaikan di
  // UI Accounting → Refleksi bila klien punya tarif resmi.
  const priceRows = [
    ['MAP-HA', 'cost', 'Pemetaan / mapping', 'block_area_ha', 'ha', 35000],
    ['PREP-HA', 'cost', 'Persiapan lahan', 'landprep_area_ha', 'ha', 2500000],
    ['SEED-UNIT', 'cost', 'Pengadaan bibit', 'seedling_qty', 'batang', 5000],
    ['FERT-KG', 'cost', 'Pupuk (agri-input)', 'fertilizer_qty', 'kg', 8000],
    ['LABOR-DAY', 'cost', 'Tenaga kerja harian', null, 'hari', 200000],
    ['WEED-HA', 'cost', 'Penyiangan', null, 'ha', 750000],
    ['SPRAY-L', 'cost', 'Penyemprotan', null, 'liter', 25000],
    ['PRUNE-TREE', 'cost', 'Pruning', null, 'pohon', 15000],
    ['REV-DUR-A', 'revenue', 'Durian grade A', null, 'ton', 10000000],
    ['REV-COCO', 'revenue', 'Kelapa (butir/kopra)', null, 'ton', 3000000],
  ]
  await batchInsert(c, 'app.price_list',
    ['id', 'company_id', 'code', 'kind', 'category', 'driver', 'unit', 'rate_idr', 'note'],
    priceRows.map((p) => [uuidFrom(`price:${p[0]}`), CO, p[0], p[1], p[2], p[3], p[4], p[5], 'Ilustratif — sesuaikan dengan tarif resmi']),
    'ON CONFLICT (company_id, code) DO NOTHING')

  // ── Survei adopsi GAP kakao: form + 1.985 submission historis ──────────
  const FORM = uuidFrom('form:adopt')
  const FV = uuidFrom('formver:adopt:1')
  await c.query(
    `INSERT INTO app.forms (id, company_id, code, name, module)
     VALUES ($1,$2,'ADOPT-OBS','Adoption Observations (GAP Kakao)','survey')
     ON CONFLICT (id) DO NOTHING`, [FORM, CO])
  await c.query(
    `INSERT INTO app.form_versions (id, form_id, version, status, published_at)
     VALUES ($1,$2,1,'published', now()) ON CONFLICT (form_id, version) DO NOTHING`, [FV, FORM])

  const fields = [
    ['survey_number', 'Identitas', 'Nomor Survei', 'text', true, null],
    ['survey_year', 'Identitas', 'Tahun Survei', 'number', true, null],
    ['survey_date', 'Identitas', 'Tanggal Survei', 'date', false, null],
    ['farmer_name', 'Identitas', 'Nama Petani', 'text', true, null],
    ['display_id', 'Identitas', 'ID Tampilan (Farm)', 'text', false, null],
    ['external_id', 'Identitas', 'ID Eksternal (NIK ter-mask)', 'text', false, null],
    ['producer_id', 'Identitas', 'ID Produsen', 'text', false, null],
    ['plot_uid', 'Identitas', 'UID Plot', 'text', false, null],
    ['plot_number', 'Identitas', 'Nomor Plot', 'number', false, null],
    ['plot_area_ha', 'Identitas', 'Luas Plot (ha, dari poligon)', 'number', false, null],
    ['rehab_method', 'Identitas', 'Metode Rehabilitasi', 'single_choice', false,
      { choices: ['Non Rehabilitated', 'Replanting', 'Grafting'] }],
    ['year_planted', 'Identitas', 'Tahun Tanam', 'number', false, null],
    ...adopt.questions.map((q) => [q.code, 'Penilaian GAP', q.label, 'single_choice', false,
      { choices: ['Good', 'Medium', 'Bad'] }]),
    ...adopt.questions.map((q) => [`c${q.code.slice(1)}`, 'Komentar',
      `Catatan ${q.code.toUpperCase()}: ${q.label.slice(0, 70)}`, 'text', false, null]),
  ]
  const fieldRows = fields.map((f, i) => [
    uuidFrom(`field:${f[0]}`), FV, f[1], f[0], f[2], f[3], f[4],
    f[5] ? JSON.stringify(f[5]) : null, i + 1,
  ])
  await batchInsert(c, 'app.form_fields',
    ['id', 'form_version_id', 'section_name', 'code', 'label', 'field_type', 'is_required', 'options', 'sort_order'],
    fieldRows, 'ON CONFLICT (form_version_id, code) DO NOTHING')
  const FIELD = Object.fromEntries(fields.map((f) => [f[0], uuidFrom(`field:${f[0]}`)]))

  const subRows = adopt.rows.map((r) => [
    uuidFrom(`sub:${r.result_id}`), uuidFrom(`sub-client:${r.result_id}`), FV, null,
    admin, `${r.survey_date}T09:00:00Z`, 'approved',
  ])
  const nSub = await batchInsert(c, 'app.survey_submissions',
    ['id', 'client_uuid', 'form_version_id', 'block_id', 'submitted_by', 'submitted_at', 'approval_status'],
    subRows, 'ON CONFLICT (client_uuid) DO NOTHING')

  const valRows = []
  for (const r of adopt.rows) {
    const sid = uuidFrom(`sub:${r.result_id}`)
    const push = (code, text, num, date) => {
      if (text == null && num == null && date == null) return
      valRows.push([sid, FIELD[code], text ?? null, num ?? null, date ?? null])
    }
    push('survey_number', r.survey_number)
    push('survey_year', null, r.survey_year)
    // Tanggal estimasi (survey_number kosong) tidak ditulis sebagai nilai —
    // hanya dipakai untuk submitted_at yang NOT NULL.
    if (!r.date_estimated) push('survey_date', null, null, r.survey_date)
    push('farmer_name', r.name)
    push('display_id', r.display_id)
    push('external_id', r.external_id)
    push('producer_id', r.producer_id)
    push('plot_uid', r.plot_uid)
    push('plot_number', null, r.plot_number)
    push('plot_area_ha', null, r.plot_area_ha)
    push('rehab_method', r.rehab_method)
    push('year_planted', null, r.year_planted)
    for (const [q, v] of Object.entries(r.answers)) push(q, v)
    for (const [q, v] of Object.entries(r.comments)) push(`c${q.slice(1)}`, v)
  }
  const nVal = await batchInsert(c, 'app.submission_values',
    ['submission_id', 'field_id', 'value_text', 'value_num', 'value_date'],
    valRows, 'ON CONFLICT (submission_id, field_id) DO NOTHING', 400)

  await c.query('COMMIT')

  // ── Carbon run (di luar transaksi utama; best effort) ───────────────────
  // generate_carbon_run() bergerbang peran + akses — set konteks sesi dulu,
  // pola yang sama dengan seed-demo.mjs.
  let carbonMsg = 'dilewati'
  try {
    await c.query('BEGIN')
    await c.query(`SELECT set_config('app.current_user_id',$1,true)`, [admin])
    await c.query(`SELECT set_config('app.current_role','super_admin',true)`)
    await c.query(`SELECT set_config('app.current_company_id',$1,true)`, [CO])
    await c.query(`SELECT app.generate_carbon_run($1,'CR-PILOT-2026-S1','2026-01-01','2026-06-30')`, [CO])
    await c.query('COMMIT')
    carbonMsg = 'CR-PILOT-2026-S1 dibuat'
  } catch (e) {
    await c.query('ROLLBACK').catch(() => {})
    carbonMsg = `gagal (tidak fatal): ${e.message}`
  }

  if (nTsp === 0 && points.length > 0) {
    console.warn(
      'PERINGATAN: 0 baris baru padahal sumber berisi data — insert bersifat\n' +
      'insert-only (ON CONFLICT DO NOTHING). Kalau data sumber BERUBAH,\n' +
      'jalankan `npm run db:purge:pilot` dulu lalu import ulang.')
  }
  console.log(`Import pilot selesai.
  Blok      : PILOT-01 (${Number(areaHa).toFixed(2)} ha, PostGIS, verified)
  Titik     : ${nTsp} tree_survey_points baru (dari ${points.length})
  DBH       : ${nDbh} pengukuran baru
  Kesesuaian: ${cl.overall ?? '-'} ${cl.subclass ?? ''} (pembatas: ${cl.limiting.join(', ') || '-'})
  Panen     : ${nHarvest} record agregat baru
  Survei    : ${nSub} submission baru (dari ${adopt.rows.length}), ${nVal} nilai
  Karbon    : ${carbonMsg}

Login dengan admin@agrovision.local lalu pilih entitas "Pilot Agroforestri Bengkulu".`)
}

try {
  if (PURGE) await purge()
  else await main()
} catch (e) {
  await c.query('ROLLBACK').catch(() => {})
  console.error(e)
  process.exitCode = 1
} finally {
  await c.end()
}
