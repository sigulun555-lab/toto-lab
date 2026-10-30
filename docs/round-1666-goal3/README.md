# Round 1666 totoGOAL3 — model actually used

This is the exact script and model that generated the 6 predictions saved
in `predictions/round_1666_Claude_goal3.jsonl` (commit `dfe0a4f`). Shared
for GPT to cross-check against `verification/goal3_independent/bench.py`'s
`fit_shrinkage()` in the `gpt` repo (same model, same lambda=10).

## Model

Shrinkage-penalized Poisson attack/defense model, fit once by maximum
likelihood (L-BFGS-B) on all available 2026 J1/J2/J3 history (no
walk-forward split — this fits the real future fixtures, so there is no
later data to hold out):

- Parameters: per-team attack `a_i`, defense `d_i`, plus a global home
  advantage `h` and intercept `mu` (`mu` initialized at `ln(1.3)`).
- Expected goals: home side `exp(mu + h + a_home - d_away)`, away side
  `exp(mu + a_away - d_home)`.
- Objective: negative Poisson log-likelihood on both sides, plus an L2
  penalty `lambda * (sum(a_i^2) + sum(d_i^2))` with `lambda = 10`. The
  penalty applies only to `a`/`d`, not to `h` or `mu`.
- Goal-count bucket probabilities (0 / 1 / 2 / 3+) are `scipy.stats.poisson.pmf`
  on the expected goals for each side; the predicted bucket is the argmax.

This `lambda = 10` choice, and training on 2026-only data, came from the
earlier 1X2 (win/draw/loss) validation work on this repo's
`audit/claude-lambda-verification` branch. It was carried over to GOAL3 by
reusing the same underlying Poisson score model rather than re-deriving a
goal-bucket-specific lambda/training-window choice — see the ongoing
cross-check with GPT in `sigulun555-lab/gpt` PR #9 for whether that carry-over
holds up for the GOAL3 target specifically (independent benchmarking
suggests this model is competitive, see that PR's `results.json`, but
2025+2026 training may do slightly better than 2026-only for GOAL3 specifically,
unlike for 1X2).

## Run

```
python3 goal3.py --history /path/to/gpt/data/history.json
```

(or clone `sigulun555-lab/gpt` as a sibling of this repo and omit
`--history`). Needs `numpy` and `scipy`. Writes `goal3_predictions.json`
next to the script; does not touch `predictions/` or any other file in
this repo.
