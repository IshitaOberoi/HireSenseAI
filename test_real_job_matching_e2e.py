import json
import os
import subprocess
import sys
import time
import urllib.request
import urllib.error

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

API_BASE = "http://localhost:8080/api"
AI_BASE = "http://localhost:8000"
CANDIDATE_ID = "11111111-1111-1111-1111-111111111111"
PDF_FILE_PATH = "elena_vance_matching_test.pdf"

def http_get(url: str, timeout: int = 10):
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.status, json.loads(resp.read().decode("utf-8"))

def http_post_json(url: str, data: dict, timeout: int = 30):
    payload = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json", "Accept": "application/json"}
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(body)
        except Exception:
            return e.code, {"error": body}

def http_post_file(url: str, filepath: str, candidate_id: str, timeout: int = 15):
    boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
    with open(filepath, "rb") as f:
        file_bytes = f.read()

    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="candidateId"\r\n\r\n'
        f"{candidate_id}\r\n"
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="file"; filename="{os.path.basename(filepath)}"\r\n'
        f"Content-Type: application/pdf\r\n\r\n"
    ).encode("utf-8") + file_bytes + f"\r\n--{boundary}--\r\n".encode("utf-8")

    req = urllib.request.Request(
        url,
        data=body,
        headers={
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "Accept": "application/json",
        }
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.status, json.loads(resp.read().decode("utf-8"))

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
        "0 -12 Td (- Designed and implemented RESTful microservices in Java and Spring Boot.) Tj\n"
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
    print(f"Generated test resume: {filepath} ({len(pdf)} bytes)")

def get_or_create_completed_resume():
    # Check for existing completed resumes
    try:
        status, resumes = http_get(f"{API_BASE}/candidates/{CANDIDATE_ID}/resumes")
        if status == 200:
            completed = [res for res in resumes if res.get("processingStatus") == "COMPLETED"]
            if completed:
                target = completed[0]
                print(f"Found existing completed resume: ID={target['id']} ({target.get('fileName')})")
                return target['id']
    except Exception as e:
        print(f"Error checking resumes: {e}")

    # Upload new resume
    print("Uploading new test resume...")
    generate_pdf(PDF_FILE_PATH)
    try:
        status, resp_data = http_post_file(f"{API_BASE}/candidates/resume/upload", PDF_FILE_PATH, CANDIDATE_ID)
        if status != 200:
            print(f"Upload failed: {status} {resp_data}")
            sys.exit(1)
        resume_id = resp_data.get("resumeId")
        print(f"Uploaded resume ID: {resume_id}. Waiting for processing...")

        start = time.monotonic()
        while time.monotonic() - start < 90:
            time.sleep(3)
            st_code, res = http_get(f"{API_BASE}/candidates/resumes/{resume_id}")
            if st_code == 200:
                st = res.get("processingStatus")
                print(f"  Status: {st}")
                if st == "COMPLETED":
                    return resume_id
                elif st == "FAILED":
                    print(f"Processing failed: {res.get('processingError')}")
                    sys.exit(1)
        print("Timeout waiting for resume completion")
        sys.exit(1)
    finally:
        if os.path.exists(PDF_FILE_PATH):
            os.remove(PDF_FILE_PATH)

def run_psql(query: str) -> str:
    cmd = [
        "docker", "exec", "-i", "hiresense-db",
        "psql", "-U", "postgres", "-d", "hiresense", "-t", "-c", query
    ]
    res = subprocess.run(cmd, capture_output=True, text=True, check=True)
    return res.stdout.strip()

def main():
    print("=" * 70)
    print("HIRESENSE AI - MILESTONE 3 REAL DOCKER E2E JOB MATCHING TEST")
    print("=" * 70)

    # 1. Health Checks
    print("\n[Step 1] Checking service health...")
    ai_status, ai_health = http_get(f"{AI_BASE}/health")
    assert ai_status == 200 and ai_health.get("status") == "UP", f"AI service not healthy: {ai_health}"
    print(f"  FastAPI health: UP (Mock mode: {ai_health.get('mock_mode')}, Model: {ai_health.get('model')})")

    # 2. Get completed resume
    print("\n[Step 2] Resolving target candidate resume...")
    resume_id = get_or_create_completed_resume()
    print(f"  Using resume_id: {resume_id}")

    # 3. Test edge case validation
    print("\n[Step 3] Testing input validation and candidate isolation...")
    # Empty / short JD
    status_empty, body_empty = http_post_json(f"{API_BASE}/candidates/resumes/{resume_id}/match", {"jobDescription": "short"})
    assert status_empty == 400, f"Expected 400 for short JD, got {status_empty}"
    print(f"  ✓ Short/invalid JD correctly rejected with 400 Bad Request: {body_empty.get('error')}")

    # Non-existent resume ID
    fake_id = "99999999-9999-9999-9999-999999999999"
    status_fake, body_fake = http_post_json(f"{API_BASE}/candidates/resumes/{fake_id}/match", {"jobDescription": "Valid job description for non-existent candidate"})
    assert status_fake == 400, f"Expected 400 for non-existent resume, got {status_fake}"
    print(f"  ✓ Non-existent resume correctly rejected with 400 Bad Request: {body_fake.get('error')}")

    # 4. Realistic Job Matching Request
    print("\n[Step 4] Executing real job matching pipeline against live Groq & pgvector...")
    target_jd = (
        "CloudFlow Systems is seeking a Senior Distributed Systems Engineer to scale our real-time infrastructure.\n\n"
        "Responsibilities:\n"
        "- Lead the architecture of streaming pipelines processing 250M events/day using Apache Kafka and Spring Boot.\n"
        "- Optimize PostgreSQL databases for sub-second query latency.\n"
        "- Deploy fault-tolerant microservices using Docker and Kubernetes.\n\n"
        "Requirements:\n"
        "- 5+ years building distributed backend platforms in Java and Spring Boot.\n"
        "- Hands-on proficiency with Apache Kafka, PostgreSQL, and Kubernetes.\n"
        "- Preferred: Experience with Redis and pgvector.\n"
        "- Nice-to-have: Terraform, Go."
    )

    t0 = time.monotonic()
    match_status, match_data = http_post_json(
        f"{API_BASE}/candidates/resumes/{resume_id}/match",
        {"jobDescription": target_jd},
        timeout=60
    )
    elapsed = time.monotonic() - t0

    assert match_status == 200, f"Match request failed ({match_status}): {match_data}"
    print(f"  ✓ Match response received in {elapsed:.2f}s (HTTP 200)")

    # 5. Inspect Match Response Details
    print("\n[Step 5] Validating structured match signals...")
    job_desc_id = match_data.get("jobDescriptionId")
    match_id = match_data.get("id")
    job_title = match_data.get("jobTitle")
    company = match_data.get("company")
    match_score = match_data.get("matchScore")
    alignment = match_data.get("alignmentRating")
    breakdown = match_data.get("scoreBreakdown", {})
    skills = match_data.get("skillsAnalysis", {})
    evidence = match_data.get("evidence", [])
    explanation = match_data.get("explanation", "")
    metadata = match_data.get("metadata", {})

    print(f"  Job Title:           {job_title}")
    print(f"  Company:             {company}")
    print(f"  Composite Score:     {match_score}%")
    print(f"  Alignment Rating:    {alignment}")
    print(f"  Score Breakdown:")
    print(f"    - Required Skill Coverage: {breakdown.get('requiredSkillCoverage')} (weight: {breakdown.get('weights', {}).get('requiredSkills')})")
    print(f"    - Semantic Similarity:     {breakdown.get('semanticSimilarity')} (weight: {breakdown.get('weights', {}).get('semanticSimilarity')})")
    print(f"    - Preferred Skill Coverage:{breakdown.get('preferredSkillCoverage')} (weight: {breakdown.get('weights', {}).get('preferredSkills')})")
    print(f"    - Evidence Relevance:      {breakdown.get('evidenceRelevance')} (weight: {breakdown.get('weights', {}).get('experienceEvidence')})")

    print(f"\n  Skills Analysis:")
    print(f"    - Matched Required:   {skills.get('matched')}")
    print(f"    - Missing Required:   {skills.get('missing')}")
    print(f"    - Matched Preferred:  {skills.get('matchedPreferred')}")
    print(f"    - Missing Preferred:  {skills.get('missingPreferred')}")

    print(f"\n  Retrieved Resume Evidence Chunks ({len(evidence)}):")
    for ev in evidence:
        print(f"    [{ev.get('chunkIndex')}] {ev.get('sectionName')} (Similarity: {ev.get('similarity')}): \"{ev.get('excerpt')[:80]}...\"")

    print(f"\n  Grounded AI Explanation:")
    print(f"  --------------------------------------------------")
    for line in explanation.splitlines():
        if line.strip():
            print(f"  {line}")
    print(f"  --------------------------------------------------")
    print(f"  Model: {metadata.get('model')} | Latency: {metadata.get('latency_ms')}ms")

    # 6. Mathematical Verification (Single Source of Truth)
    print("\n[Step 6] Verifying deterministic mathematical invariant...")
    w_req = breakdown.get("weights", {}).get("requiredSkills", 0.40)
    w_sem = breakdown.get("weights", {}).get("semanticSimilarity", 0.30)
    w_pref = breakdown.get("weights", {}).get("preferredSkills", 0.15)
    w_ev = breakdown.get("weights", {}).get("experienceEvidence", 0.15)

    c_req = breakdown.get("requiredSkillCoverage", 0.0)
    s_sem = breakdown.get("semanticSimilarity", 0.0)
    c_pref = breakdown.get("preferredSkillCoverage", 0.0)
    e_ev = breakdown.get("evidenceRelevance", 0.0)

    raw_calc = (w_req * c_req) + (w_sem * s_sem) + (w_pref * c_pref) + (w_ev * e_ev)
    expected_score = round(raw_calc * 100.0, 1)

    print(f"  Independent mathematical score calculation:")
    print(f"    ({w_req} * {c_req}) + ({w_sem} * {s_sem}) + ({w_pref} * {c_pref}) + ({w_ev} * {e_ev}) = {raw_calc:.6f}")
    print(f"    Expected: {expected_score}% | Actual: {match_score}%")
    assert abs(match_score - expected_score) <= 0.05, f"Mathematical mismatch: expected {expected_score}%, got {match_score}%"
    print("  ✓ Deterministic score strictly derives from component breakdown!")

    # 7. Database Checks (PostgreSQL + pgvector)
    print("\n[Step 7] Checking PostgreSQL database records & pgvector dimensions...")
    # Verify job_descriptions
    jd_dims = run_psql(f"SELECT vector_dims(embedding) FROM job_descriptions WHERE id = '{job_desc_id}';")
    print(f"  ✓ Job description embedding dimension in PostgreSQL: {jd_dims}D")
    assert jd_dims == "384", f"Expected 384 dimensions, got {jd_dims}"

    # Verify resume_job_matches
    match_row = run_psql(f"SELECT match_score, semantic_similarity FROM resume_job_matches WHERE id = '{match_id}';")
    print(f"  ✓ Persisted match record: {match_row}")
    assert len(match_row) > 0, "Match record not found in resume_job_matches"

    # Verify AI audit log
    audit_row = run_psql("SELECT request_type, model_name, status, latency_ms FROM ai_request_logs WHERE request_type = 'MATCHING' ORDER BY created_at DESC LIMIT 1;")
    print(f"  ✓ Persisted AI audit log: {audit_row}")
    assert "MATCHING" in audit_row and "SUCCESS" in audit_row, "Audit log verification failed"

    # 8. Retrieve Previous Matches
    print("\n[Step 8] Verifying match retrieval API...")
    hist_status, hist_data = http_get(f"{API_BASE}/candidates/resumes/{resume_id}/matches")
    assert hist_status == 200, f"History request failed: {hist_status}"
    assert any(m.get("id") == match_id for m in hist_data), "New match not present in resume match history"
    print(f"  ✓ Successfully retrieved {len(hist_data)} match evaluation(s) for resume {resume_id}")

    print("\n" + "=" * 70)
    print("ALL MILESTONE 3 REAL DOCKER E2E TESTS PASSED SUCCESSFULLY!")
    print("=" * 70)

if __name__ == "__main__":
    main()
