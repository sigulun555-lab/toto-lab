import json, math, statistics as st
from collections import defaultdict
rows=json.load(open('goal3_outer_matches.json'))
def cat(g): return min(3,max(0,int(g)))
def sc(p,a):
    b=sum((p[k]-(1.0 if k==a else 0.0))**2 for k in range(4))
    l=-math.log(max(1e-12,p[a])); return b,l
ts=[]  # team-side records
for r in rows:
    for side,g,pk in (('home',r['hg'],'home'),('away',r['ag'],'away')):
        a=cat(g)
        b6,l6=sc(r['k6_'+side],a); b10,l10=sc(r['k10_'+side],a)
        ts.append({'date':r['date'],'comp':r['comp'],'match':f"{r['home']}-{r['away']}",'side':side,'fold':r['fold'],
                   'Db':b6-b10,'Dl':l6-l10,'fit6':r['fit_ok_k6'],'fit10':r['fit_ok_k10']})
def summ(xs,label):
    n=len(xs); db=[x['Db'] for x in xs]; dl=[x['Dl'] for x in xs]
    print(f"{label}: team-sides={n} matches={n//2} dates={len({x['date'] for x in xs})}")
    for name,v in (('Brier D',db),('LogLoss D',dl)):
        print(f"   {name}: mean={sum(v)/n:+.6f} median={st.median(v):+.6f} sd={st.pstdev(v):.6f} min={min(v):+.4f} max={max(v):+.4f}")
summ(ts,'ALL')
for c in ('J1','J2','J3'):
    xs=[x for x in ts if x['comp']==c]
    if xs: summ(xs,c)
# date-level mean D per league
print('\nper-date mean D (Brier, LL), by league')
for c in ('J1','J2','J3'):
    dd=defaultdict(list)
    for x in ts:
        if x['comp']==c: dd[x['date']].append(x)
    for d in sorted(dd):
        xs=dd[d]; mb=sum(x['Db'] for x in xs)/len(xs); ml=sum(x['Dl'] for x in xs)/len(xs)
        flag='  <-Brier警戒' if mb>=0.05 else ''
        flag+='  <-LL警戒' if ml>=0.10 else ''
        print(f"  {c} {d} n={len(xs)} Brier={mb:+.4f} LL={ml:+.4f}{flag}")
# warning-threshold counts at league-date level
for c in ('J1','J2','J3'):
    dd=defaultdict(list)
    for x in ts:
        if x['comp']==c: dd[x['date']].append(x)
    tot=len(dd)
    if tot==0: continue
    nb=sum(1 for xs in dd.values() if sum(x['Db'] for x in xs)/len(xs)>=0.05)
    nl=sum(1 for xs in dd.values() if sum(x['Dl'] for x in xs)/len(xs)>=0.10)
    print(f"{c}: league-dates={tot}, Brier>=+0.05: {nb} ({nb/tot:.0%}), LL>=+0.10: {nl} ({nl/tot:.0%})")
# overall paired bootstrap by date (sanity vs GPT)
import random
dates=sorted({x['date'] for x in ts}); byd=defaultdict(list)
for x in ts: byd[x['date']].append(x)
rnd=random.Random(1); B=[]; L=[]
for _ in range(10000):
    s=[x for d in [rnd.choice(dates) for _ in dates] for x in byd[d]]
    B.append(sum(x['Db'] for x in s)/len(s)); L.append(sum(x['Dl'] for x in s)/len(s))
B.sort(); L.sort()
print('\noverall date-block bootstrap 95% CI: Brier', round(B[249],6), round(B[9749],6), ' LL', round(L[249],6), round(L[9749],6))
print('fit failures k6/k10:', sum(not x['fit6'] for x in ts), sum(not x['fit10'] for x in ts))
