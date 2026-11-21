import os
import streamlit as st
from dotenv import load_dotenv

load_dotenv()
API_URL = os.getenv("API_URL", "http://localhost:8000")

st.set_page_config(page_title="SchemeSathi", page_icon="🏛️", layout="wide")
st.title("🏛️ SchemeSathi — Mitrapur Pradesh")
st.write("Script check: **हिंदी** | **ಕನ್ನಡ** | **தமிழ்** | **English**")
st.info(f"API Target: `{API_URL}`")