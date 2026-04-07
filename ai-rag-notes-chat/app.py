import os
import re
from collections import Counter
import streamlit as st
from dotenv import load_dotenv

load_dotenv()

def chunk_text(text: str, chunk_size: int = 450) -> list[str]:
    paragraphs = [p.strip() for p in text.split("\n") if p.strip()]
    chunks, current = [], ""
    for p in paragraphs:
        if len(current) + len(p) + 1 <= chunk_size:
            current += ("\n" if current else "") + p
        else:
            if current:
                chunks.append(current)
            current = p
    if current:
        chunks.append(current)
    return chunks

def tokenize(text: str) -> list[str]:
    return re.findall(r"[a-zA-Z][a-zA-Z0-9_-]+", text.lower())

def retrieve(question: str, chunks: list[str], top_k: int = 3) -> list[tuple[int, str]]:
    q_counts = Counter(tokenize(question))
    scored = []
    for i, chunk in enumerate(chunks):
        c_counts = Counter(tokenize(chunk))
        score = sum((q_counts & c_counts).values())
        scored.append((score, i, chunk))
    scored.sort(reverse=True, key=lambda x: x[0])
    return [(i, c) for score, i, c in scored[:top_k] if score > 0]

def local_answer(question: str, matches: list[tuple[int, str]]) -> str:
    if not matches:
        return "I could not find enough relevant information in the notes."
    joined = "\n\n".join([f"[Chunk {i}] {c}" for i, c in matches])
    return f"Based on the notes, here are the most relevant sections:\n\n{joined}"

def llm_answer(question: str, matches: list[tuple[int, str]]) -> str:
    from openai import OpenAI
    client = OpenAI(
        api_key=os.getenv("OPENAI_API_KEY"),
        base_url=os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1"),
    )
    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    context = "\n\n".join([f"[Chunk {i}] {c}" for i, c in matches])
    system = "Answer only from the provided context. If the answer is not in context, say so."
    user = f"Question: {question}\n\nContext:\n{context}"
    resp = client.chat.completions.create(
        model=model,
        temperature=0.2,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user}
        ]
    )
    return resp.choices[0].message.content

st.set_page_config(page_title="AI Notes Chat", page_icon="🧠", layout="wide")
st.title("🧠 AI Notes Chat (Mini RAG)")

default_notes = """OAuth uses tokens to authorize application access.
Access tokens are usually short-lived.
Refresh tokens can be used to obtain new access tokens.
TLS protects data in transit between a client and a server.
HTTP is an application protocol used by the web.
SSO allows one identity to access multiple applications."""

notes = st.text_area("Paste your notes or documentation", value=default_notes, height=220)
question = st.text_input("Ask a question", placeholder="What is the difference between access tokens and refresh tokens?")

if st.button("Answer", type="primary"):
    chunks = chunk_text(notes)
    matches = retrieve(question, chunks, top_k=3)
    st.subheader("Retrieved Chunks")
    if matches:
        for i, chunk in matches:
            st.write(f"**Chunk {i}:** {chunk}")
    else:
        st.write("No matching chunks found.")

    st.subheader("Answer")
    try:
        if os.getenv("OPENAI_API_KEY") and matches:
            st.write(llm_answer(question, matches))
            st.caption("Mode: llm")
        else:
            st.write(local_answer(question, matches))
            st.caption("Mode: local retrieval")
    except Exception as e:
        st.error(f"Error: {e}")
