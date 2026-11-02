"""Run from ai-resume-match: python -m unittest discover -s tests -v"""

import sys
from pathlib import Path
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from match_core import extract_keywords, heuristic_match, validate_ai_result


class KeywordTests(unittest.TestCase):
    def test_punctuation_heavy_technologies_are_preserved(self):
        self.assertEqual(extract_keywords("C++, C#, .NET, ASP.NET, Node.js"),
                         ["c++", "c#", ".net", "asp.net", "node.js"])

    def test_aliases_are_normalized(self):
        self.assertEqual(extract_keywords("JS, NodeJS, CSharp, Postgres"),
                         ["javascript", "node.js", "c#", "postgresql"])

    def test_generic_job_words_are_removed(self):
        self.assertEqual(extract_keywords("We are looking for a candidate with experience in Python"),
                         ["python"])

    def test_empty_input(self):
        self.assertEqual(extract_keywords(""), [])


class MatchTests(unittest.TestCase):
    def test_full_coverage(self):
        result = heuristic_match("Python SQL C#", "Required: Python SQL C#")
        self.assertEqual(result["score"], 100)
        self.assertEqual(result["matched_count"], 3)

    def test_partial_coverage_is_explained(self):
        result = heuristic_match("Python", "Python SQL")
        self.assertEqual(result["score"], 50)
        self.assertEqual(result["strengths"], ["python"])
        self.assertEqual(result["gaps"], ["sql"])
        self.assertEqual(result["total_keywords"], 2)

    def test_repeated_resume_keyword_does_not_inflate_score(self):
        result = heuristic_match("Python " * 100, "Python SQL")
        self.assertEqual(result["score"], 50)

    def test_no_meaningful_job_keywords(self):
        result = heuristic_match("Python", "We are looking for a candidate")
        self.assertEqual(result["score"], 0)
        self.assertEqual(result["total_keywords"], 0)
        self.assertEqual(result["questions"], [])

    def test_limit_is_respected(self):
        result = heuristic_match("Python", "Python SQL Docker Java", max_terms=2)
        self.assertEqual(result["keywords_considered"], ["python", "sql"])

    def test_invalid_limit(self):
        with self.assertRaises(ValueError):
            heuristic_match("Python", "Python", max_terms=0)

    def test_suggestions_do_not_encourage_fabrication(self):
        result = heuristic_match("Python", "Python Docker")
        self.assertTrue(all("If accurate" in suggestion for suggestion in result["suggestions"]))

    def test_alias_matches_full_name(self):
        self.assertEqual(heuristic_match("JavaScript", "JS")["score"], 100)


class AIValidationTests(unittest.TestCase):
    def test_valid_result_is_sanitized(self):
        raw = {"score": 70, "strengths": [" Python ", ""], "gaps": [],
               "suggestions": ["Practice"], "questions": ["Explain a project"]}
        result = validate_ai_result(raw)
        self.assertEqual(result["strengths"], ["Python"])
        self.assertEqual(result["mode"], "llm")

    def test_bool_score_is_rejected(self):
        with self.assertRaises(ValueError):
            validate_ai_result({"score": True, "strengths": [], "gaps": [],
                                "suggestions": [], "questions": []})

    def test_score_out_of_range_is_rejected(self):
        with self.assertRaises(ValueError):
            validate_ai_result({"score": 101, "strengths": [], "gaps": [],
                                "suggestions": [], "questions": []})

    def test_malformed_list_is_rejected(self):
        with self.assertRaises(ValueError):
            validate_ai_result({"score": 50, "strengths": "Python", "gaps": [],
                                "suggestions": [], "questions": []})

    def test_non_dict_is_rejected(self):
        with self.assertRaises(ValueError):
            validate_ai_result(["not a dict"])


if __name__ == "__main__":
    unittest.main()
