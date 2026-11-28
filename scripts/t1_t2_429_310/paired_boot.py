import csv, math, random, sys, json
D = sys.argv[1]
SEED, REPS = 20261117, 10000
def load(name):
    return list(csv.DictReader(open(f"{D}/rev2_0to10_pred_{name}.csv", encoding="utf-8")))
def ll_row(r):
    p = {'1': float(r['pH']), '0': float(r['pD']), '2': float(r['pA'])}[r['actual']]
    return -math.log(max(p, 1e-12))
def br_row(r):
    pH, pD, pA = float(r['pH']), float(r['pD']), float(r['pA'])
    a = r['actual']
    return (pH-(a=='1'))**2 + (pD-(a=='0'))**2 + (pA-(a=='2'))**2
def metric(rows, fn): return sum(fn(r) for r in rows) / len(rows)
def paired(cand, base, fn):
    # align by matchId
    bm = {r['matchId']: r for r in base}
    pairs = [(c, bm[c['matchId']]) for c in cand]
    dates = sorted({c['date'] for c, _ in pairs})
    byd = {d: [] for d in dates}
    for c, b in pairs: byd[c['date']].append(fn(c) - fn(b))
    rnd = random.Random(SEED); stats = []
    for _ in range(REPS):
        s = [x for _ in dates for x in byd[rnd.choice(dates)]]
        stats.append(sum(s) / len(s))
    stats.sort()
    mean = sum(sum(v) for v in byd.values()) / len(pairs)
    return mean, stats[int(.025*REPS)], stats[int(.975*REPS)]
names = {'k0':'T1_k0_baseline','k6':'T1_k6','k8':'T1_k8','k10':'T1_k10'}
R = {k: load(v) for k, v in names.items()}
out = {}
for cand, base in [('k10','k6'),('k8','k6'),('k6','k0')]:
    for mname, fn in [('LogLoss', ll_row), ('Brier', br_row)]:
        m, lo, hi = paired(R[cand], R[base], fn)
        out[f"{cand}-{base} {mname}"] = {'mean': round(m,4), 'ci_lo': round(lo,4), 'ci_hi': round(hi,4)}
print(json.dumps(out, ensure_ascii=False, indent=1))
print('n', len(R['k6']), 'dates', len({r['date'] for r in R['k6']}))
for k in ['k0','k6','k8','k10']:
    print(k, 'LL', round(metric(R[k], ll_row),4), 'Brier', round(metric(R[k], br_row),4), 'acc', round(sum(max(('1',float(r['pH'])),('0',float(r['pD'])),('2',float(r['pA'])),key=lambda x:x[1])[0]==r['actual'] for r in R[k])/len(R[k]),4))
