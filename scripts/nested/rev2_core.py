import json, math
INPUT = 'scripts/t1_t2/history_gpt_main_45295867.json'
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
    t = Hh + D + A
    return {'1': Hh / t, '0': D / t, '2': A / t}
def outcome(m):
    return '1' if m['home_goals'] > m['away_goals'] else ('0' if m['home_goals'] == m['away_goals'] else '2')
