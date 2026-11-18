#!/usr/bin/env python3
"""Supplemental 50k PCG64 date-block sensitivity for GOAL3 research only."""
import argparse
import hashlib
import json
import math
from collections import defaultdict
from pathlib import Path
import numpy as np

def prob(row, k, current=False):
    return row["pByK"][str(k)] if current else row[f"p_k{k}"]

def scores(rows, current=False):
    out = {}
    for k in (6, 10):
        p = np.asarray([prob(r, k, current) for r in rows], dtype=float)
        y = np.asarray([int(r["actual"]) for r in rows], dtype=int)
        one = np.eye(4)[y]
        out[str(k)] = {
            "brier": float(np.mean(np.sum((p-one)**2, axis=1))),
            "logloss": float(np.mean(-np.log(np.maximum(1e-12, p[np.arange(len(y)), y])))),
            "accuracy": float(np.mean(np.argmax(p, axis=1) == y)),
        }
    out["delta_k6_minus_k10"] = {
        m: out["6"][m] - out["10"][m] for m in ("brier", "logloss", "accuracy")
    }
    return out

def row_deltas(rows, current=False):
    vals = []
    for r in rows:
        p6, p10 = np.asarray(prob(r, 6, current)), np.asarray(prob(r, 10, current))
        y = int(r["actual"]); one = np.eye(4)[y]
        vals.append((
            float(np.sum((p6-one)**2) - np.sum((p10-one)**2)),
            float(-math.log(max(1e-12, p6[y])) + math.log(max(1e-12, p10[y]))),
            float(int(np.argmax(p6)==y) - int(np.argmax(p10)==y)),
        ))
    return vals

def date_bootstrap(rows, values, reps=50000, seed=1):
    groups = defaultdict(lambda: np.zeros(len(values[0])+1, dtype=float))
    for row, val in zip(rows, values):
        groups[row["date"]][:-1] += np.asarray(val, dtype=float)
        groups[row["date"]][-1] += 1.0
    dates = sorted(groups)
    stats = np.stack([groups[d] for d in dates])
    rng = np.random.default_rng(seed)  # PCG64
    chosen = rng.integers(0, len(dates), size=(reps, len(dates)))
    totals = stats[chosen].sum(axis=1)
    means = totals[:, :-1] / totals[:, -1, None]
    q = np.quantile(means, [0.025, 0.975], axis=0, method="linear")
    return {"replicates": reps, "seed": seed, "rng": "NumPy PCG64 via default_rng",
            "unit": "date block; sorted unique dates sampled with replacement",
            "ci95": [[float(x) for x in q[0]], [float(x) for x in q[1]]]}

def ece10(rows, k, current=False):
    p = np.asarray([prob(r, k, current) for r in rows], dtype=float)
    y = np.asarray([int(r["actual"]) for r in rows], dtype=int)
    edges = np.linspace(0.0, 1.0, 11); out = []
    for cat in range(4):
        pr = p[:, cat]; obs = (y == cat).astype(float); ece = 0.0; nonempty = 0
        for i in range(10):
            mask = (pr >= edges[i]) & ((pr < edges[i+1]) if i < 9 else (pr <= edges[i+1]))
            n = int(mask.sum())
            if n:
                nonempty += 1
                ece += n/len(rows) * abs(float(pr[mask].mean()) - float(obs[mask].mean()))
        out.append({"category":cat,"meanPredicted":float(pr.mean()),
                    "observedRate":float(obs.mean()),"ece10":float(ece),"nonemptyBins":nonempty})
    return out

def poisson(rows, reps=50000, seed=2):
    by_k = {}; sq_by_k = {}
    for k in (6, 10):
        residuals=[]; squares=[]; maxerr=0.0
        for r in rows:
            p=np.asarray(r["pByK"][str(k)],dtype=float)
            if p[0] <= 0 or p[1] <= 0: raise ValueError("nonpositive p0/p1")
            lam=float(p[1]/p[0])
            rec=np.asarray([math.exp(-lam),lam*math.exp(-lam),
                lam*lam/2*math.exp(-lam),1-math.exp(-lam)*(1+lam+lam*lam/2)])
            maxerr=max(maxerr,float(np.max(np.abs(p-rec))))
            e=(int(r["actualGoals"])-lam)/math.sqrt(lam)
            residuals.append(float(e)); squares.append(float(e*e))
        if maxerr > 2e-8: raise ValueError(f"Poisson vector reconstruction error {maxerr}")
        by_k[str(k)]={"n":len(rows),"meanResidual":float(np.mean(residuals)),
            "meanSquaredPearsonResidual":float(np.mean(squares)),
            "maxPoissonVectorAbsError":maxerr}
        sq_by_k[str(k)]=squares
    ci6=date_bootstrap(rows,[(x,) for x in sq_by_k["6"]],reps,seed)
    ci10=date_bootstrap(rows,[(x,) for x in sq_by_k["10"]],reps,seed)
    delta=np.asarray(sq_by_k["6"])-np.asarray(sq_by_k["10"])
    dc=date_bootstrap(rows,[(x,) for x in delta],reps,seed)
    by_k["6"]["dispersionDateBlock95"]=[ci6["ci95"][0][0],ci6["ci95"][1][0]]
    by_k["10"]["dispersionDateBlock95"]=[ci10["ci95"][0][0],ci10["ci95"][1][0]]
    return {"byK":by_k,"dispersionDeltaK6MinusK10":{
        "mean":float(delta.mean()),"dateBlock95":[dc["ci95"][0][0],dc["ci95"][1][0]],"bootstrap":dc}}

def k_grid(rows):
    y=np.asarray([int(r["actual"]) for r in rows]); one=np.eye(4)[y]; out={}
    for k in (4,6,8,10,12):
        p=np.asarray([r["pByK"][str(k)] for r in rows],dtype=float)
        out[str(k)]={"brier":float(np.mean(np.sum((p-one)**2,axis=1))),
            "logloss":float(np.mean(-np.log(np.maximum(1e-12,p[np.arange(len(y)),y])))),
            "accuracy":float(np.mean(np.argmax(p,axis=1)==y))}
    return out

def sha256(path):
    h=hashlib.sha256()
    with open(path,"rb") as f:
        for chunk in iter(lambda:f.read(1024*1024),b""): h.update(chunk)
    return h.hexdigest()

def analyze(hist, current_predictions, diagnostics, manifest, reps=50000, seed=1):
    cur=diagnostics["allTargetRows"]
    hcounts=(len(hist),len({r["match"] for r in hist}),len({r["date"] for r in hist}))
    ccounts=(len(cur),len({r["match"] for r in cur}),len({r["date"] for r in cur}))
    if hcounts!=(472,236,17): raise ValueError(f"historical cohort changed: {hcounts}")
    if ccounts!=(480,240,19): raise ValueError(f"current cohort changed: {ccounts}")
    pm={(r["date"],r["match"],r["side"]):r for r in current_predictions}
    cm={(r["date"],r["match"],r["side"]):r for r in cur}
    if set(pm)!=set(cm): raise ValueError("current portable/diagnostic keys differ")
    for key,a in pm.items():
        b=cm[key]
        if int(a["actual"])!=int(b["actual"]): raise ValueError(f"actual mismatch {key}")
        for k in (6,10):
            if max(abs(x-y) for x,y in zip(a[f"p_k{k}"],b["pByK"][str(k)]))>1e-10:
                raise ValueError(f"probability mismatch {key} k={k}")
    hs=scores(hist); cs=scores(cur,True)
    he=manifest["protocol"]["historicalReference"]["expected"]
    ce=manifest["protocol"]["currentReproduction"]["expected"]
    for got,want,label in ((hs["delta_k6_minus_k10"]["brier"],he["meanDeltaBrier"],"472 Brier"),
                           (hs["delta_k6_minus_k10"]["logloss"],he["meanDeltaLogLoss"],"472 LogLoss"),
                           (cs["delta_k6_minus_k10"]["brier"],ce["meanDeltaBrier"],"480 Brier"),
                           (cs["delta_k6_minus_k10"]["logloss"],ce["meanDeltaLogLoss"],"480 LogLoss")):
        if abs(got-want)>5e-10: raise ValueError(f"{label} point estimate mismatch")
    return {
      "scope":"research-only; no production adoption",
      "method":{"bootstrap":"50,000 date-block replicates; NumPy PCG64; seed=1; percentile 2.5/97.5",
        "unit":"date block; pooled sums divided by pooled row count",
        "calibration":"one-vs-rest ECE10, equal-width bins",
        "poisson":"lambda=p1/p0; reconstruct 0/1/2/3+ vector; Pearson residual=(actualGoals-lambda)/sqrt(lambda)"},
      "historical472":{"targets":hcounts[0],"matches":hcounts[1],"dates":hcounts[2],
        "scores":hs,"pcg64Bootstrap":date_bootstrap(hist,row_deltas(hist),reps,seed),
        "calibrationEce10":{str(k):ece10(hist,k) for k in (6,10)},
        "originalInputShaManifestAvailable":manifest["claude"].get("historicalReferenceOriginalInputManifestAvailable",False)},
      "current480":{"targets":ccounts[0],"matches":ccounts[1],"dates":ccounts[2],
        "scores":cs,"pcg64Bootstrap":date_bootstrap(cur,row_deltas(cur,True),reps,seed),
        "calibrationEce10":{str(k):ece10(cur,k,True) for k in (6,10)},
        "poissonResiduals":poisson(cur,reps,seed+1),"kGrid":k_grid(cur),
        "dataQuality":diagnostics["inputProvenance"],"limitations":diagnostics.get("limitations",[])},
      "pinnedCommits":{"claude":manifest["claude"]["commit"],"gpt":manifest["gpt"]["commit"]},
      "adoption":{"baseline":"k=10","candidate":"k=6","decision":"no adoption; both score-difference intervals include zero; retrospective cohort below prospective threshold"}
    }

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--historical",required=True);ap.add_argument("--current",required=True)
    ap.add_argument("--diagnostics",required=True);ap.add_argument("--manifest",required=True)
    ap.add_argument("--out",required=True);ap.add_argument("--replicates",type=int,default=50000)
    ap.add_argument("--seed",type=int,default=1);a=ap.parse_args()
    hist=json.loads(Path(a.historical).read_text(encoding="utf-8"))["targets"]
    cur=json.loads(Path(a.current).read_text(encoding="utf-8"))["targets"]
    diag=json.loads(Path(a.diagnostics).read_text(encoding="utf-8"))
    manifest=json.loads(Path(a.manifest).read_text(encoding="utf-8"))
    result=analyze(hist,cur,diag,manifest,a.replicates,a.seed)
    result["inputSha256"]={"historical472":sha256(a.historical),"current480Portable":sha256(a.current),
        "current480Diagnostics":sha256(a.diagnostics),"manifest":sha256(a.manifest)}
    Path(a.out).parent.mkdir(parents=True,exist_ok=True)
    Path(a.out).write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({"historical472":result["historical472"]["scores"]["delta_k6_minus_k10"],
      "historical472CI":result["historical472"]["pcg64Bootstrap"]["ci95"],
      "current480":result["current480"]["scores"]["delta_k6_minus_k10"],
      "current480CI":result["current480"]["pcg64Bootstrap"]["ci95"],
      "poissonDispersionDelta":result["current480"]["poissonResiduals"]["dispersionDeltaK6MinusK10"],
      "output":a.out},ensure_ascii=False,indent=2))

if __name__=="__main__": main()
