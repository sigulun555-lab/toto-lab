# GOAL3 k=6 vs k=10 — portable research reproduction

This directory is research-only. It does not write to production models, market weights,
prediction logs, or shadow artifacts. No PR is merged by this workflow.

## What changed

The original analysis.py used four machine-specific /home/claude/work/... paths.
It now accepts all dependency and output paths explicitly, verifies the three pinned data
SHA-256 values and the exact PR #19 Git blob SHA for nested_validation.py, and fails closed
if a dependency or cohort check fails. It has no absolute workspace paths and is safe to
invoke with python -I.

The portable runner preserves Claude's original PR #19 calculation:
- 2026-only expanding training, strictly earlier target dates;
- fixed k=6 and k=10;
- 17 outer dates, 236 matches, 472 team-side targets;
- Python random.Random, default seed 1, default 10,000 resamples;
- date-block and match-cluster bootstrap sensitivities;
- the legacy order-statistic percentile indices are recorded explicitly. They are not
  described as NumPy's linear percentile method.

## Reproduction

Clone sigulun555-lab/gpt and checkout the exact PR #19 input commit
2adf65a20247dd30c5b86ae95c22bd75980cda89 (the commit used by Claude's original script).
From that checkout, run:

    python -I /path/to/toto-lab/research/goal3_k6_k10_2026-11-10/analysis.py --mod-dir verification/goal3_independent --history data/history.json --aliases data/team_aliases.json --csv verification/goal3_independent/2025.csv --out-dir /tmp/goal3-k6-k10-reproduction

Optional overrides: --seed and --replicates (minimum 1,000). The runner resolves
--out-dir and rejects any path inside the repository checkout (the checkout root is derived
from the script location, not the caller's current working directory). It also refuses a
non-empty output directory and creates each result file exclusively, so an existing
research, production, or shadow file cannot be overwritten. The workflow uses a
fresh RUNNER_TEMP directory for each run.

The output directory contains:
- goal3_outer_matches.json — per-team-side outputs;
- goal3_summary.json — metrics and bootstrap intervals;
- run_manifest.json — SHA-256 for data inputs, nested_validation.py, the runner,
  and generated outputs, plus the PR #19 Git blob SHA, Python/RNG/seed/replicate/quantile
  metadata.

## Pinned inputs

The runner verifies these data-file SHA-256 values and stops on any mismatch:
- data/history.json: efca00ea491fcfea6a1267af403cb5ba80ae540fca97a076def25815fc318201
- data/team_aliases.json: 92e6377068df8dd63935e0c003adfd7b355e7adac23f7aace4f947be4f5f027e
- verification/goal3_independent/2025.csv: 6175674bc28d4311b219eed5ea2aa5e478fe0f17b8e6b8653f37718057da4288

For verification/goal3_independent/nested_validation.py, the runner verifies the PR #19
Git blob SHA 5f73df9e6fdb43d5cf333c04036f87ae16c20d1f. Its SHA-256 is also recorded in the
run manifest. The exact input commit is pinned above.

The generated manifest records the actual hashes used on every run. The portable unit-test
workflow alone does not establish that the full reproduction command has been run.

## Current interpretation

The point estimates are close to the frozen GPT full-precision values; small differences
are expected because Claude's per-target probabilities are rounded to 8 decimal places.
The original date-block and match-cluster bootstrap intervals both include zero. This is
not evidence that k=6 is superior, and it is not prospective adoption evidence.

The historical snapshot fetchedAt does not establish each match's original first-known
timestamp. No prospective official-round outcomes are included.
