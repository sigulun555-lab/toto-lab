import json, math, random, sys
INPUT = sys.argv[1]
EVAL_START = '2026-09-01'
H = [r for r in json.load(open(INPUT, encoding='utf-8'))['history']
     if isinstance(r.get('home_goals'), int) and isinstance(r.get('away_goals'), int)]
H.sort(key=lambda r: (r['date'], r['competition'], r['home'], r['away']))
for r in H:
    r['matchId'] = f"{r['date']}|{r['competition']}|{r['home']}|{r['away']}"
def pois(l, k): return math.exp(-l) * l ** k / math.factorial(k)
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
    Hh = D = A = 0.0
    for i in range(11):
        for j in range(11):
            p = pois(hx, i) * pois(ax, j)
            if i > j: Hh += p
            elif i == j: D += p
            else: A += p
    t = Hh + D + A
    return {'1': Hh / t, '0': D / t, '2': A / t}
def outcome(m):
    return '1' if m['home_goals'] > m['away_goals'] else ('0' if m['home_goals'] == m['away_goals'] else '2')
VARIANTS = {
    'k0_w12': {}, 'k6_w12': {'shrink': 6}, 'k8_w12': {'shrink': 8},
    'k10_w12': {'shrink': 10}, 'k6_w8': {'shrink': 6, 'window': 8},
    'k6_w10': {'shrink': 6, 'window': 10}, 'k6_w16': {'shrink': 6, 'window': 16},
}
def run(cfg):
    rows = []
    for i, m in enumerate(H):
        if m['date'] < EVAL_START: continue
        prior = [x for x in H[:i] if x['date'] < m['date']]
        if not prior: continue
        p = predict(prior, m['home'], m['away'], cfg)
        rows.append({'matchId': m['matchId'], 'date': m['date'], 'competition': m['competition'],
                     'actual': outcome(m), 'pH': p['1'], 'pD': p['0'], 'pA': p['2']})
    return rows
def pm(r):
    return -math.log(max({'1': r['pH'], '0': r['pD'], '2': r['pA']}[r['actual']], 1e-12))
def brier(r):
    return (r['pH']-(r['actual']=='1'))**2+(r['pD']-(r['actual']=='0'))**2+(r['pA']-(r['actual']=='2'))**2
def metrics(rows):
    n=len(rows)
    ll=sum(pm(r) for r in rows)/n; br=sum(brier(r) for r in rows)/n
    acc=sum(max(('1',r['pH']),('0',r['pD']),('2',r['pA']),key=lambda x:x[1])[0]==r['actual'] for r in rows)/n
    return n, len({r['date'] for r in rows}), round(ll,4), round(br,4), round(acc*100,2)
def boot_diff(a, b, reps=5000, seed=1):
    bm={r['matchId']:r for r in b}
    dates=sorted({r['date'] for r in a}); byd={d:[] for d in dates}
    for r in a:
        q=bm[r['matchId']]; byd[r['date']].append((pm(r)-pm(q), brier(r)-brier(q)))
    rnd=random.Random(seed); sl=[]; sb=[]
    for _ in range(reps):
        s=[x for _ in dates for x in byd[rnd.choice(dates)]]
        sl.append(sum(x[0] for x in s)/len(s)); sb.append(sum(x[1] for x in s)/len(s))
    sl.sort(); sb.sort()
    n=sum(len(v) for v in byd.values())
    ml=sum(x[0] for v in byd.values() for x in v)/n
    mb=sum(x[1] for v in byd.values() for x in v)/n
    return dict(LL=(round(ml,4),round(sl[int(.025*reps)],4),round(sl[int(.975*reps)],4)),
                BR=(round(mb,4),round(sb[int(.025*reps)],4),round(sb[int(.975*reps)],4)))
res={k:run(c) for k,c in VARIANTS.items()}
for k,v in res.items(): print(k, metrics(v))
print('--- paired vs k6_w12 (candidate minus k6): mean, 95% date-block CI')
for k in ['k0_w12','k8_w12','k10_w12','k6_w8','k6_w10','k6_w16']:
    print(k, boot_diff(res[k], res['k6_w12']))
print('--- paired vs k0_w12')
print('k6_w12', boot_diff(res['k6_w12'], res['k0_w12']))
print('--- by league: k10 vs k6')
for lg in ['J1','J2','J3']:
    a=[r for r in res['k10_w12'] if r['competition']==lg]; b=[r for r in res['k6_w12'] if r['competition']==lg]
    print(lg, metrics(a), metrics(b))
