# GOAL3 k=6 vs k=10 — retrospective research only

This directory contains a portable, manifest-verified reproduction of the 17-date outer evaluation. It is not a production prediction path and must not change the live model, market weights, prediction logs, or shadow artifacts.

## Frozen inputs

All source files are copied into this branch under `inputs/`. Their SHA-256 and Git blob SHA values are pinned in `input_manifest.json`. The source snapshot is commit `2adf65a20247dd30c5b86ae95c22bd75980cda89` in `sigulun555-lab/gpt`, branch `research/goal3-k-penalty-sweep-20261104`.

The manifest also pins the all-k Actions artifact from run #569 (artifact ID `14085113748`) by ZIP digest and inner JSON SHA-256.

## Clean-checkout reproduction

From the repository root:

```bash
python3 -m pip install -r requirements-research.txt
python3 -I research/goal3_k6_k10_2026-11-10/analysis.py --verify-only
python3 -I -m unittest discover -s verification/goal3_independent -p 'test_*.py'
python3 -I research/goal3_k6_k10_2026-11-10/analysis.py --output-dir /tmp/goal3-k6-k10-output
```

The first command validates every pinned input and code file before any analysis runs. The full run writes only to the selected output directory; it does not overwrite the checked-in historical snapshots.

## Model and optimizer

The source implementation is `verification/goal3_independent/nested_validation.py`. The objective is a penalized Poisson negative log-likelihood with L2 penalty on team attack and defense terms. The optimizer is SciPy L-BFGS-B, `jac=True`, `maxiter=300`; the initial global log-rate is `log(1.3)`. There are no explicit box bounds passed to the optimizer; the logit clip is a numerical guard.

The exact clip-chain-rule behavior and finite-difference tests are documented in [GRADIENT_MASK.md](GRADIENT_MASK.md).

## Interpretation and limits

- Cohort: 236 matches / 472 team-side targets / 17 target dates (2026-09-19 through 2026-11-03), three chronological folds (5/6/6 dates).
- k=10 remains the research baseline; k=6 remains a candidate only.
- The paired k=6 minus k=10 point differences are small and the 95% bootstrap intervals include zero.
- The cohort has no official round IDs. Round-cluster primary inference is therefore not computed. Date/match cluster and circular date-block results are retrospective sensitivities only.
- The history snapshot has one common `fetchedAt` value (`2026-11-03T23:21:25.123Z`) across its 429 rows. This does not establish first-known availability for each historical target date.
- No prospective GOAL3 outcomes are included. No production adoption is authorized or implied.
