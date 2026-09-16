import logging
import os
import time

import requests

from app.celery_app import celery_app
from app.core.config import settings
from app.core.prompts import load_prompt_template
from app.pipelines.models import ParsedResumeSchema
from app.pipelines.parser import parse_resume_document
from app.providers.embedding_provider import LocalEmbeddingProvider
from app.providers.llm_provider import GroqLLMProvider

logger = logging.getLogger("hiresense-ai.tasks")
llm_provider = GroqLLMProvider()
embedding_provider = LocalEmbeddingProvider()
MAX_CALLBACK_RETRIES = 3


def _confidence(raw_text: str, parsed: ParsedResumeSchema) -> float:
    """Transparent completeness metric, not a claimed LLM confidence score."""
    signals = [bool(parsed.email), bool(parsed.skills), bool(parsed.experience), len(raw_text.strip()) >= 250]
    return round(0.55 + (sum(signals) / len(signals)) * 0.4, 2)


def _callback(payload: dict) -> None:
    response = requests.post(settings.BACKEND_CALLBACK_URL, json=payload, timeout=15)
    response.raise_for_status()


def _failure_payload(resume_id: str, error_message: str, latency_ms: int = 0) -> dict:
    return {
        "resume_id": resume_id,
        "status": "FAILED",
        "error_message": error_message[:2000],
        "log_record": {
            "request_type": "PARSING",
            "model_name": settings.GROQ_MODEL if not settings.AI_MOCK_MODE else "development-fixture",
            "latency_ms": latency_ms,
            "tokens_input": 0,
            "tokens_output": 0,
            "calculated_cost": 0.0,
            "status": "ERROR",
            "error_message": error_message[:2000],
        },
    }


@celery_app.task(bind=True, name="app.pipelines.tasks.parse_resume_task")
def parse_resume_task(self, resume_id: str, file_key: str) -> bool:
    """Extract, parse, embed, then report to Spring—the sole database owner."""
    started = time.monotonic()
    try:
        file_path = os.path.join(settings.LOCAL_STORAGE_DIR, file_key)
        if not os.path.isfile(file_path):
            raise FileNotFoundError(f"Uploaded resume was not found in shared storage: {file_key}")

        raw_text = parse_resume_document(file_path)
        if not raw_text or not raw_text.strip():
            raise ValueError("No extractable text was found in the resume")

        system_prompt = load_prompt_template("parse_resume")
        user_prompt = f"Parse the following resume content:\n\n{raw_text}"
        parsed = llm_provider.generate_structured(system_prompt, user_prompt, ParsedResumeSchema)

        embed_parts = []
        if parsed.skills:
            embed_parts.append(f"Skills: {', '.join(parsed.skills)}.")
        for item in parsed.experience:
            resp = " ".join(item.responsibilities) if item.responsibilities else ""
            embed_parts.append(f"{item.title} at {item.company}. {resp}".strip())
        if parsed.summary:
            embed_parts.append(parsed.summary.strip())

        text_to_embed = " ".join(filter(None, embed_parts)).strip()
        if not text_to_embed:
            text_to_embed = raw_text.strip()[:2000]

        embedding = embedding_provider.get_embedding(text_to_embed)
        if len(embedding) != 384:
            raise ValueError(f"Embedding dimension was {len(embedding)}; expected 384")

        latency_ms = int((time.monotonic() - started) * 1000)
        payload = {
            "resume_id": resume_id,
            "status": "SUCCESS",
            "raw_resume_text": raw_text,
            "parsed_resume_json": parsed.model_dump_json(),
            "resume_embedding": embedding,
            "parsing_confidence": _confidence(raw_text, parsed),
            "log_record": {
                "request_type": "PARSING",
                "model_name": settings.GROQ_MODEL if not settings.AI_MOCK_MODE else "development-fixture",
                "latency_ms": latency_ms,
                "tokens_input": len(user_prompt.split()),
                "tokens_output": len(parsed.model_dump_json().split()),
                "calculated_cost": 0.0,
                "status": "SUCCESS",
            },
        }
        _callback(payload)
        logger.info("Resume %s parsed and persisted by Spring callback", resume_id)
        return True
    except requests.RequestException as exc:
        if self.request.retries < MAX_CALLBACK_RETRIES:
            delay_seconds = 2 ** self.request.retries
            logger.warning("Callback attempt %s failed for resume %s; retrying", self.request.retries + 1, resume_id)
            raise self.retry(exc=exc, countdown=delay_seconds, max_retries=MAX_CALLBACK_RETRIES)
        error = f"Spring callback remained unavailable after retries: {exc}"
        logger.exception(error)
        _best_effort_failure_callback(resume_id, error, started)
        return False
    except Exception as exc:
        error = str(exc) or exc.__class__.__name__
        logger.exception("Resume processing failed for %s", resume_id)
        _best_effort_failure_callback(resume_id, error, started)
        return False


def _best_effort_failure_callback(resume_id: str, error: str, started: float) -> None:
    try:
        _callback(_failure_payload(resume_id, error, int((time.monotonic() - started) * 1000)))
    except requests.RequestException:
        logger.exception("Unable to persist failure callback for resume %s", resume_id)
