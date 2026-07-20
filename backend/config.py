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

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()

# Setup key rotation list
gemini_keys: List[str] = []
if settings.GEMINI_API_KEY_1:
    gemini_keys.append(settings.GEMINI_API_KEY_1)
if settings.GEMINI_API_KEY_2:
    gemini_keys.append(settings.GEMINI_API_KEY_2)
if settings.GEMINI_API_KEY_3:
    gemini_keys.append(settings.GEMINI_API_KEY_3)

# Setup a round-robin cycle for standard operations
key_cycle = itertools.cycle(gemini_keys) if gemini_keys else None

def get_next_gemini_key() -> Optional[str]:
    if not gemini_keys:
        return None
    return next(key_cycle)

def get_all_gemini_keys() -> List[str]:
    return gemini_keys
