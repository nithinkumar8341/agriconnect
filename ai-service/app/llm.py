import logging
from collections.abc import Callable

import anthropic

from app.config import Settings

log = logging.getLogger(__name__)

# A completion function takes (system, prompt) and returns text, or None when the LLM is not
# available. Features fall back to a rule-based answer on None, so the app never depends on it.
Complete = Callable[[str, str], str | None]


def make_complete(settings: Settings) -> Complete:
    if not settings.anthropic_api_key:
        return lambda _system, _prompt: None

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key, timeout=25.0, max_retries=1)

    def complete(system: str, prompt: str) -> str | None:
        try:
            response = client.beta.messages.create(
                model=settings.llm_model,
                # Replies are a few sentences; the headroom covers the model's thinking tokens.
                max_tokens=4096,
                system=system,
                messages=[{"role": "user", "content": prompt}],
                output_config={"effort": "low"},
                # If the model declines, the API retries on a fallback model in the same call.
                betas=["server-side-fallback-2026-07-01"],
                fallbacks="default",
            )
        except anthropic.APIError as err:
            log.warning("LLM call failed: %s", type(err).__name__)
            return None
        if response.stop_reason == "refusal":
            return None
        text = "".join(block.text for block in response.content if block.type == "text")
        return text.strip() or None

    return complete
