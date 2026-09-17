import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.pipelines.models import ParsedJobDescriptionSchema
from app.providers.embedding_provider import LocalEmbeddingProvider

client = TestClient(app)

def test_parsed_job_description_schema():
    jd = ParsedJobDescriptionSchema(
        title="Senior Distributed Systems Engineer",
        company="CloudFlow",
        summary="Build real-time distributed data pipelines.",
        required_skills=["Java", "Spring Boot", "Kafka"],
        preferred_skills=["Docker", "Kubernetes"],
        experience_years_required=5,
        education_requirements=["BS in CS"],
        key_responsibilities=["Design Kafka topics", "Optimize database latency"],
    )
    assert jd.title == "Senior Distributed Systems Engineer"
    assert jd.experience_years_required == 5
    assert len(jd.required_skills) == 3
    assert len(jd.preferred_skills) == 2

def test_job_embedding_dimensions():
    provider = LocalEmbeddingProvider()
    emb = provider.get_embedding("Senior Distributed Systems Engineer with Java, Spring Boot, and Kafka experience")
    assert len(emb) == 384
    assert all(isinstance(v, float) for v in emb)

def test_parse_job_endpoint_validation():
    # Job description shorter than min_length (10) must be rejected with 422
    response = client.post("/api/ai/jobs/parse", json={"job_description": "short"})
    assert response.status_code == 422

def test_parse_job_endpoint():
    jd_text = (
        "We are seeking a Senior Distributed Systems Engineer at CloudFlow Systems. "
        "The ideal candidate must have 5+ years of experience with Java, Spring Boot, Apache Kafka, and PostgreSQL. "
        "Experience with Docker, Kubernetes, and Redis is preferred. "
        "You will architect high-throughput event streaming pipelines and maintain distributed clusters."
    )
    response = client.post("/api/ai/jobs/parse", json={"job_description": jd_text})
    assert response.status_code == 200
    data = response.json()
    assert "parsed" in data
    assert "embedding" in data
    assert data["dimensions"] == 384
    assert len(data["embedding"]) == 384
    
    parsed = data["parsed"]
    assert "title" in parsed
    assert "required_skills" in parsed
    assert isinstance(parsed["required_skills"], list)

def test_explain_match_endpoint():
    payload = {
        "job_title": "Senior Distributed Systems Engineer",
        "company": "CloudFlow Systems",
        "job_summary": "Architect event streaming pipelines and microservices.",
        "matched_required_skills": ["Java", "Spring Boot", "Apache Kafka"],
        "missing_required_skills": ["Terraform"],
        "matched_preferred_skills": ["Redis"],
        "missing_preferred_skills": ["Kubernetes"],
        "evidence_chunks": [
            {
                "section_name": "Experience: CloudFlow Systems",
                "content": "Architected event streaming pipeline processing 250M events per day using Apache Kafka and Spring Boot.",
                "similarity": 0.7241
            },
            {
                "section_name": "Executive Summary",
                "content": "Principal Infrastructure Engineer specializing in distributed systems.",
                "similarity": 0.5590
            }
        ]
    }
    response = client.post("/api/ai/jobs/explain-match", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "explanation" in data
    assert len(data["explanation"]) > 0
    assert "model" in data
    assert "latency_ms" in data
