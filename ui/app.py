import os
import uuid
from datetime import date
import requests
import streamlit as st
from dotenv import load_dotenv

load_dotenv()
API_URL = os.getenv("API_URL", "http://localhost:8000")

st.set_page_config(page_title="SchemeSathi — Mitrapur Pradesh", page_icon="🏛️", layout="wide")

# --- Session State Initialization ---
if "conversation_id" not in st.session_state:
    st.session_state.conversation_id = f"C-{uuid.uuid4().hex[:6].upper()}"
if "messages" not in st.session_state:
    st.session_state.messages = []

# --- Helper: Mock Response for UI Testing Before Backend is Ready ---
def get_mock_response(user_text: str, lang: str, as_of: str):
    if "book" in user_text.lower() or "slot" in user_text.lower():
        return {
            "trace_id": "mock1234",
            "conversation_id": st.session_state.conversation_id,
            "answer_type": "confirmation_needed",
            "language": lang if lang != "auto" else "en",
            "answer": "I found a slot at Jan Seva Kendra, Nayagaon Block. Please confirm if you want me to book it.",
            "citations": [],
            "tools_invoked": [],
            "pending_action": {
                "action_id": "ACT-0058",
                "action_type": "book_appointment",
                "summary": "Jan Seva Kendra, Nayagaon Block, Sat 21 Nov 2026, 11:00",
                "reminder": "Fri 20 Nov 2026, 18:00",
                "tier": 1,
                "expires_at": "2026-11-21T18:30:00+05:30",
            },
            "critic": {"groundedness": 0.98, "promise_risk": "none", "decision": "answer", "revisions": 0},
            "referral_id": None,
            "as_of_date": as_of,
        }
    return {
        "trace_id": "7d20b6ee",
        "conversation_id": st.session_state.conversation_id,
        "answer_type": "answered",
        "language": lang if lang != "auto" else "hi",
        "answer": "आपकी माँ की उम्र 67 वर्ष और परिवार की सालाना आय ₹1,20,000 है। वे वृद्धजन पेंशन योजना (Vriddhjan Pension Yojana) के लिए आवेदन करने की पात्र लगती हैं। अंतिम निर्णय विभाग का होगा। (स्रोत: GL-PEN-01, धारा 3)",
        "citations": [
            {
                "source_id": "GL-PEN-01",
                "doc_type": "guideline",
                "section": "3 Eligibility",
                "scheme_id": "SCH-PEN-01",
                "effective_from": "2026-04-01",
                "last_updated": "2026-09-10",
            }
        ],
        "tools_invoked": [
            {
                "tool": "check_eligibility",
                "output": {
                    "scheme_id": "SCH-PEN-01",
                    "verdict": "appears_eligible",
                    "rules": [
                        {"rule_id": "PEN-R1", "attribute": "age", "result": "passed"},
                        {"rule_id": "PEN-R2", "attribute": "annual_household_income", "result": "passed"},
                    ],
                },
            }
        ],
        "pending_action": None,
        "critic": {"groundedness": 0.95, "coverage": "complete", "language_fidelity": "good", "pii_risk": "none", "promise_risk": "none", "decision": "answer", "revisions": 0},
        "referral_id": None,
        "as_of_date": as_of,
    }

# --- Sidebar Controls ---
with st.sidebar:
    st.header("⚙️ Citizen & Session")
    dark_mode = st.toggle("🌙 Dark Mode", value=True)
    citizen_id = st.text_input("Citizen ID (X-Citizen-Id)", value="C1001", help="Use 'guest' for anonymous session")
    language = st.selectbox("Preferred Language", ["auto", "en", "hi", "kn", "ta"])
    as_of_date = st.date_input("As of Date", value=date.today())
    mock_mode = st.toggle("🧪 UI Mock Mode (No Backend)", value=True)

    st.divider()
    if st.button("➕ New Conversation", use_container_width=True):
        st.session_state.conversation_id = f"C-{uuid.uuid4().hex[:6].upper()}"
        st.session_state.messages = []
        st.rerun()

    st.caption(f"Conversation ID: `{st.session_state.conversation_id}`")

    # Health Check
    st.divider()
    if st.button("🩺 Check API Health", use_container_width=True):
        try:
            r = requests.get(f"{API_URL}/health", timeout=5)
            st.success(f"API Online ({r.status_code})")
            st.json(r.json())
        except Exception as e:
            st.error(f"API Offline: {e}")
# --- Custom Theme CSS (Dark / Light Toggle with Blue Accent) ---
if dark_mode:
    bg_main = "#13192B"
    bg_sidebar = "#1B233A"
    bg_card = "#1E2942"
    text_color = "#F1F5F9"
    subtext_color = "#94A3B8"
    accent = "#4A6CF7"
    accent_hover = "#3B5BDB"
    border_color = "rgba(74, 108, 247, 0.30)"
    glow = "0 0 12px rgba(74, 108, 247, 0.35)"
else:
    bg_main = "#F8FAFC"
    bg_sidebar = "#FFFFFF"
    bg_card = "#FFFFFF"
    text_color = "#0F172A"
    subtext_color = "#475569"
    accent = "#3B5BDB"
    accent_hover = "#2B4ACB"
    border_color = "rgba(59, 91, 219, 0.25)"
    glow = "0 4px 12px rgba(59, 91, 219, 0.15)"

st.markdown(f"""
<style>
    /* Main & Sidebar Backgrounds */
    .stApp {{
        background-color: {bg_main};
        color: {text_color};
    }}
    [data-testid="stSidebar"] {{
        background-color: {bg_sidebar};
        border-right: 1px solid {border_color};
    }}
    /* Typography */
    h1, h2, h3, p, span, label, .stMarkdown {{
        color: {text_color} !important;
    }}
    .stCaption {{
        color: {subtext_color} !important;
    }}
    /* Chat Messages & Cards */
    [data-testid="stChatMessage"] {{
        background-color: {bg_card};
        border: 1px solid {border_color};
        border-radius: 12px;
        padding: 12px 16px;
        margin-bottom: 10px;
    }}
    /* Primary Accent Buttons with Soft Blue Glow */
    .stButton > button {{
        background-color: {accent};
        color: #FFFFFF !important;
        border: none;
        border-radius: 8px;
        font-weight: 600;
        transition: all 0.2s ease;
        box-shadow: {glow};
    }}
    .stButton > button:hover {{
        background-color: {accent_hover};
        transform: translateY(-1px);
    }}
    /* Chat Input Box */
    [data-testid="stChatInput"] {{
        border-radius: 12px;
        border: 1px solid {border_color};
        box-shadow: {glow};
    }}
    /* Expanders */
    .streamlit-expanderHeader {{
        background-color: {bg_card};
        border-radius: 8px;
    }}
</style>
""", unsafe_allow_html=True)

# --- Main Header ---
st.title("🏛️ SchemeSathi — Mitrapur Pradesh")
st.caption("Multilingual Citizen Scheme Navigator | हिंदी • ಕನ್ನಡ • தமிழ் • English • Hinglish")

# --- Action Confirm / Cancel Handler ---
def handle_action(action_id: str, decision: str):
    if mock_mode:
        st.toast(f"Mock: Action {action_id} {decision}ed!", icon="✅" if decision == "confirm" else "❌")
        return
    try:
        res = requests.post(
            f"{API_URL}/actions/{action_id}/{decision}",
            headers={"X-Citizen-Id": citizen_id},
            timeout=15,
        )
        data = res.json()
        st.session_state.messages.append({"role": "assistant", "content": data.get("answer", f"Action {decision}ed."), "meta": data})
        st.rerun()
    except Exception as e:
        st.error(f"Failed to {decision} action: {e}")

# --- Render Chat History ---
for idx, msg in enumerate(st.session_state.messages):
    with st.chat_message(msg["role"]):
        meta = msg.get("meta")
        if meta and meta.get("answer_type"):
            st.caption(f"Type: `{meta['answer_type']}` | Lang: `{meta.get('language', '-')}`")

        st.markdown(msg["content"])

        if not meta:
            continue

        # 1. Pending Action Card (Confirm / Cancel)
        pending = meta.get("pending_action")
        if pending:
            with st.container(border=True):
                st.markdown(f"**🔔 Action Confirmation Required (`{pending.get('action_type')}`)**")
                st.write(pending.get("summary", ""))
                if pending.get("reminder"):
                    st.caption(f"Reminder: {pending['reminder']}")
                c1, c2 = st.columns(2)
                if c1.button("✅ Confirm", key=f"conf_{idx}_{pending['action_id']}", use_container_width=True):
                    handle_action(pending["action_id"], "confirm")
                if c2.button("❌ Cancel", key=f"canc_{idx}_{pending['action_id']}", use_container_width=True):
                    handle_action(pending["action_id"], "cancel")

        # 2. Referral Banner
        if meta.get("referral_id"):
            st.warning(f"👤 Referred to Human Officer — Referral ID: `{meta['referral_id']}`")

        # 3. Eligibility Rule Breakdown
        for tool in meta.get("tools_invoked", []):
            if tool.get("tool") == "check_eligibility" and isinstance(tool.get("output"), dict):
                out = tool["output"]
                with st.expander(f"📋 Eligibility Check: {out.get('scheme_id')} → {out.get('verdict')}"):
                    if out.get("rules"):
                        st.table(out["rules"])

        # 4. Citations Expander
        citations = meta.get("citations", [])
        if citations:
            with st.expander(f"📚 Sources & Citations ({len(citations)})"):
                for c in citations:
                    st.markdown(
                        f"- **{c.get('source_id')}** ({c.get('doc_type')}) — Section: `{c.get('section')}` | "
                        f"Effective: `{c.get('effective_from')}` | Updated: `{c.get('last_updated')}`"
                    )

        # 5. Critic & Audit Inspector
        if meta.get("critic") or meta.get("trace_id"):
            with st.expander("🔍 Audit & Critic Details"):
                st.json({"trace_id": meta.get("trace_id"), "intent": meta.get("intent"), "critic": meta.get("critic")})

# --- Chat Input ---
if prompt := st.chat_input("Ask about welfare schemes in English, हिंदी, ಕನ್ನಡ, தமிழ், or Hinglish..."):
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)

    with st.spinner("Checking rules and guidelines..."):
        if mock_mode:
            data = get_mock_response(prompt, language, str(as_of_date))
        else:
            payload = {
                "message": prompt,
                "conversation_id": st.session_state.conversation_id,
                "as_of_date": str(as_of_date),
            }
            if language != "auto":
                payload["language"] = language
            try:
                res = requests.post(
                    f"{API_URL}/ask",
                    headers={"X-Citizen-Id": citizen_id},
                    json=payload,
                    timeout=60,
                )
                res.raise_for_status()
                data = res.json()
            except Exception as e:
                data = {"answer_type": "error", "answer": f"⚠️ Could not reach backend API: `{e}`"}

    st.session_state.messages.append({
        "role": "assistant",
        "content": data.get("answer", "No response received."),
        "meta": data,
    })
    st.rerun()