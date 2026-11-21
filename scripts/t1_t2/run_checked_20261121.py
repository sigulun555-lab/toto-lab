#!/usr/bin/env python3
"""Guarded, research-only runner for Claude's pinned toto13/T1 reproduction."""
from __future__ import annotations

import argparse
import ast
import hashlib
import json
import subprocess
import sys
from datetime import date
from pathlib import Path

EXPECTED_HISTORY_SHA256 = "29b1cb2110b91a8a8d1f1bc5ced504b3dd8a0e86ee3beddb111a5f2309af4f19"
EXPECTED_HISTORY_ROWS = 429
EXPECTED_DISTINCT_DATES = 37
EXPECTED_MIN_DATE = "2026-08-07"
MAX_HISTORY_DATE = "2026-11-03"
EXPECTED_FETCHED_AT = "2026-11-04T06:17:32.213Z"
EXPECTED_SCRIPT_GIT_BLOB = "79ef0328b2400e202bceb583eb981e5d462821df"

EXPECTED_METRICS = {
    "k0_w12": (310, 26, 1.1229, 0.6671, 44.19),
    "k6_w12": (310, 26, 1.0552, 0.6360, 46.45),
    "k8_w12": (310, 26, 1.0508, 0.6334, 47.74),
    "k10_w12": (310, 26, 1.0486, 0.6321, 48.06),
}
EXPECTED_K10_MINUS_K6_BOOT = {
    "LL": (-0.0066, -0.0159, 0.0022),
    "BR": (-0.0039, -0.0099, 0.0021),
}
ALL_VARIANTS = ("k0_w12", "k6_w12", "k8_w12", "k10_w12", "k6_w8", "k6_w10", "k6_w16")


def validate_history_bytes(
    raw: bytes,
    *,
    expected_sha256: str = EXPECTED_HISTORY_SHA256,
    expected_rows: int = EXPECTED_HISTORY_ROWS,
    expected_distinct_dates: int = EXPECTED_DISTINCT_DATES,
    expected_min_date: str = EXPECTED_MIN_DATE,
    max_date: str = MAX_HISTORY_DATE,
    expected_fetched_at: str = EXPECTED_FETCHED_AT,
) -> dict:
    observed_sha = hashlib.sha256(raw).hexdigest()
    if observed_sha != expected_sha256:
        raise ValueError(f"history SHA-256 mismatch: {observed_sha}")

    try:
        document = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ValueError(f"history is not valid UTF-8 JSON: {exc}") from exc

    rows = document.get("history") if isinstance(document, dict) else None
    if not isinstance(rows, list) or len(rows) != expected_rows:
        raise ValueError(f"history row count mismatch: expected {expected_rows}")

    dates = set()
    fetched_at = set()
    match_keys = set()
    for index, row in enumerate(rows):
        if not isinstance(row, dict):
            raise ValueError(f"history row {index} is not an object")
        row_date = row.get("date")
        try:
            parsed = date.fromisoformat(row_date)
        except (TypeError, ValueError) as exc:
            raise ValueError(f"history row {index} has invalid date") from exc
        if parsed.isoformat() != row_date or row_date > max_date:
            raise ValueError(f"history row {index} exceeds pinned cutoff {max_date}")
        if type(row.get("home_goals")) is not int or type(row.get("away_goals")) is not int:
            raise ValueError(f"history row {index} must contain integer goals")
        if row["home_goals"] < 0 or row["away_goals"] < 0:
            raise ValueError(f"history row {index} contains negative goals")
        for field in ("competition", "home", "away"):
            if not isinstance(row.get(field), str) or not row[field].strip():
                raise ValueError(f"history row {index} is missing {field}")
        fetched = row.get("fetchedAt")
        if not isinstance(fetched, str) or not fetched:
            raise ValueError(f"history row {index} is missing fetchedAt")
        fetched_at.add(fetched)
        dates.add(row_date)
        key = (row_date, row["competition"], row["home"], row["away"])
        if key in match_keys:
            raise ValueError(f"duplicate match key at row {index}: {key}")
        match_keys.add(key)

    if len(dates) != expected_distinct_dates:
        raise ValueError(f"distinct date count mismatch: expected {expected_distinct_dates}")
    if min(dates) != expected_min_date or max(dates) != max_date:
        raise ValueError("history date range does not match the pinned retrospective window")
    if fetched_at != {expected_fetched_at}:
        raise ValueError(f"fetchedAt provenance mismatch: {sorted(fetched_at)}")
    return document


def parse_and_check_output(stdout: str) -> dict:
    metrics = {}
    in_metrics = True
    bootstrap = None
    for line in stdout.splitlines():
        if line.startswith("--- paired vs k6_w12"):
            in_metrics = False
            continue
        if in_metrics:
            for name in ALL_VARIANTS:
                if line.startswith(name + " "):
                    metrics[name] = ast.literal_eval(line[len(name):].strip())
                    break
        elif line.startswith("k10_w12 "):
            bootstrap = ast.literal_eval(line[len("k10_w12 "):].strip())
            break

    missing = [name for name in ALL_VARIANTS if name not in metrics]
    if missing:
        raise ValueError(f"reproduction output is missing variants: {missing}")
    for name, expected in EXPECTED_METRICS.items():
        if tuple(metrics[name]) != expected:
            raise ValueError(f"{name} metrics mismatch: {metrics[name]} != {expected}")
    for name in ("k6_w8", "k6_w10", "k6_w16"):
        if metrics[name][0:2] != (310, 26):
            raise ValueError(f"{name} cohort mismatch: {metrics[name][0:2]}")
    if bootstrap is None:
        raise ValueError("reproduction output is missing the k10-vs-k6 bootstrap line")
    for metric, expected in EXPECTED_K10_MINUS_K6_BOOT.items():
        if tuple(bootstrap.get(metric, ())) != expected:
            raise ValueError(f"k10-vs-k6 {metric} bootstrap mismatch: {bootstrap.get(metric)}")
    return {"metrics": metrics, "k10MinusK6Bootstrap": bootstrap}


def run_checked(history_path: Path, repo_root: Path) -> dict:
    raw = history_path.read_bytes()
    document = validate_history_bytes(raw)
    script = repo_root / "scripts" / "t1_t2" / "repro_v1_20261121.py"
    blob = subprocess.run(
        ["git", "hash-object", str(script)],
        cwd=repo_root, check=True, capture_output=True, text=True,
    ).stdout.strip()
    if blob != EXPECTED_SCRIPT_GIT_BLOB:
        raise ValueError(f"pinned Claude script blob mismatch: {blob}")

    completed = subprocess.run(
        [sys.executable, "-I", str(script), str(history_path)],
        cwd=repo_root, check=True, capture_output=True, text=True,
    )
    checked = parse_and_check_output(completed.stdout)
    return {
        "inputSha256": hashlib.sha256(raw).hexdigest(),
        "inputRows": len(document["history"]),
        "inputDates": len({r["date"] for r in document["history"]}),
        "dateRange": [min(r["date"] for r in document["history"]), max(r["date"] for r in document["history"])],
        "scriptGitBlob": blob,
        **checked,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("history", type=Path)
    args = parser.parse_args()
    result = run_checked(args.history.resolve(), Path(__file__).resolve().parents[2])
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise
