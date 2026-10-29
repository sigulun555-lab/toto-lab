# totoGOAL3 Historical Data Readiness Audit — 2026-10-29

- Audit date: 2026-10-29 JST
- Repository: `sigulun555-lab/toto-lab`
- Scope: read-only audit of current `main` inventory and reproducible round-1665 score joins. This branch adds documentation only; no production code/model changes.
- Source tree inspected at main; GOAL3-specific files are listed below.

## Executive summary

- GOAL3 prediction files cover rounds **1665, 1666, and 1668**: 54 raw records total (36 for round 1665; 12 for round 1666; six pre-deadline V1 targets for round 1668).
- All 54 prediction records have parseable `predictionConfirmedAt` and `deadlineAt` values and were confirmed before their recorded deadline.
- Round 1665 has results for all three GOAL3 fixtures, allowing six unique team-target outcomes per model/version to be scored after applying the latest pre-deadline revision rule.
- Round 1666 initially lacked local results; this audit branch now adds `results/round_1666.jsonl` with three verified 90-minute match rows. The Nagoya–Urawa score is 1–1 after 90 minutes; Urawa's 2–1 win includes a 117th-minute extra-time goal, which must not be counted for GOAL3.
- The only GOAL3 vote-share snapshot found is for round 1666, captured at 2026-10-28 17:29 JST and transcribed from a user-provided screenshot. It contains six team distributions. It is not a multi-round market dataset and must not be treated as calibrated scoring probabilities.
- A six-target round-1668 GPT V1-only forecast has now been archived from the existing main `data/predictions.json` without recalculation. It was generated at 2026-10-29 07:33:30.811 JST, before the recorded 2026-10-31 13:50 JST deadline. No verified round-1668 GOAL3 market-share vector was captured; the indexed official purchase page did not expose the current vote-share table, so no market percentages have been inferred or fabricated.
- Historical market-blend performance remains unproven. Keep market weight 0.7 as an exploratory inherited value only; do not tune or promote it to production.

## GOAL3 prediction inventory

| Round | File/model version | Raw records | Pre-deadline valid | Scored targets from current results |
|---|---|---:|---:|---:|
| 1665 | ChatGPT `gpt-poisson-goal-dist-v1` | 6 | 6 | 6 |
| 1665 | ChatGPT `gpt-poisson-goal-dist-v2` | 6 | 6 | 6 |
| 1665 | Claude `totoGOAL3-v1` | 24 | 24 | 6 |
| 1666 | ChatGPT `gpt-poisson-goal-dist-v1` | 6 | 6 | 6 |
| 1666 | Claude `shrinkage-poisson-lambda10-2026only-v1` | 6 | 6 | 6 |
| 1668 | ChatGPT `gpt-poisson-goal-dist-v1` | 6 | 6 | 0 — results pending |
| **Total** | | **54** | **54** | **30 scored target rows across completed rounds 1665/1666; six round-1668 targets await results** |

The 24 Claude round-1665 rows are revision/evidence history for six targets, not 24 independent predictions. Apply the latest pre-deadline revision within each (round, match, team, model, version) group.

## Reproduced round-1665 scores

Scoring joins used round + match number + home/away team orientation; goals 3 or greater were bucketed as `3`. Team-name normalization was Unicode NFKC plus removal of spaces and middle-dot variants for this reproduction. The production scorer's full alias resolver remains the canonical scoring implementation.

Brier is the mean of the **sum of four class-wise squared errors per target**; LogLoss is mean negative log probability of the realized bucket.

| Model/version | Unique targets scored | Correct | Accuracy | Brier | LogLoss |
|---|---:|---:|---:|---:|---:|
| ChatGPT `gpt-poisson-goal-dist-v1` | 6 | 3 | 0.500 | 0.697144 | 1.340482 |
| ChatGPT `gpt-poisson-goal-dist-v2` | 6 | 2 | 0.333 | 0.724773 | 1.391039 |
| Claude `totoGOAL3-v1` | 6 | 1 | 0.167 | 0.781002 | 1.462514 |

### Round 1666 (LEVAIN_CUP; separate competition)

| Model/version | Unique targets scored | Correct | Accuracy | Brier | LogLoss |
|---|---:|---:|---:|---:|---:|
| ChatGPT `gpt-poisson-goal-dist-v1` | 6 | 3 | 0.500 | 0.826066 | 1.653315 |
| Claude `shrinkage-poisson-lambda10-2026only-v1` | 6 | 3 | 0.500 | 0.792929 | 1.533323 |

The third match is recorded as Nagoya 1–1 Urawa at the end of regulation; Urawa's 2–1 final score was after extra time. Sources: [J.League official round summary](https://www.jleague.jp/news/article/35220/) and [Urawa Reds official match report](https://www.urawa-reds.co.jp/topteamtopics/9029897.html).

This is only six targets per model/version per round and is not sufficient to establish relative model quality. The round-1666 scores below are based on one Levain Cup round and are not a J.League league-only sample.

## Result-file coverage (main)

| Results file | Rows | Competition | Readiness |
|---|---:|---|---|
| `results/round_1658.jsonl` | 4 | Mixed: J_LEAGUE / LEVAIN_CUP | Partial |
| `results/round_1660.jsonl` | 3 | J_LEAGUE | Partial |
| `results/round_1661.jsonl` | 1 | LEVAIN_CUP | Partial; not a J.League sample |
| `results/round_1662.jsonl` | 13 | UEFA_CL | Full file, but not J.League |
| `results/round_1663.jsonl` | 13 | J_LEAGUE | Full |
| `results/round_1664.jsonl` | 13 | J_LEAGUE | Full |
| `results/round_1665.jsonl` | 13 | J_LEAGUE | Full |
| `results/round_1666.jsonl` | 3 | LEVAIN_CUP | Full for the three GOAL3 fixtures; separate competition |

The separate `results/pending_single_source/` files are pending/alternate-source records and must not be counted as additional independent completed results. Keep competition filters explicit.

## Market-snapshot inventory and round 1668

Found snapshot:
- `data/goal3_market_snapshots/round_1666_2026-10-28T1729JST.jsonl`
- `predictions/round_1668_ChatGPT_goal3.jsonl` — V1-only forecast archive, generated 2026-10-29 07:33:30.811 JST, before the 2026-10-31 13:50 JST deadline. Six team targets, no market blend.
- Source URL: `https://store.toto-dream.com/dcs/subos/screen/pi09/spin003/PGSPIN00301InitVoteRate.form?commodityId=02&holdCntId=1666`
- Timestamp: 2026-10-28 17:29 JST
- Source evidence: user-provided screenshot; vote shares transcribed into six team-side distributions.
- Important distinction: market vote share is the share of ticket selections, not a calibrated probability of a team's goal bucket.

Round 1668:
- Current main status file records round 1668 and a deadline of 2026-10-31 13:50 JST; a matching six-target GPT V1-only forecast is archived in this branch. The status file is not proof of a current GOAL3 market snapshot.
- The public official purchase page could be discovered, but the current GOAL3 vote-share table for round 1668 was not independently retrievable in this audit. Therefore there is **no valid round-1668 GOAL3 snapshot to commit yet**.
- Do not copy round-1666 vote shares forward, use standard toto 1X2 percentages, or backfill with post-deadline values.
- Capture once the official GOAL3 vote-status page is accessible and the selected round, all three fixtures/six team sides, the page's own update timestamp, and retrieval time can be verified.

## Next steps

1. Capture round-1668 GOAL3 vote shares with a screenshot or directly retrievable official page; preserve original evidence, page-displayed update time, and a separate retrieval timestamp.
2. Re-run the regression test and canonical `score_predictions_goal3.js` against the archived round-1668 V1 forecast and verified round-1666 results; leave round 1668 unscored until its results exist.
3. Repeat the capture protocol for future GOAL3 rounds to build multiple matched rounds.
4. Compare V1-only, market-only, and fixed blend weights (including 0.7 as a trial only) using identical matched targets and chronological validation once sample size supports it.
5. Keep production logic unchanged until repeated, out-of-sample results and independent review support a change.

## Guardrails

- No market percentages or missing results were guessed.
- No post-deadline prediction or market values are eligible for historical forecast reconstruction.
- No production model, live prediction workflow, or scheduled update logic was changed by this audit.
