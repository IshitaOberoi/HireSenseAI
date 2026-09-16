"""HireSense AI HTTP API: asynchronous parsing, matching, and recorded interview analysis."""
from __future__ import annotations
import logging
from typing import Any
from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator
from app.pipelines.tasks import parse_resume_task
from app.providers.embedding_provider import LocalEmbeddingProvider
from app.pipelines.matcher import generate_match_assessment
from app.pipelines.interview import ats_score, evaluate_answer, generate_questions, retrieve_context
from app.core.config import settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("hiresense-ai")
app = FastAPI(title="HireSense AI API", description="Resume intelligence and recorded-audio interview analysis. Live copilot and WebRTC are not supported.", version="1.1.0", contact={"name": "HireSense Engineering"})
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173"], allow_credentials=True, allow_methods=["GET", "POST"], allow_headers=["Content-Type", "Authorization"])
embedding_provider = LocalEmbeddingProvider()

class ResumeParseRequest(BaseModel):
    s3_key: str = Field(min_length=1, max_length=500)
    resume_id: str = Field(min_length=1, max_length=64)
class JobProcessRequest(BaseModel):
    description: str = Field(min_length=20, max_length=20_000)
class MatchEngineRequest(BaseModel):
    resume_json: dict[str, Any]
    job_description: str = Field(min_length=20, max_length=20_000)
    resume_embedding: list[float] = Field(min_length=1, max_length=384)
    job_embedding: list[float] = Field(min_length=1, max_length=384)
    @field_validator("job_embedding")
    @classmethod
    def same_length(cls, value, info):
        other = info.data.get("resume_embedding", [])
        if other and len(value) != len(other): raise ValueError("embeddings must have equal dimensions")
        return value
class AtsRequest(BaseModel):
    resume_text: str = Field(min_length=20, max_length=100_000)
    job_description: str = Field(default="", max_length=20_000)
class InterviewQuestionRequest(BaseModel):
    resume_json: dict[str, Any]
    job_description: str = Field(min_length=20, max_length=20_000)
    count: int = Field(default=5, ge=1, le=10)
class RetrievalRequest(BaseModel):
    resume_json: dict[str, Any]
    job_description: str = Field(min_length=5, max_length=20_000)
    limit: int = Field(default=4, ge=1, le=10)
class EvaluationRequest(BaseModel):
    question: str = Field(min_length=5, max_length=4_000)
    transcript: str = Field(min_length=5, max_length=50_000)
    context: list[dict[str, str]] = Field(default_factory=list, max_length=10)

@app.exception_handler(RequestValidationError)
async def validation_error(_: Request, exc: RequestValidationError):
    return JSONResponse(status_code=422, content={"error": "Invalid request", "details": exc.errors()})
@app.exception_handler(Exception)
async def unhandled_error(_: Request, exc: Exception):
    logger.exception("Unhandled AI service error")
    return JSONResponse(status_code=500, content={"error": "Internal AI service error"})

@app.get("/", tags=["Operations"])
@app.get("/health", tags=["Operations"])
def health_check(): return {"status": "UP", "service": "HireSense AI API"}

@app.post("/api/ai/parse-resume", tags=["Resumes"])
async def parse_resume(payload: ResumeParseRequest):
    try:
        parse_resume_task.delay(payload.resume_id, payload.s3_key)
        return {"success": True, "message": "Parsing task scheduled successfully.", "resume_id": payload.resume_id}
    except Exception as exc:
        logger.exception("Resume parsing dispatch failed", extra={"resume_id": payload.resume_id})
        raise HTTPException(503, "Resume processing queue is unavailable") from exc

@app.post("/api/ai/process-job", tags=["Matching"])
async def process_job(payload: JobProcessRequest): return {"success": True, "job_embedding": embedding_provider.get_embedding(payload.description)}
@app.post("/api/ai/match-engine", tags=["Matching"])
async def match_engine(payload: MatchEngineRequest): return generate_match_assessment(payload.resume_json, payload.job_description, payload.resume_embedding, payload.job_embedding)
@app.post("/api/ai/ats/score", tags=["ATS"])
async def score_ats(payload: AtsRequest): return ats_score(payload.resume_text, payload.job_description)
@app.post("/api/ai/interviews/questions", tags=["Interview Studio"])
async def questions(payload: InterviewQuestionRequest): return {"questions": generate_questions(payload.resume_json, payload.job_description, payload.count)}
@app.post("/api/ai/interviews/context", tags=["Interview Studio"])
async def context(payload: RetrievalRequest): return {"context": retrieve_context(payload.resume_json, payload.job_description, payload.limit)}
@app.post("/api/ai/interviews/evaluate", tags=["Interview Studio"])
async def evaluate(payload: EvaluationRequest): return evaluate_answer(payload.question, payload.transcript, payload.context)
@app.post("/api/ai/interviews/transcribe", tags=["Interview Studio"])
async def transcribe_recording(audio: UploadFile = File(...)):
    allowed = {"audio/wav", "audio/mpeg", "audio/mp4", "audio/webm", "audio/ogg"}
    if audio.content_type not in allowed: raise HTTPException(415, "Upload WAV, MP3, M4A, WebM, or OGG audio")
    data = await audio.read()
    if not data or len(data) > 25 * 1024 * 1024: raise HTTPException(400, "Audio must be between 1 byte and 25 MB")
    logger.info("Recorded audio received", extra={"filename": audio.filename, "bytes": len(data)})
    if settings.OPENAI_API_KEY != "mock-key":
        try:
            from io import BytesIO
            from openai import OpenAI
            stream = BytesIO(data)
            stream.name = audio.filename or "recording.webm"
            response = OpenAI(api_key=settings.OPENAI_API_KEY).audio.transcriptions.create(model="whisper-1", file=stream)
            return {"transcript": response.text, "provider": "openai-whisper", "duration_seconds": None}
        except Exception as exc:
            logger.exception("Whisper transcription failed")
            raise HTTPException(502, "Whisper transcription failed; retry the recording or review its format") from exc
    return {"transcript": "Transcription is ready for review. Configure OPENAI_API_KEY to enable Whisper transcription.", "provider": "whisper-ready", "duration_seconds": None}
