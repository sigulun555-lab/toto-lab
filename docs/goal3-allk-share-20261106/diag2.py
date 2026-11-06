import json, math, os, sys
sys.path.insert(0,'verification/goal3_independent')
import nested_validation as nv
import numpy as np
from collections import defaultdict
h2025,h2026=nv.load_data('data/history.json','data/team_aliases.json','verification/goal3_independent/2025.csv')
raw=json.load(open('data/history.json',encoding='utf-8'))['history']
al=json.load(open('data/team_aliases.json',encoding='utf-8'))['aliases']
t26=[]
for m in raw:
    if m.get('competition') not in ('J1','J2','J3'): continue
    t26.append({'date':m['date'],'home':nv.canonical(m['home'],al),'away':nv.canonical(m['away'],al),'hg':int(m['home_goals']),'ag':int(m['away_goals']),'comp':m['competition']})
t26.sort(key=lambda m:(m['date'],m['home'],m['away']))
dates=sorted({m['date'] for m in h2026})
starts=sorted(set(int(len(dates)*f) for f in nv.OUTER_START_FRACTIONS))
td=[]
for fi,s in enumerate(starts,1):
    if s<=int(len(dates)*nv.INNER_START_FRACTION) or s>=len(dates): continue
    e=starts[fi] if fi<len(starts) else len(dates)
    td+=[(fi,d) for d in dates[s:e]]
KS=[0.5,1,2,3,4,6,8,10,15,20,30,50,75,100,150,200]
recs=[]  # per team-side: fold, comp, date, side, actual, {k:probs}
for fold,date in td:
    prior=nv.select_training(h2025,h2026,date,'2026_only')
    fits={}
    for k in KS:
        params,idx,info=nv.fit_shrinkage(prior,k)
        fits[k]=(params,idx)
    for m in [x for x in t26 if x['date']==date]:
        for side,g in (('home',m['hg']),('away',m['ag'])):
            rec={'fold':fold,'comp':m['comp'],'date':date,'side':side,'actual':nv.bin_goals(g),'g':g,'P':{}}
            for k in KS:
                params,idx=fits[k]
                ph,pa=nv.predict_shrinkage(params,idx,m['home'],m['away'])
                rec['P'][k]=ph if side=='home' else pa
            recs.append(rec)
print('team-sides',len(recs))
# --- 1. k-sensitivity (diagnostic, all k), pooled and by league
def sc(rs,k):
    n=len(rs); b=sum(sum((r['P'][k][c]-(c==r['actual']))**2 for c in range(4)) for r in rs)/n
    l=sum(-math.log(max(1e-12,r['P'][k][r['actual']])) for r in rs)/n
    a=sum(max(range(4),key=lambda c:r['P'][k][c])==r['actual'] for r in rs)/n
    return b,l,a
print('\n== k-sensitivity (outer test, diagnostic only)')
print('k      Brier     LL       acc   | J1 Brier  J2 Brier  J3 Brier')
for k in KS:
    b,l,a=sc(recs,k)
    bj=[sc([r for r in recs if r['comp']==c],k)[0] for c in ('J1','J2','J3')]
    print(f"{k:<6} {b:.6f} {l:.6f} {a:.3f} | {bj[0]:.6f} {bj[1]:.6f} {bj[2]:.6f}")
# --- 2. calibration on k=6 and k=10 (category-level reliability, pooled)
def calib(k,label):
    print(f'\n== calibration k={k} ({label})')
    for c in range(4):
        pairs=sorted([(r['P'][k][c], int(r['actual']==c)) for r in recs])
        n=len(pairs); bins=5
        out=[]
        for i in range(bins):
            seg=pairs[i*n//bins:(i+1)*n//bins]
            out.append((sum(p for p,_ in seg)/len(seg), sum(o for _,o in seg)/len(seg), len(seg)))
        mp=sum(p for p,_ in pairs)/n; ob=sum(o for _,o in pairs)/n
        print(f"  cat{c}: mean pred {mp:.3f} vs observed {ob:.3f} | quintiles(pred→obs,n): "+"; ".join(f"{p:.2f}→{o:.2f}({m})" for p,o,m in out))
calib(6,'pooled'); calib(10,'pooled')
# --- 3. Poisson residual diagnostics: observed vs predicted category freq, by side, dispersion
print('\n== residual diagnostics (k=6)')
for side in ('home','away'):
    rs=[r for r in recs if r['side']==side]
    obs=[sum(1 for r in rs if r['actual']==c)/len(rs) for c in range(4)]
    pr=[sum(r['P'][6][c] for r in rs)/len(rs) for c in range(4)]
    print(f"  {side}: observed {[round(x,3) for x in obs]} vs predicted {[round(x,3) for x in pr]}")
gs=[r['g'] for r in recs]; mean=sum(gs)/len(gs); var=sum((g-mean)**2 for g in gs)/(len(gs)-1)
print(f"  goals mean {mean:.3f}, variance {var:.3f}, dispersion (var/mean) {var/mean:.3f}")
# by league dispersion
for c in ('J1','J2','J3'):
    g=[r['g'] for r in recs if r['comp']==c]; m=sum(g)/len(g); v=sum((x-m)**2 for x in g)/(len(g)-1)
    print(f"  {c}: n={len(g)} mean {m:.3f} var {v:.3f} var/mean {v/m:.3f}")
json.dump([{k2:(v2 if k2!='P' else {str(kk):vv for kk,vv in v2.items()}) for k2,v2 in r.items()} for r in recs],open('goal3_outer_allk.json','w'))
