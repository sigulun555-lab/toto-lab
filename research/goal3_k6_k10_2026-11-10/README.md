# GOAL3 k=6 vs k=10 — portable research reproduction

This directory is research-only. It does not write to production models, market weights,
prediction logs, or shadow artifacts. No PR is merged by this workflow.

## What changed

The original analysis.py used four machine-specific /home/claude/work/... paths.
It now accepts all dependency and output paths explicitly, verifies the four pinned input
SHA-256 values, and fails closed if a dependency or cohort check fails. It has no absolute
workspace paths and is safe to invoke with python -I.

The portable runner preserves the original Claude calculation:
- 2026-only expanding training, strictly earlier target dates;
- fixed k=6 and k=10;
- 17 outer dates, 236 matches, 472 team-side targets;
- Python random.Random, default seed 1, default 10,000 resamples;
- date-block and match-cluster bootstrap sensitivities;
- the legacy order-statistic percentile indices are recorded explicitly. They are not
  described as NumPy's linear percentile method.

## Reproduction

Clone sigulun555-lab/gpt and checkout the pinned research input commit
e20f2a4dce84a6b5a458f0a4e876ba0532ca4c88. From that checkout, run:

    python -I /path/to/toto-lab/research/goal3_k6_k10_2026-11-10/analysis.py --mod-dir verification/goal3_independent --history data/history.json --aliases data/team_aliases.json --csv verification/goal3_independent/2025.csv --out-dir /tmp/goal3-k6-k10-reproduction

Optional overrides: --seed and --replicates (minimum 1,000). Do not point --out-dir
at a production or shadow directory.

The output directory contains:
- goal3_outer_matches.json — per-team-side outputs;
- goal3_summary.json — metrics and bootstrap intervals;
- run_manifest.json — SHA-256 for each input, nested_validation.py, the runner,
  and generated outputs, plus Python/RNG/seed/replicate/quantile metadata.

## Pinned inputs

The runner verifies these exact SHA-256 values and stops on any mismatch:
- data/history.json: efca00ea491fcfea6a1267af403cb5ba80ae540fca97a076def25815fc318201
- data/team_aliases.json: 92e6377068df8dd63935e0c003adfd7b355e7adac23f7aace4f947be4f5f027e
- verification/goal3_independent/2025.csv: 6175674bc28d4311b219eed5ea2aa5e478fe0f17b8e6b8653f37718057da4288
- verification/goal3_independent/nested_validation.py: 1cbd349c4a772e4ba89b2e3c36c6a0396abbeaa618e131cfb100e6b4dae9b

The generated manifest records the actual hashes used on every run. A successful portable
unit-test workflow does not, by itself, mean the full reproduction command has been run.

## Current interpretation

The point estimates are close to the frozen GPT full-precision values; small differences
are expected because Claude's per-target probabilities are rounded to 8 decimal places.
The original date-block and match-cluster bootstrap intervals both include zero. This is
not evidence that k=6 is superior, and it is not prospective adoption evidence.

The historical snapshot fetchedAt does not establish each match's original first-known
timestamp. No prospective official-round outcomes are included.
