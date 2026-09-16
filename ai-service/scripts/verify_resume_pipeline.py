"""Run against a started local Compose stack after setting TEST_RESUME_TEXT_PDF."""
import os
import time
import uuid

import requests

API_BASE = os.getenv("SPRING_API_URL", "http://localhost:8080/api")
CANDIDATE_ID = os.getenv("DEV_CANDIDATE_ID", "11111111-1111-1111-1111-111111111111")
FILE_PATH = os.getenv("TEST_RESUME_TEXT_PDF")

if not FILE_PATH or not os.path.isfile(FILE_PATH):
    raise SystemExit("Set TEST_RESUME_TEXT_PDF to a real PDF before running this verifier.")

with open(FILE_PATH, "rb") as resume_file:
    upload = requests.post(f"{API_BASE}/candidates/resume/upload", files={"file": resume_file}, data={"candidateId": CANDIDATE_ID}, timeout=30)
upload.raise_for_status()
resume_id = upload.json()["resumeId"]
print(f"Uploaded resume {resume_id}; waiting for completion")

for _ in range(40):
    records = requests.get(f"{API_BASE}/candidates/{CANDIDATE_ID}/resumes", timeout=10).json()
    record = next((item for item in records if item["id"] == resume_id), None)
    if record and record["processingStatus"] == "COMPLETED":
        assert record["rawResumeText"]
        assert record["parsedResumeJson"]
        assert record["resumeEmbedding"]
        assert record["parsingConfidence"] is not None
        print("PASS: completed callback persisted raw text, JSON, 384D vector string, and confidence")
        break
    if record and record["processingStatus"] == "FAILED":
        raise RuntimeError(f"Pipeline failed: {record.get('processingError')}")
    time.sleep(3)
else:
    raise TimeoutError("Resume did not reach COMPLETED within 120 seconds")
