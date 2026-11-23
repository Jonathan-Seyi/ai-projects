"""Analyze JSON Lines HTTP request logs without third-party dependencies."""
import argparse
import json
import sys
from collections import Counter
from pathlib import Path


def summarize(lines):
    """Return a report and rejected line numbers for JSONL HTTP logs."""
    status = Counter()
    paths = Counter()
    methods = Counter()
    durations = []
    invalid = []
    for number, line in enumerate(lines, 1):
        if not line.strip():
            continue
        try:
            item = json.loads(line)
            if not isinstance(item, dict):
                raise ValueError('record must be an object')
            code = item['status']
            path = item['path']
            method = item['method']
            ms = item['duration_ms']
            if type(code) is not int or not 100 <= code <= 599:
                raise ValueError('invalid status')
            if not isinstance(path, str) or not path.startswith('/') or len(path) > 2048:
                raise ValueError('invalid path')
            if not isinstance(method, str) or not method.isalpha() or len(method) > 20:
                raise ValueError('invalid method')
            if type(ms) not in (int, float) or not 0 <= ms < float('inf'):
                raise ValueError('invalid duration')
        except (ValueError, TypeError, KeyError, json.JSONDecodeError):
            invalid.append(number)
            continue
        status[f'{code // 100}xx'] += 1
        paths[path.split('?', 1)[0]] += 1
        methods[method.upper()] += 1
        durations.append(ms)
    ordered = sorted(durations)
    p95 = ordered[max(0, (95 * len(ordered) + 99) // 100 - 1)] if ordered else None
    return {
        'requests': len(durations),
        'invalid_lines': invalid,
        'status_classes': dict(sorted(status.items())),
        'methods': dict(sorted(methods.items())),
        'top_paths': [{'path': p, 'count': c} for p, c in sorted(paths.items(), key=lambda x: (-x[1], x[0]))[:10]],
        'average_duration_ms': round(sum(durations) / len(durations), 2) if durations else None,
        'p95_duration_ms': p95,
    }


def main(argv=None):
    parser = argparse.ArgumentParser(description='Summarize JSONL HTTP logs locally')
    parser.add_argument('file', type=Path, help='UTF-8 JSONL input file')
    parser.add_argument('--strict', action='store_true', help='Exit nonzero if any records are invalid')
    args = parser.parse_args(argv)
    try:
        with args.file.open(encoding='utf-8') as stream:
            report = summarize(stream)
    except (OSError, UnicodeError) as exc:
        parser.error(str(exc))
    print(json.dumps(report, indent=2))
    return 1 if args.strict and report['invalid_lines'] else 0


if __name__ == '__main__':
    sys.exit(main())
