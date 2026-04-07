# AI Resume Match

A quick Streamlit app that compares a resume against a job description and returns:
- a match score
- strengths
- gaps
- tailored resume bullet suggestions
- interview prep questions

## Features
- Works with an OpenAI-compatible chat model
- Falls back to a local heuristic mode if no API key is set
- Good starter project for prompt engineering + practical job-tech use

## Run locally

```bash
python -m venv .venv
source .venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
cp .env.example .env
streamlit run app.py
```

## Environment variables

Set these in `.env`:

```env
OPENAI_API_KEY=your_key_here
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
```

## Notes
- If `OPENAI_API_KEY` is missing, the app uses a simple local keyword-based scorer.
- Never commit your real `.env` file.
