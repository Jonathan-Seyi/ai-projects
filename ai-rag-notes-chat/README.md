# AI Notes Chat (Mini RAG)

A beginner-friendly mini RAG project:
- paste notes or documentation
- ask questions about the pasted content
- retrieve the most relevant chunks before answering

## What it shows
- chunking
- naive semantic-style retrieval using keyword overlap
- grounding answers in source text
- optional LLM answer generation

## Run locally

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
streamlit run app.py
```
