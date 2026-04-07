import os
import re
import streamlit as st
from dotenv import load_dotenv

load_dotenv()

def heuristic_analyze(ticket: str) -> dict:
    lowered = ticket.lower()
    priority = "High" if any(x in lowered for x in ["down", "urgent", "can't", "cannot", "error", "failed"]) else "Normal"
    issue_type = "Access / Authentication" if any(x in lowered for x in ["login", "password", "mfa", "access"]) else "Application Issue"
    steps = []
    for line in ticket.splitlines():
        if re.search(r"(click|open|enter|submit|login|select)", line.lower()):
            steps.append(line.strip())
    steps = steps[:5] or ["Reproduction steps not clearly provided."]
    owner = "Application Support" if "app" in lowered or "page" in lowered else "IT Support"
    summary = ticket[:220] + ("..." if len(ticket) > 220 else "")
    reply = f"""Hi,

Thanks for reporting this issue. I’ve reviewed the details and logged it for further investigation.

Current priority: {priority}
Likely category: {issue_type}

If possible, please also share:
- the exact time the issue occurred
- a screenshot of the error
- the steps you took before the issue happened

We’ll keep you updated as we investigate.

Best,
Support Team"""
    return {
        "summary": summary,
        "priority": priority,
        "issue_type": issue_type,
        "owner": owner,
        "steps": steps,
        "reply": reply,
        "mode": "heuristic"
    }

def llm_analyze(ticket: str) -> dict:
    from openai import OpenAI
    import json

    client = OpenAI(
        api_key=os.getenv("OPENAI_API_KEY"),
        base_url=os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1"),
    )
    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    system = """You are a support operations assistant.
Return JSON with keys: summary, priority, issue_type, owner, steps, reply.
Be practical and concise."""
    resp = client.chat.completions.create(
        model=model,
        temperature=0.2,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": ticket},
        ]
    )
    data = json.loads(resp.choices[0].message.content)
    data["mode"] = "llm"
    return data

st.set_page_config(page_title="AI Support Ticket Assistant", page_icon="🎫", layout="wide")
st.title("🎫 AI Support Ticket Assistant")

sample = """Hi team,
A few users in Toronto cannot log into the dashboard after the MFA prompt. They enter the code, then the page refreshes and returns them to the login screen. This started around 9:10 AM today after the latest update.
Tried Chrome and Edge. Cleared cache. Same issue."""

ticket = st.text_area("Paste the support ticket", value=sample, height=250)

if st.button("Analyze ticket", type="primary"):
    try:
        result = llm_analyze(ticket) if os.getenv("OPENAI_API_KEY") else heuristic_analyze(ticket)
        st.caption(f"Mode: {result['mode']}")
        left, right = st.columns(2)
        with left:
            st.subheader("Summary")
            st.write(result["summary"])
            st.subheader("Classification")
            st.write(f"**Priority:** {result['priority']}")
            st.write(f"**Issue Type:** {result['issue_type']}")
            st.write(f"**Likely Owner:** {result['owner']}")
        with right:
            st.subheader("Likely Reproduction Steps")
            for step in result.get("steps", []):
                st.write(f"- {step}")
            st.subheader("Draft Reply")
            st.code(result["reply"])
    except Exception as e:
        st.error(f"Error: {e}")
