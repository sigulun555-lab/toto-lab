"""Paired date-block bootstrap for LogLoss and Brier (candidate minus reference).
Usage: python3 -I boot_brier.py  (reads rev2_0to10_pred_*.csv written by t1_t2_repro_rev2_0to10.py)"""
import csv, random, math
def load(name):
    out = {}
    for r in csv.DictReader(open(f'rev2_0to10_pred_{name}.csv', encoding='utf-8')):
        y = {'1': (1, 0, 0), '0': (0, 1, 0), '2': (0, 0, 1)}[r['actual']]
        p = (float(r['pH']), float(r['pD']), float(r['pA']))
        ll = -math.log(max(p[{'1': 0, '0': 1, '2': 2}[r['actual']]], 1e-12))
        br = sum((p[i] - y[i]) ** 2 for i in range(3))
        out[r['matchId']] = (r['date'], ll, br)
    return out
def boot(a, b, idx, reps=10000, seed=7):
    keys = list(a.keys()); dates = sorted({a[k][0] for k in keys})
    byd = {d: [] for d in dates}
    for k in keys: byd[a[k][0]].append(a[k][idx] - b[k][idx])
    rnd = random.Random(seed); st = []
    for _ in range(reps):
        s = [x for _ in dates for x in byd[rnd.choice(dates)]]
        st.append(sum(s) / len(s))
    st.sort(); mean = sum(sum(v) for v in byd.values()) / len(keys)
    return round(mean, 4), round(st[int(.025 * reps)], 4), round(st[int(.975 * reps)], 4), len(dates), len(keys)
L = {n: load(n) for n in ['T1_k0_baseline', 'T1_k6', 'T1_k8', 'T1_k10', 'T2_with_boost(DC+boost+k6)', 'T2_without_boost(DC+k6)']}
for label, a, b in [('k10-k6', 'T1_k10', 'T1_k6'), ('k8-k6', 'T1_k8', 'T1_k6'), ('k6-k0', 'T1_k6', 'T1_k0_baseline'),
                    ('k10-k0', 'T1_k10', 'T1_k0_baseline'), ('T2noboost-T2boost', 'T2_without_boost(DC+k6)', 'T2_with_boost(DC+boost+k6)')]:
    print(label, 'LL', boot(L[a], L[b], 1), 'BR', boot(L[a], L[b], 2))
