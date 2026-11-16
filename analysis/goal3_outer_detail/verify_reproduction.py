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
    return subprocess.check_output(
        ["git", "-C", root, "rev-parse", spec], text=True
    ).strip()


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


def bootstrap(rows, field: str):
    groups = defaultdict(list)
    for row in rows:
        groups[row["date"]].append(row)
    keys = sorted(groups)
    assert len(keys) == 17, f"expected 17 date clusters, got {len(keys)}"

    rng = random.Random(1)
    samples = []
    for _ in range(10000):
        picked = rng.choices(keys, k=len(keys))
        sample = [row for key in picked for row in groups[key]]
        samples.append(float(np.mean([row[field] for row in sample])))
    return np.percentile(np.asarray(samples), [2.5, 97.5]).tolist()


def check_output(manifest, generated_path: str, claude_root: str, log_path: str) -> None:
    expected = manifest["protocol"]["expected"]
    reference_path = str(Path(claude_root) / manifest["claude"]["referencePath"])
    generated = load_json(generated_path)
    reference = load_json(reference_path)

    assert generated == reference, "clean-checkout output differs from Claude's pinned 472-target JSON"
    assert generated["window"] == "2026_only"
    assert generated["k"] == [6, 10]

    rows = generated["targets"]
    assert len(rows) == manifest["protocol"]["targets"] == 472
    keys = {(r["date"], r["match"], r["side"]) for r in rows}
    matches = {r["match"] for r in rows}
    dates = {r["date"] for r in rows}
    assert len(keys) == 472, "duplicate target keys"
    assert len(matches) == 236
    assert len(dates) == 17

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
    assert all(sides == {"home", "away"} for sides in per_match.values())

    mean_b = float(np.mean([r["dB"] for r in rows]))
    mean_l = float(np.mean([r["dL"] for r in rows]))
    ci_b = bootstrap(rows, "dB")
    ci_l = bootstrap(rows, "dL")

    values = [
        (mean_b, expected["meanDeltaBrier"], "mean ΔBrier"),
        (mean_l, expected["meanDeltaLogLoss"], "mean ΔLogLoss"),
        (ci_b[0], expected["deltaBrier95"][0], "Brier CI lower"),
        (ci_b[1], expected["deltaBrier95"][1], "Brier CI upper"),
        (ci_l[0], expected["deltaLogLoss95"][0], "LogLoss CI lower"),
        (ci_l[1], expected["deltaLogLoss95"][1], "LogLoss CI upper"),
    ]
    for actual, target, label in values:
        assert abs(actual - target) <= 5e-10, f"{label} mismatch: {actual} != {target}"

    log = Path(log_path).read_text(encoding="utf-8")
    assert "targets 472 dates 17 matches 236" in log
    assert "date-block 95% CI" in log

    digest = hashlib.sha256(Path(generated_path).read_bytes()).hexdigest()
    print(f"Reference JSON exact structural parity: PASS")
    print(f"Targets={len(rows)} matches={len(matches)} dates={len(dates)}")
    print(f"mean ΔBrier={mean_b:.12f}; 95% CI={ci_b}")
    print(f"mean ΔLogLoss={mean_l:.12f}; 95% CI={ci_l}")
    print(f"Generated JSON SHA-256={digest}")
    print("Probability simplex, paired home/away coverage, and date cutoffs: PASS")


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
