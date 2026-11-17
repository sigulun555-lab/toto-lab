# Round 1665 Market-Blend Scoring Addendum

Date: 2026-10-28
Status: GPT-only audit; trial-only, not production approval.

## Reproducible scoring status

The existing script `scripts/score_round_1665_market_blend.js` reads the latest appended prediction revision per match from `predictions/round_1665_ChatGPT_market_blend_v2.jsonl` and verified scores from `results/round_1665.jsonl`. The current JSON report `reports/round_1665_market_blend_comparison.json` is stale: it still says `awaiting_results` and lists zero scored matches, even though the results file contains 13 final-score rows. The script has not been executed in this environment, so this addendum records the separately computed audit values below and does not claim a fresh script run.

## Audit metrics (13 matches)

| Model | Correct | Accuracy | Brier (lower better) | LogLoss (lower better) |
|---|---:|---:|---:|---:|
| GPT base probabilities | 6/13 | 0.461538 | 0.61061068 | 1.03427212 |
| Market vote share only | 6/13 | 0.461538 | 0.55387424 | 0.92836811 |
| Market blend V2 | 8/13 | 0.615385 | 0.53410197 | 0.91064967 |

Brier is the mean per-match sum of three squared errors. Market vote shares are not calibrated true outcome probabilities. These 13 matches from one round are descriptive only and do not establish generalizable superiority. These 1X2 metrics must not be mixed with GOAL3 bucket-scoring metrics.

## Reproduction / follow-up

1. Run `node scripts/score_round_1665_market_blend.js` from the repository root.
2. Inspect the generated `reports/round_1665_market_blend_comparison.json`; confirm status is `complete`, 13 scored matches, and no missing match numbers.
3. Compare the generated values against this audit addendum and investigate any difference before replacing the stale report.
4. Keep the market-blend implementation in trial-only PRs; do not merge or connect it to production based on this single-round sample.

## Data provenance caveat

The round 1665 market snapshot was transcribed from a Claude-provided official-site screenshot displayed at 2026-10-24 00:59 JST. It was not independently fetched in this environment. The historical GOAL3 market vectors needed for multi-round backtesting remain unavailable; the 1X2 results above do not resolve that GOAL3 data gap.
