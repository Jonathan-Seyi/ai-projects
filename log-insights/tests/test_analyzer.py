import json
import tempfile
import unittest
from contextlib import redirect_stdout
from io import StringIO
from pathlib import Path
from analyzer import main, summarize


def record(status=200, path='/health', method='GET', duration_ms=10):
    return json.dumps(dict(status=status, path=path, method=method, duration_ms=duration_ms))


class AnalyzeTests(unittest.TestCase):
    def test_empty(self):
        self.assertEqual(summarize(['\n'])['requests'], 0)
        self.assertIsNone(summarize([])['p95_duration_ms'])

    def test_aggregation_and_nearest_rank_p95(self):
        rows = [record(duration_ms=i) for i in range(1, 21)]
        rows += [record(404, '/missing?token=secret', 'POST', 100)]
        result = summarize(rows)
        self.assertEqual(result['requests'], 21)
        self.assertEqual(result['p95_duration_ms'], 20)
        self.assertEqual(result['status_classes'], {'2xx': 20, '4xx': 1})
        self.assertEqual(result['top_paths'][0], {'path': '/health', 'count': 20})
        self.assertEqual(result['methods'], {'GET': 20, 'POST': 1})

    def test_rejects_malformed_and_invalid_records(self):
        rows = ['not json', '[]', record(status=True), record(duration_ms=-1),
                record(path='not-a-path'), record(duration_ms=float('inf')), record()]
        result = summarize(rows)
        self.assertEqual(result['invalid_lines'], [1, 2, 3, 4, 5, 6])
        self.assertEqual(result['requests'], 1)

    def test_ties_sorted_by_path(self):
        result = summarize([record(path='/z'), record(path='/a')])
        self.assertEqual([x['path'] for x in result['top_paths']], ['/a', '/z'])

    def test_strict_exit_code(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'sample.jsonl'
            path.write_text(record() + '\ninvalid\n', encoding='utf-8')
            output = StringIO()
            with redirect_stdout(output):
                code = main([str(path), '--strict'])
            self.assertEqual(code, 1)
            self.assertEqual(json.loads(output.getvalue())['requests'], 1)
            with redirect_stdout(StringIO()):
                self.assertEqual(main([str(path)]), 0)


if __name__ == '__main__':
    unittest.main()
