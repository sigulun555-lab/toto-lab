#!/usr/bin/env python3
"""Verify clean-checkout T1/T2 outputs against the pinned artifact manifest."""
import csv
import hashlib
import math
import sys
from pathlib import Path

EXPECTED_FILES = 8
EXPECTED_ROWS = 310
EXPECTED_DATES = 26


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main():
    if len(sys.argv) != 3:
        raise SystemExit(
            "usage: verify_artifacts.py <generated-output-dir> <SHA256SUMS_pred.txt>"
        )
    output_dir = Path(sys.argv[1])
    manifest_path = Path(sys.argv[2])
    entries = []
    for line in manifest_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        expected, filename = line.split(None, 1)
        entries.append((expected, filename.strip()))

    if len(entries) != EXPECTED_FILES:
        raise SystemExit(
            "manifest file count mismatch: got %d, expected %d"
            % (len(entries), EXPECTED_FILES)
        )

    for expected_sha, filename in entries:
        path = output_dir / filename
        if not path.is_file():
            raise SystemExit("missing generated file: %s" % filename)
        actual_sha = sha256(path)
        if actual_sha != expected_sha:
            raise SystemExit(
                "SHA-256 mismatch for %s: got %s, expected %s"
                % (filename, actual_sha, expected_sha)
            )

        with path.open("r", encoding="utf-8", newline="") as handle:
            rows = list(csv.DictReader(handle))
        if len(rows) != EXPECTED_ROWS:
            raise SystemExit(
                "%s row count mismatch: got %d, expected %d"
                % (filename, len(rows), EXPECTED_ROWS)
            )
        match_ids = [row.get("matchId") for row in rows]
        dates = {row.get("date") for row in rows}
        if None in match_ids or len(set(match_ids)) != EXPECTED_ROWS:
            raise SystemExit("%s has missing or duplicate matchId values" % filename)
        if len(dates) != EXPECTED_DATES:
            raise SystemExit(
                "%s date count mismatch: got %d, expected %d"
                % (filename, len(dates), EXPECTED_DATES)
            )
        for index, row in enumerate(rows, start=2):
            try:
                probabilities = [float(row[key]) for key in ("pH", "pD", "pA")]
            except (KeyError, TypeError, ValueError) as exc:
                raise SystemExit(
                    "%s line %d has invalid probability columns: %s"
                    % (filename, index, exc)
                )
            if not all(math.isfinite(value) and 0.0 <= value <= 1.0
                       for value in probabilities):
                raise SystemExit(
                    "%s line %d has out-of-range probabilities" % (filename, index)
                )
            if abs(sum(probabilities) - 1.0) > 1e-10:
                raise SystemExit(
                    "%s line %d probability sum is not 1" % (filename, index)
                )

        print(
            "PASS %s sha256=%s rows=%d unique_matchIds=%d dates=%d"
            % (filename, actual_sha, len(rows), len(set(match_ids)), len(dates))
        )

    print("PASS all %d T1/T2 CSV artifacts" % len(entries))


if __name__ == "__main__":
    main()
