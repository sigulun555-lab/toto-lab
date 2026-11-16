#!/usr/bin/env python3
import argparse
import hashlib
import json
import math
import random
import subprocess
from collections import defaultdict
from pathlib import Path

import numpy as np


def git_value(root: str, spec: str) -> str:
    return subprocess.check_output(["git", "-C", root, "rev-parse", spec], text=True).strip()


def load_json(path: str):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def check_inputs(manifest, gpt_root: str, claude_root: str) -> None:
    gpt = manifest["gpt"]
    claude = manifest["claude"]
    assert git_value(gpt_root, "HEAD") == gpt["commit"], "GPT checkout commit mismatch"
    assert git_value(claude_root, "HEAD") == claude["commit"], "Claude checkout commit mismatch"
    for path, expected in gpt["inputs"].items():
        actual = git_value(gpt_root, "HEAD:" + path)
        assert actual == expected, f"GPT input blob mismatch: {path}: {actual}"
    for path_key, sha_key in (("scriptPath", "scriptBlobSha"), ("referencePath", "referenceBlobSha")):
        path = claude[path_key]
        actual = git_value(claude_root, "HEAD:" + path)
        expected = claude[sha_key]
        assert actual == expected, f"Claude pinned blob mismatch: {path}: {actual}"
    print("Pinned commits and all six Git blob SHAs verified.")


def validate_rows(obj, expected, label):
    assert obj["window"] == "2026_only"
    assert obj["k"] == [6, 10]
    rows = obj["targets"]
    keys = {(r["date"], r["match"], r["side"]) for r in rows}
    matches = {r["match"] for r in rows}
    dates = {r["date"] for r in rows}
    assert len(rows) == expected["targets"], f"{label}: target count {len(rows)}"
    assert len(keys) == expected["targets"], f"{label}: duplicate target key"
    assert len(matches) == expected["matches"], f"{label}: match count {len(matches)}"
    assert len(dates) == expected["dates"], f"{label}: date count {len(dates)}"
    per_match = defaultdict(set)
    for row in rows:
        assert row["cutoff_exclusive"] == row["date"]
        assert row["actual"] in (0, 1, 2, 3)
        per_match[row["match"]].add(row["side"])
        for name in ("p_k6", "p_k10"):
            p = row[name]
            assert len(p) == 4
            assert all(math.isfinite(x) and 0 <= x <= 1 for x in p)
            assert abs(sum(p) - 1.0) <= 1e-8
    assert all(sides == {"home", "away"} for sides in per_match.values()), f"{label}: missing home/away pair"
    return rows, keys


def bootstrap(rows, field: str):
    groups = defaultdict(list)
    for row in rows:
        groups[row["date"]].append(row)
    keys = sorted(groups)
    rng = random.Random(1)
    samples = []
    for _ in range(10000):
        picked = rng.choices(keys, k=len(keys))
        sample = [row for key in picked for row in groups[key]]
        samples.append(float(np.mean([row[field] for row in sample])))
    return np.percentile(np.asarray(samples), [2.5, 97.5], method="linear").tolist()


def summarize(rows):
    return (
        float(np.mean([r["dB"] for r in rows])),
        bootstrap(rows, "dB"),
        float(np.mean([r["dL"] for r in rows])),
        bootstrap(rows, "dL"),
    )


def check_expected(actual, expected, label):
    values = [
        (actual[0], expected["meanDeltaBrier"], "mean ΔBrier"),
        (actual[1][0], expected["deltaBrier95"][0], "Brier CI lower"),
        (actual[1][1], expected["deltaBrier95"][1], "Brier CI upper"),
        (actual[2], expected["meanDeltaLogLoss"], "mean ΔLogLoss"),
        (actual[3][0], expected["deltaLogLoss95"][0], "LogLoss CI lower"),
        (actual[3][1], expected["deltaLogLoss95"][1], "LogLoss CI upper"),
    ]
    for got, want, metric in values:
        assert abs(got - want) <= 5e-10, f"{label} {metric} mismatch: {got} != {want}"


def check_output(manifest, generated_path: str, claude_root: str, log_path: str) -> None:
    reference_path = str(Path(claude_root) / manifest["claude"]["referencePath"])
    historical = load_json(reference_path)
    current = load_json(generated_path)
    old_cfg = manifest["protocol"]["historicalReference"]
    new_cfg = manifest["protocol"]["currentReproduction"]

    old_rows, old_keys = validate_rows(historical, old_cfg, "historical Claude reference")
    new_rows, new_keys = validate_rows(current, new_cfg, "current clean-checkout reproduction")
    old_summary = summarize(old_rows)
    new_summary = summarize(new_rows)
    check_expected(old_summary, old_cfg["expected"], "historical Claude reference")
    check_expected(new_summary, new_cfg["expected"], "current clean-checkout reproduction")

    old_by_key = {(r["date"], r["match"], r["side"]): r for r in old_rows}
    new_by_key = {(r["date"], r["match"], r["side"]): r for r in new_rows}
    common = old_keys & new_keys
    exact_rows = 0
    max_probability_delta = 0.0
    for key in common:
        a, b = old_by_key[key], new_by_key[key]
        if a == b:
            exact_rows += 1
        for name in ("p_k6", "p_k10"):
            max_probability_delta = max(max_probability_delta, max(abs(x-y) for x, y in zip(a[name], b[name])))

    log = Path(log_path).read_text(encoding="utf-8")
    assert "targets 480 dates 19 matches 240" in log
    assert "date-block 95% CI" in log
    digest = hashlib.sha256(Path(generated_path).read_bytes()).hexdigest()

    print(f"Historical Claude reference: {len(old_rows)} targets / {len(old_keys)//2} matches / {len({r['date'] for r in old_rows})} dates")
    print(f"  ΔBrier={old_summary[0]:.14f}; 95% CI={old_summary[1]}")
    print(f"  ΔLogLoss={old_summary[2]:.14f}; 95% CI={old_summary[3]}")
    print(f"Current clean checkout: {len(new_rows)} targets / {len(new_keys)//2} matches / {len({r['date'] for r in new_rows})} dates")
    print(f"  ΔBrier={new_summary[0]:.14f}; 95% CI={new_summary[1]}")
    print(f"  ΔLogLoss={new_summary[2]:.14f}; 95% CI={new_summary[3]}")
    print(f"Historical/current common target keys={len(common)}/{len(old_keys)}; exactly equal rows={exact_rows}; max common-row probability delta={max_probability_delta:.12g}")
    print(f"Generated JSON SHA-256={digest}")
    print("Probability simplex, home/away pairing, unique keys, and date cutoffs: PASS")
    print("Historical and current cohorts verified separately; no same-input equivalence is claimed.")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--manifest", required=True)
    ap.add_argument("--gpt-root", required=True)
    ap.add_argument("--claude-root", required=True)
    ap.add_argument("--check-inputs", action="store_true")
    ap.add_argument("--check-output", action="store_true")
    ap.add_argument("--generated")
    ap.add_argument("--log")
    args = ap.parse_args()
    manifest = load_json(args.manifest)
    if args.check_inputs:
        check_inputs(manifest, args.gpt_root, args.claude_root)
    if args.check_output:
        if not args.generated or not args.log:
            ap.error("--generated and --log are required with --check-output")
        check_output(manifest, args.generated, args.claude_root, args.log)
    if not args.check_inputs and not args.check_output:
        ap.error("select --check-inputs and/or --check-output")


if __name__ == "__main__":
    main()
