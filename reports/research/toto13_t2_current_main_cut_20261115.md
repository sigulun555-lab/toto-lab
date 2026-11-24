# toto13 T2 draw-boost current-main recheck — 2026-11-15

## Scope and status

- Product: **standard toto13 only** (1/X/2). This is not totoGOAL3, mini toto A/B, or a production prediction.
- Study: T2, compare the existing Dixon–Coles + k=6 model **with** and **without** the draw boost.
- Status: GPT independent retrospective recheck. Claude's same-input reproduction and implementation-parity response are still outstanding on [GPT Issue #22](https://github.com/sigulun555-lab/gpt/issues/22).
- No production model, market weight, main branch, prediction log, or shadow artifact was changed. T1 was not started.

## Frozen input and implementation

| Item | Value |
|---|---|
| GPT source | `sigulun555-lab/gpt` main |
| GPT main commit | `e3de8e6c05d239ae1fddcf7721097c9389322caf` |
| Input path | `data/history.json` |
| Input Git blob SHA | `8e93301764a2e736f85e397e80a493ea3f2f23fa` |
| Total / valid scored rows | 468 / 468 |
| Source | `k-addtimes/jleague_open_data` community mirror (not an official J.League feed) |
| Source URL | https://raw.githubusercontent.com/k-addtimes/jleague_open_data/main/current_schedule_file.csv |
| `fetchedAt` | All 468 rows: `2026-11-14T22:22:01.917Z` |
| Reference T2 script | `toto-lab` branch `claude/t1-t2-repro-20261103`, blob `243f7166bcbd579a9133b108e58eec32b863b940` |

The reference script specifies chronological walk-forward scoring, excluding same-day matches, a 12-match team window, k=6 shrinkage, Dixon–Coles rho=-0.10, independent Poisson score grid 0..10, and a T2 draw boost of threshold 0.30 / amount 0.20. The without-boost arm differs only by omitting that boost.

### Important time-availability limitation

All 468 rows have the same `fetchedAt`, after every match in the evaluation cohort. The chronology filter uses only matches dated strictly before each target, but the archived file does **not** establish when each result first became available. This is retrospective walk-forward, not a first-known / point-in-time prospective evaluation. It must not be treated as prospective evidence.

## Current-main cohort

- Evaluation: **349 matches**, **30 date clusters**, 2026-09-02 through 2026-11-14.
- Unique match IDs: 349.
- With/without arms: exact same match IDs and actual outcomes.
- Maximum 1/X/2 simplex error: below 1e-12.

## Independent point metrics

| Variant | n | LogLoss | 3-class Brier | Accuracy |
|---|---:|---:|---:|---:|
| With draw boost | 349 | 1.0773494121 | 0.6498161626 | 40.9742% |
| Without draw boost | 349 | 1.0452441153 | 0.6276865940 | 47.5645% |
| Without − with | — | **−0.0321052968** | **−0.0221295686** | **+6.5903 pp** |

Negative LogLoss/Brier differences favor the without-boost arm. This is a retrospective result on this input cut only.

## Paired date-block bootstrap

- Resampling unit: target date; paired predictions remain together within each date.
- Sampling: dates drawn with replacement, same number of date draws as observed dates.
- Repetitions: 10,000.
- RNG: Python `random.Random(7)`-compatible MT19937 stream. Compatibility checks: first `getrandbits(32)` = 1390851128 and first ten `randrange(30)` values = 10, 4, 12, 20, 1, 2, 26, 17, 3, 11.
- Percentile convention: sorted bootstrap values at indices 250 and 9750 (not interpolated).

| Difference (without − with) | Point estimate | 95% date-block interval |
|---|---:|---:|
| LogLoss | −0.0321053 | [−0.0499546, −0.0144278] |
| Brier | −0.0221296 | [−0.0348462, −0.0097202] |
| Accuracy | +6.5903 pp | [+1.7582 pp, +11.8644 pp] |

## Draw-probability calibration (10 equal-width bins)

| Variant | Mean predicted draw probability | Observed draw rate | 10-bin ECE |
|---|---:|---:|---:|
| With draw boost | 33.4177% | 22.0630% | 0.1135463 |
| Without draw boost | 26.2747% | 22.0630% | 0.0421162 |

The with-boost arm overpredicts draws on this retrospective cohort. The calibration result is descriptive; no correction or production change is proposed.

## League breakdown

| League | n | With boost LL / Brier / Acc | Without boost LL / Brier / Acc |
|---|---:|---|---|
| J1 | 100 | 1.03130 / 0.62008 / 45.00% | 1.02604 / 0.61648 / 47.00% |
| J2 | 125 | 1.11659 / 0.67793 / 39.20% | 1.08634 / 0.65587 / 44.80% |
| J3 | 124 | 1.07493 / 0.64546 / 39.52% | 1.01930 / 0.60831 / 50.81% |

## Reconciliation with earlier T2 artifacts

The older Claude report `rev2_429_check_20261104.md` (blob `74fb61ac60380e0abcd5f1d0dd914c19bb9784b7`) claims 429 history rows / 310 evaluation matches. The archived input `history_gpt_main_45295867.json` (blob `45295867fa1db03ae2876ad2a0d2f20742566da5`) contains 410 rows and reproduces 291 evaluation matches, not 310. Independent re-execution on that archived 410-row input reproduces the saved 291-row point metrics:
- with boost: LL 1.0868358351 / Brier 0.6566180207 / accuracy 39.8625%;
- without boost: LL 1.0599697661 / Brier 0.6383735760 / accuracy 45.3608%.

The separate GPT 430-row / 311-match cut documented in Issue #22 comment #6649992894 uses a different input blob SHA (`07f30b255ca86910e0b1622bbfaadd62a695b2ea`) and is not the same archived Claude input. The current 468-row / 349-match cut is a third, later cohort. These cohorts must not be merged or described as the same reproduction.

## Decision

1. The current 468-row retrospective cut favors removing the draw boost on LL, Brier, accuracy, and draw calibration.
2. This does **not** resolve the original 310-vs-291 population mismatch or Claude's requested same-input reproduction.
3. Keep T2 **open / not accepted** until Claude provides the exact input, output CSVs, code/commit SHA, and same-cohort 10,000-replicate bootstrap, and both sides reconcile.
4. Do not begin T1 until T2 reconciliation is complete. Do not adopt this result into production model, market weights, live predictions, or existing shadow artifacts.
5. Reproduce from a clean checkout with:
   ```sh
   node scripts/research/toto13_t2_current_cut.js /path/to/gpt/data/history.json 10000 7
   node tests/test_toto13_t2_current_cut.js
   ```
