# -*- coding: utf-8 -*-
"""
Konversi SEMUA raster interpolasi (docs/interpolation/*.tif, UTM 48S) menjadi
overlay web: public/overlays/interp/<param>.png + manifest.json.

Meniru persis format 3 layer pertama (pH/emisi/net): ramp Spectral 5 warna,
nodata transparan, koordinat 4 sudut (TL,TR,BR,BL) dalam EPSG:4326 untuk
image source MapLibre di BlockMap.tsx.

Butuh GDAL CLI (gdalwarp, gdaldem, gdalinfo). Jalankan di mesin dev:
    python3 scripts/gen-overlays.py
Hasilnya di-commit; VM tidak butuh GDAL.
"""

import json
import os
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "docs", "interpolation")
OUT = os.path.join(ROOT, "public", "overlays", "interp")

RAMP = ["#2b83ba", "#abdda4", "#ffffbf", "#fdae61", "#d7191c"]  # Spectral 5

# Label + satuan per parameter. Urutan dict ini = urutan di dropdown peta;
# pH ditaruh pertama mengikuti manifest lama (dipakai skrip demo).
LAYERS = {
    "tanah_ph_h2o":            ("pH Tanah (H₂O)", "pH"),
    "carbon_emisi_tco2e":      ("Emisi Karbon", "tCO₂e"),
    "carbon_net_tco2e":        ("Net Karbon", "tCO₂e"),
    "carbon_sekuestrasi_tco2e":("Sekuestrasi Karbon", "tCO₂e"),
    "carbon_biomassa_kg":      ("Biomassa", "kg/pohon"),
    "carbon_dbh_cm":           ("DBH", "cm"),
    "tanah_ph_kcl":            ("pH Tanah (KCl)", "pH"),
    "tanah_c_organik":         ("C-Organik Tanah", "%"),
    "tanah_n_total":           ("N Total Tanah", "%"),
    "tanah_p_tersedia":        ("P Tersedia", "ppm"),
    "tanah_k_dd":              ("K dapat ditukar", "cmol(+)/kg"),
    "tanah_ca_dd":             ("Ca dapat ditukar", "cmol(+)/kg"),
    "tanah_mg_dd":             ("Mg dapat ditukar", "cmol(+)/kg"),
    "tanah_na_dd":             ("Na dapat ditukar", "cmol(+)/kg"),
    "tanah_al_dd":             ("Al dapat ditukar", "cmol(+)/kg"),
    "tanah_ktk":               ("KTK Tanah", "cmol(+)/kg"),
    "tanah_kb":                ("Kejenuhan Basa", "%"),
    "tanah_dhl_ec":            ("DHL / EC", "dS/m"),
    "tanah_kedalaman":         ("Kedalaman Tanah", "cm"),
    "tanah_cl":                ("Cl Tanah", "ppm"),
    "tanah_bobot_isi":         ("Bobot Isi Tanah", "g/cm³"),
    "ls_temperatur":           ("Kesesuaian: Temperatur", "°C"),
    "ls_curah_hujan":          ("Kesesuaian: Curah Hujan", "mm/th"),
    "ls_bahan_kasar":          ("Kesesuaian: Bahan Kasar", "%"),
    "ls_kedalaman_tanah":      ("Kesesuaian: Kedalaman Tanah", "cm"),
    "ls_ktk":                  ("Kesesuaian: KTK", "cmol(+)/kg"),
    "ls_ph":                   ("Kesesuaian: pH", "pH"),
    "ls_c_organik":            ("Kesesuaian: C-Organik", "%"),
    "ls_kejenuhan_basa":       ("Kesesuaian: Kejenuhan Basa", "%"),
    "ls_salinitas":            ("Kesesuaian: Salinitas", "dS/m"),
    "ls_lereng":               ("Kesesuaian: Lereng", "%"),
    "ls_batuan_permukaan":     ("Kesesuaian: Batuan Permukaan", "%"),
    "ls_singkapan_batuan":     ("Kesesuaian: Singkapan Batuan", "%"),
    "daun_n":                  ("Daun: N", "%"),
    "daun_p":                  ("Daun: P", "%"),
    "daun_k":                  ("Daun: K", "%"),
    "daun_ca":                 ("Daun: Ca", "%"),
    "daun_mg":                 ("Daun: Mg", "%"),
    "daun_s":                  ("Daun: S", "%"),
    "daun_cl":                 ("Daun: Cl", "%"),
    "daun_b":                  ("Daun: B", "ppm"),
    "daun_cu":                 ("Daun: Cu", "ppm"),
    "daun_zn":                 ("Daun: Zn", "ppm"),
    "daun_mn":                 ("Daun: Mn", "ppm"),
    "daun_fe":                 ("Daun: Fe", "ppm"),
    "tan_umur":                ("Umur Tanaman", "tahun"),
    "tan_populasi_ha":         ("Populasi", "pohon/ha"),
    "tan_populasi_hidup_pct":  ("Populasi Hidup", "%"),
    "tan_hasil_aktual":        ("Hasil Aktual", "ton/ha"),
    "tan_pelepah":             ("Jumlah Pelepah", "pelepah"),
    "tan_lingkar":             ("Lingkar Batang", "cm"),
    "pruning_pohon":           ("Pruning: Pohon", "pohon"),
    "pruning_intensitas_pct":  ("Pruning: Intensitas", "%"),
    "spray_dosis_ha":          ("Semprot: Dosis", "l/ha"),
    "spray_volume_l":          ("Semprot: Volume", "liter"),
    "harvest_ton":             ("Panen", "ton"),
    "seed_awal":               ("Bibit: Awal", "batang"),
    "seed_hidup":              ("Bibit: Hidup", "batang"),
    "seed_mati":               ("Bibit: Mati", "batang"),
    "seed_rusak":              ("Bibit: Rusak", "batang"),
}


def sh(*cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"{' '.join(cmd)}\n{r.stderr}")
    return r.stdout


def hex_rgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


def main():
    os.makedirs(OUT, exist_ok=True)
    manifest = {}
    missing = []
    for param, (label, unit) in LAYERS.items():
        tif = os.path.join(SRC, f"{param}.tif")
        if not os.path.exists(tif):
            missing.append(param)
            continue
        with tempfile.TemporaryDirectory() as td:
            warped = os.path.join(td, "w.tif")
            sh("gdalwarp", "-q", "-t_srs", "EPSG:4326", "-r", "bilinear",
               "-dstnodata", "-9999", tif, warped)
            info = json.loads(sh("gdalinfo", "-stats", "-json", warped))
            band = info["bands"][0]
            vmin = float(band["minimum"])
            vmax = float(band["maximum"])
            cc = info["cornerCoordinates"]
            coords = [
                [round(cc["upperLeft"][0], 7), round(cc["upperLeft"][1], 7)],
                [round(cc["upperRight"][0], 7), round(cc["upperRight"][1], 7)],
                [round(cc["lowerRight"][0], 7), round(cc["lowerRight"][1], 7)],
                [round(cc["lowerLeft"][0], 7), round(cc["lowerLeft"][1], 7)],
            ]
            # Ramp min→max 5 titik; nodata transparan. Kalau raster konstan
            # (min == max), beri epsilon supaya gdaldem tidak menolak.
            span = (vmax - vmin) or 1e-9
            ramp = os.path.join(td, "ramp.txt")
            with open(ramp, "w") as f:
                f.write("nv 0 0 0 0\n")
                for i, hx in enumerate(RAMP):
                    v = vmin + span * i / (len(RAMP) - 1)
                    r, g, b = hex_rgb(hx)
                    f.write(f"{v:.10g} {r} {g} {b} 255\n")
            png = os.path.join(OUT, f"{param}.png")
            sh("gdaldem", "color-relief", "-q", "-alpha", "-of", "PNG",
               warped, ramp, png)
            aux = png + ".aux.xml"
            if os.path.exists(aux):
                os.remove(aux)
        manifest[param] = {
            "url": f"/overlays/interp/{param}.png",
            "label": label,
            "unit": unit,
            "min": round(vmin, 3),
            "max": round(vmax, 3),
            "coordinates": coords,
            "ramp": RAMP,
        }
        print(f"[ok] {param}  {vmin:.3f}..{vmax:.3f}")

    with open(os.path.join(OUT, "manifest.json"), "w") as f:
        json.dump(manifest, f, indent=2)
    print(f"\n{len(manifest)} layer -> {OUT}/manifest.json")
    if missing:
        print(f"tif tidak ditemukan (dilewati): {', '.join(missing)}")
        sys.exit(1)


if __name__ == "__main__":
    main()
