"""Genera tablero/Tablero_GLPI.html con una instantánea incrustada de un CSV de GLPI.

Uso:  python3 tablero/build.py <ruta_csv_glpi> [salida.html]
Sin CSV el HTML igual funciona: se carga el archivo desde el navegador.
La instantánea no incluye solicitantes ni descripciones; los títulos de
todos los tickets.
"""
import base64, gzip, json, re, sys
from pathlib import Path
import pandas as pd

here = Path(__file__).resolve().parent
src = Path(sys.argv[1])
out = Path(sys.argv[2]) if len(sys.argv) > 2 else here / "Tablero_GLPI.html"
df = pd.read_csv(src, sep=";", encoding="utf-8-sig", dtype=str, keep_default_na=False)

def mins(col):
    d = pd.to_datetime(df[col], format="%d-%m-%Y %H:%M", errors="coerce")
    return [0 if pd.isna(x) else int(x.value // 60_000_000_000) for x in d]  # minutos desde epoch (hora de pared)

def norm(s): return re.sub(r"[\s ]+", " ", s).strip().upper()
status = lambda s: 6 if "errad" in s else 5 if "esuelt" in s else 4 if "espera" in s else 3 if "lanific" in s else 2 if ("signad" in s or "curso" in s) else 1 if "uevo" in s else 6
ents, cats, techs, origins = {}, {}, {}, {}
def idx(d, k):
    if k not in d: d[k] = len(d)
    return d[k]
op, cl, mo = mins("Fecha de apertura"), mins("Fecha de cierre"), mins("Última modificación")
txt = (df["Título"] + " " + df["Descripción"]).str.upper()
vol = txt.str.contains("VOLUMEN|VOLÚMEN|PRESTACI") | (txt.str.contains("4A") & txt.str.contains("4B"))
rows = []
for i, r in df.iterrows():
    st = status(r["Estado"])
    cat = r["Categoría"].replace("&#62;", ">").strip()
    tl = [idx(techs, norm(t)) for t in re.split(r"<br\s*/?>", r["Asignado a - Técnico"], flags=re.I) if norm(t)]
    rows.append([int(re.sub(r"\D", "", r["ID"])), idx(ents, r["Entidad"]), idx(cats, cat) if cat else -1, tl, st,
                 1 if r["Tipo"] == "Incidencia" else 0, {"Alta": 0, "Media": 1, "Baja": 2}.get(r["Prioridad"], 1),
                 idx(origins, r["Origen de la solicitud"] or "(sin dato)"), op[i], cl[i], mo[i],
                 1 if r["Solución - Solución"] else 0, 1 if vol[i] else 0, r["Título"]])
cols = [{"n": c, "e": round(100 * ((df[c] == "") | (df[c] == "0 segundos")).mean(), 1)} for c in df.columns if c.strip() and not c.startswith("Unnamed")]
inv = lambda d: [k for k, _ in sorted(d.items(), key=lambda kv: kv[1])]
snap = {"ents": inv(ents), "cats": inv(cats), "techs": inv(techs), "origins": inv(origins), "cols": cols, "rows": rows}
b64 = base64.b64encode(gzip.compress(json.dumps(snap, ensure_ascii=False, separators=(",", ":")).encode(), 9)).decode()
html = (here / "tablero_template.html").read_text(encoding="utf-8").replace("__SNAPSHOT__", b64).replace("__SNAPNAME__", f"Instantánea incrustada ({src.name})")
out.write_text(html, encoding="utf-8")
print(out, f"{out.stat().st_size/1024:.0f} KB", len(rows), "tickets")
