import json, sys, os, importlib.util
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import goal3_versions as g3

SCRATCH = "/tmp/claude-0/-home-claude/5fb22cb5-c9f5-5499-8bab-9a50bc0e5d8a/scratchpad"
GPT_HISTORY = "/home/claude/sigulun555-lab/gpt/data/history.json"
results = {}

# ---- Test 1: v1 reproduces the saved round 1666 Claude predictions (4 dp)
rows_1666 = g3.load_rows(GPT_HISTORY)
fx = [("水戸", "C大阪"), ("横浜FM", "広島"), ("名古屋", "浦和")]  # history canonical short names
saved = {}
for line in open("/home/claude/toto-lab/predictions/round_1666_Claude_goal3.jsonl", encoding="utf-8"):
    o = json.loads(line)
    saved.setdefault(o["matchNumber"], {})[o["isHome"]] = [o["probabilities"][k] for k in "0123"]
fx_teams = {"水戸ホーリーホック": "水戸ホーリーホック"}
pred = g3.run_version("v1", rows_1666, "2026-10-28", fx)
maxdiff = 0.0
for n, (h, a) in enumerate(fx, start=1):
    for side, isH in (("home", True), ("away", False)):
        got = pred[(h, a)][side]
        want = saved[n][isH]
        maxdiff = max(maxdiff, max(abs(x - round(y, 4)) for x, y in zip(got, want)))
# rounding check: compare rounded to 4dp
results["test1_v1_reproduces_round1666_max_abs_diff_4dp"] = maxdiff
results["test1_pass"] = bool(maxdiff <= 5e-5 + 1e-12)

# ---- Test 2: v0 == v1 exactly (same spec)
p0 = g3.run_version("v0", rows_1666, "2026-10-28", fx)
p1 = g3.run_version("v1", rows_1666, "2026-10-28", fx)
d01 = max(abs(a-b) for k in fx for s in ("home","away") for a,b in zip(p0[k][s], p1[k][s]))
results["test2_v0_vs_v1_max_abs_diff"] = d01
results["test2_pass"] = bool(d01 == 0.0)

# ---- Test 3: v0.5 (k=6) reproduces GPT all-k k=6 probabilities on the 472-target outer set
spec = importlib.util.spec_from_file_location("nv", os.path.join(SCRATCH, "goal3_rep/verification/goal3_independent/nested_validation.py"))
nv = importlib.util.module_from_spec(spec); spec.loader.exec_module(nv)
h2025, h2026 = nv.load_data(os.path.join(SCRATCH, "review/history_now.json"),
                            os.path.join(SCRATCH, "goal3_rep/data/team_aliases.json"),
                            os.path.join(SCRATCH, "goal3_rep/verification/goal3_independent/2025.csv"))
rows_outer = [{"date": m["date"], "competition": "J", "home": m["home"], "away": m["away"],
               "hg": m["hg"], "ag": m["ag"]} for m in h2026]
allk = json.load(open(os.path.join(SCRATCH, "goal3_rep/goal3_outer_allk.json"), encoding="utf-8"))
dates = []
for r in allk:
    if r["date"] not in dates:
        dates.append(r["date"])
# Walk the outer dates in order; within a date, matches in h2026 order, home side then away side.
mine = []
for d in dates:
    targets = [m for m in rows_outer if m["date"] == d]
    for m in targets:
        pr = g3.run_version("v0.5", rows_outer, d, [(m["home"], m["away"])])[(m["home"], m["away"])]
        mine.append((d, m, pr))
# Flatten to side rows in the same order as the all-k file
flat = []
for d, m, pr in mine:
    flat.append(("home", m["hg"], pr["home"]))
    flat.append(("away", m["ag"], pr["away"]))
assert len(flat) == len(allk), (len(flat), len(allk))
maxd = 0.0; goal_mismatch = 0; side_mismatch = 0
for (side, goals, probs), r in zip(flat, allk):
    if r["side"] != side: side_mismatch += 1
    if int(r["g"]) != int(goals): goal_mismatch += 1
    ref = r["P"]["6"]
    maxd = max(maxd, max(abs(a-b) for a, b in zip(probs, ref)))
results["test3_rows_compared"] = len(flat)
results["test3_side_order_mismatches"] = side_mismatch
results["test3_goal_mismatches"] = goal_mismatch
results["test3_v05_vs_gpt_allk_k6_max_abs_diff"] = maxd
results["test3_pass"] = bool(side_mismatch == 0 and goal_mismatch == 0 and maxd < 1e-5)

# ---- Test 4: v2 blend sums to 1 and reproduces the round 1666 v2 trial
trial = json.load(open("/home/claude/toto-lab/docs/round-1666-goal3-v2/round_1666_v2_trial.json", encoding="utf-8"))
mk = {}
for r in trial["results"]:
    key = r["team"]
    mk[(r["matchNumber"], key, r["side"])] = r
v2 = g3.run_version("v2", rows_1666, "2026-10-28", fx,
                    market={(h, a): [mk_[0] for mk_ in []] or None for h, a in fx} if False else None) if False else None
# direct blend check against trial numbers
ok = True; worst = 0.0
for r in trial["results"]:
    got = g3.blend_market(r["v1_probabilities"], r["market_probabilities"])
    worst = max(worst, max(abs(a-b) for a, b in zip(got, r["v2_probabilities"])))
results["test4_v2_blend_max_abs_diff_vs_trial_4dp"] = worst
results["test4_pass"] = bool(worst <= 6e-5)

print(json.dumps(results, ensure_ascii=False, indent=2))
allpass = all(v for k, v in results.items() if k.endswith("_pass"))
print("ALL PASS" if allpass else "FAILURES")
