"""Independent re-derivation of GOAL3 k=6/k=10 Poisson residual dispersion.

Written from the method description only (not importing GPT's code).
Steps: canonicalize 2026 history -> for each target date, fit a
penalized Poisson (attack/defense, home advantage, intercept) on rows
dated strictly before it -> lambda per team-side -> Pearson residual
dispersion -> date-cluster bootstrap + joint max-|t| band.
Cross-checks lambdas against the frozen CSV (lambda = -log(k_p0)).

Inputs expected in IN: aliases.json (from data/team_aliases.json),
history.json (from data/history.json), frozen.csv
(from verification/goal3_independent/goal3_outer_matches.csv).
"""
import csv, json, math, sys
from collections import defaultdict
import numpy as np
from scipy.optimize import minimize

IN = "/tmp/claude-0/-home-claude/8a416604-f118-58e1-b393-b27b1ff8e8f4/scratchpad/in/"
LEAGUES = {"J1", "J2", "J3"}

aliases = json.load(open(IN + "aliases.json", encoding="utf-8"))["aliases"]

def canon(name):
    v = str(name).strip()
    return aliases.get(v, v)

doc = json.load(open(IN + "history.json", encoding="utf-8"))
hist = []
for r in doc["history"]:
    if r.get("competition") not in LEAGUES:
        continue
    hg, ag = r.get("home_goals"), r.get("away_goals")
    if not isinstance(hg, int) or not isinstance(ag, int) or hg < 0 or ag < 0:
        continue
    hist.append({"date": r["date"], "h": canon(r["home"]), "a": canon(r["away"]), "hg": hg, "ag": ag})
print("history rows (J1-3, valid goals):", len(hist))

rows = list(csv.DictReader(open(IN + "frozen.csv", encoding="utf-8-sig", newline="")))
for r in rows:
    r["hg"], r["ag"] = int(r["hg"]), int(r["ag"])
dates = sorted({r["date"] for r in rows})
print("frozen targets:", len(rows), "dates:", len(dates))

def fit(prior, k):
    teams = sorted({m["h"] for m in prior} | {m["a"] for m in prior})
    idx = {t: i for i, t in enumerate(teams)}
    n = len(teams)
    H = np.array([idx[m["h"]] for m in prior]); A = np.array([idx[m["a"]] for m in prior])
    hg = np.array([m["hg"] for m in prior], float); ag = np.array([m["ag"] for m in prior], float)

    def unpack(th):
        return th[0], th[1], th[2:2 + n], th[2 + n:]

    def f(th):
        mu, home, att, dfn = unpack(th)
        eh = mu + home + att[H] - dfn[A]
        ea = mu + att[A] - dfn[H]
        lh, la = np.exp(eh), np.exp(ea)
        val = np.sum(lh - hg * eh) + np.sum(la - ag * ea) + k * (att @ att + dfn @ dfn)
        rh, ra = lh - hg, la - ag
        g = np.zeros_like(th)
        g[0] = rh.sum() + ra.sum()
        g[1] = rh.sum()
        np.add.at(g[2:2 + n], H, rh); np.add.at(g[2:2 + n], A, ra)
        np.add.at(g[2 + n:], A, -rh); np.add.at(g[2 + n:], H, -ra)
        g[2:2 + n] += 2 * k * att
        g[2 + n:] += 2 * k * dfn
        return val, g

    th0 = np.zeros(2 + 2 * n); th0[0] = math.log(1.3)
    res = minimize(f, th0, jac=True, method="L-BFGS-B", options={"maxiter": 300})
    if not res.success:
        raise RuntimeError(res.message)
    mu, home, att, dfn = unpack(res.x)
    def lam(home_team, away_team, side):
        ha = att[idx[home_team]] if home_team in idx else 0.0
        hd = dfn[idx[home_team]] if home_team in idx else 0.0
        aa = att[idx[away_team]] if away_team in idx else 0.0
        ad = dfn[idx[away_team]] if away_team in idx else 0.0
        if side == "home":
            return math.exp(float(np.clip(mu + home + ha - ad, -20, 20)))
        return math.exp(float(np.clip(mu + aa - hd, -20, 20)))
    return lam

lam_by_k = {6: {}, 10: {}}
for d in dates:
    prior = [m for m in hist if m["date"] < d]
    for k in (6, 10):
        lam = fit(prior, float(k))
        for r in rows:
            if r["date"] != d:
                continue
            lam_by_k[k][(r["date"], r["comp"], r["home"], r["away"], r["side"])] = lam(r["home"], r["away"], r["side"])

# cross-check against frozen CSV lambdas
for k in (6, 10):
    maxdiff = 0.0
    for r in rows:
        key = (r["date"], r["comp"], r["home"], r["away"], r["side"])
        lam_csv = -math.log(float(r[f"k{k}_p0"]))
        maxdiff = max(maxdiff, abs(lam_by_k[k][key] - lam_csv))
    print(f"k={k}: max |lambda_indep - lambda_frozen| = {maxdiff:.3e}")

# residuals
def cohort(scope, k):
    out = []
    for r in rows:
        if scope != "ALL" and r["comp"] != scope:
            continue
        key = (r["date"], r["comp"], r["home"], r["away"], r["side"])
        y = r["hg"] if r["side"] == "home" else r["ag"]
        lam = lam_by_k[k][key]
        out.append((r["date"], y, lam, (y - lam) / math.sqrt(lam)))
    return out

scopes = ["ALL", "J1", "J2", "J3"]
ks = [6, 10]
keys = [(s, k) for s in scopes for k in ks]
di = {d: i for i, d in enumerate(dates)}
suff = {}
for s, k in keys:
    arr = np.zeros((len(dates), 3))
    for d, y, lam, z in cohort(s, k):
        i = di[d]; arr[i] += (1, z, z * z)
    suff[(s, k)] = arr

obs = {}
for key in keys:
    t = suff[key].sum(axis=0)
    obs[key] = t[2] / t[0]
    print(f"{key[0]} k{key[1]}: n={int(suff[key].sum(axis=0)[0])} dispersion={obs[key]:.5f} meanZ={suff[key].sum(axis=0)[1]/suff[key].sum(axis=0)[0]:.5f}")

REPS, SEED = 50000, 20261105
rng = np.random.Generator(np.random.PCG64(SEED))
draws = rng.integers(0, len(dates), size=(REPS, len(dates)))
mult = np.zeros((REPS, len(dates)))
for j in range(len(dates)):
    mult[np.arange(REPS), draws[:, j]] += 1
boot = {}
for key in keys:
    s = mult @ suff[key]
    boot[key] = s[:, 2] / s[:, 0]
ses = {key: float(np.std(boot[key], ddof=1)) for key in keys}
stud = np.column_stack([(boot[key] - obs[key]) / ses[key] for key in keys])
crit = float(np.quantile(np.max(np.abs(stud), axis=1), 0.95, method="linear"))
print("joint max-|t| critical:", round(crit, 7))
for key in keys:
    lo_p, hi_p = np.quantile(boot[key], [0.025, 0.975], method="linear")
    print(f"{key[0]} k{key[1]}: index={obs[key]:.5f} joint[{obs[key]-crit*ses[key]:.5f},{obs[key]+crit*ses[key]:.5f}] pct95[{lo_p:.5f},{hi_p:.5f}]")
for s in scopes:
    delta = boot[(s, 6)] - boot[(s, 10)]
    lo, hi = np.quantile(delta, [0.025, 0.975], method="linear")
    print(f"paired k6-k10 {s}: diff={obs[(s,6)]-obs[(s,10)]:+.5f} pct95[{lo:+.5f},{hi:+.5f}]")
