from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_and_invalid_interview_request():
    assert client.get("/health").json()["status"] == "UP"
    response = client.post("/api/ai/interviews/questions", json={"resume_json": {}, "job_description": "short"})
    assert response.status_code == 422

def test_ats_endpoint_contract():
    response = client.post("/api/ai/ats/score", json={"resume_text": "alex@example.com Developed Python APIs with Docker and measurable results."})
    assert response.status_code == 200
    assert "score" in response.json()
