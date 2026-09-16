"""Versioned prompt loading shared by AI pipelines."""
from pathlib import Path
import logging

logger = logging.getLogger("hiresense-ai.prompts")
PROMPT_DIRECTORY = Path(__file__).resolve().parents[1] / "prompts" / "v1"

def load_prompt_template(name: str) -> str:
    path = PROMPT_DIRECTORY / f"{name}.md"
    try:
        return path.read_text(encoding="utf-8")
    except OSError:
        logger.exception("Prompt template is unavailable", extra={"prompt": name})
        raise ValueError(f"Prompt template '{name}' is unavailable")
