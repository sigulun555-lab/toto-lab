#!/usr/bin/env python3
"""Portable research-only reproduction of the GOAL3 k=6 vs k=10 comparison."""
from __future__ import annotations

import argparse
import hashlib
import importlib
import json
import math
import platform
import random
import statistics
import sys
from pathlib import Path

EXPECTED = {
    "history": "efca00ea491fcfea6a1267af403cb5ba80ae540fca97a076def25815fc318201",
    "aliases": "92e6377068df8dd63935e0c003adfd7b355e7adac23f7aace4f947be4f5f027e",
    "csv": "6175674bc28d4311b219eed5ea2aa5e478fe0f17b8e6b8653f37718057da4288",
    "nested_validation": "1cbd349c4a772e4ba89b2e3c36c6a0396abbeaa618e131cfb100e6b4dae9b",
}


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def verify_sha256(path: Path, expected: str, label: str) -> str:
    observed = sha256_file(path)
    if observed != expected:
        raise ValueError(f"{label} SHA-256 mismatch: expected {expected}, got {observed}")
    return observed


def percentile_indices(values: list[float]) -> tuple[float, float]:
    """Keep Claude's original order-statistic indices; not NumPy linear quantiles."""
    ordered = sorted(values)
    n = len(ordered)
    if n < 2:
        raise ValueError("at least two bootstrap values required")
    return float(ordered[int(.025 * n)]), float(ordered[int(.975 * n) - 1])


def parse_args(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--mod-dir", type=Path, required=True,
                        help="Directory containing pinned nested_validation.py")
    parser.add_argument("--history", type=Path, required=True)
    parser.add_argument("--aliases", type=Path, required=True)
    parser.add_argument("--csv", type=Path, required=True)
    parser.add_argument("--out-dir", type=Path, required=True,
                        help="Dedicated research output directory, never production/shadow")
    parser.add_argument("--seed", type=int, default=1)
    parser.add_argument("--replicates", type=int, default=10_000)
    args = parser.parse_args(argv)
    if args.replicates < 1_000:
        parser.error("--replicates must be >= 1000")
    return args


def load_nv(mod_dir: Path):
    mod_dir = mod_dir.expanduser().resolve()
    module_file = mod_dir / "nested_validation.py"
    if not module_file.is_file():
        raise FileNotFoundError(f"nested_validation.py not found: {module_file}")
    path = str(mod_dir)
    if path not in sys.path:
        sys.path.insert(0, path)
    importlib.invalidate_caches()
    sys.modules.pop("nested_validation", None)
    return importlib.import_module("nested_validation")


def main(argv=None):
    args = parse_args(argv)
    mod_dir = args.mod_dir.expanduser().resolve()
    history_path = args.history.expanduser().resolve()
    aliases_path = args.aliases.expanduser().resolve()
    csv_path = args.csv.expanduser().resolve()
    out_dir = args.out_dir.expanduser().resolve()
    for label, path in (("history", history_path), ("aliases", aliases_path), ("csv", csv_path)):
        if not path.is_file():
            raise FileNotFoundError(f"{label} input not found: {path}")
        verify_sha256(path, EXPECTED[label], label)
    nv_path = mod_dir / "nested_validation.py"
    verify_sha256(nv_path, EXPECTED["nested_validation"], "nested_validation.py")
    nv = load_nv(mod_dir)

    h2025, h2026 = nv.load_data(str(history_path), str(aliases_path), str(csv_path))
    aliases = json.loads(aliases_path.read_text(encoding="utf-8"))["aliases"]
    raw = json.loads(history_path.read_text(encoding="utf-8"))["history"]
    league = {}
    for match in raw:
        if match.get("competition") not in ("J1", "J2", "J3"): continue
        if not isinstance(match.get("home_goals"), int) or not isinstance(match.get("away_goals"), int): continue
        key = (match["date"], nv.canonical(match["home"], aliases), nv.canonical(match["away"], aliases))
        league[key] = match["competition"]

    dates = sorted({match["date"] for match in h2026})
    n = len(dates)
    outer_starts = sorted(set(int(n * f) for f in nv.OUTER_START_FRACTIONS))
    inner_cut = int(n * nv.INNER_START_FRACTION)
    folds = []
    for i, start in enumerate(outer_starts, 1):
        if start <= inner_cut or start >= n: continue
        end = outer_starts[i] if i < len(outer_starts) else n
        folds.append((i, dates[start:end]))

    rows = []
    for fold_no, target_dates in folds:
        for date in target_dates:
            prior = nv.select_training(h2025, h2026, date, "2026_only")
            if not prior: raise ValueError(f"no prior training data for {date}")
            prior_max = max(match["date"] for match in prior)
            if prior_max >= date: raise ValueError(f"same-day/future training leakage at {date}")
            p6, idx6, _ = nv.fit_shrinkage(prior, 6.0)
            p10, idx10, _ = nv.fit_shrinkage(prior, 10.0)
            for match in (x for x in h2026 if x["date"] == date):
                h6, a6 = nv.predict_shrinkage(p6, idx6, match["home"], match["away"])
                h10, a10 = nv.predict_shrinkage(p10, idx10, match["home"], match["away"])
                lg = league.get((date, nv.canonical(match["home"], aliases),
                                 nv.canonical(match["away"], aliases)), "UNKNOWN")
                for side, goal, q6, q10 in (
                    ("home", match["hg"], h6, h10), ("away", match["ag"], a6, a10)
                ):
                    category = nv.bin_goals(goal)
                    if category not in (0, 1, 2, 3): raise ValueError("invalid category")
                    rows.append({
                        "fold": fold_no, "date": date, "league": lg,
                        "match": f'{date}|{match["home"]}|{match["away"]}',
                        "home": match["home"], "away": match["away"], "side": side,
                        "actual": category, "p_k6": [round(float(x), 8) for x in q6],
                        "p_k10": [round(float(x), 8) for x in q10],
                        "cutoff_prior_max_date": prior_max,
                    })

    # Fail closed on cohort drift, duplicate sides, and invalid probability vectors.
    match_keys = [(r["date"], r["league"], r["home"], r["away"]) for r in rows]
    side_keys = [(*key, r["side"]) for key, r in zip(match_keys, rows)]
    if len(side_keys) != len(set(side_keys)): raise ValueError("duplicate target side")
    side_map = {}
    for key, row in zip(match_keys, rows):
        side_map.setdefault(key, set()).add(row["side"])
    if any(sides != {"home", "away"} for sides in side_map.values()):
        raise ValueError("each match must have one home and one away target")
    cohort = {"matches": len(side_map), "team_side_targets": len(rows),
              "dates": len({r["date"] for r in rows})}
    if cohort != {"matches": 236, "team_side_targets": 472, "dates": 17}:
        raise ValueError(f"frozen cohort mismatch: {cohort}")
    for row in rows:
        for key in ("p_k6", "p_k10"):
            p = row[key]
            if len(p) != 4 or any(not math.isfinite(x) or x < 0 or x > 1 for x in p):
                raise ValueError(f"invalid probability vector {key}")
            if abs(sum(p) - 1.0) > 2e-7: raise ValueError(f"simplex violation {key}")
        c = row["actual"]
        b6 = sum((row["p_k6"][j] - (j == c)) ** 2 for j in range(4))
        b10 = sum((row["p_k10"][j] - (j == c)) ** 2 for j in range(4))
        ll6 = -math.log(max(1e-12, row["p_k6"][c]))
        ll10 = -math.log(max(1e-12, row["p_k10"][c]))
        row.update({"brier_k6": b6, "brier_k10": b10, "ll_k6": ll6, "ll_k10": ll10,
                    "D_brier": b6 - b10, "D_ll": ll6 - ll10})
    if any(r["league"] not in ("J1", "J2", "J3") for r in rows):
        raise ValueError("UNKNOWN league in frozen outer cohort")

    mean = lambda values: sum(values) / len(values)
    rng = random.Random(args.seed)

    def bootstrap(metric, cluster_key):
        groups = {}
        for row in rows: groups.setdefault(row[cluster_key], []).append(row)
        keys = sorted(groups)
        sums = {key: (sum(r[metric] for r in groups[key]), len(groups[key])) for key in keys}
        stats = []
        for _ in range(args.replicates):
            total = count = 0
            for key in (keys[rng.randrange(len(keys))] for _ in keys):
                s, nrows = sums[key]
                total += s
                count += nrows
            stats.append(total / count)
        lo, hi = percentile_indices(stats)
        return {"ci95": [lo, hi], "clusters": len(keys), "replicates": args.replicates,
                "rng": "Python random.Random", "seed": args.seed,
                "quantile": "order statistics at floor(.025*B), floor(.975*B)-1"}

    bootstrap_result = {}
    for metric in ("D_brier", "D_ll"):
        bootstrap_result[metric] = {
            "date_block": bootstrap(metric, "date"),
            "match_cluster": bootstrap(metric, "match"),
        }

    leagues = {}
    for lg in ("J1", "J2", "J3"):
        sub = [r for r in rows if r["league"] == lg]
        by_date = {}
        for r in sub: by_date.setdefault(r["date"], []).append(r)
        date_b = [mean([r["D_brier"] for r in group]) for group in by_date.values()]
        date_l = [mean([r["D_ll"] for r in group]) for group in by_date.values()]
        leagues[lg] = {
            "team_sides": len(sub), "matches": len({r["match"] for r in sub}),
            "dates": len(by_date), "D_brier_mean": mean([r["D_brier"] for r in sub]),
            "D_brier_median_date": statistics.median(date_b),
            "D_brier_sd_date": statistics.pstdev(date_b),
            "D_ll_mean": mean([r["D_ll"] for r in sub]),
            "D_ll_median_date": statistics.median(date_l),
            "D_ll_sd_date": statistics.pstdev(date_l),
        }
    calibration = {}
    for key in ("p_k6", "p_k10"):
        calibration[key] = {}
        for c in range(4):
            calibration[key][str(c)] = {
                "mean_pred": mean([r[key][c] for r in rows]),
                "observed": mean([float(r["actual"] == c) for r in rows]),
            }
    accuracy = {
        key: mean([float(max(range(4), key=lambda j: r[key][j]) == r["actual"]) for r in rows])
        for key in ("p_k6", "p_k10")
    }
    summary = {
        "protocol": "17 outer dates, 2026-only training, fixed k=6 vs k=10; research-only",
        "cohort": cohort, "overall": {"D_brier": mean([r["D_brier"] for r in rows]),
                                      "D_ll": mean([r["D_ll"] for r in rows])},
        "bootstrap": bootstrap_result, "leagues": leagues,
        "calibration": calibration, "accuracy": accuracy,
        "limitations": ["Retrospective fixed outer cohort; not prospective evidence.",
                        "17 dates are a small cluster count.",
                        "Bootstrap preserves the legacy Python RNG and order-statistic quantiles.",
                        "No production or market-weight change is performed."],
    }

    out_dir.mkdir(parents=True, exist_ok=True)
    targets_path = out_dir / "goal3_outer_matches.json"
    summary_path = out_dir / "goal3_summary.json"
    manifest_path = out_dir / "run_manifest.json"
    targets_path.write_text(json.dumps(rows, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    summary_path.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    manifest = {
        "cohort": cohort, "inputs": {
            "history": {"basename": history_path.name, "sha256": sha256_file(history_path)},
            "aliases": {"basename": aliases_path.name, "sha256": sha256_file(aliases_path)},
            "csv": {"basename": csv_path.name, "sha256": sha256_file(csv_path)},
            "nested_validation.py": {"sha256": sha256_file(nv_path)},
        },
        "code": {"analysis.py": sha256_file(Path(__file__).resolve())},
        "environment": {"python": platform.python_version(), "rng": "Python random.Random",
                        "seed": args.seed, "replicates": args.replicates,
                        "quantile": "order statistics at floor(.025*B), floor(.975*B)-1"},
        "outputs": {targets_path.name: sha256_file(targets_path),
                    summary_path.name: sha256_file(summary_path)},
    }
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"cohort": cohort, "overall": summary["overall"],
                      "bootstrap": bootstrap_result, "manifest": manifest},
                     ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
