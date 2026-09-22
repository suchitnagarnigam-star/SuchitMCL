import os
from pydantic_settings import BaseSettings
from typing import List, Optional
import itertools

class Settings(BaseSettings):
    MISTRAL_API_KEY: str = ""
    GEMINI_API_KEY_1: str = ""
    GEMINI_API_KEY_2: str = ""
    GEMINI_API_KEY_3: str = ""
    ANTHROPIC_API_KEY: str = ""
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_KEY: str = ""
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    GOOGLE_SHEET_WEBHOOK_URL: str = ""
    GOOGLE_SHEET_ID: str = ""
    GOOGLE_SHEET_TAB_NAME: str = "Sheet1"
    DAAK_APPSCRIPT_URL: str = "https://script.google.com/macros/s/AKfycbx-k0qVOj8T9kT_zqAyQ8pZpaFpFO9JqusFKdudH8dqEg5T7nTk4Seg-H1r8aWK79jHkA/exec"

    class Config:
        env_file = (os.path.join(os.path.dirname(__file__), ".env"), ".env")
        extra = "ignore"

settings = Settings()

def get_all_gemini_keys() -> List[str]:
    candidate_keys = [
        settings.GEMINI_API_KEY_1,
        settings.GEMINI_API_KEY_2,
        settings.GEMINI_API_KEY_3,
        os.getenv("GEMINI_API_KEY_1", ""),
        os.getenv("GEMINI_API_KEY_2", ""),
        os.getenv("GEMINI_API_KEY_3", ""),
        os.getenv("GEMINI_API_KEY", "")
    ]
    resolved = []
    for k in candidate_keys:
        clean = (k or "").strip()
        if clean and clean not in resolved and not clean.startswith("your_"):
            resolved.append(clean)
    return resolved

_key_cycle = None
_last_key_count = 0

def get_next_gemini_key() -> Optional[str]:
    global _key_cycle, _last_key_count
    keys = get_all_gemini_keys()
    if not keys:
        return None
    if _key_cycle is None or len(keys) != _last_key_count:
        _key_cycle = itertools.cycle(keys)
        _last_key_count = len(keys)
    return next(_key_cycle)
