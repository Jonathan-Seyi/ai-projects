"""Unit tests for evaluation metrics, independent of the dataset score."""
import unittest
from evaluate import evaluate


class EvaluationTests(unittest.TestCase):
    def test_perfect(self):
        result = evaluate([{"id": "ok", "text": "Python SQL", "expected": ["python", "sql"]}])
        self.assertEqual((result["precision"], result["recall"], result["f1"]), (1, 1, 1))

    def test_missing(self):
        result = evaluate([{"id": "missing", "text": "Python", "expected": ["python", "sql"]}])
        self.assertEqual(result["recall"], 0.5)
        self.assertEqual(result["false_negative"], 1)

    def test_extra(self):
        result = evaluate([{"id": "extra", "text": "Python SQL", "expected": ["python"]}])
        self.assertEqual(result["precision"], 0.5)
        self.assertEqual(result["false_positive"], 1)

    def test_empty(self):
        with self.assertRaises(ValueError):
            evaluate([])


if __name__ == "__main__":
    unittest.main()
