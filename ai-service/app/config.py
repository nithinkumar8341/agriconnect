import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    # Without a key every feature still answers, using the non-LLM fallback.
    anthropic_api_key: str
    llm_model: str
    # Shared secret with the backend; empty disables the check (local dev only).
    internal_key: str


def load_settings() -> Settings:
    return Settings(
        anthropic_api_key=os.getenv("ANTHROPIC_API_KEY", ""),
        llm_model=os.getenv("LLM_MODEL", "claude-opus-5-5"),
        internal_key=os.getenv("AI_INTERNAL_KEY", ""),
    )
