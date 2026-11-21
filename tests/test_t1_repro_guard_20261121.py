import hashlib
import json
import sys
import unittest
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts" / "t1_t2"))
import run_checked_20261121 as guard


def make_history(rows):
    return json.dumps({"history": rows}, separators=(",", ":")).encode("utf-8")


def row(day="2026-08-07", fetched="2026-11-04T06:17:32.213Z", home_goals=1, away_goals=0):
    return {
        "date": day, "competition": "J1", "home": "A", "away": "B",
        "home_goals": home_goals, "away_goals": away_goals, "fetchedAt": fetched,
    }


class HistoryGuardTests(unittest.TestCase):
    def test_valid_synthetic_snapshot(self):
        raw = make_history([row()])
        doc = guard.validate_history_bytes(
            raw,
            expected_sha256=hashlib.sha256(raw).hexdigest(),
            expected_rows=1,
            expected_distinct_dates=1,
            expected_min_date="2026-08-07",
            max_date="2026-08-07",
            expected_fetched_at="2026-11-04T06:17:32.213Z",
        )
        self.assertEqual(len(doc["history"]), 1)

    def test_rejects_wrong_sha(self):
        raw = make_history([row()])
        with self.assertRaisesRegex(ValueError, "SHA-256 mismatch"):
            guard.validate_history_bytes(raw, expected_sha256="0" * 64, expected_rows=1,
                expected_distinct_dates=1, expected_min_date="2026-08-07")

    def test_rejects_wrong_row_count(self):
        raw = make_history([row()])
        with self.assertRaisesRegex(ValueError, "row count mismatch"):
            guard.validate_history_bytes(raw, expected_sha256=hashlib.sha256(raw).hexdigest(),
                expected_rows=2, expected_distinct_dates=1, expected_min_date="2026-08-07")

    def test_rejects_post_cutoff_row(self):
        raw = make_history([row(day="2026-11-04")])
        with self.assertRaisesRegex(ValueError, "cutoff"):
            guard.validate_history_bytes(raw, expected_sha256=hashlib.sha256(raw).hexdigest(),
                expected_rows=1, expected_distinct_dates=1, expected_min_date="2026-11-04")

    def test_rejects_boolean_goal(self):
        raw = make_history([row(home_goals=True)])
        with self.assertRaisesRegex(ValueError, "integer goals"):
            guard.validate_history_bytes(raw, expected_sha256=hashlib.sha256(raw).hexdigest(),
                expected_rows=1, expected_distinct_dates=1, expected_min_date="2026-08-07")

    def test_rejects_duplicate_match_key(self):
        raw = make_history([row(), row()])
        with self.assertRaisesRegex(ValueError, "duplicate match key"):
            guard.validate_history_bytes(raw, expected_sha256=hashlib.sha256(raw).hexdigest(),
                expected_rows=2, expected_distinct_dates=1, expected_min_date="2026-08-07")

    def test_rejects_fetched_at_mismatch(self):
        raw = make_history([row(fetched="2026-11-04T06:17:32.214Z")])
        with self.assertRaisesRegex(ValueError, "fetchedAt provenance mismatch"):
            guard.validate_history_bytes(raw, expected_sha256=hashlib.sha256(raw).hexdigest(),
                expected_rows=1, expected_distinct_dates=1, expected_min_date="2026-08-07")


class OutputGuardTests(unittest.TestCase):
    def test_accepts_pinned_core_metrics_and_bootstrap(self):
        lines = [
            "k0_w12 (310, 26, 1.1229, 0.6671, 44.19)",
            "k6_w12 (310, 26, 1.0552, 0.636, 46.45)",
            "k8_w12 (310, 26, 1.0508, 0.6334, 47.74)",
            "k10_w12 (310, 26, 1.0486, 0.6321, 48.06)",
            "k6_w8 (310, 26, 1.0557, 0.6367, 45.81)",
            "k6_w10 (310, 26, 1.0578, 0.6375, 44.84)",
            "k6_w16 (310, 26, 1.0535, 0.6345, 46.45)",
            "--- paired vs k6_w12 (candidate minus k6): mean, 95% date-block CI",
            "k10_w12 {'LL': (-0.0066, -0.0159, 0.0022), 'BR': (-0.0039, -0.0099, 0.0021)}",
        ]
        checked = guard.parse_and_check_output("\n".join(lines))
        self.assertEqual(checked["metrics"]["k10_w12"], (310, 26, 1.0486, 0.6321, 48.06))

    def test_rejects_changed_metric(self):
        lines = [
            "k0_w12 (310, 26, 1.1229, 0.6671, 44.19)",
            "k6_w12 (310, 26, 1.0552, 0.636, 46.45)",
            "k8_w12 (310, 26, 1.0508, 0.6334, 47.74)",
            "k10_w12 (310, 26, 1.1476, 0.6800, 53.55)",
            "k6_w8 (310, 26, 1.0557, 0.6367, 45.81)",
            "k6_w10 (310, 26, 1.0578, 0.6375, 44.84)",
            "k6_w16 (310, 26, 1.0535, 0.6345, 46.45)",
            "--- paired vs k6_w12",
            "k10_w12 {'LL': (-0.0066, -0.0159, 0.0022), 'BR': (-0.0039, -0.0099, 0.0021)}",
        ]
        with self.assertRaisesRegex(ValueError, "metrics mismatch"):
            guard.parse_and_check_output("\n".join(lines))


if __name__ == "__main__":
    unittest.main()
