import pytest
from app.pipelines.chunker import chunk_resume, chunk_raw_text, MAX_CHUNK_CHARS
from app.pipelines.models import ParsedResumeSchema, ExperienceItem, ProjectItem
from app.providers.embedding_provider import LocalEmbeddingProvider

def test_chunk_resume_structured():
    parsed = ParsedResumeSchema(
        first_name="Alex",
        last_name="Mercer",
        email="alex@example.com",
        skills=["Python", "FastAPI", "PostgreSQL", "Docker"],
        summary="Senior Backend Engineer with 7 years experience building distributed systems.",
        experience=[
            ExperienceItem(
                company="TechCorp",
                title="Lead Engineer",
                start_date="2021",
                end_date="Present",
                responsibilities=["Architected event-driven microservices processing 10k req/sec."]
            ),
            ExperienceItem(
                company="StartupX",
                title="Software Engineer",
                start_date="2018",
                end_date="2021",
                responsibilities=["Built REST APIs using Django and PostgreSQL."]
            )
        ],
        education=[],
        projects=[],
        certifications=[],
    )
    raw_text = "Alex Mercer\nSenior Backend Engineer\nTechCorp Lead Engineer..."
    chunks = chunk_resume(raw_text, parsed)
    
    assert len(chunks) >= 3
    section_names = [c["section_name"] for c in chunks]
    assert "Executive Summary" in section_names
    assert "Skills" in section_names
    assert any("Lead Engineer" in c["content"] for c in chunks)
    assert all("chunk_index" in c for c in chunks)
    assert all(len(c["content"]) <= MAX_CHUNK_CHARS for c in chunks)

def test_chunk_resume_raw_text_fallback():
    raw_text = """PROFESSIONAL SUMMARY
Experienced data scientist specializing in NLP and predictive modeling.

WORK EXPERIENCE
Senior Data Scientist at DataCo (2020 - Present)
- Led team of 5 in developing recommendation engines.

EDUCATION
B.S. in Computer Science from MIT (2016)
"""
    chunks = chunk_resume(raw_text, parsed=None)
    assert len(chunks) >= 2
    assert all("content" in c and len(c["content"]) > 0 for c in chunks)
    assert all("chunk_index" in c for c in chunks)
    assert all(len(c["content"]) <= MAX_CHUNK_CHARS for c in chunks)

def test_chunk_embedding_dimensions():
    provider = LocalEmbeddingProvider()
    emb = provider.get_embedding("Lead Engineer architected event-driven microservices")
    assert len(emb) == 384
    assert all(isinstance(v, float) for v in emb)

def test_oversized_experience_chunk_enforces_max_chars():
    # Create 15 long responsibilities totaling ~2,500 characters
    long_bullets = [
        f"Achievement {i}: Designed and deployed high-performance distributed microservices handling hundreds of gigabytes per hour with 99.99% reliability across multiple availability zones."
        for i in range(1, 16)
    ]
    parsed = ParsedResumeSchema(
        first_name="Diana",
        last_name="Prince",
        email="diana@amazon.com",
        skills=["AWS", "Kubernetes"],
        summary="Cloud Infrastructure Architect",
        experience=[
            ExperienceItem(
                company="MegaCloud",
                title="Principal Architect",
                start_date="2018",
                end_date="Present",
                responsibilities=long_bullets
            )
        ],
        education=[],
        projects=[],
        certifications=[]
    )
    chunks = chunk_resume("dummy raw text", parsed)
    exp_chunks = [c for c in chunks if "MegaCloud" in c["section_name"]]
    
    # Must be split into multiple chunks because the full entry is ~2500 chars
    assert len(exp_chunks) >= 3
    # Every single chunk must strictly respect MAX_CHUNK_CHARS
    for c in exp_chunks:
        assert len(c["content"]) <= MAX_CHUNK_CHARS, f"Chunk exceeded {MAX_CHUNK_CHARS}: {len(c['content'])} chars"
        # Context preservation: role & company must be present in every sub-chunk
        assert "Principal Architect at MegaCloud" in c["content"]

def test_oversized_summary_and_skills_enforces_max_chars():
    # Long summary (> 1500 chars)
    long_summary = (
        "Principal Software Engineer with extensive background in distributed storage systems and high-throughput vector indexes. "
        * 15
    )
    # Long skills list (> 1200 chars)
    many_skills = [f"Distributed-Technology-Stack-Framework-{i}" for i in range(40)]
    
    parsed = ParsedResumeSchema(
        first_name="Bruce",
        last_name="Wayne",
        email="bruce@wayne.corp",
        skills=many_skills,
        summary=long_summary,
        experience=[],
        education=[],
        projects=[],
        certifications=[]
    )
    chunks = chunk_resume("dummy raw text", parsed)
    
    summary_chunks = [c for c in chunks if "Executive Summary" in c["section_name"]]
    skill_chunks = [c for c in chunks if "Skills" in c["section_name"]]
    
    assert len(summary_chunks) >= 2
    assert len(skill_chunks) >= 2
    
    for c in chunks:
        assert len(c["content"]) <= MAX_CHUNK_CHARS, f"Chunk exceeded {MAX_CHUNK_CHARS}: {len(c['content'])} chars"
