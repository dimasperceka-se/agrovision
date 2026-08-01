#!/usr/bin/env python3
"""
Isi kolom parameter pada pilot-data.geojson untuk demonstrasi interpolasi
kriging. Titik berjarak 5 m pada grid fishnet (row_index/col_index).

Strategi agar variogram & surface kriging BAGUS (bukan noise acak):
  - beberapa LATENT field spasial yang HALUS (tren besar + anomali Gauss lokal);
  - tiap parameter diturunkan dari latent → autokorelasi spasial kuat;
  - nugget kecil (noise ~2-3% rentang) supaya ada variasi lokal tapi struktur
    tetap dominan;
  - parameter yang berkaitan memakai latent yang sama → surface saling koheren.

Output: docs/pilot-data-filled.geojson (salinan + kolom baru terisi).
"""
import json, math, random, os

SRC = "docs/pilot-data.geojson"
OUT = "docs/pilot-data-filled.geojson"
random.seed(42)

d = json.load(open(SRC))
feats = d["features"]
RMIN, RMAX, CMIN, CMAX = 1, 49, 1, 51

def nrm(x, a, b): return (x - a) / (b - a)

pts = []
for f in feats:
    p = f["properties"]
    u = nrm(p["col_index"], CMIN, CMAX)   # 0..1 arah X (kolom)
    v = nrm(p["row_index"], RMIN, RMAX)   # 0..1 arah Y (baris)
    crop = "palm" if p["jenis"] == "palm" else "durian"
    pts.append((f, u, v, crop))

def g(u, v, cu, cv, r): return math.exp(-(((u-cu)**2 + (v-cv)**2) / (2*r*r)))
PI = math.pi

# ---- LATENT FIELDS (raw) ----------------------------------------------------
# Undulasi frekuensi-rendah (1.4–2.8 gelombang di seluruh plot) → permukaan
# BERGELOMBANG mirip topografi (bukit-lembah), bukan tren datar. Ditambah 1
# anomali Gauss lokal per latent. Nugget dibuat sangat kecil (lihat mp()).
def raw_soil(u, v):   return (0.5 + 0.30*math.sin(1.8*PI*u + 0.3)*math.cos(1.5*PI*v - 0.2)
                              + 0.20*math.sin(2.7*PI*(0.6*u + 0.4*v) + 1.0)
                              + 0.45*g(u, v, 0.35, 0.62, 0.30))
def raw_water(u, v):  return (0.5 + 0.32*math.cos(1.6*PI*v + 0.5)*math.sin(1.3*PI*u)
                              + 0.22*math.sin(2.2*PI*(u + 0.5*v))
                              + 0.40*g(u, v, 0.22, 0.18, 0.32))
def raw_relief(u, v): return (0.5 + 0.35*math.sin(2.0*PI*u + 0.9)*math.cos(1.8*PI*v + 0.4)
                              + 0.20*math.sin(2.8*PI*v + 0.2))
def raw_acid(u, v):   return (0.5 + 0.28*math.sin(1.5*PI*(u - v) + 0.6)
                              + 0.20*math.cos(2.1*PI*u) + 0.35*g(u, v, 0.70, 0.55, 0.28))
def raw_pest(u, v):   return (0.5 + 0.25*math.sin(2.3*PI*u + 1.2)*math.sin(1.9*PI*v)
                              + 0.60*g(u, v, 0.55, 0.35, 0.20))
def raw_age(u, v):    return (0.5 + 0.30*math.cos(1.4*PI*u - 0.3) + 0.20*math.sin(1.7*PI*v + 0.8)
                              + 0.35*g(u, v, 0.20, 0.30, 0.32))
def raw_salt(u, v):   return 0.10 + 1.0*g(u, v, 0.14, 0.20, 0.28) + 0.15*math.sin(1.6*PI*v)

LAT = {}
for name, fn in [("soil",raw_soil),("water",raw_water),("relief",raw_relief),
                 ("acid",raw_acid),("pest",raw_pest),("age",raw_age),("salt",raw_salt)]:
    vals = [fn(u, v) for _, u, v, _ in pts]
    lo, hi = min(vals), max(vals)
    LAT[name] = [(x-lo)/(hi-lo) for x in vals]

# vigor & depth diturunkan dari latent lain, lalu dinormalkan
vig, dep, tex = [], [], []
for i, (f, u, v, crop) in enumerate(pts):
    s, w, a, r = LAT["soil"][i], LAT["water"][i], LAT["acid"][i], LAT["relief"][i]
    vig.append(0.55*s + 0.25*w - 0.20*a - 0.15*r + 0.30*g(u,v,0.45,0.5,0.32))
    dep.append(0.20 + 0.75*s - 0.30*r)
    tex.append(0.60*s + 0.40*(1-r))
for name, arr in [("vigor",vig),("depth",dep),("tex",tex)]:
    lo, hi = min(arr), max(arr)
    LAT[name] = [(x-lo)/(hi-lo) for x in arr]

# ---- helper mapping latent -> nilai realistis + nugget kecil ---------------
def mp(t, lo, hi, dp=2, noise=0.005):
    # nugget kecil (0.5%) supaya permukaan tetap MULUS/bergelombang, bukan spot.
    val = lo + t*(hi-lo) + random.gauss(0, noise*(hi-lo))
    val = max(lo, min(hi, val))
    return round(val, dp) if dp > 0 else int(round(val))

def bins(t, labels):
    idx = min(len(labels)-1, int(t*len(labels)))
    return labels[idx]

DRAINASE = ["agak cepat", "baik", "agak terhambat", "terhambat", "sangat terhambat"]
TEKSTUR  = ["pasir", "lempung berpasir", "lempung", "lempung berliat", "liat"]

# ---- isi kolom per titik ----------------------------------------------------
for i, (f, u, v, crop) in enumerate(pts):
    P = f["properties"]
    s, w, r, a, pest, age = (LAT[k][i] for k in ("soil","water","relief","acid","pest","age"))
    salt, vigor, depth, texl = (LAT[k][i] for k in ("salt","vigor","depth","tex"))
    isD = crop == "durian"

    add = {
        # --- Land Suitability (parameter lahan) ---
        "ls_temperatur":       mp(1-r, 26.0, 27.8, 1),
        "ls_curah_hujan":      mp(w, 2400, 2900, 0),
        "ls_bahan_kasar":      mp(r, 2, 20, 1),
        "ls_kedalaman_tanah":  mp(depth, 40, 140, 0),
        "ls_ktk":              mp(s, 8, 38, 1),
        "ls_ph":               mp(1-a, 4.4, 7.0, 2),
        "ls_c_organik":        mp(s, 0.7, 3.6, 2),
        "ls_kejenuhan_basa":   mp(s, 22, 82, 0),
        "ls_salinitas":        mp(salt, 0.1, 3.2, 2),
        "ls_lereng":           mp(r, 1, 22, 1),
        "ls_batuan_permukaan": mp(r, 0, 15, 1),
        "ls_singkapan_batuan": mp(r, 0, 9, 1),
        "ls_drainase":         bins(w, DRAINASE),
        "ls_tekstur":          bins(texl, TEKSTUR),

        # --- Uji Tanah (soil test, docs/09 §2) ---
        "tanah_ph_h2o":     mp(1-a, 4.4, 7.0, 2),
        "tanah_ph_kcl":     round(max(3.8, mp(1-a, 4.4, 7.0, 2) - (0.6 + a*0.35)), 2),
        "tanah_c_organik":  mp(s, 0.7, 3.6, 2),
        "tanah_n_total":    mp(s, 0.06, 0.35, 3),
        "tanah_p_tersedia": mp(s, 4, 30, 1),
        "tanah_k_dd":       mp(s, 0.10, 0.90, 2),
        "tanah_ca_dd":      mp(s, 2.0, 15.0, 1),
        "tanah_mg_dd":      mp(s, 0.40, 3.50, 2),
        "tanah_na_dd":      mp(salt, 0.05, 0.80, 2),
        "tanah_ktk":        mp(s, 8, 38, 1),
        "tanah_kb":         mp(s, 22, 82, 0),
        "tanah_al_dd":      mp(a, 0.05, 3.50, 2),
        "tanah_dhl_ec":     mp(salt, 0.10, 2.50, 2),
        "tanah_kedalaman":  mp(depth, 40, 140, 0),
        "tanah_cl":         mp(0.6*salt + 0.4*w, 30, 300, 0),
        "tanah_bobot_isi":  round(max(1.0, 1.42 - s*0.38 + random.gauss(0, 0.01)), 2),

        # --- Analisis Jaringan (leaf, %) ---
        "daun_n":  mp(0.5*s + 0.5*vigor, 1.5 + (0.05 if isD else 0), 2.6, 2),
        "daun_p":  mp(0.5*s + 0.5*vigor, 0.10, 0.20, 3),
        "daun_k":  mp(0.45*s + 0.55*vigor, 0.8, 1.8, 2),
        "daun_ca": mp(s, 0.4, 1.2, 2),
        "daun_mg": mp(s, 0.18, 0.45, 3),
        "daun_s":  mp(0.6*s + 0.4*vigor, 0.14, 0.28, 3),
        "daun_cl": mp(0.7*salt + 0.3*(1 if crop == "palm" else 0), 0.05, 0.45, 3),
        "daun_b":  mp(s, 12, 30, 1),
        "daun_cu": mp(vigor, 4, 12, 1),
        "daun_zn": mp(vigor, 12, 40, 1),
        "daun_mn": mp(a, 40, 180, 0),
        "daun_fe": mp(0.6*a + 0.4*w, 50, 200, 0),

        # --- Neraca Hara / Tanaman & Agronomi ---
        "tan_umur":            mp(age, 3, 14, 0),
        "tan_populasi_ha":     mp(0.5 + 0.2*s, 130, 160, 0) if crop == "palm" else mp(0.5 + 0.2*s, 90, 120, 0),
        "tan_hasil_aktual":    mp(0.6*vigor + 0.4*age, 0.8, 2.8, 2) if crop == "palm" else mp(0.6*vigor + 0.4*age, 3.0, 13.0, 2),
        "tan_pelepah":         mp(vigor, 22, 40, 0),
        "tan_lingkar":         mp(0.6*age + 0.4*vigor, 30, 120, 0),
        "tan_populasi_hidup_pct": mp(vigor, 82, 99, 1),

        # --- Seedling (awal / hidup / mati / rusak) ---
        # (dihitung di bawah agar konsisten)

        # --- Pruning ---
        "pruning_pohon":          mp(0.6*vigor + 0.4*age, 0, 4, 0),
        "pruning_intensitas_pct": mp(0.5*vigor + 0.5*age, 10, 40, 0),

        # --- Spraying ---
        "spray_dosis_ha":  mp(pest, 1.2, 4.2, 2),
        "spray_volume_l":  mp(pest, 8, 45, 1),

        # --- Harvesting ---
        "harvest_ton":   mp(0.6*vigor + 0.4*age, 0.02, 0.20, 3) if crop == "palm" else mp(0.6*vigor + 0.4*age, 0.05, 0.35, 3),
        "harvest_grade": bins(1-vigor, ["A", "B", "C"]),

        # --- Carbon Accounting ---
        # DBH -> biomassa alometrik -> sekuestrasi; emisi kecil + patch gangguan
    }

    # seedling counts (konsisten: hidup = awal - mati - rusak)
    awal = mp(0.5 + 0.4*s, 8, 14, 0)
    mort = 0.02 + 0.13*(1-vigor); dmg = 0.01 + 0.07*(1-vigor)
    mati = int(round(awal*mort)); rusak = int(round(awal*dmg))
    hidup = max(0, awal - mati - rusak)
    add["seed_awal"], add["seed_hidup"], add["seed_mati"], add["seed_rusak"] = awal, hidup, mati, rusak

    # carbon
    dbh = mp(0.55*age + 0.45*vigor, 8, 48, 1)
    biom = round(0.085 * (dbh ** 2.35), 0)                       # kg (alometrik halus)
    seq = round(biom * 0.47 * 44/12 / 1000, 4)                   # tCO2e per titik
    emis = round(0.001 + pest*0.015 + 0.02*g(u, v, 0.16, 0.80, 0.15) + random.gauss(0, 0.0004), 4)
    emis = max(0.0, emis)
    add["carbon_dbh_cm"] = dbh
    add["carbon_biomassa_kg"] = int(biom)
    add["carbon_sekuestrasi_tco2e"] = seq
    add["carbon_emisi_tco2e"] = emis
    add["carbon_net_tco2e"] = round(seq - emis, 4)

    P.update(add)

os.makedirs("docs", exist_ok=True)
json.dump(d, open(OUT, "w"), ensure_ascii=False)
print("written", OUT)
print("features:", len(feats))
print("added columns:", len(add))
print("sample keys:", ", ".join(list(add.keys())[:12]), "...")
PY_TAIL = None
