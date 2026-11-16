import sys, os, json, math, hashlib, argparse, random
from collections import defaultdict
import numpy as np

ap = argparse.ArgumentParser()
ap.add_argument("--gpt-repo-root", required=True,
                help="path to a checkout of sigulun555-lab/gpt (contains verification/goal3_independent and data/)")
ap.add_argument("--output", required=True, help="output JSON path for per-target rows")
args = ap.parse_args()

REPO = os.path.join(args.gpt_repo_root, "verification", "goal3_independent")
sys.path.insert(0, REPO)
import nested_validation as nv

ROOT = args.gpt_repo_root
h2025, h2026 = nv.load_data(os.path.join(ROOT, "data", "history.json"),
                            os.path.join(ROOT, "data", "team_aliases.json"),
                            os.path.join(REPO, "2025.csv"))
aliases = json.load(open(os.path.join(ROOT, "data", "team_aliases.json"), encoding="utf-8"))["aliases"]
raw = json.load(open(os.path.join(ROOT, "data", "history.json"), encoding="utf-8"))["history"]
comp = {}
for m in raw:
    if m.get("competition") in ("J1","J2","J3") and isinstance(m.get("home_goals"), int) and isinstance(m.get("away_goals"), int):
        comp[(m["date"], nv.canonical(m["home"], aliases), nv.canonical(m["away"], aliases))] = m["competition"]
dates = sorted({m["date"] for m in h2026})
outer_starts = sorted(set(int(len(dates) * f) for f in nv.OUTER_START_FRACTIONS))
test_dates = []
fold_of = {}
for fold_no, s in enumerate(outer_starts, 1):
    if s <= int(len(dates) * nv.INNER_START_FRACTION) or s >= len(dates):
        continue
    e = outer_starts[fold_no] if fold_no < len(outer_starts) else len(dates)
    for d in dates[s:e]:
        fold_of[d] = fold_no
        test_dates.append(d)
WINDOW = "2026_only"
rows = []
for date in test_dates:
    prior = nv.select_training(h2025, h2026, date, WINDOW)
    if any(m["date"] >= date for m in prior):
        raise AssertionError("leakage")
    fits = {}
    for k in (6.0, 10.0):
        params, idx, info = nv.fit_shrinkage(prior, k)
        fits[k] = (params, idx)
    for mi, m in enumerate([x for x in h2026 if x["date"] == date]):
        mid = f'{date}|{m["home"]}|{m["away"]}'
        for side, team in (("home", m["home"]), ("away", m["away"])):
            goals = m["hg"] if side == "home" else m["ag"]
            cat = nv.bin_goals(goals)
            rec = {"date": date, "league": comp[(m["date"], m["home"], m["away"])], "match": mid,
                   "side": side, "team": team, "fold": fold_of[date],
                   "cutoff_exclusive": date, "actual": cat}
            for k in (6.0, 10.0):
                params, idx = fits[k]
                ph, pa = nv.predict_shrinkage(params, idx, m["home"], m["away"])
                p = ph if side == "home" else pa
                rec[f"p_k{int(k)}"] = [round(float(x), 10) for x in p]
            rows.append(rec)

def brier(p, a): return sum((p[j] - (1.0 if j == a else 0.0))**2 for j in range(4))
def ll(p, a): return -math.log(max(1e-12, p[a]))
for r in rows:
    r["brier_k6"] = brier(r["p_k6"], r["actual"]); r["brier_k10"] = brier(r["p_k10"], r["actual"])
    r["ll_k6"] = ll(r["p_k6"], r["actual"]); r["ll_k10"] = ll(r["p_k10"], r["actual"])
    r["dB"] = r["brier_k6"] - r["brier_k10"]; r["dL"] = r["ll_k6"] - r["ll_k10"]

out_path = args.output
os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
with open(out_path, "w", encoding="utf-8") as f:
    json.dump({"window": WINDOW, "k": [6, 10], "targets": rows}, f, ensure_ascii=False)
sha = hashlib.sha256(open(out_path, "rb").read()).hexdigest()

n = len(rows)
dB = np.array([r["dB"] for r in rows]); dL = np.array([r["dL"] for r in rows])
print("targets", n, "dates", len({r["date"] for r in rows}), "matches", len({r["match"] for r in rows}))
print("mean dBrier %.6f  mean dLogLoss %.6f" % (dB.mean(), dL.mean()))
print("json sha256", sha)

# canonical date-block bootstrap: Python random.Random(1), sorted unique keys,
# rng.choices(k=len(keys)) with replacement, 10,000 replicates, linear percentile 95%
def boot(groups):
    keys = sorted(groups.keys())
    rng = random.Random(1)
    bs_b, bs_l = [], []
    for _ in range(10000):
        pick = rng.choices(keys, k=len(keys))
        rr = [x for key in pick for x in groups[key]]
        bs_b.append(np.mean([x["dB"] for x in rr])); bs_l.append(np.mean([x["dL"] for x in rr]))
    return np.percentile(bs_b, [2.5, 97.5]), np.percentile(bs_l, [2.5, 97.5])

by_date = defaultdict(list)
for r in rows: by_date[r["date"]].append(r)
db, dl = boot(by_date)
print("date-block 95%% CI dBrier [%.6f, %.6f]  dLogLoss [%.6f, %.6f]" % (db[0], db[1], dl[0], dl[1]))
by_match = defaultdict(list)
for r in rows: by_match[r["match"]].append(r)
mb, ml = boot(by_match)
print("match-block (sensitivity) 95%% CI dBrier [%.6f, %.6f]  dLogLoss [%.6f, %.6f]" % (mb[0], mb[1], ml[0], ml[1]))

for lg in ("J1", "J2", "J3"):
    rr = [r for r in rows if r["league"] == lg]
    ds = sorted({r["date"] for r in rr})
    b = np.array([r["dB"] for r in rr]); l = np.array([r["dL"] for r in rr])
    dB_by_date = [np.mean([x["dB"] for x in rr if x["date"] == d]) for d in ds]
    dL_by_date = [np.mean([x["dL"] for x in rr if x["date"] == d]) for d in ds]
    print(f"{lg}: targets {len(rr)} matches {len({r['match'] for r in rr})} dates {len(ds)} | "
          f"dB mean {b.mean():.6f} med {np.median(b):.6f} sd {b.std(ddof=1):.6f} min {b.min():.6f} max {b.max():.6f} | "
          f"dL mean {l.mean():.6f} med {np.median(l):.6f} sd {l.std(ddof=1):.6f} min {l.min():.6f} max {l.max():.6f} | "
          f"date-level dB>=0.05: {sum(x>=0.05 for x in dB_by_date)}/{len(ds)}, dL>=0.10: {sum(x>=0.10 for x in dL_by_date)}/{len(ds)}")
