import json, math, os, sys, csv, unicodedata
HERE=os.path.abspath('verification/goal3_independent')
sys.path.insert(0,HERE)
import nested_validation as nv
import numpy as np
ROOT=os.path.abspath('.')
h2025,h2026=nv.load_data('data/history.json','data/team_aliases.json','verification/goal3_independent/2025.csv')
# competition-aware 2026 list, same filters/canonical/sort as load_data
aliases=json.load(open('data/team_aliases.json',encoding='utf-8'))['aliases']
raw=json.load(open('data/history.json',encoding='utf-8'))['history']
t26=[]
for m in raw:
    if m.get('competition') not in ('J1','J2','J3'): continue
    if not isinstance(m.get('home_goals'),int) or not isinstance(m.get('away_goals'),int): continue
    t26.append({'date':m['date'],'home':nv.canonical(m['home'],aliases),'away':nv.canonical(m['away'],aliases),
                'hg':int(m['home_goals']),'ag':int(m['away_goals']),'comp':m['competition'],'src':m.get('source')})
t26.sort(key=lambda m:(m['date'],m['home'],m['away']))
assert len(t26)==len(h2026)
dates=sorted({m['date'] for m in h2026})
outer_starts=sorted(set(int(len(dates)*f) for f in nv.OUTER_START_FRACTIONS))
test_dates=[]
for fold_no,start_idx in enumerate(outer_starts,1):
    if start_idx<=int(len(dates)*nv.INNER_START_FRACTION) or start_idx>=len(dates): continue
    td=dates[start_idx:(outer_starts[fold_no] if fold_no<len(outer_starts) else len(dates))]
    for d in td: test_dates.append((fold_no,d))
print('outer test dates', len(test_dates), 'folds', sorted({f for f,_ in test_dates}))
rows=[]
cache={}
for fold,date in test_dates:
    prior=nv.select_training(h2025,h2026,date,'2026_only')
    fits={}
    for lam in (6.0,10.0):
        params,idx,info=nv.fit_shrinkage(prior,lam)
        fits[lam]=(params,idx,info)
    for m in [x for x in t26 if x['date']==date]:
        rec={'fold':fold,'date':date,'comp':m['comp'],'home':m['home'],'away':m['away'],'hg':m['hg'],'ag':m['ag']}
        for lam in (6.0,10.0):
            params,idx,info=fits[lam]
            ph,pa=nv.predict_shrinkage(params,idx,m['home'],m['away'])
            rec[f'k{int(lam)}_home']=ph; rec[f'k{int(lam)}_away']=pa
            rec[f'fit_ok_k{int(lam)}']=info['success']
        rows.append(rec)
print('matches', len(rows), 'team-sides', 2*len(rows))
json.dump(rows,open('goal3_outer_matches.json','w'),ensure_ascii=False)
