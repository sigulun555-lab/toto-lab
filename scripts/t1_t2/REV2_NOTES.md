# T1/T2 rev2 (0..10 goal range)

- Fix: goal-sum grid changed from 0..8 to 0..10 to match GPT main model.js.
- Previous files (pred_*.csv, t1_t2_repro.py, 0..8) are kept unchanged for traceability.
- New files: rev2_0to10_pred_*.csv, t1_t2_repro_rev2_0to10.py.
- Input: history_gpt_main_45295867.json (blob sha 45295867fa1db03ae2876ad2a0d2f20742566da5).
- Outer holdout (not used for k selection): date >= 2026-10-21 (n=90). Inner selection window: 2026-10-03..2026-10-20 (n=79), by inner log loss.
- Inner-selected k = 6. Outer log loss: k=6 1.0518 vs k=0 1.0979.
- Outer log loss for k=10/12 is lower (1.0428 / 1.0406) but was not selectable from the inner window; reported for transparency only.
