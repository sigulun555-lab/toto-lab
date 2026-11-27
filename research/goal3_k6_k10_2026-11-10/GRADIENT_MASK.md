# Penalized Poisson gradient and clip mask

The implementation is in `verification/goal3_independent/nested_validation.py`, function `poisson_penalized_objective_and_gradient`; the fit call is in `fit_shrinkage`.

For home and away logits:

```text
eta_h_raw = mu + home_adv + attack[home] - defense[away]
eta_a_raw = mu + attack[away] - defense[home]
eta = clip(eta_raw, -20, 20)
lambda = exp(eta)
```

Ignoring the outcome-only factorial constant, the objective is:

```text
sum(lambda_home - goals_home * eta_home)
+ sum(lambda_away - goals_away * eta_away)
+ k * (sum(attack^2) + sum(defense^2))
```

Because `eta = clip(eta_raw, -20, 20)`, the derivative of the clip is 1 only for the strict interior `-20 < eta_raw < 20`; it is 0 outside and at either boundary. The code therefore multiplies each Poisson residual by the strict-open-interval mask. The home and away contributions are accumulated into attack and defense gradients with `numpy.add.at`; the L2 terms add `2*k*attack` and `2*k*defense`.

The optimizer settings are pinned as `OPTIMIZER_METHOD = "L-BFGS-B"`, `OPTIMIZER_MAXITER = 300`, and `jac=True`. The initial parameter vector is zero except for `mu = log(1.3)`. No explicit box bounds are passed to SciPy; L-BFGS-B is the optimizer while the logit clip is the numerical guard.

The unit tests:
1. compare the analytic gradient with central finite differences inside the clip;
2. verify zero data-gradient through logits beyond the clip while retaining the L2 gradient;
3. verify zero clip derivative exactly at both boundaries;
4. assert the optimizer method and iteration cap.

This is a research reproducibility check only. It does not alter the production model or imply that k=6 is superior.
