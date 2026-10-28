# totoGOAL3 Historical Data Readiness Audit

Audit date: 2026-10-28  
Repository: `sigulun555-lab/toto-lab`  
Scope: read-only audit of stored GOAL3 predictions and result logs; no production model changes.

## Executive summary

- The repository has a GOAL3-specific schema, validator, scorer, and tests.
- The inspected tree contains GOAL3 prediction logs for round 1665 (ChatGPT and Claude) and round 1666 (Claude).
- Results logs exist for rounds 1658 and 1660–1665, but some are partial. Round 1665 has 13 result rows.
- Historical multi-round GOAL3 model comparison is not yet supported by the currently stored prediction logs. The market-blend trial also lacks historical market probability vectors across rounds.
- This report does not authorize merging trial PRs or changing production behavior.

## Round 1665 audit

The scoring rule used for this audit:
1. Require a valid `predictionConfirmedAt` strictly earlier than `deadlineAt`.
2. Score only against a result with the matching round and match number, using home/away side to select the team's actual goals.
3. Bucket actual goals as `0`, `1`, `2`, or `3` (3 means 3+).
4. Keep model versions separate.
5. For repeated records within the same round, match, team, model, and version, use the latest pre-deadline record.

| Model/version | Raw records | Unique scored targets | Correct | Accuracy | Brier (sum of 4 squared errors) | LogLoss |
|---|---:|---:|---:|---:|---:|---:|
| ChatGPT `gpt-poisson-goal-dist-v1` | 6 | 6 | 3 | 0.500 | 0.697144 | 1.340482 |
| ChatGPT `gpt-poisson-goal-dist-v2` | 6 | 6 | 2 | 0.333 | 0.724773 | 1.391039 |
| Claude `totoGOAL3-v1` | 24 | 6 | 1 | 0.167 | 0.781002 | 1.462514 |

Important: these are six target outcomes per model/version from one round, not a statistically adequate estimate of general performance. The 24 Claude records are revision/evidence history for six target outcomes, not 24 independent predictions. No records in this round were excluded for invalid or post-deadline timestamps in the audit.

## Existing results inventory

| Results file | Rows observed | Notes |
|---|---:|---|
| `results/round_1658.jsonl` | 4 | Partial |
| `results/round_1660.jsonl` | 3 | Partial |
| `results/round_1661.jsonl` | 2 | Competition field is `LEVAIN_CUP`; don't mix into J.League-only samples without an explicit policy |
| `results/round_1662.jsonl` | 13 | Competition field is `UEFA_CL`; don't mix into J.League-only samples without an explicit policy |
| `results/round_1663.jsonl` | 13 | Full 13-row result file observed |
| `results/round_1664.jsonl` | 13 | Full 13-row result file observed |
| `results/round_1665.jsonl` | 13 | Full 13-row result file observed |

The result files include multiple competitions. Any pooled validation must explicitly filter by competition and verify that a stored prediction exists for the exact same round, match number, teams, and side. Result availability alone does not create a prediction sample.

## GOAL3 prediction files observed

- `predictions/round_1665_ChatGPT_goal3.jsonl`
- `predictions/round_1665_Claude_goal3.jsonl`
- `predictions/round_1666_Claude_goal3.jsonl`

No additional round-specific `*_goal3.jsonl` prediction files were present in the inspected repository tree. Round 1666 Claude records are a separate shrinkage-Poisson model version and should not be conflated with Claude's round 1665 `totoGOAL3-v1` application-replication model.

## Market-blend readiness

The inspected records do not provide market probability vectors for multiple historical GOAL3 rounds. The round 1666 market-blend experiment is a single-round trial, and its market source was a screenshot-based purchase-ratio snapshot rather than a verified historical official feed. Therefore:
- do not claim market-blend accuracy improvement yet;
- do not tune the blend weight from this one round;
- keep trial code isolated from production;
- collect timestamped, source-labelled market probabilities and pre-deadline model probabilities for future rounds.

## Next steps

1. Add a reproducible inventory/coverage report that lists prediction rows, unique targets, model versions, deadline exclusions, unresolved team mappings, missing result joins, and duplicate/revision counts.
2. Verify scoring script behavior against that inventory and ensure result competition filters are explicit.
3. Collect predictions for each future GOAL3 round before deadline, with immutable timestamps and model/version identifiers.
4. Capture market probability snapshots at fixed, documented times for the same rounds, preserving source URLs and retrieval timestamps.
5. Run chronological walk-forward comparisons only after sufficient matched rounds exist; report Accuracy, Brier, and LogLoss, with sample counts and no post-deadline leakage.
6. Keep production logic unchanged until validation supports a change and approval is given.
