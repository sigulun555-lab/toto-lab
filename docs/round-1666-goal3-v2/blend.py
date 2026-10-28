import json

# v1: Claude's shrinkage-Poisson model (lambda=10, 2026-only), as submitted
# for round 1666 (predictions/round_1666_Claude_goal3.jsonl).
v1 = {
    ("1","水戸ホーリーホック","home"): [0.2455,0.3448,0.2421,0.1675],
    ("1","セレッソ大阪","away"):       [0.3008,0.3613,0.2171,0.1208],
    ("2","横浜Ｆ・マリノス","home"):   [0.2902,0.3590,0.2221,0.1287],
    ("2","サンフレッチェ広島","away"): [0.2424,0.3435,0.2434,0.1706],
    ("3","名古屋グランパス","home"):   [0.1948,0.3186,0.2606,0.2260],
    ("3","浦和レッズ","away"):         [0.2507,0.3468,0.2399,0.1625],
}

# market: toto ONE (totoone.jp) purchase-ratio ("購入割合") for round 1666
# GOAL3, screenshot provided by user, captured 2026-10-28 16:20 JST.
# Source is the toto ONE portal's user base, not the official toto-dream.com
# page directly -- noted as a caveat.
market = {
    ("1","水戸ホーリーホック","home"):   [0.35,0.37,0.18,0.08],
    ("1","セレッソ大阪","away"):         [0.16,0.31,0.32,0.19],
    ("2","横浜Ｆ・マリノス","home"):     [0.24,0.36,0.26,0.12],
    ("2","サンフレッチェ広島","away"):   [0.16,0.29,0.32,0.21],
    ("3","名古屋グランパス","home"):     [0.20,0.35,0.28,0.16],
    ("3","浦和レッズ","away"):           [0.18,0.35,0.28,0.16],
}

# Weight carried over from round 1665's 1X2 market blend (Claude V2 logic,
# MARKET_WEIGHT = 0.7). NOT independently derived or validated for GOAL3's
# goal-bracket targets -- this is a first prototype, not a production value.
MARKET_WEIGHT = 0.7

def blend(model_p, market_p, w=MARKET_WEIGHT):
    raw = [w*m + (1-w)*p for m, p in zip(market_p, model_p)]
    s = sum(raw)
    return [x/s for x in raw]

def argmax(p):
    return max(range(len(p)), key=lambda i: p[i])

def label(i):
    return "3+" if i == 3 else str(i)

results = []
for key in v1:
    match_no, team, side = key
    v1p = v1[key]
    mp = market[key]
    v2p = blend(v1p, mp)
    results.append({
        "matchNumber": match_no, "team": team, "side": side,
        "v1_probabilities": [round(x,4) for x in v1p], "v1_pred": label(argmax(v1p)),
        "market_probabilities": mp, "market_pred": label(argmax(mp)),
        "v2_probabilities": [round(x,4) for x in v2p], "v2_pred": label(argmax(v2p)),
        "v1_vs_v2_agree": argmax(v1p) == argmax(v2p),
    })

print(json.dumps({
    "round": 1666, "marketWeight": MARKET_WEIGHT,
    "marketSource": "toto ONE (totoone.jp) purchase ratio, screenshot 2026-10-28T16:20+09:00, not official toto-dream.com page",
    "note": "Trial blend only. v1 (submitted) prediction is unchanged. MARKET_WEIGHT carried over from round 1665's 1X2 blend, unvalidated for GOAL3.",
    "results": results,
}, ensure_ascii=False, indent=2))
