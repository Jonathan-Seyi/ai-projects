"""Dependency-free text chunking and retrieval for AI Notes Chat."""

from collections import Counter
import re
import textwrap

STOP_WORDS = frozenset({
    "a", "an", "and", "are", "as", "at", "be", "between", "by", "can", "do",
    "does", "for", "from", "how", "i", "in", "is", "it", "me", "of", "on",
    "or", "our", "the", "their", "these", "this", "to", "was", "we", "were",
    "what", "when", "where", "which", "who", "why", "with", "you", "your",
})


def chunk_text(text: str, chunk_size: int = 450) -> list[str]:
    """Split notes into nonempty, word-aware chunks of at most chunk_size chars."""
    if chunk_size < 1:
        raise ValueError("chunk_size must be a positive integer")

    chunks: list[str] = []
    current = ""
    for paragraph in (line.strip() for line in text.splitlines()):
        if not paragraph:
            continue
        for part in textwrap.wrap(
            paragraph,
            width=chunk_size,
            break_long_words=True,
            break_on_hyphens=False,
        ):
            candidate = f"{current}\n{part}" if current else part
            if len(candidate) > chunk_size:
                if current:
                    chunks.append(current)
                current = part
            else:
                current = candidate

    if current:
        chunks.append(current)
    return chunks


def tokenize(text: str) -> list[str]:
    """Extract lowercase word tokens without punctuation."""
    return re.findall(r"[a-z][a-z0-9_-]*", text.lower())


def retrieve(question: str, chunks: list[str], top_k: int = 3) -> list[tuple[int, str]]:
    """Rank chunks by shared meaningful terms, preserving note order on ties."""
    if top_k <= 0:
        return []
    query_counts = Counter(word for word in tokenize(question) if word not in STOP_WORDS)
    if not query_counts:
        return []

    scored = []
    for index, chunk in enumerate(chunks):
        chunk_counts = Counter(tokenize(chunk))
        score = sum((query_counts & chunk_counts).values())
        if score > 0:
            scored.append((score, index, chunk))
    scored.sort(key=lambda item: (-item[0], item[1]))
    return [(index, chunk) for _, index, chunk in scored[:top_k]]


def local_answer(question: str, matches: list[tuple[int, str]]) -> str:
    """Return evidence excerpts rather than fabricating an answer."""
    if not matches:
        return "I could not find enough relevant information in the notes."
    excerpts = "\n\n".join(f"[Chunk {index + 1}] {chunk}" for index, chunk in matches)
    return f"Based on the notes, here are the most relevant sections:\n\n{excerpts}"
