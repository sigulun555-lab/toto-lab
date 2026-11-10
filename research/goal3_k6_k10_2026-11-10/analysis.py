import sys, json, math, random, statistics, os
MOD_DIR = "/home/claude/work/pr19/verification/goal3_independent"
sys.path.insert(0, MOD_DIR)
import nested_validation as nv

HIST = "/home/claude/work/history_pr19.json"
ALIAS = "/home/claude/work/aliases_pr19.json"
CSV = os.path.join(MOD_DIR, "2025.csv")
OUT = "/home/claude/work/out"
K_A, K_B = 6.0, 10.0

h2025, h2026 = nv.load_data(HIST, ALIAS, CSV)
aliases = json.load(open(ALIAS, encoding="utf-8"))["aliases"]
raw = json.load(open(HIST, encoding="utf-8"))["history"]
league = {}
for m in raw:
    if m.get("competition") not in ("J1", "J2", "J3"): continue
    if not isinstance(m.get("home_goals"), int) or not isinstance(m.get("away_goals"), int): continue
    key = (m["date"], nv.canonical(m["home"], aliases), nv.canonical(m["away"], aliases))
    league[key] = m["competition"]

dates = sorted({m["date"] for m in h2026})
n = len(dates)
outer_starts = sorted(set(int(n * f) for f in nv.OUTER_START_FRACTIONS))
inner_cut = int(n * nv.INNER_START_FRACTION)
folds = []
for i, s in enumerate(outer_starts, 1):
    if s <= inner_cut or s >= n: continue
    e = outer_starts[i] if i < len(outer_starts) else n
    folds.append((i, dates[s:e]))
test_dates = [d for _, td in folds for d in td]
print("dates_total", n, "outer_dates", len(test_dates), "folds", [len(t) for _, t in folds])

rows = []
for fold_no, tds in folds:
    for date in tds:
        prior = nv.select_training(h2025, h2026, date, "2026_only")
        pA, idxA, _ = nv.fit_shrinkage(prior, K_A)
        pB, idxB, _ = nv.fit_shrinkage(prior, K_B)
        for m in [x for x in h2026 if x["date"] == date]:
            ha, aa = nv.predict_shrinkage(pA, idxA, m["home"], m["away"])
            hb, ab = nv.predict_shrinkage(pB, idxB, m["home"], m["away"])
            lg = league.get((m["date"], m["home"], m["away"]), "UNKNOWN")
            for side, cat, qa, qb in (("home", nv.bin_goals(m["hg"]), ha, hb), ("away", nv.bin_goals(m["ag"]), aa, ab)):
                rows.append({"fold": fold_no, "date": date, "league": lg,
                             "match": f'{date}|{m["home"]}|{m["away"]}', "side": side,
                             "actual": cat, "p_k6": [round(x, 8) for x in qa], "p_k10": [round(x, 8) for x in qb],
                             "cutoff_prior_max_date": max(x["date"] for x in prior)})

def brier(p, c): return sum((p[k] - (1.0 if k == c else 0.0))**2 for k in range(4))
def ll(p, c): return -math.log(max(1e-12, p[c]))
for r in rows:
    r["brier_k6"], r["brier_k10"] = brier(r["p_k6"], r["actual"]), brier(r["p_k10"], r["actual"])
    r["ll_k6"], r["ll_k10"] = ll(r["p_k6"], r["actual"]), ll(r["p_k10"], r["actual"])
    r["D_brier"] = r["brier_k6"] - r["brier_k10"]
    r["D_ll"] = r["ll_k6"] - r["ll_k10"]
N = len(rows)
matches = len({r["match"] for r in rows})
print("team_side_targets", N, "matches", matches, "dates", len({r["date"] for r in rows}))
assert N == 472, N

def mean(xs): return sum(xs)/len(xs)
Db = mean([r["D_brier"] for r in rows]); Dl = mean([r["D_ll"] for r in rows])
print("overall D_brier %.6f D_ll %.6f" % (Db, Dl))
print("mean brier k6 %.6f k10 %.6f | ll k6 %.6f k10 %.6f" % (
    mean([r["brier_k6"] for r in rows]), mean([r["brier_k10"] for r in rows]),
    mean([r["ll_k6"] for r in rows]), mean([r["ll_k10"] for r in rows])))

rng = random.Random(1)
def boot_cluster(key, metric, B=10000):
    groups = {}
    for r in rows: groups.setdefault(r[key], []).append(r)
    keys = sorted(groups)
    sums = {k: (sum(x[metric] for x in groups[k]), len(groups[k])) for k in keys}
    stats = []
    for _ in range(B):
        s = c = 0
        for k in [keys[rng.randrange(len(keys))] for _ in keys]:
            s += sums[k][0]; c += sums[k][1]
        stats.append(s / c)
    stats.sort()
    lo, hi = stats[int(0.025*B)], stats[int(0.975*B)-1]
    return lo, hi, len(keys)
res = {}
for metric in ("D_brier", "D_ll"):
    lo, hi, nd = boot_cluster("date", metric)
    lo2, hi2, nm = boot_cluster("match", metric)
    res[metric] = {"date_block_ci95": [lo, hi], "n_dates": nd, "match_cluster_ci95": [lo2, hi2], "n_matches": nm}
    print(metric, "date-block 95%% [%.6f, %.6f] (dates=%d)  match-cluster 95%% [%.6f, %.6f]" % (lo, hi, nd, lo2, hi2))

leagues = {}
for lg in ("J1", "J2", "J3", "UNKNOWN"):
    sub = [r for r in rows if r["league"] == lg]
    if not sub: continue
    dl = {}
    for r in sub: dl.setdefault(r["date"], []).append(r)
    dB = [mean([x["D_brier"] for x in v]) for v in dl.values()]
    dL = [mean([x["D_ll"] for x in v]) for v in dl.values()]
    leagues[lg] = {"team_sides": len(sub), "matches": len({r["match"] for r in sub}), "dates": len(dl),
        "D_brier_mean": mean([r["D_brier"] for r in sub]), "D_brier_median_date": statistics.median(dB),
        "D_brier_sd_date": statistics.pstdev(dB), "D_ll_mean": mean([r["D_ll"] for r in sub]),
        "D_ll_median_date": statistics.median(dL), "D_ll_sd_date": statistics.pstdev(dL),
        "date_league_brier_over_0.05": sum(1 for x in dB if x >= 0.05),
        "date_league_ll_over_0.10": sum(1 for x in dL if x >= 0.10)}
    print(lg, json.dumps(leagues[lg], ensure_ascii=False))

# calibration: mean predicted vs observed frequency per category
calib = {}
for key in ("p_k6", "p_k10"):
    calib[key] = {}
    for c in range(4):
        calib[key][str(c)] = {"mean_pred": mean([r[key][c] for r in rows]),
                              "observed": mean([1.0 if r["actual"] == c else 0.0 for r in rows])}
    print(key, {c: (round(v["mean_pred"],4), round(v["observed"],4)) for c, v in calib[key].items()})
hits = {k: mean([1.0 if max(range(4), key=lambda j: r[k][j]) == r["actual"] else 0.0 for r in rows]) for k in ("p_k6","p_k10")}
print("accuracy", hits)

json.dump(rows, open(f"{OUT}/goal3_outer_matches.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
json.dump({"protocol": "17 outer dates (2026-only train, fixed k=6 vs k=10), D=score(k6)-score(k10), date-block bootstrap B=10000 seed=1 percentile 95%; match-cluster sensitivity",
           "team_side_targets": N, "matches": matches, "overall": {"D_brier": Db, "D_ll": Dl}, "bootstrap": res,
           "leagues": leagues, "calibration": calib, "accuracy": hits},
          open(f"{OUT}/goal3_summary.json", "w", encoding="utf-8"), ensure_ascii=False, indent=2)
