# -*- coding: utf-8 -*-
"""
Konversi docs/Adoption-Observations-*.xlsx -> db/data/adoption-observations.json
untuk diimport db/import-pilot.mjs (VM tidak butuh Python/openpyxl — JSON-nya
di-commit).

Hanya stdlib (zipfile + xml.etree). Keputusan data:
- Baris 1 = judul, baris 2 = header, data mulai baris 3.
- ExternalID yang berpola NIK (16 digit) DI-MASK: hanya 4 digit terakhir yang
  disimpan. Situs berjalan dengan login stub tanpa password — NIK utuh tidak
  boleh ikut ke database publik.
- Survey Number dibaca sebagai STRING (16 digit > presisi float64) dan tanggal
  survei diekstrak dari digit ke-5..12 (YYYYMMDD).
- Kolom "Self reported farm area" (100% kosong), "Plot size in %" (12 baris),
  dan kolom 45 (tanpa header) dibuang.
"""

import json
import os
import re
import zipfile
import xml.etree.ElementTree as ET

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
XLSX = os.path.join(ROOT, "docs", "Adoption-Observations-1785424351.xlsx")
OUTP = os.path.join(ROOT, "db", "data", "adoption-observations.json")

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}

# indeks kolom (0-based) -> key identitas
IDENTITY = {
    0: "result_id_parent", 1: "result_id", 2: "uid", 3: "display_id",
    4: "name", 5: "external_id", 6: "plot_uid", 7: "producer_id",
    8: "survey_number", 9: "survey_year", 10: "plot_number",
    12: "plot_area_ha", 14: "rehab_method", 15: "year_planted",
}
STR_KEYS = {"uid", "display_id", "name", "external_id", "plot_uid",
            "producer_id", "survey_number", "rehab_method"}
Q_COLS = list(range(16, 44, 2))   # 14 kolom penilaian
C_COLS = list(range(17, 44, 2))   # 14 kolom komentar


def col_index(ref):
    """'AB12' -> 27 (0-based kolom)."""
    s = 0
    for ch in ref:
        if ch.isdigit():
            break
        s = s * 26 + (ord(ch) - 64)
    return s - 1


def load_rows():
    z = zipfile.ZipFile(XLSX)
    shared = []
    if "xl/sharedStrings.xml" in z.namelist():
        for si in ET.fromstring(z.read("xl/sharedStrings.xml")).findall("m:si", NS):
            shared.append("".join(t.text or "" for t in si.iter(
                "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t")))
    rows = []
    for row in ET.fromstring(z.read("xl/worksheets/sheet1.xml")).iter(
            "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row"):
        cells = {}
        for c in row:
            ref = c.get("r", "")
            v = c.find("m:v", NS)
            if v is None or v.text is None:
                continue
            raw = v.text
            if c.get("t") == "s":
                raw = shared[int(raw)]
            cells[col_index(ref)] = raw.strip()
        rows.append(cells)
    return rows


def mask_nik(v):
    # Kolom ExternalID heterogen: NIK 16 digit, salah ketik 15-18 digit,
    # nomor registri 9 digit, dan teks bernama ('Dedi123'). Review privasi:
    # SEMUANYA identitas — mask total kecuali 4 karakter terakhir. Nilai asli
    # tetap ada di xlsx sumber (yang tidak ikut ke situs publik).
    if not v or v == "-":
        return None
    return "*" * max(len(v) - 4, 4) + v[-4:]


def to_num(v, as_int=False):
    if v in (None, ""):
        return None
    try:
        f = float(v)
        return int(f) if as_int else round(f, 4)
    except ValueError:
        return None


def main():
    rows = load_rows()
    header = rows[1]  # baris 2
    questions = [{"code": f"q{i:02d}",
                  "label": header.get(col, f"Pertanyaan {i}")} for i, col in
                 enumerate(Q_COLS, start=1)]

    out_rows = []
    for cells in rows[2:]:
        if 1 not in cells:  # tanpa result_id = baris kosong
            continue
        rec = {}
        for col, key in IDENTITY.items():
            raw = cells.get(col)
            if key in STR_KEYS:
                rec[key] = raw or None
            else:
                rec[key] = to_num(raw, as_int=key in (
                    "result_id_parent", "result_id", "survey_year",
                    "plot_number", "year_planted"))
        rec["external_id"] = mask_nik(rec["external_id"])
        sn = rec["survey_number"] or ""
        if re.fullmatch(r"\d{16}", sn):
            rec["survey_date"] = f"{sn[4:8]}-{sn[8:10]}-{sn[10:12]}"
            rec["date_estimated"] = False
        else:
            # Tanpa Survey Number tanggal tidak diketahui — pertengahan tahun
            # dipakai sebagai perkiraan dan DITANDAI agar tidak menyaru asli.
            rec["survey_date"] = (f"{rec['survey_year']}-07-01"
                                  if rec["survey_year"] else None)
            rec["date_estimated"] = True
        rec["answers"] = {f"q{i:02d}": cells[col]
                          for i, col in enumerate(Q_COLS, start=1)
                          if cells.get(col)}
        rec["comments"] = {f"q{i:02d}": cells[col]
                           for i, col in enumerate(C_COLS, start=1)
                           if cells.get(col)}
        out_rows.append(rec)

    os.makedirs(os.path.dirname(OUTP), exist_ok=True)
    with open(OUTP, "w") as f:
        json.dump({"source": os.path.basename(XLSX),
                   "questions": questions, "rows": out_rows},
                  f, ensure_ascii=False, indent=1)
    n_nik = sum(1 for r in out_rows
                if r["external_id"] and r["external_id"].startswith("*"))
    print(f"{len(out_rows)} baris -> {OUTP}")
    print(f"NIK di-mask: {n_nik}")
    bad_date = sum(1 for r in out_rows if not r["survey_date"])
    print(f"tanpa tanggal: {bad_date}")


if __name__ == "__main__":
    main()
