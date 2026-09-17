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
        self.raw_client = None

    def _client(self):
        if settings.AI_MOCK_MODE:
            return None
        if not self.api_key or self.api_key == "mock-key":
            raise LlmProviderError("GROQ_API_KEY must be configured for real resume parsing")
        if self.client is None:
            try:
                import instructor
                from openai import OpenAI
                self.raw_client = OpenAI(base_url="https://api.groq.com/openai/v1", api_key=self.api_key)
                self.client = instructor.from_openai(
                    self.raw_client,
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
        if settings.AI_MOCK_MODE:
            logger.warning("AI_MOCK_MODE is enabled; using deterministic text fixture")
            return {
                "text": "Based on the provided resume excerpts, the candidate has relevant software engineering experience.",
                "model": "development-fixture",
                "tokens_input": len(user_prompt.split()),
                "tokens_output": 15,
                "latency_ms": 10,
            }
        try:
            started = time.monotonic()
            self._client()
            client = self.raw_client if self.raw_client is not None else self._client()
            response = client.chat.completions.create(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.1,
            )
            latency_ms = int((time.monotonic() - started) * 1000)
            choice = response.choices[0].message.content or ""
            usage = getattr(response, "usage", None)
            tokens_in = getattr(usage, "prompt_tokens", len(user_prompt.split())) if usage else len(user_prompt.split())
            tokens_out = getattr(usage, "completion_tokens", len(choice.split())) if usage else len(choice.split())
            logger.info("Groq text generation completed in %dms", latency_ms)
            return {
                "text": choice.strip(),
                "model": self.model_name,
                "tokens_input": tokens_in,
                "tokens_output": tokens_out,
                "latency_ms": latency_ms,
            }
        except LlmProviderError:
            raise
        except Exception as exc:
            raise LlmProviderError(f"Groq text generation failed: {exc}") from exc

    def _generate_mock_schema_response(self, response_model: Type[T]) -> T:
        if response_model.__name__ == "ParsedResumeSchema":
            from app.pipelines.models import ParsedResumeSchema
            return ParsedResumeSchema(
                first_name="Development", last_name="Fixture", email="dev.candidate@hiresense.local",
                phone=None, github_url=None, linkedin_url=None,
                skills=["Java", "Spring Boot", "Python"], education=[],
                experience=[], projects=[], certifications=[],
            )
        if response_model.__name__ == "ParsedJobDescriptionSchema":
            from app.pipelines.models import ParsedJobDescriptionSchema
            return ParsedJobDescriptionSchema(
                title="Senior Distributed Systems Engineer",
                company="CloudFlow Systems",
                summary="Lead design and implementation of distributed streaming pipelines.",
                required_skills=["Java", "Spring Boot", "Apache Kafka", "PostgreSQL"],
                preferred_skills=["Docker", "Kubernetes", "Redis"],
                experience_years_required=5,
                education_requirements=["Bachelor's degree in Computer Science or equivalent"],
                key_responsibilities=["Architect distributed streaming pipelines", "Maintain high availability"],
            )
        raise LlmProviderError(f"No explicit mock fixture exists for {response_model.__name__}")
