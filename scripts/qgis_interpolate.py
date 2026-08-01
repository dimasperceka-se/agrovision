# -*- coding: utf-8 -*-
"""
Interpolasi SEMUA parameter numerik pada pilot-data-filled.geojson sekaligus,
clip ke polygon blok, simpan GeoTIFF, tampilkan mulus di kanvas QGIS.

Jalankan di QGIS 3.28+ (Python Console):
    exec(open('/Users/dimasugaperceka/Documents/non/KLI/agrovision/scripts/qgis_interpolate.py').read())

────────────────────────────────────────────────────────────────────────────
KENAPA hasil dulu KOTAK / BERGARIS, dan kenapa versi ini MULUS
────────────────────────────────────────────────────────────────────────────
  Penyebab garis-garis vertikal BUKAN datanya, tapi ENGINE interpolasinya:
  algoritma "QGIS native" (qgis:idwinterpolation, qgis:tininterpolation) dan
  GRASS v.surf.rst punya bug segmentasi pada grid rapat → garis vertikal.

  Versi ini TIDAK memakai engine itu. Ia memanggil GDAL langsung lewat
  osgeo.gdal.Grid() — mesin yang sama dengan gdal_grid CLI — dengan metode
  MOVING AVERAGE (rata-rata bergerak, radius 20 m). Ini menghasilkan gradien
  mulus tanpa garis & tanpa "bull's-eye" IDW. Sudah diverifikasi visual.

  Interpolasi dikerjakan di CRS METRIK (UTM 48S / EPSG:32748) supaya radius
  20 = 20 meter (bukan 20 derajat) dan tidak ada artefak segmentasi lat-lon.

Hasil: docs/interpolation/<param>.tif (UTM), tampil di grup "Interpolasi",
sudah di-clip mengikuti bentuk blok (polygon-block-real.geojson).
"""

import os
from osgeo import gdal, ogr
from qgis.core import (
    QgsProject, QgsRasterLayer,
    QgsColorRampShader, QgsRasterShader, QgsSingleBandPseudoColorRenderer, QgsStyle,
)

gdal.UseExceptions()

# ── Konfigurasi ─────────────────────────────────────────────────────────────
ROOT   = "/Users/dimasugaperceka/Documents/non/KLI/agrovision/docs"
POINTS = os.path.join(ROOT, "pilot-data-filled.geojson")
MASK   = os.path.join(ROOT, "polygon-block-real.geojson")
OUTDIR = os.path.join(ROOT, "interpolation")

METHOD    = "average"        # "average" (mulus, disarankan) | "invdist" | "linear"
UTM       = "EPSG:32748"     # UTM 48S — cocok utk 102°E, -4°S
PIXEL_M   = 1.0              # resolusi output (meter/piksel)
RADIUS_M  = 20.0             # radius pencarian moving-average (meter)
MIN_POINTS = 1               # min titik dlm radius; <min → nodata (lalu ke-clip)
IDW_POWER = 2.0              # utk METHOD="invdist"
NODATA    = -9999.0
RAMP_NAME = "Spectral"
GROUP_NAME = "Interpolasi"
SKIP_FIELDS = {"id", "left", "top", "right", "bottom", "row_index", "col_index"}

os.makedirs(OUTDIR, exist_ok=True)
def log(m): print("[interp] " + m)


def _algo_string():
    if METHOD == "invdist":
        return ("invdist:power={:g}:smoothing=1.0:radius1={:g}:radius2={:g}:nodata={:g}"
                .format(IDW_POWER, RADIUS_M, RADIUS_M, NODATA))
    if METHOD == "linear":
        return "linear:radius=-1:nodata={:g}".format(NODATA)
    # default: moving average — paling mulus
    return ("average:radius1={:g}:radius2={:g}:min_points={:d}:nodata={:g}"
            .format(RADIUS_M, RADIUS_M, MIN_POINTS, NODATA))


def reproject_vector(src_path, dst_path):
    """Reproject GeoJSON → GPKG UTM lewat GDAL (bukan QGIS)."""
    if os.path.exists(dst_path):
        os.remove(dst_path)
    gdal.VectorTranslate(dst_path, src_path, options=gdal.VectorTranslateOptions(
        format="GPKG", dstSRS=UTM, reproject=True))
    ds = ogr.Open(dst_path)
    lyr = ds.GetLayer(0)
    name = lyr.GetName()
    xmin, xmax, ymin, ymax = lyr.GetExtent()   # ogr: (minX, maxX, minY, maxY)
    ds = None
    return name, (xmin, xmax, ymin, ymax)


def numeric_fields(gpkg_path):
    ds = ogr.Open(gpkg_path)
    defn = ds.GetLayer(0).GetLayerDefn()
    out = []
    for i in range(defn.GetFieldCount()):
        fd = defn.GetFieldDefn(i)
        nm = fd.GetName()
        if nm in SKIP_FIELDS:
            continue
        if fd.GetType() in (ogr.OFTInteger, ogr.OFTInteger64, ogr.OFTReal):
            out.append(nm)
    ds = None
    return out


def grid_field(pts_gpkg, layer_name, field, bounds, out_tif):
    """Moving-average grid via GDAL → GeoTIFF UTM (mulus, tanpa garis)."""
    xmin, xmax, ymin, ymax = bounds
    m = RADIUS_M
    xmin, xmax, ymin, ymax = xmin - m, xmax + m, ymin - m, ymax + m
    w = max(1, int(round((xmax - xmin) / PIXEL_M)))
    h = max(1, int(round((ymax - ymin) / PIXEL_M)))
    gdal.Grid(out_tif, pts_gpkg, options=gdal.GridOptions(
        format="GTiff", outputType=gdal.GDT_Float32,
        algorithm=_algo_string(), zfield=field,
        width=w, height=h,
        outputBounds=[xmin, ymax, xmax, ymin],   # [ulx, uly, lrx, lry]
        outputSRS=UTM, layers=[layer_name],
        noData=NODATA))


def clip_to_block(raw_tif, mask_gpkg, mask_layer, out_tif):
    gdal.Warp(out_tif, raw_tif, options=gdal.WarpOptions(
        format="GTiff", cutlineDSName=mask_gpkg, cutlineLayer=mask_layer,
        cropToCutline=True, dstNodata=NODATA, srcNodata=NODATA))


def style_and_add(tif_path, name, group):
    rl = QgsRasterLayer(tif_path, name)
    if not rl.isValid():
        log("  ! invalid: " + tif_path); return False
    prov = rl.dataProvider(); st = prov.bandStatistics(1)
    vmin, vmax = st.minimumValue, st.maximumValue
    if vmin == vmax: vmax = vmin + 1e-6
    ramp = QgsStyle.defaultStyle().colorRamp(RAMP_NAME)
    fn = QgsColorRampShader(vmin, vmax, ramp, QgsColorRampShader.Interpolated)
    n = 24
    fn.setColorRampItemList([QgsColorRampShader.ColorRampItem(
        vmin + (vmax - vmin) * i / n, ramp.color(i / n),
        "{:.3g}".format(vmin + (vmax - vmin) * i / n)) for i in range(n + 1)])
    sh = QgsRasterShader(); sh.setRasterShaderFunction(fn)
    rl.setRenderer(QgsSingleBandPseudoColorRenderer(prov, 1, sh))
    rl.renderer().setOpacity(0.85)
    QgsProject.instance().addMapLayer(rl, False); group.insertLayer(0, rl)
    return True


def run():
    for p in (POINTS, MASK):
        if not os.path.exists(p):
            log("GAGAL: tidak ada " + p); return

    log("Reproject titik & mask → " + UTM + " (meter) via GDAL …")
    pts_gpkg = os.path.join(OUTDIR, "_pts_utm.gpkg")
    msk_gpkg = os.path.join(OUTDIR, "_mask_utm.gpkg")
    pts_layer, bounds = reproject_vector(POINTS, pts_gpkg)
    msk_layer, _      = reproject_vector(MASK, msk_gpkg)

    fields = numeric_fields(pts_gpkg)
    log("{} parameter · metode: {} · radius {:g} m · piksel {:g} m · CRS {}"
        .format(len(fields), METHOD, RADIUS_M, PIXEL_M, UTM))

    proj = QgsProject.instance()
    root = proj.layerTreeRoot(); old = root.findGroup(GROUP_NAME)
    if old: root.removeChildNode(old)
    group = root.insertGroup(0, GROUP_NAME)

    raw = os.path.join(OUTDIR, "_tmp_raw.tif"); ok = 0
    for i, field in enumerate(fields, 1):
        out_tif = os.path.join(OUTDIR, field + ".tif")
        log("({}/{}) {}".format(i, len(fields), field))
        try:
            grid_field(pts_gpkg, pts_layer, field, bounds, raw)
            clip_to_block(raw, msk_gpkg, msk_layer, out_tif)
            if style_and_add(out_tif, field, group):
                ok += 1
        except Exception as e:
            log("  ! GAGAL {}: {}".format(field, str(e)[:100]))
    for tmp in (raw,):
        if os.path.exists(tmp):
            try: os.remove(tmp)
            except Exception: pass
    log("Selesai: {}/{} → {} (grup '{}')".format(ok, len(fields), OUTDIR, GROUP_NAME))


run()
