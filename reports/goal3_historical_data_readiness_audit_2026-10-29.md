# totoGOAL3 Historical Data Readiness Audit — 2026-10-29

- Audit date: 2026-10-29 JST
- Repository: `sigulun555-lab/toto-lab`
- Scope: audit current `main` inventory, add verified round-1666 results and reproducible score tests, and document market-capture procedure. The round-1668 V1 forecast is kept in separate Draft PR #29 to avoid duplicate file additions. No production model or prediction workflow changes.
- Source tree inspected at main; GOAL3-specific files are listed below.

## Executive summary

- The current `main` GOAL3 prediction inventory covers rounds **1665 and 1666**: 48 raw records total (36 for round 1665; 12 for round 1666). A six-target pre-deadline round-1668 V1 archive is proposed separately in Draft PR #29.
- All 48 prediction records currently in the GOAL3-specific main files have parseable `predictionConfirmedAt` and `deadlineAt` values and were confirmed before their recorded deadline. The six round-1668 archive records in PR #29 also preserve the original pre-deadline generation time.
- Round 1665 has results for all three GOAL3 fixtures, allowing six unique team-target outcomes per model/version to be scored after applying the latest pre-deadline revision rule.
- Round 1666 initially lacked local results; this audit branch now adds `results/round_1666.jsonl` with three verified 90-minute match rows. The Nagoya–Urawa score is 1–1 after 90 minutes; Urawa's 2–1 win includes a 117th-minute extra-time goal, which must not be counted for GOAL3.
- Two round-level GOAL3 vote-share records are now present: round 1666 from a user-provided screenshot, and round 1668 transcribed from a secondary archive page displaying an official-feed-derived snapshot at 2026-10-28 06:40 JST. The official round-1668 page itself could not be independently opened, so the new record is explicitly marked secondary/unverified. This is still far too little matched history for model adoption and vote shares are not calibrated scoring probabilities.
- A six-target round-1668 GPT V1-only forecast, copied without recalculation from existing main `data/predictions.json`, is proposed in separate Draft PR #29. It preserves `generatedAt=2026-10-28T22:33:30.811Z` (2026-10-29 07:33:30.811 JST), before the recorded 2026-10-31 13:50 JST deadline. No verified round-1668 GOAL3 market-share vector was captured; the indexed official purchase page did not expose the current vote-share table, so no market percentages have been inferred or fabricated.
- Historical market-blend performance remains unproven. Keep market weight 0.7 as an exploratory inherited value only; do not tune or promote it to production.

## GOAL3 prediction inventory

| Round | File/model version | Raw records | Pre-deadline valid | Scored targets from current results |
|---|---|---:|---:|---:|
| 1665 | ChatGPT `gpt-poisson-goal-dist-v1` | 6 | 6 | 6 |
| 1665 | ChatGPT `gpt-poisson-goal-dist-v2` | 6 | 6 | 6 |
| 1665 | Claude `totoGOAL3-v1` | 24 | 24 | 6 |
| 1666 | ChatGPT `gpt-poisson-goal-dist-v1` | 6 | 6 | 6 |
| 1666 | Claude `shrinkage-poisson-lambda10-2026only-v1` | 6 | 6 | 6 |
| **Total** | | **48** | **48** | **30 scored target rows across completed rounds 1665/1666** |

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
- `data/goal3_market_snapshots/round_1668_2026-10-28T0640JST_secondary.jsonl` — six team vectors transcribed from a secondary page reporting official vote-share data; official page not independently verified.
- `reports/round_1668_goal3_v1_market_snapshot_comparison_2026-10-29.json` — descriptive forecast-vs-market comparison only, no outcome scoring.
- The separate forecast archive is proposed in [Draft PR #29](https://github.com/sigulun555-lab/toto-lab/pull/29): `predictions/round_1668_ChatGPT_goal3.jsonl`, six team targets, no market blend.
- Source URL: `https://store.toto-dream.com/dcs/subos/screen/pi09/spin003/PGSPIN00301InitVoteRate.form?commodityId=02&holdCntId=1666`
- Timestamp: 2026-10-28 17:29 JST
- Source evidence: user-provided screenshot; vote shares transcribed into six team-side distributions.
- Important distinction: market vote share is the share of ticket selections, not a calibrated probability of a team's goal bucket.

Round 1668:
- Current main status file records round 1668 and a deadline of 2026-10-31 13:50 JST; the matching six-target GPT V1-only forecast is proposed in separate Draft PR #29. The status file is not proof of a current GOAL3 market snapshot.
- The current official purchase page could not be opened directly. A secondary archive (`totomark.info`) displayed six round-1668 vote-share vectors with its own snapshot time of 2026-10-28 06:40 JST. These values were archived separately with `captureStatus=secondary_source_captured_official_source_not_independently_verified`; they are **not** represented as a directly verified official capture.
- Do not copy round-1666 vote shares forward, use standard toto 1X2 percentages, or backfill with post-deadline values. Treat the round-1668 secondary values as provisional until directly cross-checked against the official page.
- Capture once the official GOAL3 vote-status page is accessible and the selected round, all three fixtures/six team sides, the page's own update timestamp, and retrieval time can be verified.

## Next steps

1. Capture round-1668 GOAL3 vote shares with a screenshot or directly retrievable official page; preserve original evidence, page-displayed update time, and a separate retrieval timestamp.
2. Verify the separate PR #29 forecast archive preserves the original pre-deadline metadata; leave round 1668 unscored until its results exist.
3. Repeat the capture protocol for future GOAL3 rounds to build multiple matched rounds.
4. Compare V1-only, market-only, and fixed blend weights (including 0.7 as a trial only) using identical matched targets and chronological validation once sample size supports it.
5. Keep production logic unchanged until repeated, out-of-sample results and independent review support a change.

## Guardrails

- No market percentages or missing results were guessed.
- No post-deadline prediction or market values are eligible for historical forecast reconstruction.
- No production model, live prediction workflow, or scheduled update logic was changed by this audit.
