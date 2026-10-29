# totoGOAL3 market snapshot capture procedure

## Purpose

Build an auditable, round-by-round history of official totoGOAL3 vote shares. This is separate from ordinary toto 1X2 market data and separate from model probability forecasts.

## Required capture

For each round, capture at least one snapshot before the published sales deadline, ideally at documented fixed offsets (for example, T-24h, T-6h, T-2h, and T-30m when the round's sales window permits). Do not promise a capture time unless an actual scheduled collector exists.

Each JSONL record should contain:
- `round`
- `marketSnapshotAt`: timestamp represented by the official page, with timezone
- `retrievedAt`: when the collector/operator actually retrieved the page, with timezone
- `deadlineAt`: official deadline with timezone
- `source`: explicit official source label
- `sourceUrl`: exact URL that yielded the data
- `sourceDisplayedTimestamp`: page's own update timestamp, if shown
- `dataType`: `vote_share_percent_by_goal_bucket`
- `teams`: exactly six records for the three selected fixtures; each record must include `matchNumber`, `team`, `side`, and `voteSharePct` keys `0`, `1`, `2`, `3+`
- `captureStatus`: `captured` only when the page, selected round, all six teams and the percentages have been verified; otherwise keep the failed attempt in a separate audit log and do not write an invented snapshot.

## Validation gates

1. Confirm the page is specifically **totoGOAL3**, not regular toto, mini toto, or a generic purchase page.
2. Confirm the selected round and the official three-match / six-team fixture list.
3. Confirm each team's vote-share vector sums to approximately 100% (allowing display rounding).
4. Preserve source evidence (page capture/screenshot or raw response) when allowed, and keep it separate from the normalized JSONL record.
5. Record the page-displayed timestamp separately from retrieval time. A cached search result is not evidence of a current snapshot.
6. Confirm `marketSnapshotAt < deadlineAt`; reject post-deadline values for forecast reconstruction.
7. Never infer missing percentages, reuse another round's snapshot, or substitute 1X2 vote shares for goal-bucket shares.

## Interpretation

Official vote shares describe how ticket selections are distributed among the four goal buckets. They are **not automatically calibrated scoring probabilities**. Any conversion or blend requires a separately documented method and chronological out-of-sample evaluation.

The previously saved round-1666 snapshot is screenshot-transcribed evidence from 2026-10-28 17:29 JST. No round-1668 GOAL3 snapshot is included in this commit because the current official round-1668 GOAL3 vote-share table was not independently retrievable during the 2026-10-29 audit. Do not fill the gap from search snippets for other products or rounds.
