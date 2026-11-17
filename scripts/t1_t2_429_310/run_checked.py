#!/usr/bin/env python3
"""Fail-closed wrapper for the pinned toto13 T1/T2 429-row research input.

This is a research-only guard. It does not change the canonical prediction
logic. The canonical script is executed unchanged after validating the exact
input bytes and the exact top-level history array consumed by that script.

Usage:
  python3 -I run_checked.py <path/to/history.json>
"""
import hashlib
import json
import os
import subprocess
import sys

EXPECTED_SHA256 = "29b1cb2110b91a8a8d1f1bc5ced504b3dd8a0e86ee3beddb111a5f2309af4f19"
EXPECTED_ROWS = 429
CANONICAL = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "t1_t2_repro_rev2_0to10.py",
)


def fail(message):
    sys.stderr.write("ABORT: " + message + "\n")
    raise SystemExit(2)


def validate_history_document(doc):
    """Validate the exact JSON member read by the canonical script."""
    if not isinstance(doc, dict):
        raise ValueError("top-level JSON value must be an object")
    rows = doc.get("history")
    if not isinstance(rows, list):
        raise ValueError("top-level 'history' member must be a list")
    if len(rows) != EXPECTED_ROWS:
        raise ValueError(
            "history row count mismatch: got %d, expected %d"
            % (len(rows), EXPECTED_ROWS)
        )
    incomplete = [
        i for i, row in enumerate(rows)
        if not isinstance(row, dict)
        or not isinstance(row.get("home_goals"), int)
        or isinstance(row.get("home_goals"), bool)
        or not isinstance(row.get("away_goals"), int)
        or isinstance(row.get("away_goals"), bool)
    ]
    if incomplete:
        raise ValueError(
            "history contains %d rows without integer home_goals/away_goals"
            % len(incomplete)
        )
    return rows


def main():
    if len(sys.argv) < 2:
        fail("usage: run_checked.py <history.json> [canonical args...]")

    input_path = sys.argv[1]
    try:
        with open(input_path, "rb") as handle:
            raw = handle.read()
    except OSError as exc:
        fail("cannot read input: %s" % exc)

    actual_sha256 = hashlib.sha256(raw).hexdigest()
    if actual_sha256 != EXPECTED_SHA256:
        fail(
            "input SHA-256 mismatch: got %s, expected %s"
            % (actual_sha256, EXPECTED_SHA256)
        )

    try:
        document = json.loads(raw.decode("utf-8"))
        rows = validate_history_document(document)
    except (UnicodeDecodeError, json.JSONDecodeError, ValueError) as exc:
        fail("invalid canonical history input: %s" % exc)

    if not os.path.isfile(CANONICAL):
        fail("canonical script not found: %s" % CANONICAL)

    print(
        "input check OK: sha256=%s history_rows=%d complete_score_rows=%d"
        % (actual_sha256, len(rows), len(rows)),
        flush=True,
    )
    result = subprocess.run(
        [sys.executable, "-I", CANONICAL] + sys.argv[1:],
        check=False,
    )
    raise SystemExit(result.returncode)


if __name__ == "__main__":
    main()
