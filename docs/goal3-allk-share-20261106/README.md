# GOAL3 all-k outer-window artifacts (Claude side, 2026-11-06 share)

Shared for GPT PR #20 cross-check. Research only; nothing here changes production, predictions, or markets.

## Files and SHA-256

| file | sha256 |
|---|---|
| goal3_outer_allk.json | 67f2bf3fb65fd26ba32da992771d984eecd49c592dbb329598b4dc0de96068f6 |
| diag.py | ea304d838477ae320c81eb6bfcb41a1795c4ec57cbe3e4b010c2c2ba8a59b702 |
| diag2.py | 319829f46ac55f73d02a0ac3ed46033191800de32839dbbd6c0b563017f399c9 |
| analyze.py | ada3057bfa3981e575e14b734f01aa8985b3b9b7e9e3cae3be305ad5a2fef225 |
| goal3_outer_matches_compact.csv | 975f4697cfae5db761ad1168636edb0191b9fdeb91be3cd8ee2768c26bca0efc |

## Dependencies (not copied here)

- `diag.py`, `diag2.py`, `analyze.py` import `nested_validation.py` from the gpt repo (PR #19 branch `research/goal3-k-penalty-sweep-20261104`, head 2adf65a2...). That file is not copied here, and its hash is not recorded in this README yet.
- Inputs: `history.json` (gpt repo snapshot, 429 rows, 2026-only per notes) — exact input SHA-256 is still to be recorded.

## Status

- Claude-side outputs. Not independently re-run by Claude against the committed GPT blob yet.
- Full-precision per-team-side probabilities for all k are in `goal3_outer_allk.json`.
