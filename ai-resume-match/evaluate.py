"""Evaluate keyword extraction against synthetic hand-labeled examples."""

import json
from pathlib import Path
from match_core import extract_keywords

DATASET = Path(__file__).with_name("evaluation_cases.json")


def evaluate(cases):
    """Return micro-averaged precision/recall and per-case diagnostics."""
    if not cases:
        raise ValueError("evaluation requires at least one case")
    totals = {"true_positive": 0, "false_positive": 0, "false_negative": 0}
    details = []
    for case in cases:
        expected = set(case["expected"])
        predicted = set(extract_keywords(case["text"]))
        found = predicted & expected
        extra = predicted - expected
        missed = expected - predicted
        totals["true_positive"] += len(found)
        totals["false_positive"] += len(extra)
        totals["false_negative"] += len(missed)
        details.append({"id": case["id"], "matched": sorted(found),
                        "unexpected": sorted(extra), "missing": sorted(missed)})
    tp, fp, fn = (totals[k] for k in ("true_positive", "false_positive", "false_negative"))
    precision = tp / (tp + fp) if tp + fp else 0.0
    recall = tp / (tp + fn) if tp + fn else 0.0
    return {"cases": len(cases), "precision": round(precision, 4),
            "recall": round(recall, 4),
            "f1": round(2 * precision * recall / (precision + recall), 4)
            if precision + recall else 0.0, **totals, "details": details}


def main():
    cases = json.loads(DATASET.read_text(encoding="utf-8"))
    print(json.dumps(evaluate(cases), indent=2))


if __name__ == "__main__":
    main()
