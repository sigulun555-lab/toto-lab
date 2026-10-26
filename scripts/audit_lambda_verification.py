#!/usr/bin/env python3
"""
λ（縮小の強さ）の独立検証（監査用）。本番処理・既存の予想ログには一切触れない。

仕様（GPTさんの依頼と同じ）:
- データ: data/audit/history_snapshot_gpt_96fdd4a.json（gpt リポジトリ commit 96fdd4a の data/history.json のコピー）
- J1/J2/J3、日付昇順（同日は competition 昇順）
- 学習開始件数 60/100/150、評価は以降の全試合。各評価試合の前は、その試合より前の試合だけで再推定
- 目的関数: -Σ[y ln λ - λ]（ホーム・アウェイ） + λ_pen (Σa² + Σd²)  ※罰則は a,d のみ
- 初期値 a=d=h=0, μ=ln(1.3)、制約なし L-BFGS-B（収束判定・失敗を記録）
- 得点格子 0..9 × 0..9、正規化、Brier（3クラス二乗和の平均）、Log Loss、的中（argmax）、引分予想数
- 基準: 評価試合より前の累積 引分/ホーム/アウェイ 比率
"""
import json, math, sys, os
import numpy as np
from scipy.optimize import minimize
from scipy.stats import poisson

SNAP = os.path.join(os.path.dirname(__file__), "..", "data", "audit", "history_snapshot_gpt_96fdd4a.json")
OUT_JSON = os.path.join(os.path.dirname(__file__), "..", "reports", "audit_lambda_verification.json")
LAMS = [10.0, 30.0]          # 比較対象（λ=3 は今回の依頼の対象外）
WARMS = [60, 100, 150]
K = 10

def load_matches():
    H = json.load(open(SNAP, encoding="utf-8"))["history"]
    J = [m for m in H if m["competition"] in ("J1", "J2", "J3")]
    audit = {
        "rows": len(H), "j_rows": len(J),
        "date_min": min(m["date"] for m in J), "date_max": max(m["date"] for m in J),
        "missing_goals": sum(1 for m in J if m.get("home_goals") is None or m.get("away_goals") is None),
        "duplicate_keys": 0,
    }
    keys = {}
    for m in J:
        k = (m["date"], m["competition"], m["home"], m["away"])
        keys[k] = keys.get(k, 0) + 1
    audit["duplicate_keys"] = sum(1 for v in keys.values() if v > 1)
    M = sorted(J, key=lambda m: (m["date"], m["competition"]))
    audit["order_is_sorted"] = [(m["date"], m["competition"]) for m in J] == [(m["date"], m["competition"]) for m in M]
    audit["n_matches"] = len(M)
    audit["competition_counts"] = {c: sum(1 for m in M if m["competition"] == c) for c in ("J1", "J2", "J3")}
    return M, audit

M, AUDIT = load_matches()
TEAMS = sorted({m["home"] for m in M} | {m["away"] for m in M})
IDX = {t: i for i, t in enumerate(TEAMS)}
T = len(TEAMS)

def outcome(m):
    h, a = m["home_goals"], m["away_goals"]
    return 1 if h > a else (0 if h == a else 2)   # 1=ホーム, 0=引分, 2=アウェイ（toto表記）

def fit(train, lam):
    """学習試合 train のみを使って推定。戻り値: (パラメータ, 収束情報)"""
    yh = np.array([m["home_goals"] for m in train], float)
    ya = np.array([m["away_goals"] for m in train], float)
    hi = np.array([IDX[m["home"]] for m in train]); ai = np.array([IDX[m["away"]] for m in train])
    def nll(p):
        att, dfn, ha, mu = p[:T], p[T:2*T], p[2*T], p[2*T+1]
        lh = mu + ha + att[hi] - dfn[ai]; la = mu + att[ai] - dfn[hi]
        ll = (yh * lh - np.exp(lh)).sum() + (ya * la - np.exp(la)).sum()
        return -ll + lam * ((att ** 2).sum() + (dfn ** 2).sum())
    p0 = np.zeros(2 * T + 2); p0[2 * T + 1] = math.log(1.3)
    r = minimize(nll, p0, method="L-BFGS-B")
    info = {"success": bool(r.success), "nit": int(r.nit), "message": str(r.message),
            "finite": bool(np.all(np.isfinite(r.x))), "fun": float(r.fun)}
    return r.x, info

def probs(p, home, away):
    att, dfn, ha, mu = p[:T], p[T:2*T], p[2*T], p[2*T+1]
    i, j = IDX[home], IDX[away]
    lh = math.exp(mu + ha + att[i] - dfn[j]); la = math.exp(mu + att[j] - dfn[i])
    P = np.outer(poisson.pmf(range(K), lh), poisson.pmf(range(K), la))
    tail = 1.0 - P.sum()          # 0..9 の外側の確率質量（正規化前に記録）
    P = P / P.sum()
    return np.array([np.trace(P), np.tril(P, -1).sum(), np.triu(P, 1).sum()]), tail

def baseline(n):
    assert len(M[:n]) == n
    c = np.bincount([outcome(x) for x in M[:n]], minlength=3) / n
    return np.array([c[0], c[1], c[2]])

def metrics(P, Y):
    P = np.array(P); Y = np.array(Y)
    acc = float((P.argmax(1) == Y).mean())
    oh = np.zeros_like(P); oh[np.arange(len(Y)), Y] = 1
    brier = float(((P - oh) ** 2).sum(1).mean())
    ll = float((-np.log(np.clip(P[np.arange(len(Y)), Y], 1e-12, 1))).mean())
    return {"n": int(len(Y)), "accuracy": acc, "brier": brier, "logloss": ll,
            "draw_argmax_count": int((P.argmax(1) == 0).sum())}

def main():
    # 漏れチェック: 評価試合 n の学習は M[:n] のみ（インデックス n より前）
    fits = {}; conv = {}; tails = []
    for n in range(min(WARMS), len(M)):
        for lam in LAMS:
            train = M[:n]
            assert len(train) == n and train[-1] is M[n - 1], "漏れ: 学習が評価試合以降を含む"
            p, info = fit(train, lam)
            info["train_len"] = len(train)
            fits[(n, lam)] = p; conv[(n, lam)] = info
    results = {"audit": AUDIT, "snapshot": "data/audit/history_snapshot_gpt_96fdd4a.json", "tables": {}, "convergence": {}}
    for warm in WARMS:
        ns = list(range(warm, len(M)))
        Y = [outcome(M[n]) for n in ns]
        table = {}
        table["baseline"] = metrics([baseline(n) for n in ns], Y)
        for lam in LAMS:
            P = []
            for n in ns:
                q, tail = probs(fits[(n, lam)], M[n]["home"], M[n]["away"]); P.append(q); tails.append(tail)
            table[f"lambda_{lam:g}"] = metrics(P, Y)
        results["tables"][str(warm)] = table
        results["convergence"][str(warm)] = {
            f"lambda_{lam:g}": {
                "fits": len(ns),
                "not_success": sum(1 for n in ns if not conv[(n, lam)]["success"]),
                "non_finite": sum(1 for n in ns if not conv[(n, lam)]["finite"]),
            } for lam in LAMS}
        results["convergence"][str(warm)]["leakage_check"] = all(
            conv[(n, lam)]["train_len"] == n for n in ns for lam in LAMS)
    results["grid_tail_mass_max"] = float(max(tails))
    results["grid_tail_mass_mean"] = float(np.mean(tails))
    os.makedirs(os.path.dirname(OUT_JSON), exist_ok=True)
    json.dump(results, open(OUT_JSON, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(json.dumps(results, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
