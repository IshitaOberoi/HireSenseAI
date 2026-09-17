import json
import os
import subprocess
import sys
import time
import urllib.request
import urllib.error

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

API_BASE = "http://localhost:8080/api"
CANDIDATE_ID = "11111111-1111-1111-1111-111111111111"
PDF_FILE_PATH = "rag_marcus_vance.pdf"

def generate_pdf(filepath: str):
    stream_content = (
        "BT\n"
        "/F1 14 Tf\n"
        "50 740 Td (Marcus Vance) Tj\n"
        "/F1 10 Tf\n"
        "0 -16 Td (Email: marcus.vance@cloudplatform.io | Phone: +1-555-0188) Tj\n"
        "0 -14 Td (LinkedIn: linkedin.com/in/marcusvance | GitHub: github.com/marcusvance) Tj\n"
        "0 -24 Td (EXECUTIVE SUMMARY) Tj\n"
        "0 -14 Td (Principal Infrastructure Engineer with 10+ years specializing in distributed systems and cloud storage.) Tj\n"
        "0 -12 Td (Deep expertise in high-throughput Kafka streaming, pgvector database internals, and Kubernetes orchestration.) Tj\n"
        "0 -24 Td (SKILLS) Tj\n"
        "0 -14 Td (Java, Spring Boot, Python, FastAPI, PostgreSQL, pgvector, Apache Kafka, Redis, Docker, Kubernetes) Tj\n"
        "0 -24 Td (EXPERIENCE) Tj\n"
        "0 -14 Td (Principal Infrastructure Engineer - CloudFlow Systems (2020 - Present)) Tj\n"
        "0 -12 Td (- Architected event streaming pipeline processing 250M events per day using Apache Kafka and Spring Boot.) Tj\n"
        "0 -12 Td (- Reduced vector search query latency by 55 percent by tuning pgvector HNSW indexing parameters.) Tj\n"
        "0 -18 Td (Senior Backend Engineer - DataNexus (2016 - 2020)) Tj\n"
        "0 -12 Td (- Designed fault-tolerant microservices handling 45000 requests per second in Java and Python.) Tj\n"
        "0 -12 Td (- Spearheaded zero-downtime database migrations across 12 distributed PostgreSQL clusters.) Tj\n"
        "0 -24 Td (EDUCATION) Tj\n"
        "0 -14 Td (Stanford University - Master of Science in Computer Science (2014 - 2016)) Tj\n"
        "0 -24 Td (PROJECTS) Tj\n"
        "0 -14 Td (VectorRAG: Open-source semantic retrieval engine powered by all-MiniLM-L6-v2 embeddings and pgvector.) Tj\n"
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

def run_cmd(cmd):
    p = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    return p.stdout.strip(), p.stderr.strip(), p.returncode

def http_get(url):
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read().decode("utf-8")), resp.status

def http_post_json(url, data):
    body = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8")), resp.status
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            return json.loads(err_body), e.code
        except Exception:
            return {"error": err_body}, e.code

def upload_pdf_curl(url, filepath, candidate_id):
    cmd = f'curl.exe -s -F "file=@{filepath};type=application/pdf" -F "candidateId={candidate_id}" {url}'
    p = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    return json.loads(p.stdout)

def main():
    print("=" * 60)
    print("STARTING LIVE E2E GENUINE RESUME RAG VERIFICATION")
    print("=" * 60)

    # 1. Health Checks
    print("\n[Step 1] Checking service health...")
    ai_health, _ = http_get("http://localhost:8000/health")
    print("FastAPI AI Health:", ai_health)
    assert ai_health.get("status") == "UP"

    resumes_list, res_status = http_get(f"{API_BASE}/candidates/{CANDIDATE_ID}/resumes")
    print(f"Spring Boot Candidate Resumes Status: {res_status}, count: {len(resumes_list)}")
    assert res_status == 200

    # 2. Generate and Upload Test Resume
    print("\n[Step 2] Generating and uploading PDF resume for Marcus Vance...")
    generate_pdf(PDF_FILE_PATH)
    upload_res = upload_pdf_curl(f"{API_BASE}/candidates/resume/upload", PDF_FILE_PATH, CANDIDATE_ID)
    print("Upload response:", upload_res)
    resume_id = upload_res.get("id") or upload_res.get("resumeId")
    assert resume_id is not None, "Failed to get resume_id from upload response"
    print(f"Uploaded Resume ID: {resume_id}")

    # 3. Wait for Celery worker & Spring callback to reach COMPLETED
    print("\n[Step 3] Waiting for end-to-end extraction, parsing, embedding & chunking...")
    max_wait = 45
    poll_interval = 2
    waited = 0
    resume_data = None
    while waited < max_wait:
        time.sleep(poll_interval)
        waited += poll_interval
        res, _ = http_get(f"{API_BASE}/candidates/{CANDIDATE_ID}/resumes")
        target = next((r for r in res if r["id"] == resume_id), None)
        if target:
            status = target.get("processingStatus")
            print(f"  [{waited}s] Processing status: {status}")
            if status == "COMPLETED":
                resume_data = target
                break
            elif status == "FAILED":
                raise RuntimeError(f"Processing failed: {target.get('processingError')}")

    assert resume_data is not None, "Resume processing did not complete in time"
    print("Resume processing COMPLETED successfully!")

    # 4. Check PostgreSQL resume_chunks & vector dimension
    print("\n[Step 4] Checking PostgreSQL resume_chunks and 384D embedding...")
    sql = f"SELECT chunk_index, section_name, vector_dims(embedding) as dims, left(content, 60) as excerpt FROM resume_chunks WHERE resume_id = '{resume_id}' ORDER BY chunk_index;"
    stdout, stderr, code = run_cmd(f'docker exec hiresense-db psql -U postgres -d hiresense -c "{sql}"')
    print("PostgreSQL resume_chunks output:\n", stdout)
    assert "384" in stdout, "Chunks do not contain 384D vectors!"

    # 5. RAG In-Context Targeted Question
    print("\n[Step 5] Testing RAG Query 1 (Grounded In-Context Question)...")
    q1 = "What event streaming pipeline did Marcus Vance architect and what daily throughput did it handle?"
    ask_url = f"{API_BASE}/candidates/resumes/{resume_id}/ask"
    rag_resp1, status1 = http_post_json(ask_url, {"question": q1})
    print(f"RAG Query 1 Response (HTTP {status1}):")
    print(json.dumps(rag_resp1, indent=2))

    assert status1 == 200
    assert "answer" in rag_resp1
    answer1 = rag_resp1["answer"]
    sources1 = rag_resp1.get("sources", [])
    assert len(sources1) > 0, "Expected at least 1 retrieved source chunk"
    top_source = sources1[0]
    print(f"\n-> Top Source Section: {top_source['sectionName']}, Similarity: {top_source['similarity']}")
    print(f"-> Top Source Excerpt: {top_source['excerpt']}")
    assert "250M" in top_source["excerpt"] or "Kafka" in top_source["excerpt"]
    assert any(w in answer1.lower() for w in ["250m", "250 million", "kafka", "streaming"])
    print("--> Query 1 PASSED: Grounded retrieval and accurate answer confirmed!")

    # 6. RAG Out-of-Context Question (Refusal)
    print("\n[Step 6] Testing RAG Query 2 (Out-of-Context Question / Refusal)...")
    q2 = "What is the candidate's experience with Solidity and Web3 smart contracts?"
    rag_resp2, status2 = http_post_json(ask_url, {"question": q2})
    print(f"RAG Query 2 Response (HTTP {status2}):")
    print(json.dumps(rag_resp2, indent=2))
    assert status2 == 200
    answer2 = rag_resp2["answer"]
    assert any(phrase in answer2.lower() for phrase in [
        "does not mention",
        "no mention",
        "not mention",
        "no relevant information",
        "not mentioned"
    ]), f"Model did not properly refuse out-of-context query: {answer2}"
    print("--> Query 2 PASSED: Refusal of out-of-context question confirmed!")

    # 7. Candidate / Resume Isolation
    print("\n[Step 7] Testing Candidate/Resume Isolation...")
    bogus_resume_id = "00000000-0000-0000-0000-000000000000"
    iso_resp, iso_status = http_post_json(f"{API_BASE}/candidates/resumes/{bogus_resume_id}/ask", {"question": "What is the candidate's name?"})
    print(f"Isolation status (HTTP {iso_status}):", iso_resp)
    assert iso_status == 400
    assert "Resume not found" in iso_resp.get("error", "")
    print("--> Step 7 PASSED: Candidate/Resume isolation confirmed!")

    # 8. Check AI Audit Log
    print("\n[Step 8] Checking AI Request Logs in PostgreSQL...")
    log_sql = "SELECT request_type, model_name, latency_ms, tokens_input, tokens_output, status, created_at FROM ai_request_logs WHERE request_type = 'RAG' ORDER BY created_at DESC LIMIT 3;"
    log_out, _, _ = run_cmd(f'docker exec hiresense-db psql -U postgres -d hiresense -c "{log_sql}"')
    print("AI Audit Log output:\n", log_out)
    assert "RAG" in log_out
    assert "SUCCESS" in log_out
    print("--> Step 8 PASSED: AI Request Audit Log verified in PostgreSQL!")

    # Cleanup temporary PDF
    if os.path.exists(PDF_FILE_PATH):
        os.remove(PDF_FILE_PATH)
    print("\nCleaned up local temporary PDF.")
    print("\n" + "=" * 60)
    print("ALL E2E RAG VERIFICATION CHECKS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    main()
