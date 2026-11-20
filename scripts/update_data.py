"""Refresh data.json with S&P 500 and NASDAQ 100 daily closes from FRED (about the last 13 months)."""
import csv, io, json, datetime, subprocess, pathlib
start = (datetime.date.today() - datetime.timedelta(days=395)).isoformat()
def load(series):
    url = f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={series}&cosd={start}"
    text = subprocess.run(["curl", "-sSfL", "--retry", "3", "--max-time", "60", url], check=True, capture_output=True, text=True).stdout
    rows = list(csv.reader(io.StringIO(text)))
    out = [[d, round(float(v), 2)] for d, v in rows[1:] if v not in ("", ".")]
    if len(out) < 100: raise SystemExit(f"{series}: too few rows ({len(out)})")
    return out
data = {"sp": load("SP500"), "nq": load("NASDAQ100")}
p = pathlib.Path(__file__).resolve().parent.parent / "data.json"
new = json.dumps(data, separators=(",", ":"))
if p.exists() and p.read_text() == new: print("no change")
else: p.write_text(new); print("updated", data["sp"][-1], data["nq"][-1])
