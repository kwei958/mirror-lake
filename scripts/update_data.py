"""Backfill data.json with S&P 500 and NASDAQ 100 daily closes from FRED (about the last 13 months)."""
import csv, io, json, datetime, subprocess, pathlib
start = (datetime.date.today() - datetime.timedelta(days=395)).isoformat()
def load(series):
    url = f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={series}&cosd={start}"
    text = subprocess.run(["curl", "-sSfL", "--retry", "3", "--max-time", "60", url], check=True, capture_output=True, text=True).stdout
    rows = list(csv.reader(io.StringIO(text)))
    out = [[d, round(float(v), 2)] for d, v in rows[1:] if v not in ("", ".")]
    if len(out) < 100: raise SystemExit(f"{series}: too few rows ({len(out)})")
    return out
# FRED is a backup: it fills gaps and confirms older days, but never removes newer
# closes that the daily chart already added.
p = pathlib.Path(__file__).resolve().parent.parent / "data.json"
old = json.loads(p.read_text()) if p.exists() else {"sp": [], "nq": []}
data = {}
for key, series in (("sp", "SP500"), ("nq", "NASDAQ100")):
    rows = {d: v for d, v in old.get(key, [])}
    rows.update({d: v for d, v in load(series)})
    data[key] = [[d, v] for d, v in sorted(rows.items()) if d >= start]
new = json.dumps(data, separators=(",", ":"))
if p.exists() and p.read_text() == new: print("no change")
else: p.write_text(new); print("updated", data["sp"][-1], data["nq"][-1])
