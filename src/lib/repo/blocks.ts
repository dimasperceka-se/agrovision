import { rlsQuery, withRls, type RlsContext } from "@/lib/db";

/**
 * Akses data blok. Blok adalah data fondasi -- setiap modul lain merujuk
 * block_id dari sini (concept:134).
 *
 * Semua daftar dipaginasi di SERVER. Target ~3.300 blok (concept:13,49):
 * memuat seluruh tabel lalu memfilter di frontend tidak akan bertahan.
 */

export type BlockRow = {
  id: string;
  code: string;
  name: string | null;
  estateName: string;
  areaHa: number | null;
  plantingYear: number | null;
  verificationStatus: string;
  hasGeometry: boolean;
};

export type Page<T> = { rows: T[]; total: number; page: number; pageSize: number };

export async function listBlocks(
  ctx: RlsContext,
  opts: { page?: number; pageSize?: number; search?: string; estateId?: string } = {},
): Promise<Page<BlockRow>> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(5, opts.pageSize ?? 25));
  const offset = (page - 1) * pageSize;
  const search = opts.search?.trim() || null;

  return withRls(ctx, async (client) => {
    const where = `
      WHERE b.archived_at IS NULL
        AND ($1::text IS NULL OR b.code ILIKE '%' || $1 || '%' OR b.name ILIKE '%' || $1 || '%')
        AND ($2::uuid IS NULL OR b.estate_id = $2)`;

    // COUNT terpisah: total dibutuhkan untuk kontrol paginasi, dan
    // window function COUNT(*) OVER () akan memaksa memindai seluruh set.
    const totalRes = await client.query<{ n: string }>(
      `SELECT count(*) AS n FROM app.blocks b ${where}`,
      [search, opts.estateId ?? null],
    );

    const rows = await client.query<{
      id: string; code: string; name: string | null; estate_name: string;
      area_ha: string | null; planting_year: number | null;
      verification_status: string; has_geometry: boolean;
    }>(
      `SELECT b.id, b.code, b.name, e.name AS estate_name, b.area_ha, b.planting_year,
              b.verification_status, (b.geom IS NOT NULL) AS has_geometry
         FROM app.blocks b
         JOIN app.estates e ON e.id = b.estate_id
        ${where}
        ORDER BY b.code
        LIMIT $3 OFFSET $4`,
      [search, opts.estateId ?? null, pageSize, offset],
    );

    return {
      rows: rows.rows.map((r) => ({
        id: r.id,
        code: r.code,
        name: r.name,
        estateName: r.estate_name,
        areaHa: r.area_ha === null ? null : Number(r.area_ha),
        plantingYear: r.planting_year,
        verificationStatus: r.verification_status,
        hasGeometry: r.has_geometry,
      })),
      total: Number(totalRes.rows[0].n),
      page,
      pageSize,
    };
  });
}

/** Opsi dropdown blok. Dibatasi supaya tidak memuat 3.300 baris ke <select>. */
export async function searchBlockOptions(
  ctx: RlsContext,
  search?: string,
  limit = 50,
): Promise<{ value: string; label: string }[]> {
  const rows = await rlsQuery<{ id: string; code: string; name: string | null }>(
    ctx,
    `SELECT id, code, name FROM app.blocks
      WHERE archived_at IS NULL
        AND ($1::text IS NULL OR code ILIKE '%' || $1 || '%' OR name ILIKE '%' || $1 || '%')
      ORDER BY code LIMIT $2`,
    [search?.trim() || null, limit],
  );
  return rows.map((r) => ({ value: r.id, label: r.name ? `${r.code} — ${r.name}` : r.code }));
}

export async function listEstateOptions(
  ctx: RlsContext,
): Promise<{ value: string; label: string }[]> {
  const rows = await rlsQuery<{ id: string; name: string }>(
    ctx,
    `SELECT id, name FROM app.estates ORDER BY name`,
  );
  return rows.map((r) => ({ value: r.id, label: r.name }));
}

/**
 * Buat blok. `geojson` opsional: blok boleh terdaftar sebelum batasnya
 * didigitasi (migrasi 0018 membuat geom nullable). 3.300 blok tidak mungkin
 * didaftarkan sekaligus lengkap dengan polygon.
 */
export async function createBlock(
  ctx: RlsContext,
  input: {
    estateId: string;
    code: string;
    name?: string | null;
    plantingYear?: number | null;
    boundarySource: string;
    geojson?: string | null;
  },
): Promise<{ id: string; overlaps: number }> {
  return withRls(ctx, async (client) => {
    const res = await client.query<{ id: string }>(
      `INSERT INTO app.blocks
         (company_id, estate_id, code, name, planting_year, boundary_source, geom, created_by, updated_by)
       VALUES ($1,$2,$3,$4,$5,$6,
               CASE WHEN $7::text IS NULL THEN NULL
                    ELSE ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON($7), 4326)) END,
               $8,$8)
       RETURNING id`,
      [
        ctx.companyId,
        input.estateId,
        input.code,
        input.name ?? null,
        input.plantingYear ?? null,
        input.boundarySource,
        input.geojson ?? null,
        ctx.userId,
      ],
    );
    const id = res.rows[0].id;

    // Overhead dari 0004: overlap DILAPORKAN untuk direview, bukan menolak
    // import. Surveyor tetap bisa menyimpan; manusia yang memutuskan.
    let overlaps = 0;
    if (input.geojson) {
      const ov = await client.query<{ n: number }>(`SELECT app.detect_block_overlaps($1) AS n`, [id]);
      overlaps = ov.rows[0].n;
    }
    return { id, overlaps };
  });
}

/** GeoJSON FeatureCollection untuk peta. Hanya blok yang sudah didigitasi. */
export async function blocksGeoJson(
  ctx: RlsContext,
  opts: { simplifyMeters?: number } = {},
): Promise<unknown> {
  // ST_SimplifyPreserveTopology mengurangi titik pada zoom rendah supaya
  // 3.300 polygon tidak dikirim penuh ke browser.
  const tolerance = (opts.simplifyMeters ?? 0) / 111_320; // meter -> derajat (kasar)

  const rows = await rlsQuery<{ fc: unknown }>(
    ctx,
    `SELECT json_build_object(
              'type', 'FeatureCollection',
              'features', COALESCE(json_agg(f), '[]'::json)
            ) AS fc
       FROM (
         SELECT json_build_object(
                  'type', 'Feature',
                  'id', b.id,
                  'geometry', ST_AsGeoJSON(
                      CASE WHEN $1 > 0 THEN ST_SimplifyPreserveTopology(b.geom, $1) ELSE b.geom END
                    )::json,
                  'properties', json_build_object(
                      -- id juga ditaruh di properties: MapLibre tidak selalu
                      -- meneruskan Feature.id bila nilainya bukan numerik.
                      'id', b.id,
                      'code', b.code, 'name', b.name, 'areaHa', b.area_ha,
                      'estate', e.name, 'status', b.verification_status)
                ) AS f
           FROM app.blocks b
           JOIN app.estates e ON e.id = b.estate_id
          WHERE b.geom IS NOT NULL AND b.archived_at IS NULL
       ) sub`,
    [tolerance],
  );
  return rows[0]?.fc ?? { type: "FeatureCollection", features: [] };
}

/** GeoJSON plot untuk layer di dalam blok. land_use jadi properti untuk warna. */
export async function plotsGeoJson(ctx: RlsContext): Promise<unknown> {
  const rows = await rlsQuery<{ fc: unknown }>(
    ctx,
    `SELECT json_build_object(
              'type','FeatureCollection',
              'features', COALESCE(json_agg(f),'[]'::json)
            ) AS fc
       FROM (
         SELECT json_build_object(
                  'type','Feature',
                  'geometry', ST_AsGeoJSON(pl.geom)::json,
                  'properties', json_build_object(
                    'id', pl.id, 'code', pl.code, 'landUse', pl.land_use,
                    'block', b.code, 'areaHa', pl.area_ha)
                ) AS f
           FROM app.plots pl
           JOIN app.blocks b ON b.id = pl.block_id
          WHERE pl.geom IS NOT NULL AND b.archived_at IS NULL
       ) sub`,
  );
  return rows[0]?.fc ?? { type: "FeatureCollection", features: [] };
}
