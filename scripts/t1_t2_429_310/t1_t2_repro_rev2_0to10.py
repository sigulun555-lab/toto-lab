"""T1/T2 reproduction script (Claude side).
Input: history.json from sigulun555-lab/gpt main, blob sha 45295867fa1db03ae2876ad2a0d2f20742566da5.
Protocol: chronological walk-forward. For each eval match (date >= 2026-09-01) the model uses only
matches with date strictly earlier than the match date (same-day matches are excluded).
Outputs per-match predictions as CSV and summary metrics."""
import json, math, random, csv, sys
INPUT = sys.argv[1] if len(sys.argv) > 1 else 'history_main.json'
EVAL_START = '2026-09-01'
H = [r for r in json.load(open(INPUT, encoding='utf-8'))['history']
     if isinstance(r.get('home_goals'), int) and isinstance(r.get('away_goals'), int)]
H.sort(key=lambda r: (r['date'], r['competition'], r['home'], r['away']))
for r in H:
    r['matchId'] = f"{r['date']}|{r['competition']}|{r['home']}|{r['away']}"

def pois(l, k): return math.exp(-l) * l ** k / math.factorial(k)
def tau(h, a, x, y, rho):
    if h == 0 and a == 0: return 1 - x * y * rho
    if h == 0 and a == 1: return 1 + x * rho
    if h == 1 and a == 0: return 1 + y * rho
    if h == 1 and a == 1: return 1 - rho
    return 1.0

def predict(prior, home, away, cfg):
    la = sum(m['home_goals'] for m in prior) / len(prior)
    aa = sum(m['away_goals'] for m in prior) / len(prior)
    base = (la + aa) / 2
    def stats(team):
        ms = [m for m in prior if m['home'] == team or m['away'] == team][-cfg.get('window', 12):]
        n = len(ms)
        if n == 0: return 1.0, 1.0
        gf = [m['home_goals'] if m['home'] == team else m['away_goals'] for m in ms]
        ga = [m['away_goals'] if m['home'] == team else m['home_goals'] for m in ms]
        af = (sum(gf) / n) / base; de = (sum(ga) / n) / base
        k = cfg.get('shrink')
        if k:
            s = n / (n + k); af = 1 + (af - 1) * s; de = 1 + (de - 1) * s
        return af, de
    ah, dh = stats(home); aw, dw = stats(away)
    hx = max(.15, min(3.5, la * ah * dw)); ax = max(.15, min(3.5, aa * aw * dh))
    rho = cfg.get('rho', 0.0)
    Hh = D = A = 0.0
    for i in range(11):
        for j in range(11):
            p = pois(hx, i) * pois(ax, j) * tau(i, j, hx, ax, rho)
            if i > j: Hh += p
            elif i == j: D += p
            else: A += p
    t = Hh + D + A; ph, pd, pa = Hh / t, D / t, A / t
    if cfg.get('boost'):
        thr, amt = cfg['boost']; gap = abs(ph - pa)
        if gap < thr:
            b = amt * (1 - gap / thr); sh = ph / (ph + pa); sa = pa / (ph + pa)
            pd += b; ph -= b * sh; pa -= b * sa
    return {'1': ph, '0': pd, '2': pa}

VARIANTS = {
    'T1_k0_baseline': {},
    'T1_k4': {'shrink': 4}, 'T1_k6': {'shrink': 6}, 'T1_k8': {'shrink': 8},
    'T1_k10': {'shrink': 10}, 'T1_k12': {'shrink': 12},
    'T2_with_boost(DC+boost+k6)': {'rho': -0.10, 'boost': (0.30, 0.20), 'shrink': 6},
    'T2_without_boost(DC+k6)': {'rho': -0.10, 'shrink': 6},
}

def outcome(m):
    return '1' if m['home_goals'] > m['away_goals'] else ('0' if m['home_goals'] == m['away_goals'] else '2')

def run(cfg):
    rows = []
    for i, m in enumerate(H):
        if m['date'] < EVAL_START: continue
        prior = [x for x in H[:i] if x['date'] < m['date']]
        if not prior: continue
        p = predict(prior, m['home'], m['away'], cfg)
        rows.append({'matchId': m['matchId'], 'date': m['date'], 'competition': m['competition'],
                     'home': m['home'], 'away': m['away'], 'actual': outcome(m),
                     'pH': p['1'], 'pD': p['0'], 'pA': p['2']})
    return rows

def metrics(rows):
    n = len(rows)
    ll = sum(-math.log(max({'1': r['pH'], '0': r['pD'], '2': r['pA']}[r['actual']], 1e-12)) for r in rows) / n
    br = sum((r['pH'] - (r['actual'] == '1')) ** 2 + (r['pD'] - (r['actual'] == '0')) ** 2 + (r['pA'] - (r['actual'] == '2')) ** 2 for r in rows) / n
    acc = sum(max(('1', r['pH']), ('0', r['pD']), ('2', r['pA']), key=lambda x: x[1])[0] == r['actual'] for r in rows) / n
    return n, round(ll, 4), round(br, 4), round(acc, 4)

results = {name: run(cfg) for name, cfg in VARIANTS.items()}
for name, rows in results.items():
    print(name, metrics(rows))
    with open(f'rev2_0to10_pred_{name}.csv', 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys())); w.writeheader(); w.writerows(rows)

# T1 vs baseline: date-block bootstrap of log-loss difference (k=6 minus k=0)
def per_match_ll(rows):
    return {r['matchId']: -math.log(max({'1': r['pH'], '0': r['pD'], '2': r['pA']}[r['actual']], 1e-12)) for r in rows}
def bootstrap(a, b, reps=2000, seed=1):
    la, lb = per_match_ll(a), per_match_ll(b)
    dates = sorted({r['date'] for r in a})
    byd = {d: [] for d in dates}
    for r in a: byd[r['date']].append(la[r['matchId']] - lb[r['matchId']])
    rnd = random.Random(seed); stats = []
    for _ in range(reps):
        s = [x for _ in dates for x in byd[rnd.choice(dates)]]
        stats.append(sum(s) / len(s))
    stats.sort(); mean = sum(sum(v) for v in byd.values()) / sum(len(v) for v in byd.values())
    return round(mean, 4), round(stats[int(.025 * reps)], 4), round(stats[int(.975 * reps)], 4)
print('T1 k6 minus k0 logloss diff (mean, 95% date-block bootstrap):', bootstrap(results['T1_k6'], results['T1_k0_baseline']))
print('T2 without boost minus with boost (mean, 95% CI):', bootstrap(results['T2_without_boost(DC+k6)'], results['T2_with_boost(DC+boost+k6)']))
# per league for k6 vs k0
for lg in ['J1', 'J2', 'J3']:
    a = [r for r in results['T1_k6'] if r['competition'] == lg]
    b = [r for r in results['T1_k0_baseline'] if r['competition'] == lg]
    print(lg, 'k0', metrics(b), 'k6', metrics(a))
