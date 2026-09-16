# HireSense AI

HireSense is a React, Spring Boot, FastAPI, PostgreSQL/pgvector, and Celery application for resume intelligence, candidate matching, and structured practice interviews.

## Current capabilities

- Resume upload and asynchronous parsing
- Semantic job/candidate matching with explainable skill gaps
- ATS compatibility scoring
- AI Interview Studio: RAG-grounded question generation, recorded-audio upload, transcript review, answer evaluation, and feedback

The Interview Studio deliberately supports recorded audio only. It does **not** include a live recruiter copilot or WebRTC.

## Run with Docker

1. Copy `.env.example` to `.env` and set strong database/JWT secrets for non-local environments.
2. Run `docker compose up --build`.
3. Open the frontend at `http://localhost:5173`.

Service endpoints:

| Service | URL |
| --- | --- |
| Frontend | `http://localhost:5173` |
| Core API Swagger | `http://localhost:8080/swagger-ui/index.html` |
| AI API Swagger | `http://localhost:8000/docs` |
| AI health | `http://localhost:8000/health` |

The Compose stack keeps uploaded documents in a shared named volume so the backend and Celery worker use the same file location. Database, Redis, and AI service health checks gate dependent services.

## Local development

Prerequisites: Java 21 + Maven, Python 3.11, Node 22, PostgreSQL with pgvector, and Redis.

```bash
cd backend && mvn test && mvn spring-boot:run
cd ai-service && python -m venv .venv && .venv/Scripts/pip install -r requirements.txt && .venv/Scripts/python -m pytest tests -q
cd frontend && npm ci && npm run build
```

Set `VITE_AI_API_URL` when the AI service is not on `http://localhost:8000/api/ai`.

## AI API

The interactive OpenAPI documentation is the source of truth. The key Milestone 4 endpoints are:

- `POST /api/ai/ats/score` — returns a transparent, rule-based ATS score and feedback.
- `POST /api/ai/interviews/context` — retrieves relevant parsed-resume context for a job description.
- `POST /api/ai/interviews/questions` — generates bounded, grounded practice questions.
- `POST /api/ai/interviews/transcribe` — accepts a recorded WAV, MP3, M4A, WebM, or OGG upload (25 MB maximum). It is Whisper-ready; configure `OPENAI_API_KEY` to enable a provider integration.
- `POST /api/ai/interviews/evaluate` — evaluates a reviewed transcript and returns feedback.

All endpoints validate request lengths/types and return structured validation errors. Never put API keys in the frontend environment.

## Verification

AI unit and integration tests are in `ai-service/tests`. Spring Boot tests run through Maven. The frontend build is the browser integration check. CI should run all three before deployment.

## Production notes

- Replace the development JWT fallback and database credentials.
- Restrict CORS to deployed frontend origins.
- Configure a production object store instead of local shared uploads for multi-node deployment.
- Collect structured application logs and protect the internal callback route with service authentication before exposing services publicly.
