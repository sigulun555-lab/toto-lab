# Round 1665 shared score-distribution snapshot

This is an append-only experimental snapshot. It preserves prior 1X2 heuristic and GOAL3 estimates rather than rewriting historical predictions.

- One row per each of the 13 toto fixtures.
- The same home/away expected-goal rates (lambda) produce both 0/1/2/3+ goal buckets and 1X2 probabilities.
- 1X2 is calculated by summing independent-Poisson score pairs from 0 through 10, then normalizing the truncated total.
- Goal buckets use exact Poisson probabilities for 0, 1, and 2, with the remaining tail grouped as 3+.
- Source: locally stored `gpt/model.js` baseline algorithm, historical file `data/history.json`, and team aliases from `toto-lab/data/teams.json`; team-name normalization was corrected before recalculation.
- This is not calibrated production output. Stored history, mixed competitions, rate estimates, and fixture metadata still require audit. No current injuries/suspensions or market odds were used.

Run the structural tests with:

```sh
node --test tests/round-1665-shared-score.test.js
```
