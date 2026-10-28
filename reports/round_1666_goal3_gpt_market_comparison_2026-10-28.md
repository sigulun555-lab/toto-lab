# Round 1666 totoGOAL3: GPT vs official vote-share snapshot

- Prepared: 2026-10-28
- GPT prediction source time: 2026-10-28 16:40:07 JST (`2026-10-28T07:40:07.103Z`)
- Official vote-share screenshot timestamp: 2026-10-28 17:29 JST
- Deadline: 2026-10-28 18:50 JST
- Sources:
  - GPT archive: `predictions/round_1666_ChatGPT_goal3.jsonl` (PR #20)
  - Official vote-share snapshot: `data/goal3_market_snapshots/round_1666_2026-10-28T1729JST.jsonl` (PR #21)
  - Official page: https://store.toto-dream.com/dcs/subos/screen/pi09/spin003/PGSPIN00301InitVoteRate.form?commodityId=02&holdCntId=1666

## Distributions

Values are ordered `0 / 1 / 2 / 3+` goals. GPT columns are model probabilities in percent; market columns are official ticket vote-share percentages.

| Match | Team | GPT probabilities (%) | Market vote share (%) |
|---:|---|---:|---:|
| 1 | 水戸ホーリーホック | 28.93 / 35.88 / 22.25 / 12.94 | 35.49 / 37.64 / 18.22 / 8.65 |
| 1 | セレッソ大阪 | 30.26 / 36.17 / 21.62 / 11.95 | 16.90 / 31.15 / 32.74 / 19.21 |
| 2 | 横浜F・マリノス | 41.88 / 36.45 / 15.86 / 5.81 | 25.24 / 36.78 / 25.65 / 12.33 |
| 2 | サンフレッチェ広島 | 20.69 / 32.60 / 25.68 / 21.03 | 16.80 / 29.88 / 32.21 / 21.11 |
| 3 | 名古屋グランパス | 17.35 / 30.39 / 26.62 / 25.65 | 20.10 / 35.18 / 28.58 / 16.14 |
| 3 | 浦和レッズ | 18.06 / 30.91 / 26.45 / 24.58 | 18.60 / 35.90 / 29.05 / 16.45 |

## Most likely bucket comparison

| Match | Team | GPT top bucket | Market top-voted bucket | Match |
|---:|---|---:|---:|---|
| 1 | 水戸ホーリーホック | 1 (35.88%) | 1 (37.64%) | 一致 |
| 1 | セレッソ大阪 | 1 (36.17%) | 2 (32.74%) | 不一致 |
| 2 | 横浜F・マリノス | 0 (41.88%) | 1 (36.78%) | 不一致 |
| 2 | サンフレッチェ広島 | 1 (32.60%) | 2 (32.21%) | 不一致 |
| 3 | 名古屋グランパス | 1 (30.39%) | 1 (35.18%) | 一致 |
| 3 | 浦和レッズ | 1 (30.91%) | 1 (35.90%) | 一致 |

## Interpretation and guardrails

- The top bucket agrees for 3 of 6 teams (Mito, Nagoya, Urawa); it differs for Cerezo Osaka, Yokohama F. Marinos, and Hiroshima.
- This is a descriptive comparison only. Model probabilities and ticket vote shares are different quantities; vote shares are not calibrated scoring probabilities.
- Do not claim this demonstrates which model is more accurate. Actual scores are required for scoring, and six teams from one round are a very small sample.
- No market blending was applied to the archived GPT forecast. This report does not change or overwrite predictions.
- The GPT forecast was archived at 16:40 JST; the official vote-share snapshot is at 17:29 JST. This is a time-separated comparison, not a synchronized snapshot.
- Market data was transcribed from a user-provided screenshot. The page indicated that the display updates every five minutes.
