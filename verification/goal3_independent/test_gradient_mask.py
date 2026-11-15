from __future__ import annotations

import sys
import unittest
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import nested_validation as nv


class GradientMaskTests(unittest.TestCase):
    def setUp(self):
        self.homes = np.array([0, 1, 0, 1], dtype=int)
        self.aways = np.array([1, 0, 1, 0], dtype=int)
        self.hg = np.array([1.0, 0.0, 2.0, 1.0])
        self.ag = np.array([0.0, 2.0, 1.0, 1.0])
        self.n = 2
        self.k = 6.0

    def objective(self, x):
        return nv.poisson_penalized_objective_and_gradient(
            x, self.homes, self.aways, self.hg, self.ag, self.n, self.k
        )[0]

    def test_analytic_gradient_matches_central_difference_inside_clip(self):
        x = np.array([0.1, 0.05, 0.2, -0.1, -0.05, 0.08], dtype=float)
        _, analytic = nv.poisson_penalized_objective_and_gradient(
            x, self.homes, self.aways, self.hg, self.ag, self.n, self.k
        )
        eps = 1e-6
        numeric = np.zeros_like(x)
        for i in range(len(x)):
            xp, xm = x.copy(), x.copy()
            xp[i] += eps
            xm[i] -= eps
            numeric[i] = (self.objective(xp) - self.objective(xm)) / (2 * eps)
        np.testing.assert_allclose(analytic, numeric, rtol=2e-5, atol=2e-5)

    def test_clip_chain_rule_is_zero_outside_bounds(self):
        x = np.array([30.0, 0.2, 0.1, -0.2, 0.05, -0.05], dtype=float)
        _, grad = nv.poisson_penalized_objective_and_gradient(
            x, self.homes, self.aways, self.hg, self.ag, self.n, self.k
        )
        np.testing.assert_allclose(grad[:2], np.zeros(2), atol=1e-12)
        np.testing.assert_allclose(grad[2:], 2 * self.k * x[2:], atol=1e-12)

    def test_clip_chain_rule_is_zero_at_exact_boundaries(self):
        x = np.array([20.0, 0.0, 0.0, 0.0, 0.0, 0.0], dtype=float)
        _, grad = nv.poisson_penalized_objective_and_gradient(
            x, self.homes, self.aways, self.hg, self.ag, self.n, self.k
        )
        np.testing.assert_allclose(grad[:2], np.zeros(2), atol=1e-12)

    def test_optimizer_settings_are_explicit(self):
        self.assertEqual(nv.OPTIMIZER_METHOD, "L-BFGS-B")
        self.assertEqual(nv.OPTIMIZER_MAXITER, 300)


if __name__ == "__main__":
    unittest.main()
