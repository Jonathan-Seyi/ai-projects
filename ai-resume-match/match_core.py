"""Transparent, dependency-free keyword analysis for AI Resume Match.

This is a keyword-coverage demo, not a prediction of hiring outcomes.
"""

from collections import Counter
import re

# Common job-ad language that says little about a candidate's technical fit.
STOP_WORDS = frozenset("""
    a an and are as at be by can candidate candidates company demonstrated do does
    excellent experience experienced for from good great have has in include including
    into is it job knowledge looking must of on or our preferred preferably required
    requirements responsible responsibilities role should skills skill strong team
    that the their them these they this to us using we will with work working years
    year you your ability abilities proven position opportunity successful
""".split())

# Keep technology names with punctuation intact (e.g., C++, C#, .NET).
# Match multi-word technology names before single words to avoid counting
# their individual components as separate job requirements.
PHRASES = (
    r"machine[\s-]+learning|data[\s-]+analysis|sql[\s-]+server|"
    r"unit[\s-]+testing|spring[\s-]+boot|power[\s-]+bi|"
    r"continuous[\s-]+integration|asp\.net[\s-]+core|rest(?:ful)?[\s-]+apis?"
)
TOKEN_PATTERN = re.compile(
    r"(?<![a-z0-9_])(?:" + PHRASES +
    r"|asp\.net|node\.js|\.net|c\+\+|c#|[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*)(?![a-z0-9_])",
    re.IGNORECASE,
)
ALIASES = {
    "js": "javascript",
    "nodejs": "node.js",
    "react.js": "react",
    "dotnet": ".net",
    "csharp": "c#",
    "cplusplus": "c++",
    "postgres": "postgresql",
    "restful api": "rest api",
    "rest apis": "rest api",
    "restful apis": "rest api",
}


def extract_keywords(text: str) -> list[str]:
    """Return normalized keywords, preserving recognized multi-word skills."""
    tokens = (
        re.sub(r"[\\s-]+", " ", word.lower())
        for word in TOKEN_PATTERN.findall(text)
    )
    return [ALIASES.get(word, word) for word in tokens
            if word not in STOP_WORDS and len(word) > 1]


def heuristic_match(resume: str, job: str, max_terms: int = 20) -> dict:
    """Compare up to 20 frequent, distinct job terms against resume keywords.

    The score is *keyword coverage*, not suitability, seniority or hiring odds.
    Repetition in a resume does not increase the score.
    """
    if max_terms < 1:
        raise ValueError("max_terms must be positive")
    job_terms = [term for term, _ in Counter(extract_keywords(job)).most_common(max_terms)]
    resume_terms = set(extract_keywords(resume))
    matched = [term for term in job_terms if term in resume_terms]
    missing = [term for term in job_terms if term not in resume_terms]
    total = len(job_terms)
    score = round(100 * len(matched) / total) if total else 0

    return {
        "score": score,
        "strengths": matched[:8],
        "gaps": missing[:8],
        "suggestions": [
            f"If accurate, add a concrete example of your experience with {term}."
            for term in missing[:5]
        ],
        "questions": [f"How have you used {term} in a project or role?" for term in job_terms[:5]],
        "matched_count": len(matched),
        "total_keywords": total,
        "keywords_considered": job_terms,
        "mode": "heuristic",
    }


def validate_ai_result(data: object) -> dict:
    """Reject malformed AI output before the UI tries to display it."""
    if not isinstance(data, dict):
        raise ValueError("AI result must be a JSON object")
    score = data.get("score")
    if isinstance(score, bool) or not isinstance(score, int) or not 0 <= score <= 100:
        raise ValueError("AI score must be an integer between 0 and 100")

    result = {"score": score, "mode": "llm"}
    for field in ("strengths", "gaps", "suggestions", "questions"):
        items = data.get(field)
        if not isinstance(items, list) or any(not isinstance(item, str) for item in items):
            raise ValueError(f"AI {field} must be a list of strings")
        result[field] = [item.strip()[:300] for item in items if item.strip()][:8]
    return result
