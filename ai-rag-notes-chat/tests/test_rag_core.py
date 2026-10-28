"""Run with: python -m unittest discover -s tests -v"""

import unittest
from rag_core import chunk_text, local_answer, retrieve, tokenize


class ChunkTextTests(unittest.TestCase):
    def test_empty_notes_return_no_chunks(self):
        self.assertEqual(chunk_text("  \n\n  "), [])

    def test_short_lines_are_grouped_without_exceeding_limit(self):
        self.assertEqual(chunk_text("Alpha beta\nGamma delta", chunk_size=25), ["Alpha beta\nGamma delta"])

    def test_long_paragraph_is_split_at_character_limit(self):
        chunks = chunk_text("alpha beta gamma delta epsilon zeta", chunk_size=12)
        self.assertTrue(chunks)
        self.assertTrue(all(0 < len(chunk) <= 12 for chunk in chunks))
        self.assertEqual(" ".join(chunks), "alpha beta gamma delta epsilon zeta")

    def test_long_unbroken_token_is_split(self):
        chunks = chunk_text("x" * 27, chunk_size=10)
        self.assertEqual([len(chunk) for chunk in chunks], [10, 10, 7])

    def test_invalid_limit_fails_loudly(self):
        with self.assertRaises(ValueError):
            chunk_text("notes", chunk_size=0)


class RetrievalTests(unittest.TestCase):
    def test_punctuation_normalized(self):
        self.assertEqual(tokenize("Access-Tokens, TLS!"), ["access-tokens", "tls"])

    def test_ranked_results_and_stable_ties(self):
        chunks = ["TLS encrypts traffic", "TLS and tokens", "tokens authorize access"]
        self.assertEqual(retrieve("tokens", chunks, top_k=3), [(1, chunks[1]), (2, chunks[2])])

    def test_stopword_query_does_not_return_false_matches(self):
        self.assertEqual(retrieve("What is the", ["The best tokens"], top_k=3), [])

    def test_unmatched_query_is_empty(self):
        self.assertEqual(retrieve("zebra", ["OAuth authorizes an app"]), [])

    def test_nonpositive_top_k_is_empty(self):
        self.assertEqual(retrieve("tokens", ["tokens"], top_k=0), [])

    def test_retrieval_is_case_insensitive(self):
        self.assertEqual(retrieve("oauth", ["OAuth grants access"]), [(0, "OAuth grants access")])

    def test_evidence_is_labeled_for_readers(self):
        self.assertIn("[Chunk 2]", local_answer("oauth", [(1, "OAuth access")]))

    def test_no_evidence_has_explicit_fallback(self):
        self.assertIn("could not find", local_answer("oauth", []))


if __name__ == "__main__":
    unittest.main()
