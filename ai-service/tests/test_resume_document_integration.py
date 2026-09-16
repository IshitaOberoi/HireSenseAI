"""Optional real-document checks; execute only with actual local files and a configured environment."""
import os
import pytest

from app.pipelines.parser import extract_text_from_docx, extract_text_from_pdf
from app.providers.embedding_provider import LocalEmbeddingProvider
from app.providers.llm_provider import GroqLLMProvider
from app.pipelines.models import ParsedResumeSchema
from app.core.prompts import load_prompt_template
from app.core.config import settings


def required_path(variable):
    value = os.getenv(variable)
    if not value or not os.path.isfile(value):
        pytest.skip(f"Set {variable} to an actual test document to run this integration check")
    return value


@pytest.mark.integration
def test_real_text_pdf_groq_and_embedding():
    if settings.AI_MOCK_MODE or not settings.GROQ_API_KEY:
        pytest.skip("Requires GROQ_API_KEY and AI_MOCK_MODE=false")
    text = extract_text_from_pdf(required_path("TEST_RESUME_TEXT_PDF"))
    assert text.strip()
    parsed = GroqLLMProvider().generate_structured(load_prompt_template("parse_resume"), text, ParsedResumeSchema)
    embedding = LocalEmbeddingProvider().get_embedding(" ".join(parsed.skills) or text)
    assert len(embedding) == 384


@pytest.mark.integration
def test_real_docx_extraction():
    assert extract_text_from_docx(required_path("TEST_RESUME_DOCX")).strip()


@pytest.mark.integration
def test_real_scanned_pdf_uses_ocr_path():
    text = extract_text_from_pdf(required_path("TEST_RESUME_SCANNED_PDF"))
    assert len(text.strip()) >= 20
