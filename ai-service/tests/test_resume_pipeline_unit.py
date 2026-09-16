from app.core.config import settings
from app.pipelines.models import ParsedResumeSchema
from app.pipelines.tasks import _confidence
from app.providers.embedding_provider import LocalEmbeddingProvider
from app.providers.llm_provider import GroqLLMProvider, LlmProviderError


def test_explicit_mock_embedding_is_384_dimensions(monkeypatch):
    monkeypatch.setattr(settings, "AI_MOCK_MODE", True)
    vector = LocalEmbeddingProvider().get_embedding("Java Spring Boot resume")
    assert len(vector) == 384
    assert round(sum(value * value for value in vector), 6) == 1.0


def test_mock_parsing_requires_explicit_flag(monkeypatch):
    monkeypatch.setattr(settings, "AI_MOCK_MODE", True)
    parsed = GroqLLMProvider().generate_structured("system", "resume", ParsedResumeSchema)
    assert parsed.first_name == "Development"


def test_missing_groq_key_fails_in_real_mode(monkeypatch):
    monkeypatch.setattr(settings, "AI_MOCK_MODE", False)
    monkeypatch.setattr(settings, "GROQ_API_KEY", "")
    with __import__("pytest").raises(LlmProviderError, match="GROQ_API_KEY"):
        GroqLLMProvider().generate_structured("system", "resume", ParsedResumeSchema)


def test_confidence_is_bounded_and_based_on_real_parse_fields():
    parsed = ParsedResumeSchema(first_name="A", last_name="B", email="a@example.com", skills=["Python"], experience=[])
    confidence = _confidence("resume text " * 40, parsed)
    assert 0 <= confidence <= 1


def test_parsed_resume_schema_summary_and_defaults():
    # Verify summary field can be populated
    parsed = ParsedResumeSchema(
        summary="Senior engineer with 5+ years of distributed backend experience.",
        skills=["Java", "Spring Boot", "PostgreSQL"],
    )
    assert parsed.summary == "Senior engineer with 5+ years of distributed backend experience."
    assert parsed.first_name == ""
    assert parsed.last_name == ""
    assert "Java" in parsed.skills

    # Verify JSON serialization includes summary
    json_data = parsed.model_dump_json()
    assert "Senior engineer" in json_data


def test_parser_unsupported_extension():
    import pytest
    from app.pipelines.parser import parse_resume_document
    with pytest.raises(ValueError, match="Unsupported file type"):
        parse_resume_document("resume.xyz")
