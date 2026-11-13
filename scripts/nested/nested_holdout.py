# Nested holdout for shrinkage k (rev3). Inner selection uses inner-period matches only;
# outer period scored once with the k chosen inside. Run from repo root: python3 scripts/nested/nested_holdout.py
import math, random, sys, csv
sys.path.insert(0, 'scripts/nested')
from rev2_core import H, predict, outcome
INNER_START, INNER_END = '2026-10-03', '2026-10-20'
OUTER_START, OUTER_END = '2026-10-21', '2026-11-01'
KS = [0, 4, 6, 8, 10, 12]
def cfg(k): return {} if k == 0 else {'shrink': k}
def rows_for(c, start, end):
    out = []
    for i, m in enumerate(H):
        if not (start <= m['date'] <= end): continue
        prior = [x for x in H[:i] if x['date'] < m['date']]
        if not prior: continue
        p = predict(prior, m['home'], m['away'], c)
        out.append({'matchId': m['matchId'], 'date': m['date'], 'competition': m['competition'],
                    'actual': outcome(m), 'pH': p['1'], 'pD': p['0'], 'pA': p['2']})
    return out
def ll(rows): return sum(-math.log(max({'1': r['pH'], '0': r['pD'], '2': r['pA']}[r['actual']], 1e-12)) for r in rows) / len(rows)
inner = {k: rows_for(cfg(k), INNER_START, INNER_END) for k in KS}
inner_ll = {k: ll(inner[k]) for k in KS}
k_sel = min(KS, key=lambda k: inner_ll[k])
print('inner n=%d' % len(inner[0]), {k: round(v, 6) for k, v in inner_ll.items()}, 'selected k =', k_sel)
outer = {k: rows_for(cfg(k), OUTER_START, OUTER_END) for k in KS}
for k in KS:
    rs = outer[k]; n = len(rs)
    br = sum((r['pH'] - (r['actual'] == '1')) ** 2 + (r['pD'] - (r['actual'] == '0')) ** 2 + (r['pA'] - (r['actual'] == '2')) ** 2 for r in rs) / n
    acc = sum(max(('1', r['pH']), ('0', r['pD']), ('2', r['pA']), key=lambda x: x[1])[0] == r['actual'] for r in rs) / n
    print('outer k=%-2d n=%d LL=%.4f Brier=%.4f Acc=%.4f' % (k, n, ll(rs), br, acc))
sel, base = outer[k_sel], outer[0]
assert [r['matchId'] for r in sel] == [r['matchId'] for r in base]
lo = lambda r: -math.log(max({'1': r['pH'], '0': r['pD'], '2': r['pA']}[r['actual']], 1e-12))
dates = sorted({r['date'] for r in sel}); byd = {d: [] for d in dates}
for a, b in zip(sel, base): byd[a['date']].append(lo(a) - lo(b))
rnd = random.Random(1); st = []
for _ in range(10000):
    s = [x for _ in dates for x in byd[rnd.choice(dates)]]; st.append(sum(s) / len(s))
st.sort(); mean = sum(sum(v) for v in byd.values()) / len(sel)
print('outer LL diff (selected k - k0): mean=%.4f 95%%CI=[%.4f, %.4f] dates=%d n=%d' % (mean, st[249], st[9749], len(dates), len(sel)))
with open('scripts/nested/nested_outer_selected_k%d.csv' % k_sel, 'w', newline='', encoding='utf-8') as f:
    w = csv.DictWriter(f, fieldnames=list(sel[0].keys())); w.writeheader(); w.writerows(sel)
