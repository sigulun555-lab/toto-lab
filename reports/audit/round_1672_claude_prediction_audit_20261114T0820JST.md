# Round 1672 Claude prediction provenance audit

**Audit time:** 2026-11-14 08:20:26 JST  
**Scope:** toto13 (13 1X2 matches), totoGOAL3 (3 fixtures / 6 team-side targets / four categories), mini toto A/B kept separate.  
**Safety:** report-only. No prediction row, market weight, model, main file, app artifact, or existing shadow artifact is modified.

## 1. Source PR and CI

- PR [#109](https://github.com/sigulun555-lab/toto-lab/pull/109) is **CLOSED / MERGED**. It was created at 2026-11-13T23:17:10Z and merged at 2026-11-13T23:17:12Z (2026-11-14 08:17:10 / 08:17:12 JST).
- Head commit: `63d9cbbe081d6d260c6901ff46bcf79ccbfc0710`.
- Merge commit / audited main head: `ab65ac1ba0b00c9d5d37a83306df304c6b9c3d43`.
- Commit message includes `Co-Authored-By: Claude Haiku 5.5` and a Claude Code session URL. The PR/commit GitHub author is `sigulun555-lab`; this is a Claude Code generated/co-authored artifact, not a direct comment from a separate Claude GitHub account. PR #109 has no comments.
- Validate workflow run #438 / run ID `43525965943`: job `validate` SUCCESS; `npm test` SUCCESS; `npm run check:teams` SUCCESS. The commit combined-status endpoint returned no separate status entries; the Actions job result is the available CI evidence.

Changed files (three):
- `data/injury_status/round_1672.jsonl` — blob `eb8d86f1f026a43b61d9c5f194b63069354f3348`
- `predictions/round_1672_Claude.jsonl` — blob `cdcf5adc28597c1e013af82707dbbb4d5b1be8be`
- `predictions/round_1672_Claude_goal3.jsonl` — blob `55e84628284bceded4da3ae25f4aaf7cc6d9d515`

## 2. Record integrity and timestamp defect

The merged files contain 13 toto13 rows, 6 GOAL3 team-side rows, and one injury record. The 19 prediction IDs are unique. Probability vectors are within the expected four-decimal rounding tolerance (toto13 sums differ from 1 by at most 0.0001; GOAL3 C大阪 sums to 0.9999 and the other five sum to 1).

There is, however, a material temporal-provenance contradiction:

- Every prediction row says `predictionConfirmedAt=2026-11-14T08:20:00+09:00`.
- Every prediction ID ends in `20261114T002000Z`, which is **09:20 JST**, one hour later than `predictionConfirmedAt`.
- PR #109 was already merged at **08:17:12 JST**, 2 minutes 48 seconds before the claimed 08:20 prediction confirmation.
- The injury record says `recordedAt=2026-11-14T08:25:00+09:00`, 7 minutes 48 seconds after the merge that already contains that record.
- `deadlineAt=2026-11-14T04:50:00Z` correctly converts to 13:50 JST.

The stored records therefore cannot establish their own actual creation time relative to the Git commit. Do not repair these fields in place, backdate them, or treat the rows as a verified as-of snapshot. Preserve the merged originals and request a new, correctly timestamped append-only record if a usable provenance chain is required.

The injury source itself is valid: [J.League official notice, 2026-11-04](https://www.jleague.jp/corporate/news/article/108) states that 平岡将豪 is suspended for two matches, including 2026-11-14 大分トリニータ vs 栃木シティ. The source page displays the date only, not a time; the JSON's `sourceAt=2026-11-04T00:00:00+09:00` is more precise than the cited source supports. Treat the source time as date-only unless a timestamped original is supplied.

## 3. toto13 comparison (round 1672)

GPT's pre-existing independent prediction data was not regenerated:

- V1: 13 rows on main, file `predictions/round_1672_ChatGPT_shared_score_v1.jsonl`, blob `2292ba7e548ba1d9e37bcb59fafe85b11008f1b2`.
- V2: 91 append-only rows on the still-open PR #104 branch `gpt/toto13-round-1672-v2-market-20261112T1504`, head `fea1312f320e2228912e516189caf7a9fe7e199a`, blob `8732731fadd9a8d2051c28c09960695e4c7d4a71`. Its latest 13-row market snapshot is displayed 2026-11-13 22:22 JST and retrieved 22:23:22 JST.
- PR #104 remains OPEN / UNMERGED. The 91-row PR-branch state is not represented as main.

Independent vector comparison (mean absolute difference across all 39 probability cells; diagnostic only, not a scoring metric):

| Comparison | Mean absolute cell difference | Largest cell difference |
|---|---:|---:|
| Claude `probabilitiesV1` vs GPT V1 | 0.1000411 | 0.4353421 (match 3, home) |
| Claude `probabilities` vs GPT V1 | 0.1250734 | 0.4311421 (match 3, home) |
| Claude `probabilities` vs latest GPT V2 | 0.1340244 | 0.4118118 (match 6, home) |

Important definition mismatch: Claude labels `probabilities` as `toto13-v2`, but the record notes explicitly say the official vote-share blend was **not** applied. The repository's GPT V2 definition is 30% GPT Poisson V1 + 70% official toto vote share. Thus Claude's model-only output is not the same V2 definition; the last row above is diagnostic only and is not an apples-to-apples V2 comparison.

Claude's records do not include a source commit/code SHA, history SHA, alias SHA, exact invocation, or environment manifest. The stated `predictScore()` source and probabilities cannot be independently reproduced from the PR contents alone.

## 4. totoGOAL3 comparison and sync state (round 1672)

The six Claude records use four categories `0/1/2/3+` and correspond to official GOAL3 product numbers 1–3 (regular toto13 match numbers 2, 4, 5). This mapping is consistent with the official product detail page.

GPT already has its own six team-side forecast in main `data/predictions.json` and `predictions/round_1672_ChatGPT_goal3.jsonl`; no duplicate GPT GOAL3 forecast was created.

- GPT main status: round 1672; generatedAt `2026-11-13T19:39:55.526Z` (2026-11-14 04:39:55 JST); deadline 13:50 JST; `lastError=null`; 3 fixtures / 6 targets; history 460 matches through 2026-11-08; injury/availability warning remains.
- toto-lab main GOAL3 log: 6 rows, blob `6208de08ce4d334ade0576080fc552bbff40f3a0`.
- Existing sync PR #103 branch: 36 rows / 6 snapshots, blob `70b656db3def5c55e20f2711bbcf93f5a351707f`, head `5754fdd7993348f1cb7e0917b21049eb75244f15`; Validate #430 passed `npm test` and `npm run check:teams`.
- PR #103 remains OPEN / UNMERGED. Main has only the original 6 rows; the additional 30 rows remain in the PR branch. Do not report the latest snapshot chain as synchronized to main.

Across the 24 four-category cells (6 team-side vectors), Claude vs GPT has mean absolute cell difference **0.0716978**. The largest is **0.2182575** for テゲバジャーロ宮崎, category 3+ (Claude 0.1304 vs GPT 0.3486575). This is a prediction-difference diagnostic, not outcome scoring. Claude's GOAL3 records also lack pinned code/input hashes; the note says the Claude V1 fixed values were not rechecked.

## 5. mini toto A/B — blocked, no substitute prediction

The official [round-1672 detail page](https://store.toto-dream.com/dcs/subos/screen/pi01/spin000/PGSPIN00001DisptotoLotInfo.form?holdCntId=1672) confirms:
- mini toto A product numbers 1–5 map to regular toto13 matches 1–5;
- mini toto B product numbers 1–5 map to regular toto13 matches 6–10;
- the network deadline is 2026-11-14 13:50 JST.

The inspected repository has a generic 1X2 `scripts/save_prediction.js` and a dedicated `scripts/save_prediction_goal3.js`, but no mini-specific prediction function, validator, save script, V1/V2 definition, or round-1672 mini prediction artifact. `package.json` has `save` and `save:goal3`, not a mini prediction command. Issue #25 concerns schedule-card acquisition, not a mini prediction model.

Therefore no mini A/B predictions were fabricated by slicing or relabeling the toto13 forecasts. They remain **not generated / blocked pending a defined product-specific implementation and schema**.

## 6. Current official market displays — recorded as stale, not used for V2

Direct official vote-status pages were opened at audit time 08:20:26 JST:

- toto13: display time 08:06 JST; retrieval 08:20:26 JST; lag 14m26s. The page says it refreshes every five minutes. This is a stale official display, not a live 08:20 snapshot.
- totoGOAL3: display time 07:48 JST; retrieval 08:20:26 JST; lag 32m26s. Also stale against the five-minute notice.

Sources:
- [Official toto13 vote status](https://store.toto-dream.com/dcs/subos/screen/pi09/spin003/PGSPIN00301InitVoteRate.form?commodityId=01&holdCntId=1672)
- [Official totoGOAL3 vote status](https://store.toto-dream.com/dcs/subos/screen/pi09/spin003/PGSPIN00301InitVoteRate.form?commodityId=02&holdCntId=1672)

These raw displays are not used to create a V2 revision. No stale percentage is represented as a live market value.

## 7. Research and safety separation

- GOAL3 k=6 vs k=10 research remains separate from toto13 T1 and from prediction submission. No new prospective research cohort was created by PR #109.
- No k choice, market weight, production model, or production prediction was changed.
- This audit branch contains this report only. The merged PR #109 is an external repository event; this audit did not merge it or write to main.
