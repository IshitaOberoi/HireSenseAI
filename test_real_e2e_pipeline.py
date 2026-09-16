import json
import os
import subprocess
import sys
import time
import requests
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

API_BASE = "http://localhost:8080/api"
CANDIDATE_ID = "11111111-1111-1111-1111-111111111111"
PDF_FILE_PATH = "elena_vance_resume.pdf"

def generate_pdf(filepath: str):
    stream_content = (
        "BT\n"
        "/F1 14 Tf\n"
        "50 740 Td (Elena Vance) Tj\n"
        "/F1 10 Tf\n"
        "0 -16 Td (Email: elena.vance@techcorp.io | Phone: +1-555-0199) Tj\n"
        "0 -14 Td (LinkedIn: linkedin.com/in/elenavance | GitHub: github.com/elenavance) Tj\n"
        "0 -24 Td (EXECUTIVE SUMMARY) Tj\n"
        "0 -14 Td (Staff Distributed Systems Engineer with 8+ years experience building scalable backend platforms) Tj\n"
        "0 -12 Td (in Java, Spring Boot, and Python. Expert in Kubernetes, event-driven streaming, and distributed data stores.) Tj\n"
        "0 -24 Td (SKILLS) Tj\n"
        "0 -14 Td (Java, Spring Boot, Python, FastAPI, PostgreSQL, Redis, Apache Kafka, Docker, Kubernetes, AWS, Microservices) Tj\n"
        "0 -24 Td (EXPERIENCE) Tj\n"
        "0 -14 Td (Staff Software Engineer - Datastream Corp (2021 - Present)) Tj\n"
        "0 -12 Td (- Architected event streaming pipeline processing 250M events per day using Kafka and Spring Boot.) Tj\n"
        "0 -12 Td (- Optimized PostgreSQL database query latency by 45 percent with indexing and connection pooling.) Tj\n"
        "0 -18 Td (Senior Backend Engineer - CloudScale Inc (2018 - 2021)) Tj\n"
        "0 -12 Td (- Designed and implemented RESTful microservices in Java and Go.) Tj\n"
        "0 -12 Td (- Mentored 6 engineers and drove migration from monolith to Kubernetes containers.) Tj\n"
        "0 -24 Td (EDUCATION) Tj\n"
        "0 -14 Td (University of California, Berkeley - B.S. in Computer Science (2014 - 2018)) Tj\n"
        "0 -24 Td (PROJECTS) Tj\n"
        "0 -14 Td (VectorStream: High-throughput vector search microservice using Python, FastAPI, and pgvector.) Tj\n"
        "ET\n"
    ).encode("utf-8")

    stream_len = len(stream_content)
    pdf = (
        b"%PDF-1.4\n"
        b"1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n"
        b"2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n"
        b"3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n"
        + f"4 0 obj << /Length {stream_len} >> stream\n".encode("ascii")
        + stream_content
        + b"endstream\nendobj\n"
        b"5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n"
        b"xref\n0 6\n"
        b"0000000000 65535 f \n"
        b"0000000009 00000 n \n"
        b"0000000058 00000 n \n"
        b"0000000115 00000 n \n"
        b"0000000246 00000 n \n"
        b"0000000500 00000 n \n"
        b"trailer << /Size 6 /Root 1 0 R >>\n"
        b"startxref\n580\n%%EOF\n"
    )
    with open(filepath, "wb") as f:
        f.write(pdf)
    print(f"[1/6] Created realistic test PDF: {filepath} ({len(pdf)} bytes)")

def test_pipeline():
    print("=" * 60)
    print("HIRESENSE AI - REAL RESUME INTELLIGENCE E2E PIPELINE TEST")
    print("=" * 60)

    # 1. Generate PDF
    generate_pdf(PDF_FILE_PATH)

    # 2. Upload to Spring Boot
    print("\n[2/6] Uploading resume to Spring Boot API...")
    with open(PDF_FILE_PATH, "rb") as f:
        resp = requests.post(
            f"{API_BASE}/candidates/resume/upload",
            files={"file": ("elena_vance_resume.pdf", f, "application/pdf")},
            data={"candidateId": CANDIDATE_ID},
            timeout=15,
        )
    
    if not resp.ok:
        print(f"FAILED: Upload returned HTTP {resp.status_code}: {resp.text}")
        sys.exit(1)
    
    data = resp.json()
    resume_id = data.get("resumeId")
    print(f"SUCCESS: Resume uploaded. Resume ID: {resume_id}")
    print(f"Initial status response: {data}")

    # 3. Poll Spring Boot until COMPLETED or FAILED
    print("\n[3/6] Polling Spring Boot for AI processing completion...")
    start_time = time.monotonic()
    max_wait = 90  # seconds
    completed_record = None

    while (time.monotonic() - start_time) < max_wait:
        elapsed = int(time.monotonic() - start_time)
        try:
            r = requests.get(f"{API_BASE}/candidates/resumes/{resume_id}", timeout=5)
            if r.status_code == 200:
                record = r.json()
                status = record.get("processingStatus")
                print(f"  [{elapsed}s] Current status: {status}")
                if status == "COMPLETED":
                    completed_record = record
                    break
                elif status == "FAILED":
                    err = record.get("processingError")
                    print(f"FAILED: Resume processing failed with error: {err}")
                    sys.exit(1)
            else:
                print(f"  [{elapsed}s] GET returned HTTP {r.status_code}")
        except Exception as e:
            print(f"  [{elapsed}s] Polling error: {e}")
        time.sleep(3)

    if not completed_record:
        print("FAILED: Pipeline timed out waiting for COMPLETED state.")
        sys.exit(1)

    print(f"\nSUCCESS: Processing finished in {int(time.monotonic() - start_time)} seconds!")

    # 4. Verify Parsed Content & Structure
    print("\n[4/6] Verifying parsed resume data...")
    raw_text = completed_record.get("rawResumeText", "")
    parsed_json_str = completed_record.get("parsedResumeJson", "")
    confidence = completed_record.get("parsingConfidence")

    assert raw_text, "rawResumeText must not be empty"
    assert "Elena Vance" in raw_text, "rawResumeText must contain candidate name"
    print(f"  ? Raw resume text length: {len(raw_text)} chars")

    parsed = json.loads(parsed_json_str) if isinstance(parsed_json_str, str) else parsed_json_str
    print(f"  ? Candidate Name: {parsed.get('first_name')} {parsed.get('last_name')}")
    print(f"  ? Executive Summary: {parsed.get('summary')}")
    print(f"  ? Skills extracted ({len(parsed.get('skills', []))}): {parsed.get('skills')}")
    print(f"  ? Experience entries ({len(parsed.get('experience', []))}): {[e.get('company') for e in parsed.get('experience', [])]}")
    print(f"  ? Education entries: {[ed.get('institution') for ed in parsed.get('education', [])]}")
    print(f"  ? Parsing confidence: {confidence}")

    assert parsed.get("first_name") == "Elena" or "Elena" in (parsed.get("first_name", "") + parsed.get("last_name", "")), "Extracted first name mismatch"
    assert len(parsed.get("skills", [])) > 0, "At least one skill must be extracted"
    assert parsed.get("summary"), "Summary must not be empty"

    # 5. Verify PostgreSQL & pgvector storage
    print("\n[5/6] Verifying database persistence & pgvector embedding in PostgreSQL...")
    psql_cmd = [
        "docker", "exec", "hiresense-db", "psql", "-U", "postgres", "-d", "hiresense", "-t", "-A", "-c",
        f"SELECT vector_dims(resume_embedding), resume_embedding IS NOT NULL, processing_status, parsing_confidence FROM resumes WHERE id = '{resume_id}';"
    ]
    db_result = subprocess.run(psql_cmd, capture_output=True, text=True)
    print(f"  DB Query Output: {db_result.stdout.strip()}")
    parts = db_result.stdout.strip().split("|")
    assert len(parts) >= 4, f"Unexpected DB output: {db_result.stdout}"
    dims = int(parts[0])
    is_not_null = parts[1] == "t"
    db_status = parts[2]
    db_conf = float(parts[3])

    print(f"  ? pgvector vector_dims: {dims} (Expected: 384)")
    print(f"  ? Embedding IS NOT NULL: {is_not_null}")
    print(f"  ? DB processing_status: {db_status}")
    print(f"  ? DB parsing_confidence: {db_conf}")
    assert dims == 384, f"Expected 384 dimensions but got {dims}"
    assert is_not_null, "Embedding must not be null in PostgreSQL"
    assert db_status == "COMPLETED", "DB status must be COMPLETED"

    # 6. Verify AI request log
    print("\n[6/6] Verifying AI request audit log in PostgreSQL...")
    log_cmd = [
        "docker", "exec", "hiresense-db", "psql", "-U", "postgres", "-d", "hiresense", "-c",
        "SELECT request_type, model_name, latency_ms, status FROM ai_request_logs ORDER BY created_at DESC LIMIT 1;"
    ]
    log_result = subprocess.run(log_cmd, capture_output=True, text=True)
    print(log_result.stdout)
    assert "PARSING" in log_result.stdout, "Log must contain PARSING record"
    assert "SUCCESS" in log_result.stdout, "Log status must be SUCCESS"
    assert "openai/gpt-oss-120b" in log_result.stdout, "Log model must be openai/gpt-oss-120b"

    print("=" * 60)
    print("ALL VERIFICATION CHECKS PASSED PERFECTLY!")
    print("Real Groq parsing, real 384D embedding, pgvector storage,")
    print("and Spring Boot callbacks are fully operational!")
    print("=" * 60)

if __name__ == "__main__":
    test_pipeline()
