"""Add one trading day's S&P 500 and NASDAQ 100 closes (from the daily chart) to data.json.
Usage: python3 scripts/add_close.py --date 2026-11-20 --sp 7180.12 --nq 26600.45
"""
import argparse, json, pathlib, datetime, sys
ap = argparse.ArgumentParser()
ap.add_argument("--date", required=True); ap.add_argument("--sp", type=float, required=True); ap.add_argument("--nq", type=float, required=True)
a = ap.parse_args()
datetime.date.fromisoformat(a.date)
p = pathlib.Path(__file__).resolve().parent.parent / "data.json"
data = json.loads(p.read_text())
changed = False
for key, val in (("sp", a.sp), ("nq", a.nq)):
    rows = {d: v for d, v in data[key]}
    prev = [v for d, v in sorted(rows.items()) if d < a.date]
    if prev and not (0.85 < val / prev[-1] < 1.15):
        sys.exit(f"{key}: {val} is more than 15% away from the previous close {prev[-1]} - not saved")
    if rows.get(a.date) != round(val, 2):
        rows[a.date] = round(val, 2); changed = True
    cutoff = (datetime.date.fromisoformat(a.date) - datetime.timedelta(days=395)).isoformat()
    data[key] = [[d, v] for d, v in sorted(rows.items()) if d >= cutoff]
if changed:
    p.write_text(json.dumps(data, separators=(",", ":"))); print("saved", a.date, a.sp, a.nq)
else:
    print("no change")
