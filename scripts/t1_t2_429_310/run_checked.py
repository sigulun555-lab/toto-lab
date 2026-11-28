#!/usr/bin/env python3
"""Input-checked wrapper for the canonical T1/T2 reproduction (toto13 research only).

Fail-closed checks before running the unchanged canonical script:
  - SHA-256 of the input must equal the 429-row canonical input.
  - Row count must be 429 (largest list in the JSON document).
The canonical script itself is NOT modified (its docstring still names the
410-row control blob; that note is stale, see README).

Usage:
  python3 -I run_checked.py <path/to/history.json> [canonical args...]
"""
import hashlib
import json
import os
import subprocess
import sys

EXPECTED_SHA256 = "29b1cb2110b91a8a8d1f1bc5ced504b3dd8a0e86ee3beddb111a5f2309af4f19"
EXPECTED_ROWS = 429
CANONICAL = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                         "t1_t2_repro_rev2_0to10.py")


def fail(msg):
    sys.stderr.write("ABORT: " + msg + "\n")
    sys.exit(2)


def main():
    if len(sys.argv) < 2:
        fail("usage: run_checked.py <history.json> [args...]")
    inp = sys.argv[1]
    with open(inp, "rb") as f:
        raw = f.read()
    sha = hashlib.sha256(raw).hexdigest()
    if sha != EXPECTED_SHA256:
        fail("input SHA-256 mismatch: got %s, expected %s" % (sha, EXPECTED_SHA256))
    doc = json.loads(raw.decode("utf-8"))
    rows = doc if isinstance(doc, list) else max(
        (v for v in doc.values() if isinstance(v, list)), key=len, default=[])
    if len(rows) != EXPECTED_ROWS:
        fail("row count mismatch: got %d, expected %d" % (len(rows), EXPECTED_ROWS))
    print("input check OK: sha256=%s rows=%d" % (sha, len(rows)))
    res = subprocess.run([sys.executable, "-I", CANONICAL] + sys.argv[1:])
    sys.exit(res.returncode)


if __name__ == "__main__":
    main()
