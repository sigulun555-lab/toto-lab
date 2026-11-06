"""GOAL3 model versions v0 / v0.5 / v1 / v2 (research; not production).

v0   : common baseline. shrinkage-Poisson, lambda=10, 2026-only history.
v0.5 : shrinkage-Poisson, lambda=6 (k=6), 2026-only history. Pre-production test only.
v1   : Claude's existing GOAL3 model (goal3.py, round 1666), lambda=10, 2026-only.
       Same specification as v0 (see test_versions.py: v0 == v1 exactly).
v2   : v1 blended with toto ONE purchase-ratio market (MARKET_WEIGHT=0.7 carried over,
       NOT validated for GOAL3). Research trial only; needs a market snapshot per round.

Objective and gradient follow goal3.py / nested_validation.fit_shrinkage:
Poisson NLL on both sides + lam * (sum attack^2 + sum defense^2); intercept and home
advantage unpenalized. Training data is filtered explicitly to 2026 J1/J2/J3 rows and
a strict date cutoff (same-day fixtures excluded).
"""
import json, math, hashlib
import numpy as np
from scipy.optimize import minimize
from scipy.stats import poisson

LEAGUES = ("J1", "J2", "J3")
MARKET_WEIGHT = 0.7

VERSIONS = {
    "v0":   {"lam": 10.0, "label": "common baseline (lambda=10, 2026-only)"},
    "v0.5": {"lam": 6.0,  "label": "k=6 shrinkage-Poisson (pre-production test)"},
    "v1":   {"lam": 10.0, "label": "Claude existing GOAL3 model (lambda=10, 2026-only)"},
    "v2":   {"lam": 10.0, "label": "v1 + toto ONE market blend (research trial)"},
}


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 16), b""):
            h.update(chunk)
    return h.hexdigest()


def load_rows(history_path):
    """Rows from gpt data/history.json. Only J1/J2/J3 and calendar year 2026 are kept."""
    H = json.load(open(history_path, encoding="utf-8"))["history"]
    rows = [{"date": h["date"], "competition": h["competition"], "home": h["home"], "away": h["away"],
             "hg": int(h["home_goals"]), "ag": int(h["away_goals"])}
            for h in H if h["competition"] in LEAGUES and str(h["date"])[:4] == "2026"]
    return sorted(rows, key=lambda r: (r["date"], r["competition"]))


def prior_before(rows, target_date):
    """Strict cutoff: only matches dated before target_date (no same-day fixtures)."""
    return [r for r in rows if r["date"] < target_date]


def fit(prior, lam):
    teams = sorted({r["home"] for r in prior} | {r["away"] for r in prior})
    ix = {t: i for i, t in enumerate(teams)}
    n = len(teams)
    hi = np.array([ix[r["home"]] for r in prior]); ai = np.array([ix[r["away"]] for r in prior])
    yh = np.array([r["hg"] for r in prior], float); ya = np.array([r["ag"] for r in prior], float)

    def objgrad(p):
        att, dfn, mu, h = p[:n], p[n:2*n], p[2*n], p[2*n+1]
        lh = np.clip(mu + h + att[hi] - dfn[ai], -20, 20)
        la = np.clip(mu + att[ai] - dfn[hi], -20, 20)
        L, R = np.exp(lh), np.exp(la)
        f = -((yh*lh - L).sum() + (ya*la - R).sum()) + lam*((att**2).sum() + (dfn**2).sum())
        eh, ea = L - yh, R - ya
        g = np.zeros_like(p)
        np.add.at(g[:n], hi, eh); np.add.at(g[:n], ai, ea)
        np.add.at(g[n:2*n], ai, -eh); np.add.at(g[n:2*n], hi, -ea)
        g[2*n] = eh.sum() + ea.sum(); g[2*n+1] = eh.sum()
        g[:2*n] += 2*lam*p[:2*n]
        return f, g

    p0 = np.zeros(2*n + 2); p0[2*n] = math.log(1.3)
    r = minimize(objgrad, p0, jac=True, method="L-BFGS-B", options={"gtol": 1e-10})
    if not r.success:
        raise RuntimeError(f"L-BFGS-B failed: {r.message}")
    return {"teams": ix, "att": r.x[:n], "dfn": r.x[n:2*n], "mu": r.x[2*n], "h": r.x[2*n+1],
            "nit": int(r.nit)}


def predict_side(params, home, away):
    """Goal-bucket probabilities [0,1,2,3+] for home and away sides."""
    ix = params["teams"]
    if home not in ix or away not in ix:
        raise KeyError(f"unknown team in fixture: {home} / {away}")
    i, j = ix[home], ix[away]
    lh = math.exp(params["mu"] + params["h"] + params["att"][i] - params["dfn"][j])
    la = math.exp(params["mu"] + params["att"][j] - params["dfn"][i])
    out = []
    for lam_goals in (lh, la):
        pk = poisson.pmf([0, 1, 2], lam_goals)
        out.append([float(pk[0]), float(pk[1]), float(pk[2]), float(1 - pk.sum())])
    return out  # [home_probs, away_probs]


def normalize(p):
    s = sum(p)
    return [x / s for x in p]


def blend_market(model_p, market_p, w=MARKET_WEIGHT):
    m = normalize(market_p)
    return normalize([w*a + (1-w)*b for a, b in zip(m, model_p)])


def run_version(version, rows, target_date, fixtures, market=None):
    """fixtures: list of (home, away). Returns {(home,away): {"home": [...], "away": [...]}}."""
    if version not in VERSIONS:
        raise ValueError(f"unknown version {version}")
    prior = prior_before(rows, target_date)
    lam = VERSIONS[version]["lam"]
    params = fit(prior, lam)
    out = {}
    for home, away in fixtures:
        hp, ap = predict_side(params, home, away)
        if version == "v2":
            if market is None or (home, away) not in market:
                raise ValueError("v2 needs a market snapshot for every fixture")
            mh, ma = market[(home, away)]
            hp, ap = blend_market(hp, mh), blend_market(ap, ma)
        out[(home, away)] = {"home": hp, "away": ap}
    return out


if __name__ == "__main__":
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--history", required=True)
    ap.add_argument("--target-date", required=True, help="YYYY-MM-DD; uses matches strictly before this date")
    ap.add_argument("--fixtures", required=True, help="JSON list of [home, away]")
    ap.add_argument("--market", help="JSON {\"home|away\": [[side probs], [side probs]]} (v2 only)")
    ap.add_argument("--versions", default="v0,v0.5,v1,v2")
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    rows = load_rows(a.history)
    fixtures = [tuple(x) for x in json.load(open(a.fixtures, encoding="utf-8"))]
    market_raw = json.load(open(a.market, encoding="utf-8")) if a.market else None
    market = {tuple(k.split("|")): v for k, v in market_raw.items()} if market_raw else None
    result = {"history_sha256": sha256_file(a.history), "history_rows_used": len(prior_before(rows, a.target_date)),
              "target_date": a.target_date, "versions": {}}
    for v in a.versions.split(","):
        if v == "v2" and market is None:
            result["versions"][v] = {"status": "not_run", "reason": "no market snapshot supplied"}
            continue
        preds = run_version(v, rows, a.target_date, fixtures, market)
        result["versions"][v] = {"lambda": VERSIONS[v]["lam"], "label": VERSIONS[v]["label"],
                                 "status": "ok",
                                 "fixtures": [{"home": h, "away": w, "home_probs": p["home"], "away_probs": p["away"]}
                                              for (h, w), p in preds.items()]}
    json.dump(result, open(a.out, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print("wrote", a.out)
