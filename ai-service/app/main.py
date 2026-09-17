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
from app.providers.llm_provider import GroqLLMProvider
from app.pipelines.chunker import chunk_resume
from app.pipelines.models import ParsedResumeSchema, ParsedJobDescriptionSchema
from app.pipelines.matcher import generate_match_assessment
from app.pipelines.interview import ats_score, evaluate_answer, generate_questions, retrieve_context
from app.core.prompts import load_prompt_template
from app.core.config import settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("hiresense-ai")
app = FastAPI(title="HireSense AI API", description="Resume intelligence and recorded-audio interview analysis. Live copilot and WebRTC are not supported.", version="1.1.0", contact={"name": "HireSense Engineering"})
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173"], allow_credentials=True, allow_methods=["GET", "POST"], allow_headers=["Content-Type", "Authorization"])
embedding_provider = LocalEmbeddingProvider()
llm_provider = GroqLLMProvider()

class EmbedRequest(BaseModel):
    text: str = Field(min_length=1, max_length=10_000)

class RagChunk(BaseModel):
    section_name: str
    content: str
    similarity: float | None = None

class RagAnswerRequest(BaseModel):
    question: str = Field(min_length=1, max_length=1_000)
    chunks: list[RagChunk] = Field(default_factory=list)

class ChunkResumeRequest(BaseModel):
    raw_text: str = Field(default="", max_length=100_000)
    parsed_json: dict[str, Any] = Field(default_factory=dict)

class JobParseRequest(BaseModel):
    job_description: str = Field(min_length=10, max_length=50_000)

class ExplainMatchRequest(BaseModel):
    job_title: str = Field(default="Position")
    company: str | None = Field(default=None)
    job_summary: str = Field(default="")
    matched_required_skills: list[str] = Field(default_factory=list)
    missing_required_skills: list[str] = Field(default_factory=list)
    matched_preferred_skills: list[str] = Field(default_factory=list)
    missing_preferred_skills: list[str] = Field(default_factory=list)
    evidence_chunks: list[RagChunk] = Field(default_factory=list)

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

@app.post("/api/ai/embed", tags=["RAG"])
async def embed_text(payload: EmbedRequest):
    embedding = embedding_provider.get_embedding(payload.text)
    return {"embedding": embedding, "dimensions": len(embedding)}

@app.post("/api/ai/rag/answer", tags=["RAG"])
async def rag_answer(payload: RagAnswerRequest):
    if not payload.chunks:
        return {
            "text": "Based on the provided resume excerpts, no relevant information was found to answer this question.",
            "model": "grounding-guardrail",
            "tokens_input": 0,
            "tokens_output": 0,
            "latency_ms": 0,
        }

    context_blocks = []
    for idx, chunk in enumerate(payload.chunks, 1):
        sim_str = f" (similarity: {chunk.similarity:.2f})" if chunk.similarity is not None else ""
        context_blocks.append(f"[{idx}. Section: {chunk.section_name}{sim_str}]\n{chunk.content}")
    context_text = "\n\n".join(context_blocks)

    system_prompt = (
        "You are the HireSense Career Intelligence RAG Assistant. "
        "Provide strictly accurate, factual answers to questions about a candidate's resume "
        "based ONLY on the retrieved excerpts provided below. "
        "If the retrieved excerpts do not contain the answer, or if the question asks about a technology, "
        "company, or domain not mentioned in the candidate's resume, clearly state: "
        "'Based on the provided resume excerpts, this candidate does not mention [topic or skill].'"
    )
    try:
        template = load_prompt_template("resume_rag")
        user_prompt = template.format(context=context_text, question=payload.question)
    except Exception:
        user_prompt = f"[RETRIEVED RESUME CONTEXT]\n{context_text}\n\n[USER QUESTION]\n{payload.question}"

    return llm_provider.generate_text(system_prompt=system_prompt, user_prompt=user_prompt)

@app.post("/api/ai/chunk-resume", tags=["RAG"])
async def chunk_resume_endpoint(payload: ChunkResumeRequest):
    parsed = None
    if payload.parsed_json:
        try:
            parsed = ParsedResumeSchema.model_validate(payload.parsed_json)
        except Exception:
            parsed = None
    chunks = chunk_resume(raw_text=payload.raw_text, parsed=parsed)
    results = []
    for idx, chunk in enumerate(chunks):
        emb = embedding_provider.get_embedding(chunk["content"])
        results.append({
            "chunk_index": idx,
            "section_name": chunk["section_name"],
            "content": chunk["content"],
            "embedding": emb,
        })
    return {"chunks": results, "count": len(results)}

@app.post("/api/ai/jobs/parse", tags=["Job Matching"])
async def parse_job_endpoint(payload: JobParseRequest):
    try:
        system_prompt = load_prompt_template("parse_job_description")
    except Exception:
        system_prompt = "Extract structured requirements from this job description into JSON."
    
    parsed = llm_provider.generate_structured(
        system_prompt=system_prompt,
        user_prompt=payload.job_description,
        response_model=ParsedJobDescriptionSchema,
    )
    embedding = embedding_provider.get_embedding(payload.job_description)
    return {
        "parsed": parsed.model_dump(),
        "embedding": embedding,
        "dimensions": len(embedding),
    }

@app.post("/api/ai/jobs/explain-match", tags=["Job Matching"])
async def explain_match_endpoint(payload: ExplainMatchRequest):
    evidence_blocks = []
    for idx, chunk in enumerate(payload.evidence_chunks, 1):
        sim_str = f" (similarity: {chunk.similarity:.2f})" if chunk.similarity is not None else ""
        evidence_blocks.append(f"[{idx}. Section: {chunk.section_name}{sim_str}]\n{chunk.content}")
    evidence_context = "\n\n".join(evidence_blocks) if evidence_blocks else "No direct resume evidence chunks available."

    system_prompt = (
        "You are the HireSense Career Intelligence Job Match Evaluator. "
        "Provide an objective, strictly grounded 'Why You're a Match' analysis based ONLY on the "
        "provided job requirements, structured match signals, and retrieved resume evidence. "
        "Do not invent credentials or extrapolate. Do not compute or alter numerical scores."
    )
    try:
        template = load_prompt_template("job_matching_explanation")
        user_prompt = template.format(
            job_title=payload.job_title,
            company=payload.company or "Not specified",
            job_summary=payload.job_summary,
            matched_required_skills=", ".join(payload.matched_required_skills) or "None identified",
            missing_required_skills=", ".join(payload.missing_required_skills) or "None identified",
            matched_preferred_skills=", ".join(payload.matched_preferred_skills) or "None identified",
            missing_preferred_skills=", ".join(payload.missing_preferred_skills) or "None identified",
            evidence_context=evidence_context,
        )
    except Exception:
        user_prompt = (
            f"[TARGET JOB]\nTitle: {payload.job_title}\nCompany: {payload.company}\n\n"
            f"[RETRIEVED RESUME EVIDENCE]\n{evidence_context}"
        )

    result = llm_provider.generate_text(system_prompt=system_prompt, user_prompt=user_prompt)
    return {
        "explanation": result["text"],
        "model": result["model"],
        "tokens_input": result.get("tokens_input", 0),
        "tokens_output": result.get("tokens_output", 0),
        "latency_ms": result.get("latency_ms", 0),
    }

