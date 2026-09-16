import logging
import time
from typing import Any, Dict, Type, TypeVar

from pydantic import BaseModel

from app.core.config import settings
from app.providers.base import BaseLLMProvider

T = TypeVar("T", bound=BaseModel)
logger = logging.getLogger("hiresense-ai.providers.llm")


class LlmProviderError(RuntimeError):
    """A configuration or provider failure that must fail resume processing."""


class GroqLLMProvider(BaseLLMProvider):
    """Groq structured parsing. Fixtures require AI_MOCK_MODE=true."""

    def __init__(self):
        self.api_key = settings.GROQ_API_KEY
        self.model_name = settings.GROQ_MODEL
        self.client = None

    def _client(self):
        if settings.AI_MOCK_MODE:
            return None
        if not self.api_key or self.api_key == "mock-key":
            raise LlmProviderError("GROQ_API_KEY must be configured for real resume parsing")
        if self.client is None:
            try:
                import instructor
                from openai import OpenAI
                self.client = instructor.from_openai(
                    OpenAI(base_url="https://api.groq.com/openai/v1", api_key=self.api_key),
                    mode=instructor.Mode.JSON,
                )
            except Exception as exc:
                raise LlmProviderError("Unable to initialize the Groq Instructor client") from exc
        return self.client

    def generate_structured(self, system_prompt: str, user_prompt: str, response_model: Type[T]) -> T:
        if settings.AI_MOCK_MODE:
            logger.warning("AI_MOCK_MODE is enabled; using deterministic parsed-resume fixture")
            return self._generate_mock_schema_response(response_model)
        try:
            started = time.monotonic()
            parsed = self._client().chat.completions.create(
                model=self.model_name,
                response_model=response_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
            )
            logger.info("Groq structured parsing completed in %dms", int((time.monotonic() - started) * 1000))
            return parsed
        except LlmProviderError:
            raise
        except Exception as exc:
            raise LlmProviderError(f"Groq structured parsing failed: {exc}") from exc

    def generate_text(self, system_prompt: str, user_prompt: str) -> Dict[str, Any]:
        raise LlmProviderError("Text generation is not used by the resume parsing slice")

    def _generate_mock_schema_response(self, response_model: Type[T]) -> T:
        if response_model.__name__ == "ParsedResumeSchema":
            from app.pipelines.models import ParsedResumeSchema
            return ParsedResumeSchema(
                first_name="Development", last_name="Fixture", email="dev.candidate@hiresense.local",
                phone=None, github_url=None, linkedin_url=None,
                skills=["Java", "Spring Boot", "Python"], education=[],
                experience=[], projects=[], certifications=[],
            )
        raise LlmProviderError(f"No explicit mock fixture exists for {response_model.__name__}")
