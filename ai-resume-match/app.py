import os
import re
from collections import Counter
import streamlit as st
from dotenv import load_dotenv

load_dotenv()

def extract_keywords(text: str) -> list[str]:
    words = re.findall(r"[A-Za-z][A-Za-z+#.\-]{1,}", text.lower())
    stop = {
        "the","and","for","with","you","your","are","this","that","have","has","will","from","into","our",
        "their","they","using","use","who","what","where","when","how","years","year","role","team","work",
        "works","strong","good","great","ability","experience","required","preferred","skills","skill",
        "knowledge","responsible","responsibilities"
    }
    return [w for w in words if w not in stop]

def heuristic_match(resume: str, job: str) -> dict:
    resume_words = set(extract_keywords(resume))
    job_words = extract_keywords(job)
    counts = Counter(job_words)
    top_job_words = [w for w, _ in counts.most_common(20)]
    overlap = [w for w in top_job_words if w in resume_words]
    missing = [w for w in top_job_words if w not in resume_words]
    score = min(100, int((len(overlap) / max(1, len(top_job_words))) * 100))
    return {
        "score": score,
        "strengths": overlap[:8],
        "gaps": missing[:8],
        "suggestions": [
            f"Emphasize experience with {word}" for word in missing[:5]
        ],
        "questions": [
            f"Tell me about your experience with {word}." for word in top_job_words[:5]
        ],
        "mode": "heuristic"
    }

def llm_match(resume: str, job: str) -> dict:
    from openai import OpenAI

    client = OpenAI(
        api_key=os.getenv("OPENAI_API_KEY"),
        base_url=os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1"),
    )
    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    system = """You are a precise career assistant. Analyze the resume against the job description.
Return JSON with keys: score (0-100 integer), strengths (array), gaps (array), suggestions (array), questions (array).
Keep arrays concise and useful."""
    user = f"RESUME:\n{resume}\n\nJOB DESCRIPTION:\n{job}"

    response = client.chat.completions.create(
        model=model,
        temperature=0.2,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    )
    import json
    data = json.loads(response.choices[0].message.content)
    data["mode"] = "llm"
    return data

st.set_page_config(page_title="AI Resume Match", page_icon="📄", layout="wide")
st.title("📄 AI Resume Match")
st.caption("Paste a resume and a job description to get a quick fit analysis.")

col1, col2 = st.columns(2)
with col1:
    resume = st.text_area("Resume text", height=350, placeholder="Paste your resume here...")
with col2:
    job = st.text_area("Job description", height=350, placeholder="Paste the job description here...")

if st.button("Analyze match", type="primary"):
    if not resume.strip() or not job.strip():
        st.error("Please paste both the resume and the job description.")
    else:
        try:
            if os.getenv("OPENAI_API_KEY"):
                result = llm_match(resume, job)
            else:
                result = heuristic_match(resume, job)

            st.subheader(f"Match score: {result.get('score', 0)}/100")
            st.caption(f"Mode: {result.get('mode', 'unknown')}")

            a, b = st.columns(2)
            with a:
                st.markdown("### Strengths")
                for item in result.get("strengths", []):
                    st.write(f"- {item}")
                st.markdown("### Gaps")
                for item in result.get("gaps", []):
                    st.write(f"- {item}")

            with b:
                st.markdown("### Resume Suggestions")
                for item in result.get("suggestions", []):
                    st.write(f"- {item}")
                st.markdown("### Interview Questions")
                for item in result.get("questions", []):
                    st.write(f"- {item}")
        except Exception as e:
            st.error(f"Error: {e}")
