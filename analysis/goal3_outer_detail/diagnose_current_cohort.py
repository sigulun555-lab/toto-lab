#!/usr/bin/env python3
"""Research-only current-cohort diagnostics for GOAL3 k=6 vs k=10."""
from __future__ import annotations
import argparse
import csv
import hashlib
import json
import math
import random
import sys
from collections import defaultdict
from pathlib import Path

import numpy as np


K_GRID = (4.0, 6.0, 8.0, 10.0, 12.0)
REPLICATES = 10000


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def brier(p, actual):
    return float(sum((p[i] - (1.0 if i == actual else 0.0)) ** 2 for i in range(4)))


def logloss(p, actual):
    return float(-math.log(max(1e-12, float(p[actual]))))


def score_rows(rows, p_key):
    return {
        "brier": float(np.mean([brier(r[p_key], r["actual"]) for r in rows])),
        "logloss": float(np.mean([logloss(r[p_key], r["actual"]) for r in rows])),
        "accuracy": float(np.mean([int(np.argmax(r[p_key]) == r["actual"]) for r in rows])),
    }


def date_bootstrap(rows, field, reps=REPLICATES):
    groups = defaultdict(list)
    for row in rows:
        groups[row["date"]].append(row)
    keys = sorted(groups)
    rng = random.Random(1)
    values = []
    for _ in range(reps):
        chosen = rng.choices(keys, k=len(keys))
        sample = [row for key in chosen for row in groups[key]]
        values.append(float(np.mean([row[field] for row in sample])))
    return np.percentile(np.asarray(values), [2.5, 97.5], method="linear").tolist()


def calibration(rows, p_key):
    result = []
    edges = np.linspace(0.0, 1.0, 11)
    for category in range(4):
        probs = np.asarray([r[p_key][category] for r in rows], dtype=float)
        outcomes = np.asarray([int(r["actual"] == category) for r in rows], dtype=float)
        bins = []
        ece = 0.0
        nonempty = 0
        for i in range(10):
            mask = (probs >= edges[i]) & ((probs < edges[i + 1]) if i < 9 else (probs <= edges[i + 1]))
            count = int(mask.sum())
            if count:
                nonempty += 1
                mean_p = float(probs[mask].mean())
                observed = float(outcomes[mask].mean())
                ece += count / len(rows) * abs(mean_p - observed)
                bins.append({"bin": i, "n": count, "meanPredicted": mean_p, "observedRate": observed})
        result.append({
            "category": category,
            "meanPredicted": float(probs.mean()),
            "observedRate": float(outcomes.mean()),
            "ece10": float(ece),
            "nonemptyBins": nonempty,
            "bins": bins,
        })
    return result


def poisson_diagnostics(rows, p_key):
    enriched = []
    for r in rows:
        p = r[p_key]
        if p[0] <= 0 or p[1] <= 0:
            raise ValueError(f"nonpositive p0/p1 for {r['match']} {r['side']} {p_key}")
        lam = float(p[1] / p[0])
        reconstructed = [
            math.exp(-lam),
            lam * math.exp(-lam),
            (lam * lam / 2.0) * math.exp(-lam),
            1.0 - math.exp(-lam) * (1.0 + lam + lam * lam / 2.0),
        ]
        max_error = max(abs(float(a) - float(b)) for a, b in zip(p, reconstructed))
        if max_error > 2e-8:
            raise ValueError(f"Poisson vector reconstruction mismatch {max_error} for {r['match']} {r['side']}")
        residual = (r["actualGoals"] - lam) / math.sqrt(lam)
        enriched.append({
            **r,
            "poissonRate": lam,
            "pearsonResidual": float(residual),
            "pearsonResidualSquared": float(residual * residual),
            "poissonVectorMaxAbsError": float(max_error),
        })
    return enriched


def residual_summary(rows):
    return {
        "n": len(rows),
        "meanResidual": float(np.mean([r["pearsonResidual"] for r in rows])),
        "meanSquaredPearsonResidual": float(np.mean([r["pearsonResidualSquared"] for r in rows])),
        "dispersionDateBlock95": date_bootstrap(rows, "pearsonResidualSquared"),
        "maxPoissonVectorAbsError": float(max(r["poissonVectorMaxAbsError"] for r in rows)),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--gpt-root", required=True)
    ap.add_argument("--predictions", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()

    root = Path(args.gpt_root).resolve()
    repo = root / "verification" / "goal3_independent"
    sys.path.insert(0, str(repo))
    import nested_validation as nv

    history_path = root / "data" / "history.json"
    alias_path = root / "data" / "team_aliases.json"
    csv_path = repo / "2025.csv"
    history_doc = json.loads(history_path.read_text(encoding="utf-8"))
    alias_doc = json.loads(alias_path.read_text(encoding="utf-8"))
    aliases = alias_doc["aliases"]
    raw_history = history_doc["history"]

    h2025, h2026 = nv.load_data(str(history_path), str(alias_path), str(csv_path))
    dates = sorted({m["date"] for m in h2026})
    outer_starts = sorted(set(int(len(dates) * f) for f in nv.OUTER_START_FRACTIONS))
    test_dates = []
    fold_of = {}
    for fold_no, start in enumerate(outer_starts, 1):
        if start <= int(len(dates) * nv.INNER_START_FRACTION) or start >= len(dates):
            continue
        end = outer_starts[fold_no] if fold_no < len(outer_starts) else len(dates)
        for date in dates[start:end]:
            fold_of[date] = fold_no
            test_dates.append(date)

    comp = {}
    for m in raw_history:
        if m.get("competition") in ("J1", "J2", "J3") and isinstance(m.get("home_goals"), int) and isinstance(m.get("away_goals"), int):
            key = (m["date"], nv.canonical(m["home"], aliases), nv.canonical(m["away"], aliases))
            if key in comp:
                raise ValueError(f"duplicate canonical competition key: {key}")
            comp[key] = m["competition"]

    portable = json.loads(Path(args.predictions).read_text(encoding="utf-8"))
    portable_by_key = {(r["date"], r["match"], r["side"]): r for r in portable["targets"]}
    all_rows = []
    fit_records = []
    for date in test_dates:
        prior = nv.select_training(h2025, h2026, date, "2026_only")
        if any(m["date"] >= date for m in prior):
            raise AssertionError("temporal leakage in current-cohort diagnostic")
        fits = {}
        for k in K_GRID:
            params, idx, info = nv.fit_shrinkage(prior, k)
            if not info.get("success"):
                raise RuntimeError(f"optimizer failure for date={date}, k={k}: {info}")
            fits[k] = (params, idx)
            fit_records.append({
                "date": date, "k": k, "trainingMatches": len(prior),
                "success": info["success"], "iterations": info["nit"], "status": info["status"],
            })
        for m in [x for x in h2026 if x["date"] == date]:
            match_id = f'{date}|{m["home"]}|{m["away"]}'
            league = comp[(date, m["home"], m["away"])]
            for side, team, goals in (("home", m["home"], m["hg"]), ("away", m["away"], m["ag"])):
                rec = {
                    "date": date, "league": league, "match": match_id, "side": side,
                    "team": team, "fold": fold_of[date], "cutoffExclusive": date,
                    "actualGoals": int(goals), "actual": nv.bin_goals(goals),
                    "pByK": {},
                }
                for k in K_GRID:
                    params, idx = fits[k]
                    ph, pa = nv.predict_shrinkage(params, idx, m["home"], m["away"])
                    probs = ph if side == "home" else pa
                    rec["pByK"][str(int(k))] = [round(float(x), 10) for x in probs]
                key = (date, match_id, side)
                old = portable_by_key.get(key)
                if old is None:
                    raise ValueError(f"current diagnostic target missing from portable output: {key}")
                if old["actual"] != rec["actual"]:
                    raise ValueError(f"actual-category mismatch for {key}")
                for k in (6, 10):
                    delta = max(abs(a-b) for a, b in zip(old[f"p_k{k}"], rec["pByK"][str(k)]))
                    if delta > 1e-10:
                        raise ValueError(f"portable script probability mismatch for {key}, k={k}: {delta}")
                all_rows.append(rec)

    if len(all_rows) != len(portable["targets"]):
        raise ValueError(f"target count mismatch: diagnostic={len(all_rows)}, portable={len(portable['targets'])}")

    # Scores and paired differences for the local k-sensitivity grid.
    metric_by_k = {}
    for k in K_GRID:
        key = str(int(k))
        scored = []
        for row in all_rows:
            p = row["pByK"][key]
            scored.append({
                **row,
                "brier": brier(p, row["actual"]),
                "logloss": logloss(p, row["actual"]),
                "accuracy": float(int(np.argmax(p) == row["actual"])),
            })
        metric_by_k[key] = {
            "brier": float(np.mean([r["brier"] for r in scored])),
            "logloss": float(np.mean([r["logloss"] for r in scored])),
            "accuracy": float(np.mean([r["accuracy"] for r in scored])),
        }

    baseline = {r["date"]: [] for r in all_rows}
    for row in all_rows:
        baseline[row["date"]].append(row)
    paired = []
    for row in all_rows:
        p6, p10 = row["pByK"]["6"], row["pByK"]["10"]
        paired.append({
            **row,
            "dB": brier(p6, row["actual"]) - brier(p10, row["actual"]),
            "dL": logloss(p6, row["actual"]) - logloss(p10, row["actual"]),
            "dAcc": float(int(np.argmax(p6) == row["actual"]) - int(np.argmax(p10) == row["actual"])),
        })
    paired_summary = {
        "meanDeltaBrier": float(np.mean([r["dB"] for r in paired])),
        "deltaBrierDateBlock95": date_bootstrap(paired, "dB"),
        "meanDeltaLogLoss": float(np.mean([r["dL"] for r in paired])),
        "deltaLogLossDateBlock95": date_bootstrap(paired, "dL"),
        "meanDeltaAccuracy": float(np.mean([r["dAcc"] for r in paired])),
        "deltaAccuracyDateBlock95": date_bootstrap(paired, "dAcc"),
    }
    full_b = paired_summary["meanDeltaBrier"]
    full_l = paired_summary["meanDeltaLogLoss"]
    date_flips = {"brier": 0, "logloss": 0}
    for date in sorted(baseline):
        remain = [r for r in paired if r["date"] != date]
        date_flips["brier"] += int((np.mean([r["dB"] for r in remain]) >= 0) != (full_b >= 0))
        date_flips["logloss"] += int((np.mean([r["dL"] for r in remain]) >= 0) != (full_l >= 0))

    # Calibration for the two fixed comparison arms.
    calibration_by_k = {}
    for k in (6, 10):
        key = str(k)
        cal_rows = [{"actual":r["actual"],f"p_k{k}":r["pByK"][key]} for r in all_rows]
        calibration_by_k[key] = calibration(cal_rows, f"p_k{k}")

    # Pearson residuals from raw observed goal counts and the implied Poisson rates.
    residual_by_k = {}
    residual_rows = {}
    for k in (6, 10):
        key = str(k)
        base_rows = [{
            "date":r["date"],"league":r["league"],"match":r["match"],"side":r["side"],
            "actualGoals":r["actualGoals"],"actual":r["actual"],f"p_k{k}":r["pByK"][key]
        } for r in all_rows]
        residual_rows[key] = poisson_diagnostics(base_rows, f"p_k{k}")
        overall = residual_summary(residual_rows[key])
        by_league = {}
        for league in ("J1", "J2", "J3"):
            by_league[league] = residual_summary([r for r in residual_rows[key] if r["league"] == league])
        residual_by_k[key] = {"overall":overall,"byLeague":by_league}

    residual_delta_rows = []
    r6 = {(r["date"],r["match"],r["side"]):r for r in residual_rows["6"]}
    r10 = {(r["date"],r["match"],r["side"]):r for r in residual_rows["10"]}
    for key in r6:
        a,b=r6[key],r10[key]
        residual_delta_rows.append({
            "date":a["date"],
            "deltaDispersion":a["pearsonResidualSquared"]-b["pearsonResidualSquared"],
        })
    residual_dispersion_delta = {
        "meanDeltaK6MinusK10":float(np.mean([r["deltaDispersion"] for r in residual_delta_rows])),
        "dateBlock95":date_bootstrap(residual_delta_rows,"deltaDispersion"),
    }

    # Leave-one-team-out is descriptive only; remove both sides of every match involving that team.
    teams = sorted({(r["league"], r["team"]) for r in all_rows})
    team_sensitivity = {}
    for metric, field in (("brier","dB"),("logloss","dL")):
        flips = 0
        for team in teams:
            # Remove both team-side targets from every match involving this league/team.
            involved = {r["match"] for r in all_rows if (r["league"], r["team"]) == team}
            remain = [r for r in paired if r["match"] not in involved]
            value = float(np.mean([r[field] for r in remain]))
            flips += int((value >= 0) != (paired_summary["meanDeltaBrier"] >= 0 if metric=="brier" else paired_summary["meanDeltaLogLoss"] >= 0))
        team_sensitivity[metric] = {"clusterCount":len(teams),"signFlips":flips}

    # Source and alias-map quality.
    eligible_raw = [m for m in raw_history if m.get("competition") in ("J1","J2","J3")]
    fetched = [m.get("fetchedAt") for m in eligible_raw]
    alias_counts = defaultdict(int)
    occurrences = 0
    for m in eligible_raw:
        for side in ("home","away"):
            occurrences += 1
            raw_name = m[side]
            if aliases.get(raw_name, raw_name) != raw_name:
                alias_counts[raw_name] += 1
    raw_keys = [(m.get("date"),m.get("competition"),m.get("home"),m.get("away")) for m in eligible_raw]
    canonical_keys = [(m.get("date"),m.get("competition"),nv.canonical(m.get("home"),aliases),nv.canonical(m.get("away"),aliases)) for m in eligible_raw]
    alias_updated = alias_doc.get("updatedAt")
    before_alias = [d for d in sorted({r["date"] for r in all_rows}) if isinstance(alias_updated,str) and d < alias_updated]

    report = {
        "scope":"current pinned GPT main input; retrospective 2026_only outer dates; research-only",
        "diagnosticScriptSha256":sha256(__file__),
        "portablePredictionsSha256":sha256(args.predictions),
        "inputProvenance":{
            "historyPath":str(history_path),"historySha256":sha256(history_path),
            "historyRows":len(eligible_raw),"historyDistinctDates":len({m["date"] for m in eligible_raw}),
            "historyUniqueRawMatchKeys":len(set(raw_keys)),"historyDuplicateRawMatchKeys":len(raw_keys)-len(set(raw_keys)),
            "historyUniqueCanonicalMatchKeys":len(set(canonical_keys)),"historyDuplicateCanonicalMatchKeys":len(canonical_keys)-len(set(canonical_keys)),
            "historyFetchedAtUniqueCount":len(set(fetched)),"historyFetchedAtValues":sorted({x for x in fetched if x}),
            "historySourceValues":sorted({m.get("source") for m in eligible_raw if m.get("source")}),
            "aliasMapPath":str(alias_path),"aliasMapSha256":sha256(alias_path),
            "aliasMapUpdatedAt":alias_updated,"historyTeamNameOccurrences":occurrences,
            "aliasMappedOccurrences":sum(alias_counts.values()),"uniqueAliasKeysUsed":len(alias_counts),
            "targetDates":sorted({r["date"] for r in all_rows}),
            "targetDatesBeforeAliasMapUpdate":before_alias,
            "targetDatesBeforeAliasMapUpdateCount":len(before_alias),
            "2025CsvSha256":sha256(csv_path),
        },
        "cohort":{
            "historyMatches":len(h2026),"historyDates":len(dates),
            "outerDates":len(test_dates),"outerMatches":len(all_rows)//2,"teamSideTargets":len(all_rows),
            "outerDateRange":[min(test_dates),max(test_dates)],
            "foldCounts":{str(f):sum(1 for d in test_dates if fold_of[d]==f) for f in sorted(set(fold_of.values()))},
        },
        "localKSensitivity":{
            "grid":[int(k) for k in K_GRID],
            "metricsByK":metric_by_k,
            "interpretation":"Exploratory local grid around k=6/10 only; not the historical 16-candidate selection procedure and not an adoption test."
        },
        "pairedK6MinusK10":paired_summary,
        "leaveOneDateOutSignFlips":date_flips,
        "leaveOneTeamOutSignFlips":team_sensitivity,
        "calibrationByK":calibration_by_k,
        "poissonPearsonResiduals":residual_by_k,
        "poissonDispersionK6MinusK10":residual_dispersion_delta,
        "fitDiagnostics":{
            "fitCount":len(fit_records),"failureCount":sum(not x["success"] for x in fit_records),
            "minTrainingMatches":min(x["trainingMatches"] for x in fit_records),
            "maxTrainingMatches":max(x["trainingMatches"] for x in fit_records),
            "maxIterations":max(x["iterations"] for x in fit_records),
        },
        "portableOutputCrossCheck":{
            "targetRows":len(portable["targets"]),
            "maxP6P10AbsError":max(
                max(abs(a-b) for a,b in zip(
                    portable_by_key[(r["date"],r["match"],r["side"])][f"p_k{k}"],
                    r["pByK"][str(k)]
                ))
                for r in all_rows for k in (6,10)
            ),
            "tolerance":1e-10,
        },
        "limitations":[
            "The history is a community mirror snapshot, not an official publication-time feed.",
            "All history rows share one fetchedAt timestamp; first-known availability at each target date is unproven.",
            "The current alias map is dated 2026-10-22; target dates before that update use a retrospective map, not an as-of map.",
            "The local k grid is a sensitivity analysis, not the historical 16-candidate sweep and not a prospective adoption test.",
            "Only 19 outer dates are available; the 20-round prospective threshold is not met.",
        ],
        "allTargetRows":all_rows,
    }

    out=Path(args.out)
    out.parent.mkdir(parents=True,exist_ok=True)
    if out.exists():
        raise FileExistsError(f"refusing to overwrite existing output: {out}")
    out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(json.dumps({
        "cohort":report["cohort"],
        "localKSensitivity":report["localKSensitivity"]["metricsByK"],
        "pairedK6MinusK10":report["pairedK6MinusK10"],
        "leaveOneDateOutSignFlips":date_flips,
        "leaveOneTeamOutSignFlips":team_sensitivity,
        "calibrationByK":{k:[{x:y for x,y in c.items() if x!="bins"} for c in v] for k,v in calibration_by_k.items()},
        "poissonPearsonResiduals":{k:{"overall":v["overall"],"byLeague":{l:{x:y for x,y in s.items() if x!="dispersionDateBlock95"} for l,s in v["byLeague"].items()}} for k,v in residual_by_k.items()},
        "poissonDispersionK6MinusK10":residual_dispersion_delta,
        "fitDiagnostics":report["fitDiagnostics"],
        "portableOutputCrossCheck":report["portableOutputCrossCheck"],
        "inputProvenance":report["inputProvenance"],
    },ensure_ascii=False,indent=2))


if __name__ == "__main__":
    main()
