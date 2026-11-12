# 第1670回 toto13 V2 timestamp correction

- Correction recorded at: 2026-11-06T12:12:07+09:00 (UTC 2026-11-06T03:12:07Z)
- Official market snapshot: display 2026-11-06 11:45 JST; retrieved 2026-11-06 12:06:31 JST.
- The first V2 revision IDs ending `v2-rev-20261106T030631Z` were appended after the official market retrieval. Their `predictionConfirmedAt` field was mistakenly set to the market retrieval timestamp (`2026-11-06T03:06:31Z`).
- Therefore that timestamp must **not** be interpreted as the actual forecast-generation time. The exact generation time of that first revision was not captured. Those 13 rows remain preserved for append-only audit history but are superseded for timestamp validity.
- A second 13-row V2 revision, IDs ending `v2-rev-20261106T031207Z`, was generated at 2026-11-06T12:12:07+09:00. Its `revisionOf` points to the corresponding first-revision record.
- The corrected revision uses the same V1 baseline and the same directly captured official toto13 market snapshot, with the frozen 30% Poisson + 70% official vote-share formula. The 13 corrected probabilities are identical to the first revision after 8-decimal rounding; no model/input change was made.
- V1, the original V2 snapshot, the first V2 revision, the official market snapshot, and the team-news report were not overwritten.
- The corrected `predictionConfirmedAt` is before the official deadline (2026-11-07 12:50 JST).

This note is an append-only correction. The current timestamp-valid V2 snapshot is the `031207Z` revision.
