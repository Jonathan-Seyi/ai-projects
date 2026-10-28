# AI Notes Chat (Mini RAG)

A beginner-friendly Streamlit app that searches pasted notes and optionally uses an OpenAI-compatible model to answer questions from retrieved passages.

## Features

- Splits notes into **size-bounded chunks**, including long paragraphs and unusually long words.
- Ranks relevant passages using **case-insensitive keyword overlap** and excludes common question words.
- Displays numbered evidence passages alongside answers.
- Runs without an API key in **local evidence retrieval mode**. With an API key, it can request a model-generated answer restricted to retrieved context.
- Falls back to local evidence if the external AI call fails.
- Keeps text chunking and retrieval in a dependency-free module with unit tests.

**Scope:** This is a lightweight retrieval demo, not semantic search or a full vector-database RAG system. Keyword matching will miss paraphrases and synonyms. A model response may still be incorrect, so verify important claims against the displayed evidence.

## Quick start

1. Use Python 3.10 or later.
2. Open a terminal in this project's directory.
3. Create and activate a virtual environment.
4. Install dependencies and start Streamlit:

```bash
python -m pip install -r requirements.txt
streamlit run app.py
```

On macOS/Linux, you can create and activate a virtual environment with `python -m venv .venv` followed by `source .venv/bin/activate`. On Windows PowerShell, use `.venv\Scripts\Activate.ps1`.

## Optional AI configuration

Copy `.env.example` to `.env` and set:

```env
OPENAI_API_KEY=your_key_here
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
```

If the key is unset, the app **never calls the model**. When configured, asking a question may send the relevant passages from your notes to the API service, which may have costs. **Do not paste private or sensitive notes without appropriate authorization.** Never commit `.env` or real credentials.

## Run tests

No external dependencies are required for the retrieval unit tests:

```bash
python -m unittest discover -s tests -v
```

The tests cover chunk limits, empty input, long tokens, case normalization, stable ranking, nonmatching questions, and labeled evidence. They do not test Streamlit rendering or live model responses.

## Next steps

- Add optional semantic embeddings and compare retrieval accuracy on a small evaluation set.
- Add document upload with appropriate file-size and privacy safeguards.
- Evaluate grounded responses using real test questions with cited passages.
