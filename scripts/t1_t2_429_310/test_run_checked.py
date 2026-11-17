import unittest

from run_checked import EXPECTED_ROWS, validate_history_document


def rows(count=EXPECTED_ROWS, complete=True):
    result = []
    for i in range(count):
        row = {"date": "2026-09-%02d" % (1 + (i % 26))}
        if complete:
            row.update({"home_goals": i % 4, "away_goals": (i + 1) % 4})
        else:
            row.update({"home_goals": None, "away_goals": 0})
        result.append(row)
    return result


class ValidateHistoryDocumentTests(unittest.TestCase):
    def test_uses_exact_history_member_not_largest_list(self):
        history = rows()
        doc = {"other": [0] * 500, "history": history}
        self.assertIs(validate_history_document(doc), history)

    def test_rejects_non_object_document(self):
        with self.assertRaisesRegex(ValueError, "top-level JSON"):
            validate_history_document(rows())

    def test_rejects_missing_history_member(self):
        with self.assertRaisesRegex(ValueError, "history.*list"):
            validate_history_document({"matches": rows()})

    def test_rejects_wrong_history_row_count(self):
        with self.assertRaisesRegex(ValueError, "row count mismatch"):
            validate_history_document({"history": rows(EXPECTED_ROWS - 1)})

    def test_rejects_rows_without_integer_scores(self):
        with self.assertRaisesRegex(ValueError, "without integer"):
            validate_history_document({"history": rows(complete=False)})

    def test_rejects_boolean_scores(self):
        data = rows()
        data[0]["home_goals"] = True
        with self.assertRaisesRegex(ValueError, "without integer"):
            validate_history_document({"history": data})


if __name__ == "__main__":
    unittest.main()
