# AI Resume Match

A privacy-conscious **Streamlit** demo for comparing a resume with a job description. It offers an explainable local keyword-coverage analysis, with an **optional, explicitly enabled** AI assessment.

## Features

- **Offline-by-default keyword mode:** compares up to 20 distinct, frequent job-description terms with resume text. Handles technology names such as `C++`, `C#`, `.NET`, `ASP.NET`, and `Node.js`, and normalizes common aliases like `JS` and `JavaScript`.
- **Multi-word skills:** recognizes phrases such as `machine learning`, `SQL Server`, `ASP.NET Core`, `unit testing`, `Spring Boot`, `Power BI`, `continuous integration`, and REST API variants as individual requirements rather than counting their component words separately. This is a curated list, not universal skill recognition.
- **Transparent scoring:** shows matched terms, total terms considered, and how coverage is calculated. Repeating a keyword does not inflate the score.
- **Honest resume suggestions:** prompts you to add examples only when they reflect actual experience, rather than inventing qualifications.
- **Optional AI mode:** an opt-in checkbox appears only when an API key is configured. AI output is validated before display; failures fall back to local analysis.
- **Automated tests:** dependency-free `unittest` coverage for tokenization, scoring, edge cases, and AI response validation.

**Important:** Neither the keyword score nor the optional AI score measures your chance of being hired. Keyword matching cannot assess context, proficiency, seniority, or the full requirements of a job.

## Run locally

Requires **Python 3.10+**. From this directory:

```bash
python -m venv .venv
```

Activate the environment with `source .venv/bin/activate` (macOS/Linux) or `.venv\Scripts\Activate.ps1` (PowerShell), then:

```bash
python -m pip install -r requirements.txt
streamlit run app.py
```

Open the local URL shown by Streamlit (normally `http://localhost:8501`). No API key is needed for keyword mode.

## Optional AI configuration and privacy

Create a local `.env` file (do not commit it) based on `.env.example`:

```env
OPENAI_API_KEY=your_key_here
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
```

**Having a key does not automatically send any text.** To use the external model, you must explicitly check **Use cloud AI** before clicking **Analyze match**. In AI mode, **both the resume and job description are sent to the configured API provider**, which may charge for usage. If you change `OPENAI_BASE_URL`, your data goes to that provider instead. Remove private contact details and other sensitive information before sharing documents with a third-party service. No API requests occur in local keyword mode.

The app does not persist submitted text to a database. Streamlit processes it in the local session. Do not deploy this demo with real user data without adding an appropriate privacy and security review.

## Tests

No third-party packages are needed to run the core tests:

```bash
python -m unittest discover -s tests -v
```

These tests cover the pure matching functions and AI result validation. They **do not** test a live AI provider or the Streamlit interface.

## Project layout

- `app.py` — Streamlit UI and optional API call.
- `match_core.py` — dependency-free tokenization, keyword scoring and response validation.
- `tests/test_match_core.py` — automated unit tests.
- `.github/workflows/resume-match-tests.yml` (at the repository root) — Python CI.

## Limitations and roadmap

- [x] Explain keyword coverage and preserve punctuation-heavy tech names.
- [x] Add explicit consent before sending resume data to an external AI API.
- [x] Add unit tests and CI.
- [ ] Evaluate keyword recall on anonymized sample job postings.
- [x] Add curated multi-word skill phrases and explainable REST API synonym mappings.
- [ ] Expand the skill phrase list based on measured results from anonymized job postings.
- [ ] Add Streamlit UI smoke tests without sending private documents to an API.
